import React, { useCallback, useEffect, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import * as FileSystem from "expo-file-system/legacy";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import axios from "axios";
import Layout from "../components/Layout";
import { useAuthContext } from "../context";
import { useProfileStore } from "../store/profile";
import { API_BASE_URL } from "../utils/apiBase";

const BASE_URL = API_BASE_URL;

function arrayBufferToBase64(buffer) {
    const bytes = new Uint8Array(buffer);
    let binary = "";
    const chunk = 0x8000;
    for (let i = 0; i < bytes.length; i += chunk) {
        binary += String.fromCharCode.apply(null, bytes.subarray(i, i + chunk));
    }
    return btoa(binary);
}

function apiErrorMessage(err) {
    if (!err) return "";
    if (err.message && !err.response) return err.message;
    const d = err.response?.data;
    if (d == null) return err.message || "";
    if (typeof d === "string") return d.slice(0, 400);
    if (d instanceof ArrayBuffer) {
        try {
            const text = new TextDecoder().decode(new Uint8Array(d));
            try {
                const j = JSON.parse(text);
                return j.message || text.slice(0, 400);
            } catch {
                return text.slice(0, 400);
            }
        } catch {
            return err.message || "";
        }
    }
    if (typeof d === "object" && d.message) return d.message;
    return err.message || "";
}

function escapeHtml(s) {
    if (s == null) return "";
    return String(s)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
}

function safeChallanItems(challan) {
    return Array.isArray(challan?.items) ? challan.items : [];
}

function formatPkr(n) {
    const x = Number(n);
    return Number.isFinite(x) ? x.toLocaleString() : "0";
}

export default function BillingInvoice() {
    const { token } = useAuthContext();
    const profile = useProfileStore((s) => s.profile);

    const [challans, setChallans] = useState([]);
    const [overview, setOverview] = useState(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [pdfLoading, setPdfLoading] = useState(null); // challan id being downloaded

    const fetchAll = useCallback(async () => {
        try {
            const [cRes, oRes] = await Promise.all([
                axios.get(`${BASE_URL}/challan/my`, {
                    headers: { Authorization: `Bearer ${token}` },
                }),
                axios.get(`${BASE_URL}/challan/my-month-overview`, {
                    headers: { Authorization: `Bearer ${token}` },
                }),
            ]);
            setChallans(cRes.data.challans || []);
            setOverview(oRes.data || null);
        } catch (err) {
            Alert.alert("Error", err?.response?.data?.message || "Could not load billing");
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [token]);

    useEffect(() => {
        fetchAll();
    }, [fetchAll]);

    const onRefresh = () => {
        setRefreshing(true);
        fetchAll();
    };

    const handleDownloadPdf = async (challan) => {
        setPdfLoading(challan._id);
        try {
            const res = await axios.get(`${BASE_URL}/challan/${challan._id}/pdf`, {
                headers: { Authorization: `Bearer ${token}` },
                responseType: "arraybuffer",
            });
            const ct = (res.headers["content-type"] || "").toLowerCase();
            if (ct.includes("application/json")) {
                const text = new TextDecoder().decode(new Uint8Array(res.data));
                const j = JSON.parse(text);
                throw new Error(j.message || "Could not download challan");
            }
            if (!FileSystem.cacheDirectory) {
                throw new Error("Storage not available");
            }
            const b64 = arrayBufferToBase64(res.data);
            const safeName = String(challan.challanId || challan._id).replace(/[^\w.-]+/g, "_");
            const path = `${FileSystem.cacheDirectory}challan-${safeName}.pdf`;
            await FileSystem.writeAsStringAsync(path, b64, {
                encoding: FileSystem.EncodingType.Base64,
            });
            const canShare = await Sharing.isAvailableAsync();
            if (canShare) {
                await Sharing.shareAsync(path, {
                    mimeType: "application/pdf",
                    dialogTitle: `Challan ${challan.challanId}`,
                });
            } else {
                Alert.alert("Saved", `PDF saved to: ${path}`);
            }
        } catch (serverErr) {
            try {
                const html = buildChallanHtml(challan, profile);
                const { uri } = await Print.printToFileAsync({ html, base64: false });
                const canShare = await Sharing.isAvailableAsync();
                if (canShare) {
                    await Sharing.shareAsync(uri, {
                        mimeType: "application/pdf",
                        dialogTitle: `Challan ${challan.challanId}`,
                    });
                } else {
                    Alert.alert("Saved", `PDF saved to: ${uri}`);
                }
            } catch (printErr) {
                const msg =
                    apiErrorMessage(serverErr) ||
                    printErr?.message ||
                    "Failed to generate PDF";
                Alert.alert("Error", String(msg));
            }
        } finally {
            setPdfLoading(null);
        }
    };

    if (loading) {
        return (
            <Layout title="Billing & Invoice" showBack>
                <View style={styles.center}>
                    <ActivityIndicator size="large" color="#4F46E5" />
                    <Text style={styles.loadingText}>Loading challans…</Text>
                </View>
            </Layout>
        );
    }

    return (
        <Layout title="Billing & Invoice" showBack>
            <ScrollView
                style={{ flex: 1 }}
                showsVerticalScrollIndicator={false}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
                contentContainerStyle={{ paddingBottom: 32 }}
            >
                {overview ? <MonthOverviewCard overview={overview} /> : null}

                <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>🧾 Payment Challans</Text>
                    <Text style={styles.sectionSub}>Official monthly fee slips issued by admin</Text>
                </View>

                {challans.length === 0 ? (
                    <View style={styles.emptyState}>
                        <Text style={styles.emptyIcon}>📋</Text>
                        <Text style={styles.emptyTitle}>No Challans Issued Yet</Text>
                        <Text style={styles.emptyText}>
                            When the admin generates your monthly challan, it will appear here with your room rent and mess bill combined. You can then download the PDF and pay at any Meezan Bank branch.
                        </Text>
                    </View>
                ) : (
                    challans.map((challan) => (
                        <ChallanCard
                            key={challan._id}
                            challan={challan}
                            onDownload={() => handleDownloadPdf(challan)}
                            pdfLoading={pdfLoading === challan._id}
                        />
                    ))
                )}
            </ScrollView>
        </Layout>
    );
}

const MEAL_ICON = { breakfast: "🌅", lunch: "☀️", dinner: "🌙" };

function MonthOverviewCard({ overview }) {
    const {
        month,
        phase,
        room,
        roomRent,
        messUnbilledTotal,
        messUnbilledLines,
        monthlyChallan,
        projectedTotalNoChallanYet,
        balanceWithChallan,
    } = overview;

    const hasRoom = !!room;
    const lines = Array.isArray(messUnbilledLines) ? messUnbilledLines : [];
    const challanIssued = !!monthlyChallan;
    const challanPaid = monthlyChallan?.status === "paid";

    const runningTotal = (roomRent ?? 0) + (messUnbilledTotal ?? 0);

    return (
        <View style={ovStyles.container}>

            {/* ── Header banner ── */}
            <View style={[
                ovStyles.banner,
                challanIssued
                    ? challanPaid ? ovStyles.bannerPaid : ovStyles.bannerUnpaid
                    : ovStyles.bannerOpen,
            ]}>
                <View style={{ flex: 1 }}>
                    <Text style={ovStyles.bannerLabel}>Current Billing Period</Text>
                    <Text style={ovStyles.bannerMonth}>{month}</Text>
                </View>
                <View style={[
                    ovStyles.statusPill,
                    challanIssued
                        ? challanPaid ? ovStyles.pillPaid : ovStyles.pillDue
                        : ovStyles.pillOpen,
                ]}>
                    <Text style={[
                        ovStyles.statusPillText,
                        challanIssued
                            ? challanPaid ? { color: "#166534" } : { color: "#854D0E" }
                            : { color: "#1D4ED8" },
                    ]}>
                        {challanIssued ? (challanPaid ? "✓ Paid" : "Unpaid") : "Running"}
                    </Text>
                </View>
            </View>

            {/* ── Room rent ── */}
            <View style={ovStyles.section}>
                <Text style={ovStyles.sectionHeading}>🏠  Room Rent</Text>
                {hasRoom ? (
                    <View style={ovStyles.lineRow}>
                        <Text style={ovStyles.lineDesc}>
                            {room.level}/{room.roomNumber}
                        </Text>
                        <Text style={ovStyles.lineAmt}>Rs. {(roomRent ?? 0).toLocaleString()}</Text>
                    </View>
                ) : (
                    <Text style={ovStyles.noDataText}>
                        No room assigned yet. Room rent will appear once you are allocated a room.
                    </Text>
                )}
            </View>

            <View style={ovStyles.divider} />

            {/* ── Mess meals this month ── */}
            <View style={ovStyles.section}>
                <View style={ovStyles.sectionHeadingRow}>
                    <Text style={ovStyles.sectionHeading}>🍽  Mess Bill — {month}</Text>
                    {messUnbilledTotal > 0 && (
                        <Text style={ovStyles.messTotal}>Rs. {(messUnbilledTotal ?? 0).toLocaleString()}</Text>
                    )}
                </View>

                {lines.length === 0 ? (
                    <Text style={ovStyles.noDataText}>
                        No mess meals logged yet this month. Each meal you eat will appear here with its date and cost.
                    </Text>
                ) : (
                    lines.map((line, idx) => {
                        const d = new Date(line.date);
                        const dateStr = d.toLocaleDateString("en-PK", { day: "numeric", month: "short", weekday: "short" });
                        const icon = MEAL_ICON[line.mealType] ?? "🍽";
                        return (
                            <View key={line._id ?? idx} style={ovStyles.mealRow}>
                                <Text style={ovStyles.mealIcon}>{icon}</Text>
                                <View style={{ flex: 1 }}>
                                    <Text style={ovStyles.mealName}>{line.itemName}</Text>
                                    <Text style={ovStyles.mealDate}>{dateStr}</Text>
                                </View>
                                <Text style={ovStyles.mealAmt}>Rs. {(line.amount ?? 0).toLocaleString()}</Text>
                            </View>
                        );
                    })
                )}
            </View>

            <View style={ovStyles.divider} />

            {/* ── This month running total / challan block ── */}
            {challanIssued ? (
                <View style={ovStyles.section}>
                    <Text style={ovStyles.sectionHeading}>🧾  Issued Challan</Text>

                    <View style={ovStyles.lineRow}>
                        <Text style={ovStyles.lineDesc}>🏠 Room rent (billed)</Text>
                        <Text style={ovStyles.lineAmt}>
                            Rs. {(Number(monthlyChallan.roomSubtotal) || 0).toLocaleString()}
                        </Text>
                    </View>
                    <View style={ovStyles.lineRow}>
                        <Text style={ovStyles.lineDesc}>🍽 Mess charges (billed)</Text>
                        <Text style={ovStyles.lineAmt}>
                            Rs. {(Number(monthlyChallan.messSubtotal) || 0).toLocaleString()}
                        </Text>
                    </View>

                    <View style={ovStyles.totalBar}>
                        <Text style={ovStyles.totalBarLabel}>Challan Total</Text>
                        <Text style={ovStyles.totalBarAmt}>
                            Rs. {Number(monthlyChallan.totalAmount ?? 0).toLocaleString()}
                        </Text>
                    </View>

                    {monthlyChallan.dueDate ? (
                        <Text style={ovStyles.dueText}>
                            Due: {new Date(monthlyChallan.dueDate).toLocaleDateString("en-PK", { day: "numeric", month: "long", year: "numeric" })}
                        </Text>
                    ) : null}

                    {!challanPaid && balanceWithChallan != null && balanceWithChallan > Number(monthlyChallan.totalAmount ?? 0) ? (
                        <View style={ovStyles.extraMessNote}>
                            <Text style={ovStyles.extraMessNoteText}>
                                ⚠ You have logged extra mess meals after this challan was issued. Your outstanding balance is Rs. {balanceWithChallan.toLocaleString()} (includes new mess lines). These will roll into next month's challan.
                            </Text>
                        </View>
                    ) : null}
                </View>
            ) : (
                <View style={ovStyles.section}>
                    <View style={ovStyles.totalBar}>
                        <Text style={ovStyles.totalBarLabel}>
                            {hasRoom ? "Estimated Total This Month" : "Running Total"}
                        </Text>
                        <Text style={ovStyles.totalBarAmt}>
                            Rs. {runningTotal.toLocaleString()}
                        </Text>
                    </View>
                    <Text style={ovStyles.noDataText}>
                        This estimate includes your room rent + mess meals logged so far. When admin generates the monthly challan, you will receive an official payment slip here.
                    </Text>
                    {projectedTotalNoChallanYet != null && projectedTotalNoChallanYet !== runningTotal ? (
                        <View style={ovStyles.projectedNote}>
                            <Text style={ovStyles.projectedNoteText}>
                                Projected bill: Rs. {projectedTotalNoChallanYet.toLocaleString()}
                            </Text>
                        </View>
                    ) : null}
                </View>
            )}
        </View>
    );
}

const ovStyles = StyleSheet.create({
    container: {
        backgroundColor: "#FFFFFF",
        borderRadius: 20,
        borderWidth: 1,
        borderColor: "#E2E8F0",
        overflow: "hidden",
        marginHorizontal: 0,
        marginTop: 12,
        shadowColor: "#000",
        shadowOpacity: 0.06,
        shadowRadius: 12,
        shadowOffset: { width: 0, height: 3 },
        elevation: 3,
    },
    banner: {
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 16,
        paddingVertical: 14,
    },
    bannerOpen:   { backgroundColor: "#EFF6FF" },
    bannerUnpaid: { backgroundColor: "#FFFBEB" },
    bannerPaid:   { backgroundColor: "#F0FDF4" },
    bannerLabel: { fontSize: 11, color: "#64748B", fontWeight: "600", textTransform: "uppercase", letterSpacing: 0.5 },
    bannerMonth: { fontSize: 18, fontWeight: "800", color: "#0F172A", marginTop: 2 },
    statusPill: {
        paddingHorizontal: 12,
        paddingVertical: 5,
        borderRadius: 20,
    },
    pillOpen:   { backgroundColor: "#DBEAFE" },
    pillDue:    { backgroundColor: "#FEF9C3" },
    pillPaid:   { backgroundColor: "#DCFCE7" },
    statusPillText: { fontSize: 12, fontWeight: "800" },
    section: { paddingHorizontal: 16, paddingVertical: 12, gap: 8 },
    sectionHeading: { fontSize: 12, fontWeight: "700", color: "#374151", textTransform: "uppercase", letterSpacing: 0.4, marginBottom: 4 },
    sectionHeadingRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 4 },
    messTotal: { fontSize: 13, fontWeight: "800", color: "#0F172A" },
    lineRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
    lineDesc: { fontSize: 13, color: "#475569", flex: 1 },
    lineAmt:  { fontSize: 13, fontWeight: "700", color: "#111827" },
    mealRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
        paddingVertical: 5,
        borderBottomWidth: 1,
        borderBottomColor: "#F1F5F9",
    },
    mealIcon: { fontSize: 18 },
    mealName: { fontSize: 13, fontWeight: "600", color: "#111827" },
    mealDate: { fontSize: 11, color: "#94A3B8", marginTop: 1 },
    mealAmt:  { fontSize: 13, fontWeight: "700", color: "#4F46E5" },
    totalBar: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        backgroundColor: "#F8FAFC",
        borderRadius: 12,
        paddingHorizontal: 14,
        paddingVertical: 12,
        marginTop: 4,
    },
    totalBarLabel: { fontSize: 13, fontWeight: "700", color: "#374151" },
    totalBarAmt:   { fontSize: 18, fontWeight: "900", color: "#4F46E5" },
    dueText: { fontSize: 11, color: "#DC2626", fontWeight: "600", marginTop: 4 },
    noDataText: { fontSize: 12, color: "#94A3B8", lineHeight: 18 },
    divider: { height: 1, backgroundColor: "#F1F5F9" },
    extraMessNote: {
        backgroundColor: "#FFF7ED",
        borderRadius: 10,
        padding: 10,
        marginTop: 4,
        borderWidth: 1,
        borderColor: "#FED7AA",
    },
    extraMessNoteText: { fontSize: 12, color: "#92400E", lineHeight: 18 },
    projectedNote: {
        backgroundColor: "#EFF6FF",
        borderRadius: 10,
        padding: 10,
        borderWidth: 1,
        borderColor: "#BFDBFE",
        marginTop: 2,
    },
    projectedNoteText: { fontSize: 12, color: "#1D4ED8", fontWeight: "600" },
});

function ChallanCard({ challan, onDownload, pdfLoading }) {
    const isPaid = challan.status === "paid";
    const isOverdue = !isPaid && new Date(challan.dueDate) < new Date();

    return (
        <View style={styles.card}>
            {/* Card Header */}
            <View style={styles.cardHeader}>
                <View>
                    <Text style={styles.cardMonth}>{challan.month}</Text>
                    <Text style={styles.challanId}>{challan.challanId}</Text>
                </View>
                <StatusBadge status={challan.status} isOverdue={isOverdue} />
            </View>

            {/* Divider */}
            <View style={styles.divider} />

            {/* Items */}
            {safeChallanItems(challan).map((item, idx) => (
                <View key={idx} style={styles.itemRow}>
                    <Text style={styles.itemDesc}>{item?.description ?? ""}</Text>
                    <Text style={[styles.itemAmt, Number(item?.amount) === 0 && styles.includedText]}>
                        {Number(item?.amount) === 0
                            ? "Included"
                            : `Rs. ${formatPkr(item?.amount)}`}
                    </Text>
                </View>
            ))}

            {/* Total */}
            <View style={styles.divider} />
            <View style={[styles.itemRow, styles.totalRow]}>
                <Text style={styles.totalLabel}>Total Payable</Text>
                <Text style={styles.totalAmt}>
                    Rs. {formatPkr(challan.totalAmount)}
                </Text>
            </View>

            {/* Due date */}
            <View style={styles.metaRow}>
                <Text style={styles.metaLabel}>Due Date</Text>
                <Text style={[styles.metaValue, isOverdue && !isPaid && { color: "#DC2626" }]}>
                    {new Date(challan.dueDate).toLocaleDateString("en-PK", {
                        day: "numeric",
                        month: "long",
                        year: "numeric",
                    })}
                    {isOverdue && !isPaid ? "  Overdue" : ""}
                </Text>
            </View>

            {isPaid && challan.paidAt && (
                <View style={styles.metaRow}>
                    <Text style={styles.metaLabel}>Paid On</Text>
                    <Text style={styles.metaValue}>
                        {new Date(challan.paidAt).toLocaleDateString("en-PK", {
                            day: "numeric",
                            month: "long",
                            year: "numeric",
                        })}
                    </Text>
                </View>
            )}

            {isPaid && challan.bankRef ? (
                <View style={styles.metaRow}>
                    <Text style={styles.metaLabel}>Bank Ref</Text>
                    <Text style={styles.metaValue}>{challan.bankRef}</Text>
                </View>
            ) : null}

            {/* Download Button */}
            <TouchableOpacity
                style={[styles.downloadBtn, pdfLoading && { opacity: 0.6 }]}
                onPress={onDownload}
                disabled={pdfLoading}
                activeOpacity={0.8}
            >
                {pdfLoading ? (
                    <ActivityIndicator size="small" color="#FFF" />
                ) : (
                    <Text style={styles.downloadBtnText}>↓  Download Challan PDF</Text>
                )}
            </TouchableOpacity>
        </View>
    );
}

function StatusBadge({ status, isOverdue }) {
    let bg, color, label;
    if (status === "paid") {
        bg = "#DCFCE7"; color = "#166534"; label = "Paid";
    } else if (isOverdue) {
        bg = "#FEE2E2"; color = "#991B1B"; label = "Overdue";
    } else {
        bg = "#FEF9C3"; color = "#854D0E"; label = "Unpaid";
    }
    return (
        <View style={[styles.badge, { backgroundColor: bg }]}>
            <Text style={[styles.badgeText, { color }]}>{label}</Text>
        </View>
    );
}

// ── PDF HTML Template ─────────────────────────────────────────────────────────
function buildChallanHtml(challan, profile) {
    const itemRows = safeChallanItems(challan)
        .map(
            (item) => `
      <tr>
        <td style="padding:10px 8px;border-bottom:1px solid #F3F4F6;">${escapeHtml(item?.description)}</td>
        <td style="padding:10px 8px;border-bottom:1px solid #F3F4F6;text-align:right;color:${Number(item?.amount) === 0 ? "#16A34A" : "#111827"}">
          ${Number(item?.amount) === 0 ? "Included" : `Rs. ${formatPkr(item?.amount)}`}
        </td>
      </tr>`
        )
        .join("");

    const isPaid = challan.status === "paid";
    const issueStr = challan.createdAt
        ? escapeHtml(new Date(challan.createdAt).toLocaleDateString("en-PK"))
        : "—";
    const dueStr = challan.dueDate
        ? escapeHtml(new Date(challan.dueDate).toLocaleDateString("en-PK"))
        : "—";

    return `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8"/>
<style>
  body{font-family:Arial,sans-serif;margin:0;padding:32px;color:#111827;background:#fff;}
  .header{text-align:center;margin-bottom:24px;}
  .bank-name{font-size:24px;font-weight:700;color:#1B4A8A;margin:0;}
  .sub{font-size:14px;color:#6B7280;margin:4px 0 0;}
  .divider{border:none;border-top:2px solid #E5E7EB;margin:20px 0;}
  .section-title{font-size:13px;font-weight:700;color:#4B5563;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:10px;}
  .info-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px 24px;margin-bottom:16px;}
  .info-item label{font-size:11px;color:#9CA3AF;display:block;margin-bottom:2px;}
  .info-item span{font-size:13px;font-weight:600;}
  table{width:100%;border-collapse:collapse;}
  th{background:#F9FAFB;padding:10px 8px;text-align:left;font-size:12px;color:#6B7280;font-weight:600;}
  th:last-child{text-align:right;}
  td{font-size:13px;color:#111827;}
  .total-row td{font-weight:700;font-size:15px;padding:12px 8px;border-top:2px solid #E5E7EB;}
  .total-row td:last-child{text-align:right;color:#4F46E5;}
  .status-badge{display:inline-block;padding:4px 12px;border-radius:999px;font-size:12px;font-weight:700;}
  .paid{background:#DCFCE7;color:#166534;}
  .unpaid{background:#FEF9C3;color:#854D0E;}
  .footer{margin-top:32px;text-align:center;font-size:11px;color:#9CA3AF;}
</style>
</head>
<body>
  <div class="header">
    <p class="bank-name">Bank of Meezan</p>
    <p class="sub">Payment Challan / Fee Slip</p>
    <p class="sub">RiphahStay Hostel Management System</p>
  </div>
  <hr class="divider"/>

  <div class="section-title">Challan Details</div>
  <div class="info-grid">
    <div class="info-item"><label>Challan ID</label><span>${escapeHtml(challan.challanId)}</span></div>
    <div class="info-item"><label>Month</label><span>${escapeHtml(challan.month)}</span></div>
    <div class="info-item"><label>Issue Date</label><span>${issueStr}</span></div>
    <div class="info-item"><label>Due Date</label><span>${dueStr}</span></div>
    <div class="info-item">
      <label>Status</label>
      <span class="status-badge ${isPaid ? "paid" : "unpaid"}">${isPaid ? "PAID" : "UNPAID"}</span>
    </div>
    ${challan.bankRef ? `<div class="info-item"><label>Bank Reference</label><span>${escapeHtml(challan.bankRef)}</span></div>` : ""}
  </div>
  <hr class="divider"/>

  <div class="section-title">Student Details</div>
  <div class="info-grid">
    <div class="info-item"><label>Name</label><span>${escapeHtml(profile?.fullName)}</span></div>
    <div class="info-item"><label>Email</label><span>${escapeHtml(profile?.email)}</span></div>
    ${profile?.phone ? `<div class="info-item"><label>Phone</label><span>${escapeHtml(profile.phone)}</span></div>` : ""}
  </div>
  <hr class="divider"/>

  <div class="section-title">Fee Breakdown</div>
  <table>
    <thead><tr><th>Description</th><th>Amount (PKR)</th></tr></thead>
    <tbody>
      ${itemRows}
      <tr class="total-row">
        <td>Total Payable</td>
        <td>Rs. ${formatPkr(challan.totalAmount)}</td>
      </tr>
    </tbody>
  </table>

  <div class="footer">
    <p>This is a computer-generated challan. Please keep it for your records.</p>
    <p>Bank of Meezan · RiphahStay Hostel · Riphah International University</p>
  </div>
</body>
</html>`;
}

const styles = StyleSheet.create({
    center: {
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        gap: 12,
        paddingTop: 60,
    },
    loadingText: { color: "#6B7280", fontSize: 14 },
    sectionHeader: {
        paddingHorizontal: 4,
        paddingTop: 20,
        paddingBottom: 8,
    },
    sectionTitle: { fontSize: 16, fontWeight: "800", color: "#111827" },
    sectionSub: { fontSize: 12, color: "#9CA3AF", marginTop: 2 },
    emptyState: {
        alignItems: "center",
        paddingVertical: 36,
        gap: 10,
        backgroundColor: "#F8FAFC",
        borderRadius: 16,
        borderWidth: 1,
        borderColor: "#E2E8F0",
        padding: 20,
    },
    emptyIcon: { fontSize: 40 },
    emptyTitle: { fontSize: 16, fontWeight: "700", color: "#111827" },
    emptyText: {
        fontSize: 13,
        color: "#9CA3AF",
        textAlign: "center",
        lineHeight: 20,
    },
    card: {
        backgroundColor: "#FFF",
        borderRadius: 16,
        borderWidth: 1,
        borderColor: "#E5E7EB",
        padding: 16,
        gap: 10,
        shadowColor: "#000",
        shadowOpacity: 0.05,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 2 },
        elevation: 2,
        marginBottom: 12,
    },
    cardHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "flex-start",
    },
    cardMonth: { fontSize: 16, fontWeight: "700", color: "#111827" },
    challanId: { fontSize: 11, color: "#9CA3AF", marginTop: 2 },
    badge: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 999,
    },
    badgeText: { fontSize: 12, fontWeight: "700" },
    divider: { height: 1, backgroundColor: "#F3F4F6" },
    itemRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
    },
    itemDesc: { fontSize: 13, color: "#374151", flex: 1, marginRight: 8 },
    itemAmt: { fontSize: 13, fontWeight: "600", color: "#111827" },
    includedText: { color: "#16A34A" },
    totalRow: { paddingTop: 4 },
    totalLabel: { fontSize: 15, fontWeight: "700", color: "#111827" },
    totalAmt: { fontSize: 16, fontWeight: "800", color: "#4F46E5" },
    metaRow: {
        flexDirection: "row",
        justifyContent: "space-between",
    },
    metaLabel: { fontSize: 12, color: "#9CA3AF" },
    metaValue: { fontSize: 12, fontWeight: "600", color: "#374151" },
    downloadBtn: {
        backgroundColor: "#4F46E5",
        borderRadius: 10,
        paddingVertical: 12,
        alignItems: "center",
        marginTop: 4,
    },
    downloadBtnText: { color: "#FFF", fontWeight: "700", fontSize: 14 },
});
