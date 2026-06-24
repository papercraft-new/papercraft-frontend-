'use client';
import { useEffect, useState } from 'react';
import { useAuthStore } from '@/store/authStore';
import { referralsApi } from '@/lib/api';
import toast from 'react-hot-toast';

interface ReferralEntry {
  id: string;
  referredEmail: string;
  status: 'PENDING' | 'PAID' | 'REFUNDED' | 'EXPIRED';
  planPurchased: string | null;
  createdAt: string;
  paidAt: string | null;
}

interface ReferralProgress {
  referrals: ReferralEntry[];
  totalRewardsGranted: number;
  totalDaysEarned: number;
  paidFriendsCount: number;
  progressTowardNextReward: number; // 0 or 1
}

const STATUS_STYLE: Record<string, { bg: string; color: string; label: string }> = {
  PENDING: { bg: 'rgba(245,158,11,0.12)', color: '#f59e0b', label: '⏳ Pending' },
  PAID: { bg: 'rgba(16,185,129,0.12)', color: '#10b981', label: '✓ Paid' },
  REFUNDED: { bg: 'rgba(239,68,68,0.12)', color: '#f87171', label: '↩ Refunded' },
  EXPIRED: { bg: 'rgba(100,116,139,0.12)', color: '#64748b', label: '⏱ Expired' },
};

function formatDate(d: string | null) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

export default function ReferralsPage() {
  const user = useAuthStore(s => s.user);
  const [link, setLink] = useState('');
  const [progress, setProgress] = useState<ReferralProgress | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([referralsApi.getMyLink(), referralsApi.getMyProgress()])
      .then(([linkRes, progressRes]) => {
        setLink(linkRes?.data?.data?.referralLink || '');
        setProgress(progressRes?.data?.data || null);
      })
      .catch(() => {
        toast.error('Could not load referral data.');
      })
      .finally(() => setLoading(false));
  }, []);

  const handleCopy = () => {
    if (!link) return;
    navigator.clipboard.writeText(link);
    toast.success('Referral link copied!');
  };

  const handleWhatsAppShare = () => {
    const msg = encodeURIComponent(
      `🎓 Check out Paptrix — turns handwritten notes into professional exam papers in 30 seconds! Sign up using my link and we both benefit 👇\n${link}`
    );
    window.open(`https://wa.me/?text=${msg}`, '_blank');
  };

  const border = '1px solid hsl(217 33% 18%)';
  const card = 'hsl(222 41% 12%)';

  return (
    <div style={{ padding: '1.5rem', maxWidth: '760px', margin: '0 auto' }}>

      {/* HEADER */}
      <div style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#f1f5f9', marginBottom: '4px' }}>
          🎁 Refer & Earn
        </h1>
        <p style={{ color: '#94a3b8', fontSize: '13px' }}>
          Get 2 friends to subscribe to any paid plan and earn 30 extra days on your own plan.
        </p>
      </div>

      {/* REFERRAL LINK CARD */}
      <div style={{ background: card, border, borderRadius: '16px', padding: '1.5rem', marginBottom: '1.5rem' }}>
        <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '10px' }}>
          Your Referral Link
        </div>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '14px' }}>
          <input
            readOnly
            value={loading ? 'Loading...' : link}
            style={{
              flex: 1, minWidth: '200px',
              background: 'hsl(222 47% 9%)', border, borderRadius: '10px',
              padding: '10px 14px', color: '#cbd5e1', fontSize: '13px',
            }}
          />
          <button
            onClick={handleCopy}
            disabled={!link}
            style={{
              background: 'rgba(59,130,246,0.15)', border: '1px solid rgba(59,130,246,0.3)',
              color: '#60a5fa', fontWeight: 700, fontSize: '13px',
              padding: '10px 18px', borderRadius: '10px', cursor: 'pointer',
            }}
          >
            🔗 Copy
          </button>
        </div>
        <button
          onClick={handleWhatsAppShare}
          disabled={!link}
          style={{
            width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
            background: 'linear-gradient(135deg, #25d366, #128c7e)',
            color: '#fff', fontWeight: 700, fontSize: '14px',
            padding: '12px', borderRadius: '12px', border: 'none', cursor: 'pointer',
          }}
        >
          <svg width="16" height="16" viewBox="0 0 32 32" fill="white">
            <path d="M16 2C8.268 2 2 8.268 2 16c0 2.49.643 4.827 1.768 6.857L2 30l7.34-1.92A13.93 13.93 0 0016 30c7.732 0 14-6.268 14-14S23.732 2 16 2zm6.29 19.89c-.345-.172-2.04-1.006-2.356-1.12-.317-.115-.547-.172-.778.173-.23.345-.893 1.12-1.095 1.35-.2.23-.403.26-.748.086-.345-.172-1.457-.537-2.775-1.713-1.026-.914-1.718-2.042-1.92-2.387-.2-.345-.022-.53.15-.702.156-.155.345-.403.518-.604.172-.202.23-.345.345-.575.115-.23.058-.432-.029-.604-.086-.172-.778-1.876-1.066-2.568-.28-.674-.565-.583-.778-.594l-.662-.011c-.23 0-.604.086-.92.432-.316.345-1.208 1.18-1.208 2.877s1.237 3.337 1.41 3.567c.172.23 2.434 3.715 5.897 5.21.824.355 1.467.567 1.969.727.827.263 1.58.226 2.174.137.663-.1 2.04-.834 2.328-1.638.287-.805.287-1.495.2-1.638-.086-.144-.316-.23-.66-.403z"/>
          </svg>
          Share on WhatsApp
        </button>
      </div>

      {/* PROGRESS CARD */}
      <div style={{
        background: 'rgba(59,130,246,0.06)', border: '1px solid rgba(59,130,246,0.2)',
        borderRadius: '16px', padding: '1.5rem', marginBottom: '1.5rem',
      }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', textAlign: 'center' }}>
          <div>
            <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#60a5fa' }}>
              {loading ? '—' : progress?.paidFriendsCount ?? 0}
            </div>
            <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>Paid Friends</div>
          </div>
          <div>
            <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#10b981' }}>
              {loading ? '—' : progress?.totalDaysEarned ?? 0}
            </div>
            <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>Days Earned</div>
          </div>
          <div>
            <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#f59e0b' }}>
              {loading ? '—' : progress?.totalRewardsGranted ?? 0}
            </div>
            <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>Rewards Earned</div>
          </div>
        </div>

        {!loading && progress && progress.progressTowardNextReward === 1 && (
          <div style={{
            marginTop: '14px', textAlign: 'center', fontSize: '12px',
            color: '#fbbf24', background: 'rgba(245,158,11,0.1)',
            border: '1px solid rgba(245,158,11,0.25)', borderRadius: '8px', padding: '8px',
          }}>
            🔥 1 more paid friend and you earn your next 30 days!
          </div>
        )}
      </div>

      {/* HOW IT WORKS */}
      <div style={{ background: card, border, borderRadius: '16px', padding: '1.5rem', marginBottom: '1.5rem' }}>
        <div style={{ fontSize: '13px', fontWeight: 700, color: '#f1f5f9', marginBottom: '12px' }}>
          How it works
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {[
            'Share your referral link with fellow teachers.',
            'When 2 of your friends subscribe to any paid plan, you earn 30 extra days.',
            'The reward is added on top of your current plan — you never lose what you already have.',
            'Keep referring — every new pair of paying friends earns you another 30 days.',
          ].map((step, i) => (
            <div key={i} style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
              <span style={{
                width: 20, height: 20, borderRadius: '50%', flexShrink: 0,
                background: 'rgba(59,130,246,0.15)', color: '#60a5fa',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '11px', fontWeight: 700,
              }}>
                {i + 1}
              </span>
              <span style={{ fontSize: '13px', color: '#94a3b8', lineHeight: 1.6 }}>{step}</span>
            </div>
          ))}
        </div>
      </div>

      {/* REFERRAL HISTORY */}
      <div style={{ background: card, border, borderRadius: '16px', padding: '1.5rem' }}>
        <div style={{ fontSize: '13px', fontWeight: 700, color: '#f1f5f9', marginBottom: '12px' }}>
          Your Referrals
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '2rem', color: '#64748b', fontSize: '13px' }}>
            Loading...
          </div>
        ) : !progress || progress.referrals.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '2rem', color: '#64748b', fontSize: '13px' }}>
            No referrals yet. Share your link above to get started!
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {progress.referrals.map(r => {
              const style = STATUS_STYLE[r.status] || STATUS_STYLE.PENDING;
              return (
                <div
                  key={r.id}
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    background: 'hsl(222 47% 9%)', borderRadius: '10px', padding: '10px 14px',
                    flexWrap: 'wrap', gap: '8px',
                  }}
                >
                  <div>
                    <div style={{ fontSize: '13px', color: '#f1f5f9', fontWeight: 600 }}>
                      {r.referredEmail}
                    </div>
                    <div style={{ fontSize: '11px', color: '#64748b' }}>
                      Joined {formatDate(r.createdAt)}
                      {r.paidAt && ` · Paid ${formatDate(r.paidAt)}`}
                      {r.planPurchased && ` · ${r.planPurchased}`}
                    </div>
                  </div>
                  <span style={{
                    fontSize: '11px', fontWeight: 700, padding: '4px 10px', borderRadius: '8px',
                    background: style.bg, color: style.color, whiteSpace: 'nowrap',
                  }}>
                    {style.label}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>

    </div>
  );
}