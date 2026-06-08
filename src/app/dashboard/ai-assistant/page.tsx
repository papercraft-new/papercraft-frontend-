'use client';

import { motion } from 'framer-motion';
import {
  Sparkles,
  Bot,
  Brain,
  Wand2,
  FileText,
  Clock3,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/store/authStore';
import Link from 'next/link';

const UPCOMING_FEATURES = [
  {
    icon: Brain,
    title: 'Smart Paper Analysis',
    description:
      'AI will analyze difficulty balance, marks distribution and question quality.',
  },
  {
    icon: Wand2,
    title: 'Instant Question Generation',
    description:
      'Generate MCQs, long answers, HOTS questions and Bloom taxonomy tags instantly.',
  },
  {
    icon: FileText,
    title: 'Paper Improvement Suggestions',
    description:
      'Get smart suggestions to improve instructions, formatting and structure.',
  },
];

export default function AiAssistantPage() {
  const user = useAuthStore(s => s.user);
  const planType = user?.subscription?.plan?.type ?? 'FREE';
  const hasAccess = planType === 'INSTITUTION';

  if (!hasAccess) {
    return (
      <div className="min-h-[calc(100vh-80px)] flex items-center justify-center px-6">
        <div style={{
          background: 'hsl(222 41% 12%)',
          border: '1px solid rgba(139,92,246,0.3)',
          borderRadius: '20px',
          padding: '48px 36px',
          textAlign: 'center',
          maxWidth: '460px',
          width: '100%',
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
          <Link
            href="/dashboard/billing"
            style={{
              display: 'inline-flex', alignItems: 'center', gap: '8px',
              background: 'linear-gradient(135deg,#7c3aed,#2563eb)',
              color: '#fff', fontWeight: 700, fontSize: '14px',
              padding: '12px 28px', borderRadius: '12px',
              textDecoration: 'none', boxShadow: '0 4px 16px rgba(124,58,237,0.3)',
            }}
          >
            🚀 Upgrade to Institution
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-80px)] bg-gradient-to-br from-background via-background to-muted/30 px-6 py-6 overflow-hidden">
      <div className="max-w-7xl mx-auto h-full">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -15 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6"
        >
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-primary/10 border border-primary/20 shadow-sm">
              <Sparkles className="w-6 h-6 text-primary" />
            </div>

            <div>
              <h1 className="text-3xl font-bold tracking-tight">
                AI Assistant
              </h1>
              <p className="text-muted-foreground text-sm">
                Your intelligent question paper companion
              </p>
            </div>
          </div>
        </motion.div>

        {/* Main Card */}
        <motion.div
          initial={{ opacity: 0, y: 25 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="relative overflow-hidden rounded-[32px] border border-border/50 bg-card/80 backdrop-blur-xl shadow-2xl"
        >
          {/* Glow Effects */}
          <div className="absolute top-0 left-0 w-72 h-72 bg-primary/10 rounded-full blur-[120px]" />
          <div className="absolute bottom-0 right-0 w-72 h-72 bg-cyan-500/10 rounded-full blur-[120px]" />

          <div className="relative z-10 px-8 py-12">
            {/* Hero Section */}
            <div className="flex flex-col items-center text-center">
              <motion.div
                animate={{
                  y: [0, -8, 0],
                }}
                transition={{
                  repeat: Infinity,
                  duration: 3,
                  ease: 'easeInOut',
                }}
                className="relative mb-8"
              >
                <div className="absolute inset-0 rounded-full bg-primary/20 blur-3xl" />

                <div className="relative w-28 h-28 rounded-full bg-gradient-to-br from-primary to-cyan-500 flex items-center justify-center shadow-2xl">
                  <Bot className="w-14 h-14 text-white" />
                </div>
              </motion.div>

              <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-4 py-2 text-sm font-medium text-primary mb-5">
                <Clock3 className="w-4 h-4" />
                Coming Soon
              </div>

              <h2 className="text-4xl font-bold tracking-tight mb-4">
                Meet Your AI Teaching Assistant
              </h2>

              <p className="max-w-2xl text-muted-foreground text-lg leading-relaxed">
                We're building an intelligent AI assistant that helps teachers
                create, improve and analyze question papers in seconds.
              </p>
            </div>

            {/* Features */}
            <div className="grid md:grid-cols-3 gap-5 mt-14">
              {UPCOMING_FEATURES.map((feature, index) => {
                const Icon = feature.icon;

                return (
                  <motion.div
                    key={feature.title}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{
                      delay: index * 0.15,
                    }}
                    whileHover={{
                      y: -6,
                    }}
                    className="group rounded-[28px] border border-border/50 bg-background/60 backdrop-blur-md p-6 transition-all duration-300 hover:border-primary/20 hover:shadow-lg"
                  >
                    <div className="w-14 h-14 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center mb-5 group-hover:scale-110 transition-transform duration-300">
                      <Icon className="w-6 h-6 text-primary" />
                    </div>

                    <h3 className="font-semibold text-lg mb-2">
                      {feature.title}
                    </h3>

                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {feature.description}
                    </p>
                  </motion.div>
                );
              })}
            </div>

            {/* Bottom CTA */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="mt-14 rounded-[28px] border border-primary/20 bg-gradient-to-r from-primary/10 via-primary/5 to-cyan-500/10 p-8 text-center"
            >
              <h3 className="text-xl font-semibold mb-2">
                AI-powered paper creation is on the way 🚀
              </h3>

              <p className="text-muted-foreground mb-5">
                Soon you'll be able to generate questions, improve papers and
                get intelligent recommendations instantly.
              </p>

              <Button
                disabled
                className="rounded-2xl px-6 opacity-90 cursor-not-allowed"
              >
                Launching Soon
              </Button>
            </motion.div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}