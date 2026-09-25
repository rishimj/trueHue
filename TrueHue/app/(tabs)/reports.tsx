import { Ionicons } from "@expo/vector-icons";
import { Picker } from "@react-native-picker/picker";
import { useFocusEffect } from "expo-router";
import React, { useCallback, useMemo, useState } from "react";
import { Image, Linking, Modal, Platform, Pressable, Share, StyleSheet, Text, View } from "react-native";

import { Card, Loader, Screen } from "@/components/ui";
import { fetchReports, type Report } from "@/lib/reports";
import { format, useSettings, useStrings, useThemeColors } from "@/lib/settings";
import { WOOD_LABEL_KEYS, WOOD_TYPES } from "@/lib/woods";

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

  return (
    <Screen
      title={t.reportsTitle}
      headerRight={
        <Pressable onPress={load} accessibilityLabel={t.refresh} hitSlop={12}>
          <Ionicons name="refresh" size={24} color={colors.primary} />
        </Pressable>
      }
    >
      <Card title={t.filterBy}>
        <View style={styles.filters}>
          {filterPickers.map(({ key, label, options }) => (
            <View key={key} style={styles.filter}>
              <Text style={[styles.filterLabel, { color: colors.text }]}>{label}</Text>
              <View style={[styles.pickerBox, { borderColor: colors.border }]}>
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
        <Card>
          <Text style={[styles.empty, { color: colors.secondaryText }]}>
            {error ? t.loadReportsFailed : t.noReportsMatch}
          </Text>
        </Card>
      ) : (
        filtered.map((report) => (
          <Card key={report.id} style={styles.report}>
            <Pressable
              style={styles.reportBody}
              disabled={!report.imageUrl}
              onPress={() => setPreviewImage(report.imageUrl)}
            >
              {report.imageUrl ? (
                <Image source={{ uri: report.imageUrl }} style={styles.thumbnail} />
              ) : (
                <View style={[styles.thumbnail, { backgroundColor: colors.track }]} />
              )}
              <View style={styles.reportText}>
                <Text style={[styles.reportWood, { color: colors.text }]}>{woodName(report)}</Text>
                <Text style={{ color: colors.secondaryText, fontSize: 13 }}>{formatDate(report.date)}</Text>
                <Text style={{ color: report.inRange ? colors.success : colors.danger, fontWeight: "600" }}>
                  {report.inRange ? t.inRange : t.outOfRange}
                </Text>
              </View>
            </Pressable>
            <Pressable onPress={() => share(report)} hitSlop={12} accessibilityLabel={t.share}>
              <Ionicons name="share-outline" size={24} color={colors.primary} />
            </Pressable>
          </Card>
        ))
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
  filter: { width: "48%", gap: 6 },
  filterLabel: { fontSize: 14, fontWeight: "500" },
  pickerBox: { borderWidth: 1, borderRadius: 8, overflow: "hidden" },
  picker: Platform.select({
    ios: { height: 120, marginVertical: -40 },
    web: { height: 40, borderWidth: 0, paddingHorizontal: 8, fontSize: 15 },
    default: { height: 50 },
  }),
  empty: { fontSize: 16, textAlign: "center", paddingVertical: 24 },
  report: { flexDirection: "row", alignItems: "center", padding: 12 },
  reportBody: { flex: 1, flexDirection: "row", alignItems: "center", gap: 12 },
  thumbnail: { width: 56, height: 56, borderRadius: 8 },
  reportText: { flex: 1, gap: 2 },
  reportWood: { fontSize: 16, fontWeight: "600" },
  modal: { flex: 1, backgroundColor: "rgba(0,0,0,0.8)", alignItems: "center", justifyContent: "center" },
  preview: { width: "90%", height: "70%" },
  close: { position: "absolute", top: 48, right: 24 },
});
