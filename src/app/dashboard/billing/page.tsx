'use client';
import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/store/authStore';
import { apiClient } from '@/lib/api';
import toast from 'react-hot-toast';

// ─────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────
interface Plan {
  id: string;
  name: string;
  type: 'FREE' | 'PRO' | 'INSTITUTION';
  priceMonthly: number;
  priceYearly: number;
  papersPerMonth: number;
  exportsPerMonth: number;
  hasDocxExport: boolean;
  hasCustomBranding: boolean;
  hasTeamAccess: boolean;
  maxTeamMembers: number;
  features: string[];
}

interface Payment {
  id: string;
  amount: number;
  currency: string;
  status: string;
  description: string;
  createdAt: string;
}

// ─────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────
function formatDate(d: string) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
  });
}

function formatINR(paise: number) {
  return `₹${(paise / 100).toLocaleString('en-IN')}`;
}

// ─────────────────────────────────────────
// MAIN PAGE
// ─────────────────────────────────────────
export default function BillingPage() {
  const user = useAuthStore((s) => s.user);
  const queryClient = useQueryClient();
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');
  const [loadingPlanId, setLoadingPlanId] = useState<string | null>(null);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);

  // Fetch plans
  const { data: plansData, isLoading: plansLoading } = useQuery({
    queryKey: ['plans'],
    queryFn: () => apiClient.get('/payments/plans'),
    staleTime: 10 * 60 * 1000,
  });

  // Fetch current subscription
  const { data: subData } = useQuery({
    queryKey: ['subscription'],
    queryFn: () => apiClient.get('/payments/subscription'),
    staleTime: 5 * 60 * 1000,
  });

  // Fetch payment history
  const { data: historyData } = useQuery({
    queryKey: ['payment-history'],
    queryFn: () => apiClient.get('/payments/history'),
    staleTime: 5 * 60 * 1000,
  });

  const plans: Plan[] = plansData?.data?.data || [];
  const subscription = subData?.data?.data;
  const payments: Payment[] = historyData?.data?.data || [];
  const currentPlan = subscription?.plan;

  // ── LOAD RAZORPAY SCRIPT ──────────────────
  const loadRazorpay = (): Promise<boolean> => {
    return new Promise((resolve) => {
      if ((window as any).Razorpay) {
        resolve(true);
        return;
      }
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  // ── HANDLE UPGRADE ────────────────────────
  const handleUpgrade = async (plan: Plan) => {
    if (plan.type === 'FREE') return;
    if (currentPlan?.type === plan.type) {
      toast.error('You are already on this plan.');
      return;
    }

    setLoadingPlanId(plan.id);

    try {
      // Load Razorpay
      const loaded = await loadRazorpay();
      if (!loaded) {
        toast.error('Failed to load payment gateway. Check your internet.');
        return;
      }

      // Create order
      const orderRes = await apiClient.post('/payments/create-order', {
        planId: plan.id,
        billingCycle,
      });

      const { orderId, amount } = orderRes.data.data;

      // Open Razorpay checkout
      const options = {
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
        amount,
        currency: 'INR',
        name: 'Paptrix',
        description: `${plan.name} Plan - ${billingCycle === 'yearly' ? 'Yearly' : 'Monthly'}`,
        order_id: orderId,
        image: '/logo.png',
        handler: async (response: {
          razorpay_order_id: string;
          razorpay_payment_id: string;
          razorpay_signature: string;
        }) => {
          try {
            toast.loading('Verifying payment...', { id: 'verify' });

            // Verify payment
            await apiClient.post('/payments/verify', {
              razorpayOrderId: response.razorpay_order_id,
              razorpayPaymentId: response.razorpay_payment_id,
              razorpaySignature: response.razorpay_signature,
              planId: plan.id,
              billingCycle,
            });

            toast.success(
              `🎉 Successfully upgraded to ${plan.name} plan!`,
              { id: 'verify', duration: 4000 }
            );

            // Refresh data
            queryClient.invalidateQueries({ queryKey: ['subscription'] });
            queryClient.invalidateQueries({ queryKey: ['payment-history'] });
            queryClient.invalidateQueries({ queryKey: ['current-user'] });
           

          } catch {
            toast.error('Payment verification failed. Contact support.', { id: 'verify' });
          }
        },
        prefill: {
          name: user?.name || '',
          email: user?.email || '',
        },
        notes: {
          planId: plan.id,
          planType: plan.type,
        },
        theme: {
          color: '#2563eb',
        },
        modal: {
          ondismiss: () => {
            toast.error('Payment cancelled.');
            setLoadingPlanId(null);
          },
        },
      };

      const rzp = new (window as any).Razorpay(options);
      rzp.on('payment.failed', (response: { error: { description: string } }) => {
        toast.error(`Payment failed: ${response.error.description}`);
        setLoadingPlanId(null);
      });
      rzp.open();

    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })
        ?.response?.data?.error || 'Payment failed. Try again.';
      toast.error(msg);
    } finally {
      setLoadingPlanId(null);
    }
  };

  // ── CANCEL SUBSCRIPTION ───────────────────
  const handleCancel = async () => {
    try {
      await apiClient.post('/payments/cancel');
      toast.success('Subscription cancelled. Active until period end.');
      setShowCancelConfirm(false);
      queryClient.invalidateQueries({ queryKey: ['subscription'] });
    } catch {
      toast.error('Failed to cancel subscription.');
    }
  };

  // ── STYLES ────────────────────────────────
  const card = (extra?: React.CSSProperties): React.CSSProperties => ({
    background: 'hsl(222 41% 12%)',
    border: '1px solid hsl(217 33% 18%)',
    borderRadius: '16px',
    padding: '1.5rem',
    ...extra,
  });

  const PLAN_COLORS: Record<string, { primary: string; bg: string; border: string }> = {
    FREE:        { primary: '#64748b', bg: 'rgba(100,116,139,0.08)', border: 'rgba(100,116,139,0.2)' },
    PRO:         { primary: '#3b82f6', bg: 'rgba(59,130,246,0.08)',  border: 'rgba(59,130,246,0.3)'  },
    INSTITUTION: { primary: '#f59e0b', bg: 'rgba(245,158,11,0.08)',  border: 'rgba(245,158,11,0.3)'  },
  };

  return (
    <div style={{ padding: '1.5rem', maxWidth: '1100px', margin: '0 auto' }}>

      {/* HEADER */}
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#f1f5f9', marginBottom: '4px' }}>
          Billing & Plans
        </h1>
        <p style={{ color: '#94a3b8', fontSize: '13px' }}>
          Manage your subscription and billing
        </p>
      </div>

      {/* CURRENT PLAN BANNER */}
      {subscription && currentPlan && (
        <div style={{
          ...card(),
          background: PLAN_COLORS[currentPlan.type]?.bg || 'hsl(222 41% 12%)',
          border: `1px solid ${PLAN_COLORS[currentPlan.type]?.border || 'hsl(217 33% 18%)'}`,
          marginBottom: '1.5rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px',
        }} className="billing-banner">
          <div>
            <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '4px' }}>
              Current Plan
            </div>
            <div style={{ fontSize: '1.3rem', fontWeight: 800, color: PLAN_COLORS[currentPlan.type]?.primary || '#f1f5f9' }}>
              {currentPlan.name} Plan
            </div>
            <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '4px' }}>
              {currentPlan.type !== 'FREE' && subscription.currentPeriodEnd && (
                <span>Renews on {formatDate(subscription.currentPeriodEnd)} · </span>
              )}
              {currentPlan.papersPerMonth === -1
                ? 'Unlimited papers'
                : `${subscription.papersUsedThisMonth || 0} / ${currentPlan.papersPerMonth} papers used this month`}
            </div>
            {subscription.cancelAtPeriodEnd && (
              <div style={{ fontSize: '12px', color: '#f87171', marginTop: '4px' }}>
                ⚠️ Cancels on {formatDate(subscription.currentPeriodEnd)}
              </div>
            )}
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            {currentPlan.type !== 'FREE' && !subscription.cancelAtPeriodEnd && (
              <button
                onClick={() => setShowCancelConfirm(true)}
                style={{ padding: '8px 16px', background: 'transparent', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '8px', color: '#f87171', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}
              >
                Cancel Plan
              </button>
            )}
          </div>
        </div>
      )}

      {/* BILLING CYCLE TOGGLE */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px', marginBottom: '1.5rem' }}>
        <span style={{ fontSize: '13px', color: billingCycle === 'monthly' ? '#f1f5f9' : '#64748b', fontWeight: billingCycle === 'monthly' ? 700 : 400 }}>
          Monthly
        </span>
        <button
          onClick={() => setBillingCycle(prev => prev === 'monthly' ? 'yearly' : 'monthly')}
          style={{
            width: '48px', height: '26px',
            borderRadius: '13px',
            border: 'none',
            background: billingCycle === 'yearly' ? '#2563eb' : 'hsl(217 33% 28%)',
            cursor: 'pointer',
            position: 'relative',
            transition: 'background 0.2s',
          }}
        >
          <div style={{
            position: 'absolute',
            top: '3px',
            left: billingCycle === 'yearly' ? '25px' : '3px',
            width: '20px', height: '20px',
            borderRadius: '50%',
            background: '#fff',
            transition: 'left 0.2s',
          }} />
        </button>
        <span style={{ fontSize: '13px', color: billingCycle === 'yearly' ? '#f1f5f9' : '#64748b', fontWeight: billingCycle === 'yearly' ? 700 : 400 }}>
          Yearly
          <span style={{ marginLeft: '6px', fontSize: '11px', color: '#10b981', fontWeight: 700 }}>
            Save up to 2 months
          </span>
        </span>
      </div>

      {/* PLAN CARDS */}
      {plansLoading ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: '#64748b' }}>
          Loading plans...
        </div>
      ) : (
        <div className="billing-plans" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', marginBottom: '2rem' }}>
          {plans.map((plan) => {
            const colors = PLAN_COLORS[plan.type] || PLAN_COLORS.FREE;
            const isCurrent = currentPlan?.type === plan.type;
            const isPopular = plan.type === 'PRO';
            const price = billingCycle === 'yearly' ? plan.priceYearly : plan.priceMonthly;
            const monthlyEquiv = billingCycle === 'yearly'
              ? Math.round(plan.priceYearly / 12)
              : plan.priceMonthly;

            return (
              <div
                key={plan.id}
                style={{
                  background: isCurrent ? colors.bg : 'hsl(222 41% 12%)',
                  border: `2px solid ${isCurrent ? colors.primary : isPopular ? colors.border : 'hsl(217 33% 18%)'}`,
                  borderRadius: '16px',
                  padding: '1.5rem',
                  position: 'relative',
                  transition: 'all 0.2s',
                }}
              >
                {/* Popular badge */}
                {isPopular && (
                  <div style={{
                    position: 'absolute', top: '-12px', left: '50%',
                    transform: 'translateX(-50%)',
                    background: 'linear-gradient(135deg,#2563eb,#06b6d4)',
                    color: '#fff', fontSize: '11px', fontWeight: 700,
                    padding: '3px 12px', borderRadius: '20px',
                    whiteSpace: 'nowrap',
                  }}>
                    🔥 Most Popular
                  </div>
                )}

                {/* Current badge */}
                {isCurrent && (
                  <div style={{
                    position: 'absolute', top: '-12px', right: '16px',
                    background: colors.primary,
                    color: '#fff', fontSize: '11px', fontWeight: 700,
                    padding: '3px 10px', borderRadius: '20px',
                  }}>
                    ✓ Current
                  </div>
                )}

                {/* Plan name */}
                <div style={{ fontSize: '18px', fontWeight: 800, color: colors.primary, marginBottom: '4px' }}>
                  {plan.name}
                </div>
                <div style={{ fontSize: '11px', color: '#64748b', marginBottom: '16px' }}>
                  {plan.type === 'FREE' && 'Perfect for trying out'}
                  {plan.type === 'PRO' && 'For regular teachers'}
                  {plan.type === 'INSTITUTION' && 'For schools & coaching centres'}
                </div>

                {/* Price */}
                <div style={{ marginBottom: '20px' }}>
                  {plan.type === 'FREE' ? (
                    <div style={{ fontSize: '2.5rem', fontWeight: 800, color: '#f1f5f9' }}>₹0</div>
                  ) : (
                    <>
                      <div style={{ display: 'flex', alignItems: 'flex-end', gap: '4px' }}>
                        <span style={{ fontSize: '2.5rem', fontWeight: 800, color: '#f1f5f9' }}>
                          {formatINR(monthlyEquiv)}
                        </span>
                        <span style={{ fontSize: '13px', color: '#64748b', paddingBottom: '8px' }}>
                          /month
                        </span>
                      </div>
                      {billingCycle === 'yearly' && (
                        <div style={{ fontSize: '12px', color: '#10b981', marginTop: '2px' }}>
                          {formatINR(plan.priceYearly)} billed yearly
                        </div>
                      )}
                      {billingCycle === 'monthly' && (
                        <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>
                          or {formatINR(Math.round(plan.priceYearly / 12))}/mo billed yearly
                        </div>
                      )}
                    </>
                  )}
                </div>

                {/* Features */}
                <div style={{ marginBottom: '20px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {[
                    {
                      text: billingCycle === 'yearly'
                        ? `${plan.type === 'PRO' ? 250 : plan.type === 'INSTITUTION' ? 650 : plan.type === 'FREE' ? 36 : plan.papersPerMonth * 12} papers/year`
                        : `${plan.papersPerMonth} papers/month`,
                      included: true,
                    },
                    { text: 'PDF export', included: true },
                    { text: 'DOCX export', included: plan.hasDocxExport },
                    { text: 'All 2 templates', included: true },
                    {
                      text: '5 team members',
                      included: plan.hasTeamAccess,
                    },
                    { text: 'AI Assistant', included: plan.type === 'INSTITUTION' },
                    { text: 'Priority support', included: plan.type !== 'FREE' },
                  ].map((feature, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: feature.included ? '#94a3b8' : '#475569' }}>
                      <span style={{ color: feature.included ? '#10b981' : '#475569', fontWeight: 700, fontSize: '13px', flexShrink: 0 }}>
                        {feature.included ? '✓' : '✗'}
                      </span>
                      {feature.text}
                    </div>
                  ))}
                </div>

                {/* CTA Button */}
                <button
                  onClick={() => handleUpgrade(plan)}
                  disabled={isCurrent || plan.type === 'FREE' || loadingPlanId === plan.id}
                  style={{
                    width: '100%',
                    padding: '12px',
                    background: isCurrent
                      ? `${colors.bg}`
                      : plan.type === 'FREE'
                      ? 'rgba(100,116,139,0.15)'
                      : `linear-gradient(135deg, ${colors.primary}, ${plan.type === 'PRO' ? '#06b6d4' : '#d97706'})`,
                    border: isCurrent ? `1px solid ${colors.primary}` : 'none',
                    borderRadius: '10px',
                    color: isCurrent ? colors.primary : plan.type === 'FREE' ? '#64748b' : '#fff',
                    fontSize: '14px',
                    fontWeight: 700,
                    cursor: isCurrent || plan.type === 'FREE' ? 'not-allowed' : 'pointer',
                    transition: 'all 0.2s',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                  }}
                >
                  {loadingPlanId === plan.id ? (
                    '⏳ Processing...'
                  ) : isCurrent ? (
                    '✅ Current Plan'
                  ) : plan.type === 'FREE' ? (
                    'Free Forever'
                  ) : (
                    `Upgrade to ${plan.name} — ${formatINR(monthlyEquiv)}/mo`
                  )}
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* VIEW MORE PLANS + WHATSAPP SUPPORT */}
      {currentPlan && currentPlan.type !== 'FREE' && (
        <div style={{
          background: 'hsl(222 41% 12%)',
          border: '1px solid rgba(37,211,102,0.2)',
          borderRadius: '16px',
          padding: '1.2rem 1.5rem',
          marginTop: '1.5rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: 42, height: 42, borderRadius: '12px', flexShrink: 0,
              background: 'rgba(37,211,102,0.12)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <svg width="22" height="22" viewBox="0 0 32 32" fill="#25d366">
                <path d="M16 2C8.268 2 2 8.268 2 16c0 2.49.643 4.827 1.768 6.857L2 30l7.34-1.92A13.93 13.93 0 0016 30c7.732 0 14-6.268 14-14S23.732 2 16 2zm6.29 19.89c-.345-.172-2.04-1.006-2.356-1.12-.317-.115-.547-.172-.778.173-.23.345-.893 1.12-1.095 1.35-.2.23-.403.26-.748.086-.345-.172-1.457-.537-2.775-1.713-1.026-.914-1.718-2.042-1.92-2.387-.2-.345-.022-.53.15-.702.156-.155.345-.403.518-.604.172-.202.23-.345.345-.575.115-.23.058-.432-.029-.604-.086-.172-.778-1.876-1.066-2.568-.28-.674-.565-.583-.778-.594l-.662-.011c-.23 0-.604.086-.92.432-.316.345-1.208 1.18-1.208 2.877s1.237 3.337 1.41 3.567c.172.23 2.434 3.715 5.897 5.21.824.355 1.467.567 1.969.727.827.263 1.58.226 2.174.137.663-.1 2.04-.834 2.328-1.638.287-.805.287-1.495.2-1.638-.086-.144-.316-.23-.66-.403z"/>
              </svg>
            </div>
            <div>
              <div style={{ color: '#f1f5f9', fontWeight: 700, fontSize: '14px', marginBottom: '2px' }}>
                Payment Support
              </div>
              <div style={{ color: '#64748b', fontSize: '12px' }}>
                Any issue with billing or payment? Chat with us directly on WhatsApp.
              </div>
            </div>
          </div>
          <a
            href={`https://wa.me/+916303677737?text=${encodeURIComponent(`Hi, I need help with my Paptrix ${currentPlan.name} plan payment. My email: ${user?.email || ''}`)}`}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'inline-flex', alignItems: 'center', gap: '8px',
              background: 'linear-gradient(135deg, #25d366, #128c7e)',
              color: '#fff', fontWeight: 700, fontSize: '13px',
              padding: '10px 20px', borderRadius: '10px',
              textDecoration: 'none', whiteSpace: 'nowrap',
              boxShadow: '0 4px 12px rgba(37,211,102,0.25)',
            }}
          >
            <svg width="15" height="15" viewBox="0 0 32 32" fill="white">
              <path d="M16 2C8.268 2 2 8.268 2 16c0 2.49.643 4.827 1.768 6.857L2 30l7.34-1.92A13.93 13.93 0 0016 30c7.732 0 14-6.268 14-14S23.732 2 16 2zm6.29 19.89c-.345-.172-2.04-1.006-2.356-1.12-.317-.115-.547-.172-.778.173-.23.345-.893 1.12-1.095 1.35-.2.23-.403.26-.748.086-.345-.172-1.457-.537-2.775-1.713-1.026-.914-1.718-2.042-1.92-2.387-.2-.345-.022-.53.15-.702.156-.155.345-.403.518-.604.172-.202.23-.345.345-.575.115-.23.058-.432-.029-.604-.086-.172-.778-1.876-1.066-2.568-.28-.674-.565-.583-.778-.594l-.662-.011c-.23 0-.604.086-.92.432-.316.345-1.208 1.18-1.208 2.877s1.237 3.337 1.41 3.567c.172.23 2.434 3.715 5.897 5.21.824.355 1.467.567 1.969.727.827.263 1.58.226 2.174.137.663-.1 2.04-.834 2.328-1.638.287-.805.287-1.495.2-1.638-.086-.144-.316-.23-.66-.403z"/>
            </svg>
            Chat on WhatsApp
          </a>
        </div>
      )}
      {/* WHAT'S INCLUDED COMPARISON */}

      <div style={{ ...card(), marginBottom: '1.5rem',marginTop: '1.5rem' }}>
        <div style={{ fontSize: '14px', fontWeight: 700, color: '#f1f5f9', marginBottom: '1rem' }}>
          📊 Plan Comparison
        </div>
        <div className="billing-compare" style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
            <thead>
              <tr>
                <th style={{ textAlign: 'left', padding: '10px 14px', color: '#64748b', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', borderBottom: '1px solid hsl(217 33% 18%)' }}>
                  Feature
                </th>
                {['Free', 'Pro', 'Institution'].map(name => (
                  <th key={name} style={{ textAlign: 'center', padding: '10px 14px', color: name === 'Pro' ? '#60a5fa' : name === 'Institution' ? '#fbbf24' : '#64748b', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', borderBottom: '1px solid hsl(217 33% 18%)' }}>
                    {name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[
                { feature: 'Papers/month', free: '3', pro: '30', inst: '70' },
                { feature: 'Exports/month', free: '6', pro: '60', inst: '140' },
                { feature: 'PDF Export', free: '✓', pro: '✓', inst: '✓' },
                { feature: 'DOCX Export', free: '✗', pro: '✓', inst: '✓' },
                { feature: 'Templates', free: '3', pro: 'All 6', inst: 'All 6' },
                { feature: 'Custom Branding', free: '✗', pro: '✓', inst: '✓' },
                { feature: 'Team Members', free: '1', pro: '1', inst: '50' },
                { feature: 'Priority OCR', free: '✗', pro: '✓', inst: '✓' },
                { feature: 'Price/month', free: '₹0', pro: '₹499', inst: '₹999' },
              ].map((row) => (
                <tr key={row.feature} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                  <td style={{ padding: '10px 14px', color: '#94a3b8' }}>{row.feature}</td>
                  {[row.free, row.pro, row.inst].map((val, i) => (
                    <td key={i} style={{ padding: '10px 14px', textAlign: 'center', color: val === '✓' ? '#10b981' : val === '✗' ? '#475569' : '#f1f5f9', fontWeight: val === '✓' || val === '✗' ? 700 : 500 }}>
                      {val}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* PAYMENT HISTORY */}
      {payments.length > 0 && (
        <div style={card()}>
          <div style={{ fontSize: '14px', fontWeight: 700, color: '#f1f5f9', marginBottom: '1rem' }}>
            💳 Payment History
          </div>
          <div className="billing-history" style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead>
                <tr>
                  {['Date', 'Description', 'Amount', 'Status'].map(h => (
                    <th key={h} style={{ textAlign: 'left', padding: '8px 12px', color: '#64748b', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', borderBottom: '1px solid hsl(217 33% 18%)' }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {payments.map(payment => (
                  <tr key={payment.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                    <td style={{ padding: '10px 12px', color: '#94a3b8' }}>{formatDate(payment.createdAt)}</td>
                    <td style={{ padding: '10px 12px', color: '#f1f5f9' }}>{payment.description}</td>
                    <td style={{ padding: '10px 12px', color: '#10b981', fontWeight: 700 }}>
                      {formatINR(payment.amount)}
                    </td>
                    <td style={{ padding: '10px 12px' }}>
                      <span style={{
                        fontSize: '11px', fontWeight: 600, padding: '3px 8px', borderRadius: '6px',
                        background: payment.status === 'captured' ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)',
                        color: payment.status === 'captured' ? '#10b981' : '#f87171',
                      }}>
                        {payment.status === 'captured' ? '✓ Paid' : payment.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* WHATSAPP SUPPORT — Pro & Institution only */}
      

      {/* CANCEL CONFIRM MODAL */}
      {showCancelConfirm && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div style={{ background: 'hsl(222 41% 12%)', border: '1px solid hsl(217 33% 18%)', borderRadius: '16px', padding: '2rem', maxWidth: '380px', width: '90%' }}>
            <div style={{ fontSize: '1.5rem', textAlign: 'center', marginBottom: '12px' }}>⚠️</div>
            <div style={{ fontSize: '16px', fontWeight: 700, color: '#f1f5f9', textAlign: 'center', marginBottom: '8px' }}>
              Cancel Subscription?
            </div>
            <div style={{ fontSize: '13px', color: '#94a3b8', textAlign: 'center', marginBottom: '1.5rem' }}>
              You will keep your current plan features until the end of the billing period. After that you will be moved to the Free plan.
            </div>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                onClick={() => setShowCancelConfirm(false)}
                style={{ flex: 1, padding: '10px', background: 'transparent', border: '1px solid hsl(217 33% 18%)', borderRadius: '8px', color: '#94a3b8', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}
              >
                Keep Plan
              </button>
              <button
                onClick={handleCancel}
                style={{ flex: 1, padding: '10px', background: 'rgba(239,68,68,0.8)', border: 'none', borderRadius: '8px', color: '#fff', fontSize: '13px', fontWeight: 700, cursor: 'pointer' }}
              >
                Yes, Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}