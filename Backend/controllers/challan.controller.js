import PDFDocument from "pdfkit";
import { Room } from "../models/room.model.js";
import { Challan } from "../models/challan.model.js";
import { User } from "../models/user.model.js";
import { MessRecord } from "../models/messrecord.model.js";
import { createChallanInternal } from "../utils/createChallanInternal.js";
import { DEFAULT_ROOM_RENT_PKR } from "../config/finance.js";
import { getMonthLabelForDate, parseBillingMonth } from "../utils/billingMonth.js";
import { summarizeChallanLineItems } from "../utils/challanItemSplit.js";

// POST /api/challan/create  (admin only)
// Body: { studentId, month, items: [{description, amount}], dueDate }
export const createChallan = async (req, res) => {
    try {
        const { studentId, month, items, dueDate } = req.body;

        if (!studentId || !month || !items?.length || !dueDate) {
            return res.status(400).json({ message: "studentId, month, items and dueDate are required" });
        }

        const student = await User.findOne({ _id: studentId, role: "student" });
        if (!student) {
            return res.status(404).json({ message: "Student not found" });
        }

        // Prevent duplicate monthly challan for same student + month
        const duplicate = await Challan.findOne({ student: studentId, month, type: "monthly" });
        if (duplicate) {
            return res.status(409).json({ message: `Monthly challan for ${month} already exists for this student` });
        }

        const challan = await createChallanInternal({
            student: studentId,
            month,
            items,
            dueDate: new Date(dueDate),
            createdBy: req.user.id,
            type: "monthly",
        });

        return res.status(201).json({ message: "Challan created", challan });
    } catch (err) {
        console.error("createChallan error:", err);
        return res.status(500).json({ message: "Server error" });
    }
};

// GET /api/challan/preview-monthly?month=April%202026  (admin only)
// Dry-run: who will get a challan, room rent used, unbilled mess totals — no DB writes.
export const previewMonthlyChallans = async (req, res) => {
    try {
        const monthRaw = req.query.month;
        if (!monthRaw) {
            return res.status(400).json({ message: "month query parameter is required" });
        }

        const parsed = parseBillingMonth(monthRaw);
        if (!parsed) {
            return res.status(400).json({ message: "Invalid month (use e.g. April 2026)" });
        }

        const { monthStart, monthEnd, label } = parsed;

        const students = await User.find({ role: "student", isActive: true })
            .populate("room", "rent roomNumber level")
            .select("fullName email room")
            .lean();

        const rooms = await Room.find({})
            .select("level roomNumber rent capacity status occupants")
            .populate("occupants", "fullName email")
            .lean();

        const eligible = [];
        const skippedDuplicate = [];
        const skippedNoRoom = [];

        for (const student of students) {
            const existing = await Challan.findOne({ student: student._id, month: label, type: "monthly" });
            if (existing) {
                skippedDuplicate.push({
                    email: student.email,
                    fullName: student.fullName,
                    reason: "Monthly challan already exists for this month",
                });
                continue;
            }
            if (!student.room) {
                skippedNoRoom.push({
                    email: student.email,
                    fullName: student.fullName,
                    reason: "No room assigned",
                });
                continue;
            }

            const roomRent = Number(student.room.rent) || DEFAULT_ROOM_RENT_PKR;

            const messRecords = await MessRecord.find({
                student: student._id,
                isBilled: false,
                date: { $gte: monthStart, $lte: monthEnd },
            })
                .sort({ date: 1 })
                .lean();

            const messTotal = messRecords.reduce((s, r) => s + r.price * r.quantity, 0);

            eligible.push({
                email: student.email,
                fullName: student.fullName,
                room: {
                    level: student.room.level,
                    roomNumber: student.room.roomNumber,
                    rentUsed: roomRent,
                },
                messLineCount: messRecords.length,
                messTotal,
                estimatedTotal: roomRent + messTotal,
            });
        }

        return res.json({
            month: label,
            defaultRoomRent: DEFAULT_ROOM_RENT_PKR,
            rooms,
            eligible,
            skippedDuplicate,
            skippedNoRoom,
            counts: {
                eligible: eligible.length,
                skippedDuplicate: skippedDuplicate.length,
                skippedNoRoom: skippedNoRoom.length,
            },
        });
    } catch (err) {
        console.error("previewMonthlyChallans error:", err);
        return res.status(500).json({ message: "Server error" });
    }
};

// POST /api/challan/generate-monthly  (admin only)
// Generates challans for ALL students for a given month based on room rent + service usage
export const generateMonthlyChallans = async (req, res) => {
    try {
        const { month, dueDate } = req.body;
        if (!month || !dueDate) {
            return res.status(400).json({ message: "month and dueDate are required" });
        }

        const parsed = parseBillingMonth(month);
        if (!parsed) {
            return res.status(400).json({ message: "Invalid month (use e.g. April 2026)" });
        }

        const { monthStart, monthEnd, label: monthLabel } = parsed;

        const students = await User.find({ role: "student", isActive: true })
            .populate("room", "rent roomNumber level")
            .lean();

        const results = { created: [], skipped: [] };

        for (const student of students) {
            const existing = await Challan.findOne({ student: student._id, month: monthLabel, type: "monthly" });
            if (existing) {
                results.skipped.push(student.email);
                continue;
            }

            const items = [];

            if (student.room) {
                const roomRent = Number(student.room.rent) || DEFAULT_ROOM_RENT_PKR;
                items.push({
                    description: `Room Rent – ${student.room.level}/${student.room.roomNumber}`,
                    amount: roomRent,
                });
            } else {
                results.skipped.push(student.email + " (no room assigned)");
                continue;
            }

            // Fixed included services
            items.push({ description: "Wi-Fi (Included)", amount: 0 });
            items.push({ description: "Transport (Included)", amount: 0 });

            // Merge unbilled mess records into the monthly challan
            const messRecords = await MessRecord.find({
                student:  student._id,
                isBilled: false,
                date:     { $gte: monthStart, $lte: monthEnd },
            }).sort({ date: 1 }).lean();

            const messIds    = [];
            for (const r of messRecords) {
                const lineAmount = r.price * r.quantity;
                items.push({
                    description: `Mess – ${r.itemName} (${new Date(r.date).toLocaleDateString("en-PK", { day: "numeric", month: "short" })})`,
                    amount: lineAmount,
                });
                messIds.push(r._id);
            }

            const challan = await createChallanInternal({
                student:     student._id,
                month:       monthLabel,
                items,
                dueDate:     new Date(dueDate),
                createdBy:   req.user.id,
                type:        "monthly",
                messRecords: messIds,
            });

            // Mark those mess records as billed
            if (messIds.length) {
                await MessRecord.updateMany(
                    { _id: { $in: messIds } },
                    { $set: { isBilled: true, challan: challan._id } }
                );
            }

            results.created.push(student.email);
        }

        return res.status(201).json({
            message: `Monthly challans generated`,
            created: results.created.length,
            skipped: results.skipped.length,
            details: results,
        });
    } catch (err) {
        console.error("generateMonthlyChallans error:", err);
        return res.status(500).json({ message: "Server error" });
    }
};

// GET /api/challan/my  (student)
export const getMyChallan = async (req, res) => {
    try {
        const challans = await Challan.find({ student: req.user.id })
            .sort({ createdAt: -1 })
            .lean();
        return res.json({ challans });
    } catch (err) {
        console.error("getMyChallan error:", err);
        return res.status(500).json({ message: "Server error" });
    }
};

// GET /api/challan/my-month-overview?month=April%202026  (student)
// Room rent, running unbilled mess for the calendar month, and monthly challan breakdown.
export const getMyMonthBillOverview = async (req, res) => {
    try {
        if (req.user.role !== "student") {
            return res.status(403).json({ message: "Students only" });
        }

        const studentId = req.user.id;
        let monthRaw = String(req.query.month || "").trim();
        if (!monthRaw) monthRaw = getMonthLabelForDate();
        let parsed = parseBillingMonth(monthRaw);
        if (!parsed) {
            monthRaw = getMonthLabelForDate();
            parsed = parseBillingMonth(monthRaw);
        }
        const { monthStart, monthEnd, label } = parsed;

        const user = await User.findById(studentId).populate("room", "rent roomNumber level").lean();
        if (!user) return res.status(404).json({ message: "User not found" });

        const room = user.room;
        const roomRent = room ? Number(room.rent) || DEFAULT_ROOM_RENT_PKR : null;

        const unbilledRecords = await MessRecord.find({
            student: studentId,
            isBilled: false,
            date: { $gte: monthStart, $lte: monthEnd },
        })
            .sort({ date: 1 })
            .lean();

        const messUnbilledTotal = unbilledRecords.reduce((s, r) => s + r.price * r.quantity, 0);

        const monthlyChallan = await Challan.findOne({
            student: studentId,
            month: label,
            type: "monthly",
        }).lean();

        let roomSubtotal = 0;
        let messSubtotal = 0;
        if (monthlyChallan?.items?.length) {
            const split = summarizeChallanLineItems(monthlyChallan.items);
            roomSubtotal = split.roomSubtotal;
            messSubtotal = split.messSubtotal;
        }

        let phase = "no_room";
        if (room && !monthlyChallan) phase = "month_open";
        else if (monthlyChallan?.status === "unpaid") phase = "monthly_unpaid";
        else if (monthlyChallan?.status === "paid") phase = "monthly_paid";

        const projectedTotalNoChallanYet =
            room && !monthlyChallan ? roomRent + messUnbilledTotal : null;

        const balanceWithChallan =
            monthlyChallan && monthlyChallan.status === "unpaid"
                ? Number(monthlyChallan.totalAmount) + messUnbilledTotal
                : null;

        return res.json({
            month: label,
            phase,
            room: room
                ? {
                      level: room.level,
                      roomNumber: room.roomNumber,
                      rent: roomRent,
                  }
                : null,
            roomRent,
            messUnbilledTotal,
            messUnbilledCount: unbilledRecords.length,
            messUnbilledLines: unbilledRecords.map((r) => ({
                _id: r._id,
                date: r.date,
                mealType: r.mealType,
                itemName: r.itemName,
                amount: r.price * r.quantity,
            })),
            monthlyChallan: monthlyChallan
                ? {
                      _id: monthlyChallan._id,
                      challanId: monthlyChallan.challanId,
                      status: monthlyChallan.status,
                      totalAmount: monthlyChallan.totalAmount,
                      dueDate: monthlyChallan.dueDate,
                      paidAt: monthlyChallan.paidAt,
                      roomSubtotal,
                      messSubtotal,
                  }
                : null,
            projectedTotalNoChallanYet,
            balanceWithChallan,
            studentNote:
                phase === "no_room"
                    ? "Assign a room to see rent and mess for this month."
                    : phase === "month_open"
                      ? "Your monthly hostel challan is not generated yet. Mess meals you log add to the estimate; when admin generates the challan, room rent plus billed mess lines appear on one slip."
                      : phase === "monthly_unpaid"
                        ? "You have an issued monthly challan. Extra mess logged after it was created is added on top until the next cycle."
                        : "This month's hostel challan is paid. New mess lines may apply to a future bill.",
        });
    } catch (err) {
        console.error("getMyMonthBillOverview error:", err);
        return res.status(500).json({ message: "Server error" });
    }
};

// GET /api/challan/all  (admin/warden)
// ?status=paid|unpaid&month=June 2025
export const getAllChallans = async (req, res) => {
    try {
        const filter = {};
        if (req.query.status) filter.status = req.query.status;
        if (req.query.month) filter.month = req.query.month;

        const challans = await Challan.find(filter)
            .populate("student", "fullName email room")
            .sort({ createdAt: -1 })
            .lean();

        return res.json({ challans });
    } catch (err) {
        console.error("getAllChallans error:", err);
        return res.status(500).json({ message: "Server error" });
    }
};

// GET /api/challan/:id  (any authenticated user)
export const getChallan = async (req, res) => {
    try {
        const challan = await Challan.findById(req.params.id)
            .populate("student", "fullName email phone room")
            .lean();

        if (!challan) return res.status(404).json({ message: "Challan not found" });

        // Students can only see their own challans
        if (req.user.role === "student" && challan.student._id.toString() !== req.user.id) {
            return res.status(403).json({ message: "Access denied" });
        }

        return res.json({ challan });
    } catch (err) {
        console.error("getChallan error:", err);
        return res.status(500).json({ message: "Server error" });
    }
};

// PATCH /api/challan/:id/mark-paid  (admin only)
// Body: { bankRef? }
export const markPaid = async (req, res) => {
    try {
        const challan = await Challan.findById(req.params.id);
        if (!challan) return res.status(404).json({ message: "Challan not found" });
        if (challan.status === "paid") {
            return res.status(400).json({ message: "Challan is already marked as paid" });
        }

        challan.status = "paid";
        challan.paidAt = new Date();
        if (req.body.bankRef) challan.bankRef = req.body.bankRef;
        await challan.save();

        return res.json({ message: "Challan marked as paid", challan });
    } catch (err) {
        console.error("markPaid error:", err);
        return res.status(500).json({ message: "Server error" });
    }
};

// GET /api/challan/:id/pdf  (any authenticated user)
export const downloadChallanPdf = async (req, res) => {
    try {
        const challan = await Challan.findById(req.params.id)
            .populate("student", "fullName email phone")
            .lean();

        if (!challan) return res.status(404).json({ message: "Challan not found" });

        const studentDoc = challan.student;
        if (req.user.role === "student") {
            const sid = studentDoc?._id?.toString();
            if (!sid || sid !== req.user.id)
                return res.status(403).json({ message: "Access denied" });
        }

        // ── Consolidate mess lines into one row ───────────────────────
        const rawItems = Array.isArray(challan.items) ? challan.items : [];
        const displayItems = [];
        let messTotal = 0, messCount = 0;
        for (const item of rawItems) {
            if (String(item?.description ?? "").startsWith("Mess")) {
                messTotal += Number(item?.amount ?? 0);
                messCount++;
            } else {
                displayItems.push(item);
            }
        }
        if (messCount > 0)
            displayItems.push({ description: `Mess Charges (${messCount} meal${messCount !== 1 ? "s" : ""})`, amount: messTotal });

        // ── Helpers ───────────────────────────────────────────────────
        const typeLabels = { monthly: "Monthly Hostel Fee", booking: "Room Booking Fee", mess: "Mess / Food Charges" };
        const typeLabel  = typeLabels[challan.type] || "Payment Challan";
        const totalAmt   = Number(challan.totalAmount);
        const isPaid     = challan.status === "paid";
        const fmt        = (n) => Number.isFinite(n) ? n.toLocaleString("en-PK") : "0";
        const totalLabel = `PKR ${fmt(totalAmt)}`;
        const issueDate  = new Date(challan.createdAt).toLocaleDateString("en-PK", { day: "2-digit", month: "short", year: "numeric" });
        const dueDate    = new Date(challan.dueDate).toLocaleDateString("en-PK",   { day: "2-digit", month: "short", year: "numeric" });

        // number → Pakistani words
        const numToWords = (n) => {
            if (!Number.isFinite(n) || n < 0) return "Zero Rupees Only";
            const ones = ["","One","Two","Three","Four","Five","Six","Seven","Eight","Nine",
                          "Ten","Eleven","Twelve","Thirteen","Fourteen","Fifteen","Sixteen",
                          "Seventeen","Eighteen","Nineteen"];
            const tens = ["","","Twenty","Thirty","Forty","Fifty","Sixty","Seventy","Eighty","Ninety"];
            const w = (x) => {
                if (x === 0)   return "";
                if (x < 20)   return ones[x] + " ";
                if (x < 100)  return tens[Math.floor(x/10)] + " " + (x%10 ? ones[x%10]+" " : "");
                if (x < 1000) return ones[Math.floor(x/100)] + " Hundred " + w(x%100);
                if (x < 1e5)  return w(Math.floor(x/1000)) + "Thousand " + w(x%1000);
                if (x < 1e7)  return w(Math.floor(x/1e5))  + "Lakh "     + w(x%1e5);
                return w(Math.floor(x/1e7)) + "Crore " + w(x%1e7);
            };
            return (w(Math.round(n)).trim() || "Zero") + " Rupees Only";
        };
        const amountWords = numToWords(totalAmt);

        // ── PDF setup ─────────────────────────────────────────────────
        const doc = new PDFDocument({ margin: 0, size: "A4" });
        res.setHeader("Content-Type", "application/pdf");
        res.setHeader("Content-Disposition", `attachment; filename="challan-${challan.challanId}.pdf"`);
        doc.pipe(res);

        // ── Draw one challan copy ─────────────────────────────────────
        const drawCopy = (sy, copyType) => {
            const L    = 30, R = 566, W = R - L;
            const NAVY = "#1B3A5C", GOLD = "#B8860B", LGRAY = "#F5F7FA";
            const MGRAY = "#6B7280", DGRAY = "#1F2937";
            const GREEN = "#15803D", RED = "#B91C1C";
            let y = sy;

            // reset pen state
            doc.strokeColor("#000000").lineWidth(1).fillColor(DGRAY);

            // ══════════════════════════════════════════════════════════
            // 1. TOP HEADER BANNER
            // ══════════════════════════════════════════════════════════
            doc.rect(L, y, W, 46).fill(NAVY);

            // Left: bank name block
            doc.rect(L, y, 8, 46).fill(GOLD);           // gold left accent bar
            doc.fillColor("#FFFFFF").font("Helvetica-Bold").fontSize(13)
               .text("Meezan Bank Limited", L + 14, y + 7, { width: 220, lineBreak: false });
            doc.fillColor("rgba(255,255,255,0.55)").font("Helvetica").fontSize(7)
               .text("Islamic Banking  |  حلال بینکاری", L + 14, y + 24, { width: 220, lineBreak: false });
            doc.fillColor("rgba(255,255,255,0.38)").font("Helvetica").fontSize(6.5)
               .text("Faisal Town Branch, Islamabad", L + 14, y + 34, { width: 220, lineBreak: false });

            // Right: challan type + copy badge
            doc.fillColor(GOLD).font("Helvetica-Bold").fontSize(11)
               .text(typeLabel.toUpperCase(), L + 14, y + 7, { width: W - 28, align: "right", lineBreak: false });
            doc.fillColor("rgba(255,255,255,0.50)").font("Helvetica").fontSize(7)
               .text("RiphahStay Hostel Management System", L + 14, y + 24, { width: W - 28, align: "right", lineBreak: false });

            // Copy label pill
            doc.roundedRect(R - 96, y + 32, 88, 11, 3).fill(GOLD);
            doc.fillColor(NAVY).font("Helvetica-Bold").fontSize(6.5)
               .text(copyType, R - 96, y + 34, { width: 88, align: "center", lineBreak: false });
            y += 46;

            // ══════════════════════════════════════════════════════════
            // 2. REFERENCE BAR
            // ══════════════════════════════════════════════════════════
            doc.rect(L, y, W, 17).fill(LGRAY);
            doc.fillColor(NAVY).font("Helvetica-Bold").fontSize(7)
               .text(`Challan No:  ${challan.challanId}`, L + 8,  y + 5, { lineBreak: false })
               .text(`Month:  ${challan.month}`,          L + 195, y + 5, { lineBreak: false })
               .text(`Issue Date:  ${issueDate}`,          L + 325, y + 5, { lineBreak: false })
               .text(`Due Date:  ${dueDate}`,              L + 445, y + 5, { lineBreak: false });
            y += 17;

            // ══════════════════════════════════════════════════════════
            // 3. ACCOUNT INFO (left 55%) + AMOUNT SUMMARY (right 45%)
            // ══════════════════════════════════════════════════════════
            const midX = L + Math.round(W * 0.55);
            const secH = 62;

            // left box: Account Details
            doc.rect(L, y, midX - L, secH).strokeColor("#D1D5DB").lineWidth(0.5).stroke();
            doc.rect(L, y, midX - L, 13).fill(NAVY);
            doc.fillColor("#FFFFFF").font("Helvetica-Bold").fontSize(6.5)
               .text("PAYEE ACCOUNT DETAILS", L + 8, y + 3, { width: midX - L - 16, lineBreak: false });

            const af = (lbl, val, fy) => {
                doc.fillColor(MGRAY).font("Helvetica").fontSize(6)
                   .text(lbl, L + 8, fy, { width: midX - L - 16, lineBreak: false });
                doc.fillColor(DGRAY).font("Helvetica-Bold").fontSize(7.5)
                   .text(val, L + 8, fy + 7, { width: midX - L - 16, lineBreak: false });
            };
            af("Account Number",  "0304-0123456789",                   y + 14);
            af("Account Title",   "RiphahStay Hostel Fund",            y + 30);
            af("Bank / Branch",   "Meezan Bank — Faisal Town, Islamabad", y + 46);

            // right box: Amount Summary
            doc.rect(midX, y, R - midX, secH).strokeColor("#D1D5DB").lineWidth(0.5).stroke();
            doc.rect(midX, y, R - midX, 13).fill(NAVY);
            doc.fillColor("#FFFFFF").font("Helvetica-Bold").fontSize(6.5)
               .text("AMOUNT PAYABLE", midX + 8, y + 3, { width: R - midX - 16, lineBreak: false });

            // large amount figure
            doc.fillColor(MGRAY).font("Helvetica").fontSize(6)
               .text("Total Amount (PKR)", midX + 8, y + 14, { width: R - midX - 16, lineBreak: false });
            doc.fillColor(NAVY).font("Helvetica-Bold").fontSize(16)
               .text(fmt(totalAmt), midX + 8, y + 21, { width: R - midX - 16, align: "right", lineBreak: false });

            // status badge
            const badgeCol = isPaid ? GREEN : RED;
            doc.roundedRect(midX + 8, y + 44, 68, 13, 3).fill(badgeCol);
            doc.fillColor("#FFFFFF").font("Helvetica-Bold").fontSize(7.5)
               .text(isPaid ? "PAID" : "UNPAID", midX + 8, y + 47, { width: 68, align: "center", lineBreak: false });
            if (isPaid && challan.paidAt) {
                doc.fillColor(GREEN).font("Helvetica").fontSize(6)
                   .text(new Date(challan.paidAt).toLocaleDateString("en-PK"), midX + 82, y + 49, { lineBreak: false });
            }
            y += secH;

            // ══════════════════════════════════════════════════════════
            // 4. DEPOSITOR INFORMATION
            // ══════════════════════════════════════════════════════════
            doc.rect(L, y, W, 13).fill(NAVY);
            doc.fillColor("#FFFFFF").font("Helvetica-Bold").fontSize(6.5)
               .text("DEPOSITOR INFORMATION", L + 8, y + 3, { lineBreak: false });
            y += 13;

            const depH = 32;
            doc.rect(L, y, W, depH).strokeColor("#D1D5DB").lineWidth(0.5).stroke();
            const c3 = Math.floor(W / 3);

            const depF = (lbl, val, x, fw) => {
                doc.fillColor(MGRAY).font("Helvetica").fontSize(6)
                   .text(lbl, x + 6, y + 4, { width: fw - 12, lineBreak: false });
                doc.fillColor(DGRAY).font("Helvetica-Bold").fontSize(8)
                   .text(val || "—", x + 6, y + 12, { width: fw - 12, lineBreak: false });
            };
            depF("Student Full Name", studentDoc?.fullName, L, c3);
            doc.moveTo(L + c3, y).lineTo(L + c3, y + depH).strokeColor("#E5E7EB").lineWidth(0.4).stroke();
            depF("SAP ID / Email", studentDoc?.email?.split("@")[0] || "—", L + c3, c3);
            doc.moveTo(L + c3 * 2, y).lineTo(L + c3 * 2, y + depH).strokeColor("#E5E7EB").lineWidth(0.4).stroke();
            depF("Contact Number", studentDoc?.phone || "—", L + c3 * 2, c3);
            y += depH;

            // ══════════════════════════════════════════════════════════
            // 5. FEE BREAKDOWN TABLE
            // ══════════════════════════════════════════════════════════
            doc.rect(L, y, W, 13).fill(NAVY);
            doc.fillColor("#FFFFFF").font("Helvetica-Bold").fontSize(6.5)
               .text("FEE BREAKDOWN", L + 8, y + 3, { lineBreak: false })
               .text("AMOUNT (PKR)", L + 8, y + 3, { width: W - 16, align: "right", lineBreak: false });
            y += 13;

            let alt = false;
            for (const item of displayItems) {
                const desc   = String(item?.description ?? "");
                const amt    = Number(item?.amount ?? 0);
                const amtStr = amt === 0 ? "Included" : fmt(amt);
                const rowH   = 13;
                if (alt) doc.rect(L, y, W, rowH).fill("#F0F4F8");
                alt = !alt;
                doc.fillColor(DGRAY).font("Helvetica").fontSize(7.5)
                   .text(desc, L + 8, y + 3, { width: W - 100, lineBreak: false });
                doc.fillColor(amt === 0 ? MGRAY : DGRAY)
                   .font(amt === 0 ? "Helvetica" : "Helvetica-Bold").fontSize(7.5)
                   .text(amtStr, L + 8, y + 3, { width: W - 16, align: "right", lineBreak: false });
                doc.moveTo(L, y + rowH).lineTo(R, y + rowH).strokeColor("#E5E7EB").lineWidth(0.3).stroke();
                y += rowH;
            }

            // Total row
            doc.rect(L, y, W, 20).fill(NAVY);
            doc.fillColor("#FFFFFF").font("Helvetica-Bold").fontSize(9)
               .text("TOTAL PAYABLE", L + 8, y + 5, { lineBreak: false })
               .text(totalLabel, L + 8, y + 5, { width: W - 16, align: "right", lineBreak: false });
            y += 20;

            // Amount in words bar
            doc.rect(L, y, W, 14).fill(LGRAY);
            doc.fillColor(MGRAY).font("Helvetica").fontSize(6.5)
               .text("In Words: ", L + 8, y + 4, { lineBreak: false });
            doc.fillColor(DGRAY).font("Helvetica-Bold").fontSize(6.5)
               .text(amountWords, L + 52, y + 4, { width: W - 60, lineBreak: false });
            y += 14;

            // ══════════════════════════════════════════════════════════
            // 6. PAYMENT INSTRUCTIONS (left) + FOR BANK USE (right)
            // ══════════════════════════════════════════════════════════
            const instrH = 28;
            const instrW = Math.round(W * 0.60);
            doc.rect(L, y, instrW, instrH).strokeColor("#D1D5DB").lineWidth(0.5).stroke();
            doc.fillColor(NAVY).font("Helvetica-Bold").fontSize(6.5)
               .text("PAYMENT INSTRUCTIONS", L + 8, y + 4, { width: instrW - 16, lineBreak: false });
            doc.fillColor(MGRAY).font("Helvetica").fontSize(6)
               .text("• Deposit at any Meezan Bank branch or via Meezan Internet/Mobile Banking.", L + 8, y + 13, { width: instrW - 16, lineBreak: false })
               .text("• Quote challan number at the counter. Retain receipt for your records.", L + 8, y + 20, { width: instrW - 16, lineBreak: false });

            const bankX = L + instrW;
            doc.rect(bankX, y, R - bankX, instrH).strokeColor("#D1D5DB").lineWidth(0.5).stroke();
            doc.fillColor(NAVY).font("Helvetica-Bold").fontSize(6.5)
               .text("FOR BANK USE ONLY", bankX + 8, y + 4, { width: R - bankX - 16, lineBreak: false });
            doc.fillColor(MGRAY).font("Helvetica").fontSize(6)
               .text("Teller / Date:  ______________________", bankX + 8, y + 13, { width: R - bankX - 16, lineBreak: false })
               .text("Cashier Sign:  ______________________", bankX + 8, y + 20, { width: R - bankX - 16, lineBreak: false });
            y += instrH;

            // ══════════════════════════════════════════════════════════
            // 7. SIGNATURE BOXES
            // ══════════════════════════════════════════════════════════
            const sigH  = 30;
            const sigW  = Math.floor((W - 12) / 3);
            const sigs  = ["Student / Depositor Signature", "Cashier Stamp & Signature", "Hostel Admin Seal"];
            sigs.forEach((lbl, i) => {
                const bx = L + i * (sigW + 6);
                doc.rect(bx, y, sigW, sigH).strokeColor("#D1D5DB").lineWidth(0.5).stroke();
                doc.fillColor(MGRAY).font("Helvetica").fontSize(6)
                   .text(lbl, bx, y + sigH - 10, { width: sigW, align: "center", lineBreak: false });
            });
            doc.strokeColor("#000000").lineWidth(1);
            y += sigH;

            // ══════════════════════════════════════════════════════════
            // 8. FOOTER
            // ══════════════════════════════════════════════════════════
            y += 4;
            doc.fillColor(MGRAY).font("Helvetica").fontSize(6)
               .text(
                   `System-generated • ${challan.challanId} • ${copyType} • RiphahStay Hostel Management System • Issued: ${issueDate}`,
                   L, y, { width: W, align: "center", lineBreak: false }
               );
            y += 10;
            return y;
        };

        // ── HOSTEL COPY ───────────────────────────────────────────────
        const endY1 = drawCopy(22, "HOSTEL COPY");

        // ── Scissor cut line ──────────────────────────────────────────
        const cutY = endY1 + 8;
        doc.moveTo(30, cutY).lineTo(566, cutY)
           .dash(5, { space: 4 }).strokeColor("#9CA3AF").lineWidth(0.6).stroke();
        doc.undash().strokeColor("#000000").lineWidth(1);
        doc.fillColor("#9CA3AF").font("Helvetica").fontSize(7)
           .text("✂   Cut Here", 30, cutY + 2, { width: 536, align: "center", lineBreak: false });

        // ── STUDENT COPY ──────────────────────────────────────────────
        drawCopy(cutY + 13, "STUDENT COPY");

        doc.end();
    } catch (err) {
        console.error("downloadChallanPdf error:", err);
        return res.status(500).json({ message: "Server error" });
    }
};
