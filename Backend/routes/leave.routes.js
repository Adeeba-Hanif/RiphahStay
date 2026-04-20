import express from "express";
import { verifyToken } from "../middleware/auth.middleware.js";
import { authorizeRoles } from "../middleware/role.middleware.js";
import { createLeave, getMyLeaves, getAllLeaves, decideLeave } from "../controllers/leave.controller.js";

const router = express.Router();

router.post("/create", verifyToken, createLeave);
router.get("/me", verifyToken, getMyLeaves);
router.get("/all", verifyToken, authorizeRoles("admin", "warden"), getAllLeaves);
router.patch("/:id/decide", verifyToken, authorizeRoles("admin", "warden"), decideLeave);

export default router;
