/**
 * CareAiChatPanel — AI Care Copilot 슬라이드 아웃 패널
 * WO-GLYCOPHARM-CARE-AI-CHAT-SYSTEM-V1
 * WO-O4O-AI-STREAMING-SSE-IMPLEMENTATION-V1
 *
 * 우측 슬라이드 아웃 (420px). Population/Patient 모드.
 * 메시지 히스토리는 세션 내 유지 (client-side only).
 * Streaming: SSE 기반 토큰 단위 실시간 응답 + 동기 API fallback.
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  X,
  Send,
  Sparkles,
  Loader2,
  AlertCircle,
  RefreshCw,
  User,
  ArrowRight,
  MessageSquare,
  BarChart3,
  CheckCircle,
} from 'lucide-react';
import { pharmacyApi, type AiChatResponseDto, type AiChatActionDto } from '@/api/pharmacy';
import { API_BASE_URL } from '@/lib/apiClient';
import { useStreamBuffer } from '@/hooks/useStreamBuffer';

// ── Types ──

interface ChatMessage {
  id: string;
  role: 'user' | 'ai';
  content: string;
  response?: AiChatResponseDto;
  timestamp: Date;
  loading?: boolean;
  streaming?: boolean;
  error?: string;
}

interface CareAiChatPanelProps {
  isOpen: boolean;
  onClose: () => void;
  patientId?: string;
  patientName?: string;
  initialQuestion?: string;
}

// ── Helpers ──

/** 어떤 값이든 안전한 문자열로 변환. 객체 {code, message}가 JSX에 렌더링되는 것을 방지. */
function safeStr(v: unknown): string {
  if (v == null) return '';
  if (typeof v === 'string') return v;
  if (typeof v === 'object' && v !== null) {
    const obj = v as Record<string, unknown>;
    if (typeof obj.message === 'string') return obj.message;
    if (typeof obj.code === 'string') return obj.code;
    try { return JSON.stringify(v); } catch { return String(v); }
  }
  return String(v);
}

/** AiChatResponseDto 구조 검증. 잘못된 응답(에러 객체 등)이면 false. */
function isValidAiResponse(r: unknown): r is AiChatResponseDto {
  if (!r || typeof r !== 'object') return false;
  const obj = r as Record<string, unknown>;
  return typeof obj.summary === 'string' && Array.isArray(obj.details);
}

// ── Constants ──

const POPULATION_QUESTIONS = [
  '오늘 관리해야 할 당뇨인는?',
  '야간 저혈당 당뇨인는?',
  'TIR이 가장 낮은 당뇨인는?',
  '최근 7일 코칭이 필요한 당뇨인는?',
];

const PATIENT_QUESTIONS = [
  '이 당뇨인의 최근 혈당 추세는?',
  '위험 요인을 요약해 주세요',
  '코칭에서 다뤄야 할 주제는?',
  '지난 주 대비 변화는?',
];

// ── Component ──

export default function CareAiChatPanel({
  isOpen,
  onClose,
  patientId,
  patientName,
  initialQuestion,
}: CareAiChatPanelProps) {
  const navigate = useNavigate();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const initialSentRef = useRef(false);
  const abortControllerRef = useRef<AbortController | null>(null);
  const renderTickRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const streamBuffer = useStreamBuffer();

  const suggestedQuestions = patientId ? PATIENT_QUESTIONS : POPULATION_QUESTIONS;

  // Smart auto-scroll: only scroll if user is near bottom
  const scrollToBottomIfNeeded = useCallback(() => {
    const el = scrollContainerRef.current;
    if (!el) return;
    const distFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    if (distFromBottom < 80) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, []);

  // Auto-scroll on new messages (non-streaming updates)
  useEffect(() => {
    scrollToBottomIfNeeded();
  }, [messages, scrollToBottomIfNeeded]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 300);
    }
  }, [isOpen]);

  // Abort stream + clear render tick on unmount or close
  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort();
      if (renderTickRef.current) { clearInterval(renderTickRef.current); renderTickRef.current = null; }
    };
  }, []);

  useEffect(() => {
    if (!isOpen) {
      abortControllerRef.current?.abort();
      if (renderTickRef.current) { clearInterval(renderTickRef.current); renderTickRef.current = null; }
    }
  }, [isOpen]);

  // Escape key handler
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) onClose();
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [isOpen, onClose]);

  // Send message (streaming with fallback)
  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim() || sending) return;

    const userMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content: text.trim(),
      timestamp: new Date(),
    };

    const aiPlaceholder: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'ai',
      content: '',
      timestamp: new Date(),
      loading: true,
    };

    setMessages(prev => [...prev, userMsg, aiPlaceholder]);
    setInput('');
    setSending(true);

    // ── Try streaming first ──
    let streamSuccess = false;
    let tokensReceived = 0;

    try {
      const abortCtrl = new AbortController();
      abortControllerRef.current = abortCtrl;

      // WO-GLYCOPHARM-CARE-AI-CHAT-ERROR-HANDLING-FIX-V1: 표준 토큰 키 사용
      const token = localStorage.getItem('o4o_accessToken') ||
        localStorage.getItem('accessToken') ||
        localStorage.getItem('token') ||
        localStorage.getItem('authToken');

      const streamRes = await fetch(`${API_BASE_URL}/api/v1/care/ai-chat/stream`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ message: text.trim(), patientId }),
        signal: abortCtrl.signal,
      });

      if (!streamRes.ok || !streamRes.body) {
        throw new Error(`Stream HTTP ${streamRes.status}`);
      }

      // Switch to streaming state
      streamBuffer.reset();
      setMessages(prev =>
        prev.map(m =>
          m.id === aiPlaceholder.id
            ? { ...m, loading: false, streaming: true }
            : m,
        ),
      );

      // Start render tick (20fps) — batched state updates instead of per-token
      renderTickRef.current = setInterval(() => {
        const displayText = streamBuffer.getDisplayText();
        setMessages(prev =>
          prev.map(m =>
            m.id === aiPlaceholder.id ? { ...m, content: displayText } : m,
          ),
        );
        scrollToBottomIfNeeded();
      }, 50);

      const reader = streamRes.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        let currentEvent = '';
        for (const line of lines) {
          if (line.startsWith('event: ')) {
            currentEvent = line.slice(7).trim();
          } else if (line.startsWith('data: ')) {
            const data = line.slice(6);

            if (currentEvent === 'token' && data) {
              tokensReceived++;
              streamBuffer.appendToken(data);
            } else if (currentEvent === 'cached' || currentEvent === 'complete') {
              // Stop render tick before final state transition
              if (renderTickRef.current) { clearInterval(renderTickRef.current); renderTickRef.current = null; }
              try {
                const response = JSON.parse(data) as AiChatResponseDto;
                if (isValidAiResponse(response)) {
                  setMessages(prev =>
                    prev.map(m =>
                      m.id === aiPlaceholder.id
                        ? { ...m, loading: false, streaming: false, response, content: response.summary }
                        : m,
                    ),
                  );
                  streamSuccess = true;
                }
              } catch { /* parse error handled below */ }
            } else if (currentEvent === 'error') {
              try {
                const errData = JSON.parse(data);
                throw new Error(errData.message || 'Stream error');
              } catch (e) {
                if (e instanceof SyntaxError) throw new Error('Stream error');
                throw e;
              }
            }
            // 'done' event — loop will end naturally
          }
        }
      }

      if (streamSuccess) {
        // Stop render tick and finalize
        if (renderTickRef.current) { clearInterval(renderTickRef.current); renderTickRef.current = null; }
        setMessages(prev =>
          prev.map(m =>
            m.id === aiPlaceholder.id ? { ...m, streaming: false } : m,
          ),
        );
      }
    } catch (err) {
      if (renderTickRef.current) { clearInterval(renderTickRef.current); renderTickRef.current = null; }
      if ((err as Error).name === 'AbortError') {
        setSending(false);
        return;
      }
      // Only fallback if no tokens were received yet
      if (tokensReceived === 0) {
        if (process.env.NODE_ENV === 'development') {
          console.debug('[CareAiChat] stream failed, falling back to sync', err);
        }
      }
    }

    // ── Fallback to sync API if streaming failed ──
    if (!streamSuccess) {
      if (tokensReceived > 0) {
        // Partial tokens received but no complete event — show error
        setMessages(prev =>
          prev.map(m =>
            m.id === aiPlaceholder.id
              ? { ...m, loading: false, streaming: false, error: 'AI 응답이 중단되었습니다. 다시 시도해 주세요.' }
              : m,
          ),
        );
      } else {
        // No tokens — fallback to synchronous API
        setMessages(prev =>
          prev.map(m =>
            m.id === aiPlaceholder.id
              ? { ...m, loading: true, streaming: false, content: '' }
              : m,
          ),
        );

        try {
          const response = await pharmacyApi.sendCareAiChat(text.trim(), patientId);
          if (!isValidAiResponse(response)) throw response;
          setMessages(prev =>
            prev.map(m =>
              m.id === aiPlaceholder.id
                ? { ...m, loading: false, response, content: response.summary }
                : m,
            ),
          );
        } catch (err) {
          const errCode = (err as any)?.code;
          const errMessage = (err as any)?.message;
          // WO-GLYCOPHARM-CARE-AI-CHAT-ERROR-HANDLING-FIX-V1: 에러 코드별 한국어 메시지
          const friendlyMessages: Record<string, string> = {
            PATIENT_NOT_IN_PHARMACY: '이 환자의 약국 연동 정보가 확인되지 않습니다. 페이지를 새로고침 해 주세요.',
            AI_PROVIDER_ERROR: 'AI 서비스에 일시적 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.',
            AI_RESPONSE_ERROR: 'AI 응답 처리 중 문제가 발생했습니다. 다시 시도해 주세요.',
            AI_TIMEOUT: 'AI 응답 시간이 초과되었습니다. 다시 시도해 주세요.',
            AI_NOT_CONFIGURED: 'AI 서비스가 설정되지 않았습니다.',
            AI_CHAT_ERROR: 'AI 채팅 처리 중 오류가 발생했습니다. 다시 시도해 주세요.',
          };
          const errorMsg = friendlyMessages[errCode]
            || safeStr(err instanceof Error ? err.message : errMessage ?? err)
            || 'AI 응답을 받지 못했습니다.';
          setMessages(prev =>
            prev.map(m =>
              m.id === aiPlaceholder.id
                ? { ...m, loading: false, error: errorMsg }
                : m,
            ),
          );
        }
      }
    }

    setSending(false);
  }, [sending, patientId]);

  // Auto-send initial question
  useEffect(() => {
    if (isOpen && initialQuestion && !initialSentRef.current) {
      initialSentRef.current = true;
      sendMessage(initialQuestion);
    }
    if (!isOpen) {
      initialSentRef.current = false;
    }
  }, [isOpen, initialQuestion, sendMessage]);

  // Retry failed message
  const retryMessage = (aiMsgId: string) => {
    const idx = messages.findIndex(m => m.id === aiMsgId);
    if (idx <= 0) return;
    const userMsg = messages[idx - 1];
    if (userMsg?.role !== 'user') return;

    // Remove failed AI message and re-send
    setMessages(prev => prev.filter(m => m.id !== aiMsgId));
    sendMessage(userMsg.content);
  };

  // Handle submit
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(input);
  };

  // Handle Enter key (Shift+Enter for newline)
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  // Action execution handler
  const handleActionExecute = async (action: AiChatActionDto) => {
    switch (action.type) {
      case 'open_patient':
        if (action.patientId) {
          navigate(`/care/patients/${action.patientId}`);
          onClose();
        }
        break;
      case 'create_coaching':
        if (action.patientId) {
          navigate(`/care/patients/${action.patientId}?tab=coaching`);
          onClose();
        }
        break;
      case 'run_analysis':
        if (action.patientId) {
          try {
            await pharmacyApi.getCareAnalysis(action.patientId);
          } catch { /* proceed to page anyway */ }
          navigate(`/care/patients/${action.patientId}?tab=analysis`);
          onClose();
        }
        break;
      case 'resolve_alert':
        // handled inline in ActionButton
        break;
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black/30 backdrop-blur-sm z-[9999]"
      onClick={onClose}
    >
      {/* Panel */}
      <div
        className="fixed top-0 right-0 h-full w-full max-w-[420px] bg-white shadow-2xl flex flex-col animate-slide-in-right"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-blue-600" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-slate-800">AI Care Copilot</h2>
              <p className="text-[11px] text-slate-500">
                {patientId ? `${patientName || '당뇨인'} 분석` : '전체 당뇨인 분석'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg hover:bg-slate-100 flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4 text-slate-500" />
          </button>
        </div>

        {/* Messages Area */}
        <div ref={scrollContainerRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
          {messages.length === 0 && (
            <div className="text-center py-8">
              <Sparkles className="w-10 h-10 text-blue-300 mx-auto mb-3" />
              <p className="text-sm font-medium text-slate-700 mb-1">
                {patientId ? '이 당뇨인에 대해 질문하세요' : '당뇨인에 대해 질문하세요'}
              </p>
              <p className="text-xs text-slate-400 mb-6">
                Care 데이터 기반 AI 분석을 제공합니다
              </p>

              {/* Suggested Questions */}
              <div className="space-y-2">
                {suggestedQuestions.map((q) => (
                  <button
                    key={q}
                    onClick={() => sendMessage(q)}
                    disabled={sending}
                    className="w-full text-left px-4 py-2.5 text-xs text-slate-600 bg-slate-50 border border-slate-200 rounded-lg hover:bg-blue-50 hover:border-blue-200 hover:text-blue-700 transition-colors disabled:opacity-50"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((msg) => (
            <MessageBubble
              key={msg.id}
              message={msg}
              onRetry={() => retryMessage(msg.id)}
              onPatientClick={(pid) => {
                navigate(`/care/patients/${pid}`);
                onClose();
              }}
              onActionExecute={handleActionExecute}
            />
          ))}

          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <form
          onSubmit={handleSubmit}
          className="border-t border-slate-200 px-4 py-3"
        >
          <div className="flex items-end gap-2">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="질문을 입력하세요..."
              disabled={sending}
              rows={1}
              className="flex-1 resize-none px-3 py-2.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 max-h-24"
            />
            <button
              type="submit"
              disabled={sending || !input.trim()}
              className="w-10 h-10 rounded-lg bg-blue-600 text-white flex items-center justify-center hover:bg-blue-700 transition-colors disabled:opacity-40 disabled:hover:bg-blue-600 flex-shrink-0"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
          <p className="text-[10px] text-slate-400 mt-1.5 px-1">
            AI 분석은 참고용이며, 의료적 판단을 대체하지 않습니다
          </p>
        </form>
      </div>

      {/* Slide-in animation + cursor blink */}
      <style>{`
        @keyframes slide-in-right {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }
        .animate-slide-in-right {
          animation: slide-in-right 0.25s ease-out;
        }
        @keyframes cursor-blink {
          0%, 49% { opacity: 1; }
          50%, 100% { opacity: 0; }
        }
        .animate-cursor-blink {
          animation: cursor-blink 530ms step-end infinite;
        }
      `}</style>
    </div>
  );
}

// ── Message Bubble ──

function MessageBubble({
  message,
  onRetry,
  onPatientClick,
  onActionExecute,
}: {
  message: ChatMessage;
  onRetry: () => void;
  onPatientClick: (patientId: string) => void;
  onActionExecute: (action: AiChatActionDto) => void;
}) {
  if (message.role === 'user') {
    return (
      <div className="flex justify-end">
        <div className="max-w-[85%] bg-blue-600 text-white rounded-2xl rounded-br-md px-4 py-2.5">
          <p className="text-sm">{message.content}</p>
        </div>
      </div>
    );
  }

  // AI message — streaming (tokens arriving)
  if (message.streaming && message.content) {
    return (
      <div className="flex justify-start">
        <div className="max-w-[90%] bg-slate-50 border border-slate-200 rounded-2xl rounded-bl-md px-4 py-3">
          <p className="text-sm text-slate-800 leading-relaxed whitespace-pre-wrap">
            {message.content}
            <span className="inline-block w-1.5 h-4 bg-blue-500 ml-0.5 align-text-bottom animate-cursor-blink" />
          </p>
        </div>
      </div>
    );
  }

  // AI message — loading
  if (message.loading || message.streaming) {
    return (
      <div className="flex justify-start">
        <div className="max-w-[85%] bg-slate-100 rounded-2xl rounded-bl-md px-4 py-3">
          <div className="flex items-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
            <span className="text-xs text-slate-500">분석 중...</span>
          </div>
        </div>
      </div>
    );
  }

  // AI message — error
  if (message.error) {
    return (
      <div className="flex justify-start">
        <div className="max-w-[85%] bg-red-50 border border-red-200 rounded-2xl rounded-bl-md px-4 py-3">
          <div className="flex items-center gap-2 mb-2">
            <AlertCircle className="w-4 h-4 text-red-500" />
            <span className="text-xs text-red-600 font-medium">응답 실패</span>
          </div>
          <p className="text-xs text-red-500 mb-2">{safeStr(message.error)}</p>
          <button
            onClick={onRetry}
            className="inline-flex items-center gap-1 text-xs text-red-600 hover:text-red-700 font-medium"
          >
            <RefreshCw className="w-3 h-3" />
            다시 시도
          </button>
        </div>
      </div>
    );
  }

  // AI message — success
  const resp = message.response;
  if (!resp) return null;

  return (
    <div className="flex justify-start">
      <div className="max-w-[90%] bg-slate-50 border border-slate-200 rounded-2xl rounded-bl-md px-4 py-3 space-y-3">
        {/* Summary */}
        <p className="text-sm text-slate-800 leading-relaxed">{safeStr(resp.summary)}</p>

        {/* Details */}
        {resp.details?.length > 0 && (
          <div className="space-y-1">
            {resp.details.map((d, i) => (
              <div key={i} className="flex items-start gap-2 text-xs text-slate-600">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-400 mt-1.5 flex-shrink-0" />
                <span>{safeStr(d)}</span>
              </div>
            ))}
          </div>
        )}

        {/* Recommendations */}
        {resp.recommendations?.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {resp.recommendations.map((r, i) => (
              <span
                key={i}
                className="inline-flex items-center px-2 py-1 text-[11px] font-medium text-amber-700 bg-amber-50 border border-amber-200 rounded-md"
              >
                {safeStr(r)}
              </span>
            ))}
          </div>
        )}

        {/* Related Patients */}
        {resp.relatedPatients?.length > 0 && (
          <div className="pt-1 border-t border-slate-200 space-y-1">
            {resp.relatedPatients.map((p) => (
              <button
                key={p.patientId}
                onClick={() => onPatientClick(p.patientId)}
                className="w-full flex items-center gap-2 px-2.5 py-1.5 text-xs text-slate-600 hover:bg-blue-50 rounded-lg transition-colors"
              >
                <User className="w-3.5 h-3.5 text-slate-400" />
                <span className="font-medium text-slate-700">{safeStr(p.name)}</span>
                <span className="text-slate-400">{safeStr(p.reason)}</span>
                <ArrowRight className="w-3 h-3 text-slate-300 ml-auto" />
              </button>
            ))}
          </div>
        )}

        {/* Actions */}
        {resp.actions?.length > 0 && (
          <div className="pt-2 border-t border-slate-200 space-y-1.5">
            {resp.actions.map((action, i) => (
              <ActionButton key={i} action={action} onExecute={onActionExecute} />
            ))}
          </div>
        )}

        {/* Meta */}
        <p className="text-[10px] text-slate-400">
          {safeStr(resp.model)}{resp.promptVersion ? ` · ${resp.promptVersion}` : ''} · {resp.respondedAt ? new Date(resp.respondedAt).toLocaleTimeString('ko-KR') : ''}
        </p>
      </div>
    </div>
  );
}

// ── Action Button ──

const ACTION_ICONS: Record<string, typeof User> = {
  open_patient: User,
  create_coaching: MessageSquare,
  run_analysis: BarChart3,
  resolve_alert: CheckCircle,
};

function ActionButton({
  action,
  onExecute,
}: {
  action: AiChatActionDto;
  onExecute: (action: AiChatActionDto) => void;
}) {
  const [status, setStatus] = useState<'idle' | 'loading' | 'done'>('idle');
  const Icon = ACTION_ICONS[action.type] || ArrowRight;

  const handleClick = async () => {
    if (status !== 'idle') return;

    if (action.type === 'resolve_alert' && action.alertId) {
      setStatus('loading');
      try {
        await pharmacyApi.resolveCareAlert(action.alertId);
        setStatus('done');
      } catch {
        setStatus('idle');
      }
      return;
    }

    onExecute(action);
  };

  return (
    <button
      onClick={handleClick}
      disabled={status !== 'idle'}
      className={`w-full flex items-center gap-2 px-3 py-2 text-xs rounded-lg border transition-colors ${
        status === 'done'
          ? 'border-green-200 bg-green-50 text-green-700'
          : 'border-blue-200 bg-white text-blue-700 hover:bg-blue-50'
      } disabled:opacity-60`}
    >
      {status === 'loading' ? (
        <Loader2 className="w-3.5 h-3.5 animate-spin" />
      ) : status === 'done' ? (
        <CheckCircle className="w-3.5 h-3.5 text-green-600" />
      ) : (
        <Icon className="w-3.5 h-3.5" />
      )}
      <span className="font-medium">
        {status === 'done' ? '완료' : safeStr(action.label)}
      </span>
    </button>
  );
}
