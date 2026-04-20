import express from "express";
import { verifyToken } from "../middleware/auth.middleware.js";
import { authorizeRoles } from "../middleware/role.middleware.js";
import {
    getAllRoutes,
    getPublicRoutes,
    getRouteById,
    createRoute,
    updateRoute,
    deleteRoute,
} from "../controllers/transport.controller.js";

const router = express.Router();

// Public schedule (must be before "/:id" so "public" is not parsed as an id)
router.get("/public", getPublicRoutes);

// Any authenticated user can view routes
router.get("/",    verifyToken, getAllRoutes);
router.get("/:id", verifyToken, getRouteById);

// Admin-only mutations
router.post("/",      verifyToken, authorizeRoles("admin"), createRoute);
router.put("/:id",    verifyToken, authorizeRoles("admin"), updateRoute);
router.delete("/:id", verifyToken, authorizeRoles("admin"), deleteRoute);

export default router;
