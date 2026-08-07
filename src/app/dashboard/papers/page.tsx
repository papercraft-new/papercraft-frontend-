'use client';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { papersApi } from '@/lib/api';
import { usePaperStore } from '@/store/paperStore';
import toast from 'react-hot-toast';
import { downloadHtmlAsPdf } from '@/lib/pdfExport';
import type { ExamDetails, Section } from '@/store/paperStore';

// ─────────────────────────────────────────
// TYPES & HELPERS
// ─────────────────────────────────────────

// MCQ option normalization — ported verbatim from builder/page.tsx so the
// PDF generated here matches the PDF generated in the builder exactly.
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

const STATUS_COLORS: Record<string, { bg: string; color: string }> = {
  READY:      { bg: 'rgba(16,185,129,0.15)',  color: '#10b981' },
  DRAFT:      { bg: 'rgba(245,158,11,0.15)',  color: '#f59e0b' },
  PROCESSING: { bg: 'rgba(59,130,246,0.15)',  color: '#3b82f6' },
  ARCHIVED:   { bg: 'rgba(100,116,139,0.15)', color: '#64748b' },
};

function formatRelativeTime(d: string) {
  if (!d) return '—';
  const diff = Date.now() - new Date(d).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function formatDate(d: string) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

// ─────────────────────────────────────────
// MAIN PAGE
// ─────────────────────────────────────────

export default function PapersPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { loadPaper, setTitle: setStoreTitle, examDetails: storeExamDetails } = usePaperStore();

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [page, setPage] = useState(1);
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');
  const [exportingId, setExportingId] = useState<string | null>(null);
  const [pdfExportingId, setPdfExportingId] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [renameId, setRenameId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['papers', { page, search, status: statusFilter !== 'ALL' ? statusFilter : undefined }],
    queryFn: () => papersApi.list({
      page,
      limit: 12,
      search: search || undefined,
      status: statusFilter !== 'ALL' ? statusFilter : undefined,
    }),
    staleTime: 60 * 1000,
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => papersApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['papers'] });
      toast.success('Paper archived.');
      setDeleteConfirm(null);
    },
    onError: () => toast.error('Failed to archive paper.'),
  });

  const duplicateMutation = useMutation({
    mutationFn: (id: string) => papersApi.duplicate(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['papers'] });
      toast.success('Paper duplicated!');
    },
    onError: () => toast.error('Failed to duplicate.'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, title }: { id: string; title: string }) =>
      papersApi.update(id, { title }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['papers'] });
      toast.success('Paper renamed!');
      setRenameId(null);
    },
    onError: () => toast.error('Failed to rename.'),
  });

  const papers: Record<string, unknown>[] = data?.data?.data || [];
  const pagination = data?.data?.pagination;

  // ── OPEN IN BUILDER ────────────────────
  // ── OPEN IN BUILDER ────────────────────
const handleOpenInBuilder = async (paper: Record<string, unknown>) => {
  try {
    toast.loading('Loading paper...', { id: 'load-paper' });

    // Fetch full paper data including sections
    const res = await papersApi.getById(paper.id as string);
    const fullPaper = res.data.data;

    loadPaper({
      id: fullPaper.id,
      title: fullPaper.title || 'Untitled Paper',
      examDetails: fullPaper.examDetails || {},
      sections: fullPaper.sections || [],
      templateId: fullPaper.templateId || 'school',
    });

    toast.success('Paper loaded!', { id: 'load-paper' });
    router.push('/dashboard/builder');
  } catch (err) {
    toast.error('Failed to load paper.', { id: 'load-paper' });
  }
};

// ── EXPORT DOCX ────────────────────────
const handleExportDocx = async (paper: Record<string, unknown>) => {
  setExportingId(paper.id as string);
  try {
    const res = await papersApi.exportDocx(paper.id as string, (paper.templateId as string) || 'tpl_classic');
    const blob = new Blob([res.data], {
      type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    // Use THIS paper's title, not store title
    const filename = (paper.title as string || 'paper')
      .replace(/[^a-z0-9\s]/gi, '')
      .replace(/\s+/g, '_')
      .toLowerCase();
    a.download = `${filename}.docx`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success(`${paper.title} — DOCX downloaded!`);
  } catch {
    toast.error('DOCX export failed.');
  } finally {
    setExportingId(null);
  }
};

// ── EXPORT PDF ─────────────────────────
const handleExportPdf = async (paper: Record<string, unknown>) => {
  setPdfExportingId(paper.id as string);
  try {
    toast.loading('Preparing PDF...', { id: 'pdf-' + paper.id });
    const res = await papersApi.getById(paper.id as string);
    const fullPaper = res.data.data;
    const ed = (fullPaper.examDetails || {}) as Record<string, unknown>;
    const sections = (fullPaper.sections || []) as Section[];
    const totalMarks = fullPaper.totalMarks as number;
    const paperTitle = fullPaper.title as string || 'Question Paper';
    const tmplId: string = (fullPaper.templateId as string) || 'tpl_classic';
    const isClassic      = tmplId === 'tpl_classic';
    const isWorksheet    = tmplId === 'tpl_worksheet';
    const isProfessional = tmplId === 'tpl_professional';
    const dateStr = ed.date ? new Date(ed.date as string).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' }) : '—';

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
      if (isClassic || isWorksheet) {
        return `<div class="mcq-options-inline">${o
          .map(x => `<span class="mcq-opt-inline"><span class="opt-label">(${x.label})</span> ${x.text}</span>`)
          .join('')}</div>`;
      }
      return `<div class="mcq-options">${o
        .map(x => `<div class="mcq-option"><span class="opt-label">(${x.label})</span> ${x.text}</div>`)
        .join('')}</div>`;
    };

    const lines = (n: number) =>
      Array.from({ length: isWorksheet ? Math.min(n, 1) : n })
        .map(() => '<div class="answer-line"></div>')
        .join('');

    const sectionsHTML = sections.map(section => {
      const marksInfo = section.marksPerQuestion ? `(${section.marksPerQuestion} Mark${section.marksPerQuestion>1?'s':''} Each)` : section.totalMarks ? `[Total: ${section.totalMarks} Marks]` : '';
      const questionsHTML = section.questions.map(q => {
        const { cleanedQuestionText } = normalizeOptions(q.options, q.text);
        let a = '';
        if (q.type === 'MCQ') a = renderOptions(q.options, q.text);
        else if (q.type === 'TRUE_FALSE') a = '<div class="tf-options"><span><strong>(a)</strong> True</span><span><strong>(b)</strong> False</span></div>';
        else if (q.type === 'FILL_IN_BLANK') a = '<div class="fill-line"></div>';
        else if (q.type === 'SHORT_ANSWER') a = '';
        else if (q.type === 'LONG_ANSWER') a = '';
        else if (q.type === 'DIAGRAM') a = lines(8);
        else a = lines(2);
        return `<div class="question"><div class="q-row"><span class="q-num">${q.number}.</span><span class="q-text">${cleanedQuestionText || q.text}</span></div>${a}</div>`;
      }).join('');
      return `<div class="section"><div class="section-header">${section.title}${marksInfo?` <span class="section-marks">${marksInfo}</span>`:''}</div>${section.description?`<div class="section-desc">${section.description}</div>`:''}${questionsHTML}</div>`;
    }).join('');

    const instructionsHTML = (ed.instructions as string[]|undefined)?.length
      ? `<div class="instructions"><div class="inst-title">General Instructions:</div><ol>${(ed.instructions as string[]).map(i=>`<li>${i}</li>`).join('')}</ol></div><div class="thin-div"></div>` : '';

    const defaultCss = `*{margin:0;padding:0;box-sizing:border-box}body{font-family:'Times New Roman',serif;font-size:13px;color:#111;background:#fff;line-height:1.4}.paper-wrap{padding:18mm;width:210mm;margin:0 auto;min-height:297mm;position:relative}.header{text-align:center;margin-bottom:8px}.inst-name{font-size:22px;font-weight:bold;text-transform:uppercase;letter-spacing:1px;color:#1a2e5a}.inst-addr{font-size:12px;color:#555;margin-top:2px}.thick-div{border-top:2px solid #1a2e5a;margin:7px 0}.thin-div{border-top:1px solid #1a2e5a;margin:5px 0}.meta-table{width:100%;border-collapse:collapse;font-size:14.5px;margin:4px 0}.meta-table td{padding:2px 0}.paper-title{text-align:center;font-size:15px;font-weight:bold;text-transform:uppercase;letter-spacing:2px;color:#1a2e5a;margin:5px 0;text-decoration:underline}.instructions{font-size:14px;margin-bottom:6px}.inst-title{font-weight:bold;text-decoration:underline;margin-bottom:3px}.instructions ol{padding-left:18px;line-height:1.4}.section{margin-bottom:10px}.section-header{text-align:center;border:1px solid #1a2e5a;padding:4px 8px;font-weight:bold;font-size:15px;text-transform:uppercase;color:#1a2e5a;background:#f0f4ff;margin:10px 0 8px}.section-marks{font-size:13px;font-weight:normal}.section-desc{text-align:center;font-size:13px;color:#555;font-style:italic;margin-bottom:6px}.question{margin-bottom:8px;page-break-inside:avoid;break-inside:avoid}.q-row{overflow:hidden}.q-num{font-weight:bold;float:left;width:22px;padding-top:1px}.q-text{display:block;margin-left:28px;line-height:1.4;font-size:13px}.q-marks{font-weight:bold;font-size:13px;color:#1a2e5a;min-width:28px;text-align:right;flex-shrink:0;padding-top:1px}.mcq-options{margin-top:5px;margin-left:28px}.mcq-option{display:inline-block;width:47%;vertical-align:top;font-size:13px;margin-bottom:4px}.opt-label{font-weight:bold;display:inline-block;min-width:20px}.tf-options{margin-top:5px;margin-left:28px}.tf-options span{display:inline-block;margin-right:24px}.fill-line{border-bottom:1px solid #bbb;height:16px;width:60%;margin-left:28px;margin-top:4px}.answer-line{border-bottom:1px solid #ddd;height:16px;margin:4px 0 4px 28px}@media print{body{margin:0;font-size:11pt;line-height:1.4}.paper-wrap{padding:14mm;width:auto}.q-text{font-size:12pt!important}.mcq-option,.mcq-opt-inline,.mcq-options-inline,.tf-options{font-size:11pt!important}.q-num{font-size:12pt!important}.question{page-break-inside:avoid}}`;
    const classicCss = `*{margin:0;padding:0;box-sizing:border-box}body{font-family:'Times New Roman',serif;font-size:13px;color:#111;background:#fff;line-height:1.4}.paper-wrap{padding:18mm;width:210mm;margin:0 auto;min-height:297mm}.inst-name{text-align:center;font-size:22px;font-weight:bold;text-transform:uppercase;letter-spacing:1px;color:#111;margin-bottom:4px}.classic-meta-row{display:flex;justify-content:space-between;flex-wrap:wrap;gap:6px;font-size:13px;padding-bottom:6px;border-bottom:1px solid #888;margin-bottom:6px}.thin-div{border-top:1px solid #555;margin:5px 0}.paper-title{text-align:center;font-size:15px;font-weight:bold;text-transform:uppercase;letter-spacing:2px;color:#111;margin:5px 0}.instructions{font-size:14px;margin-bottom:6px}.inst-title{font-weight:bold;text-decoration:underline;margin-bottom:3px}.instructions ol{padding-left:18px;line-height:1.4}.section{margin-bottom:10px}.section-header{text-align:center;border:1px solid #333;padding:4px 8px;font-weight:bold;font-size:15px;text-transform:uppercase;color:#111;background:#f5f5f5;margin:10px 0 8px}.section-marks{font-size:13px;font-weight:normal}.section-desc{text-align:center;font-size:13px;color:#555;font-style:italic;margin-bottom:6px}.question{margin-bottom:8px;page-break-inside:avoid;break-inside:avoid}.q-row{overflow:hidden}.q-num{font-weight:bold;float:left;width:22px;padding-top:1px}.q-text{display:block;margin-left:28px;line-height:1.4;font-size:13px}.q-marks{font-weight:bold;font-size:13px;color:#111;min-width:28px;text-align:right;flex-shrink:0;padding-top:1px}.mcq-options-inline{margin-top:5px;margin-left:28px;font-size:13px}.mcq-opt-inline{display:inline-block;width:24%;vertical-align:top;white-space:nowrap}.opt-label{font-weight:bold;margin-right:4px}.tf-options{margin-top:5px;margin-left:28px}.tf-options span{display:inline-block;margin-right:24px}.fill-line{border-bottom:1px solid #bbb;height:16px;width:60%;margin-left:28px;margin-top:4px}.answer-line{border-bottom:1px solid #ddd;height:16px;margin:4px 0 4px 28px}@media print{body{margin:0;font-size:11pt;line-height:1.4}.paper-wrap{padding:14mm;width:auto}.q-text{font-size:12pt!important}.mcq-option,.mcq-opt-inline,.mcq-options-inline,.tf-options{font-size:11pt!important}.q-num{font-size:12pt!important}.question{page-break-inside:avoid}}`;
    const worksheetCss = `*{margin:0;padding:0;box-sizing:border-box}body{font-family:'Calibri',sans-serif;font-size:12px;color:#111;background:#fff;line-height:1.4}.paper-wrap{padding:14mm;width:210mm;margin:0 auto;min-height:297mm}.ws-title{text-align:center;font-size:16px;font-weight:bold;text-transform:uppercase;color:#1F2937;margin-bottom:6px;letter-spacing:1px}.ws-name-row{display:flex;justify-content:space-between;font-size:10px;padding:4px 0;border-top:1px solid #1F2937;border-bottom:1px solid #1F2937;margin-bottom:8px}.section{margin-bottom:4px}.section-header{text-align:center;border:1px solid #1F2937;padding:2px 6px;font-weight:bold;font-size:10px;text-transform:uppercase;color:#1F2937;background:#F3F4F6;margin:4px 0}.section-marks{font-size:9px;font-weight:normal}.question{margin-bottom:4px;page-break-inside:avoid;break-inside:avoid}.q-row{overflow:hidden}.q-num{font-weight:bold;float:left;width:18px}.q-text{display:block;margin-left:22px;line-height:1.4;font-size:13px}.mcq-options-inline{margin-top:4px;margin-left:22px;font-size:13px}.mcq-opt-inline{display:inline-block;width:24%;vertical-align:top;white-space:nowrap}.opt-label{font-weight:bold;margin-right:4px}.tf-options{margin-top:5px;margin-left:22px}.tf-options span{display:inline-block;margin-right:16px}.fill-line{border-bottom:1px solid #bbb;height:16px;width:55%;margin-left:22px;margin-top:4px}.answer-line{border-bottom:1px solid #ddd;height:14px;margin:2px 0 2px 22px}.ws-footer{text-align:right;font-size:9px;color:#666;border-top:1px solid #ddd;margin-top:8px;padding-top:4px}@media print{body{margin:0;font-size:10pt;line-height:1.4}.paper-wrap{padding:10mm;width:auto}.q-text{font-size:11pt!important}.mcq-opt-inline,.mcq-options-inline,.tf-options{font-size:10pt!important}.q-num{font-size:11pt!important}.question{page-break-inside:avoid}}`;
    const professionalCss = `*{margin:0;padding:0;box-sizing:border-box}body{font-family:'Arial',sans-serif;font-size:13px;color:#111;background:#fff;line-height:1.4}.paper-wrap{padding:18mm;width:210mm;margin:0 auto;min-height:297mm}.pro-header{display:flex;align-items:stretch;gap:14px;margin-bottom:10px}.pro-logo{width:80px;height:80px;border-radius:50%;border:2px solid #1F2937;display:flex;align-items:center;justify-content:center;flex-shrink:0}.pro-logo-inner{font-size:10px;color:#aaa;text-align:center;line-height:1.3}.pro-info{flex:1;border:2px solid #1F2937;border-radius:4px;overflow:hidden}.pro-info-name{font-weight:bold;font-size:16px;color:#fff;text-transform:uppercase;letter-spacing:0.5px;background:#1F2937;padding:7px 12px}.pro-info-divider{height:1px;background:#e5e7eb}.pro-info-line{font-size:10.5px;color:#333;padding:3px 12px;line-height:1.6}.pro-meta-row{display:flex;justify-content:space-between;flex-wrap:wrap;gap:4px;font-size:11px;background:#f9fafb;border:1px solid #e5e7eb;border-radius:4px;padding:6px 10px;margin-bottom:8px}.thin-div{border-top:1px solid #1F2937;margin:6px 0}.paper-title{text-align:center;font-size:15px;font-weight:bold;text-transform:uppercase;color:#1F2937;margin:8px 0 6px;text-decoration:underline;letter-spacing:2px}.section{margin-bottom:10px}.section-header{text-align:center;border:1px solid #1F2937;padding:4px 8px;font-weight:bold;font-size:12px;text-transform:uppercase;color:#1F2937;background:#f0f4ff;margin:10px 0 8px}.section-marks{font-size:10px;font-weight:normal}.question{margin-bottom:8px;page-break-inside:avoid;break-inside:avoid}.q-row{overflow:hidden}.q-num{font-weight:bold;float:left;width:22px}.q-text{display:block;margin-left:28px;line-height:1.4;font-size:13px}.mcq-options{margin-top:5px;margin-left:28px}.mcq-option{display:inline-block;width:47%;vertical-align:top;font-size:13px;margin-bottom:4px}.mcq-opt-inline{display:inline-block;width:24%;vertical-align:top;white-space:nowrap}.opt-label{font-weight:bold;margin-right:4px}.tf-options{margin-top:5px;margin-left:28px}.tf-options span{display:inline-block;margin-right:24px}.fill-line{border-bottom:1px solid #bbb;height:16px;width:60%;margin-left:28px;margin-top:4px}.answer-line{border-bottom:1px solid #ddd;height:16px;margin:4px 0 4px 28px}.sig-block{margin-top:30px;display:flex;justify-content:space-between}.sig-line{text-align:center;width:30%}.sig-line div{border-top:1px solid #999;padding-top:5px;font-size:10px;color:#555}@media print{body{margin:0;font-size:11pt;line-height:1.4}.paper-wrap{padding:14mm;width:auto}.q-text{font-size:12pt!important}.mcq-option,.mcq-opt-inline,.mcq-options-inline,.tf-options{font-size:11pt!important}.q-num{font-size:12pt!important}.question{page-break-inside:avoid}}`;

    const css = isClassic ? classicCss : isWorksheet ? worksheetCss : isProfessional ? professionalCss : defaultCss;

    let bodyHTML = '';
    if (isClassic) {
      bodyHTML = `<div class="paper-wrap"><div class="inst-name">${ed.institutionName||'Institution Name'}</div><div class="thin-div"></div><div class="classic-meta-row"><span><strong>Name:</strong> ___________________</span><span><strong>Class:</strong> ${ed.class||'—'}</span><span><strong>Date:</strong> ${dateStr}</span><span><strong>Max. Marks:</strong> ${totalMarks||ed.totalMarks||'—'}</span></div><div class="paper-title">${ed.examType||'Question Paper'}</div><div class="thin-div"></div>${instructionsHTML}${sectionsHTML}</div>`;
    } else if (isWorksheet) {
      bodyHTML = `<div class="paper-wrap"><div class="ws-title">${paperTitle||ed.examType||'Worksheet'}</div><div class="ws-name-row"><span><strong>Name:</strong> _____________________________</span><span><strong>Date:</strong> ${dateStr}</span></div>${sectionsHTML}<div class="ws-footer">${ed.institutionName||''}</div></div>`;
    } else if (isProfessional) {
      const infoLines = [ed.institutionAddress?`<div class="pro-info-line">📍 ${ed.institutionAddress}</div>`:'', ed.department?`<div class="pro-info-line">🏫 Dept. of ${ed.department}</div>`:'', ed.facultyName?`<div class="pro-info-line">👤 Faculty: ${ed.facultyName}</div>`:''].filter(Boolean).join('');
      bodyHTML = `<div class="paper-wrap"><div class="pro-header"><div class="pro-logo"><div class="pro-logo-inner">LOGO</div></div><div class="pro-info"><div class="pro-info-name">${(ed.institutionName as string||'INSTITUTION NAME').toUpperCase()}</div><div class="pro-info-divider"></div>${infoLines}</div></div><div class="pro-meta-row"><span><strong>Subject:</strong> ${ed.subject||'—'}</span><span><strong>Class:</strong> ${ed.class||'—'}</span><span><strong>Date:</strong> ${dateStr}</span><span><strong>Duration:</strong> ${ed.duration||'3 Hrs'}</span><span><strong>Max. Marks:</strong> ${totalMarks||ed.totalMarks||'—'}</span></div><div class="thin-div"></div><div class="paper-title">${ed.examType||'Question Paper'}</div><div class="thin-div"></div>${sectionsHTML}<div class="thin-div"></div><div class="sig-block"><div class="sig-line"><div>Subject Teacher</div></div><div class="sig-line"><div>HOD / Principal</div></div><div class="sig-line"><div>Exam Controller</div></div></div></div>`;
    } else {
      bodyHTML = `<div class="paper-wrap"><div class="header"><div class="inst-name">${ed.institutionName||'Institution Name'}</div>${ed.institutionAddress?`<div class="inst-addr">${ed.institutionAddress}</div>`:''}</div><div class="thick-div"></div><table class="meta-table"><tr><td><strong>Subject:</strong> ${ed.subject||'—'}</td><td style="text-align:right"><strong>Date:</strong> ${dateStr}</td></tr><tr><td><strong>Class:</strong> ${ed.class||'—'}</td><td style="text-align:right"><strong>Duration:</strong> ${ed.duration||'3 Hours'}</td></tr><tr><td><strong>Max. Marks:</strong> ${totalMarks||ed.totalMarks||'—'}</td><td style="text-align:right"></td></tr></table><div class="thin-div"></div><div class="paper-title">${ed.examType||'Question Paper'}</div>${instructionsHTML}${sectionsHTML}<div class="thick-div"></div></div>`;
    }

    const fullHtml = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${paperTitle}</title>
  <style>${css}</style>
</head>
<body>
  ${bodyHTML}
  <script>
    window.onload = function() {
      window.print();
    };
  </script>
</body>
</html>`;

    const isMobile = /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);
    if (isMobile) {
      await downloadHtmlAsPdf(fullHtml, `${paperTitle.replace(/[^a-z0-9]/gi,'_').toLowerCase()}.pdf`);
      toast.success(`${paperTitle} — PDF downloaded!`, { id: 'pdf-'+paper.id, duration: 4000 });
    } else {
      const pw = window.open('', '_blank');
      if (!pw) { toast.error('Popup blocked.', { id: 'pdf-'+paper.id }); return; }
      pw.document.write(fullHtml); pw.document.close(); pw.focus();
      setTimeout(() => { pw.print(); pw.close(); }, 600);
      toast.success(`${paperTitle} — PDF ready!`, { id: 'pdf-'+paper.id });
    }
  } catch {
    toast.error('PDF export failed.', { id: 'pdf-'+paper.id });
  } finally {
    setPdfExportingId(null);
  }
};

  // ── RENAME ────────────────────────────
  const handleRename = (paper: Record<string, unknown>) => {
    setRenameId(paper.id as string);
    setRenameValue(paper.title as string || '');
  };

  const submitRename = () => {
    if (!renameId || !renameValue.trim()) return;
    updateMutation.mutate({ id: renameId, title: renameValue.trim() });
  };

  // ── STYLES ────────────────────────────
  const card: React.CSSProperties = {
    background: 'hsl(222 41% 12%)',
    border: '1px solid hsl(217 33% 18%)',
    borderRadius: '14px',
    overflow: 'hidden',
  };

  const th: React.CSSProperties = {
    textAlign: 'left', padding: '10px 14px',
    fontSize: '11px', fontWeight: 700,
    textTransform: 'uppercase', letterSpacing: '0.06em',
    color: '#64748b', borderBottom: '1px solid hsl(217 33% 18%)',
  };

  const td: React.CSSProperties = {
    padding: '10px 14px', fontSize: '13px',
    color: '#94a3b8', verticalAlign: 'middle',
    borderBottom: '1px solid rgba(255,255,255,0.03)',
  };

  return (
    <div style={{ padding: '1.5rem', maxWidth: '1200px', margin: '0 auto' }}>

      {/* HEADER */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#f1f5f9', marginBottom: '4px' }}>
            My Papers
          </h1>
          <p style={{ color: '#94a3b8', fontSize: '13px' }}>
            {pagination?.total ?? 0} question paper{(pagination?.total ?? 0) !== 1 ? 's' : ''} in your library
          </p>
        </div>
        <button
          onClick={() => router.push('/dashboard/upload')}
          style={{ padding: '10px 20px', background: 'linear-gradient(135deg,#2563eb,#06b6d4)', color: '#fff', border: 'none', borderRadius: '10px', fontSize: '14px', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
        >
          + New Paper
        </button>
      </div>

      {/* FILTERS */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '1.25rem', flexWrap: 'wrap', alignItems: 'center' }}>
        <input
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          placeholder="🔍 Search papers..."
          style={{ flex: 1, minWidth: '200px', background: 'hsl(222 41% 12%)', border: '1px solid hsl(217 33% 18%)', borderRadius: '8px', padding: '9px 14px', fontSize: '13px', color: '#f1f5f9', outline: 'none' }}
        />
        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
          style={{ background: 'hsl(222 41% 12%)', border: '1px solid hsl(217 33% 18%)', borderRadius: '8px', padding: '9px 12px', fontSize: '13px', color: '#f1f5f9', outline: 'none', cursor: 'pointer' }}
        >
          <option value="ALL">All Status</option>
          <option value="DRAFT">Draft</option>
          <option value="READY">Ready</option>
          <option value="PROCESSING">Processing</option>
          <option value="ARCHIVED">Archived</option>
        </select>

        {/* View toggle */}
        <div style={{ display: 'flex', background: 'hsl(222 30% 14%)', borderRadius: '8px', padding: '3px', gap: '2px' }}>
          {(['table', 'grid'] as const).map(mode => (
            <button key={mode}
              onClick={() => setViewMode(mode)}
              style={{ padding: '5px 12px', borderRadius: '6px', fontSize: '12px', fontWeight: 600, border: 'none', background: viewMode === mode ? 'hsl(222 41% 12%)' : 'transparent', color: viewMode === mode ? '#f1f5f9' : '#64748b', cursor: 'pointer' }}
            >
              {mode === 'table' ? '☰ Table' : '⊞ Grid'}
            </button>
          ))}
        </div>
      </div>

      {/* CONTENT */}
      {isLoading ? (
        <div style={{ ...card, padding: '3rem', textAlign: 'center', color: '#64748b' }}>
          ⏳ Loading papers...
        </div>
      ) : papers.length === 0 ? (
        <div style={{ ...card, padding: '4rem', textAlign: 'center' }}>
          <div style={{ fontSize: '3rem', marginBottom: '12px' }}>📚</div>
          <div style={{ fontSize: '16px', fontWeight: 600, color: '#f1f5f9', marginBottom: '8px' }}>
            {search ? `No papers matching "${search}"` : 'No papers yet'}
          </div>
          <div style={{ fontSize: '13px', color: '#64748b', marginBottom: '20px' }}>
            {search ? 'Try a different search term.' : 'Upload questions or build your first paper from scratch.'}
          </div>
          {!search && (
            <button
              onClick={() => router.push('/dashboard/upload')}
              style={{ padding: '10px 24px', background: 'linear-gradient(135deg,#2563eb,#06b6d4)', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: 700, cursor: 'pointer' }}
            >
              + Create First Paper
            </button>
          )}
        </div>
      ) : viewMode === 'table' ? (
        <div style={card}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  {['Title', 'Subject', 'Class', 'Marks', 'Questions', 'Last Updated', 'Status', 'Actions'].map(h => (
                    <th key={h} style={th}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {papers.map((paper) => {
                  const ed = (paper.examDetails || {}) as Record<string, unknown>;
                  const status = paper.status as string;
                  const sc = STATUS_COLORS[status] || STATUS_COLORS.DRAFT;
                  const isRenaming = renameId === paper.id;

                  return (
                    <tr key={paper.id as string}>
                      {/* Title */}
                      <td style={td}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <div style={{ width: '32px', height: '32px', background: 'rgba(59,130,246,0.1)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                            📄
                          </div>
                          {isRenaming ? (
                            <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                              <input
                                value={renameValue}
                                onChange={e => setRenameValue(e.target.value)}
                                onKeyDown={e => { if (e.key === 'Enter') submitRename(); if (e.key === 'Escape') setRenameId(null); }}
                                autoFocus
                                style={{ background: 'hsl(222 47% 7%)', border: '1px solid #3b82f6', borderRadius: '6px', padding: '4px 8px', color: '#f1f5f9', fontSize: '13px', outline: 'none', width: '160px' }}
                              />
                              <button onClick={submitRename} style={{ fontSize: '11px', padding: '3px 8px', background: 'rgba(59,130,246,0.2)', border: 'none', borderRadius: '5px', color: '#60a5fa', cursor: 'pointer' }}>Save</button>
                              <button onClick={() => setRenameId(null)} style={{ fontSize: '11px', padding: '3px 8px', background: 'transparent', border: 'none', color: '#64748b', cursor: 'pointer' }}>✕</button>
                            </div>
                          ) : (
                            <span style={{ fontSize: '13px', fontWeight: 600, color: '#f1f5f9', maxWidth: '180px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', cursor: 'pointer' }}
                              onDoubleClick={() => handleRename(paper)}
                              title="Double-click to rename"
                            >
                              {paper.title as string || 'Untitled Paper'}
                            </span>
                          )}
                        </div>
                      </td>
                      <td style={td}>{(ed.subject as string) || '—'}</td>
                      <td style={td}>{(ed.class as string) || '—'}</td>
                      <td style={{ ...td, fontWeight: 700, color: '#f1f5f9' }}>{paper.totalMarks as number}</td>
                      <td style={td}>{paper.questionCount as number}</td>
                      <td style={{ ...td, fontSize: '12px' }}>{formatRelativeTime(paper.updatedAt as string)}</td>
                      <td style={td}>
                        <span style={{ fontSize: '11px', fontWeight: 600, padding: '3px 8px', borderRadius: '6px', background: sc.bg, color: sc.color }}>
                          {status}
                        </span>
                      </td>
                      {/* ACTIONS */}
                      <td style={td}>
                        <div style={{ display: 'flex', gap: '6px', flexWrap: 'nowrap' }}>
                          {/* Edit / Open in Builder */}
                          <button
                            onClick={() => handleOpenInBuilder(paper)}
                            title="Open in Builder"
                            style={{ padding: '5px 10px', background: 'rgba(59,130,246,0.15)', border: '1px solid rgba(59,130,246,0.25)', borderRadius: '7px', color: '#60a5fa', fontSize: '12px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', whiteSpace: 'nowrap' }}
                          >
                            ✏️ Edit
                          </button>

                          {/* Download PDF */}
                          <button
                            onClick={() => handleExportPdf(paper)}
                            disabled={pdfExportingId === paper.id}
                            title="Download PDF"
                            style={{ padding: '5px 10px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '7px', color: '#f87171', fontSize: '12px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', whiteSpace: 'nowrap' }}
                          >
                            {pdfExportingId === paper.id ? '⏳' : '🖨️'} PDF
                          </button>

                          {/* Download DOCX */}
                          <button
                            onClick={() => handleExportDocx(paper)}
                            disabled={exportingId === paper.id}
                            title="Download DOCX"
                            style={{ padding: '5px 10px', background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: '7px', color: '#10b981', fontSize: '12px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', whiteSpace: 'nowrap' }}
                          >
                            {exportingId === paper.id ? '⏳' : '📄'} DOCX
                          </button>

                          {/* More options dropdown */}
                          <MoreMenu
                            onRename={() => handleRename(paper)}
                            onDuplicate={() => duplicateMutation.mutate(paper.id as string)}
                            onDelete={() => setDeleteConfirm(paper.id as string)}
                          />
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        // GRID VIEW
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '1rem' }}>
          {papers.map((paper) => {
            const ed = (paper.examDetails || {}) as Record<string, unknown>;
            const status = paper.status as string;
            const sc = STATUS_COLORS[status] || STATUS_COLORS.DRAFT;

            return (
              <div key={paper.id as string} style={{ ...card, display: 'flex', flexDirection: 'column' }}>
                {/* Mini paper preview */}
                <div style={{ height: '120px', background: 'linear-gradient(135deg, rgba(37,99,235,0.05), rgba(6,182,212,0.05))', borderBottom: '1px solid hsl(217 33% 18%)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '12px', position: 'relative' }}>
                  <div style={{ width: '80px', background: '#fff', borderRadius: '4px', padding: '6px', boxShadow: '0 2px 8px rgba(0,0,0,0.3)', fontFamily: 'serif' }}>
                    <div style={{ fontSize: '4px', fontWeight: 700, textTransform: 'uppercase', color: '#1a2e5a', textAlign: 'center', borderBottom: '1px solid #1a2e5a', paddingBottom: '2px', marginBottom: '2px' }}>
                      {String(ed.institutionName || 'Institution').substring(0, 15)}
                    </div>
                    <div style={{ fontSize: '3.5px', color: '#333', lineHeight: 1.4 }}>
                      <div>Subject: {String(ed.subject || '—')}</div>
                      <div>Class: {String(ed.class || '—')}</div>
                      <div style={{ fontWeight: 700, marginTop: '2px', textAlign: 'center' }}>QUESTION PAPER</div>
                    </div>
                    {[...Array(3)].map((_, i) => (
                      <div key={i} style={{ height: '1px', background: '#e5e7eb', marginTop: '3px' }} />
                    ))}
                  </div>
                  <span style={{ position: 'absolute', top: '8px', right: '8px', fontSize: '10px', fontWeight: 600, padding: '2px 6px', borderRadius: '5px', background: sc.bg, color: sc.color }}>
                    {status}
                  </span>
                </div>

                {/* Info */}
                <div style={{ padding: '12px', flex: 1 }}>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: '#f1f5f9', marginBottom: '4px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {paper.title as string || 'Untitled Paper'}
                  </div>
                  <div style={{ fontSize: '11px', color: '#64748b', marginBottom: '2px' }}>
                    {paper.totalMarks as number} marks · {paper.questionCount as number} questions
                  </div>
                  <div style={{ fontSize: '11px', color: '#64748b', marginBottom: '10px' }}>
                    {formatDate(paper.updatedAt as string)}
                  </div>

                  {/* Action buttons */}
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                    <button
                      onClick={() => handleOpenInBuilder(paper)}
                      style={{ flex: 1, padding: '6px', background: 'rgba(59,130,246,0.15)', border: '1px solid rgba(59,130,246,0.25)', borderRadius: '7px', color: '#60a5fa', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}
                    >
                      ✏️ Edit
                    </button>
                    <button
                      onClick={() => handleExportPdf(paper)}
                      style={{ padding: '6px 8px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '7px', color: '#f87171', fontSize: '12px', cursor: 'pointer' }}
                      title="Download PDF"
                    >
                      🖨️
                    </button>
                    <button
                      onClick={() => handleExportDocx(paper)}
                      style={{ padding: '6px 8px', background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: '7px', color: '#10b981', fontSize: '12px', cursor: 'pointer' }}
                      title="Download DOCX"
                    >
                      📄
                    </button>
                    <button
                      onClick={() => duplicateMutation.mutate(paper.id as string)}
                      style={{ padding: '6px 8px', background: 'transparent', border: '1px solid hsl(217 33% 18%)', borderRadius: '7px', color: '#94a3b8', fontSize: '12px', cursor: 'pointer' }}
                      title="Duplicate"
                    >
                      ⧉
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* PAGINATION */}
      {pagination && pagination.totalPages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '10px', marginTop: '1.5rem' }}>
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            style={{ padding: '7px 16px', background: 'hsl(222 41% 12%)', border: '1px solid hsl(217 33% 18%)', borderRadius: '8px', color: '#94a3b8', fontSize: '13px', cursor: page === 1 ? 'not-allowed' : 'pointer', opacity: page === 1 ? 0.5 : 1 }}
          >
            ← Previous
          </button>
          <span style={{ fontSize: '13px', color: '#64748b' }}>
            Page {page} of {pagination.totalPages} · {pagination.total} papers
          </span>
          <button
            onClick={() => setPage(p => p + 1)}
            disabled={page >= pagination.totalPages}
            style={{ padding: '7px 16px', background: 'hsl(222 41% 12%)', border: '1px solid hsl(217 33% 18%)', borderRadius: '8px', color: '#94a3b8', fontSize: '13px', cursor: !pagination.hasNext ? 'not-allowed' : 'pointer', opacity: !pagination.hasNext ? 0.5 : 1 }}
          >
            Next →
          </button>
        </div>
      )}

      {/* DELETE CONFIRM MODAL */}
      {deleteConfirm && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div style={{ background: 'hsl(222 41% 12%)', border: '1px solid hsl(217 33% 18%)', borderRadius: '16px', padding: '2rem', maxWidth: '360px', width: '90%' }}>
            <div style={{ fontSize: '1.5rem', textAlign: 'center', marginBottom: '12px' }}>🗑️</div>
            <div style={{ fontSize: '16px', fontWeight: 700, color: '#f1f5f9', textAlign: 'center', marginBottom: '8px' }}>Archive Paper?</div>
            <div style={{ fontSize: '13px', color: '#94a3b8', textAlign: 'center', marginBottom: '1.5rem' }}>
              This paper will be archived. You can restore it later from archived papers.
            </div>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                onClick={() => setDeleteConfirm(null)}
                style={{ flex: 1, padding: '10px', background: 'transparent', border: '1px solid hsl(217 33% 18%)', borderRadius: '8px', color: '#94a3b8', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}
              >
                Cancel
              </button>
              <button
                onClick={() => deleteMutation.mutate(deleteConfirm)}
                disabled={deleteMutation.isPending}
                style={{ flex: 1, padding: '10px', background: 'rgba(239,68,68,0.8)', border: 'none', borderRadius: '8px', color: '#fff', fontSize: '13px', fontWeight: 700, cursor: 'pointer' }}
              >
                {deleteMutation.isPending ? 'Archiving...' : 'Archive'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────
// MORE MENU
// ─────────────────────────────────────────

function MoreMenu({ onRename, onDuplicate, onDelete }: {
  onRename: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen(!open)}
        style={{ padding: '5px 8px', background: 'transparent', border: '1px solid hsl(217 33% 18%)', borderRadius: '7px', color: '#64748b', fontSize: '14px', cursor: 'pointer' }}
      >
        ⋯
      </button>
      {open && (
        <>
          <div style={{ position: 'fixed', inset: 0, zIndex: 40 }} onClick={() => setOpen(false)} />
          <div style={{ position: 'absolute', right: 0, top: '100%', marginTop: '4px', background: 'hsl(222 41% 12%)', border: '1px solid hsl(217 33% 18%)', borderRadius: '10px', padding: '4px', zIndex: 50, minWidth: '140px', boxShadow: '0 8px 24px rgba(0,0,0,0.4)' }}>
            {[
              { icon: '✏️', label: 'Rename', action: onRename },
              { icon: '⧉', label: 'Duplicate', action: onDuplicate },
              { icon: '🗑️', label: 'Archive', action: onDelete, danger: true },
            ].map(item => (
              <button
                key={item.label}
                onClick={() => { item.action(); setOpen(false); }}
                style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 10px', background: 'transparent', border: 'none', borderRadius: '7px', color: item.danger ? '#f87171' : '#94a3b8', fontSize: '13px', cursor: 'pointer', textAlign: 'left' }}
              >
                {item.icon} {item.label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}