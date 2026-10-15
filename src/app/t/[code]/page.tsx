'use client';
// app/t/[code]/page.tsx
// The student's exam link. Public: no account. Name + roll number, instructions, the exam, the result.
// The attempt token is kept in this browser, so a refresh or a dropped connection resumes the attempt.

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useParams } from 'next/navigation';
import { publicTestApi, toApiError, loadStoredToken, storeToken, clearToken } from '@/lib/publicTestApi';
import type { AttemptData, ResultData, TestInfo } from '@/lib/publicTestApi';
import ExamRunner from '@/components/exam/ExamRunner';
import ExamResult from '@/components/exam/ExamResult';
import { StateChip, STATE_LABEL } from '@/components/exam/QuestionPalette';
import type { QState } from '@/components/exam/QuestionPalette';

type Phase =
  | { k: 'loading' }
  | { k: 'fatal'; message: string; retry?: boolean }
  | { k: 'entry' }
  | { k: 'instructions' }
  | { k: 'exam'; data: AttemptData; token: string; offset: number }
  | { k: 'done'; result: ResultData };

const card = 'mx-auto w-full max-w-lg rounded-2xl bg-white p-5 shadow-sm sm:p-7';
const input = 'w-full rounded-lg border border-slate-300 bg-white px-3 py-3 text-base text-slate-900 placeholder:text-slate-400 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-200';

function when(ms: number | null) {
  return ms ? new Date(ms).toLocaleString(undefined, { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' }) : '';
}

export default function StudentTestPage() {
  const params = useParams<{ code: string }>();
  const code = String(params?.code || '').toLowerCase();

  const [phase, setPhase] = useState<Phase>({ k: 'loading' });
  const [info, setInfo] = useState<TestInfo | null>(null);
  const [name, setName] = useState('');
  const [roll, setRoll] = useState('');
  const [resume, setResume] = useState(false);
  const [agree, setAgree] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const offsetRef = useRef(0);

  useEffect(() => { if (info) document.title = `${info.title} — Online Test`; }, [info]);

  /** Load the exam for a token (new start, resume, or page refresh). */
  const openAttempt = useCallback(async (token: string) => {
    const r = await publicTestApi.load(token);
    if (r.offset !== null) offsetRef.current = r.offset;
    if (r.data.status === 'SUBMITTED') {
      const res = await publicTestApi.result(token);
      setPhase({ k: 'done', result: res.data });
      return;
    }
    setPhase({ k: 'exam', data: r.data as unknown as AttemptData, token, offset: offsetRef.current });
  }, []);

  const boot = useCallback(async () => {
    setPhase({ k: 'loading' });
    let t: TestInfo;
    try {
      const r = await publicTestApi.info(code);
      t = r.data;
      setInfo(t);
    } catch (err) {
      const e = toApiError(err);
      setPhase({ k: 'fatal', message: e.status === 404 ? 'This test link is not valid. Check the link with your teacher.' : e.message, retry: e.status !== 404 });
      return;
    }
    const token = loadStoredToken(code);
    if (token) {
      try {
        await openAttempt(token);
        return;
      } catch (err) {
        const e = toApiError(err);
        if (e.status === 401) clearToken(code);
        else { setPhase({ k: 'fatal', message: e.message, retry: true }); return; }
      }
    }
    setPhase({ k: 'entry' });
  }, [code, openAttempt]);

  useEffect(() => { if (code) void boot(); }, [code, boot]);

  const start = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      const r = await publicTestApi.start(code, name, roll);
      storeToken(code, r.data.token);
      await openAttempt(r.data.token);
    } catch (err) {
      const e = toApiError(err);
      setError(e.message);
      setPhase({ k: 'entry' });
    } finally {
      setBusy(false);
    }
  }, [code, name, roll, openAttempt]);

  const continueFromEntry = async (ev: React.FormEvent) => {
    ev.preventDefault();
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const r = await publicTestApi.check(code, name, roll);
      setResume(r.data.resume);
      if (r.data.resume) {
        // Already started: go straight back in, no instructions, and the clock keeps running.
        setBusy(false);
        await start();
        return;
      }
      setAgree(false);
      setPhase({ k: 'instructions' });
    } catch (err) {
      setError(toApiError(err).message);
    } finally {
      setBusy(false);
    }
  };

  // ── Screens ─────────────────────────────────────────────────────────

  if (phase.k === 'exam') {
    return (
      <ExamRunner
        data={phase.data}
        token={phase.token}
        clockOffset={phase.offset}
        onSubmitted={result => setPhase({ k: 'done', result })}
        onSessionLost={message => {
          clearToken(code);
          setError(message);
          setPhase({ k: 'entry' });
        }}
      />
    );
  }
  if (phase.k === 'done') return <ExamResult result={phase.result} />;

  return (
    <div className="min-h-[100dvh] bg-slate-100 px-3 py-6 text-slate-900 sm:py-10">
      {phase.k === 'loading' && (
        <div className={`${card} text-center text-slate-600`}>Loading test…</div>
      )}

      {phase.k === 'fatal' && (
        <div className={`${card} text-center`}>
          <div className="text-lg font-bold">Cannot open this test</div>
          <p className="mt-2 text-sm text-slate-600">{phase.message}</p>
          {phase.retry && (
            <button type="button" onClick={() => void boot()} className="mt-4 rounded-lg bg-blue-600 px-4 py-3 text-sm font-bold text-white">
              Try again
            </button>
          )}
        </div>
      )}

      {phase.k === 'entry' && info && (
        <form onSubmit={continueFromEntry} className={card}>
          {info.institution && <div className="text-center text-xs font-semibold uppercase tracking-wide text-slate-500">{info.institution}</div>}
          <h1 className="mt-1 text-center text-xl font-bold">{info.title}</h1>
          <div className="mt-3 flex flex-wrap justify-center gap-2 text-xs text-slate-700">
            <span className="rounded-full bg-slate-100 px-3 py-1">{info.durationMin} min</span>
            <span className="rounded-full bg-slate-100 px-3 py-1">{info.questionCount} questions</span>
            <span className="rounded-full bg-slate-100 px-3 py-1">{info.totalMarks} marks</span>
            {info.negativeMarks > 0 && <span className="rounded-full bg-red-50 px-3 py-1 text-red-700">−{info.negativeMarks} per wrong answer</span>}
          </div>

          {info.state === 'not_open' && <div className="mt-4 rounded-lg bg-amber-50 p-3 text-sm text-amber-800">This test opens on {when(info.opensAt)}.</div>}
          {info.state === 'closed' && <div className="mt-4 rounded-lg bg-slate-100 p-3 text-sm text-slate-700">This test is closed. If you already started it, enter the same name and roll number to continue.</div>}
          {info.state === 'ended' && <div className="mt-4 rounded-lg bg-slate-100 p-3 text-sm text-slate-700">This test ended on {when(info.closesAt)}. If you already started it, enter the same name and roll number to continue.</div>}
          {info.state === 'open' && info.closesAt && <div className="mt-4 text-center text-xs text-slate-500">Closes {when(info.closesAt)}</div>}

          <label className="mt-5 block text-sm font-semibold" htmlFor="stu-name">Your full name</label>
          <input id="stu-name" className={`${input} mt-1`} value={name} onChange={e => setName(e.target.value)} autoComplete="name" maxLength={80} required placeholder="e.g. Ravi Kumar" />
          <label className="mt-4 block text-sm font-semibold" htmlFor="stu-roll">Roll number</label>
          <input id="stu-roll" className={`${input} mt-1`} value={roll} onChange={e => setRoll(e.target.value)} autoComplete="off" maxLength={30} required placeholder="e.g. 21A105" />

          {error && <div role="alert" className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</div>}

          <button type="submit" disabled={busy || name.trim().length < 2 || !roll.trim()} className="mt-5 w-full rounded-lg bg-blue-600 px-4 py-3 text-base font-bold text-white disabled:opacity-50">
            {busy ? 'Please wait…' : 'Continue'}
          </button>
        </form>
      )}

      {phase.k === 'instructions' && info && (
        <div className={card}>
          <h1 className="text-center text-xl font-bold">{info.title}</h1>
          <div className="mt-1 text-center text-sm text-slate-600">{name.trim()} · Roll no. {roll.trim().toUpperCase()}</div>

          <div className="mt-4 grid grid-cols-3 gap-2 text-center text-sm">
            <div className="rounded-lg bg-slate-100 p-2"><div className="font-bold">{info.durationMin} min</div><div className="text-xs text-slate-600">Time</div></div>
            <div className="rounded-lg bg-slate-100 p-2"><div className="font-bold">{info.questionCount}</div><div className="text-xs text-slate-600">Questions</div></div>
            <div className="rounded-lg bg-slate-100 p-2"><div className="font-bold">{info.totalMarks}</div><div className="text-xs text-slate-600">Marks</div></div>
          </div>

          {info.sections.length > 1 && (
            <div className="mt-3 text-sm text-slate-700">
              Sections: {info.sections.map(s => `${s.title} (${s.count})`).join(', ')}
            </div>
          )}

          {info.instructions && (
            <div className="mt-4 whitespace-pre-wrap rounded-lg border border-slate-200 p-3 text-sm text-slate-800">{info.instructions}</div>
          )}

          <div className="mt-4 text-sm font-bold">General instructions</div>
          <ol className="mt-1 list-decimal space-y-1 pl-5 text-sm text-slate-700">
            <li>The timer starts when you press Start Exam and keeps running even if you refresh or lose internet.</li>
            <li>Tap an option to answer. Your answers are saved automatically.</li>
            <li>Use Save &amp; Next to move on, Mark for Review to come back later, and Clear Response to remove an answer.</li>
            <li>The test submits itself when time ends. You can also submit earlier with Submit Test.</li>
            {info.negativeMarks > 0 && <li>Each wrong answer costs {info.negativeMarks} mark{info.negativeMarks === 1 ? '' : 's'}. Skipped questions cost nothing.</li>}
            <li>If you refresh or your phone disconnects, open the same link and enter the same name and roll number to continue.</li>
          </ol>

          <div className="mt-4 text-sm font-bold">Question palette</div>
          <div className="mt-2 space-y-1.5 text-xs text-slate-700">
            {(['NV', 'NA', 'A', 'M', 'AM'] as QState[]).map(s => (
              <div key={s} className="flex items-center gap-2"><StateChip s={s} /><span>{STATE_LABEL[s]}</span></div>
            ))}
          </div>

          <label className="mt-5 flex items-start gap-2 text-sm">
            <input type="checkbox" className="mt-0.5 h-5 w-5" checked={agree} onChange={e => setAgree(e.target.checked)} />
            <span>I have read the instructions.</span>
          </label>

          {error && <div role="alert" className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</div>}

          <div className="mt-4 grid grid-cols-2 gap-2">
            <button type="button" disabled={busy} onClick={() => { setError(null); setPhase({ k: 'entry' }); }} className="rounded-lg border border-slate-300 px-3 py-3 text-sm font-semibold disabled:opacity-50">
              Back
            </button>
            <button type="button" disabled={!agree || busy} onClick={() => void start()} className="rounded-lg bg-green-600 px-3 py-3 text-sm font-bold text-white disabled:opacity-50">
              {busy ? 'Starting…' : resume ? 'Continue exam' : 'Start Exam'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}