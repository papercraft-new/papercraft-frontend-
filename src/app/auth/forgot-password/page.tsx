'use client';
import { useState, Suspense } from 'react';
import Link from 'next/link';
import { authApi } from '@/lib/api';
import toast from 'react-hot-toast';

function ForgotPasswordContent() {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async () => {
    if (!email.trim() || !email.includes('@')) {
      toast.error('Please enter a valid email');
      return;
    }

    setIsLoading(true);
    try {
      await authApi.forgotPassword(email.trim().toLowerCase());
      setSent(true);
      toast.success('Reset link sent! Check your email.');
    } catch {
      toast.error('Something went wrong. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: 'hsl(222 47% 7%)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
      <div style={{ width: '100%', maxWidth: '400px' }}>

        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{ width: '48px', height: '48px', background: 'linear-gradient(135deg,#2563eb,#06b6d4)', borderRadius: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '22px', margin: '0 auto 12px' }}>
            🔑
          </div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#f1f5f9', marginBottom: '4px' }}>
            Forgot Password?
          </h1>
          <p style={{ color: '#64748b', fontSize: '13px' }}>
            Enter your email and we'll send you a reset link
          </p>
        </div>

        {!sent ? (
          <div style={{ background: 'hsl(222 41% 12%)', border: '1px solid hsl(217 33% 18%)', borderRadius: '16px', padding: '1.75rem' }}>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ fontSize: '12px', fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px', display: 'block' }}>
                Email Address
              </label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSubmit()}
                placeholder="you@example.com"
                autoFocus
                style={{
                  width: '100%', background: 'hsl(222 47% 7%)',
                  border: '1px solid hsl(217 33% 18%)', borderRadius: '10px',
                  padding: '12px 14px', fontSize: '14px', color: '#f1f5f9',
                  outline: 'none', boxSizing: 'border-box',
                }}
              />
            </div>

            <button
              onClick={handleSubmit}
              disabled={isLoading || !email.trim()}
              style={{
                width: '100%', padding: '13px',
                background: !email.trim() ? 'rgba(37,99,235,0.3)' : 'linear-gradient(135deg,#2563eb,#06b6d4)',
                color: '#fff', border: 'none', borderRadius: '10px',
                fontSize: '15px', fontWeight: 700,
                cursor: !email.trim() || isLoading ? 'not-allowed' : 'pointer',
                marginBottom: '1rem',
              }}
            >
              {isLoading ? '⏳ Sending...' : '📧 Send Reset Link'}
            </button>

            <div style={{ textAlign: 'center', fontSize: '13px', color: '#64748b' }}>
              Remember your password?{' '}
              <Link href="/auth/login" style={{ color: '#60a5fa', fontWeight: 600, textDecoration: 'none' }}>
                Sign in
              </Link>
            </div>
          </div>
        ) : (
          // Success state
          <div style={{ background: 'hsl(222 41% 12%)', border: '1px solid rgba(16,185,129,0.3)', borderRadius: '16px', padding: '2rem', textAlign: 'center' }}>
            <div style={{ fontSize: '3rem', marginBottom: '12px' }}>📬</div>
            <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#f1f5f9', marginBottom: '8px' }}>
              Check your email!
            </h2>
            <p style={{ fontSize: '13px', color: '#94a3b8', lineHeight: '1.6', marginBottom: '16px' }}>
              We sent a password reset link to{' '}
              <strong style={{ color: '#60a5fa' }}>{email}</strong>
            </p>
            <div style={{ background: 'hsl(222 47% 7%)', borderRadius: '10px', padding: '12px', fontSize: '12px', color: '#64748b', marginBottom: '20px' }}>
              💡 Check your spam folder if you don't see it within 2 minutes
            </div>
            <button
              onClick={() => { setSent(false); setEmail(''); }}
              style={{ background: 'transparent', border: '1px solid hsl(217 33% 18%)', borderRadius: '8px', color: '#94a3b8', fontSize: '13px', cursor: 'pointer', padding: '8px 16px' }}
            >
              Try a different email
            </button>
            <div style={{ marginTop: '16px' }}>
              <Link href="/auth/login" style={{ fontSize: '13px', color: '#60a5fa', textDecoration: 'none' }}>
                ← Back to Login
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function ForgotPasswordPage() {
  return (
    <Suspense fallback={<div style={{ minHeight: '100vh', background: 'hsl(222 47% 7%)' }} />}>
      <ForgotPasswordContent />
    </Suspense>
  );
}