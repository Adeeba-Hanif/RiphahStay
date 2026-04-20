/**
 * Transport controller
 *
 * Endpoints:
 *   GET    /api/transport/            – any authenticated user: list all routes
 *   GET    /api/transport/:id         – any authenticated user: single route
 *   POST   /api/transport/            – admin only: create route
 *   PUT    /api/transport/:id         – admin only: update route
 *   DELETE /api/transport/:id         – admin only: delete route
 */

import { Transport } from "../models/transport.model.js";

// ── GET /api/transport/  ────────────────────────────────────────────────────
export const getAllRoutes = async (req, res) => {
    try {
        const routes = await Transport.find().sort({ routeName: 1 }).lean();
        return res.json({ routes, count: routes.length });
    } catch (err) {
        console.error("getAllRoutes error:", err);
        return res.status(500).json({ message: "Server error" });
    }
};

/** Same payload as getAllRoutes — no auth (for guest explore / public schedule pages). */
export const getPublicRoutes = getAllRoutes;

// ── GET /api/transport/:id  ─────────────────────────────────────────────────
export const getRouteById = async (req, res) => {
    try {
        const route = await Transport.findById(req.params.id).lean();
        if (!route) return res.status(404).json({ message: "Route not found" });
        return res.json({ route });
    } catch (err) {
        console.error("getRouteById error:", err);
        return res.status(500).json({ message: "Server error" });
    }
};

// ── POST /api/transport/  (admin only)  ─────────────────────────────────────
// Body: { routeName, from, to, departureTime, returnTime?, driverName?, busNumber?, availableSeats? }
export const createRoute = async (req, res) => {
    try {
        const { routeName, from, to, departureTime, returnTime, driverName, busNumber, availableSeats } = req.body;

        if (!routeName?.trim() || !from?.trim() || !to?.trim() || !departureTime?.trim()) {
            return res.status(400).json({ message: "routeName, from, to, and departureTime are required" });
        }

        const route = await Transport.create({
            routeName:      routeName.trim(),
            from:           from.trim(),
            to:             to.trim(),
            departureTime:  departureTime.trim(),
            returnTime:     returnTime?.trim() || "",
            driverName:     driverName?.trim() || "",
            busNumber:      busNumber?.trim() || "",
            availableSeats: availableSeats ?? 40,
        });

        return res.status(201).json({ message: "Route created", route });
    } catch (err) {
        console.error("createRoute error:", err);
        return res.status(500).json({ message: "Server error" });
    }
};

// ── PUT /api/transport/:id  (admin only)  ───────────────────────────────────
export const updateRoute = async (req, res) => {
    try {
        const { routeName, from, to, departureTime, returnTime, driverName, busNumber, availableSeats } = req.body;

        const route = await Transport.findById(req.params.id);
        if (!route) return res.status(404).json({ message: "Route not found" });

        if (routeName?.trim())     route.routeName     = routeName.trim();
        if (from?.trim())          route.from          = from.trim();
        if (to?.trim())            route.to            = to.trim();
        if (departureTime?.trim()) route.departureTime = departureTime.trim();
        if (returnTime !== undefined) route.returnTime = returnTime?.trim() || "";
        if (driverName !== undefined) route.driverName = driverName?.trim() || "";
        if (busNumber  !== undefined) route.busNumber  = busNumber?.trim()  || "";
        if (availableSeats !== undefined) route.availableSeats = Number(availableSeats) || 40;

        await route.save();
        return res.json({ message: "Route updated", route });
    } catch (err) {
        console.error("updateRoute error:", err);
        return res.status(500).json({ message: "Server error" });
    }
};

// ── DELETE /api/transport/:id  (admin only)  ────────────────────────────────
export const deleteRoute = async (req, res) => {
    try {
        const route = await Transport.findByIdAndDelete(req.params.id);
        if (!route) return res.status(404).json({ message: "Route not found" });
        return res.json({ message: "Route deleted" });
    } catch (err) {
        console.error("deleteRoute error:", err);
        return res.status(500).json({ message: "Server error" });
    }
};
