'use client';
// components/exam/QuestionView.tsx
// One question as the student sees it. Equations, images and tables use the same helpers as the PDF
// (paperRenderer.ts), so they look the same. Used for the live exam and for the review after submit.

import React, { useEffect, useState } from 'react';
import {
  mathToHtml, tableGrid, tableHasHeader, tableColumnPercents, imageWidthPct,
  QUESTION_IMAGE_PCT, OPTION_IMAGE_PCT,
} from '@/lib/paperRenderer';
import type { ExamQuestion, ExamImage, ExamTable } from '@/lib/publicTestApi';

// Question text is written by a teacher and shown on a public page, so it is escaped. The plain
// formatting tags that papers use (bold, italic, underline, sub/superscript, line break) still work.
const KEEP = /(<\/?(?:b|i|u|em|strong|sub|sup)>|<br\s*\/?>)/gi;
function escPlain(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
// Line breaks are turned into <br> here, on the plain-text pieces only. They must NOT be replaced in the
// finished HTML: KaTeX draws a square root with an SVG path whose data contains line breaks, and a <br>
// inside it destroys the drawing (the root sign and its bar disappear).
function escKeepTags(s: string): string {
  return s
    .split(KEEP)
    .map((part, i) => (i % 2 === 1 ? part.toLowerCase().replace(/<br\s*\/?>/, '<br>') : escPlain(part).replace(/\r?\n/g, '<br>')))
    .join('');
}
export function questionHtml(text: string): string {
  return mathToHtml(text || '', escKeepTags);
}

function safeSrc(url: unknown): string {
  if (typeof url !== 'string') return '';
  const u = url.trim();
  const ok = /^https?:\/\//i.test(u) || /^data:image\/(png|jpe?g|gif|webp);base64,[a-z0-9+/=]+$/i.test(u);
  return ok ? u : '';
}

function Html({ html, className }: { html: string; className?: string }) {
  return <div className={`exam-html ${className || ''}`} dangerouslySetInnerHTML={{ __html: html }} />;
}

function QuestionTables({ tables }: { tables?: ExamTable[] }) {
  if (!tables?.length) return null;
  return (
    <>
      {tables.map((t, ti) => {
        const grid = tableGrid(t);
        if (!grid.length || !grid[0].length) return null;
        const pcts = tableColumnPercents(grid);
        const head = tableHasHeader(t);
        const cell: React.CSSProperties = {
          border: '1px solid #333', padding: '3px 6px', verticalAlign: 'top', textAlign: 'left', overflowWrap: 'anywhere',
        };
        return (
          <div key={ti} className="my-3 overflow-x-auto">
            <table style={{ borderCollapse: 'collapse', tableLayout: 'fixed', width: '100%', minWidth: grid[0].length * 72 }} className="text-sm">
              <colgroup>{pcts.map((p, i) => <col key={i} style={{ width: `${p}%` }} />)}</colgroup>
              {head && (
                <thead>
                  <tr>
                    {grid[0].map((c, ci) => (
                      <th key={ci} style={{ ...cell, fontWeight: 'bold', background: '#eeeeee' }} dangerouslySetInnerHTML={{ __html: questionHtml(c) }} />
                    ))}
                  </tr>
                </thead>
              )}
              <tbody>
                {grid.slice(head ? 1 : 0).map((r, ri) => (
                  <tr key={ri}>
                    {r.map((c, ci) => (
                      <td key={ci} style={cell} dangerouslySetInnerHTML={{ __html: questionHtml(c) }} />
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      })}
    </>
  );
}

function QuestionImages({ images, onZoom }: { images?: ExamImage[]; onZoom: (src: string) => void }) {
  const items = (images || []).filter(i => safeSrc(i?.url));
  if (!items.length) return null;
  return (
    <div className="my-3 flex flex-wrap items-start gap-x-3 gap-y-2">
      {items.map(img => {
        const pct = imageWidthPct(img, QUESTION_IMAGE_PCT[img.size || 'medium'] ?? QUESTION_IMAGE_PCT.medium, 150, 110);
        const src = safeSrc(img.url);
        return (
          <button key={img.id} type="button" onClick={() => onZoom(src)} style={{ width: `${pct}%`, maxWidth: '100%', minWidth: 120 }} className="block cursor-zoom-in">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={src} alt={img.alt || 'Question figure'} className="block h-auto w-full" />
          </button>
        );
      })}
    </div>
  );
}

const NUMBER_RE = /^-?(\d+\.?\d*|\.\d+)$/; // a finished number: "12", "-3.5", ".5", "7."
const TYPING_RE = /^-?\d*\.?\d*$/;            // what may be typed on the way there

/** The answer box of a numerical question. It keeps what is being typed, and only a finished number counts as an answer. */
function NumberAnswer({ q, selected, onSelect, correct }: { q: ExamQuestion; selected: string | null; onSelect?: (v: string | null) => void; correct?: string }) {
  const [text, setText] = useState(selected ?? '');
  useEffect(() => {
    if (selected !== null && selected !== text) setText(selected);          // loaded or restored
    else if (selected === null && NUMBER_RE.test(text)) setText('');        // Clear Response
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected]);

  const review = correct !== undefined;
  const answer = review ? Number(correct) : NaN;
  const mine = selected !== null ? Number(selected) : NaN;
  const right = review && Number.isFinite(mine) && Math.abs(mine - answer) <= (q.tolerance || 0) + 1e-9;
  const tone = !review ? 'border-slate-300 focus:border-blue-600' : selected === null ? 'border-slate-300' : right ? 'border-emerald-500 bg-emerald-50' : 'border-red-500 bg-red-50';

  return (
    <div className="mt-4 sm:pl-8">
      <label htmlFor={`nat-${q.id}`} className="text-sm font-semibold text-slate-700">Your answer (a number)</label>
      <input
        id={`nat-${q.id}`}
        type="text"
        inputMode="decimal"
        autoComplete="off"
        spellCheck={false}
        readOnly={!onSelect}
        value={text}
        placeholder="e.g. 12.5"
        maxLength={20}
        onChange={e => {
          const v = e.target.value.trim();
          if (!TYPING_RE.test(v)) return;
          setText(v);
          onSelect?.(NUMBER_RE.test(v) ? v : null);
        }}
        className={`mt-1 block w-full max-w-xs rounded-xl border-2 bg-white px-3 py-3 text-lg font-semibold text-slate-900 outline-none ${tone}`}
      />
      {review && (
        <div className="mt-2 text-sm">
          {selected === null && <div className="font-semibold text-slate-500">You skipped this question.</div>}
          <div className="text-emerald-700">
            Correct answer: <b>{correct}</b>
            {q.tolerance ? <span> (any value within ± {q.tolerance} is accepted)</span> : null}
          </div>
        </div>
      )}
    </div>
  );
}

interface Props {
  q: ExamQuestion;
  selected: string | null;
  /** Omit for a read-only question (review). Gets the new answer, or null when it is cleared. */
  onSelect?: (value: string | null) => void;
  /** Review mode: the correct answer (a label, labels like "a,c", or a number). */
  correct?: string;
}

export default function QuestionView({ q, selected, onSelect, correct }: Props) {
  const [zoom, setZoom] = useState<string | null>(null);
  const kind = q.kind || 'SCQ';
  const multi = kind === 'MSQ';
  const picked = new Set((selected || '').split(',').filter(Boolean));
  const correctSet = new Set(correct !== undefined && kind !== 'NAT' ? correct.split(',') : []);

  const choose = (label: string) => {
    if (!onSelect) return;
    if (!multi) { onSelect(label); return; }
    const next = new Set(picked);
    if (next.has(label)) next.delete(label); else next.add(label);
    onSelect(next.size ? Array.from(next).sort().join(',') : null);
  };

  return (
    <div>
      <div className="flex gap-3">
        <span className="shrink-0 pt-px text-base font-bold text-slate-900">{q.no}.</span>
        <div className="min-w-0 flex-1">
          <Html html={questionHtml(q.text)} className="text-base leading-relaxed text-slate-900" />
          <QuestionTables tables={q.tables} />
          <QuestionImages images={q.images} onZoom={setZoom} />
        </div>
      </div>

      {kind === 'NAT' ? (
        <NumberAnswer q={q} selected={selected} onSelect={onSelect} correct={correct} />
      ) : (
      <div role={multi ? 'group' : 'radiogroup'} aria-label={`Options for question ${q.no}`} className="mt-4 space-y-2 sm:pl-8">
        {multi && !onSelect ? null : multi && <div className="text-sm font-semibold text-slate-600">More than one option may be correct. Select all that apply.</div>}
        {q.options.map((o, i) => {
          const isSel = picked.has(o.label);
          const isCorrect = correct !== undefined && correctSet.has(o.label);
          const isWrongPick = correct !== undefined && isSel && !isCorrect;
          const tone = isCorrect
            ? 'border-emerald-500 bg-emerald-50'
            : isWrongPick
            ? 'border-red-500 bg-red-50'
            : isSel
            ? 'border-blue-600 bg-blue-50'
            : 'border-slate-300 bg-white active:bg-slate-50 sm:hover:border-slate-400';
          const chip = isCorrect
            ? 'bg-emerald-600 text-white'
            : isWrongPick
            ? 'bg-red-600 text-white'
            : isSel
            ? 'bg-blue-600 text-white'
            : 'bg-slate-200 text-slate-700';
          const src = safeSrc(o.image?.url);
          const imgPct = o.image ? imageWidthPct(o.image, OPTION_IMAGE_PCT[o.image.size || 'medium'] ?? OPTION_IMAGE_PCT.medium, 80, 45) : 0;
          return (
            <button
              key={o.label}
              type="button"
              role={multi ? 'checkbox' : 'radio'}
              aria-checked={isSel}
              disabled={!onSelect}
              onClick={() => choose(o.label)}
              className={`flex w-full items-start gap-3 rounded-xl border-2 px-3 py-3 text-left transition-colors disabled:cursor-default ${tone}`}
              style={{ minHeight: 48 }}
            >
              <span className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center ${multi ? 'rounded-md' : 'rounded-full'} text-sm font-bold ${chip}`}>
                {String.fromCharCode(97 + i)}
              </span>
              <span className="min-w-0 flex-1 text-base text-slate-900">
                {o.text ? <Html html={questionHtml(o.text)} /> : null}
                {src && (
                  <span
                    role="presentation"
                    onClick={e => { e.stopPropagation(); setZoom(src); }}
                    className="mt-1 block cursor-zoom-in"
                    style={{ width: `${imgPct}%`, maxWidth: '100%', minWidth: 90 }}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={src} alt={o.image?.alt || `Option ${String.fromCharCode(97 + i)}`} className="block h-auto w-full" />
                  </span>
                )}
              </span>
              {isCorrect && <span className="shrink-0 pt-1 text-xs font-semibold text-emerald-700">{isSel || !multi ? 'Correct' : 'Missed'}</span>}
              {isWrongPick && <span className="shrink-0 pt-1 text-xs font-semibold text-red-700">Your answer</span>}
            </button>
          );
        })}
      </div>
      )}

      {zoom && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/80 p-3" onClick={() => setZoom(null)} role="dialog" aria-label="Enlarged picture">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={zoom} alt="Enlarged" className="max-h-full max-w-full rounded bg-white object-contain" />
          <button type="button" className="absolute right-3 top-3 rounded-full bg-white px-3 py-1 text-sm font-semibold text-slate-900" onClick={() => setZoom(null)}>
            Close
          </button>
        </div>
      )}
    </div>
  );
}