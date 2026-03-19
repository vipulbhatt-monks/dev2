import React from 'react';
import {
  Plus,
  MessageSquare,
  Settings,
  Terminal,
  MoreHorizontal,
  Search
} from 'lucide-react';
import { AppMode } from '../types';

interface SidebarProps {
  onNewChat: () => void;
  isHidden?: boolean;
  currentMode: AppMode;
  setCurrentMode: (mode: AppMode) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ onNewChat, isHidden, currentMode, setCurrentMode }) => {
  return (
    <div className={`fixed left-0 top-0 h-full w-[60px] hover:w-[280px] bg-[#fbfbfd]/90 backdrop-blur-3xl border-r border-[#1d1d1f]/5 flex flex-col z-50 transition-all duration-700 ease-in-out group shadow-[4px_0_24px_-4px_rgba(0,0,0,0.02)] hover:bg-[#fbfbfd] overflow-hidden ${isHidden === true ? 'opacity-0 translate-x-[-100%] pointer-events-none' : 'opacity-100 translate-x-0'}`}>

      <div className="p-3 mb-2 flex flex-col gap-2">
        <div className="h-10 w-10 flex items-center justify-center rounded-xl bg-[#1d1d1f] text-white mb-4 shrink-0 shadow-md shadow-black/10 ring-1 ring-black/5">
          <Terminal className="w-5 h-5" />
        </div>

        <button
          onClick={onNewChat}
          className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-zinc-200/50 text-zinc-500 hover:text-zinc-900 transition-colors w-full overflow-hidden whitespace-nowrap"
        >
          <div className="w-5 h-5 flex items-center justify-center shrink-0">
            <Plus className="w-5 h-5" />
          </div>
          <span className="text-sm font-medium opacity-0 group-hover:opacity-100 transition-opacity duration-200 delay-75">New Session</span>
        </button>

        <button className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-zinc-200/50 text-zinc-500 hover:text-zinc-900 transition-colors w-full overflow-hidden whitespace-nowrap">
          <div className="w-5 h-5 flex items-center justify-center shrink-0">
            <Search className="w-4 h-4" />
          </div>
          <span className="text-sm font-medium opacity-0 group-hover:opacity-100 transition-opacity duration-200 delay-75">Search</span>
        </button>
      </div>


      <div className="flex-1 overflow-y-auto no-scrollbar px-3 pb-4">
        {/* Session history removed for session-less behavior */}
      </div>


      <div className="p-3 mt-auto border-t border-zinc-200/50">
        <button className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-zinc-200/50 text-zinc-500 hover:text-zinc-900 transition-colors w-full overflow-hidden whitespace-nowrap">
          <div className="w-5 h-5 flex items-center justify-center shrink-0">
            <Settings className="w-5 h-5" />
          </div>
          <span className="text-sm font-medium opacity-0 group-hover:opacity-100 transition-opacity duration-200 delay-75">Settings</span>
        </button>
      </div>
    </div>
  );
};

const SessionItem: React.FC<{ title: string; time: string; active?: boolean }> = ({ title, time, active }) => (
  <button className={`w-full text-left px-3 py-2.5 rounded-xl group/item flex items-center justify-between ${active ? 'bg-emerald-50 text-emerald-700 shadow-sm shadow-emerald-500/5 ring-1 ring-emerald-500/20 font-semibold' : 'text-zinc-500 border border-transparent hover:bg-zinc-50 hover:text-zinc-900'} transition-all`}>
    <div className="flex items-center gap-3 overflow-hidden">
      <MessageSquare className={`w-4 h-4 shrink-0 ${active ? 'text-emerald-600' : 'opacity-50 group-hover/item:opacity-80'}`} />
      <span className="text-[13px] truncate tracking-tight">{title}</span>
    </div>
  </button>
);

export default Sidebar;