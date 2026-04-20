import express from "express";
import { verifyToken } from "../middleware/auth.middleware.js";
import { authorizeRoles } from "../middleware/role.middleware.js"
import {
    createComplaint,
    getMyComplaints,
    getAllComplaints,
    decideComplaint,
} from "../controllers/complaint.controller.js";

const router = express.Router();

router.post("/create", verifyToken, createComplaint);
router.get("/me", verifyToken, getMyComplaints);
router.get("/all", verifyToken, authorizeRoles("admin"), getAllComplaints);
router.patch("/:id/decide", verifyToken, authorizeRoles("admin"), decideComplaint);

export default router;
