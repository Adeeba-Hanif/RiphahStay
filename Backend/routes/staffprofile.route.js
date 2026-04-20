// routes/adminAuth.routes.js
import express from "express";
import {
    login,
    getMe,
    changePassword,
    updateProfile,
    createWarden,
    getWardens,
    setWardenStatus,
} from "../controllers/staffprofile.controller.js";
import { verifyToken } from "../middleware/auth.middleware.js"
import { authorizeRoles } from "../middleware/role.middleware.js";

const router = express.Router();

router.post("/login", login);
router.get("/me", verifyToken, getMe);
router.post("/change-password", verifyToken, changePassword);
router.patch("/update-profile", verifyToken, updateProfile);
router.post(
    "/wardens",
    verifyToken,
    authorizeRoles("admin"),
    createWarden
);
router.get(
    "/wardens",
    verifyToken,
    authorizeRoles("admin"),
    getWardens
);
router.patch(
    "/wardens/:id/status",
    verifyToken,
    authorizeRoles("admin"),
    setWardenStatus
);

export default router;
