/**
 * AdminContactMessagesPage - 문의 관리
 *
 * WO-O4O-NETURE-CONTACT-PAGE-V1
 * WO-O4O-AUTH-AUTO-REFRESH-IMPLEMENTATION-V1: authClient.api 기반 자동 갱신
 *
 * 기능:
 * - 문의 목록 조회 (contactType, status 필터)
 * - 문의 상세 보기 (확장 행)
 * - 문의 상태 변경 (new → in_progress → resolved)
 */

import { useState, useEffect, useCallback } from 'react';
import { api } from '../../lib/api/client';

interface ContactMessage {
  id: string;
  contactType: string;
  name: string;
  email: string;
  phone: string | null;
  subject: string;
  message: string;
  status: string;
  adminNotes: string | null;
  createdAt: string;
  resolvedAt: string | null;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

const typeLabels: Record<string, string> = {
  supplier: 'Supplier',
  partner: 'Partner',
  service: '서비스',
  other: '기타',
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

export default function AdminContactMessagesPage() {
  const [messages, setMessages] = useState<ContactMessage[]>([]);
  const [pagination, setPagination] = useState<Pagination>({ page: 1, limit: 20, total: 0, totalPages: 0 });
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const loadMessages = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: '20' });
      if (statusFilter !== 'all') params.set('status', statusFilter);
      if (typeFilter !== 'all') params.set('contactType', typeFilter);

      const response = await api.get(`/neture/admin/contact-messages?${params}`);
      const data = response.data;
      if (data.success) {
        setMessages(data.data.items);
        setPagination(data.data.pagination);
      }
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [statusFilter, typeFilter]);

  useEffect(() => {
    loadMessages(1);
  }, [loadMessages]);

  const handleStatusChange = async (id: string, newStatus: string) => {
    setUpdatingId(id);
    try {
      const response = await api.patch(
        `/neture/admin/contact-messages/${id}`,
        { status: newStatus },
      );
      const data = response.data;
      if (data.success) {
        setMessages((prev) => prev.map((m) => (m.id === id ? data.data : m)));
      }
    } catch {
      // silent
    } finally {
      setUpdatingId(null);
    }
  };

  const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">문의 관리</h1>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-6">
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
        >
          <option value="all">전체 상태</option>
          <option value="new">신규</option>
          <option value="in_progress">처리중</option>
          <option value="resolved">완료</option>
        </select>
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
        >
          <option value="all">전체 유형</option>
          <option value="supplier">Supplier</option>
          <option value="partner">Partner</option>
          <option value="service">서비스</option>
          <option value="other">기타</option>
        </select>
        <span className="text-sm text-gray-500 self-center">총 {pagination.total}건</span>
      </div>

      {/* Table */}
      {loading ? (
        <div className="text-center py-12 text-gray-500">로딩 중...</div>
      ) : messages.length === 0 ? (
        <div className="text-center py-12 text-gray-500">문의가 없습니다.</div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-600">유형</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">이름</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">제목</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">상태</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">접수일</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">처리</th>
              </tr>
            </thead>
            <tbody>
              {messages.map((msg) => (
                <tr key={msg.id} className="border-b border-gray-100 last:border-0">
                  <td className="px-4 py-3">
                    <span className="text-xs font-medium">{typeLabels[msg.contactType] || msg.contactType}</span>
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => setExpandedId(expandedId === msg.id ? null : msg.id)}
                      className="text-primary-600 hover:underline font-medium"
                    >
                      {msg.name}
                    </button>
                  </td>
                  <td className="px-4 py-3 text-gray-700 max-w-xs truncate">{msg.subject}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-block px-2 py-0.5 text-xs font-medium rounded-full ${statusColors[msg.status] || 'bg-gray-100 text-gray-600'}`}>
                      {statusLabels[msg.status] || msg.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-xs whitespace-nowrap">{formatDate(msg.createdAt)}</td>
                  <td className="px-4 py-3">
                    <select
                      value={msg.status}
                      onChange={(e) => handleStatusChange(msg.id, e.target.value)}
                      disabled={updatingId === msg.id}
                      className="px-2 py-1 border border-gray-300 rounded text-xs disabled:opacity-50"
                    >
                      <option value="new">신규</option>
                      <option value="in_progress">처리중</option>
                      <option value="resolved">완료</option>
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Expanded Detail */}
          {expandedId && (() => {
            const msg = messages.find((m) => m.id === expandedId);
            if (!msg) return null;
            return (
              <div className="border-t border-gray-200 bg-gray-50 p-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4 text-sm">
                  <div><span className="text-gray-500">이메일:</span> <span className="text-gray-900">{msg.email}</span></div>
                  <div><span className="text-gray-500">전화:</span> <span className="text-gray-900">{msg.phone || '-'}</span></div>
                </div>
                <div className="text-sm">
                  <span className="text-gray-500 block mb-1">문의 내용:</span>
                  <div className="bg-white rounded-lg border border-gray-200 p-4 text-gray-700 whitespace-pre-wrap">
                    {msg.message}
                  </div>
                </div>
                {msg.resolvedAt && (
                  <div className="mt-3 text-xs text-gray-500">완료일: {formatDate(msg.resolvedAt)}</div>
                )}
                <button
                  onClick={() => setExpandedId(null)}
                  className="mt-4 text-xs text-gray-500 hover:text-gray-700"
                >
                  닫기
                </button>
              </div>
            );
          })()}
        </div>
      )}

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-6">
          <button
            onClick={() => loadMessages(pagination.page - 1)}
            disabled={pagination.page <= 1}
            className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg disabled:opacity-50"
          >
            이전
          </button>
          <span className="text-sm text-gray-600">
            {pagination.page} / {pagination.totalPages}
          </span>
          <button
            onClick={() => loadMessages(pagination.page + 1)}
            disabled={pagination.page >= pagination.totalPages}
            className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg disabled:opacity-50"
          >
            다음
          </button>
        </div>
      )}
    </div>
  );
}
