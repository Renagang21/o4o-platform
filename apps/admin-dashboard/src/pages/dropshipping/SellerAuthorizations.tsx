/**
 * Phase 9: Seller Authorizations Dashboard
 *
 * Seller Self-Service UI for managing product authorization requests
 *
 * Features:
 * - View authorization status for all products
 * - Request new product authorizations
 * - Cancel pending requests
 * - Check gate status for products
 * - View authorization limits and cooldowns
 */

import { useState, useEffect } from 'react';
import { CheckCircle, XCircle, Clock, Ban, AlertCircle, Plus, Trash2, RefreshCw, Settings } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useAuth } from '@o4o/auth-context';
import { authClient } from '@o4o/auth-client';
import toast from 'react-hot-toast';
import PageHeader from '../../components/common/PageHeader';

interface Authorization {
  id: string;
  productId: string;
  productName?: string;
  supplierId: string;
  supplierName?: string;
  status: 'REQUESTED' | 'APPROVED' | 'REJECTED' | 'REVOKED' | 'CANCELLED';
  requestedAt: string;
  approvedAt?: string;
  rejectedAt?: string;
  cooldownUntil?: string;
  rejectionReason?: string;
  revocationReason?: string;
}

interface AuthorizationLimits {
  currentCount: number;
  maxLimit: number;
  remainingSlots: number;
  cooldowns: Array<{
    productId: string;
    productName?: string;
    cooldownUntil: string;
    daysRemaining: number;
  }>;
}

const SellerAuthorizations = () => {
  const { user } = useAuth();
  const [authorizations, setAuthorizations] = useState<Authorization[]>([]);
  const [limits, setLimits] = useState<AuthorizationLimits | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedStatus, setSelectedStatus] = useState<string>('all');

  useEffect(() => {
    fetchAuthorizations();
    fetchLimits();
  }, [selectedStatus]);

  const fetchAuthorizations = async () => {
    try {
      setLoading(true);
      const params = selectedStatus !== 'all' ? { status: selectedStatus } : {};
      const response = await authClient.api.get('/api/v1/ds/seller/authorizations', { params });

      if (response.data?.success) {
        setAuthorizations(response.data.data.authorizations || []);
      }
    } catch (error: any) {
      if (error.response?.status === 501) {
        toast.error('Seller Authorization 기능이 아직 활성화되지 않았습니다.');
      } else {
        toast.error('승인 목록을 불러오는데 실패했습니다.');
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchLimits = async () => {
    try {
      const response = await authClient.api.get('/api/v1/ds/seller/limits');

      if (response.data?.success) {
        setLimits(response.data.data);
      }
    } catch (error: any) {
      // Silently fail for limits - not critical
      console.error('Failed to fetch limits:', error);
    }
  };

  const handleCancelRequest = async (authorizationId: string) => {
    if (!confirm('이 승인 요청을 취소하시겠습니까?')) return;

    try {
      await authClient.api.delete(`/api/v1/ds/seller/authorizations/${authorizationId}`);
      toast.success('승인 요청이 취소되었습니다.');
      fetchAuthorizations();
      fetchLimits();
    } catch (error: any) {
      toast.error(error.response?.data?.message || '취소에 실패했습니다.');
    }
  };

  const getStatusBadge = (status: Authorization['status']) => {
    const variants = {
      APPROVED: { variant: 'default' as const, icon: CheckCircle, label: '승인됨', color: 'text-green-600' },
      REQUESTED: { variant: 'secondary' as const, icon: Clock, label: '대기중', color: 'text-yellow-600' },
      REJECTED: { variant: 'destructive' as const, icon: XCircle, label: '거절됨', color: 'text-red-600' },
      REVOKED: { variant: 'destructive' as const, icon: Ban, label: '철회됨', color: 'text-red-800' },
      CANCELLED: { variant: 'outline' as const, icon: AlertCircle, label: '취소됨', color: 'text-gray-600' },
    };

    const config = variants[status];
    const Icon = config.icon;

    return (
      <Badge variant={config.variant} className="flex items-center gap-1">
        <Icon className={`h-3 w-3 ${config.color}`} />
        {config.label}
      </Badge>
    );
  };

  const getCooldownInfo = (cooldownUntil?: string) => {
    if (!cooldownUntil) return null;
    const days = Math.ceil((new Date(cooldownUntil).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    if (days <= 0) return null;
    return `${days}일 남음`;
  };

  const headerActions = [
    { id: 'screen-options', label: 'Screen Options', icon: <Settings className="w-4 h-4" />, onClick: () => {}, variant: 'secondary' as const },
    { id: 'refresh', label: '새로고침', icon: <RefreshCw className="w-4 h-4" />, onClick: () => { fetchAuthorizations(); fetchLimits(); }, variant: 'secondary' as const },
    { id: 'request', label: '승인 요청', icon: <Plus className="w-4 h-4" />, onClick: () => {}, variant: 'primary' as const },
  ];

  return (
    <div className="container mx-auto py-6 space-y-6">
      <PageHeader
        title="판매 승인 관리"
        subtitle="공급자 상품 판매 승인 현황을 확인하고 관리하세요"
        actions={headerActions}
      />

      {/* Limits Card */}
      {limits && (
        <Card>
          <CardHeader>
            <CardTitle>승인 한도</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <div className="text-3xl font-bold text-blue-600">{limits.currentCount}/{limits.maxLimit}</div>
                <div className="text-sm text-gray-600 mt-1">승인된 상품</div>
              </div>
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <div className="text-3xl font-bold text-green-600">{limits.remainingSlots}</div>
                <div className="text-sm text-gray-600 mt-1">남은 슬롯</div>
              </div>
              <div className="text-center p-4 bg-red-50 rounded-lg">
                <div className="text-3xl font-bold text-red-600">{limits.cooldowns.length}</div>
                <div className="text-sm text-gray-600 mt-1">쿨다운 중인 상품</div>
              </div>
            </div>

            {limits.cooldowns.length > 0 && (
              <div className="mt-4 p-4 bg-yellow-50 rounded-lg">
                <h3 className="font-semibold mb-2">쿨다운 상품</h3>
                <div className="space-y-2">
                  {limits.cooldowns.map((cooldown) => (
                    <div key={cooldown.productId} className="flex justify-between items-center text-sm">
                      <span>{cooldown.productName || cooldown.productId}</span>
                      <Badge variant="secondary">{cooldown.daysRemaining}일 남음</Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Authorizations Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>승인 목록</CardTitle>
            <Tabs value={selectedStatus} onValueChange={setSelectedStatus}>
              <TabsList>
                <TabsTrigger value="all">전체</TabsTrigger>
                <TabsTrigger value="REQUESTED">대기중</TabsTrigger>
                <TabsTrigger value="APPROVED">승인됨</TabsTrigger>
                <TabsTrigger value="REJECTED">거절됨</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-gray-500">로딩 중...</div>
          ) : authorizations.length === 0 ? (
            <div className="text-center py-8 text-gray-500">승인 내역이 없습니다.</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>상품명</TableHead>
                  <TableHead>공급자</TableHead>
                  <TableHead>상태</TableHead>
                  <TableHead>요청일</TableHead>
                  <TableHead>쿨다운</TableHead>
                  <TableHead>액션</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {authorizations.map((auth) => (
                  <TableRow key={auth.id}>
                    <TableCell className="font-medium">{auth.productName || auth.productId}</TableCell>
                    <TableCell>{auth.supplierName || auth.supplierId}</TableCell>
                    <TableCell>{getStatusBadge(auth.status)}</TableCell>
                    <TableCell>{new Date(auth.requestedAt).toLocaleDateString('ko-KR')}</TableCell>
                    <TableCell>
                      {auth.cooldownUntil && getCooldownInfo(auth.cooldownUntil) && (
                        <Badge variant="secondary">{getCooldownInfo(auth.cooldownUntil)}</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {auth.status === 'REQUESTED' && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleCancelRequest(auth.id)}
                        >
                          <Trash2 className="h-4 w-4 mr-1" />
                          취소
                        </Button>
                      )}
                      {auth.status === 'REJECTED' && auth.rejectionReason && (
                        <Button variant="ghost" size="sm" title={auth.rejectionReason}>
                          사유 보기
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default SellerAuthorizations;
