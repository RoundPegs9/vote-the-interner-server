const express = require("express"),
    app = express(),
    mongoose = require("mongoose"),
    Hash = require("./hash"),
    bodyParser = require("body-parser"),
    hash = new Hash(10000019, 1000),
    dotenv = require("dotenv");


/**
 * Set the primal index for Hash Function
 */
hash.setPrimeString(31);

dotenv.config();
app.use(bodyParser.urlencoded({extended: true}));


var redirectToHTTPS = require('express-http-to-https').redirectToHTTPS; //makes all request secure
app.use(redirectToHTTPS([/localhost:(\d{4})/], [/\/insecure/], 301));


var MemoryStore = require("memorystore")(require('express-session'));

app.use(require("express-session")({
   secret : process.env.expressSECRET,
   store: new MemoryStore({
    checkPeriod: 86400000 // prune expires entries every 24h
  }),
   resave : false,
   saveUninitialized : false
}));

/**
 * Mongoose Setup
 */
mongoose.set('useCreateIndex', true);
mongoose.set('useFindAndModify', false);

mongoose.Promise = global.Promise;
mongoose.connect("mongodb://"+process.env.mongoDB+"/vote_the_internet",{ useNewUrlParser: true , useUnifiedTopology: true});


app.get("/", (req, res)=>{
    var query = req.query.q;
    
    return res.send(`Hello World + ${query} + ${hash.get_str_hash(query)}`);
});

app.listen(process.env.PORT || 2622, process.env.IP,()=>{
    console.log("Server Connected");
 });