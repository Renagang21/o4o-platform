/**
 * YaksaReportListPage
 *
 * RPA 기반 신고서 목록 페이지 (운영자용)
 */

import React, { useState, useEffect, useCallback } from 'react';
import { authClient } from '@o4o/auth-client';

interface YaksaReport {
  id: string;
  memberId: string;
  reportType: string;
  sourcePostId: string;
  status: string;
  confidence: number;
  createdAt: string;
  updatedAt: string;
}

interface YaksaReportListResponse {
  data: YaksaReport[];
  total: number;
  page: number;
  pageSize: number;
}

const STATUS_LABELS: Record<string, string> = {
  DRAFT: '초안',
  REVIEWED: '검토완료',
  APPROVED: '승인',
  REJECTED: '반려',
};

const REPORT_TYPE_LABELS: Record<string, string> = {
  PROFILE_UPDATE: '개인정보 변경',
  LICENSE_CHANGE: '면허 변경',
  WORKPLACE_CHANGE: '근무지 변경',
  AFFILIATION_CHANGE: '소속 변경',
};

export function YaksaReportListPage(): JSX.Element {
  const [reports, setReports] = useState<YaksaReport[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchReports = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      params.set('page', String(page));
      params.set('pageSize', '20');
      if (status) {
        params.set('status', status);
      }

      const response = await authClient.api.get<YaksaReportListResponse>(
        `/api/v1/yaksa/reports?${params.toString()}`
      );
      setReports(response.data);
      setTotal(response.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : '신고서 목록 조회 실패');
    } finally {
      setLoading(false);
    }
  }, [page, status]);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  const getStatusBadgeClass = (reportStatus: string): string => {
    switch (reportStatus) {
      case 'DRAFT':
        return 'badge-gray';
      case 'REVIEWED':
        return 'badge-blue';
      case 'APPROVED':
        return 'badge-green';
      case 'REJECTED':
        return 'badge-red';
      default:
        return 'badge-gray';
    }
  };

  return (
    <div className="yaksa-report-list-page">
      <div className="page-header">
        <h1>RPA 신고서 관리</h1>
        <p className="description">
          forum-yaksa에서 RPA 트리거로 자동 생성된 신고서를 검토하고 승인/반려합니다.
        </p>
      </div>

      <div className="filters">
        <label>
          상태 필터:
          <select
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setPage(1);
            }}
          >
            <option value="">전체</option>
            <option value="DRAFT">초안</option>
            <option value="REVIEWED">검토완료</option>
            <option value="APPROVED">승인</option>
            <option value="REJECTED">반려</option>
          </select>
        </label>
      </div>

      {error && <div className="error-message">{error}</div>}

      {loading ? (
        <div className="loading">로딩 중...</div>
      ) : (
        <>
          <table className="report-table">
            <thead>
              <tr>
                <th>유형</th>
                <th>상태</th>
                <th>신뢰도</th>
                <th>생성일</th>
                <th>작업</th>
              </tr>
            </thead>
            <tbody>
              {reports.length === 0 ? (
                <tr>
                  <td colSpan={5} className="empty">
                    신고서가 없습니다.
                  </td>
                </tr>
              ) : (
                reports.map((report) => (
                  <tr key={report.id}>
                    <td>{REPORT_TYPE_LABELS[report.reportType] || report.reportType}</td>
                    <td>
                      <span className={`badge ${getStatusBadgeClass(report.status)}`}>
                        {STATUS_LABELS[report.status] || report.status}
                      </span>
                    </td>
                    <td>{(report.confidence * 100).toFixed(1)}%</td>
                    <td>{new Date(report.createdAt).toLocaleDateString('ko-KR')}</td>
                    <td>
                      <a
                        href={`/admin/reporting/yaksa/${report.id}`}
                        className="btn btn-sm"
                      >
                        상세
                      </a>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>

          <div className="pagination">
            <span>
              총 {total}건 | 페이지 {page}
            </span>
            <div className="pagination-buttons">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
              >
                이전
              </button>
              <button
                onClick={() => setPage((p) => p + 1)}
                disabled={reports.length < 20}
              >
                다음
              </button>
            </div>
          </div>
        </>
      )}

      <style>{`
        .yaksa-report-list-page {
          padding: 24px;
        }
        .page-header h1 {
          margin: 0 0 8px 0;
          font-size: 24px;
        }
        .page-header .description {
          margin: 0 0 24px 0;
          color: #666;
        }
        .filters {
          margin-bottom: 16px;
        }
        .filters select {
          margin-left: 8px;
          padding: 4px 8px;
        }
        .error-message {
          padding: 12px;
          background: #fee;
          color: #c00;
          border-radius: 4px;
          margin-bottom: 16px;
        }
        .loading {
          padding: 24px;
          text-align: center;
          color: #666;
        }
        .report-table {
          width: 100%;
          border-collapse: collapse;
        }
        .report-table th,
        .report-table td {
          padding: 12px;
          text-align: left;
          border-bottom: 1px solid #eee;
        }
        .report-table th {
          background: #f9f9f9;
          font-weight: 600;
        }
        .empty {
          text-align: center;
          color: #999;
        }
        .badge {
          display: inline-block;
          padding: 4px 8px;
          border-radius: 4px;
          font-size: 12px;
        }
        .badge-gray { background: #eee; color: #666; }
        .badge-blue { background: #e3f2fd; color: #1976d2; }
        .badge-green { background: #e8f5e9; color: #388e3c; }
        .badge-red { background: #ffebee; color: #c62828; }
        .btn {
          padding: 4px 12px;
          background: #1976d2;
          color: white;
          border: none;
          border-radius: 4px;
          text-decoration: none;
          font-size: 12px;
          cursor: pointer;
        }
        .btn:hover {
          background: #1565c0;
        }
        .pagination {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-top: 16px;
          padding-top: 16px;
          border-top: 1px solid #eee;
        }
        .pagination-buttons button {
          margin-left: 8px;
          padding: 4px 12px;
          cursor: pointer;
        }
        .pagination-buttons button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
      `}</style>
    </div>
  );
}

export default YaksaReportListPage;
