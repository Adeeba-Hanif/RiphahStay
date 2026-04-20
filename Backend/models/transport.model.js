import mongoose from "mongoose";
const { Schema } = mongoose;

const transportSchema = new Schema(
  {
    routeName: { type: String, required: true },
    from: { type: String, required: true },
    to: { type: String, required: true },
    departureTime: { type: String, required: true },
    returnTime: { type: String },
    driverName: { type: String },
    busNumber: { type: String },
    availableSeats: { type: Number, default: 40 },
  },
  { timestamps: true }
);

export const Transport = mongoose.model("Transport", transportSchema);
