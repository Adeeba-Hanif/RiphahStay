import express from "express";
import { verifyToken } from "../middleware/auth.middleware.js";
import { authorizeRoles } from "../middleware/role.middleware.js";
import { getFinanceStats, getOverviewStats } from "../controllers/stats.controller.js";

const router = express.Router();

router.get("/finance",  verifyToken, authorizeRoles("admin"), getFinanceStats);
router.get("/overview", verifyToken, authorizeRoles("admin", "warden"), getOverviewStats);

export default router;
