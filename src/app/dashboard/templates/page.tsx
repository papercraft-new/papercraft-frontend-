'use client';

import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  ArrowRight,
  Sparkles,
  Palette,
  FileText,
  Clock3,
  Wand2,
  CheckCircle2,
  LayoutTemplate,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

const previewCards = [
  {
    id: 'school',
    title: 'School Classic',
    emoji: '🏫',
    gradient: 'from-blue-950 via-slate-900 to-slate-950',
    border: 'border-blue-500/20',
  },
  {
    id: 'college',
    title: 'College Modern',
    emoji: '🎓',
    gradient: 'from-indigo-950 via-slate-900 to-blue-950',
    border: 'border-indigo-500/20',
  },
  {
    id: 'competitive',
    title: 'Competitive Pro',
    emoji: '🏆',
    gradient: 'from-zinc-950 via-slate-900 to-neutral-950',
    border: 'border-zinc-500/20',
  },
];

const featurePoints = [
  {
    icon: LayoutTemplate,
    title: 'Multiple professional layouts',
    desc: 'Pre-designed paper styles for schools, colleges, coaching centers, and exams.',
  },
  {
    icon: Palette,
    title: 'Customizable design controls',
    desc: 'Adjust headers, borders, spacing, section labels, and overall print appearance.',
  },
  {
    icon: FileText,
    title: 'Export-ready output',
    desc: 'Templates will be applied automatically to DOCX and PDF question paper exports.',
  },
];

export default function TemplatesPage() {
  const router = useRouter();

  const handleBuilder = () => {
    router.push('/dashboard/builder');
  };

  return (
    <div className="p-6 max-w-[1100px] mx-auto">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between mb-8">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Badge
              variant="secondary"
              className="rounded-full px-3 py-1 text-[11px] font-semibold bg-primary/10 text-primary border border-primary/20"
            >
              <Clock3 className="w-3.5 h-3.5 mr-1.5" />
              Coming soon
            </Badge>
          </div>

          <h1 className="text-2xl font-bold tracking-tight mb-1">Templates</h1>
          <p className="text-sm text-muted-foreground max-w-[680px]">
            A premium template gallery for question paper layouts is on the way.
            Soon you’ll be able to choose professionally designed DTP templates
            before exporting your paper.
          </p>
        </div>

        <Button className="btn-gradient gap-2 w-full sm:w-auto" onClick={handleBuilder}>
          Open Builder <ArrowRight className="w-4 h-4" />
        </Button>
      </div>

      {/* Main Coming Soon Card */}
      <motion.div
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45 }}
      >
        <Card className="relative overflow-hidden border-border/70 bg-card/80 backdrop-blur-sm shadow-sm">
          {/* ambient background */}
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute -top-16 -right-16 h-48 w-48 rounded-full bg-primary/10 blur-3xl" />
            <div className="absolute -bottom-16 -left-10 h-44 w-44 rounded-full bg-indigo-500/10 blur-3xl" />
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.06),transparent_40%)] dark:bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.04),transparent_40%)]" />
          </div>

          <CardContent className="relative p-6 md:p-8">
            <div className="grid lg:grid-cols-[1.1fr_0.9fr] gap-8 items-center">
              {/* Left content */}
              <div>
                <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-[11px] font-semibold text-primary mb-4">
                  <Sparkles className="w-3.5 h-3.5" />
                  Template gallery in progress
                </div>

                <h2 className="text-xl md:text-2xl font-bold tracking-tight mb-3">
                  Beautiful paper layouts, designed for academic use
                </h2>

                <p className="text-sm text-muted-foreground leading-6 max-w-[60ch]">
                  We’re building a polished template selection experience that matches
                  your export workflow. It will include category-based layouts, visual
                  previews, and one-click application inside the builder.
                </p>

                <div className="mt-5 flex flex-wrap gap-2">
                  <Badge variant="outline" className="rounded-full px-3 py-1 text-[11px]">
                    6+ layout styles
                  </Badge>
                  <Badge variant="outline" className="rounded-full px-3 py-1 text-[11px]">
                    Fully customizable
                  </Badge>
                  <Badge variant="outline" className="rounded-full px-3 py-1 text-[11px]">
                    DOCX / PDF ready
                  </Badge>
                </div>

                <div className="mt-6 flex flex-col sm:flex-row gap-3">
                  <Button className="btn-gradient gap-2" onClick={handleBuilder}>
                    Continue in Builder <ArrowRight className="w-4 h-4" />
                  </Button>

                  <Button variant="outline" className="gap-2" disabled>
                    <Wand2 className="w-4 h-4" />
                    Templates launching soon
                  </Button>
                </div>
              </div>

              {/* Right preview */}
              <div className="relative">
                <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-1 gap-4">
                  {previewCards.map((item, i) => (
                    <motion.div
                      key={item.id}
                      initial={{ opacity: 0, y: 12, scale: 0.98 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      transition={{ delay: 0.08 * i, duration: 0.35 }}
                      className={cn(
                        'relative overflow-hidden rounded-2xl border bg-gradient-to-br p-3 shadow-sm',
                        item.gradient,
                        item.border
                      )}
                    >
                      <div className="mb-3 flex items-center justify-between">
                        <div className="text-xl">{item.emoji}</div>
                        <Badge className="bg-white/10 text-white hover:bg-white/10 border-white/10 rounded-full text-[10px]">
                          Preview
                        </Badge>
                      </div>

                      <div className="rounded-xl bg-white/90 shadow-md p-2">
                        <div className="rounded-md border border-slate-300 bg-white p-2">
                          <div className="text-[7px] text-center font-bold uppercase tracking-wide text-slate-700 mb-1">
                            Institution Name
                          </div>
                          <div className="h-px bg-slate-300 mb-1.5" />

                          {[...Array(3)].map((_, idx) => (
                            <div key={idx} className="flex gap-1 mb-1">
                              <div className="h-1 bg-slate-200 rounded flex-1" />
                              <div className="h-1 bg-slate-200 rounded flex-1" />
                            </div>
                          ))}

                          <div className="rounded bg-slate-100 text-[6px] text-center font-bold uppercase py-1 mb-1.5 text-slate-700">
                            Section A
                          </div>

                          {[...Array(4)].map((_, idx) => (
                            <div key={idx} className="flex items-center gap-1 mb-1">
                              <div className="w-3 text-[5px] font-bold text-slate-500">
                                {idx + 1}.
                              </div>
                              <div className="h-1 bg-slate-100 rounded flex-1" />
                              <div className="w-4 text-[5px] text-slate-400 text-right">
                                [1]
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="mt-3">
                        <p className="text-[12px] font-semibold text-white">{item.title}</p>
                        <p className="text-[11px] text-white/65">
                          Preview style for future template selection
                        </p>
                      </div>
                    </motion.div>
                  ))}
                </div>

                <div className="absolute -bottom-3 -right-3 hidden md:flex items-center gap-2 rounded-full border border-primary/20 bg-background/90 backdrop-blur px-3 py-2 shadow-lg">
                  <CheckCircle2 className="w-4 h-4 text-primary" />
                  <span className="text-[11px] font-medium text-muted-foreground">
                    UI ready for future integration
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Feature cards */}
      <div className="grid md:grid-cols-3 gap-4 mt-6">
        {featurePoints.map((item, i) => {
          const Icon = item.icon;

          return (
            <motion.div
              key={item.title}
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.12 + i * 0.08 }}
            >
              <Card className="h-full border-border/70 hover:border-primary/20 transition-colors bg-card/70">
                <CardContent className="p-5">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center mb-4">
                    <Icon className="w-5 h-5" />
                  </div>
                  <h3 className="text-sm font-semibold mb-1.5">{item.title}</h3>
                  <p className="text-[13px] leading-6 text-muted-foreground">
                    {item.desc}
                  </p>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>

      {/* Bottom info strip */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25 }}
        className="mt-6"
      >
        <Card className="border-primary/15 bg-primary/[0.04]">
          <CardContent className="p-5">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <h3 className="text-sm font-semibold mb-1">Current status</h3>
                <p className="text-[13px] text-muted-foreground leading-6">
                  Template selection UI is planned for a future release. Until then,
                  you can continue creating question papers from the builder and connect
                  this page later to your templates API.
                </p>
              </div>

              <Button variant="outline" className="gap-2 md:self-start" onClick={handleBuilder}>
                Go to Builder <ArrowRight className="w-4 h-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}