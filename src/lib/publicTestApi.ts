// lib/publicTestApi.ts
// CBT step 2: the student side. No login, so this uses its own axios client: it must not send the
// teacher token, show toasts, or redirect to the login page the way lib/api.ts does.

import axios, { type AxiosRequestConfig } from 'axios';

const BASE = `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api'}/public/tests`;

const http = axios.create({
  baseURL: BASE,
  timeout: 20000,
  headers: { 'Content-Type': 'application/json' },
});

// ── Types ─────────────────────────────────────────────────────────────

export interface ExamImage {
  url: string;
  id: string;
  width?: number;
  height?: number;
  size?: 'small' | 'medium' | 'large' | 'full';
  alt?: string;
}
export interface ExamTable { rows: string[][]; headerRow?: boolean }
export interface ExamOption { label: string; text: string; image?: ExamImage }
export interface ExamQuestion {
  id: string;
  no: number;
  text: string;
  marks: number;
  options: ExamOption[];
  images?: ExamImage[];
  tables?: ExamTable[];
  /** Only present in the review after submit, and only when the teacher turned answers on. */
  correct?: string;
}
export interface ExamSection { id: string; title: string; description?: string; questions: ExamQuestion[] }
export interface AnswerState { selected: string | null; marked: boolean; visited: boolean; t: number }

export type TestState = 'open' | 'not_open' | 'closed' | 'ended';

export interface TestInfo {
  code: string;
  title: string;
  instructions: string | null;
  institution: string | null;
  subject: string | null;
  durationMin: number;
  questionCount: number;
  totalMarks: number;
  negativeMarks: number;
  sections: { title: string; count: number }[];
  opensAt: number | null;
  closesAt: number | null;
  state: TestState;
}

export interface AttemptData {
  test: {
    title: string;
    institution: string | null;
    subject: string | null;
    durationMin: number;
    totalMarks: number;
    questionCount: number;
    negativeMarks: number;
  };
  attempt: { name: string; rollNo: string; startedAt: number; deadlineAt: number; tabSwitches: number };
  sections: ExamSection[];
  answers: Record<string, AnswerState>;
}

export interface ResultData {
  submitted: true;
  title: string;
  name: string;
  rollNo: string;
  showResult: boolean;
  showAnswers: boolean;
  score?: number;
  totalMarks?: number;
  correct?: number;
  wrong?: number;
  skipped?: number;
  negativeMarks?: number;
  timeTakenSec?: number | null;
  review?: { sections: ExamSection[]; answers: Record<string, AnswerState> };
}

export type LoadResponse = ({ status: 'IN_PROGRESS' } & AttemptData) | { status: 'SUBMITTED' };

export interface ExamError { status: number; code: string; message: string; network: boolean }

export function toApiError(err: unknown): ExamError {
  const e = err as { response?: { status: number; data?: { error?: string; code?: string } } };
  if (e?.response) {
    return {
      status: e.response.status,
      code: e.response.data?.code || 'ERROR',
      message: e.response.data?.error || 'Something went wrong. Please try again.',
      network: false,
    };
  }
  return { status: 0, code: 'NETWORK', message: 'No connection. Please check your internet.', network: true };
}

// ── Calls ─────────────────────────────────────────────────────────────

/** `offset` = server clock minus this device's clock (ms), or null if the reply had no server time. */
async function call<T>(config: AxiosRequestConfig): Promise<{ data: T; offset: number | null }> {
  const sent = Date.now();
  const res = await http.request<T & { serverNow?: number }>(config);
  const recv = Date.now();
  const serverNow = (res.data as { serverNow?: number } | undefined)?.serverNow;
  return {
    data: res.data as T,
    offset: typeof serverNow === 'number' ? serverNow - Math.round((sent + recv) / 2) : null,
  };
}

const auth = (token: string) => ({ 'X-Attempt-Token': token });

export const publicTestApi = {
  info: (code: string) => call<TestInfo>({ method: 'get', url: `/${encodeURIComponent(code)}` }),
  check: (code: string, name: string, rollNo: string) =>
    call<{ ok: boolean; resume: boolean }>({ method: 'post', url: `/${encodeURIComponent(code)}/check`, data: { name, rollNo } }),
  start: (code: string, name: string, rollNo: string) =>
    call<{ token: string; resumed: boolean }>({ method: 'post', url: `/${encodeURIComponent(code)}/start`, data: { name, rollNo } }),
  load: (token: string) => call<LoadResponse>({ method: 'get', url: '/attempt', headers: auth(token) }),
  save: (token: string, answers: Record<string, AnswerState>) =>
    call<{ ok: boolean }>({ method: 'put', url: '/attempt/answers', data: { answers }, headers: auth(token) }),
  submit: (token: string, answers: Record<string, AnswerState>, tabSwitches = 0) =>
    call<ResultData>({ method: 'post', url: '/attempt/submit', data: { answers, tabSwitches }, headers: auth(token), timeout: 30000 }),
  /** How many times the student has left the exam screen so far (the server keeps the highest value). */
  event: (token: string, tabSwitches: number) =>
    call<{ ok: boolean }>({ method: 'post', url: '/attempt/event', data: { tabSwitches }, headers: auth(token) }),
  result: (token: string) => call<ResultData>({ method: 'get', url: '/attempt/result', headers: auth(token) }),
};

// ── The attempt token lives in this browser, one per test ─────────────

const key = (code: string) => `paptrix:attempt:${code}`;

export function loadStoredToken(code: string): string | null {
  try { return localStorage.getItem(key(code)); } catch { return null; }
}
export function storeToken(code: string, token: string) {
  try { localStorage.setItem(key(code), token); } catch { /* private mode: the student can still re-enter name and roll */ }
}
export function clearToken(code: string) {
  try { localStorage.removeItem(key(code)); } catch { /* ignore */ }
}