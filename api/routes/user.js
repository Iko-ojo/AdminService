const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const shortId = require('shortid');
const sgMail = require('@sendgrid/mail');
const User = require('../models/user');
const Reset = require('../models/reset');

// User Signup
router.post('/signup', (req, res, next) =>{
    // Checking if mail exists
    User.find({email: req.body.email})
        .exec()
        .then(user => {
            if(user.length >= 1){
                return res.status(409).json({
                    message: " Mail Exists" 
                });
            }else{
                //  Hashing the inputed Password
                bcrypt.hash(req.body.password, 10, (err, hash) =>{
                    if(err){
                        return res.status(500).json({
                            error: err
                        });
                    }else{
                         const user = new User({
                            _id: new mongoose.Types.ObjectId(),
                            username: req.body.username,
                            fullname: req.body.fullname,
                            email: req.body.email,
                            password: hash
                        });
                        // Saving Values to the DB
                        user
                        .save()
                        .then(result => {
                            console.log(result);
                            res.status(201).json({
                                message: "User created"
                            });
                        })
                        .catch(err => {
                            console.log(err);
                            res.status(500).json({error: err});
                        });
                    }
                })
            }
        })
   
    
});

// User Login

router.post('/login', (req,res,next) =>{
    // Checking for email
    User.find({email : req.body.email})
        .exec()
        .then(user => {
            if(user.length < 1){
                return res.status(401).json({
                    message: 'Auth Failed'
                });
            }
            // Hashing the inputed password and comparing wit one in the database
            bcrypt.compare(req.body.password,user[0].password, (err, result) =>{
                if(err){
                    return res.status(401).json({
                        message: 'Auth Failed'
                    });
                }
                if(result) {
                  const token =  jwt.sign({
                        email: user[0].email,
                        _id : user[0].id
                    }, 
                    process.env.JWT_KEY,
                    {
                        expiresIn: "1h"
                    });
                    return res.status(200).json({
                        _id: result._id,
                        message: 'Auth Successful',
                        token: token
                    });
                }
                res.status(401).json({
                    message: 'Auth failed'
                });
            });
        })
        .catch(err =>{
            res.status(500).json({
                error:err
            });
        });
})

//Password Reset: Sending Mail
router.get('/reset', (req, res, next) =>{
    const { email } = req.body
    User.findOne({email})
    .then(user => {
        const token = new Reset({_userId: user._id, token: shortId.generate() });
        token.save()
        .then(doc => {
            console.log(doc);
            sgMail.setApiKey(process.env.SENDGRID_API_KEY);
            const msg = {
                to: user.email,
                from : 'mail@example.com',
                subject: 'Account Password Reset',
                text: `You have requested for a password link. \n Please click on the link below to reset your password. \n \n http://${req.headers.host}/user/reset/${doc.token}`,
            }
            sgMail.send(msg);
            res.status(200).json({
                message: `Password reset link sent to user's email address`
            });
        })
        .catch(err => {
            res.status(500).json({
                error: err
            })
        });
    })                                                                           
});

//Password reset is done here
router.post('reset/:resetToken', (req, res) => {
    const { password } = req.body
    console.log(password);
    const resetToken = req.params.resetToken;
  
    Reset.findOne({ token: resetToken })
    .then(token => {
      User.findOne({_id: token._userId})
      .then(user => {
        bcrypt.hash(password, 10, (err, hash) => {
          if (err) {
            console.log(err);
            return res.status(500).json({
              error: err
            });
          }
          user.password = hash;
          user.save()
          .then(doc => {
            res.status(200).json({
              message: `User password updated successfully`,
              user: doc
            })
            console.log(doc);
          })
          .catch(err => {
            res.status(500).json({
              message: `Something went wrong ${err}`
            })
          })  
        })
      })
      .catch(err => {
        res.status(400).json({
          err: `No valid user found for this token. Please regenerate a token`
        })
      })
    })
    .catch(err => {
      res.status(500).json({
        message: `Invalid token not found ${err}`,
      })
      console.log(err);
    })
  })


module.exports = router; 