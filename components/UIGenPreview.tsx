import React, { useEffect, useRef } from 'react';

interface UIGenPreviewProps {
  code: string;
}

const UIGenPreview: React.FC<UIGenPreviewProps> = ({ code }) => {
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    if (iframeRef.current) {
      const doc = iframeRef.current.contentDocument;
      if (doc) {
        doc.open();
        doc.write(`
          <!DOCTYPE html>
          <html>
            <head>
              <script src="https://cdn.tailwindcss.com"></script>
              <style>
                body { margin: 0; padding: 20px; font-family: sans-serif; }
              </style>
            </head>
            <body>
              ${code}
            </body>
          </html>
        `);
        doc.close();
      }
    }
  }, [code]);

  return (
    <div className="w-full h-full bg-gray-50 border border-gray-200 rounded-xl overflow-hidden shadow-sm">
      <div className="bg-gray-100 px-4 py-2 border-b border-gray-200 flex items-center justify-between">
        <span className="text-xs font-mono text-gray-500 uppercase tracking-wider">Preview</span>
        <div className="flex gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-red-400/50"></div>
          <div className="w-2.5 h-2.5 rounded-full bg-yellow-400/50"></div>
          <div className="w-2.5 h-2.5 rounded-full bg-green-400/50"></div>
        </div>
      </div>
      <iframe 
        ref={iframeRef} 
        className="w-full h-[calc(100%-36px)] bg-white" 
        title="UI Preview"
      />
    </div>
  );
};

export default UIGenPreview;
