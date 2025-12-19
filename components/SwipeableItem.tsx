
import React, { useState, useRef } from 'react';
import { Trash2, Edit2, Copy } from 'lucide-react';

interface SwipeableItemProps {
  children: React.ReactNode;
  onDelete: () => void;
  onEdit: () => void;
  onDuplicate?: () => void;
}

const SwipeableItem: React.FC<SwipeableItemProps> = ({ children, onDelete, onEdit, onDuplicate }) => {
  const [startX, setStartX] = useState(0);
  const [currentX, setCurrentX] = useState(0);
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
    // Limit swipe range
    const limitedDiff = Math.max(-100, Math.min(100, diff));
    setOffset(limitedDiff);
  };

  const handleTouchEnd = () => {
    setIsSwiping(false);
    if (offset < -threshold) {
      onDelete();
    } else if (offset > threshold) {
      onEdit();
    }
    setOffset(0);
  };

  return (
    <div className="swipe-container group">
      {/* Background Actions */}
      <div className={`absolute inset-0 flex items-center px-6 transition-opacity duration-200 ${offset < 0 ? 'bg-rose-500 justify-end' : offset > 0 ? 'bg-indigo-500 justify-start' : 'opacity-0'}`}>
        {offset < 0 && <Trash2 size={24} className="text-white" />}
        {offset > 0 && <Edit2 size={24} className="text-white" />}
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
