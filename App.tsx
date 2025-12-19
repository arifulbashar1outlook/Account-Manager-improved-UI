
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
  PieChart
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
  const isKeyboardVisible = useKeyboardVisibility();

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

    // Top categories for dashboard insight
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
      <header className="sticky top-0 z-50 bg-md-primary px-4 pt-safe flex items-center justify-between shadow-lg h-[96px]">
          <div className="flex items-center gap-3.5">
            <div className="bg-white/20 p-2.5 rounded-2xl text-white shadow-sm backdrop-blur-md border border-white/10">
              <LayoutDashboard size={24} strokeWidth={2.5} />
            </div>
            <div>
              <h1 className="text-[20px] font-[800] tracking-tight text-white leading-none">Account Manager</h1>
              <div className="flex items-center gap-1.5 mt-1 opacity-80">
                <div className={`w-1.5 h-1.5 rounded-full ${syncStatus === 'synced' ? 'bg-emerald-400' : 'bg-amber-400'}`}></div>
                <p className="text-[10px] font-black uppercase tracking-widest text-white">{syncStatus === 'syncing' ? 'Syncing...' : 'System Active'}</p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button onClick={() => triggerAutoPush()} className="p-2.5 rounded-full hover:bg-white/10 text-white transition-all active:scale-90"><CloudUpload size={22}/></button>
            <button onClick={() => handleSyncPull()} className="p-2.5 rounded-full hover:bg-white/10 text-white transition-all active:scale-90"><RotateCw size={22}/></button>
            <button onClick={() => setIsMenuOpen(true)} className="p-2.5 rounded-full hover:bg-white/10 text-white transition-colors active:scale-90"><Menu size={26}/></button>
          </div>
      </header>

      <main className="max-w-md mx-auto">
        {activeTab === 'dashboard' && (
          <div className="p-6 space-y-6 animate-in fade-in duration-500">
            {/* Primary Balance Card */}
            <div className="bg-md-primary-container p-8 rounded-[36px] shadow-sm border border-md-primary/10 relative overflow-hidden group">
                <div className="absolute -right-10 -top-10 w-40 h-40 bg-md-primary/5 rounded-full blur-3xl group-hover:scale-110 transition-transform"></div>
                <div className="relative z-10">
                  <div className="flex justify-between items-start mb-1">
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-md-on-primary-container opacity-60">Monthly Balance</p>
                    <div className="flex items-center gap-1.5 px-3 py-1 bg-white/40 rounded-full">
                      <Zap size={10} className="text-md-primary" />
                      <span className="text-[8px] font-black uppercase tracking-tighter text-md-primary">Health: {summary.healthScore.toFixed(0)}%</span>
                    </div>
                  </div>
                  <h2 className="text-5xl font-[900] text-md-on-primary-container tracking-tighter mb-6">Tk {summary.bal.toLocaleString()}</h2>
                  
                  <div className="pt-5 border-t border-md-on-primary-container/10 flex items-center justify-between">
                     <div className="flex items-center gap-3">
                        <div className="p-2.5 bg-white/60 rounded-2xl shadow-sm"><Activity size={18} className="text-md-primary" /></div>
                        <div>
                          <p className="text-[8px] font-black uppercase tracking-widest text-md-on-primary-container/40 leading-none mb-1">Daily Burn</p>
                          <p className="text-base font-black text-md-on-primary-container">Tk {summary.dailyAvg.toFixed(0)}</p>
                        </div>
                     </div>
                     <div className="text-right">
                       <p className="text-[8px] font-black uppercase tracking-widest text-md-on-primary-container/40 leading-none mb-1">Projected Total</p>
                       <p className="text-base font-black text-rose-700">Tk {summary.projectedExp.toFixed(0)}</p>
                     </div>
                  </div>
                </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
               <SummaryCard title="Inflow" amount={summary.inc} icon={TrendingUp} colorClass="text-emerald-700" bgClass="bg-emerald-100" />
               <SummaryCard title="Outflow" amount={summary.exp} icon={TrendingDown} colorClass="text-rose-700" bgClass="bg-rose-100" />
            </div>

            {/* Quick Stats/Trends Improvement */}
            {summary.topCategories.length > 0 && (
              <div className="bg-white dark:bg-zinc-900 p-6 rounded-[32px] border border-gray-100 dark:border-zinc-800 shadow-sm space-y-4">
                 <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                       <PieChart size={16} className="text-md-primary" />
                       <h3 className="font-black text-[10px] uppercase tracking-widest text-md-on-surface-variant">Spending Trends</h3>
                    </div>
                    <button onClick={() => setActiveTab('full-report')} className="text-[9px] font-black uppercase tracking-widest text-md-primary flex items-center gap-1 group">
                       Details <ArrowRight size={10} className="group-hover:translate-x-0.5 transition-transform" />
                    </button>
                 </div>
                 <div className="space-y-3">
                    {summary.topCategories.map(([cat, val]) => (
                       <div key={cat} className="flex items-center justify-between">
                          <p className="text-xs font-bold text-md-on-surface/70 truncate flex-1">{cat}</p>
                          <div className="flex items-center gap-3 flex-1 px-4">
                             <div className="h-1.5 flex-1 bg-gray-50 dark:bg-zinc-800 rounded-full overflow-hidden">
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
            <div className="bg-white dark:bg-zinc-900 p-5 rounded-[32px] border border-gray-100 dark:border-zinc-800 shadow-sm">
               <div className="flex items-center justify-between mb-4 px-1">
                 <div className="flex items-center gap-2">
                   <Target size={16} className="text-md-primary" />
                   <h3 className="font-black text-[10px] uppercase tracking-widest text-md-on-surface-variant">Savings Performance</h3>
                 </div>
                 <span className={`text-[10px] font-black ${summary.healthScore > 30 ? 'text-emerald-600' : 'text-amber-600'}`}>
                    {summary.healthScore > 50 ? 'Excellent' : summary.healthScore > 20 ? 'Good' : 'Critical'}
                 </span>
               </div>
               <div className="h-2 w-full bg-gray-100 dark:bg-zinc-800 rounded-full overflow-hidden">
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
                   <h3 className="font-black text-[11px] uppercase tracking-widest text-md-on-surface-variant">Wallet Balances</h3>
                 </div>
                 <button onClick={() => setActiveTab('wallet-manager')} className="text-[10px] font-black uppercase tracking-widest text-md-primary px-4 py-1.5 bg-md-primary/10 rounded-full active:scale-95 transition-all">Setup</button>
               </div>
               <div className="grid gap-3">
                 {accounts.map(acc => (
                   <div key={acc.id} className="bg-white dark:bg-zinc-900 p-6 rounded-[28px] border border-gray-100 dark:border-zinc-800 flex justify-between items-center shadow-sm active:bg-gray-50 transition-all hover:translate-x-1">
                      <div className="flex items-center gap-4">
                        <div className="w-1.5 h-9 rounded-full" style={{ backgroundColor: acc.color }}></div>
                        <p className="font-[800] text-lg tracking-tight" style={{ color: acc.color }}>{acc.name}</p>
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
                <h2 className="text-3xl font-[800] tracking-tight text-md-on-surface">New Entry</h2>
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
      </main>

      {!isKeyboardVisible && activeTab === 'dashboard' && (
        <button onClick={() => setActiveTab('input')} className="fixed bottom-[100px] right-6 w-16 h-16 bg-md-primary text-white rounded-[24px] shadow-2xl flex items-center justify-center transition-all hover:scale-110 active:scale-90 z-40">
          <Plus size={32} strokeWidth={3} />
        </button>
      )}

      {isMenuOpen && (
        <div className="fixed inset-0 z-[110] bg-black/40 animate-in fade-in duration-300" onClick={() => setIsMenuOpen(false)}>
           <div className="absolute right-0 top-0 bottom-0 w-[300px] bg-md-surface dark:bg-zinc-900 p-8 pt-safe animate-in slide-in-from-right duration-400 rounded-l-[40px] shadow-2xl" onClick={e => e.stopPropagation()}>
              <div className="flex justify-between items-center mb-10 py-4">
                <h3 className="font-[800] text-xl">System</h3>
                <button onClick={() => setIsMenuOpen(false)} className="p-2 hover:bg-black/5 rounded-full"><XIcon size={24}/></button>
              </div>
              <div className="space-y-1.5">
                 <MenuBtn onClick={() => { setActiveTab('sync-setup'); setIsMenuOpen(false); }} icon={FileSpreadsheet} label="Cloud Sync Setup" />
                 <MenuBtn onClick={() => { setActiveTab('wallet-manager'); setIsMenuOpen(false); }} icon={CreditCard} label="Manage Wallets" />
                 <MenuBtn onClick={() => { setActiveTab('lending'); setIsMenuOpen(false); }} icon={HandCoins} label="Debt & Loans" />
              </div>
           </div>
        </div>
      )}

      {!isKeyboardVisible && <BottomNavigation activeTab={activeTab} onTabChange={setActiveTab} />}
    </div>
  );
};

const MenuBtn = ({ onClick, icon: Icon, label }: any) => (
  <button onClick={onClick} className="w-full flex items-center gap-4 py-4.5 px-6 rounded-2xl hover:bg-black/5 text-sm font-[700] transition-all active:scale-95 group">
     <div className="p-2 bg-md-primary/5 rounded-xl text-md-primary group-hover:scale-110 transition-transform"><Icon size={20} /></div>
     {label}
  </button>
);

export default App;
