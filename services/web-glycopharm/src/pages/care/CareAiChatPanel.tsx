/**
 * CareAiChatPanel — AI Care Copilot 슬라이드 아웃 패널
 * WO-GLYCOPHARM-CARE-AI-CHAT-SYSTEM-V1
 *
 * 우측 슬라이드 아웃 (420px). Population/Patient 모드.
 * 메시지 히스토리는 세션 내 유지 (client-side only).
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
} from 'lucide-react';
import { pharmacyApi, type AiChatResponseDto } from '@/api/pharmacy';

// ── Types ──

interface ChatMessage {
  id: string;
  role: 'user' | 'ai';
  content: string;
  response?: AiChatResponseDto;
  timestamp: Date;
  loading?: boolean;
  error?: string;
}

interface CareAiChatPanelProps {
  isOpen: boolean;
  onClose: () => void;
  patientId?: string;
  patientName?: string;
  initialQuestion?: string;
}

// ── Constants ──

const POPULATION_QUESTIONS = [
  '오늘 관리해야 할 환자는?',
  '야간 저혈당 환자는?',
  'TIR이 가장 낮은 환자는?',
  '최근 7일 코칭이 필요한 환자는?',
];

const PATIENT_QUESTIONS = [
  '이 환자의 최근 혈당 추세는?',
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
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const initialSentRef = useRef(false);

  const suggestedQuestions = patientId ? PATIENT_QUESTIONS : POPULATION_QUESTIONS;

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 300);
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

  // Send message
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

    try {
      const response = await pharmacyApi.sendCareAiChat(text.trim(), patientId);

      setMessages(prev =>
        prev.map(m =>
          m.id === aiPlaceholder.id
            ? { ...m, loading: false, response, content: response.summary }
            : m,
        ),
      );
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'AI 응답을 받지 못했습니다.';
      setMessages(prev =>
        prev.map(m =>
          m.id === aiPlaceholder.id
            ? { ...m, loading: false, error: errorMsg }
            : m,
        ),
      );
    } finally {
      setSending(false);
    }
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
                {patientId ? `${patientName || '환자'} 분석` : '전체 환자 분석'}
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
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
          {messages.length === 0 && (
            <div className="text-center py-8">
              <Sparkles className="w-10 h-10 text-blue-300 mx-auto mb-3" />
              <p className="text-sm font-medium text-slate-700 mb-1">
                {patientId ? '이 환자에 대해 질문하세요' : '환자에 대해 질문하세요'}
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

      {/* Slide-in animation */}
      <style>{`
        @keyframes slide-in-right {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }
        .animate-slide-in-right {
          animation: slide-in-right 0.25s ease-out;
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
}: {
  message: ChatMessage;
  onRetry: () => void;
  onPatientClick: (patientId: string) => void;
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

  // AI message — loading
  if (message.loading) {
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
          <p className="text-xs text-red-500 mb-2">{message.error}</p>
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
        <p className="text-sm text-slate-800 leading-relaxed">{resp.summary}</p>

        {/* Details */}
        {resp.details.length > 0 && (
          <div className="space-y-1">
            {resp.details.map((d, i) => (
              <div key={i} className="flex items-start gap-2 text-xs text-slate-600">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-400 mt-1.5 flex-shrink-0" />
                <span>{d}</span>
              </div>
            ))}
          </div>
        )}

        {/* Recommendations */}
        {resp.recommendations.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {resp.recommendations.map((r, i) => (
              <span
                key={i}
                className="inline-flex items-center px-2 py-1 text-[11px] font-medium text-amber-700 bg-amber-50 border border-amber-200 rounded-md"
              >
                {r}
              </span>
            ))}
          </div>
        )}

        {/* Related Patients */}
        {resp.relatedPatients.length > 0 && (
          <div className="pt-1 border-t border-slate-200 space-y-1">
            {resp.relatedPatients.map((p) => (
              <button
                key={p.patientId}
                onClick={() => onPatientClick(p.patientId)}
                className="w-full flex items-center gap-2 px-2.5 py-1.5 text-xs text-slate-600 hover:bg-blue-50 rounded-lg transition-colors"
              >
                <User className="w-3.5 h-3.5 text-slate-400" />
                <span className="font-medium text-slate-700">{p.name}</span>
                <span className="text-slate-400">{p.reason}</span>
                <ArrowRight className="w-3 h-3 text-slate-300 ml-auto" />
              </button>
            ))}
          </div>
        )}

        {/* Meta */}
        <p className="text-[10px] text-slate-400">
          {resp.model} · {new Date(resp.respondedAt).toLocaleTimeString('ko-KR')}
        </p>
      </div>
    </div>
  );
}
