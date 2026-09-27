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

// Matches the server's MAX_UPLOAD_MB; checked here so an oversized request fails immediately.
const MAX_REQUEST_BYTES = 25 * 1024 * 1024;
const REQUEST_TIMEOUT_MS = 60_000;

async function post<T>(path: string, body: unknown): Promise<T> {
  const payload = JSON.stringify(body);
  if (payload.length > MAX_REQUEST_BYTES) {
    throw new Error("This image is too large to analyze. Try a smaller photo.");
  }
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  let response: Response;
  try {
    response = await fetch(`${API_URL}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: payload,
      signal: controller.signal,
    });
  } catch {
    throw new Error(
      controller.signal.aborted
        ? "The analysis server took too long to respond. Try again."
        : "Could not reach the analysis server. Check your connection and try again."
    );
  } finally {
    clearTimeout(timeout);
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
