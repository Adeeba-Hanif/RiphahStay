import mongoose from "mongoose";
import { User } from "../models/user.model.js";
import { Service } from "../models/service.model.js"; 

export const getUserProfileById = async (userId, session = null) => {
    if (!userId) return null;

    // get user and its room
    const q = User.findById(userId).select("-password").populate("room");
    if (session) q.session(session);

    const user = await q;
    if (!user) return null;

    // we may or may not have MessPlan registered
    const MessPlan = mongoose.models.MessPlan;

    let wifiService = null;

    // if user has a room, try to figure out which wifi serves it
    if (user.room) {
        const roomId = user.room._id;

        // case 1: room already points to a wifi directly
        if (user.room.wifiPoint) {
            // load that wifi service
            const svcQ = Service.findById(user.room.wifiPoint);
            if (session) svcQ.session(session);
            const svc = await svcQ;
            // even if it doesn't exist, send back at least the id
            wifiService = svc || user.room.wifiPoint;
        } else {
            // case 2: room doesn't have wifiPoint, so look for a wifi that lists this room
            const svcQ = Service.findOne({
                type: "wifi",
                isActive: true,
                // you said now wifiRooms has real room ids
                wifiRooms: roomId,
            });
            if (session) svcQ.session(session);
            const svc = await svcQ;
            wifiService = svc || null;
        }
    }

    // mess plans part stays the same
    let messPlans = [];
    if (MessPlan) {
        const mpQ = MessPlan.find({});
        if (session) mpQ.session(session);
        const all = await mpQ;

        const dayMap = {
            monday: "mon",
            mon: "mon",
            tuesday: "tue",
            tue: "tue",
            wednesday: "wed",
            wed: "wed",
            thursday: "thu",
            thu: "thu",
            friday: "fri",
            fri: "fri",
            saturday: "sat",
            sat: "sat",
            sunday: "sun",
            sun: "sun",
        };

        const userChoices = user.messChoices || {};

        messPlans = all.map((plan) => {
            const key = dayMap[plan.day?.toLowerCase()] || "";
            return {
                ...plan.toObject(),
                choices: key
                    ? userChoices[key] || {
                        breakfast: true,
                        lunch: true,
                        dinner: true,
                    }
                    : {
                        breakfast: true,
                        lunch: true,
                        dinner: true,
                    },
            };
        });
    }

    const userObj = user.toObject();
    return {
        ...userObj,
        wifiService, 
        messPlans,
    };
};
