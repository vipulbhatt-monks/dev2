import React from 'react';
import { WireframeElement } from './types';
import * as Icons from 'lucide-react';

interface WireframeNodeProps {
  element: WireframeElement;
}

const WireframeNode: React.FC<WireframeNodeProps> = ({ element }) => {
  const { type, x, y, width, height, style, label, content, iconName, children } = element;

  const commonStyle: React.CSSProperties = {
    position: 'absolute',
    left: x,
    top: y,
    width: width,
    height: height,
    ...style,
  };

  const renderContent = () => {
    switch (type) {
      case 'container':
      case 'card':
        return (
          <div 
            className="bg-white border border-gray-300 rounded-lg shadow-sm overflow-hidden" 
            style={commonStyle}
          >
            {children?.map((child: WireframeElement) => <WireframeNode key={child.id} element={child} />)}
          </div>
        );
      case 'button':
        return (
          <button 
            className="bg-blue-600 text-white rounded px-4 flex items-center justify-center hover:bg-blue-700 transition-colors"
            style={commonStyle}
          >
            {label || content}
          </button>
        );
      case 'input':
        return (
          <input 
            type="text" 
            placeholder={label} 
            className="border border-gray-300 rounded px-3 bg-white text-gray-700"
            style={commonStyle}
            readOnly
          />
        );
      case 'text':
        return (
          <div 
            className="flex items-center text-gray-800"
            style={{ ...commonStyle, alignItems: style?.alignItems || 'center' }}
          >
            {content}
          </div>
        );
      case 'image':
        return (
          <div 
            className="bg-gray-200 flex items-center justify-center text-gray-400 rounded overflow-hidden"
            style={commonStyle}
          >
            {content ? (
                <img src={content} alt="wireframe" className="w-full h-full object-cover" />
            ) : (
                <Icons.Image className="w-8 h-8" />
            )}
          </div>
        );
      case 'avatar':
        return (
            <div 
                className="rounded-full bg-gray-300 flex items-center justify-center overflow-hidden"
                style={commonStyle}
            >
                {content ? (
                    <img src={content} alt="avatar" className="w-full h-full object-cover" />
                ) : (
                    <Icons.User className="w-1/2 h-1/2 text-gray-500" />
                )}
            </div>
        );
      case 'icon':
        const IconComponent = iconName && (Icons as any)[iconName] ? (Icons as any)[iconName] : Icons.HelpCircle;
        return (
          <div 
            className="flex items-center justify-center text-gray-600"
            style={commonStyle}
          >
            <IconComponent className="w-full h-full" />
          </div>
        );
      default:
        return <div style={commonStyle} className="border border-dashed border-red-500" />;
    }
  };

  return renderContent();
};

export default WireframeNode;
