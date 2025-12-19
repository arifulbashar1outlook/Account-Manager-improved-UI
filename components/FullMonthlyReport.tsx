
import React, { useState, useMemo } from 'react';
import { 
  TrendingUp, 
  TrendingDown, 
  ChevronLeft, 
  ChevronRight, 
  ChevronDown,
  ArrowRightLeft,
  Landmark,
  List,
  Target,
  Tag
} from 'lucide-react';
import { Transaction, Account } from '../types';

interface FullMonthlyReportProps {
    transactions: Transaction[];
    accounts: Account[];
}

const FullMonthlyReport: React.FC<FullMonthlyReportProps> = ({ transactions, accounts }) => {
    const [viewDate, setViewDate] = useState(new Date());
    const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({});
    const [expandedDays, setExpandedDays] = useState<Record<number, boolean>>({});
    const [activeReportType, setActiveReportType] = useState<'expense' | 'income' | 'transfer' | 'withdraw'>('expense');

    const changeMonth = (offset: number) => {
        const newDate = new Date(viewDate);
        newDate.setMonth(newDate.getMonth() + offset);
        setViewDate(newDate);
        setExpandedCategories({});
        setExpandedDays({});
    };

    const toggleCategory = (catName: string) => {
        setExpandedCategories(prev => ({ ...prev, [catName]: !prev[catName] }));
    };

    const toggleDay = (day: number) => {
        setExpandedDays(prev => ({ ...prev, [day]: !prev[day] }));
    };

    const currentMonth = viewDate.getMonth();
    const currentYear = viewDate.getFullYear();
    
    const monthTransactions = transactions.filter(t => {
        const d = new Date(t.date);
        return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
    });

    const yearStats = useMemo(() => {
        const yearTxs = transactions.filter(t => {
            const d = new Date(t.date);
            return d.getFullYear() === currentYear;
        });
        const income = yearTxs.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
        const expense = yearTxs.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
        return { income, expense, balance: income - expense };
    }, [transactions, currentYear]);

    const stats = useMemo(() => {
        const income = monthTransactions.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
        const expense = monthTransactions.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
        const transfer = monthTransactions.filter(t => t.type === 'transfer' && t.targetAccountId !== 'cash').reduce((s, t) => s + t.amount, 0);
        const withdraw = monthTransactions.filter(t => t.type === 'transfer' && t.targetAccountId === 'cash').reduce((s, t) => s + t.amount, 0);
        return { income, expense, transfer, withdraw };
    }, [monthTransactions]);

    const dailyGroups = useMemo(() => {
        const groups: Record<number, Transaction[]> = {};
        monthTransactions.forEach(t => {
            const day = new Date(t.date).getDate();
            if (!groups[day]) groups[day] = [];
            groups[day].push(t);
        });
        return groups;
    }, [monthTransactions]);

    const sortedDays = useMemo(() => 
        Object.keys(dailyGroups).map(Number).sort((a, b) => b - a),
    [dailyGroups]);

    const categoryGroups = useMemo(() => {
        const groups: Record<string, { transactions: Transaction[], total: number }> = {};
        const filtered = monthTransactions.filter(t => {
            if (activeReportType === 'withdraw') return t.type === 'transfer' && t.targetAccountId === 'cash';
            if (activeReportType === 'transfer') return t.type === 'transfer' && t.targetAccountId !== 'cash';
            return t.type === activeReportType;
        });
        filtered.forEach(t => {
            const catKey = t.category || 'Uncategorized';
            if (!groups[catKey]) groups[catKey] = { transactions: [], total: 0 };
            groups[catKey].transactions.push(t);
            groups[catKey].total += t.amount;
        });
        return Object.entries(groups).sort((a, b) => b[1].total - a[1].total);
    }, [monthTransactions, activeReportType]);

    const monthName = viewDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

    return (
        <div className="p-4 space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300 pb-32">
            <div className="bg-md-surface-container p-4 rounded-md-card flex justify-between items-center shadow-sm">
                <button onClick={() => changeMonth(-1)} className="p-2 hover:bg-white/20 rounded-full transition-colors"><ChevronLeft size={20}/></button>
                <div className="text-center">
                  <h2 className="font-[800] text-md-on-surface tracking-tight">{monthName}</h2>
                  <p className="text-[9px] font-black uppercase tracking-widest opacity-40">Monthly Performance</p>
                </div>
                <button onClick={() => changeMonth(1)} className="p-2 hover:bg-white/20 rounded-full transition-colors"><ChevronRight size={20}/></button>
            </div>

            <div className="grid grid-cols-2 gap-3">
                <StatBox label="Income" amount={stats.income} color="text-emerald-600" bg="bg-emerald-50" icon={TrendingUp} />
                <StatBox label="Expense" amount={stats.expense} color="text-rose-600" bg="bg-rose-50" icon={TrendingDown} />
                <StatBox label="Transfer" amount={stats.transfer} color="text-indigo-600" bg="bg-indigo-50" icon={ArrowRightLeft} />
                <StatBox label="Withdraw" amount={stats.withdraw} color="text-amber-600" bg="bg-amber-50" icon={Landmark} />
            </div>

            <div className="bg-md-primary-container p-6 rounded-md-card border border-md-primary/10 shadow-sm">
                <div className="flex items-center gap-2 mb-4">
                    <Target size={18} className="text-md-on-primary-container" />
                    <h3 className="font-black text-xs uppercase tracking-[0.2em] text-md-on-primary-container">Yearly Overview</h3>
                </div>
                <div className="grid grid-cols-3 gap-4">
                    <div>
                        <p className="text-[8px] font-black uppercase tracking-widest text-md-on-primary-container/60 mb-1">In</p>
                        <p className="text-sm font-black text-emerald-700">Tk {yearStats.income.toLocaleString()}</p>
                    </div>
                    <div className="border-x border-md-primary/10 px-4">
                        <p className="text-[8px] font-black uppercase tracking-widest text-md-on-primary-container/60 mb-1">Out</p>
                        <p className="text-sm font-black text-rose-700">Tk {yearStats.expense.toLocaleString()}</p>
                    </div>
                    <div>
                        <p className="text-[8px] font-black uppercase tracking-widest text-md-on-primary-container/60 mb-1">Balance</p>
                        <p className={`text-sm font-black ${yearStats.balance >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>Tk {yearStats.balance.toLocaleString()}</p>
                    </div>
                </div>
            </div>

            <div className="space-y-4">
                <div className="flex items-center gap-2 px-2">
                    <Tag size={16} className="text-md-primary" />
                    <h3 className="font-black text-xs uppercase tracking-[0.2em] text-md-on-surface-variant">Expense Breakdown</h3>
                </div>
                <div className="flex bg-md-surface-container p-1 rounded-full shadow-inner overflow-x-auto no-scrollbar">
                  {[
                    { id: 'expense', label: 'Spent', icon: TrendingDown },
                    { id: 'income', label: 'Received', icon: TrendingUp },
                    { id: 'transfer', label: 'Transfer', icon: ArrowRightLeft },
                    { id: 'withdraw', label: 'Withdraw', icon: Landmark }
                  ].map((btn) => (
                    <button
                      key={btn.id}
                      onClick={() => { setActiveReportType(btn.id as any); setExpandedCategories({}); }}
                      className={`flex-1 min-w-[80px] py-2.5 text-[10px] font-black rounded-full transition-all uppercase tracking-widest flex flex-col items-center gap-1 ${
                        activeReportType === btn.id ? 'bg-md-primary text-white shadow-md' : 'text-md-on-surface-variant hover:bg-black/5'
                      }`}
                    >
                      <btn.icon size={14} />
                      {btn.label}
                    </button>
                  ))}
                </div>
                <div className="space-y-3">
                  {categoryGroups.map(([catName, data]) => (
                      <div key={catName} className="bg-white dark:bg-zinc-900 rounded-3xl border border-gray-100 dark:border-zinc-800 overflow-hidden shadow-sm transition-all">
                          <button onClick={() => toggleCategory(catName)} className="w-full p-4 flex justify-between items-center hover:bg-md-surface-container">
                              <div className="flex items-center gap-3">
                                  <div className={`p-2 rounded-xl bg-md-surface-container ${expandedCategories[catName] ? 'rotate-180' : ''} transition-transform`}>
                                    <ChevronDown size={14} className="text-md-primary" />
                                  </div>
                                  <h4 className="font-black text-sm text-md-on-surface">{catName}</h4>
                              </div>
                              <p className={`font-black text-sm ${activeReportType === 'income' ? 'text-emerald-600' : 'text-rose-600'}`}>Tk {data.total.toLocaleString()}</p>
                          </button>
                          {expandedCategories[catName] && (
                              <div className="divide-y divide-gray-50 dark:divide-zinc-800 bg-gray-50 dark:bg-zinc-950/50">
                                  {data.transactions.map(t => (
                                      <div key={t.id} className="p-4 flex justify-between items-start animate-in slide-in-from-top-2 duration-200">
                                          <div className="space-y-0.5">
                                              <p className="text-sm font-[600] text-md-on-surface leading-tight dark:text-gray-100">{t.description}</p>
                                              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{new Date(t.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}</p>
                                          </div>
                                          <p className={`text-sm font-black ${activeReportType === 'income' ? 'text-emerald-600' : 'text-rose-600'}`}>Tk {t.amount.toLocaleString()}</p>
                                      </div>
                                  ))}
                              </div>
                          )}
                      </div>
                  ))}
                </div>
            </div>
            
            <div className="space-y-4">
                <div className="flex items-center gap-2 px-2">
                    <List size={16} className="text-md-primary" />
                    <h3 className="font-black text-xs uppercase tracking-[0.2em] text-md-on-surface-variant">Daily Activity</h3>
                </div>
                <div className="space-y-2">
                    {sortedDays.map(day => {
                        const dayTx = dailyGroups[day];
                        const dayOut = dayTx.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
                        const isExpanded = expandedDays[day];
                        return (
                            <div key={day} className="bg-white dark:bg-zinc-900 rounded-[24px] border border-gray-100 dark:border-zinc-800 shadow-sm overflow-hidden">
                                <button onClick={() => toggleDay(day)} className="w-full p-4 flex justify-between items-center text-left">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-full bg-md-primary text-white flex items-center justify-center text-[10px] font-black">
                                            {day}
                                        </div>
                                        <p className="text-xs font-black uppercase text-md-on-surface-variant">{monthName.split(' ')[0]} {day}</p>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <p className="text-sm font-black text-rose-600">Tk {dayOut.toLocaleString()}</p>
                                        <ChevronDown size={14} className={`text-gray-300 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                                    </div>
                                </button>
                                {isExpanded && (
                                    <div className="bg-gray-50 dark:bg-zinc-950/40 divide-y divide-gray-100 dark:divide-zinc-800">
                                        {dayTx.map(t => (
                                            <div key={t.id} className="p-3.5 flex justify-between items-center">
                                                <div className="flex flex-col">
                                                    <span className="text-sm font-bold">{t.description}</span>
                                                    <span className="text-[9px] font-black uppercase tracking-widest text-gray-400">{t.category}</span>
                                                </div>
                                                <span className={`text-sm font-black ${t.type === 'income' ? 'text-emerald-600' : 'text-rose-600'}`}>Tk {t.amount.toLocaleString()}</span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};

const StatBox = ({ label, amount, color, bg, icon: Icon }: any) => (
    <div className={`${bg} p-4 rounded-3xl border border-black/5 flex flex-col justify-between shadow-sm`}>
        <div className="flex items-center gap-2 opacity-60 mb-2">
            <Icon size={14} className={color} />
            <p className={`text-[9px] font-black uppercase tracking-widest ${color}`}>{label}</p>
        </div>
        <h3 className={`text-lg font-black tracking-tight ${color}`}>Tk {amount.toLocaleString()}</h3>
    </div>
);

export default FullMonthlyReport;
