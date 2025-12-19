
import React, { useState, useMemo, useRef } from 'react';
import { 
  Plus, 
  CalendarDays, 
  Clock, 
  Trash2, 
  X, 
  ChevronLeft, 
  ChevronRight, 
  Receipt, 
  ChevronDown,
  ChevronUp,
  Settings2,
  ListOrdered,
  ListPlus,
  // Added missing ShoppingBag icon
  ShoppingBag
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

    const [isPickListExpanded, setIsPickListExpanded] = useState(false);
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

    const bazarTransactions = useMemo(() => {
      return transactions.filter(t => {
        if (!t.date || t.category !== Category.BAZAR) return false;
        const d = new Date(t.date);
        return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
      });
    }, [transactions, currentMonth, currentYear]);

    const totalBazarSpend = useMemo(() => bazarTransactions.reduce((sum, t) => sum + t.amount, 0), [bazarTransactions]);

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
        setTimeout(() => { if (priceInputRef.current) priceInputRef.current.focus(); }, 100);
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
        const timeKey = t.date; 
        if (!days[dayKey]) days[dayKey] = { dailyTotal: 0, sessions: {} };
        if (!days[dayKey].sessions[timeKey]) days[dayKey].sessions[timeKey] = { items: [], sessionTotal: 0 };
        days[dayKey].dailyTotal += t.amount;
        days[dayKey].sessions[timeKey].items.push(t);
        days[dayKey].sessions[timeKey].sessionTotal += t.amount;
      });
      return days;
    }, [bazarTransactions]);

    const sortedDays = useMemo(() => Object.keys(groupedStructure).sort((a, b) => new Date(b).getTime() - new Date(a).getTime()), [groupedStructure]);
    const dateLabel = `${viewDate.toLocaleDateString('en-US', { month: 'short' })} ${viewDate.getFullYear()}`;

    return (
      <div className="max-w-md mx-auto min-h-screen bg-md-surface dark:bg-zinc-950 pb-40 animate-in fade-in duration-300">
         <div className="px-5 space-y-4">
            <div className="flex items-center justify-between pt-4">
                <h2 className="text-xl font-[800] tracking-tight text-md-on-surface">Bazar Spend</h2>
                <div className="flex bg-md-surface-container dark:bg-zinc-900 rounded-full p-0.5 border border-black/5">
                   <button onClick={() => changeMonth(-1)} className="p-1.5 hover:bg-white rounded-full transition-all active:scale-90"><ChevronLeft size={16}/></button>
                   <button onClick={() => changeMonth(1)} className="p-1.5 hover:bg-white rounded-full transition-all active:scale-90"><ChevronRight size={16}/></button>
                </div>
            </div>
            
            <div className="bg-md-primary-container p-4 rounded-[20px] shadow-sm border border-md-primary/10 relative overflow-hidden">
                <p className="text-[9px] font-black uppercase tracking-[0.2em] text-md-on-primary-container opacity-60 mb-0.5">Bazar Total ({dateLabel})</p>
                <h3 className="text-2xl font-[800] text-md-on-primary-container tracking-tighter">Tk {totalBazarSpend.toLocaleString()}</h3>
            </div>
         </div>

         <div className="px-4 mt-4 space-y-3">
            {isCurrentCalendarMonth && (
                <>
                    {/* Compact Entry Form */}
                    <form onSubmit={handleQuickAdd} className="bg-white dark:bg-zinc-900 p-2 rounded-[20px] border border-gray-100 dark:border-zinc-800 shadow-sm space-y-1.5">
                        <div className="flex gap-1.5">
                            <input ref={itemInputRef} type="text" value={item} onChange={e => { setItem(e.target.value); if (processingIndex !== null) setProcessingIndex(null); }} placeholder="Item name" className="flex-[2.5] px-3 py-2 bg-md-surface-container dark:bg-zinc-800 rounded-xl font-bold text-xs outline-none h-8" required />
                            <input ref={priceInputRef} type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="Tk" className="flex-1 px-3 py-2 bg-md-surface-container dark:bg-zinc-800 rounded-xl font-[800] text-xs text-rose-600 outline-none h-8" required />
                            <button type="submit" className="bg-md-primary text-white px-3 py-1.5 rounded-xl shadow-md active:scale-95 transition-all shrink-0 h-8 flex items-center justify-center">
                                <Plus size={16} strokeWidth={3} />
                            </button>
                        </div>
                        <div className="flex justify-between items-center px-1">
                            <select value={paidFrom} onChange={e => setPaidFrom(e.target.value as AccountType)} className="bg-transparent border-none text-[8px] font-black uppercase tracking-widest text-md-primary outline-none py-1">
                                {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                            </select>
                            <input type="datetime-local" value={dateTime} onChange={e => setDateTime(e.target.value)} className="bg-transparent border-none text-[8px] font-black uppercase text-gray-400 outline-none py-1 text-right" />
                        </div>
                    </form>

                    {/* Shopping List with Serial Numbers */}
                    <div className="bg-white dark:bg-zinc-900 rounded-[20px] border border-gray-100 dark:border-zinc-800 shadow-sm overflow-hidden">
                        <div className="flex items-center justify-between px-4 py-2 cursor-pointer" onClick={() => setIsToBuyExpanded(!isToBuyExpanded)}>
                            <div className="flex items-center gap-2">
                                <ListOrdered size={14} className="text-md-primary" />
                                <h4 className="font-black text-[9px] uppercase tracking-widest text-md-on-surface-variant">Shopping List</h4>
                                {toBuyList.length > 0 && <span className="bg-md-primary text-white text-[8px] px-1.5 py-0.5 rounded-full">{toBuyList.length}</span>}
                            </div>
                            {isToBuyExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                        </div>
                        {isToBuyExpanded && (
                            <div className="px-3 pb-3 animate-in slide-in-from-top-1">
                                {toBuyList.length === 0 ? <p className="text-[9px] text-center opacity-30 font-black py-4 uppercase tracking-widest">Empty</p> : 
                                    <div className="flex flex-wrap gap-1.5 pt-1">
                                        {toBuyList.map((itemName, idx) => (
                                            <div key={`${itemName}-${idx}`} className={`flex items-center gap-2 px-3 py-1.5 rounded-xl bg-md-surface-container dark:bg-zinc-800 border border-black/5 active:scale-95 transition-all ${processingIndex === idx ? 'ring-1 ring-md-primary' : ''}`} onClick={() => handleToBuyItemClick(itemName, idx)}>
                                                <span className="text-[9px] font-black text-md-primary/50">{idx + 1}.</span>
                                                <span className="text-[11px] font-[600]">{itemName}</span>
                                                <button onClick={e => { e.stopPropagation(); removeFromToBuy(idx); }} className="text-gray-400 hover:text-rose-500"><X size={12} /></button>
                                            </div>
                                        ))}
                                    </div>
                                }
                            </div>
                        )}
                    </div>

                    <div className="bg-white dark:bg-zinc-900 rounded-[20px] border border-gray-100 dark:border-zinc-800 shadow-sm overflow-hidden">
                        <div className="flex items-center justify-between px-4 py-2 cursor-pointer" onClick={() => setIsPickListExpanded(!isPickListExpanded)}>
                            <div className="flex items-center gap-2">
                                <ListPlus size={14} className="text-md-primary" />
                                <h4 className="font-black text-[9px] uppercase tracking-widest text-md-on-surface-variant">Quick Pick</h4>
                            </div>
                            <div className="flex items-center gap-2">
                                <button onClick={(e) => { e.stopPropagation(); setIsManagingTemplates(!isManagingTemplates); }} className={`p-1 rounded-md ${isManagingTemplates ? 'bg-md-primary text-white' : 'text-gray-400'}`}><Settings2 size={12} /></button>
                                {isPickListExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                            </div>
                        </div>
                        {isPickListExpanded && (
                            <div className="px-3 pb-3 animate-in slide-in-from-top-1">
                                {isManagingTemplates && (
                                    <div className="p-2 bg-md-surface-container rounded-xl border border-dashed border-md-primary/20 space-y-2 mb-2">
                                        <div className="flex gap-2">
                                            <input type="text" value={newTemplate} onChange={e => setNewTemplate(e.target.value)} placeholder="New..." className="flex-1 px-2 py-1 bg-white rounded-lg text-[10px] font-bold h-7" />
                                            <button onClick={addTemplate} className="p-1 bg-md-primary text-white rounded-lg h-7 w-7 flex items-center justify-center"><Plus size={14}/></button>
                                        </div>
                                        <div className="flex flex-wrap gap-1">
                                            {templates.map(t => (
                                                <div key={t} className="flex items-center gap-1 px-2 py-0.5 bg-white rounded-md text-[8px] font-black uppercase border">
                                                    {t}<button onClick={() => removeTemplate(t)} className="text-rose-500"><X size={8}/></button>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                                <div className="flex flex-wrap gap-1.5">
                                    {templates.map(itemName => (
                                        <button key={itemName} type="button" onClick={() => handlePickListClick(itemName)} className={`px-2 py-1 border rounded-lg text-[9px] font-black uppercase tracking-tight transition-all active:scale-95 ${toBuyList.includes(itemName) ? 'bg-md-primary/10 text-md-primary border-md-primary/30' : 'bg-white dark:bg-zinc-900 text-md-on-surface'}`}>
                                            {itemName}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </>
            )}

            {/* Bazar History Section */}
            <div className="space-y-6 pb-10 mt-4">
                <div className="flex items-center gap-2 px-2 border-b dark:border-zinc-800 pb-2">
                    <Receipt size={14} className="text-md-primary" />
                    <h4 className="font-black text-[10px] uppercase tracking-widest text-md-on-surface-variant">Bazar History</h4>
                </div>
                {sortedDays.length === 0 ? (
                    <div className="py-20 text-center opacity-30 flex flex-col items-center gap-4">
                        <ShoppingBag size={48} strokeWidth={1} />
                        <p className="font-black text-[10px] uppercase tracking-widest">No Bazar Data</p>
                    </div>
                ) : (
                    sortedDays.map(dayKey => {
                        const dayData = groupedStructure[dayKey];
                        const sessionKeys = Object.keys(dayData.sessions).sort((a, b) => new Date(b).getTime() - new Date(a).getTime());
                        
                        return (
                            <div key={dayKey} className="space-y-3">
                                <div className="flex justify-between items-center px-4 sticky top-[76px] z-10 bg-md-surface/90 dark:bg-zinc-950/90 backdrop-blur-md py-2.5 rounded-2xl shadow-sm border border-black/5">
                                    <div className="flex items-center gap-3">
                                        <div className="w-7 h-7 rounded-lg bg-md-primary flex items-center justify-center text-white shadow-sm"><CalendarDays size={14} /></div>
                                        <p className="text-[11px] font-black uppercase">{new Date(dayKey).toLocaleDateString('en-US', { day: 'numeric', month: 'short' })}</p>
                                    </div>
                                    <p className="text-base font-black text-rose-600">Tk {dayData.dailyTotal.toLocaleString()}</p>
                                </div>
                                
                                <div className="space-y-3">
                                    {sessionKeys.map(timeKey => {
                                        const session = dayData.sessions[timeKey];
                                        const sessionTime = new Date(timeKey).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                                        
                                        return (
                                            <div key={timeKey} className="bg-white dark:bg-zinc-900 rounded-[24px] overflow-hidden border border-gray-100 dark:border-zinc-800 shadow-sm">
                                                <div className="px-3.5 py-1.5 bg-md-surface-container/50 dark:bg-zinc-800/50 flex justify-between items-center border-b border-gray-50 dark:border-zinc-800">
                                                    <div className="flex items-center gap-1.5 opacity-40">
                                                        <Clock size={10} className="text-md-primary" />
                                                        <span className="text-[8px] font-black uppercase tracking-widest">{sessionTime}</span>
                                                    </div>
                                                    <span className="text-[9px] font-black text-md-primary opacity-60">Session Total: Tk {session.sessionTotal.toLocaleString()}</span>
                                                </div>
                                                <div className="divide-y divide-gray-50 dark:divide-zinc-800">
                                                    {session.items.map(t => (
                                                        <div key={t.id} onClick={() => startEditing(t)} className="flex items-center justify-between p-3.5 cursor-pointer hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
                                                            <p className="font-[600] text-sm">{t.description}</p>
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
                    })
                )}
            </div>
         </div>

         {/* Edit Modal */}
         {editingTx && (
            <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-black/40 backdrop-blur-sm">
                <div className="bg-white dark:bg-zinc-900 rounded-[28px] shadow-2xl w-full max-w-sm p-6 space-y-5">
                    <h3 className="text-xl font-bold">Edit Bazar Item</h3>
                    <div className="space-y-3">
                        <input type="text" value={editDesc} onChange={e => setEditDesc(e.target.value)} placeholder="Description" className="w-full px-4 py-3 bg-md-surface-container dark:bg-zinc-800 rounded-xl font-bold" />
                        <input type="number" value={editAmount} onChange={e => setEditAmount(e.target.value)} placeholder="Amount" className="w-full px-4 py-3 bg-md-surface-container dark:bg-zinc-800 rounded-xl font-bold" />
                        <input type="datetime-local" value={editDate} onChange={e => setEditDate(e.target.value)} className="w-full px-4 py-3 bg-md-surface-container dark:bg-zinc-800 rounded-xl font-bold" />
                    </div>
                    <div className="flex justify-between items-center pt-4 border-t dark:border-zinc-800">
                        <button onClick={() => { if(confirm("Delete record?")) { onDeleteTransaction(editingTx.id); setEditingTx(null); } }} className="text-rose-500 p-2 hover:bg-rose-50 rounded-full"><Trash2 size={20} /></button>
                        <div className="flex gap-2">
                            <button onClick={() => setEditingTx(null)} className="px-5 font-black text-sm">Cancel</button>
                            <button onClick={saveEdit} className="px-6 py-2.5 bg-md-primary text-white rounded-full font-black text-sm shadow-lg">Save</button>
                        </div>
                    </div>
                </div>
            </div>
         )}
      </div>
    );
};

export default BazarView;
