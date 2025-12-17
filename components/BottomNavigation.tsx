import React from 'react';
import { ShoppingBag, LayoutDashboard, History, ClipboardList } from 'lucide-react';

interface BottomNavigationProps {
  activeTab: string;
  onTabChange: (tab: any) => void;
}

const BottomNavigation: React.FC<BottomNavigationProps> = ({ activeTab, onTabChange }) => {
  return (
    <div className="fixed bottom-0 left-0 right-0 bg-md-surface-container dark:bg-zinc-950 border-t border-gray-200 dark:border-zinc-800 px-2 pt-3 pb-safe z-40 h-[84px]">
      <div className="max-w-md mx-auto flex justify-between items-center h-full">
        
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
      className="flex flex-col items-center flex-1 h-full pt-1"
    >
      <div className={`relative px-5 py-1 rounded-md-full transition-all duration-300 ${
        active ? 'bg-md-secondary-container text-md-on-secondary-container' : 'text-md-on-surface-variant hover:bg-md-surface-container-high'
      }`}>
        <Icon className="w-6 h-6" />
      </div>
      <span className={`text-[11px] mt-1 font-medium transition-colors ${
        active ? 'text-md-on-surface font-bold' : 'text-md-on-surface-variant'
      }`}>
        {label}
      </span>
    </button>
  );
};

export default BottomNavigation;