
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
  ShoppingBag,
  Camera,
  Loader2,
  Sparkles,
  Zap
} from 'lucide-react';
import { Transaction, Category, AccountType, Account } from '../types';
import { analyzeReceipt } from '../services/geminiService';
import SwipeableItem from './SwipeableItem';

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

    // Prioritize 'cash' wallet by ID or name
    const defaultCash = accounts.find(a => a.id === 'cash')?.id || 
                      accounts.find(a => a.name.toLowerCase().includes('cash'))?.id || 
                      accounts[0]?.id || '';
    
    const [item, setItem] = useState('');
    const [amount, setAmount] = useState('');
    const [paidFrom, setPaidFrom] = useState<AccountType>(defaultCash);
    const [dateTime, setDateTime] = useState(getLocalDateTime());
    const [viewDate, setViewDate] = useState(new Date());

    const [isPickListExpanded, setIsPickListExpanded] = useState(true);
    const [isToBuyExpanded, setIsToBuyExpanded] = useState(true);
    const [isScanning, setIsScanning] = useState(false);

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
    const fileInputRef = useRef<HTMLInputElement>(null);

    const changeMonth = (offset: number) => {
        const newDate = new Date(viewDate);
        newDate.setMonth(newDate.getMonth() + offset);
        setViewDate(newDate);
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsScanning(true);
        try {
            const reader = new FileReader();
            reader.onloadend = async () => {
                const base64 = (reader.result as string).split(',')[1];
                const items = await analyzeReceipt(base64, file.type);
                
                if (items && items.length > 0) {
                    items.forEach(it => {
                        if (it.price > 0) {
                            onAddTransaction({
                                description: it.name,
                                amount: it.price,
                                type: 'expense',
                                category: Category.BAZAR,
                                date: new Date().toISOString(),
                                accountId: paidFrom
                            });
                        } else {
                            if (!toBuyList.includes(it.name)) {
                                setToBuyList(prev => [...prev, it.name]);
                            }
                        }
                    });
                    alert(`AI processed ${items.length} items from receipt.`);
                } else {
                    alert("Gemini couldn't find any items. Try a clearer photo.");
                }
            };
            reader.readAsDataURL(file);
        } catch (err) {
            alert("Error scanning receipt. Please check connection.");
        } finally {
            setIsScanning(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
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
                <h2 className="text-xl font-extrabold tracking-tight text-md-on-surface dark:text-white">Bazar Spend</h2>
                <div className="flex glass rounded-full p-0.5 border border-black/5">
                   <button onClick={() => changeMonth(-1)} className="p-1.5 hover:bg-white dark:hover:bg-zinc-800 rounded-full transition-all active:scale-90"><ChevronLeft size={16}/></button>
                   <button onClick={() => changeMonth(1)} className="p-1.5 hover:bg-white dark:hover:bg-zinc-800 rounded-full transition-all active:scale-90"><ChevronRight size={16}/></button>
                </div>
            </div>
            
            <div className="mesh-gradient-primary p-5 rounded-[24px] shadow-lg relative overflow-hidden group">
                <div className="absolute -right-5 -top-5 w-20 h-20 bg-white/10 rounded-full blur-xl animate-mesh"></div>
                <p className="text-[9px] font-medium uppercase tracking-[0.2em] text-white/60 mb-0.5 relative z-10">Bazar Total ({dateLabel})</p>
                <h3 className="text-2xl font-black text-white tracking-tighter relative z-10">Tk {totalBazarSpend.toLocaleString()}</h3>
            </div>
         </div>

         <div className="px-4 mt-4 space-y-4">
            {isCurrentCalendarMonth && (
                <>
                    <input type="file" accept="image/*" capture="environment" ref={fileInputRef} className="hidden" onChange={handleFileUpload} />
                    
                    {isScanning && (
                      <div className="bg-md-primary p-4 rounded-[24px] text-white flex items-center gap-4 shadow-lg animate-pulse">
                        <Loader2 className="animate-spin" size={20} />
                        <div className="flex-1">
                          <p className="text-xs font-black uppercase tracking-widest">AI Scanning Receipt</p>
                          <p className="text-[10px] opacity-70">Extracting items and prices...</p>
                        </div>
                      </div>
                    )}

                    {/* Entry Form */}
                    <form onSubmit={handleQuickAdd} className="glass p-3 rounded-[24px] shadow-sm space-y-3">
                        <div className="grid grid-cols-[44px_1fr_80px_44px] gap-2 items-center">
                            <button 
                              type="button" 
                              onClick={() => fileInputRef.current?.click()}
                              className="bg-md-primary/10 text-md-primary rounded-xl h-11 w-full flex items-center justify-center active:scale-90 transition-all"
                            >
                                <Camera size={22} />
                            </button>
                            <input ref={itemInputRef} type="text" value={item} onChange={e => { setItem(e.target.value); if (processingIndex !== null) setProcessingIndex(null); }} placeholder="Item name" className="px-4 py-2 bg-black/5 dark:bg-white/5 rounded-xl font-semibold text-xs outline-none h-11 w-full dark:text-white" required />
                            <input ref={priceInputRef} type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="Tk" className="px-2 py-2 bg-black/5 dark:bg-white/5 rounded-xl font-black text-xs text-rose-600 outline-none h-11 w-full text-center" required />
                            <button type="submit" className="bg-md-primary text-white rounded-xl shadow-md active:scale-95 transition-all h-11 w-full flex items-center justify-center">
                                <Plus size={24} strokeWidth={3} />
                            </button>
                        </div>
                        <div className="flex justify-between items-center px-1">
                            <select value={paidFrom} onChange={e => setPaidFrom(e.target.value as AccountType)} className="bg-transparent border-none text-[9px] font-black uppercase tracking-widest text-md-primary outline-none py-1">
                                {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                            </select>
                            <input type="datetime-local" value={dateTime} onChange={e => setDateTime(e.target.value)} className="bg-transparent border-none text-[9px] font-bold uppercase text-gray-400 outline-none py-1 text-right" />
                        </div>
                    </form>

                    {/* Shopping List (Moved on top of Quick Pick) */}
                    <div className="glass rounded-[24px] shadow-sm overflow-hidden">
                        <div className="flex items-center justify-between px-5 py-3 cursor-pointer" onClick={() => setIsToBuyExpanded(!isToBuyExpanded)}>
                            <div className="flex items-center gap-2">
                                <ListOrdered size={14} className="text-md-primary" />
                                <h4 className="font-medium text-[10px] uppercase tracking-[0.2em] text-md-on-surface-variant opacity-60">Shopping List</h4>
                                {toBuyList.length > 0 && <span className="bg-md-primary text-white text-[8px] px-1.5 py-0.5 rounded-full font-bold">{toBuyList.length}</span>}
                            </div>
                            {isToBuyExpanded ? <ChevronUp size={14} className="opacity-40" /> : <ChevronDown size={14} className="opacity-40" />}
                        </div>
                        {isToBuyExpanded && (
                            <div className="px-3 pb-4 animate-in slide-in-from-top-1">
                                {toBuyList.length === 0 ? <p className="text-[9px] text-center opacity-30 font-black py-4 uppercase tracking-[0.2em]">List Empty</p> : 
                                    <div className="flex flex-col gap-2 pt-1">
                                        {toBuyList.map((itemName, idx) => (
                                            <div 
                                                key={`${itemName}-${idx}`} 
                                                className={`flex items-center justify-between px-4 py-3 rounded-2xl bg-black/5 dark:bg-white/5 border border-transparent active:scale-[0.98] transition-all cursor-pointer ${processingIndex === idx ? 'border-md-primary bg-md-primary/5' : ''}`} 
                                                onClick={() => handleToBuyItemClick(itemName, idx)}
                                            >
                                                <div className="flex items-center gap-3">
                                                    <span className="text-[10px] font-black text-md-primary/40 min-w-[20px]">{idx + 1}.</span>
                                                    <span className="text-sm font-semibold text-md-on-surface dark:text-gray-200">{itemName}</span>
                                                </div>
                                                <button 
                                                    onClick={e => { e.stopPropagation(); removeFromToBuy(idx); }} 
                                                    className="p-1.5 text-gray-400 hover:text-rose-500 active:bg-rose-50 rounded-full"
                                                >
                                                    <X size={18} />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                }
                            </div>
                        )}
                    </div>

                    {/* Quick Pick (Templates) */}
                    <div className="glass rounded-[24px] shadow-sm overflow-hidden transition-all">
                        <div className="flex items-center justify-between px-5 py-3 cursor-pointer" onClick={() => setIsPickListExpanded(!isPickListExpanded)}>
                            <div className="flex items-center gap-2">
                                <Zap size={14} className="text-md-primary" />
                                <h4 className="font-medium text-[10px] uppercase tracking-[0.2em] text-md-on-surface-variant opacity-60">Quick Pick</h4>
                            </div>
                            <div className="flex items-center gap-3">
                                <button 
                                    onClick={(e) => { e.stopPropagation(); setIsManagingTemplates(!isManagingTemplates); }}
                                    className={`p-1.5 rounded-lg transition-colors ${isManagingTemplates ? 'bg-md-primary text-white' : 'text-md-primary hover:bg-black/5'}`}
                                >
                                    <Settings2 size={14} />
                                </button>
                                {isPickListExpanded ? <ChevronUp size={14} className="opacity-40" /> : <ChevronDown size={14} className="opacity-40" />}
                            </div>
                        </div>
                        {isPickListExpanded && (
                            <div className="px-4 pb-4 animate-in slide-in-from-top-1">
                                {isManagingTemplates && (
                                    <div className="flex gap-2 mb-4 p-2 bg-black/5 dark:bg-white/5 rounded-xl animate-in zoom-in-95">
                                        <input 
                                            type="text" 
                                            value={newTemplate} 
                                            onChange={e => setNewTemplate(e.target.value)}
                                            placeholder="Add custom item..." 
                                            className="flex-1 bg-transparent border-none outline-none text-xs font-semibold px-2 dark:text-white"
                                        />
                                        <button onClick={addTemplate} className="p-2 bg-md-primary text-white rounded-lg active:scale-90"><Plus size={16} /></button>
                                    </div>
                                )}
                                <div className="flex flex-wrap gap-2 pt-1">
                                    {templates.map(name => (
                                        <div key={name} className="relative group">
                                            <button 
                                                onClick={() => handlePickListClick(name)}
                                                className={`px-4 py-2 rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all border ${toBuyList.includes(name) ? 'bg-md-primary/10 border-md-primary text-md-primary' : 'bg-black/5 border-transparent text-md-on-surface-variant hover:bg-black/10 dark:text-gray-300 dark:bg-white/5'}`}
                                            >
                                                {name}
                                            </button>
                                            {isManagingTemplates && (
                                                <button onClick={() => removeTemplate(name)} className="absolute -top-2 -right-2 bg-rose-500 text-white rounded-full p-0.5 shadow-md"><X size={10} /></button>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </>
            )}

            <div className="space-y-6 pb-10 mt-6">
                <div className="flex items-center gap-2 px-2 pb-2">
                    <Receipt size={16} className="text-md-primary" />
                    <h4 className="font-medium text-[10px] uppercase tracking-[0.2em] text-md-on-surface-variant opacity-60">Purchase History</h4>
                </div>
                {sortedDays.length === 0 ? (
                    <div className="py-20 text-center opacity-30 flex flex-col items-center gap-4">
                        <ShoppingBag size={56} strokeWidth={1} />
                        <p className="font-medium text-[10px] uppercase tracking-[0.3em]">No Records Found</p>
                    </div>
                ) : (
                    sortedDays.map(dayKey => {
                        const dayData = groupedStructure[dayKey];
                        const sessionKeys = Object.keys(dayData.sessions).sort((a, b) => new Date(b).getTime() - new Date(a).getTime());
                        
                        return (
                            <div key={dayKey} className="space-y-4">
                                <div className="flex justify-between items-center px-4 sticky top-[96px] z-10 glass py-3 rounded-2xl shadow-sm border-black/5">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-xl bg-md-primary text-white flex items-center justify-center shadow-md"><CalendarDays size={16} /></div>
                                        <p className="text-xs font-semibold uppercase tracking-widest dark:text-white">{new Date(dayKey).toLocaleDateString('en-US', { day: 'numeric', month: 'short' })}</p>
                                    </div>
                                    <p className="text-base font-black text-md-primary">Tk {dayData.dailyTotal.toLocaleString()}</p>
                                </div>
                                
                                <div className="space-y-4">
                                    {sessionKeys.map(timeKey => {
                                        const session = dayData.sessions[timeKey];
                                        const sessionTime = new Date(timeKey).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                                        
                                        return (
                                            <div key={timeKey} className="glass rounded-[32px] overflow-hidden border-black/5 shadow-sm">
                                                <div className="px-4 py-2 bg-black/5 dark:bg-white/5 flex justify-between items-center border-b border-black/5">
                                                    <div className="flex items-center gap-2 opacity-50">
                                                        <Clock size={12} className="text-md-primary" />
                                                        <span className="text-[9px] font-black uppercase tracking-widest dark:text-gray-300">{sessionTime}</span>
                                                    </div>
                                                    <span className="text-[9px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-widest">Sum: Tk {session.sessionTotal.toLocaleString()}</span>
                                                </div>
                                                <div className="divide-y divide-black/5 dark:divide-white/5">
                                                    {session.items.map(t => {
                                                        const acc = accounts.find(a => a.id === t.accountId);
                                                        return (
                                                            <SwipeableItem 
                                                              key={t.id}
                                                              onDelete={() => onDeleteTransaction(t.id)}
                                                              onEdit={() => startEditing(t)}
                                                            >
                                                              <div onClick={() => startEditing(t)} className="flex items-center justify-between p-4 bg-white dark:bg-zinc-900 cursor-pointer hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
                                                                  <div className="space-y-0.5">
                                                                      <p className="font-semibold text-sm dark:text-white leading-tight">{t.description}</p>
                                                                      <p className="text-[9px] font-black uppercase tracking-widest" style={{ color: acc?.color || '#999' }}>{acc?.name || 'Wallet'}</p>
                                                                  </div>
                                                                  <p className="font-black text-sm text-md-on-surface dark:text-white">Tk {t.amount.toLocaleString()}</p>
                                                              </div>
                                                            </SwipeableItem>
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

         {/* Edit Modal */}
         {editingTx && (
            <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
                <div className="glass rounded-[32px] shadow-2xl w-full max-w-sm p-8 space-y-6">
                    <h3 className="text-xl font-extrabold dark:text-white tracking-tight">Edit Item</h3>
                    <div className="space-y-4">
                        <div className="space-y-1">
                            <label className="text-[9px] font-medium uppercase tracking-[0.2em] text-md-primary opacity-60 ml-1">Name</label>
                            <input type="text" value={editDesc} onChange={e => setEditDesc(e.target.value)} placeholder="Description" className="w-full px-5 py-3.5 bg-black/5 dark:bg-white/5 rounded-2xl font-semibold text-sm outline-none dark:text-white border border-transparent focus:border-md-primary/30" />
                        </div>
                        <div className="space-y-1">
                            <label className="text-[9px] font-medium uppercase tracking-[0.2em] text-md-primary opacity-60 ml-1">Price</label>
                            <input type="number" value={editAmount} onChange={e => setEditAmount(e.target.value)} placeholder="Amount" className="w-full px-5 py-3.5 bg-black/5 dark:bg-white/5 rounded-2xl font-black text-sm outline-none dark:text-white border border-transparent focus:border-md-primary/30" />
                        </div>
                        <div className="space-y-1">
                            <label className="text-[9px] font-medium uppercase tracking-[0.2em] text-md-primary opacity-60 ml-1">Date</label>
                            <input type="datetime-local" value={editDate} onChange={e => setEditDate(e.target.value)} className="w-full px-5 py-3.5 bg-black/5 dark:bg-white/5 rounded-2xl font-bold text-sm outline-none dark:text-white border border-transparent focus:border-md-primary/30" />
                        </div>
                    </div>
                    <div className="flex justify-between items-center pt-6 border-t border-black/5 dark:border-white/5">
                        <button onClick={() => { if(confirm("Delete record?")) { onDeleteTransaction(editingTx.id); setEditingTx(null); } }} className="text-rose-500 p-3 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-2xl active:scale-90 transition-all"><Trash2 size={20} /></button>
                        <div className="flex gap-2">
                            <button onClick={() => setEditingTx(null)} className="px-5 py-3 font-black text-[10px] uppercase tracking-widest text-md-on-surface-variant hover:bg-black/5 rounded-2xl">Cancel</button>
                            <button onClick={saveEdit} className="px-6 py-3 bg-md-primary text-white rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] shadow-lg active:scale-95">Save</button>
                        </div>
                    </div>
                </div>
            </div>
         )}
      </div>
    );
};

export default BazarView;
