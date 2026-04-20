import React, { useEffect, useState, useCallback, useRef } from "react";
import {
  StyleSheet,
  Text,
  View,
  Alert,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
} from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import * as LocalAuthentication from "expo-local-authentication";
import axios from "axios";
import Layout from "../components/Layout";
import Typography from "../components/Typography";
import LongTextButton from "../components/LongTextButton";
import { useAuthContext } from "../context";
import { API_BASE_URL } from "../utils/apiBase";

const API_BASE = API_BASE_URL;
const BIOMETRIC_WINDOW_SEC = 10;

export default function Attendance() {
  const { token } = useAuthContext();
  const [activeTab, setActiveTab] = useState("mark");
  const [scanning, setScanning] = useState(false);
  const [permission, requestPermission] = useCameraPermissions();

  const [loadingHistory, setLoadingHistory] = useState(false);
  const [history, setHistory] = useState([]);

  const [pendingBiometric, setPendingBiometric] = useState(false);
  const [biometricTimeLeft, setBiometricTimeLeft] = useState(BIOMETRIC_WINDOW_SEC);
  const [pendingQrToken, setPendingQrToken] = useState(null);
  const biometricDoneRef = useRef(false);
  const biometricSessionRef = useRef(null);

  const [historyFilter, setHistoryFilter] = useState("all");

  const fetchHistory = useCallback(async () => {
    try {
      setLoadingHistory(true);
      const res = await axios.get(`${API_BASE}/attendance/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setHistory(res.data.attendance || []);
    } catch (err) {
      Alert.alert("Error", "Failed to load attendance history");
      console.log(err);
    } finally {
      setLoadingHistory(false);
    }
  }, [token]);

  useEffect(() => {
    if (activeTab === "history") {
      fetchHistory();
    }
  }, [activeTab, fetchHistory]);

  useEffect(() => {
    if (!pendingBiometric) return;
    setBiometricTimeLeft(BIOMETRIC_WINDOW_SEC);
    biometricDoneRef.current = false;


    const interval = setInterval(async () => {
      setBiometricTimeLeft((prev) => {
        const next = prev - 1;
        if (next <= 0) {
          clearInterval(interval);
          if (!biometricDoneRef.current) {
            LocalAuthentication.cancelAuthenticate?.();
            setPendingBiometric(false);
            setPendingQrToken(null);
            biometricSessionRef.current = null;
            Alert.alert("Timeout", "Biometric timed out, scan the QR again");
          }
        }
        return next > 0 ? next : 0;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [pendingBiometric]);

  useEffect(() => {
    if (pendingBiometric && pendingQrToken && biometricSessionRef.current) {
      runBiometricAndMark(pendingQrToken, biometricSessionRef.current);
    }
  }, [pendingBiometric, pendingQrToken]);

  const runBiometricAndMark = async (qrToken, sessionId) => {
    try {
      const hasHw = await LocalAuthentication.hasHardwareAsync();
      if (!hasHw) {
        Alert.alert(
          "Biometric Required",
          "This device does not support fingerprint or Face ID. Attendance can only be marked using a device with biometric authentication."
        );
        setPendingBiometric(false);
        setPendingQrToken(null);
        biometricSessionRef.current = null;
        return;
      }

      const enrolled = await LocalAuthentication.isEnrolledAsync();
      if (!enrolled) {
        Alert.alert(
          "Biometric Not Set Up",
          "Please add a fingerprint or Face ID in your device settings, then try again."
        );
        setPendingBiometric(false);
        setPendingQrToken(null);
        biometricSessionRef.current = null;
        return;
      }

      const auth = await LocalAuthentication.authenticateAsync({
        promptMessage: "Verify to mark attendance",
        disableDeviceFallback: true,
        fallbackLabel: "",
        biometricsSecurityLevel: "strong",
      });

      if (!auth.success) {
        if (auth.error === "user_cancel" || auth.error === "system_cancel") {
          Alert.alert("Cancelled", "Biometric was cancelled. Scan the QR code again to retry.");
        } else {
          Alert.alert("Biometric Failed", auth.warning || auth.error || "Please try again.");
        }
        setPendingBiometric(false);
        setPendingQrToken(null);
        biometricSessionRef.current = null;
        return;
      }

      if (!biometricSessionRef.current || biometricSessionRef.current !== sessionId) {
        Alert.alert("Timeout", "Biometric window closed, scan again");
        setPendingBiometric(false);
        setPendingQrToken(null);
        biometricSessionRef.current = null;
        return;
      }

      biometricDoneRef.current = true;

      const res = await axios.post(
        `${API_BASE}/attendance/markAttendance`,
        { qrToken },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      Alert.alert("Success", res.data.message || "Attendance recorded");
      setPendingBiometric(false);
      setPendingQrToken(null);
      biometricSessionRef.current = null;

      if (activeTab === "history") {
        fetchHistory();
      }
    } catch (err) {
      Alert.alert("Error", err?.response?.data?.message || "Failed to mark attendance");
      setPendingBiometric(false);
      setPendingQrToken(null);
      biometricSessionRef.current = null;
    }
  };

  const handleBarCodeScanned = ({ data }) => {
    const sessionId = Date.now().toString();
    biometricSessionRef.current = sessionId;
    setScanning(false);
    setPendingQrToken(data);
    setPendingBiometric(true);
  };

  const filteredHistory =
    historyFilter === "all"
      ? history
      : history.filter((r) => r.status === historyFilter);

  const groupedByMonth = groupAttendanceByMonth(filteredHistory);

  const progressPct =
    (biometricTimeLeft / BIOMETRIC_WINDOW_SEC) * 100 > 0
      ? (biometricTimeLeft / BIOMETRIC_WINDOW_SEC) * 100
      : 0;

  return (
    <Layout title="Attendance" showBack scroll={false}>
      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tab, activeTab === "mark" && styles.tabActive]}
          onPress={() => setActiveTab("mark")}
        >
          <Text style={[styles.tabText, activeTab === "mark" && styles.tabTextActive]}>
            Mark
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === "history" && styles.tabActive]}
          onPress={() => setActiveTab("history")}
        >
          <Text style={[styles.tabText, activeTab === "history" && styles.tabTextActive]}>
            History
          </Text>
        </TouchableOpacity>
      </View>

      {activeTab === "mark" ? (
        <View style={styles.body}>
          <Typography variant="sub heading" style={styles.centerText}>
            Scan QR code and verify
          </Typography>

          <View style={styles.card}>
            <View style={styles.qr}>
              <Text style={{ fontSize: 48, color: "#1D4ED8" }}>🔳</Text>
            </View>
            <Typography
              variant="sub heading"
              style={{ textAlign: "center", marginTop: 6 }}
            >
              Ready to mark attendance
            </Typography>
            <Text style={styles.subText}>Tap the button below to open scanner</Text>

            <LongTextButton
              text={scanning ? "Scanning..." : "Scan QR Code"}
              style={{ marginTop: 14 }}
              onPress={async () => {
                if (!permission || !permission.granted) {
                  const perm = await requestPermission();
                  if (!perm.granted) {
                    Alert.alert("Permission required", "Camera is needed to scan QR");
                    return;
                  }
                }
                setScanning(true);
              }}
            />
          </View>

          {scanning ? (
            <View style={styles.scannerWrap}>
              {!permission ? (
                <Text>Requesting camera permission...</Text>
              ) : !permission.granted ? (
                <Text>No access to camera</Text>
              ) : (
                <CameraView
                  style={styles.scanner}
                  barcodeScannerSettings={{
                    barcodeTypes: ["qr"],
                  }}
                  onBarcodeScanned={scanning ? handleBarCodeScanned : undefined}
                />
              )}
              <LongTextButton
                text="Cancel"
                style={{ marginTop: 8 }}
                onPress={() => setScanning(false)}
              />
            </View>
          ) : null}

          {pendingBiometric ? (
            <View style={styles.biometricOverlay}>
              <View style={styles.biometricPanel}>
                <Text style={styles.biometricText}>
                  Complete biometric in {biometricTimeLeft}s
                </Text>
                <View style={styles.progressBar}>
                  <View style={[styles.progressFill, { width: `${progressPct}%` }]} />
                </View>
              </View>
            </View>
          ) : null}
        </View>
      ) : (
        <View style={styles.body}>
          <View style={styles.historyTabs}>
            <TouchableOpacity
              style={[styles.historyTab, historyFilter === "all" && styles.historyTabActive]}
              onPress={() => setHistoryFilter("all")}
            >
              <Text
                style={[
                  styles.historyTabText,
                  historyFilter === "all" && styles.historyTabTextActive,
                ]}
              >
                All
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.historyTab,
                historyFilter === "incoming" && styles.historyTabActive,
              ]}
              onPress={() => setHistoryFilter("incoming")}
            >
              <Text
                style={[
                  styles.historyTabText,
                  historyFilter === "incoming" && styles.historyTabTextActive,
                ]}
              >
                Incoming
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.historyTab,
                historyFilter === "outgoing" && styles.historyTabActive,
              ]}
              onPress={() => setHistoryFilter("outgoing")}
            >
              <Text
                style={[
                  styles.historyTabText,
                  historyFilter === "outgoing" && styles.historyTabTextActive,
                ]}
              >
                Outgoing
              </Text>
            </TouchableOpacity>
          </View>

          <Typography variant="sub heading" style={{ marginBottom: 8 }}>
            Attendance History
          </Typography>

          {loadingHistory ? (
            <ActivityIndicator />
          ) : (
            <FlatList
              style={{ flex: 1 }}
              data={groupedByMonth}
              keyExtractor={(item) => item.monthKey}
              renderItem={({ item }) => (
                <View style={styles.monthCard}>
                  <View style={styles.monthHeader}>
                    <Text style={styles.monthTitle}>{item.monthLabel}</Text>
                    <View style={styles.monthStats}>
                      <View style={styles.statPill}>
                        <Text style={styles.statLabel}>Incoming</Text>
                        <Text style={styles.statValue}>{item.incomingCount}</Text>
                      </View>
                      <View style={[styles.statPill, { backgroundColor: "#DBEAFE" }]}>
                        <Text style={[styles.statLabel, { color: "#1D4ED8" }]}>
                          Outgoing
                        </Text>
                        <Text style={[styles.statValue, { color: "#1D4ED8" }]}>
                          {item.outgoingCount}
                        </Text>
                      </View>
                    </View>
                  </View>

                  {item.records.map((rec) => (
                    <View key={rec.id} style={styles.recRow}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.dateText}>
                          {new Date(rec.date).toDateString()}
                        </Text>
                        <Text style={styles.timeText}>
                          {new Date(rec.date).toLocaleTimeString()}
                        </Text>
                      </View>
                      <View
                        style={[
                          styles.pill,
                          rec.status === "incoming"
                            ? {
                              backgroundColor: "#DCFCE7",
                              borderColor: "#22C55E",
                            }
                            : {
                              backgroundColor: "#DBEAFE",
                              borderColor: "#1D4ED8",
                            },
                        ]}
                      >
                        <Text
                          style={{
                            color: rec.status === "incoming" ? "#166534" : "#1D4ED8",
                          }}
                        >
                          {rec.status === "incoming" ? "Incoming" : "Outgoing"}
                        </Text>
                      </View>
                    </View>
                  ))}
                </View>
              )}
            />
          )}
        </View>
      )}
    </Layout>
  );
}

function groupAttendanceByMonth(records) {
  const map = {};
  records.forEach((r) => {
    const d = new Date(r.date);
    const monthKey = `${d.getFullYear()}-${d.getMonth() + 1}`;
    if (!map[monthKey]) {
      map[monthKey] = {
        monthKey,
        monthLabel: d.toLocaleString("default", {
          month: "long",
          year: "numeric",
        }),
        records: [],
        incomingCount: 0,
        outgoingCount: 0,
      };
    }
    const status = r.status;
    map[monthKey].records.push({
      id: r.id || r._id,
      date: r.date,
      status,
    });
    if (status === "incoming") map[monthKey].incomingCount += 1;
    if (status === "outgoing") map[monthKey].outgoingCount += 1;
  });

  return Object.values(map).sort((a, b) => (a.monthKey < b.monthKey ? 1 : -1));
}

const styles = StyleSheet.create({
  tabs: {
    flexDirection: "row",
    backgroundColor: "#EEF2FF",
    borderRadius: 999,
    padding: 4,
    marginBottom: 14,
  },
  tab: {
    flex: 1,
    paddingVertical: 6,
    borderRadius: 999,
    alignItems: "center",
  },
  tabActive: {
    backgroundColor: "#FFFFFF",
  },
  tabText: {
    color: "#6B7280",
    fontWeight: "500",
  },
  tabTextActive: {
    color: "#1D4ED8",
  },
  body: {
    flex: 1,
  },
  centerText: { textAlign: "center", color: "#6B7280", marginBottom: 8 },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    padding: 16,
    alignItems: "center",
  },
  qr: {
    width: 110,
    height: 110,
    borderRadius: 16,
    backgroundColor: "#E8F0FF",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  subText: {
    color: "#6B7280",
    textAlign: "center",
    marginTop: 6,
  },
  scannerWrap: {
    marginTop: 14,
  },
  scanner: {
    width: "100%",
    height: 280,
    borderRadius: 12,
  },
  biometricOverlay: {
    position: "absolute",
    top: 10,
    left: 10,
    right: 10,
  },
  biometricPanel: {
    backgroundColor: "#FFF7ED",
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: "#FED7AA",
  },
  biometricText: {
    marginBottom: 6,
    color: "#9A3412",
    fontWeight: "500",
  },
  progressBar: {
    height: 6,
    backgroundColor: "#FED7AA",
    borderRadius: 999,
    overflow: "hidden",
  },
  progressFill: {
    height: 6,
    backgroundColor: "#EA580C",
  },
  historyTabs: {
    flexDirection: "row",
    marginBottom: 10,
    gap: 6,
  },
  historyTab: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: "#E5E7EB",
  },
  historyTabActive: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#D1D5DB",
  },
  historyTabText: {
    color: "#374151",
  },
  historyTabTextActive: {
    color: "#111827",
    fontWeight: "600",
  },
  monthCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    padding: 12,
    marginBottom: 12,
  },
  monthHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  monthTitle: {
    fontSize: 16,
    fontWeight: "600",
  },
  monthStats: {
    flexDirection: "row",
    gap: 6,
  },
  statPill: {
    backgroundColor: "#DCFCE7",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  statLabel: {
    fontSize: 11,
    color: "#166534",
  },
  statValue: {
    fontSize: 14,
    fontWeight: "700",
    color: "#166534",
  },
  recRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  dateText: { color: "#111827", fontWeight: "600" },
  timeText: { color: "#6B7280", marginTop: 2 },
  pill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
  },
});
