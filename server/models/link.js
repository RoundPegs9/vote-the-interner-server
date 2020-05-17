var mongoose = require("mongoose"),
    passportLocalMongoose = require("passport-local-mongoose");

var LinkSchema = new mongoose.Schema({
    url : Number, // hashed version of a URL (minimized hash collision)
    analytics: {
        upvotes : {
            type: Number,
            default : 0
        },
        downvotes : {
            type: Number,
            default : 0
        },
    }
});
LinkSchema.plugin(passportLocalMongoose);
module.exports = mongoose.model("Link", LinkSchema);