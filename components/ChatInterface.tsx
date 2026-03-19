'use client';

import React, { useState, useRef, useEffect, useMemo, memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowRight, Terminal, Cpu, Zap, Code, Globe, Loader2, Command,
  ChevronDown, FileText, Mic, MicOff, Download, Activity, Headphones,
  CheckCircle2, ListTodo, Circle, Check, Play, Database, Shield, Layout, Box, Package,
  Layers, Sparkles, PenTool, X, Maximize2, AlertCircle, RefreshCw, FolderArchive, ExternalLink,
  FileDown, Plus, Edit3, Briefcase, BookOpen, Hexagon, Paperclip, ArrowUp
} from 'lucide-react';
import { Message, AppMode } from '../types';
import { streamChatResponse, streamAgentResponse, proposeScreens, generateScreens, generateUAT } from '../services/service';
import ReactMarkdown from 'react-markdown';
import Mermaid from './Mermaid';
import WireframeCanvas from './ui-wireframe/WireframeCanvas';
import { WireframeData } from './ui-wireframe/types';
import { UATInterface } from './UATInterface';

import { DevInterface } from './DevInterface';
import JiraIssueCreator from './JiraIssueCreator';
import { LiveServerMessage } from '@google/genai';
import jsPDF from 'jspdf';
import { MonksLogo } from './MonksLogo';

interface ChatInterfaceProps {
  messages: Message[];
  setMessages: React.Dispatch<React.SetStateAction<Message[]>>;
  isIntroFinished?: boolean;
  onIntroFinish?: () => void;
  currentMode: AppMode;
  setCurrentMode: React.Dispatch<React.SetStateAction<AppMode>>;
  sessionId: string;
}

interface ExtendedMessage extends Message {
  interaction?: {
    id: string;
    type: 'choice';
    question: string;
    options: string[];
    selectedOption?: string;
  };
  form?: {
    id: string;
    title: string;
    description?: string;
    fields: Array<{
      name: string;
      label: string;
      type: 'text' | 'textarea' | 'radio' | 'select' | 'checkbox';
      options?: string[];
      placeholder?: string;
      required?: boolean;
    }>;
    submitted?: boolean;
    submittedValues?: Record<string, string>;
  };
}

type RequirementsData = Record<string, string>;

// Type aliases for the interaction and form shapes
type InteractionData = NonNullable<ExtendedMessage['interaction']>;
type FormData = NonNullable<ExtendedMessage['form']>;

const SRS_ORDER = [
  "1. Introduction",
  "2. Overall Description",
  "3. System Features",
  "4. External Interface Requirements",
  "5. Other Nonfunctional Requirements",
  "Appendix B: Analysis Models"
];
const Base_API_URL = 'https://dev2-backend-r7ik.onrender.com';
interface LiveTranscription {
  id: string;
  role: 'user' | 'model';
  text: string;
  isFinal: boolean;
}

const SDLC_STEPS = [
  { id: 'requirements', label: 'Requirements', icon: FileText },
  { id: 'jira', label: 'Jira', icon: Briefcase },
  { id: 'wireframe', label: 'UI/UX Design', icon: Layout },
  { id: 'dev', label: 'Development', icon: Code },
  { id: 'uat', label: 'UAT Testing', icon: CheckCircle2 },
];

// ── Audio Utilities ────────────────────────────────────────────────────────────

function floatTo16BitPCM(input: Float32Array): Int16Array {
  const output = new Int16Array(input.length);
  for (let i = 0; i < input.length; i++) {
    const s = Math.max(-1, Math.min(1, input[i]));
    output[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
  }
  return output;
}

function downsampleBuffer(buffer: Float32Array, sourceRate: number, targetRate: number): Int16Array {
  if (targetRate === sourceRate) return floatTo16BitPCM(buffer);
  if (targetRate > sourceRate) return floatTo16BitPCM(buffer);

  const ratio = sourceRate / targetRate;
  const newLength = Math.round(buffer.length / ratio);
  const result = new Int16Array(newLength);

  let offsetResult = 0;
  let offsetBuffer = 0;

  while (offsetResult < newLength) {
    const nextOffsetBuffer = Math.round((offsetResult + 1) * ratio);
    let accum = 0, count = 0;

    for (let i = offsetBuffer; i < nextOffsetBuffer && i < buffer.length; i++) {
      accum += buffer[i];
      count++;
    }

    const s = Math.max(-1, Math.min(1, count > 0 ? accum / count : 0));
    result[offsetResult] = s < 0 ? s * 0x8000 : s * 0x7FFF;

    offsetResult++;
    offsetBuffer = nextOffsetBuffer;
  }
  return result;
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  let binary = '';
  const bytes = new Uint8Array(buffer);
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes.buffer;
}

async function decodeAudioData(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number,
  numChannels: number,
): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}

// ── Memoized Components ────────────────────────────────────────────────────────

const MarkdownRenderer = memo(({ content, role }: { content: string; role: string }) => {
  const components = useMemo(() => ({
    code({ node, className, children, ...props }: any) {
      const match = /language-(\w+)/.exec(className || '');
      if (match?.[1] === 'mermaid') {
        return <div className="bg-white border border-zinc-200 rounded-lg p-2 my-4"><Mermaid chart={String(children).replace(/\n$/, '')} /></div>;
      }
      const isInline = !match && !String(children).includes('\n');
      return isInline ? (
        <code className={`font-mono px-1.5 py-0.5 rounded text-xs ${role === 'user' ? 'bg-zinc-200 text-zinc-900' : 'bg-zinc-100 text-zinc-700'}`} {...props}>{children}</code>
      ) : (
        <div className="border border-zinc-200 rounded-lg my-4 bg-zinc-50 overflow-hidden shadow-sm">
          <div className="flex items-center justify-between px-3 py-2 border-b border-zinc-100 bg-zinc-50">
            <span className="text-[10px] font-mono text-zinc-400 uppercase tracking-wider">{match?.[1] || 'code'}</span>
            <div className="flex gap-1.5"><div className="w-2 h-2 rounded-full bg-zinc-200"></div><div className="w-2 h-2 rounded-full bg-zinc-200"></div><div className="w-2 h-2 rounded-full bg-zinc-200"></div></div>
          </div>
          <pre className="p-4 overflow-x-auto text-xs font-mono leading-relaxed text-zinc-700">
            <code className={className} {...props}>{children}</code>
          </pre>
        </div>
      );
    },
    p: ({ children }: any) => <p className="mb-4 last:mb-0 leading-relaxed text-zinc-800">{children}</p>,
    strong: ({ children }: any) => <strong className="font-semibold text-zinc-950">{children}</strong>,
    ul: ({ children }: any) => <ul className="list-disc pl-5 mb-4 space-y-1 text-zinc-800 marker:text-zinc-400">{children}</ul>,
    ol: ({ children }: any) => <ol className="list-decimal pl-5 mb-4 space-y-1 text-zinc-800 marker:text-zinc-400">{children}</ol>,
    li: ({ children }: any) => <li className="pl-1">{children}</li>,
    h1: ({ children }: any) => <h1 className="text-2xl font-bold mt-6 mb-3 text-zinc-950 tracking-tight">{children}</h1>,
    h2: ({ children }: any) => <h2 className="text-xl font-semibold mt-5 mb-2 text-zinc-900">{children}</h2>,
    h3: ({ children }: any) => <h3 className="text-lg font-medium mt-4 mb-2 text-zinc-800">{children}</h3>,
  }), [role]);
  return <ReactMarkdown components={components}>{content}</ReactMarkdown>;
}, (prev, next) => prev.content === next.content);
MarkdownRenderer.displayName = 'MarkdownRenderer';

const InteractionCard = memo(({ msg, onResponse }: { msg: ExtendedMessage; onResponse: (val: string) => void }) => {
  const initial = msg.interaction?.selectedOption || null;
  const options = msg.interaction?.options || [];
  const isInitialOther = initial && !options.includes(initial);
  const [selected, setSelected] = useState<string | null>(isInitialOther ? 'OTHER_CUSTOM' : initial);
  const [customInput, setCustomInput] = useState(isInitialOther && initial ? initial : '');
  const [isOtherExpanded, setIsOtherExpanded] = useState(!!isInitialOther);
  const isAnswered = !!msg.interaction?.selectedOption;

  const handleSubmit = () => {
    if (selected === 'OTHER_CUSTOM' && customInput.trim()) onResponse(customInput.trim());
    else if (selected) onResponse(selected);
  };

  return (
    <div className="mt-4 w-full max-w-lg animate-enter">
      <div className="bg-white rounded-2xl border border-zinc-200 shadow-lg overflow-hidden relative">
        <div className="px-6 py-5 border-b border-zinc-100 relative z-10">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="w-4 h-4 text-zinc-900" />
            <span className="text-[10px] font-mono font-bold text-zinc-400 uppercase tracking-wider">Agent Inquiry</span>
          </div>
          <h3 className="text-base font-semibold text-zinc-900">{msg.interaction?.question}</h3>
        </div>
        <div className="p-5 space-y-3 relative z-10">
          {options.map((opt) => (
            <label
              key={opt}
              className={`flex items-center justify-between p-3.5 rounded-xl border cursor-pointer transition-all duration-200 ${selected === opt ? 'bg-zinc-100 border-zinc-400 shadow-sm' : 'bg-white border-zinc-100 hover:border-zinc-200 hover:bg-zinc-50'} ${isAnswered ? 'pointer-events-none opacity-60' : ''}`}
              onClick={() => { if (!isAnswered) setSelected(opt); }}
            >
              <input type="radio" className="hidden" checked={selected === opt} onChange={() => { }} />
              <div className="flex items-center gap-3">
                <div className={`w-4 h-4 rounded-full border flex items-center justify-center transition-colors ${selected === opt ? 'border-zinc-900 bg-zinc-900' : 'border-zinc-300'}`}>
                  {selected === opt && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                </div>
                <span className={`text-sm ${selected === opt ? 'text-zinc-900 font-bold' : 'text-zinc-600'}`}>{opt}</span>
              </div>
            </label>
          ))}
          <div className={`border rounded-xl overflow-hidden transition-all duration-200 ${isOtherExpanded ? 'bg-zinc-50 border-zinc-400' : 'bg-white border-zinc-100 hover:border-zinc-200'}`}>
            <label className={`flex items-center justify-between p-3.5 cursor-pointer ${isAnswered ? 'pointer-events-none opacity-60' : ''}`} onClick={() => { if (!isAnswered) { setSelected('OTHER_CUSTOM'); setIsOtherExpanded(true); } }}>
              <div className="flex items-center gap-3">
                <div className={`w-4 h-4 rounded-full border flex items-center justify-center transition-colors ${selected === 'OTHER_CUSTOM' ? 'border-zinc-900 bg-zinc-900' : 'border-zinc-300'}`}>
                  {selected === 'OTHER_CUSTOM' && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                </div>
                <span className={`text-sm ${selected === 'OTHER_CUSTOM' ? 'text-zinc-900 font-bold' : 'text-zinc-600'}`}>Custom Input</span>
              </div>
            </label>
            {isOtherExpanded && (
              <div className="px-4 pb-4 animate-enter">
                <div className="relative">
                  <PenTool className="absolute left-3 top-3 w-4 h-4 text-zinc-400" />
                  <input type="text" value={customInput} onChange={e => setCustomInput(e.target.value)} placeholder="Type your requirement..." className="w-full pl-10 pr-4 py-2.5 text-sm bg-zinc-50 border border-zinc-200 rounded-lg focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/10 text-zinc-900 placeholder-zinc-400 transition-all font-medium" disabled={isAnswered} autoFocus onKeyDown={e => { if (e.key === 'Enter' && customInput.trim()) handleSubmit(); }} />
                </div>
              </div>
            )}
          </div>
        </div>
        {!isAnswered && (
          <div className="px-5 pb-5 flex justify-end relative z-10">
            <button onClick={handleSubmit} disabled={!selected || (selected === 'OTHER_CUSTOM' && !customInput.trim())} className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-full text-xs font-bold hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-95 shadow-lg shadow-emerald-500/25">
              <span>Submit Answer</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
});
InteractionCard.displayName = 'InteractionCard';

// ── FormCard — renders agent request_form calls ──────────────────────────────

const FormCard = memo(({ msg, onSubmit }: { msg: ExtendedMessage; onSubmit: (vals: Record<string, string>) => void }) => {
  const form = msg.form!;
  const isSubmitted = !!form.submitted;
  const [values, setValues] = useState<Record<string, string>>(form.submittedValues || {});

  const handleChange = (name: string, val: string) => setValues(prev => ({ ...prev, [name]: val }));

  const canSubmit = form.fields.filter(f => f.required).every(f => values[f.name]?.trim());

  return (
    <motion.div
      initial={{ opacity: 0, y: 0 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full h-full animate-enter flex flex-col"
    >
      <div className="bg-[#1a1a1c] w-full h-full border-white/5 shadow-2xl overflow-hidden flex flex-col min-h-0">
        <div className="px-6 py-4 border-b border-white/5 flex items-center gap-2 shrink-0 bg-[#1d1d1f]">
          <Edit3 className="w-4 h-4 text-emerald-400" />
          <div>
            <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider block">Agent Form</span>
            <h3 className="text-sm font-bold text-white tracking-tight">{form.title}</h3>
          </div>
        </div>
        {form.description && (
          <p className="px-6 pt-3 text-xs text-zinc-400 leading-relaxed shrink-0">{form.description}</p>
        )}
        <div className="p-5 space-y-4 overflow-y-auto no-scrollbar min-h-0">
          {form.fields.map(field => (
            <div key={field.name}>
              <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                {field.label}{field.required && <span className="text-emerald-500 ml-1">*</span>}
              </label>
              {field.type === 'textarea' ? (
                <textarea
                  value={values[field.name] || ''}
                  onChange={e => handleChange(field.name, e.target.value)}
                  placeholder={field.placeholder || ''}
                  disabled={isSubmitted}
                  rows={3}
                  className="w-full bg-[#2a2a2c] border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/20 resize-none transition-all disabled:opacity-60 shadow-inner"
                />
              ) : field.type === 'radio' ? (
                <div className="space-y-2">
                  {(field.options || []).map(opt => (
                    <label key={opt} className={`flex items-center gap-3 p-2.5 rounded-lg border cursor-pointer transition-all ${values[field.name] === opt
                      ? 'border-emerald-500/50 bg-emerald-500/10'
                      : 'border-white/5 hover:border-white/20 bg-[#2a2a2c]'
                      } ${isSubmitted ? 'pointer-events-none opacity-60' : ''}`}>
                      <div className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center ${values[field.name] === opt ? 'border-emerald-500 bg-emerald-500' : 'border-zinc-600'
                        }`}>
                        {values[field.name] === opt && <div className="w-1.5 h-1.5 rounded-full bg-[#1a1a1c]" />}
                      </div>
                      <input type="radio" className="hidden" checked={values[field.name] === opt}
                        onChange={() => handleChange(field.name, opt)} disabled={isSubmitted} />
                      <span className={`text-sm ${values[field.name] === opt ? 'text-emerald-400 font-medium' : 'text-zinc-300'}`}>{opt}</span>
                    </label>
                  ))}
                </div>
              ) : field.type === 'select' ? (
                <select
                  value={values[field.name] || ''}
                  onChange={e => handleChange(field.name, e.target.value)}
                  disabled={isSubmitted}
                  className="w-full bg-[#2a2a2c] border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/20 transition-all disabled:opacity-60 shadow-inner appearance-none"
                >
                  <option value="" className="text-zinc-500">Select...</option>
                  {(field.options || []).map(opt => (
                    <option key={opt} value={opt} className="bg-[#2a2a2c]">{opt}</option>
                  ))}
                </select>
              ) : (
                <input
                  type="text"
                  value={values[field.name] || ''}
                  onChange={e => handleChange(field.name, e.target.value)}
                  placeholder={field.placeholder || ''}
                  disabled={isSubmitted}
                  className="w-full bg-[#2a2a2c] border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/20 transition-all disabled:opacity-60 shadow-inner"
                />
              )}
            </div>
          ))}
        </div>
        {!isSubmitted && (
          <div className="px-5 pb-5 pt-2 flex justify-end shrink-0">
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={() => canSubmit && onSubmit(values)}
              disabled={!canSubmit}
              className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-full text-xs font-bold hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-lg shadow-emerald-500/25"
            >
              Submit <ArrowRight className="w-3.5 h-3.5" />
            </motion.button>
          </div>
        )}
        {isSubmitted && (
          <div className="px-5 pb-4 flex items-center gap-2 text-xs text-emerald-400">
            <Check className="w-3.5 h-3.5" /> Submitted
          </div>
        )}
      </div>
    </motion.div>
  );
});
FormCard.displayName = 'FormCard';

// ── ScreenProposalPanel — two-step wireframe review UI ────────────────────────

type ProposedScreen = { id: string; title: string; description: string };

const ScreenProposalPanel: React.FC<{
  appName: string;
  screens: ProposedScreen[];
  onConfirm: (screens: ProposedScreen[]) => void;
  onCancel: () => void;
}> = ({ appName, screens: initialScreens, onConfirm, onCancel }) => {
  const [screens, setScreens] = React.useState<ProposedScreen[]>(initialScreens);
  const [newScreenTitle, setNewScreenTitle] = React.useState('');

  const removeScreen = (id: string) => setScreens(s => s.filter(x => x.id !== id));

  const addScreen = () => {
    const title = newScreenTitle.trim();
    if (!title) return;
    const id = title.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
    setScreens(s => [...s, { id, title, description: 'Custom screen added by user.' }]);
    setNewScreenTitle('');
  };

  return (
    <div className="w-full h-full flex items-center justify-center p-6 bg-white/60 backdrop-blur-sm overflow-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.97, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-2xl bg-white rounded-[32px] shadow-[0_40px_80px_-20px_rgba(0,0,0,0.12)] border border-zinc-100 overflow-hidden"
      >
        {/* Header */}
        <div className="px-8 pt-8 pb-6 border-b border-zinc-100">
          <div className="flex items-start justify-between">
            <div>
              <div className="text-[10px] font-bold tracking-[0.15em] uppercase text-zinc-400 mb-2">Blueprint Proposal</div>
              <h2 className="text-2xl font-bold text-zinc-900 tracking-tight">{appName}</h2>
              <p className="text-sm text-zinc-500 mt-1">Review the proposed screens. Add or remove before generating.</p>
            </div>
            <button onClick={onCancel} className="p-2 rounded-xl hover:bg-zinc-100 text-zinc-400 hover:text-zinc-700 transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Screen List */}
        <div className="px-8 py-6 max-h-80 overflow-y-auto no-scrollbar space-y-2">
          <AnimatePresence>
            {screens.map((screen, idx) => (
              <motion.div
                key={screen.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10, height: 0, marginBottom: 0 }}
                transition={{ duration: 0.2, delay: idx * 0.04 }}
                className="flex items-start justify-between p-4 rounded-2xl bg-zinc-50 hover:bg-zinc-100/80 border border-zinc-200/50 transition-colors group"
              >
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 w-6 h-6 rounded-lg bg-white border border-zinc-200 flex items-center justify-center text-zinc-500 text-[10px] font-bold shadow-sm shrink-0">
                    {idx + 1}
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-zinc-900">{screen.title}</div>
                    <div className="text-xs text-zinc-500 mt-0.5 leading-relaxed">{screen.description}</div>
                  </div>
                </div>
                <button
                  onClick={() => removeScreen(screen.id)}
                  className="p-1.5 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-red-50 hover:text-red-500 text-zinc-400 transition-all ml-3 shrink-0"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {/* Add Screen */}
        <div className="px-8 pb-6">
          <div className="flex gap-2">
            <input
              type="text"
              value={newScreenTitle}
              onChange={e => setNewScreenTitle(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') addScreen(); }}
              placeholder="Add a custom screen (e.g. Profile Page)"
              className="flex-1 h-10 px-4 rounded-xl bg-zinc-50 border border-zinc-200 text-sm text-zinc-900 placeholder-zinc-400 focus:outline-none focus:border-zinc-400 focus:ring-2 focus:ring-zinc-200 transition-all"
            />
            <button
              onClick={addScreen}
              disabled={!newScreenTitle.trim()}
              className="h-10 px-4 rounded-xl bg-zinc-100 hover:bg-zinc-200 text-zinc-700 border border-zinc-200 transition-colors disabled:opacity-40"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Actions */}
        <div className="px-8 pb-8 flex items-center justify-between gap-4 border-t border-zinc-100 pt-6">
          <span className="text-xs text-zinc-400 font-medium">{screens.length} screen{screens.length !== 1 ? 's' : ''} selected</span>
          <button
            onClick={() => onConfirm(screens)}
            disabled={screens.length === 0}
            className="flex items-center gap-2.5 px-6 py-3 bg-black text-white rounded-[16px] text-sm font-semibold hover:bg-zinc-900 disabled:opacity-40 transition-all shadow-[0_10px_30px_-10px_rgba(0,0,0,0.3)] hover:shadow-[0_15px_40px_-10px_rgba(0,0,0,0.4)] hover:scale-105 active:scale-100"
          >
            Generate Blueprint
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </motion.div>
    </div>
  );
};

// ── Main Component ─────────────────────────────────────────────────────────────

const ChatInterface: React.FC<ChatInterfaceProps> = ({
  messages,
  setMessages,
  isIntroFinished = true,
  onIntroFinish,
  currentMode,
  setCurrentMode,
  sessionId
}) => {
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [showModeSelector, setShowModeSelector] = useState(false);
  const [currentStep, setCurrentStep] = useState(0); // 0: Requirements, 1: UI/UX, 2: Dev, 3: UAT

  // Refs for scrolling and session
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const liveTranscriptEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Requirements Agent State
  const [requirementsData, setRequirementsData] = useState<RequirementsData>({});
  const [isReqFinished, setIsReqFinished] = useState(false);
  const [agentStatus, setAgentStatus] = useState<string>('');
  const [pendingInteraction, setPendingInteraction] = useState<InteractionData | FormData | null>(null);

  const builderSrsText = useMemo(() => {
    if (!isReqFinished || Object.keys(requirementsData).length === 0) return '';
    return Object.entries(requirementsData)
      .map(([title, content]) => `# ${title}\n\n${content}`)
      .join('\n\n');
  }, [isReqFinished, requirementsData]);

  // Auto-Start Ref
  const hasAgentStartedRef = useRef(false);

  // Live Mode State
  const [isLiveConnected, setIsLiveConnected] = useState(false);
  const [liveConnectionError, setLiveConnectionError] = useState<string | null>(null);
  const [audioVolume, setAudioVolume] = useState(0);
  const [liveHistory, setLiveHistory] = useState<LiveTranscription[]>([]);
  const [liveDiagramCode, setLiveDiagramCode] = useState<string | null>(null);
  const [systemSampleRate, setSystemSampleRate] = useState<number>(16000);
  // Live Audio Context Refs
  const wsRef = useRef<WebSocket | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceNodeRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const nextStartTimeRef = useRef<number>(0);
  const activeSourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());

  // Transcription accumulators
  const currentInputTranscription = useRef('');
  const currentOutputTranscription = useRef('');

  // Wireframe State
  const [wireframeData, setWireframeData] = useState<WireframeData | null>(null);
  const [isGeneratingWireframe, setIsGeneratingWireframe] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  // Screen Proposal State (two-step wireframe flow)
  const [proposedScreens, setProposedScreens] = useState<ProposedScreen[] | null>(null);
  const [proposedAppName, setProposedAppName] = useState<string>('');
  const [wireframePrompt, setWireframePrompt] = useState<string>('');
  const [isProposingScreens, setIsProposingScreens] = useState(false);

  // UAT State
  const [uatData, setUatData] = useState<any[]>([]);
  const [isGeneratingUAT, setIsGeneratingUAT] = useState(false);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
    }
  };

  const handleGenerateUAT = async (manualReqs?: Record<string, string>, query?: string) => {
    if (Object.keys(manualReqs || requirementsData).length === 0) {
      alert("No requirements found. Please use the 'Builder' mode to gather specs first, or upload a Markdown file in the chat bar.");
      return;
    }

    setIsGeneratingUAT(true);
    setUatData([]);
    setAgentStatus("Generating UAT Cases...");
    setCurrentMode('uat');
    setCurrentStep(4);

    let accumulated = '';

    try {
      await generateUAT(manualReqs || requirementsData, query, (chunk: string) => {
        accumulated += chunk;
        try {
          const cleaned = accumulated.trim();
          if (cleaned.startsWith('[') && cleaned.endsWith(']')) {
            setUatData(JSON.parse(cleaned));
          } else if (cleaned.startsWith('[')) {
            let partial = cleaned;
            if (partial.endsWith(',')) partial = partial.slice(0, -1);
            if (!partial.endsWith(']')) partial += ']';
            try {
              const parsed = JSON.parse(partial);
              if (Array.isArray(parsed)) setUatData(parsed);
            } catch { /* skip partial errors */ }
          }
        } catch (e) { /* skip chunk errors */ }
      });
    } catch (e) {
      console.error("UAT Generation failed:", e);
      setAgentStatus("Generation Failed");
    } finally {
      setIsGeneratingUAT(false);
      setAgentStatus("");
    }
  };

  const handleProceedToDesign = async () => {
    if (Object.keys(requirementsData).length === 0) {
      alert("No requirements found. Please finish the 'Builder' phase first.");
      return;
    }

    // Trigger initial wireframe generation based on requirements summary
    setCurrentMode('wireframe');
    setCurrentStep(2);
    setAgentStatus("Initializing Design...");

    // Create a prompt from requirements
    const summary = Object.entries(requirementsData)
      .map(([k, v]) => `${k}: ${v.slice(0, 200)}...`)
      .join('\n');

    const prompt = `Create a UI wireframe based on these requirements:\n${summary}`;

    // Use the two-step proposal flow
    await handleProposeScreens(prompt);
  };



  const scrollToBottom = () => {
    if (scrollContainerRef.current && messagesEndRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = scrollContainerRef.current;
      // Increased the bottom threshold since we added a spacer and want forgiving auto-scroll
      const isNearBottom = scrollHeight - scrollTop - clientHeight < 300;
      if (isNearBottom || isTyping) {
        messagesEndRef.current.scrollIntoView({ behavior: 'smooth', block: 'end' });
      }
    }
  };
  useEffect(() => { scrollToBottom(); }, [messages, pendingInteraction, isTyping]);
  useEffect(() => { liveTranscriptEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [liveHistory.length]);
  useEffect(() => () => disconnectLiveSession(), []);

  useEffect(() => {
    if (messages.length === 0) {
      setRequirementsData({});
      setIsReqFinished(false);
      setPendingInteraction(null);
      hasAgentStartedRef.current = false;
    }
  }, [messages.length]);

  // Sync SDLC Stepper with Mode
  useEffect(() => {
    if (currentMode === 'requirements') setCurrentStep(0);
    else if (currentMode === 'jira') setCurrentStep(1);
    else if (currentMode === 'wireframe') setCurrentStep(2);
    else if (currentMode === 'dev') setCurrentStep(3);
    else if (currentMode === 'uat') setCurrentStep(4);
    else if (currentMode === 'standard' && messages.length === 0) setCurrentStep(0);
  }, [currentMode, messages.length]);

  const [isLaunched, setIsLaunched] = useState(false);
  const [launchMessage, setLaunchMessage] = useState('Open IDE');
  const [projectPath, setProjectPath] = useState('');

  const handleOpenWindsurf = async (customInstruction?: string) => {
    if (Object.keys(requirementsData).length === 0) {
      alert("Cannot start development without a Software Requirements Specification. Please complete the 'Builder' phase first.");
      return;
    }

    try {
      setLaunchMessage('Copying...');
      try {
        let prompt = `I want you to build the project based on @requirements.md. Analyze it and start scaffolding.`;
        if (typeof customInstruction === 'string' && customInstruction.trim() !== '') {
          prompt = `I want you to build the project based on @requirements.md. Analyze it and start scaffolding.\n\nUser Notes: ${customInstruction}`;
        }
        await navigator.clipboard.writeText(prompt);
        setLaunchMessage('Launching...');
      } catch (err) {
        setLaunchMessage('Launching...');
      }
      setAgentStatus('Launching IDE...');

      const response = await fetch(`${Base_API_URL}/agent/save-local`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requirements: requirementsData,
          projectName: 'project-specs',
          wireframe: wireframeData,
          session_id: sessionId
        })
      });

      if (!response.ok) throw new Error('Save failed');
      const data = await response.json();

      setProjectPath(data.folder || '');

      if (data.opened_locally) {
        setIsLaunched(true);
        setCurrentStep(3);
        setAgentStatus('Project Opened');
        setLaunchMessage('Opened');
        setTimeout(() => alert("IDE Opened!\n\nThe instruction prompt has been copied to your clipboard.\n\n👉 Paste it into the IDE Chat to start generation."), 500);
      } else if (data.windsurf_url) {
        window.location.href = data.windsurf_url;
        setAgentStatus('');
        setLaunchMessage('Opened (URL)');
      }
    } catch (e) {
      setAgentStatus('');
      setLaunchMessage('Open Failed');
    }
  };

  const handleNextToUAT = () => {
    setCurrentMode('uat');
    setCurrentStep(4);
    if (uatData.length === 0) {
      handleGenerateUAT();
    }
  };

  const handleUploadRequirements = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      setRequirementsData(prev => ({ ...prev, [file.name]: text }));
    };
    reader.readAsText(file);
  };

  const handleUploadBlueprint = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const json = JSON.parse(e.target?.result as string);
        setWireframeData(json);
      } catch (err) {
        console.error("Invalid blueprint JSON");
        alert("Invalid JSON file");
      }
    };
    reader.readAsText(file);
  };

  const handleDownloadPDF = async () => {
    if (Object.keys(requirementsData).length === 0) {
      alert("No requirements gathered yet. Please complete the agent interview first.");
      return;
    }

    // Helper: render a mermaid string to a PNG data URL via an offscreen div
    const renderMermaidToImage = async (mermaidCode: string): Promise<string | null> => {
      try {
        const mermaid = (await import('mermaid')).default;
        mermaid.initialize({ startOnLoad: false, theme: 'neutral' });
        const id = 'mermaid-pdf-' + Date.now();
        const container = document.createElement('div');
        container.style.cssText = 'position:absolute;left:-9999px;top:-9999px;width:700px;background:white;padding:16px;';
        document.body.appendChild(container);
        const { svg } = await mermaid.render(id, mermaidCode, container);
        container.innerHTML = svg;
        const svgEl = container.querySelector('svg');
        if (!svgEl) { document.body.removeChild(container); return null; }
        // Convert SVG to PNG via canvas
        const svgData = new XMLSerializer().serializeToString(svgEl);
        const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
        const url = URL.createObjectURL(svgBlob);
        const img = new Image();
        await new Promise((res, rej) => { img.onload = res; img.onerror = rej; img.src = url; });
        const canvas = document.createElement('canvas');
        canvas.width = img.width || 700; canvas.height = img.height || 400;
        const ctx = canvas.getContext('2d')!;
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0);
        URL.revokeObjectURL(url);
        document.body.removeChild(container);
        return canvas.toDataURL('image/png');
      } catch (e) {
        console.error('Mermaid render failed:', e);
        return null;
      }
    };

    const doc = new jsPDF();
    let y = 30;

    // --- Cover Page ---
    // Premium Apple-like minimalist title page
    doc.setFont("helvetica", "bold");
    doc.setFontSize(28);
    doc.setTextColor(29, 29, 31); // #1d1d1f
    doc.text("Software Requirements", 105, 120, { align: "center" });
    doc.text("Specification", 105, 135, { align: "center" });

    doc.setFontSize(12);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(134, 134, 139); // #86868b
    doc.text(`Generated by MONKS AI`, 105, 160, { align: "center" });
    doc.text(new Date().toLocaleDateString(), 105, 170, { align: "center" });

    doc.addPage();
    y = 20;

    const addSection = async (title: string, content: string) => {
      if (y > 250) { doc.addPage(); y = 20; }

      // Section Title
      doc.setFontSize(18);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(29, 29, 31);
      doc.text(title, 20, y);
      y += 12;

      // Extract Mermaid diagrams
      // More robust regex to catch ```mermaid ... ``` or just ``` ... ``` if it looks like mermaid
      const mermaidRegex = /```(?:mermaid)?\s*([\s\S]*?)```/gi;
      const mermaidBlocks: string[] = [];
      let match;
      while ((match = mermaidRegex.exec(content)) !== null) {
        // Simple heuristic: if it contains 'graph', 'sequenceDiagram', 'classDiagram', it's likely mermaid
        if (match[1].includes('graph') || match[1].includes('subgraph') || match[1].includes('flowchart')) {
          mermaidBlocks.push(match[1].trim());
        }
      }

      // Clean content for text rendering
      const cleanContent = content.replace(/```(?:mermaid)?[\s\S]*?```/gi, '').replace(/[*#`>]/g, '').trim();

      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(82, 82, 91); // zinc-600

      if (cleanContent) {
        const lines = doc.splitTextToSize(cleanContent, 170);

        // Page break logic for text body
        if (y + (lines.length * 6) > 270) {
          doc.addPage();
          y = 20;
        }

        doc.text(lines, 20, y);
        y += (lines.length * 6) + 12;
      }

      // Embed each mermaid diagram as a PNG
      for (const diagramCode of mermaidBlocks) {
        if (y > 180) { doc.addPage(); y = 20; } // Ensure room for the image

        doc.setFontSize(10);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(29, 29, 31);
        doc.text('Architecture Diagram', 20, y);
        y += 8;

        const imgData = await renderMermaidToImage(diagramCode);
        if (imgData) {
          const maxW = 170;
          const aspect = 400 / 700; // Expected output from offscreen canvas
          const imgH = maxW * aspect;

          doc.addImage(imgData, 'PNG', 20, y, maxW, imgH, undefined, 'FAST');

          // Draw a subtle border around the image
          doc.setDrawColor(228, 228, 231); // zinc-200
          doc.rect(20, y, maxW, imgH);

          y += imgH + 15;
        } else {
          doc.setFontSize(10);
          doc.setFont("helvetica", "italic");
          doc.setTextColor(161, 161, 170); // zinc-400
          doc.text('[Diagram could not be rendered]', 20, y);
          y += 10;
        }
      }
    };

    for (const title of SRS_ORDER) {
      if (requirementsData[title]) await addSection(title, requirementsData[title]);
    }
    for (const [title, content] of Object.entries(requirementsData)) {
      if (!SRS_ORDER.includes(title)) await addSection(title, content);
    }

    doc.save('project-specs.pdf');
  };

  // Removed auto-start useEffect to allow user-initiated interactions


  const handleProposeScreens = async (prompt: string, fileContent?: string | null, fileType?: string | null) => {
    setIsProposingScreens(true);
    setProposedScreens(null);
    setWireframePrompt(prompt);
    const result = await proposeScreens(prompt, fileContent, fileType as any);
    setIsProposingScreens(false);
    if (result.error) {
      alert('Failed to propose screens: ' + result.error);
      return;
    }
    setProposedAppName(result.appName || 'App');
    setProposedScreens(result.screens || []);
  };

  const handleConfirmScreens = async (screens: ProposedScreen[]) => {
    setProposedScreens(null);
    setIsGeneratingWireframe(true);
    setAgentStatus('Generating Blueprints...');
    const result = await generateScreens(proposedAppName, screens, wireframePrompt);
    setIsGeneratingWireframe(false);
    setAgentStatus('');
    if (result.error) {
      alert('Failed to generate wireframe: ' + result.error);
      return;
    }
    setWireframeData(result);
  };

  const handleSend = async () => {
    if ((!inputValue.trim() && !selectedFile) || isTyping || isGeneratingWireframe || isProposingScreens) return;

    if (currentMode === 'wireframe') {
      const prompt = inputValue.trim();
      setInputValue('');
      if (selectedFile) {
        const reader = new FileReader();
        reader.onload = async (e) => {
          const content = e.target?.result as string;
          await handleProposeScreens(prompt || 'Create a UI for this product', content, 'text');
        };
        reader.readAsText(selectedFile);
        setSelectedFile(null);
      } else {
        await handleProposeScreens(prompt || 'Create a modern web application UI');
      }
      return;
    }

    if (currentMode === 'uat') {
      const query = inputValue.trim();
      setInputValue('');
      if (selectedFile) {
        const reader = new FileReader();
        reader.onload = async (event) => {
          const content = event.target?.result as string;
          await handleGenerateUAT({ "Manual Upload": content }, query);
        };
        reader.readAsText(selectedFile);
        setSelectedFile(null);
      } else {
        await handleGenerateUAT(undefined, query);
      }
      return;
    }

    if (currentMode === 'dev') {
      const query = inputValue.trim();
      setInputValue('');
      if (selectedFile) {
        if (selectedFile.name.endsWith('.json')) {
          handleUploadBlueprint(selectedFile);
        } else {
          handleUploadRequirements(selectedFile);
        }
        setSelectedFile(null);
      }
      if (query) {
        handleOpenWindsurf(query);
      }
      return;
    }

    const userMsg: Message = { id: Date.now().toString(), role: 'user', text: inputValue, timestamp: new Date() };
    setMessages((prev) => [...prev, userMsg]);
    setInputValue('');
    setIsTyping(true);

    if (currentMode === 'standard') {
      const modelMsgId = (Date.now() + 1).toString();
      const newModelMsg: Message = { id: modelMsgId, role: 'model', text: '', timestamp: new Date(), isStreaming: true };
      setMessages((prev) => [...prev, newModelMsg]);

      const history = messages.map(m => ({ role: m.role === 'user' ? 'user' : 'model', parts: [{ text: m.text }] }));
      let fullText = "";
      let displayedText = "";
      let isFetching = true;
      let isDraining = false;
      const charQueue: string[] = [];

      const startDraining = () => {
        if (isDraining) return;
        isDraining = true;
        const interval = setInterval(() => {
          if (charQueue.length > 0) {
            displayedText += charQueue.shift();
            setMessages(prev => prev.map(msg => msg.id === modelMsgId ? { ...msg, text: displayedText } : msg));
          } else if (!isFetching) {
            clearInterval(interval);
            isDraining = false;
            setMessages(prev => prev.map(msg => msg.id === modelMsgId ? { ...msg, isStreaming: false } : msg));
            setIsTyping(false);
          }
        }, 5);
      };

      startDraining();

      try {
        await streamChatResponse(userMsg.text, history, (chunk) => {
          fullText += chunk;
          charQueue.push(...chunk.split(""));
          startDraining();
        });
        isFetching = false;
      } catch (err) {
        isFetching = false;
        setIsTyping(false);
      }
    } else if (currentMode === 'requirements') {
      await runAgentTurn(userMsg.text, null, [...messages]);
    }
  };

  const handleInteractionResponse = async (selectedOption: string) => {
    if (!pendingInteraction) return;
    setMessages(prev => prev.map(msg => {
      if ((msg as ExtendedMessage).interaction?.id === pendingInteraction.id) {
        return { ...msg, interaction: { ...(msg as ExtendedMessage).interaction!, selectedOption } } as ExtendedMessage;
      }
      return msg;
    }));
    setPendingInteraction(null);
    setIsTyping(true);
    const toolResponseParts = [{ functionResponse: { name: "ask_choice_question", id: pendingInteraction.id, response: { result: selectedOption } } }];
    await runAgentTurn(null, toolResponseParts, [...messages]);
  };

  const handleFormSubmit = async (values: Record<string, string>) => {
    if (!pendingInteraction || !('fields' in pendingInteraction)) return;

    const currentForm = pendingInteraction as FormData;

    // Mark the form as submitted in the UI
    setMessages(prev => prev.map(msg =>
      msg.id === currentForm.id
        ? { ...msg, form: { ...(msg as ExtendedMessage).form!, submitted: true, submittedValues: values } } as ExtendedMessage
        : msg
    ));
    setPendingInteraction(null);
    setIsTyping(true);

    // CRITICAL: Send ONLY the tool_response, NOT a text message.
    // The backend /agent/chat handler is either/or: if message is present it
    // wraps it as text and silently drops tool_responses. The agent then never
    // sees the form values and cannot call save_section.
    await runAgentTurn(null, [{
      functionResponse: { name: 'request_form', id: currentForm.id, response: { result: values } }
    }], [...messages]);
  };

  // 0. Use prop sessionId for refresh-to-forget behavior

  const runAgentTurn = async (
    inputText: string | null,
    toolResponseParts: any[] | null = null,
    contextHistory: Message[] = [],
    isHidden: boolean = false
  ) => {
    const modelMsgId = (Date.now() + 1).toString();
    const newModelMsg: Message = { id: modelMsgId, role: 'model', text: '', timestamp: new Date(), isStreaming: true };
    setMessages((prev) => [...prev, newModelMsg]);

    let history = contextHistory.map(m => {
      const parts: any[] = [];
      if (m.text) parts.push({ text: m.text });
      if ((m as any).parts && (m as any).parts.length > 0) parts.push(...(m as any).parts);
      return { role: m.role === 'user' ? 'user' : 'model', parts };
    });

    let fullText = "";
    let displayedText = "";
    let accumulatedFunctionCalls: any[] = [];
    let isDraining = false;
    let isFetching = true;
    const charQueue: string[] = [];

    const finalizeTurn = () => {
      setMessages(prev => prev.map(msg => msg.id === modelMsgId ? { ...msg, isStreaming: false } : msg));
      setIsTyping(false);
      setAgentStatus('');
    };

    // Helper to drip characters into the message state
    const startDraining = () => {
      if (isDraining) return;
      isDraining = true;
      const interval = setInterval(() => {
        if (charQueue.length > 0) {
          displayedText += charQueue.shift();
          setMessages(prev => prev.map(msg => msg.id === modelMsgId ? { ...msg, text: displayedText } : msg));
        } else if (!isFetching) {
          // If fetching finished and queue is empty, finalize
          clearInterval(interval);
          isDraining = false;
          finalizeTurn();
        }
      }, 5);
    };

    startDraining();

    try {
      await streamAgentResponse({
        message: inputText,
        history: history,
        tool_responses: toolResponseParts,
        session_id: sessionId
      }, async (chunk: any) => {
        if (chunk.text) {
          fullText += chunk.text;
          charQueue.push(...chunk.text.split(""));
          startDraining();
        }
        if (chunk.function_calls) accumulatedFunctionCalls.push(...chunk.function_calls);
      });

      isFetching = false; // Mark generator as done

      if (accumulatedFunctionCalls.length > 0) {
        // Wait for text to finish typing before showing tools if there was text
        const waitForDrip = () => new Promise(resolve => {
          const check = setInterval(() => {
            if (!isDraining) {
              clearInterval(check);
              resolve(true);
            }
          }, 50);
        });
        await waitForDrip();

        const parts = accumulatedFunctionCalls.map(fc => ({ functionCall: fc }));
        setMessages(prev => prev.map(msg => msg.id === modelMsgId ? { ...msg, parts: parts, isStreaming: false } : msg));
        newModelMsg.parts = parts;
        newModelMsg.text = fullText;

        const nextToolResponses = [];
        let hasInteraction = false;

        for (const call of accumulatedFunctionCalls) {
          setAgentStatus(`Processing ${call.name}...`);
          if (call.name === 'ask_choice_question') {
            hasInteraction = true;
            const opts = Array.isArray(call.args.options) ? call.args.options : [];
            const interactionData = { id: call.id, type: 'choice' as const, question: call.args.question, options: opts };
            setPendingInteraction(interactionData);
            setMessages(prev => prev.map(msg => msg.id === modelMsgId ? { ...msg, interaction: interactionData } : msg));
            setAgentStatus("Waiting for input...");
            setIsTyping(false);
            return;
          }

          if (call.name === 'request_form') {
            hasInteraction = true;
            const formData = {
              id: call.id,
              title: call.args.title || 'Agent Questions',
              description: call.args.description || '',
              fields: Array.isArray(call.args.fields) ? call.args.fields : []
            };
            setPendingInteraction(formData);
            setMessages(prev => prev.map(msg => msg.id === modelMsgId ? { ...msg, form: formData } : msg));
            setAgentStatus("Waiting for form submission...");
            setIsTyping(false);
            return;
          }

          let functionResponse = {};
          if (call.name === 'save_section') {
            let title = "Unknown", content = "";
            if (typeof call.args === 'string') {
              try { const parsed = JSON.parse(call.args); title = parsed.title; content = parsed.content; } catch (e) { }
            } else { title = call.args.title; content = call.args.content; }

            setRequirementsData(prev => ({ ...prev, [title]: content }));
            setMessages(prev => [...prev, { id: 'sys-' + Date.now(), role: 'model', text: `*System: Section "${title}" saved.*`, timestamp: new Date() }]);
            functionResponse = { result: "Section Saved." };
            setAgentStatus(`Saved: ${title}`);
          } else if (call.name === 'finalize_requirements') {
            setIsReqFinished(true);
            functionResponse = { result: "Project Ready" };
            setAgentStatus("Finalizing...");
          } else {
            functionResponse = { result: "OK" };
          }
          nextToolResponses.push({ functionResponse: { name: call.name, id: call.id, response: functionResponse } });
        }

        setAgentStatus('');
        // Don't auto-continue the chain on the hidden START_SESSION turn
        // This prevents the agent from auto-saving sections without user input
        if (!hasInteraction && nextToolResponses.length > 0 && !isHidden) {
          if (!fullText.trim()) setMessages(prev => prev.filter(msg => msg.id !== modelMsgId));
          let nextHistory = [...contextHistory];
          if (inputText) nextHistory.push({ id: 'temp-user', role: 'user', text: inputText, timestamp: new Date() });
          nextHistory.push(newModelMsg);
          await runAgentTurn(null, nextToolResponses, nextHistory);
        }
      }
    } catch (e: any) {
      isFetching = false;
      setMessages(prev => [...prev, { id: Date.now().toString(), role: 'model', text: "**Error**: Connection failed.", timestamp: new Date() }]);
      setIsTyping(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  const handleDownloadProject = async () => {
    try {
      const response = await fetch(`${Base_API_URL}/agent/generate-project`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requirements: requirementsData, projectName: 'project-specs' })
      });
      if (!response.ok) throw new Error('Download failed');
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = 'project-specs.zip';
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (e) {
      alert("Failed to generate project ZIP.");
    }
  };

  const connectLiveSession = async () => {
    if (isLiveConnected) return;
    setLiveConnectionError(null);
    try {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      await audioContextRef.current.resume();

      const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } });
      const inputContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const sysRate = inputContext.sampleRate;
      setSystemSampleRate(sysRate);

      nextStartTimeRef.current = 0;
      activeSourcesRef.current.clear();

      sourceNodeRef.current = inputContext.createMediaStreamSource(stream);
      processorRef.current = inputContext.createScriptProcessor(4096, 1, 1);

      const analyzer = inputContext.createAnalyser();
      analyzer.fftSize = 256;
      sourceNodeRef.current.connect(analyzer);
      const dataArray = new Uint8Array(analyzer.frequencyBinCount);

      const updateVolume = () => {
        if (!wsRef.current) return;
        analyzer.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) sum += dataArray[i];
        setAudioVolume(sum / dataArray.length);
        requestAnimationFrame(updateVolume);
      };

      const ws = new WebSocket('https://dev2-wx9i.onrender.com');
      wsRef.current = ws;

      ws.onopen = () => {
        setIsLiveConnected(true); setLiveConnectionError(null); setLiveHistory([]); setLiveDiagramCode(null);
        requestAnimationFrame(updateVolume);
        if (processorRef.current && sourceNodeRef.current) {
          processorRef.current.onaudioprocess = (e) => {
            const inputData = e.inputBuffer.getChannelData(0);
            const pcm16 = downsampleBuffer(inputData, sysRate, 16000);
            const base64Data = arrayBufferToBase64(pcm16.buffer as ArrayBuffer);
            if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify({ type: 'audio', data: base64Data }));
          };
          sourceNodeRef.current.connect(processorRef.current);
          processorRef.current.connect(inputContext.destination);
        }
      };

      ws.onmessage = async (event) => {
        try {
          const msg = JSON.parse(event.data);
          if (msg.type === 'message') {
            const message = msg.data as LiveServerMessage;
            if (message.serverContent?.outputTranscription) {
              const text = message.serverContent.outputTranscription.text;
              currentOutputTranscription.current += text;
              setLiveHistory(prev => {
                const last = prev[prev.length - 1];
                if (last?.role === 'model' && !last.isFinal) return [...prev.slice(0, -1), { ...last, text: currentOutputTranscription.current }];
                return [...prev, { id: 'm-' + Date.now(), role: 'model', text: currentOutputTranscription.current, isFinal: false }];
              });
            } else if (message.serverContent?.inputTranscription) {
              const text = message.serverContent.inputTranscription.text;
              currentInputTranscription.current += text;
              setLiveHistory(prev => {
                const last = prev[prev.length - 1];
                if (last?.role === 'user' && !last.isFinal) return [...prev.slice(0, -1), { ...last, text: currentInputTranscription.current }];
                return [...prev, { id: 'u-' + Date.now(), role: 'user', text: currentInputTranscription.current, isFinal: false }];
              });
            }

            if (message.serverContent?.turnComplete) {
              setLiveHistory(prev => prev.map(item => ({ ...item, isFinal: true })));
              currentInputTranscription.current = ''; currentOutputTranscription.current = '';
            }

            if (message.toolCall?.functionCalls) {
              for (const call of message.toolCall.functionCalls) {
                if (call.name === 'render_diagram') {
                  setLiveDiagramCode((call.args as any)?.mermaid_code as string);
                  if (ws.readyState === WebSocket.OPEN) {
                    ws.send(JSON.stringify({ type: 'tool_response', functionResponses: { name: call.name, id: call.id, response: { result: "Diagram rendered successfully." } } }));
                  }
                }
              }
            }

            if (message.serverContent?.interrupted) {
              activeSourcesRef.current.forEach(source => { try { source.stop(); } catch (e) { } });
              activeSourcesRef.current.clear();
              nextStartTimeRef.current = 0;
            }

            const base64Audio = message.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
            if (base64Audio && audioContextRef.current) {
              const buffer = base64ToArrayBuffer(base64Audio);
              const decodedBuffer = await decodeAudioData(new Uint8Array(buffer), audioContextRef.current, 24000, 1);
              const source = audioContextRef.current.createBufferSource();
              source.buffer = decodedBuffer; source.connect(audioContextRef.current.destination);
              const currentTime = audioContextRef.current.currentTime;
              if (nextStartTimeRef.current < currentTime) nextStartTimeRef.current = currentTime;
              source.start(nextStartTimeRef.current);
              nextStartTimeRef.current += decodedBuffer.duration;
              activeSourcesRef.current.add(source);
              source.onended = () => activeSourcesRef.current.delete(source);
            }
          } else if (msg.type === 'error') {
            setLiveConnectionError(msg.error); disconnectLiveSession();
          }
        } catch (e) { }
      };

      ws.onclose = () => { setIsLiveConnected(false); };
      ws.onerror = (e) => { setIsLiveConnected(false); setLiveConnectionError("Could not connect to Audio Server."); };

    } catch (err: any) {
      setIsLiveConnected(false); setLiveConnectionError(err.message || "Failed to initialize audio.");
    }
  };

  const disconnectLiveSession = () => {
    if (wsRef.current) { wsRef.current.close(); wsRef.current = null; }
    if (sourceNodeRef.current) { sourceNodeRef.current.disconnect(); sourceNodeRef.current = null; }
    if (processorRef.current) { processorRef.current.disconnect(); processorRef.current = null; }
    if (audioContextRef.current) { audioContextRef.current.close(); audioContextRef.current = null; }
    setIsLiveConnected(false); setLiveDiagramCode(null); nextStartTimeRef.current = 0; activeSourcesRef.current.clear();
  };

  const toggleLiveSession = () => {
    if (currentMode !== 'live') {
      setCurrentMode('live');
      connectLiveSession();
    } else {
      isLiveConnected ? disconnectLiveSession() : connectLiveSession();
    }
  };

  const handleModeChange = (mode: AppMode) => {
    setCurrentMode(mode);
    setShowModeSelector(false);

    // Sync Step if navigating via dropdown
    const stepIdx = SDLC_STEPS.findIndex(s => s.id === mode);
    if (stepIdx !== -1) setCurrentStep(stepIdx);

    if (mode === 'live' && !isLiveConnected) {
      connectLiveSession();
    } else if (mode !== 'live' && isLiveConnected) {
      disconnectLiveSession();
    }
  };

  const getModeLabel = (mode: AppMode) => {
    switch (mode) {
      case 'standard': return 'MONKS Route4v';
      case 'requirements': return 'Builder v';
      case 'wireframe': return 'Designer v';
      case 'uat': return 'QA Tester v';
      case 'live': return 'Voice Mode';
    }
  };

  // FIXED: isHomeState now strictly targets the standard landing page without messages.
  const isHomeState = messages.length === 0 && currentMode === 'standard';

  return (
    <div className="flex h-full relative overflow-hidden bg-white text-zinc-900 font-sans selection:bg-black/10 w-full transition-all duration-300">

      {/* Clean Light Background */}
      <div className="absolute inset-0 bg-white overflow-hidden pointer-events-none">
      </div>

      {/* Main Container - Maximized Canvas & Floating UI */}
      <div className="flex-1 flex flex-col h-full relative z-10 overflow-hidden">

        <div className={`absolute top-4 left-0 right-0 z-50 flex items-center justify-between px-6 pointer-events-none transition-opacity duration-500 ${!isIntroFinished ? 'opacity-0' : 'opacity-100'}`}>
          <div className="pointer-events-auto flex items-center gap-3 bg-white/80 backdrop-blur-xl border border-zinc-200 p-2 px-4 rounded-2xl shadow-sm">
            <div className="flex items-center gap-2 text-zinc-500">
              <span className="text-sm font-semibold tracking-tight text-zinc-900">Monks Architect</span>
              <span className="text-zinc-300">/</span>
              <span className="text-sm text-zinc-500 font-medium">{getModeLabel(currentMode)}</span>
            </div>
          </div>

          {/* SDLC Flow Bar — always centered */}
          <div className="absolute left-1/2 -translate-x-1/2 pointer-events-auto">
            <AnimatePresence mode="wait">
              {currentMode !== 'standard' && (
                <motion.div
                  key="sdlc-bar"
                  initial={{ opacity: 0, y: -16, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -16, scale: 0.95 }}
                  transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                  className="flex items-center gap-1 bg-white/90 backdrop-blur-xl border border-zinc-200 rounded-full p-1.5 px-2 shadow-sm ring-1 ring-black/5"
                >
                  {/* Prev Button */}
                  <motion.button
                    whileHover={{ scale: 1.08 }}
                    whileTap={{ scale: 0.92 }}
                    onClick={() => {
                      if (currentStep > 0) {
                        const prev = currentStep - 1;
                        setCurrentStep(prev);
                        setCurrentMode(SDLC_STEPS[prev].id as any);
                      }
                    }}
                    disabled={currentStep === 0}
                    className="p-1.5 rounded-full text-zinc-400 hover:text-zinc-900 hover:bg-zinc-100 disabled:opacity-20 disabled:cursor-not-allowed transition-all"
                    title="Previous step"
                  >
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M7.5 2L4 6l3.5 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
                  </motion.button>

                  {/* Steps */}
                  {SDLC_STEPS.map((step, idx) => {
                    const Icon = step.icon;
                    const isActive = currentStep === idx;

                    // Determine actual completion state based on data presence, not just linear order
                    let isCompleted = false;
                    if (idx === 0) isCompleted = isReqFinished;
                    if (idx === 1) isCompleted = false;
                    if (idx === 2) isCompleted = wireframeData !== null;
                    if (idx === 3) isCompleted = isLaunched;
                    if (idx === 4) isCompleted = uatData && uatData.length > 0;
                    return (
                      <React.Fragment key={step.id}>
                        <motion.button
                          layout
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => {
                            if (idx === 2 && !wireframeData && isReqFinished) {
                              // Guided Flow Auto-Pilot: only if requirements agent actually finished
                              setCurrentStep(2);
                              handleProceedToDesign();
                            } else {
                              // Standalone Free Roam Navigation
                              setCurrentStep(idx);
                              setCurrentMode(step.id as any);
                            }
                          }}
                          className={`relative flex items-center gap-2 px-3 py-1.5 rounded-full transition-colors duration-200 ${isActive
                            ? 'text-white'
                            : isCompleted
                              ? 'text-zinc-900 hover:bg-zinc-100'
                              : 'text-zinc-400 hover:text-zinc-600'
                            }`}
                        >
                          {isActive && (
                            <motion.span
                              layoutId="sdlc-pill"
                              className="absolute inset-0 rounded-full bg-zinc-900 shadow-sm"
                              transition={{ type: 'spring', stiffness: 400, damping: 35 }}
                            />
                          )}
                          <span className="relative z-10 flex items-center gap-1.5">
                            {isCompleted ? (
                              <motion.span
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                              >
                                <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2 6l3 3 5-5" stroke="#09090b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
                              </motion.span>
                            ) : (
                              <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-zinc-300' : ''}`} />
                            )}
                            <span className={`text-[11px] font-medium tracking-wide ${!isActive && !isCompleted && 'hidden md:inline'} ${isActive ? '' : isCompleted ? 'hidden md:inline' : ''}`}>{step.label}</span>
                          </span>
                        </motion.button>
                        {idx < SDLC_STEPS.length - 1 && (
                          <motion.div
                            className={`w-4 h-[1px] ${isCompleted || isActive ? 'bg-zinc-900/40' : 'bg-zinc-200'}`}
                            animate={{ opacity: [0.6, 1, 0.6] }}
                            transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut', delay: idx * 0.2 }}
                          />
                        )}
                      </React.Fragment>
                    );
                  })}

                  {/* Next Button */}
                  <motion.button
                    whileHover={{ scale: 1.08 }}
                    whileTap={{ scale: 0.92 }}
                    onClick={() => {
                      if (currentStep < SDLC_STEPS.length - 1) {
                        const next = currentStep + 1;
                        const canNavigate = next === 0 || next <= currentStep + 1;
                        if (canNavigate) {
                          setCurrentStep(next);
                          setCurrentMode(SDLC_STEPS[next].id as any);
                        }
                      }
                    }}
                    disabled={currentStep === SDLC_STEPS.length - 1}
                    className="p-1.5 rounded-full text-zinc-400 hover:text-zinc-900 hover:bg-zinc-100 disabled:opacity-20 disabled:cursor-not-allowed transition-all"
                    title="Next step"
                  >
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M4.5 2L8 6l-3.5 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
                  </motion.button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Global Reset/Action - Floating Right */}
        <div className={`absolute top-6 right-6 z-50 pointer-events-auto transition-opacity duration-500 ${!isIntroFinished ? 'opacity-0' : 'opacity-100'}`}>
          {!isHomeState && (
            <button
              onClick={() => { setMessages([]); setCurrentMode('standard'); hasAgentStartedRef.current = false; disconnectLiveSession(); }}
              className="p-2.5 bg-zinc-900/40 backdrop-blur-xl border border-white/5 rounded-xl text-zinc-500 hover:text-zinc-300 transition-colors shadow-lg"
              title="Reset Session"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Main Workspace - No forced spacing */}
        <div className="flex-1 relative flex overflow-hidden pt-16">

          {isHomeState ? (
            <div className="flex-1 flex flex-col items-center justify-center w-full relative">
              <MonksLogo onComplete={onIntroFinish} />

              {/* Quick Actions - Floating on Home */}
              {isIntroFinished && (
                <div className="absolute bottom-12 flex flex-wrap justify-center gap-3 animate-enter">
                  {[
                    { icon: <Activity className="w-3.5 h-3.5" />, label: 'Strategize' },
                    { icon: <BookOpen className="w-3.5 h-3.5" />, label: 'Learn' },
                    { icon: <Code className="w-3.5 h-3.5" />, label: 'Code' },
                    { icon: <Layout className="w-3.5 h-3.5" />, label: 'Design' },
                  ].map((action, i) => (
                    <button key={i} onClick={() => setInputValue(`I want to ${action.label.toLowerCase()} a new project...`)} className="flex items-center gap-2 px-4 py-2 rounded-full border border-white/5 bg-zinc-900/50 hover:bg-zinc-800 hover:border-white/10 text-zinc-400 hover:text-zinc-200 text-xs font-medium transition-all">
                      <span className="text-zinc-500">{action.icon}</span>
                      {action.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="flex-1 flex overflow-hidden relative">
              {/* Content Switcher */}
              {currentMode === 'live' ? (
                <div className="flex-1 relative flex overflow-hidden">
                  {/* Live Mode UI */}
                  <div className={`flex-1 flex flex-col items-center justify-center relative transition-all duration-500 ${liveDiagramCode ? 'w-1/2 border-r border-white/5' : 'w-full'}`}>
                    <div className="flex flex-col items-center gap-8 max-w-md w-full z-10">
                      {/* Visualizer */}
                      <div className={`relative flex items-center justify-center transition-all duration-500 ${isLiveConnected ? 'scale-110' : 'scale-100'}`}>
                        {isLiveConnected && <div className="absolute inset-0 bg-orange-500/20 blur-3xl rounded-full animate-pulse" />}
                        <div className={`w-32 h-32 rounded-full flex items-center justify-center border transition-all duration-300 ${isLiveConnected ? 'bg-zinc-900 border-orange-500/50 shadow-[0_0_30px_rgba(249,115,22,0.2)]' : 'bg-zinc-900/50 border-white/10'}`}
                          style={isLiveConnected ? { transform: `scale(${1 + (audioVolume / 255) * 0.3})` } : {}}>
                          {isLiveConnected ? <Activity className="w-10 h-10 text-orange-500" /> : <Headphones className="w-10 h-10 text-zinc-600" />}
                        </div>
                      </div>

                      {/* Transcript Area */}
                      <div className="w-full h-48 overflow-y-auto no-scrollbar space-y-3 p-4 bg-zinc-900/50 rounded-xl border border-white/5">
                        {liveHistory.length === 0 && <div className="text-center text-zinc-600 text-xs italic pt-10">Conversation empty...</div>}
                        {liveHistory.map((item) => (
                          <div key={item.id} className={`flex flex-col gap-1 ${item.role === 'user' ? 'items-end' : 'items-start'}`}>
                            <div className={`px-3 py-2 rounded-lg text-xs max-w-[90%] leading-relaxed ${item.role === 'user' ? 'bg-zinc-800 text-zinc-200' : 'text-zinc-400'}`}>
                              {item.text}
                            </div>
                          </div>
                        ))}
                        <div ref={liveTranscriptEndRef} />
                      </div>

                      {/* Controls */}
                      <button onClick={toggleLiveSession} className={`px-6 py-2.5 rounded-full text-sm font-medium transition-all flex items-center gap-2 ${isLiveConnected ? 'bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20' : 'bg-zinc-100 text-zinc-900 hover:bg-white'}`}>
                        {isLiveConnected ? <><MicOff className="w-4 h-4" /> End Session</> : <><Mic className="w-4 h-4" /> Start Voice Mode</>}
                      </button>
                    </div>
                  </div>

                  {/* Split Diagram */}
                  <div className={`absolute top-0 right-0 h-full bg-[#0f0f11] transition-all duration-500 flex flex-col border-l border-white/5 ${liveDiagramCode ? 'w-1/2 translate-x-0' : 'w-1/2 translate-x-full'}`}>
                    <div className="p-3 border-b border-white/5 flex justify-between items-center">
                      <span className="text-xs font-medium text-zinc-400 uppercase tracking-wider">Live Architecture</span>
                      <button onClick={() => setLiveDiagramCode(null)} className="text-zinc-500 hover:text-zinc-300"><X className="w-4 h-4" /></button>
                    </div>
                    <div className="flex-1 bg-white/5 p-4 overflow-hidden">
                      {liveDiagramCode && <Mermaid chart={liveDiagramCode} mode="fullscreen" onCodeChange={setLiveDiagramCode} />}
                    </div>
                  </div>
                </div>
              ) : currentMode === 'wireframe' ? (
                <div className="flex-1 relative bg-[#fafafa]">
                  {wireframeData ? (
                    <>
                      <WireframeCanvas data={wireframeData} />
                      {/* Floating Actions */}
                      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-3 bg-white/90 backdrop-blur-xl p-2 rounded-2xl border border-zinc-200 shadow-2xl">
                        <button onClick={() => { setCurrentStep(4); setCurrentMode('uat'); }} className="px-4 py-2 rounded-xl text-xs font-medium text-zinc-500 hover:text-zinc-900 border border-transparent hover:border-zinc-200 hover:bg-zinc-50 transition-colors">
                          Free Roam to UAT
                        </button>
                        <div className="w-[1px] h-4 bg-zinc-200"></div>
                        <button onClick={() => { setCurrentStep(3); setCurrentMode('dev'); }} className="px-5 py-2 rounded-xl text-xs font-medium bg-zinc-900 text-white hover:bg-black transition-colors flex items-center gap-2 shadow-sm">
                          <span>Start Development</span>
                          <ArrowRight className="w-3 h-3" />
                        </button>
                      </div>
                    </>
                  ) : proposedScreens ? (
                    // ── Screen Proposal Review Panel ────────────────────────────
                    <ScreenProposalPanel
                      appName={proposedAppName}
                      screens={proposedScreens}
                      onConfirm={handleConfirmScreens}
                      onCancel={() => setProposedScreens(null)}
                    />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center p-8 bg-[#fbfbfd]/50 backdrop-blur-sm">
                      <div className="max-w-md w-full bg-white rounded-3xl p-8 border border-zinc-200 shadow-[0_2px_8px_rgba(0,0,0,0.06)] text-center flex flex-col items-center gap-5">
                        <div className="w-16 h-16 bg-[#1d1d1f] rounded-full flex flex-col items-center justify-center text-white shadow-md ring-1 ring-black/5 mb-2">
                          <Layout className="w-8 h-8 drop-shadow-sm" />
                        </div>
                        <div>
                          <h2 className="text-xl font-bold text-zinc-900 mb-2 tracking-tight">Standalone Design Mode</h2>
                          <p className="text-sm font-medium text-zinc-500 leading-relaxed text-balance">
                            Please provide requirements to begin blueprint generation. You can drop a markdown document or type a specific prompt.
                          </p>
                        </div>

                        {/* Sync from Builder */}
                        {isReqFinished && Object.keys(requirementsData).length > 0 && (
                          <button
                            onClick={handleProceedToDesign}
                            className="w-full flex items-center justify-center gap-2 px-5 py-3 bg-zinc-900 text-white rounded-2xl text-sm font-semibold hover:bg-black transition-all shadow-md hover:scale-105 active:scale-95"
                          >
                            <RefreshCw className="w-4 h-4" />
                            Sync from Builder
                          </button>
                        )}

                        {/* File Upload Zone */}
                        <label className="w-full relative group cursor-pointer">
                          <div className="absolute inset-0 bg-gradient-to-b from-zinc-50 to-zinc-100/50 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity" />
                          <div className="relative border-2 border-dashed border-zinc-200 group-hover:border-zinc-400 bg-white rounded-2xl p-6 transition-all flex flex-col items-center gap-2">
                            <FileText className="w-6 h-6 text-zinc-400 group-hover:text-zinc-600 transition-colors" />
                            <span className="text-sm font-semibold text-zinc-600 group-hover:text-zinc-900">Upload Markdown SRS</span>
                          </div>
                          <input type="file" className="hidden" accept=".md,.txt" onChange={(e) => {
                            if (e.target.files && e.target.files[0]) {
                              const textReader = new FileReader();
                              textReader.onload = async (event) => {
                                const text = event.target?.result as string;
                                // Do NOT call setRequirementsData here — that would pollute the global
                                // requirements pipeline used by the Builder agent.
                                await handleProposeScreens(`Create a UI wireframe based on these requirements:\n${text}`, text, 'text');
                              };
                              textReader.readAsText(e.target.files[0]);
                            }
                          }} />
                        </label>

                        <p className="text-sm font-medium text-zinc-400 text-center mt-4 border-t border-zinc-100 pt-4 w-full">
                          Or use the chat bar below to type your layout requests.
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Proposing screens spinner */}
                  {isProposingScreens && (
                    <div className="absolute inset-0 bg-white/60 backdrop-blur-md flex items-center justify-center z-50">
                      <div className="flex flex-col items-center gap-4 bg-white p-8 rounded-3xl border border-zinc-200 shadow-2xl">
                        <div className="relative w-16 h-16 flex items-center justify-center">
                          <div className="absolute inset-0 border-4 border-zinc-200 rounded-full" />
                          <div className="absolute inset-0 border-4 border-[#1d1d1f] rounded-full border-t-transparent animate-spin" />
                          <Layers className="w-6 h-6 text-[#1d1d1f] animate-pulse" />
                        </div>
                        <div className="text-center">
                          <h3 className="text-sm font-bold text-zinc-900 tracking-tight mb-1">Analyzing Product Structure</h3>
                          <p className="text-xs font-medium text-zinc-500">Proposing screens...</p>
                        </div>
                      </div>
                    </div>
                  )}



                  {isGeneratingWireframe && (
                    <div className="absolute inset-0 bg-white/60 backdrop-blur-md flex items-center justify-center z-50">
                      <div className="flex flex-col items-center gap-4 bg-white p-8 rounded-3xl border border-zinc-200 shadow-2xl shadow-emerald-500/10 active:scale-95 transition-transform duration-300">
                        <div className="relative w-16 h-16 flex items-center justify-center">
                          <div className="absolute inset-0 border-4 border-emerald-100 rounded-full" />
                          <div className="absolute inset-0 border-4 border-emerald-500 rounded-full border-t-transparent animate-spin" />
                          <Layout className="w-6 h-6 text-emerald-600 animate-pulse" />
                        </div>
                        <div className="text-center">
                          <h3 className="text-sm font-bold text-zinc-900 tracking-tight mb-1">Synthesizing Blueprint</h3>
                          <p className="text-xs font-medium text-zinc-500">Analyzing requirements...</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ) : currentMode === 'dev' ? (
                <DevInterface
                  onLaunch={handleOpenWindsurf}
                  onNextToUAT={handleNextToUAT}
                  onUploadRequirements={handleUploadRequirements}
                  onUploadBlueprint={handleUploadBlueprint}
                  isLaunched={isLaunched}
                  launchMessage={launchMessage}
                  requirements={requirementsData}
                  wireframeData={wireframeData}
                  projectPath={projectPath}
                  isReqFinished={isReqFinished}
                  onSync={() => handleOpenWindsurf()}
                />
              ) : currentMode === 'uat' ? (
                <div className="flex-1 bg-[#fafafa] p-6 overflow-hidden relative">
                  {uatData && uatData.length > 0 ? (
                    <UATInterface testCases={uatData} />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center p-8 bg-[#fbfbfd]/50 backdrop-blur-sm">
                      <div className="max-w-md w-full bg-white rounded-3xl p-8 border border-zinc-200 shadow-[0_2px_8px_rgba(0,0,0,0.06)] text-center flex flex-col items-center gap-5">
                        <div className="w-16 h-16 bg-[#1d1d1f] rounded-full flex flex-col items-center justify-center text-white shadow-md ring-1 ring-black/5 mb-2">
                          <Shield className="w-8 h-8 drop-shadow-sm" />
                        </div>
                        <div>
                          <h2 className="text-xl font-bold text-zinc-900 mb-2 tracking-tight">Standalone QA Mode</h2>
                          <p className="text-sm font-medium text-zinc-500 leading-relaxed text-balance">
                            Please provide project requirements to begin generating User Acceptance Tests.
                          </p>
                        </div>

                        {/* Sync from Builder */}
                        {isReqFinished && Object.keys(requirementsData).length > 0 && (
                          <button
                            onClick={() => handleGenerateUAT(requirementsData)}
                            className="w-full flex items-center justify-center gap-2 px-5 py-3 bg-zinc-900 text-white rounded-2xl text-sm font-semibold hover:bg-black transition-all shadow-md hover:scale-105 active:scale-95"
                          >
                            <RefreshCw className="w-4 h-4" />
                            Sync from Builder
                          </button>
                        )}

                        {/* File Upload Zone */}
                        <label className="w-full relative group cursor-pointer">
                          <div className="absolute inset-0 bg-gradient-to-b from-zinc-50 to-zinc-100/50 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity" />
                          <div className="relative border-2 border-dashed border-zinc-200 group-hover:border-zinc-400 bg-white rounded-2xl p-6 transition-all flex flex-col items-center gap-2">
                            <FileText className="w-6 h-6 text-zinc-400 group-hover:text-zinc-600 transition-colors" />
                            <span className="text-sm font-semibold text-zinc-600 group-hover:text-zinc-900">Upload Markdown SRS</span>
                          </div>
                          <input type="file" className="hidden" accept=".md,.txt" onChange={(e) => {
                            if (e.target.files && e.target.files[0]) {
                              const textReader = new FileReader();
                              textReader.onload = async (event) => {
                                const text = event.target?.result as string;
                                // Do NOT call setRequirementsData here — pass locally only.
                                // Setting global requirementsData would make SDLC steps think the
                                // Builder phase is done and auto-trigger downstream actions.
                                handleGenerateUAT({ "Uploaded Requirements": text });
                              };
                              textReader.readAsText(e.target.files[0]);
                            }
                          }} />
                        </label>
                      </div>
                    </div>
                  )}

                  {isGeneratingUAT && (
                    <div className="absolute inset-0 bg-white/60 backdrop-blur-md flex items-center justify-center z-50">
                      <div className="flex flex-col items-center gap-4 bg-white p-8 rounded-3xl border border-zinc-200 shadow-2xl shadow-black/10 active:scale-95 transition-transform duration-300">
                        <div className="relative w-16 h-16 flex items-center justify-center">
                          <div className="absolute inset-0 border-4 border-zinc-200 rounded-full" />
                          <div className="absolute inset-0 border-4 border-[#1d1d1f] rounded-full border-t-transparent animate-spin" />
                          <Shield className="w-6 h-6 text-[#1d1d1f] animate-pulse" />
                        </div>
                        <div className="text-center">
                          <h3 className="text-sm font-bold text-zinc-900 tracking-tight mb-1">Synthesizing Tests</h3>
                          <p className="text-xs font-medium text-zinc-500">Analyzing edge cases...</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ) : currentMode === 'jira' ? (
                <JiraIssueCreator
                  initialSrsText={builderSrsText}
                  onNextStep={() => {
                    setCurrentStep(2);
                    handleProceedToDesign();
                  }}
                />
              ) : (
                // Standard & Requirements Chat
                <div className="flex-1 flex overflow-hidden">
                  <div className="flex-1 overflow-y-auto no-scrollbar scroll-smooth p-4 md:p-8 pb-8" ref={scrollContainerRef}>
                    <div className="max-w-3xl mx-auto space-y-6">
                      {messages.length === 0 && currentMode === 'requirements' && (
                        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center animate-enter">
                          <div className="w-20 h-20 bg-[#1d1d1f] rounded-3xl flex items-center justify-center text-white mb-8 shadow-md ring-1 ring-black/5">
                            <Box className="w-10 h-10" />
                          </div>
                          <h1 className="text-4xl font-bold text-zinc-900 tracking-tighter mb-4">The Builder Phase.</h1>
                          <p className="text-lg text-zinc-500 max-w-md mx-auto leading-relaxed mb-10">
                            Connect with our Requirements Agent to synthesize your software specification.
                          </p>
                          <div className="flex flex-col items-center gap-4">
                            <button
                              onClick={() => runAgentTurn("START_SESSION", null, [], true)}
                              className="px-8 py-4 bg-zinc-900 text-white rounded-2xl font-semibold text-sm tracking-widest uppercase hover:bg-black transition-all shadow-xl hover:scale-105 active:scale-95 flex items-center gap-3"
                            >
                              Start Interview Process <ArrowRight className="w-4 h-4" />
                            </button>
                            <p className="text-xs text-zinc-400 font-medium">Or simply chat with me below to begin.</p>
                          </div>
                        </div>
                      )}
                      {messages.map((msg) => (

                        <div key={msg.id} className={`flex flex-col gap-1 ${msg.role === 'user' ? 'items-end' : 'items-start'} animate-enter`}>
                          <div className="flex items-center gap-2 px-1">
                            <span className="text-[10px] font-medium text-zinc-500 uppercase tracking-wider">{msg.role === 'user' ? 'You' : 'Monks AI'}</span>
                            <span className="text-[10px] text-zinc-700">{msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                          </div>

                          {(msg as ExtendedMessage).interaction ? (
                            <InteractionCard msg={msg as ExtendedMessage} onResponse={handleInteractionResponse} />
                          ) : (
                            <div className={`max-w-[90%] rounded-2xl p-4 md:p-5 border ${msg.role === 'user'
                              ? 'bg-zinc-100 text-zinc-900 border-zinc-200 shadow-sm rounded-br-sm'
                              : 'bg-transparent text-zinc-700 border-transparent pl-0'
                              }`}>
                              <div className={`prose prose-sm max-w-none font-light leading-relaxed ${msg.role === 'model' ? 'text-[14px]' : ''}`}>
                                {msg.role === 'model' && msg.isStreaming && !msg.text ? (
                                  <div className="flex items-center gap-2 text-zinc-500">
                                    <Loader2 className="w-3 h-3 animate-spin" />
                                    <span className="text-xs">Thinking...</span>
                                  </div>
                                ) : (
                                  <MarkdownRenderer content={msg.text} role={msg.role} />
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      ))}

                      {/* Status Indicator */}
                      {agentStatus && (
                        <div className="flex items-center gap-2 text-xs text-zinc-500 pl-1 animate-pulse">
                          <Activity className="w-3 h-3" />
                          <span>{agentStatus}</span>
                        </div>
                      )}

                      {/* Completion Banners */}
                      {isReqFinished && currentStep === 0 && (
                        <div className="mt-8 p-4 bg-white border border-zinc-200 rounded-xl flex items-center justify-between shadow-sm animate-enter">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-zinc-100 flex items-center justify-center text-zinc-900 border border-zinc-200">
                              <Check className="w-4 h-4" />
                            </div>
                            <div>
                              <h3 className="text-sm font-semibold text-zinc-900">Requirements Finalized</h3>
                              <p className="text-xs text-zinc-500">Blueprint is ready for design.</p>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <button onClick={handleDownloadPDF} className="px-3 py-1.5 rounded-lg text-xs font-medium text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100 border border-transparent hover:border-zinc-200 transition-all">
                              Export PDF
                            </button>
                            <button onClick={() => { setCurrentStep(1); setCurrentMode('jira'); }} className="px-4 py-1.5 rounded-lg text-xs font-medium bg-zinc-100 text-zinc-900 hover:bg-white transition-colors shadow-sm flex items-center gap-2">
                              Proceed to Jira <ArrowRight className="w-3 h-3" />
                            </button>
                            <button onClick={() => { setCurrentStep(2); handleProceedToDesign(); }} className="px-4 py-1.5 rounded-lg text-xs font-medium bg-[#1d1d1f] text-white hover:bg-black transition-colors shadow-sm flex items-center gap-2">
                              Proceed to Design <ArrowRight className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      )}

                      {wireframeData && currentStep === 2 && (
                        <div className="mt-8 flex justify-end animate-enter">
                          <button onClick={() => { setCurrentStep(3); setCurrentMode('dev'); }} className="px-6 py-2.5 rounded-full text-sm font-medium bg-[#1d1d1f] text-white hover:bg-black transition-colors flex items-center gap-2 shadow-md">
                            Start Development <Code className="w-4 h-4" />
                          </button>
                        </div>
                      )}

                      {isLaunched && currentStep === 3 && (
                        <div className="mt-8 flex justify-end animate-enter">
                          <button onClick={() => handleGenerateUAT()} className="px-6 py-2.5 rounded-full text-sm font-medium bg-zinc-100 text-zinc-900 hover:bg-white transition-colors flex items-center gap-2 shadow-lg shadow-white/5">
                            Begin UAT Testing <Shield className="w-4 h-4" />
                          </button>
                        </div>
                      )}

                      <div ref={messagesEndRef} />
                    </div>
                  </div>

                  {/* Requirements Sidebar - Live Document View */}
                  {currentMode === 'requirements' && (
                    <div className="w-[420px] border-l border-white/5 bg-[#1a1a1c] hidden xl:flex flex-col relative z-30 shadow-sm">

                      {/* Header */}
                      <div className="p-4 border-b border-white/5 flex items-center justify-between bg-[#1d1d1f] backdrop-blur-md">
                        <div className="flex items-center gap-2">
                          <FileText className="w-4 h-4 text-white" />
                          <span className="text-xs font-semibold text-white uppercase tracking-wider">Live Specification</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                          <span className="text-[10px] text-zinc-400 font-mono font-bold tracking-tighter">WRITING...</span>
                        </div>
                      </div>

                      {/* Document Canvas */}
                      <div className="flex-1 bg-[#0f0f11] relative overflow-hidden flex flex-col shadow-inner">

                        {/* Form Overlay */}
                        <AnimatePresence>
                          {pendingInteraction && 'fields' in pendingInteraction && (
                            <motion.div
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              exit={{ opacity: 0 }}
                              className="absolute inset-0 z-50 flex flex-col bg-[#0f0f0f]"
                            >
                              <div className="w-full h-full flex flex-col">
                                <FormCard
                                  msg={{ id: pendingInteraction.id, role: 'model', text: '', timestamp: new Date(), form: pendingInteraction as FormData }}
                                  onSubmit={handleFormSubmit}
                                />
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>

                        <div className="overflow-y-auto p-6 bg-[#0f0f11] relative h-full">
                          <div className="min-h-[800px] bg-[#1a1a1c] text-white p-8 shadow-2xl rounded-sm font-serif relative overflow-hidden border border-white/5">

                            {/* Document Header */}
                            <div className="border-b-2 border-white/10 pb-4 mb-8">
                              <h1 className="text-2xl font-bold tracking-tight mb-1 text-white">Software Requirements Specification</h1>
                              <div className="flex justify-between text-[10px] font-sans text-zinc-500 uppercase tracking-widest">
                                <span>Version 1.0</span>
                                <span>{new Date().toLocaleDateString()}</span>
                              </div>
                            </div>

                            {/* Content */}
                            <div className="space-y-8">
                              <AnimatePresence mode="popLayout">
                                {Object.keys(requirementsData).length === 0 ? (
                                  <motion.div
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    className="flex flex-col items-center justify-center py-20 text-zinc-500 gap-4"
                                  >
                                    <div className="w-12 h-12 rounded-full border-2 border-white/10 flex items-center justify-center">
                                      <PenTool className="w-5 h-5 opacity-50 text-zinc-500" />
                                    </div>
                                    <p className="font-sans text-xs uppercase tracking-widest text-zinc-500">Waiting for input...</p>
                                  </motion.div>
                                ) : (
                                  SRS_ORDER.map((title, i) => {
                                    if (!requirementsData[title]) return null;
                                    return (
                                      <motion.div
                                        key={title}
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ duration: 0.5, ease: "easeOut" }}
                                        className="group"
                                      >
                                        <h2 className="text-sm font-bold uppercase tracking-wider mb-2 font-sans text-white flex items-center gap-2">
                                          <span className="text-zinc-500">{i + 1}.0</span>
                                          {title.replace(/^\d+\.\s*/, '')}
                                        </h2>
                                        <div className="text-[13px] leading-relaxed text-zinc-300 whitespace-pre-wrap">
                                          {requirementsData[title].replace(/[#*`]/g, '')}
                                          <motion.span
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: [0, 1, 0] }}
                                            transition={{ repeat: Infinity, duration: 0.8 }}
                                            className="inline-block w-1.5 h-4 bg-zinc-400 ml-1 align-middle"
                                          />
                                        </div>
                                      </motion.div>
                                    );
                                  })
                                )}
                              </AnimatePresence>
                            </div>

                            {/* Footer Watermark */}
                            <div className="absolute bottom-4 right-4 opacity-10 pointer-events-none">
                              <Hexagon className="w-16 h-16" />
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

        </div>

        {/* Input Area (Restored Two-Row Structure) */}
        {currentMode !== 'live' && (
          <div className={`relative z-50 flex-shrink-0 transition-all duration-500 pb-8 ${(!isIntroFinished && isHomeState) ? 'translate-y-20 opacity-0 pointer-events-none' : 'translate-y-0 opacity-100'}`}>
            <div className={`max-w-4xl mx-auto px-6 ${currentMode === 'requirements' ? 'xl:mr-[440px]' : ''}`}>
              <div className="bg-white border border-zinc-200 rounded-2xl shadow-xl focus-within:border-emerald-500/60 focus-within:outline-none transition-none">
                {/* File Preview (inside the container) */}
                <AnimatePresence>
                  {selectedFile && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="px-4 py-2 border-b border-zinc-100 bg-zinc-50 rounded-t-2xl flex items-center gap-2"
                    >
                      <FileText className="w-4 h-4 text-zinc-400" />
                      <span className="text-xs text-zinc-600 truncate flex-1">{selectedFile.name}</span>
                      <button onClick={() => setSelectedFile(null)} className="p-1 hover:text-red-500 transition-colors">
                        <X className="w-4 h-4" />
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Textarea Row */}
                <div className="px-4 pt-3 relative">
                  {!!pendingInteraction && (
                    <div className="absolute inset-x-4 top-3 bottom-0 bg-white/50 backdrop-blur-sm z-10 flex items-center justify-center rounded-lg">
                      <span className="text-xs font-bold text-zinc-500 uppercase tracking-widest flex items-center gap-2">
                        <AlertCircle className="w-3.5 h-3.5 text-orange-500" />
                        Action Required: Complete active form to continue
                      </span>
                    </div>
                  )}
                  <textarea
                    ref={textareaRef}
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyDown={handleKeyDown}
                    disabled={!!pendingInteraction}
                    placeholder={currentMode === 'wireframe' ? "Describe a UI/UX change..." : "Type a message..."}
                    className={`w-full bg-transparent border-none focus:ring-0 focus:outline-none text-zinc-900 placeholder:text-zinc-400 text-sm py-2 resize-none max-h-48 font-light selection:bg-zinc-200 ${!!pendingInteraction ? 'opacity-30' : ''}`}
                    rows={2}
                  />
                </div>

                {/* Controls Row */}
                <div className="px-3 pb-3 flex items-center justify-between border-t border-zinc-50 mt-1">
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="p-2 rounded-lg text-zinc-400 hover:text-zinc-900 hover:bg-zinc-100 transition-all"
                      title="Upload requirements/blueprints"
                    >
                      <Paperclip className="w-4 h-4" />
                    </button>
                    <input type="file" ref={fileInputRef} onChange={handleFileSelect} className="hidden" />

                    <button onClick={toggleLiveSession} className="p-2 rounded-lg text-zinc-400 hover:text-zinc-900 hover:bg-zinc-100 transition-all" title="Start voice session">
                      <Mic className="w-4 h-4" />
                    </button>

                    <div className="w-px h-4 bg-zinc-200 mx-1" />

                    {/* Compact Mode Selector */}
                    <div className="relative">
                      <button onClick={() => setShowModeSelector(!showModeSelector)} className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[10px] font-bold text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100 transition-all uppercase tracking-wider">
                        {getModeLabel(currentMode)}
                        <ChevronDown className="w-3 h-3" />
                      </button>
                      <AnimatePresence>
                        {showModeSelector && (
                          <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: -10 }}
                            animate={{ opacity: 1, scale: 1, y: -4 }}
                            exit={{ opacity: 0, scale: 0.95, y: -10 }}
                            className="absolute bottom-full left-0 mb-2 w-48 bg-white border border-zinc-200 rounded-xl shadow-2xl p-1.5 z-[100] ring-1 ring-black/5"
                          >
                            {[
                              { id: 'standard', label: 'Standard' },
                              { id: 'requirements', label: 'Requirements' },
                              { id: 'wireframe', label: 'UI/UX Design' },
                              { id: 'dev', label: 'Development' },
                              { id: 'uat', label: 'UAT Testing' },
                              { id: 'live', label: 'Voice' },
                            ].map(m => (
                              <button key={m.id} onClick={() => { handleModeChange(m.id as AppMode); setShowModeSelector(false); }} className={`w-full text-left px-3 py-2 rounded-lg text-xs font-medium transition-all ${currentMode === m.id ? 'bg-zinc-100 text-zinc-900' : 'text-zinc-500 hover:bg-zinc-50 hover:text-zinc-900'}`}>
                                {m.label}
                              </button>
                            ))}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </div>

                  <button
                    onClick={handleSend}
                    disabled={(!inputValue.trim() && !selectedFile) || isTyping}
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all duration-300 font-bold text-xs uppercase tracking-wider ${inputValue.trim() || selectedFile
                      ? 'bg-[#1d1d1f] text-white shadow-md hover:bg-black'
                      : 'bg-zinc-100 text-zinc-400'
                      }`}
                  >
                    <span>Send</span>
                    <ArrowUp className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ChatInterface;
