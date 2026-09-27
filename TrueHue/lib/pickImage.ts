import * as ImagePicker from "expo-image-picker";
import { Platform } from "react-native";

export interface PickedImage {
  uri: string;
  base64: string;
}

export type ImageSource = "library" | "camera";

const OPTIONS: ImagePicker.ImagePickerOptions = {
  mediaTypes: ["images"],
  allowsEditing: true,
  aspect: [4, 3],
  quality: 0.8,
  base64: true,
};

// The server compares images at 300x300, so anything much larger only slows the upload.
const MAX_UPLOAD_DIMENSION = 1280;
const UPLOAD_JPEG_QUALITY = 0.85;

/**
 * Opens the photo library or camera. Returns null if the user cancels.
 * Throws if camera permission is denied.
 */
export async function pickImage(source: ImageSource): Promise<PickedImage | null> {
  if (source === "camera") {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) throw new Error("Camera access was not granted.");
  }

  const result =
    source === "camera"
      ? await ImagePicker.launchCameraAsync(OPTIONS)
      : await ImagePicker.launchImageLibraryAsync(OPTIONS);

  const asset = result.canceled ? undefined : result.assets[0];
  if (!asset) return null;
  // On web the asset URI is itself a base64 data URL.
  const base64 = asset.base64 ?? (asset.uri.startsWith("data:") ? asset.uri.split(",")[1] : null);
  return base64 ? downscaleForUpload({ uri: asset.uri, base64 }) : null;
}

/**
 * On web the picker ignores `quality` and `allowsEditing`, so a phone photo or PNG is sent
 * at full size (often 30+ MB once base64-encoded). Re-encode it as a bounded JPEG instead.
 * Native pickers already compress, so this is a no-op there.
 */
export async function downscaleForUpload(image: PickedImage): Promise<PickedImage> {
  if (Platform.OS !== "web") return image;
  try {
    const element = await loadHtmlImage(image.uri);
    const scale = Math.min(1, MAX_UPLOAD_DIMENSION / Math.max(element.naturalWidth, element.naturalHeight));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(element.naturalWidth * scale));
    canvas.height = Math.max(1, Math.round(element.naturalHeight * scale));
    const context = canvas.getContext("2d");
    if (!context) return image;
    // JPEG has no alpha channel; flatten transparent PNGs onto white rather than black.
    context.fillStyle = "#fff";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(element, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL("image/jpeg", UPLOAD_JPEG_QUALITY);
    return { uri: dataUrl, base64: dataUrl.slice(dataUrl.indexOf(",") + 1) };
  } catch {
    // Formats the browser cannot draw (e.g. HEIC in Chrome) are sent as-is for the server to decode.
    return image;
  }
}

function loadHtmlImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const element = document.createElement("img");
    element.onload = () => resolve(element);
    element.onerror = () => reject(new Error("Could not decode image"));
    element.src = src;
  });
}
