import mongoose from "mongoose";
const { Schema } = mongoose;

const attendanceSchema = new Schema(
  {
    student: { type: Schema.Types.ObjectId, ref: "User", required: true },
    date: { type: Date, default: Date.now },
    status: {
      type: String,
      enum: ["incoming", "outgoing"],
      required: true,
    },
  },
  { timestamps: true }
);

export const Attendance = mongoose.model("Attendance", attendanceSchema);
