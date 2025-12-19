
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
  templates: string[];
  setTemplates: (t: string[]) => void;
  toBuyList: string[];
  setToBuyList: (l: string[]) => void;
  onAddTransaction: (t: Omit<Transaction, 'id'>) => void;
  onUpdateTransaction: (t: Transaction) => void;
  onDeleteTransaction: (id: string) => void;
}

const BazarView: React.FC<BazarViewProps> = ({ 
  transactions, 
  accounts, 
  templates, 
  setTemplates, 
  toBuyList, 
  setToBuyList, 
  onAddTransaction, 
  onUpdateTransaction, 
  onDeleteTransaction 
}) => {
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

    // Foldable State
    const [isPickListExpanded, setIsPickListExpanded] = useState(true);
    const [isToBuyExpanded, setIsToBuyExpanded] = useState(true);

    const [processingIndex, setProcessingIndex] = useState<number | null>(null);
    const [newTemplate, setNewTemplate] = useState('');
    const [isManagingTemplates, setIsManagingTemplates] = useState(false);

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
      if(!item.trim() || !amount || parseFloat(amount) <= 0) return;
      
      const finalDate = dateTime ? new Date(dateTime).toISOString() : new Date().toISOString();
      const finalAmount = parseFloat(amount);

      onAddTransaction({
        description: item.trim(),
        amount: finalAmount,
        type: 'expense',
        category: Category.BAZAR,
        date: finalDate,
        accountId: paidFrom
      });

      if (processingIndex !== null) {
          const newList = [...toBuyList];
          newList.splice(processingIndex, 1);
          setToBuyList(newList);
          setProcessingIndex(null);
      }
      
      setItem('');
      setAmount('');
      if (itemInputRef.current) itemInputRef.current.focus();
    };

    const handlePickListClick = (name: string) => {
        if (!toBuyList.includes(name)) {
            setToBuyList([...toBuyList, name]);
            setIsToBuyExpanded(true);
        }
    };

    const handleToBuyItemClick = (name: string, index: number) => {
        setItem(name);
        setProcessingIndex(index);
        setTimeout(() => { if (priceInputRef.current) priceInputRef.current.focus(); }, 150);
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
        onUpdateTransaction({
            ...editingTx,
            description: editDesc,
            amount: editAmount === '' ? 0 : parseFloat(editAmount),
            date: new Date(editDate).toISOString(),
            accountId: editAccount,
        });
        setEditingTx(null);
    };

    const groupedStructure = useMemo(() => {
      const days: Record<string, { 
        dailyTotal: number, 
        sessions: Record<string, { items: Transaction[], sessionTotal: number }> 
      }> = {};
      bazarTransactions.forEach(t => {
        const dayKey = t.date.split('T')[0];
        const timeKey = t.date; // Unique timestamp
        if (!days[dayKey]) days[dayKey] = { dailyTotal: 0, sessions: {} };
        if (!days[dayKey].sessions[timeKey]) days[dayKey].sessions[timeKey] = { items: [], sessionTotal: 0 };
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
         <div className="px-6 space-y-6">
            <div className="flex items-center justify-between pt-4 pb-2">
                <h2 className="text-3xl font-black tracking-tight text-md-on-surface">Bazar List</h2>
                <div className="flex bg-md-surface-container dark:bg-zinc-900 rounded-full p-1 shadow-inner border border-black/5">
                   <button onClick={() => changeMonth(-1)} className="p-2 hover:bg-white rounded-full transition-all active:scale-90"><ChevronLeft size={20}/></button>
                   <button onClick={() => changeMonth(1)} className="p-2 hover:bg-white rounded-full transition-all active:scale-90"><ChevronRight size={20}/></button>
                </div>
            </div>
            
            <div className="bg-md-primary-container p-6 rounded-md-card shadow-sm border border-md-primary/10 relative overflow-hidden">
                <div className="absolute top-[-10%] right-[-5%] opacity-5 rotate-12"><ShoppingBag size={120} /></div>
                <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-md-on-primary-container opacity-60 mb-1">Total in {dateLabel}</p>
                    <h3 className="text-4xl font-black text-md-on-primary-container tracking-tighter">Tk {totalBazarSpend.toLocaleString()}</h3>
                </div>
            </div>
         </div>

         {editingTx && (
            <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-black/40 backdrop-blur-sm">
                <div className="bg-white dark:bg-zinc-900 rounded-[28px] shadow-2xl w-full max-w-sm p-6 space-y-5">
                    <h3 className="text-xl font-bold">Edit Item</h3>
                    <input type="text" value={editDesc} onChange={e => setEditDesc(e.target.value)} className="w-full px-4 py-3 bg-md-surface-container rounded-xl font-bold" />
                    <input type="number" value={editAmount} onChange={e => setEditAmount(e.target.value)} className="w-full px-4 py-3 bg-md-surface-container rounded-xl font-bold" />
                    <div className="flex justify-between items-center pt-4 border-t">
                        <button onClick={() => { onDeleteTransaction(editingTx.id); setEditingTx(null); }} className="text-rose-500"><Trash2 size={20} /></button>
                        <div className="flex gap-2">
                            <button onClick={() => setEditingTx(null)} className="px-5 font-black text-sm">Cancel</button>
                            <button onClick={saveEdit} className="px-6 py-2.5 bg-md-primary text-white rounded-full font-black text-sm shadow-lg">Save</button>
                        </div>
                    </div>
                </div>
            </div>
         )}

         <div className="px-4 mt-6 space-y-4">
            {isCurrentCalendarMonth && (
                <>
                    <div className="bg-white dark:bg-zinc-900 rounded-[28px] border border-gray-100 dark:border-zinc-800 shadow-sm overflow-hidden">
                        <div className="flex items-center justify-between px-4 py-4 cursor-pointer" onClick={() => setIsPickListExpanded(!isPickListExpanded)}>
                            <div className="flex items-center gap-2">
                                <ListPlus size={18} className="text-md-primary" />
                                <h4 className="font-black text-[11px] uppercase tracking-widest text-md-on-surface-variant">My Pick List</h4>
                            </div>
                            <div className="flex items-center gap-2">
                                <button onClick={(e) => { e.stopPropagation(); setIsManagingTemplates(!isManagingTemplates); }} className={`p-1.5 rounded-lg ${isManagingTemplates ? 'bg-md-primary text-white' : 'text-gray-400'}`}><Settings2 size={16} /></button>
                                {isPickListExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                            </div>
                        </div>
                        {isPickListExpanded && (
                            <div className="px-4 pb-4 animate-in slide-in-from-top-2">
                                {isManagingTemplates && (
                                    <div className="p-4 bg-md-surface-container rounded-3xl border border-dashed border-md-primary/20 space-y-3 mb-4">
                                        <div className="flex gap-2">
                                            <input type="text" value={newTemplate} onChange={e => setNewTemplate(e.target.value)} placeholder="Add item..." className="flex-1 px-4 py-2 bg-white rounded-xl text-xs font-bold" />
                                            <button onClick={addTemplate} className="p-2 bg-md-primary text-white rounded-xl"><Plus size={20} /></button>
                                        </div>
                                        <div className="flex flex-wrap gap-2">
                                            {templates.map(t => (
                                                <div key={t} className="flex items-center gap-1.5 px-3 py-1.5 bg-white rounded-full text-[10px] font-black uppercase border">
                                                    {t}<button onClick={() => removeTemplate(t)} className="text-rose-500"><X size={12}/></button>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                                <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto no-scrollbar">
                                    {templates.map(itemName => (
                                        <button key={itemName} type="button" onClick={() => handlePickListClick(itemName)} className={`px-4 py-2 border rounded-2xl text-[11px] font-black ${toBuyList.includes(itemName) ? 'bg-md-primary/10 text-md-primary border-md-primary/30' : 'bg-white dark:bg-zinc-900 text-md-on-surface'}`}>
                                            {itemName}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="bg-white dark:bg-zinc-900 rounded-[28px] border border-gray-100 dark:border-zinc-800 shadow-sm overflow-hidden">
                        <div className="flex items-center justify-between px-4 py-4 cursor-pointer" onClick={() => setIsToBuyExpanded(!isToBuyExpanded)}>
                            <div className="flex items-center gap-2">
                                <ListOrdered size={18} className="text-md-primary" />
                                <h4 className="font-black text-[11px] uppercase tracking-widest text-md-on-surface-variant">To Buy List</h4>
                                {toBuyList.length > 0 && <span className="bg-md-primary text-white text-[9px] px-2 py-0.5 rounded-full ml-1">{toBuyList.length}</span>}
                            </div>
                            {isToBuyExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                        </div>
                        {isToBuyExpanded && (
                            <div className="px-4 pb-4 animate-in slide-in-from-top-2">
                                {toBuyList.length === 0 ? <div className="p-8 border-2 border-dashed rounded-[24px] text-center opacity-40"><p className="text-[10px] font-black uppercase tracking-widest italic">Empty List</p></div> : 
                                    <div className="divide-y">
                                        {toBuyList.map((itemName, idx) => (
                                            <div key={`${itemName}-${idx}`} className={`flex items-center justify-between py-3 px-2 group rounded-xl ${processingIndex === idx ? 'bg-md-primary/10' : ''}`} onClick={() => handleToBuyItemClick(itemName, idx)}>
                                                <div className="flex items-center gap-4">
                                                    <div className="w-6 h-6 rounded-lg bg-md-surface-container flex items-center justify-center text-[10px] font-black text-md-primary">{idx + 1}</div>
                                                    <p className="font-black text-sm">{itemName}</p>
                                                </div>
                                                <button onClick={e => { e.stopPropagation(); removeFromToBuy(idx); }} className="p-2 text-gray-300 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-all"><X size={16} /></button>
                                            </div>
                                        ))}
                                    </div>
                                }
                            </div>
                        )}
                    </div>

                    <form onSubmit={handleQuickAdd} className="bg-md-surface-container-high dark:bg-zinc-900 p-5 rounded-md-card border border-md-outline/10 shadow-sm space-y-4">
                        <div className="flex gap-3">
                            <input ref={itemInputRef} type="text" value={item} onChange={e => { setItem(e.target.value); if (processingIndex !== null) setProcessingIndex(null); }} placeholder="Item name..." className="flex-1 px-4 py-3 bg-white dark:bg-zinc-800 rounded-2xl font-black text-sm" required />
                            <input ref={priceInputRef} type="number" value={amount} onChange={e => setAmount(e.target.value)} enterKeyHint="done" placeholder="Price" className="w-24 px-4 py-3 bg-white dark:bg-zinc-800 rounded-2xl font-black text-sm text-rose-600" required />
                        </div>
                        <div className="flex gap-3">
                                <select value={paidFrom} onChange={e => setPaidFrom(e.target.value as AccountType)} className="flex-1 px-4 py-3 bg-white dark:bg-zinc-800 rounded-2xl font-black text-[11px] appearance-none uppercase"><option value="cash">Cash</option>{accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}</select>
                                <input type="datetime-local" value={dateTime} onChange={e => setDateTime(e.target.value)} className="flex-1 bg-white dark:bg-zinc-800 px-4 py-3 rounded-2xl font-black text-[11px]" />
                        </div>
                        <button type="submit" className="w-full bg-md-primary text-white py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-md flex items-center justify-center gap-3">
                            <Plus size={18} strokeWidth={3} /> {processingIndex !== null ? 'Add & Remove' : 'Add'}
                        </button>
                    </form>
                </>
            )}

            <div className="space-y-12 pb-10 mt-6">
                <div className="flex items-center gap-2 px-2 border-b pb-2 dark:border-zinc-800">
                    <Receipt size={16} className="text-md-primary" />
                    <h4 className="font-black text-[10px] uppercase tracking-widest text-md-on-surface-variant">Bazar History</h4>
                </div>
                {sortedDays.map(dayKey => {
                    const dayData = groupedStructure[dayKey];
                    // Sort sessions within the day by time (newest session at top)
                    const sessionKeys = Object.keys(dayData.sessions).sort((a, b) => new Date(b).getTime() - new Date(a).getTime());
                    
                    return (
                        <div key={dayKey} className="space-y-6">
                            <div className="flex justify-between items-center px-4 sticky top-[72px] z-10 bg-md-surface/80 dark:bg-zinc-950/80 backdrop-blur-md py-3 rounded-2xl shadow-sm border border-black/5">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-2xl bg-md-primary flex items-center justify-center text-white"><CalendarDays size={20} /></div>
                                    <p className="text-sm font-black uppercase">{new Date(dayKey).toLocaleDateString('en-US', { day: 'numeric', month: 'short' })}</p>
                                </div>
                                <p className="text-xl font-black text-rose-600">Tk {dayData.dailyTotal.toLocaleString()}</p>
                            </div>
                            
                            <div className="space-y-6">
                                {sessionKeys.map(timeKey => {
                                    const session = dayData.sessions[timeKey];
                                    const sessionTime = new Date(timeKey).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                                    
                                    return (
                                        <div key={timeKey} className="bg-white dark:bg-zinc-900 rounded-[32px] overflow-hidden border border-gray-100 dark:border-zinc-800 shadow-sm">
                                            {/* Session Header (Sum & Time) */}
                                            <div className="px-4 py-3 bg-md-surface-container dark:bg-zinc-800/50 flex justify-between items-center border-b border-gray-100 dark:border-zinc-800">
                                                <div className="flex items-center gap-2 opacity-60">
                                                    <Clock size={12} className="text-md-primary" />
                                                    <span className="text-[10px] font-black uppercase tracking-widest">{sessionTime}</span>
                                                </div>
                                                <div className="flex items-center gap-1.5">
                                                    <span className="text-[9px] font-black uppercase tracking-[0.15em] opacity-40">Session:</span>
                                                    <span className="text-xs font-black text-md-primary">Tk {session.sessionTotal.toLocaleString()}</span>
                                                </div>
                                            </div>

                                            {/* Session Items */}
                                            <div className="divide-y divide-gray-50 dark:divide-zinc-800/50">
                                                {session.items.map(t => (
                                                    <div key={t.id} onClick={() => startEditing(t)} className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-zinc-800/30 transition-colors">
                                                        <div className="flex flex-col">
                                                            <p className="font-black text-sm">{t.description}</p>
                                                            {/* Show account if it's not the default cash */}
                                                            {t.accountId !== defaultCash && accounts.find(a => a.id === t.accountId) && (
                                                                <span className="text-[8px] font-black uppercase tracking-widest opacity-40 mt-0.5" style={{ color: accounts.find(a => a.id === t.accountId)?.color }}>
                                                                    {accounts.find(a => a.id === t.accountId)?.name}
                                                                </span>
                                                            )}
                                                        </div>
                                                        <p className="font-black text-sm text-rose-600">Tk {t.amount.toLocaleString()}</p>
                                                    </div>
                                                ))}
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
      </div>
    );
};

export default BazarView;
