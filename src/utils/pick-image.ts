/**
 * Pick image files using Tauri dialog (native) or HTML file input (web fallback).
 * Returns array of { name, dataUrl } for each picked file.
 */

const MAX_IMAGE_BYTES = 2 * 1024 * 1024; // 2 MB per image

interface PickedImage {
  name: string;
  dataUrl: string;
}

export async function pickImages(multiple = true): Promise<PickedImage[]> {
  // Try Tauri dialog first
  if ("__TAURI_INTERNALS__" in window) {
    return pickViaTauri(multiple);
  }
  // Web fallback
  return pickViaInput(multiple);
}

async function pickViaTauri(multiple: boolean): Promise<PickedImage[]> {
  const { open } = await import("@tauri-apps/plugin-dialog");
  const { readFile } = await import("@tauri-apps/plugin-fs");

  const result = await open({
    multiple,
    filters: [{ name: "Images", extensions: ["png", "jpg", "jpeg", "webp", "gif"] }],
  });

  if (!result) return [];
  const paths = Array.isArray(result) ? result : [result];

  const picked: PickedImage[] = [];
  for (const filePath of paths) {
    const bytes = await readFile(filePath);
    if (bytes.length > MAX_IMAGE_BYTES) continue; // skip oversized files
    const ext = filePath.split(".").pop()?.toLowerCase() ?? "jpg";
    const mime = ext === "png" ? "image/png" : ext === "gif" ? "image/gif" : ext === "webp" ? "image/webp" : "image/jpeg";
    const base64 = uint8ToBase64(bytes);
    const name = filePath.split(/[\\/]/).pop() ?? `image.${ext}`;
    picked.push({ name, dataUrl: `data:${mime};base64,${base64}` });
  }
  return picked;
}

function pickViaInput(multiple: boolean): Promise<PickedImage[]> {
  return new Promise((resolve) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/png,image/jpeg,image/webp,image/gif";
    input.multiple = multiple;
    input.onchange = async () => {
      const files = Array.from(input.files ?? []).filter((f) => f.size <= MAX_IMAGE_BYTES);
      const results: PickedImage[] = [];
      for (const file of files) {
        const dataUrl = await readFileAsDataUrl(file);
        results.push({ name: file.name, dataUrl });
      }
      resolve(results);
    };
    input.oncancel = () => resolve([]);
    input.click();
  });
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function uint8ToBase64(bytes: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}
