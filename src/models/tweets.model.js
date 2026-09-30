import mongoose, { Schema } from "mongoose";

const tweetSchema = new Schema({
    owner:{
        type: Schema.Types.ObjectId,
        ref: "User"
    },
    content:{
        type:Number,
        require:true
    }
    
},{timestamps:true})

export const Tweet = mongoose.model("Comment", tweetSchema)