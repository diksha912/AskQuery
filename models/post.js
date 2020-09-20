const mongoose = require('mongoose');
let postScheme = new mongoose.Schema({
     title:{
         type:String,
         required:true
     },
     postBody:{
         type:String,
         required:true
     },
    imgUrl:
     {
         type:String,
         required:false
     },
     user: {
        type:  mongoose.Schema.Types.ObjectId,
        ref: 'User'

    },
    comments: [
        {   
                type:  mongoose.Schema.Types.ObjectId,
                ref: 'Comment'
        }
    ]  
},{timestamps:true});

module.exports = mongoose.model('Post', postScheme);