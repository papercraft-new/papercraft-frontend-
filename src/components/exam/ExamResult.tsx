'use client';
// components/exam/ExamResult.tsx
// The screen after submit. The score shows only if the teacher turned results on; the review with
// correct answers shows only if the teacher turned answers on (the server sends nothing otherwise).

import React from 'react';
import type { ResultData } from '@/lib/publicTestApi';
import QuestionView from './QuestionView';

function mmss(sec: number) {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}m ${String(s).padStart(2, '0')}s`;
}

export default function ExamResult({ result }: { result: ResultData }) {
  const review = result.review;
  return (
    <div className="min-h-[100dvh] bg-slate-100 px-3 py-6 text-slate-900">
      <div className="mx-auto w-full max-w-3xl">
        <div className="rounded-2xl bg-white p-6 text-center shadow-sm">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-green-100 text-2xl text-green-700" aria-hidden>✓</div>
          <h1 className="mt-3 text-xl font-bold">Test submitted</h1>
          <p className="mt-1 text-sm text-slate-600">{result.title}</p>
          <p className="text-sm text-slate-600">{result.name} · Roll no. {result.rollNo}</p>

          {result.showResult && result.score !== undefined ? (
            <>
              <div className="mt-5 text-5xl font-extrabold tabular-nums">
                {result.score}<span className="text-2xl font-semibold text-slate-500"> / {result.totalMarks}</span>
              </div>
              <div className={`mt-4 grid gap-2 text-sm ${result.partial ? 'grid-cols-4' : 'grid-cols-3'}`}>
                <div className="rounded-lg bg-green-50 p-3"><div className="text-xl font-bold text-green-700">{result.correct}</div>Correct</div>
                {!!result.partial && <div className="rounded-lg bg-amber-50 p-3"><div className="text-xl font-bold text-amber-700">{result.partial}</div>Partial</div>}
                <div className="rounded-lg bg-red-50 p-3"><div className="text-xl font-bold text-red-700">{result.wrong}</div>Wrong</div>
                <div className="rounded-lg bg-slate-100 p-3"><div className="text-xl font-bold text-slate-700">{result.skipped}</div>Skipped</div>
              </div>
              {typeof result.timeTakenSec === 'number' && (
                <div className="mt-3 text-sm text-slate-600">Time taken: {mmss(result.timeTakenSec)}</div>
              )}
            </>
          ) : (
            <p className="mt-5 text-sm text-slate-700">Your answers have been submitted. Your teacher will share the result.</p>
          )}
        </div>

        {review && (
          <div className="mt-6">
            <h2 className="mb-3 text-lg font-bold">Answer review</h2>
            {review.sections.map(s => (
              <div key={s.id} className="mb-6">
                {review.sections.length > 1 && <div className="mb-2 text-sm font-bold uppercase tracking-wide text-slate-600">{s.title}</div>}
                <div className="space-y-4">
                  {s.questions.map(q => {
                    const sel = review.answers[q.id]?.selected ?? null;
                    return (
                      <div key={q.id} className="rounded-xl bg-white p-4 shadow-sm">
                        <QuestionView q={q} selected={sel} correct={q.correct} />
                        {!sel && q.kind !== 'NAT' && <div className="mt-3 text-sm font-semibold text-slate-500">You skipped this question.</div>}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}