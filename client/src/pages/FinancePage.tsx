import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  collection, query, where, onSnapshot, addDoc, updateDoc, deleteDoc, doc, serverTimestamp, Timestamp
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';
import { COLLECTIONS } from '@/lib/collections';
import { Expense, Income, ExpenseCategory, TeamContribution } from '@/types';
import {
  IndianRupee, TrendingUp, TrendingDown, Plus, PieChart as PieIcon,
  X, ArrowUpRight, Wallet, Pencil, Trash2, Users, UserPlus, Award, Check, Info
} from 'lucide-react';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend } from 'recharts';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

const EXPENSE_CATEGORIES: ExpenseCategory[] = [
  'registration', 'travel', 'accommodation', 'food',
  'printing', 'equipment', 'software', 'marketing', 'miscellaneous',
];

const INCOME_TYPES = ['prize', 'sponsorship', 'grant', 'freelance', 'consulting', 'other'];

const COLORS = [
  '#6366f1', '#8b5cf6', '#ec4899', '#f59e0b',
  '#10b981', '#3b82f6', '#ef4444', '#06b6d4', '#84cc16',
];

function formatDate(val: Timestamp | Date | string | undefined): string {
  if (!val) return '—';
  try {
    const d = val instanceof Timestamp ? val.toDate() : new Date(val as string);
    return format(d, 'dd MMM yyyy');
  } catch {
    return '—';
  }
}

export default function FinancePage() {
  const { userProfile } = useAuth();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [incomes, setIncomes] = useState<Income[]>([]);
  const [teams, setTeams] = useState<TeamContribution[]>([]);

  // Team Modal state
  const [isTeamModalOpen, setIsTeamModalOpen] = useState(false);
  const [editingTeam, setEditingTeam] = useState<TeamContribution | null>(null);
  const [teamName, setTeamName] = useState('');
  const [memberNamesInput, setMemberNamesInput] = useState('');
  const [selectedTxIds, setSelectedTxIds] = useState<string[]>([]);
  const [savingTeam, setSavingTeam] = useState(false);

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTx, setEditingTx] = useState<{ id: string; txType: 'expense' | 'income' } | null>(null);
  const [amount, setAmount] = useState('');
  const [desc, setDesc] = useState('');
  const [category, setCategory] = useState<ExpenseCategory>('miscellaneous');
  const [incomeType, setIncomeType] = useState('prize');
  const [type, setType] = useState<'expense' | 'income'>('expense');
  const [txDate, setTxDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!userProfile?.orgId) return;

    const expQ = query(
      collection(db, COLLECTIONS.EXPENSES),
      where('orgId', '==', userProfile.orgId)
    );
    const unsubExp = onSnapshot(expQ, snap => {
      setExpenses(snap.docs.map(d => ({ id: d.id, ...d.data() } as Expense)));
    }, err => {
      console.error('Expenses snapshot error:', err);
    });

    const incQ = query(
      collection(db, COLLECTIONS.INCOME),
      where('orgId', '==', userProfile.orgId)
    );
    const unsubInc = onSnapshot(incQ, snap => {
      setIncomes(snap.docs.map(d => ({ id: d.id, ...d.data() } as Income)));
    }, err => {
      console.error('Income snapshot error:', err);
    });

    const tmQ = query(
      collection(db, COLLECTIONS.TEAMMATES),
      where('orgId', '==', userProfile.orgId)
    );
    const unsubTm = onSnapshot(tmQ, snap => {
      setTeams(snap.docs.map(d => ({ id: d.id, ...d.data() } as TeamContribution)));
    }, err => {
      console.error('Teams snapshot error:', err);
    });

    return () => { unsubExp(); unsubInc(); unsubTm(); };
  }, [userProfile?.orgId]);

  const handleOpenTeamModal = (team?: TeamContribution) => {
    if (!userProfile?.orgId) {
      toast.error('Organization not set up.');
      return;
    }
    if (team) {
      setEditingTeam(team);
      setTeamName(team.teamName || '');
      setMemberNamesInput(team.memberNames ? team.memberNames.join(', ') : '');
      setSelectedTxIds(team.associatedTransactionIds || []);
    } else {
      setEditingTeam(null);
      setTeamName('');
      setMemberNamesInput('');
      setSelectedTxIds([]);
    }
    setIsTeamModalOpen(true);
  };

  const handleCloseTeamModal = () => {
    setIsTeamModalOpen(false);
    setEditingTeam(null);
    setTeamName('');
    setMemberNamesInput('');
    setSelectedTxIds([]);
  };

  const handleToggleTxSelection = (txId: string) => {
    setSelectedTxIds(prev =>
      prev.includes(txId) ? prev.filter(id => id !== txId) : [...prev, txId]
    );
  };

  const handleSaveTeam = async () => {
    if (!userProfile?.orgId) return;
    if (!teamName.trim()) {
      toast.error('Team Name is required');
      return;
    }

    const memberArray = memberNamesInput
      .split(',')
      .map(s => s.trim())
      .filter(Boolean);

    setSavingTeam(true);
    try {
      if (editingTeam) {
        await updateDoc(doc(db, COLLECTIONS.TEAMMATES, editingTeam.id), {
          teamName: teamName.trim(),
          memberNames: memberArray,
          associatedTransactionIds: selectedTxIds,
          updatedAt: serverTimestamp(),
        });
        toast.success(`Team "${teamName.trim()}" updated successfully!`);
      } else {
        await addDoc(collection(db, COLLECTIONS.TEAMMATES), {
          orgId: userProfile.orgId,
          teamName: teamName.trim(),
          memberNames: memberArray,
          associatedTransactionIds: selectedTxIds,
          createdBy: userProfile.id,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
        toast.success(`Team "${teamName.trim()}" created!`);
      }
      handleCloseTeamModal();
    } catch (err: any) {
      console.error('Save team error:', err);
      toast.error(`Failed to save team: ${err?.message || 'Unknown error'}`);
    } finally {
      setSavingTeam(false);
    }
  };

  const handleDeleteTeam = async (id: string, name: string) => {
    try {
      await deleteDoc(doc(db, COLLECTIONS.TEAMMATES, id));
      toast.success(`Team "${name}" deleted`);
    } catch (err: any) {
      toast.error(`Failed to delete team: ${err?.message || 'Unknown error'}`);
    }
  };

  const totalExpense = expenses.reduce((a, b) => a + (Number(b.amount) || 0), 0);
  const totalIncome = incomes.reduce((a, b) => a + (Number(b.amount) || 0), 0);
  const netProfit = totalIncome - totalExpense;
  const roi = totalExpense > 0 ? ((netProfit / totalExpense) * 100).toFixed(1) : '0';

  const categoryData = EXPENSE_CATEGORIES.map(cat => {
    const sum = expenses.filter(e => e.category === cat).reduce((a, b) => a + (Number(b.amount) || 0), 0);
    return { name: cat, value: sum };
  }).filter(c => c.value > 0);

  const handleOpenModal = () => {
    if (!userProfile?.orgId) {
      toast.error('Please complete onboarding (create an organization) before recording transactions.');
      return;
    }
    setEditingTx(null);
    setAmount('');
    setDesc('');
    setCategory('miscellaneous');
    setIncomeType('prize');
    setType('expense');
    setTxDate(new Date().toISOString().split('T')[0]);
    setIsModalOpen(true);
  };

  const handleClose = () => {
    setIsModalOpen(false);
    setEditingTx(null);
    setAmount('');
    setDesc('');
    setCategory('miscellaneous');
    setIncomeType('prize');
  };

  const handleEdit = (tx: (Expense & { txType: 'expense' }) | (Income & { txType: 'income' })) => {
    setEditingTx({ id: tx.id, txType: tx.txType });
    setType(tx.txType);
    setDesc(tx.description || '');
    setAmount(tx.amount ? String(tx.amount) : '');
    if (tx.txType === 'expense') {
      setCategory(tx.category || 'miscellaneous');
    } else {
      setIncomeType((tx as Income).type || 'prize');
    }
    const d = tx.date instanceof Timestamp ? tx.date.toDate() : new Date(tx.date as string);
    if (!isNaN(d.getTime())) {
      setTxDate(d.toISOString().split('T')[0]);
    }
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string, txType: 'expense' | 'income') => {
    try {
      await deleteDoc(doc(db, txType === 'expense' ? COLLECTIONS.EXPENSES : COLLECTIONS.INCOME, id));
      toast.success('Transaction deleted');
    } catch (err: any) {
      console.error('Finance delete error:', err);
      toast.error(`Failed to delete: ${err?.message || 'Unknown error'}`);
    }
  };

  const handleCreateRecord = async () => {
    if (!userProfile?.orgId) {
      toast.error('Organization not set up. Please complete onboarding first.');
      return;
    }
    if (!amount || parseFloat(amount) <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }
    if (!desc.trim()) {
      toast.error('Please enter a description');
      return;
    }

    setSaving(true);
    try {
      const parsedDate = txDate ? new Date(txDate) : new Date();

      if (editingTx) {
        const collectionName = editingTx.txType === 'expense' ? COLLECTIONS.EXPENSES : COLLECTIONS.INCOME;
        const updatePayload = editingTx.txType === 'expense' ? {
          category,
          amount: parseFloat(amount),
          description: desc.trim(),
          date: Timestamp.fromDate(parsedDate),
          updatedAt: serverTimestamp(),
        } : {
          type: incomeType,
          amount: parseFloat(amount),
          description: desc.trim(),
          date: Timestamp.fromDate(parsedDate),
          updatedAt: serverTimestamp(),
        };
        await updateDoc(doc(db, collectionName, editingTx.id), updatePayload);
        handleClose();
        toast.success(`Transaction updated successfully!`);
      } else {
        if (type === 'expense') {
          await addDoc(collection(db, COLLECTIONS.EXPENSES), {
            orgId: userProfile.orgId,
            workspaceId: '',
            projectId: '',
            category,
            amount: parseFloat(amount),
            description: desc.trim(),
            date: Timestamp.fromDate(parsedDate),
            createdBy: userProfile.id,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });
        } else {
          await addDoc(collection(db, COLLECTIONS.INCOME), {
            orgId: userProfile.orgId,
            workspaceId: '',
            projectId: '',
            type: incomeType,
            amount: parseFloat(amount),
            description: desc.trim(),
            date: Timestamp.fromDate(parsedDate),
            createdBy: userProfile.id,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });
        }

        handleClose();
        toast.success(`${type === 'expense' ? 'Expense' : 'Income'} of ₹${parseFloat(amount).toLocaleString()} recorded successfully!`);
      }
    } catch (err: any) {
      console.error('Finance save error:', err);
      toast.error(`Failed to record transaction: ${err?.message || 'Unknown error'}`);
    } finally {
      setSaving(false);
    }
  };

  // Combined & sorted transactions for display
  const allTransactions = [
    ...expenses.map(e => ({ ...e, txType: 'expense' as const })),
    ...incomes.map(i => ({ ...i, txType: 'income' as const })),
  ].sort((a, b) => {
    const dA = a.date instanceof Timestamp ? a.date.toDate() : new Date(a.date as string);
    const dB = b.date instanceof Timestamp ? b.date.toDate() : new Date(b.date as string);
    return dB.getTime() - dA.getTime();
  });

  if (!userProfile?.orgId) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4 text-center">
        <div className="w-14 h-14 rounded-2xl bg-amber-500/10 flex items-center justify-center">
          <Wallet className="w-7 h-7 text-amber-400" />
        </div>
        <h2 className="text-lg font-bold">Organization Required</h2>
        <p className="text-sm text-muted-foreground max-w-xs">
          You need to complete onboarding and create an organization before tracking finances.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Finance & Expenses</h1>
          <p className="text-sm text-muted-foreground">
            Track financial performance, expenses, ROI, and winning prizes
          </p>
        </div>
        <button
          onClick={handleOpenModal}
          id="add-transaction-btn"
          className="flex items-center gap-2 bg-gradient-to-r from-indigo-500 to-violet-600 hover:from-indigo-600 hover:to-violet-700 text-white px-4 py-2 rounded-xl text-sm font-semibold shadow-md hover:shadow-indigo-500/25 transition-all"
        >
          <Plus className="w-4 h-4" /> Add Transaction
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Total Income', value: totalIncome, color: 'emerald', prefix: '₹' },
          { label: 'Total Expenses', value: totalExpense, color: 'amber', prefix: '₹' },
          { label: 'Net Profit', value: netProfit, color: 'indigo', prefix: '₹' },
          { label: 'ROI', value: parseFloat(roi), color: 'violet', suffix: '%' },
        ].map(card => (
          <motion.div
            key={card.label}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className={`glass-card p-5 border-l-4 border-${card.color}-500`}
          >
            <span className="text-xs text-muted-foreground block">{card.label}</span>
            <p className={`text-2xl font-bold text-${card.color}-400 mt-1`}>
              {card.prefix}{card.value.toLocaleString('en-IN')}{card.suffix}
            </p>
          </motion.div>
        ))}
      </div>

      {/* Charts + Transactions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Pie Chart */}
        <div className="glass-card p-5">
          <h3 className="font-semibold text-base mb-4 flex items-center gap-2">
            <PieIcon className="w-4 h-4 text-primary" /> Expense Breakdown
          </h3>
          {categoryData.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center gap-2">
              <PieIcon className="w-8 h-8 text-muted-foreground/30" />
              <p className="text-sm text-muted-foreground">No expense data yet</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie
                  data={categoryData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`}
                  labelLine={false}
                >
                  {categoryData.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(val: any) => `₹${Number(val).toLocaleString('en-IN')}`} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Recent Transactions */}
        <div className="glass-card p-5">
          <h3 className="font-semibold text-base mb-4">Recent Transactions</h3>
          {allTransactions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center gap-2">
              <IndianRupee className="w-8 h-8 text-muted-foreground/30" />
              <p className="text-sm text-muted-foreground">No transactions yet</p>
              <button
                onClick={handleOpenModal}
                className="text-xs text-primary hover:underline flex items-center gap-1"
              >
                <Plus className="w-3 h-3" /> Add first transaction
              </button>
            </div>
          ) : (
            <div className="space-y-2 max-h-72 overflow-y-auto no-scrollbar">
              {allTransactions.map(tx => (
                <div
                  key={tx.id}
                  className="p-3 bg-muted/40 hover:bg-muted/60 rounded-xl flex items-center justify-between transition-colors group"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">{tx.description}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs text-muted-foreground capitalize">
                        {tx.txType === 'expense' ? (tx as Expense).category : `Income · ${(tx as Income).type}`}
                      </span>
                      <span className="text-xs text-muted-foreground/60">·</span>
                      <span className="text-xs text-muted-foreground">{formatDate(tx.date)}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0 ml-3">
                    <span className={cn(
                      'text-sm font-bold',
                      tx.txType === 'expense' ? 'text-amber-400' : 'text-emerald-400'
                    )}>
                      {tx.txType === 'expense' ? '-' : '+'}₹{Number(tx.amount).toLocaleString('en-IN')}
                    </span>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => handleEdit(tx as any)}
                        className="p-1 text-muted-foreground hover:text-primary transition-colors"
                        title="Edit transaction"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDelete(tx.id, tx.txType)}
                        className="p-1 text-muted-foreground hover:text-red-400 transition-colors"
                        title="Delete transaction"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── TEAM & COMPETITION CONTRIBUTION SECTION ─────────────────── */}
      <div className="glass-card p-6 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold flex items-center gap-2">
              <Users className="w-5 h-5 text-indigo-400" /> Team & Competition Contributions
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Record teams, link competition transactions (Expenses & Income), and track total spent vs earned per team.
            </p>
          </div>
          <button
            onClick={() => handleOpenTeamModal()}
            className="flex items-center gap-2 bg-gradient-to-r from-indigo-500 to-violet-600 hover:from-indigo-600 hover:to-violet-700 text-white px-4 py-2 rounded-xl text-xs font-semibold shadow-md transition-all shrink-0"
          >
            <UserPlus className="w-4 h-4" /> Add Team
          </button>
        </div>

        {teams.length === 0 ? (
          <div className="p-8 text-center bg-muted/20 border border-dashed border-border/60 rounded-2xl flex flex-col items-center gap-2">
            <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 flex items-center justify-center">
              <Users className="w-6 h-6 text-indigo-400" />
            </div>
            <p className="text-sm font-semibold">No teams added yet</p>
            <p className="text-xs text-muted-foreground max-w-sm">
              Add your teams here and link the competitions/expenses from history to see team financial contributions.
            </p>
            <button
              onClick={() => handleOpenTeamModal()}
              className="mt-2 text-xs text-primary font-semibold hover:underline flex items-center gap-1"
            >
              <UserPlus className="w-3.5 h-3.5" /> Add First Team
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {teams.map(team => {
              const selectedIds = team.associatedTransactionIds || [];
              const linkedExpenses = expenses.filter(e => selectedIds.includes(e.id));
              const linkedIncomes = incomes.filter(i => selectedIds.includes(i.id));

              const totalTeamExpense = linkedExpenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
              const totalTeamIncome = linkedIncomes.reduce((sum, i) => sum + (Number(i.amount) || 0), 0);
              const teamProfit = totalTeamIncome - totalTeamExpense;

              return (
                <div
                  key={team.id}
                  className="bg-card/70 border border-border/70 p-5 rounded-2xl hover:border-indigo-500/40 transition-all flex flex-col justify-between space-y-4 group relative"
                >
                  <div className="space-y-3">
                    {/* Team Header */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center font-bold text-white text-base shadow-sm shrink-0">
                          {team.teamName[0]?.toUpperCase() || 'T'}
                        </div>
                        <div className="min-w-0">
                          <h4 className="font-bold text-base text-foreground truncate">{team.teamName}</h4>
                          <div className="flex flex-wrap gap-1 mt-0.5">
                            {team.memberNames && team.memberNames.length > 0 ? (
                              team.memberNames.map((m, idx) => (
                                <span key={idx} className="text-[11px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground font-medium">
                                  {m}
                                </span>
                              ))
                            ) : (
                              <span className="text-xs text-muted-foreground/60 italic">No members listed</span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                        <button
                          onClick={() => handleOpenTeamModal(team)}
                          className="p-1 text-muted-foreground hover:text-primary transition-colors"
                          title="Edit Team"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteTeam(team.id, team.teamName)}
                          className="p-1 text-muted-foreground hover:text-red-400 transition-colors"
                          title="Delete Team"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Stat Boxes with Hover Tooltips */}
                    <div className="grid grid-cols-2 gap-2 pt-2 border-t border-border/40 text-xs">
                      {/* Total Expenses (Hover to view selected competitions) */}
                      <div className="relative group/exp bg-amber-500/10 border border-amber-500/20 p-2.5 rounded-xl cursor-pointer">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] text-amber-400/90 font-medium">Total Expense</span>
                          <Info className="w-3 h-3 text-amber-400/60" />
                        </div>
                        <span className="font-bold text-amber-400 text-sm block mt-0.5">
                          ₹{totalTeamExpense.toLocaleString('en-IN')}
                        </span>
                        <span className="text-[10px] text-muted-foreground block mt-0.5">
                          {linkedExpenses.length} competition{linkedExpenses.length !== 1 ? 's' : ''} (Hover for details)
                        </span>

                        {/* Hover Popover for Expenses */}
                        <div className="absolute left-0 bottom-full mb-2 w-64 p-3 bg-popover border border-border rounded-xl shadow-2xl z-30 hidden group-hover/exp:block pointer-events-none transition-all">
                          <p className="text-[11px] font-bold text-amber-400 mb-1.5 flex items-center gap-1 border-b border-border/40 pb-1">
                            💸 Selected Expense Competitions ({linkedExpenses.length})
                          </p>
                          {linkedExpenses.length === 0 ? (
                            <p className="text-[11px] text-muted-foreground italic">No expense competitions selected</p>
                          ) : (
                            <div className="space-y-1.5 max-h-36 overflow-y-auto no-scrollbar">
                              {linkedExpenses.map(e => (
                                <div key={e.id} className="flex items-center justify-between text-[11px]">
                                  <span className="truncate text-foreground font-medium pr-2">{e.description}</span>
                                  <span className="font-bold text-amber-400 shrink-0">₹{Number(e.amount).toLocaleString('en-IN')}</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Total Income (Hover to view selected prizes) */}
                      <div className="relative group/inc bg-emerald-500/10 border border-emerald-500/20 p-2.5 rounded-xl cursor-pointer">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] text-emerald-400/90 font-medium">Total Income</span>
                          <Info className="w-3 h-3 text-emerald-400/60" />
                        </div>
                        <span className="font-bold text-emerald-400 text-sm block mt-0.5">
                          ₹{totalTeamIncome.toLocaleString('en-IN')}
                        </span>
                        <span className="text-[10px] text-muted-foreground block mt-0.5">
                          {linkedIncomes.length} prize{linkedIncomes.length !== 1 ? 's' : ''} (Hover for details)
                        </span>

                        {/* Hover Popover for Income */}
                        <div className="absolute right-0 bottom-full mb-2 w-64 p-3 bg-popover border border-border rounded-xl shadow-2xl z-30 hidden group-hover/inc:block pointer-events-none transition-all">
                          <p className="text-[11px] font-bold text-emerald-400 mb-1.5 flex items-center gap-1 border-b border-border/40 pb-1">
                            💰 Selected Income / Prizes ({linkedIncomes.length})
                          </p>
                          {linkedIncomes.length === 0 ? (
                            <p className="text-[11px] text-muted-foreground italic">No income competitions selected</p>
                          ) : (
                            <div className="space-y-1.5 max-h-36 overflow-y-auto no-scrollbar">
                              {linkedIncomes.map(i => (
                                <div key={i.id} className="flex items-center justify-between text-[11px]">
                                  <span className="truncate text-foreground font-medium pr-2">{i.description}</span>
                                  <span className="font-bold text-emerald-400 shrink-0">₹{Number(i.amount).toLocaleString('en-IN')}</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Net Profit Summary */}
                    <div className="flex items-center justify-between bg-muted/20 px-3 py-2 rounded-xl text-xs">
                      <span className="text-muted-foreground">Team Net Profit:</span>
                      <span className={cn('font-bold', teamProfit >= 0 ? 'text-emerald-400' : 'text-amber-400')}>
                        {teamProfit >= 0 ? '+' : ''}₹{teamProfit.toLocaleString('en-IN')}
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={() => handleOpenTeamModal(team)}
                    className="w-full py-2 text-xs text-indigo-400 hover:text-indigo-300 bg-indigo-500/10 hover:bg-indigo-500/20 rounded-xl font-semibold transition-all text-center border border-indigo-500/20"
                  >
                    Edit Team & Competitions
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Create Transaction Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="bg-card border border-border p-6 rounded-2xl w-full max-w-md space-y-4 shadow-2xl"
            >
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold">{editingTx ? 'Edit Transaction' : 'Record Transaction'}</h3>
                <button onClick={handleClose} className="text-muted-foreground hover:text-foreground">
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Type Toggle */}
              <div className="flex bg-muted p-1 rounded-xl">
                <button
                  onClick={() => setType('expense')}
                  className={cn(
                    'flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all',
                    type === 'expense' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
                  )}
                >
                  💸 Expense
                </button>
                <button
                  onClick={() => setType('income')}
                  className={cn(
                    'flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all',
                    type === 'income' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
                  )}
                >
                  💰 Income
                </button>
              </div>

              {/* Description */}
              <div>
                <label className="text-xs font-semibold text-muted-foreground block mb-1">Description *</label>
                <input
                  value={desc}
                  onChange={e => setDesc(e.target.value)}
                  placeholder={type === 'expense' ? 'e.g. Registration Fee, Travel Cost' : 'e.g. Prize Money, Sponsorship'}
                  autoFocus
                  className="w-full px-4 py-2.5 bg-input border border-border rounded-xl text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary/30 transition-colors"
                />
              </div>

              {/* Amount */}
              <div>
                <label className="text-xs font-semibold text-muted-foreground block mb-1">Amount (₹) *</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={amount}
                  onChange={e => setAmount(e.target.value)}
                  placeholder="0.00"
                  className="w-full px-4 py-2.5 bg-input border border-border rounded-xl text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary/30 transition-colors"
                />
              </div>

              {/* Date */}
              <div>
                <label className="text-xs font-semibold text-muted-foreground block mb-1">Date</label>
                <input
                  type="date"
                  value={txDate}
                  onChange={e => setTxDate(e.target.value)}
                  className="w-full px-4 py-2.5 bg-input border border-border rounded-xl text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary/30 transition-colors"
                />
              </div>

              {/* Category / Type */}
              {type === 'expense' ? (
                <div>
                  <label className="text-xs font-semibold text-muted-foreground block mb-1">Category</label>
                  <select
                    value={category}
                    onChange={e => setCategory(e.target.value as ExpenseCategory)}
                    className="w-full px-3 py-2.5 bg-input border border-border rounded-xl text-sm outline-none focus:border-primary capitalize"
                  >
                    {EXPENSE_CATEGORIES.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>
              ) : (
                <div>
                  <label className="text-xs font-semibold text-muted-foreground block mb-1">Income Type</label>
                  <select
                    value={incomeType}
                    onChange={e => setIncomeType(e.target.value)}
                    className="w-full px-3 py-2.5 bg-input border border-border rounded-xl text-sm outline-none focus:border-primary capitalize"
                  >
                    {INCOME_TYPES.map(t => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-2 pt-1">
                <button
                  onClick={handleClose}
                  className="flex-1 py-2.5 text-sm text-muted-foreground bg-muted hover:bg-muted/80 rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateRecord}
                  disabled={saving || !amount || !desc}
                  className="flex-1 py-2.5 text-sm bg-gradient-to-r from-indigo-500 to-violet-600 hover:from-indigo-600 hover:to-violet-700 text-white rounded-xl font-semibold disabled:opacity-50 flex items-center justify-center gap-2 transition-all"
                >
                  {saving ? (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    editingTx ? 'Save Changes' : 'Record'
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── Add / Edit Team Modal ────────────────────────────────────────── */}
      <AnimatePresence>
        {isTeamModalOpen && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="bg-card border border-border p-6 rounded-2xl w-full max-w-lg space-y-4 shadow-2xl max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold flex items-center gap-2">
                  <Users className="w-5 h-5 text-indigo-400" />
                  {editingTeam ? 'Edit Team' : 'Add Team'}
                </h3>
                <button onClick={handleCloseTeamModal} className="text-muted-foreground hover:text-foreground">
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Team Name */}
              <div>
                <label className="text-xs font-semibold text-muted-foreground block mb-1">Team Name *</label>
                <input
                  value={teamName}
                  onChange={e => setTeamName(e.target.value)}
                  placeholder="e.g. Team Morpheus, Alpha Squad, Vary"
                  autoFocus
                  className="w-full px-4 py-2.5 bg-input border border-border rounded-xl text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary/30 transition-colors"
                />
              </div>

              {/* Team Members */}
              <div>
                <label className="text-xs font-semibold text-muted-foreground block mb-1">Team Members (Comma-Separated)</label>
                <input
                  value={memberNamesInput}
                  onChange={e => setMemberNamesInput(e.target.value)}
                  placeholder="e.g. Rahul Sharma, Ananya Gupta, Yash Patel"
                  className="w-full px-4 py-2.5 bg-input border border-border rounded-xl text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary/30 transition-colors"
                />
                <p className="text-[11px] text-muted-foreground/70 mt-1">Separate member names with commas.</p>
              </div>

              {/* Select Participated Competitions (Expenses & Incomes) */}
              <div>
                {(() => {
                  const combinedTxs = [
                    ...expenses.map(e => ({ ...e, txType: 'expense' as const })),
                    ...incomes.map(i => ({ ...i, txType: 'income' as const })),
                  ];
                  return (
                    <>
                      <div className="flex items-center justify-between mb-2">
                        <label className="text-xs font-semibold text-muted-foreground block">
                          Link Competitions & Transactions (Expenses & Incomes)
                        </label>
                        {combinedTxs.length > 0 && (
                          <button
                            type="button"
                            onClick={() => {
                              if (selectedTxIds.length === combinedTxs.length) {
                                setSelectedTxIds([]);
                              } else {
                                setSelectedTxIds(combinedTxs.map(t => t.id));
                              }
                            }}
                            className="text-[11px] text-primary hover:underline font-semibold"
                          >
                            {selectedTxIds.length === combinedTxs.length ? 'Deselect All' : 'Select All'}
                          </button>
                        )}
                      </div>

                      {combinedTxs.length === 0 ? (
                        <div className="p-4 bg-muted/30 border border-border/40 rounded-xl text-xs text-muted-foreground text-center">
                          No expense or income records found in history yet. Record transactions first to link them!
                        </div>
                      ) : (
                        <div className="space-y-2 max-h-52 overflow-y-auto no-scrollbar pr-1 border border-border/40 rounded-xl p-2 bg-muted/20">
                          {combinedTxs.map(tx => {
                            const isSelected = selectedTxIds.includes(tx.id);
                            return (
                              <div
                                key={tx.id}
                                onClick={() => handleToggleTxSelection(tx.id)}
                                className={cn(
                                  'p-2.5 rounded-xl border text-xs cursor-pointer flex items-center justify-between transition-all select-none',
                                  isSelected
                                    ? 'bg-indigo-500/15 border-indigo-500/50 text-foreground'
                                    : 'bg-card/40 border-border/40 text-muted-foreground hover:bg-muted/40'
                                )}
                              >
                                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                                  <div className={cn(
                                    'w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors',
                                    isSelected ? 'bg-indigo-600 border-indigo-600 text-white' : 'border-border'
                                  )}>
                                    {isSelected && <Check className="w-3 h-3" />}
                                  </div>
                                  <div className="min-w-0">
                                    <div className="flex items-center gap-1.5">
                                      <span className={cn(
                                        'text-[10px] px-1.5 py-0.5 rounded font-bold uppercase',
                                        tx.txType === 'expense' ? 'bg-amber-500/20 text-amber-400' : 'bg-emerald-500/20 text-emerald-400'
                                      )}>
                                        {tx.txType === 'expense' ? '💸 Expense' : '💰 Income'}
                                      </span>
                                      <p className="font-semibold text-xs truncate text-foreground">{tx.description}</p>
                                    </div>
                                    <p className="text-[11px] text-muted-foreground mt-0.5">
                                      {formatDate(tx.date)}
                                    </p>
                                  </div>
                                </div>
                                <span className={cn(
                                  'font-bold shrink-0 ml-2 text-xs',
                                  tx.txType === 'expense' ? 'text-amber-400' : 'text-emerald-400'
                                )}>
                                  {tx.txType === 'expense' ? '-' : '+'}₹{Number(tx.amount).toLocaleString('en-IN')}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </>
                  );
                })()}
              </div>

              {/* Actions */}
              <div className="flex gap-2 pt-2">
                <button
                  onClick={handleCloseTeamModal}
                  className="flex-1 py-2.5 text-sm text-muted-foreground bg-muted hover:bg-muted/80 rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveTeam}
                  disabled={savingTeam || !teamName.trim()}
                  className="flex-1 py-2.5 text-sm bg-gradient-to-r from-indigo-500 to-violet-600 hover:from-indigo-600 hover:to-violet-700 text-white rounded-xl font-semibold disabled:opacity-50 flex items-center justify-center gap-2 transition-all"
                >
                  {savingTeam ? (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    editingTeam ? 'Save Changes' : 'Add Team'
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
