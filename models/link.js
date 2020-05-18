var mongoose = require("mongoose"),
    passportLocalMongoose = require("passport-local-mongoose");

var LinkSchema = new mongoose.Schema({
    host: {
        url : Number, // hashed version of the HOST URL
        upvotes : {
            type : Number,
            default : 0
        },
        downvotes : {
            type : Number,
            default : 0
        }
    },

    pathname :
    [
        {
            url : Number, // hashed version of the full URL (minimized hash collision)
            upvotes : {
                type : Number,
                default : 0
            },
            downvotes : {
                type : Number,
                default : 0
            }
        }
    ]
    
});
LinkSchema.plugin(passportLocalMongoose);
module.exports = mongoose.model("Link", LinkSchema);