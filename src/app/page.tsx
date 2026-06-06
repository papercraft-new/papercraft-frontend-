'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function SplashPage() {
  const router = useRouter();
  const [phase, setPhase] = useState<'idle' | 'logo' | 'name' | 'tagline' | 'exit'>('idle');

  useEffect(() => {
    const t1 = setTimeout(() => setPhase('logo'),    100);
    const t2 = setTimeout(() => setPhase('name'),    900);
    const t3 = setTimeout(() => setPhase('tagline'), 1700);
    const t4 = setTimeout(() => setPhase('exit'),    3200);
    const t5 = setTimeout(() => router.push('/landing'), 3900);
    return () => [t1,t2,t3,t4,t5].forEach(clearTimeout);
  }, [router]);

  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#080f1e',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
        position: 'relative',
        fontFamily: "'Segoe UI', system-ui, sans-serif",
      }}
    >
      {/* Ambient glow blobs */}
      <div style={{
        position: 'absolute', width: 600, height: 600,
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(37,99,235,0.18) 0%, transparent 70%)',
        top: '50%', left: '50%',
        transform: 'translate(-60%, -60%)',
        pointerEvents: 'none',
      }} />
      <div style={{
        position: 'absolute', width: 500, height: 500,
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(6,182,212,0.12) 0%, transparent 70%)',
        top: '50%', left: '50%',
        transform: 'translate(-30%, -30%)',
        pointerEvents: 'none',
      }} />

      {/* Subtle grid */}
      <div style={{
        position: 'absolute', inset: 0,
        backgroundImage: 'linear-gradient(rgba(255,255,255,0.025) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.025) 1px, transparent 1px)',
        backgroundSize: '60px 60px',
        pointerEvents: 'none',
      }} />

      {/* Main content */}
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 28,
        opacity: phase === 'exit' ? 0 : 1,
        transform: phase === 'exit' ? 'scale(1.06)' : 'scale(1)',
        transition: 'opacity 0.6s ease, transform 0.6s ease',
        zIndex: 1,
      }}>

        {/* Logo */}
        <div style={{
          opacity: phase === 'idle' ? 0 : 1,
          transform: phase === 'idle' ? 'scale(0.4) translateY(20px)' : 'scale(1) translateY(0)',
          transition: 'opacity 0.7s cubic-bezier(0.34,1.56,0.64,1), transform 0.7s cubic-bezier(0.34,1.56,0.64,1)',
          position: 'relative',
        }}>
          {/* Glow ring behind logo */}
          <div style={{
            position: 'absolute', inset: -12,
            borderRadius: '28px',
            background: 'linear-gradient(135deg, rgba(37,99,235,0.35), rgba(6,182,212,0.35))',
            filter: 'blur(16px)',
            opacity: phase === 'idle' ? 0 : 1,
            transition: 'opacity 1s ease 0.4s',
          }} />
          <div style={{
            width: 110, height: 110,
            borderRadius: 24,
            background: 'linear-gradient(145deg, rgba(255,255,255,0.07), rgba(255,255,255,0.02))',
            border: '1px solid rgba(255,255,255,0.1)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            position: 'relative',
            boxShadow: '0 8px 40px rgba(37,99,235,0.25), inset 0 1px 0 rgba(255,255,255,0.1)',
          }}>
            <img
              src="/logo.png"
              alt="Paptrix"
              style={{ width: 76, height: 76, objectFit: 'contain' }}
            />
          </div>
        </div>

        {/* Name */}
        <div style={{
          opacity: ['idle', 'logo'].includes(phase) ? 0 : 1,
          transform: ['idle', 'logo'].includes(phase) ? 'translateY(16px)' : 'translateY(0)',
          transition: 'opacity 0.6s ease, transform 0.6s ease',
          textAlign: 'center',
        }}>
          <div style={{
            fontSize: 52,
            fontWeight: 800,
            letterSpacing: '-1.5px',
            lineHeight: 1,
            background: 'linear-gradient(135deg, #ffffff 0%, #93c5fd 50%, #22d3ee 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}>
            Paptrix
          </div>
        </div>

        {/* Tagline */}
        <div style={{
          opacity: phase === 'tagline' || phase === 'exit' ? 1 : 0,
          transform: phase === 'tagline' || phase === 'exit' ? 'translateY(0)' : 'translateY(10px)',
          transition: 'opacity 0.5s ease, transform 0.5s ease',
          textAlign: 'center',
        }}>
          <p style={{
            fontSize: 15,
            color: 'rgba(148,163,184,0.9)',
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            fontWeight: 500,
          }}>
            AI-Powered Question Paper Generator
          </p>
        </div>

        {/* Loading bar */}
        <div style={{
          width: 180,
          height: 2,
          background: 'rgba(255,255,255,0.06)',
          borderRadius: 2,
          overflow: 'hidden',
          opacity: phase === 'tagline' ? 1 : 0,
          transition: 'opacity 0.4s ease',
        }}>
          <div style={{
            height: '100%',
            width: phase === 'tagline' ? '100%' : '0%',
            background: 'linear-gradient(90deg, #2563eb, #06b6d4)',
            borderRadius: 2,
            transition: 'width 1.4s cubic-bezier(0.4, 0, 0.2, 1)',
          }} />
        </div>
      </div>
    </div>
  );
}