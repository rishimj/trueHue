import { Ionicons } from "@expo/vector-icons";
import { Tabs } from "expo-router";
import React from "react";

import { useStrings, useThemeColors } from "@/lib/settings";

type IconName = keyof typeof Ionicons.glyphMap;

export default function TabLayout() {
  const t = useStrings();
  const colors = useThemeColors();

  const icon =
    (name: IconName) =>
    ({ color, size }: { color: string; size: number }) =>
      <Ionicons name={name} size={size} color={color} />;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.secondaryText,
        tabBarStyle: { backgroundColor: colors.card, borderTopColor: colors.border },
      }}
    >
      <Tabs.Screen name="index" options={{ title: t.tabAnalyze, tabBarIcon: icon("scan-outline") }} />
      <Tabs.Screen name="compare" options={{ title: t.tabCompare, tabBarIcon: icon("git-compare-outline") }} />
      <Tabs.Screen name="reports" options={{ title: t.tabReports, tabBarIcon: icon("document-text-outline") }} />
      <Tabs.Screen name="settings" options={{ title: t.tabSettings, tabBarIcon: icon("settings-outline") }} />
    </Tabs>
  );
}
