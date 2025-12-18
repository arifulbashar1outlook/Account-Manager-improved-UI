
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
  Clock
} from 'lucide-react';
import { Transaction, AccountType, Category, TransactionType, Account } from '../types';

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
            // Convert to local ISO format for datetime-local input
            const localIso = new Date(d.getTime() - (d.getTimezoneOffset() * 60000)).toISOString().slice(0, 16);
            setEditDate(localIso);
        } catch (e) {
            setEditDate(new Date().toISOString().slice(0, 16));
        }
        setEditAccount(t.accountId);
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
            category: editCategory,
            type: editType
        };

        onUpdateTransaction(updatedTx);
        setEditingTx(null);
    };

    const handleDelete = () => {
        if (editingTx) {
            if (window.confirm("Are you sure you want to delete this transaction?")) {
                onDeleteTransaction(editingTx.id);
                setEditingTx(null);
            }
        }
    };

    const getAccountInfo = (id: string) => {
        return accounts.find(a => a.id === id);
    };

    return (
       <div className="max-w-md mx-auto min-h-screen bg-md-surface pb-32">
         {editingTx && (
            <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
                <div className="bg-white dark:bg-zinc-900 rounded-[28px] shadow-2xl w-full max-w-sm overflow-hidden p-6 space-y-5">
                    <h3 className="text-xl font-bold text-md-on-surface">Edit Transaction</h3>
                    <div className="space-y-4">
                        <div className="relative">
                            <label className="text-[10px] font-black uppercase text-md-primary ml-1 mb-1 block">Description</label>
                            <input 
                                type="text" 
                                value={editDesc}
                                onChange={(e) => setEditDesc(e.target.value)}
                                className="w-full px-4 py-3 bg-md-surface-container rounded-xl outline-none border border-transparent focus:border-md-primary font-bold dark:bg-zinc-800 dark:text-white"
                            />
                        </div>
                        
                        <div className="relative">
                            <label className="text-[10px] font-black uppercase text-md-primary ml-1 mb-1 block">Date & Time</label>
                            <div className="relative flex items-center bg-md-surface-container rounded-xl overflow-hidden px-4 py-3 group dark:bg-zinc-800 border border-transparent focus-within:border-md-primary transition-all cursor-pointer" onClick={(e) => {
                              const input = e.currentTarget.querySelector('input');
                              if (input) (input as any).showPicker?.();
                            }}>
                                <Clock size={16} className="text-md-primary mr-3" />
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
                                <label className="text-[10px] font-black uppercase text-md-primary ml-1 mb-1 block">Amount</label>
                                <input 
                                    type="number" 
                                    value={editAmount}
                                    onChange={(e) => setEditAmount(e.target.value)}
                                    className="w-full px-4 py-3 bg-md-surface-container rounded-xl outline-none border border-transparent focus:border-md-primary font-bold dark:bg-zinc-800 dark:text-white"
                                />
                            </div>
                            <div className="relative">
                                <label className="text-[10px] font-black uppercase text-md-primary ml-1 mb-1 block">Type</label>
                                <select
                                    value={editType}
                                    onChange={(e) => setEditType(e.target.value as TransactionType)}
                                    className="w-full px-4 py-3 bg-md-surface-container rounded-xl outline-none font-bold appearance-none dark:bg-zinc-800 dark:text-white"
                                >
                                    <option value="expense">Expense</option>
                                    <option value="income">Income</option>
                                    <option value="transfer">Transfer</option>
                                </select>
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="relative">
                                <label className="text-[10px] font-black uppercase text-md-primary ml-1 mb-1 block">Wallet</label>
                                <select
                                    value={editAccount}
                                    onChange={(e) => setEditAccount(e.target.value as AccountType)}
                                    className="w-full px-4 py-3 bg-md-surface-container rounded-xl outline-none font-bold appearance-none dark:bg-zinc-800 dark:text-white"
                                >
                                    {accounts.map(a => (
                                        <option key={a.id} value={a.id}>{a.name}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="relative">
                                <label className="text-[10px] font-black uppercase text-md-primary ml-1 mb-1 block">Category</label>
                                <select
                                    value={editCategory}
                                    onChange={(e) => setEditCategory(e.target.value)}
                                    className="w-full px-4 py-3 bg-md-surface-container rounded-xl outline-none font-bold appearance-none dark:bg-zinc-800 dark:text-white"
                                >
                                    {Object.values(Category).map((cat) => (
                                        <option key={cat} value={cat}>{cat}</option>
                                    ))}
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
                            <button type="button" onClick={saveEdit} className="px-6 py-2.5 bg-md-primary text-white text-sm font-black rounded-full shadow-lg">Save</button>
                        </div>
                    </div>
                </div>
            </div>
         )}

         <div className="px-6 pt-10 pb-6 space-y-6">
            <h2 className="text-3xl font-black tracking-tight text-md-on-surface">History</h2>
            
            <div className="relative group">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-md-on-surface-variant">
                    <Search size={20} />
                </div>
                <input 
                    type="text"
                    placeholder="Search transactions..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full bg-md-surface-container px-12 py-4 rounded-full text-sm font-medium outline-none border-2 border-transparent focus:border-md-primary/30 focus:bg-white transition-all shadow-sm dark:bg-zinc-800 dark:text-white"
                />
                {searchTerm && (
                    <button type="button" onClick={() => setSearchTerm('')} className="absolute right-4 top-1/2 -translate-y-1/2 p-1 text-md-on-surface-variant">
                        <X size={16} />
                    </button>
                )}
            </div>

            <div className="flex gap-2 overflow-x-auto pb-2 -mx-2 px-2 no-scrollbar">
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
                <div className="flex bg-md-surface-container p-1 rounded-full dark:bg-zinc-800">
                    <button 
                        type="button"
                        onClick={() => setFilterPeriod('all')}
                        className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider transition-all ${filterPeriod === 'all' ? 'bg-white shadow-sm text-md-primary dark:bg-zinc-700' : 'text-md-on-surface-variant'}`}
                    >
                        Any
                    </button>
                    <button 
                        type="button"
                        onClick={() => setFilterPeriod('date')}
                        className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider transition-all ${filterPeriod === 'date' ? 'bg-white shadow-sm text-md-primary dark:bg-zinc-700' : 'text-md-on-surface-variant'}`}
                    >
                        Day
                    </button>
                    <button 
                        type="button"
                        onClick={() => setFilterPeriod('month')}
                        className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider transition-all ${filterPeriod === 'month' ? 'bg-white shadow-sm text-md-primary dark:bg-zinc-700' : 'text-md-on-surface-variant'}`}
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
                            className="w-full bg-md-surface-container-high px-3 py-1.5 rounded-xl text-[11px] font-bold outline-none border border-md-outline/10 dark:bg-zinc-800 dark:text-white"
                        />
                    )}
                    {filterPeriod === 'month' && (
                        <input 
                            type="month"
                            value={selectedMonth}
                            onChange={(e) => setSelectedMonth(e.target.value)}
                            className="w-full bg-md-surface-container-high px-3 py-1.5 rounded-xl text-[11px] font-bold outline-none border border-md-outline/10 dark:bg-zinc-800 dark:text-white"
                        />
                    )}
                </div>
            </div>
         </div>

         <div className="px-4 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
             {filteredTransactions.length === 0 ? (
                <div className="py-20 text-center opacity-30 flex flex-col items-center gap-4">
                   <History size={64} strokeWidth={1} />
                   <p className="font-black text-xs uppercase tracking-[0.2em]">No records found</p>
                </div>
             ) : (
                sortedAllDates.map(date => {
                    const dayTransactions = groupedAll[date];
                    const dateObj = new Date(date);
                    
                    return (
                        <div key={date} className="space-y-3">
                            <div className="flex items-center gap-2 px-2">
                                <div className="w-1.5 h-1.5 rounded-full bg-md-primary"></div>
                                <h3 className="text-[11px] font-black uppercase tracking-widest text-md-on-surface-variant">
                                    {dateObj.toLocaleDateString('en-US', { weekday: 'short', day: 'numeric', month: 'short' })}
                                </h3>
                            </div>

                            <div className="bg-white dark:bg-zinc-900 rounded-[28px] overflow-hidden border border-gray-100 dark:border-zinc-800 shadow-sm">
                                {dayTransactions.map((t, idx) => {
                                    const acc = getAccountInfo(t.accountId);
                                    return (
                                        <div 
                                            key={t.id} 
                                            onClick={() => startEditing(t)}
                                            className={`flex items-center justify-between p-4 hover:bg-md-surface-container transition-all cursor-pointer group active:bg-md-primary/5 ${idx !== dayTransactions.length - 1 ? 'border-b border-gray-50 dark:border-zinc-800' : ''}`}
                                        >
                                            <div className="flex items-center gap-4">
                                                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-colors shadow-inner ${
                                                    t.type === 'income' ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20' :
                                                    t.type === 'transfer' ? 'bg-md-primary-container text-md-primary' :
                                                    'bg-rose-50 text-rose-600 dark:bg-rose-900/20'
                                                }`}>
                                                    {t.type === 'income' ? <TrendingUp size={22} /> : 
                                                    t.type === 'transfer' ? <ArrowRightLeft size={22} /> :
                                                    <TrendingDown size={22} />}
                                                </div>
                                                <div>
                                                    <p className="font-black text-sm text-md-on-surface leading-tight dark:text-white">{t.description}</p>
                                                    <div className="flex items-center gap-1.5 mt-0.5">
                                                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{t.category}</p>
                                                        <span className="w-1 h-1 bg-gray-200 rounded-full"></span>
                                                        <p className="text-[10px] font-black uppercase tracking-widest" style={{ color: acc?.color || '#999' }}>{acc?.name || 'Wallet'}</p>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <p className={`font-black text-sm ${
                                                    t.type === 'income' ? 'text-emerald-600' : 
                                                    t.type === 'expense' ? 'text-rose-600' : 'text-md-on-surface-variant'
                                                }`}>
                                                    {t.type === 'income' ? '+' : t.type === 'expense' ? '-' : ''} Tk {t.amount.toLocaleString()}
                                                </p>
                                                <p className="text-[9px] font-bold text-gray-400 uppercase">
                                                    {new Date(t.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                </p>
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
        className={`flex items-center gap-2 px-4 py-2 rounded-2xl border transition-all text-xs font-bold whitespace-nowrap shadow-sm ${
            active 
                ? 'bg-md-secondary-container border-md-secondary-container text-md-on-secondary-container' 
                : 'bg-white border-md-outline/10 text-md-on-surface-variant hover:bg-gray-50 dark:bg-zinc-800 dark:border-zinc-700'
        }`}
    >
        {Icon && <Icon size={14} className={active ? 'text-md-primary' : 'opacity-60'} />}
        {label}
        {active && <Check size={14} className="ml-1" />}
    </button>
);

export default HistoryView;
