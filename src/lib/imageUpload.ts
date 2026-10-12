// Gets a picked image ready to upload: PNG or JPEG, at most ~2400px on the long side and
// under the server's size limit. Phone photos are large, so they are scaled down here.
// Small files are sent untouched.

export const UPLOAD_MAX_BYTES = 2.8 * 1024 * 1024; // server limit is 3 MB
const MAX_SIDE = 2400;

export interface PreparedImage {
  blob: Blob;
  filename: string;
  width: number;
  height: number;
}

function loadImage(file: Blob): Promise<{ img: HTMLImageElement; revoke: () => void }> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => resolve({ img, revoke: () => URL.revokeObjectURL(url) });
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('That image could not be read. Try a PNG or JPEG.'));
    };
    img.src = url; // the browser applies the photo's rotation (EXIF) when it draws the image
  });
}

function toBlob(canvas: HTMLCanvasElement, type: string, quality?: number): Promise<Blob | null> {
  return new Promise(resolve => canvas.toBlob(resolve, type, quality));
}

// Phone photos can carry a hidden "rotate me" flag (EXIF orientation). Browsers obey it when
// showing the picture, but other tools (Word, servers) may not, so such files are re-drawn upright.
async function jpegOrientation(file: Blob): Promise<number> {
  try {
    const v = new DataView(await file.slice(0, 65536).arrayBuffer());
    if (v.getUint16(0) !== 0xffd8) return 1;
    let off = 2;
    while (off + 4 < v.byteLength) {
      const marker = v.getUint16(off);
      if ((marker & 0xff00) !== 0xff00) break;
      if (marker === 0xffe1 && v.getUint32(off + 4) === 0x45786966) {
        const tiff = off + 10;
        const little = v.getUint16(tiff) === 0x4949;
        const ifd = tiff + v.getUint32(tiff + 4, little);
        const count = v.getUint16(ifd, little);
        for (let i = 0; i < count; i++) {
          const entry = ifd + 2 + i * 12;
          if (v.getUint16(entry, little) === 0x0112) return v.getUint16(entry + 8, little);
        }
        return 1;
      }
      off += 2 + v.getUint16(off + 2);
    }
  } catch {
    // unreadable header: treat as upright
  }
  return 1;
}

export async function prepareImageForUpload(file: File): Promise<PreparedImage> {
  if (file.type !== 'image/png' && file.type !== 'image/jpeg') {
    throw new Error('Please choose a PNG or JPEG image.');
  }
  const { img, revoke } = await loadImage(file);
  try {
    const w = img.naturalWidth;
    const h = img.naturalHeight;
    if (!w || !h) throw new Error('That image could not be read. Try a PNG or JPEG.');

    const scale = Math.min(1, MAX_SIDE / Math.max(w, h));
    const needsUpright = file.type === 'image/jpeg' && (await jpegOrientation(file)) > 1;
    // Already small enough and upright: upload the original bytes (keeps crops and diagrams perfectly sharp)
    if (scale === 1 && file.size <= UPLOAD_MAX_BYTES && !needsUpright) {
      return { blob: file, filename: file.name, width: w, height: h };
    }

    const cw = Math.max(1, Math.round(w * scale));
    const ch = Math.max(1, Math.round(h * scale));
    const canvas = document.createElement('canvas');
    canvas.width = cw;
    canvas.height = ch;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('This browser cannot resize images.');
    ctx.imageSmoothingQuality = 'high';

    // A PNG that only needed scaling stays PNG if it fits (diagrams, text, equations)
    if (file.type === 'image/png') {
      ctx.drawImage(img, 0, 0, cw, ch);
      const png = await toBlob(canvas, 'image/png');
      if (png && png.size <= UPLOAD_MAX_BYTES) {
        return { blob: png, filename: file.name.replace(/\.\w+$/, '') + '.png', width: cw, height: ch };
      }
    }
    // Photos (and PNGs that are still too big): JPEG on white, lowering quality until it fits
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, cw, ch);
    ctx.drawImage(img, 0, 0, cw, ch);
    for (const q of [0.92, 0.85, 0.78, 0.7, 0.62, 0.55]) {
      const jpg = await toBlob(canvas, 'image/jpeg', q);
      if (jpg && jpg.size <= UPLOAD_MAX_BYTES) {
        return { blob: jpg, filename: file.name.replace(/\.\w+$/, '') + '.jpg', width: cw, height: ch };
      }
    }
    throw new Error('That image is too large. Try a smaller or cropped picture.');
  } finally {
    revoke();
  }
}