
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  TrendingUp, 
  TrendingDown, 
  Plus, 
  Bot, 
  RefreshCw, 
  Menu, 
  ChevronLeft, 
  ChevronRight, 
  ChevronDown,
  ChevronUp,
  CreditCard, 
  Settings, 
  HandCoins,
  Sparkles,
  ArrowLeft,
  CalendarCheck,
  ArrowDownCircle,
  Tag,
  X as XIcon,
  LayoutDashboard,
  CloudDownload,
  CloudUpload,
  Calendar,
  Download,
  Upload
} from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import ReactMarkdown from 'react-markdown';

import { Transaction, Category, Account } from './types';
import { getStoredTransactions, saveStoredTransactions, getStoredAccounts, saveStoredAccounts } from './services/storage';
import { getFinancialAdvice } from './services/geminiService';
import { getSyncConfig, pushToSheets, pullFromSheets, mergeFinancialData } from './services/syncService';
import TransactionForm from './components/TransactionForm';
import SummaryCard from './components/SummaryCard';
import BottomNavigation from './components/BottomNavigation';
import SalaryManager from './components/SalaryManager';
import ConfigModal from './components/ConfigModal';
import AccountsView from './components/AccountsView';
import LendingView from './components/LendingView';
import BazarView from './components/BazarView';
import HistoryView from './components/HistoryView';

const FullMonthlyReport: React.FC<{ transactions: Transaction[] }> = ({ transactions }) => {
    const [viewDate, setViewDate] = useState(new Date());
    const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({});

    const changeMonth = (offset: number) => {
        const newDate = new Date(viewDate);
        newDate.setMonth(newDate.getMonth() + offset);
        setViewDate(newDate);
        setExpandedCategories({}); // Reset folds when changing months
    };

    const toggleCategory = (catName: string) => {
        setExpandedCategories(prev => ({
            ...prev,
            [catName]: !prev[catName]
        }));
    };

    const currentMonth = viewDate.getMonth();
    const currentYear = viewDate.getFullYear();
    
    const monthTransactions = transactions.filter(t => {
        const d = new Date(t.date);
        return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
    });

    const yearTransactions = transactions.filter(t => {
        const d = new Date(t.date);
        return d.getFullYear() === currentYear;
    });

    const monthExpense = monthTransactions.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
    const yearExpense = yearTransactions.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
    const monthIncome = monthTransactions.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
    
    const dailyMap: Record<number, number> = {};
    monthTransactions.filter(t => t.type === 'expense').forEach(t => {
        const day = new Date(t.date).getDate();
        dailyMap[day] = (dailyMap[day] || 0) + t.amount;
    });
    const sortedDays = Object.keys(dailyMap).map(Number).sort((a, b) => b - a);

    const incomeSources = monthTransactions.filter(t => t.type === 'income').reduce((acc, t) => {
        acc[t.category] = (acc[t.category] || 0) + t.amount;
        return acc;
    }, {} as Record<string, number>);

    const categoryGroups = useMemo(() => {
        const groups: Record<string, { transactions: Transaction[], total: number }> = {};
        monthTransactions.filter(t => t.type === 'expense').forEach(t => {
            if (!groups[t.category]) {
                groups[t.category] = { transactions: [], total: 0 };
            }
            groups[t.category].transactions.push(t);
            groups[t.category].total += t.amount;
        });

        Object.values(groups).forEach(group => {
            group.transactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        });

        return Object.entries(groups).sort((a, b) => b[1].total - a[1].total);
    }, [monthTransactions]);

    const monthName = viewDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

    return (
        <div className="p-4 space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300 pb-20">
            <div className="bg-md-surface-container p-4 rounded-md-card flex justify-between items-center shadow-sm">
                <button onClick={() => changeMonth(-1)} className="p-2 hover:bg-white/20 rounded-full transition-colors"><ChevronLeft size={20}/></button>
                <h2 className="font-bold text-md-on-surface">{monthName}</h2>
                <button onClick={() => changeMonth(1)} className="p-2 hover:bg-white/20 rounded-full transition-colors"><ChevronRight size={20}/></button>
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div className="bg-md-primary-container text-md-on-primary-container p-5 rounded-md-card shadow-sm">
                    <p className="text-[10px] font-black uppercase tracking-widest opacity-60 mb-1">Month Total</p>
                    <h3 className="text-xl font-black">Tk {monthExpense.toLocaleString()}</h3>
                </div>
                <div className="bg-md-secondary-container text-md-on-secondary-container p-5 rounded-md-card shadow-sm">
                    <p className="text-[10px] font-black uppercase tracking-widest opacity-60 mb-1">Year Total</p>
                    <h3 className="text-xl font-black">Tk {yearExpense.toLocaleString()}</h3>
                </div>
            </div>

            <div className="bg-white dark:bg-zinc-900 rounded-md-card border border-gray-100 dark:border-zinc-800 overflow-hidden shadow-sm">
                <div className="p-4 border-b flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <ArrowDownCircle size={16} className="text-emerald-500" />
                        <h3 className="font-black text-sm uppercase tracking-widest text-md-on-surface-variant">Income</h3>
                    </div>
                    <p className="text-xs font-black text-emerald-600">Tk {monthIncome.toLocaleString()}</p>
                </div>
                <div className="p-4 space-y-3">
                    {Object.entries(incomeSources).length > 0 ? Object.entries(incomeSources).map(([cat, amt]) => (
                        <div key={cat} className="flex justify-between items-center">
                            <p className="text-sm font-bold text-gray-600 dark:text-gray-400">{cat}</p>
                            <p className="text-sm font-black text-emerald-600">Tk {amt.toLocaleString()}</p>
                        </div>
                    )) : (
                        <p className="text-center py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">No income recorded</p>
                    )}
                </div>
            </div>

            {/* Categorized Summary Moved Up with Fold/Unfold */}
            <div className="space-y-4">
                <div className="flex items-center gap-2 px-2">
                    <Tag size={16} className="text-md-primary" />
                    <h3 className="font-black text-xs uppercase tracking-[0.2em] text-md-on-surface-variant">Categorized Summary</h3>
                </div>
                {categoryGroups.length > 0 ? (
                    categoryGroups.map(([catName, data]) => {
                        const isExpanded = expandedCategories[catName];
                        return (
                            <div key={catName} className="bg-white dark:bg-zinc-900 rounded-md-card border border-gray-100 dark:border-zinc-800 overflow-hidden shadow-sm">
                                <button 
                                    onClick={() => toggleCategory(catName)}
                                    className="w-full bg-md-surface-container-high p-4 flex justify-between items-center border-b border-gray-100 dark:border-zinc-800 hover:bg-md-primary-container transition-colors active:scale-[0.99]"
                                >
                                    <div className="flex items-center gap-3">
                                        {isExpanded ? <ChevronUp size={16} className="text-md-primary" /> : <ChevronDown size={16} className="text-md-primary" />}
                                        <h4 className="font-black text-sm text-md-on-surface">{catName}</h4>
                                    </div>
                                    <p className="font-black text-sm text-rose-600">Tk {data.total.toLocaleString()}</p>
                                </button>
                                {isExpanded && (
                                    <div className="divide-y divide-gray-50 dark:divide-zinc-800 max-h-80 overflow-y-auto animate-in slide-in-from-top-2 duration-200">
                                        {data.transactions.map(t => (
                                            <div key={t.id} className="p-4 flex justify-between items-start hover:bg-gray-50 dark:hover:bg-zinc-800/50 transition-colors">
                                                <div className="space-y-1">
                                                    <p className="text-sm font-bold text-md-on-surface leading-tight">{t.description}</p>
                                                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                                                        {new Date(t.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}
                                                    </p>
                                                </div>
                                                <p className="text-sm font-black text-md-on-surface">Tk {t.amount.toLocaleString()}</p>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        );
                    })
                ) : (
                    <div className="p-12 text-center text-gray-400 bg-white dark:bg-zinc-900 rounded-md-card border-dashed border-2 border-gray-100 dark:border-zinc-800">
                        <p className="text-xs font-black uppercase tracking-widest">No categorized data</p>
                    </div>
                )}
            </div>

            {/* Daily Expend Sum Moved Down */}
            <div className="space-y-4">
                <div className="flex items-center gap-2 px-2">
                    <Calendar size={16} className="text-md-primary" />
                    <h3 className="font-black text-xs uppercase tracking-[0.2em] text-md-on-surface-variant">Daily Expend Sum</h3>
                </div>
                {sortedDays.length > 0 ? (
                    <div className="grid gap-3">
                        {sortedDays.map(day => (
                            <div key={day} className="bg-white dark:bg-zinc-900 flex justify-between items-center p-5 rounded-2xl border border-gray-50 dark:border-zinc-800 shadow-sm transition-transform active:scale-[0.98]">
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 rounded-full bg-md-surface-container flex items-center justify-center font-black text-md-primary">
                                        {day}
                                    </div>
                                    <div>
                                        <p className="text-sm font-bold text-md-on-surface">Day {day}</p>
                                        <p className="text-[10px] text-gray-400 font-bold uppercase">{viewDate.toLocaleDateString('en-US', { month: 'short' })} {viewDate.getFullYear()}</p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="font-black text-rose-600">Tk {dailyMap[day].toLocaleString()}</p>
                                    <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Daily Sum</p>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="p-12 text-center text-gray-400 opacity-50 bg-white dark:bg-zinc-900 rounded-md-card border border-dashed">
                        <p className="text-sm font-bold uppercase tracking-widest">No spending records</p>
                    </div>
                )}
            </div>
        </div>
    );
};

const App: React.FC = () => {
  const [transactions, setTransactions] = useState<Transaction[]>(() => getStoredTransactions());
  const [accounts, setAccounts] = useState<Account[]>(() => getStoredAccounts());
  const [activeTab, setActiveTab] = useState('dashboard');
  const [syncStatus, setSyncStatus] = useState<'synced' | 'pending' | 'syncing' | 'error' | 'none'>('none');
  const [hasSyncedOnMount, setHasSyncedOnMount] = useState(false);
  const [aiAdvice, setAiAdvice] = useState('');
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [showConfig, setShowConfig] = useState(false);
  const [installPrompt, setInstallPrompt] = useState<any>(null);

  // PWA Install Logic
  useEffect(() => {
    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      setInstallPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
  }, []);

  const handleInstallClick = async () => {
    if (!installPrompt) return;
    installPrompt.prompt();
    const { outcome } = await installPrompt.userChoice;
    if (outcome === 'accepted') {
      setInstallPrompt(null);
    }
  };

  // Sync Logic - Pull and Merge
  const handleSyncPull = useCallback(async (silent = false) => {
    if (!silent) setSyncStatus('syncing');
    const cloudData = await pullFromSheets();
    if (cloudData) {
      setTransactions(prev => {
        const merged = mergeFinancialData(prev, cloudData.transactions);
        saveStoredTransactions(merged);
        return merged;
      });
      
      setAccounts(prev => {
        const mergedAccs = [...prev];
        cloudData.accounts.forEach(ca => {
          if (!mergedAccs.find(la => la.id === ca.id)) {
            mergedAccs.push(ca);
          }
        });
        saveStoredAccounts(mergedAccs);
        return mergedAccs;
      });

      setSyncStatus('synced');
      setHasSyncedOnMount(true);
    } else {
      if (!silent) setSyncStatus('error');
    }
  }, []);

  const triggerAutoPush = useCallback(async () => {
    if (!navigator.onLine) return;
    setSyncStatus('syncing');
    const success = await pushToSheets(getStoredTransactions(), getStoredAccounts());
    setSyncStatus(success ? 'synced' : 'error');
  }, []);

  // Initial Sync and Polling Setup (5 seconds interval for multi-device parity)
  useEffect(() => {
    const config = getSyncConfig();
    if (config && config.url) {
      // Step 1: Always pull on open
      handleSyncPull();
      
      // Step 2: Aggressive polling (5 seconds) to catch other device changes
      const pollInterval = setInterval(() => {
        handleSyncPull(true);
      }, 5000);

      // Step 3: Pull when tab becomes active
      const onFocus = () => handleSyncPull(true);
      window.addEventListener('focus', onFocus);

      return () => {
        clearInterval(pollInterval);
        window.removeEventListener('focus', onFocus);
      };
    } else {
      setHasSyncedOnMount(true);
    }
  }, [handleSyncPull]);

  // Handle local changes - Always push immediately
  const handleAddTransaction = (t: Omit<Transaction, 'id'>) => {
    const newTx = {...t, id: uuidv4()};
    const updated = [newTx, ...transactions];
    setTransactions(updated);
    saveStoredTransactions(updated);
    if (hasSyncedOnMount) triggerAutoPush();
  };

  const handleUpdateTransaction = (updatedTx: Transaction) => {
    const updated = transactions.map(t => t.id === updatedTx.id ? updatedTx : t);
    setTransactions(updated);
    saveStoredTransactions(updated);
    if (hasSyncedOnMount) triggerAutoPush();
  };

  const handleDeleteTransaction = (id: string) => {
    const updated = transactions.filter(t => t.id !== id);
    setTransactions(updated);
    saveStoredTransactions(updated);
    if (hasSyncedOnMount) triggerAutoPush();
  };

  const handleUpdateAccounts = (updater: Account[] | ((prev: Account[]) => Account[])) => {
    setAccounts(prev => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      saveStoredAccounts(next);
      if (hasSyncedOnMount) triggerAutoPush();
      return next;
    });
  };

  const accountBalances = useMemo(() => {
    const b: Record<string, number> = {};
    accounts.forEach(a => b[a.id] = 0);
    transactions.forEach(t => {
      if (t.type === 'income') b[t.accountId] = (b[t.accountId] || 0) + t.amount;
      else if (t.type === 'expense') b[t.accountId] = (b[t.accountId] || 0) - t.amount;
      else if (t.type === 'transfer') {
        b[t.accountId] = (b[t.accountId] || 0) - t.amount;
        if (t.targetAccountId) b[t.targetAccountId] = (b[t.targetAccountId] || 0) + t.amount;
      }
    });
    return b;
  }, [transactions, accounts]);

  const summary = useMemo(() => {
    const d = new Date();
    const filtered = transactions.filter(t => new Date(t.date).getMonth() === d.getMonth());
    const inc = filtered.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
    const exp = filtered.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
    const bzr = filtered.filter(t => t.category === Category.BAZAR).reduce((s, t) => s + t.amount, 0);
    return { inc, exp, bal: inc - exp, bzr };
  }, [transactions]);

  const isFullscreenView = activeTab === 'wallet-manager' || activeTab === 'input';

  return (
    <div className="min-h-screen bg-md-surface dark:bg-zinc-950 pb-32 transition-colors">
      <ConfigModal 
        isOpen={showConfig} 
        onClose={() => setShowConfig(false)} 
        onPullData={handleSyncPull}
      />

      {!isFullscreenView && (
        <header className="sticky top-0 z-50 bg-md-surface dark:bg-zinc-950 px-4 py-4 flex items-center justify-between shadow-sm border-b dark:border-zinc-800">
           <div className="flex items-center gap-3">
              <div className="bg-md-primary p-2.5 rounded-2xl text-white shadow-md"><LayoutDashboard size={22} /></div>
              <div>
                <h1 className="text-xl font-black tracking-tight text-md-on-surface">Account Manager</h1>
                <div className="flex items-center gap-1.5 opacity-60">
                  <div className={`w-1.5 h-1.5 rounded-full ${syncStatus === 'synced' ? 'bg-emerald-500' : syncStatus === 'syncing' ? 'bg-amber-500 animate-pulse' : 'bg-gray-400'}`}></div>
                  <p className="text-[10px] font-black uppercase tracking-wider">
                    {syncStatus === 'synced' ? 'Synced' : syncStatus === 'syncing' ? 'Syncing...' : syncStatus === 'error' ? 'Sync Error' : 'Local Only'}
                  </p>
                </div>
              </div>
           </div>
           <div className="flex items-center gap-0.5">
              {getSyncConfig() && (
                <>
                  <button 
                    onClick={() => triggerAutoPush()} 
                    disabled={syncStatus === 'syncing'}
                    className={`p-2.5 rounded-full hover:bg-md-surface-container text-md-primary transition-all active:scale-90 ${syncStatus === 'syncing' ? 'animate-pulse' : ''}`}
                    title="Push Data"
                  >
                    <CloudUpload size={20}/>
                  </button>
                  <button 
                    onClick={() => handleSyncPull()} 
                    disabled={syncStatus === 'syncing'}
                    className={`p-2.5 rounded-full hover:bg-md-surface-container text-md-primary transition-all active:scale-90 ${syncStatus === 'syncing' ? 'animate-pulse' : ''}`}
                    title="Pull Data"
                  >
                    <CloudDownload size={20}/>
                  </button>
                </>
              )}
              <button onClick={() => setIsMenuOpen(true)} className="p-2.5 rounded-full hover:bg-md-surface-container text-md-on-surface transition-colors">
                <Menu size={24}/>
              </button>
           </div>
        </header>
      )}

      <main className="max-w-md mx-auto">
        {activeTab === 'dashboard' && (
          <div className="p-4 space-y-6 animate-in fade-in duration-300">
            <div className="bg-md-primary-container p-8 rounded-md-card shadow-sm border border-md-primary/10">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-md-on-primary-container opacity-60 mb-2">Net Worth Balance</p>
                <h2 className="text-4xl font-black text-md-on-primary-container tracking-tighter">Tk {summary.bal.toLocaleString()}</h2>
            </div>

            <div className="grid grid-cols-2 gap-4">
               <SummaryCard title="Monthly In" amount={summary.inc} icon={TrendingUp} colorClass="text-emerald-700" bgClass="bg-emerald-100" />
               <SummaryCard title="Monthly Out" amount={summary.exp} icon={TrendingDown} colorClass="text-rose-700" bgClass="bg-rose-100" />
            </div>

            <div className="space-y-4">
               <div className="flex justify-between items-center ml-1">
                 <h3 className="font-black text-[11px] uppercase tracking-widest text-md-on-surface-variant">Your Wallets</h3>
                 <button onClick={() => setActiveTab('wallet-manager')} className="text-[10px] font-black uppercase tracking-widest text-md-primary px-4 py-1.5 bg-md-primary-container rounded-full">Manage</button>
               </div>
               <div className="grid gap-3">
                 {accounts.map(acc => (
                   <div key={acc.id} className="bg-white dark:bg-zinc-900 p-5 rounded-3xl border border-gray-100 dark:border-zinc-800 flex justify-between items-center shadow-sm hover:scale-[1.01] transition-all group">
                      <div className="flex items-center gap-4">
                        <p className="font-black text-lg tracking-tight transition-colors" style={{ color: acc.color }}>
                            {acc.name}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-black text-sm text-md-on-surface">Tk {accountBalances[acc.id]?.toLocaleString()}</p>
                        <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Active Balance</p>
                      </div>
                   </div>
                 ))}
               </div>
            </div>

            <div className="bg-md-surface-container-high p-6 rounded-md-card mt-4 border border-md-outline/10 shadow-inner">
               <div className="flex items-center gap-3 mb-5">
                  <div className="p-2 bg-md-primary text-white rounded-xl shadow-md"><Bot size={18} /></div>
                  <h4 className="font-black text-sm uppercase tracking-widest">Financial Insights</h4>
               </div>
               {aiAdvice ? (
                   <div className="prose prose-sm dark:prose-invert max-h-60 overflow-y-auto"><ReactMarkdown>{aiAdvice}</ReactMarkdown></div>
               ) : (
                   <p className="text-xs text-md-on-surface-variant font-medium leading-relaxed opacity-70">Gemini AI is ready to analyze your spending. Tap below to see your monthly score.</p>
               )}
               <button 
                  onClick={async () => { setIsAiLoading(true); setAiAdvice(await getFinancialAdvice(transactions)); setIsAiLoading(false); }}
                  disabled={isAiLoading}
                  className="w-full bg-md-primary text-white mt-6 py-4 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 active:scale-95 transition-all disabled:opacity-50 shadow-lg"
               >
                  {isAiLoading ? <RefreshCw className="animate-spin" size={16}/> : <Sparkles size={16}/>}
                  {isAiLoading ? 'Analyzing...' : 'Generate AI Advice'}
               </button>
            </div>
          </div>
        )}

        {activeTab === 'input' && (
          <div className="animate-in slide-in-from-bottom-8 duration-500 fixed inset-0 z-[100] bg-md-surface dark:bg-zinc-950">
             <div className="p-4 flex items-center gap-4 border-b dark:border-zinc-800 bg-white dark:bg-zinc-950">
               <button onClick={() => setActiveTab('dashboard')} className="p-3 hover:bg-md-surface-container rounded-full transition-colors"><ArrowLeft size={24}/></button>
               <h2 className="text-xl font-bold">New Entry</h2>
             </div>
             <div className="p-4 space-y-6 overflow-y-auto h-[calc(100vh-80px)]">
                <SalaryManager onAddTransaction={handleAddTransaction} accounts={accounts} />
                <TransactionForm onAddTransaction={(t) => { handleAddTransaction(t); setActiveTab('dashboard'); }} accounts={accounts} />
             </div>
          </div>
        )}

        {activeTab === 'bazar' && (
            <div className="p-0 animate-in fade-in duration-300">
                <BazarView 
                    transactions={transactions} 
                    accounts={accounts} 
                    onAddTransaction={handleAddTransaction} 
                    onUpdateTransaction={handleUpdateTransaction} 
                    onDeleteTransaction={handleDeleteTransaction} 
                />
            </div>
        )}
        
        {activeTab === 'full-report' && <FullMonthlyReport transactions={transactions} />}
        {activeTab === 'history' && (
          <HistoryView 
              transactions={transactions} 
              accounts={accounts} 
              onUpdateTransaction={handleUpdateTransaction} 
              onDeleteTransaction={handleDeleteTransaction} 
          />
        )}
        {activeTab === 'lending' && (
          <LendingView 
              transactions={transactions} 
              accounts={accounts} 
              onAddTransaction={handleAddTransaction} 
              onUpdateTransaction={handleUpdateTransaction} 
              onDeleteTransaction={handleDeleteTransaction} 
          />
        )}
        {activeTab === 'wallet-manager' && (
          <AccountsView 
              accounts={accounts} 
              onUpdateAccounts={handleUpdateAccounts} 
              onBack={() => setActiveTab('dashboard')} 
          />
        )}
      </main>

      {!isFullscreenView && (
        <button 
          onClick={() => setActiveTab('input')}
          className="fixed bottom-[100px] right-6 w-16 h-16 bg-md-primary text-white rounded-3xl shadow-2xl flex items-center justify-center transition-all hover:scale-110 active:scale-90 z-40 scale-100 opacity-100"
        >
          <Plus size={32} strokeWidth={3} />
        </button>
      )}

      {isMenuOpen && (
        <div className="fixed inset-0 z-[110] bg-black/40 animate-in fade-in duration-300" onClick={() => setIsMenuOpen(false)}>
           <div className="absolute right-0 top-0 bottom-0 w-[300px] bg-md-surface dark:bg-zinc-900 p-8 animate-in slide-in-from-right duration-400 rounded-l-[32px] shadow-2xl" onClick={e => e.stopPropagation()}>
              <div className="flex justify-between items-center mb-10">
                <div className="flex items-center gap-3">
                   <div className="w-10 h-10 bg-md-primary rounded-xl flex items-center justify-center text-white"><Settings size={20}/></div>
                   <h3 className="font-black text-xl">Settings</h3>
                </div>
                <button onClick={() => setIsMenuOpen(false)} className="p-2 hover:bg-md-surface-container rounded-full transition-colors"><XIcon size={24}/></button>
              </div>
              <div className="space-y-3">
                 <MenuBtn onClick={() => { setShowConfig(true); setIsMenuOpen(false); }} icon={RefreshCw} label="Cloud Sync Setup" />
                 <MenuBtn onClick={() => { setActiveTab('wallet-manager'); setIsMenuOpen(false); }} icon={CreditCard} label="Manage Wallets" />
                 <MenuBtn onClick={() => { setActiveTab('lending'); setIsMenuOpen(false); }} icon={HandCoins} label="Debt & Lending" />
                 <div className="grid grid-cols-2 gap-2 mt-4 pt-4 border-t dark:border-zinc-800">
                    <button 
                      onClick={() => { triggerAutoPush(); setIsMenuOpen(false); }}
                      className="flex flex-col items-center gap-2 p-4 bg-md-surface-container rounded-2xl hover:bg-md-primary-container transition-all active:scale-95"
                    >
                      <CloudUpload size={20} className="text-md-primary" />
                      <span className="text-[10px] font-black uppercase tracking-widest text-md-on-surface">Push Data</span>
                    </button>
                    <button 
                      onClick={() => { handleSyncPull(); setIsMenuOpen(false); }}
                      className="flex flex-col items-center gap-2 p-4 bg-md-surface-container rounded-2xl hover:bg-md-primary-container transition-all active:scale-95"
                    >
                      <CloudDownload size={20} className="text-md-primary" />
                      <span className="text-[10px] font-black uppercase tracking-widest text-md-on-surface">Pull Data</span>
                    </button>
                 </div>
                 {installPrompt && (
                   <button 
                    onClick={handleInstallClick} 
                    className="w-full flex items-center gap-5 py-5 px-6 rounded-2xl bg-md-primary-container text-md-on-primary-container text-sm font-black transition-all active:scale-95 mt-4"
                   >
                     <div className="p-2.5 bg-md-primary text-white rounded-xl shadow-sm"><Download size={20} /></div>
                     Install App
                   </button>
                 )}
              </div>
              <div className="absolute bottom-10 left-8 right-8 text-center">
                 <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">SmartSpend v1.2</p>
              </div>
           </div>
        </div>
      )}

      {!isFullscreenView && <BottomNavigation activeTab={activeTab} onTabChange={setActiveTab} />}
    </div>
  );
};

const MenuBtn = ({ onClick, icon: Icon, label }: any) => (
  <button onClick={onClick} className="w-full flex items-center gap-5 py-5 px-6 rounded-2xl hover:bg-md-surface-container-high text-sm font-bold transition-all active:scale-95 group">
     <div className="p-2.5 bg-md-primary/10 rounded-xl text-md-primary group-hover:scale-110 transition-transform"><Icon size={20} /></div>
     {label}
  </button>
);

export default App;
