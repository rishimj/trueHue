import { Link, Stack } from "expo-router";
import React from "react";
import { StyleSheet, Text, View } from "react-native";

import { useThemeColors } from "@/lib/settings";

export default function NotFoundScreen() {
  const colors = useThemeColors();
  return (
    <>
      <Stack.Screen options={{ title: "Not found" }} />
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <Text style={[styles.title, { color: colors.text }]}>This page doesn't exist.</Text>
        <Link href="/" style={[styles.link, { color: colors.primary }]}>
          Go to the home screen
        </Link>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: "center", justifyContent: "center", padding: 20, gap: 16 },
  title: { fontSize: 20, fontWeight: "700" },
  link: { fontSize: 16 },
});
