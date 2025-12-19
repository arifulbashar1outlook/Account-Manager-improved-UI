
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Transaction, TransactionType, Category, AccountType, Account } from '../types';
import { AlertCircle, ArrowRightLeft, Landmark, Check, Wallet, Mic, Sparkles, Loader2, Wand2, Tag } from 'lucide-react';
import { parseNaturalLanguage } from '../services/geminiService';
import VoiceWaveform from './VoiceWaveform';

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
  
  const [isAiProcessing, setIsAiProcessing] = useState(false);
  const [aiInput, setAiInput] = useState('');
  const [isListening, setIsListening] = useState(false);

  const recognitionRef = useRef<any>(null);

  const cashAccount = useMemo(() => {
    return accounts.find(a => a.id === 'cash') || 
           accounts.find(a => a.name.toLowerCase().includes('cash')) || 
           accounts[accounts.length - 1];
  }, [accounts]);

  const [accountId, setAccountId] = useState<AccountType>(accounts[0]?.id || '');
  const [targetAccountId, setTargetAccountId] = useState<AccountType>(accounts[1]?.id || accounts[0]?.id || '');
  const [error, setError] = useState<string | null>(null);

  const selectedAccount = useMemo(() => accounts.find(a => a.id === accountId), [accounts, accountId]);

  const filteredTargetAccounts = useMemo(() => {
    return accounts.filter(a => a.id !== accountId);
  }, [accounts, accountId]);

  const startListening = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitRecognition;
    if (!SpeechRecognition) {
      alert("Voice recognition not supported in this browser.");
      return;
    }
    
    recognitionRef.current = new SpeechRecognition();
    recognitionRef.current.continuous = false;
    recognitionRef.current.lang = 'en-US';
    
    recognitionRef.current.onstart = () => setIsListening(true);
    recognitionRef.current.onend = () => setIsListening(false);
    
    recognitionRef.current.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setAiInput(transcript);
      handleAiProcess(transcript);
    };

    recognitionRef.current.start();
  };

  const handleAiProcess = async (textInput: string = aiInput) => {
    if (!textInput.trim()) return;
    setIsAiProcessing(true);
    setError(null);
    try {
      const accountNames = accounts.map(a => a.name);
      const data = await parseNaturalLanguage(textInput, accountNames);
      
      if (data) {
        if (data.description) setDescription(data.description);
        if (data.amount) setAmount(data.amount.toString());
        if (data.type) {
            if (data.type === 'transfer' && data.targetAccountName?.toLowerCase().includes('cash')) {
                setType('withdraw');
            } else {
                setType(data.type);
            }
        }
        if (data.category) setCategory(data.category);
        
        if (data.accountName) {
            const foundAcc = accounts.find(a => a.name.toLowerCase() === data.accountName.toLowerCase());
            if (foundAcc) setAccountId(foundAcc.id);
        }
        
        if (data.targetAccountName) {
            const foundTarget = accounts.find(a => a.name.toLowerCase() === data.targetAccountName.toLowerCase());
            if (foundTarget) setTargetAccountId(foundTarget.id);
        }
        setAiInput('');
      }
    } catch (err) {
      setError("AI couldn't understand that. Please try again or fill manually.");
    } finally {
      setIsAiProcessing(false);
    }
  };

  useEffect(() => {
    if (type === 'withdraw' && cashAccount) {
      setTargetAccountId(cashAccount.id);
      if (accountId === cashAccount.id) {
        const alternative = accounts.find(a => a.id !== cashAccount.id);
        if (alternative) setAccountId(alternative.id);
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

    const finalType = (type === 'withdraw' ? 'transfer' : type) as TransactionType;
    const finalTarget = (type === 'transfer' || type === 'withdraw') ? targetAccountId : undefined;

    onAddTransaction({
      description: description || (type === 'withdraw' ? 'ATM Withdrawal' : (type === 'transfer' ? 'Internal Transfer' : 'No Description')),
      amount: parseFloat(amount),
      type: finalType,
      category: (type === 'transfer' || type === 'withdraw') ? Category.TRANSFER : category,
      date: new Date(date).toISOString(),
      accountId,
      targetAccountId: finalTarget
    });

    setAmount('');
    setDescription('');
    setAiInput('');
  };

  return (
    <div className="space-y-6">
      {/* AI Smart Entry Card with Mesh Gradient */}
      <div className="mesh-gradient-ai p-5 rounded-[32px] border border-white/20 shadow-xl space-y-4 relative overflow-hidden group">
        <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity animate-mesh">
           <Sparkles size={100} />
        </div>
        <div className="relative z-10 flex items-center justify-between px-1">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-white/20 rounded-xl backdrop-blur-md border border-white/10"><Sparkles size={14} className="text-white" /></div>
            <span className="text-[10px] font-medium uppercase tracking-[0.2em] text-white/90">Smart Entry</span>
          </div>
          <p className="text-[8px] font-bold text-white/60 uppercase tracking-widest">Powered by Gemini</p>
        </div>
        <div className="relative z-10 flex gap-3 items-center">
          <div className="relative flex-1">
            <input 
              type="text"
              value={aiInput}
              onChange={e => setAiInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleAiProcess()}
              placeholder="e.g. Lunch for 350 using EBL"
              className="w-full px-5 py-4 bg-white/10 backdrop-blur-xl rounded-[20px] text-xs font-semibold text-white placeholder-white/40 outline-none border border-white/10 focus:bg-white/20 transition-all shadow-inner"
            />
            {isAiProcessing ? (
              <Loader2 className="absolute right-4 top-4 animate-spin text-white" size={18} />
            ) : (
              <button onClick={() => handleAiProcess()} className="absolute right-4 top-4 text-white/60 hover:text-white active:scale-90 transition-all">
                <Wand2 size={18} />
              </button>
            )}
          </div>
          <div className="relative">
             {isListening && <div className="absolute -top-12 left-1/2 -translate-x-1/2 bg-black/40 backdrop-blur-md rounded-full px-2 py-1"><VoiceWaveform isListening={isListening} /></div>}
             <button 
                type="button"
                onClick={startListening}
                className={`w-14 h-14 flex items-center justify-center rounded-[20px] shadow-lg transition-all active:scale-90 border border-white/20 ${isListening ? 'bg-rose-500 animate-pulse text-white' : 'bg-white text-md-primary'}`}
              >
                <Mic size={22} />
              </button>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="glass p-6 rounded-md-card shadow-sm space-y-6 border border-black/5 dark:border-white/5">
        <div className="flex bg-md-primary/5 dark:bg-black/20 p-1.5 rounded-full overflow-x-auto no-scrollbar border border-black/5">
          {['expense', 'transfer', 'withdraw'].map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setType(t as any)}
              className={`flex-1 py-2.5 px-4 text-[9px] font-black rounded-full transition-all uppercase tracking-[0.2em] whitespace-nowrap ${
                type === t ? 'bg-md-primary text-white shadow-lg scale-105' : 'text-md-on-surface-variant opacity-60 hover:bg-white/40 dark:hover:bg-zinc-800/40'
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        {error && (
          <div className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-2xl flex items-center gap-3 text-xs font-semibold text-rose-600 dark:text-rose-400 animate-in shake">
             <AlertCircle size={16} />
             {error}
          </div>
        )}

        <div className="space-y-5">
          <div className="relative">
            <label className="text-[9px] font-medium uppercase tracking-[0.2em] text-md-primary/60 ml-3 mb-1.5 block">Amount (BDT)</label>
            <div className="flex items-center glass-input bg-white/40 dark:bg-black/10 border border-black/5 dark:border-white/5 rounded-2xl px-5 py-5 transition-all focus-within:ring-2 focus-within:ring-md-primary/20">
              <span className="text-gray-400 font-bold mr-2 opacity-50">Tk</span>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full bg-transparent outline-none text-3xl font-black tracking-tighter"
                placeholder="0.00"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {type === 'expense' ? (
                <>
                  <div className="relative">
                    <label className="text-[9px] font-medium uppercase tracking-[0.2em] text-md-primary/60 ml-3 mb-1.5 block">Source Wallet</label>
                    <div className="relative">
                      <select
                        value={accountId}
                        onChange={(e) => setAccountId(e.target.value)}
                        className="w-full px-5 py-4 bg-white/40 dark:bg-black/10 border border-black/5 dark:border-white/5 rounded-2xl font-bold text-sm outline-none appearance-none focus:ring-2 focus:ring-md-primary/20"
                      >
                        {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                      </select>
                      <ArrowRightLeft className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 opacity-40 pointer-events-none rotate-90" size={14} />
                    </div>
                  </div>
                  <div className="relative">
                    <label className="text-[9px] font-medium uppercase tracking-[0.2em] text-md-primary/60 ml-3 mb-1.5 block">Category</label>
                    <div className="relative">
                      <select
                        value={category}
                        onChange={(e) => setCategory(e.target.value)}
                        className="w-full px-5 py-4 bg-white/40 dark:bg-black/10 border border-black/5 dark:border-white/5 rounded-2xl font-bold text-sm outline-none appearance-none focus:ring-2 focus:ring-md-primary/20"
                      >
                        {Object.values(Category).map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                      <Tag className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 opacity-40 pointer-events-none" size={14} />
                    </div>
                  </div>
                </>
              ) : (
                <div className="grid grid-cols-1 gap-4 p-5 bg-black/5 dark:bg-black/20 rounded-[32px] border border-dashed border-black/10 dark:border-white/10">
                   <div className="relative">
                      <label className="text-[9px] font-medium uppercase tracking-widest text-md-primary mb-2 block ml-1 opacity-60">From Wallet</label>
                      <select
                          value={accountId}
                          onChange={(e) => setAccountId(e.target.value)}
                          className="w-full px-5 py-3.5 bg-white dark:bg-zinc-800 border-none rounded-2xl outline-none font-bold text-sm appearance-none shadow-sm"
                      >
                          {accounts.filter(a => type === 'withdraw' ? a.id !== (cashAccount?.id || 'cash') : true).map(a => (
                            <option key={a.id} value={a.id}>{a.name}</option>
                          ))}
                      </select>
                   </div>
                   <div className="flex justify-center -my-3 z-10">
                      <div className="bg-white dark:bg-zinc-800 p-2.5 rounded-full border border-black/5 shadow-md scale-110">
                         <ArrowRightLeft size={16} className="text-md-primary rotate-90" />
                      </div>
                   </div>
                   <div className="relative">
                      <label className="text-[9px] font-medium uppercase tracking-widest text-md-primary mb-2 block ml-1 opacity-60">To Wallet</label>
                      {type === 'withdraw' ? (
                        <div className="w-full px-5 py-3.5 bg-emerald-500/10 border border-emerald-500/10 rounded-2xl font-bold text-sm flex items-center gap-2 text-emerald-600 dark:text-emerald-400 shadow-inner">
                          <Wallet size={16} /> {cashAccount?.name || 'Cash Wallet'}
                        </div>
                      ) : (
                        <select
                            value={targetAccountId}
                            onChange={(e) => setTargetAccountId(e.target.value)}
                            className="w-full px-5 py-3.5 bg-white dark:bg-zinc-800 border-none rounded-2xl outline-none font-bold text-sm appearance-none shadow-sm"
                        >
                            {filteredTargetAccounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                        </select>
                      )}
                   </div>
                </div>
              )}
          </div>

          <div className="relative">
            <label className="text-[9px] font-medium uppercase tracking-[0.2em] text-md-primary/60 ml-3 mb-1.5 block">Description</label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-5 py-4 bg-white/40 dark:bg-black/10 border border-black/5 dark:border-white/5 rounded-2xl outline-none font-semibold text-sm focus:ring-2 focus:ring-md-primary/20"
              placeholder={type === 'withdraw' ? 'ATM Withdrawal' : 'What was this for?'}
            />
          </div>

          <div className="relative">
            <label className="text-[9px] font-medium uppercase tracking-[0.2em] text-md-primary/60 ml-3 mb-1.5 block">Transaction Date</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full px-5 py-4 bg-white/40 dark:bg-black/10 border border-black/5 dark:border-white/5 rounded-2xl outline-none font-bold text-sm focus:ring-2 focus:ring-md-primary/20"
            />
          </div>
        </div>

        {/* Wallet Color Sync: Dynamic button glow/shadow */}
        <button
          type="submit"
          style={{ 
            backgroundColor: selectedAccount?.color || '#6750A4',
            boxShadow: `0 8px 24px ${selectedAccount?.color ? selectedAccount.color + '40' : 'rgba(103, 80, 164, 0.4)'}`
          }}
          className="w-full text-white font-black py-5 rounded-[24px] hover:shadow-2xl active:scale-95 transition-all text-[11px] uppercase tracking-[0.25em] flex items-center justify-center gap-3 border border-white/20"
        >
          {type === 'withdraw' ? <Landmark size={20} /> : (type === 'transfer' ? <ArrowRightLeft size={20} /> : <Check size={20} />)}
          Log Transaction
        </button>
      </form>
    </div>
  );
};

export default TransactionForm;
