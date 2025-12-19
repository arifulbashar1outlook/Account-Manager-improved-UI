
import React, { useState, useMemo } from 'react';
import { 
  History, 
  Receipt, 
  TrendingUp, 
  TrendingDown, 
  ArrowRightLeft, 
  Trash2, 
  X, 
  Check, 
  CalendarDays, 
  FilterX, 
  CalendarRange, 
  Calendar,
  Search,
  Filter,
  ArrowDown,
  Clock,
  ArrowRight
} from 'lucide-react';
import { Transaction, AccountType, Category, TransactionType, Account } from '../types';
import SwipeableItem from './SwipeableItem';

interface HistoryViewProps {
  transactions: Transaction[];
  accounts: Account[];
  onUpdateTransaction: (t: Transaction) => void;
  onDeleteTransaction: (id: string) => void;
}

const HistoryView: React.FC<HistoryViewProps> = ({ transactions, accounts, onUpdateTransaction, onDeleteTransaction }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [typeFilter, setTypeFilter] = useState<'all' | TransactionType>('all');
    const [filterPeriod, setFilterPeriod] = useState<'all' | 'date' | 'month'>('all');
    const [selectedDate, setSelectedDate] = useState('');
    const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));

    const [editingTx, setEditingTx] = useState<Transaction | null>(null);
    const [editDesc, setEditDesc] = useState('');
    const [editAmount, setEditAmount] = useState('');
    const [editDate, setEditDate] = useState('');
    const [editAccount, setEditAccount] = useState<AccountType>(accounts[0]?.id || '');
    const [editTargetAccount, setEditTargetAccount] = useState<AccountType>('');
    const [editCategory, setEditCategory] = useState<string>('');
    const [editType, setEditType] = useState<TransactionType>('expense');

    const filteredTransactions = useMemo(() => {
        let result = [...transactions];
        if (searchTerm) {
            result = result.filter(t => 
                t.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                t.category.toLowerCase().includes(searchTerm.toLowerCase())
            );
        }
        if (typeFilter !== 'all') {
            result = result.filter(t => t.type === typeFilter);
        }
        if (filterPeriod === 'date' && selectedDate) {
            result = result.filter(t => t.date.startsWith(selectedDate));
        } else if (filterPeriod === 'month' && selectedMonth) {
            result = result.filter(t => t.date.startsWith(selectedMonth));
        }
        return result;
    }, [transactions, searchTerm, typeFilter, filterPeriod, selectedDate, selectedMonth]);

    const groupedAll = useMemo(() => {
        const groups: Record<string, Transaction[]> = {};
        filteredTransactions.forEach(t => {
            if (!t.date) return;
            const dateKey = t.date.split('T')[0];
            if (!groups[dateKey]) groups[dateKey] = [];
            groups[dateKey].push(t);
        });
        return groups;
    }, [filteredTransactions]);
    
    const sortedAllDates = Object.keys(groupedAll).sort((a,b) => new Date(b).getTime() - new Date(a).getTime());

    const startEditing = (t: Transaction) => {
        setEditingTx(t);
        setEditDesc(t.description);
        setEditAmount(t.amount.toString());
        try {
            const d = new Date(t.date);
            const localIso = new Date(d.getTime() - (d.getTimezoneOffset() * 60000)).toISOString().slice(0, 16);
            setEditDate(localIso);
        } catch (e) {
            setEditDate(new Date().toISOString().slice(0, 16));
        }
        setEditAccount(t.accountId);
        setEditTargetAccount(t.targetAccountId || (accounts.find(a => a.id !== t.accountId)?.id || ''));
        setEditCategory(t.category);
        setEditType(t.type);
    };

    const saveEdit = () => {
        if (!editingTx || !editDesc || !editAmount) return;
        
        const updatedTx: Transaction = {
            ...editingTx,
            description: editDesc,
            amount: parseFloat(editAmount),
            date: new Date(editDate).toISOString(),
            accountId: editAccount,
            targetAccountId: editType === 'transfer' ? editTargetAccount : undefined,
            category: editType === 'transfer' ? Category.TRANSFER : editCategory,
            type: editType
        };

        onUpdateTransaction(updatedTx);
        setEditingTx(null);
    };

    const handleDelete = (id?: string) => {
        const targetId = id || editingTx?.id;
        if (targetId) {
            if (window.confirm("Are you sure you want to delete this transaction?")) {
                onDeleteTransaction(targetId);
                setEditingTx(null);
            }
        }
    };

    const getAccountInfo = (id: string) => {
        return accounts.find(a => a.id === id);
    };

    return (
       <div className="max-w-md mx-auto min-h-screen bg-md-surface dark:bg-zinc-950 pb-32">
         {editingTx && (
            <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
                <div className="glass rounded-[32px] shadow-2xl w-full max-w-sm overflow-hidden p-8 space-y-6">
                    <h3 className="text-xl font-extrabold text-md-on-surface dark:text-white">Edit Entry</h3>
                    <div className="space-y-4">
                        <div className="relative">
                            <label className="text-[9px] font-medium uppercase tracking-[0.2em] text-md-primary opacity-60 ml-1 mb-1.5 block">Description</label>
                            <input 
                                type="text" 
                                value={editDesc}
                                onChange={(e) => setEditDesc(e.target.value)}
                                className="w-full px-5 py-3.5 bg-black/5 dark:bg-black/20 rounded-2xl outline-none border border-transparent focus:border-md-primary/30 font-semibold dark:text-white"
                            />
                        </div>
                        
                        <div className="relative">
                            <label className="text-[9px] font-medium uppercase tracking-[0.2em] text-md-primary opacity-60 ml-1 mb-1.5 block">Time & Date</label>
                            <div className="relative flex items-center bg-black/5 dark:bg-black/20 rounded-2xl overflow-hidden px-5 py-3.5 border border-transparent focus-within:border-md-primary/30 transition-all cursor-pointer" onClick={(e) => {
                              const input = e.currentTarget.querySelector('input');
                              if (input) (input as any).showPicker?.();
                            }}>
                                <Clock size={16} className="text-md-primary mr-3 opacity-60" />
                                <input 
                                    type="datetime-local" 
                                    value={editDate}
                                    onChange={(e) => setEditDate(e.target.value)}
                                    className="w-full bg-transparent outline-none font-bold dark:text-white cursor-pointer"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="relative">
                                <label className="text-[9px] font-medium uppercase tracking-[0.2em] text-md-primary opacity-60 ml-1 mb-1.5 block">Amount</label>
                                <input 
                                    type="number" 
                                    value={editAmount}
                                    onChange={(e) => setEditAmount(e.target.value)}
                                    className="w-full px-5 py-3.5 bg-black/5 dark:bg-black/20 rounded-2xl outline-none border border-transparent focus:border-md-primary/30 font-black dark:text-white"
                                />
                            </div>
                            <div className="relative">
                                <label className="text-[9px] font-medium uppercase tracking-[0.2em] text-md-primary opacity-60 ml-1 mb-1.5 block">Type</label>
                                <select
                                    value={editType}
                                    onChange={(e) => {
                                        const newType = e.target.value as TransactionType;
                                        setEditType(newType);
                                        if (newType === 'transfer' && !editTargetAccount) {
                                            setEditTargetAccount(accounts.find(a => a.id !== editAccount)?.id || '');
                                        }
                                    }}
                                    className="w-full px-5 py-3.5 bg-black/5 dark:bg-black/20 rounded-2xl outline-none font-bold appearance-none dark:text-white"
                                >
                                    <option value="expense">Expense</option>
                                    <option value="income">Income</option>
                                    <option value="transfer">Transfer</option>
                                </select>
                            </div>
                        </div>
                    </div>
                    <div className="flex justify-between items-center pt-6 border-t border-black/5 dark:border-white/5">
                        <button 
                            type="button"
                            onClick={() => handleDelete()}
                            className="p-3 text-rose-500 hover:bg-rose-500/10 rounded-2xl transition-all active:scale-90"
                        >
                            <Trash2 size={20} />
                        </button>
                        <div className="flex gap-2">
                            <button type="button" onClick={() => setEditingTx(null)} className="px-5 py-3 text-[10px] font-black uppercase tracking-widest text-md-on-surface-variant hover:bg-black/5 rounded-2xl">Cancel</button>
                            <button type="button" onClick={saveEdit} className="px-6 py-3 bg-md-primary text-white text-[10px] font-black uppercase tracking-[0.2em] rounded-2xl shadow-lg active:scale-95">Save</button>
                        </div>
                    </div>
                </div>
            </div>
         )}

         <div className="px-6 space-y-6">
            <h2 className="text-3xl font-black tracking-tight text-md-on-surface pt-4 pb-2 dark:text-white">History</h2>
            
            <div className="relative group">
                <div className="absolute left-5 top-1/2 -translate-y-1/2 text-md-on-surface-variant opacity-40">
                    <Search size={18} />
                </div>
                <input 
                    type="text"
                    placeholder="Search by name or category..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full glass px-12 py-4 rounded-[20px] text-sm font-semibold outline-none border-none focus:ring-2 focus:ring-md-primary/20 transition-all shadow-sm dark:text-white"
                />
                {searchTerm && (
                    <button type="button" onClick={() => setSearchTerm('')} className="absolute right-5 top-1/2 -translate-y-1/2 p-1 text-md-on-surface-variant hover:bg-black/5 rounded-full">
                        <X size={14} />
                    </button>
                )}
            </div>

            <div className="flex gap-2.5 overflow-x-auto pb-2 -mx-2 px-2 no-scrollbar">
                <FilterChip 
                    label="All" 
                    active={typeFilter === 'all'} 
                    onClick={() => setTypeFilter('all')} 
                />
                <FilterChip 
                    label="Expenses" 
                    active={typeFilter === 'expense'} 
                    onClick={() => setTypeFilter('expense')} 
                    icon={TrendingDown}
                />
                <FilterChip 
                    label="Income" 
                    active={typeFilter === 'income'} 
                    onClick={() => setTypeFilter('income')} 
                    icon={TrendingUp}
                />
                <FilterChip 
                    label="Transfers" 
                    active={typeFilter === 'transfer'} 
                    onClick={() => setTypeFilter('transfer')} 
                    icon={ArrowRightLeft}
                />
            </div>

            <div className="flex items-center gap-3 pt-2">
                <div className="flex glass p-1 rounded-full border border-black/5">
                    <button 
                        type="button"
                        onClick={() => setFilterPeriod('all')}
                        className={`px-5 py-2 rounded-full text-[9px] font-black uppercase tracking-wider transition-all ${filterPeriod === 'all' ? 'bg-md-primary text-white shadow-md scale-105' : 'text-md-on-surface-variant opacity-60'}`}
                    >
                        Any
                    </button>
                    <button 
                        type="button"
                        onClick={() => setFilterPeriod('date')}
                        className={`px-5 py-2 rounded-full text-[9px] font-black uppercase tracking-wider transition-all ${filterPeriod === 'date' ? 'bg-md-primary text-white shadow-md scale-105' : 'text-md-on-surface-variant opacity-60'}`}
                    >
                        Day
                    </button>
                    <button 
                        type="button"
                        onClick={() => setFilterPeriod('month')}
                        className={`px-5 py-2 rounded-full text-[9px] font-black uppercase tracking-wider transition-all ${filterPeriod === 'month' ? 'bg-md-primary text-white shadow-md scale-105' : 'text-md-on-surface-variant opacity-60'}`}
                    >
                        Month
                    </button>
                </div>
                
                <div className="flex-1">
                    {filterPeriod === 'date' && (
                        <input 
                            type="date"
                            value={selectedDate}
                            onChange={(e) => setSelectedDate(e.target.value)}
                            className="w-full glass px-4 py-2.5 rounded-2xl text-[10px] font-bold outline-none border-none dark:text-white"
                        />
                    )}
                    {filterPeriod === 'month' && (
                        <input 
                            type="month"
                            value={selectedMonth}
                            onChange={(e) => setSelectedMonth(e.target.value)}
                            className="w-full glass px-4 py-2.5 rounded-2xl text-[10px] font-bold outline-none border-none dark:text-white"
                        />
                    )}
                </div>
            </div>
         </div>

         <div className="px-4 mt-6 space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
             {filteredTransactions.length === 0 ? (
                <div className="py-24 text-center opacity-30 flex flex-col items-center gap-5">
                   <div className="p-8 bg-black/5 rounded-[40px]"><History size={64} strokeWidth={1} /></div>
                   <p className="font-medium text-xs uppercase tracking-[0.3em]">Vault Empty</p>
                </div>
             ) : (
                sortedAllDates.map(date => {
                    const dayTransactions = groupedAll[date];
                    const dateObj = new Date(date);
                    
                    return (
                        <div key={date} className="space-y-4">
                            <div className="flex items-center gap-3 px-3">
                                <div className="w-1.5 h-1.5 rounded-full bg-md-primary animate-pulse"></div>
                                <h3 className="text-[10px] font-medium uppercase tracking-[0.2em] text-md-on-surface-variant opacity-60">
                                    {dateObj.toLocaleDateString('en-US', { weekday: 'short', day: 'numeric', month: 'short' })}
                                </h3>
                            </div>

                            <div className="glass rounded-[32px] overflow-hidden border border-black/5 dark:border-white/5 shadow-sm">
                                {dayTransactions.map((t, idx) => {
                                    const acc = getAccountInfo(t.accountId);
                                    const targetAcc = t.targetAccountId ? getAccountInfo(t.targetAccountId) : null;
                                    
                                    return (
                                        <SwipeableItem 
                                          key={t.id}
                                          onDelete={() => handleDelete(t.id)}
                                          onEdit={() => startEditing(t)}
                                        >
                                          <div 
                                              onClick={() => startEditing(t)}
                                              className={`flex items-center justify-between p-5 bg-white dark:bg-zinc-900 hover:bg-white/60 dark:hover:bg-zinc-800/60 transition-all cursor-pointer group active:bg-md-primary/5 ${idx !== dayTransactions.length - 1 ? 'border-b border-black/5 dark:border-white/5' : ''}`}
                                          >
                                              <div className="flex items-center gap-4">
                                                  <div className={`w-12 h-12 rounded-[20px] flex items-center justify-center transition-all group-hover:scale-110 shadow-inner ${
                                                      t.type === 'income' ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' :
                                                      t.type === 'transfer' ? 'bg-md-primary/10 text-md-primary' :
                                                      'bg-rose-500/10 text-rose-600 dark:text-rose-400'
                                                  }`}>
                                                      {t.type === 'income' ? <TrendingUp size={22} /> : 
                                                      t.type === 'transfer' ? <ArrowRightLeft size={22} /> :
                                                      <TrendingDown size={22} />}
                                                  </div>
                                                  <div className="space-y-0.5">
                                                      <p className="font-semibold text-sm text-md-on-surface leading-tight dark:text-white group-hover:text-md-primary transition-colors">{t.description}</p>
                                                      <div className="flex items-center gap-2">
                                                          <p className="text-[9px] font-medium text-gray-400 uppercase tracking-widest opacity-60">{t.category}</p>
                                                          <span className="w-0.5 h-0.5 bg-gray-300 rounded-full opacity-30"></span>
                                                          
                                                          {t.type === 'transfer' && targetAcc ? (
                                                            <div className="flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-tight">
                                                              <span style={{ color: acc?.color || '#999' }}>{acc?.name || 'Wallet'}</span>
                                                              <ArrowRight size={8} className="text-gray-400 opacity-40" />
                                                              <span style={{ color: targetAcc?.color || '#999' }}>{targetAcc?.name}</span>
                                                            </div>
                                                          ) : (
                                                            <p className="text-[9px] font-bold uppercase tracking-tight" style={{ color: acc?.color || '#999' }}>{acc?.name || 'Wallet'}</p>
                                                          )}
                                                      </div>
                                                  </div>
                                              </div>
                                              <div className="text-right space-y-0.5">
                                                  <p className={`font-black text-sm tracking-tight ${
                                                      t.type === 'income' ? 'text-emerald-600 dark:text-emerald-400' : 
                                                      t.type === 'expense' ? 'text-rose-600 dark:text-rose-400' : 'text-md-on-surface-variant'
                                                  }`}>
                                                      {t.type === 'income' ? '+' : t.type === 'expense' ? '-' : ''} Tk {t.amount.toLocaleString()}
                                                  </p>
                                                  <p className="text-[9px] font-bold text-gray-400 uppercase opacity-40">
                                                      {new Date(t.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                  </p>
                                              </div>
                                          </div>
                                        </SwipeableItem>
                                    );
                                })}
                            </div>
                        </div>
                    );
                })
             )}
         </div>
       </div>
    );
};

interface FilterChipProps {
    label: string;
    active: boolean;
    onClick: () => void;
    icon?: any;
}

const FilterChip: React.FC<FilterChipProps> = ({ label, active, onClick, icon: Icon }) => (
    <button 
        type="button"
        onClick={onClick}
        className={`flex items-center gap-2 px-5 py-2.5 rounded-[18px] transition-all text-[10px] font-black uppercase tracking-widest whitespace-nowrap shadow-sm border ${
            active 
                ? 'bg-md-primary border-md-primary text-white shadow-lg scale-105' 
                : 'glass border-black/5 text-md-on-surface-variant hover:bg-white/80 dark:hover:bg-zinc-800/80 opacity-70'
        }`}
    >
        {Icon && <Icon size={14} className={active ? 'text-white' : 'opacity-60'} />}
        {label}
        {active && <Check size={14} className="ml-1" />}
    </button>
);

export default HistoryView;
