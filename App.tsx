
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  TrendingUp, 
  TrendingDown, 
  Plus, 
  Menu, 
  CreditCard, 
  HandCoins,
  LayoutDashboard,
  X as XIcon,
  PlusCircle,
  RotateCw,
  CloudUpload,
  Activity,
  Wallet as WalletIcon,
  FileSpreadsheet,
  Target,
  Sparkles,
  Zap,
  ArrowRight,
  PieChart,
  Bot,
  Sun,
  Moon
} from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';

import { Transaction, Account, Category } from './types';
import { 
  getStoredTransactions, saveStoredTransactions, 
  getStoredAccounts, saveStoredAccounts,
  getStoredBazarTemplates, saveStoredBazarTemplates,
  getStoredToBuyList, saveStoredToBuyList
} from './services/storage';
import { pushToSheets, pullFromSheets } from './services/syncService';
import TransactionForm from './components/TransactionForm';
import SummaryCard from './components/SummaryCard';
import BottomNavigation from './components/BottomNavigation';
import SalaryManager from './components/SalaryManager';
import SyncView from './components/SyncView';
import AccountsView from './components/AccountsView';
import LendingView from './components/LendingView';
import BazarView from './components/BazarView';
import HistoryView from './components/HistoryView';
import FullMonthlyReport from './components/FullMonthlyReport';
import AiView from './components/AiView';

const useKeyboardVisibility = () => {
  const [isKeyboardVisible, setKeyboardVisible] = useState(false);
  useEffect(() => {
    const handleResize = () => {
      const viewport = window.visualViewport;
      if (viewport) {
        setKeyboardVisible(viewport.height < window.innerHeight * 0.85);
      }
    };
    window.visualViewport?.addEventListener('resize', handleResize);
    window.addEventListener('resize', handleResize);
    return () => {
      window.visualViewport?.removeEventListener('resize', handleResize);
      window.removeEventListener('resize', handleResize);
    };
  }, []);
  return isKeyboardVisible;
};

const App: React.FC = () => {
  const [transactions, setTransactions] = useState<Transaction[]>(() => getStoredTransactions());
  const [accounts, setAccounts] = useState<Account[]>(() => getStoredAccounts());
  const [bazarTemplates, setBazarTemplates] = useState<string[]>(() => getStoredBazarTemplates());
  const [toBuyList, setToBuyList] = useState<string[]>(() => getStoredToBuyList());
  
  const [activeTab, setActiveTab] = useState('dashboard');
  const [syncStatus, setSyncStatus] = useState<'synced' | 'pending' | 'syncing' | 'error' | 'none'>('none');
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem('theme') !== 'light');
  const isKeyboardVisible = useKeyboardVisibility();

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [darkMode]);

  const handleSyncPull = useCallback(async (silent = false) => {
    if (!navigator.onLine) {
        if (!silent) alert("Device is offline.");
        return;
    }
    if (!silent) setSyncStatus('syncing');
    
    const cloudData = await pullFromSheets();
    if (cloudData) {
      setTransactions(cloudData.transactions);
      saveStoredTransactions(cloudData.transactions);
      setAccounts(cloudData.accounts);
      saveStoredAccounts(cloudData.accounts);
      setBazarTemplates(cloudData.templates);
      saveStoredBazarTemplates(cloudData.templates);
      setToBuyList(cloudData.toBuyList);
      saveStoredToBuyList(cloudData.toBuyList);
      setSyncStatus('synced');
    } else if (!silent) {
      setSyncStatus('error');
    }
  }, []);

  const triggerAutoPush = useCallback(async (overrides?: { txs?: Transaction[], accs?: Account[], tmpl?: string[], buy?: string[] }) => {
    if (!navigator.onLine) {
        setSyncStatus('pending');
        return;
    }
    setSyncStatus('syncing');
    const success = await pushToSheets(
      overrides?.txs || transactions, 
      overrides?.accs || accounts, 
      overrides?.tmpl || bazarTemplates, 
      overrides?.buy || toBuyList
    );
    setSyncStatus(success ? 'synced' : 'error');
  }, [transactions, accounts, bazarTemplates, toBuyList]);

  useEffect(() => {
    const handleOnline = () => { setIsOnline(true); triggerAutoPush(); };
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => { 
        window.removeEventListener('online', handleOnline); 
        window.removeEventListener('offline', handleOffline); 
    };
  }, [triggerAutoPush]);

  const handleAddTransaction = (t: Omit<Transaction, 'id'>) => {
    const newTx = {...t, id: uuidv4()};
    const updated = [newTx, ...transactions];
    setTransactions(updated);
    saveStoredTransactions(updated);
    triggerAutoPush({ txs: updated });
  };

  const handleUpdateTransaction = (updatedTx: Transaction) => {
    const updated = transactions.map(t => t.id === updatedTx.id ? updatedTx : t);
    setTransactions(updated);
    saveStoredTransactions(updated);
    triggerAutoPush({ txs: updated });
  };

  const handleDeleteTransaction = (id: string) => {
    const updated = transactions.filter(t => t.id !== id);
    setTransactions(updated);
    saveStoredTransactions(updated);
    triggerAutoPush({ txs: updated });
  };

  const updateBazarTemplates = (newTemplates: string[]) => {
    setBazarTemplates(newTemplates);
    saveStoredBazarTemplates(newTemplates);
    triggerAutoPush({ tmpl: newTemplates });
  };

  const updateToBuyList = (newList: string[]) => {
    setToBuyList(newList);
    saveStoredToBuyList(newList);
    triggerAutoPush({ buy: newList });
  };

  const summary = useMemo(() => {
    const d = new Date();
    const currentMonth = d.getMonth();
    const currentYear = d.getFullYear();
    const currentDay = d.getDate();
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    
    const filteredMonth = transactions.filter(t => {
      const td = new Date(t.date);
      return td.getMonth() === currentMonth && td.getFullYear() === currentYear;
    });
    
    const inc = filteredMonth.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
    const exp = filteredMonth.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
    
    const dailyAvg = exp / currentDay;
    const projectedExp = dailyAvg * daysInMonth;
    
    const healthScore = Math.min(100, Math.max(0, inc > 0 ? ((inc - exp) / inc) * 100 : 0));

    const catTotals: Record<string, number> = {};
    filteredMonth.filter(t => t.type === 'expense').forEach(t => {
       catTotals[t.category] = (catTotals[t.category] || 0) + t.amount;
    });
    const topCategories = Object.entries(catTotals)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3);

    return { inc, exp, bal: inc - exp, dailyAvg, projectedExp, healthScore, topCategories };
  }, [transactions]);

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

  return (
    <div className="min-h-screen bg-md-surface dark:bg-zinc-950 pb-32 transition-colors">
      <header className="sticky top-0 z-50 bg-md-primary/80 backdrop-blur-xl px-4 pt-safe flex items-center justify-between shadow-lg h-[96px] border-b border-white/10">
          <div className="flex items-center gap-3.5">
            <div className="bg-white/20 p-2.5 rounded-2xl text-white shadow-sm border border-white/20">
              <LayoutDashboard size={24} strokeWidth={2.5} />
            </div>
            <div>
              <h1 className="text-[18px] font-extrabold tracking-tight text-white leading-none">Account Manager</h1>
              <div className="flex items-center gap-1.5 mt-1 opacity-80">
                <div className={`w-1.5 h-1.5 rounded-full ${syncStatus === 'synced' ? 'bg-emerald-400' : 'bg-amber-400'}`}></div>
                <p className="text-[10px] font-medium uppercase tracking-[0.15em] text-white/80">{syncStatus === 'syncing' ? 'Syncing...' : 'System Active'}</p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-0.5">
            {/* Theme switcher, Pull and Push are now moved into the side menu for a cleaner look */}
            <button onClick={() => setIsMenuOpen(true)} className="p-3.5 rounded-full bg-white/10 text-white transition-colors active:scale-90 shadow-md border border-white/20" title="Menu"><Menu size={24}/></button>
          </div>
      </header>

      <main className="max-w-md mx-auto">
        {activeTab === 'dashboard' && (
          <div className="p-6 space-y-6 animate-in fade-in duration-500">
            {/* Primary Balance Card with Mesh Gradient */}
            <div className="mesh-gradient-primary p-8 rounded-[36px] shadow-2xl relative overflow-hidden group border border-white/20">
                <div className="absolute -right-10 -top-10 w-40 h-40 bg-white/10 rounded-full blur-3xl animate-mesh"></div>
                <div className="relative z-10">
                  <div className="flex justify-between items-start mb-1">
                    <p className="text-[10px] font-medium uppercase tracking-[0.2em] text-white opacity-60">Monthly Balance</p>
                    <div className="flex items-center gap-1.5 px-3 py-1 bg-white/20 backdrop-blur-md rounded-full border border-white/10">
                      <Zap size={10} className="text-white" />
                      <span className="text-[8px] font-black uppercase tracking-tighter text-white">Health: {summary.healthScore.toFixed(0)}%</span>
                    </div>
                  </div>
                  <h2 className="text-5xl font-black text-white tracking-tighter mb-6">Tk {summary.bal.toLocaleString()}</h2>
                  
                  <div className="pt-5 border-t border-white/10 flex items-center justify-between">
                     <div className="flex items-center gap-3">
                        <div className="p-2.5 bg-white/20 rounded-2xl shadow-sm border border-white/10 backdrop-blur-md"><Activity size={18} className="text-white" /></div>
                        <div>
                          <p className="text-[8px] font-medium uppercase tracking-widest text-white/50 leading-none mb-1">Daily Burn</p>
                          <p className="text-base font-black text-white">Tk {summary.dailyAvg.toFixed(0)}</p>
                        </div>
                     </div>
                     <div className="text-right">
                       <p className="text-[8px] font-medium uppercase tracking-widest text-white/50 leading-none mb-1">Projected Total</p>
                       <p className="text-base font-black text-white">Tk {summary.projectedExp.toFixed(0)}</p>
                     </div>
                  </div>
                </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
               <SummaryCard title="Inflow" amount={summary.inc} icon={TrendingUp} colorClass="text-emerald-500 dark:text-emerald-400" bgClass="bg-emerald-500" />
               <SummaryCard title="Outflow" amount={summary.exp} icon={TrendingDown} colorClass="text-rose-500 dark:text-rose-400" bgClass="bg-rose-500" />
            </div>

            {/* Quick Stats/Trends Improvement with Glassmorphism */}
            {summary.topCategories.length > 0 && (
              <div className="glass p-6 rounded-[32px] shadow-sm space-y-4">
                 <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                       <PieChart size={16} className="text-md-primary" />
                       <h3 className="font-medium text-[10px] uppercase tracking-[0.2em] text-md-on-surface-variant opacity-60">Spending Trends</h3>
                    </div>
                    <button onClick={() => setActiveTab('full-report')} className="text-[9px] font-black uppercase tracking-widest text-md-primary flex items-center gap-1 group">
                       Details <ArrowRight size={10} className="group-hover:translate-x-0.5 transition-transform" />
                    </button>
                 </div>
                 <div className="space-y-3">
                    {summary.topCategories.map(([cat, val]) => (
                       <div key={cat} className="flex items-center justify-between">
                          <p className="text-xs font-semibold text-md-on-surface/80 truncate flex-1">{cat}</p>
                          <div className="flex items-center gap-3 flex-1 px-4">
                             <div className="h-1.5 flex-1 bg-gray-100 dark:bg-zinc-800 rounded-full overflow-hidden border border-black/5 dark:border-white/5">
                                <div className="h-full bg-md-primary/40 rounded-full" style={{ width: `${(val / summary.exp) * 100}%` }}></div>
                             </div>
                          </div>
                          <p className="text-[10px] font-black text-md-on-surface">Tk {val.toLocaleString()}</p>
                       </div>
                    ))}
                 </div>
              </div>
            )}

            {/* Health Score Gauge */}
            <div className="glass p-5 rounded-[32px] shadow-sm">
               <div className="flex items-center justify-between mb-4 px-1">
                 <div className="flex items-center gap-2">
                   <Target size={16} className="text-md-primary" />
                   <h3 className="font-medium text-[10px] uppercase tracking-[0.2em] text-md-on-surface-variant opacity-60">Savings Performance</h3>
                 </div>
                 <span className={`text-[10px] font-black ${summary.healthScore > 30 ? 'text-emerald-500' : 'text-amber-500'}`}>
                    {summary.healthScore > 50 ? 'Excellent' : summary.healthScore > 20 ? 'Good' : 'Critical'}
                 </span>
               </div>
               <div className="h-2 w-full bg-gray-100 dark:bg-zinc-800 rounded-full overflow-hidden border border-black/5 dark:border-white/5">
                  <div 
                    className={`h-full transition-all duration-1000 ${
                      summary.healthScore > 50 ? 'bg-emerald-500' : 
                      summary.healthScore > 20 ? 'bg-amber-500' : 'bg-rose-500'
                    }`}
                    style={{ width: `${summary.healthScore}%` }}
                  ></div>
               </div>
            </div>

            <div className="space-y-4">
               <div className="flex items-center justify-between px-1">
                 <div className="flex items-center gap-2">
                   <WalletIcon size={18} className="text-md-primary" />
                   <h3 className="font-medium text-[11px] uppercase tracking-[0.2em] text-md-on-surface-variant opacity-60">Wallet Balances</h3>
                 </div>
                 <button onClick={() => setActiveTab('wallet-manager')} className="text-[10px] font-black uppercase tracking-widest text-md-primary px-4 py-1.5 bg-md-primary/10 rounded-full active:scale-95 transition-all">Setup</button>
               </div>
               <div className="grid gap-3">
                 {accounts.map(acc => (
                   <div key={acc.id} className="glass p-6 rounded-[28px] flex justify-between items-center shadow-sm active:bg-gray-50 dark:active:bg-zinc-800 transition-all hover:translate-x-1 group">
                      <div className="flex items-center gap-4">
                        <div className="w-1.5 h-9 rounded-full group-hover:scale-y-110 transition-transform" style={{ backgroundColor: acc.color }}></div>
                        <p className="font-extrabold text-lg tracking-tight" style={{ color: acc.color }}>{acc.name}</p>
                      </div>
                      <p className="font-black text-sm text-md-on-surface dark:text-gray-100">Tk {accountBalances[acc.id]?.toLocaleString()}</p>
                   </div>
                 ))}
               </div>
            </div>
          </div>
        )}

        {activeTab === 'input' && (
          <div className="animate-in fade-in duration-300 p-4 space-y-6 pb-32">
             <div className="flex items-center gap-3 pt-4 pb-2">
                <PlusCircle className="text-md-primary" size={24} />
                <h2 className="text-3xl font-extrabold tracking-tight text-md-on-surface">New Entry</h2>
             </div>
             <SalaryManager onAddTransaction={(t) => { handleAddTransaction(t); setActiveTab('dashboard'); }} accounts={accounts} />
             <TransactionForm onAddTransaction={(t) => { handleAddTransaction(t); setActiveTab('dashboard'); }} accounts={accounts} />
          </div>
        )}

        {activeTab === 'bazar' && <BazarView transactions={transactions} accounts={accounts} templates={bazarTemplates} setTemplates={updateBazarTemplates} toBuyList={toBuyList} setToBuyList={updateToBuyList} onAddTransaction={handleAddTransaction} onUpdateTransaction={handleUpdateTransaction} onDeleteTransaction={handleDeleteTransaction} />}
        {activeTab === 'full-report' && <FullMonthlyReport transactions={transactions} accounts={accounts} />}
        {activeTab === 'history' && <HistoryView transactions={transactions} accounts={accounts} onUpdateTransaction={handleUpdateTransaction} onDeleteTransaction={handleDeleteTransaction} />}
        {activeTab === 'lending' && <LendingView transactions={transactions} accounts={accounts} onAddTransaction={handleAddTransaction} onUpdateTransaction={handleUpdateTransaction} onDeleteTransaction={handleDeleteTransaction} />}
        {activeTab === 'wallet-manager' && <AccountsView accounts={accounts} onUpdateAccounts={accs => { setAccounts(accs as Account[]); triggerAutoPush({ accs: accs as Account[] }); }} onBack={() => setActiveTab('dashboard')} />}
        {activeTab === 'sync-setup' && <SyncView onBack={() => setActiveTab('dashboard')} onPullData={handleSyncPull} />}
        {activeTab === 'ai-setup' && <AiView onBack={() => setActiveTab('dashboard')} />}
      </main>

      {!isKeyboardVisible && activeTab === 'dashboard' && (
        <button onClick={() => setActiveTab('input')} className="fixed bottom-[100px] right-6 w-16 h-16 bg-md-primary text-white rounded-[24px] shadow-2xl flex items-center justify-center transition-all hover:scale-110 active:scale-90 z-40 border border-white/20">
          <Plus size={32} strokeWidth={3} />
        </button>
      )}

      {isMenuOpen && (
        <div className="fixed inset-0 z-[110] bg-black/60 backdrop-blur-sm animate-in fade-in duration-300" onClick={() => setIsMenuOpen(false)}>
           <div className="absolute right-0 top-0 bottom-0 w-[300px] glass p-8 pt-safe animate-in slide-in-from-right duration-400 rounded-l-[40px] shadow-2xl overflow-y-auto" onClick={e => e.stopPropagation()}>
              <div className="flex justify-between items-center mb-8 py-4 border-b border-black/5 dark:border-white/5">
                <h3 className="font-extrabold text-xl">System</h3>
                <button onClick={() => setIsMenuOpen(false)} className="p-2 hover:bg-black/5 dark:hover:bg-white/5 rounded-full"><XIcon size={24}/></button>
              </div>
              
              <div className="space-y-1.5">
                 <div className="px-6 pb-2">
                    <h4 className="text-[10px] font-black uppercase tracking-widest text-md-primary opacity-60">Features</h4>
                 </div>
                 <MenuBtn onClick={() => { setActiveTab('ai-setup'); setIsMenuOpen(false); }} icon={Bot} label="AI Features" />
                 <MenuBtn onClick={() => { setActiveTab('sync-setup'); setIsMenuOpen(false); }} icon={FileSpreadsheet} label="Cloud Sync Setup" />
                 <MenuBtn onClick={() => { setActiveTab('wallet-manager'); setIsMenuOpen(false); }} icon={CreditCard} label="Manage Wallets" />
                 <MenuBtn onClick={() => { setActiveTab('lending'); setIsMenuOpen(false); }} icon={HandCoins} label="Debt & Loans" />
                 
                 <div className="px-6 pt-6 pb-2">
                    <h4 className="text-[10px] font-black uppercase tracking-widest text-md-primary opacity-60">Cloud & Theme</h4>
                 </div>
                 <MenuBtn onClick={() => { triggerAutoPush(); setIsMenuOpen(false); }} icon={CloudUpload} label="Push Data to Cloud" color="text-emerald-500" />
                 <MenuBtn onClick={() => { handleSyncPull(); setIsMenuOpen(false); }} icon={RotateCw} label="Pull Data from Cloud" color="text-amber-500" />
                 <MenuBtn onClick={() => { setDarkMode(!darkMode); }} icon={darkMode ? Sun : Moon} label={darkMode ? "Switch to Light Mode" : "Switch to Dark Mode"} />
              </div>

              <div className="mt-10 p-6 bg-md-primary/5 rounded-3xl border border-md-primary/10">
                 <p className="text-[9px] font-black uppercase tracking-widest text-md-primary/60 text-center">Version 2.5.0 Stable</p>
              </div>
           </div>
        </div>
      )}

      {!isKeyboardVisible && <BottomNavigation activeTab={activeTab} onTabChange={setActiveTab} />}
    </div>
  );
};

const MenuBtn = ({ onClick, icon: Icon, label, color }: any) => (
  <button onClick={onClick} className="w-full flex items-center gap-4 py-4 px-6 rounded-2xl hover:bg-md-primary/10 dark:hover:bg-md-primary/20 text-sm font-semibold transition-all active:scale-95 group">
     <div className={`p-2.5 bg-md-primary/5 dark:bg-white/5 rounded-xl ${color || 'text-md-primary'} group-hover:scale-110 transition-transform`}><Icon size={20} /></div>
     <span className="dark:text-white">{label}</span>
  </button>
);

export default App;
