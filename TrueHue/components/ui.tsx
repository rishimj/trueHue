import React from "react";
import {
  ActivityIndicator,
  Image,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native";

import { useThemeColors } from "@/lib/settings";

export function Screen({
  title,
  subtitle,
  headerRight,
  children,
}: {
  title: string;
  subtitle?: string;
  headerRight?: React.ReactNode;
  children: React.ReactNode;
}) {
  const colors = useThemeColors();
  return (
    <SafeAreaView style={[styles.flex, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.content}>
          <View style={styles.header}>
            <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
            {headerRight}
          </View>
          {subtitle ? (
            <Text style={[styles.subtitle, { color: colors.secondaryText }]}>{subtitle}</Text>
          ) : null}
          {children}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

export function Card({
  title,
  children,
  style,
}: {
  title?: string;
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  const colors = useThemeColors();
  return (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }, style]}>
      {title ? <Text style={[styles.cardTitle, { color: colors.text }]}>{title}</Text> : null}
      {children}
    </View>
  );
}

type ButtonVariant = "primary" | "secondary" | "ghost";

export function Button({
  label,
  onPress,
  variant = "primary",
  color,
  disabled,
  loading,
  testID,
}: {
  label: string;
  onPress: () => void;
  variant?: ButtonVariant;
  color?: string;
  disabled?: boolean;
  loading?: boolean;
  testID?: string;
}) {
  const colors = useThemeColors();
  const tint = color ?? colors.primary;
  const filled = variant === "primary";
  const inactive = disabled || loading;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: inactive }}
      disabled={inactive}
      onPress={onPress}
      testID={testID}
      style={({ pressed }) => [
        styles.button,
        filled && { backgroundColor: tint },
        variant === "secondary" && { borderWidth: 1, borderColor: tint },
        (pressed || inactive) && { opacity: inactive ? 0.5 : 0.8 },
      ]}
    >
      {loading ? (
        <ActivityIndicator color={filled ? "#fff" : tint} />
      ) : (
        <Text
          style={[
            styles.buttonText,
            { color: filled ? "#fff" : variant === "ghost" ? colors.secondaryText : tint },
          ]}
        >
          {label}
        </Text>
      )}
    </Pressable>
  );
}

export function ImagePreview({ uri }: { uri: string }) {
  const colors = useThemeColors();
  return (
    <View style={[styles.imageFrame, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <Image source={{ uri }} style={styles.image} resizeMode="cover" />
    </View>
  );
}

export function Loader({ label }: { label: string }) {
  const colors = useThemeColors();
  return (
    <View style={styles.loader}>
      <ActivityIndicator size="large" color={colors.primary} />
      <Text style={[styles.loaderText, { color: colors.secondaryText }]}>{label}</Text>
    </View>
  );
}

export function Badge({ label, color }: { label: string; color: string }) {
  return (
    <View style={[styles.badge, { backgroundColor: color }]}>
      <Text style={styles.badgeText}>{label}</Text>
    </View>
  );
}

/** Horizontal bar showing a 0-100 value, with the label on the left and value on the right. */
export function ScoreBar({ label, value, color }: { label: string; value: number; color?: string }) {
  const colors = useThemeColors();
  const width = `${Math.max(0, Math.min(100, value))}%` as const;
  return (
    <View style={styles.scoreRow}>
      <Text style={[styles.scoreLabel, { color: colors.secondaryText }]} numberOfLines={2}>
        {label}
      </Text>
      <View style={[styles.track, { backgroundColor: colors.track }]}>
        <View style={[styles.fill, { width, backgroundColor: color ?? colors.primary }]} />
      </View>
      <Text style={[styles.scoreValue, { color: colors.text }]}>{value.toFixed(1)}%</Text>
    </View>
  );
}

export const styles = StyleSheet.create({
  flex: { flex: 1 },
  scroll: { flexGrow: 1 },
  content: { width: "100%", maxWidth: 640, alignSelf: "center", padding: 20, gap: 16 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 8 },
  title: { fontSize: 28, fontWeight: "700", flexShrink: 1 },
  subtitle: { fontSize: 16, lineHeight: 22, marginTop: -8 },
  card: { borderRadius: 16, borderWidth: StyleSheet.hairlineWidth, padding: 20, gap: 12 },
  cardTitle: { fontSize: 18, fontWeight: "600" },
  button: {
    minHeight: 50,
    borderRadius: 12,
    paddingHorizontal: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  buttonText: { fontSize: 16, fontWeight: "600" },
  imageFrame: {
    alignSelf: "center",
    width: "100%",
    maxWidth: 360,
    aspectRatio: 4 / 3,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: "hidden",
  },
  image: { width: "100%", height: "100%" },
  loader: { alignItems: "center", paddingVertical: 24, gap: 12 },
  loaderText: { fontSize: 16 },
  badge: { alignSelf: "flex-start", borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6 },
  badgeText: { color: "#fff", fontWeight: "600", fontSize: 14 },
  scoreRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  scoreLabel: { width: "42%", fontSize: 14 },
  track: { flex: 1, height: 8, borderRadius: 4, overflow: "hidden" },
  fill: { height: "100%", borderRadius: 4 },
  scoreValue: { width: 52, fontSize: 13, textAlign: "right", fontVariant: ["tabular-nums"] },
});
