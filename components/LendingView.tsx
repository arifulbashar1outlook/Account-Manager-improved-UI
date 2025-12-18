
import React, { useState, useMemo } from 'react';
import { 
  User, 
  Search, 
  ArrowLeft, 
  Plus, 
  Trash2, 
  ArrowRight,
  UserMinus, 
  UserPlus,
  ChevronRight,
  CalendarDays,
  X,
  Check,
  Edit2,
  AlertTriangle,
  HandCoins,
  ArrowRightLeft,
  Calendar,
  ChevronDown,
  Clock
} from 'lucide-react';
import { Transaction, Category, AccountType, Account } from '../types';

interface LendingViewProps {
  transactions: Transaction[];
  accounts: Account[];
  onAddTransaction: (t: Omit<Transaction, 'id'>) => void;
  onUpdateTransaction: (t: Transaction) => void;
  onDeleteTransaction: (id: string) => void;
}

const LendingView: React.FC<LendingViewProps> = ({ transactions, accounts, onAddTransaction, onUpdateTransaction, onDeleteTransaction }) => {
  const [selectedPerson, setSelectedPerson] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  
  const defaultCash = accounts.find(a => a.id === 'cash')?.id || accounts[0]?.id || '';

  const [amount, setAmount] = useState('');
  const [account, setAccount] = useState<AccountType>(defaultCash);
  const [formMode, setFormMode] = useState<'lend' | 'recover'>('lend');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);

  const [isAddingNew, setIsAddingNew] = useState(false);
  const [newPersonName, setNewPersonName] = useState('');

  const [renamingPerson, setRenamingPerson] = useState<{oldName: string, newName: string} | null>(null);
  const [deletingPerson, setDeletingPerson] = useState<string | null>(null);

  const [editingTx, setEditingTx] = useState<Transaction | null>(null);
  const [editDesc, setEditDesc] = useState('');
  const [editAmount, setEditAmount] = useState('');
  const [editDate, setEditDate] = useState('');
  const [editAccount, setEditAccount] = useState<AccountType>(defaultCash);

  const getPersonData = (t: Transaction) => {
    if (t.category !== Category.LENDING) return null;
    const lendMatch = t.description.match(/Lent to\s+(.*)/i);
    const returnMatch = t.description.match(/Returned by\s+(.*)/i);
    
    if (lendMatch) return { name: lendMatch[1].trim(), type: 'lend', amount: t.amount };
    if (returnMatch) return { name: returnMatch[1].trim(), type: 'recover', amount: t.amount };
    return null;
  };

  const peopleData = useMemo(() => {
    const people: Record<string, { balance: number, lastTxDate: string }> = {};
    
    transactions.forEach(t => {
      const data = getPersonData(t);
      if (!data) return;
      
      if (!people[data.name]) {
        people[data.name] = { balance: 0, lastTxDate: t.date };
      }
      
      if (data.type === 'lend') {
        people[data.name].balance += data.amount;
      } else {
        people[data.name].balance -= data.amount;
      }
      
      if (new Date(t.date) > new Date(people[data.name].lastTxDate)) {
        people[data.name].lastTxDate = t.date;
      }
    });

    return Object.entries(people)
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => new Date(b.lastTxDate).getTime() - new Date(a.lastTxDate).getTime());
  }, [transactions]);

  const filteredPeople = peopleData.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const personTransactions = useMemo(() => {
    if (!selectedPerson) return [];
    return transactions.filter(t => {
      const data = getPersonData(t);
      return data && data.name === selectedPerson;
    }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [transactions, selectedPerson]);

  const handleTransaction = () => {
    if (!amount || !selectedPerson) return;
    
    const description = formMode === 'lend' 
      ? `Lent to ${selectedPerson}` 
      : `Returned by ${selectedPerson}`;
      
    const type = formMode === 'lend' ? 'expense' : 'income';

    onAddTransaction({
      amount: parseFloat(amount),
      type,
      category: Category.LENDING,
      description,
      date: new Date(date).toISOString(),
      accountId: account
    });
    
    setAmount('');
  };

  const handleAddNewPerson = () => {
    if(newPersonName) {
        setSelectedPerson(newPersonName);
        setNewPersonName('');
        setIsAddingNew(false);
    }
  }

  const handleRenamePerson = () => {
    if (!renamingPerson || !renamingPerson.newName.trim()) return;
    const { oldName, newName } = renamingPerson;
    transactions.forEach(t => {
      const data = getPersonData(t);
      if (data && data.name === oldName) {
        const newDescription = t.description.replace(oldName, newName.trim());
        onUpdateTransaction({ ...t, description: newDescription });
      }
    });
    setRenamingPerson(null);
  };

  const handleDeletePerson = () => {
    if (!deletingPerson) return;
    const targetName = deletingPerson;
    transactions.forEach(t => {
      const data = getPersonData(t);
      if (data && data.name === targetName) {
        onDeleteTransaction(t.id);
      }
    });
    setDeletingPerson(null);
  };

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
  };

  const saveEdit = () => {
    if (!editingTx || !editDesc || !editAmount) return;
    const updatedTx: Transaction = {
        ...editingTx,
        description: editDesc,
        amount: parseFloat(editAmount),
        date: new Date(editDate).toISOString(),
        accountId: editAccount
    };
    onUpdateTransaction(updatedTx);
    setEditingTx(null);
  };

  const handleDelete = () => {
      if (editingTx) {
          if (window.confirm("Are you sure you want to delete this record?")) {
              onDeleteTransaction(editingTx.id);
              setEditingTx(null);
          }
      }
  };

  if (!selectedPerson) {
    return (
      <div className="max-w-md mx-auto min-h-screen bg-md-surface pb-32 animate-in fade-in duration-300">
         {renamingPerson && (
            <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
                <div className="bg-white dark:bg-zinc-900 rounded-[28px] shadow-2xl w-full max-w-sm p-6 space-y-6">
                    <h3 className="text-xl font-bold text-md-on-surface">Edit Person Name</h3>
                    <input 
                        type="text" 
                        value={renamingPerson.newName}
                        onChange={(e) => setRenamingPerson({ ...renamingPerson, newName: e.target.value })}
                        className="w-full px-4 py-3 bg-md-surface-container rounded-xl outline-none border border-transparent focus:border-md-primary font-black"
                        placeholder="Enter name"
                        autoFocus
                    />
                    <div className="flex justify-between items-center pt-4 border-t dark:border-zinc-800">
                        <button 
                            type="button"
                            onClick={() => {
                                setDeletingPerson(renamingPerson.oldName);
                                setRenamingPerson(null);
                            }} 
                            className="p-3 text-rose-500 hover:bg-rose-50 rounded-full"
                        >
                            <Trash2 size={20} />
                        </button>
                        <div className="flex gap-2">
                            <button type="button" onClick={() => setRenamingPerson(null)} className="px-5 py-2.5 text-sm font-black text-md-on-surface-variant hover:bg-md-surface-container rounded-full">Cancel</button>
                            <button type="button" onClick={handleRenamePerson} className="px-6 py-2.5 bg-md-primary text-white text-sm font-black rounded-full shadow-lg">Update</button>
                        </div>
                    </div>
                </div>
            </div>
         )}

         {deletingPerson && (
            <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
                <div className="bg-white dark:bg-zinc-900 rounded-[28px] shadow-2xl w-full max-w-sm p-6 space-y-6">
                    <div className="flex items-center gap-3 text-rose-600">
                        <AlertTriangle className="w-8 h-8" />
                        <h3 className="text-xl font-bold">Clear History?</h3>
                    </div>
                    <p className="text-sm text-md-on-surface-variant font-medium leading-relaxed">
                        This will permanently delete all lending and recovery records for <strong>{deletingPerson}</strong>. This cannot be undone.
                    </p>
                    <div className="flex justify-end gap-2 pt-4 border-t dark:border-zinc-800">
                        <button type="button" onClick={() => setDeletingPerson(null)} className="px-5 py-2.5 text-sm font-black text-md-on-surface-variant hover:bg-md-surface-container rounded-full">Cancel</button>
                        <button type="button" onClick={handleDeletePerson} className="px-6 py-2.5 bg-rose-600 text-white text-sm font-black rounded-full shadow-lg">Delete All</button>
                    </div>
                </div>
            </div>
         )}

         <div className="px-6 pt-safe space-y-6">
            <h2 className="text-3xl font-black tracking-tight text-md-on-surface pt-10 pb-6">Lending</h2>
            
            <div className="relative group">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-md-on-surface-variant">
                    <Search size={20} />
                </div>
                <input 
                    type="text"
                    placeholder="Search name..."
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    className="w-full bg-md-surface-container px-12 py-4 rounded-full text-sm font-black outline-none border-2 border-transparent focus:border-md-primary/30 focus:bg-white transition-all shadow-sm"
                />
                <button 
                  type="button"
                  onClick={() => setIsAddingNew(true)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-md-primary text-white rounded-full shadow-md active:scale-95 transition-all"
                >
                   <Plus size={20} strokeWidth={3} />
                </button>
            </div>

            {isAddingNew && (
                <div className="bg-md-primary-container p-6 rounded-md-card shadow-sm border border-md-primary/10 animate-in slide-in-from-top-4">
                    <h3 className="font-black text-xs uppercase tracking-widest text-md-on-primary-container mb-4">Add New Contact</h3>
                    <div className="flex gap-3">
                        <input 
                            type="text"
                            placeholder="Enter person name"
                            value={newPersonName}
                            onChange={e => setNewPersonName(e.target.value)}
                            className="flex-1 px-4 py-3 bg-white dark:bg-zinc-800 rounded-2xl outline-none text-sm font-black shadow-inner"
                            autoFocus
                        />
                        <button 
                            type="button"
                            onClick={handleAddNewPerson}
                            disabled={!newPersonName}
                            className="bg-md-primary text-white px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-widest disabled:opacity-50 active:scale-95 shadow-md"
                        >
                            Start
                        </button>
                        <button type="button" onClick={() => setIsAddingNew(false)} className="p-3 text-md-on-primary-container opacity-60"><X size={20}/></button>
                    </div>
                </div>
            )}
         </div>

         <div className="px-4 space-y-3">
            {filteredPeople.length === 0 ? (
                <div className="py-20 text-center opacity-30 flex flex-col items-center gap-4">
                    <HandCoins size={64} strokeWidth={1} />
                    <p className="font-black text-xs uppercase tracking-[0.2em]">No Active Loans</p>
                </div>
            ) : (
                filteredPeople.map(p => (
                    <div 
                      key={p.name}
                      onClick={() => setSelectedPerson(p.name)}
                      className="bg-white dark:bg-zinc-900 p-5 rounded-[28px] border border-gray-100 dark:border-zinc-800 shadow-sm flex items-center justify-between cursor-pointer hover:bg-md-surface-container group transition-all active:scale-[0.98] md-ripple"
                    >
                        <div className="flex items-center gap-4 flex-1">
                            <div className="w-12 h-12 rounded-2xl bg-md-primary-container text-md-primary flex items-center justify-center font-black text-lg">
                                {p.name.charAt(0).toUpperCase()}
                            </div>
                            <div>
                                <h3 className="font-black text-sm text-md-on-surface leading-tight tracking-tight">{p.name}</h3>
                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                                    Last Active: {new Date(p.lastTxDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                             <div className="text-right">
                                 <p className={`font-black text-sm ${p.balance > 0 ? 'text-rose-600' : p.balance < 0 ? 'text-emerald-600' : 'text-gray-400'}`}>
                                     Tk {Math.abs(p.balance).toLocaleString()}
                                 </p>
                                 <p className="text-[9px] font-black uppercase tracking-widest text-gray-400">
                                     {p.balance > 0 ? 'Lent/Due' : p.balance < 0 ? 'Overpaid' : 'Settled'}
                                 </p>
                             </div>
                             <button 
                                type="button"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setRenamingPerson({ oldName: p.name, newName: p.name });
                                }}
                                className="p-2 text-gray-300 hover:text-md-primary opacity-0 group-hover:opacity-100 transition-all active:bg-md-primary/10 rounded-full"
                            >
                                <Edit2 size={16} />
                            </button>
                            <ChevronRight size={18} className="text-gray-300" />
                        </div>
                    </div>
                ))
            )}
         </div>
      </div>
    );
  }

  const totalBalance = personTransactions.reduce((acc, t) => {
     const data = getPersonData(t);
     if (!data) return acc;
     return acc + (data.type === 'lend' ? t.amount : -t.amount);
  }, 0);

  return (
      <div className="max-w-md mx-auto min-h-screen bg-md-surface pb-32 animate-in slide-in-from-right duration-400">
         {editingTx && (
            <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
                <div className="bg-white dark:bg-zinc-900 rounded-[28px] shadow-2xl w-full max-w-sm p-6 space-y-5">
                    <h3 className="text-xl font-bold text-md-on-surface">Edit Record</h3>
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

                        <div className="relative">
                            <label className="text-[10px] font-black uppercase text-md-primary ml-1 mb-1 block">Date & Time</label>
                            <div className="relative flex items-center bg-md-surface-container rounded-xl overflow-hidden px-4 py-3 dark:bg-zinc-800 border border-transparent focus-within:border-md-primary transition-all cursor-pointer" onClick={(e) => {
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
                                <label className="text-[10px] font-black uppercase text-md-primary ml-1 mb-1 block">Wallet</label>
                                <select
                                    value={editAccount}
                                    onChange={(e) => setEditAccount(e.target.value as AccountType)}
                                    className="w-full px-4 py-3 bg-md-surface-container rounded-xl outline-none font-black appearance-none dark:bg-zinc-800 dark:text-white"
                                >
                                    {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                                </select>
                            </div>
                        </div>
                    </div>
                    <div className="flex justify-between items-center pt-4 border-t dark:border-zinc-800">
                        <button type="button" onClick={handleDelete} className="p-3 text-rose-500 hover:bg-rose-50 rounded-full"><Trash2 size={20} /></button>
                        <div className="flex gap-2">
                            <button type="button" onClick={() => setEditingTx(null)} className="px-5 py-2.5 text-sm font-black text-md-on-surface-variant hover:bg-md-surface-container rounded-full">Cancel</button>
                            <button type="button" onClick={saveEdit} className="px-6 py-2.5 bg-md-primary text-white text-sm font-black rounded-full shadow-lg">Save</button>
                        </div>
                    </div>
                </div>
            </div>
         )}

         <div className="sticky top-0 z-10 bg-md-surface dark:bg-zinc-950 px-4 pt-safe border-b border-gray-50 dark:border-zinc-800">
            <div className="flex items-center gap-4 py-4">
               <button type="button" onClick={() => setSelectedPerson(null)} className="p-3 hover:bg-md-surface-container rounded-full transition-colors"><ArrowLeft size={24}/></button>
               <div>
                   <h2 className="text-lg font-black tracking-tight">{selectedPerson}</h2>
                   <p className="text-[10px] font-black uppercase tracking-widest text-md-on-surface-variant opacity-60">Lending Directory</p>
               </div>
            </div>
         </div>

         <div className="p-4 space-y-6">
            <div className="bg-md-surface-container p-6 rounded-md-card shadow-sm border border-md-outline/10 text-center space-y-3">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-md-on-surface-variant opacity-60">Net Outstanding Balance</p>
                <h3 className={`text-4xl font-black tracking-tighter ${totalBalance > 0 ? 'text-rose-600' : totalBalance < 0 ? 'text-emerald-600' : 'text-md-on-surface'}`}>
                    Tk {Math.abs(totalBalance).toLocaleString()}
                </h3>
                <div className="inline-block px-4 py-1.5 rounded-full bg-white dark:bg-zinc-800 text-[10px] font-black uppercase tracking-widest border border-gray-100 dark:border-zinc-700 shadow-sm">
                    {totalBalance > 0 ? 'Debt Owed to You' : totalBalance < 0 ? 'Overpaid by Contact' : 'Balance Settled'}
                </div>
            </div>

            <div className="bg-white dark:bg-zinc-900 p-6 rounded-[28px] border border-gray-100 dark:border-zinc-800 shadow-sm space-y-5">
                <div className="flex bg-md-surface-container p-1 rounded-full">
                    <button 
                        type="button"
                        onClick={() => setFormMode('lend')}
                        className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${formMode === 'lend' ? 'bg-md-primary text-white shadow-md' : 'text-md-on-surface-variant'}`}
                    >
                        <UserMinus size={14} /> Lend / Give
                    </button>
                    <button 
                        type="button"
                        onClick={() => setFormMode('recover')}
                        className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${formMode === 'recover' ? 'bg-md-primary text-white shadow-md' : 'text-md-on-surface-variant'}`}
                    >
                        <UserPlus size={14} /> Recover
                    </button>
                </div>

                <div className="space-y-4">
                    <div className="flex gap-3">
                        <div className="relative flex-1">
                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[10px] font-black text-gray-400">Tk</span>
                            <input 
                                type="number" 
                                value={amount}
                                onChange={e => setAmount(e.target.value)}
                                placeholder="Amount"
                                className="w-full pl-10 pr-4 py-4 bg-md-surface-container rounded-2xl outline-none font-black text-lg focus:bg-white focus:ring-2 focus:ring-md-primary/10 transition-all shadow-inner dark:bg-zinc-800 dark:text-white"
                            />
                        </div>
                        <div className="relative flex-1">
                          <select
                              value={account}
                              onChange={e => setAccount(e.target.value as AccountType)}
                              className="w-full pl-4 pr-10 py-4 bg-md-surface-container rounded-2xl outline-none text-[11px] font-black appearance-none shadow-inner truncate uppercase tracking-tight dark:bg-zinc-800 dark:text-white"
                          >
                              {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                          </select>
                          <ChevronDown size={14} className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none opacity-40" />
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="relative flex-1 cursor-pointer" onClick={(e) => {
                          const input = e.currentTarget.querySelector('input');
                          if (input) (input as any).showPicker?.();
                        }}>
                            <Calendar size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-md-primary" />
                            <input 
                                type="date" 
                                value={date}
                                onChange={e => setDate(e.target.value)}
                                className="w-full pl-10 pr-4 py-3 bg-md-surface-container rounded-2xl outline-none text-[11px] font-black shadow-inner dark:bg-zinc-800 dark:text-white cursor-pointer"
                            />
                        </div>
                        <button 
                            type="button"
                            onClick={handleTransaction}
                            disabled={!amount}
                            className="bg-md-primary text-white p-4 rounded-2xl shadow-lg active:scale-95 disabled:opacity-50 transition-all"
                        >
                            <Plus size={24} strokeWidth={3} />
                        </button>
                    </div>
                </div>
            </div>

            <div className="space-y-4">
                <div className="flex items-center gap-2 ml-2">
                    <HandCoins size={14} className="text-md-primary" />
                    <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-md-on-surface-variant opacity-60">Record History</h4>
                </div>
                <div className="space-y-3">
                    {personTransactions.length === 0 ? (
                        <p className="text-center py-10 text-xs font-black uppercase tracking-widest text-gray-300">No data records</p>
                    ) : (
                        personTransactions.map(t => {
                            const data = getPersonData(t)!;
                            const acc = accounts.find(a => a.id === t.accountId);
                            return (
                                <div 
                                    key={t.id} 
                                    onClick={() => startEditing(t)}
                                    className="bg-white dark:bg-zinc-900 p-4 rounded-[24px] border border-gray-50 dark:border-zinc-800 shadow-sm flex items-center justify-between hover:bg-md-surface-container transition-all cursor-pointer group active:scale-[0.98]"
                                >
                                    <div className="flex items-center gap-4">
                                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${data.type === 'lend' ? 'bg-rose-50 text-rose-600' : 'bg-emerald-50 text-emerald-600'}`}>
                                            {data.type === 'lend' ? <UserMinus size={18} /> : <UserPlus size={18} />}
                                        </div>
                                        <div>
                                            <p className="font-black text-sm text-md-on-surface leading-tight tracking-tight dark:text-white">{data.type === 'lend' ? 'Money Given' : 'Money Recovered'}</p>
                                            <div className="flex items-center gap-2 mt-0.5">
                                                <p className="text-[10px] font-black uppercase tracking-widest" style={{ color: acc?.color || '#999' }}>
                                                    {new Date(t.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })} • {acc?.name || 'Wallet'}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                    <p className={`font-black text-sm ${data.type === 'lend' ? 'text-rose-600' : 'text-emerald-600'}`}>
                                        {data.type === 'lend' ? '-' : '+'} Tk {t.amount.toLocaleString()}
                                    </p>
                                </div>
                            );
                        })
                    )}
                </div>
            </div>
         </div>
      </div>
  );
};

export default LendingView;
