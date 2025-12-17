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
    <div className="bg-md-surface-container dark:bg-zinc-900 rounded-md-card p-4 flex flex-col justify-between transition-all hover:bg-md-surface-container-high active:scale-[0.97] md-ripple">
      <div className="flex items-center gap-3 mb-3">
        <div className={`p-2 rounded-xl ${bgClass} bg-opacity-15`}>
          <Icon className={`w-5 h-5 ${colorClass}`} />
        </div>
        <p className="text-md-on-surface-variant dark:text-gray-400 text-[11px] font-bold tracking-wider uppercase">{title}</p>
      </div>
      <div>
        <h3 className={`text-xl font-extrabold tracking-tight truncate ${colorClass}`}>
          <span className="text-sm font-medium opacity-60 mr-1">Tk</span>
          {Math.abs(amount).toLocaleString('en-US')}
        </h3>
      </div>
    </div>
  );
};

export default SummaryCard;