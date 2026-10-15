'use client';
// components/exam/ExamRunner.tsx
// The exam screen: timer, subject tabs, question palette, Save & Next / Mark for Review / Clear.
//  - Every answer autosaves (debounced, retried when offline). The server owns the timer and grading.
//  - The timer uses the server's clock: every reply carries serverNow and we correct for the difference.
//  - Submit flushes the autosave queue first, then sends the FULL answers map, so a lost autosave
//    can never lose marks. At 0:00 the test submits itself.
//  - Leaving the exam screen (tab switch, app switch) is counted, warned about and reported to the
//    teacher. It never submits the test.

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { publicTestApi, toApiError } from '@/lib/publicTestApi';
import type { AnswerState, AttemptData, ResultData } from '@/lib/publicTestApi';
import QuestionView from './QuestionView';
import QuestionPalette, { qState } from './QuestionPalette';

interface Props {
  data: AttemptData;
  token: string;
  /** server clock minus this device's clock, in ms, from the reply that loaded the attempt */
  clockOffset: number;
  onSubmitted: (r: ResultData) => void;
  onSessionLost: (message: string) => void;
}

const EMPTY: AnswerState = { selected: null, marked: false, visited: false, t: 0 };
const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

function fmt(ms: number) {
  const s = Math.max(0, Math.ceil(ms / 1000));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${p(h)}:${p(m)}:${p(s % 60)}`;
}

export default function ExamRunner({ data, token, clockOffset, onSubmitted, onSessionLost }: Props) {
  const flat = useMemo(
    () => data.sections.flatMap((s, si) => s.questions.map(q => ({ q, si }))),
    [data]
  );

  const [answers, setAnswers] = useState<Record<string, AnswerState>>(() => data.answers || {});
  const answersRef = useRef(answers);
  const [idx, setIdx] = useState(0);
  const idxRef = useRef(0);
  idxRef.current = idx;

  const [, setTick] = useState(0);
  const offsetRef = useRef(clockOffset);
  const deadline = data.attempt.deadlineAt;

  const [saveState, setSaveState] = useState<'saved' | 'saving' | 'offline'>('saved');
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [hint, setHint] = useState<string | null>(null);
  const [switches, setSwitches] = useState(data.attempt.tabSwitches || 0);
  const [leftWarn, setLeftWarn] = useState(false);
  const switchesRef = useRef(data.attempt.tabSwitches || 0);
  const sentSwitches = useRef(data.attempt.tabSwitches || 0);
  const awayRef = useRef(false);

  const propsRef = useRef({ onSubmitted, onSessionLost });
  propsRef.current = { onSubmitted, onSessionLost };

  const dirty = useRef<Set<string>>(new Set());
  const inflight = useRef<Promise<void> | null>(null);
  const flushTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const retryTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const retryDelay = useRef(2000);
  const closed = useRef(false); // submitted, or the session was lost: stop saving
  const submittingRef = useRef(false);
  const autoFired = useRef(false);
  const enteredAt = useRef(Date.now());

  const takeOffset = (o: number | null) => { if (o !== null) offsetRef.current = o; };

  const finish = useCallback((r: ResultData) => {
    closed.current = true;
    if (flushTimer.current) clearTimeout(flushTimer.current);
    if (retryTimer.current) clearTimeout(retryTimer.current);
    propsRef.current.onSubmitted(r);
  }, []);

  const lose = useCallback((message: string) => {
    closed.current = true;
    propsRef.current.onSessionLost(message);
  }, []);

  /** The server already submitted this attempt (time ran out): show the result. */
  const finishFromServer = useCallback(async () => {
    for (let i = 0; i < 5; i++) {
      try {
        const r = await publicTestApi.result(token);
        finish(r.data);
        return;
      } catch (err) {
        const e = toApiError(err);
        if (e.status === 401) return lose(e.message);
        await sleep(1500);
      }
    }
  }, [token, finish, lose]);

  // ── Autosave ────────────────────────────────────────────────────────

  const flushNow = useCallback(async (): Promise<boolean> => {
    for (let guard = 0; guard < 20; guard++) {
      while (inflight.current) await inflight.current.catch(() => undefined);
      if (closed.current || dirty.current.size === 0) return true;

      const ids = Array.from(dirty.current).slice(0, 50);
      const body: Record<string, AnswerState> = {};
      ids.forEach(id => { body[id] = answersRef.current[id] || EMPTY; dirty.current.delete(id); });

      const p = (async () => {
        const r = await publicTestApi.save(token, body);
        takeOffset(r.offset);
      })();
      inflight.current = p;
      try {
        await p;
        retryDelay.current = 2000;
        setSaveState(dirty.current.size ? 'saving' : 'saved');
      } catch (err) {
        ids.forEach(id => dirty.current.add(id));
        const e = toApiError(err);
        if (e.status === 401) { lose(e.message); return false; }
        if (e.code === 'SUBMITTED') { void finishFromServer(); return false; }
        setSaveState('offline');
        if (!retryTimer.current) {
          retryTimer.current = setTimeout(() => {
            retryTimer.current = null;
            void flushNow();
          }, retryDelay.current);
          retryDelay.current = Math.min(retryDelay.current * 2, 15000);
        }
        return false;
      } finally {
        inflight.current = null;
      }
    }
    return true;
  }, [token, lose, finishFromServer]);

  const scheduleFlush = useCallback(() => {
    setSaveState(s => (s === 'offline' ? s : 'saving'));
    if (flushTimer.current) clearTimeout(flushTimer.current);
    flushTimer.current = setTimeout(() => { void flushNow(); }, 700);
  }, [flushNow]);

  const update = useCallback((qid: string, patch: Partial<AnswerState>) => {
    const prev = answersRef.current[qid] || EMPTY;
    answersRef.current = { ...answersRef.current, [qid]: { ...prev, ...patch } };
    setAnswers(answersRef.current);
    dirty.current.add(qid);
    scheduleFlush();
  }, [scheduleFlush]);

  /** Adds the seconds spent on the question we are leaving. */
  const commitTime = useCallback((qid: string) => {
    const sec = Math.round((Date.now() - enteredAt.current) / 1000);
    enteredAt.current = Date.now();
    if (sec > 0) update(qid, { t: (answersRef.current[qid]?.t || 0) + sec });
  }, [update]);

  // ── Navigation ──────────────────────────────────────────────────────

  const goTo = useCallback((next: number) => {
    if (next < 0 || next >= flat.length || next === idxRef.current) return;
    commitTime(flat[idxRef.current].q.id);
    setIdx(next);
    setPaletteOpen(false);
    setHint(null);
    if (typeof window !== 'undefined') window.scrollTo({ top: 0 });
  }, [flat, commitTime]);

  // A question counts as visited the moment it is shown.
  const current = flat[idx];
  const currentId = current?.q.id;
  useEffect(() => {
    if (currentId && !answersRef.current[currentId]?.visited) update(currentId, { visited: true });
  }, [currentId, update]);

  const next = (extra?: Partial<AnswerState>) => {
    if (!current) return;
    if (extra) update(current.q.id, extra);
    if (idx < flat.length - 1) goTo(idx + 1);
    else setHint('This is the last question. Tap Submit Test when you are done.');
  };

  // ── Submit ──────────────────────────────────────────────────────────

  const doSubmit = useCallback(async (auto: boolean) => {
    if (submittingRef.current || closed.current) return;
    submittingRef.current = true;
    setSubmitting(true);
    setSubmitError(null);
    try {
      commitTime(flat[idxRef.current].q.id);
      // 1) flush the autosave queue (if it fails, the full map below still carries every answer)
      await flushNow().catch(() => false);
      // 2) send the full answers map
      const maxTries = auto ? 12 : 3;
      for (let attempt = 0; attempt < maxTries; attempt++) {
        try {
          const r = await publicTestApi.submit(token, answersRef.current, switchesRef.current);
          finish(r.data);
          return;
        } catch (err) {
          const e = toApiError(err);
          if (e.status === 401) { lose(e.message); return; }
          if (e.status === 400) { setSubmitError(e.message); return; }
          await sleep(Math.min(1500 * (attempt + 1), 6000));
        }
      }
      setSubmitError(auto
        ? 'Time is up, but we could not reach the server. Your saved answers will be submitted automatically. Keep this page open and tap Try again.'
        : 'Could not submit. Check your internet connection and try again.');
    } finally {
      submittingRef.current = false;
      setSubmitting(false);
    }
  }, [flat, token, flushNow, finish, lose, commitTime]);

  // ── Timer, safety nets ──────────────────────────────────────────────

  useEffect(() => {
    const tick = () => {
      setTick(t => t + 1);
      if (!autoFired.current && deadline - (Date.now() + offsetRef.current) <= 0) {
        autoFired.current = true;
        setConfirmOpen(false);
        void doSubmit(true);
      }
    };
    const id = setInterval(tick, 1000);
    const onVisible = () => { if (document.visibilityState === 'visible') tick(); }; // timers sleep in background tabs
    document.addEventListener('visibilitychange', onVisible);
    tick();
    return () => { clearInterval(id); document.removeEventListener('visibilitychange', onVisible); };
  }, [deadline, doSubmit]);

  // Leaving the exam screen: count it once per leave, warn on return, tell the server (best effort;
  // the submit call carries the count too, so a lost message is not lost).
  const sendSwitches = useCallback(async () => {
    const n = switchesRef.current;
    if (closed.current || n <= sentSwitches.current) return;
    try {
      await publicTestApi.event(token, n);
      sentSwitches.current = Math.max(sentSwitches.current, n);
    } catch { /* retried by the 10 s timer and by submit */ }
  }, [token]);

  useEffect(() => {
    const leave = () => { if (!closed.current) awayRef.current = true; };
    const back = () => {
      if (!awayRef.current || closed.current) return;
      awayRef.current = false;
      switchesRef.current += 1;
      setSwitches(switchesRef.current);
      setLeftWarn(true);
      void sendSwitches();
    };
    const onVis = () => (document.visibilityState === 'hidden' ? leave() : back());
    document.addEventListener('visibilitychange', onVis);
    window.addEventListener('blur', leave);
    window.addEventListener('focus', back);
    return () => {
      document.removeEventListener('visibilitychange', onVis);
      window.removeEventListener('blur', leave);
      window.removeEventListener('focus', back);
    };
  }, [sendSwitches]);

  useEffect(() => {
    const online = () => { void flushNow(); };
    const warn = (e: BeforeUnloadEvent) => { if (!closed.current) { e.preventDefault(); e.returnValue = ''; } };
    const every10 = setInterval(() => { if (dirty.current.size) void flushNow(); void sendSwitches(); }, 10000);
    window.addEventListener('online', online);
    window.addEventListener('beforeunload', warn);
    return () => {
      window.removeEventListener('online', online);
      window.removeEventListener('beforeunload', warn);
      clearInterval(every10);
      if (flushTimer.current) clearTimeout(flushTimer.current);
      if (retryTimer.current) clearTimeout(retryTimer.current);
    };
  }, [flushNow, sendSwitches]);

  if (!current) return <div className="p-6 text-slate-900">This test has no questions.</div>;

  const remaining = Math.max(0, deadline - (Date.now() + offsetRef.current));
  const timerTone = remaining <= 60_000 ? 'bg-red-600 text-white animate-pulse' : remaining <= 300_000 ? 'bg-amber-500 text-white' : 'bg-slate-900 text-white';
  const q = current.q;
  const section = data.sections[current.si];
  const a = answers[q.id] || EMPTY;

  const sectionStats = data.sections.map(s => {
    const c = { A: 0, NA: 0, M: 0, NV: 0 };
    s.questions.forEach(x => {
      const st = qState(answers[x.id]);
      if (st === 'A') c.A++;
      else if (st === 'NA') c.NA++;
      else if (st === 'NV') c.NV++;
      else c.M++; // marked, with or without an answer
    });
    return { title: s.title, total: s.questions.length, ...c };
  });
  const unanswered = flat.filter(f => !answers[f.q.id]?.selected).length;

  const firstIndexOf = (si: number) => flat.findIndex(f => f.si === si);
  const neg = data.test.negativeMarks;

  return (
    <div className="flex min-h-[100dvh] flex-col bg-slate-100 text-slate-900">
      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center gap-2 px-3 py-2 lg:px-4">
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-bold sm:text-base">{data.test.title}</div>
            <div className="flex items-center gap-2 truncate text-xs text-slate-600">
              <span className="truncate">{data.attempt.name} · {data.attempt.rollNo}</span>
              <span className={`inline-flex items-center gap-1 ${saveState === 'offline' ? 'text-red-600' : 'text-slate-500'}`}>
                <span className={`h-1.5 w-1.5 rounded-full ${saveState === 'saved' ? 'bg-green-500' : saveState === 'saving' ? 'bg-amber-500' : 'bg-red-500'}`} />
                {saveState === 'saved' ? 'Saved' : saveState === 'saving' ? 'Saving…' : 'Offline, retrying'}
              </span>
              {switches > 0 && <span className="shrink-0 text-amber-600">Left screen ×{switches}</span>}
            </div>
          </div>
          <div className={`rounded-lg px-3 py-1.5 text-center font-mono text-base font-bold tabular-nums sm:text-lg ${timerTone}`} aria-label="Time left">
            {fmt(remaining)}
          </div>
          <button type="button" onClick={() => setPaletteOpen(true)} className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold lg:hidden">
            Palette
          </button>
          <button type="button" onClick={() => { setSubmitError(null); setConfirmOpen(true); }} className="rounded-lg bg-red-600 px-3 py-2 text-sm font-bold text-white">
            Submit<span className="hidden sm:inline"> Test</span>
          </button>
        </div>
        {data.sections.length > 1 && (
          <div className="mx-auto flex max-w-7xl gap-1 overflow-x-auto px-3 pb-2 lg:px-4" role="tablist">
            {data.sections.map((s, si) => {
              const active = si === current.si;
              return (
                <button
                  key={s.id}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => goTo(firstIndexOf(si))}
                  className={`shrink-0 rounded-md px-3 py-1.5 text-sm font-semibold ${active ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-700'}`}
                >
                  {s.title}
                </button>
              );
            })}
          </div>
        )}
      </header>

      <div className="mx-auto flex w-full max-w-7xl flex-1 items-start gap-4 p-3 lg:p-4">
        <main className="min-w-0 flex-1 rounded-xl bg-white shadow-sm">
          <div className="p-4 lg:p-6">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-2 text-sm text-slate-600">
              <span className="font-semibold text-slate-800">{section.title} · Question {q.no} of {flat.length}</span>
              <span>
                <span className="font-semibold text-green-700">+{q.marks}</span>
                {neg > 0 && <span className="ml-2 font-semibold text-red-600">−{neg}</span>}
              </span>
            </div>
            {section.description && <div className="mb-3 text-sm italic text-slate-600">{section.description}</div>}
            <QuestionView
              key={q.id}
              q={q}
              selected={a.selected}
              onSelect={label => update(q.id, { selected: label, visited: true })}
            />
            {hint && <div className="mt-4 rounded-lg bg-amber-50 p-3 text-sm text-amber-800">{hint}</div>}
          </div>

          <div className="sticky bottom-0 rounded-b-xl border-t border-slate-200 bg-white p-3 lg:px-6" style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              <button type="button" onClick={() => goTo(idx - 1)} disabled={idx === 0} className="rounded-lg border border-slate-300 px-3 py-3 text-sm font-semibold disabled:opacity-40">
                Previous
              </button>
              <button type="button" onClick={() => update(q.id, { selected: null })} disabled={!a.selected} className="rounded-lg border border-slate-300 px-3 py-3 text-sm font-semibold disabled:opacity-40">
                Clear Response
              </button>
              <button type="button" onClick={() => next({ marked: true })} className="rounded-lg border border-purple-600 px-3 py-3 text-sm font-semibold text-purple-700">
                Mark for Review & Next
              </button>
              <button type="button" onClick={() => next(a.marked ? { marked: false } : undefined)} className="rounded-lg bg-green-600 px-3 py-3 text-sm font-bold text-white">
                Save & Next
              </button>
            </div>
          </div>
        </main>

        <aside className="sticky top-28 hidden w-72 shrink-0 rounded-xl bg-white p-4 shadow-sm lg:block">
          <QuestionPalette
            title={section.title}
            questions={section.questions}
            answers={answers}
            currentId={q.id}
            onJump={id => goTo(flat.findIndex(f => f.q.id === id))}
          />
        </aside>
      </div>

      {/* Warning after leaving the exam screen */}
      {leftWarn && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-4" role="alertdialog" aria-label="You left the exam screen">
          <div className="w-full max-w-sm rounded-2xl bg-white p-5 text-center shadow-xl">
            <div className="text-lg font-bold text-amber-700">You left the exam screen</div>
            <p className="mt-2 text-sm text-slate-700">
              Leaving the exam to open another tab or app is recorded, and your teacher can see how many times it happened.
              So far: <b>{switches}</b>. The timer kept running. Please stay on this screen until you submit.
            </p>
            <button type="button" onClick={() => setLeftWarn(false)} className="mt-4 w-full rounded-lg bg-blue-600 px-4 py-3 text-sm font-bold text-white">
              I understand, continue
            </button>
          </div>
        </div>
      )}

      {/* Palette drawer (phones and tablets) */}
      {paletteOpen && (
        <div className="fixed inset-0 z-40 lg:hidden" role="dialog" aria-label="Question palette">
          <div className="absolute inset-0 bg-black/50" onClick={() => setPaletteOpen(false)} />
          <div className="absolute inset-y-0 right-0 w-80 max-w-[88vw] overflow-y-auto bg-white p-4 shadow-xl">
            <div className="mb-3 flex items-center justify-between">
              <span className="text-sm font-bold">Questions</span>
              <button type="button" onClick={() => setPaletteOpen(false)} className="rounded-md border border-slate-300 px-3 py-1 text-sm font-semibold">Close</button>
            </div>
            <QuestionPalette
              title={section.title}
              questions={section.questions}
              answers={answers}
              currentId={q.id}
              onJump={id => goTo(flat.findIndex(f => f.q.id === id))}
            />
          </div>
        </div>
      )}

      {/* Submit confirmation */}
      {confirmOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-0 sm:items-center sm:p-4" role="dialog" aria-label="Submit test">
          <div className="max-h-[92dvh] w-full max-w-lg overflow-y-auto rounded-t-2xl bg-white p-5 shadow-xl sm:rounded-2xl">
            <div className="text-lg font-bold">Submit test?</div>
            <p className="mt-1 text-sm text-slate-600">
              {unanswered > 0
                ? `You have ${unanswered} unanswered question${unanswered === 1 ? '' : 's'}. You cannot change answers after submitting.`
                : 'You have answered every question. You cannot change answers after submitting.'}
            </p>
            <div className="mt-3 overflow-x-auto">
              <table className="w-full min-w-[420px] border-collapse text-sm">
                <thead>
                  <tr className="bg-slate-100 text-left">
                    <th className="border border-slate-300 px-2 py-1.5">Section</th>
                    <th className="border border-slate-300 px-2 py-1.5">Answered</th>
                    <th className="border border-slate-300 px-2 py-1.5">Not answered</th>
                    <th className="border border-slate-300 px-2 py-1.5">Marked</th>
                    <th className="border border-slate-300 px-2 py-1.5">Not visited</th>
                  </tr>
                </thead>
                <tbody>
                  {sectionStats.map(s => (
                    <tr key={s.title}>
                      <td className="border border-slate-300 px-2 py-1.5 font-medium">{s.title}</td>
                      <td className="border border-slate-300 px-2 py-1.5">{s.A}</td>
                      <td className="border border-slate-300 px-2 py-1.5">{s.NA}</td>
                      <td className="border border-slate-300 px-2 py-1.5">{s.M}</td>
                      <td className="border border-slate-300 px-2 py-1.5">{s.NV}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mt-2 text-xs text-slate-500">Marked = marked for review (with or without an answer). Answers that are marked still count.</div>
            {submitError && <div className="mt-3 rounded-lg bg-red-50 p-3 text-sm text-red-700">{submitError}</div>}
            <div className="mt-4 grid grid-cols-2 gap-2">
              <button type="button" disabled={submitting} onClick={() => setConfirmOpen(false)} className="rounded-lg border border-slate-300 px-3 py-3 text-sm font-semibold disabled:opacity-50">
                Go back
              </button>
              <button type="button" disabled={submitting} onClick={() => void doSubmit(false)} className="rounded-lg bg-red-600 px-3 py-3 text-sm font-bold text-white disabled:opacity-60">
                {submitting ? 'Submitting…' : submitError ? 'Try again' : 'Submit'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Time-up submit error (the confirm dialog is closed by then) */}
      {!confirmOpen && submitError && (
        <div className="fixed inset-x-3 bottom-3 z-50 rounded-xl bg-red-600 p-4 text-sm text-white shadow-xl">
          <div>{submitError}</div>
          <button type="button" disabled={submitting} onClick={() => void doSubmit(true)} className="mt-2 rounded-lg bg-white px-3 py-2 font-bold text-red-700 disabled:opacity-60">
            {submitting ? 'Submitting…' : 'Try again'}
          </button>
        </div>
      )}
      {!confirmOpen && submitting && autoFired.current && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 text-center text-white">
          <div className="rounded-xl bg-slate-900 px-6 py-5">
            <div className="text-lg font-bold">Time is up</div>
            <div className="mt-1 text-sm text-slate-300">Submitting your answers…</div>
          </div>
        </div>
      )}
    </div>
  );
}