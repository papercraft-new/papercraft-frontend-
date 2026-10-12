// lib/attachFigures.ts
// Step 6: after smart extraction, the server tells us where each diagram sits on the page
// (question.figureBoxes, as fractions of the page). This cuts every figure out of the ORIGINAL
// upload (still in memory) at full resolution, uploads it like any other picture, and attaches it
// as a normal question image. figureBoxes is always removed afterwards, so it is never saved.
// Nothing here throws: a figure that cannot be cut is skipped and counted.

import { imagesApi } from '@/lib/api';
import { cropToPicture, sourceSize } from '@/lib/cropImage';
import type { SourceElement } from '@/lib/cropImage';
import { openPdf } from '@/lib/pdfPages';
import type { OpenPdf } from '@/lib/pdfPages';
import { IMAGE_LIMITS } from '@/lib/paperRenderer';
import { useSourcePagesStore } from '@/store/sourcePagesStore';
import type { Section, Question, QuestionImage } from '@/store/paperStore';

const PDF_PAGE_WIDTH_PX = 1800; // sharp enough to cut small diagrams, light enough for phones
const PADDING = 0.015; // a little air around each box (the boxes are estimates)

export interface AttachResult {
  sections: Section[];
  added: number;
  failed: number;
}

const withoutBoxes = (q: Question): Question => {
  const { figureBoxes: _unused, ...rest } = q;
  void _unused;
  return rest;
};

const stripAll = (sections: Section[]): Section[] =>
  sections.map(s => ({ ...s, questions: s.questions.map(withoutBoxes) }));

function loadImage(file: File, urls: string[]): Promise<HTMLImageElement> {
  const url = URL.createObjectURL(file);
  urls.push(url);
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Could not open the uploaded picture.'));
    img.src = url;
  });
}

export async function attachFigures(
  sections: Section[],
  onProgress?: (done: number, total: number) => void
): Promise<AttachResult> {
  const total = sections.reduce(
    (n, s) => n + s.questions.reduce((m, q) => m + (q.figureBoxes?.length ?? 0), 0),
    0
  );
  if (total === 0) return { sections: stripAll(sections), added: 0, failed: 0 };

  const sources = useSourcePagesStore.getState().sources;
  const urls: string[] = [];
  const images = new Map<number, HTMLImageElement>();
  const pdfs = new Map<number, OpenPdf>();
  let pageCache: { key: string; canvas: HTMLCanvasElement } | null = null;
  let done = 0;
  let added = 0;
  let failed = 0;
  let stopped = false; // set when the server says we are uploading too fast

  const elementFor = async (sourceIndex: number, page: number) => {
    const source = sources[sourceIndex] ?? (sources.length === 1 ? sources[0] : undefined);
    if (!source) throw new Error('The original file is no longer available.');
    let el: SourceElement;
    if (source.kind === 'pdf') {
      let pdf = pdfs.get(sourceIndex);
      if (!pdf) {
        pdf = await openPdf(source.file);
        pdfs.set(sourceIndex, pdf);
      }
      if (page > pdf.pageCount) throw new Error('Page not found.');
      const key = `${sourceIndex}:${page}`;
      if (pageCache?.key !== key) pageCache = { key, canvas: await pdf.renderPage(page, PDF_PAGE_WIDTH_PX) };
      el = pageCache.canvas;
    } else {
      let img = images.get(sourceIndex);
      if (!img) {
        img = await loadImage(source.file, urls);
        images.set(sourceIndex, img);
      }
      el = img;
    }
    return { source, el };
  };

  try {
    const outSections: Section[] = [];
    for (const section of sections) {
      const questions: Question[] = [];
      for (const question of section.questions) {
        const boxes = question.figureBoxes ?? [];
        const pictures: QuestionImage[] = [...(question.images ?? [])];
        const room = Math.max(0, IMAGE_LIMITS.perQuestion - pictures.length);
        for (const [i, box] of boxes.entries()) {
          if (i >= room || stopped) {
            failed++;
          } else {
            try {
              const { source, el } = await elementFor(box.sourceIndex ?? 0, box.page);
              const full = sourceSize(el);
              const x0 = Math.max(0, box.x - PADDING);
              const y0 = Math.max(0, box.y - PADDING);
              const x1 = Math.min(1, box.x + box.w + PADDING);
              const y1 = Math.min(1, box.y + box.h + PADDING);
              const prefer = source.kind === 'pdf' || source.file.type === 'image/png' ? 'png' : 'jpeg';
              const picture = await cropToPicture(
                el,
                { x: x0 * full.w, y: y0 * full.h, w: (x1 - x0) * full.w, h: (y1 - y0) * full.h },
                prefer,
                source.name
              );
              const res = await imagesApi.upload(picture.blob, picture.filename);
              const uploaded = res.data?.image as QuestionImage | undefined;
              if (!uploaded?.url) throw new Error('Upload failed.');
              pictures.push({ ...uploaded, size: picture.size, ...(box.caption ? { alt: box.caption } : {}) });
              added++;
            } catch (err) {
              failed++;
              if ((err as { response?: { status?: number } })?.response?.status === 429) stopped = true;
            }
          }
          done++;
          onProgress?.(done, total);
        }
        questions.push(withoutBoxes({ ...question, ...(pictures.length > 0 ? { images: pictures } : {}) }));
      }
      outSections.push({ ...section, questions });
    }
    return { sections: outSections, added, failed };
  } catch {
    // never block the extraction because of pictures
    return { sections: stripAll(sections), added, failed: Math.max(failed, total - added) };
  } finally {
    pdfs.forEach(p => p.destroy());
    urls.forEach(u => URL.revokeObjectURL(u));
  }
}