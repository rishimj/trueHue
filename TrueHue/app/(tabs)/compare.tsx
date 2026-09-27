import React, { useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import { DemoGallery, SamplePicker } from "@/components/samples";
import { Button, Card, Columns, ImagePreview, Screen, useIsWide } from "@/components/ui";
import { showAlert } from "@/lib/alert";
import { compareVeneers, type Comparison } from "@/lib/api";
import { loadDemoSample, type DemoSample } from "@/lib/demoSamples";
import { pickImage, type ImageSource, type PickedImage } from "@/lib/pickImage";
import { notify, useSettings, useStrings, useThemeColors, type ThemeColors } from "@/lib/settings";

// Normalized difference (0-100) below which samples count as very similar / moderately different.
const VERY_SIMILAR_THRESHOLD = 10;
const MODERATE_THRESHOLD = 50;

function differenceColor(value: number, colors: ThemeColors) {
  if (value < VERY_SIMILAR_THRESHOLD) return colors.success;
  if (value < MODERATE_THRESHOLD) return colors.warning;
  return colors.danger;
}

type Slot = 0 | 1;
interface SlotState {
  image: PickedImage;
  demoId: string | null;
}

export default function CompareScreen() {
  const { settings } = useSettings();
  const t = useStrings();
  const colors = useThemeColors();
  const wide = useIsWide();

  const [slots, setSlots] = useState<[SlotState | null, SlotState | null]>([null, null]);
  const [loadingDemo, setLoadingDemo] = useState<{ slot: Slot; id: string } | null>(null);
  const [result, setResult] = useState<Comparison | null>(null);
  const [loading, setLoading] = useState(false);

  const setSlot = (slot: Slot, state: SlotState) => {
    setSlots((current) => {
      const next: typeof current = [...current];
      next[slot] = state;
      return next;
    });
    setResult(null);
  };

  const selectImage = async (slot: Slot, source: ImageSource) => {
    try {
      const picked = await pickImage(source);
      if (picked) setSlot(slot, { image: picked, demoId: null });
    } catch (error) {
      showAlert(t.error, (error as Error).message);
    }
  };

  const selectDemo = async (slot: Slot, sample: DemoSample) => {
    setLoadingDemo({ slot, id: sample.id });
    try {
      setSlot(slot, { image: await loadDemoSample(sample), demoId: sample.id });
    } catch (error) {
      showAlert(t.error, (error as Error).message);
    } finally {
      setLoadingDemo(null);
    }
  };

  const [first, second] = slots;

  const compare = async () => {
    if (!first || !second) return;
    setLoading(true);
    try {
      setResult(await compareVeneers(first.image.base64, second.image.base64));
      notify(t.compareNotification, t.compareNotificationBody, settings);
    } catch (error) {
      showAlert(t.compareFailed, (error as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setSlots([null, null]);
    setResult(null);
  };

  const value = result?.normalized_difference ?? 0;
  const color = differenceColor(value, colors);
  const interpretation =
    value < VERY_SIMILAR_THRESHOLD
      ? t.verySimilar
      : value < MODERATE_THRESHOLD
      ? t.moderateDifference
      : t.significantDifference;

  const slotCard = (slot: Slot) => {
    const state = slots[slot];
    return (
      <Card key={slot} step={slot + 1} title={slot === 0 ? t.veneerSample1 : t.veneerSample2}>
        {state ? (
          <>
            <ImagePreview uri={state.image.uri} />
            <Button
              label={t.changeImage}
              icon="swap-horizontal"
              variant="secondary"
              onPress={() => selectImage(slot, "library")}
            />
          </>
        ) : (
          <SamplePicker compact onPick={(source) => selectImage(slot, source)} />
        )}
        <DemoGallery
          compact
          onSelect={(sample) => selectDemo(slot, sample)}
          selectedId={state?.demoId}
          loadingId={loadingDemo?.slot === slot ? loadingDemo.id : null}
        />
      </Card>
    );
  };

  return (
    <Screen title={t.compareTitle} subtitle={t.compareInstruction}>
      <Columns>
        {slotCard(0)}
        {slotCard(1)}
      </Columns>

      <View style={[styles.actions, wide && styles.actionsWide]}>
        <View style={wide ? styles.actionMain : undefined}>
          <Button
            label={loading ? t.calculating : t.calculateDifference}
            icon="git-compare-outline"
            onPress={compare}
            disabled={!first || !second}
            loading={loading}
          />
        </View>
        {first || second ? <Button label={t.reset} variant="ghost" onPress={reset} /> : null}
      </View>

      {result && (
        <Card title={t.comparisonResults}>
          <View style={[styles.resultBody, wide && styles.resultBodyWide]}>
            <View style={styles.center}>
              <View style={[styles.scoreCircle, { borderColor: color, backgroundColor: `${color}14` }]}>
                <Text style={[styles.scoreText, { color }]}>{value.toFixed(1)}</Text>
                <Text style={[styles.scoreUnit, { color: colors.secondaryText }]}>/ 100</Text>
              </View>
              <Text style={{ color: colors.secondaryText, fontSize: 13 }}>{t.rgbDifference}</Text>
            </View>

            <View style={[styles.resultText, wide && styles.flex]}>
              <Text style={[styles.interpretation, { color: colors.text }]}>{interpretation}</Text>
              <View style={[styles.track, { backgroundColor: colors.track }]}>
                <View style={[styles.fill, { width: `${Math.min(100, value)}%`, backgroundColor: color }]} />
              </View>
              <View style={styles.labels}>
                <Text style={{ color: colors.success, fontSize: 13 }}>{t.similar}</Text>
                <Text style={{ color: colors.danger, fontSize: 13 }}>{t.different}</Text>
              </View>
              <View style={[styles.infoBox, { backgroundColor: colors.track }]}>
                <Text style={[styles.infoTitle, { color: colors.text }]}>{t.whatDoesItMean}</Text>
                <Text style={{ color: colors.secondaryText, lineHeight: 19, fontSize: 13 }}>{t.explanation}</Text>
              </View>
            </View>
          </View>
        </Card>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  actions: { gap: 8 },
  actionsWide: { flexDirection: "row", justifyContent: "center", alignItems: "center", gap: 12 },
  actionMain: { width: 320 },
  resultBody: { gap: 20 },
  resultBodyWide: { flexDirection: "row", alignItems: "center", gap: 32 },
  resultText: { gap: 10 },
  center: { alignItems: "center", gap: 8 },
  scoreCircle: {
    width: 128,
    height: 128,
    borderRadius: 64,
    borderWidth: 6,
    alignItems: "center",
    justifyContent: "center",
  },
  scoreText: { fontSize: 32, fontWeight: "700", fontVariant: ["tabular-nums"] },
  scoreUnit: { fontSize: 12 },
  track: { height: 10, borderRadius: 5, overflow: "hidden" },
  fill: { height: "100%" },
  labels: { flexDirection: "row", justifyContent: "space-between" },
  interpretation: { fontSize: 17, fontWeight: "600" },
  infoBox: { borderRadius: 12, padding: 14, gap: 6, marginTop: 4 },
  infoTitle: { fontSize: 14, fontWeight: "600" },
});
