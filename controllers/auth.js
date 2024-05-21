const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const User = require('../models/user');
const nodemailer = require('nodemailer');
const sendgridTransport = require('nodemailer-sendgrid-transport');
const { validationResult } = require('express-validator');

const transporter = nodemailer.createTransport(sendgridTransport({
    host: "smtp.gmail.com",
    auth: {
        api_key: process.env.API_KEY
    }
}));

exports.getLogin = (req, res, next) =>{
    res.render('auth/login', {
        path: '/login',
        pageTitle: 'Login Page',
        errorMessage: req.flash('error'),
        oldInputs: {
            email: '',
            password: ''
        },
        validationError: []
    });
}

exports.postLogin = (req, res, next) =>{
    const email = req.body.email;
    const password = req.body.password;
    const errors =  validationResult(req);

    if(!errors.isEmpty()){
        let {msg} = errors.array()[0];
        return res
            .status(422)
            .render('auth/login', {
                path: '/login',
                pageTitle: 'Login Page',
                errorMessage: msg,
                oldInputs: {
                    email: email,
                    password: password
                },
                validationError: errors.array()
            });
    }
    User.findOne({email: email})
        .then(user => {
            if(!user){
                return res.status(422).render('auth/login', {
                    path: '/login',
                    pageTitle: 'Login Page',
                    errorMessage: 'Invalid email or password.',
                    oldInputs: {
                        email: email,
                        password: password
                    },
                    validationError: []
                });
            }else{
                bcrypt.compare(password, user.password)
                .then(result=>{
                    if(result){
                        req.session.isLoggedIn = true;
                        req.session.user = user;
                        return req.session.save(err=>{
                            console.log(err);
                            res.redirect('/');
                        })
                    }else{
                        req.flash('error', 'Invalid email or password.');
                        res.redirect('/login');
                    }
                })
                .catch(err=>{
                    req.flash('error', 'Error occur');
                    res.redirect('/login');
                });
            }
        })
    .catch(err => {
      const error = new Error(err)
      error.httpStatusCode = 500;
      return next(error);
    });
}

exports.postLogout = (req, res, next) =>{
    req.session.destroy((err)=>{
        console.log(err)
        res.redirect('/');
    });
}

exports.getSignup = (req, res, next) =>{
    res.render('auth/signup', {
        path: '/signup',
        pageTitle: 'Signup Page',
        errorMessage: req.flash('error'),
        oldInputs: {
            email: '',
            password: '',
            confirmPassword: ''
        },
        validationError: []
    });
}

exports.postSignup = (req, res, next) => {
    const email = req.body.email;
    const password = req.body.password;
    const errors =  validationResult(req);

    if(!errors.isEmpty()){
        console.log(errors.array()[0].msg);
        let {msg} = errors.array()[0];
        console.log(errors.array());
        return res
            .status(422)
            .render('auth/signup', {
                path: '/signup',
                pageTitle: 'Signup Page',
                errorMessage: msg, 
                oldInputs: {
                    email: email,
                    password: password,
                    confirmPassword: req.body.confirmPassword
                }, 
                validationError: errors.array()
            });
    }
    return bcrypt.hash(password, 12)
        .then(hashedPassword=>{
            const user =  new User({
                email: email,
                password: hashedPassword,
                cart: {
                    items: [],
                    totalPrice: 0
                }
            });
            return user.save();
        })
        .then(result=>{
            res.redirect('/login');
        })
        .then(result=>{
            res.redirect('/login');
            return transporter.sendMail({
                to: email,
                from: 'avivmo@mta.ac.il', //Option to put in .env file for secutiry.
                subject: 'Sign succeeded',
                html: '<h1>You successfully signed up!</h1>'
            })
        })
        .catch(err => {
            const error = new Error(err)
            error.httpStatusCode = 500;
            return next(error);
        });
}

exports.getReset = (req, res, next)=>{
    res.render('auth/reset', {
        path: '/reset',
        pageTitle: 'Reset Password Page',
        errorMessage: req.flash('error')
    });
}

exports.postReset= (req, res, next)=>{
    crypto.randomBytes(32, (err, buffer)=>{
        if(err){
            console.log(err);
            res.redirect('/reset');
        }
        const token = buffer.toString('hex');
        User.findOne({email: req.body.email})
            .then(user=>{
                if(!user){
                    req.flash('error', 'No account with that email found.')
                    return res.redirect('/reset');
                }
                user.resetToken = token;
                user.resetTokenExpiration = Date.now() + 3600000;
                return user.save();
            })
            .then(result=>{
                res.redirect('/');
                transporter.sendMail({
                    to: req.body.email,
                    from: 'avivmo@mta.ac.il',
                    subject: 'Password Reset',
                    html: `
                        <h2>Reset Password Validation</h2>
                        <p>Your request for a password reset.</p>
                        <p>Click the following link to set a new password</p>
                        <a href="http://localhost:3001/reset/${token}" >Click Here</a>
                    `
                })
            })
            .catch(err=>{
                const error = new Error(err)
                error.httpStatusCode = 500;
                return next(error);
            });
    });
}

exports.getNewPassword = (req, res, next)=>{
    const token = req.params.token;
    User.findOne({resetToken: token, resetTokenExpiration: {$gt: Date.now()}})
        .then(user=>{
            res.render('auth/new-password', {
                path: '/new-password',
                pageTitle: 'New Password Page',
                errorMessage: req.flash('error'),
                userId: user._id.toString(),
                passwordToken: token
            });
        })
        .catch(err=>{
            const error = new Error(err)
            error.httpStatusCode = 500;
            return next(error);
        });  
}

exports.postNewPassword = (req, res, next)=>{
    const newPassword = req.body.password;
    const userId = req.body.userId;
    const passwordToken = req.body.passwordToken;
    let resetUser; 

    User.findOne({
            resetToken: passwordToken, 
            resetTokenExpiration: {$gt: Date.now()}, 
            _id: userId 
        })
        .then(user=>{
            resetUser = user;
            return bcrypt.hash(newPassword, 12)
        })
        .then(hashedPassword=>{
            resetUser.password = hashedPassword;
            resetUser.resetToken = null;
            resetUser.resetTokenExpiration = undefined;
            return resetUser.save();
        })
        .then(result=>{
            res.redirect('/login');
            return transporter.sendMail({
                to: resetUser.email,
                from: 'avivmo@mta.ac.il',
                subject: 'Password Reset',
                html: `
                    <h2>Reset Password Validation</h2>
                    <p>Your have reset your password successfully.</p>
                `
            })
        })
        .catch(err=>{
            const error = new Error(err)
            error.httpStatusCode = 500;
            return next(error);
        });

}

// Z4LXSMV5U3C52RE7J818QBEM