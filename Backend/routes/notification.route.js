import express from "express";
import { verifyToken } from "../middleware/auth.middleware.js";
import { authorizeRoles } from "../middleware/role.middleware.js";
import {
    getNotifications,
    updateNotificationRead,
    sendBroadcast,
} from "../controllers/notifications.controller.js";

const router = express.Router();

// GET all notifications for current user (student/warden/admin)
router.get("/", verifyToken, getNotifications);

router.post("/send", verifyToken, authorizeRoles("admin", "warden"), sendBroadcast);

router.patch("/:id/read", verifyToken, updateNotificationRead);

export default router;
