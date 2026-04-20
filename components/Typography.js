// Typography.js
import { StyleSheet, Text } from "react-native";

export default function Typography({
  variant = "body",
  align = "left",
  children,
  style,
  onPress,
  ...rest
}) {
  // normalize variant like "sub heading" / "sub-heading" -> "subheading"
  const key = String(variant).toLowerCase().replace(/\s|-/g, "");

  const variantStyle =
    key === "heading"
      ? styles.heading
      : key === "subheading"
        ? styles.subheading
        : key === "caption"
          ? styles.caption
          : key === "small"
            ? styles.small
            : key === "link"
              ? styles.link
              : styles.body; // default to body

  const accessibilityRole = key === "link" && onPress ? "link" : undefined;

  return (
    <Text
      style={[styles.base, variantStyle, { textAlign: align }, style]} // apply align
      onPress={onPress}
      accessibilityRole={accessibilityRole}
      allowFontScaling
      {...rest}
    >
      {children}
    </Text>
  );
}

const styles = StyleSheet.create({
  base: {
    color: "#111",
  },
  heading: {
    fontSize: 24,
    lineHeight: 30,
    fontWeight: "700",
  },
  subheading: {
    fontSize: 18,
    lineHeight: 24,
    fontWeight: "600",
    color: "#222",
  },
  body: {
    fontSize: 16,
    lineHeight: 22,
    color: "#222",
  },
  caption: {
    fontSize: 13,
    lineHeight: 18,
    color: "#6B7280",
  },
  small: {
    fontSize: 12,
    lineHeight: 16,
    color: "#4B5563",
  },
  link: {
    fontSize: 16,
    lineHeight: 22,
    color: "#2563EB",
    textDecorationLine: "underline",
  },
});
