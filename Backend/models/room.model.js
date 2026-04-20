import mongoose from "mongoose";
const { Schema } = mongoose;

const roomSchema = new Schema(
    {
        level: { type: String, required: true },
        roomNumber: { type: String, required: true },
        rent: { type: Number, required: true },
        capacity: { type: Number, default: 2 },
        occupants: [{ type: Schema.Types.ObjectId, ref: "User" }],
        wifiPoint: { type: Schema.Types.ObjectId, ref: "Service" },
        status: {
            type: String,
            enum: ["available", "booked", "maintenance", "other"],
            default: "available",
        },
        updatedBy: {
            type: mongoose.Schema.Types.ObjectId,
            default: null,
        },

    },
    { timestamps: true }
);

export const Room = mongoose.model("Room", roomSchema);


const roomRequestSchema = new Schema(
    {
        student: { type: Schema.Types.ObjectId, ref: "User", required: true },
        fromRoom: { type: Schema.Types.ObjectId, ref: "Room" }, // optional if first time
        toRoom: { type: Schema.Types.ObjectId, ref: "Room", required: true },
        status: {
            type: String,
            enum: ["pending", "approved", "rejected"],
            default: "pending",
        },
        wardenNote: { type: String },
        decidedBy: { type: Schema.Types.ObjectId, ref: "User" }, // warden/admin
    },
    { timestamps: true }
);

export const RoomRequest = mongoose.model("RoomRequest", roomRequestSchema);
