/**
 * YaksaReportDetailPage
 *
 * RPA 신고서 상세 페이지 (운영자용)
 * - 내용 확인
 * - 페이로드 수정
 * - 승인/반려
 */

import React, { useState, useEffect, useCallback } from 'react';
import { authClient } from '@o4o/auth-client';

interface SubmissionResult {
  success: boolean;
  submittedAt?: string;
  externalRefId?: string;
  errorMessage?: string;
  outputFiles?: Array<{
    type: 'pdf' | 'json';
    path: string;
    size?: number;
  }>;
  retryCount?: number;
  lastRetryAt?: string;
}

interface YaksaReport {
  id: string;
  memberId: string;
  reportType: string;
  sourcePostId: string;
  status: string;
  payload: Record<string, any>;
  confidence: number;
  triggerSnapshot?: Record<string, any>;
  memberSnapshot?: Record<string, any>;
  operatorNotes?: string;
  rejectionReason?: string;
  reviewedBy?: string;
  reviewedAt?: string;
  approvedBy?: string;
  approvedAt?: string;
  submittedBy?: string;
  submittedAt?: string;
  submissionResult?: SubmissionResult;
  createdAt: string;
  updatedAt: string;
  history?: Array<{
    id: string;
    action: string;
    previousStatus?: string;
    newStatus?: string;
    actorName?: string;
    createdAt: string;
    details?: Record<string, any>;
  }>;
}

const STATUS_LABELS: Record<string, string> = {
  DRAFT: '초안',
  REVIEWED: '검토완료',
  APPROVED: '승인',
  REJECTED: '반려',
  SUBMITTED: '제출완료',
};

const REPORT_TYPE_LABELS: Record<string, string> = {
  PROFILE_UPDATE: '개인정보 변경',
  LICENSE_CHANGE: '면허 변경',
  WORKPLACE_CHANGE: '근무지 변경',
  AFFILIATION_CHANGE: '소속 변경',
};

const ACTION_LABELS: Record<string, string> = {
  CREATED: '생성',
  EDITED: '수정',
  REVIEWED: '검토',
  APPROVED: '승인',
  REJECTED: '반려',
  SUBMITTED: '제출',
  SUBMISSION_FAILED: '제출실패',
  SUBMISSION_RETRY_FAILED: '재시도실패',
};

interface YaksaReportDetailPageProps {
  reportId: string;
}

export function YaksaReportDetailPage({ reportId }: YaksaReportDetailPageProps): React.JSX.Element {
  const [report, setReport] = useState<YaksaReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Editable fields
  const [editPayload, setEditPayload] = useState<string>('');
  const [operatorNotes, setOperatorNotes] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');

  const fetchReport = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await authClient.api.get<YaksaReport>(
        `/api/v1/yaksa/reports/${reportId}`
      );
      setReport(response);
      setEditPayload(JSON.stringify(response.payload, null, 2));
      setOperatorNotes(response.operatorNotes || '');
    } catch (err) {
      setError(err instanceof Error ? err.message : '신고서 조회 실패');
    } finally {
      setLoading(false);
    }
  }, [reportId]);

  useEffect(() => {
    fetchReport();
  }, [fetchReport]);

  const handleSave = async () => {
    if (!report) return;

    try {
      const parsedPayload = JSON.parse(editPayload);
      setSaving(true);
      await authClient.api.put(`/api/v1/yaksa/reports/${reportId}`, {
        payload: parsedPayload,
        operatorNotes,
      });
      await fetchReport();
      alert('저장되었습니다.');
    } catch (err) {
      if (err instanceof SyntaxError) {
        alert('페이로드 JSON 형식이 올바르지 않습니다.');
      } else {
        alert(err instanceof Error ? err.message : '저장 실패');
      }
    } finally {
      setSaving(false);
    }
  };

  const handleApprove = async () => {
    if (!report) return;
    if (!confirm('이 신고서를 승인하시겠습니까?')) return;

    try {
      setSaving(true);
      await authClient.api.post(`/api/v1/yaksa/reports/${reportId}/approve`, {
        operatorNotes,
      });
      await fetchReport();
      alert('승인되었습니다.');
    } catch (err) {
      alert(err instanceof Error ? err.message : '승인 실패');
    } finally {
      setSaving(false);
    }
  };

  const handleReject = async () => {
    if (!report) return;
    if (!rejectionReason.trim()) {
      alert('반려 사유를 입력해주세요.');
      return;
    }
    if (!confirm('이 신고서를 반려하시겠습니까?')) return;

    try {
      setSaving(true);
      await authClient.api.post(`/api/v1/yaksa/reports/${reportId}/reject`, {
        rejectionReason,
        operatorNotes,
      });
      await fetchReport();
      alert('반려되었습니다.');
    } catch (err) {
      alert(err instanceof Error ? err.message : '반려 실패');
    } finally {
      setSaving(false);
    }
  };

  const handleSubmit = async () => {
    if (!report) return;
    if (!confirm('이 신고서를 제출하시겠습니까? 제출 후에는 수정할 수 없습니다.')) return;

    try {
      setSaving(true);
      const response = await authClient.api.post(`/api/v1/yaksa/reports/${reportId}/submit`, {});
      await fetchReport();
      if (response.success) {
        alert('신고서가 성공적으로 제출되었습니다.');
      } else {
        alert(`제출 실패: ${response.error || '알 수 없는 오류'}`);
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : '제출 실패');
    } finally {
      setSaving(false);
    }
  };

  const handleRetry = async () => {
    if (!report) return;
    if (!confirm('제출을 재시도하시겠습니까?')) return;

    try {
      setSaving(true);
      const response = await authClient.api.post(`/api/v1/yaksa/reports/${reportId}/retry`, {});
      await fetchReport();
      if (response.success) {
        alert('재시도가 성공했습니다.');
      } else {
        alert(`재시도 실패: ${response.error || '알 수 없는 오류'}`);
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : '재시도 실패');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="loading">로딩 중...</div>;
  }

  if (error) {
    return <div className="error-message">{error}</div>;
  }

  if (!report) {
    return <div className="error-message">신고서를 찾을 수 없습니다.</div>;
  }

  const canEdit = report.status === 'DRAFT' || report.status === 'REVIEWED';
  const canApproveOrReject = canEdit;
  const canSubmit = report.status === 'APPROVED';
  const canRetry = report.status === 'APPROVED' &&
    report.submissionResult?.success === false;

  return (
    <div className="yaksa-report-detail-page">
      <div className="page-header">
        <a href="/admin/reporting/yaksa" className="back-link">
          &larr; 목록으로
        </a>
        <h1>RPA 신고서 상세</h1>
      </div>

      <div className="report-info">
        <div className="info-row">
          <span className="label">신고서 ID:</span>
          <span className="value">{report.id}</span>
        </div>
        <div className="info-row">
          <span className="label">유형:</span>
          <span className="value">
            {REPORT_TYPE_LABELS[report.reportType] || report.reportType}
          </span>
        </div>
        <div className="info-row">
          <span className="label">상태:</span>
          <span className={`badge badge-${report.status.toLowerCase()}`}>
            {STATUS_LABELS[report.status] || report.status}
          </span>
        </div>
        <div className="info-row">
          <span className="label">RPA 신뢰도:</span>
          <span className="value">{(report.confidence * 100).toFixed(1)}%</span>
        </div>
        <div className="info-row">
          <span className="label">회원 ID:</span>
          <span className="value">{report.memberId}</span>
        </div>
        <div className="info-row">
          <span className="label">원본 게시글:</span>
          <span className="value">{report.sourcePostId}</span>
        </div>
        <div className="info-row">
          <span className="label">생성일:</span>
          <span className="value">
            {new Date(report.createdAt).toLocaleString('ko-KR')}
          </span>
        </div>
      </div>

      <div className="section">
        <h2>페이로드 (변경 데이터)</h2>
        <textarea
          value={editPayload}
          onChange={(e) => setEditPayload(e.target.value)}
          disabled={!canEdit}
          rows={10}
          className="payload-editor"
        />
      </div>

      {report.memberSnapshot && (
        <div className="section">
          <h2>회원 정보 스냅샷</h2>
          <pre className="json-display">
            {JSON.stringify(report.memberSnapshot, null, 2)}
          </pre>
        </div>
      )}

      {report.triggerSnapshot && (
        <div className="section">
          <h2>트리거 정보</h2>
          <pre className="json-display">
            {JSON.stringify(report.triggerSnapshot, null, 2)}
          </pre>
        </div>
      )}

      <div className="section">
        <h2>운영자 메모</h2>
        <textarea
          value={operatorNotes}
          onChange={(e) => setOperatorNotes(e.target.value)}
          disabled={!canEdit}
          rows={3}
          placeholder="운영자 메모를 입력하세요..."
          className="notes-editor"
        />
      </div>

      {canApproveOrReject && (
        <div className="section">
          <h2>반려 사유</h2>
          <textarea
            value={rejectionReason}
            onChange={(e) => setRejectionReason(e.target.value)}
            rows={2}
            placeholder="반려 시 사유를 입력하세요..."
            className="notes-editor"
          />
        </div>
      )}

      {report.rejectionReason && (
        <div className="section rejection-info">
          <h2>반려 정보</h2>
          <p>
            <strong>사유:</strong> {report.rejectionReason}
          </p>
        </div>
      )}

      {canEdit && (
        <div className="actions">
          <button onClick={handleSave} disabled={saving} className="btn btn-secondary">
            저장
          </button>
          <button onClick={handleApprove} disabled={saving} className="btn btn-primary">
            승인
          </button>
          <button onClick={handleReject} disabled={saving} className="btn btn-danger">
            반려
          </button>
        </div>
      )}

      {/* 제출 상태 섹션 (Phase 18-C) */}
      {(report.status === 'APPROVED' || report.status === 'SUBMITTED') && (
        <div className="section submission-section">
          <h2>제출 상태</h2>
          {report.status === 'SUBMITTED' ? (
            <div className="submission-success">
              <span className="status-icon">✓</span>
              <div className="status-info">
                <p><strong>제출 완료</strong></p>
                {report.submissionResult?.externalRefId && (
                  <p>외부 참조 ID: {report.submissionResult.externalRefId}</p>
                )}
                {report.submittedAt && (
                  <p>제출일시: {new Date(report.submittedAt).toLocaleString('ko-KR')}</p>
                )}
                {report.submissionResult?.outputFiles && report.submissionResult.outputFiles.length > 0 && (
                  <div className="output-files">
                    <p>생성된 파일:</p>
                    <ul>
                      {report.submissionResult.outputFiles.map((file, idx) => (
                        <li key={idx}>
                          {file.type.toUpperCase()}: {file.path}
                          {file.size && ` (${(file.size / 1024).toFixed(1)} KB)`}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          ) : report.submissionResult?.success === false ? (
            <div className="submission-failed">
              <span className="status-icon">✗</span>
              <div className="status-info">
                <p><strong>제출 실패</strong></p>
                {report.submissionResult.errorMessage && (
                  <p className="error-text">오류: {report.submissionResult.errorMessage}</p>
                )}
                {report.submissionResult.retryCount && (
                  <p>재시도 횟수: {report.submissionResult.retryCount}</p>
                )}
                {report.submissionResult.lastRetryAt && (
                  <p>마지막 시도: {new Date(report.submissionResult.lastRetryAt).toLocaleString('ko-KR')}</p>
                )}
              </div>
            </div>
          ) : (
            <div className="submission-pending">
              <span className="status-icon">⏳</span>
              <div className="status-info">
                <p><strong>제출 대기 중</strong></p>
                <p>승인된 신고서입니다. 제출 버튼을 클릭하여 외부 시스템에 제출하세요.</p>
              </div>
            </div>
          )}

          {/* 제출/재시도 버튼 */}
          {(canSubmit || canRetry) && (
            <div className="submission-actions">
              {canSubmit && !report.submissionResult && (
                <button onClick={handleSubmit} disabled={saving} className="btn btn-submit">
                  신고서 제출
                </button>
              )}
              {canRetry && (
                <button onClick={handleRetry} disabled={saving} className="btn btn-retry">
                  재시도
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {report.history && report.history.length > 0 && (
        <div className="section">
          <h2>변경 이력</h2>
          <table className="history-table">
            <thead>
              <tr>
                <th>액션</th>
                <th>이전 상태</th>
                <th>새 상태</th>
                <th>수행자</th>
                <th>일시</th>
              </tr>
            </thead>
            <tbody>
              {report.history.map((h) => (
                <tr key={h.id}>
                  <td>{ACTION_LABELS[h.action] || h.action}</td>
                  <td>{h.previousStatus ? STATUS_LABELS[h.previousStatus] || h.previousStatus : '-'}</td>
                  <td>{h.newStatus ? STATUS_LABELS[h.newStatus] || h.newStatus : '-'}</td>
                  <td>{h.actorName || '-'}</td>
                  <td>{new Date(h.createdAt).toLocaleString('ko-KR')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <style>{`
        .yaksa-report-detail-page {
          padding: 24px;
          max-width: 900px;
        }
        .back-link {
          display: inline-block;
          margin-bottom: 8px;
          color: #1976d2;
          text-decoration: none;
        }
        .back-link:hover {
          text-decoration: underline;
        }
        .page-header h1 {
          margin: 0 0 24px 0;
          font-size: 24px;
        }
        .loading, .error-message {
          padding: 24px;
          text-align: center;
        }
        .error-message {
          background: #fee;
          color: #c00;
          border-radius: 4px;
        }
        .report-info {
          background: #f9f9f9;
          padding: 16px;
          border-radius: 8px;
          margin-bottom: 24px;
        }
        .info-row {
          display: flex;
          margin-bottom: 8px;
        }
        .info-row:last-child {
          margin-bottom: 0;
        }
        .info-row .label {
          width: 120px;
          font-weight: 600;
          color: #666;
        }
        .info-row .value {
          flex: 1;
        }
        .badge {
          display: inline-block;
          padding: 4px 8px;
          border-radius: 4px;
          font-size: 12px;
        }
        .badge-draft { background: #eee; color: #666; }
        .badge-reviewed { background: #e3f2fd; color: #1976d2; }
        .badge-approved { background: #e8f5e9; color: #388e3c; }
        .badge-rejected { background: #ffebee; color: #c62828; }
        .badge-submitted { background: #e1f5fe; color: #0288d1; }
        .section {
          margin-bottom: 24px;
        }
        .section h2 {
          font-size: 16px;
          margin: 0 0 12px 0;
          padding-bottom: 8px;
          border-bottom: 1px solid #eee;
        }
        .payload-editor, .notes-editor {
          width: 100%;
          font-family: monospace;
          padding: 12px;
          border: 1px solid #ddd;
          border-radius: 4px;
          resize: vertical;
        }
        .payload-editor:disabled, .notes-editor:disabled {
          background: #f5f5f5;
        }
        .json-display {
          background: #f5f5f5;
          padding: 12px;
          border-radius: 4px;
          font-size: 12px;
          overflow-x: auto;
        }
        .rejection-info {
          background: #fff3e0;
          padding: 16px;
          border-radius: 8px;
        }
        .actions {
          display: flex;
          gap: 12px;
          padding-top: 16px;
          border-top: 1px solid #eee;
        }
        .btn {
          padding: 8px 16px;
          border: none;
          border-radius: 4px;
          font-size: 14px;
          cursor: pointer;
        }
        .btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        .btn-primary {
          background: #388e3c;
          color: white;
        }
        .btn-primary:hover:not(:disabled) {
          background: #2e7d32;
        }
        .btn-secondary {
          background: #1976d2;
          color: white;
        }
        .btn-secondary:hover:not(:disabled) {
          background: #1565c0;
        }
        .btn-danger {
          background: #c62828;
          color: white;
        }
        .btn-danger:hover:not(:disabled) {
          background: #b71c1c;
        }
        .history-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 14px;
        }
        .history-table th,
        .history-table td {
          padding: 8px 12px;
          text-align: left;
          border-bottom: 1px solid #eee;
        }
        .history-table th {
          background: #f9f9f9;
          font-weight: 600;
        }
        /* Submission section styles (Phase 18-C) */
        .submission-section {
          background: #f8f9fa;
          padding: 16px;
          border-radius: 8px;
        }
        .submission-success,
        .submission-failed,
        .submission-pending {
          display: flex;
          align-items: flex-start;
          gap: 12px;
        }
        .status-icon {
          font-size: 24px;
          width: 32px;
          height: 32px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 50%;
        }
        .submission-success .status-icon {
          background: #e8f5e9;
          color: #388e3c;
        }
        .submission-failed .status-icon {
          background: #ffebee;
          color: #c62828;
        }
        .submission-pending .status-icon {
          background: #fff3e0;
          color: #f57c00;
        }
        .status-info p {
          margin: 4px 0;
        }
        .error-text {
          color: #c62828;
        }
        .output-files {
          margin-top: 8px;
        }
        .output-files ul {
          margin: 4px 0;
          padding-left: 20px;
        }
        .output-files li {
          font-size: 12px;
          color: #666;
        }
        .submission-actions {
          margin-top: 16px;
          padding-top: 16px;
          border-top: 1px solid #ddd;
        }
        .btn-submit {
          background: #0288d1;
          color: white;
        }
        .btn-submit:hover:not(:disabled) {
          background: #0277bd;
        }
        .btn-retry {
          background: #f57c00;
          color: white;
        }
        .btn-retry:hover:not(:disabled) {
          background: #ef6c00;
        }
      `}</style>
    </div>
  );
}

export default YaksaReportDetailPage;
