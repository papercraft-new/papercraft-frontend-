'use client';
// app/dashboard/tests/[id]/page.tsx
// CBT step 3: results and analytics for one test (teacher side): students with score, rank and time,
// section scores, score distribution, per-question stats, CSV export and a printable result sheet.

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { testsApi, testsError } from '@/lib/testsApi';
import type { TestResults } from '@/lib/testsApi';

const BORDER = '1px solid hsl(217 33% 18%)';
const CARD: React.CSSProperties = { border: BORDER, borderRadius: '12px', padding: '14px', background: 'rgba(255,255,255,0.02)' };
const btn = (color = '#cbd5e1', bg = 'hsl(222 30% 14%)', border = BORDER): React.CSSProperties => ({
  minHeight: '34px', padding: '0 12px', borderRadius: '8px', fontSize: '12px', fontWeight: 600, cursor: 'pointer', color, background: bg, border,
});
const th: React.CSSProperties = { textAlign: 'left', padding: '8px 10px', fontSize: '11px', fontWeight: 700, color: '#94a3b8', borderBottom: BORDER, whiteSpace: 'nowrap' };
const td: React.CSSProperties = { padding: '8px 10px', fontSize: '12px', color: '#e2e8f0', borderBottom: '1px solid hsl(217 33% 14%)', verticalAlign: 'top' };

const mmss = (sec: number) => `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}`;
const esc = (s: unknown) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

function Stat({ label, value, sub }: { label: string; value: React.ReactNode; sub?: string }) {
  return (
    <div style={{ ...CARD, padding: '12px' }}>
      <div style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 600 }}>{label}</div>
      <div style={{ fontSize: '22px', fontWeight: 800, color: '#f1f5f9', marginTop: '2px' }}>{value}</div>
      {sub && <div style={{ fontSize: '11px', color: '#64748b' }}>{sub}</div>}
    </div>
  );
}

type Target =
  | { kind: 'one'; attemptId: string; name: string; rollNo: string; writing: boolean }
  | { kind: 'all'; count: number };

/** Exam-day controls: add time, start a student over, or remove an attempt. Each asks before it acts. */
function ManageDialog({ target, testId, onClose, onDone }: { target: Target; testId: string; onClose: () => void; onDone: () => void }) {
  const [minutes, setMinutes] = useState(10);
  const [confirm, setConfirm] = useState<null | 'reset' | 'delete'>(null);
  const [busy, setBusy] = useState(false);
  const mins = Math.min(180, Math.max(1, Math.floor(minutes) || 1));

  const run = async (fn: () => Promise<string>) => {
    setBusy(true);
    try {
      toast.success(await fn());
      onDone();
      onClose();
    } catch (err) {
      toast.error(testsError(err, 'That did not work. Please try again.'));
    } finally {
      setBusy(false);
    }
  };

  const one = target.kind === 'one' ? target : null;
  const showExtend = target.kind === 'all' || (one && one.writing);
  const warn: React.CSSProperties = { fontSize: '12px', color: '#fbbf24', background: 'rgba(251,191,36,0.08)', borderRadius: '8px', padding: '8px 10px', marginTop: '8px' };

  return (
    <div role="dialog" aria-modal="true" onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 80, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
      <div onClick={e => e.stopPropagation()} style={{ width: '100%', maxWidth: '420px', maxHeight: '90vh', overflowY: 'auto', background: 'hsl(222 30% 11%)', border: BORDER, borderRadius: '14px', padding: '18px' }}>
        <div style={{ fontSize: '15px', fontWeight: 800, color: '#f1f5f9' }}>
          {one ? one.name : `Everyone still writing (${(target as { count: number }).count})`}
        </div>
        {one && <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '2px' }}>Roll no. {one.rollNo} · {one.writing ? 'still writing' : 'submitted'}</div>}

        {showExtend && (
          <div style={{ marginTop: '14px' }}>
            <div style={{ fontSize: '12px', fontWeight: 700, color: '#e2e8f0', marginBottom: '6px' }}>Add time</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', alignItems: 'center' }}>
              {[5, 10, 15, 30].map(m => (
                <button key={m} type="button" onClick={() => setMinutes(m)} style={{ ...btn(minutes === m ? '#fff' : '#cbd5e1', minutes === m ? '#2563eb' : 'hsl(222 30% 14%)', minutes === m ? '1px solid #2563eb' : BORDER) }}>+{m}</button>
              ))}
              <input type="number" min={1} max={180} value={minutes} onChange={e => setMinutes(Number(e.target.value))} aria-label="Minutes to add" style={{ width: '70px', minHeight: '34px', padding: '0 8px', borderRadius: '8px', border: BORDER, background: 'hsl(222 30% 12%)', color: '#e2e8f0', fontSize: '12px' }} />
              <span style={{ fontSize: '12px', color: '#94a3b8' }}>min</span>
            </div>
            <button type="button" disabled={busy} onClick={() => run(async () => {
              if (target.kind === 'all') {
                const r = await testsApi.extendAll(testId, mins);
                return r.data.data.extended ? `Added ${mins} min for ${r.data.data.extended} student${r.data.data.extended === 1 ? '' : 's'}.` : 'No one is still writing.';
              }
              await testsApi.extendAttempt(testId, target.attemptId, mins);
              return `Added ${mins} min for ${target.name}.`;
            })} style={{ ...btn('#fff', '#2563eb', '1px solid #2563eb'), marginTop: '8px', width: '100%' }}>
              {busy ? 'Working...' : `Add ${mins} minute${mins === 1 ? '' : 's'}`}
            </button>
            <div style={{ fontSize: '11px', color: '#64748b', marginTop: '6px' }}>The student&apos;s clock updates within about 15 seconds. Time can go past the test&apos;s closing time.</div>
          </div>
        )}

        {one && (
          <div style={{ marginTop: '16px', borderTop: BORDER, paddingTop: '12px' }}>
            {confirm === null && (
              <div style={{ display: 'grid', gap: '8px' }}>
                <button type="button" style={btn('#fbbf24', 'hsl(222 30% 14%)', '1px solid rgba(251,191,36,0.4)')} onClick={() => setConfirm('reset')}>
                  Reset attempt (start over)
                </button>
                <button type="button" style={btn('#f87171', 'hsl(222 30% 14%)', '1px solid rgba(248,113,113,0.4)')} onClick={() => setConfirm('delete')}>
                  Delete attempt
                </button>
                <div style={{ fontSize: '11px', color: '#64748b' }}>
                  Reset erases this student&apos;s answers and gives a fresh timer. They open the link and enter the same name and roll number. Delete removes the attempt completely.
                </div>
              </div>
            )}
            {confirm === 'reset' && (
              <div>
                <div style={{ fontSize: '13px', fontWeight: 700, color: '#f1f5f9' }}>Reset {one.name}&apos;s attempt?</div>
                <div style={warn}>
                  {one.writing ? 'They are writing right now. Their answers will be erased and their screen will stop working.' : 'Their submitted answers and score will be erased.'} They get the full time again.
                </div>
                <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
                  <button type="button" disabled={busy} style={{ ...btn(), flex: 1 }} onClick={() => setConfirm(null)}>Cancel</button>
                  <button type="button" disabled={busy} style={{ ...btn('#fff', '#d97706', '1px solid #d97706'), flex: 1 }} onClick={() => run(async () => { await testsApi.resetAttempt(testId, one.attemptId); return `${one.name} can start over.`; })}>
                    {busy ? 'Working...' : 'Yes, reset'}
                  </button>
                </div>
              </div>
            )}
            {confirm === 'delete' && (
              <div>
                <div style={{ fontSize: '13px', fontWeight: 700, color: '#f1f5f9' }}>Delete {one.name}&apos;s attempt?</div>
                <div style={warn}>
                  {one.writing ? 'They are writing right now. ' : ''}The attempt, answers and score are removed for good, and this cannot be undone.
                </div>
                <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
                  <button type="button" disabled={busy} style={{ ...btn(), flex: 1 }} onClick={() => setConfirm(null)}>Cancel</button>
                  <button type="button" disabled={busy} style={{ ...btn('#fff', '#dc2626', '1px solid #dc2626'), flex: 1 }} onClick={() => run(async () => { await testsApi.deleteAttempt(testId, one.attemptId); return 'Attempt deleted.'; })}>
                    {busy ? 'Working...' : 'Yes, delete'}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        <button type="button" onClick={onClose} disabled={busy} style={{ ...btn(), marginTop: '14px', width: '100%' }}>Close</button>
      </div>
    </div>
  );
}

function printSheet(r: TestResults) {
  const secHead = r.sections.length > 1 ? r.sections.map(s => `<th>${esc(s.title)}</th>`).join('') : '';
  const rows = r.students.map(s => `<tr>
    <td>${s.rank}</td><td class="l">${esc(s.name)}</td><td class="l">${esc(s.rollNo)}</td>
    <td><b>${s.score}</b></td><td>${s.correct}</td><td>${s.wrong}</td><td>${s.skipped}</td><td>${mmss(s.timeTakenSec)}</td>
    ${r.sections.length > 1 ? s.sections.map(x => `<td>${x}</td>`).join('') : ''}</tr>`).join('');
  const m = r.summary;
  const html = `<!doctype html><html><head><meta charset="utf-8"><title>${esc(r.test.title)} — Result sheet</title>
<style>
@page{size:A4;margin:14mm}
body{font-family:Arial,Helvetica,sans-serif;color:#111;font-size:12px}
h1{font-size:18px;margin:0 0 2px;text-align:center}
.sub{text-align:center;color:#444;margin-bottom:10px}
.sum{display:flex;gap:18px;justify-content:center;margin:10px 0 14px;font-size:12px}
table{border-collapse:collapse;width:100%}
th,td{border:1px solid #333;padding:4px 6px;text-align:center}
th{background:#eee}
td.l{text-align:left}
tr{page-break-inside:avoid}
</style></head><body>
${r.test.institution ? `<div class="sub"><b>${esc(r.test.institution)}</b></div>` : ''}
<h1>${esc(r.test.title)} — Result sheet</h1>
<div class="sub">${r.test.subject ? `${esc(r.test.subject)} · ` : ''}${r.test.questionCount} questions · ${r.test.totalMarks} marks · ${r.test.durationMin} min · Printed ${esc(new Date().toLocaleDateString())}</div>
<div class="sum"><span>Students: <b>${m.submitted}</b></span><span>Average: <b>${m.average}</b></span><span>Highest: <b>${m.highest}</b></span><span>Lowest: <b>${m.lowest}</b></span></div>
<table><thead><tr><th>Rank</th><th>Name</th><th>Roll no.</th><th>Score / ${r.test.totalMarks}</th><th>Correct</th><th>Wrong</th><th>Skipped</th><th>Time</th>${secHead}</tr></thead>
<tbody>${rows || '<tr><td colspan="8">No submitted attempts yet.</td></tr>'}</tbody></table>
</body></html>`;
  const w = window.open('', '_blank');
  if (!w) { toast.error('Allow pop-ups for this site to print the result sheet.'); return; }
  w.document.write(html);
  w.document.close();
  w.focus();
  setTimeout(() => w.print(), 300);
}

export default function TestResultsPage() {
  const params = useParams<{ id: string }>();
  const id = String(params?.id || '');
  const [filter, setFilter] = useState('');
  const [downloading, setDownloading] = useState(false);
  const [target, setTarget] = useState<Target | null>(null);

  const { data, isLoading, isError, error, refetch, isFetching } = useQuery({
    queryKey: ['test-results', id],
    queryFn: async () => (await testsApi.results(id)).data.data,
    enabled: !!id,
    // keep the list fresh while students are still writing
    refetchInterval: q => ((q.state.data as TestResults | undefined)?.summary.stillWriting ? 15000 : false),
  });

  const students = useMemo(() => {
    const f = filter.trim().toLowerCase();
    if (!data) return [];
    return f ? data.students.filter(s => s.name.toLowerCase().includes(f) || s.rollNo.toLowerCase().includes(f)) : data.students;
  }, [data, filter]);

  const downloadCsv = async () => {
    setDownloading(true);
    try {
      const res = await testsApi.resultsCsv(id);
      const url = URL.createObjectURL(res.data);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${(data?.test.title || 'test').replace(/[^A-Za-z0-9]+/g, '-').slice(0, 40)}-results.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (err) {
      toast.error(testsError(err, 'Could not download the CSV.'));
    } finally {
      setDownloading(false);
    }
  };

  const maxBin = Math.max(1, ...(data?.distribution.map(b => b.count) ?? [1]));
  const multi = (data?.sections.length ?? 0) > 1;
  const hasPartial = !!data?.students.some(s => s.partial > 0);
  const hasPartialQ = !!data?.questions.some(q => q.partial > 0);

  return (
    <div style={{ padding: '1.5rem', maxWidth: '1100px', margin: '0 auto' }}>
      <Link href="/dashboard/tests" style={{ color: '#60a5fa', fontSize: '12px', textDecoration: 'none' }}>← Online Tests</Link>

      {isLoading && <div style={{ color: '#94a3b8', fontSize: '13px', marginTop: '12px' }}>Loading results...</div>}
      {isError && (
        <div style={{ color: '#f87171', fontSize: '13px', marginTop: '12px' }}>
          {testsError(error, 'Could not load the results.')} <button type="button" style={btn()} onClick={() => refetch()}>Try again</button>
        </div>
      )}

      {data && (
        <>
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '10px', margin: '8px 0 16px' }}>
            <div style={{ flex: '1 1 260px', minWidth: 0 }}>
              <h1 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#f1f5f9', margin: 0, overflowWrap: 'anywhere' }}>{data.test.title}</h1>
              <div style={{ fontSize: '12px', color: '#64748b', marginTop: '3px' }}>
                {data.test.questionCount} questions · {data.test.totalMarks} marks · {data.test.durationMin} min
                {data.test.negativeMarks > 0 ? ` · −${data.test.negativeMarks} per wrong answer` : ''}
              </div>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
              <button type="button" style={btn()} onClick={() => refetch()} disabled={isFetching}>{isFetching ? 'Refreshing...' : 'Refresh'}</button>
              <button type="button" style={btn('#fff', '#2563eb', '1px solid #2563eb')} onClick={downloadCsv} disabled={downloading || data.summary.submitted === 0}>
                {downloading ? 'Preparing...' : 'Download CSV'}
              </button>
              <button type="button" style={btn()} onClick={() => printSheet(data)} disabled={data.summary.submitted === 0}>Print result sheet</button>
            </div>
          </div>

          {data.summary.submitted === 0 && (
            <div style={{ ...CARD, textAlign: 'center', color: '#94a3b8', fontSize: '13px', marginBottom: '16px' }}>
              No one has submitted yet.{data.summary.stillWriting > 0 ? ` ${data.summary.stillWriting} student${data.summary.stillWriting === 1 ? ' is' : 's are'} still writing.` : ''}
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '10px', marginBottom: '16px' }}>
            <Stat label="Submitted" value={data.summary.submitted} sub={data.summary.stillWriting ? `${data.summary.stillWriting} still writing` : undefined} />
            <Stat label="Average" value={data.summary.average} sub={`of ${data.summary.totalMarks}`} />
            <Stat label="Highest" value={data.summary.highest} />
            <Stat label="Lowest" value={data.summary.lowest} />
            <Stat label="Median" value={data.summary.median} />
            <Stat label="Average time" value={mmss(data.summary.averageTimeSec)} sub="min:sec" />
          </div>

          {data.summary.submitted > 0 && (
            <div style={{ ...CARD, marginBottom: '16px' }}>
              <div style={{ fontSize: '13px', fontWeight: 700, color: '#f1f5f9', marginBottom: '10px' }}>Score distribution (share of total marks)</div>
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: '6px', height: '150px', overflowX: 'auto' }}>
                {data.distribution.map(b => (
                  <div key={b.label} style={{ flex: '1 0 44px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end', height: '100%' }}>
                    <div style={{ fontSize: '11px', color: '#cbd5e1', marginBottom: '2px' }}>{b.count || ''}</div>
                    <div style={{ width: '100%', height: `${(b.count / maxBin) * 100}px`, minHeight: b.count ? '3px' : '1px', background: b.label === 'Below 0' ? '#ef4444' : '#3b82f6', borderRadius: '4px 4px 0 0', opacity: b.count ? 1 : 0.25 }} />
                    <div style={{ fontSize: '10px', color: '#94a3b8', marginTop: '4px', whiteSpace: 'nowrap' }}>{b.label}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {multi && (
            <div style={{ ...CARD, marginBottom: '16px', overflowX: 'auto' }}>
              <div style={{ fontSize: '13px', fontWeight: 700, color: '#f1f5f9', marginBottom: '6px' }}>Section-wise average</div>
              <table style={{ borderCollapse: 'collapse', width: '100%' }}>
                <thead><tr><th style={th}>Section</th><th style={th}>Questions</th><th style={th}>Marks</th><th style={th}>Average score</th></tr></thead>
                <tbody>
                  {data.sections.map(s => (
                    <tr key={s.title}><td style={td}>{s.title}</td><td style={td}>{s.questionCount}</td><td style={td}>{s.totalMarks}</td><td style={td}>{s.average}</td></tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div style={{ ...CARD, marginBottom: '16px' }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
              <div style={{ flex: '1 1 160px', fontSize: '13px', fontWeight: 700, color: '#f1f5f9' }}>Students ({data.students.length})</div>
              <input
                value={filter}
                onChange={e => setFilter(e.target.value)}
                placeholder="Search name or roll no."
                style={{ minHeight: '34px', padding: '0 10px', borderRadius: '8px', border: BORDER, background: 'hsl(222 30% 12%)', color: '#e2e8f0', fontSize: '12px', width: 'min(240px, 100%)' }}
              />
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ borderCollapse: 'collapse', width: '100%', minWidth: '720px' }}>
                <thead>
                  <tr>
                    <th style={th}>Rank</th><th style={th}>Name</th><th style={th}>Roll no.</th><th style={th}>Score</th>
                    <th style={th}>Correct</th><th style={th}>Wrong</th>{hasPartial && <th style={th}>Partial</th>}<th style={th}>Skipped</th><th style={th}>Time</th><th style={th} title="Times the student left the exam screen">Tab switches</th>
                    {multi && data.sections.map(s => <th key={s.title} style={th}>{s.title}</th>)}
                    <th style={th}></th>
                  </tr>
                </thead>
                <tbody>
                  {students.map((s, i) => (
                    <tr key={`${s.rollNo}-${i}`}>
                      <td style={{ ...td, fontWeight: 700 }}>{s.rank}</td>
                      <td style={{ ...td, overflowWrap: 'anywhere' }}>{s.name}</td>
                      <td style={td}>{s.rollNo}</td>
                      <td style={{ ...td, fontWeight: 700 }}>{s.score}<span style={{ color: '#64748b', fontWeight: 400 }}> / {data.test.totalMarks}</span></td>
                      <td style={{ ...td, color: '#34d399' }}>{s.correct}</td>
                      <td style={{ ...td, color: '#f87171' }}>{s.wrong}</td>
                      {hasPartial && <td style={{ ...td, color: '#fbbf24' }}>{s.partial}</td>}
                      <td style={td}>{s.skipped}</td>
                      <td style={td}>{mmss(s.timeTakenSec)}</td>
                      <td style={{ ...td, color: s.tabSwitches > 0 ? '#fbbf24' : '#94a3b8', fontWeight: s.tabSwitches > 0 ? 700 : 400 }}>{s.tabSwitches}</td>
                      {multi && s.sections.map((x, si) => <td key={si} style={td}>{x}</td>)}
                      <td style={td}>
                        <button type="button" style={btn()} onClick={() => setTarget({ kind: 'one', attemptId: s.attemptId, name: s.name, rollNo: s.rollNo, writing: false })}>Manage</button>
                      </td>
                    </tr>
                  ))}
                  {students.length === 0 && (
                    <tr><td colSpan={10} style={{ ...td, color: '#94a3b8', textAlign: 'center' }}>{filter ? 'No student matches.' : 'No submitted attempts yet.'}</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {data.stillWriting.length > 0 && (
            <div style={{ ...CARD, marginBottom: '16px' }}>
              <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                <div style={{ flex: '1 1 140px', fontSize: '13px', fontWeight: 700, color: '#f1f5f9' }}>Still writing ({data.stillWriting.length})</div>
                <button type="button" style={btn()} onClick={() => setTarget({ kind: 'all', count: data.stillWriting.length })}>Extend time for everyone</button>
              </div>
              <div style={{ display: 'grid', gap: '6px' }}>
                {data.stillWriting.map(s => (
                  <div key={s.attemptId} style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '8px', fontSize: '12px', color: '#cbd5e1' }}>
                    <span style={{ flex: '1 1 200px', overflowWrap: 'anywhere' }}>
                      {s.name} · {s.rollNo} · {s.answered} answered · ends {new Date(s.deadlineAt).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}
                    </span>
                    <button type="button" style={btn()} onClick={() => setTarget({ kind: 'one', attemptId: s.attemptId, name: s.name, rollNo: s.rollNo, writing: true })}>Manage</button>
                  </div>
                ))}
              </div>
              <div style={{ fontSize: '11px', color: '#64748b', marginTop: '6px' }}>They join the ranking once they submit or their time runs out. This page refreshes itself.</div>
            </div>
          )}

          <div style={{ ...CARD }}>
            <div style={{ fontSize: '13px', fontWeight: 700, color: '#f1f5f9', marginBottom: '2px' }}>Question analysis</div>
            <div style={{ fontSize: '11px', color: '#64748b', marginBottom: '8px' }}>Based on the {data.summary.submitted} submitted attempt{data.summary.submitted === 1 ? '' : 's'}. Correct options are in green. For multiple-correct questions each student&apos;s ticked options are counted.</div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ borderCollapse: 'collapse', width: '100%', minWidth: '760px' }}>
                <thead>
                  <tr>
                    <th style={th}>Q</th>{multi && <th style={th}>Section</th>}<th style={th}>Question</th>
                    <th style={th}>Right</th><th style={th}>Wrong</th>{hasPartialQ && <th style={th}>Partial</th>}<th style={th}>Skipped</th><th style={th}>% right</th>
                    <th style={th}>Avg time</th><th style={th}>Picked (a, b, c…)</th>
                  </tr>
                </thead>
                <tbody>
                  {data.questions.map(q => (
                    <tr key={q.id}>
                      <td style={{ ...td, fontWeight: 700 }}>
                        {q.no}
                        {q.kind === 'MSQ' && <div style={{ fontSize: '9px', fontWeight: 600, color: '#a78bfa' }}>multi</div>}
                        {q.kind === 'NAT' && <div style={{ fontSize: '9px', fontWeight: 600, color: '#38bdf8' }}>number</div>}
                      </td>
                      {multi && <td style={td}>{q.section}</td>}
                      <td style={{ ...td, minWidth: '220px', overflowWrap: 'anywhere' }}>{q.text || '(picture question)'}</td>
                      <td style={{ ...td, color: '#34d399' }}>{q.right}</td>
                      <td style={{ ...td, color: '#f87171' }}>{q.wrong}</td>
                      {hasPartialQ && <td style={{ ...td, color: '#fbbf24' }}>{q.partial}</td>}
                      <td style={td}>{q.skipped}</td>
                      <td style={td}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <div style={{ width: '60px', height: '6px', background: 'hsl(217 33% 20%)', borderRadius: '3px', overflow: 'hidden' }}>
                            <div style={{ width: `${q.pctRight}%`, height: '100%', background: q.pctRight < 35 ? '#ef4444' : q.pctRight < 65 ? '#f59e0b' : '#10b981' }} />
                          </div>
                          {q.pctRight}%
                        </div>
                      </td>
                      <td style={td}>{q.avgTimeSec === null ? '-' : mmss(q.avgTimeSec)}</td>
                      <td style={td}>
                        {q.kind === 'NAT' ? (
                          <div>
                            <span style={{ color: '#34d399', fontWeight: 800 }}>Answer {q.correct}{q.tolerance ? ` ± ${q.tolerance}` : ''}</span>
                            {q.commonWrong.length > 0 && (
                              <div style={{ color: '#94a3b8', marginTop: '2px' }}>
                                Common wrong: {q.commonWrong.map(w => `${w.value} (×${w.count})`).join(', ')}
                              </div>
                            )}
                          </div>
                        ) : (
                          Object.entries(q.options).map(([label, n]) => (
                            <span key={label} style={{ marginRight: '8px', fontWeight: q.correctLabels.includes(label) ? 800 : 400, color: q.correctLabels.includes(label) ? '#34d399' : '#cbd5e1' }}>
                              {label}:{n}
                            </span>
                          ))
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          {target && <ManageDialog target={target} testId={id} onClose={() => setTarget(null)} onDone={() => refetch()} />}
        </>
      )}
    </div>
  );
}