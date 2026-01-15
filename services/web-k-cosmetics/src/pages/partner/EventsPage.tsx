/**
 * PartnerEventsPage - 이벤트 조건 설정 페이지
 * Reference: GlycoPharm (복제)
 * API Integration: WO-PARTNER-DASHBOARD-API-FE-INTEGRATION-V1
 */

import { useState, useEffect } from 'react';
import {
  Calendar,
  MapPin,
  Users,
  Plus,
  MoreVertical,
  Edit2,
  Clock,
  Loader2,
} from 'lucide-react';
import { partnerApi, type PartnerEvent } from '../../services/partnerApi';

const statusConfig = {
  active: { label: '진행 중', color: 'green' },
  scheduled: { label: '예정', color: 'blue' },
  ended: { label: '종료', color: 'slate' },
};

export default function PartnerEventsPage() {
  const [events, setEvents] = useState<PartnerEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newEvent, setNewEvent] = useState({
    name: '',
    startDate: '',
    endDate: '',
    region: '서울 전체',
    targetScope: '모든 매장',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchEvents = async () => {
    setIsLoading(true);
    setError(null);
    const response = await partnerApi.getEvents();
    if (response.error) {
      setError(response.error.message);
    } else if (response.data) {
      setEvents(response.data);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    fetchEvents();
  }, []);

  const handleCreateEvent = async () => {
    if (!newEvent.name.trim() || !newEvent.startDate || !newEvent.endDate) return;
    setIsSubmitting(true);
    const response = await partnerApi.createEvent(newEvent);
    if (!response.error) {
      setShowCreateModal(false);
      setNewEvent({ name: '', startDate: '', endDate: '', region: '서울 전체', targetScope: '모든 매장' });
      fetchEvents();
    }
    setIsSubmitting(false);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-pink-600" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
        <p className="text-red-600">{error}</p>
      </div>
    );
  }

  const formatDate = (date: Date | string) => {
    const d = typeof date === 'string' ? new Date(date) : date;
    return d.toISOString().split('T')[0];
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">이벤트 조건</h1>
          <p className="text-slate-500 mt-1">
            이벤트의 기간, 지역, 대상 범위를 설정하세요.
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-pink-600 text-white rounded-xl hover:bg-pink-700 transition-colors"
        >
          <Plus className="w-5 h-5" />
          조건 추가
        </button>
      </div>

      <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 mb-6">
        <p className="text-sm text-slate-600">
          이벤트의 실제 적용과 노출은 서비스 정책에 따라 결정됩니다.
          여기서는 조건만 설정합니다.
        </p>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100">
          <h2 className="font-semibold text-slate-800">이벤트 조건 목록</h2>
        </div>

        {events.length === 0 ? (
          <div className="p-12 text-center">
            <Calendar className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-500 mb-4">등록된 이벤트 조건이 없습니다.</p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="text-pink-600 hover:text-pink-700 font-medium"
            >
              첫 이벤트 조건 만들기
            </button>
          </div>
        ) : (
          <ul className="divide-y divide-slate-100">
            {events.map((event) => {
              const status = statusConfig[event.status];

              return (
                <li key={event.id} className="px-6 py-4">
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-lg bg-pink-100 flex items-center justify-center">
                      <Calendar className="w-5 h-5 text-pink-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-medium text-slate-800">
                          {event.name}
                        </h3>
                        <span className={`text-xs px-2 py-0.5 rounded-full bg-${status.color}-100 text-${status.color}-700`}>
                          {status.label}
                        </span>
                      </div>

                      <div className="flex flex-wrap gap-4 mt-2 text-sm text-slate-500">
                        <div className="flex items-center gap-1">
                          <Clock className="w-4 h-4" />
                          <span>{formatDate(event.period.start)} ~ {formatDate(event.period.end)}</span>
                        </div>
                        {event.region && (
                          <div className="flex items-center gap-1">
                            <MapPin className="w-4 h-4" />
                            <span>{event.region}</span>
                          </div>
                        )}
                        {event.targetScope && (
                          <div className="flex items-center gap-1">
                            <Users className="w-4 h-4" />
                            <span>{event.targetScope}</span>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="relative">
                      <button
                        onClick={() => setActiveMenu(activeMenu === event.id ? null : event.id)}
                        className="p-2 hover:bg-slate-100 rounded-lg"
                      >
                        <MoreVertical className="w-5 h-5 text-slate-400" />
                      </button>
                      {activeMenu === event.id && (
                        <>
                          <div className="fixed inset-0 z-10" onClick={() => setActiveMenu(null)} />
                          <div className="absolute right-0 top-full mt-1 w-40 bg-white rounded-xl shadow-lg border py-1 z-20">
                            <button className="w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2">
                              <Edit2 className="w-4 h-4" />
                              수정
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowCreateModal(false)} />
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 p-6">
            <h2 className="text-xl font-bold text-slate-800 mb-4">이벤트 조건 추가</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">이벤트 이름</label>
                <input
                  type="text"
                  value={newEvent.name}
                  onChange={(e) => setNewEvent({ ...newEvent, name: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-pink-500"
                  placeholder="이벤트 이름"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">시작일</label>
                  <input
                    type="date"
                    value={newEvent.startDate}
                    onChange={(e) => setNewEvent({ ...newEvent, startDate: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-pink-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">종료일</label>
                  <input
                    type="date"
                    value={newEvent.endDate}
                    onChange={(e) => setNewEvent({ ...newEvent, endDate: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-pink-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">지역</label>
                <select
                  value={newEvent.region}
                  onChange={(e) => setNewEvent({ ...newEvent, region: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-pink-500"
                >
                  <option>서울 전체</option>
                  <option>서울 강남구</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">대상 범위</label>
                <select
                  value={newEvent.targetScope}
                  onChange={(e) => setNewEvent({ ...newEvent, targetScope: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-pink-500"
                >
                  <option>모든 매장</option>
                  <option>특정 매장만</option>
                </select>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="flex-1 px-4 py-2 border border-slate-200 rounded-xl text-slate-700 hover:bg-slate-50"
              >
                취소
              </button>
              <button
                type="button"
                onClick={handleCreateEvent}
                disabled={isSubmitting || !newEvent.name.trim() || !newEvent.startDate || !newEvent.endDate}
                className="flex-1 px-4 py-2 bg-pink-600 text-white rounded-xl hover:bg-pink-700 disabled:opacity-50"
              >
                {isSubmitting ? '추가 중...' : '추가'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
