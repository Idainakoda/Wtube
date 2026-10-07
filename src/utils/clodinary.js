import { v2 as cloudinary } from 'cloudinary';
import { response } from 'express';
import fs from "fs";

const uploadOncloudinary = async function (localFilePath) {

    // Configuration
    cloudinary.config({
        cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
        api_key: process.env.CLOUDINARY_API_KEY,
        api_secret: process.env.CLOUDINARY_API_SECRET // Click 'View API Keys' above to copy your API secret
    });

    try {
        if (!localFilePath) return null
        const uploadResult = await cloudinary.uploader
            .upload(localFilePath, {
                resource_type: "auto"
            })
        fs.unlinkSync(localFilePath)
        return uploadResult
    } catch (error) {
        console.log("CLOUDINARY ERROR:", error);
        fs.unlinkSync(localFilePath)
        return null;
    }
}

const deletefromCloudinary = async (fileUrl) => {
    try {
        const parts = fileUrl.split("/");

        const uploadIndex = parts.indexOf("upload");

        const publicIdWithExtension = parts
            .slice(uploadIndex + 2)
            .join("/");

        const publicId = publicIdWithExtension.substring(
            0,
            publicIdWithExtension.lastIndexOf(".")
        );

        const response = await cloudinary.uploader.destroy(publicId, {
            resource_type: "video"
        });

        return response;
    } catch (error) {
        console.log("Error deleting file from Cloudinary:", error);
        return null;
    }
};
export { uploadOncloudinary,deletefromCloudinary };