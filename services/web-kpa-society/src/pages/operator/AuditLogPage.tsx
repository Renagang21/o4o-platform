/**
 * AuditLogPage - KPA-a 운영자 감사 로그 조회
 * WO-KPA-A-OPERATOR-AUDIT-LOG-PHASE1-V1
 * WO-O4O-KPA-AUDIT-LOG-CANONICAL-ALIGN-V1: raw <table> → @o4o/operator-ux-core DataTable
 *
 * API:
 *   GET /api/v1/kpa/operator/audit-logs
 *
 * 접근 권한: kpa:admin only
 */

import { useState, useEffect, useCallback } from 'react';
import {
  Shield,
  AlertCircle,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Filter,
} from 'lucide-react';
import { DataTable } from '@o4o/operator-ux-core';
import type { ListColumnDef } from '@o4o/operator-ux-core';
import { getAccessToken } from '../../contexts/AuthContext';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';

// ─── Types ───────────────────────────────────────────────────

interface AuditLog {
  id: string;
  operator_id: string;
  operator_role: string;
  action_type: string;
  target_type: string;
  target_id: string;
  metadata: Record<string, unknown>;
  created_at: string;
}

// ─── Labels ──────────────────────────────────────────────────

const ACTION_LABELS: Record<string, string> = {
  MEMBER_STATUS_CHANGED: '회원 상태 변경',
  MEMBER_ROLE_CHANGED: '회원 역할 변경',
  APPLICATION_REVIEWED: '신청서 검토',
  CONTENT_CREATED: '콘텐츠 생성',
  CONTENT_UPDATED: '콘텐츠 수정',
  CONTENT_DELETED: '콘텐츠 삭제',
};

const TARGET_LABELS: Record<string, string> = {
  member: '회원',
  application: '신청서',
  content: '콘텐츠',
};

const ACTION_COLORS: Record<string, string> = {
  MEMBER_STATUS_CHANGED: 'bg-blue-100 text-blue-800',
  MEMBER_ROLE_CHANGED: 'bg-purple-100 text-purple-800',
  APPLICATION_REVIEWED: 'bg-green-100 text-green-800',
  CONTENT_CREATED: 'bg-emerald-100 text-emerald-800',
  CONTENT_UPDATED: 'bg-yellow-100 text-yellow-800',
  CONTENT_DELETED: 'bg-red-100 text-red-800',
};

// ─── Component ───────────────────────────────────────────────

export default function AuditLogPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [actionFilter, setActionFilter] = useState('');
  const [targetFilter, setTargetFilter] = useState('');

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const token = getAccessToken();
      const params = new URLSearchParams({ page: String(page), limit: '20' });
      if (actionFilter) params.set('action_type', actionFilter);
      if (targetFilter) params.set('target_type', targetFilter);

      const res = await fetch(`${API_BASE_URL}/api/v1/kpa/operator/audit-logs?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        if (res.status === 403) {
          setError('관리자(kpa:admin) 권한이 필요합니다.');
        } else {
          setError('감사 로그를 불러오는데 실패했습니다.');
        }
        setLogs([]);
        return;
      }

      const json = await res.json();
      setLogs(json.data || []);
      setTotal(json.total || 0);
      setTotalPages(json.totalPages || 0);
    } catch {
      setError('네트워크 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  }, [page, actionFilter, targetFilter]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' });
  };

  const formatMetadata = (log: AuditLog) => {
    const m = log.metadata;
    if (!m || Object.keys(m).length === 0) return '-';

    const parts: string[] = [];

    if (m.previousStatus && m.newStatus) {
      parts.push(`${m.previousStatus} → ${m.newStatus}`);
    }
    if (m.previousRole && m.newRole) {
      parts.push(`${m.previousRole} → ${m.newRole}`);
    }
    if (m.decision) {
      parts.push(m.decision === 'approved' ? '승인' : '거절');
    }
    if (m.reviewComment) {
      parts.push(`"${m.reviewComment}"`);
    }
    if (m.title) {
      parts.push(`"${m.title}"`);
    }

    return parts.join(' / ') || JSON.stringify(m);
  };

  // WO-O4O-KPA-AUDIT-LOG-CANONICAL-ALIGN-V1:
  //   raw <table> 컬럼 정의를 ListColumnDef 로 정렬.
  //   created_at 만 sortable (sortAccessor = epoch). 그 외 컬럼은 audit 데이터 특성상 정렬 의미 약해 미적용.
  const auditColumns: ListColumnDef<AuditLog>[] = [
    {
      key: 'created_at',
      header: '일시',
      width: '180px',
      sortable: true,
      render: (_v, log) => (
        <span className="text-sm text-slate-600 whitespace-nowrap">{formatDate(log.created_at)}</span>
      ),
      sortAccessor: (log) => new Date(log.created_at).getTime(),
    },
    {
      key: 'action_type',
      header: '액션',
      width: '160px',
      render: (_v, log) => (
        <span className={`inline-block px-2 py-1 rounded text-xs font-medium ${ACTION_COLORS[log.action_type] || 'bg-gray-100 text-gray-800'}`}>
          {ACTION_LABELS[log.action_type] || log.action_type}
        </span>
      ),
    },
    {
      key: 'target_type',
      header: '대상',
      width: '90px',
      render: (_v, log) => (
        <span className="text-sm text-slate-700">{TARGET_LABELS[log.target_type] || log.target_type}</span>
      ),
    },
    {
      key: 'metadata',
      header: '상세',
      // 긴 metadata 본문 노출 회피: formatMetadata 가 요약, 컬럼은 max-width + truncate
      render: (_v, log) => (
        <span className="block max-w-xs truncate text-sm text-slate-600" title={formatMetadata(log)}>
          {formatMetadata(log)}
        </span>
      ),
    },
    {
      key: 'operator_role',
      header: '운영자 역할',
      width: '120px',
      render: (_v, log) => <span className="text-sm text-slate-600">{log.operator_role}</span>,
    },
    {
      key: 'operator_id',
      header: '운영자 ID',
      width: '110px',
      render: (_v, log) => (
        <span className="text-xs text-slate-400 font-mono" title={log.operator_id}>
          {log.operator_id.slice(0, 8)}...
        </span>
      ),
    },
  ];

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Shield className="w-6 h-6 text-gray-700" />
          <h1 className="text-2xl font-bold text-gray-900">감사 로그</h1>
          <span className="text-sm text-gray-500">(총 {total}건)</span>
        </div>
        <button
          onClick={fetchLogs}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          새로고침
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-4 mb-4 items-center">
        <Filter className="w-4 h-4 text-gray-500" />
        <select
          value={actionFilter}
          onChange={(e) => { setActionFilter(e.target.value); setPage(1); }}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
        >
          <option value="">전체 액션</option>
          {Object.entries(ACTION_LABELS).map(([key, label]) => (
            <option key={key} value={key}>{label}</option>
          ))}
        </select>
        <select
          value={targetFilter}
          onChange={(e) => { setTargetFilter(e.target.value); setPage(1); }}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
        >
          <option value="">전체 대상</option>
          {Object.entries(TARGET_LABELS).map(([key, label]) => (
            <option key={key} value={key}>{label}</option>
          ))}
        </select>
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 p-4 mb-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
          <AlertCircle className="w-5 h-5" />
          <span>{error}</span>
        </div>
      )}

      {/* WO-O4O-KPA-AUDIT-LOG-CANONICAL-ALIGN-V1:
          raw <table> + 자체 spinner + 자체 empty state 를 canonical DataTable 로 통합.
          loading/empty 처리는 DataTable 내장 — 별도 분기 제거.
          row click 미정의 (audit log 는 read-only, drawer 도입은 본 WO scope 외). */}
      <DataTable<AuditLog>
        columns={auditColumns}
        data={logs}
        rowKey="id"
        loading={loading}
        emptyMessage="감사 로그가 없습니다."
        tableId="kpa-operator-audit-logs"
      />

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-4 mt-6">
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page <= 1}
            className="flex items-center gap-1 px-3 py-2 border rounded-lg disabled:opacity-50 hover:bg-gray-50"
          >
            <ChevronLeft className="w-4 h-4" />
            이전
          </button>
          <span className="text-sm text-gray-600">
            {page} / {totalPages}
          </span>
          <button
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages}
            className="flex items-center gap-1 px-3 py-2 border rounded-lg disabled:opacity-50 hover:bg-gray-50"
          >
            다음
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
}
