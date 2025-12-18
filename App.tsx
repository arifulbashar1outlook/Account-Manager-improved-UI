
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  TrendingUp, 
  TrendingDown, 
  Plus, 
  RefreshCw, 
  Menu, 
  ChevronLeft, 
  ChevronRight, 
  ChevronDown,
  ChevronUp,
  CreditCard, 
  Settings, 
  HandCoins,
  ArrowLeft,
  ArrowDownCircle,
  Tag,
  X as XIcon,
  LayoutDashboard,
  CloudDownload,
  CloudUpload,
  Calendar,
  Download,
  WifiOff,
  Wifi,
  ArrowRightLeft,
  PieChart as PieChartIcon,
  Activity,
  ArrowUpRight,
  Landmark,
  List,
  Target
} from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';

import { Transaction, Category, Account } from './types';
import { getStoredTransactions, saveStoredTransactions, getStoredAccounts, saveStoredAccounts } from './services/storage';
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
    const [expandedDays, setExpandedDays] = useState<Record<number, boolean>>({});
    const [activeReportType, setActiveReportType] = useState<'expense' | 'income' | 'transfer' | 'withdraw'>('expense');

    const changeMonth = (offset: number) => {
        const newDate = new Date(viewDate);
        newDate.setMonth(newDate.getMonth() + offset);
        setViewDate(newDate);
        setExpandedCategories({});
        setExpandedDays({});
    };

    const toggleCategory = (catName: string) => {
        setExpandedCategories(prev => ({
            ...prev,
            [catName]: !prev[catName]
        }));
    };

    const toggleDay = (day: number) => {
        setExpandedDays(prev => ({
            ...prev,
            [day]: !prev[day]
        }));
    };

    const currentMonth = viewDate.getMonth();
    const currentYear = viewDate.getFullYear();
    
    const monthTransactions = transactions.filter(t => {
        const d = new Date(t.date);
        return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
    });

    const yearStats = useMemo(() => {
        const yearTxs = transactions.filter(t => {
            const d = new Date(t.date);
            return d.getFullYear() === currentYear;
        });
        const income = yearTxs.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
        const expense = yearTxs.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
        return { income, expense, balance: income - expense };
    }, [transactions, currentYear]);

    const stats = useMemo(() => {
        const income = monthTransactions.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
        const expense = monthTransactions.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
        const transfer = monthTransactions.filter(t => t.type === 'transfer' && t.targetAccountId !== 'cash').reduce((s, t) => s + t.amount, 0);
        const withdraw = monthTransactions.filter(t => t.type === 'transfer' && t.targetAccountId === 'cash').reduce((s, t) => s + t.amount, 0);
        return { income, expense, transfer, withdraw };
    }, [monthTransactions]);

    const dailyGroups = useMemo(() => {
        const groups: Record<number, Transaction[]> = {};
        monthTransactions.forEach(t => {
            const day = new Date(t.date).getDate();
            if (!groups[day]) groups[day] = [];
            groups[day].push(t);
        });
        return groups;
    }, [monthTransactions]);

    const sortedDays = useMemo(() => 
        Object.keys(dailyGroups).map(Number).sort((a, b) => b - a),
    [dailyGroups]);

    const categoryGroups = useMemo(() => {
        const groups: Record<string, { transactions: Transaction[], total: number }> = {};
        
        const filtered = monthTransactions.filter(t => {
            if (activeReportType === 'withdraw') {
                return t.type === 'transfer' && t.targetAccountId === 'cash';
            }
            if (activeReportType === 'transfer') {
                return t.type === 'transfer' && t.targetAccountId !== 'cash';
            }
            return t.type === activeReportType;
        });

        filtered.forEach(t => {
            const catKey = t.category || 'Uncategorized';
            if (!groups[catKey]) {
                groups[catKey] = { transactions: [], total: 0 };
            }
            groups[catKey].transactions.push(t);
            groups[catKey].total += t.amount;
        });
        return Object.entries(groups).sort((a, b) => b[1].total - a[1].total);
    }, [monthTransactions, activeReportType]);

    const monthName = viewDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

    return (
        <div className="p-4 space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300 pb-32">
            {/* Month Picker */}
            <div className="bg-md-surface-container p-4 rounded-md-card flex justify-between items-center shadow-sm">
                <button onClick={() => changeMonth(-1)} className="p-2 hover:bg-white/20 rounded-full transition-colors"><ChevronLeft size={20}/></button>
                <div className="text-center">
                  <h2 className="font-black text-md-on-surface tracking-tight">{monthName}</h2>
                  <p className="text-[9px] font-black uppercase tracking-widest opacity-40">Monthly Breakdown</p>
                </div>
                <button onClick={() => changeMonth(1)} className="p-2 hover:bg-white/20 rounded-full transition-colors"><ChevronRight size={20}/></button>
            </div>

            {/* Monthly Stats */}
            <div className="grid grid-cols-2 gap-3">
                <StatBox label="Income" amount={stats.income} color="text-emerald-600" bg="bg-emerald-50" icon={TrendingUp} />
                <StatBox label="Expense" amount={stats.expense} color="text-rose-600" bg="bg-rose-50" icon={TrendingDown} />
                <StatBox label="Transfer" amount={stats.transfer} color="text-indigo-600" bg="bg-indigo-50" icon={ArrowRightLeft} />
                <StatBox label="Withdraw" amount={stats.withdraw} color="text-amber-600" bg="bg-amber-50" icon={Landmark} />
            </div>

            {/* Yearly Summary Card */}
            <div className="bg-md-primary-container p-6 rounded-md-card border border-md-primary/10 shadow-sm">
                <div className="flex items-center gap-2 mb-4">
                    <Target size={18} className="text-md-on-primary-container" />
                    <h3 className="font-black text-xs uppercase tracking-[0.2em] text-md-on-primary-container">Yearly Overview {currentYear}</h3>
                </div>
                <div className="grid grid-cols-3 gap-4">
                    <div>
                        <p className="text-[8px] font-black uppercase tracking-widest text-md-on-primary-container/60 mb-1">Year In</p>
                        <p className="text-sm font-black text-emerald-700">Tk {yearStats.income.toLocaleString()}</p>
                    </div>
                    <div className="border-x border-md-primary/10 px-4">
                        <p className="text-[8px] font-black uppercase tracking-widest text-md-on-primary-container/60 mb-1">Year Out</p>
                        <p className="text-sm font-black text-rose-700">Tk {yearStats.expense.toLocaleString()}</p>
                    </div>
                    <div>
                        <p className="text-[8px] font-black uppercase tracking-widest text-md-on-primary-container/60 mb-1">Balance</p>
                        <p className={`text-sm font-black ${yearStats.balance >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>Tk {yearStats.balance.toLocaleString()}</p>
                    </div>
                </div>
            </div>

            {/* Category Breakdown Selection */}
            <div className="space-y-4">
                <div className="flex items-center gap-2 px-2">
                    <Tag size={16} className="text-md-primary" />
                    <h3 className="font-black text-xs uppercase tracking-[0.2em] text-md-on-surface-variant">Category Breakdown</h3>
                </div>

                <div className="flex bg-md-surface-container p-1 rounded-full shadow-inner overflow-x-auto no-scrollbar">
                  {[
                    { id: 'expense', label: 'Spent', icon: TrendingDown },
                    { id: 'income', label: 'Received', icon: TrendingUp },
                    { id: 'transfer', label: 'Transfer', icon: ArrowRightLeft },
                    { id: 'withdraw', label: 'Withdraw', icon: Landmark }
                  ].map((btn) => (
                    <button
                      key={btn.id}
                      onClick={() => { setActiveReportType(btn.id as any); setExpandedCategories({}); }}
                      className={`flex-1 min-w-[80px] py-2.5 text-[10px] font-black rounded-full transition-all uppercase tracking-widest flex flex-col items-center gap-1 ${
                        activeReportType === btn.id 
                          ? 'bg-md-primary text-white shadow-md' 
                          : 'text-md-on-surface-variant hover:bg-black/5'
                      }`}
                    >
                      <btn.icon size={14} />
                      {btn.label}
                    </button>
                  ))}
                </div>

                <div className="space-y-3">
                  {categoryGroups.length > 0 ? (
                      categoryGroups.map(([catName, data]) => {
                          const isExpanded = expandedCategories[catName];
                          const typeColors: Record<string, string> = {
                              income: 'text-emerald-600',
                              expense: 'text-rose-600',
                              transfer: 'text-indigo-600',
                              withdraw: 'text-amber-600'
                          };
                          return (
                              <div key={catName} className="bg-white dark:bg-zinc-900 rounded-3xl border border-gray-100 dark:border-zinc-800 overflow-hidden shadow-sm transition-all">
                                  <button 
                                      onClick={() => toggleCategory(catName)}
                                      className="w-full p-4 flex justify-between items-center hover:bg-md-surface-container transition-colors"
                                  >
                                      <div className="flex items-center gap-3">
                                          <div className={`p-2 rounded-xl bg-md-surface-container ${isExpanded ? 'rotate-180' : ''} transition-transform`}>
                                            <ChevronDown size={14} className="text-md-primary" />
                                          </div>
                                          <h4 className="font-black text-sm text-md-on-surface">{catName}</h4>
                                      </div>
                                      <p className={`font-black text-sm ${typeColors[activeReportType]}`}>Tk {data.total.toLocaleString()}</p>
                                  </button>
                                  {isExpanded && (
                                      <div className="divide-y divide-gray-50 dark:divide-zinc-800 bg-gray-50 dark:bg-zinc-950/50">
                                          {data.transactions.map(t => (
                                              <div key={t.id} className="p-4 flex justify-between items-start animate-in slide-in-from-top-2 duration-200">
                                                  <div className="space-y-0.5">
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
                      <div className="p-10 text-center text-gray-400 bg-md-surface-container/30 rounded-3xl border-dashed border-2">
                          <p className="text-[10px] font-black uppercase tracking-widest">No records found for this type</p>
                      </div>
                  )}
                </div>
            </div>

            {/* Daily Activity */}
            <div className="space-y-4">
                <div className="flex items-center gap-2 px-2">
                    <List size={16} className="text-md-primary" />
                    <h3 className="font-black text-xs uppercase tracking-[0.2em] text-md-on-surface-variant">Daily Breakdown</h3>
                </div>
                {sortedDays.length > 0 ? (
                    <div className="space-y-6">
                        {sortedDays.map(day => {
                            const dayTx = dailyGroups[day];
                            const dayIn = dayTx.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
                            const dayOut = dayTx.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
                            const isExpanded = expandedDays[day];

                            return (
                                <div key={day} className="space-y-2">
                                    <button 
                                        onClick={() => toggleDay(day)}
                                        className="w-full flex justify-between items-center px-2 py-1 rounded-2xl hover:bg-black/5 active:bg-black/10 transition-colors text-left"
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full bg-md-primary text-white flex items-center justify-center text-[10px] font-black shadow-sm">
                                              <span className={`transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`}>
                                                {isExpanded ? <ChevronDown size={14} /> : day}
                                              </span>
                                            </div>
                                            <p className="text-xs font-black uppercase text-md-on-surface-variant">{monthName.split(' ')[0]} {day}</p>
                                        </div>
                                        <div className="text-right flex items-center gap-4">
                                            <div className="flex flex-col items-end">
                                                <p className="text-[7px] font-black text-rose-400 uppercase tracking-widest">Out</p>
                                                <p className="text-[10px] font-black text-rose-600">Tk {dayOut.toLocaleString()}</p>
                                            </div>
                                            <div className="flex flex-col items-end border-l pl-4 border-gray-100 dark:border-zinc-800">
                                                <p className="text-[7px] font-black text-emerald-400 uppercase tracking-widest">Net</p>
                                                <p className={`text-[10px] font-black ${dayIn - dayOut >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                                                    {dayIn - dayOut >= 0 ? '+' : ''}Tk {(dayIn - dayOut).toLocaleString()}
                                                </p>
                                            </div>
                                            <div className={`p-1 rounded-full bg-md-surface-container transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`}>
                                                <ChevronDown size={12} className="text-md-primary" />
                                            </div>
                                        </div>
                                    </button>
                                    {isExpanded && (
                                        <div className="bg-white dark:bg-zinc-900 rounded-[28px] overflow-hidden border border-gray-100 dark:border-zinc-800 shadow-sm animate-in slide-in-from-top-2 duration-300">
                                            {dayTx.map((t, idx) => (
                                                <div key={t.id} className={`p-4 flex justify-between items-center ${idx !== dayTx.length - 1 ? 'border-b border-gray-50 dark:border-zinc-800' : ''}`}>
                                                    <div className="flex items-center gap-3">
                                                        <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${
                                                            t.type === 'income' ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20' :
                                                            t.type === 'expense' ? 'bg-rose-50 text-rose-600 dark:bg-rose-900/20' : 'bg-indigo-50 text-indigo-600 dark:bg-indigo-900/20'
                                                        }`}>
                                                            {t.type === 'income' ? <TrendingUp size={14} /> : 
                                                             t.type === 'expense' ? <TrendingDown size={14} /> : <ArrowRightLeft size={14} />}
                                                        </div>
                                                        <div>
                                                            <p className="text-sm font-bold text-md-on-surface truncate max-w-[150px] dark:text-gray-100">{t.description}</p>
                                                            <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">{t.category}</p>
                                                        </div>
                                                    </div>
                                                    <div className="text-right">
                                                        <p className={`text-sm font-black ${
                                                            t.type === 'income' ? 'text-emerald-600' : 
                                                            t.type === 'expense' ? 'text-rose-600' : 'text-md-on-surface-variant dark:text-indigo-400'
                                                        }`}>
                                                            {t.type === 'income' ? '+' : t.type === 'expense' ? '-' : ''}Tk {t.amount.toLocaleString()}
                                                        </p>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    <div className="p-10 text-center text-gray-400 opacity-50 bg-md-surface-container/30 rounded-3xl border border-dashed">
                        <p className="text-[10px] font-black uppercase tracking-widest">No records found</p>
                    </div>
                )}
            </div>
        </div>
    );
};

const StatBox = ({ label, amount, color, bg, icon: Icon }: any) => (
    <div className={`${bg} p-4 rounded-3xl border border-black/5 flex flex-col justify-between shadow-sm`}>
        <div className="flex items-center gap-2 opacity-60 mb-2">
            <Icon size={14} className={color} />
            <p className={`text-[9px] font-black uppercase tracking-widest ${color}`}>{label}</p>
        </div>
        <h3 className={`text-lg font-black tracking-tight ${color}`}>Tk {amount.toLocaleString()}</h3>
    </div>
);

const App: React.FC = () => {
  const [transactions, setTransactions] = useState<Transaction[]>(() => getStoredTransactions());
  const [accounts, setAccounts] = useState<Account[]>(() => getStoredAccounts());
  const [activeTab, setActiveTab] = useState('dashboard');
  const [syncStatus, setSyncStatus] = useState<'synced' | 'pending' | 'syncing' | 'error' | 'none'>('none');
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [hasSyncedOnMount, setHasSyncedOnMount] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [showConfig, setShowConfig] = useState(false);

  // Sync Logic - Pull and Merge
  const handleSyncPull = useCallback(async (silent = false) => {
    if (!navigator.onLine) {
        setSyncStatus('none');
        return;
    }
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
    if (!navigator.onLine) {
        setSyncStatus('pending');
        return;
    }
    setSyncStatus('syncing');
    const success = await pushToSheets(getStoredTransactions(), getStoredAccounts());
    setSyncStatus(success ? 'synced' : 'error');
  }, []);

  // Connection Event Listeners
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      handleSyncPull(true).then(() => triggerAutoPush());
    };
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [handleSyncPull, triggerAutoPush]);

  // Initial Sync and Polling Setup
  useEffect(() => {
    const config = getSyncConfig();
    if (config && config.url && navigator.onLine) {
      handleSyncPull();
      const pollInterval = setInterval(() => {
        if (navigator.onLine) handleSyncPull(true);
      }, 15000); // 15s poll
      return () => clearInterval(pollInterval);
    } else {
      setHasSyncedOnMount(true);
    }
  }, [handleSyncPull]);

  // Handle local changes
  const handleAddTransaction = (t: Omit<Transaction, 'id'>) => {
    const newTx = {...t, id: uuidv4()};
    const updated = [newTx, ...transactions];
    setTransactions(updated);
    saveStoredTransactions(updated);
    triggerAutoPush();
  };

  const handleUpdateTransaction = (updatedTx: Transaction) => {
    const updated = transactions.map(t => t.id === updatedTx.id ? updatedTx : t);
    setTransactions(updated);
    saveStoredTransactions(updated);
    triggerAutoPush();
  };

  const handleDeleteTransaction = (id: string) => {
    const updated = transactions.filter(t => t.id !== id);
    setTransactions(updated);
    saveStoredTransactions(updated);
    triggerAutoPush();
  };

  const handleUpdateAccounts = (updater: Account[] | ((prev: Account[]) => Account[])) => {
    setAccounts(prev => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      saveStoredAccounts(next);
      triggerAutoPush();
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
    return { inc, exp, bal: inc - exp };
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
        <header className="sticky top-0 z-50 bg-md-surface/80 dark:bg-zinc-950/80 backdrop-blur-md px-4 pt-safe flex items-center justify-between shadow-sm border-b dark:border-zinc-800">
           <div className="flex items-center gap-3 py-4">
              <div className="bg-md-primary p-2.5 rounded-2xl text-white shadow-md"><LayoutDashboard size={22} /></div>
              <div>
                <h1 className="text-xl font-black tracking-tight text-md-on-surface">Account Manager</h1>
                <div className="flex items-center gap-1.5">
                  <div className={`w-1.5 h-1.5 rounded-full ${!isOnline ? 'bg-amber-500' : syncStatus === 'synced' ? 'bg-emerald-500' : syncStatus === 'syncing' ? 'bg-indigo-500 animate-pulse' : 'bg-gray-400'}`}></div>
                  <p className="text-[10px] font-black uppercase tracking-wider opacity-60">
                    {!isOnline ? 'Offline' : syncStatus === 'synced' ? 'Cloud Synced' : syncStatus === 'syncing' ? 'Syncing...' : 'Local Mode'}
                  </p>
                </div>
              </div>
           </div>
           <div className="flex items-center gap-1 py-4">
              {!isOnline && (
                <div className="bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 p-2 rounded-full flex items-center gap-2 px-3 animate-in fade-in zoom-in">
                   <WifiOff size={14} />
                   <span className="text-[10px] font-black uppercase">Offline</span>
                </div>
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
                   <div key={acc.id} className="bg-white dark:bg-zinc-900 p-5 rounded-3xl border border-gray-100 dark:border-zinc-800 flex justify-between items-center shadow-sm hover:scale-[1.01] transition-all">
                      <div className="flex items-center gap-4">
                        <p className="font-black text-lg tracking-tight" style={{ color: acc.color }}>{acc.name}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-black text-sm text-md-on-surface">Tk {accountBalances[acc.id]?.toLocaleString()}</p>
                        <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Active Balance</p>
                      </div>
                   </div>
                 ))}
               </div>
            </div>
          </div>
        )}

        {activeTab === 'input' && (
          <div className="animate-in slide-in-from-bottom-8 duration-500 fixed inset-0 z-[100] bg-md-surface dark:bg-zinc-950">
             <div className="p-4 pt-safe flex items-center gap-4 border-b dark:border-zinc-800 bg-white dark:bg-zinc-950">
               <div className="flex items-center gap-4 py-2">
                  <button onClick={() => setActiveTab('dashboard')} className="p-3 hover:bg-md-surface-container rounded-full transition-colors"><ArrowLeft size={24}/></button>
                  <h2 className="text-xl font-bold">New Entry</h2>
               </div>
             </div>
             <div className="p-4 space-y-6 overflow-y-auto h-[calc(100vh-100px)]">
                <SalaryManager onAddTransaction={handleAddTransaction} accounts={accounts} />
                <TransactionForm onAddTransaction={(t) => { handleAddTransaction(t); setActiveTab('dashboard'); }} accounts={accounts} />
             </div>
          </div>
        )}

        {activeTab === 'bazar' && (
            <BazarView 
                transactions={transactions} 
                accounts={accounts} 
                onAddTransaction={handleAddTransaction} 
                onUpdateTransaction={handleUpdateTransaction} 
                onDeleteTransaction={handleDeleteTransaction} 
            />
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
          className="fixed bottom-[100px] right-6 w-16 h-16 bg-md-primary text-white rounded-3xl shadow-2xl flex items-center justify-center transition-all hover:scale-110 active:scale-90 z-40"
        >
          <Plus size={32} strokeWidth={3} />
        </button>
      )}

      {isMenuOpen && (
        <div className="fixed inset-0 z-[110] bg-black/40 animate-in fade-in duration-300" onClick={() => setIsMenuOpen(false)}>
           <div className="absolute right-0 top-0 bottom-0 w-[300px] bg-md-surface dark:bg-zinc-900 p-8 pt-safe animate-in slide-in-from-right duration-400 rounded-l-[32px] shadow-2xl" onClick={e => e.stopPropagation()}>
              <div className="flex justify-between items-center mb-10 py-4">
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
                 
                 <div className="mt-8 pt-8 border-t dark:border-zinc-800">
                    <div className={`p-4 rounded-2xl flex items-center gap-4 ${isOnline ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700' : 'bg-amber-50 dark:bg-amber-900/20 text-amber-700'}`}>
                       {isOnline ? <Wifi size={20} /> : <WifiOff size={20} />}
                       <div>
                          <p className="text-xs font-black uppercase tracking-widest">{isOnline ? 'Internet Connected' : 'Offline Mode Active'}</p>
                          <p className="text-[10px] opacity-70 leading-tight mt-0.5">{isOnline ? 'Data will sync automatically with cloud.' : 'All changes saved locally, sync on connect.'}</p>
                       </div>
                    </div>
                 </div>
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
