import React, { useState } from 'react';
import { TriggerType, ActionType, AutomationRule } from '@/types';
import { Zap, ArrowRight, Plus, Trash2, CheckCircle2 } from 'lucide-react';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { COLLECTIONS } from '@/lib/collections';
import { useAuth } from '@/contexts/AuthContext';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { toast } from 'sonner';

const TRIGGERS: { type: TriggerType; label: string; description: string }[] = [
  { type: 'competition_scraped', label: 'When Competition URL is Scraped', description: 'Fires when new competition data is parsed' },
  { type: 'entity_created', label: 'When New Entity is Created', description: 'Fires when any record is added to a module' },
  { type: 'task_completed', label: 'When Task is Completed', description: 'Fires when a task status moves to Done' },
  { type: 'expense_added', label: 'When Expense is Recorded', description: 'Fires when a new financial expense is logged' },
];

const ACTIONS: { type: ActionType; label: string; description: string }[] = [
  { type: 'send_email', label: 'Send Email Notification', description: 'Automates HTML email via Nodemailer' },
  { type: 'create_notification', label: 'Create Dashboard Alert', description: 'Posts real-time alert to notification center' },
  { type: 'generate_tasks', label: 'Auto-Generate Default Tasks', description: 'Creates standard onboarding/submission tasks' },
  { type: 'recalculate_roi', label: 'Recalculate Financial ROI', description: 'Updates profit forecasts and ROI ratios' },
];

export default function AutomationBuilder() {
  const { userProfile } = useAuth();
  const { activeWorkspace } = useWorkspace();

  const [ruleName, setRuleName] = useState('');
  const [selectedTrigger, setSelectedTrigger] = useState<TriggerType>('competition_scraped');
  const [selectedAction, setSelectedAction] = useState<ActionType>('send_email');

  const handleCreateRule = async () => {
    if (!ruleName || !userProfile?.orgId || !activeWorkspace?.id) return;

    try {
      await addDoc(collection(db, 'automations'), {
        workspaceId: activeWorkspace.id,
        orgId: userProfile.orgId,
        name: ruleName,
        enabled: true,
        trigger: { type: selectedTrigger },
        action: { type: selectedAction, payload: {} },
        createdBy: userProfile.id,
        createdAt: serverTimestamp(),
      });

      setRuleName('');
      toast.success('Automation rule active!');
    } catch {
      toast.error('Failed to create automation rule');
    }
  };

  return (
    <div className="glass-card p-6 space-y-6">
      <div className="flex items-center gap-2 border-b border-border/50 pb-4">
        <Zap className="w-5 h-5 text-amber-400" />
        <div>
          <h2 className="text-lg font-bold">Automation Builder</h2>
          <p className="text-xs text-muted-foreground">Configure Trigger → Condition → Action automation workflows</p>
        </div>
      </div>

      <div className="space-y-4">
        <div>
          <label className="text-xs font-bold uppercase text-muted-foreground block mb-1">Rule Name</label>
          <input
            value={ruleName}
            onChange={e => setRuleName(e.target.value)}
            placeholder="e.g. Scrape Competition → Generate Tasks & Alert Team"
            className="w-full px-4 py-2.5 bg-input border border-border rounded-xl text-sm outline-none focus:border-primary"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Trigger Column */}
          <div className="p-4 bg-muted/30 border border-border/60 rounded-xl space-y-3">
            <span className="text-xs font-bold uppercase text-amber-400 flex items-center gap-1">
              <Zap className="w-3.5 h-3.5" /> WHEN THIS HAPPENS (TRIGGER)
            </span>
            <div className="space-y-2">
              {TRIGGERS.map(t => (
                <label
                  key={t.type}
                  onClick={() => setSelectedTrigger(t.type)}
                  className={`p-3 rounded-xl border flex items-start gap-3 cursor-pointer transition-all ${
                    selectedTrigger === t.type ? 'border-amber-500 bg-amber-500/10' : 'border-border/40 hover:bg-muted/50'
                  }`}
                >
                  <input
                    type="radio"
                    name="trigger"
                    checked={selectedTrigger === t.type}
                    onChange={() => {}}
                    className="mt-0.5 accent-amber-500"
                  />
                  <div>
                    <h4 className="text-xs font-semibold">{t.label}</h4>
                    <p className="text-[11px] text-muted-foreground">{t.description}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Action Column */}
          <div className="p-4 bg-muted/30 border border-border/60 rounded-xl space-y-3">
            <span className="text-xs font-bold uppercase text-indigo-400 flex items-center gap-1">
              <ArrowRight className="w-3.5 h-3.5" /> DO THIS (ACTION)
            </span>
            <div className="space-y-2">
              {ACTIONS.map(a => (
                <label
                  key={a.type}
                  onClick={() => setSelectedAction(a.type)}
                  className={`p-3 rounded-xl border flex items-start gap-3 cursor-pointer transition-all ${
                    selectedAction === a.type ? 'border-indigo-500 bg-indigo-500/10' : 'border-border/40 hover:bg-muted/50'
                  }`}
                >
                  <input
                    type="radio"
                    name="action"
                    checked={selectedAction === a.type}
                    onChange={() => {}}
                    className="mt-0.5 accent-indigo-500"
                  />
                  <div>
                    <h4 className="text-xs font-semibold">{a.label}</h4>
                    <p className="text-[11px] text-muted-foreground">{a.description}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>
        </div>

        <button
          onClick={handleCreateRule}
          disabled={!ruleName}
          className="w-full py-3 bg-gradient-to-r from-amber-500 to-indigo-600 hover:from-amber-600 hover:to-indigo-700 text-white rounded-xl text-xs font-bold uppercase tracking-wider disabled:opacity-50 transition-all shadow-md"
        >
          Activate Automation Workflow Rule
        </button>
      </div>
    </div>
  );
}
