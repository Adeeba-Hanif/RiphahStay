/**
 * Review controller
 *
 * Endpoints:
 *   POST   /api/reviews/             – student: submit a review
 *   GET    /api/reviews/my           – student: get own reviews
 *   GET    /api/reviews/             – admin/warden: get all reviews (with filters)
 *   GET    /api/reviews/stats        – admin: aggregated rating stats
 *   PATCH  /api/reviews/:id/reply    – admin: reply to a review
 *   PATCH  /api/reviews/:id/publish  – admin: toggle publish status
 *   DELETE /api/reviews/:id          – admin: delete a review
 */

import { Review } from "../models/review.model.js";

// ── POST /api/reviews/  (student)  ──────────────────────────────────────────
export const submitReview = async (req, res) => {
    try {
        const { rating, category = "overall", title, text } = req.body;

        if (!rating || !text?.trim()) {
            return res.status(400).json({ message: "rating and text are required" });
        }

        const parsedRating = Number(rating);
        if (!Number.isInteger(parsedRating) || parsedRating < 1 || parsedRating > 5) {
            return res.status(400).json({ message: "rating must be an integer between 1 and 5" });
        }

        if (text.trim().length < 10) {
            return res.status(400).json({ message: "Review text must be at least 10 characters" });
        }

        const review = await Review.create({
            student:  req.user.id,
            rating:   parsedRating,
            category,
            title:    title?.trim() || "",
            text:     text.trim(),
        });

        const populated = await Review.findById(review._id)
            .populate("student", "fullName email")
            .lean();

        return res.status(201).json({ message: "Review submitted", review: populated });
    } catch (err) {
        console.error("submitReview error:", err);
        return res.status(500).json({ message: "Server error" });
    }
};

// ── GET /api/reviews/my  (student)  ─────────────────────────────────────────
export const getMyReviews = async (req, res) => {
    try {
        const reviews = await Review.find({ student: req.user.id })
            .sort({ createdAt: -1 })
            .lean();
        return res.json({ reviews });
    } catch (err) {
        console.error("getMyReviews error:", err);
        return res.status(500).json({ message: "Server error" });
    }
};

// ── GET /api/reviews/  (admin/warden)  ──────────────────────────────────────
// ?category=&rating=&isPublished=true|false&page=1&limit=20
export const getAllReviews = async (req, res) => {
    try {
        const { category, rating, isPublished, page = 1, limit = 20 } = req.query;
        const filter = {};
        if (category)              filter.category    = category;
        if (rating)                filter.rating      = Number(rating);
        if (isPublished !== undefined) filter.isPublished = isPublished === "true";

        const skip  = (Number(page) - 1) * Number(limit);
        const total = await Review.countDocuments(filter);

        const reviews = await Review.find(filter)
            .populate("student", "fullName email room")
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(Number(limit))
            .lean();

        return res.json({ reviews, total, page: Number(page), pages: Math.ceil(total / Number(limit)) });
    } catch (err) {
        console.error("getAllReviews error:", err);
        return res.status(500).json({ message: "Server error" });
    }
};

// ── GET /api/reviews/stats  (admin)  ────────────────────────────────────────
export const getReviewStats = async (req, res) => {
    try {
        const [aggResult] = await Review.aggregate([
            { $match: { isPublished: true } },
            {
                $group: {
                    _id: null,
                    totalReviews:  { $sum: 1 },
                    averageRating: { $avg: "$rating" },
                    rating5: { $sum: { $cond: [{ $eq: ["$rating", 5] }, 1, 0] } },
                    rating4: { $sum: { $cond: [{ $eq: ["$rating", 4] }, 1, 0] } },
                    rating3: { $sum: { $cond: [{ $eq: ["$rating", 3] }, 1, 0] } },
                    rating2: { $sum: { $cond: [{ $eq: ["$rating", 2] }, 1, 0] } },
                    rating1: { $sum: { $cond: [{ $eq: ["$rating", 1] }, 1, 0] } },
                },
            },
        ]);

        const byCategory = await Review.aggregate([
            { $match: { isPublished: true } },
            {
                $group: {
                    _id:    "$category",
                    avg:    { $avg: "$rating" },
                    count:  { $sum: 1 },
                },
            },
            { $sort: { _id: 1 } },
        ]);

        return res.json({
            stats: aggResult
                ? {
                      totalReviews:  aggResult.totalReviews,
                      averageRating: Math.round(aggResult.averageRating * 10) / 10,
                      distribution:  {
                          5: aggResult.rating5,
                          4: aggResult.rating4,
                          3: aggResult.rating3,
                          2: aggResult.rating2,
                          1: aggResult.rating1,
                      },
                  }
                : { totalReviews: 0, averageRating: 0, distribution: { 5:0,4:0,3:0,2:0,1:0 } },
            byCategory,
        });
    } catch (err) {
        console.error("getReviewStats error:", err);
        return res.status(500).json({ message: "Server error" });
    }
};

// ── PATCH /api/reviews/:id/reply  (admin)  ──────────────────────────────────
export const replyToReview = async (req, res) => {
    try {
        const { reply } = req.body;
        if (!reply?.trim()) return res.status(400).json({ message: "reply text is required" });

        const review = await Review.findById(req.params.id);
        if (!review) return res.status(404).json({ message: "Review not found" });

        review.adminReply = reply.trim();
        review.repliedAt  = new Date();
        await review.save();

        return res.json({ message: "Reply added", review });
    } catch (err) {
        console.error("replyToReview error:", err);
        return res.status(500).json({ message: "Server error" });
    }
};

// ── PATCH /api/reviews/:id/publish  (admin)  ────────────────────────────────
export const togglePublish = async (req, res) => {
    try {
        const review = await Review.findById(req.params.id);
        if (!review) return res.status(404).json({ message: "Review not found" });

        review.isPublished = !review.isPublished;
        await review.save();

        return res.json({ message: `Review ${review.isPublished ? "published" : "unpublished"}`, review });
    } catch (err) {
        console.error("togglePublish error:", err);
        return res.status(500).json({ message: "Server error" });
    }
};

// ── DELETE /api/reviews/:id  (admin)  ───────────────────────────────────────
export const deleteReview = async (req, res) => {
    try {
        const review = await Review.findByIdAndDelete(req.params.id);
        if (!review) return res.status(404).json({ message: "Review not found" });
        return res.json({ message: "Review deleted" });
    } catch (err) {
        console.error("deleteReview error:", err);
        return res.status(500).json({ message: "Server error" });
    }
};
