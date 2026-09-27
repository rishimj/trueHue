import { Ionicons } from "@expo/vector-icons";
import { Picker } from "@react-native-picker/picker";
import { useFocusEffect } from "expo-router";
import React, { useCallback, useMemo, useState } from "react";
import { Image, Linking, Modal, Platform, Pressable, Share, StyleSheet, Text, View } from "react-native";

import { Badge, Button, Card, EmptyState, Loader, Screen, useIsWide } from "@/components/ui";
import { fetchReports, type Report } from "@/lib/reports";
import { format, useSettings, useStrings, useThemeColors } from "@/lib/settings";
import { WOOD_COLORS, WOOD_LABEL_KEYS, WOOD_TYPES } from "@/lib/woods";

interface Filters {
  month: string;
  day: string;
  year: string;
  range: string;
  wood: string;
}

const NO_FILTERS: Filters = { month: "", day: "", year: "", range: "", wood: "" };

function matches(report: Report, filters: Filters) {
  const { date } = report;
  return (
    (!filters.month || date.getMonth() + 1 === Number(filters.month)) &&
    (!filters.day || date.getDate() === Number(filters.day)) &&
    (!filters.year || date.getFullYear() === Number(filters.year)) &&
    (!filters.range || report.inRange === (filters.range === "in")) &&
    (!filters.wood || report.wood === filters.wood)
  );
}

export default function ReportsScreen() {
  const { settings } = useSettings();
  const t = useStrings();
  const colors = useThemeColors();
  const wide = useIsWide();

  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [filters, setFilters] = useState<Filters>(NO_FILTERS);
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      setReports(await fetchReports());
    } catch (err) {
      console.error("Failed to load reports", err);
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const filtered = useMemo(() => reports.filter((r) => matches(r, filters)), [reports, filters]);

  const years = useMemo(() => {
    const unique = new Set(reports.map((r) => r.date.getFullYear()));
    unique.add(new Date().getFullYear());
    return [...unique].sort((a, b) => b - a);
  }, [reports]);

  const woodName = (report: Report) => (report.wood ? t[WOOD_LABEL_KEYS[report.wood]] : report.woodLabel);
  const formatDate = (date: Date) =>
    date.toLocaleString(settings.language, { dateStyle: "medium", timeStyle: "short" });

  const share = async (report: Report) => {
    const message = format(t.reportShareBody, {
      wood: woodName(report),
      result: report.inRange ? t.inRange : t.outOfRange,
      date: formatDate(report.date),
    });
    if (Platform.OS === "web" && !navigator.share) {
      Linking.openURL(`mailto:?subject=${encodeURIComponent(t.shareReportTitle)}&body=${encodeURIComponent(message)}`);
      return;
    }
    try {
      await Share.share({ title: t.shareReportTitle, message });
    } catch {
      // The user dismissed the share sheet.
    }
  };

  const setFilter = (key: keyof Filters) => (value: string) => setFilters((f) => ({ ...f, [key]: value }));

  const filterPickers: { key: keyof Filters; label: string; options: { label: string; value: string }[] }[] = [
    {
      key: "month",
      label: t.month,
      options: [
        { label: t.allMonths, value: "" },
        ...t.monthNames.split(",").map((name, i) => ({ label: name, value: String(i + 1) })),
      ],
    },
    {
      key: "day",
      label: t.day,
      options: [
        { label: t.allDays, value: "" },
        ...Array.from({ length: 31 }, (_, i) => ({ label: String(i + 1), value: String(i + 1) })),
      ],
    },
    {
      key: "year",
      label: t.year,
      options: [{ label: t.allYears, value: "" }, ...years.map((y) => ({ label: String(y), value: String(y) }))],
    },
    {
      key: "range",
      label: t.range,
      options: [
        { label: t.allRange, value: "" },
        { label: t.inRange, value: "in" },
        { label: t.outOfRange, value: "out" },
      ],
    },
    {
      key: "wood",
      label: t.woodType,
      options: [
        { label: t.all, value: "" },
        ...WOOD_TYPES.map((wood) => ({ label: t[WOOD_LABEL_KEYS[wood]], value: wood })),
      ],
    },
  ];

  const activeFilters = Object.values(filters).filter(Boolean).length;

  return (
    <Screen
      title={t.reportsTitle}
      subtitle={loading ? undefined : format(t.reportCount, { count: filtered.length })}
      headerRight={
        <Button label={t.refresh} icon="refresh" variant="secondary" onPress={load} disabled={loading} />
      }
    >
      <Card
        title={t.filterBy}
        right={
          activeFilters > 0 ? (
            <Pressable onPress={() => setFilters(NO_FILTERS)} hitSlop={8}>
              <Text style={{ color: colors.primary, fontWeight: "600" }}>{t.clearFilters}</Text>
            </Pressable>
          ) : null
        }
      >
        <View style={[styles.filters, wide && styles.filtersWide]}>
          {filterPickers.map(({ key, label, options }) => (
            <View key={key} style={[styles.filter, wide && styles.filterWide]}>
              <Text style={[styles.filterLabel, { color: colors.secondaryText }]}>{label}</Text>
              <View style={[styles.pickerBox, { borderColor: colors.border, backgroundColor: colors.card }]}>
                <Picker
                  selectedValue={filters[key]}
                  onValueChange={setFilter(key)}
                  style={[styles.picker, { color: colors.text, backgroundColor: colors.card }]}
                  itemStyle={{ color: colors.text, fontSize: 16 }}
                  dropdownIconColor={colors.primary}
                  mode="dropdown"
                >
                  {options.map((option) => (
                    <Picker.Item key={option.value} label={option.label} value={option.value} />
                  ))}
                </Picker>
              </View>
            </View>
          ))}
        </View>
      </Card>

      {loading ? (
        <Loader label={t.loadingReports} />
      ) : error || filtered.length === 0 ? (
        <EmptyState
          icon={error ? "cloud-offline-outline" : "document-text-outline"}
          title={error ? t.loadReportsFailed : t.noReportsMatch}
        />
      ) : (
        <View style={styles.grid}>
          {filtered.map((report) => {
            const tone = report.inRange ? colors.success : colors.warning;
            return (
              <View
                key={report.id}
                style={[
                  styles.report,
                  wide && styles.reportWide,
                  { backgroundColor: colors.card, borderColor: colors.border },
                ]}
              >
                <Pressable
                  style={wide ? undefined : styles.thumbWrap}
                  disabled={!report.imageUrl}
                  onPress={() => setPreviewImage(report.imageUrl)}
                  accessibilityLabel={t.viewImage}
                >
                  {report.imageUrl ? (
                    <Image source={{ uri: report.imageUrl }} style={wide ? styles.cover : styles.thumbnail} />
                  ) : (
                    <View style={[wide ? styles.cover : styles.thumbnail, { backgroundColor: colors.track }]} />
                  )}
                </Pressable>
                <View style={[styles.reportText, wide && styles.reportTextWide]}>
                  <View style={styles.reportTop}>
                    <View style={styles.woodRow}>
                      {report.wood ? (
                        <View style={[styles.swatch, { backgroundColor: WOOD_COLORS[report.wood] }]} />
                      ) : null}
                      <Text style={[styles.reportWood, { color: colors.text }]} numberOfLines={1}>
                        {woodName(report)}
                      </Text>
                    </View>
                    <Pressable onPress={() => share(report)} hitSlop={12} accessibilityLabel={t.share}>
                      <Ionicons name="share-outline" size={20} color={colors.secondaryText} />
                    </Pressable>
                  </View>
                  <Text style={{ color: colors.secondaryText, fontSize: 13 }}>{formatDate(report.date)}</Text>
                  <View style={styles.reportMeta}>
                    <Badge
                      label={report.inRange ? t.inRange : t.outOfRange}
                      color={tone}
                      icon={report.inRange ? "checkmark-circle" : "alert-circle"}
                    />
                    {report.confidence != null ? (
                      <Text style={{ color: colors.secondaryText, fontSize: 13 }}>
                        {format(t.confidenceShort, { value: Number(report.confidence).toFixed(0) })}
                      </Text>
                    ) : null}
                  </View>
                  {report.category ? (
                    <Text style={{ color: colors.secondaryText, fontSize: 13 }} numberOfLines={1}>
                      {report.category}
                    </Text>
                  ) : null}
                </View>
              </View>
            );
          })}
        </View>
      )}

      <Modal
        visible={previewImage !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setPreviewImage(null)}
      >
        <Pressable style={styles.modal} onPress={() => setPreviewImage(null)}>
          {previewImage && <Image source={{ uri: previewImage }} style={styles.preview} resizeMode="contain" />}
          <Ionicons name="close" size={32} color="#fff" style={styles.close} />
        </Pressable>
      </Modal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  filters: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", rowGap: 12 },
  filtersWide: { flexWrap: "nowrap", gap: 12 },
  filter: { width: "48%", gap: 6 },
  filterWide: { flex: 1, width: "auto" },
  filterLabel: { fontSize: 12, fontWeight: "600", letterSpacing: 0.4, textTransform: "uppercase" },
  pickerBox: { borderWidth: 1, borderRadius: 10, overflow: "hidden" },
  picker: Platform.select({
    ios: { height: 120, marginVertical: -40 },
    web: { height: 40, borderWidth: 0, paddingHorizontal: 8, fontSize: 15 },
    default: { height: 50 },
  }),
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 16 },
  report: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 12,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
  },
  reportWide: {
    width: "31.5%",
    flexGrow: 1,
    maxWidth: "33%",
    flexDirection: "column",
    alignItems: "stretch",
    padding: 0,
    gap: 0,
    overflow: "hidden",
  },
  thumbWrap: { borderRadius: 10, overflow: "hidden" },
  thumbnail: { width: 72, height: 72, borderRadius: 10 },
  cover: { width: "100%", aspectRatio: 4 / 3 },
  reportText: { flex: 1, gap: 4 },
  reportTextWide: { padding: 14 },
  reportTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
  woodRow: { flexDirection: "row", alignItems: "center", gap: 8, flexShrink: 1 },
  swatch: { width: 12, height: 12, borderRadius: 6 },
  reportWood: { fontSize: 16, fontWeight: "600", flexShrink: 1 },
  reportMeta: { flexDirection: "row", alignItems: "center", gap: 10, marginTop: 2 },
  modal: { flex: 1, backgroundColor: "rgba(0,0,0,0.85)", alignItems: "center", justifyContent: "center" },
  preview: { width: "90%", height: "80%" },
  close: { position: "absolute", top: 32, right: 32 },
});
