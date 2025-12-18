
import React, { useState, useMemo } from 'react';
import { ShoppingBag, Plus, CalendarDays, Clock, Trash2, X, Check, ChevronLeft, ChevronRight, Store, ShoppingCart, Receipt, Hash } from 'lucide-react';
import { Transaction, Category, AccountType, Account } from '../types';

interface BazarViewProps {
  transactions: Transaction[];
  accounts: Account[];
  onAddTransaction: (t: Omit<Transaction, 'id'>) => void;
  onUpdateTransaction: (t: Transaction) => void;
  onDeleteTransaction: (id: string) => void;
}

const BazarView: React.FC<BazarViewProps> = ({ transactions, accounts, onAddTransaction, onUpdateTransaction, onDeleteTransaction }) => {
    const getLocalDateTime = () => {
        const now = new Date();
        const offsetMs = now.getTimezoneOffset() * 60000;
        const localTime = new Date(now.getTime() - offsetMs);
        return localTime.toISOString().slice(0, 16);
    };

    const defaultCash = accounts.find(a => a.id === 'cash')?.id || accounts[0]?.id || '';
    
    const [item, setItem] = useState('');
    const [amount, setAmount] = useState('');
    const [paidFrom, setPaidFrom] = useState<AccountType>(defaultCash);
    const [dateTime, setDateTime] = useState(getLocalDateTime());
    const [viewDate, setViewDate] = useState(new Date());

    const [editingTx, setEditingTx] = useState<Transaction | null>(null);
    const [editDesc, setEditDesc] = useState('');
    const [editAmount, setEditAmount] = useState('');
    const [editDate, setEditDate] = useState('');
    const [editAccount, setEditAccount] = useState<AccountType>(defaultCash);

    const changeMonth = (offset: number) => {
        const newDate = new Date(viewDate);
        newDate.setMonth(newDate.getMonth() + offset);
        setViewDate(newDate);
    };

    const currentMonth = viewDate.getMonth();
    const currentYear = viewDate.getFullYear();
    const isCurrentCalendarMonth = new Date().getMonth() === currentMonth && new Date().getFullYear() === currentYear;

    const bazarTransactions = transactions.filter(t => {
      if (!t.date || t.category !== Category.BAZAR) return false;
      const d = new Date(t.date);
      return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
    });

    const totalBazarSpend = bazarTransactions.reduce((sum, t) => sum + t.amount, 0);

    const handleQuickAdd = (e: React.FormEvent) => {
      e.preventDefault();
      if(!item || !amount) return;
      
      const finalDate = dateTime ? new Date(dateTime).toISOString() : new Date().toISOString();

      onAddTransaction({
        description: item,
        amount: parseFloat(amount),
        type: 'expense',
        category: Category.BAZAR,
        date: finalDate,
        accountId: paidFrom
      });
      setItem('');
      setAmount('');
    };

    const refreshTime = () => setDateTime(getLocalDateTime());

    const startEditing = (t: Transaction) => {
        setEditingTx(t);
        setEditDesc(t.description);
        setEditAmount(t.amount.toString());
        try {
            const d = new Date(t.date);
            const localIso = new Date(d.getTime() - (d.getTimezoneOffset() * 60000)).toISOString().slice(0, 16);
            setEditDate(localIso);
        } catch (e) {
            setEditDate(getLocalDateTime());
        }
        setEditAccount(t.accountId);
    };

    const saveEdit = () => {
        if (!editingTx || !editDesc || !editAmount) return;
        const updatedTx: Transaction = {
            ...editingTx,
            description: editDesc,
            amount: parseFloat(editAmount),
            date: new Date(editDate).toISOString(),
            accountId: editAccount,
        };
        onUpdateTransaction(updatedTx);
        setEditingTx(null);
    };

    const handleDelete = () => {
        if (editingTx) {
            if (window.confirm("Are you sure you want to delete this bazar item?")) {
                onDeleteTransaction(editingTx.id);
                setEditingTx(null);
            }
        }
    };

    // Grouping: Day -> Session (Same Timestamp)
    const groupedStructure = useMemo(() => {
      const days: Record<string, { 
        dailyTotal: number, 
        sessions: Record<string, { items: Transaction[], sessionTotal: number }> 
      }> = {};

      bazarTransactions.forEach(t => {
        const dayKey = t.date.split('T')[0];
        const timeKey = t.date; 

        if (!days[dayKey]) {
          days[dayKey] = { dailyTotal: 0, sessions: {} };
        }
        
        if (!days[dayKey].sessions[timeKey]) {
          days[dayKey].sessions[timeKey] = { items: [], sessionTotal: 0 };
        }

        days[dayKey].dailyTotal += t.amount;
        days[dayKey].sessions[timeKey].items.push(t);
        days[dayKey].sessions[timeKey].sessionTotal += t.amount;
      });

      return days;
    }, [bazarTransactions]);

    const sortedDays = Object.keys(groupedStructure).sort((a, b) => new Date(b).getTime() - new Date(a).getTime());

    // Formatted date label for header: e.g., "Dec 25"
    const monthShort = viewDate.toLocaleDateString('en-US', { month: 'short' });
    const yearShort = viewDate.getFullYear().toString().slice(-2);
    const dateLabel = `${monthShort} ${yearShort}`;

    return (
      <div className="max-w-md mx-auto min-h-screen bg-md-surface pb-32">
         {/* Top Section with Title and Total Card */}
         <div className="px-6 space-y-6">
            <div className="flex items-center justify-between pt-4 pb-2">
                <h2 className="text-3xl font-black tracking-tight text-md-on-surface">Bazar List</h2>
                <div className="flex bg-md-surface-container rounded-full p-1 shadow-inner border border-black/5">
                   <button type="button" onClick={() => changeMonth(-1)} className="p-2 hover:bg-white rounded-full transition-all active:scale-90"><ChevronLeft size={20}/></button>
                   <button type="button" onClick={() => changeMonth(1)} className="p-2 hover:bg-white rounded-full transition-all active:scale-90"><ChevronRight size={20}/></button>
                </div>
            </div>
            
            <div className="bg-md-primary-container p-6 rounded-md-card shadow-sm border border-md-primary/10 relative overflow-hidden">
                <div className="absolute top-[-10%] right-[-5%] opacity-5 rotate-12">
                    <ShoppingBag size={120} />
                </div>
                <div className="flex justify-between items-end relative z-10">
                    <div>
                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-md-on-primary-container opacity-60 mb-1">Total in {dateLabel}</p>
                        <h3 className="text-4xl font-black text-md-on-primary-container tracking-tighter">Tk {totalBazarSpend.toLocaleString()}</h3>
                    </div>
                    <div className="bg-white/40 p-3 rounded-2xl text-md-on-primary-container shadow-sm">
                        <ShoppingBag size={28} />
                    </div>
                </div>
            </div>
         </div>

         {/* Edit Modal */}
         {editingTx && (
            <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
                <div className="bg-white dark:bg-zinc-900 rounded-[28px] shadow-2xl w-full max-w-sm overflow-hidden p-6 space-y-6">
                    <h3 className="text-xl font-bold text-md-on-surface">Edit Item</h3>
                    <div className="space-y-4">
                        <div className="relative">
                            <label className="text-[10px] font-black uppercase text-md-primary ml-1 mb-1 block">Description</label>
                            <input 
                                type="text" 
                                value={editDesc}
                                onChange={(e) => setEditDesc(e.target.value)}
                                className="w-full px-4 py-3 bg-md-surface-container rounded-xl outline-none border border-transparent focus:border-md-primary font-black dark:bg-zinc-800 dark:text-white"
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="relative">
                                <label className="text-[10px] font-black uppercase text-md-primary ml-1 mb-1 block">Amount</label>
                                <input 
                                    type="number" 
                                    value={editAmount}
                                    onChange={(e) => setEditAmount(e.target.value)}
                                    className="w-full px-4 py-3 bg-md-surface-container rounded-xl outline-none border border-transparent focus:border-md-primary font-black dark:bg-zinc-800 dark:text-white"
                                />
                            </div>
                            <div className="relative">
                                <label className="text-[10px] font-black uppercase text-md-primary ml-1 mb-1 block">Account</label>
                                <select
                                    value={editAccount}
                                    onChange={(e) => setEditAccount(e.target.value as AccountType)}
                                    className="w-full px-4 py-3 bg-md-surface-container rounded-xl outline-none font-bold appearance-none dark:bg-zinc-800 dark:text-white"
                                >
                                    {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                                </select>
                            </div>
                        </div>
                    </div>
                    <div className="flex justify-between items-center pt-4 border-t dark:border-zinc-800">
                        <button 
                            type="button"
                            onClick={handleDelete}
                            className="p-3 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-full transition-colors"
                        >
                            <Trash2 size={20} />
                        </button>
                        <div className="flex gap-2">
                            <button type="button" onClick={() => setEditingTx(null)} className="px-5 py-2.5 text-sm font-black text-md-on-surface-variant hover:bg-md-surface-container rounded-full dark:text-gray-300">Cancel</button>
                            <button type="button" onClick={saveEdit} className="px-6 py-2.5 bg-md-primary text-white text-sm font-black rounded-full shadow-lg active:scale-95 transition-transform">Save Changes</button>
                        </div>
                    </div>
                </div>
            </div>
         )}

         {/* Batch Entry Form */}
         <div className="px-4 mt-6 space-y-6">
            {isCurrentCalendarMonth && (
                <form onSubmit={handleQuickAdd} className="bg-md-surface-container-high p-5 rounded-md-card border border-md-outline/10 shadow-sm space-y-4">
                   <div className="flex items-center justify-between mb-1">
                       <div className="flex items-center gap-3">
                            <ShoppingCart size={18} className="text-md-primary" />
                            <h4 className="font-black text-xs uppercase tracking-widest text-md-on-surface-variant">Batch Entry</h4>
                       </div>
                       <button type="button" onClick={refreshTime} className="p-2 bg-white dark:bg-zinc-800 rounded-lg shadow-sm text-md-primary active:rotate-180 transition-transform">
                           <Clock size={16} />
                       </button>
                   </div>
                   <div className="flex gap-3">
                       <input 
                         type="text" 
                         value={item}
                         onChange={(e) => setItem(e.target.value)}
                         placeholder="Item name..."
                         className="flex-1 px-4 py-3 bg-white dark:bg-zinc-800 rounded-2xl outline-none text-sm font-black shadow-inner dark:text-white"
                         required
                       />
                       <input 
                         type="number" 
                         value={amount}
                         onChange={(e) => setAmount(e.target.value)}
                         placeholder="Price"
                         className="w-24 px-4 py-3 bg-white dark:bg-zinc-800 rounded-2xl outline-none text-sm font-black text-rose-600 shadow-inner dark:text-rose-400"
                         required
                       />
                   </div>
                   <div className="flex items-center gap-3">
                        <div className="flex-1 bg-white dark:bg-zinc-800 px-4 py-3 rounded-2xl shadow-inner relative overflow-hidden">
                             <input 
                              type="datetime-local" 
                              value={dateTime}
                              onChange={(e) => setDateTime(e.target.value)}
                              className="w-full bg-transparent text-[11px] font-black outline-none dark:text-white"
                            />
                        </div>
                        <button type="submit" className="bg-md-primary text-white px-5 py-3 rounded-2xl font-black text-xs uppercase tracking-widest active:scale-95 transition-all shadow-md">
                           Add to Batch
                        </button>
                   </div>
                   <p className="text-[9px] font-bold text-center text-gray-400 uppercase tracking-widest italic pt-1">Items sharing the same time will be grouped together</p>
                </form>
            )}

            {/* Transaction List */}
            <div className="space-y-12 pb-10">
                {bazarTransactions.length === 0 ? (
                    <div className="py-10 text-center opacity-30 flex flex-col items-center gap-4">
                        <Store size={64} strokeWidth={1} />
                        <p className="font-black text-xs uppercase tracking-[0.2em]">Inventory Empty</p>
                    </div>
                ) : (
                    sortedDays.map(dayKey => {
                        const dayData = groupedStructure[dayKey];
                        const dateObj = new Date(dayKey);
                        const sessionKeys = Object.keys(dayData.sessions).sort((a, b) => new Date(b).getTime() - new Date(a).getTime());

                        return (
                            <div key={dayKey} className="space-y-6">
                                <div className="flex justify-between items-center px-4 sticky top-[72px] z-10 bg-md-surface/80 backdrop-blur-md py-3 rounded-2xl shadow-sm border border-black/5">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-2xl bg-md-primary flex items-center justify-center text-white shadow-md">
                                            <CalendarDays size={20} />
                                        </div>
                                        <div>
                                            <p className="text-sm font-black text-md-on-surface tracking-tight">
                                                {dateObj.toLocaleDateString('en-US', { weekday: 'long', day: 'numeric', month: 'short' })}
                                            </p>
                                            <p className="text-[10px] font-black uppercase tracking-widest text-md-primary">Daily Total</p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-xl font-black text-rose-600 tracking-tighter">Tk {dayData.dailyTotal.toLocaleString()}</p>
                                    </div>
                                </div>

                                <div className="space-y-8 px-1">
                                    {sessionKeys.map(timeKey => {
                                        const session = dayData.sessions[timeKey];
                                        return (
                                            <div key={timeKey} className="bg-white dark:bg-zinc-900 rounded-[32px] overflow-hidden border border-gray-100 dark:border-zinc-800 shadow-sm relative">
                                                <div className="bg-md-surface-container px-4 py-3 flex justify-between items-center border-b border-black/5">
                                                    <div className="flex items-center gap-2">
                                                        <Clock size={12} className="text-md-primary" />
                                                        <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">
                                                            Batch @ {new Date(timeKey).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                        </p>
                                                    </div>
                                                    <p className="font-black text-rose-700 text-sm tracking-tight">Tk {session.sessionTotal.toLocaleString()}</p>
                                                </div>
                                                
                                                <div className="divide-y divide-gray-50 dark:divide-zinc-800">
                                                    {session.items.map((t) => {
                                                        const acc = accounts.find(a => a.id === t.accountId);
                                                        return (
                                                            <div 
                                                                key={t.id} 
                                                                onClick={() => startEditing(t)}
                                                                className="flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-zinc-800 transition-all cursor-pointer group active:bg-md-primary/5"
                                                            >
                                                                <div className="flex items-center gap-4">
                                                                    <div className="w-9 h-9 rounded-xl bg-md-surface-container flex items-center justify-center text-md-primary dark:bg-zinc-800 shadow-inner">
                                                                        <Receipt size={16} />
                                                                    </div>
                                                                    <div>
                                                                        <p className="font-black text-sm text-md-on-surface leading-tight dark:text-white group-hover:text-md-primary transition-colors">{t.description}</p>
                                                                        <p className="text-[9px] font-black uppercase tracking-widest mt-0.5 opacity-60" style={{ color: acc?.color || '#999' }}>{acc?.name || 'Wallet'}</p>
                                                                    </div>
                                                                </div>
                                                                <p className="font-black text-sm text-rose-600 dark:text-rose-400">Tk {t.amount.toLocaleString()}</p>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        );
                    })
                )}
            </div>
         </div>
      </div>
    );
};

export default BazarView;
