import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Notifications from "expo-notifications";
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { Platform } from "react-native";

import strings, { type Strings } from "@/i18n/strings";

export const LANGUAGES = [
  { label: "English", value: "en" },
  { label: "Español", value: "es" },
  { label: "Français", value: "fr" },
  { label: "Deutsch", value: "de" },
  { label: "中文", value: "zh" },
] as const;

export type Language = (typeof LANGUAGES)[number]["value"];

export interface Settings {
  language: Language;
  darkMode: boolean;
  notificationsEnabled: boolean;
}

export const DEFAULT_SETTINGS: Settings = {
  language: "en",
  darkMode: false,
  notificationsEnabled: true,
};

const STORAGE_KEY = "appSettings";

export const supportsNotifications = Platform.OS !== "web";

if (supportsNotifications) {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
}

interface SettingsContextValue {
  settings: Settings;
  loaded: boolean;
  updateSetting: <K extends keyof Settings>(key: K, value: Settings[K]) => void;
  resetSettings: () => void;
}

const SettingsContext = createContext<SettingsContextValue | null>(null);

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((saved) => {
        if (saved) setSettings({ ...DEFAULT_SETTINGS, ...JSON.parse(saved) });
      })
      .catch((error) => console.warn("Could not load settings", error))
      .finally(() => setLoaded(true));
  }, []);

  const persist = useCallback((next: Settings) => {
    setSettings(next);
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next)).catch((error) =>
      console.warn("Could not save settings", error)
    );
  }, []);

  const value = useMemo<SettingsContextValue>(
    () => ({
      settings,
      loaded,
      updateSetting: (key, value) => persist({ ...settings, [key]: value }),
      resetSettings: () => persist(DEFAULT_SETTINGS),
    }),
    [settings, loaded, persist]
  );

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export function useSettings() {
  const context = useContext(SettingsContext);
  if (!context) throw new Error("useSettings must be used inside SettingsProvider");
  return context;
}

/** Returns the UI strings for the current language, falling back to English per key. */
export function useStrings(): Strings {
  const { language } = useSettings().settings;
  return useMemo(() => ({ ...strings.en, ...strings[language] }), [language]);
}

/** Replaces {placeholders} in a translated template. */
export function format(template: string, values: Record<string, string | number>) {
  return template.replace(/\{(\w+)\}/g, (match, key) => String(values[key] ?? match));
}

export interface ThemeColors {
  dark: boolean;
  background: string;
  card: string;
  text: string;
  secondaryText: string;
  primary: string;
  border: string;
  track: string;
  success: string;
  warning: string;
  danger: string;
}

const LIGHT: ThemeColors = {
  dark: false,
  background: "#F7F6F3",
  card: "#FFFFFF",
  text: "#2B2A2E",
  secondaryText: "#6B6A70",
  primary: "#6A3FD1",
  border: "#E2E0E8",
  track: "#EDECF1",
  success: "#2E7D32",
  warning: "#E65100",
  danger: "#C62828",
};

const DARK: ThemeColors = {
  dark: true,
  background: "#121214",
  card: "#1E1E22",
  text: "#EDEDF0",
  secondaryText: "#A0A0A8",
  primary: "#9B7BFF",
  border: "#34343A",
  track: "#2C2C32",
  success: "#66BB6A",
  warning: "#FFA726",
  danger: "#EF5350",
};

export function useThemeColors(): ThemeColors {
  return useSettings().settings.darkMode ? DARK : LIGHT;
}

/** Shows a local notification if the user has notifications enabled. */
export async function notify(title: string, body: string, settings: Settings) {
  if (!supportsNotifications || !settings.notificationsEnabled) return;
  try {
    const { granted } = await Notifications.requestPermissionsAsync();
    if (granted) {
      await Notifications.scheduleNotificationAsync({ content: { title, body }, trigger: null });
    }
  } catch (error) {
    console.warn("Could not show notification", error);
  }
}
