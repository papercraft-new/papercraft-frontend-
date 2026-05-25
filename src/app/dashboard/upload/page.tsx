'use client';
import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CloudUpload, FileImage, FileText, CheckCircle2, AlertCircle,
  Wand2, ChevronRight, Loader2, X, Eye, Plus, Files,
} from 'lucide-react';
import { ocrApi } from '@/lib/api';
import { usePaperStore } from '@/store/paperStore';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import toast from 'react-hot-toast';
import type { Section } from '@/store/paperStore';

type StepStatus = 'wait' | 'active' | 'done' | 'error';
type FileStatus  = 'queued' | 'processing' | 'done' | 'error';

interface ProcessStep {
  id: string;
  label: string;
  description: string;
  status: StepStatus;
}

interface UploadedFileItem {
  file: File;
  status: FileStatus;
  questionsFound?: number;
  error?: string;
}

const initialSteps: ProcessStep[] = [
  { id: 'extract',   label: 'Text Extraction',     description: 'Reading content from your files...',         status: 'wait' },
  { id: 'cleanup',   label: 'AI Grammar Cleanup',   description: 'Fixing spelling and formatting...',          status: 'wait' },
  { id: 'structure', label: 'Question Detection',   description: 'Detecting question numbers and sections...', status: 'wait' },
  { id: 'marks',     label: 'Marks Allocation',     description: 'Detecting marks per question...',            status: 'wait' },
  { id: 'finalize',  label: 'Structure Generation', description: 'Building your question paper structure...',  status: 'wait' },
];

const MAX_FILES = 10;

export default function UploadPage() {
  const router = useRouter();
  const [rawText, setRawText]           = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [steps, setSteps]               = useState<ProcessStep[]>(initialSteps);
  const [fileItems, setFileItems]       = useState<UploadedFileItem[]>([]);
  const [result, setResult]             = useState<{
    questionsFound: number;
    sectionsFound: number;
    filesSucceeded: number;
    filesFailed: number;
  } | null>(null);
  const [activeTab, setActiveTab] = useState<'file' | 'text'>('file');

  const { loadFromOcr } = usePaperStore();

  // ─── helpers ───────────────────────────────────────────────────────────

  const setStepStatus = (stepId: string, status: StepStatus) =>
    setSteps(prev => prev.map(s => s.id === stepId ? { ...s, status } : s));

  const removeFile = (index: number) => {
    if (isProcessing) return;
    setFileItems(prev => {
      const next = prev.filter((_, i) => i !== index);
      if (next.length === 0) { setResult(null); setSteps(initialSteps); }
      return next;
    });
  };

  // ─── progress + API ────────────────────────────────────────────────────

  const simulateProgress = async (
    processFn: () => Promise<{
      sections: Section[];
      questionsFound: number;
      sectionsFound: number;
      filesSucceeded?: number;
      filesFailed?: number;
      results?: Array<{ filename: string; success: boolean; questionsFound: number; error?: string }>;
    }>
  ) => {
    setIsProcessing(true);
    setResult(null);
    setSteps(initialSteps.map(s => ({ ...s, status: 'wait' })));

    const stepIds = initialSteps.map(s => s.id);
    let idx = 0;
    const advance = () => {
      if (idx > 0) setStepStatus(stepIds[idx - 1], 'done');
      if (idx < stepIds.length) { setStepStatus(stepIds[idx], 'active'); idx++; }
    };
    advance();
    const timers = [800, 1200, 1400, 1000].map((d, i) => setTimeout(advance, d * (i + 1)));

    try {
      const data = await processFn();
      timers.forEach(clearTimeout);
      setSteps(initialSteps.map(s => ({ ...s, status: 'done' })));

      if (data.results) {
        setFileItems(prev => prev.map(item => {
          const m = data.results!.find(r => r.filename === item.file.name);
          if (!m) return item;
          return m.success
            ? { ...item, status: 'done',  questionsFound: m.questionsFound }
            : { ...item, status: 'error', error: m.error };
        }));
      }

      setResult({
        questionsFound: data.questionsFound,
        sectionsFound:  data.sectionsFound,
        filesSucceeded: data.filesSucceeded ?? 1,
        filesFailed:    data.filesFailed    ?? 0,
      });
      loadFromOcr(data.sections);

      const msg = data.filesFailed
        ? `Extracted ${data.questionsFound} questions (${data.filesFailed} file(s) failed)`
        : `Extracted ${data.questionsFound} questions from ${data.sectionsFound} sections!`;
      data.filesFailed ? toast.error(msg) : toast.success(msg);

    } catch (err: unknown) {
      timers.forEach(clearTimeout);
      const msg = err instanceof Error ? err.message : 'Processing failed';
      setSteps(prev => prev.map(s => s.status === 'active' ? { ...s, status: 'error' } : s));
      setFileItems(prev => prev.map(f => ({ ...f, status: 'error', error: msg })));
      toast.error(msg);
    } finally {
      setIsProcessing(false);
    }
  };

  const processFiles = async (files: File[]) => {
    setFileItems(files.map(f => ({ file: f, status: 'processing' })));
    await simulateProgress(async () => {
      if (files.length === 1) {
        const res = await ocrApi.uploadFile(files[0]);
        const d = res.data.data;
        return { ...d, filesSucceeded: 1, filesFailed: 0,
          results: [{ filename: files[0].name, success: true, questionsFound: d.questionsFound }] };
      }
      const res = await ocrApi.uploadMultipleFiles(files);
      return res.data.data;
    });
  };

  const processText = async () => {
    if (!rawText.trim() || rawText.trim().length < 10) {
      toast.error('Please paste at least 10 characters of question text.');
      return;
    }
    await simulateProgress(async () => {
      const res = await ocrApi.processText(rawText);
      return { ...res.data.data, filesSucceeded: 1, filesFailed: 0 };
    });
  };

  // ─── dropzone ──────────────────────────────────────────────────────────
  //
  // IMPORTANT: onDrop just queues files into state.
  // Processing is triggered by the explicit "Process X files" button.
  // This lets the user review and remove files before sending.

  const onDrop = useCallback((accepted: File[]) => {
    if (!accepted.length) return;
    setFileItems(prev => {
      const existing = new Set(prev.map(f => f.file.name));
      const fresh: UploadedFileItem[] = accepted
        .filter(f => !existing.has(f.name))
        .map(f => ({ file: f, status: 'queued' as FileStatus }));
      return [...prev, ...fresh].slice(0, MAX_FILES);
    });
  }, []);

  // multiple:true makes react-dropzone add the `multiple` attribute to the
  // hidden <input type="file">, which is what the OS file picker reads.
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*':         ['.jpg', '.jpeg', '.png', '.tiff', '.webp', '.heic'],
      'application/pdf': ['.pdf'],
    },
    maxFiles: MAX_FILES,
    maxSize:  50 * 1024 * 1024,
    disabled: isProcessing,
    multiple: true,
  });

  // ─── icon helpers ───────────────────────────────────────────────────────

  const stepIcon = (s: StepStatus) => {
    if (s === 'done')   return <CheckCircle2 className="w-3.5 h-3.5 text-green-400" />;
    if (s === 'active') return <Loader2 className="w-3.5 h-3.5 text-primary animate-spin" />;
    if (s === 'error')  return <AlertCircle className="w-3.5 h-3.5 text-red-400" />;
    return <div className="w-2 h-2 rounded-full bg-muted-foreground/30" />;
  };

  // Lucide icons don't accept a `title` prop — wrap in <span> for tooltip
  const fileStatusIcon = (status: FileStatus, error?: string) => {
    if (status === 'done')
      return <CheckCircle2 className="w-4 h-4 text-green-400 flex-shrink-0" />;
    if (status === 'processing')
      return <Loader2 className="w-4 h-4 text-primary animate-spin flex-shrink-0" />;
    if (status === 'error')
      return (
        <span title={error} className="flex-shrink-0 leading-none">
          <AlertCircle className="w-4 h-4 text-red-400" />
        </span>
      );
    return <div className="w-4 h-4 rounded-full border-2 border-muted-foreground/30 flex-shrink-0" />;
  };

  const hasFiles   = fileItems.length > 0;
  const canProcess = hasFiles && !isProcessing && !result;

  // ─── render ─────────────────────────────────────────────────────────────

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-1">Upload &amp; OCR</h1>
        <p className="text-muted-foreground text-sm">
          Upload handwritten images, scanned PDFs, or paste raw question text.
          Select <strong>up to {MAX_FILES} files</strong> at once — they will be merged into one paper.
        </p>
      </div>

      {/* TABS */}
      <div className="flex gap-1 rounded-xl bg-slate-100 p-1 mb-6 w-fit dark:bg-slate-800">
  {(['file', 'text'] as const).map((tab) => (
    <button
      key={tab}
      onClick={() => setActiveTab(tab)}
      className={cn(
        'px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-200',
        activeTab === tab
          ? 'bg-blue-600 text-white shadow-sm hover:bg-blue-700'
          : 'text-slate-600 hover:bg-slate-200 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-700 dark:hover:text-white'
      )}
    >
      {tab === 'file' ? '📁 Upload Files' : '📝 Paste Text'}
    </button>
  ))}
</div>
      <div className="space-y-4">

        {/* ── FILE UPLOAD ─────────────────────────────────────────────────── */}
        {activeTab === 'file' && (
          <Card>
            <CardContent className="p-4 space-y-4">

              {/* Drop zone — always visible so user can keep adding files */}
              <div
                {...getRootProps()}
                className={cn(
                  'upload-zone',
                  isDragActive && 'drag-over',
                  isProcessing && 'opacity-50 pointer-events-none',
                )}
              >
                <input {...getInputProps()} />
                <div className="flex flex-col items-center gap-3">
                  <CloudUpload className="w-12 h-12 text-primary/60" />
                  <div className="text-center">
                    <p className="font-semibold text-foreground">
                      {isDragActive ? 'Drop them here!'
                        : hasFiles  ? 'Drop more files or click to add'
                                    : 'Drop files here or click to browse'}
                    </p>
                    <p className="text-sm text-muted-foreground mt-1">
                      Up to {MAX_FILES} files · JPG, PNG, PDF, TIFF, HEIC · 50 MB each
                    </p>
                  </div>
                  <div className="flex gap-2 flex-wrap justify-center">
                    {['JPG', 'PNG', 'PDF', 'TIFF', 'HEIC'].map(fmt => (
                      <span key={fmt} className="text-[11px] font-semibold px-2 py-0.5 bg-muted border border-border rounded-md text-muted-foreground">
                        {fmt}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* File list */}
              <AnimatePresence>
                {hasFiles && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="space-y-2"
                  >
                    {/* list header */}
                    <div className="flex items-center justify-between">
                      <p className="text-[12px] font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
                        <Files className="w-3.5 h-3.5" />
                        {fileItems.length} / {MAX_FILES} files selected
                      </p>
                      {!isProcessing && (
                        <button
                          onClick={() => { setFileItems([]); setResult(null); setSteps(initialSteps); }}
                          className="text-[11px] text-muted-foreground hover:text-red-400 transition-colors"
                        >
                          Clear all
                        </button>
                      )}
                    </div>

                    {/* individual file rows */}
                    <div className="rounded-xl border border-border overflow-hidden divide-y divide-border">
                      {fileItems.map((item, i) => (
                        <motion.div
                          key={`${item.file.name}-${i}`}
                          initial={{ opacity: 0, x: -8 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: i * 0.04 }}
                          className={cn(
                            'flex items-center gap-3 px-3 py-2.5',
                            item.status === 'done'       && 'bg-green-500/5',
                            item.status === 'error'      && 'bg-red-500/5',
                            item.status === 'processing' && 'bg-primary/5',
                          )}
                        >
                          <div className="w-8 h-8 bg-muted rounded-lg flex items-center justify-center flex-shrink-0">
                            {item.file.type.includes('pdf')
                              ? <FileText  className="w-4 h-4 text-primary" />
                              : <FileImage className="w-4 h-4 text-primary" />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-[13px] font-medium truncate">{item.file.name}</p>
                            <p className="text-[11px] text-muted-foreground">
                              {(item.file.size / 1024).toFixed(0)} KB
                              {item.status === 'done'  && item.questionsFound !== undefined && (
                                <span className="text-green-400 ml-2">· {item.questionsFound} questions</span>
                              )}
                              {item.status === 'error' && item.error && (
                                <span className="text-red-400 ml-2">· {item.error}</span>
                              )}
                            </p>
                          </div>
                          {fileStatusIcon(item.status, item.error)}
                          {!isProcessing && (
                            <button onClick={() => removeFile(i)} className="ml-1 text-muted-foreground hover:text-red-400 transition-colors">
                              <X className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </motion.div>
                      ))}
                    </div>

                    {/* process button */}
                    {!result && (
                      <Button
                        onClick={() => processFiles(fileItems.map(f => f.file))}
                        disabled={!canProcess}
                        className="btn-gradient w-full gap-2"
                      >
                        {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4" />}
                        {isProcessing
                          ? 'Processing...'
                          : `Process ${fileItems.length} file${fileItems.length !== 1 ? 's' : ''} with AI`}
                      </Button>
                    )}

                    {/* add-more strip after completed run */}
                    {result && fileItems.length < MAX_FILES && !isProcessing && (
                      <div
                        {...getRootProps()}
                        className="flex items-center justify-center gap-2 py-2.5 rounded-xl border border-dashed border-border text-sm text-muted-foreground hover:border-primary/40 hover:text-primary cursor-pointer transition-colors"
                      >
                        <input {...getInputProps()} />
                        <Plus className="w-4 h-4" /> Add more files
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>

            </CardContent>
          </Card>
        )}

        {/* ── TEXT INPUT ───────────────────────────────────────────────────── */}
        {activeTab === 'text' && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-[14px]">Paste Your Questions</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <Textarea
                value={rawText}
                onChange={e => setRawText(e.target.value)}
                placeholder={`Paste your questions here...\n\nExample:\n1. What is Newton's first law of motion? (5 marks)\n2. Define velocity and acceleration. (3 marks)\nSECTION B\n3. Explain the difference between mass and weight.`}
                className="min-h-[200px] font-mono text-sm resize-y"
                disabled={isProcessing}
              />
              <div className="flex items-center justify-between mt-3">
                <span className="text-[11px] text-muted-foreground">{rawText.length} characters</span>
                <Button
                  onClick={processText}
                  disabled={isProcessing || rawText.trim().length < 10}
                  className="btn-gradient gap-2"
                >
                  {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4" />}
                  Process with AI
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* ── PROCESSING STEPS ─────────────────────────────────────────────── */}
        <AnimatePresence>
          {(isProcessing || result) && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-[14px] flex items-center gap-2">
                    <Wand2 className="w-4 h-4 text-primary" />
                    AI Processing Pipeline
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2.5">
                  {steps.map(step => (
                    <div
                      key={step.id}
                      className={cn(
                        'flex items-center gap-3 p-3 rounded-xl border transition-all',
                        step.status === 'active' && 'bg-primary/5 border-primary/20',
                        step.status === 'done'   && 'bg-green-500/5 border-green-500/15',
                        step.status === 'error'  && 'bg-red-500/5 border-red-500/15',
                        step.status === 'wait'   && 'bg-muted/30 border-border/30',
                      )}
                    >
                      <div className="w-6 h-6 flex items-center justify-center flex-shrink-0">
                        {stepIcon(step.status)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={cn(
                          'text-[13px] font-medium',
                          step.status === 'done'   && 'text-green-400',
                          step.status === 'active' && 'text-primary',
                          step.status === 'error'  && 'text-red-400',
                          step.status === 'wait'   && 'text-muted-foreground',
                        )}>
                          {step.label}
                        </p>
                        {step.status === 'active' && (
                          <p className="text-[11px] text-muted-foreground">{step.description}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>

              {result && (
                <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="mt-3">
                  <Card className={cn('border', result.filesFailed > 0 ? 'border-yellow-500/30 bg-yellow-500/5' : 'border-green-500/30 bg-green-500/5')}>
                    <CardContent className="p-4 flex items-center gap-4">
                      <CheckCircle2 className={cn('w-8 h-8 flex-shrink-0', result.filesFailed > 0 ? 'text-yellow-400' : 'text-green-400')} />
                      <div className="flex-1">
                        <p className={cn('font-semibold text-[14px]', result.filesFailed > 0 ? 'text-yellow-400' : 'text-green-400')}>
                          {result.filesFailed > 0 ? 'Partially Complete' : 'Processing Complete!'}
                        </p>
                        <p className="text-[12px] text-muted-foreground mt-0.5">
                          Extracted <strong className="text-foreground">{result.questionsFound} questions</strong> across{' '}
                          <strong className="text-foreground">{result.sectionsFound} sections</strong>
                          {result.filesSucceeded > 1 && <> from <strong className="text-foreground">{result.filesSucceeded} files</strong></>}
                          {result.filesFailed > 0 && (
                            <span className="text-red-400"> · {result.filesFailed} file{result.filesFailed !== 1 ? 's' : ''} failed</span>
                          )}
                          . Ready to edit in Paper Builder.
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" onClick={() => router.push('/dashboard/builder')} className="gap-1.5">
                          <Eye className="w-3.5 h-3.5" /> Preview
                        </Button>
                        <Button size="sm" className="btn-gradient gap-1.5" onClick={() => router.push('/dashboard/builder')}>
                          Open Builder <ChevronRight className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── TIPS ─────────────────────────────────────────────────────────── */}
        {!isProcessing && !result && (
          <Card className="bg-muted/30 border-dashed">
            <CardContent className="p-4">
              <p className="text-[12px] font-semibold text-muted-foreground mb-2 uppercase tracking-wide">Tips for best results</p>
              <ul className="text-[12px] text-muted-foreground space-y-1.5">
                <li>📸 Use good lighting when photographing handwritten notes</li>
                <li>📄 Keep paper flat and avoid shadows or creases in photos</li>
                <li>📚 Upload multiple pages at once — they will be merged into one paper</li>
                <li>✍️ For typed text, our AI handles any format — numbered, bulleted, sectioned</li>
                <li>🔢 Include marks in brackets like [5] or (3 marks) for auto-allocation</li>
              </ul>
            </CardContent>
          </Card>
        )}

      </div>
    </div>
  );
}