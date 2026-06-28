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
  const [phoneUpi, setPhoneUpi] = useState('');

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

  const paidReferrals = (progress?.referrals || []).filter(r => r.status === 'PAID');
  const paidCount = paidReferrals.length;
  const completedPairs = Math.floor(paidCount / 2);   // how many ₹2000 rewards earned
  const progressInCurrentPair = paidCount % 2;         // 0 or 1 within the current pair
  const cashbackUnlocked = completedPairs >= 1;        // at least one full pair done

  // Always show the 2 emails of the latest unclaimed pair in the WA message
  const buildCashbackMessage = () => {
    const latestPair = paidReferrals.slice(-2);
    const referralEmailsList = latestPair.map((r, i) => `  ${i + 1}. ${r.referredEmail}`).join('\n');

    return [
      '👋 Hi Paptrix Team,',
      '',
      `I have completed ${completedPairs > 0 ? completedPairs + ' pair(s) of' : 'some'} paid referrals and would like to claim my cashback (up to ₹2,000 per pair).`,
      '',
      '📋 My Details:',
      `• Name       : ${user?.name || '—'}`,
      `• Email      : ${user?.email || '—'}`,
      `• Phone/UPI  : ${phoneUpi || '(please fill before sending)'}`,
      '',
      '✅ My Latest Paid Referral Emails:',
      referralEmailsList || '  (no paid referrals yet)',
      '',
      'Kindly verify and contact me for the cashback. Thank you! 🙏',
    ].join('\n');
  };

  const handleCashbackWhatsApp = () => {
    if (!phoneUpi.trim()) {
      toast.error('Please enter your Phone Pay / UPI number first!');
      return;
    }
    const msg = encodeURIComponent(buildCashbackMessage());
    window.open(`https://wa.me/916303677737?text=${msg}`, '_blank');
  };

  return (
    <div style={{ padding: '1.5rem', maxWidth: '760px', margin: '0 auto' }}>

      {/* ── CASHBACK BANNER ── */}
      <div style={{
        position: 'relative',
        overflow: 'hidden',
        borderRadius: '20px',
        marginBottom: '1.75rem',
        padding: '1.75rem',
        background: 'linear-gradient(135deg, #0f1f0f 0%, #0a2012 40%, #0d1f1a 100%)',
        border: '1.5px solid rgba(16,185,129,0.35)',
        boxShadow: '0 0 40px rgba(16,185,129,0.12), inset 0 1px 0 rgba(255,255,255,0.05)',
      }}>
        {/* Glow blobs */}
        <div style={{
          position: 'absolute', top: '-40px', right: '-40px',
          width: '200px', height: '200px', borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(16,185,129,0.2) 0%, transparent 70%)',
          pointerEvents: 'none',
        }} />
        <div style={{
          position: 'absolute', bottom: '-30px', left: '30%',
          width: '160px', height: '160px', borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(245,158,11,0.12) 0%, transparent 70%)',
          pointerEvents: 'none',
        }} />

        {/* Badge */}
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: '6px',
          background: 'rgba(16,185,129,0.15)',
          border: '1px solid rgba(16,185,129,0.4)',
          borderRadius: '20px', padding: '4px 12px',
          fontSize: '11px', fontWeight: 700, color: '#10b981',
          textTransform: 'uppercase', letterSpacing: '0.08em',
          marginBottom: '12px',
        }}>
          <span style={{ fontSize: '9px' }}>💰</span> Unlimited Cashback — Every Pair Counts!
        </div>

        {/* Headline */}
        <div style={{ marginBottom: '14px' }}>
          <div style={{
            fontSize: '1.8rem', fontWeight: 900, lineHeight: 1.1,
            background: 'linear-gradient(135deg, #ffffff 30%, #6ee7b7 70%, #fbbf24 100%)',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
            marginBottom: '6px',
          }}>
            Earn up to ₹2,000 per Pair — No Limit!
          </div>
          <div style={{ fontSize: '13.5px', color: '#94a3b8', lineHeight: 1.6, maxWidth: '520px' }}>
            Every time <strong style={{ color: '#6ee7b7' }}>2 friends</strong> buy any paid plan,
            you get <strong style={{ color: '#fbbf24' }}>up to ₹2,000 cashback</strong>.
            Complete a pair, send us a WhatsApp — our team will verify and contact you shortly. 🚀
          </div>
        </div>

        {/* Steps row */}
        <div style={{
          display: 'flex', gap: '8px', alignItems: 'center',
          marginBottom: '18px', flexWrap: 'wrap',
        }}>
          {[
            { icon: '🔗', text: 'Share your link' },
            { icon: '→', text: '', arrow: true },
            { icon: '👥', text: 'Every 2 friends subscribe' },
            { icon: '→', text: '', arrow: true },
            { icon: '💸', text: '₹2,000 per pair' },
          ].map((s, i) =>
            s.arrow ? (
              <span key={i} style={{ color: '#334155', fontSize: '14px', fontWeight: 700 }}>→</span>
            ) : (
              <div key={i} style={{
                display: 'flex', alignItems: 'center', gap: '6px',
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: '10px', padding: '6px 12px',
                fontSize: '12px', color: '#cbd5e1', fontWeight: 600,
              }}>
                <span>{s.icon}</span> {s.text}
              </div>
            )
          )}
        </div>

        {/* Pairs earned strip */}
        {completedPairs > 0 && (
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: '8px',
            background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.3)',
            borderRadius: '10px', padding: '6px 14px', marginBottom: '12px',
          }}>
            <span style={{ fontSize: '16px' }}>🏆</span>
            <span style={{ fontSize: '12px', fontWeight: 700, color: '#6ee7b7' }}>
              {completedPairs} pair{completedPairs > 1 ? 's' : ''} completed
              · ₹{completedPairs * 2000} earned so far!
            </span>
          </div>
        )}

        {/* Progress bar — shows progress within the CURRENT pair */}
        <div style={{ marginBottom: '14px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
            <span style={{ fontSize: '12px', color: '#64748b', fontWeight: 600 }}>
              Progress toward next ₹2,000
            </span>
            <span style={{ fontSize: '12px', fontWeight: 800, color: progressInCurrentPair === 1 ? '#fbbf24' : '#f1f5f9' }}>
              {loading ? '—' : `${progressInCurrentPair} / 2`} in current pair
            </span>
          </div>
          <div style={{
            height: '8px', borderRadius: '99px',
            background: 'rgba(255,255,255,0.06)',
            overflow: 'hidden',
          }}>
            <div style={{
              height: '100%',
              width: loading ? '0%' : `${progressInCurrentPair * 50}%`,
              borderRadius: '99px',
              background: 'linear-gradient(90deg, #3b82f6, #06b6d4)',
              transition: 'width 0.6s ease',
            }} />
          </div>
        </div>

        {/* CTA — always visible, no lock */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <div>
            <div style={{ fontSize: '11px', color: '#6ee7b7', fontWeight: 700, marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              📲 Enter your Phone Pay / UPI number to claim
            </div>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <input
                type="text"
                placeholder="e.g. 9876543210 or name@upi"
                value={phoneUpi}
                onChange={e => setPhoneUpi(e.target.value)}
                style={{
                  flex: 1, minWidth: '220px',
                  background: 'rgba(255,255,255,0.05)',
                  border: `1px solid ${phoneUpi.trim() ? 'rgba(16,185,129,0.5)' : 'rgba(255,255,255,0.12)'}`,
                  borderRadius: '10px', padding: '10px 14px',
                  color: '#f1f5f9', fontSize: '13px',
                  outline: 'none',
                  transition: 'border 0.2s',
                }}
              />
              <button
                onClick={handleCashbackWhatsApp}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: '8px',
                  background: 'linear-gradient(135deg, #25d366, #128c7e)',
                  color: '#fff', fontWeight: 800, fontSize: '13px',
                  padding: '10px 20px', borderRadius: '10px', border: 'none', cursor: 'pointer',
                  boxShadow: '0 4px 20px rgba(37,211,102,0.35)',
                  whiteSpace: 'nowrap',
                }}
              >
                <svg width="15" height="15" viewBox="0 0 32 32" fill="white">
                  <path d="M16 2C8.268 2 2 8.268 2 16c0 2.49.643 4.827 1.768 6.857L2 30l7.34-1.92A13.93 13.93 0 0016 30c7.732 0 14-6.268 14-14S23.732 2 16 2zm6.29 19.89c-.345-.172-2.04-1.006-2.356-1.12-.317-.115-.547-.172-.778.173-.23.345-.893 1.12-1.095 1.35-.2.23-.403.26-.748.086-.345-.172-1.457-.537-2.775-1.713-1.026-.914-1.718-2.042-1.92-2.387-.2-.345-.022-.53.15-.702.156-.155.345-.403.518-.604.172-.202.23-.345.345-.575.115-.23.058-.432-.029-.604-.086-.172-.778-1.876-1.066-2.568-.28-.674-.565-.583-.778-.594l-.662-.011c-.23 0-.604.086-.92.432-.316.345-1.208 1.18-1.208 2.877s1.237 3.337 1.41 3.567c.172.23 2.434 3.715 5.897 5.21.824.355 1.467.567 1.969.727.827.263 1.58.226 2.174.137.663-.1 2.04-.834 2.328-1.638.287-.805.287-1.495.2-1.638-.086-.144-.316-.23-.66-.403z"/>
                </svg>
                Send Claim on WhatsApp
              </button>
            </div>
            <div style={{ fontSize: '11px', color: '#475569', marginTop: '6px', lineHeight: 1.6 }}>
              Your name, email, UPI number and paid referral emails will be auto-filled. Our team will verify and contact you soon for the cashback. 🙏
            </div>
          </div>
        </div>
      </div>

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