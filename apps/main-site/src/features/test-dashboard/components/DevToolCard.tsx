import { FC } from 'react';
import { DevTool } from '../types';

interface DevToolCardProps {
  tool: DevTool;
  onClick?: (tool: DevTool) => void;
}

export const DevToolCard: FC<DevToolCardProps> = ({ 
  tool, 
  onClick 
}) => {
  const handleClick = () => {
    if (onClick) {
      onClick(tool);
    } else {
      window.location.href = tool.url;
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'api':
        return 'bg-blue-600';
      case 'database':
        return 'bg-green-600';
      case 'auth':
        return 'bg-yellow-600';
      case 'performance':
        return 'bg-red-600';
      default:
        return 'bg-gray-600';
    }
  };

  const getCategoryLabel = (category: string) => {
    switch (category) {
      case 'api':
        return 'API';
      case 'database':
        return 'DB';
      case 'auth':
        return '인증';
      case 'performance':
        return '성능';
      default:
        return '기타';
    }
  };

  const getIconComponent = (iconName: string) => {
    switch (iconName) {
      case 'code':
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
          </svg>
        );
      case 'database':
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" />
          </svg>
        );
      case 'shield':
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
          </svg>
        );
      case 'activity':
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
        );
      case 'file-text':
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        );
      case 'play-circle':
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h1.586a1 1 0 01.707.293l2.414 2.414a1 1 0 00.707.293H15M9 10V9a2 2 0 012-2h2a2 2 0 012 2v1M9 10v5a2 2 0 002 2h2a2 2 0 002-2v-5" />
          </svg>
        );
      default:
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
          </svg>
        );
    }
  };

  return (
    <div 
      onClick={handleClick}
      className="bg-gray-800 border border-gray-700 rounded-lg p-4 hover:border-gray-600 hover:bg-gray-750 transition-all cursor-pointer group"
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="text-blue-400">
            {getIconComponent(tool.icon)}
          </div>
          <div>
            <h3 className="text-white font-medium group-hover:text-blue-400 transition-colors">
              {tool.name}
            </h3>
            {tool.shortcut && (
              <p className="text-xs text-gray-500 font-mono mt-1">
                {tool.shortcut}
              </p>
            )}
          </div>
        </div>
        <span className={`px-2 py-1 rounded text-xs font-medium text-white ${getCategoryColor(tool.category)}`}>
          {getCategoryLabel(tool.category)}
        </span>
      </div>

      <p className="text-gray-400 text-sm leading-relaxed mb-3">
        {tool.description}
      </p>

      <div className="flex items-center justify-between">
        <span className="text-xs text-gray-500 font-mono">
          {tool.url}
        </span>
        <div className="flex items-center text-xs text-gray-400">
          <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
          </svg>
          <span>실행</span>
        </div>
      </div>
    </div>
  );
};