import { StyleSheet, Text, TouchableOpacity } from "react-native";

export default function LongTextButton({
  text,
  children,
  style,
  textStyle,
  ...rest
}) {
  const content =
    children != null ? children : (text != null ? String(text) : "");

  return (
    <TouchableOpacity style={[styles.btn, style]} activeOpacity={0.82} {...rest}>
      {typeof content === "string" ? (
        <Text style={[styles.txt, textStyle]} allowFontScaling>
          {content}
        </Text>
      ) : (
        content
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  btn: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: "#4F46E5",
    alignItems: "center",
    justifyContent: "center",
    minHeight: 50,
    marginTop: 12,
  },
  txt: {
    textAlign: "center",
    fontSize: 15,
    fontWeight: "700",
    color: "#FFFFFF",
    lineHeight: 22,
    flexShrink: 1,
    alignSelf: "stretch",
  },
});
