import {Router} from "express";
import { userRegister,loginUser,logoutUser,refreshAccessToken } from "../controllers/user.controller.js";
import { upload } from "../middlewares/multer.middleware.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = Router();

router.route("/register").post(
    upload.fields([
        {
            name:"avatar",
            maxCount:1
        },
        {
            name:"coverImage",
            maxCount:1
        }
    ]),
    userRegister
);

router.route("/login").post(loginUser);
//secured route
router.route("/logout").post(verifyJWT ,logoutUser);

router.post(
    "/refresh-token",
    refreshAccessToken
);

export default router;