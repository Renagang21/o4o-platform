/**
 * AI Chat Panel Component
 *
 * 대화형 편집기 - 사이드바 채팅 패널
 * Phase 4: Conversational Editor UI
 */

import React, { useState, useRef, useEffect } from 'react';
import { Send, Sparkles, Loader2, CheckCircle, XCircle, Bot, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { conversationalAI, EditorContext, AIAction, AIConfig } from '@/services/ai/ConversationalAI';

/**
 * 메시지 타입
 */
interface ChatMessage {
  id: string;
  type: 'user' | 'assistant' | 'system';
  content: string;
  actions?: AIAction[];
  timestamp: Date;
  status?: 'pending' | 'success' | 'error';
}

interface AIChatPanelProps {
  editorContext: EditorContext;
  onExecuteActions: (actions: AIAction[]) => void;
  config: AIConfig;
}

export const AIChatPanel: React.FC<AIChatPanelProps> = ({
  editorContext,
  onExecuteActions,
  config,
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: '0',
      type: 'system',
      content: '안녕하세요! 편집기를 도와드리는 AI 어시스턴트입니다. 무엇을 도와드릴까요?',
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // 자동 스크롤
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // 메시지 전송
  const handleSend = async () => {
    if (!input.trim() || isProcessing) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      type: 'user',
      content: input,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsProcessing(true);

    try {
      // AI 호출
      const response = await conversationalAI.chat(input, editorContext, config);

      if (response.success && response.actions) {
        // 성공 메시지
        const assistantMessage: ChatMessage = {
          id: (Date.now() + 1).toString(),
          type: 'assistant',
          content: response.message || '완료했습니다!',
          actions: response.actions,
          timestamp: new Date(),
          status: 'success',
        };

        setMessages(prev => [...prev, assistantMessage]);
      } else {
        // 오류 메시지
        const errorMessage: ChatMessage = {
          id: (Date.now() + 1).toString(),
          type: 'assistant',
          content: response.error || '처리 중 오류가 발생했습니다.',
          timestamp: new Date(),
          status: 'error',
        };

        setMessages(prev => [...prev, errorMessage]);
      }
    } catch (error: any) {
      const errorMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        type: 'assistant',
        content: error.message || 'AI 처리 중 오류가 발생했습니다.',
        timestamp: new Date(),
        status: 'error',
      };

      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsProcessing(false);
      inputRef.current?.focus();
    }
  };

  // Enter 키로 전송
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // 액션 실행
  const handleExecuteActions = (actions: AIAction[]) => {
    onExecuteActions(actions);
  };

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Header */}
      <div className="p-4 border-b bg-gradient-to-r from-purple-50 to-blue-50">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-purple-600" />
          <h3 className="font-semibold text-gray-900">AI 어시스턴트</h3>
        </div>
        <p className="text-xs text-gray-500 mt-1">
          편집기를 조작할 수 있는 명령을 입력하세요
        </p>
      </div>

      {/* Messages */}
      <ScrollArea ref={scrollRef} className="flex-1 p-4">
        <div className="space-y-4">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[80%] rounded-lg p-3 ${
                  message.type === 'user'
                    ? 'bg-blue-600 text-white'
                    : message.type === 'system'
                    ? 'bg-gray-100 text-gray-700'
                    : 'bg-purple-50 text-gray-900 border border-purple-200'
                }`}
              >
                {/* Icon + Content */}
                <div className="flex items-start gap-2">
                  {message.type === 'user' ? (
                    <User className="h-4 w-4 mt-0.5 flex-shrink-0" />
                  ) : (
                    <Bot className="h-4 w-4 mt-0.5 flex-shrink-0 text-purple-600" />
                  )}
                  <div className="flex-1">
                    <p className="text-sm whitespace-pre-wrap">{message.content}</p>

                    {/* Status Icon */}
                    {message.status === 'success' && (
                      <div className="flex items-center gap-1 mt-2 text-green-600">
                        <CheckCircle className="h-4 w-4" />
                        <span className="text-xs">완료</span>
                      </div>
                    )}
                    {message.status === 'error' && (
                      <div className="flex items-center gap-1 mt-2 text-red-600">
                        <XCircle className="h-4 w-4" />
                        <span className="text-xs">오류</span>
                      </div>
                    )}

                    {/* Action Buttons */}
                    {message.actions && message.actions.length > 0 && (
                      <div className="mt-3 space-y-2">
                        <Button
                          size="sm"
                          onClick={() => handleExecuteActions(message.actions!)}
                          className="w-full bg-purple-600 hover:bg-purple-700 text-white"
                        >
                          <Sparkles className="h-3 w-3 mr-1" />
                          액션 실행 ({message.actions.length})
                        </Button>
                        <details className="text-xs">
                          <summary className="cursor-pointer text-purple-700 hover:text-purple-900">
                            상세 보기
                          </summary>
                          <pre className="mt-2 p-2 bg-white rounded text-[10px] overflow-auto max-h-32">
                            {JSON.stringify(message.actions, null, 2)}
                          </pre>
                        </details>
                      </div>
                    )}
                  </div>
                </div>

                {/* Timestamp */}
                <div className="text-[10px] opacity-60 mt-1 text-right">
                  {message.timestamp.toLocaleTimeString('ko-KR', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </div>
              </div>
            </div>
          ))}

          {/* Loading */}
          {isProcessing && (
            <div className="flex justify-start">
              <div className="bg-purple-50 rounded-lg p-3 border border-purple-200">
                <div className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin text-purple-600" />
                  <span className="text-sm text-gray-700">AI가 생각 중...</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Input */}
      <div className="p-4 border-t bg-gray-50">
        <div className="flex gap-2">
          <Textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="예: 제목 추가해줘, 이미지 블록 삭제해줘..."
            className="flex-1 resize-none text-sm"
            rows={2}
            disabled={isProcessing}
          />
          <Button
            onClick={handleSend}
            disabled={!input.trim() || isProcessing}
            className="self-end bg-purple-600 hover:bg-purple-700"
          >
            {isProcessing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>

        {/* Quick Suggestions */}
        <div className="mt-2 flex flex-wrap gap-1">
          <button
            onClick={() => setInput('제목 블록 추가해줘')}
            disabled={isProcessing}
            className="text-[10px] px-2 py-1 bg-white border border-gray-300 rounded hover:bg-gray-100 disabled:opacity-50"
          >
            제목 추가
          </button>
          <button
            onClick={() => setInput('선택된 블록 삭제해줘')}
            disabled={isProcessing}
            className="text-[10px] px-2 py-1 bg-white border border-gray-300 rounded hover:bg-gray-100 disabled:opacity-50"
          >
            블록 삭제
          </button>
          <button
            onClick={() => setInput('이미지 블록 추가해줘')}
            disabled={isProcessing}
            className="text-[10px] px-2 py-1 bg-white border border-gray-300 rounded hover:bg-gray-100 disabled:opacity-50"
          >
            이미지 추가
          </button>
        </div>
      </div>
    </div>
  );
};
