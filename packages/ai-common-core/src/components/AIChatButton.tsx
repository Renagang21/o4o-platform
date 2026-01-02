import React, { useState } from 'react';
import { AIChatWidget } from './AIChatWidget';
import type { ServiceId } from '../types';

interface AIChatButtonProps {
  serviceId: ServiceId;
  userName?: string;
  context?: Record<string, unknown>;
  apiKey?: string;
  position?: 'bottom-right' | 'bottom-left';
}

/**
 * AI Chat Button
 *
 * 플로팅 버튼 + 채팅 위젯
 * 화면 모서리에 고정되어 항상 접근 가능
 */
export function AIChatButton({
  serviceId,
  userName,
  context,
  apiKey,
  position = 'bottom-right',
}: AIChatButtonProps) {
  const [isOpen, setIsOpen] = useState(false);

  const positionClasses = {
    'bottom-right': 'bottom-6 right-6',
    'bottom-left': 'bottom-6 left-6',
  };

  const widgetPositionClasses = {
    'bottom-right': 'bottom-20 right-6',
    'bottom-left': 'bottom-20 left-6',
  };

  return (
    <>
      {/* Chat Widget */}
      {isOpen && (
        <div className={`fixed ${widgetPositionClasses[position]} z-50`}>
          <AIChatWidget
            serviceId={serviceId}
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
        className={`fixed ${positionClasses[position]} z-50 w-14 h-14 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-full shadow-lg hover:shadow-xl transition-all duration-300 flex items-center justify-center group`}
        title="AI 어시스턴트"
      >
        {isOpen ? (
          <svg
            className="w-6 h-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        ) : (
          <>
            <span className="text-2xl group-hover:scale-110 transition-transform">
              🤖
            </span>
            {/* Pulse animation */}
            <span className="absolute -top-1 -right-1 w-3 h-3 bg-green-400 rounded-full animate-pulse" />
          </>
        )}
      </button>
    </>
  );
}

export default AIChatButton;
