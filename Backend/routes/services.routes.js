import express from "express";
import { verifyToken } from "../middleware/auth.middleware.js";
import { createServiceRequest, getAllServices } from "../controllers/services.controller.js";
import { authorizeRoles } from "../middleware/role.middleware.js";
import { getRooms } from "../controllers/room.controller.js";

const router = express.Router();

router.get("/all", verifyToken, getAllServices);
router.post("/request", verifyToken, authorizeRoles("student"), createServiceRequest);
export default router;