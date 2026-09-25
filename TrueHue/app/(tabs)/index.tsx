import React, { useState } from "react";
import { Linking, Platform, Share, StyleSheet, Text, View } from "react-native";

import { Badge, Button, Card, ImagePreview, Loader, Screen, ScoreBar } from "@/components/ui";
import { showAlert } from "@/lib/alert";
import { classifyVeneer, type Category, type Classification } from "@/lib/api";
import { pickImage, type ImageSource, type PickedImage } from "@/lib/pickImage";
import { saveReport } from "@/lib/reports";
import { format, notify, useSettings, useStrings, useThemeColors } from "@/lib/settings";
import {
  CATEGORY_LABEL_KEYS,
  CATEGORY_POSITION,
  WOOD_COLORS,
  WOOD_LABEL_KEYS,
  WOOD_TYPES,
  type WoodType,
} from "@/lib/woods";

export default function AnalyzeScreen() {
  const { settings } = useSettings();
  const t = useStrings();
  const colors = useThemeColors();

  const [image, setImage] = useState<PickedImage | null>(null);
  const [result, setResult] = useState<Classification | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [saving, setSaving] = useState(false);

  const categoryLabel = (category: Category) => t[CATEGORY_LABEL_KEYS[category] as keyof typeof t];
  const woodLabel = (wood: WoodType) => t[WOOD_LABEL_KEYS[wood]];
  const rangeLabel = (inRange: boolean) => (inRange ? t.inRange : t.outOfRange);

  const selectImage = async (source: ImageSource) => {
    try {
      const picked = await pickImage(source);
      if (picked) {
        setImage(picked);
        setResult(null);
      }
    } catch (error) {
      showAlert(t.error, (error as Error).message);
    }
  };

  const analyze = async (wood: WoodType) => {
    if (!image) return;
    setAnalyzing(true);
    setResult(null);
    try {
      setResult(await classifyVeneer(image.base64, wood));
      notify(t.analysisNotification, t.analysisNotificationBody, settings);
    } catch (error) {
      showAlert(t.analysisFailed, (error as Error).message);
    } finally {
      setAnalyzing(false);
    }
  };

  const save = async () => {
    if (!image || !result) return;
    setSaving(true);
    try {
      await saveReport(result, image.uri);
      showAlert(t.reportSaved);
    } catch (error) {
      console.error("Failed to save report", error);
      showAlert(t.error, t.errorSaving);
    } finally {
      setSaving(false);
    }
  };

  const share = async () => {
    if (!result) return;
    const message = format(t.shareSummary, {
      wood: woodLabel(result.wood),
      result: rangeLabel(result.in_range),
      category: categoryLabel(result.predicted_category),
      confidence: result.confidence.toFixed(1),
    });
    if (Platform.OS === "web" && !navigator.share) {
      Linking.openURL(`mailto:?subject=TrueHue&body=${encodeURIComponent(message)}`);
      return;
    }
    try {
      await Share.share({ message });
    } catch {
      // The user dismissed the share sheet.
    }
  };

  const reset = () => {
    setImage(null);
    setResult(null);
  };

  return (
    <Screen title={t.analyzeTitle} subtitle={image ? undefined : t.analyzeInstruction}>
      {!image ? (
        <View style={styles.buttons}>
          <Button label={t.chooseGallery} onPress={() => selectImage("library")} />
          <Button label={t.takePhoto} variant="secondary" onPress={() => selectImage("camera")} />
        </View>
      ) : (
        <>
          <ImagePreview uri={image.uri} />

          {analyzing ? (
            <Loader label={t.analyzing} />
          ) : (
            <View style={styles.buttons}>
              <Text style={[styles.prompt, { color: colors.text }]}>{t.selectWood}</Text>
              {WOOD_TYPES.map((wood) => (
                <Button
                  key={wood}
                  label={woodLabel(wood)}
                  color={WOOD_COLORS[wood]}
                  onPress={() => analyze(wood)}
                  testID={`analyze-${wood}`}
                />
              ))}
              <Button label={t.newImage} variant="ghost" onPress={reset} />
            </View>
          )}

          {result && (
            <Card title={t.analysisResults}>
              <View style={styles.resultHeader}>
                <Text style={[styles.woodName, { color: colors.dark ? colors.text : WOOD_COLORS[result.wood] }]}>
                  {woodLabel(result.wood)}
                </Text>
                <Badge
                  label={rangeLabel(result.in_range)}
                  color={result.in_range ? colors.success : colors.warning}
                />
              </View>
              <Text style={{ color: colors.secondaryText, fontSize: 16 }}>
                {t.category}: {categoryLabel(result.predicted_category)}
              </Text>

              <ScoreBar label={t.confidence} value={result.confidence} />

              <ShadeSpectrum
                position={CATEGORY_POSITION[result.predicted_category]}
                title={t.shade}
                darkLabel={t.tooDark}
                lightLabel={t.tooLight}
              />

              <View style={[styles.divider, { backgroundColor: colors.border }]} />
              <Text style={[styles.sectionTitle, { color: colors.text }]}>{t.categorySimilarity}</Text>
              {(Object.entries(result.similarity_scores) as [Category, number][])
                .sort(([, a], [, b]) => b - a)
                .map(([category, score], index) => (
                  <ScoreBar
                    key={category}
                    label={categoryLabel(category)}
                    value={score}
                    color={index === 0 ? colors.primary : colors.secondaryText}
                  />
                ))}

              <View style={styles.actions}>
                <View style={styles.flex}>
                  <Button label={saving ? t.saving : t.saveReport} onPress={save} loading={saving} />
                </View>
                <View style={styles.flex}>
                  <Button label={t.share} variant="secondary" onPress={share} />
                </View>
              </View>

              <View style={[styles.divider, { backgroundColor: colors.border }]} />
              <Text style={[styles.sectionTitle, { color: colors.text }]}>{t.howItWorks}</Text>
              <Text style={{ color: colors.secondaryText, lineHeight: 20 }}>{t.howItWorksBody}</Text>
            </Card>
          )}
        </>
      )}
    </Screen>
  );
}

function ShadeSpectrum({
  position,
  title,
  darkLabel,
  lightLabel,
}: {
  position: number;
  title: string;
  darkLabel: string;
  lightLabel: string;
}) {
  const colors = useThemeColors();
  return (
    <View style={styles.spectrum}>
      <Text style={[styles.sectionTitle, { color: colors.text }]}>{title}</Text>
      <View style={styles.spectrumBar}>
        {/* Outer fifths are out of range, the middle three fifths are in range. */}
        <View style={[styles.zone, styles.leftZone, { backgroundColor: colors.warning }]} />
        <View style={[styles.zone, styles.inZone, { backgroundColor: colors.success }]} />
        <View style={[styles.zone, styles.rightZone, { backgroundColor: colors.warning }]} />
        <View
          style={[
            styles.marker,
            { left: `${10 + position * 80}%`, backgroundColor: colors.text, borderColor: colors.card },
          ]}
        />
      </View>
      <View style={styles.spectrumLabels}>
        <Text style={{ color: colors.secondaryText, fontSize: 13 }}>{darkLabel}</Text>
        <Text style={{ color: colors.secondaryText, fontSize: 13 }}>{lightLabel}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  buttons: { gap: 12 },
  prompt: { fontSize: 16, fontWeight: "500", textAlign: "center", marginTop: 4 },
  resultHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 },
  woodName: { fontSize: 22, fontWeight: "700", flexShrink: 1 },
  sectionTitle: { fontSize: 16, fontWeight: "600" },
  divider: { height: StyleSheet.hairlineWidth, marginVertical: 4 },
  actions: { flexDirection: "row", gap: 12, marginTop: 8 },
  spectrum: { gap: 8, marginTop: 4 },
  spectrumBar: { flexDirection: "row", height: 14 },
  zone: { flex: 1, height: "100%", opacity: 0.35 },
  inZone: { flex: 3 },
  leftZone: { borderTopLeftRadius: 7, borderBottomLeftRadius: 7 },
  rightZone: { borderTopRightRadius: 7, borderBottomRightRadius: 7 },
  marker: {
    position: "absolute",
    top: -5,
    width: 12,
    height: 24,
    marginLeft: -6,
    borderRadius: 6,
    borderWidth: 2,
  },
  spectrumLabels: { flexDirection: "row", justifyContent: "space-between" },
});
