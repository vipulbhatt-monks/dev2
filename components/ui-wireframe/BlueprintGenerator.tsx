import React, { useState } from 'react';
import {
  Layout, FileText, Settings, Users, Zap, CheckCircle2,
  AlertCircle, Loader2, ArrowRight, ExternalLink, Code
} from 'lucide-react';
import { UIBlueprintResponse, UIBlueprintError } from './types';
import { generateUIStructured, generateUIFromDoc, saveUIBlueprint } from '../../services/service';

interface BlueprintGeneratorProps {
  onBlueprintGenerated?: (blueprint: UIBlueprintResponse) => void;
}

const BlueprintGenerator: React.FC<BlueprintGeneratorProps> = ({ onBlueprintGenerated }) => {
  const [mode, setMode] = useState<'structured' | 'doc'>('structured');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<UIBlueprintError | null>(null);
  const [blueprint, setBlueprint] = useState<UIBlueprintResponse | null>(null);
  const [selectedScreenIndex, setSelectedScreenIndex] = useState(0);
  const [isSaving, setIsSaving] = useState(false);
  const [saveResult, setSaveResult] = useState<{ success: boolean; path?: string } | null>(null);

  // Structured Inputs
  const [projectName, setProjectName] = useState('');
  const [userRoles, setUserRoles] = useState('');
  const [features, setFeatures] = useState('');
  const [constraints, setConstraints] = useState('');

  // Doc Input
  const [requirementsDoc, setRequirementsDoc] = useState('');

  const handleGenerate = async () => {
    setIsLoading(true);
    setError(null);
    setBlueprint(null);
    setSaveResult(null);

    let result: UIBlueprintResponse | UIBlueprintError;

    if (mode === 'structured') {
      result = await generateUIStructured(
        projectName,
        userRoles.split(',').map(s => s.trim()).filter(Boolean),
        features.split(',').map(s => s.trim()).filter(Boolean),
        constraints.split(',').map(s => s.trim()).filter(Boolean)
      );
    } else {
      result = await generateUIFromDoc(projectName, requirementsDoc);
    }

    if ('error' in result) {
      setError(result);
    } else {
      setBlueprint(result);
      if (onBlueprintGenerated) onBlueprintGenerated(result);
    }

    setIsLoading(false);
  };

  const handleSaveAndOpen = async () => {
    if (!blueprint) return;
    setIsSaving(true);
    const result = await saveUIBlueprint(projectName, blueprint);
    if (result.success) {
      setSaveResult({ success: true, path: result.path });
    } else {
      alert("Failed to save: " + result.error);
    }
    setIsSaving(false);
  };

  return (
    <div className="flex flex-col h-full bg-gray-50/50">
      {!blueprint ? (
        <div className="flex-1 flex flex-col items-center justify-center p-6 animate-enter">
          <div className="w-full max-w-2xl bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="border-b border-gray-100 p-1 flex bg-gray-50/50">
              <button
                onClick={() => setMode('structured')}
                className={`flex-1 py-2.5 text-xs font-medium rounded-lg flex items-center justify-center gap-2 transition-all ${mode === 'structured' ? 'bg-white text-black shadow-sm ring-1 ring-black/5' : 'text-gray-500 hover:bg-gray-100'}`}
              >
                <Settings className="w-3.5 h-3.5" /> Structured Input
              </button>
              <button
                onClick={() => setMode('doc')}
                className={`flex-1 py-2.5 text-xs font-medium rounded-lg flex items-center justify-center gap-2 transition-all ${mode === 'doc' ? 'bg-white text-black shadow-sm ring-1 ring-black/5' : 'text-gray-500 hover:bg-gray-100'}`}
              >
                <FileText className="w-3.5 h-3.5" /> Requirements Doc
              </button>
            </div>

            <div className="p-8 space-y-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">Project Name</label>
                  <input
                    type="text"
                    value={projectName}
                    onChange={(e) => setProjectName(e.target.value)}
                    placeholder="e.g. Task Manager Pro"
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-black/5 focus:border-black/20 transition-all font-medium"
                  />
                </div>

                {mode === 'structured' ? (
                  <>
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">User Roles</label>
                      <input
                        type="text"
                        value={userRoles}
                        onChange={(e) => setUserRoles(e.target.value)}
                        placeholder="Admin, Customer, Guest (comma separated)"
                        className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-black/5 focus:border-black/20 transition-all"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">Key Features</label>
                      <textarea
                        value={features}
                        onChange={(e) => setFeatures(e.target.value)}
                        placeholder="Login, Dashboard, Payment Gateway (comma separated)"
                        className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-black/5 focus:border-black/20 transition-all h-24 resize-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">Constraints</label>
                      <input
                        type="text"
                        value={constraints}
                        onChange={(e) => setConstraints(e.target.value)}
                        placeholder="Mobile-first, Dark mode, Fast load (comma separated)"
                        className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-black/5 focus:border-black/20 transition-all"
                      />
                    </div>
                  </>
                ) : (
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">Requirements Document</label>
                    <textarea
                      value={requirementsDoc}
                      onChange={(e) => setRequirementsDoc(e.target.value)}
                      placeholder="Paste your full SRS or requirements document here..."
                      className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-black/5 focus:border-black/20 transition-all h-64 resize-none font-mono text-sm"
                    />
                  </div>
                )}
              </div>

              {error && (
                <div className="p-4 bg-red-50 border border-red-100 rounded-xl flex items-start gap-3 text-red-600 animate-enter">
                  <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                  <div>
                    <h3 className="text-sm font-semibold">Generation Failed</h3>
                    <p className="text-xs mt-1 opacity-90">{error.details || error.error}</p>
                  </div>
                </div>
              )}

              <button
                onClick={handleGenerate}
                disabled={isLoading || !projectName.trim()}
                className="w-full py-3.5 bg-black text-white rounded-xl font-medium hover:bg-gray-900 active:scale-[0.99] transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-black/10"
              >
                {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Zap className="w-5 h-5" />}
                {isLoading ? 'Generating Blueprint...' : 'Generate Wireframe Blueprint'}
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex overflow-hidden">
          {/* Sidebar - Screen List */}
          <div className="w-64 bg-white border-r border-gray-200 flex flex-col">
            <div className="p-4 border-b border-gray-100">
              <h2 className="text-sm font-bold font-display uppercase tracking-wider text-gray-800">Screens</h2>
              <p className="text-[10px] text-gray-400 mt-1">{blueprint.screens.length} screens generated</p>
            </div>
            <div className="flex-1 overflow-y-auto p-2 space-y-1">
              {blueprint.screens.map((screen, idx) => (
                <button
                  key={idx}
                  onClick={() => setSelectedScreenIndex(idx)}
                  className={`w-full text-left px-3 py-2 rounded-lg text-xs font-medium transition-colors flex items-center gap-2 ${selectedScreenIndex === idx ? 'bg-black text-white' : 'text-gray-600 hover:bg-gray-50'}`}
                >
                  <Layout className="w-3.5 h-3.5 opacity-70" />
                  {screen.name}
                </button>
              ))}
            </div>
            <div className="p-4 border-t border-gray-100 bg-gray-50/50">
              <button
                onClick={handleSaveAndOpen}
                disabled={isSaving}
                className="w-full py-2 bg-white border border-gray-200 hover:border-blue-300 hover:text-blue-600 text-gray-600 rounded-lg text-xs font-medium transition-all flex items-center justify-center gap-2 shadow-sm"
              >
                {isSaving ? <Loader2 className="w-3 h-3 animate-spin" /> : <ExternalLink className="w-3 h-3" />}
                Open in Windsurf
              </button>
              {saveResult && (
                <div className="mt-2 text-[10px] text-green-600 flex items-center gap-1 justify-center">
                  <CheckCircle2 className="w-3 h-3" /> Saved to {saveResult.path?.split('/').pop()}
                </div>
              )}
            </div>
          </div>

          {/* Main Canvas - Preview */}
          <div className="flex-1 bg-gray-50/50 p-8 overflow-y-auto flex flex-col items-center">
            <div className="w-full max-w-4xl space-y-8">

              {/* Screen Preview */}
              <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden min-h-[600px] flex flex-col">
                <div className="h-12 border-b border-gray-100 flex items-center px-6 justify-between bg-white">
                  <div className="flex items-center gap-2">
                    <div className="flex gap-1.5">
                      <div className="w-2.5 h-2.5 rounded-full bg-red-400/20 border border-red-400/40"></div>
                      <div className="w-2.5 h-2.5 rounded-full bg-amber-400/20 border border-amber-400/40"></div>
                      <div className="w-2.5 h-2.5 rounded-full bg-green-400/20 border border-green-400/40"></div>
                    </div>
                    <div className="h-4 w-px bg-gray-200 mx-2"></div>
                    <span className="text-xs font-semibold text-gray-600">{blueprint.screens[selectedScreenIndex].name}</span>
                  </div>
                  <div className="text-[10px] font-mono text-gray-400">1200 x 800</div>
                </div>

                <div className="flex-1 p-8 relative bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:20px_20px]">
                  <div className="grid grid-cols-12 gap-4">
                    {blueprint.screens[selectedScreenIndex].components.map((comp, i) => {
                      // Simple heuristic for layout
                      const isNav = comp.toLowerCase().includes('nav') || comp.toLowerCase().includes('header');
                      const isButton = comp.toLowerCase().includes('button') || comp.toLowerCase().includes('cta');
                      const isInput = comp.toLowerCase().includes('input') || comp.toLowerCase().includes('field') || comp.toLowerCase().includes('search');
                      const isCard = comp.toLowerCase().includes('card') || comp.toLowerCase().includes('grid') || comp.toLowerCase().includes('list');

                      let className = "bg-white border border-gray-200 rounded-xl p-4 shadow-sm flex items-center justify-center text-sm font-medium text-gray-500 min-h-[60px]";
                      let colSpan = "col-span-12"; // Default full width

                      if (isNav) {
                        className += " bg-gray-900 text-white border-gray-900";
                      } else if (isButton) {
                        colSpan = "col-span-3";
                        className += " bg-blue-600 text-white border-blue-600 rounded-full";
                      } else if (isInput) {
                        colSpan = "col-span-6";
                        className += " bg-gray-50 border-gray-300 justify-start px-4";
                      } else if (isCard) {
                        colSpan = "col-span-4";
                        className += " min-h-[200px] items-start pt-6";
                      }

                      return (
                        <div key={i} className={`${colSpan} ${className} relative group transition-all hover:shadow-md hover:-translate-y-0.5`}>
                          {comp}
                          <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Code className="w-3 h-3 text-gray-400" />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* User Flows */}
              <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
                <h3 className="text-sm font-bold font-display uppercase tracking-wider text-gray-800 mb-4 flex items-center gap-2">
                  <Users className="w-4 h-4 text-gray-400" /> User Flows
                </h3>
                <div className="space-y-3">
                  {blueprint.userFlows.map((flow, i) => (
                    <div key={i} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg border border-gray-100 text-sm text-gray-600">
                      <span className="font-mono text-xs text-gray-400 mt-0.5">0{i + 1}</span>
                      {flow}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BlueprintGenerator;