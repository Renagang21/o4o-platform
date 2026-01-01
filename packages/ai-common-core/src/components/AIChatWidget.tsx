import React, { useState, useRef, useEffect, useCallback } from 'react';
import type {
  ChatMessage,
  PromptDefinition,
  PromptContext,
  ServiceId,
} from '../types';
import { promptRegistry } from '../services/PromptRegistry';
import { aiService } from '../services/AIService';

interface AIChatWidgetProps {
  serviceId: ServiceId;
  userName?: string;
  context?: Record<string, unknown>;
  apiKey?: string;
  onClose?: () => void;
  className?: string;
}

/**
 * AI Chat Widget
 *
 * 대화 중심 UI with 버튼형 제안
 * - 외부적으로는 자연스러운 대화 경험
 * - 내부적으로는 구조화된 프롬프트 실행
 */
export function AIChatWidget({
  serviceId,
  userName = '사용자',
  context = {},
  apiKey,
  onClose,
  className = '',
}: AIChatWidgetProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // API 키 설정
  useEffect(() => {
    if (apiKey) {
      aiService.setApiKey(apiKey);
    }
  }, [apiKey]);

  // 기본 제안 프롬프트
  const defaultPrompts = promptRegistry.getDefaultPrompts(serviceId);

  // 스크롤 자동
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  // 초기 환영 메시지
  useEffect(() => {
    const welcomeMessage: ChatMessage = {
      id: 'welcome',
      role: 'assistant',
      content: `안녕하세요, ${userName}님! GlucoseView AI 어시스턴트입니다.\n\n무엇을 도와드릴까요? 아래 제안된 질문을 선택하거나 직접 질문해주세요.`,
      timestamp: new Date(),
    };
    setMessages([welcomeMessage]);
  }, [userName]);

  // 프롬프트 실행
  const executePrompt = async (prompt: PromptDefinition) => {
    const userMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content: prompt.suggestedQuestion,
      timestamp: new Date(),
      promptId: prompt.id,
    };

    setMessages((prev) => [...prev, userMessage]);
    setShowSuggestions(false);
    setIsLoading(true);

    try {
      const promptContext: PromptContext = {
        serviceId,
        userName,
        currentDate: new Date().toLocaleDateString('ko-KR'),
        additionalData: {
          // 기본값 (실제 데이터가 없을 때)
          patientCount: context.patientCount ?? 0,
          todayAppointments: context.todayAppointments ?? 0,
          weeklyConsultations: context.weeklyConsultations ?? 0,
          newPatients: context.newPatients ?? 0,
          returningPatients: context.returningPatients ?? 0,
          avgConsultationTime: context.avgConsultationTime ?? 0,
          ...context,
        },
      };

      const response = await aiService.executePrompt(prompt.id, promptContext);

      const assistantMessage: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: response,
        timestamp: new Date(),
        promptId: prompt.id,
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error) {
      const errorMessage: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: '죄송합니다. 요청을 처리하는 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.',
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  // 일반 메시지 전송
  const sendMessage = async () => {
    if (!inputValue.trim() || isLoading) return;

    const userMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content: inputValue.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputValue('');
    setShowSuggestions(false);
    setIsLoading(true);

    try {
      const response = await aiService.sendMessage(inputValue.trim());

      const assistantMessage: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: response,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error) {
      const errorMessage: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: '죄송합니다. 요청을 처리하는 중 오류가 발생했습니다.',
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  // 키보드 이벤트
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  // 대화 초기화
  const clearChat = () => {
    aiService.clearHistory();
    setMessages([
      {
        id: 'welcome-reset',
        role: 'assistant',
        content: `대화가 초기화되었습니다.\n\n무엇을 도와드릴까요?`,
        timestamp: new Date(),
      },
    ]);
    setShowSuggestions(true);
  };

  return (
    <div
      className={`flex flex-col bg-white rounded-2xl shadow-xl overflow-hidden ${className}`}
      style={{ width: '400px', height: '600px' }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
            <span className="text-lg">🤖</span>
          </div>
          <div>
            <h3 className="font-semibold text-sm">AI 어시스턴트</h3>
            <p className="text-xs text-blue-100">GlucoseView</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={clearChat}
            className="p-1.5 hover:bg-white/10 rounded-lg transition-colors"
            title="대화 초기화"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
          </button>
          {onClose && (
            <button
              onClick={onClose}
              className="p-1.5 hover:bg-white/10 rounded-lg transition-colors"
            >
              <svg
                className="w-4 h-4"
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
            </button>
          )}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${
              message.role === 'user' ? 'justify-end' : 'justify-start'
            }`}
          >
            <div
              className={`max-w-[85%] rounded-2xl px-4 py-2.5 ${
                message.role === 'user'
                  ? 'bg-blue-600 text-white rounded-br-md'
                  : 'bg-white text-slate-700 shadow-sm rounded-bl-md'
              }`}
            >
              <p className="text-sm whitespace-pre-wrap">{message.content}</p>
              <p
                className={`text-xs mt-1 ${
                  message.role === 'user' ? 'text-blue-200' : 'text-slate-400'
                }`}
              >
                {message.timestamp.toLocaleTimeString('ko-KR', {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </p>
            </div>
          </div>
        ))}

        {/* Loading Indicator */}
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-white rounded-2xl rounded-bl-md px-4 py-3 shadow-sm">
              <div className="flex gap-1">
                <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" />
                <span
                  className="w-2 h-2 bg-slate-400 rounded-full animate-bounce"
                  style={{ animationDelay: '0.1s' }}
                />
                <span
                  className="w-2 h-2 bg-slate-400 rounded-full animate-bounce"
                  style={{ animationDelay: '0.2s' }}
                />
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Suggestions */}
      {showSuggestions && defaultPrompts.length > 0 && (
        <div className="px-4 py-3 border-t border-slate-100 bg-white">
          <p className="text-xs text-slate-500 mb-2">추천 질문</p>
          <div className="flex flex-wrap gap-2">
            {defaultPrompts.map((prompt) => (
              <button
                key={prompt.id}
                onClick={() => executePrompt(prompt)}
                disabled={isLoading}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 rounded-full text-xs text-slate-700 transition-colors disabled:opacity-50"
              >
                <span>{prompt.icon}</span>
                <span>{prompt.buttonLabel}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input */}
      <div className="p-4 border-t border-slate-100 bg-white">
        <div className="flex items-center gap-2">
          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="질문을 입력하세요..."
            disabled={isLoading}
            className="flex-1 px-4 py-2.5 bg-slate-100 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
          />
          <button
            onClick={sendMessage}
            disabled={!inputValue.trim() || isLoading}
            className="p-2.5 bg-blue-600 text-white rounded-full hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
                d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
              />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}

export default AIChatWidget;
