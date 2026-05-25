'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/store/authStore';
import toast from 'react-hot-toast';

export default function AdminPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const user = useAuthStore((state) => state.user);
  const [isHydrated, setIsHydrated] = useState(false);

  const [tab, setTab] = useState<
    'overview' | 'users' | 'papers' | 'ocr' | 'revenue' | 'logs' | 'settings'
  >('overview');

  const role = user?.role?.toUpperCase();

  useEffect(() => {
    setIsHydrated(true);
  }, []);

  useEffect(() => {
    if (!isHydrated) return;

    if (!user) {
      router.push('/login');
      return;
    }

    if (role !== 'ADMIN') {
      router.push('/dashboard');
      toast.error('Admin access required');
    }
  }, [user, role, isHydrated, router]);

  if (!isHydrated) {
    return <div style={{ padding: '2rem', color: '#fff' }}>Loading admin panel...</div>;
  }

  if (!user || role !== 'ADMIN') {
    return null;
  }

  return (
    <div style={{ padding: '2rem', color: '#fff' }}>
      Admin page visible
    </div>
  );
}