const express = require("express"),
    app = express(),
    mongoose = require("mongoose"),
    Hash = require("./hash"),
    Link = require("./models/link"),
    bodyParser = require("body-parser"),
    dotenv = require("dotenv");


/**
 * Hash Class Invocation
 */
const hash = new Hash(10000019, 1000);
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


/**
 * helper function for creating a new Link Object
 * data specified by param.
 * @param {Object} data : Check API under models/link
 */
var createLink = (data)=>{
    Link.create(data, (err, addedLink)=>{
        if(err)
        {
            if(err.code === 11000)
            {
                Link.collection.dropIndex("username_1", (err, indexDrop)=>{
                    if(err)
                    {
                        console.error("Failed to drop index duplicate key");
                        throw new Error(err.message);
                    }
                    console.log("index duplicate key drop successful");
                    createLink(data);
                });
            }
            else
            {
                throw new Error(err.message);
            }
            
        }
        console.log("Successfully created new object");
    });
};

//********************************************************************UPVOTE*************************************************************************** */
app.post("/upvote", (req, res)=>{
    let query = req.query.q;
    let hashed_query = hash.get_str_hash(query);

    Link.findOne({url : hashed_query}).exec((err, foundLink)=>{
        if(err)
        {
            console.error("Error while upvoting");
            throw new Error(err.message);
        }
        try
        {
            if(!foundLink)
            {
                //create a new URL obj.
                let newLink = {
                    url : hashed_query,
                    analytics : {
                        upvotes : 1,
                        downvotes : 0
                    }
                };
                createLink(newLink);
                return res.send({code : 200, upvote: 1, downvotes: 0});
            }
            else
            {
                foundLink.analytics.upvotes++;
                foundLink.save();
                return res.send({code : 200, upvote: foundLink.analytics.upvotes, downvotes: foundLink.analytics.downvotes});
            }
        }
        catch(error)
        {
            console.error("Error while changing upvoting score");
            throw new Error(error);
        }
    });
});


//********************************************************************DOWNVOTE*************************************************************************** */
app.post("/downvote", (req, res)=>{
    let query = req.query.q;
    let hashed_query = hash.get_str_hash(query);

    Link.findOne({url : hashed_query}).exec((err, foundLink)=>{
        if(err)
        {
            console.error("Error while downvoting");
            throw new Error(err.message);
        }
        try
        {
            if(!foundLink)
            {
                //create a new URL obj.
                let newLink = {
                    url : hashed_query,
                    analytics : {
                        upvotes : 0,
                        downvotes : 1
                    }
                };
                createLink(newLink);
                return res.send({code : 200, upvote: 0, downvotes: 1});
            }
            else
            {
                foundLink.analytics.downvotes++;
                foundLink.save();
                return res.send({code : 200, upvote: foundLink.analytics.upvotes, downvotes: foundLink.analytics.downvotes});
            }
        }
        catch(error)
        {
            console.error("Error while changing downvoting score");
            throw new Error(error);
        }
    });
});


//********************************************************************STATISTICS*************************************************************************** */
app.get("/", (req, res)=>{
    var query = req.query.q;
    let hashed_query = hash.get_str_hash(query);

    Link.findOne({url : hashed_query}, (err, foundLink)=>{
        if(err)
        {
            console.error("Error while viewing results");
            throw new Error(err.message);
        }
        if(foundLink)
        {
            return res.send({code : 200, data : foundLink});
        }
        return res.send({code : 198, data : null});
    });
});


//********************************************************************DEFAULT ROUTES*************************************************************************** */

app.get("*", (req, res)=>{
    return res.send("Invalid API route");
});

app.post("*", (req, res)=>{
    return res.send("Invalid API route");
});

//********************************************************************LAUNCH SERVER*************************************************************************** */
app.listen(process.env.PORT || 2622, process.env.IP,()=>{
    console.log("Server Connected at port 2622");
 });