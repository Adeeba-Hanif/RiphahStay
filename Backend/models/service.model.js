import mongoose from "mongoose";
const { Schema } = mongoose;

const serviceSchema = new Schema(
    {
        name: { type: String, required: true },
        type: { type: String, enum: ["wifi", "laundry", "ironing"], required: true },
        description: { type: String },
        pricePerItem: { type: Number },
        wifiRooms: [{ type: Schema.Types.ObjectId, ref: "Room" }],
        isActive: { type: Boolean, default: true },
        password: { type: String, default: null }
    },
    { timestamps: true }
);

export const Service = mongoose.model("Service", serviceSchema);
