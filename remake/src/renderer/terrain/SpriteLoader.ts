/**
 * SpriteLoader — loads individual sprite frames from image files.
 *
 * Current support:
 *   - PNG / WebP / any browser-supported image format via `Image`
 *   - SHP (Tiberian Dawn) format detection stub — full LCW/XORDelta
 *     decoding is reserved for a future dedicated pass once real .shp
 *     assets are wired into the TileSet manifest.
 *
 * Source: OpenRA.Mods.Cnc/SpriteLoaders/ShpTDLoader.cs
 */

export interface SpriteFrame {
  readonly width: number;
  readonly height: number;
  /** RGBA pixel data. */
  readonly data: Uint8ClampedArray;
}

/** Load a browser-supported image (png, webp, etc.) as a SpriteFrame. */
export async function loadImageFromUrl(url: string): Promise<SpriteFrame> {
  const img = new Image();
  img.src = url;
  img.crossOrigin = 'anonymous';

  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = () => reject(new Error(`Failed to load image: ${url}`));
  });

  const canvas = document.createElement('canvas');
  canvas.width = img.width;
  canvas.height = img.height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Failed to get 2D context');
  ctx.drawImage(img, 0, 0);

  const imageData = ctx.getImageData(0, 0, img.width, img.height);
  return {
    width: img.width,
    height: img.height,
    data: imageData.data,
  };
}

/** Create a SpriteFrame from raw RGBA bytes (used by e2e tests and procedural fallbacks). */
export function createSpriteFrameFromRgba(width: number, height: number, rgba: Uint8Array): SpriteFrame {
  if (rgba.length !== width * height * 4) {
    throw new Error(`RGBA length ${rgba.length} does not match ${width}x${height}*4`);
  }
  return { width, height, data: new Uint8ClampedArray(rgba) };
}

// ── SHP (Tiberian Dawn) stub ──

/** Detect whether a byte array looks like a TD SHP file.
 *  Full parsing is stubbed until real .shp assets are available. */
export function detectShpTD(buffer: ArrayBuffer): boolean {
  const view = new DataView(buffer);
  if (buffer.byteLength < 18) return false;

  const imageCount = view.getUint16(0, true);
  if (imageCount === 0) return false;

  const finalOffset = 14 + 8 * imageCount;
  if (finalOffset > buffer.byteLength) return false;

  const eof = view.getUint32(finalOffset, true);
  if (eof !== buffer.byteLength) return false;

  const formatFlag = view.getUint8(17);
  return formatFlag === 0x20 || formatFlag === 0x40 || formatFlag === 0x80;
}
