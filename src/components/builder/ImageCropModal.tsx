'use client';

import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useSourcePagesStore, sourceKind } from '@/store/sourcePagesStore';
import { openPdf } from '@/lib/pdfPages';
import type { OpenPdf } from '@/lib/pdfPages';
import { cropToPicture, MIN_CROP_PX, sourceSize } from '@/lib/cropImage';
import type { CropRect, CroppedPicture, SourceElement } from '@/lib/cropImage';

// How the teacher marks the picture: drag a box on the page (mouse or finger), then fine-tune
// it by its corners and edges. The page is shown scaled to fit the screen, but the box is kept in
// pixels of the ORIGINAL page, so the cut-out always comes from the full-resolution original.

type Handle = 'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w';
type Drag =
  | { kind: 'new'; ax: number; ay: number }
  | { kind: 'move'; ox: number; oy: number; start: CropRect }
  | { kind: 'resize'; handle: Handle; start: CropRect };

const HIT_PX = 18; // how close (on screen) a finger or mouse must be to grab a corner or edge
const ZOOMS = [1, 1.5, 2, 3, 4];
const PDF_RENDER_WIDTH = 2400;

const btn: React.CSSProperties = {
  minHeight: '40px', padding: '0 14px', borderRadius: '8px', fontSize: '13px', fontWeight: 600, cursor: 'pointer',
  border: '1px solid hsl(217 33% 28%)', background: 'hsl(222 47% 12%)', color: '#cbd5e1',
};

interface Props {
  onClose: () => void;
  onCropped: (picture: CroppedPicture) => void;
}

export function ImageCropModal({ onClose, onCropped }: Props) {
  const sources = useSourcePagesStore(s => s.sources);
  const lastView = useSourcePagesStore(s => s.lastView);
  const setLastView = useSourcePagesStore(s => s.setLastView);
  const addSource = useSourcePagesStore(s => s.addSource);

  const [sourceId, setSourceId] = useState<string | null>(() => {
    const ok = lastView && sources.some(s => s.id === lastView.sourceId);
    return ok ? lastView!.sourceId : sources[0]?.id ?? null;
  });
  const [pageNo, setPageNo] = useState(() => (lastView && sources.some(s => s.id === lastView.sourceId) ? lastView.page : 1));
  const [pageCount, setPageCount] = useState(1);
  const [el, setEl] = useState<SourceElement | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const [mode, setMode] = useState<'draw' | 'move'>('draw');
  const [box, setBox] = useState<CropRect | null>(null);
  const [cutting, setCutting] = useState(false);
  const [areaWidth, setAreaWidth] = useState(0);

  const pdfRef = useRef<{ id: string; doc: OpenPdf } | null>(null);
  const urlRef = useRef<string | null>(null);
  const areaRef = useRef<HTMLDivElement>(null);
  const hostRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const dragRef = useRef<Drag | null>(null);

  const source = sources.find(s => s.id === sourceId) ?? null;

  // ── load the chosen page (image, or one page of a PDF) ──
  useEffect(() => {
    if (!source) {
      setEl(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    setBox(null);
    (async () => {
      try {
        let element: SourceElement;
        if (source.kind === 'image') {
          const url = URL.createObjectURL(source.file);
          const img = new Image();
          await new Promise<void>((resolve, reject) => {
            img.onload = () => resolve();
            img.onerror = () => reject(new Error('That image could not be opened.'));
            img.src = url;
          });
          if (cancelled) {
            URL.revokeObjectURL(url);
            return;
          }
          if (urlRef.current) URL.revokeObjectURL(urlRef.current);
          urlRef.current = url;
          element = img;
          setPageCount(1);
        } else {
          if (!pdfRef.current || pdfRef.current.id !== source.id) {
            pdfRef.current?.doc.destroy();
            pdfRef.current = { id: source.id, doc: await openPdf(source.file) };
          }
          const doc = pdfRef.current.doc;
          if (cancelled) return;
          setPageCount(doc.pageCount);
          const n = Math.min(Math.max(pageNo, 1), doc.pageCount);
          element = await doc.renderPage(n, PDF_RENDER_WIDTH);
        }
        if (cancelled) return;
        setEl(element);
        setLastView({ sourceId: source.id, page: pageNo });
      } catch (e) {
        if (!cancelled) {
          setEl(null);
          setError((e as Error)?.message || 'That file could not be opened.');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sourceId, pageNo, source?.id]);

  useEffect(
    () => () => {
      if (urlRef.current) URL.revokeObjectURL(urlRef.current);
      pdfRef.current?.doc.destroy();
    },
    []
  );

  // ── size of the visible area (the page is shown "fit to width" times the zoom) ──
  useLayoutEffect(() => {
    const node = areaRef.current;
    if (!node) return;
    const measure = () => setAreaWidth(node.clientWidth);
    measure();
    if (typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(measure);
    ro.observe(node);
    return () => ro.disconnect();
  }, []);

  const full = el ? sourceSize(el) : { w: 0, h: 0 };
  const dispW = Math.max(160, areaWidth - 24) * zoom;
  const scale = full.w ? dispW / full.w : 1;
  const dispH = full.h * scale;

  // the page itself (an <img> or the PDF page canvas) is placed in the stage
  useLayoutEffect(() => {
    const host = hostRef.current;
    if (!host || !el) return;
    el.style.cssText = `display:block;width:${dispW}px;height:${dispH}px;pointer-events:none;user-select:none;-webkit-user-drag:none;`;
    el.setAttribute('draggable', 'false');
    if (host.firstChild !== el) host.replaceChildren(el);
  }, [el, dispW, dispH]);

  // ── drawing, moving and resizing the box ──
  const toSource = (e: React.PointerEvent) => {
    const r = stageRef.current!.getBoundingClientRect();
    return {
      x: Math.min(Math.max((e.clientX - r.left) / scale, 0), full.w),
      y: Math.min(Math.max((e.clientY - r.top) / scale, 0), full.h),
    };
  };

  const hitTest = (px: number, py: number): Drag | null => {
    if (!box) return null;
    const r = HIT_PX / scale;
    const { x, y, w, h } = box;
    const nearL = Math.abs(px - x) <= r, nearR = Math.abs(px - (x + w)) <= r;
    const nearT = Math.abs(py - y) <= r, nearB = Math.abs(py - (y + h)) <= r;
    const inX = px >= x - r && px <= x + w + r, inY = py >= y - r && py <= y + h + r;
    let handle: Handle | null = null;
    if (nearT && nearL) handle = 'nw';
    else if (nearT && nearR) handle = 'ne';
    else if (nearB && nearL) handle = 'sw';
    else if (nearB && nearR) handle = 'se';
    else if (nearT && inX) handle = 'n';
    else if (nearB && inX) handle = 's';
    else if (nearL && inY) handle = 'w';
    else if (nearR && inY) handle = 'e';
    if (handle) return { kind: 'resize', handle, start: { ...box } };
    if (px >= x && px <= x + w && py >= y && py <= y + h) return { kind: 'move', ox: px, oy: py, start: { ...box } };
    return null;
  };

  const onPointerDown = (e: React.PointerEvent) => {
    if (!el || (e.pointerType === 'mouse' && e.button !== 0)) return;
    const { x, y } = toSource(e);
    dragRef.current = hitTest(x, y) ?? { kind: 'new', ax: x, ay: y };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    e.preventDefault();
  };

  const onPointerMove = (e: React.PointerEvent) => {
    const d = dragRef.current;
    if (!d || !el) return;
    const { x, y } = toSource(e);
    if (d.kind === 'new') {
      setBox({ x: Math.min(d.ax, x), y: Math.min(d.ay, y), w: Math.abs(x - d.ax), h: Math.abs(y - d.ay) });
    } else if (d.kind === 'move') {
      const s = d.start;
      const nx = Math.min(Math.max(s.x + (x - d.ox), 0), full.w - s.w);
      const ny = Math.min(Math.max(s.y + (y - d.oy), 0), full.h - s.h);
      setBox({ x: nx, y: ny, w: s.w, h: s.h });
    } else {
      const s = d.start;
      let left = s.x, top = s.y, right = s.x + s.w, bottom = s.y + s.h;
      if (d.handle.includes('w')) left = Math.min(x, right - 1);
      if (d.handle.includes('e')) right = Math.max(x, left + 1);
      if (d.handle.includes('n')) top = Math.min(y, bottom - 1);
      if (d.handle.includes('s')) bottom = Math.max(y, top + 1);
      setBox({ x: left, y: top, w: right - left, h: bottom - top });
    }
  };

  const onPointerUp = (e: React.PointerEvent) => {
    const d = dragRef.current;
    dragRef.current = null;
    try {
      (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {
      // already released
    }
    // a tap or a tiny accidental drag is not a box
    if (d?.kind === 'new' && box && (box.w * scale < 10 || box.h * scale < 10)) setBox(null);
  };

  const choosePage = (file: File | undefined) => {
    if (!file) return;
    if (!sourceKind(file)) {
      setError('Please choose a photo, scan or PDF.');
      return;
    }
    const s = addSource(file);
    if (s) {
      setSourceId(s.id);
      setPageNo(1);
      setError(null);
    }
  };

  const useBox = useCallback(async () => {
    if (!el || !box || !source) return;
    setCutting(true);
    try {
      const prefer = source.kind === 'pdf' || source.file.type === 'image/png' ? 'png' : 'jpeg';
      const picture = await cropToPicture(el, box, prefer, source.name);
      onCropped(picture);
    } catch (e) {
      setError((e as Error)?.message || 'Could not cut out the picture.');
    } finally {
      setCutting(false);
    }
  }, [el, box, source, onCropped]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const boxOk = !!box && box.w >= MIN_CROP_PX && box.h >= MIN_CROP_PX;
  const zoomIndex = Math.max(0, ZOOMS.indexOf(zoom));
  const handles: Array<[Handle, number, number]> = box
    ? [
        ['nw', 0, 0], ['n', 0.5, 0], ['ne', 1, 0], ['e', 1, 0.5], ['se', 1, 1], ['s', 0.5, 1], ['sw', 0, 1], ['w', 0, 0.5],
      ]
    : [];

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Crop a picture"
      style={{ position: 'fixed', inset: 0, zIndex: 1000, background: '#020617', display: 'flex', flexDirection: 'column', color: '#e2e8f0' }}
    >
      <input ref={fileRef} type="file" accept="image/*,application/pdf" style={{ display: 'none' }} onChange={e => { choosePage(e.target.files?.[0]); e.target.value = ''; }} />

      {/* header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 12px', borderBottom: '1px solid hsl(217 33% 16%)' }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 700, fontSize: '14px' }}>Crop a picture</div>
          <div style={{ fontSize: '11px', color: '#94a3b8' }}>Drag a box over the diagram, equation or question.</div>
        </div>
        <button type="button" aria-label="Close" onClick={onClose} style={{ ...btn, width: '44px', padding: 0, fontSize: '16px' }}>✕</button>
      </div>

      {/* controls */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center', padding: '8px 12px' }}>
        {sources.length > 1 && (
          <select aria-label="Original file" value={sourceId ?? ''} onChange={e => { setSourceId(e.target.value); setPageNo(1); }} style={{ ...btn, maxWidth: '180px' }}>
            {sources.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        )}
        {source?.kind === 'pdf' && pageCount > 1 && (
          <>
            <button type="button" aria-label="Previous page" disabled={pageNo <= 1 || loading} onClick={() => setPageNo(p => Math.max(1, p - 1))} style={btn}>‹</button>
            <span style={{ fontSize: '12px', color: '#94a3b8' }}>Page {pageNo} of {pageCount}</span>
            <button type="button" aria-label="Next page" disabled={pageNo >= pageCount || loading} onClick={() => setPageNo(p => Math.min(pageCount, p + 1))} style={btn}>›</button>
          </>
        )}
        <button type="button" onClick={() => fileRef.current?.click()} style={btn}>{sources.length ? 'Choose another file…' : 'Choose the original file…'}</button>
        <span style={{ flex: 1 }} />
        <div role="group" aria-label="Touch mode" style={{ display: 'flex', gap: '4px' }}>
          <button type="button" aria-pressed={mode === 'draw'} onClick={() => setMode('draw')} style={{ ...btn, ...(mode === 'draw' ? { background: 'rgba(59,130,246,0.25)', borderColor: '#3b82f6', color: '#bfdbfe' } : {}) }}>✂ Draw box</button>
          <button type="button" aria-pressed={mode === 'move'} onClick={() => setMode('move')} style={{ ...btn, ...(mode === 'move' ? { background: 'rgba(59,130,246,0.25)', borderColor: '#3b82f6', color: '#bfdbfe' } : {}) }}>✋ Move page</button>
        </div>
        <div role="group" aria-label="Zoom" style={{ display: 'flex', gap: '4px' }}>
          <button type="button" aria-label="Zoom out" disabled={zoomIndex <= 0} onClick={() => setZoom(ZOOMS[Math.max(0, zoomIndex - 1)])} style={{ ...btn, width: '44px', padding: 0 }}>−</button>
          <button type="button" aria-label="Fit to screen" onClick={() => setZoom(1)} style={btn}>{Math.round(zoom * 100)}%</button>
          <button type="button" aria-label="Zoom in" disabled={zoomIndex >= ZOOMS.length - 1} onClick={() => setZoom(ZOOMS[Math.min(ZOOMS.length - 1, zoomIndex + 1)])} style={{ ...btn, width: '44px', padding: 0 }}>+</button>
        </div>
      </div>

      {/* the page */}
      <div ref={areaRef} data-testid="crop-area" style={{ flex: 1, overflow: 'auto', padding: '8px 12px', WebkitOverflowScrolling: 'touch', background: '#0b1220' }}>
        {loading && <div style={{ textAlign: 'center', color: '#94a3b8', padding: '40px 0', fontSize: '13px' }}>Opening the page…</div>}
        {!loading && !el && (
          <div style={{ textAlign: 'center', color: '#94a3b8', padding: '40px 16px', fontSize: '13px', lineHeight: 1.6 }}>
            {sources.length === 0 ? (
              <>
                <div style={{ marginBottom: '12px' }}>Choose the photo, scan or PDF you uploaded, and cut the picture out of it.</div>
                <button type="button" onClick={() => fileRef.current?.click()} style={{ ...btn, background: '#2563eb', borderColor: '#2563eb', color: '#fff', minHeight: '44px' }}>Choose the original file…</button>
                <div style={{ marginTop: '12px', fontSize: '11px' }}>Originals are kept only while this tab stays open.</div>
              </>
            ) : null}
          </div>
        )}
        {error && <div role="alert" style={{ margin: '8px auto', maxWidth: '520px', padding: '8px 12px', borderRadius: '8px', background: 'rgba(239,68,68,0.15)', color: '#fca5a5', fontSize: '12px', textAlign: 'center' }}>{error}</div>}
        {el && (
          <div
            ref={stageRef}
            data-testid="crop-stage"
            data-scale={scale}
            style={{ position: 'relative', width: `${dispW}px`, height: `${dispH}px`, margin: '0 auto', overflow: 'hidden', background: '#fff', boxShadow: '0 0 0 1px #334155' }}
          >
            <div ref={hostRef} style={{ position: 'absolute', inset: 0 }} />
            {box && (
              <div
                data-testid="crop-box"
                style={{ position: 'absolute', left: box.x * scale, top: box.y * scale, width: box.w * scale, height: box.h * scale, border: '2px solid #60a5fa', boxShadow: '0 0 0 9999px rgba(2,6,23,0.55)', pointerEvents: 'none', boxSizing: 'border-box' }}
              >
                {handles.map(([h, fx, fy]) => {
                  // small boxes get small handles so they do not cover the picture (grabbing still uses the larger hit area)
                  const hp = Math.round(Math.max(8, Math.min(14, (Math.min(box.w, box.h) * scale) / 6)));
                  return (
                    <div key={h} style={{ position: 'absolute', left: `calc(${fx * 100}% - ${hp / 2}px)`, top: `calc(${fy * 100}% - ${hp / 2}px)`, width: `${hp}px`, height: `${hp}px`, background: '#60a5fa', border: '2px solid #0b1220', borderRadius: '3px', boxSizing: 'border-box' }} />
                  );
                })}
              </div>
            )}
            {/* in "Move page" mode the touch passes through, so the page can be scrolled with a finger */}
            <div
              data-testid="crop-overlay"
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp}
              onPointerCancel={onPointerUp}
              style={{ position: 'absolute', inset: 0, cursor: 'crosshair', touchAction: 'none', pointerEvents: mode === 'draw' ? 'auto' : 'none' }}
            />
          </div>
        )}
      </div>

      {/* footer */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 12px', borderTop: '1px solid hsl(217 33% 16%)', flexWrap: 'wrap' }}>
        <div data-testid="crop-info" style={{ flex: 1, minWidth: '140px', fontSize: '12px', color: '#94a3b8' }}>
          {box ? `Selected ${Math.round(box.w)} × ${Math.round(box.h)} px of the original` : el ? 'No box yet' : ''}
        </div>
        <button type="button" disabled={!box} onClick={() => setBox(null)} style={btn}>Reset box</button>
        <button
          type="button"
          data-testid="crop-use"
          disabled={!boxOk || cutting}
          onClick={useBox}
          style={{ ...btn, minHeight: '44px', background: boxOk ? '#2563eb' : 'hsl(222 47% 12%)', borderColor: boxOk ? '#2563eb' : 'hsl(217 33% 28%)', color: boxOk ? '#fff' : '#64748b', cursor: boxOk ? 'pointer' : 'default' }}
        >
          {cutting ? 'Cutting…' : 'Use this picture'}
        </button>
      </div>
    </div>
  );
}