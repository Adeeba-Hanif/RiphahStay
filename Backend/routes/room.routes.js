import express from "express";
import {
    getRooms,
    getRoomById,
    createRoomRequest,
    decideRoomRequest,
    listRoomRequests,
    getMyPendingRequest,
} from "../controllers/room.controller.js";
import { verifyToken } from "../middleware/auth.middleware.js";
import { authorizeRoles } from "../middleware/role.middleware.js";

const router = express.Router();

// GET /api/rooms
router.get("/", verifyToken, getRooms);

// Specific sub-routes MUST come before /:id to avoid Express matching them as id param

// GET /api/rooms/requests/my  (student checks own pending request)
router.get("/requests/my", verifyToken, authorizeRoles("student"), getMyPendingRequest);

// GET /api/rooms/requests/all  (warden/admin sees all requests)
router.get("/requests/all", verifyToken, authorizeRoles("warden", "admin"), listRoomRequests);

// POST /api/rooms/requests  (student creates request)
router.post("/requests", verifyToken, authorizeRoles("student"), createRoomRequest);

// PATCH /api/rooms/requests/:id/decide  (warden/admin approve/reject)
router.patch("/requests/:id/decide", verifyToken, authorizeRoles("warden", "admin"), decideRoomRequest);

// GET /api/rooms/:id  (must be last — catches any remaining :id param)
router.get("/:id", verifyToken, getRoomById);

export default router;
