export default function PrivacyPage() {
  return (
    <div style={{ minHeight: '100vh', background: 'hsl(222 47% 7%)', color: '#f1f5f9', padding: '2rem 1rem' }}>
      <div style={{ maxWidth: '800px', margin: '0 auto' }}>

        <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
          <div style={{ fontSize: '2rem', marginBottom: '8px' }}>🔒</div>
          <h1 style={{ fontSize: '2rem', fontWeight: 800, color: '#f1f5f9', marginBottom: '8px' }}>
            Privacy Policy
          </h1>
          <p style={{ color: '#64748b', fontSize: '13px' }}>
            Last updated: {new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })}
          </p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

          <Section title="1. Introduction">
            Paptrix respects your privacy. This policy explains what information we collect, how we use it, and how we protect it. We are committed to protecting your personal data in accordance with the Information Technology Act, 2000 and applicable Indian data protection laws.
          </Section>

          <Section title="2. What Information We Collect">
            <strong style={{ color: '#f1f5f9' }}>Account Information:</strong>
            <ul>
              <li>Name and email address when you register</li>
              <li>Password (stored as encrypted hash — we cannot see your password)</li>
              <li>Institution name if provided</li>
            </ul>
            <br />
            <strong style={{ color: '#f1f5f9' }}>Content You Upload:</strong>
            <ul>
              <li>Images and PDFs you upload for OCR extraction</li>
              <li>Question papers you create and save</li>
              <li>Text you paste for processing</li>
            </ul>
            <br />
            <strong style={{ color: '#f1f5f9' }}>Usage Information:</strong>
            <ul>
              <li>Pages you visit on our website</li>
              <li>Features you use</li>
              <li>Number of papers created</li>
              <li>Device type and browser</li>
            </ul>
            <br />
            <strong style={{ color: '#f1f5f9' }}>Payment Information:</strong>
            <ul>
              <li>We do NOT store your card number or CVV</li>
              <li>Payments are handled by Razorpay</li>
              <li>We only store payment status and amount for records</li>
            </ul>
          </Section>

          <Section title="3. How We Use Your Information">
            <ul>
              <li>To provide the question paper formatting service</li>
              <li>To process your OCR and AI requests</li>
              <li>To send you account-related emails</li>
              <li>To process payments and manage subscriptions</li>
              <li>To improve our service</li>
              <li>To respond to your support requests</li>
              <li>To detect and prevent fraud or abuse</li>
            </ul>
          </Section>

          <Section title="4. Third Party Services We Use">
            We share your data with these trusted services to provide our service:
            <br /><br />
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {[
                { name: 'Supabase', use: 'Database — stores your account and papers', link: 'supabase.com/privacy' },
                { name: 'Cloudinary', use: 'File storage — stores uploaded images', link: 'cloudinary.com/privacy' },
                { name: 'Razorpay', use: 'Payment processing', link: 'razorpay.com/privacy' },
                { name: 'Anthropic (Claude)', use: 'AI OCR and content structuring', link: 'anthropic.com/privacy' },
                { name: 'Vercel', use: 'Website hosting', link: 'vercel.com/legal/privacy-policy' },
                { name: 'Render', use: 'Backend server hosting', link: 'render.com/privacy' },
              ].map(item => (
                <div key={item.name} style={{ background: 'hsl(222 47% 7%)', borderRadius: '8px', padding: '10px 12px' }}>
                  <span style={{ color: '#60a5fa', fontWeight: 600 }}>{item.name}</span>
                  <span style={{ color: '#94a3b8' }}> — {item.use}</span>
                </div>
              ))}
            </div>
            <br />
            We do not sell your data to any third party. Ever.
          </Section>

          <Section title="5. Data Storage and Security">
            <ul>
              <li>All data is stored on secure cloud servers</li>
              <li>Passwords are hashed using bcrypt — we cannot read them</li>
              <li>All connections use HTTPS encryption</li>
              <li>Access to your data is strictly limited</li>
              <li>We regularly review our security practices</li>
            </ul>
          </Section>

          <Section title="6. Your Rights">
            You have the right to:
            <ul>
              <li><strong style={{ color: '#f1f5f9' }}>Access</strong> — Request a copy of your data</li>
              <li><strong style={{ color: '#f1f5f9' }}>Correct</strong> — Update incorrect information</li>
              <li><strong style={{ color: '#f1f5f9' }}>Delete</strong> — Request deletion of your account and data</li>
              <li><strong style={{ color: '#f1f5f9' }}>Export</strong> — Download your papers and data</li>
              <li><strong style={{ color: '#f1f5f9' }}>Opt out</strong> — Unsubscribe from marketing emails</li>
            </ul>
            To exercise any of these rights, email us at <strong>papercraft271@gmail.com</strong>
          </Section>

          <Section title="7. Data Retention">
            <ul>
              <li>Your account data is kept as long as your account is active</li>
              <li>When you delete your account, all data is permanently deleted within 30 days</li>
              <li>Payment records are kept for 7 years as required by Indian tax law</li>
              <li>Uploaded files are deleted when you delete them or your account</li>
            </ul>
          </Section>

          <Section title="8. Cookies">
            We use minimal cookies only for:
            <ul>
              <li>Keeping you logged in (session cookie)</li>
              <li>Remembering your preferences</li>
            </ul>
            We do not use advertising or tracking cookies.
          </Section>

          <Section title="9. Children's Privacy">
            Paptrix is not intended for children under 18 years old. We do not knowingly collect data from children. If you believe a child has provided us data, contact us immediately at <strong>papercraft271@gmail.com</strong>
          </Section>

          <Section title="10. Changes to This Policy">
            We may update this privacy policy. We will notify you by email or a notice on our website. Continued use of Paptrix after changes means you accept the updated policy.
          </Section>

          <Section title="11. Contact Us">
            For any privacy questions or data requests:
            <br /><br />
            <strong>Email:</strong> papercraft271@gmail.com<br />
            <strong>Response time:</strong> Within 72 hours
          </Section>

        </div>

        <div style={{ textAlign: 'center', marginTop: '3rem', paddingTop: '2rem', borderTop: '1px solid hsl(217 33% 18%)', color: '#64748b', fontSize: '13px' }}>
          <a href="/" style={{ color: '#60a5fa', textDecoration: 'none', marginRight: '16px' }}>← Back to Home</a>
          <a href="/terms" style={{ color: '#60a5fa', textDecoration: 'none', marginRight: '16px' }}>Terms of Service</a>
          <a href="/refund" style={{ color: '#60a5fa', textDecoration: 'none' }}>Refund Policy</a>
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