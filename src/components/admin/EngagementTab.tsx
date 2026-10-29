'use client';
import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { adminApi } from '@/lib/api';

type UserRow = {
  id: string;
  email: string;
  name: string | null;
  signedUpAt: string;
  daysSinceSignup: number;
  lastLoginAt: string | null;
  emailVerified: boolean;
  papers: number;
  exports: number;
  exportDays: number;
  ocrJobs: number;
  lastActionAt: string | null;
  plan: string;
  paidInr: number;
};
type Stage = { key: string; label: string; count: number; pctOfRegistered: number; pctOfPrevious: number; lost: number };
type Segment = { count: number; users: UserRow[] };
type Data = {
  exportTrackingNote: string;
  customers: { registered: number; papers: number; exports: number; revenueInr: number; paidPlanSubscribers: number };
  internal: { users: number; papers: number; exports: number };
  funnel: Stage[];
  segments: { neverCreated: Segment; createdNotExported: Segment; exportedOnce: Segment; repeatNotPaid: Segment };
  active: { last7Days: number; last30Days: number; loggedInLast30Days: number; users: UserRow[] };
  weeklyCohorts: { weekStart: string; signups: number; createdPaper: number; exported: number }[];
  signals: {
    medianHoursToFirstPaper: number | null;
    neverCreatedUnverified: number;
    neverCreatedNeverLoggedBack: number;
    neverCreatedTriedUpload: number;
    createdNotExportedAfter7Days: number;
    exportedOnceInactive14Days: number;
  };
};

type SegKey = 'neverCreated' | 'createdNotExported' | 'exportedOnce' | 'repeatNotPaid' | 'active';

const SEGMENTS: { key: SegKey; label: string; hint: string; color: string }[] = [
  { key: 'neverCreated', label: 'Never created a paper', hint: 'Signed up, no paper yet', color: '#f87171' },
  { key: 'createdNotExported', label: 'Created, never exported', hint: 'Built a paper but did not download it', color: '#fb923c' },
  { key: 'exportedOnce', label: 'Exported once, never returned', hint: 'All exports on a single day', color: '#fbbf24' },
  { key: 'repeatNotPaid', label: 'Repeat users, not paying', hint: 'Best upgrade prospects', color: '#34d399' },
  { key: 'active', label: 'Genuinely active (30 days)', hint: 'Real customers, admins excluded', color: '#60a5fa' },
];

const CSS = `
.eng-grid-kpi{display:grid;grid-template-columns:repeat(6,1fr);gap:12px}
.eng-grid-2{display:grid;grid-template-columns:1.3fr 1fr;gap:16px}
.eng-seg-picker{display:grid;grid-template-columns:repeat(5,1fr);gap:10px}
.eng-table{display:block}
.eng-cards{display:none}
.eng-scroll{overflow-x:auto}
@media (max-width:1100px){.eng-grid-kpi{grid-template-columns:repeat(3,1fr)}.eng-seg-picker{grid-template-columns:repeat(3,1fr)}}
@media (max-width:820px){.eng-grid-2{grid-template-columns:1fr}.eng-seg-picker{grid-template-columns:repeat(2,1fr)}}
@media (max-width:640px){.eng-grid-kpi{grid-template-columns:repeat(2,1fr)}.eng-table{display:none}.eng-cards{display:block}}
`;

const panel: React.CSSProperties = {
  background: 'hsl(222 41% 12%)',
  border: '1px solid hsl(217 33% 18%)',
  borderRadius: 14,
  padding: '1.1rem',
};
const h2: React.CSSProperties = { fontSize: 14, fontWeight: 700, color: '#f1f5f9', margin: 0 };
const sub: React.CSSProperties = { fontSize: 12, color: '#64748b', marginTop: 2 };

function ago(d: string | null) {
  if (!d) return '—';
  const days = Math.floor((Date.now() - new Date(d).getTime()) / 86400000);
  if (days <= 0) return 'today';
  if (days === 1) return '1d ago';
  if (days < 60) return `${days}d ago`;
  return `${Math.floor(days / 30)}mo ago`;
}
const fmtDate = (d: string) => new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });

function Kpi({ label, value, note, color }: { label: string; value: string | number; note?: string; color: string }) {
  return (
    <div style={{ ...panel, padding: '0.9rem 1rem' }}>
      <div style={{ fontSize: 11, color: '#64748b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</div>
      <div style={{ fontSize: 26, fontWeight: 800, color, marginTop: 4, lineHeight: 1.1 }}>{value}</div>
      {note && <div style={{ fontSize: 11, color: '#64748b', marginTop: 4 }}>{note}</div>}
    </div>
  );
}

export default function EngagementTab() {
  const [seg, setSeg] = useState<SegKey>('neverCreated');
  const [q, setQ] = useState('');

  const { data: resp, isLoading, isError, error } = useQuery({
    queryKey: ['admin-engagement'],
    queryFn: () => adminApi.getEngagement(),
    staleTime: 60 * 1000,
  });
  const d: Data | undefined = resp?.data?.data;

  const list: UserRow[] = useMemo(() => {
    if (!d) return [];
    const base = seg === 'active' ? d.active.users : d.segments[seg].users;
    const s = q.trim().toLowerCase();
    return s ? base.filter(u => u.email.toLowerCase().includes(s) || (u.name || '').toLowerCase().includes(s)) : base;
  }, [d, seg, q]);

  const totalInSeg = d ? (seg === 'active' ? d.active.last30Days : d.segments[seg].count) : 0;

  const insights = useMemo(() => {
    if (!d) return [] as { title: string; body: string; color: string }[];
    const out: { title: string; body: string; color: string }[] = [];
    const reg = d.customers.registered || 1;
    const f = d.funnel;
    // biggest relative drop between consecutive stages (skip 'registered')
    const steps = f.slice(1).map((s, i) => ({ s, prev: f[i], dropPct: f[i].count ? 100 - s.pctOfPrevious : 0 }));
    const worst = steps.sort((a, b) => b.s.lost - a.s.lost)[0];
    if (worst && worst.s.lost > 0) {
      out.push({
        color: '#f87171',
        title: `Biggest leak: ${worst.prev.label} → ${worst.s.label}`,
        body: `${worst.s.lost} of ${worst.prev.count} people (${Math.round(worst.dropPct)}%) stop here. Fix this stage before anything else.`,
      });
    }
    const nc = d.segments.neverCreated.count;
    if (nc > 0) {
      const bits: string[] = [];
      if (d.signals.neverCreatedTriedUpload > 0) bits.push(`${d.signals.neverCreatedTriedUpload} tried an upload but never saved a paper (upload or OCR friction)`);
      if (d.signals.neverCreatedNeverLoggedBack > 0) bits.push(`${d.signals.neverCreatedNeverLoggedBack} never came back after signup day`);
      if (d.signals.neverCreatedUnverified > 0) bits.push(`${d.signals.neverCreatedUnverified} have an unverified email`);
      out.push({
        color: '#fb923c',
        title: `${nc} of ${reg} signups (${Math.round((nc / reg) * 100)}%) never made a paper`,
        body: bits.length ? bits.join('; ') + '.' : 'Send a short “create your first paper” email with a sample.',
      });
    }
    if (d.signals.createdNotExportedAfter7Days > 0) {
      out.push({
        color: '#fbbf24',
        title: `${d.signals.createdNotExportedAfter7Days} built a paper 7+ days ago but never exported`,
        body: 'They reached the preview but not the download. Check the export step for friction, or whether they only use PDF (not tracked).',
      });
    }
    if (d.signals.exportedOnceInactive14Days > 0) {
      out.push({
        color: '#a78bfa',
        title: `${d.signals.exportedOnceInactive14Days} exported once and went quiet for 14+ days`,
        body: 'Ask them one question: what were they printing it for? That tells you what would bring them back.',
      });
    }
    if (d.segments.repeatNotPaid.count > 0) {
      out.push({
        color: '#34d399',
        title: `${d.segments.repeatNotPaid.count} repeat users are not paying`,
        body: 'Highest-intent group. Personally reach out with the Pro offer.',
      });
    }
    return out;
  }, [d]);

  if (isLoading) return <div style={{ color: '#64748b', padding: '2rem' }}>Loading engagement data…</div>;
  if (isError || !d) {
    return (
      <div style={{ ...panel, color: '#f87171', fontSize: 13 }}>
        Could not load engagement data{(error as any)?.response?.data?.error ? `: ${(error as any).response.data.error}` : ''}.
      </div>
    );
  }

  const reg = d.customers.registered;
  const f = d.funnel;
  const maxCohort = Math.max(1, ...d.weeklyCohorts.map(w => w.signups));
  const copyEmails = async () => {
    const emails = list.map(u => u.email).join(', ');
    try {
      await navigator.clipboard.writeText(emails);
      toast.success(`${list.length} emails copied`);
    } catch {
      toast.error('Copy failed');
    }
  };
  const segMeta = SEGMENTS.find(s => s.key === seg)!;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <style>{CSS}</style>

      <div style={{ ...panel, padding: '0.75rem 1rem', fontSize: 12, color: '#94a3b8', display: 'flex', flexWrap: 'wrap', gap: '6px 18px' }}>
        <span>
          Customers only: admin accounts excluded ({d.internal.users} admin · {d.internal.papers} papers · {d.internal.exports} exports of internal testing).
        </span>
        <span style={{ color: '#fbbf24' }}>{d.exportTrackingNote}</span>
      </div>

      <div className="eng-grid-kpi">
        <Kpi label="Customers" value={reg} color="#60a5fa" note={`${d.customers.papers} papers by them`} />
        <Kpi label="Created paper" value={`${f[1].pctOfRegistered}%`} color="#10b981" note={`${f[1].count} users`} />
        <Kpi label="Exported" value={`${f[2].pctOfRegistered}%`} color="#fbbf24" note={`${f[2].count} users`} />
        <Kpi label="Repeat" value={`${f[3].pctOfRegistered}%`} color="#a78bfa" note={`${f[3].count} users`} />
        <Kpi label="Paid" value={`${f[4].pctOfRegistered}%`} color="#f472b6" note={`${f[4].count} users · ₹${d.customers.revenueInr}`} />
        <Kpi label="Active 30d" value={d.active.last30Days} color="#34d399" note={`${d.active.last7Days} in last 7d`} />
      </div>

      <div className="eng-grid-2">
        <div style={panel}>
          <div style={h2}>Where users drop off</div>
          <div style={sub}>Each bar is the share of all registered customers. “lost” is people who stopped at that step.</div>
          <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 12 }}>
            {f.map((s, i) => (
              <div key={s.key}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, fontSize: 12, marginBottom: 4 }}>
                  <span style={{ color: '#e2e8f0', fontWeight: 600 }}>{s.label}</span>
                  <span style={{ color: '#94a3b8' }}>
                    {s.count} · {s.pctOfRegistered}%
                    {i > 0 && s.lost > 0 && <span style={{ color: '#f87171' }}> · −{s.lost} lost</span>}
                  </span>
                </div>
                <div style={{ height: 10, background: 'rgba(255,255,255,0.06)', borderRadius: 6, overflow: 'hidden' }}>
                  <div
                    style={{
                      width: `${Math.max(s.pctOfRegistered, s.count ? 1.5 : 0)}%`,
                      height: '100%',
                      borderRadius: 6,
                      background: ['#60a5fa', '#10b981', '#fbbf24', '#a78bfa', '#f472b6'][i],
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div style={panel}>
          <div style={h2}>What the data says</div>
          <div style={sub}>Auto-generated from the numbers above.</div>
          <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 10 }}>
            {insights.length === 0 && <div style={{ fontSize: 12, color: '#64748b' }}>Not enough data yet.</div>}
            {insights.map((x, i) => (
              <div key={i} style={{ borderLeft: `3px solid ${x.color}`, paddingLeft: 10 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#f1f5f9' }}>{x.title}</div>
                <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 2 }}>{x.body}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div style={panel}>
        <div style={h2}>Who to talk to</div>
        <div style={sub}>Pick a group, review the people, copy their emails and write to them.</div>
        <div className="eng-seg-picker" style={{ marginTop: 12 }}>
          {SEGMENTS.map(s => {
            const count = s.key === 'active' ? d.active.last30Days : d.segments[s.key].count;
            const on = seg === s.key;
            return (
              <button
                key={s.key}
                onClick={() => setSeg(s.key)}
                style={{
                  textAlign: 'left',
                  padding: '10px 12px',
                  borderRadius: 10,
                  cursor: 'pointer',
                  background: on ? 'rgba(59,130,246,0.12)' : 'rgba(255,255,255,0.02)',
                  border: `1px solid ${on ? s.color : 'hsl(217 33% 18%)'}`,
                }}
              >
                <div style={{ fontSize: 22, fontWeight: 800, color: s.color, lineHeight: 1 }}>{count}</div>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#e2e8f0', marginTop: 6 }}>{s.label}</div>
                <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>{s.hint}</div>
              </button>
            );
          })}
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, margin: '14px 0 10px', alignItems: 'center' }}>
          <input
            value={q}
            onChange={e => setQ(e.target.value)}
            placeholder="Search email or name"
            style={{
              flex: '1 1 180px',
              minWidth: 0,
              padding: '8px 12px',
              borderRadius: 8,
              background: 'hsl(222 47% 8%)',
              border: '1px solid hsl(217 33% 18%)',
              color: '#e2e8f0',
              fontSize: 13,
              outline: 'none',
            }}
          />
          <button
            onClick={copyEmails}
            disabled={!list.length}
            style={{
              padding: '8px 14px',
              borderRadius: 8,
              border: 'none',
              background: 'rgba(59,130,246,0.15)',
              color: '#60a5fa',
              fontSize: 13,
              fontWeight: 600,
              cursor: list.length ? 'pointer' : 'default',
              opacity: list.length ? 1 : 0.5,
            }}
          >
            Copy {list.length} emails
          </button>
        </div>
        {totalInSeg > list.length && !q && (
          <div style={{ fontSize: 11, color: '#64748b', marginBottom: 8 }}>
            Showing the {list.length} most recent of {totalInSeg}.
          </div>
        )}

        {list.length === 0 ? (
          <div style={{ color: '#64748b', fontSize: 13, padding: '1rem 0' }}>Nobody in this group.</div>
        ) : (
          <>
            <div className="eng-table eng-scroll">
              <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 720 }}>
                <thead>
                  <tr>
                    {['User', 'Signed up', 'Last login', 'Papers', 'Exports', 'Uploads', 'Last action', 'Plan'].map(h => (
                      <th key={h} style={{ textAlign: 'left', padding: '8px 10px', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#64748b', borderBottom: '1px solid hsl(217 33% 18%)' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {list.map(u => (
                    <tr key={u.id}>
                      <td style={{ padding: '9px 10px', borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                        <div style={{ fontSize: 13, color: '#e2e8f0', fontWeight: 600 }}>{u.name || u.email.split('@')[0]}</div>
                        <div style={{ fontSize: 11, color: '#64748b' }}>
                          {u.email}
                          {!u.emailVerified && <span style={{ color: '#fb923c' }}> · unverified</span>}
                        </div>
                      </td>
                      {[fmtDate(u.signedUpAt), ago(u.lastLoginAt), u.papers, u.exports, u.ocrJobs, ago(u.lastActionAt), u.plan].map((v, i) => (
                        <td key={i} style={{ padding: '9px 10px', fontSize: 13, color: '#94a3b8', borderBottom: '1px solid rgba(255,255,255,0.03)', whiteSpace: 'nowrap' }}>{v}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="eng-cards">
              {list.map(u => (
                <div key={u.id} style={{ padding: '10px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                  <div style={{ fontSize: 13, color: '#e2e8f0', fontWeight: 600 }}>{u.name || u.email.split('@')[0]}</div>
                  <div style={{ fontSize: 11, color: '#64748b', wordBreak: 'break-all' }}>
                    {u.email}
                    {!u.emailVerified && <span style={{ color: '#fb923c' }}> · unverified</span>}
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 12px', marginTop: 6, fontSize: 11, color: '#94a3b8' }}>
                    <span>Joined {fmtDate(u.signedUpAt)}</span>
                    <span>Login {ago(u.lastLoginAt)}</span>
                    <span>{u.papers} papers</span>
                    <span>{u.exports} exports</span>
                    <span>{u.ocrJobs} uploads</span>
                    <span>{u.plan}</span>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
        <div style={{ fontSize: 11, color: segMeta.color, marginTop: 10 }}>{segMeta.label}: {segMeta.hint}</div>
      </div>

      <div style={panel}>
        <div style={h2}>Are newer signups doing better?</div>
        <div style={sub}>Weekly signup groups and how far each one got.</div>
        <div className="eng-scroll" style={{ marginTop: 12 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 460 }}>
            <thead>
              <tr>
                {['Week of', 'Signups', 'Created paper', 'Exported'].map(h => (
                  <th key={h} style={{ textAlign: 'left', padding: '6px 10px', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: '#64748b', borderBottom: '1px solid hsl(217 33% 18%)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {d.weeklyCohorts.map(w => (
                <tr key={w.weekStart}>
                  <td style={{ padding: '8px 10px', fontSize: 13, color: '#e2e8f0' }}>{fmtDate(w.weekStart)}</td>
                  <td style={{ padding: '8px 10px', fontSize: 13, color: '#94a3b8' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ width: `${(w.signups / maxCohort) * 80}px`, minWidth: w.signups ? 3 : 0, height: 8, background: '#60a5fa', borderRadius: 4 }} />
                      {w.signups}
                    </div>
                  </td>
                  <td style={{ padding: '8px 10px', fontSize: 13, color: '#94a3b8' }}>
                    {w.createdPaper}{w.signups ? ` (${Math.round((w.createdPaper / w.signups) * 100)}%)` : ''}
                  </td>
                  <td style={{ padding: '8px 10px', fontSize: 13, color: '#94a3b8' }}>
                    {w.exported}{w.signups ? ` (${Math.round((w.exported / w.signups) * 100)}%)` : ''}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}