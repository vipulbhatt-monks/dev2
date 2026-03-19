'use client';

import React, { useEffect, useState, useId } from 'react';
import { createPortal } from 'react-dom';
import mermaid from 'mermaid';
import { 
  Maximize2, 
  Code, 
  Eye, 
  X, 
  ZoomIn, 
  ZoomOut, 
  AlertCircle,
  Download
} from 'lucide-react';


mermaid.initialize({
  startOnLoad: false,
  theme: 'base',
  suppressErrorRendering: true,
  logLevel: 'error',
  securityLevel: 'loose',
  fontFamily: 'Inter, sans-serif',
  themeVariables: {
    primaryColor: '#ffffff',
    primaryTextColor: '#000000',
    primaryBorderColor: '#000000',
    lineColor: '#000000',
    secondaryColor: '#f3f4f6',
    tertiaryColor: '#ffffff',
    noteBkgColor: '#f3f4f6',
    noteTextColor: '#000000',
    fontSize: '14px',
  }
});

interface MermaidProps {
  chart: string;
  mode?: 'chat' | 'fullscreen';
  onCodeChange?: (newCode: string) => void;
}

const Mermaid: React.FC<MermaidProps> = ({ chart, mode = 'chat', onCodeChange }) => {
  const id = useId().replace(/:/g, '');
  const [svg, setSvg] = useState<string>('');
  const [isError, setIsError] = useState(false);
  const [viewMode, setViewMode] = useState<'preview' | 'code'>('preview');
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [isClient, setIsClient] = useState(false);
  const [localCode, setLocalCode] = useState(chart);

  useEffect(() => {
    setIsClient(true);
  }, []);

  
  useEffect(() => {
      setLocalCode(chart);
  }, [chart]);

  useEffect(() => {
   
    if (!localCode || !isClient) return;

    let isMounted = true;
    
    const timeoutId = setTimeout(async () => {
      try {
        await mermaid.parse(localCode);
        
        if (!isMounted) return;

        const { svg } = await mermaid.render(`mermaid-${id}`, localCode);
        
        if (isMounted) {
          setSvg(svg);
          setIsError(false);
        }
      } catch (error) {
        if (isMounted) {
          setIsError(true);
        }
      }
    }, 400);

    return () => {
      isMounted = false;
      clearTimeout(timeoutId);
    };
  }, [localCode, id, isClient]);


  useEffect(() => {
    if (isFullScreen) {
      document.body.style.overflow = 'hidden';
      setZoom(1); 
    } else {
      document.body.style.overflow = '';
      setZoom(1); 
    }
    return () => { document.body.style.overflow = ''; }
  }, [isFullScreen]);

  const handleZoom = (delta: number) => {
    setZoom(prev => Math.max(0.5, Math.min(5, prev + delta)));
  };

  const handleDownload = () => {
    if (!svg) return;
    const blob = new Blob([svg], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `diagram-${id}.svg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleCodeChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const val = e.target.value;
      setLocalCode(val);
      if (onCodeChange) onCodeChange(val);
  };

  const renderInlineContent = () => {
    if (viewMode === 'code') {
        return (
            <div className={`relative group w-full ${mode === 'fullscreen' ? 'h-full' : 'h-full'}`}>
                {isError && (
                    <div className="absolute top-2 right-2 flex items-center gap-1.5 px-2 py-1 bg-red-50 text-red-600 rounded-md text-[10px] font-medium border border-red-100 z-10 pointer-events-none">
                        <AlertCircle className="w-3 h-3" />
                        <span>Syntax Error</span>
                    </div>
                )}
               
                <textarea 
                    value={localCode}
                    onChange={handleCodeChange}
                    className={`w-full h-full p-4 text-xs font-mono leading-relaxed text-gray-700 bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-100 resize-none ${mode === 'fullscreen' ? 'rounded-none border-0' : ''}`}
                    spellCheck={false}
                />
            </div>
        );
    }

    if (isError && viewMode === 'preview') {
         return (
             <div className="flex flex-col items-center justify-center h-full text-red-500 gap-2 p-8 text-center">
                 <AlertCircle className="w-6 h-6" />
                 <p className="text-xs font-mono">Unable to render diagram. Check code for syntax errors.</p>
             </div>
         )
    }

    if (!svg) {
        return (
            <div className="flex items-center justify-center py-12 text-gray-400 gap-2 w-full h-full">
                <div className="w-2 h-2 bg-gray-300 rounded-full animate-bounce" style={{ animationDelay: '0s' }} />
                <div className="w-2 h-2 bg-gray-300 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
                <div className="w-2 h-2 bg-gray-300 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
            </div>
        );
    }

    return (
        <div className={`flex justify-center items-center ${mode === 'fullscreen' ? 'min-h-full p-0' : 'p-8'}`}>
   
            <div 
                dangerouslySetInnerHTML={{ __html: svg }} 
                className={mode === 'fullscreen' ? "w-full h-full flex items-center justify-center" : "max-w-full overflow-hidden"}
                style={mode === 'fullscreen' ? { 
                    /* Force SVG to scale nicely within the live preview panel */
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    height: '100%',
                    width: '100%'
                 } : {}}
            />
           
             {mode === 'fullscreen' && (
                <style dangerouslySetInnerHTML={{__html: `#mermaid-${id} { width: 100%; height: 100%; max-height: 100%; }`}} />
            )}
        </div>
    );
  };

  if (!isClient) return null;

  return (
    <>
        <div className={
            mode === 'chat' 
            ? `border border-gray-100 rounded-xl my-6 bg-white shadow-[0_2px_8px_rgba(0,0,0,0.04)] overflow-hidden transition-all duration-300 ${isError ? 'border-red-100 ring-1 ring-red-50' : ''}`
            : `h-full w-full flex flex-col bg-white ${isError ? 'bg-red-50/5' : ''}`
        }>
            
            <div className={`flex items-center justify-between px-3 py-2 border-b border-gray-100 bg-gray-50/50 backdrop-blur-sm shrink-0 ${mode === 'fullscreen' ? 'px-4 py-3' : ''}`}>
                <div className="flex items-center gap-1 bg-gray-200/50 p-0.5 rounded-lg">
                    <button
                        onClick={() => setViewMode('preview')}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[11px] font-medium transition-all ${viewMode === 'preview' ? 'bg-white text-black shadow-sm' : 'text-gray-500 hover:text-black'}`}
                    >
                        <Eye className="w-3.5 h-3.5" />
                        Preview
                    </button>
                    <button
                        onClick={() => setViewMode('code')}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[11px] font-medium transition-all ${viewMode === 'code' ? 'bg-white text-black shadow-sm' : 'text-gray-500 hover:text-black'}`}
                    >
                        <Code className="w-3.5 h-3.5" />
                        Code
                    </button>
                </div>

                <div className="flex items-center gap-2">
                    <button 
                        onClick={handleDownload}
                        disabled={isError}
                        className="p-1.5 text-gray-400 hover:text-black hover:bg-white hover:shadow-sm rounded-md transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                        title="Download SVG"
                    >
                        <Download className="w-4 h-4" />
                    </button>
                    <button 
                        onClick={() => setIsFullScreen(true)}
                        disabled={viewMode === 'code'}
                        className="p-1.5 text-gray-400 hover:text-black hover:bg-white hover:shadow-sm rounded-md transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                        title="Fullscreen"
                    >
                        <Maximize2 className="w-4 h-4" />
                    </button>
                </div>
            </div>

  
            <div className={
                mode === 'chat'
                ? "relative bg-white min-h-[150px] max-h-[500px] overflow-auto no-scrollbar"
                : "relative flex-1 bg-white overflow-hidden" 
            }>
                {renderInlineContent()}
            </div>
        </div>


        {isFullScreen && createPortal(
            <div className="fixed inset-0 z-[9999] bg-white animate-enter flex flex-col w-screen h-screen">
              
                <div className="absolute top-6 right-6 z-[10000] flex items-center gap-3">
                 
                    <div className="flex items-center gap-1 bg-white/90 backdrop-blur-md shadow-[0_4px_20px_rgba(0,0,0,0.08)] border border-gray-100 p-1.5 rounded-full transition-all hover:shadow-[0_8px_30px_rgba(0,0,0,0.12)] hover:bg-white">
                        <button onClick={() => handleZoom(-0.25)} className="p-2 hover:bg-gray-100 rounded-full text-gray-500 transition-colors">
                            <ZoomOut className="w-4 h-4" />
                        </button>
                        <span className="w-10 text-center text-[10px] font-mono font-medium text-gray-600 select-none">{Math.round(zoom * 100)}%</span>
                        <button onClick={() => handleZoom(0.25)} className="p-2 hover:bg-gray-100 rounded-full text-gray-500 transition-colors">
                            <ZoomIn className="w-4 h-4" />
                        </button>
                    </div>

                    <button 
                        onClick={handleDownload}
                        className="p-3 bg-white border border-gray-100 text-gray-700 rounded-full shadow-lg hover:bg-gray-50 transition-all hover:scale-105 active:scale-95 group"
                    >
                        <Download className="w-5 h-5" />
                    </button>

                    {/* Close Button */}
                    <button 
                        onClick={() => setIsFullScreen(false)}
                        className="p-3 bg-black text-white rounded-full shadow-lg shadow-black/20 hover:bg-gray-800 transition-all hover:scale-105 active:scale-95 group"
                    >
                        <X className="w-5 h-5 group-hover:rotate-90 transition-transform duration-300" />
                    </button>
                </div>

         
                <div className="w-full h-full overflow-auto flex items-center justify-center bg-gray-50/50 cursor-grab active:cursor-grabbing p-8">
                    
                     {svg && (
                         <img 
                            src={`data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`}
                            alt="Mermaid Diagram"
                            style={{
                            
                                maxWidth: zoom <= 1 ? '100%' : 'none',
                                maxHeight: zoom <= 1 ? '100%' : 'none',
                                width: zoom <= 1 ? '100%' : 'auto',
                                height: zoom <= 1 ? '100%' : 'auto',
                                objectFit: 'contain',
                                transform: zoom > 1 ? `scale(${zoom})` : 'none',
                                transformOrigin: 'center center',
                                transition: 'all 0.2s ease-out',
                                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.1)',
                                background: 'white',
                                padding: '20px',
                                borderRadius: '8px'
                            }}
                            draggable={false}
                         />
                     )}
                </div>
            </div>,
            document.body
        )}
    </>
  );
};

export default Mermaid;