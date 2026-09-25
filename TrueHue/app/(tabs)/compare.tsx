import React, { useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import { Button, Card, ImagePreview, Screen } from "@/components/ui";
import { showAlert } from "@/lib/alert";
import { compareVeneers, type Comparison } from "@/lib/api";
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

export default function CompareScreen() {
  const { settings } = useSettings();
  const t = useStrings();
  const colors = useThemeColors();

  const [images, setImages] = useState<[PickedImage | null, PickedImage | null]>([null, null]);
  const [result, setResult] = useState<Comparison | null>(null);
  const [loading, setLoading] = useState(false);

  const selectImage = async (slot: 0 | 1, source: ImageSource) => {
    try {
      const picked = await pickImage(source);
      if (!picked) return;
      setImages((current) => {
        const next: typeof current = [...current];
        next[slot] = picked;
        return next;
      });
      setResult(null);
    } catch (error) {
      showAlert(t.error, (error as Error).message);
    }
  };

  const [first, second] = images;

  const compare = async () => {
    if (!first || !second) return;
    setLoading(true);
    try {
      setResult(await compareVeneers(first.base64, second.base64));
      notify(t.compareNotification, t.compareNotificationBody, settings);
    } catch (error) {
      showAlert(t.compareFailed, (error as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setImages([null, null]);
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

  return (
    <Screen title={t.compareTitle} subtitle={t.compareInstruction}>
      {([0, 1] as const).map((slot) => {
        const image = images[slot];
        return (
          <Card key={slot} title={slot === 0 ? t.veneerSample1 : t.veneerSample2}>
            {image ? (
              <>
                <ImagePreview uri={image.uri} />
                <Button label={t.changeImage} variant="secondary" onPress={() => selectImage(slot, "library")} />
              </>
            ) : (
              <>
                <Button label={t.chooseGallery} onPress={() => selectImage(slot, "library")} />
                <Button label={t.takePhoto} variant="secondary" onPress={() => selectImage(slot, "camera")} />
              </>
            )}
          </Card>
        );
      })}

      {(first || second) && (
        <View style={styles.actions}>
          <Button
            label={loading ? t.calculating : t.calculateDifference}
            onPress={compare}
            disabled={!first || !second}
            loading={loading}
          />
          <Button label={t.reset} variant="ghost" onPress={reset} />
        </View>
      )}

      {result && (
        <Card title={t.comparisonResults}>
          <View style={styles.center}>
            <View style={[styles.scoreCircle, { backgroundColor: color }]}>
              <Text style={styles.scoreText}>{value.toFixed(1)}</Text>
            </View>
            <Text style={{ color: colors.secondaryText }}>{t.rgbDifference}</Text>
          </View>

          <View style={[styles.track, { backgroundColor: colors.track }]}>
            <View style={[styles.fill, { width: `${Math.min(100, value)}%`, backgroundColor: color }]} />
          </View>
          <View style={styles.labels}>
            <Text style={{ color: colors.success }}>{t.similar}</Text>
            <Text style={{ color: colors.danger }}>{t.different}</Text>
          </View>

          <Text style={[styles.interpretation, { color: colors.text }]}>{interpretation}</Text>

          <View style={[styles.infoBox, { backgroundColor: colors.track }]}>
            <Text style={[styles.infoTitle, { color: colors.text }]}>{t.whatDoesItMean}</Text>
            <Text style={{ color: colors.secondaryText, lineHeight: 20 }}>{t.explanation}</Text>
          </View>
        </Card>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  actions: { gap: 12 },
  center: { alignItems: "center", gap: 8 },
  scoreCircle: { width: 96, height: 96, borderRadius: 48, alignItems: "center", justifyContent: "center" },
  scoreText: { color: "#fff", fontSize: 24, fontWeight: "700" },
  track: { height: 12, borderRadius: 6, overflow: "hidden" },
  fill: { height: "100%" },
  labels: { flexDirection: "row", justifyContent: "space-between" },
  interpretation: { fontSize: 16, fontWeight: "500", textAlign: "center" },
  infoBox: { borderRadius: 12, padding: 16, gap: 8 },
  infoTitle: { fontSize: 16, fontWeight: "600" },
});
