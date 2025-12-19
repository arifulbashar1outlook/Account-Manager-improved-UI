
import React, { useState } from 'react';
import { Edit2 } from 'lucide-react';

interface SwipeableItemProps {
  children: React.ReactNode;
  onEdit: () => void;
}

const SwipeableItem: React.FC<SwipeableItemProps> = ({ children, onEdit }) => {
  const [startX, setStartX] = useState(0);
  const [isSwiping, setIsSwiping] = useState(false);
  const [offset, setOffset] = useState(0);
  const threshold = 60;

  const handleTouchStart = (e: React.TouchEvent) => {
    setStartX(e.touches[0].clientX);
    setIsSwiping(true);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isSwiping) return;
    const diff = e.touches[0].clientX - startX;
    // ONLY allow right-swiping (positive offset) for editing.
    // Left-swiping (negative offset) is locked to 0.
    const limitedDiff = Math.max(0, Math.min(100, diff));
    setOffset(limitedDiff);
  };

  const handleTouchEnd = () => {
    setIsSwiping(false);
    if (offset > threshold) {
      onEdit();
    }
    setOffset(0);
  };

  return (
    <div className="swipe-container group relative">
      {/* Background Action: Only Edit remains */}
      <div className={`absolute inset-0 flex items-center px-6 transition-opacity duration-200 ${offset > 0 ? 'bg-md-primary/20 dark:bg-md-primary/40 justify-start' : 'opacity-0'}`}>
        {offset > 0 && <Edit2 size={24} className="text-md-primary dark:text-white" />}
      </div>
      
      {/* Content */}
      <div 
        className="swipe-content relative z-10"
        style={{ transform: `translateX(${offset}px)` }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {children}
      </div>
    </div>
  );
};

export default SwipeableItem;