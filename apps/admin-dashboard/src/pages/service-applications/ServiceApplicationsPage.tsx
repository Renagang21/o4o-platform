/**
 * Service Applications List Page
 *
 * 서비스 신청 목록 페이지 (glycopharm, glucoseview 공통)
 * URL: /admin/service-applications/:service
 */

import { useState, useEffect } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { FileText, Filter, RefreshCw, ChevronLeft, ChevronRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  getApplications,
  APPLICATION_STATUS_LABELS,
  APPLICATION_STATUS_COLORS,
  SERVICE_LABELS,
  getServiceTypeLabel,
} from '@/api/service-applications';
import type {
  ServiceType,
  ServiceApplication,
  ApplicationStatus,
  ApplicationFilters,
} from '@/api/service-applications';
import toast from 'react-hot-toast';

export default function ServiceApplicationsPage() {
  const { service } = useParams<{ service: string }>();
  const navigate = useNavigate();

  const [applications, setApplications] = useState<ServiceApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<ApplicationStatus | ''>('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  // Validate service type
  const validService = service === 'glycopharm' || service === 'glucoseview' ? service as ServiceType : null;

  useEffect(() => {
    if (validService) {
      loadApplications();
    }
  }, [validService, statusFilter, page]);

  const loadApplications = async () => {
    if (!validService) return;

    setLoading(true);
    try {
      const filters: ApplicationFilters = {
        page,
        limit: 20,
      };
      if (statusFilter) {
        filters.status = statusFilter;
      }

      const response = await getApplications(validService, filters);
      setApplications(response.applications);
      setTotalPages(response.pagination.totalPages);
      setTotal(response.pagination.total);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : '신청 목록을 불러오는데 실패했습니다.';
      if (errorMessage.includes('403') || errorMessage.includes('FORBIDDEN')) {
        toast.error('접근 권한이 없습니다.');
      } else {
        toast.error(errorMessage);
      }
    } finally {
      setLoading(false);
    }
  };

  if (!validService) {
    return (
      <div className="p-8">
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-gray-500 mb-4">잘못된 서비스 유형입니다.</p>
            <Button onClick={() => navigate('/admin')}>
              관리자 홈으로
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const serviceName = SERVICE_LABELS[validService];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">
            {serviceName} 신청 관리
          </h1>
          <p className="text-gray-600 mt-1">
            {serviceName} 서비스 신청을 검토하고 승인합니다
          </p>
        </div>
        <Button
          variant="outline"
          onClick={loadApplications}
          disabled={loading}
        >
          <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          새로고침
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="py-4">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-gray-500" />
              <span className="text-sm font-medium text-gray-700">상태 필터:</span>
            </div>
            <Select
              value={statusFilter}
              onValueChange={(value) => {
                setStatusFilter(value as ApplicationStatus | '');
                setPage(1);
              }}
            >
              <SelectTrigger className="w-40">
                <SelectValue placeholder="전체" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">전체</SelectItem>
                <SelectItem value="submitted">심사 대기</SelectItem>
                <SelectItem value="approved">승인됨</SelectItem>
                <SelectItem value="rejected">반려됨</SelectItem>
              </SelectContent>
            </Select>
            <span className="text-sm text-gray-500 ml-auto">
              총 {total}건
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            신청 목록
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="py-12 text-center">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-500">불러오는 중...</p>
            </div>
          ) : applications.length === 0 ? (
            <div className="py-12 text-center">
              <FileText className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">신청 내역이 없습니다.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>신청자</TableHead>
                  <TableHead>약국명</TableHead>
                  <TableHead>서비스</TableHead>
                  <TableHead>상태</TableHead>
                  <TableHead>신청일</TableHead>
                  <TableHead className="text-right">액션</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {applications.map((app) => {
                  const statusColors = APPLICATION_STATUS_COLORS[app.status];
                  return (
                    <TableRow key={app.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium text-gray-900">
                            {app.userName || '-'}
                          </p>
                          <p className="text-xs text-gray-500">
                            {app.userEmail || '-'}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="text-gray-900">{app.pharmacyName}</p>
                          {app.businessNumber && (
                            <p className="text-xs text-gray-500">
                              {app.businessNumber}
                            </p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {app.serviceTypes.map((serviceType) => (
                            <Badge
                              key={serviceType}
                              variant="outline"
                              className="bg-blue-50 text-blue-700 border-blue-200"
                            >
                              {getServiceTypeLabel(serviceType)}
                            </Badge>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={`${statusColors.bg} ${statusColors.text}`}>
                          {APPLICATION_STATUS_LABELS[app.status]}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-gray-500">
                        {new Date(app.submittedAt).toLocaleDateString('ko-KR')}
                      </TableCell>
                      <TableCell className="text-right">
                        <Link
                          to={`/admin/service-applications/${validService}/${app.id}`}
                          className="text-blue-600 hover:text-blue-700 font-medium text-sm"
                        >
                          상세 &rarr;
                        </Link>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-6 pt-6 border-t">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
              >
                <ChevronLeft className="w-4 h-4" />
                이전
              </Button>
              <span className="text-sm text-gray-600 mx-4">
                {page} / {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
              >
                다음
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
