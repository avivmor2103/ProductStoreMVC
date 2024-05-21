const express = require('express');

const { check, body } = require('express-validator');

const router = express.Router(); 

const authController = require('../controllers/auth');

const User = require('../models/user');

router.get('/login', authController.getLogin);

router.post(
    '/login',
    body('email')
        .isEmail()
        .withMessage('Please enter a valid email')
        .normalizeEmail(),
    body('password', 'Please enter a valid password with digits and number with length between 5 to 10 characters.')
        .isLength({min: 5, max: 10})
        .isAlphanumeric()
        .trim(),
    check('email')
        .custom((value, {req})=>{
            return User.findOne({email : value})
                .then(user=>{
                    if(!user){
                        return Promise.reject('User not exist.');
                    }
                })
        }),
    authController.postLogin);

router.post('/logout', authController.postLogout);

router.get('/signup', authController.getSignup);

router.post(
    '/signup',
    check('email')
        .isEmail()
        .withMessage('Please enter a valid email.')
        .normalizeEmail()
        .custom((value, {req})=>{
            return User.findOne({email : value})
                .then(userDoc=>{
                    if(userDoc){
                        return Promise.reject('E-mail exist already, please pick a different one.');
                    }
                })
        }),
    body('password', 'Please enter a valid password with digits and number with length between 5 to 10 characters.')
        .isLength({min: 5, max: 12})
        .isAlphanumeric()
        .trim(),
    body('confirmPassword')
        .trim()
        .custom((value, {req})=>{
        if(value !== req.body.password){
            throw new Error('password must matchs')
        }
        return true;
    }), 
    authController.postSignup);

router.get('/reset', authController.getReset);

router.post('/reset', authController.postReset);

router.get('/reset/:token', authController.getNewPassword);

router.post('/new-password', authController.postNewPassword);

module.exports = router ;

