import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Eye, EyeOff, Mail, Lock, User, Zap, ArrowRight, Globe } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

const schema = z.object({
  displayName: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  confirmPassword: z.string(),
}).refine(data => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword'],
});

type FormData = z.infer<typeof schema>;

export default function RegisterPage() {
  const { signUp, signInWithGoogle } = useAuth();
  const navigate = useNavigate();
  const [showPass, setShowPass] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  const onSubmit = async (data: FormData) => {
    try {
      await signUp(data.email, data.password, data.displayName);
      toast.success('Account created! Please verify your email.');
      navigate('/onboarding');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Registration failed';
      toast.error(msg.includes('email-already-in-use') ? 'Email already registered' : msg);
    }
  };

  const handleGoogle = async () => {
    setGoogleLoading(true);
    try {
      await signInWithGoogle();
      navigate('/onboarding');
    } catch {
      toast.error('Google sign-in failed. Please try again.');
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-[400px]"
      >
        {/* Logo */}
        <div className="flex items-center gap-2.5 mb-8">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center">
            <Zap className="w-5 h-5 text-white" />
          </div>
          <span className="font-bold text-lg">WorkOS</span>
        </div>

        <h1 className="text-2xl font-bold mb-1">Create your account</h1>
        <p className="text-muted-foreground text-sm mb-8">Start managing your work with WorkOS</p>

        <button
          onClick={handleGoogle}
          disabled={googleLoading}
          id="google-register-btn"
          className="w-full flex items-center justify-center gap-3 border border-border bg-card hover:bg-muted text-foreground py-2.5 rounded-xl text-sm font-medium transition-all mb-4 disabled:opacity-60"
        >
          <Globe className="w-4 h-4 text-indigo-400" />
          {googleLoading ? 'Connecting...' : 'Sign up with Google'}
        </button>

        <div className="relative flex items-center gap-3 mb-4">
          <div className="flex-1 h-px bg-border" />
          <span className="text-xs text-muted-foreground">or</span>
          <div className="flex-1 h-px bg-border" />
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="input-group">
            <label className="text-sm font-medium">Full Name</label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                {...register('displayName')}
                type="text"
                id="register-name"
                placeholder="Your name"
                className={cn(
                  'w-full pl-10 pr-4 py-2.5 bg-input border rounded-xl text-sm outline-none transition-colors',
                  'focus:border-primary focus:ring-1 focus:ring-primary/30',
                  errors.displayName ? 'border-destructive' : 'border-border'
                )}
              />
            </div>
            {errors.displayName && <p className="text-xs text-destructive">{errors.displayName.message}</p>}
          </div>

          <div className="input-group">
            <label className="text-sm font-medium">Email</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                {...register('email')}
                type="email"
                id="register-email"
                placeholder="you@example.com"
                className={cn(
                  'w-full pl-10 pr-4 py-2.5 bg-input border rounded-xl text-sm outline-none transition-colors',
                  'focus:border-primary focus:ring-1 focus:ring-primary/30',
                  errors.email ? 'border-destructive' : 'border-border'
                )}
              />
            </div>
            {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
          </div>

          <div className="input-group">
            <label className="text-sm font-medium">Password</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                {...register('password')}
                type={showPass ? 'text' : 'password'}
                id="register-password"
                placeholder="••••••••"
                className={cn(
                  'w-full pl-10 pr-10 py-2.5 bg-input border rounded-xl text-sm outline-none transition-colors',
                  'focus:border-primary focus:ring-1 focus:ring-primary/30',
                  errors.password ? 'border-destructive' : 'border-border'
                )}
              />
              <button
                type="button"
                onClick={() => setShowPass(!showPass)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {errors.password && <p className="text-xs text-destructive">{errors.password.message}</p>}
          </div>

          <div className="input-group">
            <label className="text-sm font-medium">Confirm Password</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                {...register('confirmPassword')}
                type="password"
                id="register-confirm-password"
                placeholder="••••••••"
                className={cn(
                  'w-full pl-10 pr-4 py-2.5 bg-input border rounded-xl text-sm outline-none transition-colors',
                  'focus:border-primary focus:ring-1 focus:ring-primary/30',
                  errors.confirmPassword ? 'border-destructive' : 'border-border'
                )}
              />
            </div>
            {errors.confirmPassword && <p className="text-xs text-destructive">{errors.confirmPassword.message}</p>}
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            id="register-submit-btn"
            className="w-full bg-gradient-to-r from-indigo-500 to-violet-600 hover:from-indigo-600 hover:to-violet-700 text-white py-2.5 rounded-xl text-sm font-semibold transition-all flex items-center justify-center gap-2 disabled:opacity-60"
          >
            {isSubmitting ? (
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>Create Account <ArrowRight className="w-4 h-4" /></>
            )}
          </button>
        </form>

        <p className="text-center text-sm text-muted-foreground mt-6">
          Already have an account?{' '}
          <Link to="/login" className="text-primary font-medium hover:underline">
            Sign in
          </Link>
        </p>
      </motion.div>
    </div>
  );
}
