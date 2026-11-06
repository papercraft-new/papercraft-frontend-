'use client';
// components/tests/AnswerKeyReview.tsx
// Shown inside "Publish as test": every question with its current correct answer, so the teacher can
// see what is missing or wrong and fix it with one tap before publishing. Saves back to the paper
// (the answers are never printed on the paper).

import React, { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { papersApi } from '@/lib/api';
import type { Section, Question } from '@/store/paperStore';

const BORDER = '1px solid hsl(217 33% 18%)';
const NUM = /^\s*-?(\d+\.?\d*|\.\d+)\s*$/;

type Status = { kind: 'ok' | 'missing' | 'conflict' | 'few' | 'skip'; text: string };

const hasContent = (o: { text?: string; image?: { url?: string } }) => !!((o.text && o.text.trim()) || o.image?.url);

function statusOf(q: Question): Status {
  if (q.type === 'NUMERICAL') {
    const a = q.numeric?.answer;
    return a !== undefined && a !== null && NUM.test(String(a)) ? { kind: 'ok', text: 'Answer set' } : { kind: 'missing', text: 'No answer' };
  }
  if (q.type !== 'MCQ') return { kind: 'skip', text: 'Not asked online' };
  const opts = (q.options || []).filter(hasContent);
  if (opts.length < 2) return { kind: 'few', text: 'Needs 2+ options' };
  const n = opts.filter(o => o.isCorrect === true).length;
  if (n === 0) return { kind: 'missing', text: 'No answer ticked' };
  if (n > 1 && !q.multi) return { kind: 'conflict', text: 'Several ticked, but not marked multiple-correct' };
  return { kind: 'ok', text: q.multi ? `${n} correct` : 'Answer set' };
}

const COLORS: Record<Status['kind'], string> = {
  ok: '#34d399', missing: '#f87171', conflict: '#fbbf24', few: '#fbbf24', skip: '#64748b',
};

const btn = (primary = false): React.CSSProperties => ({
  minHeight: '38px', padding: '0 14px', borderRadius: '8px', fontSize: '13px', fontWeight: 600, cursor: 'pointer',
  color: primary ? '#fff' : '#cbd5e1', background: primary ? '#2563eb' : 'hsl(222 30% 14%)',
  border: primary ? '1px solid #2563eb' : BORDER,
});
const smallInput: React.CSSProperties = {
  minHeight: '34px', boxSizing: 'border-box', background: 'hsl(222 30% 14%)', border: BORDER,
  borderRadius: '8px', padding: '6px 10px', color: '#f1f5f9', fontSize: '13px', fontFamily: 'inherit',
};

interface Props {
  paperId: string;
  onBack: () => void;     // leave without saving
  onSaved: () => void;    // saved, go back and re-check
}

export function AnswerKeyReview({ paperId, onBack, onSaved }: Props) {
  const [sections, setSections] = useState<Section[] | null>(null);
  const [loadError, setLoadError] = useState('');
  const [onlyProblems, setOnlyProblems] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let alive = true;
    papersApi
      .getById(paperId)
      .then(res => {
        if (!alive) return;
        const s = res.data?.data?.sections;
        setSections(Array.isArray(s) ? (s as Section[]) : []);
      })
      .catch(() => alive && setLoadError('Could not load the paper.'));
    return () => { alive = false; };
  }, [paperId]);

  const update = (secId: string, qId: string, fn: (q: Question) => Question) => {
    setSections(prev => (prev ? prev.map(s => (s.id === secId ? { ...s, questions: s.questions.map(q => (q.id === qId ? fn(q) : q)) } : s)) : prev));
    setDirty(true);
  };

  const pick = (secId: string, q: Question, label: string) =>
    update(secId, q.id, cur => {
      const options = (cur.options || []).map(o => {
        if (o.label !== label) return cur.multi ? o : { ...o, isCorrect: false };
        return { ...o, isCorrect: cur.multi ? !o.isCorrect : true };
      });
      return { ...cur, options };
    });

  const setMulti = (secId: string, q: Question, multi: boolean) =>
    update(secId, q.id, cur => {
      let options = cur.options || [];
      if (!multi) {
        let seen = false; // going back to single-answer: keep only the first ticked option
        options = options.map(o => {
          if (o.isCorrect && !seen) { seen = true; return o; }
          return o.isCorrect ? { ...o, isCorrect: false } : o;
        });
      }
      return { ...cur, multi, options };
    });

  const counts = useMemo(() => {
    const c = { ok: 0, problems: 0, total: 0 };
    (sections || []).forEach(s => s.questions.forEach(q => {
      const st = statusOf(q);
      if (st.kind === 'skip') return;
      c.total++;
      if (st.kind === 'ok') c.ok++; else c.problems++;
    }));
    return c;
  }, [sections]);

  const save = async () => {
    if (!sections) return;
    setSaving(true);
    try {
      await papersApi.update(paperId, { sections });
      toast.success('Answers saved.');
      onSaved();
    } catch {
      toast.error('Could not save the answers.');
    } finally {
      setSaving(false);
    }
  };

  if (loadError) return <div style={{ color: '#f87171', fontSize: '13px' }}>{loadError}<div style={{ marginTop: 10 }}><button type="button" style={btn()} onClick={onBack}>Back</button></div></div>;
  if (!sections) return <div style={{ color: '#94a3b8', fontSize: '13px' }}>Loading questions...</div>;

  return (
    <div>
      <div style={{ fontSize: '13px', color: '#94a3b8', marginBottom: '10px' }}>
        Tap the correct option for each question. This is used to mark the test and is never printed on the paper.
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center', marginBottom: '12px' }}>
        <span style={{ fontSize: '13px', color: counts.problems ? '#fbbf24' : '#34d399', fontWeight: 700 }}>
          {counts.problems ? `${counts.problems} need attention` : 'All answers set'} · {counts.ok}/{counts.total} ready
        </span>
        <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#cbd5e1', marginLeft: 'auto', cursor: 'pointer' }}>
          <input type="checkbox" checked={onlyProblems} onChange={e => setOnlyProblems(e.target.checked)} />
          Show only questions that need attention
        </label>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '52vh', overflowY: 'auto', paddingRight: '2px' }}>
        {sections.map(sec => {
          const rows = sec.questions.filter(q => {
            const st = statusOf(q);
            if (st.kind === 'skip') return false;
            return !onlyProblems || st.kind !== 'ok';
          });
          if (!rows.length) return null;
          return (
            <div key={sec.id}>
              <div style={{ fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '6px 0' }}>{sec.title}</div>
              {rows.map(q => {
                const st = statusOf(q);
                return (
                  <div key={q.id} style={{ border: `1px solid ${st.kind === 'ok' ? 'hsl(217 33% 18%)' : COLORS[st.kind]}`, borderRadius: '10px', padding: '10px', marginBottom: '8px', background: 'hsl(222 41% 12%)' }}>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                      <div style={{ fontSize: '13px', color: '#e2e8f0', minWidth: 0 }}>
                        <b style={{ color: '#60a5fa' }}>Q{q.number}.</b>{' '}
                        <span style={{ display: 'inline', wordBreak: 'break-word' }}>{(q.text || '').slice(0, 160)}{(q.text || '').length > 160 ? '…' : ''}</span>
                      </div>
                      <span style={{ fontSize: '11px', fontWeight: 700, color: COLORS[st.kind], whiteSpace: 'nowrap', flexShrink: 0 }}>{st.kind === 'ok' ? '✓' : '⚠'} {st.text}</span>
                    </div>

                    {q.type === 'MCQ' && (
                      <>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '8px' }}>
                          {(q.options || []).filter(hasContent).map(o => (
                            <button
                              key={o.label}
                              type="button"
                              onClick={() => pick(sec.id, q, o.label)}
                              style={{
                                minHeight: '36px', maxWidth: '100%', padding: '4px 10px', borderRadius: '8px', fontSize: '12px', cursor: 'pointer', textAlign: 'left',
                                color: o.isCorrect ? '#052e16' : '#cbd5e1', fontWeight: o.isCorrect ? 700 : 500,
                                background: o.isCorrect ? '#34d399' : 'hsl(222 30% 14%)', border: o.isCorrect ? '1px solid #34d399' : BORDER,
                              }}
                            >
                              ({o.label}) {(o.text || '(picture)').slice(0, 40)}
                            </button>
                          ))}
                        </div>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#94a3b8', marginTop: '8px', cursor: 'pointer' }}>
                          <input type="checkbox" checked={!!q.multi} onChange={e => setMulti(sec.id, q, e.target.checked)} />
                          More than one correct answer
                        </label>
                      </>
                    )}

                    {q.type === 'NUMERICAL' && (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '8px' }}>
                        <input
                          style={{ ...smallInput, width: '130px' }}
                          inputMode="decimal"
                          placeholder="Answer"
                          value={q.numeric?.answer ?? ''}
                          onChange={e => update(sec.id, q.id, cur => ({ ...cur, numeric: { ...(cur.numeric || { answer: '' }), answer: e.target.value } }))}
                        />
                        <input
                          style={{ ...smallInput, width: '130px' }}
                          inputMode="decimal"
                          placeholder="± tolerance"
                          value={q.numeric?.tolerance ?? ''}
                          onChange={e => update(sec.id, q.id, cur => ({ ...cur, numeric: { ...(cur.numeric || { answer: '' }), tolerance: e.target.value } }))}
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          );
        })}
        {counts.total === 0 && <div style={{ fontSize: '13px', color: '#94a3b8' }}>This paper has no multiple-choice or numerical questions.</div>}
        {counts.total > 0 && onlyProblems && counts.problems === 0 && <div style={{ fontSize: '13px', color: '#34d399' }}>Nothing needs attention.</div>}
      </div>

      <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '14px' }}>
        <button type="button" style={btn()} onClick={onBack}>{dirty ? 'Discard' : 'Back'}</button>
        <button type="button" style={{ ...btn(true), opacity: saving || !dirty ? 0.5 : 1 }} disabled={saving || !dirty} onClick={save}>
          {saving ? 'Saving...' : 'Save answers'}
        </button>
      </div>
    </div>
  );
}