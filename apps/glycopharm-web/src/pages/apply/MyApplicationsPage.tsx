import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Clock, CheckCircle, XCircle, Package, Building2, Monitor, RefreshCw } from 'lucide-react';
import { glycopharmApi, PharmacyApplication, ServiceType, ApplicationStatus } from '@/api/glycopharm';

/**
 * My Applications Page
 * (B) 내 신청 목록/상태 확인
 */

type FilterStatus = 'all' | ApplicationStatus;

const SERVICE_LABELS: Record<ServiceType, { label: string; icon: React.ReactNode }> = {
  dropshipping: { label: '무재고 판매', icon: <Package className="w-4 h-4" /> },
  sample_sales: { label: '샘플 판매', icon: <Building2 className="w-4 h-4" /> },
  digital_signage: { label: '디지털 사이니지', icon: <Monitor className="w-4 h-4" /> },
};

const STATUS_CONFIG: Record<ApplicationStatus, { label: string; style: string; icon: React.ReactNode }> = {
  submitted: {
    label: '심사 중',
    style: 'bg-amber-100 text-amber-700',
    icon: <Clock className="w-4 h-4" />,
  },
  approved: {
    label: '승인됨',
    style: 'bg-green-100 text-green-700',
    icon: <CheckCircle className="w-4 h-4" />,
  },
  rejected: {
    label: '반려됨',
    style: 'bg-red-100 text-red-700',
    icon: <XCircle className="w-4 h-4" />,
  },
};

export default function MyApplicationsPage() {
  const [applications, setApplications] = useState<PharmacyApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterStatus>('all');

  useEffect(() => {
    loadApplications();
  }, [filter]);

  const loadApplications = async () => {
    setLoading(true);
    setError(null);

    try {
      const status = filter !== 'all' ? filter : undefined;
      const response = await glycopharmApi.getMyApplications(status);
      setApplications(response.applications);
    } catch (err: unknown) {
      const apiError = err as { code?: string; status?: number; message?: string };
      if (apiError.status === 401 || apiError.code === 'UNAUTHORIZED') {
        setError('로그인이 필요합니다.');
      } else {
        setError(apiError.message || '신청 목록을 불러오는데 실패했습니다.');
      }
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="text-center mb-10">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">내 신청 목록</h1>
          <p className="text-gray-600">제출한 신청서의 상태를 확인하세요.</p>
        </div>

        {/* Filter Tabs */}
        <div className="flex justify-center gap-2 mb-8 flex-wrap">
          {(['all', 'submitted', 'approved', 'rejected'] as FilterStatus[]).map((status) => (
            <button
              key={status}
              onClick={() => setFilter(status)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                filter === status
                  ? 'bg-primary-600 text-white'
                  : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
              }`}
            >
              {status === 'all' ? '전체' : STATUS_CONFIG[status].label}
            </button>
          ))}
        </div>

        {/* Loading */}
        {loading && (
          <div className="text-center py-16">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
            <p className="mt-4 text-gray-500">불러오는 중...</p>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="bg-white rounded-2xl shadow-lg p-8 text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <XCircle className="w-8 h-8 text-red-600" />
            </div>
            <p className="text-red-600 mb-6">{error}</p>
            {error.includes('로그인') ? (
              <Link
                to="/login"
                className="inline-block px-6 py-3 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700 transition-colors"
              >
                로그인하기
              </Link>
            ) : (
              <button
                onClick={loadApplications}
                className="inline-flex items-center gap-2 px-6 py-3 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700 transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
                다시 시도
              </button>
            )}
          </div>
        )}

        {/* Applications List */}
        {!loading && !error && applications.length > 0 && (
          <div className="space-y-4">
            {applications.map((app) => (
              <div key={app.id} className="bg-white rounded-xl shadow-md p-6">
                {/* Header with Status */}
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">{app.pharmacyName}</h3>
                    {app.businessNumber && (
                      <p className="text-sm text-gray-500">사업자번호: {app.businessNumber}</p>
                    )}
                  </div>
                  <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium ${STATUS_CONFIG[app.status].style}`}>
                    {STATUS_CONFIG[app.status].icon}
                    {STATUS_CONFIG[app.status].label}
                  </div>
                </div>

                {/* Services */}
                <div className="mb-4">
                  <p className="text-sm text-gray-500 mb-2">신청 서비스</p>
                  <div className="flex flex-wrap gap-2">
                    {app.serviceTypes.map((serviceType) => (
                      <span
                        key={serviceType}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg text-sm"
                      >
                        {SERVICE_LABELS[serviceType].icon}
                        {SERVICE_LABELS[serviceType].label}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Info */}
                {app.address && (
                  <p className="text-sm text-gray-600 mb-2">
                    <span className="text-gray-400">주소:</span> {app.address}
                  </p>
                )}
                {app.note && (
                  <p className="text-sm text-gray-600 mb-4">
                    <span className="text-gray-400">메모:</span> {app.note}
                  </p>
                )}

                {/* Footer */}
                <div className="pt-4 border-t border-gray-100 flex items-center justify-between text-sm text-gray-500">
                  <span>신청일: {formatDate(app.submittedAt)}</span>
                  {app.decidedAt && (
                    <span>처리일: {formatDate(app.decidedAt)}</span>
                  )}
                </div>

                {/* Rejection Reason */}
                {app.status === 'rejected' && app.rejectionReason && (
                  <div className="mt-4 p-3 bg-red-50 border border-red-100 rounded-lg">
                    <p className="text-sm text-red-700">
                      <span className="font-medium">반려 사유:</span> {app.rejectionReason}
                    </p>
                  </div>
                )}

                {/* Approved Notice */}
                {app.status === 'approved' && (
                  <div className="mt-4 p-3 bg-green-50 border border-green-100 rounded-lg">
                    <p className="text-sm text-green-700">
                      승인되었습니다. <Link to="/pharmacy" className="font-medium underline">약국 대시보드</Link>에서 서비스를 이용하세요.
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Empty State */}
        {!loading && !error && applications.length === 0 && (
          <div className="bg-white rounded-2xl shadow-lg p-12 text-center">
            <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <Package className="w-10 h-10 text-gray-400" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">신청 내역이 없습니다</h3>
            <p className="text-gray-500 mb-8">
              글라이코팜 서비스에 참여하시려면 먼저 신청해주세요.
            </p>
            <Link
              to="/apply"
              className="inline-block px-6 py-3 bg-primary-600 text-white rounded-lg font-semibold hover:bg-primary-700 transition-colors"
            >
              약국 참여 신청하기
            </Link>
          </div>
        )}

        {/* Bottom Note */}
        <div className="mt-8 text-center text-sm text-gray-500">
          <p>
            새로 신청하시려면{' '}
            <Link to="/apply" className="text-primary-600 hover:underline">
              약국 참여 신청
            </Link>
            을 이용하세요.
          </p>
        </div>
      </div>
    </div>
  );
}
