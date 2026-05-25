'use client';

import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { usePaperStore } from '@/store/paperStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { X } from 'lucide-react';
import toast from 'react-hot-toast';

const examSchema = z.object({
  institutionName: z.string().min(2, 'Required'),
  subject: z.string().min(1, 'Required'),
  examType: z.string().min(1, 'Required'),
  class: z.string().min(1, 'Required'),
  branch: z.string().optional(),
  academicYear: z.string().min(4, 'Required'),
  date: z.string().min(1, 'Required'),
  duration: z.string().min(1, 'Required'),
  totalMarks: z.coerce.number().min(1),
  instructionsText: z.string().optional(),
});

type ExamFormData = z.infer<typeof examSchema>;

interface ExamDetailsModalProps {
  onClose: () => void;
}

const examTypes = [
  'Final Examination',
  'Mid-term',
  'Unit Test',
  'Quarterly',
  'Half-Yearly',
  'Pre-Board',
  'Mock Test',
  'Assignment',
];

const durations = [
  '1 Hour',
  '1:30 Hours',
  '2 Hours',
  '2:30 Hours',
  '3 Hours',
  '3:30 Hours',
  '4 Hours',
];

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="mt-1 text-xs text-destructive">{message}</p>;
}

export function ExamDetailsModal({ onClose }: ExamDetailsModalProps) {
  const { examDetails, setExamDetails } = usePaperStore();

  const {
    register,
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ExamFormData>({
    resolver: zodResolver(examSchema),
    defaultValues: {
      institutionName: examDetails.institutionName || '',
      subject: examDetails.subject || '',
      examType: examDetails.examType || '',
      class: examDetails.class || '',
      branch: examDetails.branch || '',
      academicYear: examDetails.academicYear || '',
      date: examDetails.date || '',
      duration: examDetails.duration || '',
      totalMarks: examDetails.totalMarks || 100,
      instructionsText: examDetails.instructions?.join('\n') || '',
    },
  });

  const onSubmit = (data: ExamFormData) => {
    setExamDetails({
      ...examDetails,
      ...data,
      instructions: (data.instructionsText || '')
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean),
    });

    toast.success('Exam details saved!');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 p-4">
      <div className="mx-auto flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-border bg-background shadow-xl">
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <div>
            <h2 className="text-lg font-semibold text-foreground">Exam Details</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Fill the main exam information.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-9 w-9 items-center justify-center rounded-md hover:bg-muted"
            aria-label="Close modal"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form
          id="exam-form"
          onSubmit={handleSubmit(onSubmit)}
          className="flex-1 overflow-y-auto px-6 py-5"
        >
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            <div className="md:col-span-2">
              <Label htmlFor="institutionName" className="mb-2 block text-sm font-medium">
                Institution Name *
              </Label>
              <Input
                id="institutionName"
                {...register('institutionName')}
                placeholder="e.g. Delhi Public School, Hyderabad"
                className="h-11"
              />
              <FieldError message={errors.institutionName?.message} />
            </div>

            <div>
              <Label htmlFor="subject" className="mb-2 block text-sm font-medium">
                Subject *
              </Label>
              <Input
                id="subject"
                {...register('subject')}
                placeholder="e.g. Physics"
                className="h-11"
              />
              <FieldError message={errors.subject?.message} />
            </div>

            <div>
              <Label htmlFor="class" className="mb-2 block text-sm font-medium">
                Class / Grade *
              </Label>
              <Input
                id="class"
                {...register('class')}
                placeholder="e.g. Class X - A"
                className="h-11"
              />
              <FieldError message={errors.class?.message} />
            </div>

            <div>
  <Label htmlFor="examType" className="mb-2 block text-sm font-medium">
    Exam Type *
  </Label>
  <Input
    id="examType"
    {...register('examType')}
    placeholder="e.g. Mid-term, Final Examination"
    className="h-11"
  />
  <FieldError message={errors.examType?.message} />
</div>

            <div>
              <Label htmlFor="date" className="mb-2 block text-sm font-medium">
                Exam Date *
              </Label>
              <Input
                id="date"
                type="date"
                {...register('date')}
                className="h-11"
              />
              <FieldError message={errors.date?.message} />
            </div>

            <div>
  <Label htmlFor="duration" className="mb-2 block text-sm font-medium">
    Duration *
  </Label>
  <Input
    id="duration"
    {...register('duration')}
    placeholder="e.g. 3 Hours"
    className="h-11"
  />
  <FieldError message={errors.duration?.message} />
</div>

            <div className="md:col-span-2">
              <Label htmlFor="instructionsText" className="mb-2 block text-sm font-medium">
                General Instructions
              </Label>
              <Textarea
                id="instructionsText"
                {...register('instructionsText')}
                placeholder={
                  'All questions are compulsory.\nDraw neat diagrams wherever necessary.\nCalculators are not permitted.'
                }
                className="min-h-[130px] resize-y text-sm"
              />
            </div>
          </div>
        </form>

        <div className="flex justify-end gap-3 border-t border-border bg-background px-6 py-4">
          <Button type="button" variant="outline" onClick={onClose} className="h-10 px-5">
            Cancel
          </Button>
          <Button
            type="submit"
            form="exam-form"
            className="h-10 px-5 btn-gradient"
            disabled={isSubmitting}
          >
            Save Details
          </Button>
        </div>
      </div>
    </div>
  );
}