/**
 * GlucoseView My Applications Page
 *
 * Phase C-4: 내 신청 목록 페이지
 */

import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../services/api';
import type { GlucoseViewApplication, ApplicationStatus } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';

const STATUS_CONFIG: Record<ApplicationStatus, { label: string; bgColor: string; textColor: string }> = {
  submitted: { label: '심사 대기', bgColor: 'bg-amber-100', textColor: 'text-amber-700' },
  approved: { label: '승인됨', bgColor: 'bg-green-100', textColor: 'text-green-700' },
  rejected: { label: '반려됨', bgColor: 'bg-red-100', textColor: 'text-red-700' },
};

export default function MyApplicationsPage() {
  const { isAuthenticated } = useAuth();
  const [applications, setApplications] = useState<GlucoseViewApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isAuthenticated) {
      loadApplications();
    }
  }, [isAuthenticated]);

  const loadApplications = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await api.getMyApplications();
      setApplications(response.applications);
    } catch (err: any) {
      setError(err.message || '신청 목록을 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
          <h2 className="text-xl font-bold text-gray-800 mb-2">로그인이 필요합니다</h2>
          <p className="text-gray-600 mb-6">신청 현황을 확인하려면 로그인해주세요.</p>
          <Link
            to="/"
            className="inline-block px-6 py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition-colors"
          >
            홈으로 이동
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-12 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">내 신청 현황</h1>
            <p className="text-gray-600 mt-1">GlucoseView 서비스 신청 내역</p>
          </div>
          <Link
            to="/apply"
            className="px-4 py-2 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition-colors"
          >
            새 신청
          </Link>
        </div>

        {/* Content */}
        {loading ? (
          <div className="bg-white rounded-2xl shadow-xl p-12 text-center">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-500">불러오는 중...</p>
          </div>
        ) : error ? (
          <div className="bg-white rounded-2xl shadow-xl p-8 text-center">
            <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <p className="text-red-600 mb-4">{error}</p>
            <button
              onClick={loadApplications}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
            >
              다시 시도
            </button>
          </div>
        ) : applications.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-xl p-12 text-center">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-800 mb-2">신청 내역이 없습니다</h3>
            <p className="text-gray-500 mb-6">GlucoseView 서비스를 신청해보세요.</p>
            <Link
              to="/apply"
              className="inline-block px-6 py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition-colors"
            >
              서비스 신청하기
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {applications.map((app) => {
              const statusConfig = STATUS_CONFIG[app.status];
              return (
                <div key={app.id} className="bg-white rounded-2xl shadow-xl p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-800">{app.pharmacyName}</h3>
                      {app.businessNumber && (
                        <p className="text-sm text-gray-500">사업자번호: {app.businessNumber}</p>
                      )}
                    </div>
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${statusConfig.bgColor} ${statusConfig.textColor}`}>
                      {statusConfig.label}
                    </span>
                  </div>

                  {/* Services */}
                  <div className="flex flex-wrap gap-2 mb-4">
                    {app.serviceTypes.map((service) => (
                      <span
                        key={service}
                        className="px-3 py-1 bg-blue-50 text-blue-700 text-sm rounded-lg"
                      >
                        {service === 'cgm_view' ? 'CGM View' : service}
                      </span>
                    ))}
                  </div>

                  {/* Note */}
                  {app.note && (
                    <p className="text-sm text-gray-600 mb-4 bg-gray-50 p-3 rounded-lg">
                      {app.note}
                    </p>
                  )}

                  {/* Rejection Reason */}
                  {app.status === 'rejected' && app.rejectionReason && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
                      <h4 className="text-sm font-medium text-red-800 mb-1">반려 사유</h4>
                      <p className="text-sm text-red-700">{app.rejectionReason}</p>
                    </div>
                  )}

                  {/* Dates */}
                  <div className="text-xs text-gray-500 space-y-1">
                    <p>신청일: {new Date(app.submittedAt).toLocaleString('ko-KR')}</p>
                    {app.decidedAt && (
                      <p>처리일: {new Date(app.decidedAt).toLocaleString('ko-KR')}</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Back Link */}
        <div className="mt-8 text-center">
          <Link
            to="/"
            className="text-blue-600 hover:text-blue-700 font-medium"
          >
            ← 홈으로 돌아가기
          </Link>
        </div>
      </div>
    </div>
  );
}
