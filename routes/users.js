const express = require('express');
const router = express.Router();
const profileRouter=require('./profile');
const passport = require('passport');
const crypto = require('crypto');
const async = require('async');
const multer=require('multer');
const Post=require('../models/post');
const Comment=require('../models/comment');
const nodemailer = require('nodemailer');
//Requiring user model
const User = require('../models/usermodel');
// Checks if user is authenticated
function isAuthenticatedUser(req, res, next) {
    if(req.isAuthenticated()) {
         return next();
    }
    req.flash('error_msg', 'Please Login first to access this page.')
    res.redirect('/login');
}
//profile upload
const storage=multer.diskStorage({
    destination:'./public/uploads/images/',
    filename:(req,file,cb)=>{
        cb(null,file.originalname)
    }
});
const upload=multer({
    storage:storage,
});
//Get routes
router.get('/addpost',(req,res)=>{
    res.render('Addpost');
})
router.get('/login', (req,res)=> {
    res.render('login');
});
router.get('/signup', (req,res)=> {
    res.render('signup');
});
router.get('/create/:id',isAuthenticatedUser,(req,res)=>{
    let searchQuery={_id:req.params.id};
    Post.findOne(searchQuery).populate('user').populate({
        path: 'comments',
        populate: {
            path: 'user'
        }
    })
    .then(posts=>{
        res.render('Addcomment',{posts:posts})
    })
    .catch(err=>{
      console.log(err);
    })
    });

    router.get('/view/:id',isAuthenticatedUser,(req,res)=>{
        let searchQuery={_id:req.params.id};
        Post.findOne(searchQuery).populate('user').populate({
            path: 'comments',
            populate: {
                path: 'user'
            }
        })
        .then(posts=>{
            res.render('viewanswers',{posts:posts})
        })
        .catch(err=>{
          console.log(err);
        })
        });

router.get('/home',isAuthenticatedUser,(req,res)=>{
    Post.find({}).populate('user') .populate({
        path: 'comments',
        populate: {
            path: 'user'
        }
    })
    .sort('-createdAt')
    .then(posts=>{
        res.render('home',{posts:posts});
})
 .catch(err=>{
     console.log(err);
 })
  
})
//post route
router.post('/answer',(req,res)=>{
    Post.findById(req.body.post, function(err, post){
        console.log(req.body.post);
        if (post){
            Comment.create({
                content: req.body.content,
                post: req.body.post,
                user: req.user._id
            }, function(err, comment){
                console.log(comment);
                post.comments.push(comment);
                post.save();
                res.redirect('back');
            });
        }
    });


    
})
router.post('/addpost',isAuthenticatedUser,upload.single('singleImage'),(req,res)=>{
    const file=req.file;
    const url=file.path.replace("public",'');
    const newPost={
        title:req.body.title,
        postBody:req.body.postBody,
        imgUrl:url,
        user: req.user._id
    }
    Post.create(newPost)
    .then(post=>{
        console.log("post is saved in db");
        res.redirect('/home')
    }).catch(err=>{
        console.log(err);
    })
})
router.use(profileRouter)

router.get('/logout', isAuthenticatedUser,(req, res)=> {
    req.logOut();
    req.flash('success_msg', 'You have been logged out.');
    res.redirect('/login');
});

router.get('/forgot', (req, res)=> {
    res.render('forgot');
});

router.get('/reset/:token', (req, res)=> {
    User.findOne({resetPasswordToken: req.params.token, resetPasswordExpires : {$gt : Date.now() } })
        .then(user => {
            if(!user) {
                req.flash('error_msg', 'Password reset token in invalid or has been expired.');
                res.redirect('/forgot');
            }

            res.render('newpassword', {token : req.params.token});
        })
        .catch(err => {
            req.flash('error_msg', 'ERROR: '+err);
            res.redirect('/forgot');
        });
});

router.get('/password/change', isAuthenticatedUser, (req, res)=> {
    res.render('changepassword');
});

//POST routes
router.post('/login', passport.authenticate('local', {
    successRedirect : '/home',
    failureRedirect : '/login',
    failureFlash: 'Invalid email or password. Try Again!!!'
}));
router.post('/signup', (req, res)=> {
    let {name, email, password} = req.body;

    let userData = {
        name : name,
        email :email
    };

    User.register(userData, password, (err, user)=> {
        if(err) {
            req.flash('error_msg', 'ERROR: '+err);
            res.redirect('/signup');
        }
        passport.authenticate('local') (req, res, ()=> {
            req.flash('success_msg', 'Account created successfully');
            res.redirect('/login');
        });
    });

});

router.post('/password/change', (req, res)=> {
    if(req.body.password !== req.body.confirmpassword) {
        req.flash('error_msg', "Password don't match. Type again!");
        return res.redirect('/password/change');
    }

    User.findOne({email : req.user.email})
        .then(user => {
            user.setPassword(req.body.password, err=>{
                user.save()
                    .then(user => {
                        req.flash('success_msg', 'Password changed successfully.');
                        res.redirect('/dashboard');
                    })
                    .catch(err => {
                        req.flash('error_msg', 'ERROR: '+err);
                        res.redirect('/password/change');
                    });
            });
        });
});

// Routes to handle forgot password
router.post('/forgot', (req, res, next)=> {
    let recoveryPassword = '';
    async.waterfall([
        (done) => {
            crypto.randomBytes(20, (err , buf) => {
                let token = buf.toString('hex');
                done(err, token);
            });
        },
        (token, done) => {
            User.findOne({email : req.body.email})
                .then(user => {
                    if(!user) {
                        req.flash('error_msg', 'User does not exist with this email.');
                        return res.redirect('/forgot');
                    }

                    user.resetPasswordToken = token;
                    user.resetPasswordExpires = Date.now() + 1800000; //   1/2 hours

                    user.save(err => {
                        done(err, token, user);
                    });
                })
                .catch(err => {
                    req.flash('error_msg', 'ERROR: '+err);
                    res.redirect('/forgot');
                })
        },
        (token, user) => {
            let smtpTransport = nodemailer.createTransport({
                service: 'Gmail',
                auth: {
                    user : process.env.GMAIL_EMAIL,
                    pass: process.env.GMAIL_PASSWORD
                }
            });

            let mailOptions = {
                to: user.email,
                from : 'dikshapandey1998.dishu@gmail.com',
                subject : 'Recovery Email from Auth Project',
                text : 'Please click the following link to recover your passoword: \n\n'+
                        'http://'+ req.headers.host +'/reset/'+token+'\n\n'+
                        'If you did not request this, please ignore this email.'
            };
            smtpTransport.sendMail(mailOptions, err=> {
                req.flash('success_msg', 'Email send with further instructions. Please check that.');
                res.redirect('/forgot');
            });
        }

    ], err => {
        if(err) res.redirect('/forgot');
    });
});

router.post('/reset/:token', (req, res)=>{
    async.waterfall([
        (done) => {
            User.findOne({resetPasswordToken: req.params.token, resetPasswordExpires : {$gt : Date.now() } })
                .then(user => {
                    if(!user) {
                        req.flash('error_msg', 'Password reset token in invalid or has been expired.');
                        res.redirect('/forgot');
                    }

                    if(req.body.password !== req.body.confirmpassword) {
                        req.flash('error_msg', "Password don't match.");
                        return res.redirect('/forgot');
                    }

                    user.setPassword(req.body.password, err => {
                        user.resetPasswordToken = undefined;
                        user.resetPasswordExpires = undefined;

                        user.save(err => {
                            req.logIn(user, err => {
                                done(err, user);
                            })
                        });
                    });
                })
                .catch(err => {
                    req.flash('error_msg', 'ERROR: '+err);
                    res.redirect('/forgot');
                });
        },
        (user) => {
            let smtpTransport = nodemailer.createTransport({
                service : 'Gmail',
                auth:{
                    user : process.env.GMAIL_EMAIL,
                    pass : process.env.GMAIL_PASSWORD
                }
            });

            let mailOptions = {
                to : user.email,
                from : 'dikshapandey1998.dishu@gmail.com',
                subject : 'Your password is changed',
                text: 'Hello, '+user.name+'\n\n'+
                      'This is the confirmation that the password for your account '+ user.email+' has been changed.'
            };

            smtpTransport.sendMail(mailOptions, err=>{
                req.flash('success_msg', 'Your password has been changed successfully.');
                res.redirect('/login');
            });
        }

    ], err => {
        res.redirect('/login');
    });
});

module.exports = router;