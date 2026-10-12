'use client';
// components/builder/TableEditor.tsx
// "+ Table" under a question: a small grid editor (add/remove rows and columns, header row
// on/off, paste from Excel or Sheets). Tables are optional: question.tables is only set once
// the teacher adds one, so saved papers without tables are untouched.

import React from 'react';
import toast from 'react-hot-toast';
import type { Question, QuestionTable } from '@/store/paperStore';
import { TABLE_LIMITS } from '@/lib/paperRenderer';

interface Props {
  question: Question;
  onUpdate: (u: Partial<Question>) => void;
}

const BORDER = '1px solid hsl(217 33% 18%)';

const newId = () => `t_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

const blankTable = (): QuestionTable => ({
  id: newId(),
  headerRow: true,
  rows: Array.from({ length: 3 }, () => ['', '', '']),
});

/** Pasted spreadsheet text (tabs between cells, new lines between rows, quotes around multi-line cells). */
function parseClipboard(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let quoted = false;
  const src = text.replace(/\r\n?/g, '\n');
  for (let i = 0; i < src.length; i++) {
    const ch = src[i];
    if (quoted) {
      if (ch === '"' && src[i + 1] === '"') { cell += '"'; i++; }
      else if (ch === '"') quoted = false;
      else cell += ch;
    } else if (ch === '"' && cell === '') {
      quoted = true;
    } else if (ch === '\t') {
      row.push(cell); cell = '';
    } else if (ch === '\n') {
      row.push(cell); rows.push(row); row = []; cell = '';
    } else {
      cell += ch;
    }
  }
  if (cell !== '' || row.length > 0) { row.push(cell); rows.push(row); }
  return rows;
}

const btn = (danger = false): React.CSSProperties => ({
  fontSize: '11px', fontWeight: 600, borderRadius: '6px', padding: '0 10px', height: '34px', cursor: 'pointer',
  color: danger ? '#f87171' : '#94a3b8',
  background: danger ? 'rgba(239,68,68,0.08)' : 'hsl(222 30% 14%)',
  border: danger ? '1px solid rgba(239,68,68,0.25)' : BORDER,
});

export function TableEditor({ question, onUpdate }: Props) {
  const tables = Array.isArray(question.tables) ? question.tables : [];

  const save = (next: QuestionTable[]) => {
    // no tables left: drop the field again so the question is exactly as it was before
    onUpdate({ tables: next.length > 0 ? next : undefined });
  };
  const change = (id: string, fn: (t: QuestionTable) => QuestionTable) =>
    save(tables.map(t => (t.id === id ? fn(t) : t)));

  const addTable = () => {
    if (tables.length >= TABLE_LIMITS.perQuestion) {
      toast.error(`A question can have at most ${TABLE_LIMITS.perQuestion} tables.`);
      return;
    }
    save([...tables, blankTable()]);
  };

  const setCell = (id: string, r: number, c: number, value: string) =>
    change(id, t => ({ ...t, rows: t.rows.map((row, i) => (i === r ? row.map((x, j) => (j === c ? value : x)) : row)) }));

  const addRow = (id: string) =>
    change(id, t => {
      if (t.rows.length >= TABLE_LIMITS.maxRows) { toast.error(`At most ${TABLE_LIMITS.maxRows} rows.`); return t; }
      return { ...t, rows: [...t.rows, Array((t.rows[0] || ['']).length).fill('')] };
    });
  const addCol = (id: string) =>
    change(id, t => {
      if ((t.rows[0] || []).length >= TABLE_LIMITS.maxCols) { toast.error(`At most ${TABLE_LIMITS.maxCols} columns.`); return t; }
      return { ...t, rows: t.rows.map(row => [...row, '']) };
    });
  const removeRow = (id: string, r: number) =>
    change(id, t => (t.rows.length <= 1 ? t : { ...t, rows: t.rows.filter((_, i) => i !== r) }));
  const removeCol = (id: string, c: number) =>
    change(id, t => ((t.rows[0] || []).length <= 1 ? t : { ...t, rows: t.rows.map(row => row.filter((_, j) => j !== c)) }));

  /** Paste from Excel or Sheets: fills the grid from the clicked cell, growing it within the limits. */
  const onPaste = (e: React.ClipboardEvent, id: string, r: number, c: number) => {
    const text = e.clipboardData.getData('text');
    if (!/[\t\n]/.test(text.replace(/\n$/, ''))) return; // a plain one-cell paste: let the browser do it
    e.preventDefault();
    const pasted = parseClipboard(text.replace(/\n+$/, ''));
    change(id, t => {
      const cols = (t.rows[0] || []).length;
      const wantRows = Math.max(t.rows.length, r + pasted.length);
      const wantCols = Math.max(cols, c + Math.max(...pasted.map(p => p.length)));
      const nRows = Math.min(wantRows, TABLE_LIMITS.maxRows);
      const nCols = Math.min(wantCols, TABLE_LIMITS.maxCols);
      if (nRows < wantRows || nCols < wantCols) toast.error('Pasted data was cut to fit the table limits.');
      const grid = Array.from({ length: nRows }, (_, i) => Array.from({ length: nCols }, (_, j) => t.rows[i]?.[j] ?? ''));
      pasted.forEach((p, i) => p.forEach((v, j) => {
        if (r + i < nRows && c + j < nCols) grid[r + i][c + j] = v.slice(0, TABLE_LIMITS.maxCellChars);
      }));
      return { ...t, rows: grid };
    });
  };

  return (
    <div style={{ marginTop: '6px' }}>
      <button
        type="button"
        onClick={addTable}
        style={{
          fontSize: '11px', fontWeight: 600, color: '#60a5fa', background: 'rgba(59,130,246,0.1)',
          border: '1px solid rgba(59,130,246,0.25)', borderRadius: '6px', padding: '5px 10px',
          cursor: 'pointer', minHeight: '36px',
        }}
      >
        + Table
      </button>

      {tables.map((t, ti) => {
        const cols = (t.rows[0] || []).length;
        const header = t.headerRow !== false;
        return (
          <div key={t.id} style={{ marginTop: '8px', border: BORDER, borderRadius: '8px', padding: '8px' }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
              <span style={{ fontSize: '10px', color: '#64748b', marginRight: 'auto' }}>
                Table {ti + 1} · {t.rows.length} × {cols} · paste from Excel works
              </span>
              <label style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '11px', color: '#94a3b8', minHeight: '34px' }}>
                <input type="checkbox" checked={header}
                  onChange={e => change(t.id, x => ({ ...x, headerRow: e.target.checked }))} />
                Header row
              </label>
              <button type="button" style={btn()} onClick={() => addRow(t.id)}>+ Row</button>
              <button type="button" style={btn()} onClick={() => addCol(t.id)}>+ Column</button>
              <button type="button" style={btn(true)} onClick={() => save(tables.filter(x => x.id !== t.id))}>Remove table</button>
            </div>

            <div style={{ overflowX: 'auto' }}>
              <table style={{ borderCollapse: 'separate', borderSpacing: '4px' }}>
                <thead>
                  <tr>
                    {Array.from({ length: cols }, (_, c) => (
                      <th key={c} style={{ fontWeight: 400 }}>
                        <button type="button" aria-label={`Remove column ${c + 1}`} disabled={cols <= 1}
                          onClick={() => removeCol(t.id, c)}
                          style={{ ...btn(), width: '100%', height: '26px', padding: 0, opacity: cols <= 1 ? 0.35 : 1 }}>
                          × col
                        </button>
                      </th>
                    ))}
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {t.rows.map((row, r) => (
                    <tr key={r}>
                      {row.map((cell, c) => (
                        <td key={c} style={{ verticalAlign: 'top', padding: 0 }}>
                          <textarea
                            value={cell}
                            rows={Math.max(1, cell.split('\n').length)}
                            maxLength={TABLE_LIMITS.maxCellChars}
                            aria-label={`Row ${r + 1}, column ${c + 1}`}
                            onChange={e => setCell(t.id, r, c, e.target.value)}
                            onPaste={e => onPaste(e, t.id, r, c)}
                            style={{
                              display: 'block', width: '110px', minHeight: '34px', boxSizing: 'border-box',
                              resize: 'none', overflow: 'hidden', fontFamily: 'inherit', lineHeight: '1.4',
                              background: header && r === 0 ? 'hsl(222 30% 18%)' : 'hsl(222 30% 14%)',
                              fontWeight: header && r === 0 ? 700 : 400,
                              border: BORDER, borderRadius: '6px', padding: '6px 8px', color: '#f1f5f9', fontSize: '12px',
                            }}
                          />
                        </td>
                      ))}
                      <td style={{ verticalAlign: 'top', padding: 0 }}>
                        <button type="button" aria-label={`Remove row ${r + 1}`} disabled={t.rows.length <= 1}
                          onClick={() => removeRow(t.id, r)}
                          style={{ ...btn(), width: '34px', padding: 0, opacity: t.rows.length <= 1 ? 0.35 : 1 }}>
                          ×
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        );
      })}
    </div>
  );
}