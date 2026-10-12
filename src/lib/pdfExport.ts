// lib/pdfExport.ts
// Converts a full standalone HTML document string (the same markup used for
// the desktop print/PDF flow) into an actual .pdf file, entirely client-side.
// This is used on mobile where window.open()+print() doesn't reliably let
// users save a PDF, so previously we fell back to downloading a raw .html
// file instead. This produces a real, ready-to-share .pdf file instead.
//
// How it works:
//  1. The paper is laid out off-screen at A4 width.
//  2. Pictures are copied into the page as embedded data (straight from the image host,
//     or through our own server when the host does not allow cross-origin use), so the
//     capture can never come out with blank pictures.
//  3. Pages are cut BETWEEN questions (never through one, never right after a section
//     heading) and each page is captured on its own, which also keeps every canvas small
//     enough for phones.

import toast from 'react-hot-toast';
import { imagesApi } from './api';

const PAGE_W_PX = 794; // 210 mm at 96 dpi: the width the paper is laid out at
const PAGE_H_PX = Math.round((PAGE_W_PX * 297) / 210); // 1123
const MARGIN_TOP_PX = 38; // top margin on continuation pages (about 10 mm)
const MARGIN_BOTTOM_PX = 38; // bottom margin on every page
const LOAD_TIMEOUT_MS = 20000;
const IMAGE_TIMEOUT_MS = 20000;

// ─────────────────────────────────────────
// PAGE BREAKS
// ─────────────────────────────────────────

/** Vertical positions (px from the top of the paper) where a new page may start. */
export function breakCandidates(doc: Document): number[] {
  const wrap = doc.querySelector('.paper-wrap');
  if (!wrap) return [];
  const scrollY = doc.defaultView?.scrollY ?? 0;
  const top = (el: Element) => Math.round(el.getBoundingClientRect().top + scrollY);
  const out = new Set<number>();
  for (const child of Array.from(wrap.children)) {
    out.add(top(child));
    if (child.classList.contains('section')) {
      // A section heading stays with its first question; later questions are free break points.
      const qs = Array.from(child.children).filter(c => c.classList.contains('question'));
      qs.slice(1).forEach(q => out.add(top(q)));
      // A question taller than a page (a long table) may also break between its table rows.
      const pageRoom = PAGE_H_PX - MARGIN_TOP_PX - MARGIN_BOTTOM_PX;
      qs.forEach(q => {
        if (q.getBoundingClientRect().height <= pageRoom) return;
        Array.from(q.querySelectorAll('.q-table tr, .q-match tr')).slice(1).forEach(tr => out.add(top(tr)));
      });
    }
  }
  return Array.from(out).sort((a, b) => a - b);
}

export interface PageSlice {
  start: number;
  end: number;
  topMargin: number;
}

/** Fills each page as far as it will go without cutting through a block. */
export function paginate(candidates: number[], totalHeight: number): PageSlice[] {
  const pages: PageSlice[] = [];
  let start = 0;
  while (start < totalHeight - 1) {
    const topMargin = pages.length === 0 ? 0 : MARGIN_TOP_PX;
    const usable = PAGE_H_PX - topMargin - MARGIN_BOTTOM_PX;
    let end: number;
    if (totalHeight - start <= PAGE_H_PX - topMargin) {
      end = totalHeight; // what is left fits on this page: no bottom margin needed (a one-page paper stays one page)
    } else {
      const limit = start + usable;
      let best = -1;
      for (const c of candidates) if (c > start + 40 && c <= limit) best = c;
      end = best > 0 ? best : limit; // nothing fits: hard cut (only for a block taller than a page)
    }
    pages.push({ start, end, topMargin });
    start = end;
  }
  return pages;
}

// ─────────────────────────────────────────
// PICTURES
// ─────────────────────────────────────────

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error('read failed'));
    reader.readAsDataURL(blob);
  });
}

const isPicture = (b: Blob) => /^image\/(png|jpeg)/i.test(b.type);

async function fetchPictureAsDataUrl(src: string): Promise<string | null> {
  // 1) Straight from the image host: works when the host allows cross-origin use.
  try {
    const ctl = new AbortController();
    const timer = setTimeout(() => ctl.abort(), IMAGE_TIMEOUT_MS);
    const res = await fetch(src, { mode: 'cors', signal: ctl.signal });
    clearTimeout(timer);
    if (res.ok) {
      const blob = await res.blob();
      if (isPicture(blob)) return await blobToDataUrl(blob);
    }
  } catch {
    // blocked or unreachable: fall through to our own server
  }
  // 2) Through our own server, which is allowed to fetch it and hands it back to us.
  try {
    const res = await imagesApi.proxy(src);
    const blob = res.data as Blob;
    if (blob && isPicture(blob)) return await blobToDataUrl(blob);
  } catch {
    // give up: the picture is marked in the PDF
  }
  return null;
}

/** Equations need the KaTeX stylesheet and its fonts before the page is captured. */
async function waitForMathAssets(doc: Document): Promise<void> {
  if (!doc.querySelector('.katex')) return;
  const links = Array.from(doc.querySelectorAll('link[rel="stylesheet"]')) as HTMLLinkElement[];
  await Promise.race([
    Promise.all(
      links.map(
        l =>
          new Promise<void>(res => {
            if (l.sheet) return res();
            l.addEventListener('load', () => res());
            l.addEventListener('error', () => res());
          })
      )
    ),
    new Promise<void>(r => setTimeout(r, 8000)),
  ]);
  await new Promise(r => setTimeout(r, 100)); // let the browser request the fonts it now needs
  try {
    await Promise.race([doc.fonts.ready, new Promise(r => setTimeout(r, 5000))]);
  } catch {
    /* capture anyway */
  }
}

/**
 * Replaces every picture's address with embedded data. A picture that cannot be loaded is
 * replaced by a visible "[Image could not be loaded]" box, never silently dropped.
 * Returns how many pictures failed.
 */
async function embedPictures(doc: Document): Promise<number> {
  const imgs = Array.from(doc.images).filter(i => i.getAttribute('src') && !i.src.startsWith('data:'));
  if (imgs.length === 0) return 0;
  const bySrc = new Map<string, Promise<string | null>>();
  for (const img of imgs) if (!bySrc.has(img.src)) bySrc.set(img.src, fetchPictureAsDataUrl(img.src));

  let failed = 0;
  await Promise.all(
    imgs.map(async img => {
      const data = await bySrc.get(img.src)!;
      if (data) {
        img.src = data;
        try {
          await img.decode();
        } catch {
          // a picture that cannot be decoded is handled by the capture itself
        }
      } else {
        failed++;
        const box = doc.createElement('div');
        box.textContent = '[Image could not be loaded]';
        box.style.cssText =
          'border:1px dashed #999;color:#888;font:italic 11px sans-serif;padding:10px;box-sizing:border-box;' +
          `width:${img.style.width || 'auto'};min-height:44px;flex:0 0 auto;`;
        img.replaceWith(box);
      }
    })
  );
  return failed;
}

// ─────────────────────────────────────────
// EXPORT
// ─────────────────────────────────────────

/**
 * Renders the given HTML document string off-screen and exports it as a
 * paginated A4 PDF, then triggers a browser download.
 *
 * @param fullHtml A complete HTML document (<!DOCTYPE html><html>...</html>)
 * @param filename Desired filename, should end in .pdf
 */
export async function downloadHtmlAsPdf(fullHtml: string, filename: string): Promise<void> {
  const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
    import('html2canvas'),
    import('jspdf'),
  ]);

  // The desktop flow relies on window.print() firing on load — strip that
  // out here since we're rendering into an offscreen iframe, not printing it.
  const htmlForRender = fullHtml.replace(/<script>[\s\S]*?<\/script>/gi, '');

  const iframe = document.createElement('iframe');
  iframe.style.position = 'fixed';
  iframe.style.top = '0';
  iframe.style.left = '-99999px';
  iframe.style.width = '210mm';
  iframe.style.height = '0';
  iframe.style.border = '0';
  iframe.setAttribute('aria-hidden', 'true');
  document.body.appendChild(iframe);

  try {
    await new Promise<void>((resolve, reject) => {
      // A picture that never answers must not hang the export: carry on after a while.
      const timer = setTimeout(() => resolve(), LOAD_TIMEOUT_MS);
      iframe.onload = () => {
        clearTimeout(timer);
        resolve();
      };
      iframe.onerror = () => {
        clearTimeout(timer);
        reject(new Error('Failed to render paper'));
      };
      iframe.srcdoc = htmlForRender;
    });

    const doc = iframe.contentDocument;
    const body = doc?.body;
    if (!doc || !body) {
      throw new Error('Could not access rendered paper content');
    }

    const failedPictures = await embedPictures(doc);
    await waitForMathAssets(doc);

    // Give fonts/layout a moment to settle before measuring & capturing.
    await new Promise((r) => setTimeout(r, 200));

    // Make sure the iframe box actually matches the content height so
    // html2canvas captures the full paper, not just the visible viewport.
    const fullHeight = Math.ceil(body.getBoundingClientRect().height);
    iframe.style.height = `${fullHeight}px`;
    await new Promise((r) => setTimeout(r, 50));

    const pages = paginate(breakCandidates(doc), fullHeight);
    const pdf = new jsPDF('p', 'mm', 'a4');
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pxToMm = pdfWidth / PAGE_W_PX;

    for (let i = 0; i < pages.length; i++) {
      const page = pages[i];
      // One page at a time: each canvas stays small, so phones do not run out of memory.
      const canvas = await html2canvas(body, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff',
        windowWidth: PAGE_W_PX,
        windowHeight: fullHeight,
        x: 0,
        y: page.start,
        width: PAGE_W_PX,
        height: page.end - page.start,
        scrollX: 0,
        scrollY: 0,
      });
      if (!canvas.width || !canvas.height) {
        throw new Error('This device ran out of memory while making the PDF. Try a shorter paper.');
      }
      if (i > 0) pdf.addPage();
      pdf.addImage(
        canvas.toDataURL('image/png'),
        'PNG',
        0,
        page.topMargin * pxToMm,
        pdfWidth,
        (canvas.height * pdfWidth) / canvas.width
      );
      canvas.width = 0; // release the memory right away
      canvas.height = 0;
    }

    pdf.save(filename);

    if (failedPictures > 0) {
      toast(`${failedPictures} picture${failedPictures > 1 ? 's' : ''} could not be loaded and ${failedPictures > 1 ? 'are' : 'is'} marked in the PDF.`, { icon: '⚠️', duration: 6000 });
    }
  } finally {
    document.body.removeChild(iframe);
  }
}