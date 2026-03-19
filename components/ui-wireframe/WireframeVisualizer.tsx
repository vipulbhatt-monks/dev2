import React, { useEffect, useState } from 'react';
import { Layout, Smartphone, Monitor, Tablet, MousePointer2 } from 'lucide-react';

const WireframeVisualizer: React.FC = () => {
  const [frames, setFrames] = useState<number[]>([]);
  const [cursorPos, setCursorPos] = useState({ x: 50, y: 50 });

  useEffect(() => {
    const interval = setInterval(() => {
      setFrames(prev => {
        if (prev.length < 6) return [...prev, prev.length];
        return prev;
      });
    }, 800);

    const cursorInterval = setInterval(() => {
      setCursorPos({
        x: Math.random() * 80 + 10,
        y: Math.random() * 80 + 10,
      });
    }, 2000);

    return () => {
      clearInterval(interval);
      clearInterval(cursorInterval);
    };
  }, []);

  return (
    <div className="w-full h-full bg-[#1e1e1e] relative overflow-hidden flex flex-col items-center justify-center p-8 border-l border-white/10">
      {/* Grid Background */}
      <div className="absolute inset-0 opacity-10 pointer-events-none" 
           style={{ backgroundImage: 'radial-gradient(#ffffff 1px, transparent 1px)', backgroundSize: '20px 20px' }}>
      </div>

      <div className="absolute top-4 right-4 flex items-center gap-2 bg-black/50 px-3 py-1.5 rounded-full border border-white/10 backdrop-blur-md z-20">
        <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
        <span className="text-xs font-mono text-gray-300">GENERATING WIREFRAMES...</span>
      </div>

      {/* Simulated Figma Canvas */}
      <div className="relative w-full h-full max-w-4xl grid grid-cols-2 md:grid-cols-3 gap-6 auto-rows-min content-center">
        {frames.map((id) => (
          <div 
            key={id} 
            className="aspect-[9/16] bg-[#2c2c2c] rounded-xl border border-white/5 shadow-2xl overflow-hidden relative animate-in fade-in zoom-in duration-500"
            style={{ animationDelay: `${id * 100}ms` }}
          >
            {/* Header Skeleton */}
            <div className="h-12 border-b border-white/5 flex items-center px-3 justify-between">
              <div className="w-4 h-4 rounded-full bg-white/10" />
              <div className="w-20 h-2 rounded bg-white/10" />
              <div className="w-4 h-4 rounded-full bg-white/10" />
            </div>
            
            {/* Content Skeleton */}
            <div className="p-4 space-y-3">
              <div className="w-3/4 h-8 rounded bg-white/10 animate-pulse" />
              <div className="w-full h-32 rounded-lg bg-white/5 border border-white/5" />
              <div className="grid grid-cols-2 gap-2">
                <div className="h-20 rounded bg-white/5" />
                <div className="h-20 rounded bg-white/5" />
              </div>
              <div className="space-y-2 pt-2">
                <div className="w-full h-2 rounded bg-white/5" />
                <div className="w-5/6 h-2 rounded bg-white/5" />
                <div className="w-4/6 h-2 rounded bg-white/5" />
              </div>
            </div>

            {/* Floating Label */}
            <div className="absolute -top-6 left-0 text-[10px] font-mono text-gray-500 uppercase tracking-wider">
              Frame {id + 1}
            </div>
          </div>
        ))}
      </div>

      {/* Simulated Cursor */}
      <div 
        className="absolute z-30 transition-all duration-[2000ms] ease-in-out pointer-events-none"
        style={{ left: `${cursorPos.x}%`, top: `${cursorPos.y}%` }}
      >
        <MousePointer2 className="w-5 h-5 text-pink-500 fill-pink-500 transform -rotate-12 drop-shadow-lg" />
        <div className="absolute left-4 top-4 bg-pink-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded ml-1">
          AI Designer
        </div>
      </div>
    </div>
  );
};

export default WireframeVisualizer;
