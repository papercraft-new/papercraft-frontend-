'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import { usePaperStore } from '@/store/paperStore';
import { buildPaperHtml } from '@/lib/paperRenderer';

// The paper is laid out at A4 width (210mm = 794 CSS px). On narrower screens the
// whole page is scaled down to fit, so phones see the full page width without
// sideways scrolling, and the iframe grows to its content height so only the page
// itself scrolls (nested iframe scrolling is unreliable on iOS/Android).
const PAPER_WIDTH_PX = 794;
const A4_HEIGHT_PX = 1123;

export function PaperPreview() {
  const { title, examDetails, sections, templateId, getTotalMarks } = usePaperStore();

  // Same HTML as the PDF export (preview = no print script).
  const html = useMemo(
    () =>
      buildPaperHtml(
        { title, totalMarks: getTotalMarks(), examDetails, sections },
        templateId
      ),
    [title, examDetails, sections, templateId, getTotalMarks]
  );

  const holderRef = useRef<HTMLDivElement>(null);
  const [holderWidth, setHolderWidth] = useState(PAPER_WIDTH_PX);
  const [contentHeight, setContentHeight] = useState(A4_HEIGHT_PX);

  // Track the available width so we can scale the page to fit.
  useEffect(() => {
    const el = holderRef.current;
    if (!el) return;
    const update = () => setHolderWidth(el.clientWidth || PAPER_WIDTH_PX);
    update();
    if (typeof ResizeObserver === 'undefined') {
      window.addEventListener('resize', update);
      return () => window.removeEventListener('resize', update);
    }
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [sections.length]);

  const scale = Math.min(1, holderWidth / PAPER_WIDTH_PX);

  // Measure the rendered paper and keep the iframe exactly as tall as its content.
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const roRef = useRef<ResizeObserver | null>(null);
  const measure = () => {
    const doc = iframeRef.current?.contentDocument;
    if (!doc?.body) return;
    // Measure the <body>, not the document element: documentElement.scrollHeight is
    // never smaller than the iframe's own height, so the preview could grow but
    // would never shrink after a shorter template or fewer questions.
    const h = Math.ceil(doc.body.getBoundingClientRect().height);
    if (h > 0) setContentHeight(h);
  };
  const handleLoad = () => {
    measure();
    const doc = iframeRef.current?.contentDocument;
    roRef.current?.disconnect();
    if (doc?.body && typeof ResizeObserver !== 'undefined') {
      roRef.current = new ResizeObserver(measure);
      roRef.current.observe(doc.body);
    }
    // Fonts can load after the first paint and change the height.
    doc?.fonts?.ready.then(measure).catch(() => {});
  };
  useEffect(() => () => roRef.current?.disconnect(), []);

  if (sections.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '30px', color: '#999', fontSize: '11px' }}>
        No questions yet. Add questions in the editor.
      </div>
    );
  }

  return (
    <div ref={holderRef} style={{ width: '100%' }}>
      <div
        style={{
          width: PAPER_WIDTH_PX * scale,
          height: contentHeight * scale,
          margin: '0 auto',
          overflow: 'hidden',
          background: '#fff',
          boxShadow: '0 4px 20px rgba(0,0,0,0.25)',
        }}
      >
        <iframe
          ref={iframeRef}
          title="Paper Preview"
          srcDoc={html}
          onLoad={handleLoad}
          scrolling="no"
          // No allow-scripts: question text is inserted as raw HTML, so this keeps
          // any markup inside it from running code. allow-same-origin only lets us
          // read the height.
          sandbox="allow-same-origin"
          style={{
            width: PAPER_WIDTH_PX,
            height: contentHeight,
            border: 'none',
            display: 'block',
            background: '#fff',
            transform: `scale(${scale})`,
            transformOrigin: 'top left',
          }}
        />
      </div>
    </div>
  );
}
