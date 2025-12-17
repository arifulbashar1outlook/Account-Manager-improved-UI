import React, { useState, useEffect, useMemo } from 'react';
import { Transaction, TransactionType, Category, AccountType, Account } from '../types';
import { AlertCircle, ArrowRightLeft, Landmark, Check, Wallet } from 'lucide-react';

interface TransactionFormProps {
  onAddTransaction: (t: Omit<Transaction, 'id'>) => void;
  accounts: Account[];
}

const TransactionForm: React.FC<TransactionFormProps> = ({ onAddTransaction, accounts }) => {
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [type, setType] = useState<'expense' | 'transfer' | 'withdraw'>('expense');
  const [category, setCategory] = useState<string>(Category.FOOD);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  
  const cashAccount = accounts.find(a => a.id === 'cash');
  const [accountId, setAccountId] = useState<AccountType>(accounts[0]?.id || '');
  const [targetAccountId, setTargetAccountId] = useState<AccountType>(accounts[1]?.id || accounts[0]?.id || '');
  const [error, setError] = useState<string | null>(null);

  const filteredTargetAccounts = useMemo(() => {
    return accounts.filter(a => a.id !== accountId);
  }, [accounts, accountId]);

  useEffect(() => {
    if (type === 'withdraw') {
      if (cashAccount) {
        setTargetAccountId(cashAccount.id);
        // If from account is cash, switch to something else
        if (accountId === cashAccount.id) {
          const alternative = accounts.find(a => a.id !== 'cash');
          if (alternative) setAccountId(alternative.id);
        }
      }
    }
  }, [type, cashAccount, accounts]);

  useEffect(() => {
    if (type !== 'withdraw' && accountId === targetAccountId) {
      if (filteredTargetAccounts.length > 0) {
        setTargetAccountId(filteredTargetAccounts[0].id);
      }
    }
  }, [accountId, targetAccountId, filteredTargetAccounts, type]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!amount || parseFloat(amount) <= 0) {
      setError("Please enter a valid amount");
      return;
    }

    onAddTransaction({
      description: description || (type === 'withdraw' ? 'ATM Withdrawal' : (type === 'transfer' ? 'Internal Transfer' : 'No Description')),
      amount: parseFloat(amount),
      type: (type === 'withdraw' ? 'transfer' : type) as TransactionType,
      category: (type === 'transfer' || type === 'withdraw') ? Category.TRANSFER : category,
      date,
      accountId,
      targetAccountId: (type === 'transfer' || type === 'withdraw') ? targetAccountId : undefined
    });

    setAmount('');
    setDescription('');
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 bg-white dark:bg-zinc-900 p-6 rounded-md-card border border-gray-100 dark:border-zinc-800 shadow-sm">
      <div className="flex bg-md-surface-container p-1 rounded-full overflow-x-auto">
        {['expense', 'transfer', 'withdraw'].map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setType(t as any)}
            className={`flex-1 py-2 px-3 text-[10px] font-black rounded-full transition-all uppercase tracking-widest whitespace-nowrap ${
              type === t ? 'bg-md-primary text-white shadow-md' : 'text-md-on-surface-variant'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {error && (
        <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-900/40 rounded-xl flex items-center gap-2 text-xs font-bold text-red-600 dark:text-red-400">
           <AlertCircle size={14} />
           {error}
        </div>
      )}

      <div className="space-y-5">
        <div className="relative">
          <label className="text-[10px] font-bold text-md-primary uppercase absolute -top-2 left-3 bg-white dark:bg-zinc-900 px-1 z-10">Amount</label>
          <div className="flex items-center border-2 border-md-outline/20 rounded-2xl focus-within:border-md-primary px-4 py-4 transition-all">
            <span className="text-gray-400 font-bold mr-2">Tk</span>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full bg-transparent outline-none text-2xl font-black"
              placeholder="0.00"
              required
            />
          </div>
        </div>

        {type === 'expense' ? (
          <div className="grid grid-cols-2 gap-4">
             <div className="relative">
               <label className="text-[10px] font-bold text-md-primary uppercase absolute -top-2 left-3 bg-white dark:bg-zinc-900 px-1 z-10">Pay From</label>
               <select
                  value={accountId}
                  onChange={(e) => setAccountId(e.target.value)}
                  className="w-full px-4 py-4 bg-transparent border-2 border-md-outline/20 rounded-2xl focus:border-md-primary outline-none appearance-none font-black text-sm"
                >
                  {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                </select>
             </div>
             <div className="relative">
               <label className="text-[10px] font-bold text-md-primary uppercase absolute -top-2 left-3 bg-white dark:bg-zinc-900 px-1 z-10">Category</label>
               <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-4 py-4 bg-transparent border-2 border-md-outline/20 rounded-2xl focus:border-md-primary outline-none appearance-none font-black text-sm"
                >
                  {Object.values(Category).map(c => <option key={c} value={c}>{c}</option>)}
                </select>
             </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 p-4 bg-md-surface-container rounded-3xl border border-dashed border-md-outline/30">
             <div className="relative">
                <label className="text-[10px] font-bold text-md-primary uppercase mb-1.5 block ml-1">From Account</label>
                <select
                    value={accountId}
                    onChange={(e) => setAccountId(e.target.value)}
                    className="w-full px-4 py-3 bg-white dark:bg-zinc-800 border border-md-outline/20 rounded-xl outline-none font-black text-sm appearance-none"
                >
                    {accounts.filter(a => type === 'withdraw' ? a.id !== 'cash' : true).map(a => (
                      <option key={a.id} value={a.id}>{a.name}</option>
                    ))}
                </select>
             </div>
             <div className="flex justify-center -my-2">
                <div className="bg-white dark:bg-zinc-800 p-2 rounded-full border shadow-sm">
                   <ArrowRightLeft size={16} className="text-md-primary rotate-90" />
                </div>
             </div>
             <div className="relative">
                <label className="text-[10px] font-bold text-md-primary uppercase mb-1.5 block ml-1">To Account</label>
                {type === 'withdraw' ? (
                  <div className="w-full px-4 py-3 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-xl font-black text-sm flex items-center gap-2 text-emerald-700 dark:text-emerald-400">
                    <Wallet size={16} /> Cash Wallet
                  </div>
                ) : (
                  <select
                      value={targetAccountId}
                      onChange={(e) => setTargetAccountId(e.target.value)}
                      className="w-full px-4 py-3 bg-white dark:bg-zinc-800 border border-md-outline/20 rounded-xl outline-none font-black text-sm appearance-none"
                  >
                      {filteredTargetAccounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                  </select>
                )}
             </div>
          </div>
        )}

        <div className="relative">
          <label className="text-[10px] font-bold text-md-primary uppercase absolute -top-2 left-3 bg-white dark:bg-zinc-900 px-1 z-10">Description</label>
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full px-4 py-4 bg-transparent border-2 border-md-outline/20 rounded-2xl focus:border-md-primary outline-none font-bold"
            placeholder={type === 'withdraw' ? 'ATM Withdrawal' : 'e.g. Lunch, Grocery'}
          />
        </div>

        <div className="relative">
          <label className="text-[10px] font-bold text-md-primary uppercase absolute -top-2 left-3 bg-white dark:bg-zinc-900 px-1 z-10">Date</label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full px-4 py-4 bg-transparent border-2 border-md-outline/20 rounded-2xl focus:border-md-primary outline-none font-black text-sm"
          />
        </div>
      </div>

      <button
        type="submit"
        className="w-full bg-md-primary text-white font-black py-5 rounded-[20px] shadow-lg hover:shadow-xl active:scale-95 transition-all text-xs uppercase tracking-[0.2em] flex items-center justify-center gap-3"
      >
        {type === 'withdraw' ? <Landmark size={18} /> : (type === 'transfer' ? <ArrowRightLeft size={18} /> : <Check size={18} />)}
        Confirm Transaction
      </button>
    </form>
  );
};

export default TransactionForm;