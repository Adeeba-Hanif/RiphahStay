import mongoose from "mongoose";
const { Schema } = mongoose;

const reviewSchema = new Schema(
    {
        student: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        rating: {
            type: Number,
            required: true,
            min: 1,
            max: 5,
        },
        category: {
            type: String,
            enum: ["overall", "cleanliness", "food", "staff", "facilities", "security"],
            default: "overall",
        },
        title: {
            type: String,
            trim: true,
            maxlength: 100,
        },
        text: {
            type: String,
            required: true,
            trim: true,
            minlength: 10,
            maxlength: 1000,
        },
        isPublished: {
            type: Boolean,
            default: true,
        },
        adminReply: {
            type: String,
            trim: true,
            default: "",
        },
        repliedAt: {
            type: Date,
            default: null,
        },
    },
    { timestamps: true }
);

// One active review per student per category per month
reviewSchema.index({ student: 1, category: 1 });

export const Review = mongoose.model("Review", reviewSchema);
