import express from "express";
import cors from "cors"
import cookieParser from "cookie-parser"

const app = express();

app.use(cors({
    origin: process.env.CORS_ORIGIN,
    Credential:true    
}))

app.use(express.json({limit:"16kb"}))
app.use(express.urlencoded({extended:true ,limit:"16kb"}))
app.use(express.static("public"))
app.use(cookieParser())



// imporing routes

import userRouter from "./routes/userRouter.js";
import videoRouter from "./routes/video.routes.js";
import commentRouter from "./routes/commentRouter.js";
import likeRouter from "./routes/likeRouter.js";
import playlistRouter from "./routes/playlistRouter.js";
import subscriptionRouter from "./routes/subscriptionRouter.js";
import tweetRouter from "./routes/tweetRouter.js";


app.use("/api/v1/users",userRouter)
app.use("/api/v1/videos",videoRouter)
app.use("/api/v1/comments", commentRouter)
app.use("/api/v1/likes", likeRouter)
app.use("/api/v1/playlists", playlistRouter)
app.use("/api/v1/subscriptions", subscriptionRouter)
app.use("/api/v1/tweet", tweetRouter)
export { app };