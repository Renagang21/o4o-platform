/**
 * ReportReviewPage
 *
 * Phase 1: 신상신고 검토 페이지
 *
 * 기능:
 * - 제출된 신상신고서 목록 조회
 * - 신상신고 승인 / 반려
 *
 * 제한:
 * - 신고서 필드 편집 ❌
 * - 신규 신고 생성 ❌
 */

import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowLeft,
  FileText,
  RefreshCw,
  CheckCircle,
  XCircle,
  AlertCircle,
  Eye,
} from 'lucide-react';
import {
  getReports,
  approveReport,
  rejectReport,
  type YaksaReport,
} from '@/lib/api/yaksaAdmin';

type TabType = 'DRAFT' | 'REVIEWED' | 'APPROVED' | 'REJECTED';

const REPORT_TYPE_LABELS: Record<string, string> = {
  PROFILE_UPDATE: '인적사항 변경',
  LICENSE_CHANGE: '면허 변경',
  WORKPLACE_CHANGE: '근무지 변경',
  AFFILIATION_CHANGE: '소속 변경',
};

const STATUS_LABELS: Record<string, string> = {
  DRAFT: '검토 대기',
  REVIEWED: '검토 완료',
  APPROVED: '승인',
  REJECTED: '반려',
};

export function ReportReviewPage() {
  const [activeTab, setActiveTab] = useState<TabType>('DRAFT');
  const [reports, setReports] = useState<YaksaReport[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionInProgress, setActionInProgress] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [showRejectModal, setShowRejectModal] = useState<string | null>(null);

  const loadReports = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await getReports({ status: activeTab });
      setReports(response.data || []);
    } catch (err) {
      setError('데이터를 불러올 수 없습니다. 잠시 후 다시 시도해 주세요.');
      console.error('Failed to load reports:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadReports();
  }, [activeTab]);

  const handleApprove = async (reportId: string) => {
    setActionInProgress(reportId);
    try {
      await approveReport(reportId);
      await loadReports();
    } catch (err) {
      setError('승인 처리 중 오류가 발생했습니다.');
      console.error('Failed to approve report:', err);
    } finally {
      setActionInProgress(null);
    }
  };

  const handleReject = async (reportId: string) => {
    if (!rejectReason.trim()) {
      alert('반려 사유를 입력해 주세요.');
      return;
    }
    setActionInProgress(reportId);
    try {
      await rejectReport(reportId, rejectReason);
      setShowRejectModal(null);
      setRejectReason('');
      await loadReports();
    } catch (err) {
      setError('반려 처리 중 오류가 발생했습니다.');
      console.error('Failed to reject report:', err);
    } finally {
      setActionInProgress(null);
    }
  };

  const tabs = [
    { id: 'DRAFT' as const, label: '검토 대기' },
    { id: 'REVIEWED' as const, label: '검토 완료' },
    { id: 'APPROVED' as const, label: '승인' },
    { id: 'REJECTED' as const, label: '반려' },
  ];

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <Link
          to="/admin/yaksa"
          className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700 mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          관리자 센터로 돌아가기
        </Link>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">신상신고 승인</h1>
            <p className="text-gray-500 mt-1">
              제출된 신상신고서를 검토하고 승인합니다.
            </p>
          </div>
          <button
            onClick={loadReports}
            disabled={isLoading}
            className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            새로고침
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="-mb-px flex space-x-8">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`
                py-4 px-1 border-b-2 font-medium text-sm
                ${activeTab === tab.id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }
              `}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Error */}
      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
          {error}
        </div>
      )}

      {/* Content */}
      {isLoading ? (
        <div className="text-center py-12">
          <RefreshCw className="h-8 w-8 animate-spin text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500">데이터를 불러오는 중...</p>
        </div>
      ) : reports.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <FileText className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500">
            {STATUS_LABELS[activeTab]} 상태의 신상신고가 없습니다.
          </p>
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  신고 유형
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  회원
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  상태
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  제출일
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  작업
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {reports.map((report) => (
                <tr key={report.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div className="font-medium text-gray-900">
                      {REPORT_TYPE_LABELS[report.reportType] || report.reportType}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-900">
                      {report.memberName || report.memberId}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`
                      inline-flex px-2 py-1 text-xs font-medium rounded
                      ${report.status === 'DRAFT' ? 'bg-yellow-100 text-yellow-700' : ''}
                      ${report.status === 'REVIEWED' ? 'bg-blue-100 text-blue-700' : ''}
                      ${report.status === 'APPROVED' ? 'bg-green-100 text-green-700' : ''}
                      ${report.status === 'REJECTED' ? 'bg-red-100 text-red-700' : ''}
                    `}>
                      {STATUS_LABELS[report.status]}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {new Date(report.createdAt).toLocaleDateString('ko-KR')}
                  </td>
                  <td className="px-6 py-4 text-right space-x-2">
                    {(activeTab === 'DRAFT' || activeTab === 'REVIEWED') && (
                      <>
                        <button
                          onClick={() => handleApprove(report.id)}
                          disabled={actionInProgress === report.id}
                          className="inline-flex items-center px-3 py-1.5 bg-green-600 text-white text-sm font-medium rounded hover:bg-green-700 disabled:opacity-50"
                        >
                          <CheckCircle className="h-4 w-4 mr-1" />
                          승인
                        </button>
                        <button
                          onClick={() => setShowRejectModal(report.id)}
                          disabled={actionInProgress === report.id}
                          className="inline-flex items-center px-3 py-1.5 bg-red-600 text-white text-sm font-medium rounded hover:bg-red-700 disabled:opacity-50"
                        >
                          <XCircle className="h-4 w-4 mr-1" />
                          반려
                        </button>
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Reject Modal */}
      {showRejectModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              신상신고 반려
            </h3>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                반려 사유 <span className="text-red-500">*</span>
              </label>
              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={3}
                placeholder="반려 사유를 입력해 주세요."
              />
            </div>
            <div className="flex justify-end space-x-2">
              <button
                onClick={() => {
                  setShowRejectModal(null);
                  setRejectReason('');
                }}
                className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                취소
              </button>
              <button
                onClick={() => handleReject(showRejectModal)}
                disabled={actionInProgress === showRejectModal || !rejectReason.trim()}
                className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 disabled:opacity-50"
              >
                반려 처리
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ReportReviewPage;
