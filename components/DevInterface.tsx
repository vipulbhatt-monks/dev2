import React, { useState, useEffect } from 'react';
import {
    CheckCircle2, FileText, Layout, ArrowRight, Terminal,
    ExternalLink, Command, ShieldCheck, Box, Package,
    Cpu, Code2, Globe, Orbit
} from 'lucide-react';
import { WireframeData } from './ui-wireframe/types';
import { motion, AnimatePresence } from 'framer-motion';

interface DevInterfaceProps {
    onLaunch: () => void;
    onNextToUAT: () => void;
    onUploadRequirements: (file: File) => void;
    onUploadBlueprint: (file: File) => void;
    isLaunched: boolean;
    launchMessage: string | null;
    requirements: Record<string, string>;
    wireframeData: WireframeData | null;
    projectPath: string;
    isReqFinished?: boolean;
    onSync?: () => void;
}

export const DevInterface: React.FC<DevInterfaceProps> = ({
    onLaunch,
    onNextToUAT,
    onUploadRequirements,
    onUploadBlueprint,
    isLaunched,
    launchMessage,
    requirements,
    wireframeData,
    projectPath,
    isReqFinished = false,
    onSync,
}) => {
    const [isBuilding, setIsBuilding] = useState(false);
    const [progress, setProgress] = useState(0);
    const [statusText, setStatusText] = useState("System Ready");

    const hasRequirements = Object.keys(requirements).length > 0;
    const hasWireframe = wireframeData !== null;
    const canLaunch = hasRequirements && hasWireframe;

    useEffect(() => {
        if (isLaunched && progress === 0) {
            setIsBuilding(true);
            let current = 0;
            const steps = [
                { p: 15, t: "Initializing Environment" },
                { p: 40, t: "Mapping Dependencies" },
                { p: 65, t: "Scaffolding Architecture" },
                { p: 85, t: "Finalizing Build" },
                { p: 100, t: "Synthesis Complete" }
            ];

            const interval = setInterval(() => {
                if (current < steps.length) {
                    setProgress(steps[current].p);
                    setStatusText(steps[current].t);
                    current++;
                } else {
                    setIsBuilding(false);
                    clearInterval(interval);
                }
            }, 600);
            return () => clearInterval(interval);
        }
    }, [isLaunched]);

    const StatusLine = ({
        label,
        status,
        icon: Icon,
        onUpload
    }: {
        label: string;
        status: boolean;
        icon: any;
        onUpload: (f: File) => void
    }) => (
        <div className="flex items-center justify-between py-6 border-b border-zinc-100 last:border-0 group">
            <div className="flex items-center gap-4">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${status ? 'bg-zinc-900 text-white' : 'bg-zinc-50 text-zinc-400'}`}>
                    <Icon className="w-5 h-5" strokeWidth={1.5} />
                </div>
                <div>
                    <div className="text-sm font-bold text-zinc-900 tracking-tight">{label}</div>
                    <div className="text-[11px] font-medium text-zinc-400 tracking-wider uppercase mt-0.5">
                        {status ? 'Status: Ingested' : 'Status: Awaiting Input'}
                    </div>
                </div>
            </div>

            {!status ? (
                <label className="px-4 py-2 rounded-lg bg-zinc-50 hover:bg-zinc-100 text-zinc-500 hover:text-zinc-900 text-xs font-bold tracking-wider uppercase transition-all cursor-pointer border border-zinc-200/50">
                    Upload
                    <input type="file" className="hidden" onChange={(e) => e.target.files?.[0] && onUpload(e.target.files[0])} />
                </label>
            ) : (
                <CheckCircle2 className="w-5 h-5 text-emerald-500" />
            )}
        </div>
    );

    return (
        <div className="flex-1 flex flex-col h-full bg-white overflow-hidden relative selection:bg-black selection:text-white">
            <div className="flex-1 flex flex-col items-center justify-center p-8 w-full max-w-2xl mx-auto">

                {/* Minimal Header */}
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-center mb-16"
                >
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-zinc-50 border border-zinc-100 mb-4">
                        <Package className="w-3 h-3 text-zinc-400" />
                        <span className="text-[10px] font-bold text-zinc-400 tracking-[0.2em] uppercase">Development Terminal</span>
                    </div>
                    <h1 className="text-4xl font-black text-zinc-900 tracking-tightest">Development Engine.</h1>
                </motion.div>

                <div className="w-full">
                    {!isLaunched ? (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 0.1 }}
                            className="space-y-2"
                        >
                            <div className="bg-white border border-zinc-100 rounded-[32px] p-8 shadow-[0_20px_50px_-15px_rgba(0,0,0,0.03)]">
                                <StatusLine
                                    label="Requirement Specification"
                                    status={hasRequirements}
                                    icon={FileText}
                                    onUpload={onUploadRequirements}
                                />
                                <StatusLine
                                    label="Visual Blueprint"
                                    status={hasWireframe}
                                    icon={Layout}
                                    onUpload={onUploadBlueprint}
                                />

                                {/* Sync from Builder */}
                                {isReqFinished && onSync && !hasRequirements && (
                                    <div className="mt-5 pt-5 border-t border-zinc-100">
                                        <button
                                            onClick={onSync}
                                            className="w-full flex items-center justify-center gap-2 px-5 py-3 bg-zinc-900 text-white rounded-2xl text-sm font-semibold hover:bg-black transition-all shadow-md hover:scale-105 active:scale-95"
                                        >
                                            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M13.3 7a5.3 5.3 0 1 0-.9 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /><path d="M11 7.5h2.5V5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
                                            Sync from Builder
                                        </button>
                                    </div>
                                )}
                            </div>

                            <div className="pt-8 flex flex-col items-center">
                                <button
                                    onClick={onLaunch}
                                    disabled={!canLaunch}
                                    className={`w-full max-w-xs py-5 rounded-2xl font-bold text-sm tracking-[0.2em] uppercase transition-all duration-500 ${canLaunch
                                        ? 'bg-zinc-900 text-white shadow-xl hover:bg-black hover:scale-[1.02] active:scale-100'
                                        : 'bg-zinc-50 text-zinc-300 border border-zinc-100 cursor-not-allowed'
                                        }`}
                                >
                                    {canLaunch ? (
                                        <span className="flex items-center justify-center gap-3">
                                            Generate <ArrowRight className="w-4 h-4" />
                                        </span>
                                    ) : 'Awaiting Context'}
                                </button>
                                {!canLaunch && (
                                    <p className="mt-4 text-[10px] font-bold text-zinc-300 tracking-[0.1em] uppercase">
                                        Must ingest SRS and Blueprint to continue.
                                    </p>
                                )}
                            </div>
                        </motion.div>
                    ) : (
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="bg-zinc-900 text-white rounded-[40px] p-12 shadow-2xl relative overflow-hidden"
                        >
                            {/* Subtle Grid Pattern Overlay */}
                            <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)', backgroundSize: '24px 24px' }} />

                            <div className="relative z-10 flex flex-col items-center text-center">
                                <div className="mb-8">
                                    <div className="text-[10px] font-bold tracking-[0.3em] text-emerald-400 uppercase mb-4 animate-pulse">
                                        {statusText}
                                    </div>
                                    <div className="text-6xl font-black tracking-tighter tabular-nums mb-2">
                                        {Math.round(progress)}<span className="text-zinc-600">%</span>
                                    </div>
                                    <div className="w-48 h-1 bg-zinc-800 rounded-full mx-auto overflow-hidden">
                                        <motion.div
                                            className="h-full bg-emerald-500"
                                            animate={{ width: `${progress}%` }}
                                            transition={{ ease: "easeOut" }}
                                        />
                                    </div>
                                </div>

                                <AnimatePresence>
                                    {!isBuilding && (
                                        <motion.div
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            className="w-full space-y-6"
                                        >
                                            <div className="flex items-center justify-center gap-10">
                                                <LaunchButton icon={ExternalLink} label="Windsurf" onClick={() => window.open('windsurf://file/' + projectPath, '_blank')} />
                                                <LaunchButton icon={Command} label="Cursor" onClick={() => window.open('cursor://file/' + projectPath, '_blank')} />
                                                <LaunchButton icon={Terminal} label="Claude" onClick={() => alert(`To use Claude Code, open terminal and run: \ncd ${projectPath}\nclaude`)} />
                                            </div>

                                            <div className="pt-6 border-t border-zinc-800 w-full">
                                                <button
                                                    onClick={onNextToUAT}
                                                    className="group w-full py-4 rounded-xl bg-white text-zinc-900 font-bold text-xs tracking-[0.2em] uppercase hover:bg-zinc-100 transition-all flex items-center justify-center gap-3"
                                                >
                                                    Begin Verification <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                                                </button>
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>
                        </motion.div>
                    )}
                </div>
            </div>
        </div>
    );
};

const LaunchButton = ({ icon: Icon, label, onClick }: { icon: any, label: string, onClick: () => void }) => (
    <button
        onClick={onClick}
        className="group flex flex-col items-center gap-2 transition-all hover:scale-110"
    >
        <div className="w-12 h-12 rounded-2xl bg-zinc-800 border border-zinc-700 flex items-center justify-center text-zinc-400 group-hover:text-white group-hover:bg-zinc-700 transition-all">
            <Icon className="w-5 h-5" />
        </div>
        <span className="text-[9px] font-black text-zinc-500 tracking-wider uppercase group-hover:text-zinc-300">
            {label}
        </span>
    </button>
);
