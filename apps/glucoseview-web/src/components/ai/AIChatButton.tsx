import { useState } from 'react';
import AIChatWidget from './AIChatWidget';

interface AIChatButtonProps {
  userName?: string;
  context?: Record<string, unknown>;
  apiKey?: string;
}

/**
 * AI Chat Floating Button
 *
 * 화면 우하단 고정 버튼 + 채팅 위젯
 */
export default function AIChatButton({ userName, context, apiKey }: AIChatButtonProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      {/* Chat Widget */}
      {isOpen && (
        <div className="fixed bottom-24 right-6 z-50">
          <AIChatWidget
            userName={userName}
            context={context}
            apiKey={apiKey}
            onClose={() => setIsOpen(false)}
          />
        </div>
      )}

      {/* Floating Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-6 right-6 z-50 w-14 h-14 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-full shadow-lg hover:shadow-xl transition-all duration-300 flex items-center justify-center group"
        title="AI 어시스턴트"
      >
        {isOpen ? (
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        ) : (
          <>
            <span className="text-2xl group-hover:scale-110 transition-transform">🤖</span>
            <span className="absolute -top-1 -right-1 w-3 h-3 bg-green-400 rounded-full animate-pulse" />
          </>
        )}
      </button>
    </>
  );
}
