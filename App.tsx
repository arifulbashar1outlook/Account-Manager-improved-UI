
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
  Moon,
  CalendarDays,
  History as HistoryIcon
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

  const summary = useMemo(() => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    const todayStr = now.toISOString().split('T')[0];
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    
    const filteredMonth = transactions.filter(t => {
      const td = new Date(t.date);
      return td.getMonth() === currentMonth && td.getFullYear() === currentYear;
    });
    
    const filteredYear = transactions.filter(t => {
      const td = new Date(t.date);
      return td.getFullYear() === currentYear;
    });

    const todayExp = transactions
      .filter(t => t.date.split('T')[0] === todayStr && t.type === 'expense')
      .reduce((s, t) => s + t.amount, 0);
    
    const inc = filteredMonth.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
    const exp = filteredMonth.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
    const yearExp = filteredYear.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
    
    const dailyAvg = exp / now.getDate();
    const projectedExp = dailyAvg * daysInMonth;
    const healthScore = Math.min(100, Math.max(0, inc > 0 ? ((inc - exp) / inc) * 100 : 0));

    const catTotals: Record<string, number> = {};
    filteredMonth.filter(t => t.type === 'expense').forEach(t => {
       catTotals[t.category] = (catTotals[t.category] || 0) + t.amount;
    });
    const topCategories = Object.entries(catTotals).sort((a, b) => b[1] - a[1]).slice(0, 3);

    return { inc, exp, todayExp, yearExp, bal: inc - exp, dailyAvg, projectedExp, healthScore, topCategories };
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
            <div className="bg-white/20 p-2.5 rounded-2xl text-white border border-white/20"><LayoutDashboard size={24} /></div>
            <div>
              <h1 className="text-[18px] font-extrabold text-white">Account Manager</h1>
              <div className="flex items-center gap-1.5 mt-1">
                <div className={`w-1.5 h-1.5 rounded-full ${syncStatus === 'synced' ? 'bg-emerald-400' : 'bg-amber-400'}`}></div>
                <p className="text-[10px] font-medium text-white/80 uppercase">System Active</p>
              </div>
            </div>
          </div>
          <button onClick={() => setIsMenuOpen(true)} className="p-3.5 rounded-full bg-white/10 text-white border border-white/20 shadow-md active:scale-90"><Menu size={24}/></button>
      </header>

      <main className="max-w-md mx-auto">
        {activeTab === 'dashboard' && (
          <div className="p-6 space-y-6 animate-in fade-in duration-500">
            <div className="mesh-gradient-primary p-8 rounded-[36px] shadow-2xl relative overflow-hidden group border border-white/20">
                <div className="relative z-10 text-white">
                  <div className="flex justify-between items-start mb-1">
                    <p className="text-[10px] font-medium uppercase tracking-widest opacity-60">Monthly Balance</p>
                    <div className="px-3 py-1 bg-white/20 backdrop-blur-md rounded-full text-[8px] font-black">Health: {summary.healthScore.toFixed(0)}%</div>
                  </div>
                  <h2 className="text-5xl font-black tracking-tighter mb-6">Tk {summary.bal.toLocaleString()}</h2>
                  <div className="pt-5 border-t border-white/10 flex justify-between text-white">
                     <div><p className="text-[8px] opacity-50 uppercase">Daily Burn</p><p className="font-black">Tk {summary.dailyAvg.toFixed(0)}</p></div>
                     <div className="text-right"><p className="text-[8px] opacity-50 uppercase">Est. Total</p><p className="font-black">Tk {summary.projectedExp.toFixed(0)}</p></div>
                  </div>
                </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
               <SummaryCard title="Today" amount={summary.todayExp} icon={CalendarDays} colorClass="text-rose-500" bgClass="bg-rose-500" />
               <SummaryCard title="Yearly Out" amount={summary.yearExp} icon={HistoryIcon} colorClass="text-indigo-500" bgClass="bg-indigo-500" />
               <SummaryCard title="Inflow" amount={summary.inc} icon={TrendingUp} colorClass="text-emerald-500" bgClass="bg-emerald-500" />
               <SummaryCard title="Outflow" amount={summary.exp} icon={TrendingDown} colorClass="text-rose-600" bgClass="bg-rose-600" />
            </div>

            <div className="space-y-4">
               <h3 className="font-medium text-[11px] uppercase tracking-widest opacity-60 px-1 dark:text-white">Wallets</h3>
               <div className="grid gap-3">
                 {accounts.map(acc => (
                   <div key={acc.id} className="glass p-6 rounded-[28px] flex justify-between items-center shadow-sm">
                      <div className="flex items-center gap-4">
                        <div className="w-1.5 h-9 rounded-full" style={{ backgroundColor: acc.color }}></div>
                        <p className="font-extrabold text-lg" style={{ color: acc.color }}>{acc.name}</p>
                      </div>
                      <p className="font-black text-sm dark:text-white">Tk {accountBalances[acc.id]?.toLocaleString()}</p>
                   </div>
                 ))}
               </div>
            </div>
          </div>
        )}

        {activeTab === 'input' && (
          <div className="p-4 space-y-6 pb-32 animate-in fade-in duration-300">
            <div className="flex items-center gap-3 pt-4 pb-2">
              <PlusCircle className="text-md-primary" size={24} />
              <h2 className="text-3xl font-extrabold tracking-tight text-md-on-surface dark:text-white">New Entry</h2>
            </div>
            <SalaryManager onAddTransaction={(t) => { handleAddTransaction(t); setActiveTab('dashboard'); }} accounts={accounts} />
            <TransactionForm onAddTransaction={(t) => { handleAddTransaction(t); setActiveTab('dashboard'); }} accounts={accounts} />
          </div>
        )}

        {activeTab === 'bazar' && <BazarView transactions={transactions} accounts={accounts} templates={bazarTemplates} setTemplates={setBazarTemplates} toBuyList={toBuyList} setToBuyList={setToBuyList} onAddTransaction={handleAddTransaction} onUpdateTransaction={handleUpdateTransaction} onDeleteTransaction={handleDeleteTransaction} />}
        {activeTab === 'full-report' && <FullMonthlyReport transactions={transactions} accounts={accounts} />}
        {activeTab === 'history' && <HistoryView transactions={transactions} accounts={accounts} onUpdateTransaction={handleUpdateTransaction} onDeleteTransaction={handleDeleteTransaction} />}
        
        {activeTab === 'lending' && <LendingView transactions={transactions} accounts={accounts} onAddTransaction={handleAddTransaction} onUpdateTransaction={handleUpdateTransaction} onDeleteTransaction={handleDeleteTransaction} />}
        {activeTab === 'wallet-manager' && <AccountsView accounts={accounts} onUpdateAccounts={accs => { if(typeof accs === 'function') { setAccounts(prev => { const res = accs(prev); triggerAutoPush({ accs: res }); return res; }); } else { setAccounts(accs); triggerAutoPush({ accs }); } }} onBack={() => setActiveTab('dashboard')} />}
        {activeTab === 'sync-setup' && <SyncView onBack={() => setActiveTab('dashboard')} onPullData={handleSyncPull} />}
        {activeTab === 'ai-setup' && <AiView onBack={() => setActiveTab('dashboard')} />}
      </main>

      {!isKeyboardVisible && activeTab === 'dashboard' && <button onClick={() => setActiveTab('input')} className="fixed bottom-[100px] right-6 w-16 h-16 bg-md-primary text-white rounded-[24px] shadow-2xl flex items-center justify-center z-40 border border-white/20 transition-transform active:scale-90"><Plus size={32} strokeWidth={3} /></button>}

      {isMenuOpen && (
        <div className="fixed inset-0 z-[110] bg-black/60 backdrop-blur-sm animate-in fade-in duration-300" onClick={() => setIsMenuOpen(false)}>
           <div className="absolute right-0 top-0 bottom-0 w-[300px] glass p-8 pt-safe animate-in slide-in-from-right duration-400 rounded-l-[40px] shadow-2xl overflow-y-auto" onClick={e => e.stopPropagation()}>
              <div className="flex justify-between items-center mb-8 py-4 border-b border-black/5 dark:border-white/5"><h3 className="font-extrabold text-xl dark:text-white">Settings</h3><button onClick={() => setIsMenuOpen(false)} className="p-2 dark:text-white hover:bg-black/5 rounded-full"><XIcon size={24}/></button></div>
              <div className="space-y-1.5">
                 <MenuBtn onClick={() => { setDarkMode(!darkMode); }} icon={darkMode ? Sun : Moon} label={darkMode ? "Light Mode" : "Dark Mode"} />
                 <MenuBtn onClick={() => { triggerAutoPush(); setIsMenuOpen(false); }} icon={CloudUpload} label="Sync: Push to Cloud" color="text-emerald-500" />
                 <MenuBtn onClick={() => { handleSyncPull(); setIsMenuOpen(false); }} icon={RotateCw} label="Sync: Pull from Cloud" color="text-amber-500" />
                 <div className="h-px bg-black/5 dark:bg-white/5 my-4"></div>
                 <MenuBtn onClick={() => { setActiveTab('sync-setup'); setIsMenuOpen(false); }} icon={FileSpreadsheet} label="Configure Sync" />
                 <MenuBtn onClick={() => { setActiveTab('wallet-manager'); setIsMenuOpen(false); }} icon={CreditCard} label="Manage Wallets" />
                 <MenuBtn onClick={() => { setActiveTab('lending'); setIsMenuOpen(false); }} icon={HandCoins} label="Lending & Debt" />
                 <MenuBtn onClick={() => { setActiveTab('ai-setup'); setIsMenuOpen(false); }} icon={Sparkles} label="AI Settings" />
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
