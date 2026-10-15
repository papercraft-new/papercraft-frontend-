'use client';
// components/tests/PublishTestModal.tsx
// "Publish as test" for a saved paper: checks which questions can be asked online (MCQ with exactly
// one correct option), takes the settings, publishes, then shows the share link and QR code.
// Also exports ShareTestPanel, which the My Tests page reuses.

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import QRCode from 'qrcode';
import { testsApi, testsError } from '@/lib/testsApi';
import type { PaperCheck, TestSummary } from '@/lib/testsApi';

const BORDER = '1px solid hsl(217 33% 18%)';

const input: React.CSSProperties = {
  width: '100%', boxSizing: 'border-box', minHeight: '38px', background: 'hsl(222 30% 14%)', border: BORDER,
  borderRadius: '8px', padding: '8px 10px', color: '#f1f5f9', fontSize: '13px', fontFamily: 'inherit',
};
const label: React.CSSProperties = { display: 'block', fontSize: '11px', fontWeight: 600, color: '#94a3b8', marginBottom: '4px' };
const btn = (primary = false): React.CSSProperties => ({
  minHeight: '38px', padding: '0 14px', borderRadius: '8px', fontSize: '13px', fontWeight: 600, cursor: 'pointer',
  color: primary ? '#fff' : '#cbd5e1', background: primary ? '#2563eb' : 'hsl(222 30% 14%)',
  border: primary ? '1px solid #2563eb' : BORDER,
});

export const testLink = (code: string) => `${window.location.origin}/t/${code}`;

// ─────────────────────────────────────────
// SHARE PANEL: link, copy, WhatsApp, QR code
// ─────────────────────────────────────────

export function ShareTestPanel({ code, title }: { code: string; title: string }) {
  const [qr, setQr] = useState('');
  const link = testLink(code);

  useEffect(() => {
    let alive = true;
    QRCode.toDataURL(link, { width: 320, margin: 2 })
      .then(url => alive && setQr(url))
      .catch(() => alive && setQr(''));
    return () => { alive = false; };
  }, [link]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(link);
      toast.success('Link copied');
    } catch {
      window.prompt('Copy this link:', link);
    }
  };

  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '14px', alignItems: 'flex-start' }}>
      <div style={{ flex: '1 1 220px', minWidth: 0 }}>
        <div style={label}>Test link (students need no account)</div>
        <input readOnly value={link} onFocus={e => e.currentTarget.select()} style={{ ...input, fontFamily: 'monospace', fontSize: '12px' }} />
        <div style={{ fontSize: '11px', color: '#64748b', margin: '6px 0 10px' }}>Test code: <b style={{ color: '#cbd5e1' }}>{code}</b></div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
          <button type="button" style={btn(true)} onClick={copy}>Copy link</button>
          <a
            href={`https://wa.me/?text=${encodeURIComponent(`${title}\n${link}`)}`}
            target="_blank"
            rel="noopener noreferrer"
            style={{ ...btn(), display: 'inline-flex', alignItems: 'center', textDecoration: 'none' }}
          >
            Share on WhatsApp
          </a>
        </div>
      </div>
      <div style={{ textAlign: 'center' }}>
        {qr ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={qr} alt={`QR code for ${title}`} width={150} height={150} style={{ borderRadius: '8px', background: '#fff', display: 'block' }} />
        ) : (
          <div style={{ width: 150, height: 150, borderRadius: 8, background: 'hsl(222 30% 14%)' }} />
        )}
        {qr && (
          <a href={qr} download={`test-${code}-qr.png`} style={{ fontSize: '11px', color: '#60a5fa', display: 'inline-block', marginTop: '6px' }}>
            Download QR
          </a>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────
// PUBLISH WINDOW
// ─────────────────────────────────────────

interface Props {
  paper: { id: string; title: string };
  onClose: () => void;
}

const toIso = (local: string) => (local ? new Date(local).toISOString() : null);

export function PublishTestModal({ paper, onClose }: Props) {
  const router = useRouter();
  const queryClient = useQueryClient();

  const [check, setCheck] = useState<PaperCheck | null>(null);
  const [checkError, setCheckError] = useState('');
  const [created, setCreated] = useState<TestSummary | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [title, setTitle] = useState(paper.title || 'Online Test');
  const [instructions, setInstructions] = useState('');
  const [durationMin, setDurationMin] = useState('30');
  const [marksPerQuestion, setMarksPerQuestion] = useState('1');
  const [negativeMarks, setNegativeMarks] = useState('0');
  const [opensAt, setOpensAt] = useState('');
  const [closesAt, setClosesAt] = useState('');
  const [shuffleQuestions, setShuffleQuestions] = useState(false);
  const [shuffleOptions, setShuffleOptions] = useState(false);
  const [showResult, setShowResult] = useState(true);
  const [showAnswers, setShowAnswers] = useState(false);
  const [onePerRoll, setOnePerRoll] = useState(true);

  useEffect(() => {
    let alive = true;
    testsApi
      .check(paper.id)
      .then(res => {
        if (!alive) return;
        const c = res.data.data;
        setCheck(c);
        setDurationMin(String(Math.max(10, Math.ceil(c.usable * 1.2)))); // about 1.2 minutes a question
      })
      .catch(err => alive && setCheckError(testsError(err, 'Could not check this paper.')));
    return () => { alive = false; };
  }, [paper.id]);

  const publish = async () => {
    const duration = Number(durationMin);
    if (!Number.isInteger(duration) || duration < 1 || duration > 600) return toast.error('Duration must be 1 to 600 minutes.');
    const marks = Number(marksPerQuestion);
    if (!(marks >= 0.25 && marks <= 100)) return toast.error('Marks per question must be 0.25 to 100.');
    const negative = Number(negativeMarks);
    if (!(negative >= 0 && negative <= 10)) return toast.error('Negative marks must be 0 to 10.');
    if (opensAt && closesAt && new Date(closesAt) <= new Date(opensAt)) return toast.error('The end time must be after the start time.');
    if (closesAt && new Date(closesAt) <= new Date()) return toast.error('The end time is already past.');

    setSubmitting(true);
    try {
      const res = await testsApi.create({
        paperId: paper.id,
        title: title.trim(),
        instructions: instructions.trim() || undefined,
        durationMin: duration,
        marksPerQuestion: marks,
        negativeMarks: negative,
        opensAt: toIso(opensAt),
        closesAt: toIso(closesAt),
        shuffleQuestions,
        shuffleOptions,
        showResult,
        showAnswers: showResult && showAnswers,
        onePerRoll,
      });
      setCreated(res.data.data);
      queryClient.invalidateQueries({ queryKey: ['tests'] });
    } catch (err) {
      toast.error(testsError(err, 'Could not publish the test.'));
    } finally {
      setSubmitting(false);
    }
  };

  const toggle = (text: string, checked: boolean, onChange: (v: boolean) => void, disabled = false, hint?: string) => (
    <label style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', fontSize: '13px', color: disabled ? '#475569' : '#cbd5e1', minHeight: '32px', cursor: disabled ? 'default' : 'pointer' }}>
      <input type="checkbox" checked={checked} disabled={disabled} onChange={e => onChange(e.target.checked)} style={{ marginTop: '3px' }} />
      <span>
        {text}
        {hint && <span style={{ display: 'block', fontSize: '11px', color: '#64748b' }}>{hint}</span>}
      </span>
    </label>
  );

  const noQuestions = check !== null && check.usable === 0;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Publish as test"
      onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }}
      style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(2,6,23,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '12px' }}
    >
      <div style={{ width: 'min(580px, 100%)', maxHeight: '92vh', overflowY: 'auto', background: 'hsl(222 47% 11%)', border: BORDER, borderRadius: '14px', padding: '18px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
          <h2 style={{ fontSize: '16px', fontWeight: 800, color: '#f1f5f9', margin: 0 }}>
            {created ? 'Test published' : 'Publish as online test'}
          </h2>
          <button type="button" aria-label="Close" onClick={onClose} style={{ ...btn(), width: '38px', padding: 0 }}>×</button>
        </div>

        {created ? (
          <>
            <p style={{ fontSize: '13px', color: '#94a3b8', margin: '0 0 12px' }}>
              {created.questionCount} questions, {created.totalMarks} marks, {created.durationMin} minutes. Share this link or QR code with your students.
            </p>
            <ShareTestPanel code={created.code} title={created.title} />
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '16px' }}>
              <button type="button" style={btn()} onClick={onClose}>Done</button>
              <button type="button" style={btn(true)} onClick={() => router.push('/dashboard/tests')}>Go to My Tests</button>
            </div>
          </>
        ) : (
          <>
            {/* WHAT WILL BE INCLUDED */}
            {!check && !checkError && <div style={{ fontSize: '13px', color: '#94a3b8', marginBottom: '12px' }}>Checking the questions...</div>}
            {checkError && <div style={{ fontSize: '13px', color: '#f87171', marginBottom: '12px' }}>{checkError}</div>}
            {check && (
              <div
                style={{
                  marginBottom: '14px', padding: '10px 12px', borderRadius: '10px', fontSize: '13px',
                  background: noQuestions ? 'rgba(239,68,68,0.08)' : 'rgba(16,185,129,0.08)',
                  border: `1px solid ${noQuestions ? 'rgba(239,68,68,0.25)' : 'rgba(16,185,129,0.25)'}`,
                  color: noQuestions ? '#fca5a5' : '#6ee7b7',
                }}
              >
                <b>{check.usable} of {check.totalQuestions} questions</b> can be asked online.
                {noQuestions && (
                  <div style={{ color: '#fca5a5', marginTop: '4px' }}>
                    Online tests use multiple-choice questions with exactly one correct option marked. Open the paper in the builder and tick the correct option on each MCQ.
                  </div>
                )}
                {check.skippedCount > 0 && (
                  <details style={{ marginTop: '6px', color: '#94a3b8' }}>
                    <summary style={{ cursor: 'pointer' }}>{check.skippedCount} left out</summary>
                    <ul style={{ margin: '6px 0 0', paddingLeft: '18px', fontSize: '12px' }}>
                      {check.skipped.slice(0, 8).map((s, i) => (
                        <li key={i}>{s.question} ({s.section}): {s.reason}</li>
                      ))}
                      {check.skippedCount > 8 && <li>and {check.skippedCount - 8} more</li>}
                    </ul>
                  </details>
                )}
              </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '12px' }}>
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={label} htmlFor="tt-title">Test title</label>
                <input id="tt-title" style={input} value={title} maxLength={200} onChange={e => setTitle(e.target.value)} />
              </div>
              <div>
                <label style={label} htmlFor="tt-dur">Duration (minutes)</label>
                <input id="tt-dur" style={input} type="number" min={1} max={600} value={durationMin} onChange={e => setDurationMin(e.target.value)} />
              </div>
              <div>
                <label style={label} htmlFor="tt-marks">Marks per question (if the paper has none)</label>
                <input id="tt-marks" style={input} type="number" min={0.25} max={100} step={0.25} value={marksPerQuestion} onChange={e => setMarksPerQuestion(e.target.value)} />
              </div>
              <div>
                <label style={label} htmlFor="tt-neg">Negative marks per wrong answer</label>
                <input id="tt-neg" style={input} type="number" min={0} max={10} step={0.25} value={negativeMarks} onChange={e => setNegativeMarks(e.target.value)} />
              </div>
              <div />
              <div>
                <label style={label} htmlFor="tt-open">Opens at (optional)</label>
                <input id="tt-open" style={input} type="datetime-local" value={opensAt} onChange={e => setOpensAt(e.target.value)} />
              </div>
              <div>
                <label style={label} htmlFor="tt-close">Closes at (optional)</label>
                <input id="tt-close" style={input} type="datetime-local" value={closesAt} onChange={e => setClosesAt(e.target.value)} />
              </div>
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={label} htmlFor="tt-instr">Instructions for students (optional)</label>
                <textarea id="tt-instr" style={{ ...input, minHeight: '64px', resize: 'vertical' }} maxLength={3000} value={instructions} onChange={e => setInstructions(e.target.value)} />
              </div>
            </div>

            <div style={{ margin: '12px 0 4px' }}>
              {toggle('Shuffle the order of questions', shuffleQuestions, setShuffleQuestions)}
              {toggle('Shuffle the options of each question', shuffleOptions, setShuffleOptions)}
              {toggle('One attempt per roll number', onePerRoll, setOnePerRoll)}
              {toggle('Show the score to the student at the end', showResult, v => { setShowResult(v); if (!v) setShowAnswers(false); })}
              {toggle('Also show the correct answers', showAnswers, setShowAnswers, !showResult)}
            </div>

            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '14px' }}>
              <button type="button" style={btn()} onClick={onClose}>Cancel</button>
              <button type="button" style={{ ...btn(true), opacity: submitting || !check || noQuestions ? 0.5 : 1 }} disabled={submitting || !check || noQuestions} onClick={publish}>
                {submitting ? 'Publishing...' : 'Publish test'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}