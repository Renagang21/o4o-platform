/**
 * Service Application Detail Page
 *
 * 서비스 신청 상세/심사 페이지 (glycopharm, glucoseview 공통)
 * URL: /admin/service-applications/:service/:id
 */

import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft,
  Building2,
  Calendar,
  Check,
  Clock,
  FileText,
  Mail,
  User,
  X,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import {
  getApplicationDetail,
  reviewApplication,
  APPLICATION_STATUS_LABELS,
  APPLICATION_STATUS_COLORS,
  SERVICE_LABELS,
  getServiceTypeLabel,
} from '@/api/service-applications';
import type { ServiceType, ServiceApplication } from '@/api/service-applications';
import toast from 'react-hot-toast';

export default function ServiceApplicationDetailPage() {
  const { service, id } = useParams<{ service: string; id: string }>();
  const navigate = useNavigate();

  const [application, setApplication] = useState<ServiceApplication | null>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [showRejectForm, setShowRejectForm] = useState(false);

  // Validate service type
  const validService =
    service === 'glycopharm' || service === 'glucoseview'
      ? (service as ServiceType)
      : null;

  useEffect(() => {
    if (validService && id) {
      loadApplication();
    }
  }, [validService, id]);

  const loadApplication = async () => {
    if (!validService || !id) return;

    setLoading(true);
    try {
      const response = await getApplicationDetail(validService, id);
      setApplication(response.application);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : '신청 정보를 불러오는데 실패했습니다.';
      toast.error(errorMessage);
      navigate(`/admin/service-applications/${validService}`);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async () => {
    if (!validService || !id || !application) return;

    setProcessing(true);
    try {
      const response = await reviewApplication(validService, id, {
        action: 'approve',
      });
      setApplication(response.application);
      toast.success('신청이 승인되었습니다.');
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : '승인 처리 중 오류가 발생했습니다.';
      toast.error(errorMessage);
    } finally {
      setProcessing(false);
    }
  };

  const handleReject = async () => {
    if (!validService || !id || !application) return;

    if (!rejectionReason.trim()) {
      toast.error('반려 사유를 입력해주세요.');
      return;
    }

    setProcessing(true);
    try {
      const response = await reviewApplication(validService, id, {
        action: 'reject',
        rejectionReason: rejectionReason.trim(),
      });
      setApplication(response.application);
      setShowRejectForm(false);
      setRejectionReason('');
      toast.success('신청이 반려되었습니다.');
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : '반려 처리 중 오류가 발생했습니다.';
      toast.error(errorMessage);
    } finally {
      setProcessing(false);
    }
  };

  if (!validService) {
    return (
      <div className="p-8">
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-gray-500 mb-4">잘못된 서비스 유형입니다.</p>
            <Button onClick={() => navigate('/admin')}>관리자 홈으로</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const serviceName = SERVICE_LABELS[validService];

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-500">불러오는 중...</p>
        </div>
      </div>
    );
  }

  if (!application) {
    return (
      <div className="p-8">
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-gray-500 mb-4">신청 정보를 찾을 수 없습니다.</p>
            <Button onClick={() => navigate(`/admin/service-applications/${validService}`)}>
              목록으로 돌아가기
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const statusColors = APPLICATION_STATUS_COLORS[application.status];
  const isPending = application.status === 'submitted';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            to={`/admin/service-applications/${validService}`}
            className="text-gray-500 hover:text-gray-700"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-800">신청 상세</h1>
            <p className="text-gray-600 mt-1">{serviceName} 서비스 신청 정보</p>
          </div>
        </div>
        <Badge className={`${statusColors.bg} ${statusColors.text} text-base px-4 py-1`}>
          {APPLICATION_STATUS_LABELS[application.status]}
        </Badge>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Info */}
        <div className="lg:col-span-2 space-y-6">
          {/* Applicant Info */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="w-5 h-5" />
                신청자 정보
              </CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="grid grid-cols-2 gap-4">
                <div>
                  <dt className="text-sm text-gray-500 mb-1">이름</dt>
                  <dd className="font-medium text-gray-900">
                    {application.userName || '-'}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm text-gray-500 mb-1">이메일</dt>
                  <dd className="font-medium text-gray-900 flex items-center gap-2">
                    <Mail className="w-4 h-4 text-gray-400" />
                    {application.userEmail || '-'}
                  </dd>
                </div>
              </dl>
            </CardContent>
          </Card>

          {/* Pharmacy Info */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="w-5 h-5" />
                약국 정보
              </CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="grid grid-cols-2 gap-4">
                <div>
                  <dt className="text-sm text-gray-500 mb-1">약국명</dt>
                  <dd className="font-medium text-gray-900">{application.pharmacyName}</dd>
                </div>
                <div>
                  <dt className="text-sm text-gray-500 mb-1">사업자등록번호</dt>
                  <dd className="font-medium text-gray-900">
                    {application.businessNumber || '-'}
                  </dd>
                </div>
              </dl>
            </CardContent>
          </Card>

          {/* Service Info */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                신청 서비스
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {application.serviceTypes.map((serviceType) => (
                  <Badge
                    key={serviceType}
                    variant="outline"
                    className="bg-blue-50 text-blue-700 border-blue-200 px-4 py-2"
                  >
                    {getServiceTypeLabel(serviceType)}
                  </Badge>
                ))}
              </div>
              {application.note && (
                <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-500 mb-1">추가 메모</p>
                  <p className="text-gray-700">{application.note}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Rejection Reason (if rejected) */}
          {application.status === 'rejected' && application.rejectionReason && (
            <Card className="border-red-200 bg-red-50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-red-700">
                  <X className="w-5 h-5" />
                  반려 사유
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-red-700">{application.rejectionReason}</p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Timeline */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="w-5 h-5" />
                처리 이력
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 rounded-full bg-blue-500 mt-2"></div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">신청 접수</p>
                    <p className="text-xs text-gray-500">
                      {new Date(application.submittedAt).toLocaleString('ko-KR')}
                    </p>
                  </div>
                </div>
                {application.decidedAt && (
                  <div className="flex items-start gap-3">
                    <div
                      className={`w-2 h-2 rounded-full mt-2 ${
                        application.status === 'approved' ? 'bg-green-500' : 'bg-red-500'
                      }`}
                    ></div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {application.status === 'approved' ? '승인 완료' : '반려 처리'}
                      </p>
                      <p className="text-xs text-gray-500">
                        {new Date(application.decidedAt).toLocaleString('ko-KR')}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Actions */}
          {isPending && (
            <Card>
              <CardHeader>
                <CardTitle>심사 결정</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {!showRejectForm ? (
                  <>
                    <Button
                      className="w-full bg-green-600 hover:bg-green-700"
                      onClick={handleApprove}
                      disabled={processing}
                    >
                      <Check className="w-4 h-4 mr-2" />
                      {processing ? '처리 중...' : '승인'}
                    </Button>
                    <Button
                      variant="outline"
                      className="w-full border-red-200 text-red-600 hover:bg-red-50"
                      onClick={() => setShowRejectForm(true)}
                      disabled={processing}
                    >
                      <X className="w-4 h-4 mr-2" />
                      반려
                    </Button>
                  </>
                ) : (
                  <>
                    <div>
                      <label className="text-sm font-medium text-gray-700 mb-2 block">
                        반려 사유 <span className="text-red-500">*</span>
                      </label>
                      <Textarea
                        value={rejectionReason}
                        onChange={(e) => setRejectionReason(e.target.value)}
                        placeholder="반려 사유를 입력해주세요"
                        rows={4}
                        className="resize-none"
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        className="flex-1"
                        onClick={() => {
                          setShowRejectForm(false);
                          setRejectionReason('');
                        }}
                        disabled={processing}
                      >
                        취소
                      </Button>
                      <Button
                        className="flex-1 bg-red-600 hover:bg-red-700"
                        onClick={handleReject}
                        disabled={processing}
                      >
                        {processing ? '처리 중...' : '반려 확정'}
                      </Button>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
