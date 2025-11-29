/**
 * Phase 9: Admin Authorization Console
 *
 * Platform admin UI for comprehensive authorization oversight
 *
 * Features:
 * - View all authorizations across all sellers/suppliers
 * - Advanced filtering (seller, supplier, product, status)
 * - Permanent revocation capability
 * - Audit log viewer
 * - Metrics dashboard
 */

import { useState, useEffect } from 'react';
import { CheckCircle, XCircle, Clock, Ban, AlertCircle, Shield, Activity } from 'lucide-react';
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@o4o/auth-context';
import { authClient } from '@o4o/auth-client';
import toast from 'react-hot-toast';

interface Authorization {
  id: string;
  productId: string;
  productName?: string;
  sellerId: string;
  sellerName?: string;
  supplierId: string;
  supplierName?: string;
  status: 'REQUESTED' | 'APPROVED' | 'REJECTED' | 'REVOKED' | 'CANCELLED';
  requestedAt: string;
  approvedAt?: string;
  rejectedAt?: string;
  revokedAt?: string;
  cooldownUntil?: string;
  rejectionReason?: string;
  revocationReason?: string;
}

interface AuditLog {
  id: string;
  authorizationId: string;
  action: string;
  actorId: string;
  actorType: 'seller' | 'supplier' | 'admin' | 'system';
  previousStatus?: string;
  newStatus?: string;
  reason?: string;
  metadata?: any;
  createdAt: string;
}

interface Filters {
  sellerId?: string;
  supplierId?: string;
  productId?: string;
  status?: string;
}

interface RevokeModalState {
  isOpen: boolean;
  authorization: Authorization | null;
  reason: string;
}

const AdminAuthorizationConsole = () => {
  const { user } = useAuth();
  const [authorizations, setAuthorizations] = useState<Authorization[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('authorizations');
  const [selectedAuthId, setSelectedAuthId] = useState<string | null>(null);

  const [filters, setFilters] = useState<Filters>({});
  const [revokeModal, setRevokeModal] = useState<RevokeModalState>({
    isOpen: false,
    authorization: null,
    reason: '',
  });

  useEffect(() => {
    if (activeTab === 'authorizations') {
      fetchAuthorizations();
    }
  }, [activeTab, filters]);

  useEffect(() => {
    if (activeTab === 'audit' && selectedAuthId) {
      fetchAuditLogs(selectedAuthId);
    }
  }, [activeTab, selectedAuthId]);

  const fetchAuthorizations = async () => {
    try {
      setLoading(true);
      const response = await authClient.api.get('/api/v1/ds/admin/authorizations', {
        params: filters,
      });

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

  const fetchAuditLogs = async (authorizationId: string) => {
    try {
      const response = await authClient.api.get(`/api/v1/ds/admin/authorizations/${authorizationId}/audit`);

      if (response.data?.success) {
        setAuditLogs(response.data.data.logs || []);
      }
    } catch (error) {
      console.error('Failed to fetch audit logs:', error);
      toast.error('감사 로그를 불러오는데 실패했습니다.');
    }
  };

  const openRevokeModal = (authorization: Authorization) => {
    setRevokeModal({
      isOpen: true,
      authorization,
      reason: '',
    });
  };

  const closeRevokeModal = () => {
    setRevokeModal({
      isOpen: false,
      authorization: null,
      reason: '',
    });
  };

  const handleRevoke = async () => {
    if (!revokeModal.authorization) return;

    if (revokeModal.reason.trim().length < 10) {
      toast.error('철회 사유는 최소 10자 이상 입력해야 합니다.');
      return;
    }

    try {
      await authClient.api.post(
        `/api/v1/ds/admin/authorizations/${revokeModal.authorization.id}/revoke`,
        {
          revokedBy: user?.id || 'admin',
          reason: revokeModal.reason,
        }
      );

      toast.success('승인이 영구 철회되었습니다.');
      closeRevokeModal();
      fetchAuthorizations();
    } catch (error: any) {
      toast.error(error.response?.data?.message || '철회 처리에 실패했습니다.');
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

  const getActorBadge = (actorType: AuditLog['actorType']) => {
    const colors = {
      seller: 'bg-blue-100 text-blue-800',
      supplier: 'bg-green-100 text-green-800',
      admin: 'bg-red-100 text-red-800',
      system: 'bg-gray-100 text-gray-800',
    };

    return (
      <span className={`px-2 py-1 rounded text-xs font-medium ${colors[actorType]}`}>
        {actorType.toUpperCase()}
      </span>
    );
  };

  const viewAuditLog = (authorizationId: string) => {
    setSelectedAuthId(authorizationId);
    setActiveTab('audit');
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">승인 관리 콘솔</h1>
          <p className="text-gray-600 mt-1">전체 승인 현황 및 감사 로그 관리</p>
        </div>
        <Badge variant="outline" className="flex items-center gap-2">
          <Shield className="h-4 w-4" />
          Admin Only
        </Badge>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="authorizations">승인 목록</TabsTrigger>
          <TabsTrigger value="audit">감사 로그</TabsTrigger>
          <TabsTrigger value="metrics">메트릭스</TabsTrigger>
        </TabsList>

        {/* Authorizations Tab */}
        <TabsContent value="authorizations" className="space-y-4">
          {/* Filters */}
          <Card>
            <CardHeader>
              <CardTitle>필터</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <Label htmlFor="seller-filter">판매자 ID</Label>
                  <Input
                    id="seller-filter"
                    placeholder="seller-123"
                    value={filters.sellerId || ''}
                    onChange={(e) => setFilters({ ...filters, sellerId: e.target.value || undefined })}
                  />
                </div>
                <div>
                  <Label htmlFor="supplier-filter">공급자 ID</Label>
                  <Input
                    id="supplier-filter"
                    placeholder="supplier-456"
                    value={filters.supplierId || ''}
                    onChange={(e) => setFilters({ ...filters, supplierId: e.target.value || undefined })}
                  />
                </div>
                <div>
                  <Label htmlFor="product-filter">상품 ID</Label>
                  <Input
                    id="product-filter"
                    placeholder="product-789"
                    value={filters.productId || ''}
                    onChange={(e) => setFilters({ ...filters, productId: e.target.value || undefined })}
                  />
                </div>
                <div>
                  <Label htmlFor="status-filter">상태</Label>
                  <Input
                    id="status-filter"
                    placeholder="APPROVED"
                    value={filters.status || ''}
                    onChange={(e) => setFilters({ ...filters, status: e.target.value || undefined })}
                  />
                </div>
              </div>
              <div className="mt-4 flex gap-2">
                <Button onClick={fetchAuthorizations}>필터 적용</Button>
                <Button variant="outline" onClick={() => setFilters({})}>
                  초기화
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Authorization Table */}
          <Card>
            <CardHeader>
              <CardTitle>전체 승인 목록</CardTitle>
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
                      <TableHead>판매자</TableHead>
                      <TableHead>공급자</TableHead>
                      <TableHead>상품</TableHead>
                      <TableHead>상태</TableHead>
                      <TableHead>요청일</TableHead>
                      <TableHead>사유</TableHead>
                      <TableHead>액션</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {authorizations.map((auth) => (
                      <TableRow key={auth.id}>
                        <TableCell className="font-medium">
                          {auth.sellerName || auth.sellerId}
                        </TableCell>
                        <TableCell>{auth.supplierName || auth.supplierId}</TableCell>
                        <TableCell>{auth.productName || auth.productId}</TableCell>
                        <TableCell>{getStatusBadge(auth.status)}</TableCell>
                        <TableCell>
                          {new Date(auth.requestedAt).toLocaleDateString('ko-KR')}
                        </TableCell>
                        <TableCell className="max-w-xs truncate">
                          {auth.revocationReason || auth.rejectionReason || '-'}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => viewAuditLog(auth.id)}
                            >
                              <Activity className="h-4 w-4 mr-1" />
                              로그
                            </Button>
                            {auth.status === 'APPROVED' && (
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => openRevokeModal(auth)}
                              >
                                <Ban className="h-4 w-4 mr-1" />
                                철회
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Audit Log Tab */}
        <TabsContent value="audit" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>감사 로그</CardTitle>
              {selectedAuthId && (
                <p className="text-sm text-gray-600">Authorization ID: {selectedAuthId}</p>
              )}
            </CardHeader>
            <CardContent>
              {!selectedAuthId ? (
                <div className="text-center py-8 text-gray-500">
                  승인 목록에서 "로그" 버튼을 클릭하여 감사 로그를 확인하세요.
                </div>
              ) : auditLogs.length === 0 ? (
                <div className="text-center py-8 text-gray-500">감사 로그가 없습니다.</div>
              ) : (
                <div className="space-y-4">
                  {auditLogs.map((log) => (
                    <div
                      key={log.id}
                      className="border rounded-lg p-4 hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-lg">{log.action}</span>
                          {getActorBadge(log.actorType)}
                        </div>
                        <span className="text-sm text-gray-500">
                          {new Date(log.createdAt).toLocaleString('ko-KR')}
                        </span>
                      </div>

                      {(log.previousStatus || log.newStatus) && (
                        <div className="flex items-center gap-2 mb-2">
                          {log.previousStatus && (
                            <Badge variant="outline">{log.previousStatus}</Badge>
                          )}
                          {log.previousStatus && log.newStatus && (
                            <span className="text-gray-400">→</span>
                          )}
                          {log.newStatus && <Badge>{log.newStatus}</Badge>}
                        </div>
                      )}

                      {log.reason && (
                        <p className="text-sm text-gray-700 mb-2">
                          <span className="font-medium">사유:</span> {log.reason}
                        </p>
                      )}

                      <p className="text-sm text-gray-600">
                        <span className="font-medium">Actor:</span> {log.actorId}
                      </p>

                      {log.metadata && Object.keys(log.metadata).length > 0 && (
                        <details className="mt-2">
                          <summary className="text-sm text-gray-500 cursor-pointer">
                            메타데이터 보기
                          </summary>
                          <pre className="mt-2 text-xs bg-gray-100 p-2 rounded overflow-x-auto">
                            {JSON.stringify(log.metadata, null, 2)}
                          </pre>
                        </details>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Metrics Tab */}
        <TabsContent value="metrics" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>메트릭스 대시보드</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-gray-500">
                <Activity className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                <p>Prometheus 메트릭스는 별도의 모니터링 시스템에서 확인할 수 있습니다.</p>
                <p className="text-sm mt-2">
                  Endpoint: <code className="bg-gray-100 px-2 py-1 rounded">/metrics</code>
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Revoke Modal */}
      <Dialog open={revokeModal.isOpen} onOpenChange={closeRevokeModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>영구 철회 확인</DialogTitle>
            <DialogDescription>
              이 승인을 영구적으로 철회합니다. 판매자는 이 상품에 대해 재요청할 수 없습니다.
            </DialogDescription>
          </DialogHeader>

          {revokeModal.authorization && (
            <div className="space-y-4">
              <div className="bg-red-50 p-4 rounded-lg space-y-2">
                <div className="flex justify-between">
                  <span className="font-medium">판매자:</span>
                  <span>
                    {revokeModal.authorization.sellerName || revokeModal.authorization.sellerId}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium">상품:</span>
                  <span>
                    {revokeModal.authorization.productName || revokeModal.authorization.productId}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium">현재 상태:</span>
                  {getStatusBadge(revokeModal.authorization.status)}
                </div>
              </div>

              <div>
                <Label htmlFor="revoke-reason">철회 사유 (필수, 최소 10자)</Label>
                <Textarea
                  id="revoke-reason"
                  placeholder="예: 약관 위반, 품질 문제 반복, 계약 위반 등"
                  value={revokeModal.reason}
                  onChange={(e) => setRevokeModal({ ...revokeModal, reason: e.target.value })}
                  rows={4}
                  className="mt-2"
                />
              </div>

              <div className="bg-yellow-50 p-3 rounded border border-yellow-200">
                <p className="text-sm text-yellow-800">
                  ⚠️ 경고: 철회 후에는 판매자가 이 상품에 대해 영구적으로 재요청할 수 없습니다.
                </p>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={closeRevokeModal}>
              취소
            </Button>
            <Button variant="destructive" onClick={handleRevoke}>
              영구 철회
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminAuthorizationConsole;
