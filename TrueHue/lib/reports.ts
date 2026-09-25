import { addDoc, collection, getDocs } from "firebase/firestore";
import { getDownloadURL, ref, uploadBytes } from "firebase/storage";

import strings from "@/i18n/strings";

import type { Classification } from "./api";
import { db, storage } from "./firebase";
import { CATEGORY_LABEL_KEYS, WOOD_NAMES, parseWoodType, type WoodType } from "./woods";

const COLLECTION = "Reports";

export interface Report {
  id: string;
  date: Date;
  wood: WoodType | null;
  /** Raw stored wood value, shown when it is not a known wood type. */
  woodLabel: string;
  inRange: boolean;
  category: string | null;
  confidence: number | null;
  imageUrl: string | null;
}

/** Reads a local or data: URI into a Blob. fetch().blob() is unreliable for file:// URIs on Android. */
function uriToBlob(uri: string): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.onload = () => resolve(xhr.response);
    xhr.onerror = () => reject(new Error("Could not read image file"));
    xhr.responseType = "blob";
    xhr.open("GET", uri, true);
    xhr.send(null);
  });
}

export async function saveReport(result: Classification, imageUri: string) {
  const imageRef = ref(storage, `reports/${Date.now()}.jpg`);
  await uploadBytes(imageRef, await uriToBlob(imageUri), { contentType: "image/jpeg" });
  const imageUrl = await getDownloadURL(imageRef);

  // Field names match the documents written by earlier app versions.
  await addDoc(collection(db, COLLECTION), {
    Accuracy: result.in_range ? strings.en.inRange : strings.en.outOfRange,
    Category: strings.en[CATEGORY_LABEL_KEYS[result.predicted_category] as keyof typeof strings.en],
    Confidence: result.confidence,
    Date: new Date().toISOString(),
    Image: imageUrl,
    Type: "analysis",
    Wood: WOOD_NAMES[result.wood],
  });
}

export async function fetchReports(): Promise<Report[]> {
  const snapshot = await getDocs(collection(db, COLLECTION));
  return snapshot.docs
    .map((doc) => {
      const data = doc.data();
      const accuracy = String(data.Accuracy ?? "").toLowerCase();
      return {
        id: doc.id,
        date: new Date(data.Date),
        wood: parseWoodType(data.Wood),
        woodLabel: String(data.Wood ?? ""),
        inRange: accuracy.startsWith("in"),
        category: data.Category ?? null,
        confidence: data.Confidence ?? null,
        imageUrl: data.Image ?? null,
      };
    })
    .filter((report) => !Number.isNaN(report.date.getTime()))
    .sort((a, b) => b.date.getTime() - a.date.getTime());
}
