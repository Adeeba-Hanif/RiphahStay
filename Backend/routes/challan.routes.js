import express from "express";
import { verifyToken } from "../middleware/auth.middleware.js";
import { authorizeRoles } from "../middleware/role.middleware.js";
import {
    createChallan,
    generateMonthlyChallans,
    previewMonthlyChallans,
    getMyChallan,
    getMyMonthBillOverview,
    getAllChallans,
    getChallan,
    markPaid,
    downloadChallanPdf,
} from "../controllers/challan.controller.js";

const router = express.Router();

// Student routes
router.get("/my", verifyToken, getMyChallan);
router.get("/my-month-overview", verifyToken, getMyMonthBillOverview);

// Admin / Warden routes
router.get("/all", verifyToken, authorizeRoles("admin", "warden"), getAllChallans);
router.get("/preview-monthly", verifyToken, authorizeRoles("admin", "warden"), previewMonthlyChallans);
router.post("/create", verifyToken, authorizeRoles("admin"), createChallan);
router.post("/generate-monthly", verifyToken, authorizeRoles("admin"), generateMonthlyChallans);
router.patch("/:id/mark-paid", verifyToken, authorizeRoles("admin"), markPaid);

// Shared (auth-guarded, with ownership check inside controller)
router.get("/:id/pdf", verifyToken, downloadChallanPdf);
router.get("/:id", verifyToken, getChallan);

export default router;
