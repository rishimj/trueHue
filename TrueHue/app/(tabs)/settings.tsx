import { Ionicons } from "@expo/vector-icons";
import { Picker } from "@react-native-picker/picker";
import Constants from "expo-constants";
import React from "react";
import { Linking, Platform, Pressable, StyleSheet, Switch, Text, View } from "react-native";

import { Button, Card, Screen } from "@/components/ui";
import { confirmAction } from "@/lib/alert";
import {
  LANGUAGES,
  format,
  supportsNotifications,
  useSettings,
  useStrings,
  useThemeColors,
  type Language,
} from "@/lib/settings";

const REPO_URL = "https://github.com/rishimj/trueHue";

export default function SettingsScreen() {
  const { settings, updateSetting, resetSettings } = useSettings();
  const t = useStrings();
  const colors = useThemeColors();

  const toggleRow = (label: string, description: string, value: boolean, onChange: (v: boolean) => void) => (
    <View style={[styles.row, { borderBottomColor: colors.border }]}>
      <View style={styles.rowText}>
        <Text style={[styles.rowLabel, { color: colors.text }]}>{label}</Text>
        <Text style={{ color: colors.secondaryText, fontSize: 14 }}>{description}</Text>
      </View>
      <Switch
        value={value}
        onValueChange={onChange}
        trackColor={{ false: colors.border, true: colors.primary }}
        thumbColor="#fff"
        ios_backgroundColor={colors.border}
      />
    </View>
  );

  const linkRow = (icon: keyof typeof Ionicons.glyphMap, label: string, url: string) => (
    <Pressable style={[styles.row, { borderBottomColor: colors.border }]} onPress={() => Linking.openURL(url)}>
      <Ionicons name={icon} size={22} color={colors.primary} />
      <Text style={[styles.rowLabel, styles.rowText, { color: colors.text }]}>{label}</Text>
      <Ionicons name="open-outline" size={18} color={colors.secondaryText} />
    </Pressable>
  );

  return (
    <Screen title={t.settingsTitle}>
      <Card title={t.language}>
        <Text style={{ color: colors.secondaryText }}>{t.languageDesc}</Text>
        <View style={[styles.pickerBox, { borderColor: colors.border }]}>
          <Picker
            selectedValue={settings.language}
            onValueChange={(value: Language) => updateSetting("language", value)}
            style={[styles.picker, { color: colors.text, backgroundColor: colors.card }]}
            itemStyle={{ color: colors.text, fontSize: 16 }}
            dropdownIconColor={colors.primary}
            mode="dropdown"
          >
            {LANGUAGES.map(({ label, value }) => (
              <Picker.Item key={value} label={label} value={value} />
            ))}
          </Picker>
        </View>
      </Card>

      <Card title={t.appearance}>
        {toggleRow(t.darkMode, t.darkModeDesc, settings.darkMode, (v) => updateSetting("darkMode", v))}
      </Card>

      {supportsNotifications && (
        <Card title={t.notifications}>
          {toggleRow(t.enableNotifications, t.notificationsDesc, settings.notificationsEnabled, (v) =>
            updateSetting("notificationsEnabled", v)
          )}
        </Card>
      )}

      <Card title={t.support}>
        {linkRow("book-outline", t.helpFaq, `${REPO_URL}#readme`)}
        {linkRow("bug-outline", t.reportBug, `${REPO_URL}/issues`)}
      </Card>

      <Button
        label={t.resetDefaults}
        variant="ghost"
        onPress={() => confirmAction(t.resetSettingsTitle, t.resetSettingsDesc, t.reset, t.cancel, resetSettings)}
      />

      <Text style={[styles.version, { color: colors.secondaryText }]}>
        TrueHue · {format(t.version, { version: Constants.expoConfig?.version ?? "1.0.0" })}
      </Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  rowText: { flex: 1, gap: 4 },
  rowLabel: { fontSize: 16, fontWeight: "500" },
  pickerBox: { borderWidth: 1, borderRadius: 8, overflow: "hidden" },
  picker: Platform.select({
    ios: { height: 150, marginVertical: -30 },
    web: { height: 44, borderWidth: 0, paddingHorizontal: 8, fontSize: 16 },
    default: { height: 50 },
  }),
  version: { textAlign: "center", fontSize: 13, marginBottom: 16 },
});
