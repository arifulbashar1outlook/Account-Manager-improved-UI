
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { 
  ShoppingBag, 
  Plus, 
  CalendarDays, 
  Clock, 
  Trash2, 
  X, 
  Check, 
  ChevronLeft, 
  ChevronRight, 
  Store, 
  ShoppingCart, 
  Receipt, 
  Hash, 
  ChevronDown,
  ChevronUp,
  Sparkles,
  Edit3,
  ListPlus,
  Settings2,
  ListOrdered,
  ArrowRight
} from 'lucide-react';
import { Transaction, Category, AccountType, Account } from '../types';

interface BazarViewProps {
  transactions: Transaction[];
  accounts: Account[];
  onAddTransaction: (t: Omit<Transaction, 'id'>) => void;
  onUpdateTransaction: (t: Transaction) => void;
  onDeleteTransaction: (id: string) => void;
}

const STORAGE_KEY_TEMPLATES = 'bazar_item_templates_v1';
const STORAGE_KEY_TOBUY = 'bazar_tobuy_list_v1';

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

    // UI States for folding sections
    const [isPickListExpanded, setIsPickListExpanded] = useState(true);
    const [isToBuyExpanded, setIsToBuyExpanded] = useState(true);

    // Custom Templates Logic
    const [templates, setTemplates] = useState<string[]>(() => {
        const saved = localStorage.getItem(STORAGE_KEY_TEMPLATES);
        return saved ? JSON.parse(saved) : ['Potato', 'Onion', 'Rice', 'Oil', 'Egg', 'Milk'];
    });

    // To Buy List Logic
    const [toBuyList, setToBuyList] = useState<string[]>(() => {
        const saved = localStorage.getItem(STORAGE_KEY_TOBUY);
        return saved ? JSON.parse(saved) : [];
    });
    
    // Tracks if the current form entry originated from the To-Buy list
    const [processingIndex, setProcessingIndex] = useState<number | null>(null);

    const [newTemplate, setNewTemplate] = useState('');
    const [isManagingTemplates, setIsManagingTemplates] = useState(false);

    useEffect(() => {
        localStorage.setItem(STORAGE_KEY_TEMPLATES, JSON.stringify(templates));
    }, [templates]);

    useEffect(() => {
        localStorage.setItem(STORAGE_KEY_TOBUY, JSON.stringify(toBuyList));
    }, [toBuyList]);

    const [editingTx, setEditingTx] = useState<Transaction | null>(null);
    const [editDesc, setEditDesc] = useState('');
    const [editAmount, setEditAmount] = useState('');
    const [editDate, setEditDate] = useState('');
    const [editAccount, setEditAccount] = useState<AccountType>(defaultCash);

    const itemInputRef = useRef<HTMLInputElement>(null);
    const priceInputRef = useRef<HTMLInputElement>(null);

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

    const handleQuickAdd = (e?: React.FormEvent) => {
      if (e) e.preventDefault();
      
      // Mandatory field check
      if(!item || !amount || parseFloat(amount) <= 0) {
        return;
      }
      
      const finalDate = dateTime ? new Date(dateTime).toISOString() : new Date().toISOString();
      const finalAmount = parseFloat(amount);

      onAddTransaction({
        description: item,
        amount: finalAmount,
        type: 'expense',
        category: Category.BAZAR,
        date: finalDate,
        accountId: paidFrom
      });

      // If this was added from the "To Buy" list, remove it now
      if (processingIndex !== null) {
          const newList = [...toBuyList];
          newList.splice(processingIndex, 1);
          setToBuyList(newList);
          setProcessingIndex(null);
      }
      
      setItem('');
      setAmount('');
      
      // Return focus to item input for next entry
      if (itemInputRef.current) {
          itemInputRef.current.focus();
      }
    };

    const handlePickListClick = (name: string) => {
        if (!toBuyList.includes(name)) {
            setToBuyList([...toBuyList, name]);
            setIsToBuyExpanded(true); // Auto-expand when adding to shopping list
        }
    };

    const handleToBuyItemClick = (name: string, index: number) => {
        setItem(name);
        setProcessingIndex(index);
        // Delay focus slightly to ensure the keyboard pops up correctly on mobile
        setTimeout(() => {
          if (priceInputRef.current) {
            priceInputRef.current.focus();
          }
        }, 100);
    };

    const removeFromToBuy = (index: number) => {
        const newList = [...toBuyList];
        newList.splice(index, 1);
        setToBuyList(newList);
        if (processingIndex === index) setProcessingIndex(null);
    };

    const addTemplate = () => {
        if (newTemplate && !templates.includes(newTemplate)) {
            setTemplates([...templates, newTemplate.trim()]);
            setNewTemplate('');
        }
    };

    const removeTemplate = (name: string) => {
        setTemplates(templates.filter(t => t !== name));
    };

    const refreshTime = () => setDateTime(getLocalDateTime());

    const startEditing = (t: Transaction) => {
        setEditingTx(t);
        setEditDesc(t.description);
        setEditAmount(t.amount === 0 ? '' : t.amount.toString());
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
        if (!editingTx || !editDesc) return;
        const updatedTx: Transaction = {
            ...editingTx,
            description: editDesc,
            amount: editAmount === '' ? 0 : parseFloat(editAmount),
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
    const dateLabel = `${viewDate.toLocaleDateString('en-US', { month: 'short' })} ${viewDate.getFullYear().toString().slice(-2)}`;

    return (
      <div className="max-w-md mx-auto min-h-screen bg-md-surface dark:bg-zinc-950 pb-32 animate-in fade-in duration-300">
         {/* Top Section */}
         <div className="px-6 space-y-6">
            <div className="flex items-center justify-between pt-4 pb-2">
                <h2 className="text-3xl font-black tracking-tight text-md-on-surface">Bazar List</h2>
                <div className="flex bg-md-surface-container dark:bg-zinc-900 rounded-full p-1 shadow-inner border border-black/5">
                   <button type="button" onClick={() => changeMonth(-1)} className="p-2 hover:bg-white dark:hover:bg-zinc-800 rounded-full transition-all active:scale-90"><ChevronLeft size={20}/></button>
                   <button type="button" onClick={() => changeMonth(1)} className="p-2 hover:bg-white dark:hover:bg-zinc-800 rounded-full transition-all active:scale-90"><ChevronRight size={20}/></button>
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
                    <div className="bg-white/40 p-3 rounded-2xl text-md-on-primary-container shadow-sm backdrop-blur-sm">
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
                                    placeholder="Enter price"
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

         {/* Picker & Shopping List Area */}
         <div className="px-4 mt-6 space-y-4">
            {isCurrentCalendarMonth && (
                <>
                    {/* 1. My Templates / Pick List */}
                    <div className="bg-white dark:bg-zinc-900 rounded-[28px] border border-gray-100 dark:border-zinc-800 shadow-sm overflow-hidden">
                        <div 
                          className="flex items-center justify-between px-4 py-4 cursor-pointer hover:bg-md-surface-container transition-colors"
                          onClick={() => setIsPickListExpanded(!isPickListExpanded)}
                        >
                            <div className="flex items-center gap-2">
                                <ListPlus size={16} className="text-md-primary" />
                                <h4 className="font-black text-[11px] uppercase tracking-widest text-md-on-surface-variant">My Pick List</h4>
                            </div>
                            <div className="flex items-center gap-3">
                                <button 
                                    onClick={(e) => { e.stopPropagation(); setIsManagingTemplates(!isManagingTemplates); }}
                                    className={`p-1.5 rounded-lg transition-colors ${isManagingTemplates ? 'bg-md-primary text-white' : 'text-gray-400 hover:bg-md-surface-container'}`}
                                >
                                    <Settings2 size={16} />
                                </button>
                                {isPickListExpanded ? <ChevronUp size={18} className="text-gray-400" /> : <ChevronDown size={18} className="text-gray-400" />}
                            </div>
                        </div>

                        {isPickListExpanded && (
                            <div className="p-4 pt-0 space-y-4 animate-in slide-in-from-top-2">
                                {isManagingTemplates && (
                                    <div className="p-4 bg-md-surface-container rounded-3xl border border-dashed border-md-primary/20 space-y-3">
                                        <div className="flex gap-2">
                                            <input 
                                                type="text"
                                                value={newTemplate}
                                                onChange={(e) => setNewTemplate(e.target.value)}
                                                placeholder="Add recurring item..."
                                                className="flex-1 px-4 py-2 bg-white rounded-xl text-xs font-bold outline-none border-none shadow-inner"
                                            />
                                            <button 
                                                onClick={addTemplate}
                                                className="p-2 bg-md-primary text-white rounded-xl shadow-md active:scale-95"
                                            >
                                                <Plus size={20} />
                                            </button>
                                        </div>
                                        <div className="flex flex-wrap gap-2">
                                            {templates.map(t => (
                                                <div key={t} className="flex items-center gap-1.5 px-3 py-1.5 bg-white rounded-full text-[10px] font-black uppercase text-md-on-surface shadow-sm border border-gray-100">
                                                    {t}
                                                    <button onClick={() => removeTemplate(t)} className="text-rose-500 hover:bg-rose-50 p-0.5 rounded-full"><X size={12}/></button>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto no-scrollbar">
                                    {templates.map(itemName => (
                                        <button 
                                            key={itemName}
                                            type="button"
                                            onClick={() => handlePickListClick(itemName)}
                                            className={`px-4 py-2 border transition-all active:scale-95 shadow-sm rounded-2xl text-[11px] font-black ${
                                            toBuyList.includes(itemName) 
                                            ? 'bg-md-primary/10 text-md-primary border-md-primary/30' 
                                            : 'bg-white dark:bg-zinc-900 border-gray-100 dark:border-zinc-800 text-md-on-surface'
                                            }`}
                                        >
                                            {itemName}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* 2. To Buy List (Numbered List) */}
                    <div className="bg-white dark:bg-zinc-900 rounded-[28px] border border-gray-100 dark:border-zinc-800 shadow-sm overflow-hidden">
                        <div 
                          className="flex items-center justify-between px-4 py-4 cursor-pointer hover:bg-md-surface-container transition-colors"
                          onClick={() => setIsToBuyExpanded(!isToBuyExpanded)}
                        >
                            <div className="flex items-center gap-2">
                                <ListOrdered size={16} className="text-md-primary" />
                                <h4 className="font-black text-[11px] uppercase tracking-widest text-md-on-surface-variant">To Buy List</h4>
                                {toBuyList.length > 0 && (
                                    <span className="bg-md-primary text-white text-[9px] px-2 py-0.5 rounded-full font-black ml-1">{toBuyList.length}</span>
                                )}
                            </div>
                            {isToBuyExpanded ? <ChevronUp size={18} className="text-gray-400" /> : <ChevronDown size={18} className="text-gray-400" />}
                        </div>

                        {isToBuyExpanded && (
                            <div className="p-4 pt-0 space-y-2 animate-in slide-in-from-top-2">
                                {toBuyList.length === 0 ? (
                                    <div className="p-6 border-2 border-dashed border-gray-100 dark:border-zinc-800 rounded-[24px] text-center opacity-40">
                                        <p className="text-[10px] font-black uppercase tracking-widest italic">Pick items above to build list</p>
                                    </div>
                                ) : (
                                    <div className="divide-y divide-gray-50 dark:divide-zinc-800">
                                        {toBuyList.map((itemName, idx) => (
                                            <div 
                                                key={`${itemName}-${idx}`}
                                                className={`flex items-center justify-between py-3 px-2 group hover:bg-md-primary/5 transition-colors cursor-pointer rounded-xl ${processingIndex === idx ? 'bg-md-primary/10' : ''}`}
                                                onClick={() => handleToBuyItemClick(itemName, idx)}
                                            >
                                                <div className="flex items-center gap-4">
                                                    <div className="w-6 h-6 rounded-lg bg-md-surface-container dark:bg-zinc-800 flex items-center justify-center text-[10px] font-black text-md-primary">
                                                        {idx + 1}
                                                    </div>
                                                    <p className={`font-black text-sm dark:text-white ${processingIndex === idx ? 'text-md-primary' : 'text-md-on-surface'}`}>
                                                        {itemName}
                                                    </p>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    {processingIndex === idx && <ArrowRight size={16} className="text-md-primary animate-pulse" />}
                                                    <button 
                                                        onClick={(e) => { e.stopPropagation(); removeFromToBuy(idx); }}
                                                        className="p-2 text-gray-300 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-all"
                                                    >
                                                        <X size={16} />
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* 3. Entry Form */}
                    <form onSubmit={handleQuickAdd} className="bg-md-surface-container-high dark:bg-zinc-900 p-5 rounded-md-card border border-md-outline/10 shadow-sm space-y-4 animate-in slide-in-from-top-2">
                        <div className="flex items-center justify-between mb-1">
                            <div className="flex items-center gap-3">
                                <ShoppingCart size={18} className="text-md-primary" />
                                <h4 className="font-black text-xs uppercase tracking-widest text-md-on-surface-variant uppercase">Entry Form</h4>
                            </div>
                            <button type="button" onClick={refreshTime} className="p-2 bg-white dark:bg-zinc-800 rounded-lg shadow-sm text-md-primary active:rotate-180 transition-transform">
                                <Clock size={16} />
                            </button>
                        </div>
                        <div className="flex gap-3">
                            <input 
                                ref={itemInputRef}
                                type="text" 
                                value={item}
                                onChange={(e) => {
                                    setItem(e.target.value);
                                    if (processingIndex !== null) setProcessingIndex(null); // Unlink if edited
                                }}
                                placeholder="Item name..."
                                className="flex-1 px-4 py-3 bg-white dark:bg-zinc-800 rounded-2xl outline-none text-sm font-black shadow-inner dark:text-white"
                                required
                            />
                            <input 
                                ref={priceInputRef}
                                type="number" 
                                value={amount}
                                onChange={(e) => setAmount(e.target.value)}
                                onKeyDown={(e) => {
                                  // Android "Next/Arrow" key often translates to Enter (13) or Tab (9) depending on context
                                  // Using KeyDown to catch it early.
                                  if (e.key === 'Enter') {
                                    handleQuickAdd();
                                  }
                                }}
                                placeholder="Price"
                                className="w-24 px-4 py-3 bg-white dark:bg-zinc-800 rounded-2xl outline-none text-sm font-black text-rose-600 shadow-inner dark:text-rose-400"
                                required
                            />
                        </div>
                        <div className="flex items-center gap-3">
                                <div className="flex-1 relative">
                                    <select
                                        value={paidFrom}
                                        onChange={e => setPaidFrom(e.target.value as AccountType)}
                                        className="w-full pl-4 pr-10 py-3 bg-white dark:bg-zinc-800 rounded-2xl outline-none text-[11px] font-black appearance-none shadow-inner truncate uppercase tracking-tight dark:text-white"
                                    >
                                        {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                                    </select>
                                    <ChevronDown size={14} className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none opacity-40 dark:text-white" />
                                </div>
                                <div className="flex-1 bg-white dark:bg-zinc-800 px-4 py-3 rounded-2xl shadow-inner relative overflow-hidden">
                                    <input 
                                    type="datetime-local" 
                                    value={dateTime}
                                    onChange={(e) => setDateTime(e.target.value)}
                                    className="w-full bg-transparent text-[11px] font-black outline-none dark:text-white"
                                    />
                                </div>
                        </div>
                        <button 
                            type="submit" 
                            disabled={!item || !amount || parseFloat(amount) <= 0}
                            className="w-full bg-md-primary text-white py-4 rounded-2xl font-black text-xs uppercase tracking-widest active:scale-[0.98] transition-all shadow-md flex items-center justify-center gap-3 disabled:opacity-50"
                        >
                            <Plus size={18} strokeWidth={3} />
                            {processingIndex !== null ? 'Add & Remove from List' : 'Add'}
                        </button>
                    </form>
                </>
            )}

            {/* Transaction List (History) */}
            <div className="space-y-12 pb-10 mt-4">
                <div className="flex items-center gap-2 px-2 border-b pb-2 dark:border-zinc-800">
                    <Receipt size={14} className="text-md-primary" />
                    <h4 className="font-black text-[10px] uppercase tracking-widest text-md-on-surface-variant">Purchase History</h4>
                </div>

                {bazarTransactions.length === 0 ? (
                    <div className="py-10 text-center opacity-30 flex flex-col items-center gap-4">
                        <Store size={64} strokeWidth={1} />
                        <p className="font-black text-xs uppercase tracking-[0.2em]">List is Empty</p>
                    </div>
                ) : (
                    sortedDays.map(dayKey => {
                        const dayData = groupedStructure[dayKey];
                        const dateObj = new Date(dayKey);
                        const sessionKeys = Object.keys(dayData.sessions).sort((a, b) => new Date(b).getTime() - new Date(a).getTime());

                        return (
                            <div key={dayKey} className="space-y-6">
                                <div className="flex justify-between items-center px-4 sticky top-[72px] z-10 bg-md-surface/80 dark:bg-zinc-950/80 backdrop-blur-md py-3 rounded-2xl shadow-sm border border-black/5">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-2xl bg-md-primary flex items-center justify-center text-white shadow-md">
                                            <CalendarDays size={20} />
                                        </div>
                                        <div>
                                            <p className="text-sm font-black text-md-on-surface tracking-tight dark:text-white">
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
                                                <div className="bg-md-surface-container dark:bg-zinc-800 px-4 py-3 flex justify-between items-center border-b border-black/5">
                                                    <div className="flex items-center gap-2">
                                                        <Clock size={12} className="text-md-primary" />
                                                        <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest dark:text-gray-400">
                                                            Batch @ {new Date(timeKey).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                        </p>
                                                    </div>
                                                    <p className="font-black text-rose-700 dark:text-rose-400 text-sm tracking-tight">Tk {session.sessionTotal.toLocaleString()}</p>
                                                </div>
                                                
                                                <div className="divide-y divide-gray-50 dark:divide-zinc-800">
                                                    {session.items.map((t) => {
                                                        const acc = accounts.find(a => a.id === t.accountId);
                                                        const isPending = t.amount === 0;
                                                        return (
                                                            <div 
                                                                key={t.id} 
                                                                onClick={() => startEditing(t)}
                                                                className={`flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-zinc-800 transition-all cursor-pointer group active:bg-md-primary/5 ${isPending ? 'bg-amber-50/30 dark:bg-amber-900/10' : ''}`}
                                                            >
                                                                <div className="flex items-center gap-4">
                                                                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center shadow-inner ${isPending ? 'bg-amber-100 text-amber-600' : 'bg-md-surface-container text-md-primary dark:bg-zinc-800'}`}>
                                                                        {isPending ? <Edit3 size={16} /> : <Receipt size={16} />}
                                                                    </div>
                                                                    <div>
                                                                        <p className={`font-black text-sm leading-tight transition-colors ${isPending ? 'text-amber-800 dark:text-amber-300' : 'text-md-on-surface dark:text-white group-hover:text-md-primary'}`}>{t.description}</p>
                                                                        <p className="text-[9px] font-black uppercase tracking-widest mt-0.5 opacity-60" style={{ color: acc?.color || '#999' }}>{acc?.name || 'Wallet'}</p>
                                                                    </div>
                                                                </div>
                                                                <div className="text-right">
                                                                    <p className={`font-black text-sm ${isPending ? 'text-amber-600' : 'text-rose-600 dark:text-rose-400'}`}>
                                                                        {isPending ? 'Pending Price' : `Tk ${t.amount.toLocaleString()}`}
                                                                    </p>
                                                                </div>
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
