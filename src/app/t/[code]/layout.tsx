// app/t/[code]/layout.tsx
// Public exam pages: KaTeX styles, a fix so wide equations scroll instead of breaking the page,
// and no search-engine indexing of test links.

import type { Metadata } from 'next';
import 'katex/dist/katex.min.css';

export const metadata: Metadata = {
  title: 'Online Test — Paptrix',
  robots: { index: false, follow: false },
};

export default function ExamLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <style>{`.exam-html .katex-display{overflow-x:auto;overflow-y:hidden;padding:2px 0}.exam-html{overflow-wrap:anywhere}`}</style>
      {children}
    </>
  );
}