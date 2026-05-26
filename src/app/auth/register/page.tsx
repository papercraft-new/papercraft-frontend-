'use client';

import { Suspense, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { motion } from 'framer-motion';
import { Eye, EyeOff, Loader2, FileSpreadsheet, Check } from 'lucide-react';
import { authApi } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import toast from 'react-hot-toast';

const registerSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Valid email required'),
  password: z
    .string()
    .min(8, 'At least 8 characters')
    .regex(/[A-Z]/, 'Must include an uppercase letter')
    .regex(/[0-9]/, 'Must include a number'),
  acceptPolicies: z.boolean().refine((value) => value === true, {
    message: 'You must accept the Terms, Privacy Policy, and Refund Policy',
  }),
});

type RegisterForm = z.infer<typeof registerSchema>;

const perks = [
  'AI OCR from handwritten images',
  'No credit card required',
];

function RegisterPageContent() {
  const router = useRouter();
  const { login } = useAuthStore();
  const [showPass, setShowPass] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      acceptPolicies: false,
    },
  });

  const password = watch('password', '');
  const strength = [
    password.length >= 8,
    /[A-Z]/.test(password),
    /[0-9]/.test(password),
    /[^a-zA-Z0-9]/.test(password),
  ].filter(Boolean).length;

  const strengthLabels = ['', 'Weak', 'Fair', 'Good', 'Strong'];
  const strengthColors = ['', 'bg-red-500', 'bg-yellow-500', 'bg-blue-500', 'bg-green-500'];

  const onSubmit = async (data: RegisterForm) => {
    try {
      const res = await authApi.register({
        name: data.name,
        email: data.email,
        password: data.password,
      });

      const { user, token } = res.data.data;
      login(user, token);
      toast.success('Account created! Welcome to Paptrix 🎉');
      router.push('/dashboard');
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { error?: string } } })?.response?.data?.error ||
        'Registration failed. Please try again.';
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
        className="w-full max-w-md relative z-10"
      >
        <div className="flex items-center justify-center gap-2.5 mb-8">
          <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-cyan-500 rounded-xl flex items-center justify-center">
            <FileSpreadsheet className="w-5 h-5 text-white" />
          </div>
          <span className="text-xl font-bold">Paptrix</span>
        </div>

        <div className="bg-card border border-border rounded-2xl p-8 shadow-2xl">
          <h1 className="text-2xl font-bold mb-1">Create your account</h1>
          <p className="text-sm text-muted-foreground mb-6">
            Start creating professional exam papers in minutes.
          </p>

          <div className="grid grid-cols-2 gap-2 mb-6">
            {perks.map((perk) => (
              <div key={perk} className="flex items-start gap-1.5 text-[12px] text-muted-foreground">
                <Check className="w-3 h-3 text-green-400 mt-0.5 flex-shrink-0" />
                {perk}
              </div>
            ))}
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Full Name
              </Label>
              <Input
                {...register('name')}
                placeholder="Enter your full name"
                className="mt-1"
                autoComplete="name"
              />
              {errors.name && <p className="text-xs text-red-400 mt-1">{errors.name.message}</p>}
            </div>

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
              {errors.email && <p className="text-xs text-red-400 mt-1">{errors.email.message}</p>}
            </div>

            <div>
              <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Password
              </Label>

              <div className="relative mt-1">
                <Input
                  {...register('password')}
                  type={showPass ? 'text' : 'password'}
                  placeholder="Min 8 chars, 1 uppercase, 1 number"
                  className="pr-10"
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              {password.length > 0 && (
                <div className="mt-2">
                  <div className="flex gap-1">
                    {[1, 2, 3, 4].map((i) => (
                      <div
                        key={i}
                        className={`h-1 flex-1 rounded-full transition-all ${
                          strength >= i ? strengthColors[strength] : 'bg-muted'
                        }`}
                      />
                    ))}
                  </div>
                  <p className={`text-[11px] mt-1 ${strengthColors[strength].replace('bg-', 'text-')}`}>
                    {strengthLabels[strength]}
                  </p>
                </div>
              )}

              {errors.password && (
                <p className="text-xs text-red-400 mt-1">{errors.password.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <label className="flex items-start gap-3 rounded-lg border border-border p-3">
                <input
                  type="checkbox"
                  {...register('acceptPolicies')}
                  className="mt-1 h-4 w-4 rounded border-border"
                />
                <span className="text-xs text-muted-foreground leading-5">
                  I agree to the{' '}
                  <Link
                    href="/terms-and-conditions"
                    target="_blank"
                    className="text-primary font-semibold hover:underline"
                  >
                    Terms & Conditions
                  </Link>
                  ,{' '}
                  <Link
                    href="/privacy-policy"
                    target="_blank"
                    className="text-primary font-semibold hover:underline"
                  >
                    Privacy Policy
                  </Link>{' '}
                  and{' '}
                  <Link
                    href="/refund-policy"
                    target="_blank"
                    className="text-primary font-semibold hover:underline"
                  >
                    Refund Policy
                  </Link>
                  .
                </span>
              </label>

              {errors.acceptPolicies && (
                <p className="text-xs text-red-400">{errors.acceptPolicies.message}</p>
              )}
            </div>

            <Button
              type="submit"
              disabled={isSubmitting}
              className="w-full btn-gradient gap-2"
            >
              {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              Create Free Account
            </Button>
          </form>

          <p className="text-sm text-center text-muted-foreground mt-4">
            Already have an account?{' '}
            <Link href="/auth/login" className="text-primary font-semibold hover:underline">
              Sign in →
            </Link>
          </p>
        </div>
      </motion.div>
    </div>
  );
}

export default function RegisterPage() {
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
      <RegisterPageContent />
    </Suspense>
  );
}