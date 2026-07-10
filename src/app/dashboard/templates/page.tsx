'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { usePaperStore } from '@/store/paperStore';
import { useAuthStore } from '@/store/authStore';
import toast from 'react-hot-toast';

// ─────────────────────────────────────────
// TEMPLATE DATA
// ─────────────────────────────────────────

const TEMPLATES = [
  {
    id: 'tpl_school',                        // matches backend TEMPLATE_CONFIGS key
    name: 'Basic',
    description: 'Classic double-border layout for CBSE, ICSE and state board schools',
    icon: '🏫',
    badge: 'Most Popular',
    badgeColor: '#10b981',
    plans: ['FREE', 'PRO', 'INSTITUTION'],
    preview: {
      borderStyle: '3px double #1a2e5a',
      headerColor: '#1a2e5a',
      accentColor: '#1a2e5a',
      bgColor: '#f0f4ff',
      font: 'Times New Roman',
    },
    features: [
      'Double page border',
      'Bold institution name',
      'Two column meta info',
      'Shaded section headers',
      'Signature block',
      'Answer lines',
    ],
    usedBy: 'CBSE · ICSE · State Boards',
    mcqLayout: '2x2 grid',
  },
  {
    id: 'tpl_classic',                       // matches backend TEMPLATE_CONFIGS key
    name: 'Classic',
    description: 'Clean layout with minimal top details — name, class, date and marks. MCQ options in a single row.',
    icon: '📄',
    badge: 'Clean',
    badgeColor: '#6366f1',
    plans: ['FREE', 'PRO', 'INSTITUTION'],
    preview: {
      borderStyle: 'none',
      headerColor: '#111827',
      accentColor: '#374151',
      bgColor: '#f9fafb',
      font: 'Times New Roman',
    },
    features: [
      'Minimal top header',
      'Name · Class · Date · Marks',
      'No extra institution details',
      'MCQ: all 4 options in one line',
      'Clean readable layout',
      'All question types',
    ],
    usedBy: 'Quick Tests · Class Tests · Assignments',
    mcqLayout: 'all 4 in one line',
  },
  {
    id: 'tpl_worksheet',                     // matches backend TEMPLATE_CONFIGS key
    name: 'Worksheet',
    description: 'Student worksheet — title above, Name field, single border box, ~20 questions per page, institution name in footer.',
    icon: '📝',
    badge: 'PRO',
    badgeColor: '#f59e0b',
    plans: ['PRO', 'INSTITUTION'],
    preview: {
      borderStyle: '1.5px solid #1F2937',
      headerColor: '#1F2937',
      accentColor: '#1F2937',
      bgColor: '#F3F4F6',
      font: 'Calibri',
    },
    features: [
      'Worksheet title at top',
      'Name · Class · Date field',
      'Single page border',
      '~20 questions per page',
      'MCQ: 2×2 grid',
      'Institution name in footer',
    ],
    usedBy: 'Practice Sheets · Class Tests · Assignments',
    mcqLayout: '2×2 grid',
  },
  {
    id: 'tpl_professional',                  // matches backend TEMPLATE_CONFIGS key
    name: 'Professional',
    description: 'Formal layout — logo circle left, institution info box right, centred underlined title, single page border.',
    icon: '🏛️',
    badge: 'INSTITUTION',
    badgeColor: '#8b5cf6',
    plans: ['INSTITUTION'],
    preview: {
      borderStyle: '1.5px solid #1F2937',
      headerColor: '#1F2937',
      accentColor: '#1F2937',
      bgColor: '#f9fafb',
      font: 'Arial',
    },
    features: [
      'Logo placeholder (left)',
      'Institution info box (right)',
      'Centred underlined title',
      'Single page border',
      'Signature block',
      'MCQ: 2×2 grid',
    ],
    usedBy: 'University Exams · Official Tests · Semester Papers',
    mcqLayout: '2×2 grid',
  },
];

// ─────────────────────────────────────────
// TEMPLATE PREVIEW CARD
// ─────────────────────────────────────────

function TemplatePreview({ template }: { template: typeof TEMPLATES[0] }) {
  const p = template.preview;
  const isClassic = template.id === 'tpl_classic';
  const isWorksheet = template.id === 'tpl_worksheet';
  const isProfessional = template.id === 'tpl_professional';
  return (
    <div style={{
      width: '100%',
      height: '160px',
      background: '#ffffff',
      borderRadius: '8px',
      padding: '10px',
      overflow: 'hidden',
      position: 'relative',
      fontFamily: p.font,
      boxSizing: 'border-box',
    }}>
      <div style={{
        border: p.borderStyle,
        height: '100%',
        padding: '8px',
        display: 'flex',
        flexDirection: 'column',
        gap: '4px',
        boxSizing: 'border-box',
      }}>

        {isWorksheet ? (
          /* Worksheet: title above, name+class row, questions compact */
          <>
            <div style={{ textAlign: 'center', fontSize: '7px', fontWeight: 800, color: p.headerColor, textTransform: 'uppercase', marginBottom: '3px' }}>
              WORKSHEET NAME
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '5px', color: '#333', borderBottom: `1px solid ${p.accentColor}`, paddingBottom: '3px', marginBottom: '3px' }}>
              <span><strong>Name:</strong> ___________________</span>
              <span><strong>Class:</strong> X &nbsp; <strong>Date:</strong> 01 Jan 2026</span>
            </div>
            {[1,2,3,4,5].map(n => (
              <div key={n} style={{ fontSize: '4.5px', color: '#222', borderBottom: '0.5px solid #ddd', paddingBottom: '2px', marginBottom: '1px' }}>
                <strong>{n}.</strong> Sample question text here ___________
              </div>
            ))}
            <div style={{ marginTop: 'auto', fontSize: '4px', color: '#666', textAlign: 'right', borderTop: `0.5px solid ${p.accentColor}` }}>
              Institution Name
            </div>
          </>
        ) : isProfessional ? (
          /* Professional: logo left + info box right, centred title */
          <>
            <div style={{ display: 'flex', gap: '4px', marginBottom: '4px', alignItems: 'stretch' }}>
              {/* Logo circle */}
              <div style={{ width: '28px', height: '28px', borderRadius: '50%', border: '1px solid #bbb', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '4px', color: '#aaa', flexShrink: 0 }}>
                LOGO
              </div>
              {/* Info box */}
              <div style={{ flex: 1, border: `1px solid ${p.accentColor}`, padding: '2px 4px', fontSize: '4.5px', color: '#333' }}>
                <div style={{ fontWeight: 800, color: p.headerColor, fontSize: '5px' }}>SSS COLLEGE</div>
                <div>Gajapthimagaram, 535000</div>
                <div>info@gmail.com | Ph: 1234567890</div>
              </div>
            </div>
            <div style={{ textAlign: 'center', fontSize: '6px', fontWeight: 700, color: p.headerColor, textDecoration: 'underline', marginBottom: '3px' }}>
              QUESTION PAPER
            </div>
            <div style={{ background: p.bgColor, textAlign: 'center', fontSize: '5px', fontWeight: 700, color: p.accentColor, padding: '2px', border: `1px solid ${p.accentColor}`, marginBottom: '3px' }}>
              SECTION A — MCQ (1 Mark Each)
            </div>
            {[1,2].map(n => (
              <div key={n} style={{ display: 'flex', gap: '3px', fontSize: '4.5px', color: '#333', marginBottom: '2px' }}>
                <span style={{ fontWeight: 700 }}>{n}.</span>
                <span style={{ flex: 1 }}>Sample question text for preview</span>
              </div>
            ))}
          </>
        ) : isClassic ? (
          /* Classic: only name, class, date, marks in one compact row */
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', fontSize: '5px', color: '#444', borderBottom: '1px solid #ccc', paddingBottom: '3px', marginBottom: '2px' }}>
              <span><strong>Name:</strong> ___________</span>
              <span><strong>Class:</strong> X</span>
              <span><strong>Date:</strong> 01 Jan 2026</span>
              <span><strong>Marks:</strong> 30</span>
            </div>
            <div style={{ textAlign: 'center', fontSize: '6px', fontWeight: 700, color: p.headerColor, textTransform: 'uppercase', borderTop: `1px solid ${p.accentColor}`, borderBottom: `1px solid ${p.accentColor}`, padding: '2px 0', margin: '2px 0' }}>
              QUESTION PAPER
            </div>
            <div style={{ display: 'flex', gap: '3px', fontSize: '5px', color: '#333' }}>
              <span style={{ fontWeight: 700, flexShrink: 0 }}>1.</span>
              <span style={{ flex: 1 }}>Sample question text for preview purposes</span>
            </div>
            <div style={{ display: 'flex', gap: '6px', marginLeft: '8px', fontSize: '4.5px', color: '#555' }}>
              {['a', 'b', 'c', 'd'].map(opt => (
                <span key={opt}><strong>({opt})</strong> Opt {opt.toUpperCase()}</span>
              ))}
            </div>
          </>
        ) : (
          /* Default (Basic): full institution header */
          <>
            <div style={{ textAlign: 'center', fontSize: '7px', fontWeight: 800, color: p.headerColor, textTransform: 'uppercase', letterSpacing: '0.5px', borderBottom: `1px solid ${p.accentColor}`, paddingBottom: '3px', marginBottom: '2px' }}>
              INSTITUTION NAME
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '5px', color: '#444' }}>
              <span>Subject: Mathematics</span>
              <span>Date: 01 Jan 2026</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '5px', color: '#444' }}>
              <span>Class: X</span>
              <span>Duration: 3 Hours</span>
            </div>
            <div style={{ textAlign: 'center', fontSize: '6px', fontWeight: 700, color: p.headerColor, textTransform: 'uppercase', borderTop: `1px solid ${p.accentColor}`, borderBottom: `1px solid ${p.accentColor}`, padding: '2px 0', margin: '2px 0' }}>
              QUESTION PAPER
            </div>
            <div style={{ background: p.bgColor, textAlign: 'center', fontSize: '5.5px', fontWeight: 700, color: p.accentColor, padding: '2px', border: `1px solid ${p.accentColor}` }}>
              SECTION A — MCQ (1 Mark Each)
            </div>
            <div style={{ display: 'flex', gap: '3px', fontSize: '5px', color: '#333' }}>
              <span style={{ fontWeight: 700, flexShrink: 0 }}>1.</span>
              <span style={{ flex: 1 }}>Sample question text for preview purposes</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1px', marginLeft: '8px' }}>
              {['a', 'b', 'c', 'd'].map(opt => (
                <span key={opt} style={{ fontSize: '4.5px', color: '#555' }}>
                  <strong>({opt})</strong> Option {opt.toUpperCase()}
                </span>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────
// MAIN PAGE
// ─────────────────────────────────────────

export default function TemplatesPage() {
  const router = useRouter();
  const { templateId, setTemplateId, sections } = usePaperStore();
  const user = useAuthStore(s => s.user);
  const userPlan: string = (user?.subscription?.plan?.type || 'FREE').toUpperCase();
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [previewId, setPreviewId] = useState<string | null>(null);

  const isPlanAllowed = (template: typeof TEMPLATES[0]) =>
    template.plans.includes(userPlan);

  const downloadSample = (template: typeof TEMPLATES[0]) => {
    const cssMap: Record<string, string> = {
      tpl_school: `*{margin:0;padding:0;box-sizing:border-box}body{font-family:'Times New Roman',serif;font-size:13px;color:#111;line-height:1.6}.wrap{padding:16mm;width:210mm;margin:0 auto;min-height:297mm;border:3px double #1a2e5a}.inst{text-align:center;font-size:18px;font-weight:bold;text-transform:uppercase;color:#1a2e5a;margin-bottom:4px}.divider{border-top:2px solid #1a2e5a;margin:5px 0}.thin{border-top:1px solid #1a2e5a;margin:4px 0}.meta{display:flex;justify-content:space-between;font-size:12px;margin:4px 0}.title{text-align:center;font-size:16px;font-weight:bold;text-transform:uppercase;color:#1a2e5a;text-decoration:underline;margin:6px 0}.sec{text-align:center;border:1px solid #1a2e5a;padding:4px;font-weight:bold;font-size:13px;text-transform:uppercase;color:#1a2e5a;background:#f0f4ff;margin:10px 0 8px}.q{margin-bottom:12px}.qrow{display:flex;gap:5px}.qnum{font-weight:bold;min-width:20px}.qtext{flex:1;font-size:13px}.mcq{display:grid;grid-template-columns:1fr 1fr;gap:5px 20px;margin:5px 0 0 24px;font-size:12px}.aline{border-bottom:1px solid #ddd;height:20px;margin:4px 0 4px 24px}.sig{display:flex;justify-content:space-between;margin-top:20px}.sigline{text-align:center;width:30%;border-top:1px solid #999;padding-top:4px;font-size:11px;color:#555}@media print{body{margin:0}.wrap{padding:12mm}}`,
      tpl_classic: `*{margin:0;padding:0;box-sizing:border-box}body{font-family:'Times New Roman',serif;font-size:13px;color:#111;line-height:1.6}.wrap{padding:16mm;width:210mm;margin:0 auto;min-height:297mm}.inst{text-align:center;font-size:18px;font-weight:bold;text-transform:uppercase;color:#111;margin-bottom:4px}.thin{border-top:1px solid #555;margin:4px 0}.metarow{display:flex;justify-content:space-between;flex-wrap:wrap;gap:5px;font-size:12px;padding-bottom:5px;border-bottom:1px solid #888;margin-bottom:5px}.title{text-align:center;font-size:16px;font-weight:bold;text-transform:uppercase;color:#111;margin:5px 0}.sec{text-align:center;border:1px solid #333;padding:4px;font-weight:bold;font-size:13px;text-transform:uppercase;background:#f5f5f5;margin:10px 0 8px}.q{margin-bottom:12px}.qrow{display:flex;gap:5px}.qnum{font-weight:bold;min-width:20px}.qtext{flex:1;font-size:13px}.mcq{display:grid;grid-template-columns:1fr 1fr 1fr 1fr;margin:5px 0 0 24px;font-size:12px}.aline{border-bottom:1px solid #ddd;height:20px;margin:4px 0 4px 24px}@media print{body{margin:0}.wrap{padding:12mm}}`,
      tpl_worksheet: `*{margin:0;padding:0;box-sizing:border-box}body{font-family:'Calibri',sans-serif;font-size:12px;color:#111;line-height:1.5}.wrap{padding:14mm;width:210mm;margin:0 auto;min-height:297mm}.wstitle{text-align:center;font-size:15px;font-weight:bold;text-transform:uppercase;color:#1F2937;margin-bottom:6px}.wsrow{display:flex;justify-content:space-between;font-size:12px;padding:4px 0;border-top:1px solid #1F2937;border-bottom:1px solid #1F2937;margin-bottom:8px}.sec{text-align:center;border:1px solid #1F2937;padding:3px;font-weight:bold;font-size:11px;text-transform:uppercase;color:#1F2937;background:#F3F4F6;margin:6px 0}.q{margin-bottom:6px}.qrow{display:flex;gap:4px}.qnum{font-weight:bold;min-width:18px}.qtext{flex:1;font-size:12px}.mcq{display:flex;margin:3px 0 0 22px;font-size:11px}.mcqopt{flex:1}.aline{border-bottom:1px solid #ddd;height:16px;margin:3px 0 3px 22px}.footer{text-align:right;font-size:10px;color:#666;border-top:1px solid #ddd;margin-top:8px;padding-top:4px}@media print{body{margin:0}.wrap{padding:10mm}}`,
      tpl_professional: `*{margin:0;padding:0;box-sizing:border-box}body{font-family:'Arial',sans-serif;font-size:13px;color:#111;line-height:1.6}.wrap{padding:16mm;width:210mm;margin:0 auto;min-height:297mm;border:1px solid #1F2937}.prohead{display:flex;gap:12px;margin-bottom:10px}.logo{width:70px;height:70px;border-radius:50%;border:2px solid #1F2937;display:flex;align-items:center;justify-content:center;font-size:10px;color:#aaa;flex-shrink:0;text-align:center}.info{flex:1;border:2px solid #1F2937;border-radius:4px;overflow:hidden}.infoname{font-weight:bold;font-size:14px;color:#fff;text-transform:uppercase;background:#1F2937;padding:6px 10px}.infoline{font-size:11px;color:#333;padding:2px 10px}.metarow{display:flex;justify-content:space-between;font-size:12px;background:#f9fafb;border:1px solid #e5e7eb;border-radius:4px;padding:5px 10px;margin-bottom:8px}.thin{border-top:1px solid #1F2937;margin:5px 0}.title{text-align:center;font-size:15px;font-weight:bold;text-transform:uppercase;color:#1F2937;text-decoration:underline;margin:6px 0}.sec{text-align:center;border:1px solid #1F2937;padding:4px;font-weight:bold;font-size:12px;text-transform:uppercase;color:#1F2937;background:#f0f4ff;margin:10px 0 8px}.q{margin-bottom:10px}.qrow{display:flex;gap:5px}.qnum{font-weight:bold;min-width:20px}.qtext{flex:1;font-size:13px}.mcq{display:grid;grid-template-columns:1fr 1fr;gap:5px 20px;margin:5px 0 0 24px;font-size:12px}.aline{border-bottom:1px solid #ddd;height:20px;margin:4px 0 4px 24px}.sig{display:flex;justify-content:space-between;margin-top:20px}.sigline{text-align:center;width:30%;border-top:1px solid #999;padding-top:4px;font-size:11px;color:#555}@media print{body{margin:0}.wrap{padding:12mm;border:1px solid #1F2937}}`,
    };
    const htmlMap: Record<string, string> = {
      tpl_school: `<div class="wrap"><div class="inst">SAMPLE INSTITUTION NAME</div><div class="divider"></div><div class="meta"><span>Subject: Mathematics</span><span>Date: DD/MM/YYYY</span></div><div class="meta"><span>Class: X</span><span>Duration: 3 Hours</span></div><div class="thin"></div><div class="title">SAMPLE QUESTION PAPER</div><div class="thin"></div><div class="sec">SECTION A — MCQ (1 Mark Each)</div><div class="q"><div class="qrow"><span class="qnum">1.</span><span class="qtext">This is a sample MCQ question. Choose the correct option.</span></div><div class="mcq"><div><b>(a)</b> Option A</div><div><b>(b)</b> Option B</div><div><b>(c)</b> Option C</div><div><b>(d)</b> Option D</div></div></div><div class="q"><div class="qrow"><span class="qnum">2.</span><span class="qtext">Another sample MCQ question for reference.</span></div><div class="mcq"><div><b>(a)</b> Option A</div><div><b>(b)</b> Option B</div><div><b>(c)</b> Option C</div><div><b>(d)</b> Option D</div></div></div><div class="sec">SECTION B — SHORT ANSWER (3 Marks Each)</div><div class="q"><div class="qrow"><span class="qnum">3.</span><span class="qtext">Sample short answer question. Write your answer below.</span></div><div class="aline"></div><div class="aline"></div></div><div class="sec">SECTION C — LONG ANSWER (5 Marks Each)</div><div class="q"><div class="qrow"><span class="qnum">4.</span><span class="qtext">Sample long answer question. Explain in detail.</span></div><div class="aline"></div><div class="aline"></div><div class="aline"></div><div class="aline"></div></div><div class="thin"></div><div class="sig"><div class="sigline">Subject Teacher</div><div class="sigline">HOD / Principal</div><div class="sigline">Exam Controller</div></div></div>`,
      tpl_classic: `<div class="wrap"><div class="inst">SAMPLE INSTITUTION NAME</div><div class="thin"></div><div class="metarow"><span><b>Name:</b> ___________________</span><span><b>Class:</b> X</span><span><b>Date:</b> DD/MM/YYYY</span><span><b>Max. Marks:</b> 50</span></div><div class="thin"></div><div class="title">SAMPLE QUESTION PAPER</div><div class="thin"></div><div class="sec">SECTION A — MCQ (1 Mark Each)</div><div class="q"><div class="qrow"><span class="qnum">1.</span><span class="qtext">Sample MCQ question. Choose the correct option.</span></div><div class="mcq"><span><b>(a)</b> Option A</span><span><b>(b)</b> Option B</span><span><b>(c)</b> Option C</span><span><b>(d)</b> Option D</span></div></div><div class="q"><div class="qrow"><span class="qnum">2.</span><span class="qtext">Another sample MCQ question for reference.</span></div><div class="mcq"><span><b>(a)</b> Option A</span><span><b>(b)</b> Option B</span><span><b>(c)</b> Option C</span><span><b>(d)</b> Option D</span></div></div><div class="sec">SECTION B — SHORT ANSWER (3 Marks Each)</div><div class="q"><div class="qrow"><span class="qnum">3.</span><span class="qtext">Sample short answer question. Write your answer below.</span></div><div class="aline"></div><div class="aline"></div></div><div class="sec">SECTION C — LONG ANSWER (5 Marks Each)</div><div class="q"><div class="qrow"><span class="qnum">4.</span><span class="qtext">Sample long answer question. Explain in detail.</span></div><div class="aline"></div><div class="aline"></div><div class="aline"></div></div></div>`,
      tpl_worksheet: `<div class="wrap"><div class="wstitle">SAMPLE WORKSHEET</div><div class="wsrow"><span><b>Name:</b> _____________________________</span><span><b>Date:</b> DD/MM/YYYY</span></div><div class="sec">SECTION A — MCQ (1 Mark Each)</div><div class="q"><div class="qrow"><span class="qnum">1.</span><span class="qtext">Sample MCQ question for worksheet.</span></div><div class="mcq"><span class="mcqopt"><b>(a)</b> Opt A</span><span class="mcqopt"><b>(b)</b> Opt B</span><span class="mcqopt"><b>(c)</b> Opt C</span><span class="mcqopt"><b>(d)</b> Opt D</span></div></div><div class="q"><div class="qrow"><span class="qnum">2.</span><span class="qtext">Another sample question here.</span></div><div class="mcq"><span class="mcqopt"><b>(a)</b> Opt A</span><span class="mcqopt"><b>(b)</b> Opt B</span><span class="mcqopt"><b>(c)</b> Opt C</span><span class="mcqopt"><b>(d)</b> Opt D</span></div></div><div class="sec">SECTION B — SHORT ANSWER</div><div class="q"><div class="qrow"><span class="qnum">3.</span><span class="qtext">Sample short answer question.</span></div><div class="aline"></div></div><div class="q"><div class="qrow"><span class="qnum">4.</span><span class="qtext">Another short answer question.</span></div><div class="aline"></div></div><div class="footer">Sample Institution Name</div></div>`,
      tpl_professional: `<div class="wrap"><div class="prohead"><div class="logo">LOGO</div><div class="info"><div class="infoname">SAMPLE INSTITUTION NAME</div><div class="infoline">📍 City, State — 500001</div><div class="infoline">🏫 Dept. of Sample Department</div></div></div><div class="metarow"><span><b>Subject:</b> Mathematics</span><span><b>Class:</b> XII</span><span><b>Date:</b> DD/MM/YYYY</span><span><b>Duration:</b> 3 Hrs</span><span><b>Max. Marks:</b> 70</span></div><div class="thin"></div><div class="title">SAMPLE QUESTION PAPER</div><div class="thin"></div><div class="sec">SECTION A — MCQ (1 Mark Each)</div><div class="q"><div class="qrow"><span class="qnum">1.</span><span class="qtext">Sample MCQ question for professional template.</span></div><div class="mcq"><div><b>(a)</b> Option A</div><div><b>(b)</b> Option B</div><div><b>(c)</b> Option C</div><div><b>(d)</b> Option D</div></div></div><div class="sec">SECTION B — SHORT ANSWER (3 Marks Each)</div><div class="q"><div class="qrow"><span class="qnum">2.</span><span class="qtext">Sample short answer question. Write your answer below.</span></div><div class="aline"></div><div class="aline"></div></div><div class="sec">SECTION C — LONG ANSWER (5 Marks Each)</div><div class="q"><div class="qrow"><span class="qnum">3.</span><span class="qtext">Sample long answer question. Explain in detail.</span></div><div class="aline"></div><div class="aline"></div><div class="aline"></div></div><div class="thin"></div><div class="sig"><div class="sigline">Subject Teacher</div><div class="sigline">HOD / Principal</div><div class="sigline">Exam Controller</div></div></div>`,
    };

    const css = cssMap[template.id] || cssMap['tpl_school'];
    const body = htmlMap[template.id] || htmlMap['tpl_school'];
    const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>${template.name} Sample</title><style>${css}</style></head><body>${body}<script>window.onload=function(){window.print();};<\/script></body></html>`;
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${template.name.toLowerCase().replace(/\s+/g, '_')}_sample.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success(`${template.name} sample downloaded! Open the file to print/save as PDF.`, { duration: 3000 });
  };

  const handleSelect = (template: typeof TEMPLATES[0]) => {
    if (!isPlanAllowed(template)) {
      toast.error(`🔒 Upgrade to ${template.plans[0]} to use the ${template.name} template.`);
      return;
    }
    setTemplateId(template.id);
    toast.success(`✅ ${template.name} template selected!`);
  };

  const handleUseNow = (template: typeof TEMPLATES[0]) => {
    if (!isPlanAllowed(template)) {
      toast.error(`🔒 Upgrade to ${template.plans[0]} to use the ${template.name} template.`);
      router.push('/dashboard/billing');
      return;
    }
    setTemplateId(template.id);
    if (sections.length > 0) {
      router.push('/dashboard/builder');
    } else {
      router.push('/dashboard/upload');
    }
    toast.success(`${template.name} selected! Start building your paper.`);
  };

  // Fallback: if stored templateId doesn't match any template, default to 'school'
  const selectedTemplate =
    TEMPLATES.find(t => t.id === templateId) || TEMPLATES[0];

  return (
    <div style={{ padding: '1.5rem', maxWidth: '900px', margin: '0 auto' }}>

      {/* HEADER */}
      <div style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#f1f5f9', marginBottom: '4px' }}>
          🎨 Templates
        </h1>
        <p style={{ color: '#94a3b8', fontSize: '13px' }}>
          Choose a template for your question paper. The template controls the layout and styling of your exported PDF and DOCX.
        </p>
      </div>

      {/* CURRENT TEMPLATE BANNER */}
      <div style={{
        background: 'rgba(59,130,246,0.08)',
        border: '1px solid rgba(59,130,246,0.2)',
        borderRadius: '12px',
        padding: '12px 16px',
        marginBottom: '1.5rem',
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        flexWrap: 'wrap',
      }}>
        <span style={{ fontSize: '1.5rem' }}>{selectedTemplate.icon}</span>
        <div>
          <div style={{ fontSize: '13px', fontWeight: 700, color: '#60a5fa' }}>
            Currently Selected: {selectedTemplate.name}
          </div>
          <div style={{ fontSize: '12px', color: '#64748b' }}>
            {selectedTemplate.description}
          </div>
        </div>
        <button
          onClick={() => router.push(sections.length > 0 ? '/dashboard/builder' : '/dashboard/upload')}
          style={{
            marginLeft: 'auto',
            padding: '8px 16px',
            background: 'linear-gradient(135deg,#2563eb,#06b6d4)',
            border: 'none',
            borderRadius: '8px',
            color: '#fff',
            fontSize: '13px',
            fontWeight: 700,
            cursor: 'pointer',
          }}
        >
          Use This Template →
        </button>
      </div>

      {/* TEMPLATE GRID */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(380px, 1fr))',
        gap: '1.25rem',
      }}>
        {TEMPLATES.map(template => {
          const isSelected = templateId === template.id || selectedTemplate.id === template.id;
          const isHovered = hoveredId === template.id;
          const isLocked = !isPlanAllowed(template);

          return (
            <div
              key={template.id}
              onMouseEnter={() => setHoveredId(template.id)}
              onMouseLeave={() => setHoveredId(null)}
              style={{
                background: isSelected ? 'rgba(59,130,246,0.08)' : 'hsl(222 41% 12%)',
                border: `2px solid ${isLocked ? 'hsl(217 33% 15%)' : isSelected ? '#3b82f6' : isHovered ? 'hsl(217 33% 28%)' : 'hsl(217 33% 18%)'}`,
                borderRadius: '16px',
                overflow: 'hidden',
                transition: 'all 0.2s',
                position: 'relative',
                opacity: isLocked ? 0.75 : 1,
              }}
            >
              {/* Lock overlay badge */}
              {isLocked && (
                <div style={{
                  position: 'absolute',
                  top: '12px',
                  right: '12px',
                  background: 'rgba(0,0,0,0.75)',
                  color: '#fbbf24',
                  fontSize: '11px',
                  fontWeight: 700,
                  padding: '3px 10px',
                  borderRadius: '20px',
                  zIndex: 2,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                }}>
                  🔒 {template.plans[0]} Only
                </div>
              )}

              {/* Selected indicator */}
              {isSelected && !isLocked && (
                <div style={{
                  position: 'absolute',
                  top: '12px',
                  right: '12px',
                  background: '#3b82f6',
                  color: '#fff',
                  fontSize: '11px',
                  fontWeight: 700,
                  padding: '3px 10px',
                  borderRadius: '20px',
                  zIndex: 2,
                }}>
                  ✓ Selected
                </div>
              )}

              {/* Preview */}
              <div style={{
                padding: '12px',
                background: 'hsl(222 47% 7%)',
                cursor: 'pointer',
              }}
                onClick={() => setPreviewId(previewId === template.id ? null : template.id)}
              >
                <TemplatePreview template={template} />
                <div style={{
                  textAlign: 'center',
                  marginTop: '6px',
                  fontSize: '11px',
                  color: '#64748b',
                }}>
                  {previewId === template.id ? '▲ Hide preview' : '▼ Click to expand preview'}
                </div>
              </div>

              {/* Info */}
              <div style={{ padding: '14px' }}>

                {/* Title row */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                  <span style={{ fontSize: '1.2rem' }}>{template.icon}</span>
                  <div>
                    <div style={{ fontSize: '15px', fontWeight: 700, color: '#f1f5f9' }}>
                      {template.name}
                    </div>
                    <span style={{
                      fontSize: '10px',
                      fontWeight: 600,
                      padding: '2px 7px',
                      borderRadius: '10px',
                      background: `${template.badgeColor}20`,
                      color: template.badgeColor,
                    }}>
                      {template.badge}
                    </span>
                  </div>
                </div>

                {/* Description */}
                <p style={{ fontSize: '12px', color: '#64748b', marginBottom: '10px', lineHeight: '1.5' }}>
                  {template.description}
                </p>

                {/* MCQ layout note */}
                <div style={{
                  fontSize: '11px',
                  color: '#94a3b8',
                  background: 'hsl(222 47% 7%)',
                  padding: '5px 10px',
                  borderRadius: '6px',
                  marginBottom: '10px',
                }}>
                  📋 MCQ layout: {template.mcqLayout}
                </div>

                {/* Features */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: '4px',
                  marginBottom: '14px',
                }}>
                  {template.features.map(feature => (
                    <div
                      key={feature}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '5px',
                        fontSize: '11px',
                        color: '#94a3b8',
                      }}
                    >
                      <span style={{ color: '#10b981', fontSize: '10px', flexShrink: 0 }}>✓</span>
                      {feature}
                    </div>
                  ))}
                </div>

                {/* Action buttons */}
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    onClick={() => handleSelect(template)}
                    style={{
                      flex: 1,
                      padding: '9px',
                      background: isLocked ? 'rgba(251,191,36,0.08)' : isSelected ? 'rgba(59,130,246,0.2)' : 'rgba(59,130,246,0.15)',
                      border: `1px solid ${isLocked ? 'rgba(251,191,36,0.3)' : isSelected ? '#3b82f6' : 'transparent'}`,
                      borderRadius: '8px',
                      color: isLocked ? '#fbbf24' : '#60a5fa',
                      fontSize: '12px',
                      fontWeight: 700,
                      cursor: 'pointer',
                      transition: 'all 0.15s',
                    }}
                  >
                    {isLocked ? '🔒 Locked' : isSelected ? '✓ Selected' : 'Select'}
                  </button>

                  <button
                    onClick={() => handleUseNow(template)}
                    style={{
                      flex: 1,
                      padding: '9px',
                      background: isLocked
                        ? 'linear-gradient(135deg,#d97706,#f59e0b)'
                        : 'linear-gradient(135deg,#2563eb,#06b6d4)',
                      border: 'none',
                      borderRadius: '8px',
                      color: '#fff',
                      fontSize: '12px',
                      fontWeight: 700,
                      cursor: 'pointer',
                      transition: 'all 0.15s',
                    }}
                  >
                    {isLocked ? '⬆ Upgrade' : 'Use Now →'}
                  </button>
                </div>

                {/* Download Sample button */}
                <button
                  onClick={() => downloadSample(template)}
                  style={{
                    width: '100%',
                    marginTop: '8px',
                    padding: '8px',
                    background: 'rgba(255,255,255,0.04)',
                    border: '1px dashed rgba(255,255,255,0.15)',
                    borderRadius: '8px',
                    color: '#94a3b8',
                    fontSize: '11px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    transition: 'all 0.15s',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                  }}
                  onMouseEnter={e => {
                    (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.08)';
                    (e.currentTarget as HTMLButtonElement).style.color = '#cbd5e1';
                  }}
                  onMouseLeave={e => {
                    (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.04)';
                    (e.currentTarget as HTMLButtonElement).style.color = '#94a3b8';
                  }}
                >
                  ⬇ Download Sample
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* BOTTOM NOTE */}
      <div style={{
        marginTop: '2rem',
        padding: '16px',
        background: 'hsl(222 41% 12%)',
        border: '1px solid hsl(217 33% 18%)',
        borderRadius: '12px',
        display: 'flex',
        gap: '12px',
        alignItems: 'flex-start',
        flexWrap: 'wrap',
      }}>
        <span style={{ fontSize: '1.2rem' }}>💡</span>
        <div>
          <div style={{ fontSize: '13px', fontWeight: 600, color: '#f1f5f9', marginBottom: '4px' }}>
            How templates work
          </div>
          <div style={{ fontSize: '12px', color: '#64748b', lineHeight: '1.6' }}>
            Templates only affect the <strong style={{ color: '#94a3b8' }}>visual styling</strong> of your exported PDF and DOCX.
            Your questions, marks, and exam details remain the same regardless of which template you choose.
            You can change the template anytime before exporting.
          </div>
        </div>
      </div>

    </div>
  );
}