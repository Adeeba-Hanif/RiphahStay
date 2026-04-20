import express from "express";
import {
    getStudentProfile, updateMyProfile, getAllStudents,
    getStudentById, setStudentStatus,
} from "../controllers/studentprofile.controller.js";
import { verifyToken } from "../middleware/auth.middleware.js";
import { authorizeRoles } from "../middleware/role.middleware.js";

const router = express.Router();

// Student (self)
router.get("/student/me", verifyToken, getStudentProfile);
router.put("/student/me", verifyToken, updateMyProfile);

// Admin / Warden
router.get("/students",                   verifyToken, authorizeRoles("admin", "warden"), getAllStudents);
router.get("/students/:id",               verifyToken, authorizeRoles("admin", "warden"), getStudentById);
router.patch("/students/:id/status",      verifyToken, authorizeRoles("admin"),           setStudentStatus);



export default router;