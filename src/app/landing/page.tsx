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
          <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-cyan-500 rounded-lg flex items-center justify-center">
            <FileSpreadsheet className="w-4 h-4 text-white" />
          </div>
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
    badge: null,
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
    price: '₹399',
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
    price: '₹899',
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

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navbar />
      <Hero />
      <Features />
      <HowItWorks />
      <Pricing />
      <Testimonials />
      <FAQ />
      <CtaBanner />
      <Footer />
    </div>
  );
}