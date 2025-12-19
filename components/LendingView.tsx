
import React, { useState, useMemo } from 'react';
import { 
  Search, 
  ArrowLeft, 
  Plus, 
  Trash2, 
  ChevronRight, 
  X, 
  Edit2, 
  AlertTriangle, 
  HandCoins, 
  Clock, 
  ArrowUpCircle, 
  ArrowDownCircle,
  ChevronDown,
  Calendar
} from 'lucide-react';
import { Transaction, Category, AccountType, Account } from '../types';
import SwipeableItem from './SwipeableItem';

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
  const [formMode, setFormMode] = useState<'give' | 'receive'>('give');
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
    const giveMatch = t.description.match(/(Lent to|Given to)\s+(.*)/i);
    const receiveMatch = t.description.match(/(Returned by|Received from)\s+(.*)/i);
    if (giveMatch) return { name: giveMatch[2].trim(), type: 'give', amount: t.amount };
    if (receiveMatch) return { name: receiveMatch[2].trim(), type: 'receive', amount: t.amount };
    return null;
  };

  const peopleData = useMemo(() => {
    const people: Record<string, { balance: number, lastTxDate: string }> = {};
    transactions.forEach(t => {
      const data = getPersonData(t);
      if (!data) return;
      if (!people[data.name]) people[data.name] = { balance: 0, lastTxDate: t.date };
      if (data.type === 'give') people[data.name].balance += data.amount;
      else people[data.name].balance -= data.amount;
      if (new Date(t.date) > new Date(people[data.name].lastTxDate)) people[data.name].lastTxDate = t.date;
    });
    return Object.entries(people).map(([name, data]) => ({ name, ...data })).sort((a, b) => new Date(b.lastTxDate).getTime() - new Date(a.lastTxDate).getTime());
  }, [transactions]);

  const maxBalance = useMemo(() => {
      const vals = peopleData.map(p => Math.abs(p.balance));
      return vals.length > 0 ? Math.max(...vals) : 1000;
  }, [peopleData]);

  const filteredPeople = peopleData.filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()));
  const personTransactions = useMemo(() => {
    if (!selectedPerson) return [];
    return transactions.filter(t => {
      const data = getPersonData(t);
      return data && data.name === selectedPerson;
    }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [transactions, selectedPerson]);

  const handleTransaction = () => {
    if (!amount || !selectedPerson) return;
    const description = formMode === 'give' ? `Given to ${selectedPerson}` : `Received from ${selectedPerson}`;
    const type = formMode === 'give' ? 'expense' : 'income';
    onAddTransaction({ amount: parseFloat(amount), type, category: Category.LENDING, description, date: new Date(date).toISOString(), accountId: account });
    setAmount('');
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
    onUpdateTransaction({ ...editingTx, description: editDesc, amount: parseFloat(editAmount), date: new Date(editDate).toISOString(), accountId: editAccount });
    setEditingTx(null);
  };

  if (!selectedPerson) {
    return (
      <div className="max-w-md mx-auto min-h-screen bg-md-surface dark:bg-zinc-950 pb-32 animate-in fade-in duration-300">
         {renamingPerson && (
            <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
                <div className="bg-white dark:bg-zinc-900 rounded-[28px] shadow-2xl w-full max-w-sm p-6 space-y-6">
                    <h3 className="text-xl font-bold">Edit Name</h3>
                    <input type="text" value={renamingPerson.newName} onChange={(e) => setRenamingPerson({ ...renamingPerson, newName: e.target.value })} className="w-full px-4 py-3 bg-md-surface-container dark:bg-zinc-800 rounded-xl outline-none font-black" autoFocus />
                    <div className="flex justify-end gap-2 pt-4 border-t dark:border-zinc-800">
                        <button type="button" onClick={() => setRenamingPerson(null)} className="px-5 py-2.5 text-sm font-black rounded-full">Cancel</button>
                        <button type="button" onClick={() => { transactions.forEach(t => { const d = getPersonData(t); if(d && d.name === renamingPerson.oldName) onUpdateTransaction({ ...t, description: t.description.replace(renamingPerson.oldName, renamingPerson.newName) }); }); setRenamingPerson(null); }} className="px-6 py-2.5 bg-md-primary text-white text-sm font-black rounded-full">Update</button>
                    </div>
                </div>
            </div>
         )}
         <div className="px-6 pt-4 space-y-6">
            <div className="flex items-center gap-3 pt-4 pb-2"><HandCoins className="text-md-primary" size={24} /><h2 className="text-3xl font-black tracking-tight text-md-on-surface">Lending</h2></div>
            <div className="relative group">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-md-on-surface-variant"><Search size={20} /></div>
                <input type="text" placeholder="Search name..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full bg-md-surface-container px-12 py-4 rounded-full text-sm font-black outline-none border-2 border-transparent focus:border-md-primary/30 dark:bg-zinc-800 dark:text-white" />
                <button type="button" onClick={() => setIsAddingNew(true)} className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-md-primary text-white rounded-full"><Plus size={20} /></button>
            </div>
         </div>
         <div className="px-4 mt-6 space-y-3">
            {filteredPeople.map(p => (
                <div key={p.name} onClick={() => setSelectedPerson(p.name)} className="bg-white dark:bg-zinc-900 p-5 rounded-[28px] border border-gray-100 dark:border-zinc-800 shadow-sm flex flex-col gap-4 cursor-pointer active:scale-[0.98]">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-2xl bg-md-primary-container text-md-primary flex items-center justify-center font-black text-lg">{p.name.charAt(0).toUpperCase()}</div>
                            <div><h3 className="font-black text-sm dark:text-white">{p.name}</h3><p className="text-[10px] font-black text-gray-400">Balance: Tk {Math.abs(p.balance).toLocaleString()}</p></div>
                        </div>
                        <ChevronRight size={18} className="text-gray-300" />
                    </div>
                </div>
            ))}
         </div>
      </div>
    );
  }

  return (
      <div className="max-w-md mx-auto min-h-screen bg-md-surface dark:bg-zinc-950 pb-32 animate-in slide-in-from-right duration-400">
         {editingTx && (
            <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-black/40 backdrop-blur-sm">
                <div className="bg-white dark:bg-zinc-900 rounded-[28px] shadow-2xl w-full max-w-sm p-6 space-y-5">
                    <h3 className="text-xl font-bold">Edit Record</h3>
                    <input type="text" value={editDesc} onChange={(e) => setEditDesc(e.target.value)} className="w-full px-4 py-3 bg-md-surface-container dark:bg-zinc-800 rounded-xl outline-none font-black dark:text-white" />
                    <input type="number" value={editAmount} onChange={(e) => setEditAmount(e.target.value)} className="w-full px-4 py-3 bg-md-surface-container dark:bg-zinc-800 rounded-xl font-bold dark:text-white" />
                    <div className="flex justify-between items-center pt-4 border-t dark:border-zinc-800">
                        <button type="button" onClick={() => { if(confirm("Delete record?")) { onDeleteTransaction(editingTx.id); setEditingTx(null); } }} className="p-3 text-rose-500"><Trash2 size={20} /></button>
                        <div className="flex gap-2">
                            <button type="button" onClick={() => setEditingTx(null)} className="px-5 py-2.5 text-sm font-black">Cancel</button>
                            <button type="button" onClick={saveEdit} className="px-6 py-2.5 bg-md-primary text-white text-sm font-black rounded-full">Save</button>
                        </div>
                    </div>
                </div>
            </div>
         )}
         <div className="p-4 space-y-6">
            <button onClick={() => setSelectedPerson(null)} className="flex items-center gap-2 text-md-primary"><ArrowLeft size={16} /><span className="text-xs font-black uppercase">Back</span></button>
            <div className="bg-white dark:bg-zinc-900 p-6 rounded-[28px] border border-gray-100 dark:border-zinc-800 shadow-sm space-y-5">
                <div className="flex bg-md-surface-container dark:bg-zinc-900 p-1 rounded-full">
                    <button onClick={() => setFormMode('give')} className={`flex-1 py-2.5 rounded-full text-[10px] font-black uppercase tracking-widest ${formMode === 'give' ? 'bg-md-primary text-white' : 'text-md-on-surface-variant'}`}>Give</button>
                    <button onClick={() => setFormMode('receive')} className={`flex-1 py-2.5 rounded-full text-[10px] font-black uppercase tracking-widest ${formMode === 'receive' ? 'bg-md-primary text-white' : 'text-md-on-surface-variant'}`}>Receive</button>
                </div>
                <div className="flex gap-3">
                    <input type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="Tk Amount" className="flex-1 px-4 py-4 bg-md-surface-container dark:bg-zinc-800 rounded-2xl outline-none font-black text-lg" />
                    <button onClick={handleTransaction} disabled={!amount} className="bg-md-primary text-white p-4 rounded-2xl disabled:opacity-50"><Plus size={24} /></button>
                </div>
            </div>
            <div className="space-y-4">
                <div className="flex items-center gap-2 ml-2"><HandCoins size={14} className="text-md-primary" /><h4 className="text-[10px] font-black uppercase opacity-60">Record History</h4></div>
                <div className="space-y-3">
                    {personTransactions.map(t => {
                        const data = getPersonData(t)!;
                        return (
                            <SwipeableItem key={t.id} onEdit={() => startEditing(t)}>
                                <div onClick={() => startEditing(t)} className="bg-white dark:bg-zinc-900 p-4 rounded-[24px] border border-gray-50 dark:border-zinc-800 shadow-sm flex items-center justify-between cursor-pointer group">
                                    <div className="flex items-center gap-4">
                                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${data.type === 'give' ? 'bg-rose-50 text-rose-600' : 'bg-emerald-50 text-emerald-600'}`}>{data.type === 'give' ? <ArrowUpCircle size={18} /> : <ArrowDownCircle size={18} />}</div>
                                        <div><p className="font-black text-sm dark:text-white">{data.type === 'give' ? 'Given' : 'Received'}</p><p className="text-[10px] font-black text-gray-400">{new Date(t.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}</p></div>
                                    </div>
                                    <p className={`font-black text-sm ${data.type === 'give' ? 'text-rose-600' : 'text-emerald-600'}`}>{data.type === 'give' ? '-' : '+'} Tk {t.amount.toLocaleString()}</p>
                                </div>
                            </SwipeableItem>
                        );
                    })}
                </div>
            </div>
         </div>
      </div>
  );
};

export default LendingView;