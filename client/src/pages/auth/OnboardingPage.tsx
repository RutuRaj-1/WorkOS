import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Building2, Zap, ArrowRight, Check } from 'lucide-react';
import { collection, addDoc, doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';
import { COLLECTIONS } from '@/lib/collections';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

const schema = z.object({
  orgName: z.string().min(2, 'Organization name must be at least 2 characters'),
  slug: z.string().min(2, 'Slug must be at least 2 characters').regex(/^[a-z0-9-]+$/, 'Only lowercase letters, numbers, and hyphens'),
});

type FormData = z.infer<typeof schema>;

const WORKSPACE_COLORS = [
  '#6366f1', '#8b5cf6', '#ec4899', '#f59e0b',
  '#10b981', '#3b82f6', '#ef4444', '#06b6d4',
];

const WORKSPACE_EMOJIS = ['🚀', '💼', '🎯', '⚡', '🔥', '💡', '🌟', '🏆'];

export default function OnboardingPage() {
  const { currentUser, userProfile, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [orgId, setOrgId] = useState('');
  const [creating, setCreating] = useState(false);
  const [wsName, setWsName] = useState('');
  const [wsColor, setWsColor] = useState(WORKSPACE_COLORS[0]);
  const [wsEmoji, setWsEmoji] = useState(WORKSPACE_EMOJIS[0]);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  const orgName = watch('orgName');
  React.useEffect(() => {
    if (orgName) {
      setValue('slug', orgName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, ''));
    }
  }, [orgName, setValue]);

  const createOrg = async (data: FormData) => {
    if (!currentUser) return;
    try {
      const orgRef = await addDoc(collection(db, COLLECTIONS.ORGANIZATIONS), {
        name: data.orgName,
        slug: data.slug,
        ownerId: currentUser.uid,
        members: [{
          uid: currentUser.uid,
          email: currentUser.email,
          displayName: currentUser.displayName,
          role: 'admin',
          joinedAt: serverTimestamp(),
        }],
        plan: 'free',
        createdAt: serverTimestamp(),
      });

      await updateDoc(doc(db, COLLECTIONS.USERS, currentUser.uid), {
        orgId: orgRef.id,
        updatedAt: serverTimestamp(),
      });

      setOrgId(orgRef.id);
      await refreshProfile();
      setStep(1);
    } catch {
      toast.error('Failed to create organization. Please try again.');
    }
  };

  const createWorkspace = async () => {
    if (!wsName || !orgId || !currentUser) return;
    setCreating(true);
    try {
      await addDoc(collection(db, COLLECTIONS.WORKSPACES), {
        orgId,
        name: wsName,
        color: wsColor,
        emoji: wsEmoji,
        icon: 'briefcase',
        memberIds: [currentUser.uid],
        createdBy: currentUser.uid,
        createdAt: serverTimestamp(),
      });

      toast.success('Workspace created! Welcome to WorkOS 🎉');
      navigate('/dashboard');
    } catch {
      toast.error('Failed to create workspace.');
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="w-full max-w-[480px]">
        {/* Logo */}
        <div className="flex items-center gap-2.5 mb-10 justify-center">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center">
            <Zap className="w-5 h-5 text-white" />
          </div>
          <span className="font-bold text-xl">WorkOS</span>
        </div>

        {/* Progress */}
        <div className="flex items-center gap-2 mb-10 justify-center">
          {[0, 1].map(i => (
            <React.Fragment key={i}>
              <div className={cn(
                'w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-all',
                i < step ? 'bg-primary text-white' : i === step ? 'bg-primary/20 text-primary border-2 border-primary' : 'bg-muted text-muted-foreground'
              )}>
                {i < step ? <Check className="w-4 h-4" /> : i + 1}
              </div>
              {i === 0 && <div className={cn('flex-1 max-w-[80px] h-0.5 transition-all', step > 0 ? 'bg-primary' : 'bg-border')} />}
            </React.Fragment>
          ))}
        </div>

        <AnimatePresence mode="wait">
          {step === 0 && (
            <motion.div
              key="step-0"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <div className="text-center mb-8">
                <div className="w-14 h-14 bg-indigo-500/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <Building2 className="w-7 h-7 text-indigo-400" />
                </div>
                <h1 className="text-2xl font-bold mb-1">Create your organization</h1>
                <p className="text-muted-foreground text-sm">This will be your team's home on WorkOS</p>
              </div>

              <form onSubmit={handleSubmit(createOrg)} className="space-y-4">
                <div className="input-group">
                  <label className="text-sm font-medium">Organization Name</label>
                  <input
                    {...register('orgName')}
                    id="org-name"
                    placeholder="Acme Inc."
                    className={cn(
                      'w-full px-4 py-3 bg-input border rounded-xl text-sm outline-none transition-colors',
                      'focus:border-primary focus:ring-1 focus:ring-primary/30',
                      errors.orgName ? 'border-destructive' : 'border-border'
                    )}
                  />
                  {errors.orgName && <p className="text-xs text-destructive">{errors.orgName.message}</p>}
                </div>

                <div className="input-group">
                  <label className="text-sm font-medium">URL Slug</label>
                  <div className="flex">
                    <span className="px-3 py-3 bg-muted border border-r-0 border-border rounded-l-xl text-sm text-muted-foreground">
                      workos.app/
                    </span>
                    <input
                      {...register('slug')}
                      id="org-slug"
                      placeholder="acme-inc"
                      className={cn(
                        'flex-1 px-4 py-3 bg-input border rounded-r-xl text-sm outline-none transition-colors',
                        'focus:border-primary focus:ring-1 focus:ring-primary/30',
                        errors.slug ? 'border-destructive' : 'border-border'
                      )}
                    />
                  </div>
                  {errors.slug && <p className="text-xs text-destructive">{errors.slug.message}</p>}
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  id="create-org-btn"
                  className="w-full bg-gradient-to-r from-indigo-500 to-violet-600 text-white py-3 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-60 mt-2"
                >
                  {isSubmitting ? (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>Create Organization <ArrowRight className="w-4 h-4" /></>
                  )}
                </button>
              </form>
            </motion.div>
          )}

          {step === 1 && (
            <motion.div
              key="step-1"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <div className="text-center mb-8">
                <div
                  className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4 text-2xl"
                  style={{ background: wsColor + '20', border: `2px solid ${wsColor}40` }}
                >
                  {wsEmoji}
                </div>
                <h1 className="text-2xl font-bold mb-1">Create your first workspace</h1>
                <p className="text-muted-foreground text-sm">A workspace organizes your projects and team</p>
              </div>

              <div className="space-y-5">
                <div className="input-group">
                  <label className="text-sm font-medium">Workspace Name</label>
                  <input
                    value={wsName}
                    onChange={e => setWsName(e.target.value)}
                    id="ws-name"
                    placeholder="e.g. Startup, SkillBridge, Marketing"
                    className="w-full px-4 py-3 bg-input border border-border rounded-xl text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary/30 transition-colors"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium block mb-2">Emoji</label>
                  <div className="flex flex-wrap gap-2">
                    {WORKSPACE_EMOJIS.map(emoji => (
                      <button
                        key={emoji}
                        onClick={() => setWsEmoji(emoji)}
                        className={cn(
                          'w-10 h-10 rounded-xl text-xl transition-all',
                          wsEmoji === emoji ? 'bg-primary/20 ring-2 ring-primary' : 'bg-muted hover:bg-muted/80'
                        )}
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium block mb-2">Color</label>
                  <div className="flex gap-2">
                    {WORKSPACE_COLORS.map(color => (
                      <button
                        key={color}
                        onClick={() => setWsColor(color)}
                        className={cn(
                          'w-8 h-8 rounded-lg transition-all',
                          wsColor === color && 'ring-2 ring-offset-2 ring-offset-background ring-white scale-110'
                        )}
                        style={{ background: color }}
                      />
                    ))}
                  </div>
                </div>

                <button
                  onClick={createWorkspace}
                  disabled={!wsName || creating}
                  id="create-workspace-btn"
                  className="w-full bg-gradient-to-r from-indigo-500 to-violet-600 text-white py-3 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-60 mt-2"
                >
                  {creating ? (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>Create Workspace & Enter WorkOS <ArrowRight className="w-4 h-4" /></>
                  )}
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
