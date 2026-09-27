import { Ionicons } from "@expo/vector-icons";
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
  useWindowDimensions,
  type StyleProp,
  type ViewStyle,
} from "react-native";

import { useThemeColors } from "@/lib/settings";

type IconName = keyof typeof Ionicons.glyphMap;

/** Width at which screens switch to a side-by-side layout and the tab bar moves to the side. */
export const WIDE_BREAKPOINT = 900;

export function useIsWide() {
  return useWindowDimensions().width >= WIDE_BREAKPOINT;
}

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
  const wide = useIsWide();
  return (
    <SafeAreaView style={[styles.flex, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={[styles.content, wide && styles.contentWide]}>
          <View style={styles.header}>
            <View style={styles.headerText}>
              <Text style={[styles.eyebrow, { color: colors.primary }]}>TrueHue</Text>
              <Text style={[styles.title, wide && styles.titleWide, { color: colors.text }]}>{title}</Text>
              {subtitle ? (
                <Text style={[styles.subtitle, { color: colors.secondaryText }]}>{subtitle}</Text>
              ) : null}
            </View>
            {headerRight}
          </View>
          {children}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

/** Lays children out in a row on wide screens and a column otherwise. */
export function Columns({ children, gap = 20 }: { children: React.ReactNode; gap?: number }) {
  const wide = useIsWide();
  return (
    <View style={[wide ? styles.columnsWide : styles.columns, { gap }]}>
      {React.Children.map(children, (child) =>
        child ? <View style={wide ? styles.column : undefined}>{child}</View> : null
      )}
    </View>
  );
}

export function Card({
  title,
  subtitle,
  step,
  right,
  children,
  style,
  nativeID,
}: {
  nativeID?: string;
  title?: string;
  subtitle?: string;
  /** Shows a numbered step marker before the title. */
  step?: number;
  right?: React.ReactNode;
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  const colors = useThemeColors();
  return (
    <View nativeID={nativeID} style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }, style]}>
      {title ? (
        <View style={styles.cardHeader}>
          {step !== undefined ? (
            <View style={[styles.step, { backgroundColor: colors.primarySoft }]}>
              <Text style={[styles.stepText, { color: colors.primary }]}>{step}</Text>
            </View>
          ) : null}
          <View style={styles.flex}>
            <Text style={[styles.cardTitle, { color: colors.text }]}>{title}</Text>
            {subtitle ? <Text style={[styles.cardSubtitle, { color: colors.secondaryText }]}>{subtitle}</Text> : null}
          </View>
          {right}
        </View>
      ) : null}
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
  icon,
  disabled,
  loading,
  testID,
}: {
  label: string;
  onPress: () => void;
  variant?: ButtonVariant;
  color?: string;
  icon?: IconName;
  disabled?: boolean;
  loading?: boolean;
  testID?: string;
}) {
  const colors = useThemeColors();
  const tint = color ?? colors.primary;
  const filled = variant === "primary";
  const inactive = disabled || loading;
  const textColor = filled ? (colors.dark ? colors.background : "#fff") : variant === "ghost" ? colors.secondaryText : tint;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: inactive }}
      disabled={inactive}
      onPress={onPress}
      testID={testID}
      style={({ pressed, hovered }: { pressed: boolean; hovered?: boolean }) => [
        styles.button,
        filled && { backgroundColor: tint },
        variant === "secondary" && { borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card },
        hovered && !inactive && (filled ? styles.hoverFilled : { backgroundColor: colors.track }),
        (pressed || inactive) && { opacity: inactive ? 0.45 : 0.85 },
      ]}
    >
      {loading ? (
        <ActivityIndicator color={textColor} />
      ) : (
        <View style={styles.buttonInner}>
          {icon ? <Ionicons name={icon} size={18} color={textColor} /> : null}
          <Text style={[styles.buttonText, { color: textColor }]}>{label}</Text>
        </View>
      )}
    </Pressable>
  );
}

export function ImagePreview({ uri, children }: { uri: string; children?: React.ReactNode }) {
  const colors = useThemeColors();
  return (
    <View style={[styles.imageFrame, { backgroundColor: colors.track, borderColor: colors.border }]}>
      <Image source={{ uri }} style={styles.image} resizeMode="cover" />
      {children}
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

export function EmptyState({ icon, title, body }: { icon: IconName; title: string; body?: string }) {
  const colors = useThemeColors();
  return (
    <View style={[styles.empty, { borderColor: colors.border }]}>
      <View style={[styles.emptyIcon, { backgroundColor: colors.primarySoft }]}>
        <Ionicons name={icon} size={26} color={colors.primary} />
      </View>
      <Text style={[styles.emptyTitle, { color: colors.text }]}>{title}</Text>
      {body ? <Text style={[styles.emptyBody, { color: colors.secondaryText }]}>{body}</Text> : null}
    </View>
  );
}

export function Badge({ label, color, icon }: { label: string; color: string; icon?: IconName }) {
  return (
    <View style={[styles.badge, { backgroundColor: `${color}1F` }]}>
      {icon ? <Ionicons name={icon} size={14} color={color} /> : null}
      <Text style={[styles.badgeText, { color }]}>{label}</Text>
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

export function Divider() {
  const colors = useThemeColors();
  return <View style={[styles.divider, { backgroundColor: colors.border }]} />;
}

export const styles = StyleSheet.create({
  flex: { flex: 1 },
  scroll: { flexGrow: 1 },
  content: { width: "100%", maxWidth: 640, alignSelf: "center", padding: 20, paddingBottom: 40, gap: 16 },
  contentWide: { maxWidth: 1120, paddingHorizontal: 40, paddingTop: 36, gap: 20 },
  header: { flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between", gap: 16, marginTop: 4 },
  headerText: { flexShrink: 1, gap: 4 },
  eyebrow: { fontSize: 12, fontWeight: "700", letterSpacing: 1.4, textTransform: "uppercase" },
  title: { fontSize: 28, fontWeight: "700", letterSpacing: -0.5 },
  titleWide: { fontSize: 34 },
  subtitle: { fontSize: 16, lineHeight: 23, maxWidth: 620 },
  columns: { gap: 16 },
  columnsWide: { flexDirection: "row", alignItems: "flex-start" },
  column: { flex: 1, minWidth: 0, gap: 20 },
  card: {
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 20,
    gap: 14,
    shadowColor: "#2B2118",
    shadowOpacity: 0.06,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 4 },
  },
  cardHeader: { flexDirection: "row", alignItems: "center", gap: 12 },
  cardTitle: { fontSize: 17, fontWeight: "600" },
  cardSubtitle: { fontSize: 14, marginTop: 2, lineHeight: 19 },
  step: { width: 28, height: 28, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  stepText: { fontSize: 14, fontWeight: "700" },
  button: {
    minHeight: 48,
    borderRadius: 12,
    paddingHorizontal: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  hoverFilled: { opacity: 0.92 },
  buttonInner: { flexDirection: "row", alignItems: "center", gap: 8 },
  buttonText: { fontSize: 15, fontWeight: "600" },
  imageFrame: {
    width: "100%",
    aspectRatio: 4 / 3,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: "hidden",
  },
  image: { width: "100%", height: "100%" },
  loader: { alignItems: "center", paddingVertical: 24, gap: 12 },
  loaderText: { fontSize: 15 },
  empty: {
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 48,
    paddingHorizontal: 24,
    borderWidth: 1.5,
    borderStyle: "dashed",
    borderRadius: 18,
  },
  emptyIcon: { width: 52, height: 52, borderRadius: 26, alignItems: "center", justifyContent: "center", marginBottom: 4 },
  emptyTitle: { fontSize: 17, fontWeight: "600" },
  emptyBody: { fontSize: 14, lineHeight: 20, textAlign: "center", maxWidth: 320 },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    alignSelf: "flex-start",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  badgeText: { fontWeight: "600", fontSize: 13 },
  scoreRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  scoreLabel: { width: "42%", fontSize: 14 },
  track: { flex: 1, height: 8, borderRadius: 4, overflow: "hidden" },
  fill: { height: "100%", borderRadius: 4 },
  scoreValue: { width: 52, fontSize: 13, textAlign: "right", fontVariant: ["tabular-nums"] },
  divider: { height: StyleSheet.hairlineWidth, marginVertical: 2 },
});
