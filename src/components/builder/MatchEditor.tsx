'use client';
// components/builder/MatchEditor.tsx
// Editor for "Match the following": Column A (numbered 1. 2. 3.) and Column B (lettered (a) (b) (c)),
// column headings, and an optional "(      )" answer bracket. Pasting two columns from Excel or Sheets
// fills both. The data is optional (question.match), so saved papers without it are untouched.

import React from 'react';
import toast from 'react-hot-toast';
import type { Question, QuestionMatch } from '@/store/paperStore';
import { MATCH_LIMITS, matchLetter } from '@/lib/paperRenderer';

interface Props {
  question: Question;
  onUpdate: (u: Partial<Question>) => void;
}

const BORDER = '1px solid hsl(217 33% 18%)';

const field: React.CSSProperties = {
  flex: 1, minWidth: 0, minHeight: '34px', boxSizing: 'border-box', background: 'hsl(222 30% 14%)',
  border: BORDER, borderRadius: '6px', padding: '6px 8px', color: '#f1f5f9', fontSize: '12px', fontFamily: 'inherit',
};

const small = (disabled = false): React.CSSProperties => ({
  fontSize: '11px', fontWeight: 600, borderRadius: '6px', height: '34px', padding: '0 10px', cursor: disabled ? 'default' : 'pointer',
  color: '#94a3b8', background: 'hsl(222 30% 14%)', border: BORDER, opacity: disabled ? 0.35 : 1,
});

type Side = 'left' | 'right';

/** Pasted rows without the numbering the layout adds itself ("1." on the left, "(a)" on the right). */
const stripNumber = (side: Side, v: string) =>
  v.trim().replace(side === 'left' ? /^\(?\d{1,2}[.)]\s*/ : /^\(?[a-jA-J][.)]\s*/, '');

export function MatchEditor({ question, onUpdate }: Props) {
  const m = question.match;
  const left = m?.left ?? ['', '', '', ''];
  const right = m?.right ?? ['', '', '', '', ''];
  const leftTitle = m?.leftTitle === undefined ? 'Column A' : m.leftTitle;
  const rightTitle = m?.rightTitle === undefined ? 'Column B' : m.rightTitle;
  const answerBox = m?.answerBox !== false;

  const save = (patch: Partial<QuestionMatch>) =>
    onUpdate({ match: { ...(m ?? {}), left, right, ...patch } as QuestionMatch });

  const col = (side: Side) => (side === 'left' ? left : right);
  const setCol = (side: Side, items: string[]) => save({ [side]: items } as Partial<QuestionMatch>);

  const setItem = (side: Side, i: number, v: string) =>
    setCol(side, col(side).map((x, j) => (j === i ? v : x)));
  const addItem = (side: Side) => {
    if (col(side).length >= MATCH_LIMITS.maxItems) {
      toast.error(`At most ${MATCH_LIMITS.maxItems} items in a column.`);
      return;
    }
    setCol(side, [...col(side), '']);
  };
  const removeItem = (side: Side, i: number) => {
    if (col(side).length <= 1) return;
    setCol(side, col(side).filter((_, j) => j !== i));
  };

  /** Paste from Excel or Sheets: two columns fill A and B from the clicked row; one column fills this side. */
  const onPaste = (e: React.ClipboardEvent, side: Side, row: number) => {
    const text = e.clipboardData.getData('text').replace(/\r\n?/g, '\n').replace(/\n+$/, '');
    if (!/[\t\n]/.test(text)) return; // a plain one-item paste: let the browser do it
    e.preventDefault();
    const rows = text.split('\n').map(r => r.split('\t'));
    const twoColumns = rows.some(r => r.length > 1);
    const cap = (items: string[], at: number, incoming: string[], s: Side) => {
      const next = items.slice();
      incoming.forEach((v, k) => { next[at + k] = stripNumber(s, v).slice(0, MATCH_LIMITS.maxChars); });
      for (let k = 0; k < next.length; k++) if (next[k] === undefined) next[k] = '';
      if (next.length > MATCH_LIMITS.maxItems) {
        toast.error('Pasted data was cut to fit the limit.');
        return next.slice(0, MATCH_LIMITS.maxItems);
      }
      return next;
    };
    if (twoColumns) {
      save({
        left: cap(left, row, rows.map(r => r[0] ?? ''), 'left'),
        right: cap(right, row, rows.map(r => r[1] ?? ''), 'right'),
      });
    } else {
      setCol(side, cap(col(side), row, rows.map(r => r[0] ?? ''), side));
    }
  };

  const column = (side: Side) => {
    const items = col(side);
    const title = side === 'left' ? leftTitle : rightTitle;
    return (
      <div style={{ flex: '1 1 230px', minWidth: 0 }}>
        <input
          value={title}
          maxLength={60}
          placeholder={side === 'left' ? 'Column A' : 'Column B'}
          aria-label={side === 'left' ? 'Column A heading' : 'Column B heading'}
          onChange={e => save(side === 'left' ? { leftTitle: e.target.value } : { rightTitle: e.target.value })}
          style={{ ...field, flex: 'none', width: '100%', fontWeight: 700, marginBottom: '6px' }}
        />
        {items.map((v, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '5px', marginBottom: '5px' }}>
            <span style={{ width: '26px', fontSize: '12px', fontWeight: 700, color: '#60a5fa', flexShrink: 0 }}>
              {side === 'left' ? `${i + 1}.` : `(${matchLetter(i)})`}
            </span>
            <input
              value={v}
              maxLength={MATCH_LIMITS.maxChars}
              aria-label={`${side === 'left' ? 'Column A' : 'Column B'} item ${i + 1}`}
              onChange={e => setItem(side, i, e.target.value)}
              onPaste={e => onPaste(e, side, i)}
              style={field}
            />
            <button type="button" aria-label="Remove item" disabled={items.length <= 1}
              onClick={() => removeItem(side, i)} style={{ ...small(items.length <= 1), width: '34px', padding: 0 }}>
              ×
            </button>
          </div>
        ))}
        <button type="button" style={small()} onClick={() => addItem(side)}>+ Item</button>
      </div>
    );
  };

  return (
    <div style={{ marginTop: '8px', border: BORDER, borderRadius: '8px', padding: '8px' }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
        <span style={{ fontSize: '10px', color: '#64748b', marginRight: 'auto' }}>
          Match the following · up to {MATCH_LIMITS.maxItems} items per column · paste two columns from Excel
        </span>
        <label style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '11px', color: '#94a3b8', minHeight: '34px' }}>
          <input type="checkbox" checked={answerBox} onChange={e => save({ answerBox: e.target.checked })} />
          Answer bracket ( )
        </label>
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px' }}>
        {column('left')}
        {column('right')}
      </div>
    </div>
  );
}