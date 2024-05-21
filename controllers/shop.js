const path = require('path');
const fs = require('fs');
const stripe = require("stripe")(process.env.STRIPE_PRIVATE_KEY);
const Product = require('../models/product');
const Order = require('../models/order');
const csurf = require('csurf');
const PDFDocument = require('pdfkit');
const product = require('../models/product');

const ITEMS_PER_PAGE = 1;

exports.getProducts = (req, res, next) => {
  const page = parseInt(req.query.page) || 1;
  let totalItems;
  console.log(page);

  Product
    .find()
    .countDocuments()
    .then(numberProducts=>{
      totalItems = numberProducts;
      return Product 
        .find()
        .skip((page - 1) * ITEMS_PER_PAGE)
        .limit(ITEMS_PER_PAGE)
    })
    .then(products=>{
      res.render('shop/product-list', {
        prods: products,
        pageTitle: 'All Products',
        path: '/products',
        currentPage: page,
        hasNextPage : ITEMS_PER_PAGE * page < totalItems,
        hasPreviousPage : page > 1,
        nextPage: page + 1,
        previousPage: page - 1,
        lastPage: Math.ceil(totalItems/ITEMS_PER_PAGE)
      });
    })
    .catch(err=>{
      console.log(err);
    });
};

exports.getProductById = (req, res, next)=>{
  const productId = req.params.id;
  Product.findById(productId)
    .then((product)=>{
      res.render('shop/product-detail', 
        {
          product: product,
          pageTitle: product.title, 
          path : '/products'
        });
    })
    .catch(err=>{console.log(err)});
}

exports.getIndex = (req, res, next) => {
  const page = parseInt(req.query.page) || 1;
  let totalItems;
  console.log(page);

  Product
    .find()
    .countDocuments()
    .then(numberProducts=>{
      totalItems = numberProducts;
      return Product 
        .find()
        .skip((page - 1) * ITEMS_PER_PAGE)
        .limit(ITEMS_PER_PAGE)
    })
    .then(products=>{
      res.render('shop/index', {
        prods: products,
        pageTitle: 'Shop',
        path: '/',
        currentPage: page,
        hasNextPage : ITEMS_PER_PAGE * page < totalItems,
        hasPreviousPage : page > 1,
        nextPage: page + 1,
        previousPage: page - 1,
        lastPage: Math.ceil(totalItems/ITEMS_PER_PAGE)
      });
    })
    .catch(err=>{
      console.log(err);
    });
}

exports.getCart = (req, res, next) =>{
  req.user
    .populate('cart.items.productId')
    .then(user => { 
      const products = user.cart.items;
      const total = user.cart.totalPrice;
      res.render('shop/cart', {
        path: '/cart',
        pageTitle: 'Your Cart',
        products: products,
        totalPrice: total
      })
    })
      .catch(err=>{
        console.log(err);
      })
}

exports.postCart = (req, res, next) => {
  const productId = req.body.id;
  Product.findById(productId)
    .then(product => {
      return req.user.addToCart(product)
        .then(()=>{
          res.redirect('/cart');
        })
    })
    .catch(err=>console.log(err))
}

exports.postCartDeleteItem = (req, res, next) =>{
  const prodId = req.body.productId;
  req.user
    .deleteItemFromCart(prodId)
    .then(result=>{
      res.redirect('/cart');
    })
    .catch(err=>console.log(err))
}

exports.getOrders = (req, res, next) =>{ 
  Order.find({'user.userId' : req.user._id})
    .then(orders=>{
      res.render('shop/orders', {
        path: '/orders',
        pageTitle: 'Your Orders',
        orders: orders
      });
    })
    .catch(err=>console.log(err))
}

exports.postOrder = (req, res, next) => {
  req.user
    .populate('cart.items.productId')
    .then(user => { 
      const products = user.cart.items.map( i=>{
        return {quantity : i.quantity, product: {...i.productId._doc}}
      });
      const order = new Order({
        products: products,
        user:{
          email: req.user.email,
          userId: req.user
        },
        totalPrice: req.user.cart.totalPrice
      }); 
      return order.save();
    })
    .then(result=>{
      return req.user.clearCart();
    })
    .then(result =>{
      res.redirect('/orders');
    })
    .catch(err => console.log(err));
}

exports.getInvoice = (req, res, next)=>{
  const orderId = req.params.orderId;
  Order.findById(orderId)
    .then(order=>{
      if(!order){
        return next(new Error('No order found.'));
      }
      if(order.user.userId.toString() !== req.user._id.toString()){
        return next(new Error('Unauthorized'));
      }
      const invoiceName = 'invoice-' + orderId + '.pdf';
      const invoicePath = path.join('data', 'invoices', invoiceName);

      const pdfDoc = new PDFDocument();
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition',`attachment; filename=${invoiceName}`);
      pdfDoc.pipe(fs.createWriteStream(invoicePath));
      pdfDoc.pipe(res);

      pdfDoc.fontSize(26).text('Invoice', {
        underline: true
      });

      pdfDoc.text('--------------------------------------------');

      order.products.forEach(prod=>{
        console.log(prod);
        pdfDoc.fontSize(14).text('Product title: ' + prod.product.title);
        pdfDoc.fontSize(14).text('Product price: ' + prod.product.price);
        pdfDoc.fontSize(14).text('Product quantity:' + prod.quantity);
        pdfDoc.text('\n');
      });
      pdfDoc.fontSize(14).text('Total Price: ' + order.totalPrice);


      pdfDoc.end();

      //This solution good for small files. 
      // fs.readFile(invoicePath, (err, data)=>{
      //   if(err){
      //     return next(err);
      //   }
      //   res.setHeader('Content-Type', 'application/pdf');
      //   res.setHeader('Content-Disposition',`attachment; filename=${invoiceName}`);
      //   res.send(data);
      // });

      // const file = fs.createReadStream(invoicePath);
      // // res.setHeader('Content-Type', 'application/pdf');
      // // res.setHeader('Content-Disposition',`attachment; filename=${invoiceName}`);

      // file.on('error', err=>{
      //   next(err);
      // });
       
      // file.pipe(res);
    })
    .catch(err=>{
      next(err);
    });
}

exports.getCheckout = (req, res, next) =>{
  let products; 
  let total = 0;
  req.user
    .populate('cart.items.productId')
    .then(user => { 
      products = user.cart.items;
      total = user.cart.totalPrice;
      
      return stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        mode: 'payment', // Set the mode parameter at the session level
        line_items: products.map(p=>{
          return {
            price_data: {
              currency: 'usd',
              product_data: {
                name: p.productId.title,
                description: p.productId.description,
              },
              unit_amount: p.productId.price * 100,
            },
            quantity: p.quantity
          };
        }),
        customer_email: req.user.email,
        success_url: req.protocol + '://' + req.get('host') + '/checkout/success',
        cancel_url: req.protocol + '://' + req.get('host') + '/checkout/cancel'
      });
    })
    .then(session=>{
      res.render('shop/checkout', {
        path: '/checkout',
        pageTitle: 'Checkout',
        products: products,
        totalPrice: total,
        sessionId : session.id
      });
    })
    .catch(err=>{
      console.log(err);
    });
}


exports.getCheckoutSuccess = (req, res, next) =>{ 
  req.user
    .populate('cart.items.productId')
    .then(user => { 
      const products = user.cart.items.map( i=>{
        return {quantity : i.quantity, product: {...i.productId._doc}}
      });
      const order = new Order({
        products: products,
        user:{
          email: req.user.email,
          userId: req.user
        },
        totalPrice: req.user.cart.totalPrice
      }); 
      return order.save();
    })
    .then(result=>{
      return req.user.clearCart();
    })
    .then(result =>{
      res.redirect('/orders');
    })
    .catch(err => console.log(err));
}