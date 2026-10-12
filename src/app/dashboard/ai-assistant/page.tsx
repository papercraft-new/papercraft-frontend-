'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuthStore } from '@/store/authStore';
import { aiApi, papersApi } from '@/lib/api';
import Link from 'next/link';
import toast from 'react-hot-toast';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  type?: 'chat' | 'generate' | 'enhance' | 'bloom';
  data?: Record<string, unknown>;
}

interface Paper {
  id: string;
  title: string;
  totalMarks: number;
  questionCount: number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const uid = () => Math.random().toString(36).slice(2);

const QUICK_PROMPTS = [
  { icon: '📝', label: 'Generate MCQs', prompt: 'Generate 5 MCQ questions on' },
  { icon: '🔍', label: 'Analyze my paper', prompt: 'analyze' },
  { icon: '🌸', label: 'Bloom\'s Tags', prompt: 'bloom' },
  { icon: '💡', label: 'Improve paper', prompt: 'enhance' },
  { icon: '🧮', label: 'Maths questions', prompt: 'Generate 5 numerical questions on' },
  { icon: '📖', label: 'Long answer Qs', prompt: 'Generate 3 long answer questions on' },
];

function formatTime(d: Date) {
  return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
}

// ─── Locked Screen ────────────────────────────────────────────────────────────

function LockedScreen() {
  return (
    <div className="min-h-[calc(100vh-80px)] flex items-center justify-center px-6">
      <div style={{
        background: 'hsl(222 41% 12%)', border: '1px solid rgba(139,92,246,0.3)',
        borderRadius: '20px', padding: '48px 36px', textAlign: 'center',
        maxWidth: '460px', width: '100%',
      }}>
        <div style={{ fontSize: '3rem', marginBottom: '16px' }}>🤖</div>
        <h2 style={{ color: '#f1f5f9', fontSize: '22px', fontWeight: 800, marginBottom: '10px' }}>
          AI Assistant
        </h2>
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: '6px',
          background: 'rgba(139,92,246,0.15)', border: '1px solid rgba(139,92,246,0.3)',
          borderRadius: '20px', padding: '4px 14px', marginBottom: '16px',
        }}>
          <span style={{ fontSize: '11px', fontWeight: 700, color: '#a78bfa', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            Institution Plan Only
          </span>
        </div>
        <p style={{ color: '#94a3b8', fontSize: '14px', lineHeight: 1.7, marginBottom: '28px' }}>
          The AI Assistant is available exclusively on the <strong style={{ color: '#f1f5f9' }}>Institution plan</strong>.
          Upgrade to unlock smart paper analysis, instant question generation, and improvement suggestions.
        </p>
        <Link href="/dashboard/billing" style={{
          display: 'inline-flex', alignItems: 'center', gap: '8px',
          background: 'linear-gradient(135deg,#7c3aed,#2563eb)',
          color: '#fff', fontWeight: 700, fontSize: '14px',
          padding: '12px 28px', borderRadius: '12px',
          textDecoration: 'none', boxShadow: '0 4px 16px rgba(124,58,237,0.3)',
        }}>
          🚀 Upgrade to Institution
        </Link>
      </div>
    </div>
  );
}

// ─── Message Bubble ───────────────────────────────────────────────────────────

function Bubble({ msg }: { msg: Message }) {
  const isUser = msg.role === 'user';

  // Render enhance/analysis result as cards
  if (!isUser && msg.type === 'enhance' && msg.data) {
    const d = msg.data as {
      suggestions?: Array<{ type: string; severity: string; description: string; fix: string }>;
      overallScore?: number;
      summary?: string;
    };
    return (
      <div style={{ display: 'flex', gap: '10px', marginBottom: '16px' }}>
        <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'linear-gradient(135deg,#7c3aed,#2563eb)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: '14px' }}>🤖</div>
        <div style={{ flex: 1, maxWidth: '80%' }}>
          <div style={{ background: 'hsl(222 41% 14%)', border: '1px solid rgba(139,92,246,0.2)', borderRadius: '14px', padding: '16px', marginBottom: '4px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
              <span style={{ color: '#a78bfa', fontWeight: 700, fontSize: '13px' }}>📊 Paper Analysis</span>
              {d.overallScore && (
                <span style={{ background: d.overallScore >= 80 ? 'rgba(16,185,129,0.15)' : 'rgba(245,158,11,0.15)', color: d.overallScore >= 80 ? '#10b981' : '#f59e0b', fontWeight: 700, fontSize: '12px', padding: '2px 10px', borderRadius: '10px' }}>
                  Score: {d.overallScore}/100
                </span>
              )}
            </div>
            {d.summary && <p style={{ color: '#94a3b8', fontSize: '13px', marginBottom: '12px', lineHeight: 1.6 }}>{d.summary}</p>}
            {d.suggestions?.map((s, i) => (
              <div key={i} style={{ background: 'hsl(222 47% 9%)', borderRadius: '10px', padding: '10px 12px', marginBottom: '8px', borderLeft: `3px solid ${s.severity === 'high' ? '#ef4444' : s.severity === 'medium' ? '#f59e0b' : '#10b981'}` }}>
                <div style={{ color: '#f1f5f9', fontSize: '12px', fontWeight: 600, marginBottom: '4px' }}>{s.description}</div>
                <div style={{ color: '#64748b', fontSize: '11px' }}>💡 {s.fix}</div>
              </div>
            ))}
          </div>
          <div style={{ fontSize: '10px', color: '#475569', paddingLeft: '4px' }}>{formatTime(msg.timestamp)}</div>
        </div>
      </div>
    );
  }

  // Render bloom tags
  if (!isUser && msg.type === 'bloom' && msg.data) {
    const tags = msg.data.tags as Array<{ id: string; bloomLevel: string; difficulty: string; text?: string }>;
    const bloomColors: Record<string, string> = {
      REMEMBER: '#6366f1', UNDERSTAND: '#3b82f6', APPLY: '#06b6d4',
      ANALYZE: '#10b981', EVALUATE: '#f59e0b', CREATE: '#ef4444',
    };
    return (
      <div style={{ display: 'flex', gap: '10px', marginBottom: '16px' }}>
        <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'linear-gradient(135deg,#7c3aed,#2563eb)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: '14px' }}>🤖</div>
        <div style={{ flex: 1, maxWidth: '80%' }}>
          <div style={{ background: 'hsl(222 41% 14%)', border: '1px solid rgba(139,92,246,0.2)', borderRadius: '14px', padding: '16px', marginBottom: '4px' }}>
            <div style={{ color: '#a78bfa', fontWeight: 700, fontSize: '13px', marginBottom: '12px' }}>🌸 Bloom&apos;s Taxonomy Tags</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
              {tags?.map((t, i) => (
                <div key={i} style={{ background: `${bloomColors[t.bloomLevel] || '#6366f1'}20`, border: `1px solid ${bloomColors[t.bloomLevel] || '#6366f1'}40`, borderRadius: '8px', padding: '4px 10px', fontSize: '11px' }}>
                  <span style={{ color: bloomColors[t.bloomLevel] || '#a78bfa', fontWeight: 700 }}>{t.bloomLevel}</span>
                  <span style={{ color: '#64748b', marginLeft: '4px' }}>· {t.difficulty}</span>
                </div>
              ))}
            </div>
          </div>
          <div style={{ fontSize: '10px', color: '#475569', paddingLeft: '4px' }}>{formatTime(msg.timestamp)}</div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', gap: '10px', marginBottom: '14px', flexDirection: isUser ? 'row-reverse' : 'row' }}>
      {!isUser && (
        <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'linear-gradient(135deg,#7c3aed,#2563eb)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: '14px' }}>🤖</div>
      )}
      <div style={{ maxWidth: '88%' }}>
        <div style={{
          background: isUser ? 'linear-gradient(135deg,#2563eb,#7c3aed)' : 'hsl(222 41% 14%)',
          border: isUser ? 'none' : '1px solid rgba(255,255,255,0.06)',
          borderRadius: isUser ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
          padding: '10px 14px',
          color: '#f1f5f9',
          fontSize: '13px',
          lineHeight: 1.65,
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-word',
        }}>
          {msg.content}
        </div>
        <div style={{ fontSize: '10px', color: '#475569', marginTop: '3px', textAlign: isUser ? 'right' : 'left', paddingLeft: isUser ? 0 : '4px', paddingRight: isUser ? '4px' : 0 }}>
          {formatTime(msg.timestamp)}
        </div>
      </div>
    </div>
  );
}

// ─── Typing Indicator ─────────────────────────────────────────────────────────

function TypingIndicator() {
  return (
    <div style={{ display: 'flex', gap: '10px', marginBottom: '14px' }}>
      <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'linear-gradient(135deg,#7c3aed,#2563eb)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: '14px' }}>🤖</div>
      <div style={{ background: 'hsl(222 41% 14%)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '18px 18px 18px 4px', padding: '12px 16px', display: 'flex', gap: '4px', alignItems: 'center' }}>
        {[0, 1, 2].map(i => (
          <motion.div key={i} style={{ width: 6, height: 6, borderRadius: '50%', background: '#7c3aed' }}
            animate={{ y: [0, -5, 0] }} transition={{ repeat: Infinity, duration: 0.8, delay: i * 0.15 }} />
        ))}
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function AiAssistantPage() {
  const user = useAuthStore(s => s.user);
  const planType = user?.subscription?.plan?.type ?? 'FREE';
  const hasAccess = planType === 'INSTITUTION';

  const [messages, setMessages] = useState<Message[]>([{
    id: uid(), role: 'assistant', type: 'chat', timestamp: new Date(),
    content: `Hello ${user?.name?.split(' ')[0] || 'there'}! 👋 I'm your AI teaching assistant.\n\nI can help you:\n• 💬 Answer questions about exam paper creation\n• ✨ Generate MCQ, short answer & long answer questions\n• 📊 Analyze and improve your existing papers\n• 🌸 Tag questions with Bloom's Taxonomy levels\n\nWhat would you like to do today?`,
  }]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [papers, setPapers] = useState<Paper[]>([]);
  const [selectedPaper, setSelectedPaper] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'chat' | 'generate'>('chat');
  const [genForm, setGenForm] = useState({ subject: '', topic: '', count: 5, type: 'MCQ', difficulty: 'MIXED' });
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  if (!hasAccess) return <LockedScreen />;

  // eslint-disable-next-line react-hooks/rules-of-hooks
  useEffect(() => {
    papersApi.list({ limit: 50 }).then(res => {
      const list = res?.data?.data || [];
      setPapers(list);
      if (list.length > 0) setSelectedPaper(list[0].id);
    }).catch(() => {});
  }, []);

  // eslint-disable-next-line react-hooks/rules-of-hooks
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const addMsg = (msg: Omit<Message, 'id' | 'timestamp'>) =>
    setMessages(prev => [...prev, { ...msg, id: uid(), timestamp: new Date() }]);

  const handleChat = async (text?: string) => {
    const msg = (text || input).trim();
    if (!msg || loading) return;
    setInput('');
    addMsg({ role: 'user', content: msg, type: 'chat' });
    setLoading(true);

    // Special commands
    if (msg.toLowerCase() === 'analyze' || msg.toLowerCase().includes('analyze my paper')) {
      if (!selectedPaper) {
        addMsg({ role: 'assistant', content: 'Please select a paper from the dropdown above first.', type: 'chat' });
        setLoading(false); return;
      }
      try {
        await handleEnhance();
      } catch {
        addMsg({ role: 'assistant', content: 'Analysis failed. Please try again.', type: 'chat' });
      }
      setLoading(false); return;
    }

    if (msg.toLowerCase() === 'bloom' || msg.toLowerCase().includes("bloom's")) {
      addMsg({ role: 'assistant', content: 'To tag questions with Bloom\'s taxonomy, use the **Generate** tab and I\'ll tag them automatically. Or paste your questions and I\'ll tag them.\n\nFor existing papers, type: "tag questions from my paper"', type: 'chat' });
      setLoading(false); return;
    }

    try {
      const history = messages.slice(-8).map(m => ({ role: m.role, content: m.content || JSON.stringify(m.data || '') }));
      const res = await aiApi.chat(msg, history, selectedPaper || undefined) as { data: { data: { reply: string } } };
      addMsg({ role: 'assistant', content: res.data.data.reply || 'I couldn\'t generate a response. Please try again.', type: 'chat' });
    } catch {
      addMsg({ role: 'assistant', content: 'Something went wrong. Please try again in a moment.', type: 'chat' });
    }
    setLoading(false);
  };

  const handleGenerate = async () => {
    if (!genForm.subject || !genForm.topic) { toast.error('Enter subject and topic first.'); return; }
    setLoading(true);
    addMsg({ role: 'user', content: `Generate ${genForm.count} ${genForm.type.replace('_', ' ')} questions on "${genForm.topic}" (${genForm.subject}) — ${genForm.difficulty} difficulty`, type: 'generate' });
    try {
      const res = await aiApi.generateQuestions({
        subject: genForm.subject,
        topic: genForm.topic,
        count: genForm.count,
        type: genForm.type,
        difficulty: genForm.difficulty === 'MIXED' ? undefined : genForm.difficulty,
      }) as { data: { data: { questions: Array<{ text: string; options?: Array<{ label: string; text: string }>; answer?: string }> } } };
      const qs = res.data.data.questions || [];
      if (qs.length === 0) { addMsg({ role: 'assistant', content: 'No questions generated. Try again.', type: 'chat' }); setLoading(false); return; }
      const nl = String.fromCharCode(10);
      const formatted = qs.map((q: {text:string;options?:Array<{label:string;text:string}>;answer?:string}, i: number) => {
        let out = (i + 1) + '. ' + q.text;
        if (q.options?.length) out += nl + q.options.map((o:{label:string;text:string}) => '   (' + o.label + ') ' + o.text).join(nl);
        if (q.answer) out += nl + '   Answer: ' + q.answer;
        return out;
      }).join(nl + nl);
      addMsg({ role: 'assistant', content: 'Here are ' + qs.length + ' questions:' + nl + nl + formatted, type: 'generate' });
    } catch {
      addMsg({ role: 'assistant', content: 'Question generation failed. Please try again.', type: 'chat' });
    }
    setLoading(false);
    setActiveTab('chat');
  };

  const handleEnhance = async () => {
    if (!selectedPaper) { toast.error('Select a paper to analyze.'); return; }
    setLoading(true);
    addMsg({ role: 'user', content: `Analyze and improve the paper: ${papers.find(p => p.id === selectedPaper)?.title || 'selected paper'}`, type: 'enhance' });
    try {
      const res = await aiApi.enhancePaper(selectedPaper) as { data: { success: boolean; data: Record<string, unknown> } };
      if (res.data.success) addMsg({ role: 'assistant', type: 'enhance', content: '', data: res.data.data });
      else addMsg({ role: 'assistant', content: 'Analysis failed. Please try again.', type: 'chat' });
    } catch {
      addMsg({ role: 'assistant', content: 'Analysis failed. Please try again.', type: 'chat' });
    }
    setLoading(false);
  };

  const border = '1px solid hsl(217 33% 18%)';
  const card = 'hsl(222 41% 12%)';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100dvh - 64px)', background: 'hsl(222 47% 7%)', overflow: 'hidden' }}>

      {/* ── TOP BAR ── */}
      <div style={{ background: card, borderBottom: border, padding: '8px 12px', display: 'flex', flexDirection: 'column', gap: '8px', flexShrink: 0 }}>
        {/* Row 1: title + online badge */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ width: 30, height: 30, borderRadius: '8px', background: 'linear-gradient(135deg,#7c3aed,#2563eb)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', flexShrink: 0 }}>🤖</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ color: '#f1f5f9', fontWeight: 700, fontSize: '13px', lineHeight: 1 }}>AI Assistant</div>
            <div style={{ color: '#10b981', fontSize: '10px', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#10b981', display: 'inline-block' }} />
              Online · Institution Plan
            </div>
          </div>
        </div>
        {/* Row 2: paper selector + analyze button — full width on mobile */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ fontSize: '11px', color: '#64748b', whiteSpace: 'nowrap', flexShrink: 0 }}>Paper:</span>
          <select
            value={selectedPaper}
            onChange={e => setSelectedPaper(e.target.value)}
            style={{ flex: 1, minWidth: 0, background: 'hsl(222 47% 9%)', border, color: papers.length === 0 ? '#64748b' : '#f1f5f9', borderRadius: '8px', padding: '6px 8px', fontSize: '12px' }}
          >
            <option value="">{papers.length === 0 ? 'No papers yet' : '— Select paper —'}</option>
            {papers.map(p => <option key={p.id} value={p.id}>{p.title}</option>)}
          </select>
          <button
            onClick={handleEnhance}
            disabled={loading || !selectedPaper}
            style={{
              background: selectedPaper ? 'rgba(139,92,246,0.15)' : 'rgba(100,116,139,0.1)',
              border: '1px solid ' + (selectedPaper ? 'rgba(139,92,246,0.3)' : 'rgba(100,116,139,0.2)'),
              color: selectedPaper ? '#a78bfa' : '#475569',
              borderRadius: '8px', padding: '6px 10px', fontSize: '12px',
              fontWeight: 600, cursor: selectedPaper ? 'pointer' : 'not-allowed', whiteSpace: 'nowrap', flexShrink: 0,
            }}
          >
            📊 Analyze
          </button>
        </div>
      </div>

      {/* ── TABS ── */}
      <div style={{ background: card, borderBottom: border, padding: '0 16px', display: 'flex', gap: '0', flexShrink: 0 }}>
        {(['chat', 'generate'] as const).map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)} style={{
            background: 'transparent', border: 'none', borderBottom: activeTab === tab ? '2px solid #7c3aed' : '2px solid transparent',
            color: activeTab === tab ? '#a78bfa' : '#64748b', padding: '10px 16px', fontSize: '13px', fontWeight: 600, cursor: 'pointer', transition: 'all 0.15s',
          }}>
            {tab === 'chat' ? '💬 Chat' : '✨ Generate Questions'}
          </button>
        ))}
      </div>

      {/* ── GENERATE FORM ── */}
      <AnimatePresence>
        {activeTab === 'generate' && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
            style={{ background: 'hsl(222 41% 10%)', borderBottom: border, padding: '14px 16px', flexShrink: 0, overflow: 'hidden' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px' }}>
              <input placeholder="Subject (e.g. Physics)" value={genForm.subject} onChange={e => setGenForm(f => ({ ...f, subject: e.target.value }))}
                style={{ background: 'hsl(222 47% 9%)', border, color: '#f1f5f9', borderRadius: '8px', padding: '7px 10px', fontSize: '12px' }} />
              <input placeholder="Topic (e.g. Newton's Laws)" value={genForm.topic} onChange={e => setGenForm(f => ({ ...f, topic: e.target.value }))}
                style={{ background: 'hsl(222 47% 9%)', border, color: '#f1f5f9', borderRadius: '8px', padding: '7px 10px', fontSize: '12px' }} />
              <select value={genForm.type} onChange={e => setGenForm(f => ({ ...f, type: e.target.value }))}
                style={{ background: 'hsl(222 47% 9%)', border, color: '#f1f5f9', borderRadius: '8px', padding: '7px 10px', fontSize: '12px' }}>
                {['MCQ', 'SHORT_ANSWER', 'LONG_ANSWER', 'FILL_IN_BLANK', 'TRUE_FALSE', 'NUMERICAL'].map(t => (
                  <option key={t} value={t}>{t.replace('_', ' ')}</option>
                ))}
              </select>
              <select value={genForm.difficulty} onChange={e => setGenForm(f => ({ ...f, difficulty: e.target.value }))}
                style={{ background: 'hsl(222 47% 9%)', border, color: '#f1f5f9', borderRadius: '8px', padding: '7px 10px', fontSize: '12px' }}>
                {['EASY', 'MEDIUM', 'HARD', 'MIXED'].map(d => <option key={d} value={d}>{d}</option>)}
              </select>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <input type="number" min={1} max={20} value={genForm.count} onChange={e => setGenForm(f => ({ ...f, count: +e.target.value }))}
                  style={{ background: 'hsl(222 47% 9%)', border, color: '#f1f5f9', borderRadius: '8px', padding: '7px 10px', fontSize: '12px', width: '60px' }} />
                <span style={{ fontSize: '11px', color: '#64748b' }}>questions</span>
              </div>
              <button onClick={handleGenerate} disabled={loading}
                style={{ background: 'linear-gradient(135deg,#7c3aed,#2563eb)', border: 'none', color: '#fff', borderRadius: '8px', padding: '7px 14px', fontSize: '12px', fontWeight: 700, cursor: 'pointer', opacity: loading ? 0.6 : 1 }}>
                {loading ? '⏳ Generating...' : '✨ Generate'}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── MESSAGES ── */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '12px 10px' }}>
        {messages.map(msg => <Bubble key={msg.id} msg={msg} />)}
        {loading && <TypingIndicator />}
        <div ref={bottomRef} />
      </div>

      {/* ── QUICK PROMPTS ── */}
      {messages.length <= 1 && !loading && (
        <div style={{ padding: '0 10px 8px', display: 'flex', gap: '6px', overflowX: 'auto', flexShrink: 0, WebkitOverflowScrolling: 'touch' as 'touch', scrollbarWidth: 'none' as 'none' }}>
          {QUICK_PROMPTS.map(qp => (
            <button key={qp.label} onClick={() => {
              if (qp.prompt === 'analyze') handleEnhance();
              else if (qp.prompt === 'bloom') handleChat("bloom's taxonomy");
              else if (qp.prompt === 'enhance') handleEnhance();
              else setInput(qp.prompt + ' ');
            }}
              style={{ background: 'hsl(222 41% 14%)', border, color: '#94a3b8', borderRadius: '20px', padding: '5px 12px', fontSize: '11px', fontWeight: 500, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', transition: 'all 0.15s', whiteSpace: 'nowrap' }}>
              {qp.icon} {qp.label}
            </button>
          ))}
        </div>
      )}

      {/* ── INPUT BAR ── */}
      <div style={{ background: card, borderTop: border, padding: '8px 10px', display: 'flex', gap: '6px', alignItems: 'flex-end', flexShrink: 0 }}>
        <textarea
          ref={inputRef}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleChat(); } }}
          placeholder="Ask anything... (Enter to send)"
          rows={1}
          style={{
            flex: 1, background: 'hsl(222 47% 9%)', border, color: '#f1f5f9', borderRadius: '12px',
            padding: '10px 14px', fontSize: '13px', resize: 'none', outline: 'none',
            maxHeight: '120px', lineHeight: 1.5, fontFamily: 'inherit',
          }}
        />
        <button
          onClick={() => handleChat()}
          disabled={loading || !input.trim()}
          style={{
            width: 40, height: 40, borderRadius: '10px', flexShrink: 0,
            background: loading || !input.trim() ? 'hsl(222 41% 18%)' : 'linear-gradient(135deg,#7c3aed,#2563eb)',
            border: 'none', cursor: loading || !input.trim() ? 'not-allowed' : 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px',
            transition: 'all 0.15s',
          }}
        >
          {loading ? '⏳' : '➤'}
        </button>
      </div>
    </div>
  );
}