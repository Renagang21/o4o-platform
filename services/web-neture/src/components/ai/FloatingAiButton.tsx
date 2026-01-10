/**
 * Floating AI Button for B2C
 * Phase AI-2 - B2C 서비스용 AI 버튼
 *
 * 모든 화면에서 노출되는 AI 질의 버튼
 * - 로그인/비로그인 사용자 모두 사용 가능
 * - 컨텍스트 기반 AI 질의
 * - 맥락 정보 UI 패널 포함
 */
import React, { useState, useEffect, useRef } from 'react';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://api.neture.co.kr';

interface DailyUsage {
  used: number;
  limit: number;
  remaining: number;
}

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

export interface FloatingAiButtonProps {
  serviceId?: string;
  storeId?: string;
  productId?: string;
  categoryId?: string;
  pageType?: 'home' | 'store' | 'product' | 'category' | 'content';
  contextData?: Record<string, any>;
  buttonLabel?: string;
  position?: 'bottom-right' | 'bottom-left';
  authToken?: string;
}

// SVG Icons
const BotIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
  </svg>
);

const CloseIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
  </svg>
);

const SendIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
  </svg>
);

const LoaderIcon = () => (
  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
  </svg>
);

const StoreIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
  </svg>
);

const PackageIcon = () => (
  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
  </svg>
);

const TagIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
  </svg>
);

const InfoIcon = () => (
  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const ExternalLinkIcon = () => (
  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
  </svg>
);

const AlertIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const ContextInfoPanelUI: React.FC<{ panel: ContextInfoPanel }> = ({ panel }) => {
  if (!panel.store && !panel.products?.length && !panel.category && !panel.additionalInfo?.length) {
    return null;
  }

  return (
    <div style={{
      marginTop: '8px',
      padding: '8px',
      backgroundColor: '#EFF6FF',
      borderRadius: '8px',
      border: '1px solid #DBEAFE',
      fontSize: '12px'
    }}>
      <p style={{
        color: '#2563EB',
        fontWeight: 500,
        marginBottom: '8px',
        display: 'flex',
        alignItems: 'center',
        gap: '4px'
      }}>
        <InfoIcon />
        관련 정보
      </p>

      {panel.store && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          marginBottom: '8px',
          padding: '6px',
          backgroundColor: 'white',
          borderRadius: '4px'
        }}>
          <StoreIcon />
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontWeight: 500, color: '#374151', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {panel.store.name}
            </p>
            {panel.store.description && (
              <p style={{ color: '#6B7280', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {panel.store.description}
              </p>
            )}
          </div>
          {panel.store.url && (
            <a href={panel.store.url} target="_blank" rel="noopener noreferrer" style={{ color: '#3B82F6' }}>
              <ExternalLinkIcon />
            </a>
          )}
        </div>
      )}

      {panel.products && panel.products.length > 0 && (
        <div style={{ marginBottom: '8px' }}>
          <p style={{ color: '#6B7280', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <PackageIcon />
            관련 상품
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {panel.products.map((product) => (
              <div key={product.id} style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '6px',
                backgroundColor: 'white',
                borderRadius: '4px'
              }}>
                {product.imageUrl && (
                  <img
                    src={product.imageUrl}
                    alt={product.name}
                    style={{ width: '32px', height: '32px', objectFit: 'cover', borderRadius: '4px' }}
                  />
                )}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontWeight: 500, color: '#374151', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {product.name}
                  </p>
                  {product.price && (
                    <p style={{ color: '#2563EB' }}>{product.price.toLocaleString()}원</p>
                  )}
                </div>
                {product.url && (
                  <a href={product.url} target="_blank" rel="noopener noreferrer" style={{ color: '#3B82F6' }}>
                    <ExternalLinkIcon />
                  </a>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {panel.category && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          marginBottom: '8px',
          padding: '6px',
          backgroundColor: 'white',
          borderRadius: '4px'
        }}>
          <TagIcon />
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontWeight: 500, color: '#374151' }}>{panel.category.name}</p>
            {panel.category.description && (
              <p style={{ color: '#6B7280', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {panel.category.description}
              </p>
            )}
          </div>
        </div>
      )}

      {panel.additionalInfo && panel.additionalInfo.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          {panel.additionalInfo.map((info, idx) => (
            <div key={idx} style={{ padding: '6px', backgroundColor: 'white', borderRadius: '4px' }}>
              <p style={{ color: '#6B7280' }}>{info.title}</p>
              <p style={{ color: '#374151' }}>{info.content}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export function FloatingAiButton({
  serviceId,
  storeId,
  productId,
  categoryId,
  pageType,
  contextData,
  buttonLabel = 'AI 질문',
  position = 'bottom-right',
  authToken,
}: FloatingAiButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [question, setQuestion] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [usage, setUsage] = useState<DailyUsage | null>(null);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const positionStyles = {
    'bottom-right': { bottom: '24px', right: '24px' },
    'bottom-left': { bottom: '24px', left: '24px' },
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

  const getHeaders = () => {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (authToken) {
      headers['Authorization'] = `Bearer ${authToken}`;
    }
    return headers;
  };

  const loadUsage = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/ai/usage`, {
        headers: getHeaders(),
        credentials: 'include',
      });
      const data = await response.json();
      if (data.success) {
        setUsage(data.data);
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
      const response = await fetch(`${API_BASE_URL}/api/ai/query`, {
        method: 'POST',
        headers: getHeaders(),
        credentials: 'include',
        body: JSON.stringify({
          question: userMessage.content,
          contextType: serviceId || storeId || productId || categoryId ? 'service' : 'free',
          serviceId,
          storeId,
          productId,
          categoryId,
          pageType,
          contextData,
        }),
      });

      const data = await response.json();

      if (data.success) {
        const assistantMessage: Message = {
          role: 'assistant',
          content: data.answer,
          timestamp: new Date(),
          contextPanel: data.contextPanel,
        };
        setMessages((prev) => [...prev, assistantMessage]);

        if (typeof data.remainingQueries === 'number') {
          setUsage((prev) =>
            prev
              ? {
                  ...prev,
                  used: prev.limit - data.remainingQueries,
                  remaining: data.remainingQueries,
                }
              : null
          );
        }
      } else {
        setError(data.error || 'AI 응답을 받을 수 없습니다.');
      }
    } catch (err: any) {
      console.error('AI query error:', err);
      setError('AI 질의 중 오류가 발생했습니다.');
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
          style={{
            position: 'fixed',
            ...positionStyles[position],
            zIndex: 50,
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '12px 16px',
            backgroundColor: '#2563EB',
            color: 'white',
            borderRadius: '9999px',
            boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
            border: 'none',
            cursor: 'pointer',
            transition: 'all 0.2s',
          }}
          title="AI에게 물어보기"
        >
          <BotIcon />
          <span style={{ fontSize: '14px', fontWeight: 500 }}>{buttonLabel}</span>
          {usage && usage.remaining > 0 && (
            <span style={{
              backgroundColor: '#3B82F6',
              fontSize: '12px',
              padding: '2px 8px',
              borderRadius: '9999px'
            }}>
              {usage.remaining}
            </span>
          )}
        </button>
      )}

      {/* AI Panel */}
      {isOpen && (
        <div style={{
          position: 'fixed',
          ...positionStyles[position],
          zIndex: 50,
          width: '384px',
          maxHeight: '650px',
          backgroundColor: 'white',
          borderRadius: '12px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          border: '1px solid #E5E7EB',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden'
        }}>
          {/* Header */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '12px 16px',
            backgroundColor: '#2563EB',
            color: 'white'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <BotIcon />
              <div>
                <span style={{ fontWeight: 500 }}>AI 어시스턴트</span>
                {storeId && contextData?.store?.name && (
                  <span style={{ display: 'block', fontSize: '12px', color: '#BFDBFE' }}>
                    {contextData.store.name}
                  </span>
                )}
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              {usage && (
                <span style={{
                  fontSize: '12px',
                  backgroundColor: '#3B82F6',
                  padding: '2px 8px',
                  borderRadius: '4px'
                }}>
                  {usage.remaining}/{usage.limit}회
                </span>
              )}
              <button
                onClick={() => setIsOpen(false)}
                style={{
                  padding: '4px',
                  backgroundColor: 'transparent',
                  border: 'none',
                  color: 'white',
                  cursor: 'pointer',
                  borderRadius: '4px'
                }}
              >
                <CloseIcon />
              </button>
            </div>
          </div>

          {/* Messages */}
          <div style={{
            flex: 1,
            overflowY: 'auto',
            padding: '16px',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
            minHeight: '300px',
            maxHeight: '450px'
          }}>
            {messages.length === 0 && (
              <div style={{ textAlign: 'center', color: '#9CA3AF', padding: '32px 0' }}>
                <div style={{ width: '48px', height: '48px', margin: '0 auto 8px', opacity: 0.5 }}>
                  <BotIcon />
                </div>
                <p style={{ fontSize: '14px' }}>무엇이든 물어보세요!</p>
                <p style={{ fontSize: '12px', marginTop: '4px' }}>서비스, 상품, 기능에 대해 질문할 수 있습니다.</p>
                {storeId && (
                  <p style={{ fontSize: '12px', marginTop: '8px', color: '#3B82F6' }}>
                    이 매장의 정보를 기반으로 답변합니다.
                  </p>
                )}
              </div>
            )}

            {messages.map((msg, idx) => (
              <div
                key={idx}
                style={{
                  display: 'flex',
                  justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start'
                }}
              >
                <div style={{
                  maxWidth: '85%',
                  padding: '8px 12px',
                  borderRadius: '8px',
                  backgroundColor: msg.role === 'user' ? '#2563EB' : '#F3F4F6',
                  color: msg.role === 'user' ? 'white' : '#1F2937'
                }}>
                  <p style={{ fontSize: '14px', whiteSpace: 'pre-wrap', margin: 0 }}>{msg.content}</p>
                  {msg.role === 'assistant' && msg.contextPanel && (
                    <ContextInfoPanelUI panel={msg.contextPanel} />
                  )}
                </div>
              </div>
            ))}

            {isLoading && (
              <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
                <div style={{
                  backgroundColor: '#F3F4F6',
                  padding: '8px 12px',
                  borderRadius: '8px'
                }}>
                  <LoaderIcon />
                </div>
              </div>
            )}

            {error && (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '12px',
                backgroundColor: '#FEF2F2',
                color: '#DC2626',
                borderRadius: '8px',
                fontSize: '14px'
              }}>
                <AlertIcon />
                {error}
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <form onSubmit={handleSubmit} style={{ padding: '12px', borderTop: '1px solid #E5E7EB' }}>
            <div style={{ position: 'relative' }}>
              <textarea
                ref={inputRef}
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="질문을 입력하세요... (Shift+Enter: 줄바꿈)"
                rows={2}
                style={{
                  width: '100%',
                  padding: '8px 40px 8px 12px',
                  border: '1px solid #D1D5DB',
                  borderRadius: '8px',
                  fontSize: '14px',
                  resize: 'none',
                  outline: 'none',
                  boxSizing: 'border-box'
                }}
                disabled={isLoading || (usage?.remaining === 0)}
              />
              <button
                type="submit"
                disabled={!question.trim() || isLoading || (usage?.remaining === 0)}
                style={{
                  position: 'absolute',
                  right: '8px',
                  bottom: '8px',
                  padding: '6px',
                  backgroundColor: '#2563EB',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  opacity: (!question.trim() || isLoading || (usage?.remaining === 0)) ? 0.5 : 1
                }}
              >
                <SendIcon />
              </button>
            </div>

            {usage?.remaining === 0 && (
              <p style={{ fontSize: '12px', color: '#EF4444', marginTop: '8px' }}>
                오늘의 질문 횟수를 모두 사용했습니다. 내일 다시 이용해주세요.
              </p>
            )}
          </form>
        </div>
      )}
    </>
  );
}

export default FloatingAiButton;
