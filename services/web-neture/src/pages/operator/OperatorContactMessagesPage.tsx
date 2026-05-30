/**
 * OperatorContactMessagesPage — 문의 메시지 (Operator scope, read-only + 일괄 mark-read)
 *
 * WO-O4O-NETURE-OPERATOR-CONTACT-MESSAGES-OPERATOR-SCOPE-V1
 *
 * 선행 IR : IR-O4O-NETURE-OPERATOR-CONTACT-MESSAGES-SCOPE-AUDIT-V1 (16d4a5def) — B 안 (혼합형) 채택
 * 선행 WO : WO-O4O-NETURE-SUPPLIER-ACTIVATION-VISIBILITY-AND-ACTION-QUEUE-FIX-V1 (operator scope 분리 패턴)
 *
 * 운영자가 할 수 있는 일:
 *  - 문의 목록 조회 (default = supplier+partner)
 *  - contactType / status 필터
 *  - supplier/partner 문의 일괄 mark-read 처리
 *
 * 운영자가 할 수 없는 일 (admin 으로 escalate):
 *  - 개별 status 변경
 *  - adminNotes 작성
 *  - service / other 문의의 일괄 처리
 *  - ipAddress / userAgent / adminNotes 조회 — backend 가 응답에서 제외
 */

import { useState, useEffect, useCallback } from 'react';
import {
  operatorContactApi,
  type OperatorContactMessage,
  type OperatorContactPagination,
} from '../../lib/api';

const typeLabels: Record<string, string> = {
  supplier: '공급자',
  partner: '파트너',
  service: '서비스',
  other: '기타',
};

const typeColors: Record<string, string> = {
  supplier: 'bg-emerald-100 text-emerald-700',
  partner: 'bg-indigo-100 text-indigo-700',
  service: 'bg-slate-100 text-slate-600',
  other: 'bg-slate-100 text-slate-500',
};

const statusLabels: Record<string, string> = {
  new: '신규',
  in_progress: '처리중',
  resolved: '완료',
};

const statusColors: Record<string, string> = {
  new: 'bg-blue-100 text-blue-700',
  in_progress: 'bg-amber-100 text-amber-700',
  resolved: 'bg-green-100 text-green-700',
};

type ContactTypeFilter = '' | 'supplier' | 'partner' | 'service' | 'other';
type StatusFilter = '' | 'new' | 'in_progress' | 'resolved';

export default function OperatorContactMessagesPage() {
  const [messages, setMessages] = useState<OperatorContactMessage[]>([]);
  const [pagination, setPagination] = useState<OperatorContactPagination>({ page: 1, limit: 20, total: 0, totalPages: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [contactTypeFilter, setContactTypeFilter] = useState<ContactTypeFilter>('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [markingRead, setMarkingRead] = useState(false);

  const load = useCallback(async (page = 1) => {
    setLoading(true);
    setError(null);
    try {
      const result = await operatorContactApi.list({
        contactType: contactTypeFilter || undefined,
        status: statusFilter || undefined,
        page,
        limit: 20,
      });
      if (result) {
        setMessages(result.items);
        setPagination(result.pagination);
      } else {
        setMessages([]);
      }
    } catch (e: any) {
      setError(e?.message || '목록을 불러오지 못했습니다.');
    } finally {
      setLoading(false);
    }
  }, [contactTypeFilter, statusFilter]);

  useEffect(() => {
    load(1);
  }, [load]);

  const handleBulkMarkRead = async () => {
    if (markingRead) return;
    setMarkingRead(true);
    try {
      const result = await operatorContactApi.bulkMarkRead();
      if (result) {
        // 새로고침 — supplier/partner 의 'new' 문의가 in_progress 로 전환됨
        await load(pagination.page);
      }
    } finally {
      setMarkingRead(false);
    }
  };

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });

  const contactTypeOptions: Array<{ value: ContactTypeFilter; label: string }> = [
    { value: '', label: '공급자 + 파트너 (기본)' },
    { value: 'supplier', label: '공급자' },
    { value: 'partner', label: '파트너' },
    { value: 'service', label: '서비스' },
    { value: 'other', label: '기타' },
  ];

  const statusOptions: Array<{ value: StatusFilter; label: string }> = [
    { value: '', label: '전체 상태' },
    { value: 'new', label: '신규' },
    { value: 'in_progress', label: '처리중' },
    { value: 'resolved', label: '완료' },
  ];

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">문의 메시지 (운영자)</h1>
        <p className="text-slate-500 mt-1">
          공급자 / 파트너 문의를 빠르게 확인하고 일괄 처리합니다. 개별 상세 처리·메모는 관리자 화면에서 진행하세요.
        </p>
      </div>

      {/* Filters + bulk action */}
      <div className="bg-white rounded-xl p-4 border border-slate-100 shadow-sm">
        <div className="flex flex-wrap gap-3 items-center">
          <select
            value={contactTypeFilter}
            onChange={(e) => setContactTypeFilter(e.target.value as ContactTypeFilter)}
            className="px-3 py-2 border border-slate-300 rounded-lg text-sm"
          >
            {contactTypeOptions.map((o) => (
              <option key={o.value || 'default'} value={o.value}>{o.label}</option>
            ))}
          </select>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
            className="px-3 py-2 border border-slate-300 rounded-lg text-sm"
          >
            {statusOptions.map((o) => (
              <option key={o.value || 'all'} value={o.value}>{o.label}</option>
            ))}
          </select>
          <div className="flex-1" />
          <button
            type="button"
            onClick={handleBulkMarkRead}
            disabled={markingRead}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white rounded-lg text-sm font-medium"
            title="공급자 / 파트너 문의 중 status='new' 항목을 한 번에 처리중으로 전환합니다."
          >
            {markingRead ? '처리 중...' : '공급자/파트너 신규 문의 일괄 확인'}
          </button>
        </div>
        <p className="text-xs text-slate-400 mt-3">
          ※ 일괄 확인은 공급자/파트너 contactType 의 신규(`new`) 문의만 대상입니다. 서비스/기타 문의는 관리자 화면에서 처리합니다.
        </p>
      </div>

      {/* List */}
      <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
          </div>
        ) : error ? (
          <div className="text-center py-16 text-red-500 text-sm">{error}</div>
        ) : messages.length === 0 ? (
          <div className="text-center py-16 text-slate-400 text-sm">
            조건에 맞는 문의가 없습니다.
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase">유형</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase">이름</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase">이메일</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase">연락처</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase">제목</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase">상태</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase">등록일</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {messages.map((m) => {
                const isOpen = expandedId === m.id;
                return (
                  <>
                    <tr
                      key={m.id}
                      className="hover:bg-slate-50 cursor-pointer"
                      onClick={() => setExpandedId(isOpen ? null : m.id)}
                    >
                      <td className="px-4 py-3">
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${typeColors[m.contactType] || 'bg-slate-100 text-slate-600'}`}>
                          {typeLabels[m.contactType] || m.contactType}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-800 font-medium">{m.name}</td>
                      <td className="px-4 py-3 text-sm text-slate-600">{m.email}</td>
                      <td className="px-4 py-3 text-sm text-slate-600">{m.phone || '-'}</td>
                      <td className="px-4 py-3 text-sm text-slate-700 max-w-[260px] truncate" title={m.subject}>{m.subject}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[m.status] || 'bg-slate-100 text-slate-600'}`}>
                          {statusLabels[m.status] || m.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-500 whitespace-nowrap">{formatDate(m.createdAt)}</td>
                    </tr>
                    {isOpen && (
                      <tr key={`${m.id}-expand`} className="bg-slate-50">
                        <td colSpan={7} className="px-4 py-4 text-sm text-slate-700">
                          <div className="space-y-2">
                            <div>
                              <span className="text-xs text-slate-500 mr-2">본문 미리보기:</span>
                              <span className="whitespace-pre-wrap">{m.messagePreview || '-'}</span>
                            </div>
                            <p className="text-xs text-slate-400">
                              ※ 개별 상세 / 상태 변경 / 메모 작성은 관리자 화면(/admin/contact-messages)에서 처리합니다.
                            </p>
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-center gap-3">
          <button
            onClick={() => load(Math.max(1, pagination.page - 1))}
            disabled={pagination.page <= 1 || loading}
            className="px-3 py-1.5 text-sm border border-slate-200 rounded-md hover:bg-slate-50 disabled:opacity-50"
          >
            이전
          </button>
          <span className="text-sm text-slate-600">{pagination.page} / {pagination.totalPages}</span>
          <button
            onClick={() => load(Math.min(pagination.totalPages, pagination.page + 1))}
            disabled={pagination.page >= pagination.totalPages || loading}
            className="px-3 py-1.5 text-sm border border-slate-200 rounded-md hover:bg-slate-50 disabled:opacity-50"
          >
            다음
          </button>
        </div>
      )}
    </div>
  );
}
