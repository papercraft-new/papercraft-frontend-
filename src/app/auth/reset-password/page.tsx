'use client';
import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { authApi } from '@/lib/api';
import toast from 'react-hot-toast';

function ResetPasswordContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token') || '';
  const email = searchParams.get('email') || '';

  const [form, setForm] = useState({ password: '', confirmPassword: '' });
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [done, setDone] = useState(false);

  const handleSubmit = async () => {
    if (form.password.length < 8) {
      toast.error('Password must be at least 8 characters');
      return;
    }
    if (form.password !== form.confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }
    if (!token || !email) {
      toast.error('Invalid reset link. Please request a new one.');
      return;
    }

    setIsLoading(true);
    try {
      await authApi.resetPassword(token, email, form.password);
      setDone(true);
      toast.success('Password reset successfully!');
      setTimeout(() => router.push('/auth/login'), 2000);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })
        ?.response?.data?.error || 'Reset failed. Link may have expired.';
      toast.error(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const inputStyle: React.CSSProperties = {
    width: '100%', background: 'hsl(222 47% 7%)',
    border: '1px solid hsl(217 33% 18%)', borderRadius: '10px',
    padding: '12px 14px', fontSize: '14px', color: '#f1f5f9',
    outline: 'none', boxSizing: 'border-box',
  };

  if (!token || !email) {
    return (
      <div style={{ minHeight: '100vh', background: 'hsl(222 47% 7%)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
        <div style={{ textAlign: 'center', maxWidth: '380px' }}>
          <div style={{ fontSize: '3rem', marginBottom: '12px' }}>❌</div>
          <h2 style={{ color: '#f1f5f9', marginBottom: '8px' }}>Invalid Reset Link</h2>
          <p style={{ color: '#64748b', marginBottom: '20px', fontSize: '13px' }}>
            This reset link is invalid or has expired.
          </p>
          <Link href="/auth/forgot-password"
            style={{ padding: '10px 20px', background: 'linear-gradient(135deg,#2563eb,#06b6d4)', color: '#fff', borderRadius: '8px', textDecoration: 'none', fontWeight: 600, fontSize: '14px' }}>
            Request New Link
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: 'hsl(222 47% 7%)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
      <div style={{ width: '100%', maxWidth: '400px' }}>

        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{ width: '48px', height: '48px', background: 'linear-gradient(135deg,#2563eb,#06b6d4)', borderRadius: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '22px', margin: '0 auto 12px' }}>
            🔐
          </div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#f1f5f9', marginBottom: '4px' }}>
            Set New Password
          </h1>
          <p style={{ color: '#64748b', fontSize: '13px' }}>
            For <strong style={{ color: '#60a5fa' }}>{email}</strong>
          </p>
        </div>

        {!done ? (
          <div style={{ background: 'hsl(222 41% 12%)', border: '1px solid hsl(217 33% 18%)', borderRadius: '16px', padding: '1.75rem' }}>

            {/* New Password */}
            <div style={{ marginBottom: '16px' }}>
              <label style={{ fontSize: '12px', fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px', display: 'block' }}>
                New Password
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={form.password}
                  onChange={e => setForm(p => ({ ...p, password: e.target.value }))}
                  placeholder="Minimum 8 characters"
                  style={{ ...inputStyle, paddingRight: '44px' }}
                  autoFocus
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', fontSize: '16px' }}
                >
                  {showPassword ? '🙈' : '👁️'}
                </button>
              </div>
              {form.password && (
                <div style={{ marginTop: '5px', fontSize: '11px', color: form.password.length >= 8 ? '#10b981' : '#f59e0b' }}>
                  {form.password.length >= 8 ? '✓ Strong password' : `${8 - form.password.length} more characters needed`}
                </div>
              )}
            </div>

            {/* Confirm Password */}
            <div style={{ marginBottom: '20px' }}>
              <label style={{ fontSize: '12px', fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px', display: 'block' }}>
                Confirm Password
              </label>
              <input
                type="password"
                value={form.confirmPassword}
                onChange={e => setForm(p => ({ ...p, confirmPassword: e.target.value }))}
                onKeyDown={e => e.key === 'Enter' && handleSubmit()}
                placeholder="Repeat your password"
                style={{
                  ...inputStyle,
                  border: form.confirmPassword && form.confirmPassword !== form.password
                    ? '1px solid rgba(239,68,68,0.5)'
                    : inputStyle.border,
                }}
              />
              {form.confirmPassword && form.confirmPassword !== form.password && (
                <div style={{ marginTop: '5px', fontSize: '11px', color: '#f87171' }}>✗ Passwords do not match</div>
              )}
            </div>

            <button
              onClick={handleSubmit}
              disabled={isLoading || form.password.length < 8 || form.password !== form.confirmPassword}
              style={{
                width: '100%', padding: '13px',
                background: form.password.length < 8 || form.password !== form.confirmPassword
                  ? 'rgba(37,99,235,0.3)'
                  : 'linear-gradient(135deg,#2563eb,#06b6d4)',
                color: '#fff', border: 'none', borderRadius: '10px',
                fontSize: '15px', fontWeight: 700, cursor: 'pointer',
                marginBottom: '1rem',
              }}
            >
              {isLoading ? '⏳ Resetting...' : '🔐 Reset Password'}
            </button>

            <div style={{ textAlign: 'center' }}>
              <Link href="/auth/login" style={{ fontSize: '13px', color: '#64748b', textDecoration: 'none' }}>
                ← Back to Login
              </Link>
            </div>
          </div>
        ) : (
          <div style={{ background: 'hsl(222 41% 12%)', border: '1px solid rgba(16,185,129,0.3)', borderRadius: '16px', padding: '2rem', textAlign: 'center' }}>
            <div style={{ fontSize: '3rem', marginBottom: '12px' }}>✅</div>
            <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#f1f5f9', marginBottom: '8px' }}>Password Reset!</h2>
            <p style={{ fontSize: '13px', color: '#94a3b8', marginBottom: '16px' }}>
              Redirecting you to login...
            </p>
            <Link href="/auth/login"
              style={{ padding: '10px 24px', background: 'linear-gradient(135deg,#2563eb,#06b6d4)', color: '#fff', borderRadius: '8px', textDecoration: 'none', fontWeight: 600, fontSize: '14px' }}>
              Go to Login
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div style={{ minHeight: '100vh', background: 'hsl(222 47% 7%)' }} />}>
      <ResetPasswordContent />
    </Suspense>
  );
}