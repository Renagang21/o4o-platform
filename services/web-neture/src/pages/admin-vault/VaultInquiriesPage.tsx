/**
 * VaultInquiriesPage - 플랫폼 문의 관리
 *
 * 플랫폼 레벨 문의 조회/관리:
 * - SiteGuide 도입 문의
 * - o4o 플랫폼 문의
 * - 제휴/파트너십 문의
 */

import { useState, useEffect } from 'react';
import { Mail, MessageSquare, Clock, CheckCircle, AlertCircle, RefreshCw, ChevronDown, ChevronUp, Building2 } from 'lucide-react';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://api.neture.co.kr';

interface PlatformInquiry {
  id: string;
  type: 'siteguide' | 'platform' | 'partnership' | 'other';
  name: string;
  email: string;
  phone?: string;
  company?: string;
  subject: string;
  message: string;
  status: 'new' | 'in_progress' | 'resolved' | 'closed';
  source?: string;
  adminNotes?: string;
  notificationSent: boolean;
  createdAt: string;
  updatedAt: string;
  resolvedAt?: string;
}

interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

const TYPE_LABELS: Record<string, string> = {
  siteguide: 'SiteGuide 도입',
  platform: '플랫폼 문의',
  partnership: '제휴 문의',
  other: '기타',
};

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  new: { label: '신규', color: 'bg-blue-500' },
  in_progress: { label: '처리중', color: 'bg-amber-500' },
  resolved: { label: '해결됨', color: 'bg-emerald-500' },
  closed: { label: '종료', color: 'bg-slate-500' },
};

export default function VaultInquiriesPage() {
  const [inquiries, setInquiries] = useState<PlatformInquiry[]>([]);
  const [pagination, setPagination] = useState<PaginationInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedInquiry, setSelectedInquiry] = useState<PlatformInquiry | null>(null);
  const [filter, setFilter] = useState<{ type?: string; status?: string }>({});
  const [page, setPage] = useState(1);

  const fetchInquiries = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      params.append('page', page.toString());
      params.append('limit', '20');
      if (filter.type) params.append('type', filter.type);
      if (filter.status) params.append('status', filter.status);

      const response = await fetch(`${API_BASE_URL}/api/v1/admin/platform/inquiries?${params.toString()}`, {
        credentials: 'include',
      });
      const data = await response.json();

      if (data.success) {
        setInquiries(data.data.items);
        setPagination(data.data.pagination);
      } else {
        setError(data.error || '문의 목록을 불러올 수 없습니다.');
      }
    } catch (err: any) {
      setError(err.message || '문의 목록을 불러올 수 없습니다.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInquiries();
  }, [page, filter]);

  const updateStatus = async (id: string, status: string) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/admin/platform/inquiries/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ status }),
      });
      const data = await response.json();

      if (data.success) {
        setInquiries(prev =>
          prev.map(inq => (inq.id === id ? data.data : inq))
        );
        if (selectedInquiry?.id === id) {
          setSelectedInquiry(data.data);
        }
      }
    } catch (err) {
      console.error('Failed to update status:', err);
    }
  };


  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-4">
          <MessageSquare className="w-8 h-8 text-amber-500" />
          <h1 className="text-2xl font-bold text-white">Platform Inquiries</h1>
        </div>
        <p className="text-slate-400">
          플랫폼 레벨 문의를 관리합니다 (SiteGuide 도입, o4o 플랫폼 문의 등)
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-4 mb-6">
        <select
          value={filter.type || ''}
          onChange={(e) => {
            setFilter(prev => ({ ...prev, type: e.target.value || undefined }));
            setPage(1);
          }}
          className="bg-slate-800 border border-slate-700 text-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-amber-500 focus:border-amber-500"
        >
          <option value="">모든 유형</option>
          <option value="siteguide">SiteGuide 도입</option>
          <option value="platform">플랫폼 문의</option>
          <option value="partnership">제휴 문의</option>
          <option value="other">기타</option>
        </select>

        <select
          value={filter.status || ''}
          onChange={(e) => {
            setFilter(prev => ({ ...prev, status: e.target.value || undefined }));
            setPage(1);
          }}
          className="bg-slate-800 border border-slate-700 text-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-amber-500 focus:border-amber-500"
        >
          <option value="">모든 상태</option>
          <option value="new">신규</option>
          <option value="in_progress">처리중</option>
          <option value="resolved">해결됨</option>
          <option value="closed">종료</option>
        </select>

        <button
          onClick={fetchInquiries}
          className="flex items-center gap-2 px-3 py-2 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-lg text-sm transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          새로고침
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="mb-6 p-4 bg-red-900/30 border border-red-700 rounded-lg flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-red-400" />
          <span className="text-red-300">{error}</span>
        </div>
      )}

      {/* Loading */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <RefreshCw className="w-6 h-6 text-amber-500 animate-spin" />
        </div>
      ) : inquiries.length === 0 ? (
        <div className="text-center py-12 text-slate-400">
          <MessageSquare className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p>문의 내역이 없습니다.</p>
        </div>
      ) : (
        <>
          {/* Inquiries List */}
          <div className="space-y-4">
            {inquiries.map((inquiry) => (
              <InquiryCard
                key={inquiry.id}
                inquiry={inquiry}
                isExpanded={selectedInquiry?.id === inquiry.id}
                onToggle={() => setSelectedInquiry(selectedInquiry?.id === inquiry.id ? null : inquiry)}
                onStatusChange={(status) => updateStatus(inquiry.id, status)}
              />
            ))}
          </div>

          {/* Pagination */}
          {pagination && pagination.totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-8">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-4 py-2 bg-slate-700 hover:bg-slate-600 disabled:bg-slate-800 disabled:text-slate-500 text-slate-200 rounded-lg text-sm transition-colors"
              >
                이전
              </button>
              <span className="text-slate-400 text-sm">
                {page} / {pagination.totalPages}
              </span>
              <button
                onClick={() => setPage(p => Math.min(pagination.totalPages, p + 1))}
                disabled={page === pagination.totalPages}
                className="px-4 py-2 bg-slate-700 hover:bg-slate-600 disabled:bg-slate-800 disabled:text-slate-500 text-slate-200 rounded-lg text-sm transition-colors"
              >
                다음
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

interface InquiryCardProps {
  inquiry: PlatformInquiry;
  isExpanded: boolean;
  onToggle: () => void;
  onStatusChange: (status: string) => void;
}

function InquiryCard({ inquiry, isExpanded, onToggle, onStatusChange }: InquiryCardProps) {
  const statusConfig = STATUS_LABELS[inquiry.status] || STATUS_LABELS.new;

  return (
    <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden">
      {/* Header */}
      <button
        onClick={onToggle}
        className="w-full px-6 py-4 flex items-center gap-4 text-left hover:bg-slate-700/50 transition-colors"
      >
        <div className={`w-2 h-2 rounded-full ${statusConfig.color}`} />

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs px-2 py-0.5 bg-slate-700 text-slate-300 rounded">
              {TYPE_LABELS[inquiry.type] || inquiry.type}
            </span>
            <span className="text-xs px-2 py-0.5 bg-slate-700/50 text-slate-400 rounded">
              {statusConfig.label}
            </span>
          </div>
          <h3 className="text-white font-medium truncate">{inquiry.subject}</h3>
          <div className="flex items-center gap-4 mt-1 text-sm text-slate-400">
            <span className="flex items-center gap-1">
              <Mail className="w-3.5 h-3.5" />
              {inquiry.name} ({inquiry.email})
            </span>
            <span className="flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" />
              {new Date(inquiry.createdAt).toLocaleDateString('ko-KR')}
            </span>
          </div>
        </div>

        {isExpanded ? (
          <ChevronUp className="w-5 h-5 text-slate-400" />
        ) : (
          <ChevronDown className="w-5 h-5 text-slate-400" />
        )}
      </button>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="px-6 pb-6 border-t border-slate-700">
          <div className="pt-4 space-y-4">
            {/* Contact Info */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-slate-500 block mb-1">이름</label>
                <p className="text-slate-200">{inquiry.name}</p>
              </div>
              <div>
                <label className="text-xs text-slate-500 block mb-1">이메일</label>
                <p className="text-slate-200">{inquiry.email}</p>
              </div>
              {inquiry.phone && (
                <div>
                  <label className="text-xs text-slate-500 block mb-1">연락처</label>
                  <p className="text-slate-200">{inquiry.phone}</p>
                </div>
              )}
              {inquiry.company && (
                <div>
                  <label className="text-xs text-slate-500 block mb-1">회사</label>
                  <p className="text-slate-200 flex items-center gap-1">
                    <Building2 className="w-4 h-4 text-slate-400" />
                    {inquiry.company}
                  </p>
                </div>
              )}
            </div>

            {/* Message */}
            <div>
              <label className="text-xs text-slate-500 block mb-1">문의 내용</label>
              <p className="text-slate-200 whitespace-pre-wrap bg-slate-700/50 p-4 rounded-lg">
                {inquiry.message}
              </p>
            </div>

            {/* Meta Info */}
            <div className="flex flex-wrap gap-4 text-sm text-slate-400">
              {inquiry.source && (
                <span>출처: {inquiry.source}</span>
              )}
              <span>접수: {new Date(inquiry.createdAt).toLocaleString('ko-KR')}</span>
              {inquiry.resolvedAt && (
                <span>해결: {new Date(inquiry.resolvedAt).toLocaleString('ko-KR')}</span>
              )}
              {inquiry.notificationSent && (
                <span className="flex items-center gap-1 text-emerald-400">
                  <CheckCircle className="w-4 h-4" />
                  알림 발송됨
                </span>
              )}
            </div>

            {/* Actions */}
            <div className="flex items-center gap-3 pt-4 border-t border-slate-700">
              <span className="text-sm text-slate-400">상태 변경:</span>
              {Object.entries(STATUS_LABELS).map(([key, config]) => (
                <button
                  key={key}
                  onClick={() => onStatusChange(key)}
                  disabled={inquiry.status === key}
                  className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                    inquiry.status === key
                      ? 'bg-slate-600 text-slate-400 cursor-not-allowed'
                      : 'bg-slate-700 hover:bg-slate-600 text-slate-200'
                  }`}
                >
                  {config.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
