const MAX_OUTPUT_BYTES = 15 * 1024 * 1024;

function generateSafeUuid() {
  const cryptoApi = globalThis.crypto;
  if (cryptoApi && typeof cryptoApi.randomUUID === "function") {
    return cryptoApi.randomUUID();
  }

  const bytes = new Uint8Array(16);
  if (cryptoApi && typeof cryptoApi.getRandomValues === "function") {
    cryptoApi.getRandomValues(bytes);
  } else {
    for (let index = 0; index < bytes.length; index += 1) {
      bytes[index] = Math.floor(Math.random() * 256);
    }
  }

  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;

  const hex = Array.from(bytes)
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");

  return [
    hex.slice(0, 8),
    hex.slice(8, 12),
    hex.slice(12, 16),
    hex.slice(16, 20),
    hex.slice(20),
  ].join("-");
}

function loadImageElement(file) {
  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const image = new Image();

    image.onload = () => {
      resolve({
        image,
        width: image.naturalWidth,
        height: image.naturalHeight,
        cleanup: () => URL.revokeObjectURL(objectUrl),
      });
    };
    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("El navegador no puede leer esta imagen. Selecciona un archivo JPG, PNG o WebP."));
    };
    image.src = objectUrl;
  });
}

async function loadImage(file) {
  if (typeof createImageBitmap === "function") {
    try {
      const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
      return {
        image: bitmap,
        width: bitmap.width,
        height: bitmap.height,
        cleanup: () => bitmap.close(),
      };
    } catch {
      return loadImageElement(file);
    }
  }

  return loadImageElement(file);
}

function canvasToBlob(canvas, mimeType, quality) {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error("No se pudo comprimir la imagen."));
    }, mimeType, quality);
  });
}

export async function compressClientPhoto(file, { preserveText = false } = {}) {
  if (!file || !file.type.startsWith("image/")) {
    throw new Error("Selecciona un archivo de imagen.");
  }

  const loadedImage = await loadImage(file);
  try {
    const maxDimension = preserveText ? 2000 : 1600;
    const quality = preserveText ? 0.88 : 0.8;
    const scale = Math.min(1, maxDimension / Math.max(loadedImage.width, loadedImage.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(loadedImage.width * scale));
    canvas.height = Math.max(1, Math.round(loadedImage.height * scale));

    const context = canvas.getContext("2d", { alpha: false });
    if (!context) throw new Error("No se pudo preparar la imagen para comprimir.");
    context.drawImage(loadedImage.image, 0, 0, canvas.width, canvas.height);

    let blob = await canvasToBlob(canvas, "image/webp", quality);
    if (blob.type !== "image/webp") {
      blob = await canvasToBlob(canvas, "image/jpeg", quality);
    }

    if (blob.size > MAX_OUTPUT_BYTES) {
      throw new Error("La imagen comprimida supera el máximo permitido de 15 MB.");
    }

    const extension = blob.type === "image/webp" ? "webp" : "jpg";
    return {
      blob,
      mimeType: blob.type,
      fileName: `${generateSafeUuid()}.${extension}`,
      originalBytes: file.size,
      compressedBytes: blob.size,
      width: canvas.width,
      height: canvas.height,
    };
  } finally {
    loadedImage.cleanup();
  }
}