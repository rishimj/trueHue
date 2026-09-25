import { Platform } from "react-native";

import type { WoodType } from "./woods";

/**
 * Backend base URL. The web build is served by the backend itself, so it uses
 * relative URLs by default. Native builds must set EXPO_PUBLIC_API_URL.
 */
export const API_URL = (
  process.env.EXPO_PUBLIC_API_URL ??
  (Platform.OS === "web" ? "" : "http://localhost:3050")
).replace(/\/$/, "");

export type Category =
  | "out-of-range-too-light"
  | "in-range-light"
  | "in-range-standard"
  | "in-range-dark"
  | "out-of-range-too-dark";

export interface Classification {
  wood: WoodType;
  predicted_category: Category;
  in_range: boolean;
  confidence: number;
  similarity_scores: Record<Category, number>;
  distance_profile: Record<Category, number>;
}

export interface Comparison {
  difference: number;
  normalized_difference: number;
}

async function post<T>(path: string, body: unknown): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${API_URL}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  } catch {
    throw new Error("Could not reach the analysis server. Check your connection and try again.");
  }
  const data = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(data?.error ?? `Server error (${response.status})`);
  }
  return data as T;
}

export const classifyVeneer = (image: string, wood: WoodType) =>
  post<Classification>("/api/classify", { image, wood });

export const compareVeneers = (image1: string, image2: string) =>
  post<Comparison>("/api/compare", { image1, image2 });
