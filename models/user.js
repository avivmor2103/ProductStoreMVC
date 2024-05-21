const mongoose = require('mongoose');
const Product = require('./product');
const Schema = mongoose.Schema;

const userSchema = new Schema({
  
  email: {
    type: String,
    required: true
  },
  password: {
    type: String,
    required: true
  },
  resetToken: {
    type: String
  },
  resetTokenExpiration:{
    type: Date
  }, 
  cart: {
    items: [{
      productId: {
        type: Schema.Types.ObjectId,
        ref: 'Product',
        required: true
      }, 
      quantity: {
        type: Number,
        required: true
      },
      pricePerUnit: {
        type : Number,
        required : true
      }
    }],
    totalPrice: {
      type: Number,
      required: true
    }
  }
});

userSchema.methods.addToCart = function (product) {
  console.log("product._id: ", product._id); 
  const cartProductIndex = this.cart.items.findIndex(cp =>{
    return cp.productId.toString() === product._id.toString();
  });

  let pricePerUnit= product.price;
  console.log("pricePerUnit: ", pricePerUnit);

  let newQuantity = 1;
  const updatedCartItems = [...this.cart.items];

  if(cartProductIndex >= 0){
    newQuantity = this.cart.items[cartProductIndex].quantity + 1;
    updatedCartItems[cartProductIndex].quantity = newQuantity;
    updatedCartItems[cartProductIndex].pricePerUnit = pricePerUnit;
  }else{
    updatedCartItems.push({
      productId : product._id,
      quantity: newQuantity,
      pricePerUnit : pricePerUnit
    });
  }

  const totalPricePerItem = updatedCartItems
    .map(item=>{
      return item.quantity * item.pricePerUnit;
    })
  const totalPrice = totalPricePerItem.reduce((total, currentValue) => total + currentValue, 0);
  const updatedCart = {
    items: updatedCartItems,
    totalPrice: totalPrice
  };

  this.cart= updatedCart;
  return this.save();
}

userSchema.methods.deleteItemFromCart = function(productId){
  const updatedCartItems = this.cart.items.filter(i=>{
    return i._id.toString() !== productId.toString();
  })
  console.log("Here");

  this.cart.items = updatedCartItems;
  const totalPricePerItem = updatedCartItems
    .map(item=>{
      return item.quantity * item.pricePerUnit;
    })
  const totalPrice = totalPricePerItem.reduce((total, currentValue) => total + currentValue, 0);
  const updatedCart = {
    items: updatedCartItems,
    totalPrice: totalPrice
  };

  this.cart= updatedCart;
  return this.save();
}


userSchema.methods.clearCart = function(){
  this.cart = {items: [], totalPrice: 0};
  return this.save();
}

module.exports = mongoose.model('User', userSchema);



// const mongodb = require('mongodb');

// class User{
//   constructor(username, email, cart, id){
//     this.name= username;
//     this.email = email;
//     this.cart = cart;
//     this._id = id;
//   }

//   save(){
//     const db = getDb();
//     return db.collection('users').insertOne(this)
//   }

//   addToCart(product){
//     const cartProductIndex = this.cart.items.findIndex(cp =>{
//       return cp.productId.toString() === product._id.toString();
//     });

//     let newQuantity = 1;
//     const updatedCartItems = [...this.cart.items];

//     if(cartProductIndex >= 0){
//       newQuantity = this.cart.items[cartProductIndex].quantity + 1;
//       updatedCartItems[cartProductIndex].quantity = newQuantity;
//     }else{
//       updatedCartItems.push({
//         productId : new mongodb.ObjectId(`${product._id}`), 
//         quantity: newQuantity
//       });
//     }

//     const updatedCart = {
//        items: updatedCartItems
//     };
//     const db = getDb();

//     return db
//       .collection('users')
//       .updateOne(
//         { _id: new mongodb.ObjectId(`${this._id}`)},
//         { $set : { cart: updatedCart}}
//       );
//   }

//   getCart(){

//     const db = getDb();
//     const productIds = this.cart.items.map( i=>{
//       return i.productId;
//     });
//     return db.collection('products')
//       .find({_id: {$in: productIds}})
//       .toArray()
//       .then(products => {
//         return products.map(p =>{
//           return {
//             ...p, 
//             quantity: this.cart.items.find(i =>{
//               return i.productId.toString() === p._id.toString()
//           }).quantity};
//         })
//       });
//   }

//   deleteItemFromCart(productId){
//     const updatedCartItems = this.cart.items.filter(i=>{
//       return i.productId.toString() !== productId.toString();
//     })
//     const db = getDb();
//     return db
//       .collection('users')
//       .updateOne(
//         { _id: new mongodb.ObjectId(`${this._id}`)},
//         { $set : { cart : { items : updatedCartItems}}}
//       );
//   } 

//   addOrder(){
//     const db = getDb();
//     return this.getCart()
//       .then(products=>{
//         const order = {
//           items : products,
//           user: {
//             _id: new mongodb.ObjectId(`${this._id}`),
//             name: this.name
//           }
//       };
//       return db.collection('orders').insertOne(order)
//     })
//     .then(result=>{
//       this.cart = {items: []};
//       return db
//       .collection('users')
//       .updateOne(
//         { _id: new mongodb.ObjectId(`${this._id}`)},
//         { $set : { cart : { items : []}}}
//       );
//     })
//   }

//   getOrder(){
//     const db = getDb();
//     return db
//       .collection('orders')
//       .find({'user._id' : new mongodb.ObjectId(`${this._id}`)})
//       .toArray();
//   }

//   static findById(userId){
//     const db = getDb();
//     return db
//       .collection('users')
//       .findOne({ _id: new mongodb.ObjectId(`${userId}`)})
//       .then(user=> {
//         return user;
//       })
//       .catch(err => console.log(err));
//   }
// }
  
//   module.exports = User;
  