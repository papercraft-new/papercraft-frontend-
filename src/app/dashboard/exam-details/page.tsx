'use client';

import { useRouter } from 'next/navigation';
import { ExamDetailsModal } from '@/components/builder/ExamDetailsModal';

export default function ExamDetailsPage() {
  const router = useRouter();

  return (
    <ExamDetailsModal
      onClose={() => router.push('/dashboard/preview')}
    />
  );
}