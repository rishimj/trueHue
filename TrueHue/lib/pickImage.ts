import * as ImagePicker from "expo-image-picker";

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
  return base64 ? { uri: asset.uri, base64 } : null;
}
