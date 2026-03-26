/**
 * MessagesPage — 당뇨인 ↔ 약사 Q&A 메시지
 * WO-O4O-CARE-QNA-SYSTEM-V1
 *
 * 코칭 기반 양방향 대화. 내 메시지(우측), 약사 메시지(좌측).
 * coaching_ref 메시지는 violet 강조.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Send, MessageSquare, Building2, Loader2, ArrowLeft } from 'lucide-react';
import { patientApi } from '@/api/patient';
import type { MyLinkStatus, MessageDto } from '@/api/patient';

export default function MessagesPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const coachingIdFromUrl = searchParams.get('coaching');

  const [messages, setMessages] = useState<MessageDto[]>([]);
  const [linkStatus, setLinkStatus] = useState<MyLinkStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [input, setInput] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);

  const loadData = useCallback(async () => {
    try {
      const [msgRes, statusRes] = await Promise.all([
        patientApi.getMyMessages().catch(() => ({ success: false, data: [] as MessageDto[] })),
        patientApi.getMyLinkStatus().catch(() => ({ success: false, data: { linked: false } as MyLinkStatus })),
      ]);
      if (msgRes.success && msgRes.data) {
        setMessages(Array.isArray(msgRes.data) ? msgRes.data : []);
      }
      setLinkStatus(statusRes?.data || { linked: false });

      // 읽음 처리 (fire-and-forget)
      patientApi.markMessagesRead().catch(() => {});
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    const text = input.trim();
    if (!text || sending) return;
    setSending(true);
    try {
      const res = await patientApi.sendMessage(text, coachingIdFromUrl || undefined);
      if (res.success && res.data) {
        setMessages((prev) => [...prev, res.data!]);
        setInput('');
      }
    } catch {
      // silent
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-teal-500 animate-spin" />
      </div>
    );
  }

  // 약국 미연결
  if (!linkStatus?.linked) {
    return (
      <div className="min-h-screen bg-white px-4 py-6">
        <div className="w-full max-w-md mx-auto">
          <div className="flex items-center gap-3 mb-6">
            <button onClick={() => navigate(-1)} className="p-1"><ArrowLeft className="w-5 h-5 text-slate-400" /></button>
            <h1 className="text-xl font-bold text-slate-800">약사에게 질문</h1>
          </div>
          <div className="bg-slate-50 rounded-2xl border border-slate-100 p-8 flex flex-col items-center">
            <Building2 className="w-12 h-12 text-slate-300 mb-3" />
            <p className="text-base font-medium text-slate-500">약국 연결 후 이용 가능합니다</p>
            <button
              onClick={() => navigate('/patient/select-pharmacy')}
              className="mt-4 px-6 py-3 bg-teal-600 text-white rounded-xl text-sm font-semibold"
            >
              약국 연결하기
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] bg-white">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-200 bg-white">
        <button onClick={() => navigate(-1)} className="p-1"><ArrowLeft className="w-5 h-5 text-slate-400" /></button>
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <MessageSquare className="w-5 h-5 text-teal-600 flex-shrink-0" />
          <div className="min-w-0">
            <p className="text-sm font-semibold text-slate-800 truncate">{linkStatus.pharmacyName || '약국'}</p>
            <p className="text-xs text-slate-400">약사와의 대화</p>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-400">
            <MessageSquare className="w-10 h-10 mb-2" />
            <p className="text-sm">약사에게 궁금한 점을 질문해 보세요</p>
          </div>
        ) : (
          messages.map((msg) => {
            const isMine = msg.senderType === 'patient';
            const isCoachingRef = msg.messageType === 'coaching_ref';
            return (
              <div key={msg.id} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                    isMine
                      ? 'bg-teal-600 text-white rounded-br-md'
                      : isCoachingRef
                        ? 'bg-violet-50 border border-violet-200 text-slate-800 rounded-bl-md'
                        : 'bg-slate-100 text-slate-800 rounded-bl-md'
                  }`}
                >
                  {isCoachingRef && !isMine && (
                    <p className="text-[10px] font-medium text-violet-500 mb-1">코칭 관련</p>
                  )}
                  <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                  <p className={`text-[10px] mt-1 ${isMine ? 'text-teal-200' : 'text-slate-400'}`}>
                    {new Date(msg.createdAt).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}
                    {!isMine && msg.status === 'read' && ' · 읽음'}
                  </p>
                </div>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="border-t border-slate-200 bg-white px-4 py-3">
        {coachingIdFromUrl && (
          <p className="text-[10px] text-violet-500 mb-1">코칭에 대한 질문</p>
        )}
        <div className="flex items-end gap-2">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="메시지를 입력하세요"
            rows={1}
            className="flex-1 resize-none rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || sending}
            className="p-2.5 rounded-xl bg-teal-600 text-white disabled:opacity-40 disabled:cursor-not-allowed hover:bg-teal-700 transition-colors flex-shrink-0"
          >
            {sending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
          </button>
        </div>
      </div>
    </div>
  );
}
