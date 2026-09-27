import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { ActivityIndicator, Image, Platform, Pressable, StyleSheet, Text, View, useWindowDimensions } from "react-native";

import { Button, useIsWide } from "@/components/ui";
import { DEMO_SAMPLES, type DemoSample } from "@/lib/demoSamples";
import type { ImageSource } from "@/lib/pickImage";
import { useStrings, useThemeColors } from "@/lib/settings";
import { WOOD_COLORS, WOOD_LABEL_KEYS, WOOD_TYPES, type WoodType } from "@/lib/woods";

/** Upload area. The whole zone opens the file picker; a camera button is shown where it is useful. */
export function SamplePicker({ onPick, compact }: { onPick: (source: ImageSource) => void; compact?: boolean }) {
  const t = useStrings();
  const colors = useThemeColors();
  const wide = useIsWide();
  // A desktop browser has no camera flow; "take a photo" would just open the same file dialog.
  const showCamera = Platform.OS !== "web" || !wide;
  return (
    <View style={styles.pickerGroup}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t.uploadTitle}
        onPress={() => onPick("library")}
        style={({ hovered }: { pressed: boolean; hovered?: boolean }) => [
          styles.dropzone,
          compact && styles.dropzoneCompact,
          { borderColor: hovered ? colors.primary : colors.border, backgroundColor: hovered ? colors.primarySoft : colors.background },
        ]}
      >
        <View style={[styles.dropIcon, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Ionicons name="cloud-upload-outline" size={22} color={colors.primary} />
        </View>
        <Text style={[styles.dropTitle, { color: colors.text }]}>{t.uploadTitle}</Text>
        {!compact ? <Text style={[styles.dropHint, { color: colors.secondaryText }]}>{t.uploadHint}</Text> : null}
      </Pressable>
      {showCamera ? (
        <Button label={t.takePhoto} icon="camera-outline" variant="secondary" onPress={() => onPick("camera")} />
      ) : null}
    </View>
  );
}

export function DemoGallery({
  onSelect,
  selectedId,
  loadingId,
  compact,
}: {
  onSelect: (sample: DemoSample) => void;
  selectedId?: string | null;
  loadingId?: string | null;
  compact?: boolean;
}) {
  const t = useStrings();
  const colors = useThemeColors();
  return (
    <View style={styles.gallery}>
      <View style={styles.galleryHeader}>
        <View style={[styles.rule, { backgroundColor: colors.border }]} />
        <Text style={[styles.galleryTitle, { color: colors.secondaryText }]}>{t.demoTitle}</Text>
        <View style={[styles.rule, { backgroundColor: colors.border }]} />
      </View>
      <View style={styles.grid}>
        {DEMO_SAMPLES.map((sample) => {
          const selected = sample.id === selectedId;
          const status = sample.inSpec ? colors.success : colors.warning;
          return (
            <Pressable
              key={sample.id}
              accessibilityRole="button"
              accessibilityLabel={`${t[WOOD_LABEL_KEYS[sample.wood]]}, ${sample.inSpec ? t.demoInSpec : t.demoOutOfSpec}`}
              onPress={() => onSelect(sample)}
              disabled={loadingId != null}
              testID={`demo-${sample.id}`}
              style={({ hovered }: { pressed: boolean; hovered?: boolean }) => [
                styles.tile,
                compact && styles.tileCompact,
                {
                  borderColor: selected ? colors.primary : hovered ? colors.secondaryText : colors.border,
                  backgroundColor: colors.card,
                },
                selected && styles.tileSelected,
              ]}
            >
              <View style={styles.tileImageWrap}>
                <Image source={sample.source} style={styles.tileImage} resizeMode="cover" />
                {loadingId === sample.id ? (
                  <View style={styles.tileOverlay}>
                    <ActivityIndicator color="#fff" />
                  </View>
                ) : null}
                {selected ? (
                  <View style={[styles.tileCheck, { backgroundColor: colors.primary }]}>
                    <Ionicons name="checkmark" size={14} color={colors.dark ? colors.background : "#fff"} />
                  </View>
                ) : null}
              </View>
              {!compact ? (
                <View style={styles.tileText}>
                  <Text style={[styles.tileName, { color: colors.text }]} numberOfLines={1}>
                    {t[WOOD_LABEL_KEYS[sample.wood]]}
                  </Text>
                  <View style={styles.tileStatus}>
                    <View style={[styles.dot, { backgroundColor: status }]} />
                    <Text style={[styles.tileStatusText, { color: colors.secondaryText }]}>
                      {sample.inSpec ? t.demoInSpec : t.demoOutOfSpec}
                    </Text>
                  </View>
                </View>
              ) : null}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

export function FinishSelector({ value, onChange }: { value: WoodType | null; onChange: (wood: WoodType) => void }) {
  const t = useStrings();
  const colors = useThemeColors();
  // Three finishes side by side only fit once there is room for "Graphite Walnut" on one or two lines.
  const stacked = useWindowDimensions().width < 600;
  return (
    <View style={[styles.finishes, stacked && styles.finishesStacked]} accessibilityRole="radiogroup">
      {WOOD_TYPES.map((wood) => {
        const selected = wood === value;
        return (
          <Pressable
            key={wood}
            accessibilityRole="radio"
            accessibilityState={{ checked: selected }}
            onPress={() => onChange(wood)}
            testID={`finish-${wood}`}
            style={({ hovered }: { pressed: boolean; hovered?: boolean }) => [
              styles.finish,
              {
                borderColor: selected ? colors.primary : hovered ? colors.secondaryText : colors.border,
                backgroundColor: selected ? colors.primarySoft : colors.card,
              },
            ]}
          >
            <View style={[styles.swatch, { backgroundColor: WOOD_COLORS[wood] }]} />
            <Text style={[styles.finishName, { color: colors.text }]} numberOfLines={2}>
              {t[WOOD_LABEL_KEYS[wood]]}
            </Text>
            {selected ? <Ionicons name="checkmark-circle" size={18} color={colors.primary} /> : null}
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  pickerGroup: { gap: 10 },
  dropzone: {
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 28,
    paddingHorizontal: 16,
    borderWidth: 1.5,
    borderStyle: "dashed",
    borderRadius: 14,
  },
  dropzoneCompact: { paddingVertical: 18 },
  dropIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  dropTitle: { fontSize: 15, fontWeight: "600" },
  dropHint: { fontSize: 13, textAlign: "center" },
  gallery: { gap: 12 },
  galleryHeader: { flexDirection: "row", alignItems: "center", gap: 10 },
  rule: { flex: 1, height: StyleSheet.hairlineWidth },
  galleryTitle: { fontSize: 12, fontWeight: "600", letterSpacing: 0.8, textTransform: "uppercase" },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  tile: {
    // Three per row: (100% - 2 gaps) / 3.
    width: "31.5%",
    flexGrow: 1,
    borderWidth: 1,
    borderRadius: 12,
    overflow: "hidden",
  },
  tileCompact: { width: "14%", minWidth: 44, borderRadius: 10, flexGrow: 1 },
  tileSelected: { borderWidth: 2 },
  tileImageWrap: { aspectRatio: 4 / 3, width: "100%" },
  tileImage: { width: "100%", height: "100%" },
  tileOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.35)",
    alignItems: "center",
    justifyContent: "center",
  },
  tileCheck: {
    position: "absolute",
    top: 6,
    right: 6,
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
  },
  tileText: { paddingHorizontal: 10, paddingVertical: 8, gap: 3 },
  tileName: { fontSize: 13, fontWeight: "600" },
  tileStatus: { flexDirection: "row", alignItems: "center", gap: 5 },
  dot: { width: 7, height: 7, borderRadius: 4 },
  tileStatusText: { fontSize: 12 },
  finishes: { flexDirection: "row", gap: 10 },
  finishesStacked: { flexDirection: "column" },
  finish: {
    flexGrow: 1,
    flexBasis: 0,
    minHeight: 56,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1.5,
    borderRadius: 12,
  },
  swatch: { width: 24, height: 24, borderRadius: 12, borderWidth: 2, borderColor: "rgba(255,255,255,0.7)" },
  finishName: { flex: 1, fontSize: 14, fontWeight: "600" },
});
