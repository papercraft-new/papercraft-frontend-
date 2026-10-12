'use client';
// components/builder/EquationHelper.tsx
// "∑ Equation" under a question: a symbol palette that types LaTeX into whichever text box of
// this question was last used (question text, an option or a table cell), plus a live preview.
// Equations are plain text in the existing fields ($x^2$ inline, $$x^2$$ on its own line),
// so nothing new is saved and old papers are unaffected.

import React, { useEffect, useMemo, useRef, useState } from 'react';
import 'katex/dist/katex.min.css';
import type { Question } from '@/store/paperStore';
import { katexHtml, splitMath } from '@/lib/paperRenderer';

interface Props {
  question: Question;
}

// "|" marks where the caret goes after inserting.
const STRUCTURES: Array<{ label: string; tex: string; title: string }> = [
  { label: 'a⁄b', tex: '\\frac{|}{}', title: 'Fraction' },
  { label: 'xⁿ', tex: '^{|}', title: 'Power' },
  { label: 'xₙ', tex: '_{|}', title: 'Subscript' },
  { label: '√', tex: '\\sqrt{|}', title: 'Square root' },
  { label: 'ⁿ√', tex: '\\sqrt[n]{|}', title: 'Nth root' },
  { label: '∑', tex: '\\sum_{i=1}^{n} |', title: 'Sum' },
  { label: '∫', tex: '\\int_{a}^{b} | \\,dx', title: 'Integral' },
  { label: 'lim', tex: '\\lim_{x \\to |}', title: 'Limit' },
  { label: 'v⃗', tex: '\\vec{|}', title: 'Vector' },
  { label: 'x̄', tex: '\\overline{|}', title: 'Bar' },
  { label: 'sin', tex: '\\sin |', title: 'sin' },
  { label: 'cos', tex: '\\cos |', title: 'cos' },
  { label: 'tan', tex: '\\tan |', title: 'tan' },
  { label: 'log', tex: '\\log_{|}', title: 'Logarithm' },
];

const SYMBOLS: Array<{ label: string; tex: string }> = [
  { label: '×', tex: '\\times ' }, { label: '÷', tex: '\\div ' }, { label: '±', tex: '\\pm ' },
  { label: '≤', tex: '\\leq ' }, { label: '≥', tex: '\\geq ' }, { label: '≠', tex: '\\neq ' },
  { label: '≈', tex: '\\approx ' }, { label: '→', tex: '\\rightarrow ' }, { label: '°', tex: '^\\circ' },
  { label: '∞', tex: '\\infty ' }, { label: '∠', tex: '\\angle ' }, { label: '△', tex: '\\triangle ' },
  { label: 'α', tex: '\\alpha ' }, { label: 'β', tex: '\\beta ' }, { label: 'γ', tex: '\\gamma ' },
  { label: 'θ', tex: '\\theta ' }, { label: 'λ', tex: '\\lambda ' }, { label: 'μ', tex: '\\mu ' },
  { label: 'π', tex: '\\pi ' }, { label: 'σ', tex: '\\sigma ' }, { label: 'φ', tex: '\\phi ' },
  { label: 'ω', tex: '\\omega ' }, { label: 'Δ', tex: '\\Delta ' }, { label: 'Ω', tex: '\\Omega ' },
];

type TextField = HTMLTextAreaElement | HTMLInputElement;

const isTextField = (el: Element | null): el is TextField =>
  !!el && (el.tagName === 'TEXTAREA' || (el.tagName === 'INPUT' && (el as HTMLInputElement).type === 'text'));

/** True when the caret sits inside an open $...$ (counting unescaped dollar signs before it). */
function insideMath(before: string): boolean {
  let n = 0;
  for (let i = 0; i < before.length; i++) {
    if (before[i] === '\\') { i++; continue; }
    if (before[i] === '$') n++;
  }
  return n % 2 === 1;
}

/** Sets a controlled field's value the way typing would, so React's onChange fires. */
function setNativeValue(el: TextField, value: string) {
  const proto = el.tagName === 'TEXTAREA' ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
  Object.getOwnPropertyDescriptor(proto, 'value')?.set?.call(el, value);
  el.dispatchEvent(new Event('input', { bubbles: true }));
}

export function EquationHelper({ question }: Props) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const lastField = useRef<TextField | null>(null);

  // remember which box of this question the teacher was typing in
  useEffect(() => {
    const card = rootRef.current?.parentElement;
    if (!card) return;
    const onFocusIn = (e: FocusEvent) => {
      const t = e.target as Element | null;
      if (isTextField(t) && !rootRef.current?.contains(t)) lastField.current = t;
    };
    card.addEventListener('focusin', onFocusIn);
    return () => card.removeEventListener('focusin', onFocusIn);
  }, []);

  const insert = (snippet: string) => {
    const card = rootRef.current?.parentElement;
    let el: TextField | null = lastField.current && card?.contains(lastField.current) ? lastField.current : null;
    if (!el) el = (card?.querySelector('textarea') as TextField | null) ?? null; // the question text
    if (!el) return;
    const start = el.selectionStart ?? el.value.length;
    const end = el.selectionEnd ?? start;
    const before = el.value.slice(0, start);
    const after = el.value.slice(end);
    const marker = snippet.indexOf('|');
    const clean = snippet.replace('|', '');
    const inside = insideMath(before);
    const next = before + (inside ? clean : `$${clean}$`) + after;
    const caret = start + (inside ? 0 : 1) + (marker === -1 ? clean.length : marker);
    setNativeValue(el, next);
    const target = el;
    requestAnimationFrame(() => requestAnimationFrame(() => {
      target.focus();
      target.setSelectionRange(caret, caret);
    }));
  };

  const parts = useMemo(
    () => (question.text && question.text.includes('$') ? splitMath(question.text) : []),
    [question.text]
  );
  const hasMath = parts.some(p => p.kind === 'math');

  const key: React.CSSProperties = {
    minWidth: '34px', height: '34px', padding: '0 8px', borderRadius: '6px', cursor: 'pointer',
    fontSize: '13px', color: '#e2e8f0', background: 'hsl(222 30% 14%)', border: '1px solid hsl(217 33% 18%)',
  };

  return (
    <div ref={rootRef} style={{ marginTop: '6px' }}>
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen(v => !v)}
        style={{
          fontSize: '11px', fontWeight: 600, color: '#60a5fa', background: 'rgba(59,130,246,0.1)',
          border: '1px solid rgba(59,130,246,0.25)', borderRadius: '6px', padding: '5px 10px',
          cursor: 'pointer', minHeight: '36px',
        }}
      >
        ∑ Equation
      </button>

      {open && (
        <div
          style={{ marginTop: '8px', border: '1px solid hsl(217 33% 18%)', borderRadius: '8px', padding: '8px' }}
          // keep the caret in the text box while a key is pressed
          onMouseDown={e => e.preventDefault()}
        >
          <div style={{ fontSize: '10px', color: '#64748b', marginBottom: '6px' }}>
            Goes into the box you last typed in. Type <b>$x^2$</b> yourself for an equation in a line, or <b>$$…$$</b> for one on its own line. Use <b>\$</b> for a real dollar sign.
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px', marginBottom: '6px' }}>
            {STRUCTURES.map(s => (
              <button key={s.title} type="button" title={s.title} aria-label={s.title} style={key} onClick={() => insert(s.tex)}>
                {s.label}
              </button>
            ))}
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
            {SYMBOLS.map(s => (
              <button key={s.tex} type="button" aria-label={s.tex.trim()} style={key} onClick={() => insert(s.tex)}>
                {s.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {hasMath && (
        <div
          style={{
            marginTop: '8px', padding: '8px 10px', borderRadius: '8px', background: '#fff', color: '#111',
            fontFamily: "'Times New Roman', serif", fontSize: '14px', lineHeight: 1.6, overflowX: 'auto',
          }}
        >
          {parts.map((p, i) =>
            p.kind === 'text' ? (
              <span key={i} style={{ whiteSpace: 'pre-wrap' }}>{p.text}</span>
            ) : (
              <span key={i} dangerouslySetInnerHTML={{ __html: katexHtml(p.latex, p.display) }} />
            )
          )}
        </div>
      )}
    </div>
  );
}