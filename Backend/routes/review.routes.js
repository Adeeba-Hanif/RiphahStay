import express from "express";
import { verifyToken } from "../middleware/auth.middleware.js";
import { authorizeRoles } from "../middleware/role.middleware.js";
import {
    submitReview,
    getMyReviews,
    getAllReviews,
    getReviewStats,
    replyToReview,
    togglePublish,
    deleteReview,
} from "../controllers/review.controller.js";

const router = express.Router();

// Student routes
router.post("/",      verifyToken, authorizeRoles("student"), submitReview);
router.get("/my",     verifyToken, authorizeRoles("student"), getMyReviews);

// Admin / warden routes
router.get("/",       verifyToken, authorizeRoles("admin", "warden"), getAllReviews);
router.get("/stats",  verifyToken, authorizeRoles("admin", "warden"), getReviewStats);
router.patch("/:id/reply",   verifyToken, authorizeRoles("admin"), replyToReview);
router.patch("/:id/publish", verifyToken, authorizeRoles("admin"), togglePublish);
router.delete("/:id",        verifyToken, authorizeRoles("admin"), deleteReview);

export default router;
