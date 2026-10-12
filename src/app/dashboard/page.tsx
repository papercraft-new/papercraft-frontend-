'use client';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '@/store/authStore';
import { papersApi } from '@/lib/api';
import { formatDate } from '@/lib/utils';

const quickActions = [
  { href: '/dashboard/upload', label: '📤 Upload & OCR', desc: 'Upload handwritten or scanned files' },
  { href: '/dashboard/builder', label: '✏️ Build Paper', desc: 'Create from scratch manually' },
  { href: '/dashboard/templates', label: '🎨 Templates', desc: 'Choose from 6 pro templates' },
  { href: '/dashboard/ai-assistant', label: '🤖 AI Assistant', desc: 'Generate questions with AI' },
];

const statusColors: Record<string, { bg: string; color: string }> = {
  READY:      { bg: 'rgba(16,185,129,0.15)', color: '#10b981' },
  DRAFT:      { bg: 'rgba(245,158,11,0.15)', color: '#f59e0b' },
  PROCESSING: { bg: 'rgba(59,130,246,0.15)', color: '#3b82f6' },
  ARCHIVED:   { bg: 'rgba(100,116,139,0.15)', color: '#64748b' },
};

export default function DashboardPage() {
  const { user } = useAuthStore();

  const { data: papersData, isLoading } = useQuery({
    queryKey: ['papers', { page: 1, limit: 5 }],
    queryFn: () => papersApi.list({ page: 1, limit: 5 }),
  });

  const papers = papersData?.data?.data || [];
  const totalPapers = papersData?.data?.pagination?.total || 0;

  const firstName = user?.name?.split(' ')[0] || 'there';
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  const card = {
    background: 'hsl(222 41% 12%)',
    border: '1px solid hsl(217 33% 18%)',
    borderRadius: '12px',
    padding: '1.25rem',
  };

  const statCards = [
    { label: 'Total Papers', value: totalPapers, icon: '📄', color: '#60a5fa' },
    { label: 'Total Exports', value: totalPapers * 2, icon: '⬇️', color: '#10b981' },
    { label: 'Hours Saved', value: `${Math.round(totalPapers * 0.4)}h`, icon: '⏱️', color: '#f59e0b' },
    { label: 'OCR Jobs', value: totalPapers, icon: '🔍', color: '#a78bfa' },
  ];

  return (
    <div style={{ padding: '1.5rem', maxWidth: '1200px', margin: '0 auto' }}>

      {/* HEADER */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '2rem' } as React.CSSProperties}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#f1f5f9', marginBottom: '4px' }}>
            {greeting}, {firstName}! 👋
          </h1>
          <p style={{ color: '#94a3b8', fontSize: '14px' }}>
            
          </p>
        </div>
        <Link href="/dashboard/builder">
          <button style={{
            background: 'linear-gradient(135deg, #2563eb, #06b6d4)',
            color: '#fff',
            border: 'none',
            borderRadius: '10px',
            padding: '10px 20px',
            fontSize: '14px',
            fontWeight: 600,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
          }}>
            ✚ New Paper
          </button>
        </Link>
      </div>

      {/* STAT CARDS */}
      <div className="overview-stats" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', marginBottom: '2rem' }}>
        {statCards.map((stat) => (
          <div key={stat.label} style={card}>
            <div style={{ fontSize: '24px', marginBottom: '8px' }}>{stat.icon}</div>
            <div style={{ fontSize: '1.75rem', fontWeight: 800, color: stat.color }}>
              {stat.value}
            </div>
            <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '4px' }}>
              {stat.label}
            </div>
          </div>
        ))}
      </div>

      {/* BODY GRID */}
      <div className="overview-body" style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '1.5rem' }}>

        {/* QUICK ACTIONS */}
        <div>
          

          {/* AI Tip */}
          <div style={{
            marginTop: '16px',
            padding: '16px',
            background: 'rgba(37,99,235,0.1)',
            border: '1px solid rgba(59,130,246,0.2)',
            borderRadius: '12px',
          }}>
            <div style={{ fontSize: '12px', fontWeight: 600, color: '#60a5fa', marginBottom: '6px' }}>
              ✨ AI Tip
            </div>
            <p style={{ fontSize: '12px', color: '#94a3b8', lineHeight: 1.6 }}>
              Upload a clear photo of handwritten questions for best OCR accuracy. Good lighting helps!
            </p>
          </div>
        </div>

        {/* RECENT PAPERS */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
            <div style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#64748b' }}>
              Recent Papers
            </div>
            <Link href="/dashboard/papers" style={{ fontSize: '12px', color: '#60a5fa', textDecoration: 'none' }}>
              View all →
            </Link>
          </div>

          <div style={card}>
            {isLoading ? (
              <div style={{ padding: '1rem', color: '#94a3b8', fontSize: '14px' }}>Loading papers...</div>
            ) : papers.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '3rem 1rem' }}>
                <div style={{ fontSize: '2rem', marginBottom: '8px' }}>📚</div>
                <div style={{ color: '#94a3b8', fontSize: '14px', marginBottom: '4px' }}>No papers yet</div>
                <div style={{ color: '#64748b', fontSize: '12px', marginBottom: '16px' }}>
                  Create your first question paper to get started.
                </div>
                <Link href="/dashboard/builder">
                  <button style={{
                    background: 'linear-gradient(135deg, #2563eb, #06b6d4)',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '8px',
                    padding: '8px 16px',
                    fontSize: '13px',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}>
                    ✚ Create Paper
                  </button>
                </Link>
              </div>
            ) : (
              <table className="papers-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid hsl(217 33% 18%)' }}>
                    {['Title', 'Subject', 'Date', 'Status', ''].map((h) => (
                      <th key={h} style={{
                        textAlign: 'left',
                        padding: '10px 12px',
                        fontSize: '11px',
                        fontWeight: 700,
                        textTransform: 'uppercase',
                        letterSpacing: '0.06em',
                        color: '#64748b',
                      }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {papers.map((paper: Record<string, unknown>) => {
                    const ed = paper.examDetails as Record<string, unknown> | undefined;
                    const status = paper.status as string;
                    const sc = statusColors[status] || statusColors.DRAFT;
                    return (
                      <tr
                        key={paper.id as string}
                        style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}
                      >
                        <td style={{ padding: '10px 12px' }}>
                          <div style={{ fontSize: '13px', fontWeight: 500, color: '#f1f5f9' }}>
                            {paper.title as string}
                          </div>
                          <div style={{ fontSize: '11px', color: '#64748b' }}>
                            {paper.totalMarks as number} marks
                          </div>
                        </td>
                        <td style={{ padding: '10px 12px', fontSize: '13px', color: '#94a3b8' }}>
                          {(ed?.subject as string) || '—'}
                        </td>
                        <td style={{ padding: '10px 12px', fontSize: '12px', color: '#64748b' }}>
                          {formatDate(paper.createdAt as string)}
                        </td>
                        <td style={{ padding: '10px 12px' }}>
                          <span style={{
                            fontSize: '11px',
                            fontWeight: 600,
                            padding: '3px 8px',
                            borderRadius: '6px',
                            background: sc.bg,
                            color: sc.color,
                          }}>
                            {status}
                          </span>
                        </td>
                        <td style={{ padding: '10px 12px' }}>
                          <Link href={`/dashboard/builder?id=${paper.id}`}>
                           
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}