import mongoose, { Schema } from "mongoose";
import mongooseAggregtePaginate from "mongoose-paginate-v2";

const commentSchema = new Schema({
    content:{
        type:Number,
        require:true
    },
    video:{
        type: Schema.Types.ObjectId,
        ref: "Video"
    },
    owner:{
        type: Schema.Types.ObjectId,
        ref: "User"
    }
    
},{timestamps:true})

commentSchema.plugin(mongooseAggregtePaginate)

export const Comment = mongoose.model("Comment", commentSchema)