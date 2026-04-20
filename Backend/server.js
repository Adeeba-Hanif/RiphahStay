import express from "express";
import dotenv from "dotenv";
import cors from "cors";
// importing models
import "./models/attendance.model.js";
import "./models/billing.model.js";
import "./models/challan.model.js";
import "./models/messrecord.model.js";
import "./models/complaint.model.js";
import "./models/leave.model.js";
import "./models/messPlan.model.js";
import "./models/notification.model.js";
import "./models/room.model.js";
import "./models/service.model.js";
import "./models/serviceusage.model.js";
import "./models/transport.model.js";
import "./models/user.model.js";
import "./models/review.model.js";

import authRoutes        from "./routes/auth.routes.js";
import userRoutes        from "./routes/user.routes.js";
import serviceroutes     from "./routes/services.routes.js";
import attendanceroutes  from "./routes/attendance.route.js";
import complaintsroutes  from "./routes/complaint.routes.js";
import leaveroutes       from "./routes/leave.routes.js";
import roomroutes        from "./routes/room.routes.js";
import notificationRoute from "./routes/notification.route.js";
import staffprofiles     from "./routes/staffprofile.route.js";
import challanRoutes     from "./routes/challan.routes.js";
import messRoutes        from "./routes/mess.routes.js";
import transportRoutes   from "./routes/transport.routes.js";
import reviewRoutes      from "./routes/review.routes.js";
import statsRoutes       from "./routes/stats.routes.js";

dotenv.config();
const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Health check route
app.get("/health", (req, res) => {
    res.status(200).json({ message: "Server is live" });
});

// API routes
app.use("/api/auth", authRoutes);
app.use("/api/user", userRoutes);
app.use("/api/service", serviceroutes);
app.use("/api/attendance", attendanceroutes);
app.use("/api/complaints", complaintsroutes);
app.use("/api/leave", leaveroutes);
app.use("/api/room", roomroutes);
app.use("/api/notifications", notificationRoute);
app.use("/api/staffprofile", staffprofiles);
app.use("/api/challan",   challanRoutes);
app.use("/api/mess",      messRoutes);
app.use("/api/transport", transportRoutes);
app.use("/api/reviews",   reviewRoutes);
app.use("/api/stats",     statsRoutes);


// Exported start function
export const startServer = () => {
    const PORT = process.env.PORT || 3000;
    app.listen(PORT, () => {
        console.log(`Server running on port ${PORT}`);
    });
};

// Bootstrap
import connectDB from "./config/db.js";
connectDB().then(() => startServer());

export default app;
