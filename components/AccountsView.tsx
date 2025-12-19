
import React, { useState } from 'react';
import { ArrowLeft, Plus, Edit2, Check, Save, Trash2, X, CreditCard } from 'lucide-react';
import { Account } from '../types';
import { v4 as uuidv4 } from 'uuid';

interface AccountsViewProps {
  accounts: Account[];
  onUpdateAccounts: (updater: Account[] | ((prev: Account[]) => Account[])) => void;
  onBack: () => void;
}

const PRESET_COLORS = [
  '#6366f1', '#10b981', '#f59e0b', '#ef4444', 
  '#ec4899', '#8b5cf6', '#14b8a6', '#0ea5e9', 
  '#f97316', '#64748b'
];

const AccountsView: React.FC<AccountsViewProps> = ({ accounts, onUpdateAccounts, onBack }) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editColor, setEditColor] = useState('#6366f1');

  const [newAccountName, setNewAccountName] = useState('');
  const [newAccountColor, setNewAccountColor] = useState('#6366f1');

  const handleStartEdit = (acc: Account) => {
    setEditingId(acc.id);
    setEditName(acc.name);
    setEditColor(acc.color || '#6366f1');
  };

  const handleSaveEdit = () => {
    if (!editName.trim()) return;
    onUpdateAccounts(prev => 
      prev.map(acc => acc.id === editingId ? { ...acc, name: editName, color: editColor } : acc)
    );
    setEditingId(null);
  };

  const handleDeleteAccount = (id: string) => {
    if (accounts.length <= 1) {
      alert("At least one wallet must remain.");
      return;
    }
    
    if (window.confirm("Are you sure you want to delete this wallet?\n\nRecords already saved using this wallet will remain in history, but they will show a generic wallet label.")) {
      onUpdateAccounts(prev => prev.filter(acc => acc.id !== id));
      setEditingId(null);
    }
  };

  const handleAddAccount = () => {
    if (!newAccountName.trim()) return;
    const newAccount: Account = {
      id: uuidv4(),
      name: newAccountName,
      color: newAccountColor
    };
    onUpdateAccounts(prev => [...prev, newAccount]);
    setNewAccountName('');
    setNewAccountColor('#6366f1');
  };

  return (
    <div className="max-w-md mx-auto min-h-screen bg-md-surface dark:bg-zinc-950 pb-32 animate-in fade-in duration-300">
      <div className="px-6 space-y-6">
          <div className="flex items-center gap-3 pt-4 pb-2">
              <CreditCard className="text-md-primary" size={24} />
              <h2 className="text-3xl font-black tracking-tight text-md-on-surface">Wallets</h2>
          </div>
      </div>

      <div className="p-5 space-y-8">
        <div className="bg-md-surface-container-high dark:bg-zinc-900 p-6 rounded-[32px] border border-gray-100 dark:border-zinc-800 shadow-sm space-y-5">
            <div className="flex items-center justify-between">
                <h3 className="text-[11px] font-black uppercase tracking-widest text-md-primary">Create New Wallet</h3>
                <div className="w-4 h-4 rounded-full shadow-inner" style={{ backgroundColor: newAccountColor }}></div>
            </div>
            <div className="flex gap-3">
                <input 
                  type="text"
                  value={newAccountName}
                  onChange={(e) => setNewAccountName(e.target.value)}
                  className="flex-1 px-5 py-4 bg-white dark:bg-zinc-800 rounded-2xl border-none text-sm font-black outline-none focus:ring-2 focus:ring-md-primary/20 shadow-inner dark:text-white"
                  placeholder="e.g. Bkash, Personal"
                />
                <button 
                  type="button"
                  onClick={handleAddAccount}
                  disabled={!newAccountName.trim()}
                  className="bg-md-primary text-white px-6 py-4 rounded-2xl hover:bg-md-primary/90 shadow-md disabled:opacity-50 font-black text-xs uppercase tracking-widest active:scale-95 transition-all"
                >
                    Add
                </button>
            </div>
            <div className="flex flex-wrap gap-2.5 pt-2">
               {PRESET_COLORS.map(c => (
                 <button 
                    key={c} 
                    type="button"
                    onClick={() => setNewAccountColor(c)}
                    className={`w-8 h-8 rounded-full border-2 transition-transform active:scale-90 ${newAccountColor === c ? 'border-md-primary scale-110 shadow-md' : 'border-transparent'}`}
                    style={{ backgroundColor: c }}
                 />
               ))}
            </div>
        </div>

        <div className="space-y-4">
            <div className="flex items-center gap-2 ml-2">
                <div className="w-1.5 h-1.5 rounded-full bg-md-primary"></div>
                <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-md-on-surface-variant">Active Wallets</h3>
            </div>
            
            <div className="grid gap-3">
                {accounts.map(acc => (
                    <div key={acc.id} className="bg-white dark:bg-zinc-900 p-5 rounded-[28px] border border-gray-100 dark:border-zinc-800 flex flex-col gap-4 shadow-sm transition-all">
                        {editingId === acc.id ? (
                           <div className="space-y-4 animate-in fade-in duration-200">
                             <div className="flex items-center gap-2">
                               <input 
                                  value={editName}
                                  onChange={(e) => setEditName(e.target.value)}
                                  className="flex-1 px-4 py-3 bg-md-surface-container dark:bg-zinc-800 rounded-xl text-sm font-black outline-none border-2 border-md-primary/30 dark:text-white"
                                  autoFocus
                               />
                               <div className="flex gap-1.5">
                                 <button 
                                   type="button"
                                   onClick={() => handleDeleteAccount(acc.id)} 
                                   title="Delete Wallet"
                                   className="bg-rose-50 dark:bg-rose-900/40 text-rose-600 p-3 rounded-xl hover:bg-rose-100 transition-colors"
                                 >
                                     <Trash2 size={20} />
                                 </button>
                                 <button 
                                   type="button"
                                   onClick={handleSaveEdit} 
                                   title="Save Changes"
                                   className="bg-md-primary text-white p-3 rounded-xl hover:bg-md-primary/90 transition-colors shadow-md"
                                 >
                                     <Check size={20} />
                                 </button>
                                 <button 
                                   type="button"
                                   onClick={() => setEditingId(null)} 
                                   title="Cancel"
                                   className="bg-gray-100 dark:bg-gray-700 p-3 rounded-xl text-md-on-surface"
                                 >
                                     <X size={20} />
                                 </button>
                               </div>
                             </div>
                             <div className="flex flex-wrap gap-2">
                               {PRESET_COLORS.map(c => (
                                 <button 
                                    key={c} 
                                    type="button"
                                    onClick={() => setEditColor(c)}
                                    className={`w-7 h-7 rounded-full border-2 transition-all ${editColor === c ? 'border-md-primary scale-110 shadow-sm' : 'border-transparent'}`}
                                    style={{ backgroundColor: c }}
                                 />
                               ))}
                             </div>
                           </div>
                        ) : (
                           <div className="flex justify-between items-center group">
                             <div className="flex items-center gap-4">
                               <div className="w-1.5 h-10 rounded-full" style={{ backgroundColor: acc.color }}></div>
                               <p className="font-black text-lg tracking-tight" style={{ color: acc.color }}>{acc.name}</p>
                             </div>
                             <button type="button" onClick={() => handleStartEdit(acc)} className="text-gray-300 hover:text-md-primary p-3 rounded-xl hover:bg-md-surface-container transition-all">
                                 <Edit2 size={18} />
                             </button>
                           </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
      </div>
    </div>
  );
};

export default AccountsView;
