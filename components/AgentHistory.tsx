import React from 'react';
import { CheckCircle2, Loader2, Download, Edit3, Wrench, FileCode, Check, Terminal, Cpu, Zap, Scan } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface AgentAction {
  id: string;
  label: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  details?: string[];
}

interface AgentHistoryProps {
  actions: AgentAction[];
}

const AgentHistory: React.FC<AgentHistoryProps> = ({ actions }) => {
  if (!actions || actions.length === 0) return null;

  return (
    <div className="w-full max-w-2xl bg-black/90 text-cyan-50 rounded-xl border border-cyan-900/30 p-4 font-mono shadow-[0_0_30px_rgba(8,145,178,0.1)] my-4 relative overflow-hidden backdrop-blur-xl">
      {/* Background Grid Effect */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#083344_1px,transparent_1px),linear-gradient(to_bottom,#083344_1px,transparent_1px)] bg-[size:24px_24px] opacity-20 pointer-events-none" />
      
      {/* Scanning Line */}
      <motion.div 
        className="absolute top-0 left-0 w-full h-[2px] bg-cyan-500/50 shadow-[0_0_10px_#06b6d4]"
        animate={{ top: ['0%', '100%', '0%'] }}
        transition={{ duration: 8, ease: "linear", repeat: Infinity }}
      />

      <div className="flex items-center justify-between mb-4 relative z-10 border-b border-cyan-900/30 pb-2">
        <div className="flex items-center gap-2 text-cyan-400">
          <div className="p-1.5 bg-cyan-950/50 rounded border border-cyan-800">
              <Terminal className="w-3.5 h-3.5" />
          </div>
          <span className="font-bold text-xs tracking-widest uppercase">Agent Execution Log</span>
        </div>
        <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 bg-cyan-500 rounded-full animate-pulse" />
            <span className="text-[10px] text-cyan-600 uppercase tracking-wider">System Active</span>
        </div>
      </div>
      
      <div className="space-y-4 relative z-10 pl-1">
        <AnimatePresence>
          {actions.map((action, index) => (
            <motion.div 
              key={action.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3, delay: index * 0.1 }}
              className="flex flex-col gap-1 group"
            >
              <div className="flex items-center gap-3">
                <div className="w-6 flex justify-center items-center relative">
                  {action.status === 'running' ? (
                    <div className="relative">
                        <div className="absolute inset-0 bg-cyan-500 blur-sm opacity-50 animate-pulse rounded-full" />
                        <Loader2 className="w-4 h-4 animate-spin text-cyan-400 relative z-10" />
                    </div>
                  ) : action.status === 'completed' ? (
                    <div className="w-4 h-4 rounded-full bg-emerald-500/20 flex items-center justify-center border border-emerald-500/50">
                        <Check className="w-2.5 h-2.5 text-emerald-400" />
                    </div>
                  ) : (
                    <div className="w-1.5 h-1.5 rounded-full bg-gray-700" />
                  )}
                  {index < actions.length - 1 && (
                      <div className="absolute top-6 bottom-[-10px] w-px bg-cyan-900/30 left-1/2 -translate-x-1/2" />
                  )}
                </div>
                
                <div className="flex items-center gap-2 text-xs flex-1">
                  <span className={`font-medium tracking-wide ${
                      action.status === 'running' ? 'text-cyan-300' : 
                      action.status === 'completed' ? 'text-emerald-400/80' : 'text-gray-500'
                  }`}>
                    {action.label}
                  </span>
                  {action.status === 'running' && (
                      <span className="text-[9px] text-cyan-600 animate-pulse">PROCESSING...</span>
                  )}
                </div>
              </div>

              {/* Details (e.g. file list) */}
              {action.details && action.details.length > 0 && (
                <motion.div 
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    className="ml-9 mt-1 space-y-1 border-l border-cyan-900/30 pl-3 py-1"
                >
                  {action.details.map((detail, idx) => (
                    <motion.div 
                      key={idx}
                      initial={{ opacity: 0, x: -5 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.05 }}
                      className="flex items-center gap-2 text-[10px] text-cyan-200/60 font-mono"
                    >
                      <span className="w-1 h-px bg-cyan-700" />
                      <span>{detail}</span>
                    </motion.div>
                  ))}
                </motion.div>
              )}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default AgentHistory;
