import { Router } from "express";
import {
    userRegister,
    loginUser,
    logoutUser,
    refreshAccessToken,
    getUserChannelProfile,
    changeCurrentPassword,
    getCurrentUser,
    changeAccountDetails,
    changeAvatarFile,
    changeCoverImage,
    getWatchHistory
} from "../controllers/user.controller.js";
import { upload } from "../middlewares/multer.middleware.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = Router();

router.route("/register").post(
    upload.fields([
        {
            name: "avatar",
            maxCount: 1
        },
        {
            name: "coverImage",
            maxCount: 1
        }
    ]),
    userRegister
);
//secured route
router.route("/login").post(loginUser);
router.route("/logout").post(verifyJWT, logoutUser);
router.route("/refresh-token").post(refreshAccessToken);
router.route("/change-password").post(verifyJWT, changeCurrentPassword);
router.route("/current-user").get(verifyJWT, getCurrentUser);
router.route("/update-account").patch(verifyJWT, changeAccountDetails);
router.route("/change-avatar").patch(verifyJWT, upload.single("avatar"), changeAvatarFile);
router.route("/change-coverimage").patch(verifyJWT, upload.single("coverImage"), changeCoverImage);
router.route("/channelProfile/:username").get(verifyJWT, getUserChannelProfile);
router.route("/history").get(verifyJWT, getWatchHistory);

export default router;