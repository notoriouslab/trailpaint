const MAX_SIDE = 800;
const QUALITY = 0.7;
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

export async function compressImage(file: File): Promise<string> {
  if (file.size > MAX_FILE_SIZE) {
    throw new Error(`檔案太大（${Math.round(file.size / 1024 / 1024)}MB），上限 ${MAX_FILE_SIZE / 1024 / 1024}MB`);
  }

  // createImageBitmap decodes at the engine level — avoids expanding
  // full-resolution pixels (e.g. 48 MP) into the JS heap on iOS Safari.
  const bitmap = await createImageBitmap(file);
  let { width, height } = bitmap;
  if (width > MAX_SIDE || height > MAX_SIDE) {
    const ratio = Math.min(MAX_SIDE / width, MAX_SIDE / height);
    width = Math.round(width * ratio);
    height = Math.round(height * ratio);
  }

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) { bitmap.close(); throw new Error('Canvas context unavailable'); }

  try {
    ctx.drawImage(bitmap, 0, 0, width, height);
  } finally {
    bitmap.close(); // release GPU memory even if drawImage throws
  }

  const dataUrl = canvas.toDataURL('image/jpeg', QUALITY);
  // Release canvas memory (important on iOS where total canvas budget is limited)
  canvas.width = 1;
  canvas.height = 1;
  return dataUrl;
}
