import mongoose from "mongoose";

const mealSchema = new mongoose.Schema({
    items: { type: [String], required: true },
});

const messPlanSchema = new mongoose.Schema({
    day: { type: String, required: true },
    meals: {
        breakfast: { type: mealSchema, required: true },
        lunch: { type: mealSchema, required: true },
        dinner: { type: mealSchema, required: true },
    },
});

export const MessPlan = mongoose.model("MessPlan", messPlanSchema);
