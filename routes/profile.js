const express = require('express');
const router = express.Router();
const passport = require('passport');
const Post=require('../models/post');
const Comment=require('../models/comment');
const User=require('../models/usermodel');
function isAuthenticatedUser(req, res, next) {
    if(req.isAuthenticated()) {
        return next();
    }
    req.flash('error_msg', 'Please Login first to access this page.')
    res.redirect('/login');
}
router.get('/profile',isAuthenticatedUser, (req,res)=> {
    Post.find({user:req.user._id}).populate('user') .populate({
        path: 'comments',
        populate: {
            path: 'user'
        }
    }) 
    .then(posts=>{
        console.log(posts);
        res.render('profile',{posts:posts})     
})
 .catch(err=>{
     console.log(err);
 })    
});
router.get('/edit/:id',(req,res)=>{
    let searchQuery={_id:req.params.id};
    Post.findOne(searchQuery)
    .then(post=>{
        res.render('edit',{post:post})
    })
    .catch(err=>{
      console.log(err);
    })
    });
router.put('/edit/:id',(req,res)=>{
    let searchQuery={_id:req.params.id};
    Post.updateOne(searchQuery,{$set:{
           title:req.body.title,
           postBody:req.body.postBody,
    }})
    .then(post=>{
        res.redirect('/profile');
    })
    .catch(err=>{
        console.log(err);
      })
})


router.delete('/delete/:id',(req,res)=>{
    const searchQuery={_id:req.params.id};
    Post.remove(searchQuery)
    .then(post=>{
        res.redirect('/profile');
    })
    .catch(err=>{
        console.log(err);
      })
})



module.exports=router;
