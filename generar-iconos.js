// generar-iconos.js
import sharp from "sharp";

const generar = async () => {
  try {
    await sharp("public/vite.svg")
      .resize(192, 192)
      .toFile("public/icon-192.png");

    await sharp("public/vite.svg")
      .resize(512, 512)
      .toFile("public/icon-512.png");

    console.log("✅ Iconos generados correctamente (192 y 512)");
  } catch (error) {
    console.error("❌ Error al generar iconos:", error);
  }
};

generar();
