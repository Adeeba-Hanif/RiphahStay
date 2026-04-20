import express from "express";
import {
    getAttendanceQr, getMyAttendance, markAttendance,
    getLateStats, getLateToday,
} from "../controllers/attendance.controller.js";
import { verifyToken } from "../middleware/auth.middleware.js";
import { authorizeRoles } from "../middleware/role.middleware.js";

const router = express.Router();

router.get("/qr",
    verifyToken,
    authorizeRoles("warden", "admin"),
    getAttendanceQr);
router.post("/markAttendance", verifyToken, markAttendance);
router.get("/me", verifyToken, getMyAttendance);

router.get("/late-stats",
    verifyToken,
    authorizeRoles("admin", "warden"),
    getLateStats);
router.get("/late-today",
    verifyToken,
    authorizeRoles("admin", "warden"),
    getLateToday);

export default router;
