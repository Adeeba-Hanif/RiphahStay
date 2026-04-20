// screens/LeaveLog.js
import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Platform,
} from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import Layout from "../components/Layout";
import Typography from "../components/Typography";
import axios from "axios";
import { useAuthContext } from "../context";
import { API_BASE_URL } from "../utils/apiBase";

const API_BASE = API_BASE_URL 

// helper → format YYYY-MM-DD
const formatDate = (date) => {
  const d = new Date(date);
  const m = `${d.getMonth() + 1}`.padStart(2, "0");
  const day = `${d.getDate()}`.padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
};

export default function LeaveLog() {
  const { token } = useAuthContext();

  // main tabs
  const [activeTab, setActiveTab] = useState("apply"); // apply | history
  // inner tabs
  const [historyTab, setHistoryTab] = useState("pending"); // pending | approved | rejected

  const [leaves, setLeaves] = useState({
    pending: [],
    approved: [],
    rejected: [],
  });
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  // form data
  const today = new Date();
  const [fromDate, setFromDate] = useState(today);
  const [toDate, setToDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d;
  });
  const [reason, setReason] = useState("");

  // date picker state
  const [showFrom, setShowFrom] = useState(false);
  const [showTo, setShowTo] = useState(false);

  // ---------------- FETCH LEAVES ----------------
  const fetchLeaves = async () => {
    if (!token) return;
    try {
      setLoading(true);
      setError("");
      const res = await axios.get(`${API_BASE}/leave/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setLeaves({
        pending: res.data.pending || [],
        approved: res.data.approved || [],
        rejected: res.data.rejected || [],
      });
    } catch (err) {
      const msg =
        err?.response?.data?.message ||
        err?.message ||
        "Failed to load leaves";
      setError(msg);
      console.log("fetchLeaves error:", msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeaves();
  }, [token]);

  // ---------------- DATE HANDLERS ----------------
  const onFromChange = (event, selectedDate) => {
    setShowFrom(false);
    if (event.type === "dismissed") return;
    const chosen = selectedDate || fromDate;

    const todayMid = new Date();
    todayMid.setHours(0, 0, 0, 0);
    if (chosen < todayMid) {
      Alert.alert("Invalid Date", "Start date cannot be in the past.");
      return;
    }

    setFromDate(chosen);

    // Ensure toDate > fromDate
    const minTo = new Date(chosen);
    minTo.setDate(minTo.getDate() + 1);
    if (toDate <= chosen) setToDate(minTo);
  };

  const onToChange = (event, selectedDate) => {
    setShowTo(false);
    if (event.type === "dismissed") return;
    const chosen = selectedDate || toDate;

    const minTo = new Date(fromDate);
    minTo.setDate(minTo.getDate() + 1);
    if (chosen <= fromDate) {
      Alert.alert("Invalid Date", "End date must be after start date.");
      setToDate(minTo);
      return;
    }

    setToDate(chosen);
  };

  // ---------------- SUBMIT ----------------
  const handleSubmit = async () => {
    if (!reason.trim()) {
      Alert.alert("Missing Reason", "Please enter a reason for leave.");
      return;
    }

    try {
      setSubmitting(true);
      await axios.post(
        `${API_BASE}/leave/create`,
        {
          reason: reason.trim(),
          from: formatDate(fromDate),
          to: formatDate(toDate),
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      Alert.alert("Success", "Your leave request has been submitted.");
      setReason("");
      const nextDay = new Date(fromDate);
      nextDay.setDate(nextDay.getDate() + 1);
      setToDate(nextDay);

      fetchLeaves();
      setActiveTab("history");
      setHistoryTab("pending");
    } catch (err) {
      const msg =
        err?.response?.data?.message ||
        err?.message ||
        "Failed to submit leave";
      setError(msg);
      Alert.alert("Error", msg);
      console.log("submitLeave error:", msg);
    } finally {
      setSubmitting(false);
    }
  };

  // ---------------- RENDER ----------------
  const currentList =
    historyTab === "pending"
      ? leaves.pending
      : historyTab === "approved"
        ? leaves.approved
        : leaves.rejected;

  return (
    <Layout title="Leave Management" showBack scroll>
      {/* main tabs */}
      <View style={styles.topTabs}>
        <TabButton
          label="Apply"
          active={activeTab === "apply"}
          onPress={() => setActiveTab("apply")}
        />
        <TabButton
          label="History"
          active={activeTab === "history"}
          onPress={() => setActiveTab("history")}
        />
      </View>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      {/* ---------------- APPLY TAB ---------------- */}
      {activeTab === "apply" && (
        <>
          <Typography variant="heading" style={styles.heading}>
            Apply for Leave
          </Typography>

          <View style={styles.form}>
            {/* From Date */}
            <Text style={styles.label}>From Date</Text>
            <TouchableOpacity
              style={styles.dateBox}
              onPress={() => setShowFrom(true)}
            >
              <Text>{formatDate(fromDate)}</Text>
            </TouchableOpacity>
            {showFrom && (
              <DateTimePicker
                value={fromDate}
                mode="date"
                display={Platform.OS === "ios" ? "spinner" : "default"}
                minimumDate={today}
                onChange={onFromChange}
              />
            )}

            {/* To Date */}
            <Text style={styles.label}>To Date</Text>
            <TouchableOpacity
              style={styles.dateBox}
              onPress={() => setShowTo(true)}
            >
              <Text>{formatDate(toDate)}</Text>
            </TouchableOpacity>
            {showTo && (
              <DateTimePicker
                value={toDate}
                mode="date"
                display={Platform.OS === "ios" ? "spinner" : "default"}
                minimumDate={(() => {
                  const min = new Date(fromDate);
                  min.setDate(min.getDate() + 1);
                  return min;
                })()}
                onChange={onToChange}
              />
            )}

            {/* Reason */}
            <Text style={styles.label}>Reason</Text>
            <TextInput
              style={[styles.input, { height: 80 }]}
              multiline
              placeholder="Describe your reason..."
              value={reason}
              onChangeText={setReason}
            />

            <TouchableOpacity
              style={[
                styles.button,
                submitting && { backgroundColor: "#93C5FD" },
              ]}
              onPress={handleSubmit}
              disabled={submitting}
            >
              <Text style={styles.buttonText}>
                {submitting ? "Submitting..." : "Submit Leave"}
              </Text>
            </TouchableOpacity>
          </View>
        </>
      )}

      {/* ---------------- HISTORY TAB ---------------- */}
      {activeTab === "history" && (
        <>
          <Typography variant="heading" style={styles.heading}>
            Leave History
          </Typography>

          {/* inner tabs */}
          <View style={styles.historyTabs}>
            <HistoryTabButton
              label="Pending"
              active={historyTab === "pending"}
              onPress={() => setHistoryTab("pending")}
            />
            <HistoryTabButton
              label="Approved"
              active={historyTab === "approved"}
              onPress={() => setHistoryTab("approved")}
            />
            <HistoryTabButton
              label="Rejected"
              active={historyTab === "rejected"}
              onPress={() => setHistoryTab("rejected")}
            />
          </View>

          {loading ? (
            <ActivityIndicator size="large" color="#2563EB" style={{ marginTop: 20 }} />
          ) : currentList.length === 0 ? (
            <Text style={{ color: "#6B7280", fontStyle: "italic" }}>
              No {historyTab} leaves found.
            </Text>
          ) : (
            currentList.map((leave) => (
              <View key={leave._id} style={styles.card}>
                <View style={styles.rowBetween}>
                  <Text style={styles.date}>
                    {formatDate(leave.duration.from)} →{" "}
                    {formatDate(leave.duration.to)}
                  </Text>
                  <Chip text={leave.status} type={leave.status} />
                </View>
                <Text style={styles.reasonText}>{leave.reason}</Text>
              </View>
            ))
          )}
        </>
      )}
    </Layout>
  );
}

/* ---- Helper Components ---- */
function TabButton({ label, active, onPress }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={[
        styles.tabBtn,
        active
          ? { borderBottomColor: "#2563EB" }
          : { borderBottomColor: "transparent" },
      ]}
    >
      <Text style={{ color: active ? "#2563EB" : "#6B7280", fontWeight: "600" }}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

function HistoryTabButton({ label, active, onPress }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={[
        styles.historyBtn,
        active && { backgroundColor: "#2563EB" },
      ]}
    >
      <Text style={{ color: active ? "#FFF" : "#374151", fontWeight: "500" }}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

function Chip({ text, type }) {
  const bg =
    type === "approved"
      ? "#D1FAE5"
      : type === "rejected"
        ? "#FEE2E2"
        : "#FEF3C7";
  const color =
    type === "approved"
      ? "#065F46"
      : type === "rejected"
        ? "#B91C1C"
        : "#92400E";

  return (
    <View style={[styles.chip, { backgroundColor: bg }]}>
      <Text style={{ color }}>{text.toUpperCase()}</Text>
    </View>
  );
}

/* ---- Styles ---- */
const styles = StyleSheet.create({
  topTabs: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 12,
  },
  tabBtn: {
    flex: 1,
    alignItems: "center",
    borderBottomWidth: 2,
    paddingVertical: 10,
  },
  heading: {
    marginTop: 8,
    marginBottom: 6,
  },
  form: {
    backgroundColor: "#FFF",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    padding: 12,
  },
  label: {
    fontSize: 13,
    fontWeight: "600",
    marginBottom: 4,
  },
  dateBox: {
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 8,
    padding: 10,
    backgroundColor: "#F9FAFB",
    marginBottom: 10,
  },
  input: {
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 8,
    padding: 10,
    fontSize: 14,
    marginBottom: 10,
    backgroundColor: "#FFF",
  },
  button: {
    backgroundColor: "#2563EB",
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  buttonText: {
    color: "#FFF",
    fontWeight: "600",
  },
  historyTabs: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 8,
  },
  historyBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: "#E5E7EB",
  },
  card: {
    backgroundColor: "#FFF",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    padding: 12,
    marginBottom: 10,
  },
  rowBetween: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  date: {
    fontSize: 14,
    fontWeight: "600",
    color: "#111827",
  },
  reasonText: {
    fontSize: 13,
    color: "#374151",
    marginTop: 4,
  },
  chip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  error: {
    color: "red",
    marginBottom: 6,
  },
});
