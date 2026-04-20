import { Service } from "../models/service.model.js";
import { Transport } from "../models/transport.model.js";
import { MessPlan } from "../models/messPlan.model.js";
import { ServiceUsage } from "../models/serviceusage.model.js";


export const getAllServices = async (req, res) => {
    try {
        const [services, transports, messPlans] = await Promise.all([
            Service.find().lean(),
            Transport.find().lean(),
            MessPlan.find().lean(),
        ]);

        return res.status(200).json({
            success: true,
            data: {
                services,
                transports,
                messPlans,
            },
        });
    } catch (error) {
        console.error("Error fetching system data:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to fetch system data",
        });
    }
};


export const createServiceRequest = async (req, res) => {
    try {
        const userId = req.user?.id
        if (!userId) {
            return res.status(401).json({ success: false, message: "Unauthorized" });
        }

        const { serviceName, items, perItemPrice } = req.body;

        if (!serviceName) {
            return res.status(400).json({ success: false, message: "serviceName is required" });
        }
        if (!items || Number(items) <= 0) {
            return res.status(400).json({ success: false, message: "items must be > 0" });
        }

        // compute total on server for safety
        const count = Number(items);
        const price = Number(perItemPrice) || 0;
        const computedTotal = count * price;

        const usage = await ServiceUsage.create({
            user: userId,
            serviceName,
            count,           
            perUnitPrice: price, 
            total:computedTotal,
            status: "pending",
        });

        return res.status(201).json({
            success: true,
            data: usage,
            computedTotal,
        });
    } catch (err) {
        console.error("createServiceRequest error:", err);
        return res.status(500).json({ success: false, message: "Server error" });
    }
};

