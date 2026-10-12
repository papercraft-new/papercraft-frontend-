// Cuts a box out of the ORIGINAL page at its full resolution (never out of the small
// on-screen copy), so diagrams, equations and handwriting stay sharp.

export type PictureSize = 'small' | 'medium' | 'large' | 'full';

/** A box in pixels of the original page. */
export interface CropRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface CroppedPicture {
  blob: Blob;
  filename: string;
  width: number;
  height: number;
  /** A sensible print size for this crop (wide strips go full width, small marks stay small). */
  size: PictureSize;
}

export const MIN_CROP_PX = 16;
const MAX_SIDE = 2400;
const MAX_BYTES = 2.8 * 1024 * 1024; // the server accepts up to 3 MB

export type SourceElement = HTMLImageElement | HTMLCanvasElement;

export const sourceSize = (el: SourceElement) =>
  el instanceof HTMLImageElement ? { w: el.naturalWidth, h: el.naturalHeight } : { w: el.width, h: el.height };

/** Print size from the shape of the crop and how much of the page width it covers. */
export function suggestSize(rect: CropRect, sourceWidth: number): PictureSize {
  const aspect = rect.w / rect.h;
  const fraction = rect.w / sourceWidth;
  if (aspect >= 3) return 'full';
  if (fraction >= 0.6) return 'large';
  if (fraction < 0.25) return 'small';
  return 'medium';
}

function toBlob(canvas: HTMLCanvasElement, type: string, quality?: number): Promise<Blob | null> {
  return new Promise(resolve => canvas.toBlob(resolve, type, quality));
}

/**
 * @param prefer 'png' for clean scans/PDF pages and line art, 'jpeg' for camera photos.
 */
export async function cropToPicture(
  source: SourceElement,
  rect: CropRect,
  prefer: 'png' | 'jpeg',
  baseName: string
): Promise<CroppedPicture> {
  const full = sourceSize(source);
  const x = Math.max(0, Math.min(Math.round(rect.x), full.w - 1));
  const y = Math.max(0, Math.min(Math.round(rect.y), full.h - 1));
  const w = Math.max(1, Math.min(Math.round(rect.w), full.w - x));
  const h = Math.max(1, Math.min(Math.round(rect.h), full.h - y));
  if (w < MIN_CROP_PX || h < MIN_CROP_PX) throw new Error('Draw a bigger box around the picture.');

  const scale = Math.min(1, MAX_SIDE / Math.max(w, h));
  const cw = Math.max(1, Math.round(w * scale));
  const ch = Math.max(1, Math.round(h * scale));
  const canvas = document.createElement('canvas');
  canvas.width = cw;
  canvas.height = ch;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('This browser cannot crop images.');
  ctx.imageSmoothingQuality = 'high';
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, cw, ch);
  ctx.drawImage(source, x, y, w, h, 0, 0, cw, ch); // straight from the original's pixels

  const stem = baseName.replace(/\.[^.]+$/, '').replace(/[^\w-]+/g, '_').slice(0, 40) || 'crop';
  const size = suggestSize({ x, y, w, h }, full.w);

  if (prefer === 'png') {
    const png = await toBlob(canvas, 'image/png');
    if (png && png.size <= MAX_BYTES) return { blob: png, filename: `${stem}-crop.png`, width: cw, height: ch, size };
  }
  for (const q of [0.92, 0.85, 0.78, 0.7, 0.6]) {
    const jpg = await toBlob(canvas, 'image/jpeg', q);
    if (jpg && jpg.size <= MAX_BYTES) return { blob: jpg, filename: `${stem}-crop.jpg`, width: cw, height: ch, size };
  }
  throw new Error('That crop is too large to attach. Try a smaller box.');
}