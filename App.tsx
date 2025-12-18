
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
  Activity
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
    const [activeReportType, setActiveReportType] = useState<'expense' | 'income' | 'transfer'>('expense');

    const changeMonth = (offset: number) => {
        const newDate = new Date(viewDate);
        newDate.setMonth(newDate.getMonth() + offset);
        setViewDate(newDate);
        setExpandedCategories({});
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

    const monthExpense = monthTransactions.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
    const monthIncome = monthTransactions.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
    const monthTransfers = monthTransactions.filter(t => t.type === 'transfer').reduce((s, t) => s + t.amount, 0);
    
    // Daily calculation for all types
    const dailyMap = useMemo(() => {
      const map: Record<number, { expense: number, income: number, transfer: number }> = {};
      monthTransactions.forEach(t => {
          const day = new Date(t.date).getDate();
          if (!map[day]) map[day] = { expense: 0, income: 0, transfer: 0 };
          map[day][t.type] += t.amount;
      });
      return map;
    }, [monthTransactions]);

    const sortedDays = useMemo(() => 
      Object.keys(dailyMap).map(Number).sort((a, b) => b - a),
    [dailyMap]);

    const categoryGroups = useMemo(() => {
        const groups: Record<string, { transactions: Transaction[], total: number }> = {};
        monthTransactions.filter(t => t.type === activeReportType).forEach(t => {
            if (!groups[t.category]) {
                groups[t.category] = { transactions: [], total: 0 };
            }
            groups[t.category].transactions.push(t);
            groups[t.category].total += t.amount;
        });
        return Object.entries(groups).sort((a, b) => b[1].total - a[1].total);
    }, [monthTransactions, activeReportType]);

    const monthName = viewDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

    return (
        <div className="p-4 space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300 pb-32">
            {/* Header / Month Picker */}
            <div className="bg-md-surface-container p-4 rounded-md-card flex justify-between items-center shadow-sm">
                <button onClick={() => changeMonth(-1)} className="p-2 hover:bg-white/20 rounded-full transition-colors"><ChevronLeft size={20}/></button>
                <div className="text-center">
                  <h2 className="font-black text-md-on-surface tracking-tight">{monthName}</h2>
                  <p className="text-[9px] font-black uppercase tracking-widest opacity-40">Financial Report</p>
                </div>
                <button onClick={() => changeMonth(1)} className="p-2 hover:bg-white/20 rounded-full transition-colors"><ChevronRight size={20}/></button>
            </div>

            {/* High Level Stats */}
            <div className="grid grid-cols-2 gap-3">
                <div className="bg-emerald-50 dark:bg-emerald-900/20 p-5 rounded-md-card border border-emerald-100 dark:border-emerald-800/30">
                    <p className="text-[9px] font-black uppercase tracking-widest text-emerald-700 dark:text-emerald-400 opacity-60 mb-1">Received</p>
                    <h3 className="text-lg font-black text-emerald-800 dark:text-emerald-300">Tk {monthIncome.toLocaleString()}</h3>
                </div>
                <div className="bg-rose-50 dark:bg-rose-900/20 p-5 rounded-md-card border border-rose-100 dark:border-rose-800/30">
                    <p className="text-[9px] font-black uppercase tracking-widest text-rose-700 dark:text-rose-400 opacity-60 mb-1">Spent</p>
                    <h3 className="text-lg font-black text-rose-800 dark:text-rose-300">Tk {monthExpense.toLocaleString()}</h3>
                </div>
                <div className="bg-indigo-50 dark:bg-indigo-900/20 p-5 rounded-md-card border border-indigo-100 dark:border-indigo-800/30">
                    <p className="text-[9px] font-black uppercase tracking-widest text-indigo-700 dark:text-indigo-400 opacity-60 mb-1">Transfers</p>
                    <h3 className="text-lg font-black text-indigo-800 dark:text-indigo-300">Tk {monthTransfers.toLocaleString()}</h3>
                </div>
                <div className="bg-md-surface-container p-5 rounded-md-card border border-md-outline/10">
                    <p className="text-[9px] font-black uppercase tracking-widest text-md-on-surface-variant opacity-60 mb-1">Net Flow</p>
                    <h3 className={`text-lg font-black ${monthIncome - monthExpense >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                      Tk {(monthIncome - monthExpense).toLocaleString()}
                    </h3>
                </div>
            </div>

            {/* Category Breakdown Section */}
            <div className="space-y-4">
                <div className="flex items-center justify-between px-2">
                    <div className="flex items-center gap-2">
                      <Tag size={16} className="text-md-primary" />
                      <h3 className="font-black text-xs uppercase tracking-[0.2em] text-md-on-surface-variant">Breakdown</h3>
                    </div>
                </div>

                {/* Report Type Toggle */}
                <div className="flex bg-md-surface-container p-1 rounded-full shadow-inner">
                  {['expense', 'income', 'transfer'].map((type) => (
                    <button
                      key={type}
                      onClick={() => { setActiveReportType(type as any); setExpandedCategories({}); }}
                      className={`flex-1 py-2 text-[10px] font-black rounded-full transition-all uppercase tracking-widest ${
                        activeReportType === type 
                          ? 'bg-md-primary text-white shadow-md' 
                          : 'text-md-on-surface-variant hover:bg-black/5'
                      }`}
                    >
                      {type}s
                    </button>
                  ))}
                </div>

                <div className="space-y-3">
                  {categoryGroups.length > 0 ? (
                      categoryGroups.map(([catName, data]) => {
                          const isExpanded = expandedCategories[catName];
                          const typeColor = activeReportType === 'income' ? 'text-emerald-600' : activeReportType === 'expense' ? 'text-rose-600' : 'text-indigo-600';
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
                                      <p className={`font-black text-sm ${typeColor}`}>Tk {data.total.toLocaleString()}</p>
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
                      <div className="p-10 text-center text-gray-400 bg-md-surface-container/50 rounded-3xl border-dashed border-2">
                          <p className="text-[10px] font-black uppercase tracking-widest">No {activeReportType} records</p>
                      </div>
                  )}
                </div>
            </div>

            {/* Daily Cashflow View */}
            <div className="space-y-4">
                <div className="flex items-center gap-2 px-2">
                    <Activity size={16} className="text-md-primary" />
                    <h3 className="font-black text-xs uppercase tracking-[0.2em] text-md-on-surface-variant">Daily Activity</h3>
                </div>
                {sortedDays.length > 0 ? (
                    <div className="grid gap-3">
                        {sortedDays.map(day => {
                            const data = dailyMap[day];
                            return (
                                <div key={day} className="bg-white dark:bg-zinc-900 p-5 rounded-[28px] border border-gray-100 dark:border-zinc-800 shadow-sm">
                                    <div className="flex justify-between items-center mb-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-2xl bg-md-primary text-white flex items-center justify-center font-black">
                                                {day}
                                            </div>
                                            <div>
                                              <p className="text-sm font-black text-md-on-surface">Day {day}</p>
                                              <p className="text-[9px] text-gray-400 font-bold uppercase tracking-widest">{monthName}</p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                          <p className={`font-black text-sm ${data.income - data.expense >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                                            {data.income - data.expense > 0 ? '+' : ''} Tk {(data.income - data.expense).toLocaleString()}
                                          </p>
                                          <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Daily Balance</p>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-3 gap-2 pt-4 border-t border-gray-50 dark:border-zinc-800">
                                      <div className="text-center">
                                        <p className="text-[8px] font-black text-emerald-500 uppercase tracking-tighter mb-1">Received</p>
                                        <p className="text-[11px] font-black text-emerald-700">Tk {data.income.toLocaleString()}</p>
                                      </div>
                                      <div className="text-center border-x border-gray-100 dark:border-zinc-800">
                                        <p className="text-[8px] font-black text-rose-500 uppercase tracking-tighter mb-1">Spent</p>
                                        <p className="text-[11px] font-black text-rose-700">Tk {data.expense.toLocaleString()}</p>
                                      </div>
                                      <div className="text-center">
                                        <p className="text-[8px] font-black text-indigo-500 uppercase tracking-tighter mb-1">Transfer</p>
                                        <p className="text-[11px] font-black text-indigo-700">Tk {data.transfer.toLocaleString()}</p>
                                      </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    <div className="p-10 text-center text-gray-400 opacity-50 bg-md-surface-container/50 rounded-3xl border border-dashed">
                        <p className="text-[10px] font-black uppercase tracking-widest">No activity this month</p>
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
      }, 15000); // 15s poll is safer for rate limits but responsive enough
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
        <header className="sticky top-0 z-50 bg-md-surface/80 dark:bg-zinc-950/80 backdrop-blur-md px-4 py-4 flex items-center justify-between shadow-sm border-b dark:border-zinc-800">
           <div className="flex items-center gap-3">
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
           <div className="flex items-center gap-1">
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
