/**
 * EditorToolbar Component
 * Top toolbar with block list toggle, AI tools, and stats
 */

import React from 'react';
import { Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

interface EditorToolbarProps {
  showListView: boolean;
  onToggleListView: () => void;
  blockCount: number;
  onOpenPageImprove: () => void;
  canImprove: boolean;
  onToggleAIChat: () => void;
  isAIChatOpen: boolean;
}

export const EditorToolbar: React.FC<EditorToolbarProps> = ({
  showListView,
  onToggleListView,
  blockCount,
  onOpenPageImprove,
  canImprove,
  onToggleAIChat,
  isAIChatOpen,
}) => {
  return (
    <div className="fixed top-0 left-0 right-0 h-14 bg-white border-b border-gray-200 flex items-center px-4 z-50">
      <div className="flex items-center gap-2">
        {/* Block List Toggle Button */}
        <button
          onClick={onToggleListView}
          className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-md transition-colors"
          title="Toggle block list"
        >
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 6h16M4 12h16M4 18h16"
            />
          </svg>
          <span>{showListView ? 'Hide' : 'Show'} List</span>
        </button>
      </div>

      <div className="ml-auto flex items-center gap-2">
        {/* Page-level AI Improvement Button */}
        <button
          onClick={onOpenPageImprove}
          disabled={!canImprove}
          className={cn(
            "flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-md transition-colors",
            !canImprove
              ? "text-gray-400 cursor-not-allowed"
              : "bg-gradient-to-r from-purple-500 to-purple-600 text-white hover:from-purple-600 hover:to-purple-700 shadow-sm hover:shadow-md"
          )}
          title="페이지 전체 AI 개선"
        >
          <Sparkles className="w-4 h-4" />
          <span>페이지 AI 개선</span>
        </button>

        {/* AI Chat Toggle Button */}
        <button
          onClick={onToggleAIChat}
          className={`flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-md transition-colors ${
            isAIChatOpen
              ? 'bg-purple-100 text-purple-700 hover:bg-purple-200'
              : 'text-gray-700 hover:bg-gray-100'
          }`}
          title="AI 어시스턴트"
        >
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
            />
          </svg>
          <span>AI Chat</span>
        </button>

        <span className="text-sm text-gray-500">
          {blockCount} blocks
        </span>
      </div>
    </div>
  );
};
