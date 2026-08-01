import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  collection, query, where, onSnapshot, addDoc, serverTimestamp, Timestamp
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';
import { COLLECTIONS } from '@/lib/collections';
import { Expense, Income, ExpenseCategory } from '@/types';
import {
  DollarSign, TrendingUp, TrendingDown, Plus, PieChart as PieIcon,
  X, ArrowUpRight, Wallet
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

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
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

    return () => { unsubExp(); unsubInc(); };
  }, [userProfile?.orgId]);

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
    setIsModalOpen(true);
  };

  const handleClose = () => {
    setIsModalOpen(false);
    setAmount('');
    setDesc('');
    setCategory('miscellaneous');
    setIncomeType('prize');
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
              <DollarSign className="w-8 h-8 text-muted-foreground/30" />
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
                  className="p-3 bg-muted/40 hover:bg-muted/60 rounded-xl flex items-center justify-between transition-colors"
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
                  <span className={cn(
                    'text-sm font-bold ml-3 shrink-0',
                    tx.txType === 'expense' ? 'text-amber-400' : 'text-emerald-400'
                  )}>
                    {tx.txType === 'expense' ? '-' : '+'}₹{Number(tx.amount).toLocaleString('en-IN')}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
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
                <h3 className="text-lg font-bold">Record Transaction</h3>
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
                    'Record'
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
