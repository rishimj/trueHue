import type { Category } from "./api";

export const WOOD_TYPES = ["medium-cherry", "desert-oak", "graphite-walnut"] as const;
export type WoodType = (typeof WOOD_TYPES)[number];

export const WOOD_COLORS: Record<WoodType, string> = {
  "medium-cherry": "#8B3E2F",
  "desert-oak": "#B08D5E",
  "graphite-walnut": "#5C4033",
};

/** English names, used as the stored value in saved reports. */
export const WOOD_NAMES: Record<WoodType, string> = {
  "medium-cherry": "Medium Cherry",
  "desert-oak": "Desert Oak",
  "graphite-walnut": "Graphite Walnut",
};

/** Translation keys for each wood type and category. */
export const WOOD_LABEL_KEYS = {
  "medium-cherry": "mediumCherry",
  "desert-oak": "desertOak",
  "graphite-walnut": "graphiteWalnut",
} as const;

export const CATEGORY_LABEL_KEYS: Record<Category, string> = {
  "out-of-range-too-light": "outOfRangeTooLight",
  "in-range-light": "inRangeLight",
  "in-range-standard": "inRangeStandard",
  "in-range-dark": "inRangeDark",
  "out-of-range-too-dark": "outOfRangeTooDark",
};

/** Position of each category on a dark (0) to light (1) spectrum. */
export const CATEGORY_POSITION: Record<Category, number> = {
  "out-of-range-too-dark": 0,
  "in-range-dark": 0.25,
  "in-range-standard": 0.5,
  "in-range-light": 0.75,
  "out-of-range-too-light": 1,
};

/** Maps any stored wood value (legacy snake_case or English name) to a WoodType. */
export function parseWoodType(value: string | undefined): WoodType | null {
  if (!value) return null;
  const slug = value.trim().toLowerCase().replace(/[\s_]+/g, "-");
  return (WOOD_TYPES as readonly string[]).includes(slug) ? (slug as WoodType) : null;
}
