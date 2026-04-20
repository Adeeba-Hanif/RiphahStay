import express from "express";
import { verifyToken }      from "../middleware/auth.middleware.js";
import { authorizeRoles }   from "../middleware/role.middleware.js";
import {
    logMeal,
    logMyMeal,
    logMyChoices,
    getMyRecords,
    getAllRecords,
    generateMessChallan,
} from "../controllers/mess.controller.js";

const router = express.Router();

// Student routes
router.get("/my-records",            verifyToken, getMyRecords);
router.post("/log-my-meal",         verifyToken, logMyMeal);
router.post("/log-my-choices",       verifyToken, logMyChoices);
router.post("/generate-challan",     verifyToken, generateMessChallan);

// Admin / Warden routes
router.get("/all-records",           verifyToken, authorizeRoles("admin", "warden"), getAllRecords);
router.post("/log",                  verifyToken, authorizeRoles("admin", "warden"), logMeal);

export default router;
