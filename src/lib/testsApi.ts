// lib/testsApi.ts
// CBT steps 1 and 3: publishing and managing online tests, and their results (teacher side).

import { apiClient } from '@/lib/api';

export interface TestSummary {
  id: string;
  code: string;
  paperId: string | null;
  title: string;
  instructions: string | null;
  durationMin: number;
  marksPerQuestion: number;
  negativeMarks: number;
  shuffleQuestions: boolean;
  shuffleOptions: boolean;
  opensAt: string | null;
  closesAt: string | null;
  showResult: boolean;
  showAnswers: boolean;
  onePerRoll: boolean;
  status: 'PUBLISHED' | 'CLOSED';
  totalMarks: number;
  questionCount: number;
  createdAt: string;
  attempts: number;
  submitted: number;
}

export interface SkippedQuestion {
  question: string;
  section: string;
  reason: string;
}

export interface PaperCheck {
  title: string;
  usable: number;
  totalQuestions: number;
  skipped: SkippedQuestion[];
  skippedCount: number;
}

export interface PublishTestInput {
  paperId: string;
  title: string;
  instructions?: string;
  durationMin: number;
  marksPerQuestion: number;
  negativeMarks: number;
  opensAt?: string | null;
  closesAt?: string | null;
  shuffleQuestions: boolean;
  shuffleOptions: boolean;
  showResult: boolean;
  showAnswers: boolean;
  onePerRoll: boolean;
}

export const testsApi = {
  list: () => apiClient.get<{ success: boolean; data: TestSummary[] }>('/tests'),
  check: (paperId: string) => apiClient.post<{ success: boolean; data: PaperCheck }>('/tests/check', { paperId }),
  create: (data: PublishTestInput) =>
    apiClient.post<{ success: boolean; data: TestSummary; skippedCount: number }>('/tests', data),
  update: (id: string, data: Partial<Pick<TestSummary, 'title' | 'instructions' | 'status' | 'opensAt' | 'closesAt' | 'showResult' | 'showAnswers'>>) =>
    apiClient.patch<{ success: boolean; data: TestSummary }>(`/tests/${id}`, data),
  remove: (id: string) => apiClient.delete(`/tests/${id}`),
  results: (id: string) => apiClient.get<{ success: boolean; data: TestResults }>(`/tests/${id}/results`),
  resultsCsv: (id: string) => apiClient.get<Blob>(`/tests/${id}/results.csv`, { responseType: 'blob' }),
};

/** The server's error message when there is one (it explains what to fix), otherwise a fallback. */
export function testsError(err: unknown, fallback: string): string {
  const data = (err as { response?: { data?: { error?: string; errors?: Array<{ msg?: string }> } } })?.response?.data;
  return data?.error || data?.errors?.[0]?.msg || fallback;
}

// ── Results (step 3) ──────────────────────────────────────────────────

export interface ResultStudent {
  rank: number;
  name: string;
  rollNo: string;
  score: number;
  correct: number;
  wrong: number;
  skipped: number;
  timeTakenSec: number;
  submittedAt: number | null;
  sections: number[];
  tabSwitches: number;
}
export interface ResultQuestion {
  id: string;
  no: number;
  section: string;
  text: string;
  correct: string;
  marks: number;
  right: number;
  wrong: number;
  skipped: number;
  pctRight: number;
  avgTimeSec: number | null;
  options: Record<string, number>;
}
export interface TestResults {
  test: {
    id: string; code: string; title: string; totalMarks: number; questionCount: number;
    durationMin: number; negativeMarks: number; institution: string | null; subject: string | null;
  };
  summary: {
    submitted: number; stillWriting: number; totalMarks: number; average: number;
    highest: number; lowest: number; median: number; averageTimeSec: number;
  };
  sections: { title: string; questionCount: number; totalMarks: number; average: number }[];
  students: ResultStudent[];
  stillWriting: { name: string; rollNo: string; startedAt: number; deadlineAt: number; answered: number }[];
  distribution: { label: string; count: number }[];
  questions: ResultQuestion[];
}