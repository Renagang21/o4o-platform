import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Clock, CheckCircle, XCircle, AlertCircle, Building2, Truck, Monitor } from 'lucide-react';
import { glycopharmApi } from '@/api/glycopharm';
import type { GlycopharmApplication, ApplicationStatus, ServiceType } from '@/api/glycopharm';

/**
 * My Applications Page
 * (B) 내 신청 목록 / 상태 확인
 */

const SERVICE_LABELS: Record<ServiceType, { label: string; icon: typeof Building2 }> = {
  dropshipping: { label: '무재고 판매', icon: Truck },
  sample_sales: { label: '샘플 판매', icon: Building2 },
  digital_signage: { label: '디지털 사이니지', icon: Monitor },
};

export default function MyApplicationsPage() {
  const [applications, setApplications] = useState<GlycopharmApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadApplications();
  }, []);

  const loadApplications = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await glycopharmApi.getMyApplications();
      setApplications(response.applications);
    } catch (err: any) {
      if (err.status === 401 || err.code === 'UNAUTHORIZED') {
        setError('로그인이 필요합니다.');
      } else {
        setError(err.message || '신청 목록을 불러오는데 실패했습니다.');
      }
    } finally {
      setLoading(false);
    }
  };

  const getStatusConfig = (status: ApplicationStatus) => {
    switch (status) {
      case 'submitted':
        return {
          label: '심사 중',
          icon: Clock,
          bgColor: 'bg-amber-100',
          textColor: 'text-amber-700',
        };
      case 'approved':
        return {
          label: '승인됨',
          icon: CheckCircle,
          bgColor: 'bg-green-100',
          textColor: 'text-green-700',
        };
      case 'rejected':
        return {
          label: '반려됨',
          icon: XCircle,
          bgColor: 'bg-red-100',
          textColor: 'text-red-700',
        };
      default:
        return {
          label: status,
          icon: Clock,
          bgColor: 'bg-slate-100',
          textColor: 'text-slate-700',
        };
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 py-16">
      <div className="max-w-3xl mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-10">
          <h1 className="text-3xl font-bold text-slate-800 mb-3">내 신청 목록</h1>
          <p className="text-slate-500">제출한 신청서의 상태를 확인하세요.</p>
        </div>

        {/* Loading */}
        {loading && (
          <div className="text-center py-16">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-600 mx-auto mb-4"></div>
            <p className="text-slate-500">불러오는 중...</p>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="bg-white rounded-2xl shadow-sm p-8 text-center">
            <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="w-6 h-6 text-red-500" />
            </div>
            <p className="text-slate-700 mb-6">{error}</p>
            {error.includes('로그인') ? (
              <Link
                to="/login"
                className="inline-block px-6 py-3 bg-primary-600 text-white font-semibold rounded-xl hover:bg-primary-700 transition-colors"
              >
                로그인하기
              </Link>
            ) : (
              <button
                onClick={loadApplications}
                className="px-6 py-3 bg-primary-600 text-white font-semibold rounded-xl hover:bg-primary-700 transition-colors"
              >
                다시 시도
              </button>
            )}
          </div>
        )}

        {/* Applications List */}
        {!loading && !error && applications.length > 0 && (
          <div className="space-y-4">
            {applications.map((app) => {
              const statusConfig = getStatusConfig(app.status);
              const StatusIcon = statusConfig.icon;

              return (
                <div key={app.id} className="bg-white rounded-2xl shadow-sm p-6">
                  {/* Header */}
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="text-lg font-semibold text-slate-800 mb-1">
                        {app.organizationName}
                      </h3>
                      <p className="text-sm text-slate-500">개인 약국</p>
                    </div>
                    <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full ${statusConfig.bgColor}`}>
                      <StatusIcon className={`w-4 h-4 ${statusConfig.textColor}`} />
                      <span className={`text-sm font-medium ${statusConfig.textColor}`}>
                        {statusConfig.label}
                      </span>
                    </div>
                  </div>

                  {/* Services */}
                  <div className="mb-4">
                    <p className="text-xs text-slate-400 mb-2">신청 서비스</p>
                    <div className="flex flex-wrap gap-2">
                      {app.serviceTypes.map((serviceType) => {
                        const service = SERVICE_LABELS[serviceType];
                        const Icon = service.icon;
                        return (
                          <div
                            key={serviceType}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 rounded-lg"
                          >
                            <Icon className="w-3.5 h-3.5 text-slate-500" />
                            <span className="text-sm text-slate-600">{service.label}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Info */}
                  {app.businessNumber && (
                    <div className="flex items-center gap-2 text-sm text-slate-500 mb-2">
                      <span className="text-slate-400">사업자번호:</span>
                      <span>{app.businessNumber}</span>
                    </div>
                  )}

                  {app.note && (
                    <div className="text-sm text-slate-500 mb-4">
                      <span className="text-slate-400">메모: </span>
                      {app.note}
                    </div>
                  )}

                  {/* Rejection Reason */}
                  {app.status === 'rejected' && app.rejectionReason && (
                    <div className="p-3 bg-red-50 rounded-lg mb-4">
                      <p className="text-sm text-red-700">
                        <span className="font-medium">반려 사유: </span>
                        {app.rejectionReason}
                      </p>
                    </div>
                  )}

                  {/* Footer */}
                  <div className="flex items-center gap-4 pt-4 border-t border-slate-100">
                    <span className="text-xs text-slate-400">
                      신청일: {new Date(app.submittedAt).toLocaleDateString('ko-KR')}
                    </span>
                    {app.decidedAt && (
                      <span className="text-xs text-slate-400">
                        처리일: {new Date(app.decidedAt).toLocaleDateString('ko-KR')}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Empty State */}
        {!loading && !error && applications.length === 0 && (
          <div className="bg-white rounded-2xl shadow-sm p-12 text-center">
            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <Building2 className="w-8 h-8 text-slate-400" />
            </div>
            <p className="text-slate-500 mb-6">신청 내역이 없습니다.</p>
            <Link
              to="/apply"
              className="inline-block px-6 py-3 bg-primary-600 text-white font-semibold rounded-xl hover:bg-primary-700 transition-colors"
            >
              참여 신청하기
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
