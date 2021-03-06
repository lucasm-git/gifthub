require('dotenv').config();

const bodyParser   = require('body-parser');
const cookieParser = require('cookie-parser');
const express      = require('express');
const favicon      = require('serve-favicon');
const hbs          = require('hbs');
const mongoose     = require('mongoose');
const logger       = require('morgan');
const path         = require('path');
const passport     = require( "passport" );

// Maggie added these
const session = require("express-session") 
const MongoStore = require('connect-mongo')(session);

// const LocalStrategy = require("passport-local").Strategy;

const passportSetup = require('./passport/setup');
const flash = require('flash');

mongoose.Promise = Promise;
mongoose
  .connect(process.env.MONGODB_URI, {useMongoClient: true})
  .then(() => {
    console.log('Connected to Mongo!')
  }).catch(err => {
    console.error('Error connecting to mongo', err)
  });

const app_name = require('./package.json').name;
const debug = require('debug')(`${app_name}:${path.basename(__filename).split('.')[0]}`);

const app = express();

// Middleware Setup
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());

// Express View engine setup

app.use(require('node-sass-middleware')({
  src:  path.join(__dirname, 'public'),
  dest: path.join(__dirname, 'public'),
  sourceMap: true
}));

hbs.registerPartials(__dirname + '/views/partials');
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'hbs');
app.use(express.static(path.join(__dirname, 'public')));
app.use(favicon(path.join(__dirname, 'public', 'images', 'favicon.ico')));

// important to do this before your routes
app.use(session({
  secret: 'this is GiftHub baybay!',
  saveUninitialized: true, 
  resave: true, 
  //store session data in MongoDB
  store: new MongoStore({ mongooseConnection: mongoose.connection })
}));

passportSetup( app );

const index = require('./routes/index');
app.use('/', index);

const authRouter = require('./routes/auth-router');
app.use('/', authRouter);

const roomRouter = require('./routes/room-router');
app.use('/', roomRouter);

// When the user clicks on <div>, open the popup (in my-rooms)
function myPopUp() {
    var popup = document.getElementById("myPopup");
    popup.classList.toggle("show");
}

module.exports = app;
