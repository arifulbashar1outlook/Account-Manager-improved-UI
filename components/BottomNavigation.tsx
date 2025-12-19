
import React from 'react';
import { ShoppingBag, LayoutDashboard, History, ClipboardList } from 'lucide-react';

interface BottomNavigationProps {
  activeTab: string;
  onTabChange: (tab: any) => void;
}

const BottomNavigation: React.FC<BottomNavigationProps> = ({ activeTab, onTabChange }) => {
  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 animate-in slide-in-from-bottom-full duration-500">
      <div className="w-full bg-md-surface-container/95 dark:bg-zinc-950/95 backdrop-blur-xl border-t border-gray-200 dark:border-zinc-800 flex justify-around items-center h-[56px] shadow-[0_-4px_20px_rgba(0,0,0,0.1)] overflow-hidden">
        
        <NavItem 
          icon={LayoutDashboard} 
          label="Home" 
          active={activeTab === 'dashboard'} 
          onClick={() => onTabChange('dashboard')} 
        />

        <NavItem 
          icon={ShoppingBag} 
          label="Bazar" 
          active={activeTab === 'bazar'} 
          onClick={() => onTabChange('bazar')} 
        />

        <NavItem 
          icon={ClipboardList} 
          label="Report" 
          active={activeTab === 'full-report'} 
          onClick={() => onTabChange('full-report')} 
        />

        <NavItem 
          icon={History} 
          label="History" 
          active={activeTab === 'history'} 
          onClick={() => onTabChange('history')} 
        />

      </div>
      {/* Spacer for iOS home bar */}
      <div className="bg-md-surface-container/95 dark:bg-zinc-950/95 h-[env(safe-area-inset-bottom)]"></div>
    </div>
  );
};

interface NavItemProps {
  icon: any;
  label: string;
  active: boolean;
  onClick: () => void;
}

const NavItem: React.FC<NavItemProps> = ({ icon: Icon, label, active, onClick }) => {
  return (
    <button
      onClick={onClick}
      className="group flex flex-col items-center justify-center flex-1 h-full relative transition-all active:scale-95 outline-none"
    >
      <div className={`relative px-6 py-1.5 rounded-full transition-all duration-300 group-hover:bg-black/5 dark:group-hover:bg-white/5 ${
        active ? 'bg-md-primary/10 text-md-primary' : 'text-md-on-surface-variant'
      }`}>
        <Icon className={`w-5 h-5 transition-transform duration-300 ${active ? 'scale-110 stroke-[2.5px]' : 'group-hover:scale-110'}`} />
      </div>
      <span className={`text-[8px] mt-0.5 font-black uppercase tracking-tighter transition-colors ${
        active ? 'text-md-primary' : 'text-md-on-surface-variant opacity-70'
      }`}>
        {label}
      </span>
    </button>
  );
};

export default BottomNavigation;
