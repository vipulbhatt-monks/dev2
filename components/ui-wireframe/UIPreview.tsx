import React, { useState } from 'react';
import { Smartphone, Monitor, Code, Eye, RefreshCw } from 'lucide-react';

interface UIPreviewProps {
  code?: string;
  isGenerating?: boolean;
}

const UIPreview: React.FC<UIPreviewProps> = ({ code = '', isGenerating = false }) => {
  const [viewMode, setViewMode] = useState<'preview' | 'code'>('preview');
  const [device, setDevice] = useState<'mobile' | 'desktop'>('mobile');

  return (
    <div className="flex flex-col h-full bg-gray-50 border-r border-gray-200">
      {/* Toolbar */}
      <div className="h-12 border-b border-gray-200 bg-white flex items-center justify-between px-4">
        <div className="flex items-center gap-2">
          <div className="flex bg-gray-100 p-1 rounded-lg">
            <button 
              onClick={() => setDevice('mobile')}
              className={`p-1.5 rounded-md transition-all ${device === 'mobile' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
            >
              <Smartphone className="w-4 h-4" />
            </button>
            <button 
              onClick={() => setDevice('desktop')}
              className={`p-1.5 rounded-md transition-all ${device === 'desktop' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
            >
              <Monitor className="w-4 h-4" />
            </button>
          </div>
          <span className="text-xs font-medium text-gray-500 ml-2">
            {isGenerating ? 'Generating UI...' : 'Live Preview'}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button 
            onClick={() => setViewMode(viewMode === 'preview' ? 'code' : 'preview')}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            {viewMode === 'preview' ? <Code className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
            {viewMode === 'preview' ? 'View Code' : 'View Preview'}
          </button>
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-hidden relative flex items-center justify-center p-8 bg-gray-100/50">
        {viewMode === 'preview' ? (
          <div 
            className={`bg-white shadow-2xl transition-all duration-500 overflow-hidden relative ${
              device === 'mobile' 
                ? 'w-[375px] h-[812px] rounded-[40px] border-[8px] border-gray-900' 
                : 'w-full h-full max-w-5xl max-h-[800px] rounded-xl border border-gray-200'
            }`}
          >
            {/* Mock Header for Device */}
            {device === 'mobile' && (
              <div className="absolute top-0 left-0 right-0 h-6 bg-gray-900 z-20 flex justify-center">
                <div className="w-32 h-4 bg-black rounded-b-xl" />
              </div>
            )}

            {/* Preview Content */}
            <div className="w-full h-full overflow-auto bg-white">
              {code ? (
                <iframe 
                  srcDoc={code} 
                  className="w-full h-full border-0" 
                  title="Preview"
                  sandbox="allow-scripts"
                />
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-gray-400 space-y-4">
                  {isGenerating ? (
                    <>
                      <RefreshCw className="w-8 h-8 animate-spin text-blue-500" />
                      <p className="text-sm font-medium text-gray-500">Building Interface...</p>
                    </>
                  ) : (
                    <>
                      <div className="w-16 h-16 rounded-2xl bg-gray-50 border border-gray-100 flex items-center justify-center">
                        <Smartphone className="w-8 h-8 text-gray-300" />
                      </div>
                      <p className="text-sm">No UI Generated Yet</p>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="w-full h-full bg-[#1e1e1e] overflow-auto p-4 font-mono text-xs text-gray-300">
            <pre>{code || '// No code generated yet'}</pre>
          </div>
        )}
      </div>
    </div>
  );
};

export default UIPreview;
