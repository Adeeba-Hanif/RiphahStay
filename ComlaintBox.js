import React, { useEffect, useState } from "react";
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import axios from "axios";
import Input from "../components/Input";
import LongTextButton from "../components/LongTextButton";
import Typography from "../components/Typography";
import Layout from "../components/Layout";
import { useAuthContext } from "../context";
import { API_BASE_URL } from "../utils/apiBase";

const API_BASE = API_BASE_URL;

// same list as backend
const MAINTENANCE_TITLES = [
  "Electrical Issue",
  "Plumbing issue",
  "Furniture&Fixture",
  "Room cleaning/Hygiene",
  "Internet/Wifi",
  "Water supply",
];

export default function ComplaintBox() {
  const { token } = useAuthContext();

  const [activeTab, setActiveTab] = useState("request");
  const [historyTab, setHistoryTab] = useState("pending");

  // form
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [tag, setTag] = useState("complaint");
  const [showMaintenanceList, setShowMaintenanceList] = useState(false);

  // data
  const [complaints, setComplaints] = useState({
    pending: [],
    resolved: [],
    rejected: [],
  });
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const getComplaints = async () => {
    if (!token) return;
    try {
      setLoading(true);
      setError("");

      const res = await axios.get(`${API_BASE}/complaints/me`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = res.data || {};
      setComplaints({
        pending: data.pending || [],
        resolved: data.resolved || [],
        rejected: data.rejected || [],
      });
    } catch (err) {
      const msg =
        err?.response?.data?.message ||
        err?.message ||
        "Something went wrong";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    getComplaints();
  }, [token]);

  // when switching tags, reset title behavior
  useEffect(() => {
    if (tag === "maintenance_request") {
      // optionally preselect first item
      setTitle(MAINTENANCE_TITLES[0]);
    } else {
      setTitle("");
    }
  }, [tag]);

  const handleSubmit = async () => {
    if (!desc.trim()) return;
    if (!title.trim()) return;
    if (!token) {
      setError("You are not logged in.");
      return;
    }

    try {
      setSubmitting(true);
      setError("");

      await axios.post(
        `${API_BASE}/complaints/create`,
        {
          title: title.trim(),
          description: desc.trim(),
          tag: tag, // "complaint" | "maintenance_request"
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      // clear
      if (tag === "complaint") {
        setTitle("");
      } else {
        setTitle(MAINTENANCE_TITLES[0]);
      }
      setDesc("");

      // refresh
      getComplaints();
      setActiveTab("history");
      setHistoryTab("pending");
    } catch (err) {
      const msg =
        err?.response?.data?.message ||
        err?.message ||
        "Something went wrong";
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const currentList =
    historyTab === "pending"
      ? complaints.pending
      : historyTab === "resolved"
        ? complaints.resolved
        : complaints.rejected;

  // button should be enabled only when both fields are filled
  const canSubmit = title.trim().length > 0 && desc.trim().length > 0;

  return (
    <Layout showBack={true} title="Complaints" scroll>
      {/* top tabs */}
      <View style={styles.topTabs}>
        <TabButton
          label="Request"
          active={activeTab === "request"}
          onPress={() => setActiveTab("request")}
        />
        <TabButton
          label="History"
          active={activeTab === "history"}
          onPress={() => setActiveTab("history")}
        />
      </View>

      {error ? (
        <Text style={{ color: "red", marginBottom: 10 }}>{error}</Text>
      ) : null}

      {activeTab === "request" ? (
        <>
          <Typography
            variant="sub heading"
            style={{ textAlign: "center", color: "#6B7280", marginBottom: 10 }}
          >
            Report any issues or concerns
          </Typography>

          <View style={styles.card}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
              <View style={styles.icon}>
                <Text style={{ fontSize: 22 }}>💬</Text>
              </View>
              <View>
                <Typography variant="sub heading">Submit New Request</Typography>
                <Text style={{ color: "#6B7280" }}>
                  We will address your concern promptly
                </Text>
              </View>
            </View>

            {/* tag selector */}
            <View style={{ flexDirection: "row", gap: 8 }}>
              <SmallTagButton
                label="Complaint"
                active={tag === "complaint"}
                onPress={() => setTag("complaint")}
              />
              <SmallTagButton
                label="Maintenance"
                active={tag === "maintenance_request"}
                onPress={() => setTag("maintenance_request")}
              />
            </View>

            {/* title input OR maintenance dropdown */}
            {tag === "complaint" ? (
              <Input
                label="Title"
                value={title}
                onChangeText={setTitle}
                placeholder="Short title (e.g. Noise issue)"
              />
            ) : (
              <View style={{ gap: 4 }}>
                <Text style={{ fontWeight: "600", color: "#374151" }}>
                  Select category
                </Text>

                {/* fake select */}
                <TouchableOpacity
                  style={styles.selectBox}
                  onPress={() => setShowMaintenanceList((p) => !p)}
                >
                  <Text style={{ color: "#111827" }}>
                    {title || "Choose category"}
                  </Text>
                  <Text style={{ color: "#6B7280" }}>
                    {showMaintenanceList ? "▲" : "▼"}
                  </Text>
                </TouchableOpacity>

                {showMaintenanceList && (
                  <View style={styles.dropdown}>
                    {MAINTENANCE_TITLES.map((item) => (
                      <TouchableOpacity
                        key={item}
                        style={styles.dropdownItem}
                        onPress={() => {
                          setTitle(item);
                          setShowMaintenanceList(false);
                        }}
                      >
                        <Text style={{ color: "#111827" }}>{item}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </View>
            )}

            <Input
              label="Write Your Complaint"
              value={desc}
              onChangeText={setDesc}
              placeholder="Please describe your issue..."
              multiline
              numberOfLines={4}
              style={{ height: 120 }}
            />

            {canSubmit && (
              <LongTextButton
                text={submitting ? "Submitting..." : "Submit"}
                style={{ backgroundColor: "#DC2626" }}
                onPress={handleSubmit}
                disabled={submitting}
              />
            )}
          </View>
        </>
      ) : (
        <View style={styles.card}>
          <Typography variant="sub heading" style={{ marginBottom: 6 }}>
            Your Requests
          </Typography>

          {/* inner tabs */}
          <View style={styles.historyTabs}>
            <HistoryTabButton
              label="Pending"
              active={historyTab === "pending"}
              onPress={() => setHistoryTab("pending")}
            />
            <HistoryTabButton
              label="Resolved"
              active={historyTab === "resolved"}
              onPress={() => setHistoryTab("resolved")}
            />
            <HistoryTabButton
              label="Rejected"
              active={historyTab === "rejected"}
              onPress={() => setHistoryTab("rejected")}
            />
          </View>

          {loading ? (
            <View style={{ padding: 16 }}>
              <ActivityIndicator />
            </View>
          ) : currentList.length === 0 ? (
            <Text style={{ color: "#6B7280", marginTop: 8 }}>
              No {historyTab} requests found.
            </Text>
          ) : (
            currentList.map((c) => (
              <View key={c._id} style={styles.prev}>
                <View style={{ flexDirection: "row", gap: 6, marginBottom: 4 }}>
                  <Chip
                    text={
                      c.tag === "maintenance_request" ? "Maintenance" : "Complaint"
                    }
                  />
                  <Chip text={toTitle(c.status)} type={c.status} />
                </View>

                {/* show title too */}
                {c.title ? (
                  <Text style={{ fontWeight: "600", color: "#111827" }}>
                    {c.title}
                  </Text>
                ) : null}

                <Text style={{ color: "#374151" }}>{c.text}</Text>

                {c.createdAt ? (
                  <Text style={{ color: "#6B7280", marginTop: 4 }}>
                    {new Date(c.createdAt).toLocaleString()}
                  </Text>
                ) : null}

                {c.response && (
                  <View style={styles.responseBox}>
                    <Text style={{ fontWeight: "600", color: "#16A34A" }}>
                      Response:
                    </Text>
                    <Text style={{ color: "#065F46" }}>{c.response}</Text>
                  </View>
                )}
              </View>
            ))
          )}
        </View>
      )}
    </Layout>
  );
}

/* helper components */

function TabButton({ label, active, onPress }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={[
        {
          flex: 1,
          paddingVertical: 10,
          alignItems: "center",
          borderBottomWidth: 2,
        },
        active
          ? { borderBottomColor: "#DC2626" }
          : { borderBottomColor: "transparent" },
      ]}
    >
      <Text style={{ color: active ? "#DC2626" : "#6B7280", fontWeight: "600" }}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

function SmallTagButton({ label, active, onPress }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={[
        {
          paddingHorizontal: 12,
          paddingVertical: 6,
          borderRadius: 999,
          backgroundColor: "#E5E7EB",
        },
        active && { backgroundColor: "#FECACA" },
      ]}
    >
      <Text style={{ color: active ? "#B91C1C" : "#374151" }}>{label}</Text>
    </TouchableOpacity>
  );
}

function HistoryTabButton({ label, active, onPress }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={[
        {
          paddingHorizontal: 12,
          paddingVertical: 6,
          borderRadius: 999,
          backgroundColor: "#E5E7EB",
        },
        active && { backgroundColor: "#DC2626" },
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
    type === "resolved"
      ? "#D1FAE5"
      : type === "rejected"
        ? "#FEE2E2"
        : "#E5E7EB";
  const color =
    type === "resolved"
      ? "#065F46"
      : type === "rejected"
        ? "#B91C1C"
        : "#374151";
  return (
    <View
      style={{
        backgroundColor: bg,
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 999,
      }}
    >
      <Text style={{ color }}>{text}</Text>
    </View>
  );
}

function toTitle(status) {
  if (status === "resolved") return "Resolved";
  if (status === "rejected") return "Rejected";
  if (status === "pending") return "Pending";
  return status;
}

/* styles */
const styles = StyleSheet.create({
  topTabs: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 12,
  },
  card: {
    backgroundColor: "#FFF",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    padding: 12,
    gap: 8,
  },
  icon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: "#FEE2E2",
    alignItems: "center",
    justifyContent: "center",
  },
  historyTabs: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 8,
  },
  prev: {
    backgroundColor: "#F9FAFB",
    borderRadius: 12,
    padding: 10,
    marginTop: 6,
  },
  responseBox: {
    marginTop: 6,
    backgroundColor: "#ECFDF5",
    borderRadius: 8,
    padding: 8,
  },
  selectBox: {
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: "#FFF",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  dropdown: {
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 10,
    backgroundColor: "#FFF",
    overflow: "hidden",
  },
  dropdownItem: {
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
});
