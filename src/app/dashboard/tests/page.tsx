'use client';
// app/dashboard/tests/page.tsx
// My Tests (CBT step 1): the tests you published. Share the link or QR code, close or reopen a
// test, delete one, open its results.

import React, { useState } from 'react';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { testsApi, testsError } from '@/lib/testsApi';
import type { TestSummary } from '@/lib/testsApi';
import { ShareTestPanel } from '@/components/tests/PublishTestModal';

const BORDER = '1px solid hsl(217 33% 18%)';

const small = (color = '#cbd5e1', bg = 'hsl(222 30% 14%)', border = BORDER): React.CSSProperties => ({
  minHeight: '34px', padding: '0 12px', borderRadius: '8px', fontSize: '12px', fontWeight: 600, cursor: 'pointer',
  color, background: bg, border,
});

function whenText(d: string | null) {
  return d ? new Date(d).toLocaleString(undefined, { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' }) : '';
}

/** Live, Scheduled, Ended or Closed, from the status and the open/close times. */
function liveStatus(t: TestSummary): { label: string; color: string; bg: string; note: string } {
  const now = Date.now();
  if (t.status === 'CLOSED') return { label: 'Closed', color: '#94a3b8', bg: 'rgba(100,116,139,0.15)', note: 'Students cannot start it' };
  if (t.opensAt && new Date(t.opensAt).getTime() > now) {
    return { label: 'Scheduled', color: '#f59e0b', bg: 'rgba(245,158,11,0.15)', note: `Opens ${whenText(t.opensAt)}` };
  }
  if (t.closesAt && new Date(t.closesAt).getTime() <= now) {
    return { label: 'Ended', color: '#94a3b8', bg: 'rgba(100,116,139,0.15)', note: `Closed ${whenText(t.closesAt)}` };
  }
  return { label: 'Live', color: '#10b981', bg: 'rgba(16,185,129,0.15)', note: t.closesAt ? `Closes ${whenText(t.closesAt)}` : 'Open now' };
}

export default function TestsPage() {
  const queryClient = useQueryClient();
  const [shareId, setShareId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<TestSummary | null>(null);

  const { data: tests, isLoading, isError } = useQuery({
    queryKey: ['tests'],
    queryFn: async () => (await testsApi.list()).data.data,
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: 'PUBLISHED' | 'CLOSED' }) => testsApi.update(id, { status }),
    onSuccess: (_r, v) => {
      queryClient.invalidateQueries({ queryKey: ['tests'] });
      toast.success(v.status === 'CLOSED' ? 'Test closed' : 'Test reopened');
    },
    onError: err => toast.error(testsError(err, 'Could not update the test.')),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => testsApi.remove(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tests'] });
      setDeleteTarget(null);
      toast.success('Test deleted');
    },
    onError: err => toast.error(testsError(err, 'Could not delete the test.')),
  });

  return (
    <div style={{ padding: '1.5rem', maxWidth: '1000px', margin: '0 auto' }}>
      <div style={{ marginBottom: '1.25rem' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#f1f5f9', marginBottom: '4px' }}>Online Tests</h1>
        <p style={{ color: '#94a3b8', fontSize: '13px', margin: 0 }}>
          Publish a saved paper as a timed test and share the link. Students need no account. To publish one, use &quot;Test&quot; on a paper in{' '}
          <Link href="/dashboard/papers" style={{ color: '#60a5fa' }}>My Papers</Link>.
        </p>
      </div>

      {isLoading && <div style={{ color: '#94a3b8', fontSize: '13px' }}>Loading your tests...</div>}
      {isError && <div style={{ color: '#f87171', fontSize: '13px' }}>Could not load your tests. Please refresh.</div>}

      {tests && tests.length === 0 && (
        <div style={{ border: BORDER, borderRadius: '12px', padding: '2rem', textAlign: 'center', color: '#94a3b8', fontSize: '13px' }}>
          No tests yet. Open <Link href="/dashboard/papers" style={{ color: '#60a5fa' }}>My Papers</Link> and press &quot;Test&quot; on a paper whose multiple-choice questions have the correct option marked.
        </div>
      )}

      <div style={{ display: 'grid', gap: '12px' }}>
        {(tests ?? []).map(t => {
          const st = liveStatus(t);
          const isOpen = shareId === t.id;
          return (
            <div key={t.id} style={{ border: BORDER, borderRadius: '12px', padding: '14px', background: 'rgba(255,255,255,0.02)' }}>
              <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '10px' }}>
                <div style={{ flex: '1 1 220px', minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '15px', fontWeight: 700, color: '#f1f5f9', overflowWrap: 'anywhere' }}>{t.title}</span>
                    <span style={{ fontSize: '10px', fontWeight: 700, padding: '2px 8px', borderRadius: '999px', color: st.color, background: st.bg }}>{st.label}</span>
                  </div>
                  <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>
                    {t.questionCount} questions · {t.totalMarks} marks · {t.durationMin} min
                    {t.negativeMarks > 0 ? ` · −${t.negativeMarks} per wrong answer` : ''} · {st.note}
                  </div>
                  <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '2px' }}>
                    {t.attempts} attempt{t.attempts === 1 ? '' : 's'} ({t.submitted} submitted)
                  </div>
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  <button type="button" style={small('#fff', '#2563eb', '1px solid #2563eb')} onClick={() => setShareId(isOpen ? null : t.id)}>
                    {isOpen ? 'Hide link' : 'Share'}
                  </button>
                  <Link href={`/dashboard/tests/${t.id}`} style={{ ...small(), display: 'inline-flex', alignItems: 'center', textDecoration: 'none' }}>Results</Link>
                  <button
                    type="button"
                    style={small()}
                    disabled={statusMutation.isPending}
                    onClick={() => statusMutation.mutate({ id: t.id, status: t.status === 'CLOSED' ? 'PUBLISHED' : 'CLOSED' })}
                  >
                    {t.status === 'CLOSED' ? 'Reopen' : 'Close'}
                  </button>
                  <button type="button" style={small('#f87171', 'rgba(239,68,68,0.08)', '1px solid rgba(239,68,68,0.25)')} onClick={() => setDeleteTarget(t)}>Delete</button>
                </div>
              </div>
              {isOpen && (
                <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: BORDER }}>
                  <ShareTestPanel code={t.code} title={t.title} />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {deleteTarget && (
        <div
          role="dialog"
          aria-modal="true"
          onMouseDown={e => { if (e.target === e.currentTarget) setDeleteTarget(null); }}
          style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(2,6,23,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '12px' }}
        >
          <div style={{ width: 'min(420px, 100%)', background: 'hsl(222 47% 11%)', border: BORDER, borderRadius: '14px', padding: '18px' }}>
            <h2 style={{ fontSize: '16px', fontWeight: 800, color: '#f1f5f9', margin: '0 0 8px' }}>Delete this test?</h2>
            <p style={{ fontSize: '13px', color: '#94a3b8', margin: '0 0 14px' }}>
              &quot;{deleteTarget.title}&quot; will stop working for students
              {deleteTarget.attempts > 0 ? `, and its ${deleteTarget.attempts} attempt${deleteTarget.attempts === 1 ? '' : 's'} will be deleted` : ''}. Your paper is not affected. This cannot be undone.
            </p>
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
              <button type="button" style={small()} onClick={() => setDeleteTarget(null)}>Cancel</button>
              <button
                type="button"
                style={small('#fff', '#dc2626', '1px solid #dc2626')}
                disabled={deleteMutation.isPending}
                onClick={() => deleteMutation.mutate(deleteTarget.id)}
              >
                {deleteMutation.isPending ? 'Deleting...' : 'Delete test'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}