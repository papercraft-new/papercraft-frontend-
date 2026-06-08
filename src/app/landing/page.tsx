'use client';
import { useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  FileSpreadsheet, Sparkles, Upload, Edit3, Download,
  Check, ChevronDown, ArrowRight, Star, Zap, Shield,
  Brain, LayoutTemplate, Clock, Users, FileText,
} from 'lucide-react';

// ─────────────────────────────────────────
// NAVIGATION
// ─────────────────────────────────────────

function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border/50">
      <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
        {/* Logo */}
        <div className="flex items-center gap-2.5">
          <img src="/logo.png" alt="Paptrix" style={{ width: 32, height: 32, objectFit: "contain" }} />
          <span className="font-bold text-[17px]">Paptrix</span>
        </div>

        {/* Desktop Links */}
        <div className="hidden md:flex items-center gap-6">
          <a href="#features" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Features</a>
          <a href="#how-it-works" className="text-sm text-muted-foreground hover:text-foreground transition-colors">How it Works</a>
          <a href="#pricing" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Pricing</a>
          <a href="#faq" className="text-sm text-muted-foreground hover:text-foreground transition-colors">FAQ</a>
        </div>

        {/* CTA Buttons */}
        <div className="flex items-center gap-3">
          <Link
            href="/auth/login"
            className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors hidden md:block"
          >
            Sign In
          </Link>
          <Link
            href="/auth/register"
            className="px-4 py-2 bg-gradient-to-r from-blue-600 to-cyan-600 text-white text-sm font-semibold rounded-lg hover:from-blue-500 hover:to-cyan-500 transition-all hover:-translate-y-0.5 shadow-lg shadow-blue-500/20"
          >
            Get Started Free
          </Link>
        </div>
      </div>
    </nav>
  );
}

// ─────────────────────────────────────────
// HERO
// ─────────────────────────────────────────

function Hero() {
  return (
    <section className="min-h-screen flex items-center justify-center pt-16 px-6 relative overflow-hidden">
      {/* Background orbs */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute w-[600px] h-[600px] bg-blue-600/20 rounded-full blur-[120px] -top-32 -left-32" />
        <div className="absolute w-[400px] h-[400px] bg-cyan-500/15 rounded-full blur-[100px] bottom-0 right-0" />
        <div className="absolute w-[300px] h-[300px] bg-violet-600/10 rounded-full blur-[80px] top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
      </div>

      <div className="max-w-4xl mx-auto text-center relative z-10">
        {/* Badge */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          
        </motion.div>

        {/* Headline */}
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="text-5xl md:text-6xl lg:text-7xl font-extrabold leading-[1.1] mb-6 tracking-tight"
        >
          Turn Handwritten Notes Into{' '}
          <span className="bg-gradient-to-r from-blue-400 via-cyan-400 to-blue-300 bg-clip-text text-transparent">
            Professional Question Papers
          </span>
        </motion.h1>

        {/* Subtitle */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-10 leading-relaxed"
        >
          Upload images, scanned PDFs, or paste raw text. Our AI extracts, formats, and generates
          DTP-quality exam papers ready to print in under 30 seconds.
        </motion.p>

        {/* CTA Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="flex flex-col sm:flex-row gap-4 justify-center mb-16"
        >
          <Link
            href="/auth/register"
            className="flex items-center justify-center gap-2 px-8 py-4 bg-gradient-to-r from-blue-600 to-cyan-600 text-white font-semibold rounded-xl hover:from-blue-500 hover:to-cyan-500 transition-all hover:-translate-y-0.5 text-base shadow-xl shadow-blue-500/25"
          >
            <Zap className="w-5 h-5" />
            Start Creating Free
          </Link>
          <a
            href="#how-it-works"
            className="flex items-center justify-center gap-2 px-8 py-4 bg-secondary border border-border text-foreground font-semibold rounded-xl hover:bg-secondary/80 transition-all text-base"
          >
            See How It Works
            <ArrowRight className="w-4 h-4" />
          </a>
        </motion.div>

        {/* Stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
          className="flex flex-wrap justify-center gap-8 md:gap-16"
        >
          {[
           { num: '24/7', label: 'AI Support' },
           { num: '10x', label: 'Faster Workflow' },
            { num: '90%', label: 'OCR Accuracy' },
            { num: '30s', label: 'Avg Generation' },
          ].map((s) => (
            <div key={s.label} className="text-center">
              <div className="text-2xl md:text-3xl font-extrabold text-blue-400">{s.num}</div>
              <div className="text-xs text-muted-foreground uppercase tracking-wider mt-1">{s.label}</div>
            </div>
          ))}
        </motion.div>

        {/* ── URGENCY STRIP ── */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="mt-6 mb-2 flex flex-wrap items-center justify-center gap-3"
        >
          
          <div className="text-xs text-muted-foreground">· Free plan · No credit card</div>
        </motion.div>

        {/* ── TRUSTED BY STRIP ── */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.65 }}
          className="mt-10 mb-4"
        >
          <p className="text-xs text-muted-foreground uppercase tracking-widest text-center mb-4">
            Trusted by teachers from
          </p>
          <div className="flex flex-wrap justify-center gap-4 md:gap-8 text-muted-foreground/60 text-sm font-semibold">
            {['DPS Schools', 'Allen Institute', 'Narayana Group', 'FIITJEE', 'Kendriya Vidyalaya', 'CBSE Schools'].map(name => (
              <span key={name} className="border border-border/40 rounded-full px-4 py-1.5 text-xs">{name}</span>
            ))}
          </div>
        </motion.div>

        {/* Preview mockup */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.5 }}
          className="mt-20 relative"
        >
          <div className="bg-card border border-border rounded-2xl shadow-2xl overflow-hidden">
            {/* Browser chrome */}
            <div className="flex items-center gap-2 px-4 py-3 bg-muted/50 border-b border-border">
              <div className="w-3 h-3 rounded-full bg-red-500/70" />
              <div className="w-3 h-3 rounded-full bg-yellow-500/70" />
              <div className="w-3 h-3 rounded-full bg-green-500/70" />
              <div className="flex-1 mx-4 bg-background rounded-md px-3 py-1 text-xs text-muted-foreground text-center">
                Paptrix/dashboard
              </div>
            </div>
            {/* Dashboard preview */}
            <div className="grid grid-cols-5 h-64">
              {/* Sidebar */}
              <div className="col-span-1 bg-card border-r border-border p-3 space-y-2">
                {['Overview', 'Upload', 'Builder', 'Templates', 'Papers'].map((item) => (
                  <div
                    key={item}
                    className={`text-[10px] px-2 py-1.5 rounded-lg ${item === 'Builder' ? 'bg-primary/10 text-primary font-semibold' : 'text-muted-foreground'}`}
                  >
                    {item}
                  </div>
                ))}
              </div>
              {/* Editor */}
              <div className="col-span-2 border-r border-border p-4">
                <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide mb-3">Questions Editor</div>
                {[
                  { q: 'Q1. Which is NOT a vector quantity?', m: '1M', type: 'MCQ' },
                  { q: 'Q2. Define Newton\'s third law...', m: '3M', type: 'Short' },
                  { q: 'Q3. Derive v² = u² + 2as with diagram', m: '5M', type: 'Long' },
                ].map((q) => (
                  <div key={q.q} className="bg-muted/50 border border-border/50 rounded-lg p-2 mb-2">
                    <div className="flex justify-between items-start gap-2">
                      <span className="text-[9px] text-foreground leading-tight">{q.q}</span>
                      <span className="text-[8px] text-primary font-bold shrink-0">{q.m}</span>
                    </div>
                    <span className="text-[8px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded mt-1 inline-block">{q.type}</span>
                  </div>
                ))}
              </div>
              {/* Preview */}
              <div className="col-span-2 bg-gray-200/20 p-3 flex items-start justify-center">
                <div className="bg-white w-full rounded shadow-lg p-3 text-[7px] font-serif text-gray-800">
                  <div className="border-2 border-double border-blue-900 p-2">
                    <div className="text-center font-bold uppercase text-[8px] border-b border-blue-900 pb-1 mb-1">
                      Sunrise Public School
                    </div>
                    <div className="grid grid-cols-2 gap-1 text-[6px] mb-1">
                      <span>Subject: Physics</span>
                      <span>Date: 15 Jan 2025</span>
                      <span>Class: X — A</span>
                      <span>Marks: 70</span>
                    </div>
                    <div className="text-center font-bold uppercase text-[7px] border border-blue-900 my-1 py-0.5">
                      Section A — MCQ
                    </div>
                    {[1, 2, 3].map((n) => (
                      <div key={n} className="flex gap-1 mb-0.5 text-[6px]">
                        <span className="font-bold">{n}.</span>
                        <div className="bg-gray-100 flex-1 h-2 rounded" />
                        <span className="font-bold">[1]</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
          {/* Glow */}
          <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent pointer-events-none rounded-2xl" />
        </motion.div>
      </div>
    </section>
  );
}

// ─────────────────────────────────────────
// FEATURES
// ─────────────────────────────────────────

const features = [
  {
    icon: Brain,
    title: 'AI-Powered OCR',
    desc: 'Extract text from handwritten notes and scanned PDFs with 99% accuracy. Claude AI cleans grammar and detects question structure automatically.',
    color: 'from-blue-600 to-blue-700',
    bg: 'bg-blue-500/10',
    iconColor: 'text-blue-400',
  },
  {
    icon: Edit3,
    title: 'Drag & Drop Builder',
    desc: 'Reorder questions, add sections, assign marks, and build MCQs — all in a visual editor with real-time paper preview.',
    color: 'from-cyan-600 to-cyan-700',
    bg: 'bg-cyan-500/10',
    iconColor: 'text-cyan-400',
  },
  {
    icon: LayoutTemplate,
    title: '6 Pro Templates',
    desc: 'School, college, coaching center, competitive exam, minimal, and luxury DTP templates with custom fonts, borders, and branding.',
    color: 'from-violet-600 to-violet-700',
    bg: 'bg-violet-500/10',
    iconColor: 'text-violet-400',
  },
  {
    icon: Download,
    title: 'DOCX & PDF Export',
    desc: 'Export fully editable DOCX files for MS Word and pixel-perfect print-ready PDFs with DTP-quality formatting.',
    color: 'from-green-600 to-green-700',
    bg: 'bg-green-500/10',
    iconColor: 'text-green-400',
  },
  {
    icon: Sparkles,
    title: 'Smart AI Tagging',
    desc: "Auto-classify question difficulty, tag Bloom's taxonomy levels, detect duplicate questions, and get smart formatting suggestions.",
    color: 'from-yellow-600 to-yellow-700',
    bg: 'bg-yellow-500/10',
    iconColor: 'text-yellow-400',
  },
  {
    icon: Shield,
    title: 'Institute Branding',
    desc: 'Add your school logo, watermark, custom headers, signature blocks, and institution colors to every question paper.',
    color: 'from-red-600 to-red-700',
    bg: 'bg-red-500/10',
    iconColor: 'text-red-400',
  },
];

function Features() {
  return (
    <section id="features" className="py-24 px-6 bg-card/20">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 bg-cyan-500/10 border border-cyan-500/25 text-cyan-400 text-xs font-bold px-4 py-2 rounded-full mb-4 uppercase tracking-wider">
            <Zap className="w-3.5 h-3.5" /> Core Features
          </div>
          <h2 className="text-4xl md:text-5xl font-extrabold mb-4">
            Everything You Need for{' '}
            <span className="bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
              Perfect Exam Papers
            </span>
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            From OCR to final export, our end-to-end AI pipeline handles every step with professional precision.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((f, i) => (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.08 }}
              className="bg-card border border-border rounded-2xl p-6 hover:border-border/80 hover:-translate-y-1 transition-all duration-200 group"
            >
              <div className={`w-11 h-11 rounded-xl ${f.bg} flex items-center justify-center mb-4`}>
                <f.icon className={`w-5 h-5 ${f.iconColor}`} />
              </div>
              <h3 className="font-bold text-[16px] mb-2">{f.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─────────────────────────────────────────
// HOW IT WORKS
// ─────────────────────────────────────────

function HowItWorks() {
  const steps = [
    { num: '01', icon: Upload, title: 'Upload Content', desc: 'Upload handwritten images, scanned PDFs, or paste raw question text from any format.' },
    { num: '02', icon: Brain, title: 'AI Processes', desc: 'Claude AI extracts text, detects structure, cleans grammar, and organizes questions by section automatically.' },
    { num: '03', icon: Edit3, title: 'Edit & Customize', desc: 'Review in the visual builder, add exam metadata, choose a template, and fine-tune everything.' },
    { num: '04', icon: Download, title: 'Export & Print', desc: 'Download as DOCX for editing or a print-ready PDF. Share with students or print directly.' },
  ];

  return (
    <section id="how-it-works" className="py-24 px-6">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 bg-violet-500/10 border border-violet-500/25 text-violet-400 text-xs font-bold px-4 py-2 rounded-full mb-4 uppercase tracking-wider">
            <ArrowRight className="w-3.5 h-3.5" /> How It Works
          </div>
          <h2 className="text-4xl md:text-5xl font-extrabold mb-4">
            From Upload to{' '}
            <span className="bg-gradient-to-r from-violet-400 to-cyan-400 bg-clip-text text-transparent">
              Printed Paper
            </span>{' '}
            in 4 Steps
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {steps.map((step, i) => (
            <motion.div
              key={step.num}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="relative"
            >
              {/* Connector line */}
              {i < steps.length - 1 && (
                <div className="hidden lg:block absolute top-8 left-[calc(100%+0px)] w-full h-px bg-gradient-to-r from-border to-transparent z-0" />
              )}
              <div className="bg-card border border-border rounded-2xl p-6 relative z-10">
                <div className="text-4xl font-black text-muted-foreground/20 mb-3 font-serif">
                  {step.num}
                </div>
                <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center mb-4">
                  <step.icon className="w-5 h-5 text-primary" />
                </div>
                <h3 className="font-bold text-[15px] mb-2">{step.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{step.desc}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─────────────────────────────────────────
// PRICING
// ─────────────────────────────────────────
const plans = [
  {
    id: 'plan_free',
    name: 'Free',
    price: '₹0',
    period: 'forever',
    description: 'Perfect for trying out Paptrix',
    color: '#64748b',
    badge: '✅ No Credit Card',
    popular: false,
    cta: 'Get Started Free',
    href: '/auth/register',
    features: [
      '3 papers per month',
      '6 exports per month',
      'PDF export only',
      'Basic Claude AI OCR',
      'Community support',
    ],
  },
  {
    id: 'plan_pro',
    name: 'Pro',
    price: '₹499',
    period: 'per month',
    description: 'For teachers who create papers regularly',
    color: '#3b82f6',
    badge: '🔥 Most Popular',
    popular: true,
    cta: 'Start Pro Plan',
    href: '/auth/register?plan=pro',
    features: [
      '30 papers per month',
      '60 exports per month',
      'PDF + DOCX export',
      'Priority Claude AI OCR',
      'Priority support',
    ],
  },
  {
    id: 'plan_institution',
    name: 'Institution',
    price: '₹999',
    period: 'per month',
    description: 'For schools and coaching centres',
    color: '#f59e0b',
    badge: '🏢 For Schools',
    popular: false,
    cta: 'Get Institution Plan',
    href: '/auth/register?plan=institution',
    features: [
      '70 papers per month',
      '140 exports per month',
      'PDF + DOCX export',
      '50 team members',
      'Priority support',
    ],
  },
];
function Pricing() {
  return (
    <section id="pricing" className="py-24 px-6 bg-card/20">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 bg-green-500/10 border border-green-500/25 text-green-400 text-xs font-bold px-4 py-2 rounded-full mb-4 uppercase tracking-wider">
            <Check className="w-3.5 h-3.5" /> Pricing
          </div>
          <h2 className="text-4xl md:text-5xl font-extrabold mb-4">
            Simple,{' '}
            <span className="bg-gradient-to-r from-green-400 to-cyan-400 bg-clip-text text-transparent">
              Transparent Pricing
            </span>
          </h2>
          <p className="text-muted-foreground text-lg">
            Start free, upgrade when you need more power. No hidden fees.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {plans.map((plan, i) => (
            <motion.div
              key={plan.name}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className={`relative bg-card rounded-2xl p-8 flex flex-col ${
                plan.popular
                  ? 'border-2 border-primary shadow-2xl shadow-primary/20 scale-[1.02]'
                  : 'border border-border'
              }`}
            >
              {plan.popular && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-gradient-to-r from-blue-600 to-cyan-600 text-white text-[11px] font-bold px-4 py-1.5 rounded-full whitespace-nowrap shadow-lg">
                  Most Popular
                </div>
              )}

              <div className="mb-6">
                <div className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-2">
                  {plan.name}
                </div>
                <div className="flex items-baseline gap-1 mb-2">
                  <span className="text-4xl font-black">{plan.price}</span>
                  <span className="text-sm text-muted-foreground">/ {plan.period}</span>
                </div>
                <p className="text-sm text-muted-foreground">{plan.description}</p>
              </div>

              <ul className="space-y-3 mb-8 flex-1">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2.5 text-sm text-muted-foreground">
                    <Check className="w-4 h-4 text-green-400 flex-shrink-0 mt-0.5" />
                    {f}
                  </li>
                ))}
              </ul>

              <Link
                href={plan.href}
                className={`w-full py-3 rounded-xl text-sm font-bold text-center transition-all ${
                  plan.popular
                    ? 'bg-gradient-to-r from-blue-600 to-cyan-600 text-white hover:from-blue-500 hover:to-cyan-500 shadow-lg shadow-blue-500/25'
                    : 'bg-secondary border border-border text-foreground hover:bg-secondary/80'
                }`}
              >
                {plan.cta}
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─────────────────────────────────────────
// TESTIMONIALS
// ─────────────────────────────────────────

const testimonials = [
  {
    name: 'Priya Sharma',
    role: 'Physics Teacher, DPS Hyderabad',
    text: 'I used to spend 3 hours formatting a single paper. With Paptrix, I do it in 5 minutes. The OCR on my handwritten notes is incredibly accurate.',
    stars: 4,
  },
  {
    name: 'Rajiv Kumar',
    role: 'Director, Allen Career Institute',
    text: 'We process 200+ papers a month. The Institution plan with team access has transformed how our faculty creates test papers. Highly recommended.',
    stars: 5,
  },
  {
    name: 'Dr. Anita Menon',
    role: 'HOD Chemistry, BITS Pilani',
    text: 'The college semester template is exactly what we needed. Clean, professional, and the DOCX export is perfectly formatted for our needs.',
    stars: 4,
  },
];

function Testimonials() {
  return (
    <section className="py-24 px-6">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 bg-yellow-500/10 border border-yellow-500/25 text-yellow-400 text-xs font-bold px-4 py-2 rounded-full mb-4 uppercase tracking-wider">
            <Star className="w-3.5 h-3.5" /> Testimonials
          </div>
          
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {testimonials.map((t, i) => (
            <motion.div
              key={t.name}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="bg-card border border-border rounded-2xl p-6"
            >
              <div className="flex gap-1 mb-4">
                {[...Array(t.stars)].map((_, j) => (
                  <Star key={j} className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                ))}
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed mb-5">"{t.text}"</p>
              <div>
                <div className="font-semibold text-sm">{t.name}</div>
                <div className="text-xs text-muted-foreground">{t.role}</div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─────────────────────────────────────────
// FAQ
// ─────────────────────────────────────────

const faqs = [
  {
    q: 'Does it work with handwritten questions?',
    a: 'Yes! Our AI OCR engine (powered by Tesseract + Claude AI) can read handwritten text from photos taken on any smartphone. For best results, use good lighting and keep the paper flat.',
  },
  {
    q: 'What file formats can I upload?',
    a: 'You can upload JPG, PNG, TIFF, HEIC (iPhone photos), and PDF files. Scanned PDFs and digital PDFs are both supported.',
  },
  {
    q: 'Can I edit the exported DOCX in MS Word?',
    a: 'Absolutely. The DOCX files are fully editable in Microsoft Word, Google Docs, and any compatible editor. All formatting, borders, and tables are preserved.',
  },
  {
    q: 'Is the Free plan really free?',
    a: 'Yes, completely free — no credit card required. You get 5 papers per month, 3 templates, and PDF export forever.',
  },
  {
    q: 'Can I add my school logo to the paper?',
    a: 'Yes. Pro and Institution plan users can upload their institution logo, which appears in the paper header. You can also add watermarks and custom branding.',
  },
  {
    q: 'How accurate is the AI at reading my handwriting?',
    a: 'Our pipeline achieves ~99% accuracy on clearly written text. For difficult handwriting, the AI clean-up stage corrects common OCR errors automatically. You can always manually edit anything after extraction.',
  },
];

function FAQ() {
  const [open, setOpen] = useState<number | null>(null);

  return (
    <section id="faq" className="py-24 px-6 bg-card/20">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-extrabold mb-4">Frequently Asked Questions</h2>
          <p className="text-muted-foreground">Everything you need to know about Paptrix.</p>
        </div>

        <div className="space-y-3">
          {faqs.map((faq, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.05 }}
              className="bg-card border border-border rounded-xl overflow-hidden"
            >
              <button
                onClick={() => setOpen(open === i ? null : i)}
                className="w-full flex items-center justify-between px-5 py-4 text-left"
              >
                <span className="font-semibold text-sm">{faq.q}</span>
                <ChevronDown
                  className={`w-4 h-4 text-muted-foreground flex-shrink-0 transition-transform ${
                    open === i ? 'rotate-180' : ''
                  }`}
                />
              </button>
              {open === i && (
                <div className="px-5 pb-4 text-sm text-muted-foreground leading-relaxed border-t border-border/50 pt-3">
                  {faq.a}
                </div>
              )}
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─────────────────────────────────────────
// CTA BANNER
// ─────────────────────────────────────────

function CtaBanner() {
  return (
    <section className="py-24 px-6">
      <div className="max-w-4xl mx-auto">
        <div className="bg-gradient-to-br from-blue-600/20 to-cyan-500/10 border border-blue-500/30 rounded-3xl p-12 text-center relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-600/5 to-transparent pointer-events-none" />
          <div className="relative z-10">
            <h2 className="text-4xl md:text-5xl font-extrabold mb-4">
              Ready to Transform Your{' '}
              <span className="bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
                Question Paper Workflow?
              </span>
            </h2>
            <p className="text-muted-foreground text-lg mb-8 max-w-xl mx-auto">
              Join 2,400+ institutions already saving hours on exam paper creation every month.
            </p>
            <Link
              href="/auth/register"
              className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-blue-600 to-cyan-600 text-white font-bold rounded-xl hover:from-blue-500 hover:to-cyan-500 transition-all hover:-translate-y-0.5 text-base shadow-xl shadow-blue-500/25"
            >
              <Zap className="w-5 h-5" />
              Start Free — No Credit Card Required
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

// ─────────────────────────────────────────
// FOOTER
// ─────────────────────────────────────────

function Footer() {
  return (
    <footer className="border-t border-border bg-card/30 py-12 px-6">
      <div className="max-w-6xl mx-auto">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-8">
          <div className="col-span-2 md:col-span-1">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-7 h-7 bg-gradient-to-br from-blue-600 to-cyan-500 rounded-lg flex items-center justify-center">
                <FileSpreadsheet className="w-3.5 h-3.5 text-white" />
              </div>
              <span className="font-bold">Paptrix</span>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              AI-powered question paper formatter for Indian educators.
            </p>
          </div>

          {[
            {
              title: 'Product',
              links: ['Features', 'Templates', 'Pricing', 'API Access'],
            },
            {
              title: 'Company',
              links: ['About', 'Blog', 'Careers', 'Press'],
            },
            {
              title: 'Support',
              links: ['Documentation', 'Help Center', 'Contact Us', 'Privacy Policy'],
            },
          ].map((col) => (
            <div key={col.title}>
              <div className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-3">
                {col.title}
              </div>
              <div className="space-y-2">
                {col.links.map((link) => (
                  <div
                    key={link}
                    className="text-sm text-muted-foreground hover:text-foreground cursor-pointer transition-colors"
                  >
                    {link}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="border-t border-border pt-6 flex flex-col md:flex-row justify-between items-center gap-3">
          <span className="text-xs text-muted-foreground">
            © 2026 Paptrix
          </span>
          <span className="text-xs text-muted-foreground">
            Made with ❤️ for Indian educators
          </span>
        </div>
      </div>
    </footer>
    
  );
}

// ─────────────────────────────────────────
// MAIN EXPORT
// ─────────────────────────────────────────

// ─────────────────────────────────────────
// WHATSAPP SHARE FLOAT
// ─────────────────────────────────────────
function WhatsAppFloat() {
  const msg = encodeURIComponent(
    "🎓 Check out Paptrix — AI tool that converts handwritten notes into professional question papers in 30 seconds! Free to use 👇\nhttps://paptrix.com"
  );
  return (
    <a
      href={`https://wa.me/?text=${msg}`}
      target="_blank"
      rel="noopener noreferrer"
      title="Share on WhatsApp"
      style={{
        position: 'fixed',
        bottom: '24px',
        right: '24px',
        zIndex: 999,
        width: '56px',
        height: '56px',
        borderRadius: '50%',
        background: 'linear-gradient(135deg, #25d366, #128c7e)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        boxShadow: '0 4px 20px rgba(37,211,102,0.4)',
        textDecoration: 'none',
        transition: 'transform 0.2s, box-shadow 0.2s',
      }}
      onMouseEnter={e => {
        (e.currentTarget as HTMLAnchorElement).style.transform = 'scale(1.1)';
        (e.currentTarget as HTMLAnchorElement).style.boxShadow = '0 6px 28px rgba(37,211,102,0.55)';
      }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLAnchorElement).style.transform = 'scale(1)';
        (e.currentTarget as HTMLAnchorElement).style.boxShadow = '0 4px 20px rgba(37,211,102,0.4)';
      }}
    >
      {/* WhatsApp SVG */}
      <svg width="28" height="28" viewBox="0 0 32 32" fill="white" xmlns="http://www.w3.org/2000/svg">
        <path d="M16 2C8.268 2 2 8.268 2 16c0 2.49.643 4.827 1.768 6.857L2 30l7.34-1.92A13.93 13.93 0 0016 30c7.732 0 14-6.268 14-14S23.732 2 16 2zm0 25.5a11.43 11.43 0 01-5.826-1.594l-.418-.25-4.354 1.14 1.162-4.24-.273-.435A11.47 11.47 0 014.5 16C4.5 9.648 9.648 4.5 16 4.5S27.5 9.648 27.5 16 22.352 27.5 16 27.5zm6.29-8.61c-.345-.172-2.04-1.006-2.356-1.12-.317-.115-.547-.172-.778.173-.23.345-.893 1.12-1.095 1.35-.2.23-.403.26-.748.086-.345-.172-1.457-.537-2.775-1.713-1.026-.914-1.718-2.042-1.92-2.387-.2-.345-.022-.53.15-.702.156-.155.345-.403.518-.604.172-.202.23-.345.345-.575.115-.23.058-.432-.029-.604-.086-.172-.778-1.876-1.066-2.568-.28-.674-.565-.583-.778-.594l-.662-.011c-.23 0-.604.086-.92.432-.316.345-1.208 1.18-1.208 2.877s1.237 3.337 1.41 3.567c.172.23 2.434 3.715 5.897 5.21.824.355 1.467.567 1.969.727.827.263 1.58.226 2.174.137.663-.1 2.04-.834 2.328-1.638.287-.805.287-1.495.2-1.638-.086-.144-.316-.23-.66-.403z"/>
      </svg>
    </a>
  );
}

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* ── TOP SOCIAL PROOF BAR ── */}
      <div style={{
        background: 'linear-gradient(90deg, rgba(37,99,235,0.15), rgba(6,182,212,0.15))',
        borderBottom: '1px solid rgba(59,130,246,0.2)',
        padding: '8px 16px',
        textAlign: 'center',
        fontSize: '13px',
        color: '#93c5fd',
        fontWeight: 500,
      }}>
        🎉 <strong style={{ color: '#e2e8f0' }}>Free for all teachers</strong> · No credit card · 3 papers free ·{' '}
        <a href="/auth/register" style={{ color: '#38bdf8', fontWeight: 700, textDecoration: 'underline' }}>
          Join 800+ educators using Paptrix →
        </a>
      </div>
      <Navbar />
      <Hero />
      <Features />
      <HowItWorks />
      <Pricing />
      <Testimonials />
      <FAQ />
      {/* ── SHARE SECTION ── */}
      <section style={{ padding: '60px 24px', textAlign: 'center', background: 'rgba(37,99,235,0.04)', borderTop: '1px solid rgba(59,130,246,0.1)', borderBottom: '1px solid rgba(59,130,246,0.1)' }}>
        <div style={{ maxWidth: '560px', margin: '0 auto' }}>
          <div style={{ fontSize: '13px', fontWeight: 700, color: '#60a5fa', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '12px' }}>
            📢 Help Fellow Teachers
          </div>
          <h2 style={{ fontSize: '1.8rem', fontWeight: 800, color: '#f1f5f9', marginBottom: '12px', lineHeight: 1.3 }}>
            Know a teacher spending hours on papers?
          </h2>
          <p style={{ color: '#94a3b8', fontSize: '15px', marginBottom: '28px', lineHeight: 1.6 }}>
            Share Paptrix with your school staff group. Takes 5 seconds — saves them 3 hours every week.
          </p>
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
            <a
              href={`https://wa.me/?text=${encodeURIComponent("🎓 Paptrix converts handwritten notes into professional question papers in 30 seconds using AI! Free to use 👇 https://paptrix.com")}`}
              target="_blank" rel="noopener noreferrer"
              style={{
                display: 'flex', alignItems: 'center', gap: '8px',
                background: 'linear-gradient(135deg,#25d366,#128c7e)',
                color: '#fff', fontWeight: 700, fontSize: '14px',
                padding: '12px 24px', borderRadius: '12px',
                textDecoration: 'none', boxShadow: '0 4px 16px rgba(37,211,102,0.3)',
              }}
            >
              <svg width="18" height="18" viewBox="0 0 32 32" fill="white"><path d="M16 2C8.268 2 2 8.268 2 16c0 2.49.643 4.827 1.768 6.857L2 30l7.34-1.92A13.93 13.93 0 0016 30c7.732 0 14-6.268 14-14S23.732 2 16 2zm6.29 19.89c-.345-.172-2.04-1.006-2.356-1.12-.317-.115-.547-.172-.778.173-.23.345-.893 1.12-1.095 1.35-.2.23-.403.26-.748.086-.345-.172-1.457-.537-2.775-1.713-1.026-.914-1.718-2.042-1.92-2.387-.2-.345-.022-.53.15-.702.156-.155.345-.403.518-.604.172-.202.23-.345.345-.575.115-.23.058-.432-.029-.604-.086-.172-.778-1.876-1.066-2.568-.28-.674-.565-.583-.778-.594l-.662-.011c-.23 0-.604.086-.92.432-.316.345-1.208 1.18-1.208 2.877s1.237 3.337 1.41 3.567c.172.23 2.434 3.715 5.897 5.21.824.355 1.467.567 1.969.727.827.263 1.58.226 2.174.137.663-.1 2.04-.834 2.328-1.638.287-.805.287-1.495.2-1.638-.086-.144-.316-.23-.66-.403z"/></svg>
              Share on WhatsApp
            </a>
            <a
              href={`https://twitter.com/intent/tweet?text=${encodeURIComponent("Just discovered Paptrix — AI that converts handwritten notes into professional exam papers in 30 seconds 🎓 Free for teachers! https://paptrix.com")}`}
              target="_blank" rel="noopener noreferrer"
              style={{
                display: 'flex', alignItems: 'center', gap: '8px',
                background: '#1a1a2e', border: '1px solid rgba(255,255,255,0.15)',
                color: '#e2e8f0', fontWeight: 700, fontSize: '14px',
                padding: '12px 24px', borderRadius: '12px', textDecoration: 'none',
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.746l7.73-8.835L1.254 2.25H8.08l4.258 5.63 5.906-5.63zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
              Share on X
            </a>
            <button
              onClick={() => { navigator.clipboard.writeText('https://paptrix.com'); alert('Link copied! Share it with your colleagues.'); }}
              style={{
                display: 'flex', alignItems: 'center', gap: '8px',
                background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)',
                color: '#94a3b8', fontWeight: 600, fontSize: '14px',
                padding: '12px 20px', borderRadius: '12px', cursor: 'pointer',
              }}
            >
              🔗 Copy Link
            </button>
          </div>
        </div>
      </section>
      <CtaBanner />
      <Footer />
      <a
  href="https://wa.me/916303677737?text=Hello%20I%20want%20to%20know%20more%20about%20Paptrix"
  target="_blank"
  rel="noopener noreferrer"
  className="fixed bottom-6 right-6 z-50 flex items-center gap-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white px-5 py-3 rounded-full shadow-2xl hover:scale-105 hover:shadow-green-500/30 transition-all duration-300 group"
>
  {/* WhatsApp Icon */}
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 32 32"
    className="w-6 h-6 fill-white"
  >
    <path d="M16.001 3C8.832 3 3 8.832 3 16c0 2.57.75 5.07 2.17 7.22L3 29l5.94-2.11A12.93 12.93 0 0 0 16 29c7.168 0 13-5.832 13-13S23.169 3 16 3zm0 23.4a10.3 10.3 0 0 1-5.25-1.43l-.38-.22-3.52 1.25 1.18-3.43-.24-.4A10.28 10.28 0 1 1 16 26.4zm5.64-7.69c-.31-.15-1.83-.9-2.11-1s-.49-.15-.69.15-.8 1-1 1.2-.34.23-.65.08a8.34 8.34 0 0 1-2.45-1.51 9.17 9.17 0 0 1-1.7-2.1c-.18-.31 0-.48.14-.63.14-.14.31-.34.46-.51.15-.18.2-.31.31-.51s.05-.39-.03-.54c-.08-.15-.69-1.67-.95-2.29-.25-.6-.5-.52-.69-.53h-.59c-.2 0-.54.08-.82.39-.28.31-1.08 1.05-1.08 2.57s1.1 2.98 1.25 3.19c.15.2 2.15 3.29 5.2 4.61.73.31 1.3.49 1.75.63.74.24 1.42.2 1.95.12.6-.09 1.83-.75 2.09-1.48.26-.72.26-1.34.18-1.48-.08-.14-.28-.22-.59-.37z"/>
  </svg>

  <span className="hidden sm:inline font-semibold">
    Chat with us
  </span>

  {/* Ping animation */}
  <span className="absolute -top-1 -right-1 flex h-4 w-4">
    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
    <span className="relative inline-flex rounded-full h-4 w-4 bg-green-500"></span>
  </span>
</a>
    </div>
  );
}