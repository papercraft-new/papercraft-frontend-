'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { usePaperStore } from '@/store/paperStore';
import { buildSamplePaper } from '@/lib/samplePaper';

const STEPS = [
  { n: '1', title: 'Take a photo', desc: 'Handwritten or printed, one page or many' },
  { n: '2', title: 'Check the questions', desc: 'We read them, you fix anything' },
  { n: '3', title: 'Download', desc: 'Print-ready PDF or Word file' },
];

export default function FirstPaperCard() {
  const router = useRouter();
  const loadPaper = usePaperStore(s => s.loadPaper);

  const trySample = () => {
    loadPaper(buildSamplePaper());
    router.push('/dashboard/builder');
  };

  return (
    <div
      style={{
        background: 'linear-gradient(135deg, rgba(37,99,235,0.18), rgba(6,182,212,0.10))',
        border: '1px solid rgba(96,165,250,0.35)',
        borderRadius: '16px',
        padding: '1.5rem',
        marginBottom: '2rem',
      }}
    >
      <style>{`
        .fp-steps{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-top:20px}
        @media (max-width:640px){.fp-steps{grid-template-columns:1fr}.fp-cta{width:100%}}
      `}</style>
      <div style={{ fontSize: '12px', fontWeight: 700, color: '#60a5fa', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
        Get started
      </div>
      <h2 style={{ fontSize: '1.35rem', fontWeight: 800, color: '#f1f5f9', margin: '6px 0 4px' }}>
        Make your first question paper in 2 minutes
      </h2>
      <p style={{ color: '#94a3b8', fontSize: '14px', margin: 0 }}>
        Upload a photo of your paper and we turn it into a clean, print-ready one.
      </p>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'center', marginTop: '18px' }}>
        <Link href="/dashboard/upload" className="fp-cta" style={{ textDecoration: 'none' }}>
          <button
            className="fp-cta"
            style={{
              background: 'linear-gradient(135deg, #2563eb, #06b6d4)',
              color: '#fff',
              border: 'none',
              borderRadius: '12px',
              padding: '14px 26px',
              fontSize: '16px',
              fontWeight: 800,
              cursor: 'pointer',
              boxShadow: '0 8px 24px rgba(37,99,235,0.35)',
            }}
          >
            📷 Upload a photo of your paper
          </button>
        </Link>
        <button
          onClick={trySample}
          style={{
            background: 'transparent',
            border: 'none',
            color: '#94a3b8',
            fontSize: '13px',
            textDecoration: 'underline',
            cursor: 'pointer',
            padding: '6px 2px',
          }}
        >
          or look at a sample paper first
        </button>
      </div>

      <div className="fp-steps">
        {STEPS.map(s => (
          <div key={s.n} style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
            <div
              style={{
                width: 26, height: 26, borderRadius: '50%', flexShrink: 0,
                background: 'rgba(96,165,250,0.2)', color: '#93c5fd',
                fontSize: 13, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            >
              {s.n}
            </div>
            <div>
              <div style={{ fontSize: '13px', fontWeight: 700, color: '#e2e8f0' }}>{s.title}</div>
              <div style={{ fontSize: '12px', color: '#94a3b8' }}>{s.desc}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}