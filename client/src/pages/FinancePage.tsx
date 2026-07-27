import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  collection, query, where, onSnapshot, addDoc, serverTimestamp
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';
import { COLLECTIONS } from '@/lib/collections';
import { Expense, Income, ExpenseCategory } from '@/types';
import { DollarSign, TrendingUp, TrendingDown, Plus, PieChart as PieIcon, FileText, ArrowUpRight } from 'lucide-react';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from 'recharts';
import { toast } from 'sonner';

const CATEGORIES: ExpenseCategory[] = [
  'registration', 'travel', 'accommodation', 'food',
  'printing', 'equipment', 'software', 'marketing', 'miscellaneous'
];

const COLORS = ['#6366f1', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#3b82f6', '#ef4444', '#06b6d4', '#84cc16'];

export default function FinancePage() {
  const { userProfile } = useAuth();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [incomes, setIncomes] = useState<Income[]>([]);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [amount, setAmount] = useState('');
  const [desc, setDesc] = useState('');
  const [category, setCategory] = useState<ExpenseCategory>('registration');
  const [type, setType] = useState<'expense' | 'income'>('expense');

  useEffect(() => {
    if (!userProfile?.orgId) return;

    const expQ = query(collection(db, COLLECTIONS.EXPENSES), where('orgId', '==', userProfile.orgId));
    const unsubExp = onSnapshot(expQ, snap => {
      setExpenses(snap.docs.map(d => ({ id: d.id, ...d.data() } as Expense)));
    });

    const incQ = query(collection(db, COLLECTIONS.INCOME), where('orgId', '==', userProfile.orgId));
    const unsubInc = onSnapshot(incQ, snap => {
      setIncomes(snap.docs.map(d => ({ id: d.id, ...d.data() } as Income)));
    });

    return () => { unsubExp(); unsubInc(); };
  }, [userProfile?.orgId]);

  const totalExpense = expenses.reduce((a, b) => a + (b.amount || 0), 0);
  const totalIncome = incomes.reduce((a, b) => a + (b.amount || 0), 0);
  const netProfit = totalIncome - totalExpense;
  const roi = totalExpense > 0 ? ((netProfit / totalExpense) * 100).toFixed(1) : '0';

  const categoryData = CATEGORIES.map(cat => {
    const sum = expenses.filter(e => e.category === cat).reduce((a, b) => a + b.amount, 0);
    return { name: cat, value: sum };
  }).filter(c => c.value > 0);

  const handleCreateRecord = async () => {
    if (!amount || !desc || !userProfile?.orgId) return;
    try {
      if (type === 'expense') {
        await addDoc(collection(db, COLLECTIONS.EXPENSES), {
          orgId: userProfile.orgId,
          workspaceId: '',
          projectId: '',
          category,
          amount: parseFloat(amount),
          description: desc,
          date: serverTimestamp(),
          createdBy: userProfile.id,
          createdAt: serverTimestamp(),
        });
      } else {
        await addDoc(collection(db, COLLECTIONS.INCOME), {
          orgId: userProfile.orgId,
          workspaceId: '',
          projectId: '',
          type: 'prize',
          amount: parseFloat(amount),
          description: desc,
          date: serverTimestamp(),
          createdBy: userProfile.id,
          createdAt: serverTimestamp(),
        });
      }

      setAmount('');
      setDesc('');
      setIsModalOpen(false);
      toast.success(`${type === 'expense' ? 'Expense' : 'Income'} recorded`);
    } catch {
      toast.error('Failed to record transaction');
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Finance & Expenses</h1>
          <p className="text-sm text-muted-foreground">Track financial performance, expenses, ROI, and winning prizes</p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          id="add-transaction-btn"
          className="flex items-center gap-2 bg-gradient-to-r from-indigo-500 to-violet-600 hover:from-indigo-600 hover:to-violet-700 text-white px-4 py-2 rounded-xl text-sm font-semibold shadow-md"
        >
          <Plus className="w-4 h-4" /> Add Transaction
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="glass-card p-5 border-l-4 border-emerald-500">
          <span className="text-xs text-muted-foreground">Total Income</span>
          <p className="text-2xl font-bold text-emerald-400 mt-1">${totalIncome.toLocaleString()}</p>
        </div>
        <div className="glass-card p-5 border-l-4 border-amber-500">
          <span className="text-xs text-muted-foreground">Total Expenses</span>
          <p className="text-2xl font-bold text-amber-400 mt-1">${totalExpense.toLocaleString()}</p>
        </div>
        <div className="glass-card p-5 border-l-4 border-indigo-500">
          <span className="text-xs text-muted-foreground">Net Profit</span>
          <p className="text-2xl font-bold text-indigo-400 mt-1">${netProfit.toLocaleString()}</p>
        </div>
        <div className="glass-card p-5 border-l-4 border-violet-500">
          <span className="text-xs text-muted-foreground">ROI</span>
          <p className="text-2xl font-bold text-violet-400 mt-1">{roi}%</p>
        </div>
      </div>

      {/* Charts & Breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="glass-card p-5">
          <h3 className="font-semibold text-base mb-4 flex items-center gap-2">
            <PieIcon className="w-4 h-4 text-primary" /> Expense Breakdown by Category
          </h3>
          {categoryData.length === 0 ? (
            <p className="text-sm text-muted-foreground py-12 text-center">No expense records yet.</p>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={categoryData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
                  {categoryData.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="glass-card p-5">
          <h3 className="font-semibold text-base mb-4">Recent Transactions</h3>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {expenses.map(e => (
              <div key={e.id} className="p-3 bg-muted/40 rounded-xl flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">{e.description}</p>
                  <span className="text-xs text-muted-foreground capitalize">{e.category}</span>
                </div>
                <span className="text-sm font-bold text-amber-400">-${e.amount}</span>
              </div>
            ))}
            {incomes.map(i => (
              <div key={i.id} className="p-3 bg-muted/40 rounded-xl flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">{i.description}</p>
                  <span className="text-xs text-muted-foreground capitalize">Income ({i.type})</span>
                </div>
                <span className="text-sm font-bold text-emerald-400">+${i.amount}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-card border border-border p-6 rounded-2xl w-full max-w-md space-y-4">
            <h3 className="text-lg font-bold">Record Transaction</h3>
            <div className="flex bg-muted p-1 rounded-xl">
              <button
                onClick={() => setType('expense')}
                className={`flex-1 py-1.5 text-xs font-semibold rounded-lg ${type === 'expense' ? 'bg-background text-foreground' : 'text-muted-foreground'}`}
              >
                Expense
              </button>
              <button
                onClick={() => setType('income')}
                className={`flex-1 py-1.5 text-xs font-semibold rounded-lg ${type === 'income' ? 'bg-background text-foreground' : 'text-muted-foreground'}`}
              >
                Income
              </button>
            </div>

            <input
              value={desc}
              onChange={e => setDesc(e.target.value)}
              placeholder="Description (e.g. Registration Fee, Prize Money)"
              className="w-full px-4 py-2.5 bg-input border border-border rounded-xl text-sm outline-none focus:border-primary"
            />

            <input
              type="number"
              value={amount}
              onChange={e => setAmount(e.target.value)}
              placeholder="Amount ($)"
              className="w-full px-4 py-2.5 bg-input border border-border rounded-xl text-sm outline-none focus:border-primary"
            />

            {type === 'expense' && (
              <select
                value={category}
                onChange={e => setCategory(e.target.value as ExpenseCategory)}
                className="w-full px-3 py-2 bg-input border border-border rounded-xl text-sm outline-none capitalize"
              >
                {CATEGORIES.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <button onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-sm text-muted-foreground">Cancel</button>
              <button onClick={handleCreateRecord} className="px-4 py-2 text-sm bg-primary text-white rounded-xl font-medium">Record</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
