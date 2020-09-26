const { json } = require("body-parser");

const express = require("express"),
    app = express(),
    mongoose = require("mongoose"),
    Hash = require("./hash"),
    Link = require("./models/link"),
    bodyParser = require("body-parser"),
    request = require("request"),
    regression = require('regression'),
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
 * CORS Bypass
 */
app.use(function (req, res, next) {

    // Website you wish to allow to connect
    res.setHeader('Access-Control-Allow-Origin', '*');

    // Request methods you wish to allow
    res.setHeader('Access-Control-Allow-Methods', 'GET');

    // Request headers you wish to allow
    res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With,content-type');

    // Set to true if you need the website to include cookies in the requests sent
    // to the API (e.g. in case you use sessions)
    res.setHeader('Access-Control-Allow-Credentials', true);

    // Pass to next layer of middleware
    next();
});


/**
 * Mongoose Setup
 */
mongoose.set('useCreateIndex', true);
mongoose.set('useFindAndModify', false);

mongoose.Promise = global.Promise;
mongoose.connect("mongodb://"+process.env.mongoDB+"/vote-the-internet",{ useNewUrlParser: true , useUnifiedTopology: true});

/**
 * Constant 10 minute Heroku based request for minimized load times.
 * Removes server idling.
 */
setInterval(() => {
    request(process.env.url);
    console.debug("API loaded again");
}, 9.99*1000*60);



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
    let hashed_host_query = hash.get_str_hash(query.split("/")[0]);
    let hashed_path_query = hash.get_str_hash(query);

    Link.findOne({"host.url" : hashed_host_query}).exec((err, foundLink)=>{
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
                //check first if path name equals host name, db redux.
                let pathname_obj = [];
                
                var pathDownvoteCount = 0,
                pathUpvoteCount = 1;

                if(hashed_host_query != hashed_path_query)
                {
                    pathname_obj = [{
                        url : hashed_path_query,
                        upvotes : 1,
                        downvotes : 0
                    }];
                }
                
                let newLink = {
                    host: {
                        url : hashed_host_query,
                        upvotes : 1,
                        downvotes : 0
                    },
                    pathname : pathname_obj
                };
                
                createLink(newLink);
                
                
                

                let sendData = {
                    host : {
                        url : hashed_host_query,
                        upvotes : newLink.host.upvotes,
                        downvotes : newLink.host.downvotes
                    },
                    path : {
                        url : hashed_path_query,
                        upvotes : pathUpvoteCount,
                        downvotes : pathDownvoteCount
                    }
                }

                return res.send({code : 200, data : sendData});
            }
            else
            {
                
                let isNewPath = true;
                
                var pathUpvoteCount = 1;
                var pathDownvoteCount = 0;

                foundLink.pathname.forEach(item => {
                    if(item.url == hashed_path_query)
                    {
                        item.upvotes++;
                        isNewPath = false;
                        pathUpvoteCount = item.upvotes;
                        pathDownvoteCount = item.downvotes;
                    }
                });
                if(isNewPath)
                {
                    let newPath = {
                        url : hashed_path_query,
                        upvotes : 1,
                        downvotes : 0
                    }
                    foundLink.pathname.push(newPath);
                }
                
                foundLink.host.upvotes++;
                foundLink.save();

                let sendData = {
                    host : {
                        url : hashed_host_query,
                        upvotes : foundLink.host.upvotes,
                        downvotes : foundLink.host.downvotes
                    },
                    path : {
                        url : hashed_path_query,
                        upvotes : pathUpvoteCount,
                        downvotes : pathDownvoteCount
                    }
                }

                return res.send({code : 200, data : sendData});
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
    let hashed_host_query = hash.get_str_hash(query.split("/")[0]);
    
    let hashed_path_query = hash.get_str_hash(query);
    Link.findOne({"host.url" : hashed_host_query}).exec((err, foundLink)=>{
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
                //check first if path name equals host name, db redux.
                let pathname_obj = [];
                var pathDownvoteCount = 1,
                    pathUpvoteCount = 0;

                if(hashed_host_query != hashed_path_query)
                {
                    pathname_obj = [{
                        url : hashed_path_query,
                        upvotes : 0,
                        downvotes : 1
                    }];
                }

                let newLink = {
                    host: {
                        url : hashed_host_query,
                        upvotes : 0,
                        downvotes : 1
                    },
                    pathname : pathname_obj
                };
                createLink(newLink);

                let sendData = {
                    host : {
                        url : hashed_host_query,
                        upvotes : newLink.host.upvotes,
                        downvotes : newLink.host.downvotes
                    },
                    path : {
                        url : hashed_path_query,
                        upvotes : pathUpvoteCount,
                        downvotes : pathDownvoteCount
                    }
                }

                return res.send({code : 200, data : sendData});
            }
            else
            {
                
                let isNewPath = true;
                var pathUpvoteCount = 0;
                var pathDownvoteCount = 1;

                foundLink.pathname.forEach(item => {
                    if(item.url == hashed_path_query)
                    {
                        item.downvotes++;
                        isNewPath = false;
                        pathUpvoteCount = item.upvotes;
                        pathDownvoteCount = item.downvotes;
                    }
                });
                if(isNewPath)
                {
                    let newPath = {
                        url : hashed_path_query,
                        upvotes : 0,
                        downvotes : 1
                    }
                    foundLink.pathname.push(newPath);
                }

                foundLink.host.downvotes++;
                foundLink.save();

                let sendData = {
                    host : {
                        url : hashed_host_query,
                        upvotes : foundLink.host.upvotes,
                        downvotes : foundLink.host.downvotes
                    },
                    path : {
                        url : hashed_path_query,
                        upvotes : pathUpvoteCount,
                        downvotes : pathDownvoteCount
                    }
                }

                return res.send({code : 200, data : sendData});
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
app.get("/stats", (req, res)=>{
    var query = req.query.q;
    let hashed_query = hash.get_str_hash(query.split("/")[0]);
    let hashed_path_query = hash.get_str_hash(query);

    Link.findOne({"host.url" : hashed_query}, (err, foundLink)=>{
        if(err)
        {
            console.error("Error while viewing results");
            throw new Error(err.message);
        }
        if(foundLink)
        {
            var pathDownvoteCount = 0,
                pathUpvoteCount = 0;
            foundLink.pathname.forEach(item=>{
                if(item.url == hashed_path_query)
                {
                    pathDownvoteCount = item.downvotes;
                    pathUpvoteCount = item.upvotes;
                }
            });
            let sendData = {
                host : {
                    url : hashed_query,
                    upvotes : foundLink.host.upvotes,
                    downvotes : foundLink.host.downvotes
                },
                path : {
                    url : hashed_path_query,
                    upvotes : pathUpvoteCount,
                    downvotes : pathDownvoteCount
                }
            }
            return res.send({code : 200, data : sendData});
        }
        return res.send({code : 198, data : null});
    });
});

//********************************************************************NEW: Regression*************************************************************************** */

app.get("/predict", (req, res)=>{
    var query = req.query.data;
    try {
        query = JSON.parse(query);
        var data = [];
        let start = 0;
        if(query.length > 10) //get last 10 days
        {
            start = query.length - 11;
        }
        for (let i = start; i < query.length; i++) {
            data.push([i, query[i]]);
        }
        const result = regression.polynomial(data, {order:3});
        const X = query.length;
        let a = result.equation[0],
            b = result.equation[1],
            c = result.equation[2],
            d = result.equation[3];

        const value = a*Math.pow(X, 3) + b*Math.pow(X, 2) + c*Math.pow(X, 1) + d;
        return res.send({code : 200, data : parseFloat(value).toPrecision(3)});

    } catch (error) {
        return res.send({code : 198, data : 0.0}); //error
    }
    
});

const data = [[0,1],[32, 67], [12, 79]];
const result = regression.polynomial(data, { order: 3 })
console.log(result.equation[0], result.equation[1], result.equation[2],result.equation[3]);
//********************************************************************DEFAULT ROUTES*************************************************************************** */

app.get("*", (req, res)=>{
    return res.send("Invalid API route");
});

app.post("*", (req, res)=>{
    return res.send("Invalid API route");
});

//********************************************************************LAUNCH SERVER*************************************************************************** */
app.listen(process.env.PORT || 2622, process.env.IP,()=>{
    console.log(`Server Connected at port ${process.env.PORT || 2622}`);
 });