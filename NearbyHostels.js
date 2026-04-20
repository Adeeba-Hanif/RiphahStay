// screens/NearbyHostels.js
import React, { useRef, useMemo, useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  Platform,
  TouchableOpacity,
  ScrollView,
} from "react-native";
import WebView from "react-native-webview";
import * as Location from "expo-location";
import Layout from "../components/Layout";
import Typography from "../components/Typography";
import { nearbyHostels } from "../dummyData";
import { Ionicons } from "@expo/vector-icons";

const FALLBACK_CENTER = { lat: 33.6258, lng: 72.9845 }; // Gulberg Greens, Islamabad
const MAP_ZOOM = 14;

const AUDIENCE_LABEL = { girls: "Girls", boys: "Boys", mixed: "Mixed" };

function buildMapHtml(hostels, userLoc) {
  const markersJson = JSON.stringify(
    hostels
      .filter((h) => h.lat != null && h.lng != null)
      .map((h) => ({
        id: h.id,
        lat: h.lat,
        lng: h.lng,
        name: h.name,
        location: h.location,
        rating: h.rating,
        rate: h.averageRate,
        audience: h.audience || "mixed",
      }))
  );

  const centerLat = userLoc?.latitude ?? FALLBACK_CENTER.lat;
  const centerLng = userLoc?.longitude ?? FALLBACK_CENTER.lng;
  const userMarker = userLoc
    ? `L.circleMarker([${centerLat}, ${centerLng}], { radius: 8, color: '#4F46E5', fillColor: '#4F46E5', fillOpacity: 1 })
        .bindPopup('<b>Your Location</b>').addTo(map);`
    : "";

  return `
<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" crossorigin="" />
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js" crossorigin=""></script>
  <style>
    * { margin: 0; padding: 0; }
    html, body, #map { height: 100%; width: 100%; }
    .hostel-marker {
      background: #4F46E5;
      color: white;
      padding: 4px 8px;
      border-radius: 6px;
      font-size: 11px;
      font-weight: 600;
      white-space: nowrap;
      box-shadow: 0 2px 6px rgba(0,0,0,0.25);
    }
  </style>
</head>
<body>
  <div id="map"></div>
  <script>
    const hostels = ${markersJson};
    const map = L.map('map', { zoomControl: false, attributionControl: true })
      .setView([${centerLat}, ${centerLng}], ${MAP_ZOOM});

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap'
    }).addTo(map);
    L.control.zoom({ position: 'topright' }).addTo(map);

    ${userMarker}

    hostels.forEach(function(h) {
      const el = document.createElement('div');
      el.className = 'hostel-marker';
      el.textContent = h.name;
      const marker = L.marker([h.lat, h.lng], {
        icon: L.divIcon({ html: el.outerHTML, className: '', iconSize: [140, 32], iconAnchor: [70, 16] })
      });
      const aud = h.audience === 'girls' ? 'Girls' : h.audience === 'boys' ? 'Boys' : 'Mixed';
      marker.bindPopup('<b>' + h.name + '</b><br/><small>' + aud + '</small><br/>' + h.location + '<br/><small>★ ' + h.rating.toFixed(1) + ' · Rs.' + h.rate.toLocaleString() + '/mo</small>').addTo(map);
    });

    if (hostels.length > 0) {
      const pts = hostels.map(h => [h.lat, h.lng]);
      ${userMarker ? `pts.push([${centerLat}, ${centerLng}]);` : ""}
      map.fitBounds(L.latLngBounds(pts).pad(0.15));
    }
  </script>
</body>
</html>
  `;
}

export default function NearbyHostels({ navigation, route }) {
  const webViewRef = useRef(null);
  const isGuest = route?.name === "GuestNearbyHostels";
  const [userLocation, setUserLocation] = useState(null);
  const [locStatus, setLocStatus] = useState("requesting"); // 'requesting' | 'granted' | 'denied'
  const [audienceFilter, setAudienceFilter] = useState(
    () => route?.params?.initialAudience ?? "girls"
  );

  useEffect(() => {
    const a = route?.params?.initialAudience;
    if (a === "girls" || a === "boys" || a === "all") {
      setAudienceFilter(a);
    }
  }, [route?.params?.initialAudience]);

  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        setLocStatus("denied");
        return;
      }
      setLocStatus("granted");
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      setUserLocation(loc.coords);
    })();
  }, []);

  const filteredHostels = useMemo(() => {
    if (audienceFilter === "all") return nearbyHostels;
    return nearbyHostels.filter((h) => (h.audience || "mixed") === audienceFilter);
  }, [audienceFilter]);

  const mapHtml = useMemo(
    () => buildMapHtml(filteredHostels, userLocation),
    [filteredHostels, userLocation]
  );

  const listTitle =
    audienceFilter === "girls"
      ? "Girls' hostels near Riphah (Gulberg Greens)"
      : audienceFilter === "boys"
        ? "Boys' hostels near campus"
        : "All listings (Gulberg Greens · Riphah area)";

  return (
    <Layout title="Nearby Hostels" showBack scroll={false}>
      <ScrollView
        style={{ flex: 1 }}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 28 }}
        nestedScrollEnabled
      >
      <Typography variant="subheading" style={styles.sectionTitle}>
        Near Riphah International University — Gulberg Greens, Islamabad
      </Typography>

      <View style={styles.filterRow}>
        {[
          { key: "all", label: "All" },
          { key: "girls", label: "Girls" },
          { key: "boys", label: "Boys" },
        ].map((opt) => (
          <TouchableOpacity
            key={opt.key}
            style={[styles.filterChip, audienceFilter === opt.key && styles.filterChipActive]}
            onPress={() => setAudienceFilter(opt.key)}
            activeOpacity={0.85}
          >
            <Text
              style={[styles.filterChipText, audienceFilter === opt.key && styles.filterChipTextActive]}
            >
              {opt.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
      <Text style={styles.filterHint}>
        {audienceFilter === "girls"
          ? "15 women-only / girls' hostels in this search (demo data around Riphah & Gulberg Greens)."
          : audienceFilter === "boys"
            ? "No boys' hostels in this demo list — switch to All or Girls."
            : "15 girls' hostels in this dataset. Boys filter is empty in demo."}
      </Text>

      <View style={styles.mapContainer}>
        <WebView
          ref={webViewRef}
          source={{ html: mapHtml }}
          style={styles.map}
          scrollEnabled={false}
          nestedScrollEnabled={true}
          javaScriptEnabled={true}
          domStorageEnabled={true}
          originWhitelist={["*"]}
          startInLoadingState={true}
          renderLoading={() => (
            <View style={styles.loadingOverlay}>
              <ActivityIndicator size="large" color="#4F46E5" />
              <Text style={styles.loadingText}>Loading map…</Text>
            </View>
          )}
        />
      </View>

      {locStatus === "granted" && userLocation ? (
        <View style={styles.locChip}>
          <Ionicons name="locate" size={13} color="#4F46E5" />
          <Text style={styles.locChipText}>Showing your location on map</Text>
        </View>
      ) : locStatus === "denied" ? (
        <View style={styles.locChip}>
          <Ionicons name="location-outline" size={13} color="#9CA3AF" />
          <Text style={[styles.locChipText, { color: "#9CA3AF" }]}>Location access denied — showing campus area</Text>
        </View>
      ) : null}

      <Typography variant="subheading" style={styles.listTitle}>
        {listTitle}
      </Typography>
      <Text style={styles.countLine}>
        {filteredHostels.length} listing{filteredHostels.length === 1 ? "" : "s"}
      </Text>

      {isGuest && (
        <TouchableOpacity
          style={styles.guestBanner}
          onPress={() => navigation.navigate("Login")}
          activeOpacity={0.8}
        >
          <Text style={styles.guestBannerText}>
            🔐  Sign in to book a room or contact the hostel
          </Text>
        </TouchableOpacity>
      )}

      {filteredHostels.map((hostel) => (
        <View key={hostel.id} style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={styles.locationIcon}>
              <Ionicons name="location" size={16} color="#4F46E5" />
            </View>
            <View style={styles.cardTitleRow}>
              <View style={{ flex: 1, marginRight: 8 }}>
                <Text style={styles.name}>{hostel.name}</Text>
                <View
                  style={[
                    styles.audienceBadge,
                    hostel.audience === "girls" && styles.audBadgeGirls,
                    hostel.audience === "boys" && styles.audBadgeBoys,
                    (!hostel.audience || hostel.audience === "mixed") && styles.audBadgeMixed,
                  ]}
                >
                  <Text
                    style={[
                      styles.audienceBadgeText,
                      hostel.audience === "girls" && styles.audTextGirls,
                      hostel.audience === "boys" && styles.audTextBoys,
                      (!hostel.audience || hostel.audience === "mixed") && styles.audTextMixed,
                    ]}
                  >
                    {AUDIENCE_LABEL[hostel.audience] || "Mixed"}
                  </Text>
                </View>
              </View>
              <View style={styles.ratingRow}>
                <Ionicons name="star" size={14} color="#FACC15" />
                <Text style={styles.ratingText}>{hostel.rating.toFixed(1)}</Text>
              </View>
            </View>
          </View>
          <Text style={styles.location}>{hostel.location}</Text>
          <Text style={styles.description}>{hostel.description}</Text>
          <Text style={styles.rate}>
            Rs. {hostel.averageRate.toLocaleString()} / month
          </Text>
          <View style={styles.contactContainer}>
            <Text style={styles.contactText}>📧 {hostel.email}</Text>
            <Text style={styles.contactText}>📞 {hostel.phone}</Text>
          </View>
        </View>
      ))}
      </ScrollView>
    </Layout>
  );
}

const styles = StyleSheet.create({
  sectionTitle: {
    marginBottom: 8,
    color: "#374151",
  },
  filterRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 8,
    flexWrap: "wrap",
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: "#F3F4F6",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  filterChipActive: {
    backgroundColor: "#EEF2FF",
    borderColor: "#4F46E5",
  },
  filterChipText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#6B7280",
  },
  filterChipTextActive: {
    color: "#4F46E5",
  },
  filterHint: {
    fontSize: 12,
    color: "#9CA3AF",
    marginBottom: 12,
    lineHeight: 17,
  },
  countLine: {
    fontSize: 12,
    color: "#9CA3AF",
    marginTop: -4,
    marginBottom: 10,
  },
  audienceBadge: {
    alignSelf: "flex-start",
    marginTop: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
  },
  audBadgeGirls: { backgroundColor: "#FDF2F8", borderColor: "#FBCFE8" },
  audBadgeBoys: { backgroundColor: "#EFF6FF", borderColor: "#BFDBFE" },
  audBadgeMixed: { backgroundColor: "#F9FAFB", borderColor: "#E5E7EB" },
  audienceBadgeText: { fontSize: 11, fontWeight: "700" },
  audTextGirls: { color: "#BE185D" },
  audTextBoys: { color: "#1D4ED8" },
  audTextMixed: { color: "#4B5563" },
  mapContainer: {
    height: 220,
    borderRadius: 12,
    overflow: "hidden",
    backgroundColor: "#E5E7EB",
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  map: {
    flex: 1,
    backgroundColor: "transparent",
    ...(Platform.OS === "android" && { opacity: 0.99 }),
  },
  loadingOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "#F3F4F6",
    alignItems: "center",
    justifyContent: "center",
  },
  loadingText: {
    marginTop: 8,
    fontSize: 14,
    color: "#6B7280",
  },
  listTitle: {
    marginBottom: 10,
    color: "#374151",
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    padding: 14,
    marginBottom: 14,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  locationIcon: {
    marginRight: 8,
  },
  cardTitleRow: {
    flex: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  name: {
    fontSize: 16,
    fontWeight: "600",
    color: "#111827",
  },
  location: {
    fontSize: 13,
    color: "#4B5563",
    marginBottom: 4,
    marginLeft: 24,
  },
  description: {
    fontSize: 13,
    color: "#374151",
    marginBottom: 6,
  },
  ratingRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  ratingText: {
    marginLeft: 4,
    color: "#92400E",
    fontWeight: "600",
  },
  rate: {
    fontSize: 14,
    fontWeight: "500",
    color: "#4F46E5",
    marginBottom: 6,
  },
  contactContainer: {
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
    paddingTop: 6,
  },
  contactText: {
    fontSize: 13,
    color: "#374151",
  },
  guestBanner: {
    backgroundColor: "#EEF2FF",
    borderWidth: 1,
    borderColor: "#C7D2FE",
    borderRadius: 10,
    padding: 12,
    marginBottom: 10,
    alignItems: "center",
  },
  guestBannerText: {
    color: "#4338CA",
    fontWeight: "600",
    fontSize: 13,
    textAlign: "center",
  },
  locChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#EEF2FF",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginBottom: 10,
    alignSelf: "flex-start",
  },
  locChipText: {
    fontSize: 12,
    color: "#4F46E5",
    fontWeight: "500",
  },
});
