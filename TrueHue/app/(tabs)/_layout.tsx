import { Ionicons } from "@expo/vector-icons";
import { Tabs } from "expo-router";
import React from "react";
import { Platform } from "react-native";

import { useIsWide } from "@/components/ui";
import { useStrings, useThemeColors } from "@/lib/settings";

type IconName = keyof typeof Ionicons.glyphMap;

export default function TabLayout() {
  const t = useStrings();
  const colors = useThemeColors();
  // Wide browser windows get a sidebar, which reads better than a phone-style bottom bar on a desktop demo.
  const wide = useIsWide();
  const sidebar = Platform.OS === "web" && wide;

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
        tabBarPosition: sidebar ? "left" : "bottom",
        tabBarVariant: sidebar ? "material" : "uikit",
        tabBarLabelPosition: sidebar ? "beside-icon" : undefined,
        tabBarActiveBackgroundColor: sidebar ? colors.primarySoft : undefined,
        tabBarItemStyle: sidebar
          ? { borderRadius: 10, marginHorizontal: 12, marginVertical: 2, paddingHorizontal: 12, justifyContent: "flex-start" }
          : undefined,
        tabBarLabelStyle: sidebar ? { fontSize: 14, fontWeight: "600", marginLeft: 12 } : undefined,
        tabBarStyle: sidebar
          ? { backgroundColor: colors.card, borderRightColor: colors.border, width: 208, paddingTop: 28 }
          : { backgroundColor: colors.card, borderTopColor: colors.border },
      }}
    >
      <Tabs.Screen name="index" options={{ title: t.tabAnalyze, tabBarIcon: icon("scan-outline") }} />
      <Tabs.Screen name="compare" options={{ title: t.tabCompare, tabBarIcon: icon("git-compare-outline") }} />
      <Tabs.Screen name="reports" options={{ title: t.tabReports, tabBarIcon: icon("document-text-outline") }} />
      <Tabs.Screen name="settings" options={{ title: t.tabSettings, tabBarIcon: icon("settings-outline") }} />
    </Tabs>
  );
}
