'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { usePaperStore } from '@/store/paperStore';
import { papersApi } from '@/lib/api';
import { PaperPreview } from '@/components/preview/PaperPreview';
import { ExamDetailsModal } from '@/components/builder/ExamDetailsModal';
import { AddQuestionModal } from '@/components/builder/AddQuestionModal';
import toast from 'react-hot-toast';
import type { Section, Question } from '@/store/paperStore';
const isMobile = typeof navigator !== 'undefined' &&
  /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);

// ─────────────────────────────────────────
// STEP DEFINITIONS
// ─────────────────────────────────────────

type StepId = 'upload' | 'template' | 'edit' | 'details' | 'preview' | 'save';

const STEPS: { id: StepId; label: string; icon: string }[] = [
  { id: 'upload',   label: 'Upload & Extract', icon: '📤' },
  { id: 'template', label: 'Choose Template',  icon: '🎨' },
  { id: 'edit',     label: 'Edit Questions',   icon: '✏️' },
  { id: 'details',  label: 'Exam Details',     icon: '⚙️' },
  { id: 'preview',  label: 'Preview',          icon: '👁' },
  { id: 'save',     label: 'Save',             icon: '💾' },
];

// ─────────────────────────────────────────
// MCQ HELPERS
// ─────────────────────────────────────────

type MCQOption = { label: string; text: string; isCorrect: boolean };

function splitOptions(text: string): { questionText: string; options: MCQOption[] } {
  const options: MCQOption[] = [];
  if (!text?.trim()) return { questionText: '', options: [] };
  const normalizedText = text.replace(/\s+/g, ' ').trim();
  const p1 = /\(([abcdABCD])\)\s*(.*?)(?=\s*\([abcdABCD]\)\s*|\s*$)/gi;
  const p2 = /\b([abcdABCD])\)\s*(.*?)(?=\s+[abcdABCD]\)\s*|\s*$)/g;
  const p3 = /\b([ABCD])\.\s*(.*?)(?=\s+[ABCD]\.\s*|\s*$)/g;
  let matches: RegExpMatchArray[] = [];
  let usedPattern = 0;
  matches = [...normalizedText.matchAll(p1)];
  if (matches.length >= 2) usedPattern = 1;
  if (matches.length < 2) {
    matches = [...normalizedText.matchAll(p2)];
    if (matches.length >= 2) usedPattern = 2;
  }
  if (matches.length < 2) {
    matches = [...normalizedText.matchAll(p3)];
    if (matches.length >= 2) usedPattern = 3;
  }
  if (matches.length < 2) return { questionText: text.trim(), options: [] };
  for (const m of matches) {
    const label = m[1].toLowerCase();
    const optText = m[2]
      .trim()
      .replace(/\s*\([abcdABCD]\)\s*$/, '')
      .replace(/\s+[abcdABCD]\)\s*$/, '')
      .replace(/\s+[ABCD]\.\s*$/, '')
      .trim();
    if (!options.find(o => o.label === label) && optText) {
      options.push({ label, text: optText, isCorrect: false });
    }
  }
  let questionText = normalizedText;
  if (usedPattern === 1) {
    const idx = normalizedText.search(/\s*\([abcdABCD]\)/i);
    if (idx > 0) questionText = normalizedText.substring(0, idx).trim();
  } else if (usedPattern === 2) {
    const idx = normalizedText.search(/\s+[abcdABCD]\)/);
    if (idx > 0) questionText = normalizedText.substring(0, idx).trim();
  } else if (usedPattern === 3) {
    const idx = normalizedText.search(/\s+[ABCD]\./);
    if (idx > 0) questionText = normalizedText.substring(0, idx).trim();
  }
  questionText = questionText.replace(/[\[(]\d+\s*(?:marks?)?[\])]/gi, '').trim();
  return { questionText, options };
}

function normalizeOptions(
  rawOptions: Array<{ label: string; text: string; isCorrect?: boolean }> | undefined,
  questionText: string
): { cleanedQuestionText: string; fixedOptions: MCQOption[] } {
  let fixedOptions: MCQOption[] = rawOptions
    ? rawOptions.map(o => ({
        label: (o.label || '').toLowerCase(),
        text: o.text || '',
        isCorrect: o.isCorrect ?? false,
      }))
    : [];
  let cleanedQuestionText = questionText || '';

  if (fixedOptions.length === 1 && fixedOptions[0].text.trim().length > 20) {
    const s = splitOptions(fixedOptions[0].text);
    if (s.options.length >= 2) fixedOptions = s.options;
  }
  if (fixedOptions.length === 2) {
    const combined = fixedOptions.map(o => `(${o.label}) ${o.text}`).join(' ');
    const s = splitOptions(combined);
    if (s.options.length >= 3) fixedOptions = s.options;
  }
  if (fixedOptions.length === 0 && cleanedQuestionText) {
    const s = splitOptions(cleanedQuestionText);
    if (s.options.length >= 2) {
      cleanedQuestionText = s.questionText;
      fixedOptions = s.options;
    }
  }
  if (fixedOptions.length >= 2 && cleanedQuestionText) {
    const hasInline = /\([abcd]\)|\b[A-D]\./i.test(cleanedQuestionText);
    if (hasInline) {
      const s = splitOptions(cleanedQuestionText);
      if (s.options.length >= 2) {
        cleanedQuestionText = s.questionText;
        s.options.forEach(opt => {
          if (!fixedOptions.find(o => o.label === opt.label)) fixedOptions.push(opt);
        });
      }
    }
  }
  fixedOptions = fixedOptions
    .map(opt => ({
      ...opt,
      label: opt.label.toLowerCase(),
      text: opt.text
        .replace(/\s*\([abcdABCD]\)\s*.*$/i, '')
        .replace(/\s+[abcdABCD]\)\s*.*$/i, '')
        .replace(/\s+[ABCD]\.\s*.*$/i, '')
        .replace(/[\[(]\d+\s*(?:marks?)?[\])]/gi, '')
        .trim(),
    }))
    .filter(opt => opt.text.length > 0);

  const seen = new Set<string>();
  fixedOptions = fixedOptions.filter(opt => {
    if (!opt.label || seen.has(opt.label)) return false;
    seen.add(opt.label);
    return true;
  });

  fixedOptions.sort((a, b) => a.label.localeCompare(b.label));
  return { cleanedQuestionText, fixedOptions };
}

// ─────────────────────────────────────────
// STEP BAR
// ─────────────────────────────────────────

function StepBar({
  current,
  completedUpTo,
  onStepClick,
}: {
  current: StepId;
  completedUpTo: number;
  onStepClick: (id: StepId, index: number) => void;
}) {
  const currentIndex = STEPS.findIndex(s => s.id === current);
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 0, padding: '0 8px', height: '100%' }}>
      {STEPS.map((step, i) => {
        const isDone = i < currentIndex;
        const isActive = i === currentIndex;
        const isLocked = i > completedUpTo;
        const isLast = i === STEPS.length - 1;
        return (
          <React.Fragment key={step.id}>
            <button
              onClick={() => !isLocked && onStepClick(step.id, i)}
              disabled={isLocked}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '4px 10px',
                borderRadius: '8px',
                background: isActive ? 'rgba(59,130,246,0.2)' : isDone ? 'rgba(34,197,94,0.08)' : 'transparent',
                border: isActive
                  ? '1px solid rgba(59,130,246,0.45)'
                  : isDone
                  ? '1px solid rgba(34,197,94,0.25)'
                  : '1px solid transparent',
                cursor: isLocked ? 'not-allowed' : 'pointer',
                opacity: isLocked ? 0.35 : 1,
                transition: 'all 0.15s',
                whiteSpace: 'nowrap',
              }}
            >
              <span
                style={{
                  width: '20px',
                  height: '20px',
                  borderRadius: '50%',
                  fontSize: '10px',
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: isActive ? '#3b82f6' : isDone ? '#22c55e' : 'hsl(217 33% 22%)',
                  color: isActive || isDone ? '#fff' : '#64748b',
                  flexShrink: 0,
                }}
              >
                {isDone ? '✓' : i + 1}
              </span>
              <span
                style={{
                  fontSize: '12px',
                  fontWeight: isActive ? 700 : 500,
                  color: isActive ? '#93c5fd' : isDone ? '#86efac' : '#64748b',
                }}
              >
                {step.icon} {step.label}
              </span>
            </button>
            {!isLast && (
              <div
                style={{
                  width: '20px',
                  height: '1px',
                  flexShrink: 0,
                  background: i < currentIndex ? 'rgba(34,197,94,0.35)' : 'hsl(217 33% 22%)',
                }}
              />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}

// ─────────────────────────────────────────
// MAIN PAGE
// ─────────────────────────────────────────

export default function BuilderPage() {
  const router = useRouter();
  const {
    title,
    setTitle,
    sections,
    examDetails,
    templateId,
    setTemplateId,
    addSection,
    updateSection,
    deleteSection,
    updateQuestion,
    deleteQuestion,
    getTotalMarks,
    getQuestionCount,
    isSaving,
    isDirty,
    setIsSaving,
    setLastSaved,
    paperId,
    setPaperId,
    
  } = usePaperStore();

  const [currentStep, setCurrentStep] = useState<StepId>('upload');
  const [completedUpTo, setCompletedUpTo] = useState<number>(0);
  const [showExamDetails, setShowExamDetails] = useState(false);
  const [showAddQuestion, setShowAddQuestion] = useState<{ sectionId: string } | null>(null);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());
  const [isExporting, setIsExporting] = useState(false);
  const [showPaperName, setShowPaperName] = useState(false);
const [tempPaperName, setTempPaperName] = useState('');

  useEffect(() => {
    if (currentStep === 'upload' && sections.length > 0 && getQuestionCount() > 0) {
      advanceTo('template', 1);
      toast.success(`${getQuestionCount()} questions extracted! Now choose a template.`);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sections]);

  function advanceTo(stepId: StepId, index: number) {
    setCurrentStep(stepId);
    setCompletedUpTo(prev => Math.max(prev, index));
  }

  function goNext() {
    const idx = STEPS.findIndex(s => s.id === currentStep);
    if (idx >= STEPS.length - 1) return;
    const next = STEPS[idx + 1];
    advanceTo(next.id, idx + 1);
    if (next.id === 'details') setShowExamDetails(true);
  }

  function goPrev() {
    const idx = STEPS.findIndex(s => s.id === currentStep);
    if (idx > 0) setCurrentStep(STEPS[idx - 1].id);
  }

  function handleStepClick(id: StepId, _index: number) {
    setCurrentStep(id);
    if (id === 'details') setShowExamDetails(true);
  }

  function handleDetailsClose() {
    setShowExamDetails(false);
    if (currentStep === 'details') advanceTo('preview', 4);
  }

  const handleSave = async (
  customTitle?: string
): Promise<string | null> => {
  setIsSaving(true);

  try {
    const safeTitle = (customTitle || title || '').trim();
    const payload = {
      title: safeTitle.length >= 2 ? safeTitle : 'Untitled Question Paper',
      examDetails,
      sections,
      templateId,
      totalMarks: getTotalMarks(),
      questionCount: getQuestionCount(),
      status: 'DRAFT',
    };

    if (paperId) {
      await papersApi.update(paperId, payload);
      setLastSaved(new Date());
      toast.success('Paper saved!');
      return paperId;
    }

    const res = await papersApi.create(payload);
    const newId = res?.data?.data?.id;

    if (newId) {
      setPaperId(newId);
      setLastSaved(new Date());
      toast.success('Paper saved!');
      return newId;
    }

    toast.error('Save response invalid.');
    return null;
  } catch {
    toast.error('Failed to save.');
    return null;
  } finally {
    setIsSaving(false);
  }
};const handleFinalSave = async () => {
  if (!title.trim()) {
    setTempPaperName('');
    setShowPaperName(true);
    return;
  }

  const id = await handleSave(title);

  if (id) {
    advanceTo('save', 5);
  }
};

  const generatePaperHTML = (tmplId: string) => {
    const ed = examDetails;
    const totalMarksCalc = getTotalMarks();
    const isClassic = tmplId === 'tpl_classic';
    const isWorksheetHTML = tmplId === 'tpl_worksheet';
    const isProfessionalHTML = tmplId === 'tpl_professional';

    const renderOptions = (opts: Array<{ label: string; text: string }> | undefined, qt: string) => {
      const { fixedOptions } = normalizeOptions(opts, qt);
      const o =
        fixedOptions.length > 0
          ? fixedOptions
          : [
              { label: 'a', text: '___' },
              { label: 'b', text: '___' },
              { label: 'c', text: '___' },
              { label: 'd', text: '___' },
            ];
      if (isClassic || isWorksheetHTML) {
        // Classic + Worksheet: all 4 options in a single flex row
        return `<div class="mcq-options-inline">${o
          .map(x => `<span class="mcq-opt-inline"><span class="opt-label">(${x.label})</span> ${x.text}</span>`)
          .join('')}</div>`;
      }
      // Default / Worksheet / Professional: 2-column grid
      return `<div class="mcq-options">${o
        .map(x => `<div class="mcq-option"><span class="opt-label">(${x.label})</span><span class="opt-text">${x.text}</span></div>`)
        .join('')}</div>`;
    };

    const lines = (n: number) =>
      Array.from({ length: isWorksheetHTML ? Math.min(n, 1) : n })
        .map(() => '<div class="answer-line"></div>')
        .join('');

    const secHTML = sections
      .map(s => {
        const mi = s.marksPerQuestion
          ? `(${s.marksPerQuestion} Mark${s.marksPerQuestion > 1 ? 's' : ''} Each)`
          : s.totalMarks
          ? `[Total: ${s.totalMarks} Marks]`
          : '';

        const qHTML = s.questions
          .map(q => {
            const { cleanedQuestionText } = normalizeOptions(q.options, q.text);
            let a = '';
            if (q.type === 'MCQ') a = renderOptions(q.options, q.text);
            else if (q.type === 'TRUE_FALSE')
              a = `<div class="tf-options"><span><strong>(a)</strong> True</span><span><strong>(b)</strong> False</span></div>`;
            else if (q.type === 'FILL_IN_BLANK') a = '<div class="fill-line"></div>';
            else if (q.type === 'LONG_ANSWER') a = lines(6);
            else if (q.type === 'DIAGRAM') a = lines(8);
            else a = lines(2);

            return `<div class="question"><div class="q-row"><span class="q-num">${q.number}.</span><span class="q-text">${
              cleanedQuestionText || q.text
            }</span></div>${a}</div>`;
          })
          .join('');

        return `<div class="section"><div class="section-header">${s.title}${
          mi ? ` <span class="section-marks">${mi}</span>` : ''
        }</div>${s.description ? `<div class="section-desc">${s.description}</div>` : ''}${qHTML}</div>`;
      })
      .join('');

    const instHTML = ed.instructions?.length
      ? `<div class="instructions"><div class="inst-title">General Instructions:</div><ol>${ed.instructions
          .map((i: string) => `<li>${i}</li>`)
          .join('')}</ol></div><div class="thin-div"></div>`
      : '';

    const dateStr = ed.date
      ? new Date(ed.date).toLocaleDateString('en-IN', {
          day: '2-digit',
          month: 'long',
          year: 'numeric',
        })
      : '—';

    if (isClassic) {
      // ── CLASSIC HTML: minimal header row ──
      return `<div class="paper-wrap">
        <div class="inst-name">${ed.institutionName || 'Institution Name'}</div>
        <div class="thin-div"></div>
        <div class="classic-meta-row">
          <span><strong>Name:</strong> ___________________</span>
          <span><strong>Class:</strong> ${ed.class || '—'}</span>
          <span><strong>Date:</strong> ${dateStr}</span>
          <span><strong>Max. Marks:</strong> ${totalMarksCalc || ed.totalMarks || '—'}</span>
        </div>
        <div class="thin-div"></div>
        <div class="paper-title">${ed.examType || 'Question Paper'}</div>
        <div class="thin-div"></div>
        ${instHTML}${secHTML}
      </div>`;
    }

    if (isWorksheetHTML) {
      // ── WORKSHEET HTML: title as heading, Name only field, NO instructions, MCQ single line ──
      return `<div class="paper-wrap">
        <div class="ws-title">${title || ed.examType || 'Worksheet'}</div>
        <div class="ws-name-row">
          <span><strong>Name:</strong> _____________________________</span>
          <span><strong>Date:</strong> ${dateStr}</span>
        </div>
        ${secHTML}
        <div class="ws-footer">${ed.institutionName || ''}</div>
      </div>`;
    }

    if (isProfessionalHTML) {
      // ── PROFESSIONAL HTML: neat info box, NO instructions, signature block ──
      const infoLines = [
        ed.institutionAddress ? `<div class="pro-info-line">📍 ${ed.institutionAddress}</div>` : '',
        ed.department ? `<div class="pro-info-line">🏫 Dept. of ${ed.department}</div>` : '',
        ed.facultyName ? `<div class="pro-info-line">👤 Faculty: ${ed.facultyName}</div>` : '',
      ].filter(Boolean).join('');

      return `<div class="paper-wrap">
        <div class="pro-header">
          <div class="pro-logo"><div class="pro-logo-inner">LOGO</div></div>
          <div class="pro-info">
            <div class="pro-info-name">${(ed.institutionName || 'INSTITUTION NAME').toUpperCase()}</div>
            <div class="pro-info-divider"></div>
            ${infoLines}
          </div>
        </div>
        <div class="pro-meta-row">
          <span><strong>Subject:</strong> ${ed.subject || '—'}</span>
          <span><strong>Class:</strong> ${ed.class || '—'}</span>
          <span><strong>Date:</strong> ${dateStr}</span>
          <span><strong>Duration:</strong> ${ed.duration || '3 Hrs'}</span>
          <span><strong>Max. Marks:</strong> ${totalMarksCalc || ed.totalMarks || '—'}</span>
        </div>
        <div class="thin-div"></div>
        <div class="paper-title">${ed.examType || 'Question Paper'}</div>
        <div class="thin-div"></div>
        ${secHTML}
        <div class="thin-div"></div>
        <div class="sig-block">
          <div class="sig-line"><div>Subject Teacher</div></div>
          <div class="sig-line"><div>HOD / Principal</div></div>
          <div class="sig-line"><div>Exam Controller</div></div>
        </div>
      </div>`;
    }

    // ── DEFAULT HTML: full header ──
    return `<div class="page-border"></div><div class="paper-wrap"><div class="header"><div class="inst-name">${ed.institutionName||'Institution Name'}</div>${ed.institutionAddress ? `<div class="inst-addr">${ed.institutionAddress}</div>` : ''}</div><div class="thick-div"></div><table class="meta-table"><tr><td><strong>Subject:</strong> ${ed.subject||'—'}</td><td style="text-align:right"><strong>Date:</strong> ${dateStr}</td></tr><tr><td><strong>Class:</strong> ${ed.class||'—'}</td><td style="text-align:right"><strong>Duration:</strong> ${ed.duration||'3 Hours'}</td></tr><tr><td><strong>Max. Marks:</strong> ${totalMarksCalc||ed.totalMarks||'—'}</td><td style="text-align:right"></td></tr></table><div class="thin-div"></div><div class="paper-title">${ed.examType||'Question Paper'}</div><div class="thin-div"></div>${instHTML}${secHTML}<div class="thick-div"></div></div>`;
  };

 const handleExportPdf = () => {
  setIsExporting(true);
  try {
    const isClassic = templateId === 'tpl_classic';
    const isWorksheet = templateId === 'tpl_worksheet';
    const isProfessional = templateId === 'tpl_professional';
    const htmlContent = generatePaperHTML(templateId);

    // ── DEFAULT CSS ──
    const defaultCss = `*{margin:0;padding:0;box-sizing:border-box}body{font-family:'Times New Roman',serif;font-size:14px;color:#111;background:#fff;line-height:1.7}.paper-wrap{padding:18mm;width:210mm;margin:0 auto;min-height:297mm;position:relative}.header{text-align:center;margin-bottom:8px}.inst-name{font-size:22px;font-weight:bold;text-transform:uppercase;letter-spacing:1px;color:#1a2e5a}.inst-addr{font-size:12px;color:#555;margin-top:2px}.thick-div{border-top:2px solid #1a2e5a;margin:7px 0}.thin-div{border-top:1px solid #1a2e5a;margin:5px 0}.meta-table{width:100%;border-collapse:collapse;font-size:14.5px;margin:4px 0}.meta-table td{padding:2px 0}.paper-title{text-align:center;font-size:15px;font-weight:bold;text-transform:uppercase;letter-spacing:2px;color:#1a2e5a;margin:5px 0;text-decoration:underline}.instructions{font-size:14px;margin-bottom:6px}.inst-title{font-weight:bold;text-decoration:underline;margin-bottom:3px}.instructions ol{padding-left:18px;line-height:1.7}.section{margin-bottom:10px}.section-header{text-align:center;border:1px solid #1a2e5a;padding:4px 8px;font-weight:bold;font-size:15px;text-transform:uppercase;color:#1a2e5a;background:#f0f4ff;margin:10px 0 8px}.section-marks{font-size:13px;font-weight:normal}.section-desc{text-align:center;font-size:13px;color:#555;font-style:italic;margin-bottom:6px}.question{margin-bottom:18px;page-break-inside:avoid}.q-row{display:flex;align-items:flex-start;gap:6px}.q-num{font-weight:bold;min-width:22px;flex-shrink:0;padding-top:1px}.q-text{flex:1;line-height:1.6}.q-marks{font-weight:bold;font-size:13px;color:#1a2e5a;min-width:28px;text-align:right;flex-shrink:0;padding-top:1px}.mcq-options{display:grid;grid-template-columns:1fr 1fr;gap:5px 24px;margin-top:6px;margin-left:28px}.mcq-option{display:flex;gap:5px;font-size:15.5px}.opt-label{font-weight:bold;min-width:22px;flex-shrink:0}.tf-options{display:flex;gap:24px;margin-top:5px;margin-left:28px}.fill-line{border-bottom:1px solid #bbb;height:18px;width:60%;margin-left:28px;margin-top:5px}.answer-line{border-bottom:1px solid #ddd;height:18px;margin:4px 0 4px 28px}@media print{body{margin:0}.paper-wrap{padding:14mm}.question{page-break-inside:avoid}}`;

    // ── CLASSIC CSS ──
    const classicCss = `*{margin:0;padding:0;box-sizing:border-box}body{font-family:'Times New Roman',serif;font-size:14px;color:#111;background:#fff;line-height:1.7}.paper-wrap{padding:18mm;width:210mm;margin:0 auto;min-height:297mm}.inst-name{text-align:center;font-size:16px;font-weight:bold;text-transform:uppercase;letter-spacing:1px;color:#111;margin-bottom:4px}.classic-meta-row{display:flex;justify-content:space-between;flex-wrap:wrap;gap:6px;font-size:13px;padding-bottom:6px;border-bottom:1px solid #888;margin-bottom:6px}.thin-div{border-top:1px solid #555;margin:5px 0}.paper-title{text-align:center;font-size:15px;font-weight:bold;text-transform:uppercase;letter-spacing:2px;color:#111;margin:5px 0}.instructions{font-size:14px;margin-bottom:6px}.inst-title{font-weight:bold;text-decoration:underline;margin-bottom:3px}.instructions ol{padding-left:18px;line-height:1.7}.section{margin-bottom:10px}.section-header{text-align:center;border:1px solid #333;padding:4px 8px;font-weight:bold;font-size:15px;text-transform:uppercase;color:#111;background:#f5f5f5;margin:10px 0 8px}.section-marks{font-size:13px;font-weight:normal}.section-desc{text-align:center;font-size:13px;color:#555;font-style:italic;margin-bottom:6px}.question{margin-bottom:12px;page-break-inside:avoid}.q-row{display:flex;align-items:flex-start;gap:6px}.q-num{font-weight:bold;min-width:22px;flex-shrink:0;padding-top:1px}.q-text{flex:1;line-height:1.6}.q-marks{font-weight:bold;font-size:13px;color:#111;min-width:28px;text-align:right;flex-shrink:0;padding-top:1px}.mcq-options-inline{display:grid;grid-template-columns:1fr 1fr 1fr 1fr;margin-top:5px;margin-left:28px;font-size:10.5px}.mcq-opt-inline{white-space:nowrap}.opt-label{font-weight:bold}.tf-options{display:flex;gap:24px;margin-top:5px;margin-left:28px}.fill-line{border-bottom:1px solid #bbb;height:18px;width:60%;margin-left:28px;margin-top:5px}.answer-line{border-bottom:1px solid #ddd;height:18px;margin:4px 0 4px 28px}@media print{body{margin:0}.paper-wrap{padding:14mm}.question{page-break-inside:avoid}}`;

    // ── WORKSHEET CSS — compact, ~20 Q per page ──
    const worksheetCss = `*{margin:0;padding:0;box-sizing:border-box}body{font-family:'Calibri',sans-serif;font-size:13px;color:#111;background:#fff;line-height:1.6}.paper-wrap{padding:14mm;width:210mm;margin:0 auto;min-height:297mm;border:1px solid #1F2937}.ws-title{text-align:center;font-size:16px;font-weight:bold;text-transform:uppercase;color:#1F2937;margin-bottom:6px;letter-spacing:1px}.ws-name-row{display:flex;justify-content:space-between;font-size:10px;padding:4px 0;border-top:1px solid #1F2937;border-bottom:1px solid #1F2937;margin-bottom:8px}.section{margin-bottom:4px}.section-header{text-align:center;border:1px solid #1F2937;padding:2px 6px;font-weight:bold;font-size:10px;text-transform:uppercase;color:#1F2937;background:#F3F4F6;margin:4px 0}.section-marks{font-size:9px;font-weight:normal}.question{margin-bottom:4px;page-break-inside:avoid}.q-row{display:flex;align-items:flex-start;gap:4px}.q-num{font-weight:bold;min-width:18px;flex-shrink:0}.q-text{flex:1;line-height:1.4}.mcq-options-inline{display:flex;gap:0;margin-top:3px;margin-left:22px;font-size:11.5px}.mcq-opt-inline{flex:1;white-space:nowrap}.opt-label{font-weight:bold}.tf-options{display:flex;gap:16px;margin-top:3px;margin-left:22px}.fill-line{border-bottom:1px solid #bbb;height:14px;width:55%;margin-left:22px;margin-top:3px}.answer-line{border-bottom:1px solid #ddd;height:14px;margin:2px 0 2px 22px}.ws-footer{text-align:right;font-size:9px;color:#666;border-top:1px solid #ddd;margin-top:8px;padding-top:4px}@media print{body{margin:0}.paper-wrap{padding:10mm;border:1px solid #1F2937}.question{page-break-inside:avoid}}`;

    // ── PROFESSIONAL CSS ──
    const professionalCss = `*{margin:0;padding:0;box-sizing:border-box}body{font-family:'Arial',sans-serif;font-size:14px;color:#111;background:#fff;line-height:1.7}.paper-wrap{padding:18mm;width:210mm;margin:0 auto;min-height:297mm;border:1px solid #1F2937}.pro-header{display:flex;align-items:stretch;gap:14px;margin-bottom:10px}.pro-logo{width:80px;height:80px;border-radius:50%;border:2px solid #1F2937;display:flex;align-items:center;justify-content:center;flex-shrink:0}.pro-logo-inner{font-size:10px;color:#aaa;text-align:center;line-height:1.3}.pro-info{flex:1;border:2px solid #1F2937;border-radius:4px;overflow:hidden}.pro-info-name{font-weight:bold;font-size:16px;color:#fff;text-transform:uppercase;letter-spacing:0.5px;background:#1F2937;padding:7px 12px}.pro-info-divider{height:1px;background:#e5e7eb}.pro-info-line{font-size:10.5px;color:#333;padding:3px 12px;line-height:1.6}.pro-meta-row{display:flex;justify-content:space-between;flex-wrap:wrap;gap:4px;font-size:11px;background:#f9fafb;border:1px solid #e5e7eb;border-radius:4px;padding:6px 10px;margin-bottom:8px}.thin-div{border-top:1px solid #1F2937;margin:6px 0}.paper-title{text-align:center;font-size:15px;font-weight:bold;text-transform:uppercase;color:#1F2937;margin:8px 0 6px;text-decoration:underline;letter-spacing:2px}.section{margin-bottom:10px}.section-header{text-align:center;border:1px solid #1F2937;padding:4px 8px;font-weight:bold;font-size:12px;text-transform:uppercase;color:#1F2937;background:#f0f4ff;margin:10px 0 8px}.section-marks{font-size:10px;font-weight:normal}.question{margin-bottom:12px;page-break-inside:avoid}.q-row{display:flex;align-items:flex-start;gap:6px}.q-num{font-weight:bold;min-width:22px;flex-shrink:0}.q-text{flex:1;line-height:1.6}.mcq-options{display:grid;grid-template-columns:1fr 1fr;gap:5px 24px;margin-top:6px;margin-left:28px}.mcq-option{display:flex;gap:5px}.opt-label{font-weight:bold;min-width:22px;flex-shrink:0}.tf-options{display:flex;gap:24px;margin-top:5px;margin-left:28px}.fill-line{border-bottom:1px solid #bbb;height:18px;width:60%;margin-left:28px;margin-top:5px}.answer-line{border-bottom:1px solid #ddd;height:18px;margin:4px 0 4px 28px}.sig-block{margin-top:30px;display:flex;justify-content:space-between}.sig-line{text-align:center;width:30%}.sig-line div{border-top:1px solid #999;padding-top:5px;font-size:10px;color:#555}@media print{body{margin:0}.paper-wrap{padding:14mm;border:1px solid #1F2937}.question{page-break-inside:avoid}}`;

    const css = isClassic ? classicCss : isWorksheet ? worksheetCss : isProfessional ? professionalCss : defaultCss;

    const fullHtml = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title || 'Question Paper'}</title>
  <style>${css}</style>
</head>
<body>
  ${htmlContent}
  <script>
    window.onload = function() {
      window.print();
    };
  </script>
</body>
</html>`;

    // Detect mobile
    const isMobile = /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);

    if (isMobile) {
      // Mobile: download as HTML file
      const blob = new Blob([fullHtml], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${(title || 'question_paper').replace(/[^a-z0-9]/gi, '_').toLowerCase()}.html`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success('Downloaded! Open the file in your browser and print/save as PDF.');
    } else {
      // Desktop: open in new window and print
      const w = window.open('', '_blank');
      if (!w) {
        toast.error('Popup blocked. Please allow popups and try again.');
        return;
      }
      w.document.write(fullHtml);
      w.document.close();
      w.focus();
      setTimeout(() => {
        w.print();
        w.close();
        toast.success('Print dialog opened!');
      }, 600);
    }
  } catch {
    toast.error('PDF export failed. Please try again.');
  } finally {
    setIsExporting(false);
  }
};


  const handleExportDocx = async () => {
    setIsExporting(true);
    try {
      const id = paperId || (await handleSave());
      if (!id) {
        toast.error('Save first.');
        return;
      }
      const res = await papersApi.exportDocx(id, templateId);
      const blob = new Blob([res.data], {
        type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${(title || 'paper').replace(/[^a-z0-9]/gi, '_').toLowerCase()}.docx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success('DOCX downloaded!');
    } catch {
      toast.error('DOCX export failed.');
    } finally {
      setIsExporting(false);
    }
  };

  const cardBg = 'hsl(222 41% 12%)';
  const border = '1px solid hsl(217 33% 18%)';
  const headerBg = 'hsl(222 30% 14%)';

  const btn = (
    variant: 'default' | 'primary' | 'success' | 'warning' | 'ghost' = 'default'
  ): React.CSSProperties => ({
    padding: '7px 14px',
    borderRadius: '8px',
    fontSize: '13px',
    fontWeight: 600,
    border:
      variant === 'default'
        ? '1px solid #475569'
        : variant === 'ghost'
        ? '1px solid hsl(217 33% 22%)'
        : 'none',
    background:
      variant === 'primary'
        ? 'linear-gradient(135deg,#2563eb,#0284c7)'
        : variant === 'success'
        ? '#16a34a'
        : variant === 'warning'
        ? '#ea580c'
        : variant === 'ghost'
        ? 'transparent'
        : '#334155',
    color: variant === 'ghost' ? '#64748b' : '#fff',
    cursor: 'pointer',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '5px',
    minHeight: '34px',
    transition: 'all 0.15s',
  });

  const toggleSection = (id: string) =>
    setExpandedSections(prev => {
      const n = new Set(prev);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden', background: 'hsl(222 47% 7%)' }}>
      <div
        className="builder-topbar"
        style={{
          height: '56px',
          background: cardBg,
          borderBottom: border,
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          padding: '0 14px',
          flexShrink: 0,
        }}
      >
        <input
          value={title}
          onChange={e => setTitle(e.target.value)}
          style={{
            background: 'transparent',
            border: 'none',
            outline: 'none',
            color: '#f1f5f9',
            fontSize: '14px',
            fontWeight: 600,
            width: '180px',
            flexShrink: 0,
          }}
          placeholder="Paper title..."
        />
        <div style={{ width: '1px', height: '24px', background: 'hsl(217 33% 22%)', flexShrink: 0 }} />
        <div style={{ flex: 1, overflow: 'hidden' }}>
          <StepBar current={currentStep} completedUpTo={completedUpTo} onStepClick={handleStepClick} />
        </div>
        <div className="builder-actions" style={{ display: 'flex', gap: '6px', alignItems: 'center', flexShrink: 0 }}>
          <span style={{ fontSize: '11px', color: isDirty ? '#f59e0b' : '#64748b' }}>
            {isSaving ? '⏳ Saving…' : isDirty ? '● Unsaved' : '✓ Saved'}
          </span>
          <span
            style={{
              fontSize: '11px',
              color: '#64748b',
              background: headerBg,
              padding: '2px 8px',
              borderRadius: '5px',
              border,
              whiteSpace: 'nowrap',
            }}
          >
            {getTotalMarks()}M · {getQuestionCount()}Q
          </span>
        </div>
      </div>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {currentStep === 'upload' && (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 20px' }}>
            <div style={{ maxWidth: '460px', width: '100%', textAlign: 'center' }}>
              <div style={{ fontSize: '48px', marginBottom: '16px' }}>📤</div>
              <h2 style={{ color: '#f1f5f9', fontSize: '20px', fontWeight: 700, marginBottom: '8px' }}>
                Upload &amp; Extract Questions
              </h2>
              <p style={{ color: '#64748b', fontSize: '14px', marginBottom: '28px', lineHeight: '1.7' }}>
                Go to the <strong style={{ color: '#93c5fd' }}>Upload page</strong> to upload images or PDFs.
                <br />
                Once OCR is complete you will be automatically brought here.
              </p>
              <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', flexWrap: 'wrap' }}>
                <button style={btn('primary')} onClick={() => router.push('/dashboard/upload')}>
                  📤 Go to Upload
                </button>
                <button
                  style={btn('default')}
                  onClick={() => {
                    addSection('Section A');
                    advanceTo('template', 1);
                  }}
                >
                  ✏️ Start Manually
                </button>
              </div>
              {sections.length > 0 && (
                <div
                  style={{
                    marginTop: '20px',
                    padding: '14px 16px',
                    background: 'rgba(34,197,94,0.08)',
                    border: '1px solid rgba(34,197,94,0.25)',
                    borderRadius: '10px',
                  }}
                >
                  <p style={{ color: '#86efac', fontSize: '13px', marginBottom: '10px' }}>
                    ✓ {getQuestionCount()} questions already extracted
                  </p>
                  <button style={btn('success')} onClick={() => advanceTo('template', 1)}>
                    Continue to Edit →
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {currentStep === 'template' && (
          <div style={{ flex: 1, overflowY: 'auto', padding: '24px 16px' }}>
            {/* Header */}
            <div style={{ textAlign: 'center', marginBottom: '28px' }}>
              <div style={{ fontSize: '2rem', marginBottom: '8px' }}>🎨</div>
              <h2 style={{ color: '#f1f5f9', fontSize: '18px', fontWeight: 700, marginBottom: '6px' }}>
                Choose a Template
              </h2>
              <p style={{ color: '#64748b', fontSize: '13px' }}>
                Select how your question paper will look when exported as PDF or DOCX.
              </p>
            </div>

            {/* Template Cards */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
              gap: '16px',
              maxWidth: '680px',
              margin: '0 auto 28px',
            }}>
              {[
                {
                  id: 'tpl_classic',
                  name: 'Classic',
                  badge: '⭐ Default',
                  badgeColor: '#6366f1',
                  desc: 'Clean layout with minimal top header — name, class, date, marks. MCQ options in a single row.',
                  mcq: 'All 4 options in one line',
                  planRequired: null,
                },
                {
                  id: 'tpl_school',
                  name: 'Basic',
                  badge: 'Classic',
                  badgeColor: '#10b981',
                  desc: 'Traditional double-border layout with full institution header, subject, class, and signature block.',
                  mcq: '2×2 grid options',
                  planRequired: null,
                },
                {
                  id: 'tpl_worksheet',
                  name: 'Worksheet',
                  badge: 'PRO',
                  badgeColor: '#f59e0b',
                  desc: 'Student worksheet — title above, Name field, single border, ~20 questions per page.',
                  mcq: '2×2 grid options',
                  planRequired: 'PRO',
                },
                {
                  id: 'tpl_professional',
                  name: 'Professional',
                  badge: 'INSTITUTION',
                  badgeColor: '#8b5cf6',
                  desc: 'Formal layout with logo circle, institution info box, centred title, single page border.',
                  mcq: '2×2 grid options',
                  planRequired: 'INSTITUTION',
                },
              ].map(tmpl => {
                const isSelected = templateId === tmpl.id;
                const isLockedTmpl = tmpl.planRequired && !['PRO','INSTITUTION'].includes(
                  ((usePaperStore as unknown as { getState: () => { templateId: string } }).getState?.()?.templateId || '')
                ) && tmpl.planRequired !== null;
                return (
                  <div
                    key={tmpl.id}
                    onClick={() => {
                      if (tmpl.planRequired) {
                        toast(`🔒 Upgrade to ${tmpl.planRequired} for the ${tmpl.name} template`, { icon: '⚠️' });
                      }
                      setTemplateId(tmpl.id);
                    }}
                    style={{
                      background: isSelected ? 'rgba(59,130,246,0.08)' : 'hsl(222 41% 12%)',
                      border: `2px solid ${isSelected ? '#3b82f6' : 'hsl(217 33% 22%)'}`,
                      borderRadius: '14px',
                      overflow: 'hidden',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      position: 'relative',
                    }}
                  >
                    {/* PRO/INSTITUTION badge top-right */}
                    {tmpl.planRequired && (
                      <div style={{
                        position: 'absolute', top: '8px', right: '8px', zIndex: 2,
                        background: 'rgba(0,0,0,0.7)', color: '#fbbf24',
                        fontSize: '10px', fontWeight: 700,
                        padding: '2px 7px', borderRadius: '10px',
                      }}>
                        🔒 {tmpl.planRequired}
                      </div>
                    )}
                    {/* Mini paper preview */}
                    <div style={{
                      background: '#fff',
                      margin: '12px 12px 0',
                      borderRadius: '6px',
                      padding: '10px',
                      height: '90px',
                      overflow: 'hidden',
                      position: 'relative',
                      border: tmpl.id === 'tpl_school' ? '2px double #1a2e5a'
                        : (tmpl.id === 'tpl_worksheet' || tmpl.id === 'tpl_professional') ? '1.5px solid #1F2937'
                        : '1px solid #e5e7eb',
                    }}>
                      {/* Classic preview */}
                      {tmpl.id === 'tpl_classic' && (
                        <>
                          <div style={{ textAlign: 'center', fontSize: '7px', fontWeight: 800, color: '#111', textTransform: 'uppercase', marginBottom: '3px' }}>Institution Name</div>
                          <div style={{ borderTop: '1px solid #888', marginBottom: '3px' }} />
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '5px', color: '#444', marginBottom: '3px' }}>
                            <span>Name: _______</span><span>Class: X</span><span>Date: —</span><span>Marks: 30</span>
                          </div>
                          <div style={{ borderTop: '1px solid #888', marginBottom: '4px' }} />
                          <div style={{ fontSize: '5px', color: '#555', marginBottom: '3px' }}>1. Sample question text here</div>
                          <div style={{ display: 'flex', gap: '6px', fontSize: '4.5px', color: '#666', marginLeft: '8px' }}>
                            <span><b>(a)</b> Opt A</span><span><b>(b)</b> Opt B</span><span><b>(c)</b> Opt C</span><span><b>(d)</b> Opt D</span>
                          </div>
                        </>
                      )}
                      {/* Basic preview */}
                      {tmpl.id === 'tpl_school' && (
                        <>
                          <div style={{ textAlign: 'center', fontSize: '7px', fontWeight: 800, color: '#1a2e5a', textTransform: 'uppercase', marginBottom: '2px' }}>Institution Name</div>
                          <div style={{ borderTop: '2px solid #1a2e5a', marginBottom: '2px' }} />
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '5px', color: '#444', marginBottom: '2px' }}>
                            <span>Subject: Math</span><span>Date: —</span>
                          </div>
                          <div style={{ borderTop: '1px solid #1a2e5a', marginBottom: '3px' }} />
                          <div style={{ fontSize: '5px', color: '#555', marginBottom: '3px' }}>1. Sample question text here</div>
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2px', marginLeft: '8px', fontSize: '4.5px', color: '#666' }}>
                            <span><b>(a)</b> Option A</span><span><b>(b)</b> Option B</span>
                            <span><b>(c)</b> Option C</span><span><b>(d)</b> Option D</span>
                          </div>
                        </>
                      )}
                      {/* Worksheet preview */}
                      {tmpl.id === 'tpl_worksheet' && (
                        <>
                          <div style={{ textAlign: 'center', fontSize: '7px', fontWeight: 800, color: '#1F2937', textTransform: 'uppercase', marginBottom: '3px' }}>WORKSHEET NAME</div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '5px', color: '#333', borderBottom: '1px solid #1F2937', paddingBottom: '3px', marginBottom: '3px' }}>
                            <span><b>Name:</b> ______________</span><span><b>Class:</b> X</span>
                          </div>
                          {[1,2,3,4].map(n => (
                            <div key={n} style={{ fontSize: '4.5px', color: '#222', borderBottom: '0.5px solid #ddd', paddingBottom: '1px', marginBottom: '1px' }}>
                              <b>{n}.</b> Question text here ___
                            </div>
                          ))}
                        </>
                      )}
                      {/* Professional preview */}
                      {tmpl.id === 'tpl_professional' && (
                        <>
                          <div style={{ display: 'flex', gap: '4px', marginBottom: '4px' }}>
                            <div style={{ width: '22px', height: '22px', borderRadius: '50%', border: '1px solid #bbb', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '3.5px', color: '#aaa', flexShrink: 0 }}>LOGO</div>
                            <div style={{ flex: 1, border: '1px solid #1F2937', padding: '2px', fontSize: '4.5px', color: '#333' }}>
                              <div style={{ fontWeight: 800, fontSize: '5px', color: '#1F2937' }}>SSS COLLEGE</div>
                              <div style={{ fontSize: '4px' }}>Gajapthimagaram</div>
                              <div style={{ fontSize: '4px' }}>Ph: 1234567890</div>
                            </div>
                          </div>
                          <div style={{ textAlign: 'center', fontSize: '6px', fontWeight: 700, color: '#1F2937', textDecoration: 'underline', marginBottom: '3px' }}>QUESTION PAPER</div>
                          <div style={{ fontSize: '4.5px', color: '#555' }}>1. Sample question text here</div>
                        </>
                      )}
                    </div>

                    {/* Info */}
                    <div style={{ padding: '10px 12px 14px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                        <span style={{ fontSize: '14px', fontWeight: 700, color: '#f1f5f9' }}>{tmpl.name}</span>
                        <span style={{
                          fontSize: '10px', fontWeight: 600, padding: '2px 7px', borderRadius: '10px',
                          background: `${tmpl.badgeColor}20`, color: tmpl.badgeColor,
                        }}>{tmpl.badge}</span>
                        {isSelected && (
                          <span style={{ marginLeft: 'auto', fontSize: '11px', color: '#3b82f6', fontWeight: 700 }}>✓ Selected</span>
                        )}
                      </div>
                      <p style={{ fontSize: '11px', color: '#64748b', lineHeight: 1.5, marginBottom: '6px' }}>{tmpl.desc}</p>
                      <div style={{ fontSize: '10px', color: '#94a3b8', background: 'hsl(222 47% 7%)', padding: '4px 8px', borderRadius: '5px' }}>
                        📋 MCQ: {tmpl.mcq}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Bottom action buttons */}
            <div style={{ display: 'flex', justifyContent: 'center', gap: '10px', flexWrap: 'wrap' }}>
              <button style={btn('ghost')} onClick={goPrev}>← Back</button>
              <button
                style={btn('primary')}
                onClick={() => advanceTo('edit', 2)}
              >
                Continue with {templateId === 'tpl_classic' ? 'Classic' : templateId === 'tpl_worksheet' ? 'Worksheet' : templateId === 'tpl_professional' ? 'Professional' : 'Basic'} →
              </button>
            </div>
          </div>
        )}

        {currentStep === 'edit' && (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <div
              style={{
                background: headerBg,
                borderBottom: border,
                padding: '8px 14px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexShrink: 0,
              }}
            >
              <span
                style={{
                  fontSize: '12px',
                  fontWeight: 700,
                  color: '#64748b',
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                }}
              >
                ✏️ Edit Questions
              </span>
              <div style={{ display: 'flex', gap: '6px' }}>
                <button style={btn('default')} onClick={() => addSection('New Section')}>
                  + Add Section
                </button>
                <button style={btn('primary')} onClick={goNext}>
                  Next: Exam Details →
                </button>
              </div>
            </div>
            <div style={{ flex: 1, overflowY: 'auto', padding: '12px' }}>
              {sections.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '60px 20px', color: '#64748b' }}>
                  <div style={{ fontSize: '2rem', marginBottom: '12px' }}>📝</div>
                  <p style={{ marginBottom: '16px' }}>No sections yet.</p>
                  <button style={btn('default')} onClick={() => addSection('Section A')}>
                    + Add First Section
                  </button>
                </div>
              ) : (
                sections.map(section => (
                  <SectionEditor
                    key={section.id}
                    section={section}
                    isExpanded={!expandedSections.has(section.id)}
                    onToggle={() => toggleSection(section.id)}
                    onUpdate={u => updateSection(section.id, u)}
                    onDelete={() => deleteSection(section.id)}
                    onAddQuestion={() => setShowAddQuestion({ sectionId: section.id })}
                    onUpdateQuestion={(qId, u) => updateQuestion(section.id, qId, u)}
                    onDeleteQuestion={qId => deleteQuestion(section.id, qId)}
                  />
                ))
              )}
            </div>
            <div
              style={{
                padding: '10px 14px',
                borderTop: border,
                display: 'flex',
                justifyContent: 'space-between',
                background: headerBg,
                flexShrink: 0,
              }}
            >
              <button style={btn('ghost')} onClick={goPrev}>
                ← Back
              </button>
              <button style={btn('primary')} onClick={goNext}>
                Next: Exam Details →
              </button>
            </div>
          </div>
        )}

        {currentStep === 'details' && (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 20px' }}>
            <div style={{ maxWidth: '420px', width: '100%', textAlign: 'center' }}>
              <div style={{ fontSize: '48px', marginBottom: '16px' }}>⚙️</div>
              <h2 style={{ color: '#f1f5f9', fontSize: '20px', fontWeight: 700, marginBottom: '8px' }}>
                Exam Details
              </h2>
              <p style={{ color: '#64748b', fontSize: '14px', marginBottom: '24px' }}>
                Fill in institution, subject, date, duration and instructions.
              </p>
              <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', flexWrap: 'wrap' }}>
                <button style={btn('ghost')} onClick={goPrev}>
                  ← Back
                </button>
                <button style={btn('warning')} onClick={() => setShowExamDetails(true)}>
                  ⚙️ Open Details Form
                </button>
                <button style={btn('primary')} onClick={() => advanceTo('preview', 4)}>
                  Skip to Preview →
                </button>
              </div>
            </div>
          </div>
        )}

        {currentStep === 'preview' && (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <div
              style={{
                background: headerBg,
                borderBottom: border,
                padding: '8px 14px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexShrink: 0,
              }}
            >
              <span
                style={{
                  fontSize: '12px',
                  fontWeight: 700,
                  color: '#64748b',
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                }}
              >
                👁 Preview
              </span>
              <div style={{ display: 'flex', gap: '6px' }}>
                <button style={btn('default')} onClick={() => setShowExamDetails(true)}>
                  ⚙️ Edit Details
                </button>
                
  
                <button style={btn('success')} onClick={handleFinalSave} disabled={isSaving}>
                  {isSaving ? '⏳ Saving…' : '💾 Save Paper'}
                </button>
              </div>
            </div>
            <div style={{ flex: 1, overflowY: 'auto', background: '#d1d5db', padding: '16px' }}>
              <div style={{ maxWidth: '800px', margin: '0 auto', boxShadow: '0 4px 20px rgba(0,0,0,0.3)', borderRadius: '6px', overflow: 'hidden' }}>
                <iframe
                  srcDoc={(() => {
                    const isClassic = templateId === 'tpl_classic';
                    const isWorksheetPrev = templateId === 'tpl_worksheet';
                    const isProfessionalPrev = templateId === 'tpl_professional';
                    const defaultCss = `*{margin:0;padding:0;box-sizing:border-box}body{font-family:'Times New Roman',serif;font-size:18px;color:#111;background:#fff}.paper-wrap{padding:18mm;width:210mm;margin:0 auto;min-height:297mm;position:relative}.header{text-align:center;margin-bottom:8px}.inst-name{font-size:22px;font-weight:bold;text-transform:uppercase;letter-spacing:1px;color:#1a2e5a}.inst-addr{font-size:12px;color:#555;margin-top:2px}.thick-div{border-top:2px solid #1a2e5a;margin:7px 0}.thin-div{border-top:1px solid #1a2e5a;margin:5px 0}.meta-table{width:100%;border-collapse:collapse;font-size:14.5px;margin:4px 0}.meta-table td{padding:2px 0}.paper-title{text-align:center;font-size:15px;font-weight:bold;text-transform:uppercase;letter-spacing:2px;color:#1a2e5a;margin:5px 0;text-decoration:underline}.instructions{font-size:14px;margin-bottom:6px}.inst-title{font-weight:bold;text-decoration:underline;margin-bottom:3px}.instructions ol{padding-left:18px;line-height:1.7}.section{margin-bottom:10px}.section-header{text-align:center;border:1px solid #1a2e5a;padding:4px 8px;font-weight:bold;font-size:15px;text-transform:uppercase;color:#1a2e5a;background:#f0f4ff;margin:10px 0 8px}.section-marks{font-size:13px;font-weight:normal}.section-desc{text-align:center;font-size:13px;color:#555;font-style:italic;margin-bottom:6px}.question{margin-bottom:12px}.q-row{display:flex;align-items:flex-start;gap:6px}.q-num{font-weight:bold;min-width:22px;flex-shrink:0;padding-top:1px}.q-text{flex:1;line-height:1.6}.mcq-options{display:grid;grid-template-columns:1fr 1fr;gap:5px 24px;margin-top:6px;margin-left:28px}.mcq-option{display:flex;gap:5px;font-size:15.5px}.opt-label{font-weight:bold;min-width:22px;flex-shrink:0}.tf-options{display:flex;gap:24px;margin-top:5px;margin-left:28px}.fill-line{border-bottom:1px solid #bbb;height:18px;width:60%;margin-left:28px;margin-top:5px}.answer-line{border-bottom:1px solid #ddd;height:18px;margin:4px 0 4px 28px}`;
                    const classicCss = `*{margin:0;padding:0;box-sizing:border-box}body{font-family:'Times New Roman',serif;font-size:13px;color:#111;background:#fff}.paper-wrap{padding:18mm;width:210mm;margin:0 auto;min-height:297mm}.inst-name{text-align:center;font-size:16px;font-weight:bold;text-transform:uppercase;letter-spacing:1px;color:#111;margin-bottom:4px}.classic-meta-row{display:flex;justify-content:space-between;flex-wrap:wrap;gap:6px;font-size:13px;padding-bottom:6px;border-bottom:1px solid #888;margin-bottom:6px}.thin-div{border-top:1px solid #555;margin:5px 0}.paper-title{text-align:center;font-size:15px;font-weight:bold;text-transform:uppercase;letter-spacing:2px;color:#111;margin:5px 0}.instructions{font-size:14px;margin-bottom:6px}.inst-title{font-weight:bold;text-decoration:underline;margin-bottom:3px}.instructions ol{padding-left:18px;line-height:1.7}.section{margin-bottom:10px}.section-header{text-align:center;border:1px solid #333;padding:4px 8px;font-weight:bold;font-size:15px;text-transform:uppercase;color:#111;background:#f5f5f5;margin:10px 0 8px}.section-marks{font-size:13px;font-weight:normal}.section-desc{text-align:center;font-size:13px;color:#555;font-style:italic;margin-bottom:6px}.question{margin-bottom:12px}.q-row{display:flex;align-items:flex-start;gap:6px}.q-num{font-weight:bold;min-width:22px;flex-shrink:0;padding-top:1px}.q-text{flex:1;line-height:1.6}.mcq-options-inline{display:grid;grid-template-columns:1fr 1fr 1fr 1fr;margin-top:5px;margin-left:28px;font-size:10.5px}.mcq-opt-inline{white-space:nowrap}.opt-label{font-weight:bold}.tf-options{display:flex;gap:24px;margin-top:5px;margin-left:28px}.fill-line{border-bottom:1px solid #bbb;height:18px;width:60%;margin-left:28px;margin-top:5px}.answer-line{border-bottom:1px solid #ddd;height:18px;margin:4px 0 4px 28px}`;
                    const worksheetCss = `*{margin:0;padding:0;box-sizing:border-box}body{font-family:'Calibri',sans-serif;font-size:12px;color:#111;background:#fff}.paper-wrap{padding:14mm;width:210mm;margin:0 auto;min-height:297mm;border:1px solid #1F2937}.ws-title{text-align:center;font-size:16px;font-weight:bold;text-transform:uppercase;color:#1F2937;margin-bottom:6px;letter-spacing:1px}.ws-name-row{display:flex;justify-content:space-between;font-size:10px;padding:4px 0;border-top:1px solid #1F2937;border-bottom:1px solid #1F2937;margin-bottom:8px}.section{margin-bottom:4px}.section-header{text-align:center;border:1px solid #1F2937;padding:2px 6px;font-weight:bold;font-size:10px;text-transform:uppercase;color:#1F2937;background:#F3F4F6;margin:4px 0}.section-marks{font-size:9px;font-weight:normal}.question{margin-bottom:4px;page-break-inside:avoid}.q-row{display:flex;align-items:flex-start;gap:4px}.q-num{font-weight:bold;min-width:18px;flex-shrink:0}.q-text{flex:1;line-height:1.4}.mcq-options-inline{display:flex;gap:0;margin-top:3px;margin-left:22px;font-size:11.5px}.mcq-opt-inline{flex:1;white-space:nowrap}.opt-label{font-weight:bold}.tf-options{display:flex;gap:16px;margin-top:3px;margin-left:22px}.fill-line{border-bottom:1px solid #bbb;height:14px;width:55%;margin-left:22px;margin-top:3px}.answer-line{border-bottom:1px solid #ddd;height:14px;margin:2px 0 2px 22px}.ws-footer{text-align:right;font-size:9px;color:#666;border-top:1px solid #ddd;margin-top:8px;padding-top:4px}@media print{body{margin:0}.paper-wrap{padding:10mm;border:1px solid #1F2937}.question{page-break-inside:avoid}}`;
                    const professionalCss = `*{margin:0;padding:0;box-sizing:border-box}body{font-family:'Arial',sans-serif;font-size:13px;color:#111;background:#fff}.paper-wrap{padding:18mm;width:210mm;margin:0 auto;min-height:297mm;border:1px solid #1F2937}.pro-header{display:flex;align-items:stretch;gap:14px;margin-bottom:10px}.pro-logo{width:80px;height:80px;border-radius:50%;border:2px solid #1F2937;display:flex;align-items:center;justify-content:center;flex-shrink:0}.pro-logo-inner{font-size:10px;color:#aaa;text-align:center;line-height:1.3}.pro-info{flex:1;border:2px solid #1F2937;border-radius:4px;overflow:hidden}.pro-info-name{font-weight:bold;font-size:16px;color:#fff;text-transform:uppercase;letter-spacing:0.5px;background:#1F2937;padding:7px 12px}.pro-info-divider{height:1px;background:#e5e7eb}.pro-info-line{font-size:10.5px;color:#333;padding:3px 12px;line-height:1.6}.pro-meta-row{display:flex;justify-content:space-between;flex-wrap:wrap;gap:4px;font-size:11px;background:#f9fafb;border:1px solid #e5e7eb;border-radius:4px;padding:6px 10px;margin-bottom:8px}.thin-div{border-top:1px solid #1F2937;margin:6px 0}.paper-title{text-align:center;font-size:15px;font-weight:bold;text-transform:uppercase;color:#1F2937;margin:8px 0 6px;text-decoration:underline;letter-spacing:2px}.section{margin-bottom:10px}.section-header{text-align:center;border:1px solid #1F2937;padding:4px 8px;font-weight:bold;font-size:12px;text-transform:uppercase;color:#1F2937;background:#f0f4ff;margin:10px 0 8px}.section-marks{font-size:10px;font-weight:normal}.question{margin-bottom:12px;page-break-inside:avoid}.q-row{display:flex;align-items:flex-start;gap:6px}.q-num{font-weight:bold;min-width:22px;flex-shrink:0}.q-text{flex:1;line-height:1.6}.mcq-options{display:grid;grid-template-columns:1fr 1fr;gap:5px 24px;margin-top:6px;margin-left:28px}.mcq-option{display:flex;gap:5px}.opt-label{font-weight:bold;min-width:22px;flex-shrink:0}.tf-options{display:flex;gap:24px;margin-top:5px;margin-left:28px}.fill-line{border-bottom:1px solid #bbb;height:18px;width:60%;margin-left:28px;margin-top:5px}.answer-line{border-bottom:1px solid #ddd;height:18px;margin:4px 0 4px 28px}.sig-block{margin-top:30px;display:flex;justify-content:space-between}.sig-line{text-align:center;width:30%}.sig-line div{border-top:1px solid #999;padding-top:5px;font-size:10px;color:#555}@media print{body{margin:0}.paper-wrap{padding:14mm;border:1px solid #1F2937}.question{page-break-inside:avoid}}`;
                    const css = isClassic ? classicCss : isWorksheetPrev ? worksheetCss : isProfessionalPrev ? professionalCss : defaultCss;
                    const body = generatePaperHTML(templateId);
                    return `<!DOCTYPE html><html><head><meta charset="UTF-8"><style>${css}</style></head><body>${body}</body></html>`;
                  })()}
                  style={{ width: '100%', minHeight: '800px', border: 'none', background: '#fff', display: 'block' }}
                  title="Paper Preview"
                />
              </div>
            </div>
            <div
              style={{
                padding: '10px 14px',
                borderTop: border,
                display: 'flex',
                justifyContent: 'space-between',
                background: headerBg,
                flexShrink: 0,
              }}
            >
              <button style={btn('ghost')} onClick={goPrev}>
                ← Back
              </button>
              <button style={btn('success')} onClick={handleFinalSave} disabled={isSaving}>
                {isSaving ? '⏳ Saving…' : '💾 Save & Finish →'}
              </button>
            </div>
          </div>
        )}

        {currentStep === 'save' && (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 20px' }}>
            <div style={{ maxWidth: '440px', width: '100%', textAlign: 'center' }}>
              <div style={{ fontSize: '56px', marginBottom: '16px' }}>🎉</div>
              <h2 style={{ color: '#f1f5f9', fontSize: '22px', fontWeight: 700, marginBottom: '8px' }}>
                Paper Saved!
              </h2>
              <p style={{ color: '#64748b', fontSize: '14px', marginBottom: '28px', lineHeight: '1.6' }}>
                Your question paper has been saved successfully.
                <br />
                Export it or go back to make changes.
              </p>
              <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', flexWrap: 'wrap' }}>
                <button style={btn('default')} onClick={handleExportDocx} disabled={isExporting}>
                  📄 Download DOCX
                </button>
                <button style={btn('default')} onClick={handleExportPdf} disabled={isExporting}>
                  {isMobile ? '⬇️ Download' : '🖨️Export PDF'}
                </button>
                <button style={btn('primary')} onClick={() => setCurrentStep('preview')}>
                  👁 Back to Preview
                </button>
                <button style={btn('ghost')} onClick={() => router.push('/dashboard')}>
                  ← Dashboard
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {showExamDetails && <ExamDetailsModal onClose={handleDetailsClose} />}
      {showPaperName && (
  <div
    style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(0,0,0,0.7)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 9999,
      backdropFilter: 'blur(4px)',
    }}
  >
    <div
      style={{
        width: '420px',
        background: 'hsl(222 41% 12%)',
        border: '1px solid hsl(217 33% 18%)',
        borderRadius: '16px',
        padding: '24px',
      }}
    >
      <div
        style={{
          fontSize: '42px',
          textAlign: 'center',
          marginBottom: '12px',
        }}
      >
        📝
      </div>

      <h2
        style={{
          color: '#f1f5f9',
          textAlign: 'center',
          fontSize: '20px',
          marginBottom: '8px',
        }}
      >
        Give Your Paper a Name
      </h2>

      <p
        style={{
          color: '#64748b',
          textAlign: 'center',
          fontSize: '13px',
          marginBottom: '18px',
        }}
      >
        This name will appear in My Papers.
      </p>

      <input
        autoFocus
        value={tempPaperName}
        onChange={e => setTempPaperName(e.target.value)}
        placeholder="Ex: Physics Mid-Term 2026"
        style={{
          width: '100%',
          background: 'hsl(222 30% 14%)',
          border: '1px solid hsl(217 33% 18%)',
          borderRadius: '10px',
          padding: '12px',
          color: '#f1f5f9',
          fontSize: '14px',
          outline: 'none',
        }}
      />

      <div
        style={{
          display: 'flex',
          justifyContent: 'flex-end',
          gap: '10px',
          marginTop: '20px',
        }}
      >
        <button
          style={btn('ghost')}
          onClick={() => setShowPaperName(false)}
        >
          Cancel
        </button>

        <button
          style={btn('success')}
          onClick={async () => {
  const paperName = tempPaperName.trim();

  if (!paperName) {
    toast.error('Enter paper name');
    return;
  }

  setTitle(paperName);
  setShowPaperName(false);

  const id = await handleSave(paperName);

  if (id) {
    advanceTo('save', 5);
  }
}}
        >
          💾 Save Paper
        </button>
      </div>
    </div>
  </div>
)}
      {showAddQuestion && <AddQuestionModal sectionId={showAddQuestion.sectionId} onClose={() => setShowAddQuestion(null)} />}
    </div>
  );
}

// ─────────────────────────────────────────
// SECTION EDITOR
// ─────────────────────────────────────────

interface SectionEditorProps {
  section: Section;
  isExpanded: boolean;
  onToggle: () => void;
  onUpdate: (u: Partial<Section>) => void;
  onDelete: () => void;
  onAddQuestion: () => void;
  onUpdateQuestion: (qId: string, u: Partial<Question>) => void;
  onDeleteQuestion: (qId: string) => void;
}

function SectionEditor({
  section,
  isExpanded,
  onToggle,
  onUpdate,
  onDelete,
  onAddQuestion,
  onUpdateQuestion,
  onDeleteQuestion,
}: SectionEditorProps) {
  const border = '1px solid hsl(217 33% 18%)';
  return (
    <div style={{ background: 'hsl(222 47% 7%)', border, borderRadius: '10px', marginBottom: '10px', overflow: 'hidden' }}>
      {/* ── SECTION HEADER ── */}
      <div className="sec-header" style={{
        display: 'flex', flexWrap: 'wrap', alignItems: 'center',
        gap: '6px', padding: '8px 10px',
        background: 'hsl(222 30% 14%)',
        borderBottom: isExpanded ? border : 'none',
      }}>
        {/* Row 1: toggle + title + stats (always visible) */}
        <div className="sec-title-row" style={{ display: 'flex', alignItems: 'center', gap: '6px', flex: 1, minWidth: 0 }}>
          <span style={{ color: '#64748b', fontSize: '12px', cursor: 'pointer', flexShrink: 0 }} onClick={onToggle}>
            {isExpanded ? '▼' : '▶'}
          </span>
          <input
            value={section.title}
            onChange={e => onUpdate({ title: e.target.value })}
            onClick={e => e.stopPropagation()}
            style={{
              flex: 1, minWidth: 0,
              background: 'transparent', border: 'none', outline: 'none',
              color: '#f1f5f9', fontSize: '13px', fontWeight: 600,
            }}
            placeholder="Section title..."
          />
          <span style={{
            fontSize: '11px', color: '#64748b', whiteSpace: 'nowrap',
            background: 'hsl(222 47% 7%)', padding: '2px 7px',
            borderRadius: '5px', border, flexShrink: 0,
          }}>
            {section.questions.length}Q · {section.questions.reduce((s, q) => s + q.marks, 0)}m
          </span>
        </div>

        {/* Row 2 (on mobile wraps below): marks input + buttons */}
        <div className="sec-actions-row" style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
          {/* Marks per question */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: '5px',
            background: 'rgba(59,130,246,0.08)',
            border: '1px solid rgba(59,130,246,0.18)',
            borderRadius: '8px', padding: '4px 8px',
          }}>
            <span style={{ fontSize: '10px', color: '#64748b', whiteSpace: 'nowrap' }}>Marks/Q</span>
            <input
              type="number" min={1}
              value={section.marksPerQuestion || ''}
              onChange={e => {
                const marks = parseInt(e.target.value, 10) || 1;
                onUpdate({ marksPerQuestion: marks, questions: section.questions.map(q => ({ ...q, marks })) });
              }}
              placeholder="—"
              style={{
                width: '40px', background: 'transparent', border: 'none', outline: 'none',
                color: '#f1f5f9', fontSize: '13px', fontWeight: 700, padding: 0,
              }}
            />
          </div>
          <button
            onClick={e => { e.stopPropagation(); onAddQuestion(); }}
            style={{
              background: 'rgba(59,130,246,0.15)', border: 'none', color: '#60a5fa',
              borderRadius: '6px', padding: '5px 10px', cursor: 'pointer',
              fontSize: '12px', fontWeight: 600, whiteSpace: 'nowrap',
            }}
          >+ Add Q</button>
          <button
            onClick={e => { e.stopPropagation(); onDelete(); }}
            style={{
              background: 'rgba(239,68,68,0.1)', border: 'none', color: '#f87171',
              borderRadius: '6px', padding: '5px 8px', cursor: 'pointer', fontSize: '13px',
            }}
          >🗑</button>
        </div>
      </div>

      {/* ── QUESTIONS ── */}
      {isExpanded && (
        <div style={{ padding: '8px' }}>
          {section.questions.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '16px', fontSize: '12px', color: '#64748b' }}>
              No questions yet.{' '}
              <span style={{ color: '#60a5fa', cursor: 'pointer' }} onClick={onAddQuestion}>Add one →</span>
            </div>
          ) : (
            section.questions.map(q => (
              <QuestionEditor
                key={q.id}
                question={q}
                onUpdate={u => onUpdateQuestion(q.id, u)}
                onDelete={() => onDeleteQuestion(q.id)}
              />
            ))
          )}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────
// QUESTION EDITOR
// ─────────────────────────────────────────

interface QuestionEditorProps {
  question: Question;
  onUpdate: (u: Partial<Question>) => void;
  onDelete: () => void;
}

const QUESTION_TYPES: Array<Question['type']> = [
  'MCQ',
  'SHORT_ANSWER',
  'LONG_ANSWER',
  'FILL_IN_BLANK',
  'TRUE_FALSE',
  'NUMERICAL',
  'DIAGRAM',
];

function QuestionEditor({ question, onUpdate, onDelete }: QuestionEditorProps) {
  const border = '1px solid hsl(217 33% 18%)';
  const inputStyle: React.CSSProperties = {
    background: 'hsl(222 30% 14%)',
    border,
    borderRadius: '6px',
    padding: '4px 8px',
    color: '#f1f5f9',
    fontSize: '11px',
    outline: 'none',
  };
const { cleanedQuestionText } = normalizeOptions(question.options, question.text);

const displayOptions: MCQOption[] =
  question.type === 'MCQ'
    ? question.options && question.options.length > 0
      ? question.options.slice(0, 4).map(opt => ({
          label: opt.label,
          text: opt.text,
          isCorrect: opt.isCorrect ?? false,
        }))
      : [
          { label: 'a', text: '', isCorrect: false },
          { label: 'b', text: '', isCorrect: false },
        ]
    : [];

const displayText = cleanedQuestionText || question.text;
  return (
    <div style={{ background: 'hsl(222 41% 12%)', border, borderRadius: '8px', padding: '10px 12px', marginBottom: '8px' }}>
      {/* ── Q META ROW: wraps on mobile ── */}
      <div className="q-meta-row" style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
        {/* Left: Q number + type + difficulty */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flex: 1, minWidth: 0 }}>
          <span style={{
            fontSize: '11px', fontWeight: 700, color: '#60a5fa',
            background: 'rgba(59,130,246,0.1)', padding: '2px 8px',
            borderRadius: '5px', flexShrink: 0,
          }}>
            Q{question.number}
          </span>
          <select
            value={question.type}
            onChange={e => onUpdate({ type: e.target.value as Question['type'] })}
            style={{ ...inputStyle, cursor: 'pointer', flex: 1, minWidth: 0 }}
          >
            {QUESTION_TYPES.map(t => (
              <option key={t} value={t}>{t.replace('_', ' ')}</option>
            ))}
          </select>
          <select
            value={question.difficulty || 'MEDIUM'}
            onChange={e => onUpdate({ difficulty: e.target.value as Question['difficulty'] })}
            style={{ ...inputStyle, cursor: 'pointer', width: '80px', flexShrink: 0 }}
          >
            {['EASY', 'MEDIUM', 'HARD'].map(d => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>
        </div>
        {/* Right: marks + delete */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
          <input
            type="number"
            value={question.marks}
            onChange={e => onUpdate({ marks: parseInt(e.target.value, 10) || 1 })}
            min={1} max={20}
            style={{ ...inputStyle, width: '44px', textAlign: 'center' }}
          />
          <span style={{ fontSize: '11px', color: '#64748b' }}>marks</span>
          <button
            onClick={onDelete}
            style={{
              background: 'rgba(239,68,68,0.1)', border: 'none', color: '#f87171',
              borderRadius: '5px', padding: '4px 8px', cursor: 'pointer', fontSize: '13px',
            }}
          >🗑</button>
        </div>
      </div>

      <textarea
        value={displayText}
        onChange={e => {
          const t = e.target.value;
          const s = splitOptions(t);
          s.options.length >= 2 ? onUpdate({ text: s.questionText, type: 'MCQ', options: s.options }) : onUpdate({ text: t });
        }}
        placeholder="Enter question text..."
        rows={2}
        style={{
          background: 'transparent',
          border: 'none',
          outline: 'none',
          color: '#f1f5f9',
          fontSize: '13px',
          width: '100%',
          resize: 'vertical',
          fontFamily: 'inherit',
          lineHeight: '1.5',
        }}
      />

      {question.type === 'MCQ' && (
        <div style={{ marginTop: '10px' }}>
          <div
            style={{
              fontSize: '10px',
              color: '#64748b',
              marginBottom: '6px',
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
            }}
          >
            Options
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
            {displayOptions.map((opt, i) => (
              <div
                key={`${opt.label}-${i}`}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  background: 'hsl(222 47% 7%)',
                  border,
                  borderRadius: '8px',
                  padding: '6px 10px',
                }}
              >
                <span
                  style={{
                    fontSize: '12px',
                    fontWeight: 700,
                    color: '#60a5fa',
                    minWidth: '26px',
                    flexShrink: 0,
                    fontFamily: 'monospace',
                  }}
                >
                  ({opt.label})
                </span>
                <input
                  type="text"
                  value={opt.text}
                  onChange={e => {
                    const o = [...displayOptions];
                    o[i] = { ...o[i], text: e.target.value };
                    onUpdate({ options: o });
                  }}
                  placeholder={`Option ${opt.label.toUpperCase()}...`}
                  style={{
                    flex: 1,
                    background: 'transparent',
                    border: 'none',
                    outline: 'none',
                    color: '#f1f5f9',
                    fontSize: '12px',
                    fontFamily: 'inherit',
                  }}
                />
              </div>
            ))}
          </div>
          {displayOptions.length < 4 && (
  <button
    type="button"
    onClick={() => {
      const labels = ['a', 'b', 'c', 'd'];
      const nextLabel = labels[displayOptions.length];

      onUpdate({
        options: [
          ...displayOptions,
          { label: nextLabel, text: '', isCorrect: false },
        ],
      });
    }}
    style={{
      marginTop: '6px',
      fontSize: '11px',
      color: '#60a5fa',
      background: 'none',
      border: 'none',
      cursor: 'pointer',
      padding: '2px 0',
    }}
  >
    + Add Option
  </button>
)}
        </div>
      )}

      {question.type === 'TRUE_FALSE' && (
        <div style={{ marginTop: '6px', display: 'flex', gap: '16px' }}>
          {['True', 'False'].map((v, i) => (
            <div
              key={v}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                background: 'hsl(222 47% 7%)',
                border,
                borderRadius: '8px',
                padding: '5px 10px',
              }}
            >
              <span style={{ fontSize: '12px', fontWeight: 700, color: '#60a5fa' }}>({i === 0 ? 'a' : 'b'})</span>
              <span style={{ fontSize: '12px', color: '#f1f5f9' }}>{v}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}