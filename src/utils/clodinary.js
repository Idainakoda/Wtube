import { v2 as cloudinary } from 'cloudinary';
import { response } from 'express';
import fs from "fs";

const uploadOncloudinary = async function(localFilePath) {

    // Configuration
    cloudinary.config({ 
        cloud_name: process.env.CLOUDINARY_CLOUD_NAME, 
        api_key: process.env.CLOUDINARY_API_KEY, 
        api_secret: process.env.CLOUDINARY_API_SECRET // Click 'View API Keys' above to copy your API secret
    });

    try{
        if(!LocalFilePath) return null
        const uploadResult = await cloudinary.uploader
       .upload(localFilePath, {
        resource_type:"auto"
    })
    console.log("File is uploaded on cloudinary",uploadResult.url)
    return response
    }catch(error){
        fs.unlinkSync(localFilePath)
        return null;
    }
}

export {uploadOncloudinary};