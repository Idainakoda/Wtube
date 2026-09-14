import { apiErrors } from "../utils/apiErrors.js";
import { asyncHandler} from "../utils/asyncHandler.js";
import jwt from "jsonwebtoken";
import { User } from "../models/user.model.js";

export const verifyJWT = asyncHandler(async(req,res,next)=>{
    try {
        const token = req.cookies?.accessToken || req.header("Authorization")?. replace("Bearer", "");
    
        if(!token){
            throw new apiErrors(401, "Unauthorized request");
        }
    
        const decodedToken = jwt.verify(token,process.env.SECRET_ACCESS_TOKEN);
    
        const user = await User.findById(decodedToken?._id).select("-password -refreshTockens"); 
        
        if(!user){
            throw new apiErrors(401, "Invalid Access Token")
        }
        
        req.user  = user;
        next();
    } catch (error) {
        throw new apiErrors(401, error?.message || "Invalid Access Token")
    }
})