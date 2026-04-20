/**
 * Ensures the default web admin exists and sets ONE password for all staff (admin + warden).
 *
 * Run from backend folder:
 *   npm run set-web-password
 *
 * Then sign in via API (web panel uses the same endpoint):
 *   POST /api/staffprofile/login
 *   Body: { "email": "admin@staff.riphah.edu.pk", "password": "Adeeba11222" }
 */
import dotenv from "dotenv";
import bcrypt from "bcrypt";
import connectDB from "./db.js";
import { User } from "../models/user.model.js";

dotenv.config();

const NEW_PLAIN_PASSWORD = "Adeeba11222";
const DEFAULT_ADMIN_EMAIL = "admin@staff.riphah.edu.pk";
/** Seeded demo warden — created by seeder; upsert here if missing. */
const DEFAULT_WARDEN_EMAIL = "warden@staff.riphah.edu.pk";

async function run() {
    try {
        await connectDB();
        const hash = await bcrypt.hash(NEW_PLAIN_PASSWORD, 10);

        // 1) Upsert default admin (fixes missing user or wrong password)
        const admin = await User.findOneAndUpdate(
            { email: DEFAULT_ADMIN_EMAIL },
            {
                $set: {
                    fullName: "System Admin",
                    password: hash,
                    role: "admin",
                    isActive: true,
                },
            },
            { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true }
        );
        console.log(`Admin OK: ${admin.email} (role: ${admin.role})`);

        await User.findOneAndUpdate(
            { email: DEFAULT_WARDEN_EMAIL },
            {
                $set: {
                    fullName: "Demo Warden",
                    password: hash,
                    role: "warden",
                    isActive: true,
                },
            },
            { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true }
        );
        console.log(`Warden OK: ${DEFAULT_WARDEN_EMAIL} (password synced with admin)`);

        // 2) Same password for every warden
        const wardens = await User.updateMany(
            { role: "warden" },
            { $set: { password: hash } }
        );
        console.log(
            `Warden passwords updated. Matched: ${wardens.matchedCount}, modified: ${wardens.modifiedCount}.`
        );

        console.log("");
        console.log("Web / API login:");
        console.log(`  Email:    ${DEFAULT_ADMIN_EMAIL}`);
        console.log(`  Password: ${NEW_PLAIN_PASSWORD}`);
        console.log(`  POST ${process.env.API_PUBLIC_URL || "http://localhost:" + (process.env.PORT || 3000)}/api/staffprofile/login`);
        process.exit(0);
    } catch (err) {
        console.error("setWebStaffPassword failed:", err);
        process.exit(1);
    }
}

run();
