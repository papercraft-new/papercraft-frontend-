'use client';
// app/auth/login/page.tsx

import { Suspense, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { motion } from 'framer-motion';
import { Eye, EyeOff, Loader2, FileSpreadsheet } from 'lucide-react';
import { authApi } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import toast from 'react-hot-toast';

const loginSchema = z.object({
  email: z.string().email('Valid email required'),
  password: z.string().min(1, 'Password required'),
});

type LoginForm = z.infer<typeof loginSchema>;

function LoginPageContent() {
  const router = useRouter();
  const params = useSearchParams();
  const { login } = useAuthStore();
  const [showPass, setShowPass] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginForm) => {
    try {
      const res = await authApi.login(data);
      const { user, token } = res.data.data;
      login(user, token);
      toast.success(`Welcome back, ${user.name?.split(' ')[0] || 'there'}!`);
      router.push('/dashboard');
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { error?: string } } })?.response?.data?.error ||
        'Login failed. Please check your credentials.';
      toast.error(msg);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="absolute inset-0 bg-mesh-gradient pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-sm relative z-10"
      >
        <div className="flex items-center justify-center gap-2.5 mb-8">
          <img src="/logo.png" alt="Paptrix" className="w-12 h-12 object-contain" style={{ mixBlendMode: 'screen' }} />
          <span className="text-xl font-bold">Paptrix</span>
        </div>

        <div className="bg-card border border-border rounded-2xl p-8 shadow-2xl">
          <h1 className="text-2xl font-bold mb-1">Welcome back</h1>
          <p className="text-sm text-muted-foreground mb-6">
            Sign in to your account to continue.
          </p>

          {params.get('expired') && (
            <div className="mb-4 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg text-sm text-yellow-400">
              Your session expired. Please sign in again.
            </div>
          )}

          <div className="flex items-center gap-3 mb-4"></div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Email Address
              </Label>
              <Input
                {...register('email')}
                type="email"
                placeholder="Enter your email"
                className="mt-1"
                autoComplete="email"
              />
              {errors.email && (
                <p className="text-xs text-red-400 mt-1">{errors.email.message}</p>
              )}
            </div>

            <div>
              <div className="flex items-center justify-between">
                <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Password
                </Label>
                
                <Link href="/auth/forgot-password" className="text-xs text-primary hover:underline">
                </Link>
              </div>
              

              <div className="relative mt-1">
                <Input
                  {...register('password')}
                  type={showPass ? 'text' : 'password'}
                  placeholder="••••••••"
                  className="pr-10"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
               <div className="text-right mt-1 mb-3">
    <Link
      href="/auth/forgot-password"
      className="text-xs text-primary hover:underline"
    >
      Forgot password?
    </Link>
  </div>

              {errors.password && (
                <p className="text-xs text-red-400 mt-1">{errors.password.message}</p>
              )}
            </div>
            

            <Button
              type="submit"
              disabled={isSubmitting}
              className="w-full btn-gradient gap-2"
            >
              {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              Sign In
            </Button>
            
          </form>
          

          <p className="text-sm text-center text-muted-foreground mt-5">
            Don't have an account?{' '}
            <Link href="/auth/register" className="text-primary font-semibold hover:underline">
              Sign up free →
            </Link>
          </p>
        </div>
      </motion.div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div
          style={{
            minHeight: '100vh',
            background: 'hsl(222 47% 7%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <div style={{ color: '#64748b', fontSize: '14px' }}>Loading...</div>
        </div>
      }
    >
      <LoginPageContent />
    </Suspense>
  );
}