const express = require('express');
const app = express();
const path = require('path');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const db=require('./config/mongoose');
const flash = require('connect-flash');
const session = require('express-session');
const methodOverride=require('method-override');
const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
//Requiring user route
const userRoutes = require('./routes/users');
//Requiring user model
const User = require('./models/usermodel');
app.use(methodOverride('_method'));
//middleware for session
app.use(session({
    secret : 'Just a simple login/sign up application.',
    resave : true,
    saveUninitialized : true
}));
app.use(passport.initialize());
app.use(passport.session());
passport.use(new LocalStrategy({usernameField : 'email'}, User.authenticate()));
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());
//middleware flash messages
app.use(flash());

//setting middlware globally
app.use((req, res, next)=> {
    res.locals.success_msg = req.flash(('success_msg'));
    res.locals.error_msg = req.flash(('error_msg'));
    res.locals.error = req.flash(('error'));
    res.locals.currentUser = req.user;
    next();
});

app.use(bodyParser.urlencoded({extended:true}));
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');
app.use(express.static('public'));

app.use(userRoutes);


app.listen(3000, ()=> {
    console.log('Server is started');
});