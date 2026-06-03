export default function RefundPage() {
  return (
    <div style={{ minHeight: '100vh', background: 'hsl(222 47% 7%)', color: '#f1f5f9', padding: '2rem 1rem' }}>
      <div style={{ maxWidth: '800px', margin: '0 auto' }}>

        <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
          <div style={{ fontSize: '2rem', marginBottom: '8px' }}>💰</div>
          <h1 style={{ fontSize: '2rem', fontWeight: 800, color: '#f1f5f9', marginBottom: '8px' }}>
            Refund Policy
          </h1>
          <p style={{ color: '#64748b', fontSize: '13px' }}>
            Last updated: {new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })}
          </p>
        </div>

        {/* Quick Summary */}
        <div style={{ background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.2)', borderRadius: '12px', padding: '1.5rem', marginBottom: '1.5rem' }}>
          <div style={{ fontSize: '14px', fontWeight: 700, color: '#60a5fa', marginBottom: '12px' }}>
            📌 Quick Summary
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
            {[
              { icon: '✅', title: 'Within 7 days', desc: '' },
              { icon: '⚠️', title: 'After 7 days', desc: 'No refund for monthly plans' },
              { icon: '📅', title: 'Yearly plans', desc: 'Prorated refund within 30 days' },
            ].map(item => (
              <div key={item.title} style={{ background: 'hsl(222 41% 12%)', borderRadius: '10px', padding: '12px', textAlign: 'center' }}>
                <div style={{ fontSize: '1.5rem', marginBottom: '6px' }}>{item.icon}</div>
                <div style={{ fontSize: '13px', fontWeight: 700, color: '#f1f5f9', marginBottom: '4px' }}>{item.title}</div>
                <div style={{ fontSize: '12px', color: '#94a3b8' }}>{item.desc}</div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

          <Section title="1. Our Refund Commitment">
            We want you to be completely happy with Paptrix. If you are not satisfied for any reason, we offer a simple and fair refund process. We believe in making things easy for our customers.
          </Section>

          <Section title="2. Monthly Plan Refunds">
            <ul>
              <li><strong style={{ color: '#10b981' }}>Within 7 days of purchase</strong></li>
              <li><strong style={{ color: '#f87171' }}>After 7 days:</strong> No refund. Your plan remains active until the end of the billing period.</li>
              <li>Refund will be credited to your original payment method within 5-7 business days.</li>
            </ul>
          </Section>

          <Section title="3. Yearly Plan Refunds">
            <ul>
              <li><strong style={{ color: '#10b981' }}>Within 30 days of purchase:</strong> Full 100% refund.</li>
              <li><strong style={{ color: '#fbbf24' }}>After 30 days:</strong> Prorated refund based on unused months.</li>
              <li>Example: If you bought yearly plan for ₹3,990 and used 3 months, you get refund for remaining 9 months = ₹2,992.50</li>
              <li><strong style={{ color: '#f87171' }}>After 6 months:</strong> No refund for yearly plans.</li>
            </ul>
          </Section>

          <Section title="4. When Refunds Are NOT Provided">
            <ul>
              <li>After the refund window has passed</li>
              <li>If your account was suspended due to Terms of Service violations</li>
              <li>For the Free plan (it is already free)</li>
              <li>If you have used more than 80% of your monthly paper quota</li>
              <li>Partial month usage — we do not prorate monthly plans</li>
            </ul>
          </Section>

          <Section title="5. How to Request a Refund">
            <strong style={{ color: '#f1f5f9' }}>Step 1:</strong> Email us at <strong> papercraft271@gmail.com</strong>
            <br /><br />
            <strong style={{ color: '#f1f5f9' }}>Include in your email:</strong>
            <ul>
              <li>Your registered email address</li>
              <li>Date of purchase</li>
              <li>Reason for refund (optional but helpful)</li>
              <li>Order ID (found in billing page)</li>
            </ul>
            <br />
            <strong style={{ color: '#f1f5f9' }}>Step 2:</strong> We will reply within 24-48 hours.
            <br /><br />
            <strong style={{ color: '#f1f5f9' }}>Step 3:</strong> If approved, refund will be processed within 5-7 business days to your original payment method.
          </Section>

          <Section title="6. Technical Issues">
            If you experience technical issues that prevent you from using Paptrix, contact us immediately at <strong>papercraft271@gmail.com</strong>. We will either fix the issue or provide a refund regardless of the refund window.
          </Section>

          <Section title="7. Cancellation Policy">
            <ul>
              <li>You can cancel your subscription anytime from the Billing page in your dashboard.</li>
              <li>Cancellation takes effect at the end of the current billing period.</li>
              <li>You keep access to your plan features until the period ends.</li>
              <li>After cancellation you will be moved to the Free plan (3 papers/month).</li>
              <li>Your papers and data will not be deleted when you cancel.</li>
            </ul>
          </Section>

          <Section title="8. Disputed Charges">
            If you see an unexpected charge, please contact us at <strong>papercraft271@gmail.com</strong> before raising a dispute with your bank. We will resolve it quickly. Raising a chargeback without contacting us first may result in account suspension.
          </Section>

          <Section title="9. Contact for Refunds">
            <strong>Email:</strong> papercraft271@gmail.com<br />
            <strong>Response time:</strong> Within 24-48 hours<br />
            <strong>Refund processing:</strong> 5-7 business days after approval
            <br /><br />
            We aim to make every refund experience smooth and hassle-free.
          </Section>

        </div>

        <div style={{ textAlign: 'center', marginTop: '3rem', paddingTop: '2rem', borderTop: '1px solid hsl(217 33% 18%)', color: '#64748b', fontSize: '13px' }}>
          <a href="/" style={{ color: '#60a5fa', textDecoration: 'none', marginRight: '16px' }}>← Back to Home</a>
          <a href="/terms" style={{ color: '#60a5fa', textDecoration: 'none', marginRight: '16px' }}>Terms of Service</a>
          <a href="/privacy" style={{ color: '#60a5fa', textDecoration: 'none' }}>Privacy Policy</a>
        </div>

      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ background: 'hsl(222 41% 12%)', border: '1px solid hsl(217 33% 18%)', borderRadius: '12px', padding: '1.5rem' }}>
      <h2 style={{ fontSize: '16px', fontWeight: 700, color: '#60a5fa', marginBottom: '12px' }}>
        {title}
      </h2>
      <div style={{ fontSize: '14px', color: '#94a3b8', lineHeight: '1.8' }}>
        {children}
      </div>
    </div>
  );
}