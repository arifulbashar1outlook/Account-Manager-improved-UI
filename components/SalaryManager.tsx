
import React, { useState, useEffect } from 'react';
import { Plus, ArrowDownCircle, Wallet, ArrowRight, CalendarDays, Tag } from 'lucide-react';
import { Transaction, AccountType, Category, Account } from '../types';

interface SalaryManagerProps {
  onAddTransaction: (t: Omit<Transaction, 'id'>) => void;
  accounts: Account[];
}

const SalaryManager: React.FC<SalaryManagerProps> = ({ onAddTransaction, accounts }) => {
  const [activeTab, setActiveTab] = useState<'salary' | 'received'>('salary');
  
  // Shared Date State
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);

  // Salary State
  const [salaryAmount, setSalaryAmount] = useState<string>('');
  const [salaryTarget, setSalaryTarget] = useState<string>('');

  // Received Money State
  const [receivedAmount, setReceivedAmount] = useState('');
  const [receivedDesc, setReceivedDesc] = useState('');
  const [receivedCategory, setReceivedCategory] = useState<string>(Category.OTHER);
  const [receivedDestination, setReceivedDestination] = useState<AccountType>('');

  // Ensure accounts are loaded and selection is initialized
  useEffect(() => {
    if (accounts.length > 0) {
      if (!salaryTarget) {
        setSalaryTarget(accounts.find(a => a.id === 'salary')?.id || accounts[0]?.id || '');
      }
      if (!receivedDestination) {
        setReceivedDestination(accounts.find(a => a.id === 'cash')?.id || accounts[0]?.id || '');
      }
    }
  }, [accounts, salaryTarget, receivedDestination]);

  const handleAddSalary = () => {
    if (!salaryAmount || !salaryTarget) return;

    const accName = accounts.find(a => a.id === salaryTarget)?.name || 'Salary Account';

    // Protection against accidental touches
    const confirmMsg = `Are you sure you want to add Tk ${parseFloat(salaryAmount).toLocaleString()} to ${accName}?`;
    if (!window.confirm(confirmMsg)) {
        return;
    }

    onAddTransaction({
      amount: parseFloat(salaryAmount),
      type: 'income',
      category: Category.SALARY,
      description: 'Monthly Salary',
      date: new Date(date).toISOString(), // Ensure ISO string format
      accountId: salaryTarget 
    });

    setSalaryAmount('');
  };

  const handleAddReceivedMoney = () => {
    if (!receivedAmount || !receivedDestination) return;
    onAddTransaction({
      amount: parseFloat(receivedAmount),
      type: 'income',
      category: receivedCategory,
      description: receivedDesc || 'Received Money',
      date: new Date(date).toISOString(), // Ensure ISO string format
      accountId: receivedDestination
    });
    setReceivedAmount('');
    setReceivedDesc('');
    setReceivedCategory(Category.OTHER);
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden mb-6 transition-colors duration-200">
      {/* Tabs */}
      <div className="flex border-b border-gray-100 dark:border-gray-700 overflow-x-auto">
        <button
          onClick={() => setActiveTab('salary')}
          className={`flex-1 py-3 text-sm font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-colors min-w-[100px] ${
            activeTab === 'salary' 
              ? 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 border-b-2 border-indigo-600 dark:border-indigo-400' 
              : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700/50'
          }`}
        >
          <Wallet className="w-4 h-4" />
          Salary
        </button>
        <button
          onClick={() => setActiveTab('received')}
          className={`flex-1 py-3 text-sm font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-colors min-w-[100px] ${
            activeTab === 'received' 
              ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 border-b-2 border-emerald-600 dark:border-emerald-400' 
              : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700/50'
          }`}
        >
          <ArrowDownCircle className="w-4 h-4" />
          Receive
        </button>
      </div>

      <div className="p-6">
        {/* --- SALARY TAB --- */}
        {activeTab === 'salary' && (
          <div className="space-y-4">
            <div>
               <label className="block text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">Enter Monthly Salary</label>
               <div className="flex flex-col sm:flex-row gap-3">
                  <input 
                      type="date" 
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                      className="px-3 py-3 border-2 border-gray-200 dark:border-gray-600 rounded-xl focus:border-indigo-500 outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm font-bold"
                  />
                  <div className="relative flex-1">
                    <span className="absolute left-3 top-3 text-gray-400 font-black text-xs pt-0.5">Tk</span>
                    <input
                        type="number"
                        value={salaryAmount}
                        onChange={(e) => setSalaryAmount(e.target.value)}
                        placeholder="0"
                        className="w-full pl-9 pr-4 py-3 border-2 border-gray-200 dark:border-gray-600 rounded-xl focus:border-indigo-500 outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-lg font-black"
                    />
                  </div>
                  <button
                    onClick={handleAddSalary}
                    disabled={!salaryAmount || !salaryTarget}
                    className="px-6 py-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-all font-black text-xs uppercase tracking-widest disabled:opacity-50 active:scale-[0.98] flex items-center justify-center gap-2 sm:w-auto w-full shadow-lg"
                  >
                    <Plus className="w-5 h-5" />
                    Confirm
                  </button>
               </div>
               <div className="mt-4 flex items-center gap-3">
                   <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Target Wallet:</label>
                   <select 
                     value={salaryTarget}
                     onChange={(e) => setSalaryTarget(e.target.value)}
                     className="text-xs border-none bg-transparent outline-none font-black text-md-primary uppercase tracking-tight"
                   >
                       {accounts.map(a => (
                           <option key={a.id} value={a.id}>{a.name}</option>
                       ))}
                   </select>
               </div>
            </div>
          </div>
        )}

        {/* --- RECEIVED (GENERAL) TAB --- */}
        {activeTab === 'received' && (
          <div className="space-y-4">
             <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                 <div>
                   <label className="block text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1">Date</label>
                   <input 
                      type="date" 
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                      className="w-full px-4 py-3 border-2 border-gray-200 dark:border-gray-600 rounded-xl focus:border-emerald-500 outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm font-bold"
                   />
                 </div>
                 <div>
                   <label className="block text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1">Amount</label>
                   <div className="relative">
                      <span className="absolute left-3 top-3 text-gray-400 font-black text-xs pt-0.5">Tk</span>
                      <input
                        type="number"
                        value={receivedAmount}
                        onChange={(e) => setReceivedAmount(e.target.value)}
                        placeholder="0.00"
                        className="w-full pl-9 pr-4 py-3 border-2 border-gray-200 dark:border-gray-600 rounded-xl focus:border-emerald-500 outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white font-black"
                      />
                   </div>
                 </div>
             </div>

             <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
               <div>
                 <label className="block text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1">Category</label>
                 <div className="relative">
                    <Tag className="absolute left-3 top-3 text-emerald-500 w-4 h-4" />
                    <select
                        value={receivedCategory}
                        onChange={(e) => setReceivedCategory(e.target.value)}
                        className="w-full pl-9 pr-4 py-3 border-2 border-gray-200 dark:border-gray-600 rounded-xl focus:border-emerald-500 outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm font-black uppercase tracking-tight appearance-none"
                    >
                        {Object.values(Category).map(c => (
                            <option key={c} value={c}>{c}</option>
                        ))}
                    </select>
                 </div>
               </div>
               <div>
                 <label className="block text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1">Deposit To</label>
                 <select
                    value={receivedDestination}
                    onChange={(e) => setReceivedDestination(e.target.value as AccountType)}
                    className="w-full px-4 py-3 border-2 border-gray-200 dark:border-gray-600 rounded-xl focus:border-emerald-500 outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm font-black uppercase tracking-tight"
                  >
                    {accounts.map(a => (
                        <option key={a.id} value={a.id}>{a.name}</option>
                    ))}
                  </select>
               </div>
             </div>

             <div className="col-span-2">
                 <label className="block text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1">Description</label>
                 <input
                    type="text"
                    value={receivedDesc}
                    onChange={(e) => setReceivedDesc(e.target.value)}
                    placeholder="e.g. Gift, Bonus"
                    className="w-full px-4 py-3 border-2 border-gray-200 dark:border-gray-600 rounded-xl focus:border-emerald-500 outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm font-bold"
                  />
             </div>

             <button
              onClick={handleAddReceivedMoney}
              disabled={!receivedAmount || !receivedDestination}
              className="w-full flex items-center justify-center gap-2 bg-emerald-600 text-white py-4 rounded-xl hover:bg-emerald-700 transition-all font-black text-xs uppercase tracking-[0.2em] disabled:opacity-50 active:scale-[0.98] shadow-lg mt-2"
            >
              <Wallet className="w-5 h-5" />
              Receive Money
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default SalaryManager;
