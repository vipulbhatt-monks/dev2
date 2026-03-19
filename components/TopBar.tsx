'use client';

import React from 'react';
import { Plus, X } from 'lucide-react';

interface TopBarProps {
  onNewChat: () => void;
}

const MoreHorizontalIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="1" />
        <circle cx="19" cy="12" r="1" />
        <circle cx="5" cy="12" r="1" />
    </svg>
)

const TopBar: React.FC<TopBarProps> = ({ onNewChat }) => {
  return (
    <div className="flex items-center justify-between p-4 px-6">

      <div className="flex items-center gap-2">
         <button className="p-2 hover:bg-gray-100 rounded-lg text-gray-400" onClick={onNewChat}>
            <Plus className="w-5 h-5" />
         </button>

         <div className="flex items-center gap-2 bg-gray-100/50 p-1 pr-3 rounded-lg">
            <div className="flex items-center gap-2 px-2 py-1 bg-white shadow-sm rounded-md">
                <div className="w-4 h-4 rounded-full bg-pink-400 flex items-center justify-center text-[8px] text-white">J</div>
                <span className="text-xs font-semibold text-gray-700">Judha | Dribbble</span>
            </div>
            <div className="flex items-center gap-2 px-2 py-1 hover:bg-white/50 rounded-md transition-colors cursor-pointer">
                 <div className="w-4 h-4 rounded-full bg-blue-600 flex items-center justify-center">
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="white"><path d="M12 2L2 7L12 12L22 7L12 2Z"/></svg>
                 </div>
                 <span className="text-xs font-medium text-gray-500">Emura Studio</span>
            </div>
             <div className="flex items-center gap-2 px-2 py-1 hover:bg-white/50 rounded-md transition-colors cursor-pointer">
                 <div className="w-4 h-4 rounded-full bg-indigo-600 flex items-center justify-center">
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="white"><path d="M2 17L12 22L22 17"/></svg>
                 </div>
                 <span className="text-xs font-medium text-gray-500">BeeBot</span>
                 <X className="w-3 h-3 text-gray-400 ml-1" />
            </div>
         </div>
         <button className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400">
            <MoreHorizontalIcon />
         </button>
      </div>

      <div className="flex items-center gap-4">
      
      </div>
    </div>
  );
};

export default TopBar;