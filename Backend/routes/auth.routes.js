import express from "express";
import { studentSignup } from "../controllers/studentsignup.controller.js";
import { studentSignin } from "../controllers/studentlogin.controller.js";
import { refreshToken } from "../controllers/refreshtoken.controller.js";
import { verifyToken } from "../middleware/auth.middleware.js";
import { changePassword } from "../controllers/changepassword.controller.js";
import { forgotPassword, resetPassword } from "../controllers/resetpassword.controller.js";

const router = express.Router();

router.post("/signup", studentSignup);
router.post("/signin", studentSignin);
router.post("/refresh", verifyToken, refreshToken);
router.post("/change-password", verifyToken, changePassword);
router.post("/forgot-password", forgotPassword);
router.post("/reset-password", resetPassword);

export default router;
