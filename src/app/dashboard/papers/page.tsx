'use client';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { papersApi } from '@/lib/api';
import { usePaperStore } from '@/store/paperStore';
import toast from 'react-hot-toast';
import type { ExamDetails, Section } from '@/store/paperStore';

// ─────────────────────────────────────────
// TYPES & HELPERS
// ─────────────────────────────────────────

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
      templateId: fullPaper.templateId || 'tpl_school',
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
    const res = await papersApi.exportDocx(paper.id as string);
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

    const dateStr = ed.date
      ? new Date(ed.date as string).toLocaleDateString('en-IN', {
          day: '2-digit', month: 'long', year: 'numeric',
        })
      : '—';

    const renderOptions = (options: Array<{ label: string; text: string }> | undefined) => {
      if (!options || options.length === 0) return '';
      return `<div class="mcq-options">${options.map(opt =>
        `<div class="mcq-option"><span class="opt-label">(${opt.label})</span><span>${opt.text || '___'}</span></div>`
      ).join('')}</div>`;
    };

    const sectionsHTML = sections.map(section => {
      const marksInfo = section.marksPerQuestion
        ? `(${section.marksPerQuestion} Mark${section.marksPerQuestion > 1 ? 's' : ''} Each)`
        : section.totalMarks ? `[Total: ${section.totalMarks} Marks]` : '';

      const questionsHTML = section.questions.map(q => {
        let answerArea = '';
        if (q.type === 'MCQ') answerArea = renderOptions(q.options);
        else if (q.type === 'TRUE_FALSE') answerArea = `<div class="tf-options"><span><strong>(a)</strong> True</span><span><strong>(b)</strong> False</span></div>`;
        else if (q.type === 'FILL_IN_BLANK') answerArea = '<div class="fill-line"></div>';
        else if (q.type === 'LONG_ANSWER') answerArea = Array(6).fill('<div class="answer-line"></div>').join('');
        else if (q.type === 'DIAGRAM') answerArea = Array(8).fill('<div class="answer-line"></div>').join('');
        else answerArea = Array(2).fill('<div class="answer-line"></div>').join('');

        return `<div class="question">
          <div class="q-row">
            <span class="q-num">${q.number}.</span>
            <span class="q-text">${q.text}</span>
            <span class="q-marks">[${q.marks}]</span>
          </div>${answerArea}
        </div>`;
      }).join('');

      return `<div class="section">
        <div class="section-header">${section.title}${marksInfo ? ` ${marksInfo}` : ''}</div>
        ${section.description ? `<div class="section-desc">${section.description}</div>` : ''}
        ${questionsHTML}
      </div>`;
    }).join('');

    const instructionsHTML = (ed.instructions as string[] | undefined)?.length
      ? `<div class="instructions"><div class="inst-title">General Instructions:</div><ol>${
          (ed.instructions as string[]).map(i => `<li>${i}</li>`).join('')
        }</ol></div><div class="thin-div"></div>`
      : '';

    const css = `*{margin:0;padding:0;box-sizing:border-box}body{font-family:'Times New Roman',serif;font-size:11px;color:#111;background:#fff}.paper-wrap{padding:18mm;width:210mm;margin:0 auto;min-height:297mm}.header{text-align:center;margin-bottom:8px}.inst-name{font-size:16px;font-weight:bold;text-transform:uppercase;letter-spacing:1px;color:#1a2e5a}.thick-div{border-top:2px solid #1a2e5a;margin:7px 0}.thin-div{border-top:1px solid #1a2e5a;margin:5px 0}.meta-table{width:100%;border-collapse:collapse;font-size:10.5px;margin:4px 0}.meta-table td{padding:2px 0}.paper-title{text-align:center;font-size:13px;font-weight:bold;text-transform:uppercase;letter-spacing:2px;color:#1a2e5a;margin:5px 0}.instructions{font-size:10px;margin-bottom:6px}.inst-title{font-weight:bold;text-decoration:underline;margin-bottom:3px}.instructions ol{padding-left:18px;line-height:1.7}.section{margin-bottom:10px}.section-header{text-align:center;border:1px solid #1a2e5a;padding:4px 8px;font-weight:bold;font-size:11px;text-transform:uppercase;color:#1a2e5a;background:#f0f4ff;margin:10px 0 8px}.section-desc{text-align:center;font-size:10px;color:#555;font-style:italic;margin-bottom:6px}.question{margin-bottom:12px;page-break-inside:avoid}.q-row{display:flex;align-items:flex-start;gap:6px}.q-num{font-weight:bold;min-width:22px;flex-shrink:0;padding-top:1px}.q-text{flex:1;line-height:1.6}.q-marks{font-weight:bold;font-size:10px;color:#1a2e5a;min-width:28px;text-align:right;flex-shrink:0;padding-top:1px}.mcq-options{display:grid;grid-template-columns:1fr 1fr;gap:5px 24px;margin-top:6px;margin-left:28px}.mcq-option{display:flex;gap:5px;font-size:10.5px}.opt-label{font-weight:bold;min-width:22px;flex-shrink:0}.tf-options{display:flex;gap:24px;margin-top:5px;margin-left:28px;font-size:10.5px}.fill-line{border-bottom:1px solid #bbb;height:18px;width:60%;margin-left:28px;margin-top:5px}.answer-line{border-bottom:1px solid #ddd;height:18px;margin:4px 0 4px 28px}.sign-table{width:100%;border-collapse:collapse;margin-top:6px}.sign-cell{width:33%;text-align:center;padding:0 12px}.sign-line{border-bottom:1px solid #333;height:22px;margin-bottom:4px}.sign-label{font-size:9px;color:#555}@media print{body{margin:0}.paper-wrap{padding:14mm}.question{page-break-inside:avoid}}`;

    const fullHtml = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${paperTitle}</title>
  <style>${css}</style>
</head>
<body>
  <div class="paper-wrap">
    <div class="header">
      <div class="inst-name">${ed.institutionName || 'Institution Name'}</div>
      ${ed.institutionAddress ? `<div style="font-size:10px;color:#555">${ed.institutionAddress as string}</div>` : ''}
    </div>
    <div class="thick-div"></div>
    <table class="meta-table">
      <tr><td><strong>Subject:</strong> ${ed.subject || '—'}</td><td style="text-align:right"><strong>Date:</strong> ${dateStr}</td></tr>
      <tr><td><strong>Class:</strong> ${ed.class || '—'}</td><td style="text-align:right"><strong>Duration:</strong> ${ed.duration || '3 Hours'}</td></tr>
      <tr><td><strong>Exam:</strong> ${ed.examType || '—'}</td><td style="text-align:right"><strong>Max. Marks:</strong> ${totalMarks || '—'}</td></tr>
    </table>
    <div class="thin-div"></div>
    <div class="paper-title">${ed.examType || 'Question Paper'}</div>
    <div class="thin-div"></div>
    ${instructionsHTML}
    ${sectionsHTML}
  </div>
  <script>
    window.onload = function() { window.print(); };
  </script>
</body>
</html>`;

    // Detect mobile
    const isMobile = /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);

    if (isMobile) {
      // Mobile: download HTML file
      const blob = new Blob([fullHtml], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${(paperTitle).replace(/[^a-z0-9]/gi, '_').toLowerCase()}.html`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success('Downloaded! Open the file and print/save as PDF.', { id: 'pdf-' + paper.id, duration: 4000 });
    } else {
      // Desktop: open and print
      const pw = window.open('', '_blank');
      if (!pw) {
        toast.error('Popup blocked.', { id: 'pdf-' + paper.id });
        return;
      }
      pw.document.write(fullHtml);
      pw.document.close();
      pw.focus();
      setTimeout(() => { pw.print(); pw.close(); }, 600);
      toast.success(`${paperTitle} — PDF ready!`, { id: 'pdf-' + paper.id });
    }

  } catch {
    toast.error('PDF export failed.', { id: 'pdf-' + paper.id });
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
            disabled={!pagination.hasNext}
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