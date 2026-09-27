import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useState } from "react";
import { Linking, Platform, Share, StyleSheet, Text, View } from "react-native";

import { DemoGallery, FinishSelector, SamplePicker } from "@/components/samples";
import {
  Button,
  Card,
  Columns,
  Divider,
  EmptyState,
  ImagePreview,
  Loader,
  Screen,
  ScoreBar,
  useIsWide,
} from "@/components/ui";
import { showAlert } from "@/lib/alert";
import { classifyVeneer, type Category, type Classification } from "@/lib/api";
import { loadDemoSample, type DemoSample } from "@/lib/demoSamples";
import { pickImage, type ImageSource, type PickedImage } from "@/lib/pickImage";
import { saveReport } from "@/lib/reports";
import { format, notify, useSettings, useStrings, useThemeColors } from "@/lib/settings";
import { CATEGORY_LABEL_KEYS, CATEGORY_POSITION, WOOD_COLORS, WOOD_LABEL_KEYS, type WoodType } from "@/lib/woods";

export default function AnalyzeScreen() {
  const { settings } = useSettings();
  const t = useStrings();
  const colors = useThemeColors();
  const wide = useIsWide();

  const [image, setImage] = useState<PickedImage | null>(null);
  const [demoId, setDemoId] = useState<string | null>(null);
  const [loadingDemo, setLoadingDemo] = useState<string | null>(null);
  const [wood, setWood] = useState<WoodType | null>(null);
  const [result, setResult] = useState<Classification | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [saving, setSaving] = useState(false);

  // On a phone the result renders below the fold; bring it into view once it arrives.
  useEffect(() => {
    if (result && !wide && Platform.OS === "web") {
      document.getElementById("analysis-result")?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [result, wide]);

  const categoryLabel = (category: Category) => t[CATEGORY_LABEL_KEYS[category] as keyof typeof t] as string;
  const woodLabel = (value: WoodType) => t[WOOD_LABEL_KEYS[value]];
  const rangeLabel = (inRange: boolean) => (inRange ? t.inRange : t.outOfRange);

  const selectImage = async (source: ImageSource) => {
    try {
      const picked = await pickImage(source);
      if (picked) {
        setImage(picked);
        setDemoId(null);
        setResult(null);
      }
    } catch (error) {
      showAlert(t.error, (error as Error).message);
    }
  };

  const selectDemo = async (sample: DemoSample) => {
    setLoadingDemo(sample.id);
    try {
      setImage(await loadDemoSample(sample));
      setDemoId(sample.id);
      setWood(sample.wood);
      setResult(null);
    } catch (error) {
      showAlert(t.error, (error as Error).message);
    } finally {
      setLoadingDemo(null);
    }
  };

  const selectWood = (value: WoodType) => {
    setWood(value);
    setResult(null);
  };

  const analyze = async () => {
    if (!image || !wood) return;
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
    setDemoId(null);
    setResult(null);
  };

  const sampleCard = (
    <Card step={1} title={t.sampleStep} subtitle={image ? undefined : t.sampleStepHint}>
      {image ? (
        <>
          <ImagePreview uri={image.uri} />
          <View style={styles.row}>
            <View style={styles.flex}>
              <Button label={t.replaceImage} icon="swap-horizontal" variant="secondary" onPress={() => selectImage("library")} />
            </View>
            <View style={styles.flex}>
              <Button label={t.clear} icon="close" variant="ghost" onPress={reset} />
            </View>
          </View>
        </>
      ) : (
        <SamplePicker onPick={selectImage} />
      )}
      <DemoGallery onSelect={selectDemo} selectedId={demoId} loadingId={loadingDemo} />
    </Card>
  );

  const finishCard = (
    <Card step={2} title={t.finishStep} subtitle={t.selectWood}>
      <FinishSelector value={wood} onChange={selectWood} />
      <Button
        label={analyzing ? t.analyzing : t.analyzeSample}
        icon="scan-outline"
        onPress={analyze}
        disabled={!image || !wood}
        loading={analyzing}
        testID="analyze"
      />
      {!image || !wood ? (
        <Text style={[styles.hint, { color: colors.secondaryText }]}>
          {!image ? t.needSample : t.needFinish}
        </Text>
      ) : null}
    </Card>
  );

  const resultPanel = analyzing ? (
    <Card>
      <Loader label={t.analyzing} />
    </Card>
  ) : result ? (
    <Card nativeID="analysis-result">
      <Verdict result={result} woodName={woodLabel(result.wood)} categoryName={categoryLabel(result.predicted_category)} />

      <ScoreBar label={t.confidence} value={result.confidence} />
      <ShadeSpectrum
        position={CATEGORY_POSITION[result.predicted_category]}
        title={t.shade}
        darkLabel={t.tooDark}
        lightLabel={t.tooLight}
      />

      <Divider />
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

      <View style={[styles.row, styles.actions]}>
        <View style={styles.action}>
          <Button label={saving ? t.saving : t.saveReport} icon="bookmark-outline" onPress={save} loading={saving} />
        </View>
        <View style={styles.action}>
          <Button label={t.share} icon="share-outline" variant="secondary" onPress={share} />
        </View>
      </View>

      <View style={[styles.infoBox, { backgroundColor: colors.track }]}>
        <Text style={[styles.infoTitle, { color: colors.text }]}>{t.howItWorks}</Text>
        <Text style={[styles.infoBody, { color: colors.secondaryText }]}>{t.howItWorksBody}</Text>
      </View>
    </Card>
  ) : wide ? (
    <EmptyState icon="color-palette-outline" title={t.resultsEmptyTitle} body={t.resultsEmptyBody} />
  ) : null;

  return (
    <Screen title={t.analyzeTitle} subtitle={t.analyzeInstruction}>
      <Columns>
        {sampleCard}
        <>
          {finishCard}
          {resultPanel}
        </>
      </Columns>
    </Screen>
  );
}

function Verdict({ result, woodName, categoryName }: { result: Classification; woodName: string; categoryName: string }) {
  const t = useStrings();
  const colors = useThemeColors();
  const tone = result.in_range ? colors.success : colors.warning;
  return (
    <View style={[styles.verdict, { backgroundColor: `${tone}14`, borderColor: `${tone}40` }]}>
      <Ionicons name={result.in_range ? "checkmark-circle" : "alert-circle"} size={40} color={tone} />
      <View style={styles.flex}>
        <Text style={[styles.verdictTitle, { color: tone }]}>{result.in_range ? t.inRange : t.outOfRange}</Text>
        <Text style={[styles.verdictBody, { color: colors.text }]}>{categoryName}</Text>
        <View style={styles.verdictWood}>
          <View style={[styles.swatch, { backgroundColor: WOOD_COLORS[result.wood] }]} />
          <Text style={{ color: colors.secondaryText, fontSize: 14 }}>{woodName}</Text>
        </View>
      </View>
    </View>
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
  row: { flexDirection: "row", gap: 10 },
  actions: { marginTop: 6, flexWrap: "wrap" },
  action: { flexGrow: 1, flexBasis: 150 },
  hint: { fontSize: 13, textAlign: "center" },
  sectionTitle: { fontSize: 15, fontWeight: "600" },
  verdict: { flexDirection: "row", alignItems: "center", gap: 14, padding: 16, borderRadius: 14, borderWidth: 1 },
  verdictTitle: { fontSize: 22, fontWeight: "700", letterSpacing: -0.3 },
  verdictBody: { fontSize: 15, marginTop: 2 },
  verdictWood: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 6 },
  swatch: { width: 12, height: 12, borderRadius: 6 },
  infoBox: { borderRadius: 12, padding: 14, gap: 6, marginTop: 4 },
  infoTitle: { fontSize: 14, fontWeight: "600" },
  infoBody: { fontSize: 13, lineHeight: 19 },
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
