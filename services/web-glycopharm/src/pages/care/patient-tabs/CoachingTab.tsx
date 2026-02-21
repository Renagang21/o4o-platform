/**
 * CoachingTab - 코칭 관리 프레임
 * WO-CARE-COACHING-FLOW-STRUCTURE-V1
 *
 * 구조: Summary Block → 신규 코칭 버튼 → Session List
 * 업무 흐름: 상태 파악 → 코칭 실행 → 기록 저장
 */

import { useState } from 'react';
import {
  MessageSquare,
  Calendar,
  CheckCircle,
  Clock,
  Pause,
  Plus,
  ChevronRight,
} from 'lucide-react';

// ── Mock Data ──

interface CoachingSession {
  id: string;
  date: string;
  type: '대면 상담' | '전화 상담' | '메시지';
  summary: string;
  status: 'completed' | 'in_progress' | 'on_hold';
}

const STATUS_CONFIG = {
  completed: { label: '완료', cls: 'bg-green-100 text-green-700', Icon: CheckCircle },
  in_progress: { label: '진행중', cls: 'bg-blue-100 text-blue-700', Icon: Clock },
  on_hold: { label: '보류', cls: 'bg-slate-100 text-slate-600', Icon: Pause },
} as const;

const MOCK_SESSIONS: CoachingSession[] = [
  {
    id: '1',
    date: '2026-02-18',
    type: '대면 상담',
    summary: '식후 혈당 관리 방법 안내, 저녁 식단 조정 권유',
    status: 'completed',
  },
  {
    id: '2',
    date: '2026-02-12',
    type: '전화 상담',
    summary: '복약 순응도 확인, 인슐린 투여 시간 조정 논의',
    status: 'completed',
  },
  {
    id: '3',
    date: '2026-02-05',
    type: '메시지',
    summary: '운동 프로그램 안내 자료 전달',
    status: 'completed',
  },
];

export default function CoachingTab() {
  const [sessions] = useState<CoachingSession[]>(MOCK_SESSIONS);

  const totalSessions = sessions.length;
  const lastSession = sessions[0];
  const lastDate = lastSession ? new Date(lastSession.date).toLocaleDateString() : '-';
  const lastStatus = lastSession ? STATUS_CONFIG[lastSession.status] : null;

  return (
    <div className="space-y-6">
      {/* Coaching Summary Block */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-xl border border-slate-100">
          <div className="w-10 h-10 rounded-lg bg-white border border-slate-200 flex items-center justify-center flex-shrink-0">
            <MessageSquare className="w-5 h-5 text-primary-500" />
          </div>
          <div>
            <p className="text-xs text-slate-400">총 코칭 횟수</p>
            <p className="text-xl font-bold text-slate-800">{totalSessions}회</p>
          </div>
        </div>

        <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-xl border border-slate-100">
          <div className="w-10 h-10 rounded-lg bg-white border border-slate-200 flex items-center justify-center flex-shrink-0">
            <Calendar className="w-5 h-5 text-slate-400" />
          </div>
          <div>
            <p className="text-xs text-slate-400">최근 코칭일</p>
            <p className="text-xl font-bold text-slate-800">{lastDate}</p>
          </div>
        </div>

        <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-xl border border-slate-100">
          <div className="w-10 h-10 rounded-lg bg-white border border-slate-200 flex items-center justify-center flex-shrink-0">
            {lastStatus ? <lastStatus.Icon className="w-5 h-5 text-slate-400" /> : <Clock className="w-5 h-5 text-slate-400" />}
          </div>
          <div>
            <p className="text-xs text-slate-400">최근 상태</p>
            {lastStatus ? (
              <span className={`inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full ${lastStatus.cls}`}>
                {lastStatus.label}
              </span>
            ) : (
              <p className="text-sm text-slate-500">-</p>
            )}
          </div>
        </div>
      </div>

      {/* Action Bar */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-slate-500 uppercase tracking-wider">코칭 기록</h3>
        <button
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-primary-600 text-white text-sm font-medium rounded-lg hover:bg-primary-700 transition-colors"
          onClick={() => {/* placeholder — 향후 modal/form 연결 */}}
        >
          <Plus className="w-4 h-4" />
          새 코칭 기록
        </button>
      </div>

      {/* Session List */}
      {sessions.length === 0 ? (
        <div className="bg-slate-50 rounded-xl border border-slate-100 p-8 flex flex-col items-center justify-center min-h-[160px]">
          <MessageSquare className="w-10 h-10 text-slate-300 mb-2" />
          <p className="text-sm text-slate-500">아직 코칭 기록이 없습니다.</p>
          <p className="text-xs text-slate-400 mt-1">위 버튼으로 첫 코칭을 기록해 보세요.</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200">
                <th className="text-left py-3 px-4 text-xs font-medium text-slate-500 uppercase">날짜</th>
                <th className="text-left py-3 px-4 text-xs font-medium text-slate-500 uppercase">유형</th>
                <th className="text-left py-3 px-4 text-xs font-medium text-slate-500 uppercase">요약</th>
                <th className="text-left py-3 px-4 text-xs font-medium text-slate-500 uppercase">상태</th>
                <th className="py-3 px-4" />
              </tr>
            </thead>
            <tbody>
              {sessions.map((session) => {
                const st = STATUS_CONFIG[session.status];
                return (
                  <tr key={session.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                    <td className="py-3 px-4 text-slate-600 whitespace-nowrap">
                      {new Date(session.date).toLocaleDateString()}
                    </td>
                    <td className="py-3 px-4 text-slate-700 font-medium whitespace-nowrap">
                      {session.type}
                    </td>
                    <td className="py-3 px-4 text-slate-600 max-w-xs truncate">
                      {session.summary}
                    </td>
                    <td className="py-3 px-4">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full ${st.cls}`}>
                        <st.Icon className="w-3 h-3" />
                        {st.label}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <ChevronRight className="w-4 h-4 text-slate-300" />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
