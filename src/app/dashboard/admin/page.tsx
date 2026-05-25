'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/store/authStore';
import { adminApi, apiClient } from '@/lib/api';
import toast from 'react-hot-toast';

type AdminTab = 'overview' | 'users' | 'papers' | 'ocr' | 'revenue' | 'logs' | 'settings';

function formatDate(d: string) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function formatINR(p: number) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(p / 100);
}

function timeAgo(d: string) {
  if (!d) return '—';
  const diff = Date.now() - new Date(d).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function StatCard({
  icon,
  label,
  value,
  sub,
  color,
}: {
  icon: string;
  label: string;
  value: string | number;
  sub?: string;
  color: string;
}) {
  return (
    <div
      style={{
        background: 'hsl(222 41% 12%)',
        border: '1px solid hsl(217 33% 18%)',
        borderRadius: '14px',
        padding: '1.25rem',
      }}
    >
      <div style={{ fontSize: '1.6rem', marginBottom: '8px' }}>{icon}</div>
      <div style={{ fontSize: '1.8rem', fontWeight: 800, color, marginBottom: '2px' }}>{value}</div>
      <div style={{ fontSize: '12px', fontWeight: 600, color: '#94a3b8' }}>{label}</div>
      {sub && <div style={{ fontSize: '11px', color: '#64748b', marginTop: '4px' }}>{sub}</div>}
    </div>
  );
}

function Badge({ type }: { type: string }) {
  const colors: Record<string, { bg: string; color: string }> = {
    FREE: { bg: 'rgba(100,116,139,0.15)', color: '#94a3b8' },
    PRO: { bg: 'rgba(59,130,246,0.15)', color: '#60a5fa' },
    INSTITUTION: { bg: 'rgba(245,158,11,0.15)', color: '#fbbf24' },
    ADMIN: { bg: 'rgba(168,85,247,0.15)', color: '#c084fc' },
    USER: { bg: 'rgba(100,116,139,0.15)', color: '#94a3b8' },
    ACTIVE: { bg: 'rgba(16,185,129,0.15)', color: '#10b981' },
    SUSPENDED: { bg: 'rgba(239,68,68,0.15)', color: '#f87171' },
    COMPLETED: { bg: 'rgba(16,185,129,0.15)', color: '#10b981' },
    FAILED: { bg: 'rgba(239,68,68,0.15)', color: '#f87171' },
    PENDING: { bg: 'rgba(245,158,11,0.15)', color: '#fbbf24' },
    READY: { bg: 'rgba(16,185,129,0.15)', color: '#10b981' },
    DRAFT: { bg: 'rgba(245,158,11,0.15)', color: '#fbbf24' },
  };

  const c = colors[type] || colors.USER;

  return (
    <span
      style={{
        fontSize: '11px',
        fontWeight: 600,
        padding: '3px 8px',
        borderRadius: '6px',
        background: c.bg,
        color: c.color,
      }}
    >
      {type}
    </span>
  );
}

export default function AdminPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const queryClient = useQueryClient();

  const [tab, setTab] = useState<AdminTab>('overview');
  const [userSearch, setUserSearch] = useState('');
  const [userPage, setUserPage] = useState(1);
  const [pendingUserAction, setPendingUserAction] = useState<{ userId: string; action: string } | null>(null);

  const initialSections = [
    {
      title: '📋 Plan Limits',
      items: [
        { label: 'Free Plan — Papers/Month', value: '3', editable: true },
        { label: 'Free Plan — Exports/Month', value: '6', editable: true },
        { label: 'Pro Plan — Papers/Month', value: '30', editable: true },
        { label: 'Pro Plan — Price', value: '₹399/month', editable: true },
        { label: 'Institution Plan — Papers/Month', value: '70', editable: true },
        { label: 'Institution Plan — Price', value: '₹899/month', editable: true },
        { label: 'Max File Size', value: '50 MB', editable: true },
        { label: 'Max Files per Upload', value: '10', editable: true },
      ],
    },
    {
      title: '🤖 AI Configuration',
      items: [
        { label: 'Primary OCR', value: 'Claude Vision', editable: false },
        { label: 'AI Structuring', value: 'Claude + Mistral', editable: false },
        { label: 'OCR Fallback Order', value: 'Claude → OCR.space → Google → Tesseract', editable: false },
        { label: 'Max OCR per Hour', value: '50', editable: true },
      ],
    },
    {
      title: '💳 Payment Settings',
      items: [
        { label: 'Payment Gateway', value: 'Razorpay', editable: false },
        { label: 'Currency', value: 'INR', editable: false },
        { label: 'Pro Plan Price', value: '₹399/month', editable: true },
        { label: 'Institution Plan Price', value: '₹899/month', editable: true },
      ],
    },
  ];

  const [sections, setSections] = useState(initialSections);
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [draftValue, setDraftValue] = useState('');

  useEffect(() => {
    if (user && user.role === 'USER') {
      router.push('/dashboard');
      toast.error('Admin access required');
    }
  }, [user, router]);

  const handleEdit = (sectionTitle: string, itemLabel: string, currentValue: string) => {
    setEditingKey(`${sectionTitle}-${itemLabel}`);
    setDraftValue(currentValue);
  };

  const handleSave = (sectionTitle: string, itemLabel: string) => {
    setSections(prev =>
      prev.map(section =>
        section.title === sectionTitle
          ? {
              ...section,
              items: section.items.map(item =>
                item.label === itemLabel ? { ...item, value: draftValue } : item
              ),
            }
          : section
      )
    );
    setEditingKey(null);
    setDraftValue('');
    toast.success('Setting updated');
  };

  const handleCancel = () => {
    setEditingKey(null);
    setDraftValue('');
  };

  const { data: statsData, isLoading: statsLoading } = useQuery({
    queryKey: ['admin-stats'],
    queryFn: () => adminApi.getStats(),
    enabled: user?.role !== 'USER',
    staleTime: 2 * 60 * 1000,
  });

  const { data: usersData, isLoading: usersLoading } = useQuery({
    queryKey: ['admin-users', userPage, userSearch],
    queryFn: () => adminApi.getUsers({ page: userPage, search: userSearch || undefined }),
    enabled: user?.role !== 'USER' && tab === 'users',
    staleTime: 60 * 1000,
  });

  const { data: ocrData } = useQuery({
    queryKey: ['admin-ocr-stats'],
    queryFn: () => adminApi.getOcrStats(),
    enabled: user?.role !== 'USER',
    staleTime: 2 * 60 * 1000,
  });

  const { data: activityData } = useQuery({
    queryKey: ['admin-activity'],
    queryFn: () => adminApi.getActivity(),
    enabled: user?.role !== 'USER' && tab === 'logs',
    staleTime: 30 * 1000,
  });

  const toggleUserMutation = useMutation({
    mutationFn: (userId: string) => adminApi.toggleUserActive(userId),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      queryClient.invalidateQueries({ queryKey: ['admin-stats'] });
      const isActive = data.data?.data?.isActive;
      toast.success(isActive ? 'User activated' : 'User suspended');
      setPendingUserAction(null);
    },
    onError: () => toast.error('Action failed'),
  });

  const stats = statsData?.data?.data;
  const users = usersData?.data?.data || [];
  const pagination = usersData?.data?.pagination;
  const ocr = ocrData?.data?.data;
  const logs = activityData?.data?.data || [];

  if (!user || user.role === 'USER') return null;

  const card = (extra?: React.CSSProperties): React.CSSProperties => ({
    background: 'hsl(222 41% 12%)',
    border: '1px solid hsl(217 33% 18%)',
    borderRadius: '14px',
    ...extra,
  });

  const tabBtn = (t: AdminTab): React.CSSProperties => ({
    padding: '8px 16px',
    borderRadius: '8px',
    fontSize: '13px',
    fontWeight: 600,
    border: 'none',
    background: tab === t ? 'rgba(59,130,246,0.15)' : 'transparent',
    color: tab === t ? '#60a5fa' : '#94a3b8',
    cursor: 'pointer',
    transition: 'all 0.15s',
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    whiteSpace: 'nowrap' as const,
  });

  const th: React.CSSProperties = {
    textAlign: 'left',
    padding: '10px 14px',
    fontSize: '11px',
    fontWeight: 700,
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
    color: '#64748b',
    borderBottom: '1px solid hsl(217 33% 18%)',
  };

  const td: React.CSSProperties = {
    padding: '10px 14px',
    fontSize: '13px',
    color: '#94a3b8',
    borderBottom: '1px solid rgba(255,255,255,0.03)',
  };

  return (
    <div style={{ padding: '1.5rem', maxWidth: '1300px', margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
        <div>
          <h1
            style={{
              fontSize: '1.5rem',
              fontWeight: 800,
              color: '#f1f5f9',
              marginBottom: '4px',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
            }}
          >
            🛡️ Admin Dashboard
          </h1>
          <p style={{ color: '#64748b', fontSize: '13px' }}>
            Welcome back, {user.name} · Last updated: {new Date().toLocaleTimeString()}
          </p>
        </div>
        <button
          onClick={() => {
            queryClient.invalidateQueries();
            toast.success('Data refreshed');
          }}
          style={{
            padding: '8px 16px',
            background: 'hsl(222 41% 12%)',
            border: '1px solid hsl(217 33% 18%)',
            borderRadius: '8px',
            color: '#94a3b8',
            fontSize: '13px',
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          🔄 Refresh
        </button>
      </div>

      <div style={{ display: 'flex', gap: '4px', overflowX: 'auto', marginBottom: '1.5rem', paddingBottom: '4px' }}>
        {([
          { id: 'overview', icon: '📊', label: 'Overview' },
          { id: 'users', icon: '👥', label: 'Users' },
          { id: 'papers', icon: '📄', label: 'Papers' },
          { id: 'ocr', icon: '🔍', label: 'OCR Stats' },
          { id: 'revenue', icon: '💰', label: 'Revenue' },
          { id: 'logs', icon: '📋', label: 'Activity Logs' },
          { id: 'settings', icon: '⚙️', label: 'Settings' },
        ] as { id: AdminTab; icon: string; label: string }[]).map(t => (
          <button key={t.id} style={tabBtn(t.id)} onClick={() => setTab(t.id)}>
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {tab === 'overview' && (
        <div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', marginBottom: '1.5rem' }}>
            <StatCard icon="👥" label="Total Users" value={statsLoading ? '...' : stats?.totalUsers || 0} sub={`${stats?.signupsLastMonth || 0} this month`} color="#60a5fa" />
            <StatCard icon="📄" label="Papers Generated" value={statsLoading ? '...' : stats?.totalPapers || 0} sub={`${stats?.papersLastMonth || 0} this month`} color="#10b981" />
            <StatCard icon="💰" label="Monthly Revenue" value={statsLoading ? '...' : formatINR((stats?.mrr || 0) * 100)} sub="This month" color="#fbbf24" />
            <StatCard icon="🔍" label="OCR Jobs" value={statsLoading ? '...' : stats?.totalOcrJobs || 0} sub={`${ocr?.successRate || 0}% success`} color="#a78bfa" />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
            <div style={card({ padding: '1.25rem' })}>
              <div style={{ fontSize: '14px', fontWeight: 700, color: '#f1f5f9', marginBottom: '1rem' }}>📊 Plan Distribution</div>
              {statsLoading ? (
                <div style={{ color: '#64748b', fontSize: '13px' }}>Loading...</div>
              ) : (
                (stats?.usersByPlan || []).map((item: { plan: string; count: number }) => {
                  const total = stats?.totalUsers || 1;
                  const pct = Math.round((item.count / total) * 100);
                  const colors: Record<string, string> = { FREE: '#64748b', PRO: '#3b82f6', INSTITUTION: '#f59e0b' };
                  return (
                    <div key={item.plan} style={{ marginBottom: '12px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '4px' }}>
                        <span style={{ color: colors[item.plan] || '#94a3b8', fontWeight: 600 }}>{item.plan}</span>
                        <span style={{ color: '#64748b' }}>{item.count} users ({pct}%)</span>
                      </div>
                      <div style={{ height: '6px', background: 'hsl(222 30% 14%)', borderRadius: '3px', overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${pct}%`, background: colors[item.plan] || '#64748b', borderRadius: '3px', transition: 'width 0.5s' }} />
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <div style={card({ padding: '1.25rem' })}>
              <div style={{ fontSize: '14px', fontWeight: 700, color: '#f1f5f9', marginBottom: '1rem' }}>⚡ Quick Stats</div>
              {[
                { label: 'Active Users (30 days)', value: stats?.activeUsers || 0, icon: '🟢' },
                { label: 'Total Exports', value: stats?.totalExports || 0, icon: '📥' },
                { label: 'OCR Success Rate', value: `${ocr?.successRate || 0}%`, icon: '✅' },
                { label: 'Avg OCR Confidence', value: `${ocr?.avgConfidence || 0}%`, icon: '🎯' },
                { label: 'Avg Processing Time', value: `${ocr?.avgProcessingMs || 0}ms`, icon: '⚡' },
                { label: 'Failed OCR Jobs', value: ocr?.failed || 0, icon: '❌' },
              ].map(item => (
                <div key={item.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '7px 0', borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                  <span style={{ fontSize: '13px', color: '#94a3b8' }}>{item.icon} {item.label}</span>
                  <span style={{ fontSize: '13px', fontWeight: 700, color: '#f1f5f9' }}>{statsLoading ? '...' : item.value}</span>
                </div>
              ))}
            </div>
          </div>

          <div style={card({ padding: '1.25rem' })}>
            <div style={{ fontSize: '14px', fontWeight: 700, color: '#f1f5f9', marginBottom: '1rem' }}>🆕 Recent Users</div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    {['User', 'Email', 'Plan', 'Role', 'Joined', 'Status'].map(h => (
                      <th key={h} style={th}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {users.slice(0, 5).map((u: Record<string, unknown>) => {
                    const sub = u.subscription as Record<string, unknown> | undefined;
                    const plan = sub?.plan as Record<string, unknown> | undefined;
                    return (
                      <tr key={u.id as string} style={{ cursor: 'pointer' }} onClick={() => setTab('users')}>
                        <td style={td}><span style={{ fontWeight: 600, color: '#f1f5f9' }}>{(u.name as string) || 'No name'}</span></td>
                        <td style={td}>{u.email as string}</td>
                        <td style={td}><Badge type={(plan?.type as string) || 'FREE'} /></td>
                        <td style={td}><Badge type={u.role as string} /></td>
                        <td style={td}>{formatDate(u.createdAt as string)}</td>
                        <td style={td}><Badge type={(u.isActive as boolean) ? 'ACTIVE' : 'SUSPENDED'} /></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {tab === 'users' && (
        <div>
          <div style={{ display: 'flex', gap: '10px', marginBottom: '1rem', alignItems: 'center' }}>
            <input
              value={userSearch}
              onChange={e => {
                setUserSearch(e.target.value);
                setUserPage(1);
              }}
              placeholder="🔍 Search by name or email..."
              style={{
                flex: 1,
                background: 'hsl(222 41% 12%)',
                border: '1px solid hsl(217 33% 18%)',
                borderRadius: '8px',
                padding: '9px 14px',
                fontSize: '13px',
                color: '#f1f5f9',
                outline: 'none',
              }}
            />
            <div style={{ fontSize: '13px', color: '#64748b', whiteSpace: 'nowrap' }}>
              {pagination?.total || 0} total users
            </div>
          </div>

          <div style={card({})}>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    {['User', 'Email', 'Plan', 'Role', 'Papers', 'Last Login', 'Joined', 'Status', 'Actions'].map(h => (
                      <th key={h} style={th}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {usersLoading ? (
                    <tr><td colSpan={9} style={{ ...td, textAlign: 'center', padding: '2rem' }}>Loading users...</td></tr>
                  ) : users.length === 0 ? (
                    <tr><td colSpan={9} style={{ ...td, textAlign: 'center', padding: '2rem', color: '#64748b' }}>No users found</td></tr>
                  ) : (
                    users.map((u: Record<string, unknown>) => {
                      const sub = u.subscription as Record<string, unknown> | undefined;
                      const plan = sub?.plan as Record<string, unknown> | undefined;
                      const count = u._count as Record<string, unknown> | undefined;
                      const isActive = u.isActive as boolean;

                      return (
                        <tr key={u.id as string}>
                          <td style={td}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <div
                                style={{
                                  width: '30px',
                                  height: '30px',
                                  borderRadius: '50%',
                                  background: 'rgba(59,130,246,0.2)',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  fontSize: '12px',
                                  fontWeight: 700,
                                  color: '#60a5fa',
                                  flexShrink: 0,
                                }}
                              >
                                {(((u.name as string) || (u.email as string) || '?')[0] || '?').toUpperCase()}
                              </div>
                              <span style={{ fontWeight: 600, color: '#f1f5f9', fontSize: '13px' }}>
                                {(u.name as string) || 'No name'}
                              </span>
                            </div>
                          </td>
                          <td style={{ ...td, fontSize: '12px' }}>{u.email as string}</td>
                          <td style={td}><Badge type={(plan?.type as string) || 'FREE'} /></td>
                          <td style={td}><Badge type={u.role as string} /></td>
                          <td style={{ ...td, textAlign: 'center' }}>{(count?.papers as number) ?? 0}</td>
                          <td style={{ ...td, fontSize: '12px' }}>{timeAgo(u.lastLoginAt as string)}</td>
                          <td style={{ ...td, fontSize: '12px' }}>{formatDate(u.createdAt as string)}</td>
                          <td style={td}><Badge type={isActive ? 'ACTIVE' : 'SUSPENDED'} /></td>
                          <td style={td}>
                            <div style={{ display: 'flex', gap: '6px' }}>
                              <button
                                onClick={() =>
                                  setPendingUserAction({
                                    userId: u.id as string,
                                    action: isActive ? 'suspend' : 'activate',
                                  })
                                }
                                style={{
                                  padding: '4px 10px',
                                  fontSize: '11px',
                                  fontWeight: 600,
                                  borderRadius: '6px',
                                  border: 'none',
                                  cursor: 'pointer',
                                  background: isActive ? 'rgba(239,68,68,0.1)' : 'rgba(16,185,129,0.1)',
                                  color: isActive ? '#f87171' : '#10b981',
                                }}
                              >
                                {isActive ? '🚫 Suspend' : '✅ Activate'}
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {pagination && pagination.totalPages > 1 && (
              <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', padding: '1rem', borderTop: '1px solid hsl(217 33% 18%)' }}>
                <button
                  onClick={() => setUserPage(p => Math.max(1, p - 1))}
                  disabled={userPage === 1}
                  style={{
                    padding: '6px 14px',
                    borderRadius: '7px',
                    border: '1px solid hsl(217 33% 18%)',
                    background: 'transparent',
                    color: '#94a3b8',
                    cursor: 'pointer',
                    fontSize: '12px',
                  }}
                >
                  ← Prev
                </button>
                <span style={{ fontSize: '12px', color: '#64748b', padding: '6px 8px' }}>
                  Page {userPage} of {pagination.totalPages}
                </span>
                <button
                  onClick={() => setUserPage(p => p + 1)}
                  disabled={!pagination.hasNext}
                  style={{
                    padding: '6px 14px',
                    borderRadius: '7px',
                    border: '1px solid hsl(217 33% 18%)',
                    background: 'transparent',
                    color: '#94a3b8',
                    cursor: 'pointer',
                    fontSize: '12px',
                  }}
                >
                  Next →
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {tab === 'papers' && (
        <div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', marginBottom: '1rem' }}>
            <StatCard icon="📄" label="Total Papers" value={stats?.totalPapers || 0} sub="All time" color="#60a5fa" />
            <StatCard icon="📅" label="This Month" value={stats?.papersLastMonth || 0} sub="Papers created" color="#10b981" />
            <StatCard icon="📥" label="Total Exports" value={stats?.totalExports || 0} sub="DOCX + PDF" color="#fbbf24" />
          </div>
          <div style={card({ padding: '1.25rem' })}>
            <div style={{ fontSize: '14px', fontWeight: 700, color: '#f1f5f9', marginBottom: '1rem' }}>📄 Paper Statistics</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              {[
                { label: 'Total Papers Created', value: stats?.totalPapers || 0 },
                { label: 'Papers This Month', value: stats?.papersLastMonth || 0 },
                { label: 'Total Exports', value: stats?.totalExports || 0 },
                { label: 'Avg Papers per User', value: stats?.totalUsers ? Math.round((stats.totalPapers || 0) / stats.totalUsers) : 0 },
              ].map(item => (
                <div key={item.label} style={{ background: 'hsl(222 47% 7%)', borderRadius: '10px', padding: '1rem' }}>
                  <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#60a5fa' }}>{item.value}</div>
                  <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '4px' }}>{item.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {tab === 'ocr' && (
        <div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', marginBottom: '1rem' }}>
            <StatCard icon="🔍" label="Total OCR Jobs" value={ocr?.total || 0} sub="All time" color="#60a5fa" />
            <StatCard icon="✅" label="Completed" value={ocr?.completed || 0} sub={`${ocr?.successRate || 0}% success`} color="#10b981" />
            <StatCard icon="❌" label="Failed" value={ocr?.failed || 0} sub="Needs attention" color="#f87171" />
            <StatCard icon="🎯" label="Avg Confidence" value={`${ocr?.avgConfidence || 0}%`} sub="Text accuracy" color="#fbbf24" />
          </div>
          <div style={card({ padding: '1.25rem' })}>
            <div style={{ fontSize: '14px', fontWeight: 700, color: '#f1f5f9', marginBottom: '1rem' }}>🔍 OCR System Health</div>
            {[
              { label: 'Success Rate', value: `${ocr?.successRate || 0}%`, good: (ocr?.successRate || 0) > 90 },
              { label: 'Average Confidence', value: `${ocr?.avgConfidence || 0}%`, good: (ocr?.avgConfidence || 0) > 80 },
              { label: 'Avg Processing Time', value: `${ocr?.avgProcessingMs || 0}ms`, good: (ocr?.avgProcessingMs || 0) < 5000 },
              { label: 'Failed Jobs', value: ocr?.failed || 0, good: (ocr?.failed || 0) < 10 },
            ].map(item => (
              <div key={item.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                <span style={{ fontSize: '13px', color: '#94a3b8' }}>{item.label}</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '13px', fontWeight: 700, color: '#f1f5f9' }}>{item.value}</span>
                  <span style={{ fontSize: '11px' }}>{item.good ? '🟢' : '🔴'}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === 'revenue' && (
        <div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', marginBottom: '1rem' }}>
            <StatCard icon="💰" label="Monthly Revenue" value={formatINR((stats?.mrr || 0) * 100)} sub="This month" color="#fbbf24" />
            <StatCard icon="👑" label="Pro Users" value={(stats?.usersByPlan || []).find((p: { plan: string; count: number }) => p.plan === 'PRO')?.count || 0} sub="₹399/month each" color="#60a5fa" />
            <StatCard icon="🏢" label="Institution Users" value={(stats?.usersByPlan || []).find((p: { plan: string; count: number }) => p.plan === 'INSTITUTION')?.count || 0} sub="₹899/month each" color="#10b981" />
          </div>
          <div style={card({ padding: '1.25rem' })}>
            <div style={{ fontSize: '14px', fontWeight: 700, color: '#f1f5f9', marginBottom: '1rem' }}>💰 Revenue Breakdown</div>
            {[
              { plan: 'Free', users: (stats?.usersByPlan || []).find((p: { plan: string }) => p.plan === 'FREE')?.count || 0, price: 0, color: '#64748b' },
              { plan: 'Pro', users: (stats?.usersByPlan || []).find((p: { plan: string }) => p.plan === 'PRO')?.count || 0, price: 399, color: '#3b82f6' },
              { plan: 'Institution', users: (stats?.usersByPlan || []).find((p: { plan: string }) => p.plan === 'INSTITUTION')?.count || 0, price: 899, color: '#f59e0b' },
            ].map(item => (
              <div key={item.plan} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px', marginBottom: '8px', background: 'hsl(222 47% 7%)', borderRadius: '10px' }}>
                <div>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: item.color }}>{item.plan} Plan</div>
                  <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>{item.users} users × ₹{item.price}/month</div>
                </div>
                <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#f1f5f9' }}>
                  ₹{(item.users * item.price).toLocaleString('en-IN')}
                </div>
              </div>
            ))}
            <div style={{ marginTop: '1rem', padding: '12px', background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.2)', borderRadius: '10px', display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '14px', fontWeight: 700, color: '#60a5fa' }}>Total MRR</span>
              <span style={{ fontSize: '1.2rem', fontWeight: 800, color: '#60a5fa' }}>
                {formatINR((stats?.mrr || 0) * 100)}
              </span>
            </div>
          </div>
        </div>
      )}

      {tab === 'logs' && (
        <div style={card({})}>
          <div style={{ padding: '1.25rem 1.25rem 0' }}>
            <div style={{ fontSize: '14px', fontWeight: 700, color: '#f1f5f9', marginBottom: '1rem' }}>📋 Recent Activity Logs</div>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  {['User', 'Action', 'Details', 'Time'].map(h => (
                    <th key={h} style={th}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {logs.length === 0 ? (
                  <tr><td colSpan={4} style={{ ...td, textAlign: 'center', padding: '2rem', color: '#64748b' }}>No activity logs yet</td></tr>
                ) : (
                  logs.map((log: Record<string, unknown>) => {
                    const logUser = log.user as Record<string, unknown> | undefined;
                    const actionColors: Record<string, string> = {
                      paper_created: '#10b981',
                      paper_exported: '#60a5fa',
                      ocr_processed: '#a78bfa',
                      ai_chat: '#fbbf24',
                      ocr_processed_multiple: '#f472b6',
                    };
                    const action = log.action as string;

                    return (
                      <tr key={log.id as string}>
                        <td style={td}>
                          <div style={{ fontSize: '13px', fontWeight: 600, color: '#f1f5f9' }}>
                            {(logUser?.name as string) || (logUser?.email as string) || 'Unknown'}
                          </div>
                          <div style={{ fontSize: '11px', color: '#64748b' }}>{logUser?.email as string}</div>
                        </td>
                        <td style={td}>
                          <span
                            style={{
                              fontSize: '11px',
                              fontWeight: 600,
                              padding: '3px 8px',
                              borderRadius: '6px',
                              background: `${actionColors[action] || '#64748b'}20`,
                              color: actionColors[action] || '#94a3b8',
                            }}
                          >
                            {action.replace(/_/g, ' ').toUpperCase()}
                          </span>
                        </td>
                        <td style={{ ...td, fontSize: '12px' }}>
                          {log.metadata ? JSON.stringify(log.metadata).substring(0, 60) + '...' : '—'}
                        </td>
                        <td style={{ ...td, fontSize: '12px' }}>{timeAgo(log.createdAt as string)}</td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'settings' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {sections.map(section => (
            <div key={section.title} style={card({ padding: '1.25rem' })}>
              <div style={{ fontSize: '14px', fontWeight: 700, color: '#f1f5f9', marginBottom: '1rem' }}>
                {section.title}
              </div>

              {section.items.map(item => {
                const key = `${section.title}-${item.label}`;
                const isEditing = editingKey === key;

                return (
                  <div
                    key={item.label}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '10px 0',
                      borderBottom: '1px solid rgba(255,255,255,0.03)',
                    }}
                  >
                    <span style={{ fontSize: '13px', color: '#94a3b8' }}>{item.label}</span>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      {isEditing ? (
                        <>
                          <input
                            value={draftValue}
                            onChange={e => setDraftValue(e.target.value)}
                            autoFocus
                            style={{
                              fontSize: '13px',
                              fontWeight: 600,
                              color: '#f1f5f9',
                              background: 'rgba(255,255,255,0.04)',
                              border: '1px solid rgba(255,255,255,0.08)',
                              borderRadius: '6px',
                              padding: '4px 8px',
                              outline: 'none',
                            }}
                          />
                          <button
                            onClick={() => handleSave(section.title, item.label)}
                            style={{
                              fontSize: '11px',
                              padding: '3px 8px',
                              background: 'rgba(34,197,94,0.12)',
                              border: 'none',
                              borderRadius: '5px',
                              color: '#4ade80',
                              cursor: 'pointer',
                            }}
                          >
                            Save
                          </button>
                          <button
                            onClick={handleCancel}
                            style={{
                              fontSize: '11px',
                              padding: '3px 8px',
                              background: 'rgba(239,68,68,0.12)',
                              border: 'none',
                              borderRadius: '5px',
                              color: '#f87171',
                              cursor: 'pointer',
                            }}
                          >
                            Cancel
                          </button>
                        </>
                      ) : (
                        <>
                          <span style={{ fontSize: '13px', fontWeight: 600, color: '#f1f5f9' }}>
                            {item.value}
                          </span>
                          {item.editable && (
                            <button
                              onClick={() => handleEdit(section.title, item.label, item.value)}
                              style={{
                                fontSize: '11px',
                                padding: '3px 8px',
                                background: 'rgba(59,130,246,0.1)',
                                border: 'none',
                                borderRadius: '5px',
                                color: '#60a5fa',
                                cursor: 'pointer',
                              }}
                            >
                              Edit
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ))}

          <div
            style={{
              ...card({ padding: '1.25rem' }),
              border: '1px solid rgba(239,68,68,0.3)',
              background: 'rgba(239,68,68,0.03)',
            }}
          >
            <div style={{ fontSize: '14px', fontWeight: 700, color: '#f87171', marginBottom: '1rem' }}>
              ⚠️ Danger Zone
            </div>
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              {[
                'Reset All Usage Counters',
                'Clear OCR Job History',
                'Export All User Data',
                'Send Test Email',
              ].map(action => (
                <button
                  key={action}
                  onClick={() => toast.success(`${action} — coming soon`)}
                  style={{
                    padding: '8px 14px',
                    background: 'rgba(239,68,68,0.1)',
                    border: '1px solid rgba(239,68,68,0.2)',
                    borderRadius: '8px',
                    color: '#f87171',
                    fontSize: '12px',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  {action}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {pendingUserAction && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.7)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100,
          }}
        >
          <div
            style={{
              background: 'hsl(222 41% 12%)',
              border: '1px solid hsl(217 33% 18%)',
              borderRadius: '16px',
              padding: '2rem',
              maxWidth: '400px',
              width: '90%',
            }}
          >
            <div style={{ fontSize: '1.5rem', marginBottom: '12px', textAlign: 'center' }}>
              {pendingUserAction.action === 'suspend' ? '🚫' : '✅'}
            </div>
            <div style={{ fontSize: '16px', fontWeight: 700, color: '#f1f5f9', textAlign: 'center', marginBottom: '8px' }}>
              {pendingUserAction.action === 'suspend' ? 'Suspend User?' : 'Activate User?'}
            </div>
            <div style={{ fontSize: '13px', color: '#94a3b8', textAlign: 'center', marginBottom: '1.5rem' }}>
              {pendingUserAction.action === 'suspend'
                ? 'This will prevent the user from logging in.'
                : "This will restore the user's access."}
            </div>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                onClick={() => setPendingUserAction(null)}
                style={{
                  flex: 1,
                  padding: '10px',
                  background: 'transparent',
                  border: '1px solid hsl(217 33% 18%)',
                  borderRadius: '8px',
                  color: '#94a3b8',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>
              <button
                onClick={() => toggleUserMutation.mutate(pendingUserAction.userId)}
                disabled={toggleUserMutation.isPending}
                style={{
                  flex: 1,
                  padding: '10px',
                  background: pendingUserAction.action === 'suspend' ? 'rgba(239,68,68,0.8)' : 'rgba(16,185,129,0.8)',
                  border: 'none',
                  borderRadius: '8px',
                  color: '#fff',
                  fontSize: '13px',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                {toggleUserMutation.isPending ? 'Processing...' : 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}