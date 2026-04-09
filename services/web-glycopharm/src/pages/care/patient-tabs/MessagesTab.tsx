/**
 * MessagesTab — 약사 ↔ 환자 Q&A 메시지
 * WO-O4O-CARE-QNA-SYSTEM-V1
 *
 * PatientDetailPage의 Outlet context(usePatientDetail)를 통해 환자 정보 접근.
 * 약사가 환자 메시지를 조회하고 답변하는 화면.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { Send, MessageSquare, Loader2 } from 'lucide-react';
import { pharmacyApi, type CareMessageDto } from '@/api/pharmacy';
import { usePatientDetail } from '../PatientDetailPage';

export default function MessagesTab() {
  const { patient } = usePatientDetail();
  const [messages, setMessages] = useState<CareMessageDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [input, setInput] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);

  const loadMessages = useCallback(async () => {
    if (!patient?.id) return;
    setLoading(true);
    try {
      const data = await pharmacyApi.getPatientMessages(patient.id);
      setMessages(Array.isArray(data) ? data : []);
      // 읽음 처리
      pharmacyApi.markPatientMessagesRead(patient.id).catch(() => {});
    } catch {
      setMessages([]);
    } finally {
      setLoading(false);
    }
  }, [patient?.id]);

  useEffect(() => {
    loadMessages();
  }, [loadMessages]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    const text = input.trim();
    if (!text || sending || !patient?.id) return;
    setSending(true);
    try {
      const msg = await pharmacyApi.sendMessageToPatient(patient.id, text);
      if (msg) {
        setMessages((prev) => [...prev, msg]);
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
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-6 h-6 text-primary-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex flex-col" style={{ minHeight: '400px', maxHeight: '600px' }}>
      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-2 py-4 space-y-3">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-slate-400">
            <MessageSquare className="w-10 h-10 mb-2" />
            <p className="text-sm">아직 메시지가 없습니다</p>
            <p className="text-xs mt-1">환자에게 먼저 메시지를 보내보세요</p>
          </div>
        ) : (
          messages.map((msg, idx) => {
            // WO-O4O-GLYCOPHARM-PHARMACY-ONLY-ROLE-CLEANUP-V1: senderType 'pharmacist' → 'pharmacy'
            const isPharmacy = msg.senderType === 'pharmacy';
            const isCoachingRef = msg.messageType === 'coaching_ref';
            const isUnread = !isPharmacy && msg.status === 'sent';
            const showNewDivider = isUnread && !messages.slice(0, idx).some(
              (m) => m.senderType === 'patient' && m.status === 'sent',
            );
            return (
              <div key={msg.id}>
                {showNewDivider && (
                  <div className="flex items-center gap-2 my-2">
                    <div className="flex-1 h-px bg-primary-300" />
                    <span className="text-[10px] font-semibold text-primary-500 uppercase">새 메시지</span>
                    <div className="flex-1 h-px bg-primary-300" />
                  </div>
                )}
                <div className={`flex ${isPharmacy ? 'justify-end' : 'justify-start'}`}>
                  <div
                    className={`max-w-[75%] rounded-2xl px-4 py-3 ${
                      isPharmacy
                        ? 'bg-primary-600 text-white rounded-br-md'
                        : isUnread
                          ? 'bg-blue-50 border border-blue-200 text-slate-800 rounded-bl-md'
                          : isCoachingRef
                            ? 'bg-violet-50 border border-violet-200 text-slate-800 rounded-bl-md'
                            : 'bg-slate-100 text-slate-800 rounded-bl-md'
                    }`}
                  >
                    {isCoachingRef && !isPharmacy && (
                      <p className="text-[10px] font-medium text-violet-500 mb-1">코칭 관련 질문</p>
                    )}
                    <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                    <div className={`flex items-center gap-1 mt-1 ${isPharmacy ? 'justify-end' : ''}`}>
                      <span className={`text-[10px] ${isPharmacy ? 'text-primary-200' : 'text-slate-400'}`}>
                        {new Date(msg.createdAt).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                      {isPharmacy && msg.status === 'read' && (
                        <span className="text-[10px] text-primary-200">읽음</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="border-t border-slate-200 px-2 py-3">
        <div className="flex items-end gap-2">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="환자에게 메시지 보내기"
            rows={1}
            className="flex-1 resize-none rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || sending}
            className="p-2.5 rounded-xl bg-primary-600 text-white disabled:opacity-40 disabled:cursor-not-allowed hover:bg-primary-700 transition-colors flex-shrink-0"
          >
            {sending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
          </button>
        </div>
      </div>
    </div>
  );
}
