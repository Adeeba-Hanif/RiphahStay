// screens/RoomAllocation.js
import React, { useEffect, useMemo, useState } from "react";
import {
  Alert,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ActivityIndicator,
} from "react-native";
import axios from "axios";
import Layout from "../components/Layout";
import Typography from "../components/Typography";
import LongTextButton from "../components/LongTextButton";
import { useAuthContext } from "../context/auth";
import { useProfileStore } from "../store/profile";
import { API_BASE_URL } from "../utils/apiBase";

const GREEN = "#16A34A";
const RED = "#EF4444";
const BLUE = "#2563EB";

export default function RoomAllocation() {
  const { token } = useAuthContext();
  const { profile } = useProfileStore();

  const [rooms, setRooms] = useState([]);
  const [selectedRoomId, setSelectedRoomId] = useState("");
  const [loadingRooms, setLoadingRooms] = useState(true);
  const [saving, setSaving] = useState(false);
  const [requestSent, setRequestSent] = useState(false);
  const [pendingRequest, setPendingRequest] = useState(null); // existing pending request

  const baseURL = API_BASE_URL;

  const roomLabel = (roomLike) => {
    if (!roomLike) return "Room";
    if (typeof roomLike === "string") return roomLike;
    if (typeof roomLike === "object") {
      if (typeof roomLike.roomNumber === "string") return roomLike.roomNumber;
      if (typeof roomLike.name === "string") return roomLike.name;
      if (typeof roomLike._id === "string") return roomLike._id;
    }
    return "Room";
  };

  const wifiLabel = (wifiLike) => {
    if (!wifiLike) return "No Wi-Fi attached";
    if (typeof wifiLike === "string") return wifiLike;
    if (typeof wifiLike === "object") {
      return wifiLike.name || wifiLike.ssid || wifiLike._id || "Wi-Fi";
    }
    return "Wi-Fi";
  };

  // fetch rooms + check for existing pending request
  useEffect(() => {
    const loadData = async () => {
      setLoadingRooms(true);
      const headers = { Authorization: `Bearer ${token}` };
      const [roomsRes, pendingRes] = await Promise.allSettled([
        axios.get(`${baseURL}/room`, { headers }),
        axios.get(`${baseURL}/room/requests/my`, { headers }),
      ]);

      if (roomsRes.status === "fulfilled") {
        setRooms(Array.isArray(roomsRes.value.data) ? roomsRes.value.data : []);
      } else {
        Alert.alert("Error", "Could not load rooms");
      }

      if (pendingRes.status === "fulfilled" && pendingRes.value.data?.request) {
        setPendingRequest(pendingRes.value.data.request);
        setRequestSent(true);
      }

      setLoadingRooms(false);
    };

    if (token) loadData();
  }, [baseURL, token]);

  // preselect current room
  useEffect(() => {
    if (profile?.room?._id) {
      setSelectedRoomId(profile.room._id);
    }
  }, [profile]);

  const groupedByLevel = useMemo(() => {
    const m = {};
    rooms.forEach((r) => {
      const key = r.level || "Other";
      if (!m[key]) m[key] = [];
      m[key].push(r);
    });
    return m;
  }, [rooms]);

  const pickRoom = (room) => {
    const occupied =
      (room.occupants?.length || 0) >= (room.capacity || 0 || 0);
    if (occupied) {
      Alert.alert("Room occupied", "Please select another available room.");
      return;
    }
    setSelectedRoomId(room._id);
  };

  // now we send a room request instead of directly updating user.room
  const handleConfirm = async () => {
    if (!selectedRoomId) {
      Alert.alert("Select a room first");
      return;
    }

    // optional: if user selects same room as current, no need to send
    if (profile?.room?._id && profile.room._id === selectedRoomId) {
      Alert.alert("No change", "You are already in this room.");
      return;
    }

    try {
      setSaving(true);
      await axios.post(
        `${baseURL}/room/requests`,
        { toRoom: selectedRoomId },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      setRequestSent(true);
      Alert.alert(
        "Request Submitted",
        "Your room change request has been sent for warden approval.\n\nOnce approved, a Bank of Meezan booking challan will be automatically generated for you."
      );
    } catch (err) {
      console.log("room request err", err?.response?.data || err.message);
      const msg =
        err?.response?.data?.message ||
        err?.message ||
        "Could not create room request";
      Alert.alert("Error", msg);
    } finally {
      setSaving(false);
    }
  };

  const currentRoom = profile?.room || null;
  const currentWifi = currentRoom?.wifiPoint || null;

  return (
    <Layout title="Room Allocation" showBack scroll>
      <Typography
        variant="sub heading"
        style={{ textAlign: "center", color: "#6B7280", marginTop: 4 }}
      >
        Select your preferred room
      </Typography>

      {/* legend */}
      <View style={styles.legend}>
        <LegendDot color={GREEN} label="Available" />
        <LegendDot color={RED} label="Occupied" />
        <LegendDot color={BLUE} label="Selected" />
      </View>

      {/* current room */}
      <View style={styles.currentCard}>
        <Text style={styles.cardLabel}>Your current room</Text>
        <Typography variant="link" style={{ fontSize: 18 }}>
          {currentRoom ? roomLabel(currentRoom) : "Not allocated"}
        </Typography>
        <Text style={{ color: "#4B5563", marginTop: 6 }}>
          {currentWifi ? wifiLabel(currentWifi) : "No Wi-Fi attached"}
        </Text>
      </View>

      {/* selected room */}
      <View style={styles.selectedCard}>
        <Text style={{ color: "#6B7280", marginBottom: 6 }}>Selected Room</Text>
        <Typography variant="link" style={{ fontSize: 18 }}>
          {selectedRoomId
            ? roomLabel(rooms.find((r) => r._id === selectedRoomId))
            : ""}
        </Typography>

        <LongTextButton
          text={saving ? "Sending..." : requestSent ? "Request Pending" : "Request this room"}
          style={[{ marginTop: 10 }, requestSent && { opacity: 0.5 }]}
          onPress={handleConfirm}
          disabled={saving || requestSent}
        />
      </View>

      {/* pending request banner */}
      {requestSent && (
        <View style={styles.pendingBanner}>
          <Text style={styles.pendingTitle}>
            {pendingRequest
              ? `You have already booked a room: ${pendingRequest.toRoom?.level ?? ""} ${pendingRequest.toRoom?.roomNumber ?? ""}`.trim()
              : "Request Pending Approval"}
          </Text>
          <Text style={styles.pendingBody}>
            Your room change request is awaiting warden approval. You cannot
            submit another request until this one is resolved.
          </Text>
        </View>
      )}

      {/* rooms list */}
      {loadingRooms ? (
        <View style={{ marginTop: 20, alignItems: "center" }}>
          <ActivityIndicator />
          <Text style={{ marginTop: 8 }}>Loading rooms...</Text>
        </View>
      ) : (
        <View style={{ gap: 16, marginTop: 12, marginBottom: 40 }}>
          {Object.entries(groupedByLevel).map(([level, levelRooms]) => (
            <View key={level} style={styles.floorBlock}>
              <View style={styles.floorChip}>
                <Text style={{ color: "#6B7280" }}>{level}</Text>
              </View>

              <View style={styles.grid}>
                {levelRooms.map((r) => {
                  const occupied =
                    (r.occupants?.length || 0) >= (r.capacity || 0);
                  const isSelected = selectedRoomId === r._id;

                  return (
                    <TouchableOpacity
                      key={r._id}
                      style={[
                        styles.room,
                        isSelected && { borderColor: BLUE },
                      ]}
                      onPress={() => pickRoom(r)}
                      activeOpacity={occupied ? 1 : 0.85}
                    >
                      <Text style={{ color: "#0B1220", fontWeight: "700" }}>
                        {roomLabel(r)}
                      </Text>

                      <SeatDots
                        capacity={r.capacity || 0}
                        occupied={r.occupants?.length || 0}
                        selected={isSelected}
                      />

                      <Text style={styles.statusText}>
                        {isSelected
                          ? "Selected"
                          : occupied
                            ? "Occupied"
                            : "Available"}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          ))}
        </View>
      )}
    </Layout>
  );
}

/* dots only */
function SeatDots({ capacity, occupied, selected }) {
  if (!capacity || capacity <= 0) return null;

  const dots = [];
  for (let i = 0; i < capacity; i++) {
    let color = GREEN;
    if (i < occupied) color = RED;
    if (selected) color = BLUE;
    dots.push(
      <View key={i} style={[styles.dot, { backgroundColor: color }]} />
    );
  }

  return <View style={styles.dotsRow}>{dots}</View>;
}

function LegendDot({ color, label }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
      <View
        style={{
          width: 18,
          height: 18,
          borderRadius: 4,
          backgroundColor: color,
        }}
      />
      <Text style={{ color: "#111827" }}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  legend: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#FFFFFF",
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    marginTop: 12,
  },
  currentCard: {
    marginTop: 12,
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    padding: 16,
  },
  cardLabel: {
    color: "#6B7280",
    marginBottom: 6,
  },
  selectedCard: {
    marginTop: 12,
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    padding: 16,
  },
  floorBlock: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    padding: 12,
  },
  floorChip: {
    alignSelf: "flex-start",
    backgroundColor: "#F3F4F6",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    marginBottom: 8,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  room: {
    width: "22%",
    aspectRatio: 1,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#E5E7EB",
    backgroundColor: "#F3F4F6",
    paddingHorizontal: 4,
  },
  dotsRow: {
    flexDirection: "row",
    marginTop: 6,
    marginBottom: 2,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 999,
    marginHorizontal: 2,
  },
  statusText: {
    fontSize: 10,
    color: "#6B7280",
    marginTop: 2,
  },
  pendingBanner: {
    marginTop: 12,
    backgroundColor: "#FFF7ED",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#FED7AA",
    padding: 14,
  },
  pendingTitle: {
    fontWeight: "700",
    color: "#C2410C",
    marginBottom: 4,
    fontSize: 13,
  },
  pendingBody: {
    color: "#9A3412",
    fontSize: 12,
    lineHeight: 18,
  },
});
