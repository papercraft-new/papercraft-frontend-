export default function TermsPage() {
  return (
    <div style={{ minHeight: '100vh', background: 'hsl(222 47% 7%)', color: '#f1f5f9', padding: '2rem 1rem' }}>
      <div style={{ maxWidth: '800px', margin: '0 auto' }}>

        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
          <div style={{ fontSize: '2rem', marginBottom: '8px' }}>📋</div>
          <h1 style={{ fontSize: '2rem', fontWeight: 800, color: '#f1f5f9', marginBottom: '8px' }}>
            Terms of Service
          </h1>
          <p style={{ color: '#64748b', fontSize: '13px' }}>
            Last updated: {new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })}
          </p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

          <Section title="1. Acceptance of Terms">
            By registering and using Paptrix, you agree to these Terms of Service. If you do not agree, please do not use our service. These terms apply to all users including teachers, students, and institutions.
          </Section>

          <Section title="2. What Paptrix Does">
            Paptrix is an AI-powered question paper formatting tool that helps teachers and educators create professional exam papers. Our service includes OCR extraction, AI structuring, paper editing, PDF export, and DOCX export features.
          </Section>

          <Section title="3. Who Can Use This Service">
            <ul>
              <li>You must be at least 18 years old to create an account.</li>
              <li>You must provide accurate and truthful information during registration.</li>
              <li>One person may not create multiple accounts.</li>
              <li>You are responsible for keeping your password safe.</li>
            </ul>
          </Section>

          <Section title="4. What You Can Upload">
            <ul>
              <li>You may upload your own question papers, handwritten notes, and exam content.</li>
              <li>You must have the right to use any content you upload.</li>
              <li>Do not upload content that belongs to others without permission.</li>
              <li>Do not upload illegal, harmful, or offensive content.</li>
              <li>Do not upload personal data of students or third parties.</li>
            </ul>
          </Section>

          <Section title="5. Your Content">
            You own the question papers and content you create using Paptrix. We do not claim ownership of your content. We only store your content to provide the service to you. You can delete your content and account at any time.
          </Section>

          <Section title="6. Payments and Plans">
            <ul>
              <li>Free plan: 3 papers per month at no cost.</li>
              <li>Pro plan: 20 papers per month at ₹399/month.</li>
              <li>Institution plan: 50 papers per month at ₹899/month.</li>
              <li>Payments are processed securely through Razorpay.</li>
              <li>We do not store your card or payment details.</li>
              <li>Plans renew automatically unless cancelled.</li>
            </ul>
          </Section>

          <Section title="7. Refunds">
            We offer a 7-day refund policy. If you are not satisfied within 7 days of purchase, contact us at <strong>papercraft271@gmail.com</strong> for a full refund. No refunds are issued after 7 days. For yearly plans, prorated refunds may be issued within 30 days.
          </Section>

          <Section title="8. Things You Must Not Do">
            <ul>
              <li>Do not copy, sell, or redistribute our software.</li>
              <li>Do not try to hack or break our systems.</li>
              <li>Do not use our service to generate harmful or illegal content.</li>
              <li>Do not share your account with others.</li>
              <li>Do not use automated bots to access our service.</li>
            </ul>
          </Section>

          <Section title="9. Service Availability">
            We aim to keep Paptrix available 24/7 but we do not guarantee uninterrupted service. We may occasionally perform maintenance which could cause brief downtime. We are not responsible for any loss caused by service interruptions.
          </Section>

          <Section title="10. AI-Generated Content">
           Paptrix uses artificial intelligence to extract and structure question paper content. The AI may occasionally make errors. You are responsible for reviewing and verifying all extracted content before using it in your exam papers. We are not responsible for errors in AI-generated output.
          </Section>

          <Section title="11. Account Termination">
            We reserve the right to suspend or terminate accounts that violate these terms. You may delete your account at any time from your account settings. Upon deletion, your data will be permanently removed within 30 days.
          </Section>

          <Section title="12. Limitation of Liability">
            Paptrix is provided as-is. We are not responsible for any damages arising from your use of our service. Our maximum liability is limited to the amount you paid us in the last 3 months.
          </Section>

          <Section title="13. Changes to Terms">
            We may update these terms occasionally. We will notify you by email or on the website. Continued use of Paptrix after changes means you accept the new terms.
          </Section>

          <Section title="14. Contact Us">
            For any questions about these terms, contact us at:
            <br /><br />
            <strong>Email:</strong> papercraft271@gmail.com<br />
            
          </Section>

        </div>

        {/* Footer */}
        <div style={{ textAlign: 'center', marginTop: '3rem', paddingTop: '2rem', borderTop: '1px solid hsl(217 33% 18%)', color: '#64748b', fontSize: '13px' }}>
          <a href="/" style={{ color: '#60a5fa', textDecoration: 'none', marginRight: '16px' }}>← Back to Home</a>
          <a href="/privacy" style={{ color: '#60a5fa', textDecoration: 'none', marginRight: '16px' }}>Privacy Policy</a>
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