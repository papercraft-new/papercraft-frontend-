'use client';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Download, FileText, FileType2, Clock, HardDrive } from 'lucide-react';
import { papersApi } from '@/lib/api';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { cn, formatDate, formatFileSize } from '@/lib/utils';
import toast from 'react-hot-toast';

export default function ExportsPage() {
  // We reuse the papers list and show exports from each
  const { data, isLoading } = useQuery({
    queryKey: ['papers-with-exports'],
    queryFn: () => papersApi.list({ limit: 50 }),
  });

  const papers: Record<string, unknown>[] = data?.data?.data || [];

  // Flatten exports from all papers (in real app, would call /api/exports directly)
  const mockExports = papers.flatMap((paper) => {
    const ed = paper.examDetails as Record<string, unknown>;
    return [
      {
        id: `${paper.id}-pdf`,
        paperId: paper.id,
        paperTitle: paper.title,
        subject: ed?.subject || '—',
        format: 'PDF',
        fileSize: Math.floor(Math.random() * 300 + 100) * 1024,
        createdAt: paper.updatedAt,
        status: 'ready',
      },
      {
        id: `${paper.id}-docx`,
        paperId: paper.id,
        paperTitle: paper.title,
        subject: ed?.subject || '—',
        format: 'DOCX',
        fileSize: Math.floor(Math.random() * 150 + 50) * 1024,
        createdAt: paper.createdAt,
        status: 'ready',
      },
    ];
  }).slice(0, 20);

  const totalPdf = mockExports.filter((e) => e.format === 'PDF').length;
  const totalDocx = mockExports.filter((e) => e.format === 'DOCX').length;
  const totalSize = mockExports.reduce((s, e) => s + (e.fileSize as number), 0);

  return (
    <div className="p-6 max-w-[1000px] mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-1">Export History</h1>
        <p className="text-sm text-muted-foreground">
          All your downloaded question papers in one place.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {[
          { label: 'PDF Exports', value: totalPdf, icon: FileType2, color: 'text-red-400', bg: 'bg-red-500/10' },
          { label: 'DOCX Exports', value: totalDocx, icon: FileText, color: 'text-blue-400', bg: 'bg-blue-500/10' },
          { label: 'Total Size', value: formatFileSize(totalSize), icon: HardDrive, color: 'text-green-400', bg: 'bg-green-500/10' },
        ].map((stat) => (
          <Card key={stat.label} className="card-hover">
            <CardContent className="p-4 flex items-center gap-3">
              <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center', stat.bg)}>
                <stat.icon className={cn('w-5 h-5', stat.color)} />
              </div>
              <div>
                <div className="text-xl font-bold">{stat.value}</div>
                <div className="text-xs text-muted-foreground">{stat.label}</div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Exports Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-5 space-y-3">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="flex items-center gap-3">
                  <Skeleton className="w-9 h-9 rounded-lg" />
                  <div className="flex-1 space-y-1.5">
                    <Skeleton className="h-3 w-2/5" />
                    <Skeleton className="h-2.5 w-1/4" />
                  </div>
                  <Skeleton className="w-20 h-8 rounded" />
                </div>
              ))}
            </div>
          ) : mockExports.length === 0 ? (
            <div className="text-center py-16">
              <Download className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">No exports yet.</p>
              <p className="text-xs text-muted-foreground/60 mt-1">
                Open a paper in the builder and export it to see it here.
              </p>
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  {['Document', 'Subject', 'Format', 'Size', 'Date', 'Action'].map((h) => (
                    <th
                      key={h}
                      className="text-left px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-muted-foreground"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {mockExports.map((exp, i) => (
                  <motion.tr
                    key={exp.id as string}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: i * 0.03 }}
                    className="border-b border-border/40 hover:bg-muted/20 transition-colors"
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <div className={cn(
                          'w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0',
                          exp.format === 'PDF' ? 'bg-red-500/10' : 'bg-blue-500/10'
                        )}>
                          {exp.format === 'PDF'
                            ? <FileType2 className="w-4 h-4 text-red-400" />
                            : <FileText className="w-4 h-4 text-blue-400" />
                          }
                        </div>
                        <span className="text-[13px] font-medium text-foreground line-clamp-1 max-w-[200px]">
                          {exp.paperTitle as string}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-[13px] text-muted-foreground">
                      {exp.subject as string}
                    </td>
                    <td className="px-4 py-3">
                      <span className={cn(
                        'text-[11px] font-bold px-2 py-0.5 rounded border',
                        exp.format === 'PDF'
                          ? 'bg-red-500/10 text-red-400 border-red-500/20'
                          : 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                      )}>
                        {exp.format as string}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-[13px] text-muted-foreground">
                      {formatFileSize(exp.fileSize as number)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5 text-[12px] text-muted-foreground">
                        <Clock className="w-3 h-3" />
                        {formatDate(exp.createdAt as string)}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 gap-1.5 text-[12px]"
                        onClick={() => toast.success(`Re-downloading ${exp.paperTitle}...`)}
                      >
                        <Download className="w-3.5 h-3.5" /> Download
                      </Button>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
