// Shows the pages of an original PDF inside the browser (pdf.js), sharp enough to crop from.
// pdf.js is large, so it is only loaded when the crop tool is first used with a PDF.

type PdfJs = typeof import('pdfjs-dist/legacy/build/pdf.mjs');

let libPromise: Promise<PdfJs> | null = null;
function loadPdfJs(): Promise<PdfJs> {
  if (!libPromise) {
    // The "legacy" build also runs on older iPhones and Android browsers.
    libPromise = import('pdfjs-dist/legacy/build/pdf.mjs').then(m => {
      m.GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/legacy/build/pdf.worker.min.mjs', import.meta.url).toString();
      return m;
    });
  }
  return libPromise;
}

export interface OpenPdf {
  pageCount: number;
  /** Draws one page (1-based) at the given width in pixels and returns the canvas. */
  renderPage: (pageNumber: number, targetWidthPx: number) => Promise<HTMLCanvasElement>;
  destroy: () => void;
}

export async function openPdf(file: File): Promise<OpenPdf> {
  const pdfjs = await loadPdfJs();
  const data = new Uint8Array(await file.arrayBuffer());
  // isEvalSupported:false keeps pdf.js from running any script text found inside a PDF
  const doc = await pdfjs.getDocument({ data, isEvalSupported: false }).promise;
  return {
    pageCount: doc.numPages,
    renderPage: async (pageNumber, targetWidthPx) => {
      const page = await doc.getPage(pageNumber);
      const base = page.getViewport({ scale: 1 });
      // sharp enough to crop small diagrams, but small enough for phones (iOS limit ~16M pixels)
      const scale = Math.min(Math.max(targetWidthPx / base.width, 0.5), 6);
      const viewport = page.getViewport({ scale });
      const canvas = document.createElement('canvas');
      canvas.width = Math.floor(viewport.width);
      canvas.height = Math.floor(viewport.height);
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('This browser cannot draw the PDF page.');
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      await page.render({ canvasContext: ctx, viewport }).promise;
      return canvas;
    },
    destroy: () => {
      void doc.destroy();
    },
  };
}