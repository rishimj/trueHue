import { Asset } from "expo-asset";

import type { PickedImage } from "./pickImage";
import type { WoodType } from "./woods";

export interface DemoSample {
  id: string;
  wood: WoodType;
  /** Whether the sample's labeled shade is within the finish specification. */
  inSpec: boolean;
  source: number;
}

/**
 * Real veneer photos from the validation dataset, held out from the classifier's reference
 * set and downscaled to 960px. Each one classifies into its labeled category.
 */
export const DEMO_SAMPLES: DemoSample[] = [
  {
    id: "medium-cherry-in",
    wood: "medium-cherry",
    inSpec: true,
    source: require("@/assets/demo/medium-cherry--in-range-standard.jpg"),
  },
  {
    id: "medium-cherry-out",
    wood: "medium-cherry",
    inSpec: false,
    source: require("@/assets/demo/medium-cherry--out-of-range-too-light.jpg"),
  },
  {
    id: "desert-oak-in",
    wood: "desert-oak",
    inSpec: true,
    source: require("@/assets/demo/desert-oak--in-range-standard.jpg"),
  },
  {
    id: "desert-oak-out",
    wood: "desert-oak",
    inSpec: false,
    source: require("@/assets/demo/desert-oak--out-of-range-too-dark.jpg"),
  },
  {
    id: "graphite-walnut-in",
    wood: "graphite-walnut",
    inSpec: true,
    source: require("@/assets/demo/graphite-walnut--in-range-standard.jpg"),
  },
  {
    id: "graphite-walnut-out",
    wood: "graphite-walnut",
    inSpec: false,
    source: require("@/assets/demo/graphite-walnut--out-of-range-too-light.jpg"),
  },
];

/** Loads a bundled demo photo as a data URL so it goes through the same path as an upload. */
export async function loadDemoSample(sample: DemoSample): Promise<PickedImage> {
  const asset = Asset.fromModule(sample.source);
  await asset.downloadAsync();
  const response = await fetch(asset.localUri ?? asset.uri);
  const blob = await response.blob();
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Could not load the demo sample."));
    reader.readAsDataURL(blob);
  });
  return { uri: dataUrl, base64: dataUrl.slice(dataUrl.indexOf(",") + 1) };
}
