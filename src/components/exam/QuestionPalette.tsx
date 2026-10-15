'use client';
// components/exam/QuestionPalette.tsx
// The EAPCET-style question palette: five states, a legend with counts, tap a number to jump.

import React from 'react';
import type { AnswerState, ExamQuestion } from '@/lib/publicTestApi';

export type QState = 'NV' | 'NA' | 'A' | 'M' | 'AM';

export function qState(a: AnswerState | undefined): QState {
  if (!a) return 'NV';
  if (a.marked && a.selected) return 'AM';
  if (a.marked) return 'M';
  if (a.selected) return 'A';
  return a.visited ? 'NA' : 'NV';
}

export const STATE_LABEL: Record<QState, string> = {
  NV: 'Not visited',
  NA: 'Not answered',
  A: 'Answered',
  M: 'Marked for review',
  AM: 'Answered & marked for review',
};

export const STATE_CLASS: Record<QState, string> = {
  NV: 'bg-slate-200 text-slate-800 border-slate-300',
  NA: 'bg-red-500 text-white border-red-600',
  A: 'bg-green-600 text-white border-green-700',
  M: 'bg-purple-600 text-white border-purple-700',
  AM: 'bg-purple-600 text-white border-purple-700',
};

export function StateChip({ s, children }: { s: QState; children?: React.ReactNode }) {
  return (
    <span className={`relative inline-flex h-8 w-8 items-center justify-center rounded-md border text-xs font-bold ${STATE_CLASS[s]}`}>
      {children}
      {s === 'AM' && <span className="absolute -bottom-1 -right-1 h-3 w-3 rounded-full border-2 border-white bg-green-500" />}
    </span>
  );
}

interface Props {
  title: string;
  questions: ExamQuestion[];
  answers: Record<string, AnswerState>;
  currentId: string;
  onJump: (qid: string) => void;
}

export default function QuestionPalette({ title, questions, answers, currentId, onJump }: Props) {
  const counts: Record<QState, number> = { NV: 0, NA: 0, A: 0, M: 0, AM: 0 };
  questions.forEach(q => { counts[qState(answers[q.id])]++; });
  const order: QState[] = ['A', 'NA', 'NV', 'M', 'AM'];

  return (
    <div>
      <div className="mb-2 text-sm font-semibold text-slate-900">{title}</div>
      <div className="grid grid-cols-5 gap-2">
        {questions.map(q => {
          const s = qState(answers[q.id]);
          const current = q.id === currentId;
          return (
            <button
              key={q.id}
              type="button"
              onClick={() => onJump(q.id)}
              aria-label={`Question ${q.no}: ${STATE_LABEL[s]}`}
              aria-current={current ? 'true' : undefined}
              className={`relative flex h-10 items-center justify-center rounded-md border text-sm font-bold ${STATE_CLASS[s]} ${current ? 'ring-2 ring-blue-600 ring-offset-2' : ''}`}
            >
              {q.no}
              {s === 'AM' && <span className="absolute -bottom-1 -right-1 h-3 w-3 rounded-full border-2 border-white bg-green-500" />}
            </button>
          );
        })}
      </div>
      <div className="mt-4 space-y-1.5 text-xs text-slate-700">
        {order.map(s => (
          <div key={s} className="flex items-center gap-2">
            <StateChip s={s}>{counts[s]}</StateChip>
            <span>{STATE_LABEL[s]}</span>
          </div>
        ))}
      </div>
    </div>
  );
}