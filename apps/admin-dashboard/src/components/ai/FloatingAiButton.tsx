/**
 * Floating AI Button
 * Phase AI-2 - B2C 확장 + 맥락 정보 UI
 *
 * 모든 화면에서 노출되는 AI 질의 버튼
 * - 클릭 시 AI 패널 오픈
 * - 자유 질문 가능
 * - 하단에 잔여 일 사용량 표시
 * - Phase 2: 컨텍스트 지원 + 맥락 정보 UI 패널
 */
import React, { useState, useEffect, useRef } from 'react';
import { authClient } from '@o4o/auth-client';
import { Bot, X, Send, Loader2, AlertCircle, Store, Package, Tag, Info, ExternalLink } from 'lucide-react';

interface DailyUsage {
  used: number;
  limit: number;
  remaining: number;
}

// Phase 2: 맥락 정보 UI 데이터 구조
interface ContextInfoPanel {
  store?: {
    id: string;
    name: string;
    url?: string;
    description?: string;
  };
  products?: Array<{
    id: string;
    name: string;
    imageUrl?: string;
    price?: number;
    url?: string;
  }>;
  category?: {
    id: string;
    name: string;
    description?: string;
  };
  additionalInfo?: {
    title: string;
    content: string;
  }[];
}

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  contextPanel?: ContextInfoPanel;
}

// Phase 2: B2C 컨텍스트 Props
export interface FloatingAiButtonProps {
  // B2C 컨텍스트 정보
  serviceId?: string;
  storeId?: string;
  productId?: string;
  categoryId?: string;
  pageType?: 'home' | 'store' | 'product' | 'category' | 'content';
  // 컨텍스트 데이터 (상품/매장/카테고리 정보)
  contextData?: Record<string, any>;
  // 스타일 커스터마이징
  buttonLabel?: string;
  position?: 'bottom-right' | 'bottom-left';
}

/**
 * Context Info Panel Component
 * AI 응답과 함께 표시되는 맥락 정보 UI
 */
const ContextInfoPanelUI: React.FC<{ panel: ContextInfoPanel }> = ({ panel }) => {
  if (!panel.store && !panel.products?.length && !panel.category && !panel.additionalInfo?.length) {
    return null;
  }

  return (
    <div className="mt-2 p-2 bg-blue-50 rounded-lg border border-blue-100 text-xs">
      <p className="text-blue-600 font-medium mb-2 flex items-center gap-1">
        <Info className="w-3 h-3" />
        관련 정보
      </p>

      {/* 매장 정보 */}
      {panel.store && (
        <div className="flex items-center gap-2 mb-2 p-1.5 bg-white rounded">
          <Store className="w-4 h-4 text-gray-500" />
          <div className="flex-1 min-w-0">
            <p className="font-medium text-gray-700 truncate">{panel.store.name}</p>
            {panel.store.description && (
              <p className="text-gray-500 truncate">{panel.store.description}</p>
            )}
          </div>
          {panel.store.url && (
            <a
              href={panel.store.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-500 hover:text-blue-700"
            >
              <ExternalLink className="w-3 h-3" />
            </a>
          )}
        </div>
      )}

      {/* 상품 정보 */}
      {panel.products && panel.products.length > 0 && (
        <div className="mb-2">
          <p className="text-gray-500 mb-1 flex items-center gap-1">
            <Package className="w-3 h-3" />
            관련 상품
          </p>
          <div className="space-y-1">
            {panel.products.map((product) => (
              <div
                key={product.id}
                className="flex items-center gap-2 p-1.5 bg-white rounded"
              >
                {product.imageUrl && (
                  <img
                    src={product.imageUrl}
                    alt={product.name}
                    className="w-8 h-8 object-cover rounded"
                  />
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-700 truncate">{product.name}</p>
                  {product.price && (
                    <p className="text-blue-600">{product.price.toLocaleString()}원</p>
                  )}
                </div>
                {product.url && (
                  <a
                    href={product.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-500 hover:text-blue-700"
                  >
                    <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 카테고리 정보 */}
      {panel.category && (
        <div className="flex items-center gap-2 mb-2 p-1.5 bg-white rounded">
          <Tag className="w-4 h-4 text-gray-500" />
          <div className="flex-1 min-w-0">
            <p className="font-medium text-gray-700">{panel.category.name}</p>
            {panel.category.description && (
              <p className="text-gray-500 truncate">{panel.category.description}</p>
            )}
          </div>
        </div>
      )}

      {/* 추가 정보 */}
      {panel.additionalInfo && panel.additionalInfo.length > 0 && (
        <div className="space-y-1">
          {panel.additionalInfo.map((info, idx) => (
            <div key={idx} className="p-1.5 bg-white rounded">
              <p className="text-gray-500">{info.title}</p>
              <p className="text-gray-700">{info.content}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const FloatingAiButton: React.FC<FloatingAiButtonProps> = ({
  serviceId,
  storeId,
  productId,
  categoryId,
  pageType,
  contextData,
  buttonLabel = 'AI 질문',
  position = 'bottom-right',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [question, setQuestion] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [usage, setUsage] = useState<DailyUsage | null>(null);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const positionClasses = {
    'bottom-right': 'bottom-6 right-6',
    'bottom-left': 'bottom-6 left-6',
  };

  useEffect(() => {
    if (isOpen) {
      loadUsage();
      inputRef.current?.focus();
    }
  }, [isOpen]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const loadUsage = async () => {
    try {
      const response = await authClient.api.get('/api/ai/usage');
      if (response.data.success) {
        setUsage(response.data.data);
      }
    } catch (err) {
      console.error('Error loading AI usage:', err);
    }
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();

    if (!question.trim() || isLoading) return;

    const userMessage: Message = {
      role: 'user',
      content: question.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setQuestion('');
    setIsLoading(true);
    setError(null);

    try {
      // Phase 2: B2C 컨텍스트 정보 포함
      const response = await authClient.api.post('/api/ai/query', {
        question: userMessage.content,
        contextType: serviceId || storeId || productId || categoryId ? 'service' : 'free',
        serviceId,
        storeId,
        productId,
        categoryId,
        pageType,
        contextData,
      });

      if (response.data.success) {
        const assistantMessage: Message = {
          role: 'assistant',
          content: response.data.answer,
          timestamp: new Date(),
          // Phase 2: 맥락 정보 UI 패널 데이터
          contextPanel: response.data.contextPanel,
        };
        setMessages((prev) => [...prev, assistantMessage]);

        // Update remaining queries
        if (typeof response.data.remainingQueries === 'number') {
          setUsage((prev) =>
            prev
              ? {
                  ...prev,
                  used: prev.limit - response.data.remainingQueries,
                  remaining: response.data.remainingQueries,
                }
              : null
          );
        }
      } else {
        setError(response.data.error || 'AI 응답을 받을 수 없습니다.');
      }
    } catch (err: any) {
      console.error('AI query error:', err);
      if (err.response?.status === 429) {
        setError('오늘의 질문 횟수를 모두 사용했습니다.');
      } else {
        setError('AI 질의 중 오류가 발생했습니다.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <>
      {/* Floating Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className={`fixed ${positionClasses[position]} z-50 flex items-center gap-2 px-4 py-3 bg-blue-600 text-white rounded-full shadow-lg hover:bg-blue-700 transition-all hover:scale-105`}
          title="AI에게 물어보기"
        >
          <Bot className="w-5 h-5" />
          <span className="text-sm font-medium">{buttonLabel}</span>
          {usage && usage.remaining > 0 && (
            <span className="bg-blue-500 text-xs px-2 py-0.5 rounded-full">
              {usage.remaining}
            </span>
          )}
        </button>
      )}

      {/* AI Panel */}
      {isOpen && (
        <div className={`fixed ${positionClasses[position]} z-50 w-96 max-h-[650px] bg-white rounded-xl shadow-2xl border border-gray-200 flex flex-col overflow-hidden`}>
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 bg-blue-600 text-white">
            <div className="flex items-center gap-2">
              <Bot className="w-5 h-5" />
              <div>
                <span className="font-medium">AI 어시스턴트</span>
                {storeId && contextData?.store?.name && (
                  <span className="block text-xs text-blue-200">
                    {contextData.store.name}
                  </span>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              {usage && (
                <span className="text-xs bg-blue-500 px-2 py-0.5 rounded">
                  {usage.remaining}/{usage.limit}회
                </span>
              )}
              <button
                onClick={() => setIsOpen(false)}
                className="p-1 hover:bg-blue-500 rounded transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-[300px] max-h-[450px]">
            {messages.length === 0 && (
              <div className="text-center text-gray-400 py-8">
                <Bot className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p className="text-sm">무엇이든 물어보세요!</p>
                <p className="text-xs mt-1">서비스, 상품, 기능에 대해 질문할 수 있습니다.</p>
                {storeId && (
                  <p className="text-xs mt-2 text-blue-500">
                    이 매장의 정보를 기반으로 답변합니다.
                  </p>
                )}
              </div>
            )}

            {messages.map((msg, idx) => (
              <div
                key={idx}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[85%] ${
                    msg.role === 'user'
                      ? 'bg-blue-600 text-white px-3 py-2 rounded-lg'
                      : 'bg-gray-100 text-gray-800 px-3 py-2 rounded-lg'
                  }`}
                >
                  <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                  {/* Phase 2: 맥락 정보 UI 패널 */}
                  {msg.role === 'assistant' && msg.contextPanel && (
                    <ContextInfoPanelUI panel={msg.contextPanel} />
                  )}
                </div>
              </div>
            ))}

            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-gray-100 px-3 py-2 rounded-lg">
                  <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                </div>
              </div>
            )}

            {error && (
              <div className="flex items-center gap-2 p-3 bg-red-50 text-red-600 rounded-lg text-sm">
                <AlertCircle className="w-4 h-4" />
                {error}
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <form onSubmit={handleSubmit} className="p-3 border-t border-gray-200">
            <div className="relative">
              <textarea
                ref={inputRef}
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="질문을 입력하세요... (Shift+Enter: 줄바꿈)"
                rows={2}
                className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none text-sm"
                disabled={isLoading || (usage?.remaining === 0)}
              />
              <button
                type="submit"
                disabled={!question.trim() || isLoading || (usage?.remaining === 0)}
                className="absolute right-2 bottom-2 p-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>

            {usage?.remaining === 0 && (
              <p className="text-xs text-red-500 mt-2">
                오늘의 질문 횟수를 모두 사용했습니다. 내일 다시 이용해주세요.
              </p>
            )}
          </form>
        </div>
      )}
    </>
  );
};

export default FloatingAiButton;
