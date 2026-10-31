import dotenv from "dotenv";
import connectDB from "./db/index.js";
import { app } from "./aap.js";

dotenv.config({
    path: "./.env"
})

const startServer = async ()=>{

    try{
    
        await connectDB();

        const port = process.env.PORT || 8000;

        app.listen(port, ()=>{
            console.log(`Server is running at port ${port} !!!)))`)
        });
        
    }catch(err){
        console.error("MongoDB connection failed !!", err)
    }
};

startServer();