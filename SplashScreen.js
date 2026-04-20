import { useEffect, useRef } from "react";
import { Animated, StyleSheet, View, StatusBar } from "react-native";
import Svg, { Path, Circle, Text as SvgText, TSpan } from "react-native-svg";

export default function SplashScreen({ onFinish }) {
    const logoScale    = useRef(new Animated.Value(0)).current;
    const logoOpacity  = useRef(new Animated.Value(0)).current;
    const textOpacity  = useRef(new Animated.Value(0)).current;
    const subOpacity   = useRef(new Animated.Value(0)).current;
    const screenOpacity = useRef(new Animated.Value(1)).current;

    useEffect(() => {
        Animated.sequence([
            Animated.parallel([
                Animated.spring(logoScale, {
                    toValue: 1, friction: 5, tension: 90, useNativeDriver: true,
                }),
                Animated.timing(logoOpacity, {
                    toValue: 1, duration: 350, useNativeDriver: true,
                }),
            ]),
            Animated.timing(textOpacity, { toValue: 1, duration: 400, useNativeDriver: true }),
            Animated.timing(subOpacity,  { toValue: 1, duration: 350, useNativeDriver: true }),
            Animated.delay(900),
            Animated.timing(screenOpacity, { toValue: 0, duration: 350, useNativeDriver: true }),
        ]).start(() => onFinish?.());
    }, []);

    return (
        <Animated.View style={[styles.container, { opacity: screenOpacity }]}>
            <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />

            <View style={styles.circle1} />
            <View style={styles.circle2} />
            <View style={styles.circle3} />

            {/* SVG Logo — springs in */}
            <Animated.View style={[styles.logoWrap, {
                opacity: logoOpacity,
                transform: [{ scale: logoScale }],
            }]}>
                <Svg width="170" height="170" viewBox="0 0 200 200" fill="none">
                    <Path
                        d="M100 18 C76 18 57 37 57 61 C57 85 100 128 100 128 C100 128 143 85 143 61 C143 37 124 18 100 18 Z"
                        fill="none" stroke="#1E3A5F" strokeWidth="7" strokeLinejoin="round"
                    />
                    <Circle cx="100" cy="60" r="17" fill="none" stroke="#1E3A5F" strokeWidth="7" />
                    <SvgText
                        x="100" y="158" textAnchor="middle"
                        fontFamily="Arial" fontWeight="800" fontSize="28"
                    >
                        <TSpan fill="#1E3A5F">Riphah</TSpan>
                        <TSpan fill="#C8960A">Stay</TSpan>
                    </SvgText>
                    <Path
                        d="M30 172 Q47 165 64 172 Q81 179 98 172 Q115 165 132 172 Q149 179 170 172"
                        fill="none" stroke="#1E3A5F" strokeWidth="3" strokeLinecap="round"
                    />
                    <Path
                        d="M30 182 Q47 175 64 182 Q81 189 98 182 Q115 175 132 182 Q149 189 170 182"
                        fill="none" stroke="#C8960A" strokeWidth="3" strokeLinecap="round"
                    />
                </Svg>
            </Animated.View>

            <Animated.Text style={[styles.tagline, { opacity: textOpacity }]}>
                Hostel Management System
            </Animated.Text>

            <Animated.Text style={[styles.university, { opacity: subOpacity }]}>
                Riphah International University
            </Animated.Text>
        </Animated.View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#ffffff",
        alignItems: "center",
        justifyContent: "center",
    },
    circle1: {
        position: "absolute",
        top: -90, right: -70,
        width: 260, height: 260, borderRadius: 130,
        backgroundColor: "rgba(79,70,229,0.05)",
    },
    circle2: {
        position: "absolute",
        bottom: -55, left: -55,
        width: 200, height: 200, borderRadius: 100,
        backgroundColor: "rgba(200,150,10,0.06)",
    },
    circle3: {
        position: "absolute",
        top: "40%", left: -40,
        width: 120, height: 120, borderRadius: 60,
        backgroundColor: "rgba(30,58,95,0.03)",
    },
    logoWrap:   { marginBottom: 16 },
    tagline: {
        fontSize: 14, color: "#64748B",
        fontWeight: "600", letterSpacing: 0.4,
        marginBottom: 4,
    },
    university: {
        position: "absolute", bottom: 52,
        fontSize: 12, color: "#94A3B8",
        fontWeight: "500", letterSpacing: 0.2,
    },
});
