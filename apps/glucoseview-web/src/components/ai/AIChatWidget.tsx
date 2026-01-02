import { useState, useRef, useEffect, useCallback } from 'react';
import type { ChatMessage, PromptDefinition } from './types';
import { getDefaultPrompts, buildUserPrompt } from './prompts';

interface AIChatWidgetProps {
  userName?: string;
  context?: Record<string, unknown>;
  apiKey?: string;
  onClose?: () => void;
}

/**
 * AI Chat Widget for GlucoseView
 *
 * 대화 중심 UI with 버튼형 제안
 */
export default function AIChatWidget({
  userName = '사용자',
  context = {},
  apiKey,
  onClose,
}: AIChatWidgetProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const defaultPrompts = getDefaultPrompts();

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

  // 데모 응답 생성
  const getDemoResponse = (userMessage: string, prompt?: PromptDefinition): string => {
    if (prompt) {
      switch (prompt.id) {
        case 'dashboard.today':
          return `📋 **오늘의 요약** (${new Date().toLocaleDateString('ko-KR')})\n\n안녕하세요, ${userName}님!\n\n오늘은 등록된 환자들의 정기 모니터링 일정이 있습니다.\n\n**주요 알림:**\n• 환자 데이터 업로드 확인 필요\n• 이번 주 상담 준비 권장\n\n추가 질문이 있으시면 말씀해주세요!`;

        case 'dashboard.weekly':
          return `📊 **주간 리포트**\n\n이번 주 GlucoseView 활동 현황입니다.\n\n**핵심 지표:**\n• 서비스 사용 현황 정상\n• 데이터 분석 준비 완료\n\n**트렌드:**\n• CGM 데이터 활용이 증가하고 있습니다\n• 환자 상담 품질 향상 기회가 있습니다\n\n다음 주도 화이팅하세요! 💪`;

        case 'recommendation.lifestyle':
          return `💡 **혈당 관리 생활습관 팁**\n\n환자분들께 권장할 수 있는 실천 팁입니다:\n\n1. **식후 15분 산책**: 혈당 스파이크 완화에 도움\n2. **규칙적인 식사 시간**: 혈당 변동성 감소\n3. **충분한 수면**: 7-8시간 권장\n4. **스트레스 관리**: 명상이나 심호흡 실천\n5. **수분 섭취**: 하루 2L 이상 물 마시기\n\n⚠️ 의학적 조언이 아닌 일반적인 생활습관 팁입니다.`;

        case 'analysis.general':
          return `🔍 **혈당 데이터 분석 가이드**\n\n CGM 데이터 분석 시 확인할 핵심 지표:\n\n**1. 목표 범위 내 시간 (TIR)**\n• 목표: 70% 이상\n• 70-180 mg/dL 범위\n\n**2. 혈당 변동성 (CV)**\n• 목표: 36% 미만\n• 안정적인 혈당 관리 지표\n\n**3. 시간대별 패턴**\n• 새벽 현상 확인\n• 식후 스파이크 분석\n\n구체적인 환자 데이터를 공유해주시면 더 상세한 분석을 도와드릴 수 있습니다.`;

        default:
          return `${prompt.icon || '💬'} **${prompt.name}**\n\n질문에 대한 답변을 준비 중입니다.\n\n현재 데모 모드로 실행 중이며, OpenAI API 키를 설정하면 실제 AI 응답을 받을 수 있습니다.`;
      }
    }

    // 일반 메시지 응답
    return `안녕하세요! "${userMessage}"에 대해 답변드립니다.\n\n현재 **데모 모드**로 실행 중입니다.\n\n실제 AI 응답을 받으려면 설정에서 OpenAI API 키를 입력해주세요.\n\n**GlucoseView AI가 도울 수 있는 것:**\n• 환자 혈당 데이터 분석\n• 패턴 인식 및 인사이트 제공\n• 상담 포인트 제안\n• 생활습관 팁 제공`;
  };

  // API 호출 (실제 또는 데모)
  const callAI = async (
    userMessage: string,
    systemPrompt?: string,
    prompt?: PromptDefinition
  ): Promise<string> => {
    if (!apiKey) {
      // 데모 모드
      await new Promise((resolve) => setTimeout(resolve, 1000));
      return getDemoResponse(userMessage, prompt);
    }

    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            ...(systemPrompt ? [{ role: 'system', content: systemPrompt }] : []),
            { role: 'user', content: userMessage },
          ],
          max_tokens: 2000,
          temperature: 0.7,
        }),
      });

      if (!response.ok) {
        throw new Error(`API Error: ${response.status}`);
      }

      const data = await response.json();
      return data.choices[0]?.message?.content || '응답을 받지 못했습니다.';
    } catch (error) {
      console.error('AI API Error:', error);
      return '죄송합니다. AI 응답을 받는 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.';
    }
  };

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
      const promptContext = {
        userName,
        currentDate: new Date().toLocaleDateString('ko-KR'),
        patientCount: context.patientCount ?? 0,
        ...context,
      };

      const userPrompt = buildUserPrompt(prompt, promptContext);
      const response = await callAI(userPrompt, prompt.systemPrompt, prompt);

      const assistantMessage: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: response,
        timestamp: new Date(),
        promptId: prompt.id,
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch {
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
    const messageToSend = inputValue.trim();
    setInputValue('');
    setShowSuggestions(false);
    setIsLoading(true);

    try {
      const response = await callAI(messageToSend);

      const assistantMessage: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: response,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch {
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

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const clearChat = () => {
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
    <div className="flex flex-col bg-white rounded-2xl shadow-xl overflow-hidden w-[380px] h-[550px]">
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
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
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
            className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[85%] rounded-2xl px-4 py-2.5 ${
                message.role === 'user'
                  ? 'bg-blue-600 text-white rounded-br-md'
                  : 'bg-white text-slate-700 shadow-sm rounded-bl-md'
              }`}
            >
              <div
                className="text-sm whitespace-pre-wrap"
                dangerouslySetInnerHTML={{
                  __html: message.content
                    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                    .replace(/\n/g, '<br />'),
                }}
              />
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

        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-white rounded-2xl rounded-bl-md px-4 py-3 shadow-sm">
              <div className="flex gap-1">
                <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" />
                <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
                <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
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
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
