'use client';
import { useState, useEffect, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { otpApi } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import toast from 'react-hot-toast';
import Link from 'next/link';

function VerifyOtpContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuthStore();

  const email = searchParams.get('email') || user?.email || '';

  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [countdown, setCountdown] = useState(60);
  const [canResend, setCanResend] = useState(false);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Countdown timer
  useEffect(() => {
    if (countdown <= 0) { setCanResend(true); return; }
    const timer = setTimeout(() => setCountdown(c => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [countdown]);

  // Handle OTP input
  const handleChange = (index: number, value: string) => {
    if (value.length > 1) {
      // Handle paste
      const digits = value.replace(/\D/g, '').split('').slice(0, 6);
      const newOtp = [...otp];
      digits.forEach((d, i) => { if (index + i < 6) newOtp[index + i] = d; });
      setOtp(newOtp);
      const nextIndex = Math.min(index + digits.length, 5);
      inputRefs.current[nextIndex]?.focus();
      return;
    }

    if (!/^\d*$/.test(value)) return;
    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    // Auto focus next
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleVerify = async () => {
    const otpString = otp.join('');
    if (otpString.length !== 6) {
      toast.error('Please enter all 6 digits');
      return;
    }

    setIsVerifying(true);
    try {
      await otpApi.verify(email, otpString);
      toast.success('Email verified successfully! 🎉');
      router.push('/dashboard');
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })
        ?.response?.data?.error || 'Invalid OTP. Please try again.';
      toast.error(msg);
      // Clear OTP fields on error
      setOtp(['', '', '', '', '', '']);
      inputRefs.current[0]?.focus();
    } finally {
      setIsVerifying(false);
    }
  };

  const handleResend = async () => {
    setIsResending(true);
    try {
      await otpApi.resend(email);
      toast.success('New OTP sent to your email!');
      setCountdown(60);
      setCanResend(false);
      setOtp(['', '', '', '', '', '']);
      inputRefs.current[0]?.focus();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })
        ?.response?.data?.error || 'Failed to resend OTP.';
      toast.error(msg);
    } finally {
      setIsResending(false);
    }
  };

  // Auto verify when all 6 digits entered
  useEffect(() => {
    if (otp.every(d => d !== '') && otp.join('').length === 6) {
      handleVerify();
    }
  }, [otp]);

  return (
    <div style={{ minHeight: '100vh', background: 'hsl(222 47% 7%)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
      <div style={{ width: '100%', maxWidth: '400px' }}>

        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{ width: '56px', height: '56px', background: 'linear-gradient(135deg,#2563eb,#06b6d4)', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px', margin: '0 auto 12px' }}>
            📧
          </div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#f1f5f9', marginBottom: '8px' }}>
            Check your email
          </h1>
          <p style={{ color: '#94a3b8', fontSize: '14px', lineHeight: 1.6 }}>
            We sent a 6-digit verification code to
            <br />
            <strong style={{ color: '#60a5fa' }}>{email}</strong>
          </p>
        </div>

        {/* OTP Card */}
        <div style={{ background: 'hsl(222 41% 12%)', border: '1px solid hsl(217 33% 18%)', borderRadius: '16px', padding: '2rem' }}>

          {/* OTP Input boxes */}
          <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', marginBottom: '1.5rem' }}>
            {otp.map((digit, index) => (
              <input
                key={index}
                ref={el => { inputRefs.current[index] = el; }}
                type="text"
                inputMode="numeric"
                maxLength={6}
                value={digit}
                onChange={e => handleChange(index, e.target.value)}
                onKeyDown={e => handleKeyDown(index, e)}
                onFocus={e => e.target.select()}
                style={{
                  width: '48px', height: '56px',
                  textAlign: 'center', fontSize: '22px', fontWeight: 700,
                  background: digit ? 'rgba(59,130,246,0.1)' : 'hsl(222 47% 7%)',
                  border: `2px solid ${digit ? '#3b82f6' : 'hsl(217 33% 18%)'}`,
                  borderRadius: '10px', color: '#f1f5f9', outline: 'none',
                  transition: 'all 0.15s', cursor: 'text',
                }}
              />
            ))}
          </div>

          {/* Verify button */}
          <button
            onClick={handleVerify}
            disabled={isVerifying || otp.some(d => !d)}
            style={{
              width: '100%', padding: '13px',
              background: otp.some(d => !d)
                ? 'rgba(37,99,235,0.3)'
                : 'linear-gradient(135deg,#2563eb,#06b6d4)',
              color: '#fff', border: 'none', borderRadius: '10px',
              fontSize: '15px', fontWeight: 700,
              cursor: otp.some(d => !d) ? 'not-allowed' : 'pointer',
              marginBottom: '1rem',
            }}
          >
            {isVerifying ? '⏳ Verifying...' : '✅ Verify Email'}
          </button>

          {/* Resend section */}
          <div style={{ textAlign: 'center', fontSize: '13px', color: '#64748b' }}>
            {canResend ? (
              <button
                onClick={handleResend}
                disabled={isResending}
                style={{ background: 'none', border: 'none', color: '#60a5fa', cursor: 'pointer', fontSize: '13px', fontWeight: 600 }}
              >
                {isResending ? '⏳ Sending...' : '🔄 Resend OTP'}
              </button>
            ) : (
              <span>
                Resend code in{' '}
                <span style={{ color: '#f1f5f9', fontWeight: 700 }}>{countdown}s</span>
              </span>
            )}
          </div>

          {/* Help text */}
          <div style={{ marginTop: '1.5rem', padding: '12px', background: 'hsl(222 47% 7%)', borderRadius: '10px', fontSize: '12px', color: '#64748b', textAlign: 'center' }}>
            💡 Check your spam folder if you don't see the email
          </div>
        </div>

        {/* Back link */}
        <div style={{ textAlign: 'center', marginTop: '1.5rem' }}>
          <Link href="/auth/register" style={{ fontSize: '13px', color: '#64748b', textDecoration: 'none' }}>
            ← Back to Register
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function VerifyOtpPage() {
  return (
    <Suspense fallback={
      <div style={{ minHeight: '100vh', background: 'hsl(222 47% 7%)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ color: '#64748b' }}>Loading...</div>
      </div>
    }>
      <VerifyOtpContent />
    </Suspense>
  );
}