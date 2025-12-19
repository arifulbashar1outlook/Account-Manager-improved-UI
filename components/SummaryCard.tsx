
import React from 'react';
import { LucideIcon } from 'lucide-react';

interface SummaryCardProps {
  title: string;
  amount: number;
  icon: LucideIcon;
  colorClass: string;
  bgClass: string;
}

const SummaryCard: React.FC<SummaryCardProps> = ({ title, amount, icon: Icon, colorClass, bgClass }) => {
  return (
    <div className="glass rounded-md-card p-5 flex flex-col justify-between transition-all hover:bg-white/80 dark:hover:bg-zinc-800/80 active:scale-[0.97] shadow-sm group">
      <div className="flex items-center gap-3 mb-3">
        <div className={`p-2.5 rounded-2xl ${bgClass} bg-opacity-10 dark:bg-opacity-20 group-hover:scale-110 transition-transform`}>
          <Icon className={`w-5 h-5 ${colorClass}`} />
        </div>
        <p className="text-md-on-surface-variant dark:text-gray-400 text-[10px] font-medium tracking-[0.2em] uppercase opacity-60">{title}</p>
      </div>
      <div>
        <h3 className={`text-2xl font-black tracking-tight truncate ${colorClass}`}>
          <span className="text-xs font-medium opacity-40 mr-1">Tk</span>
          {Math.abs(amount).toLocaleString('en-US')}
        </h3>
      </div>
    </div>
  );
};

export default SummaryCard;
