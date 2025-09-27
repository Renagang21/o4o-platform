import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
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
import { Textarea } from '@/components/ui/textarea';
import {
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  FileText,
  TrendingUp,
  TrendingDown,
  DollarSign,
  User,
  Calendar,
  Eye,
  Shield,
  AlertCircle
} from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

interface ApprovalRequest {
  id: string;
  type: 'pricing' | 'commission' | 'msrp' | 'policy';
  entityType: 'supplier' | 'product';
  entityId: string;
  entityName: string;
  requesterId: string;
  requesterName: string;
  requesterRole: string;
  status: 'pending' | 'approved' | 'rejected' | 'cancelled';
  changes: Record<string, any>;
  currentValues: Record<string, any>;
  reason?: string;
  adminNotes?: string;
  createdAt: string;
  updatedAt: string;
  reviewedBy?: string;
  reviewedAt?: string;
  legalCompliance?: {
    msrpCompliant: boolean;
    fairTradeCompliant: boolean;
    notes?: string;
  };
}

interface ApprovalQueueProps {
  filter?: 'all' | 'pending' | 'processed';
  autoRefresh?: boolean;
  refreshInterval?: number;
}

const ApprovalQueue: React.FC<ApprovalQueueProps> = ({
  filter = 'pending',
  autoRefresh = true,
  refreshInterval = 30000 // 30 seconds
}) => {
  const { toast } = useToast();
  const [requests, setRequests] = useState<ApprovalRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState<ApprovalRequest | null>(null);
  const [showApprovalDialog, setShowApprovalDialog] = useState(false);
  const [showRejectionDialog, setShowRejectionDialog] = useState(false);
  const [adminNotes, setAdminNotes] = useState('');
  const [activeFilter, setActiveFilter] = useState(filter);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    fetchApprovalRequests();
    
    if (autoRefresh) {
      const interval = setInterval(fetchApprovalRequests, refreshInterval);
      return () => clearInterval(interval);
    }
  }, [activeFilter]);

  const fetchApprovalRequests = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/v1/approval/queue?status=${activeFilter}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setRequests(data.requests || []);
      } else {
        toast({
          title: 'Error',
          description: 'Failed to fetch approval requests',
          variant: 'destructive'
        });
      }
    } catch (error) {
      console.error('Fetch approval requests error:', error);
      toast({
        title: 'Error',
        description: 'Network error occurred',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (requestId: string) => {
    try {
      setProcessing(true);
      const response = await fetch(`/api/v1/approval/approve/${requestId}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ adminNotes })
      });

      if (response.ok) {
        toast({
          title: 'Success',
          description: '변경 요청이 승인되었습니다',
        });
        
        setShowApprovalDialog(false);
        setSelectedRequest(null);
        setAdminNotes('');
        await fetchApprovalRequests();
      } else {
        const error = await response.json();
        toast({
          title: 'Error',
          description: error.message || 'Failed to approve request',
          variant: 'destructive'
        });
      }
    } catch (error) {
      console.error('Approval error:', error);
      toast({
        title: 'Error',
        description: 'Failed to process approval',
        variant: 'destructive'
      });
    } finally {
      setProcessing(false);
    }
  };

  const handleReject = async (requestId: string) => {
    try {
      setProcessing(true);
      const response = await fetch(`/api/v1/approval/reject/${requestId}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ reason: adminNotes })
      });

      if (response.ok) {
        toast({
          title: 'Success',
          description: '변경 요청이 거절되었습니다',
        });
        
        setShowRejectionDialog(false);
        setSelectedRequest(null);
        setAdminNotes('');
        await fetchApprovalRequests();
      } else {
        const error = await response.json();
        toast({
          title: 'Error',
          description: error.message || 'Failed to reject request',
          variant: 'destructive'
        });
      }
    } catch (error) {
      console.error('Rejection error:', error);
      toast({
        title: 'Error',
        description: 'Failed to process rejection',
        variant: 'destructive'
      });
    } finally {
      setProcessing(false);
    }
  };

  const getChangeDescription = (key: string, currentValue: any, newValue: any) => {
    const formatValue = (val: any) => {
      if (typeof val === 'number') {
        return key.includes('price') || key.includes('cost') || key === 'msrp'
          ? `₩${val.toLocaleString()}`
          : key.includes('rate') || key.includes('commission')
          ? `${val}%`
          : val.toString();
      }
      return val?.toString() || 'N/A';
    };

    return {
      key: key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
      current: formatValue(currentValue),
      new: formatValue(newValue),
      change: typeof currentValue === 'number' && typeof newValue === 'number'
        ? ((newValue - currentValue) / currentValue * 100).toFixed(1) + '%'
        : null
    };
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      pending: { label: '대기중', variant: 'outline' as const, icon: Clock },
      approved: { label: '승인됨', variant: 'default' as const, icon: CheckCircle },
      rejected: { label: '거절됨', variant: 'destructive' as const, icon: XCircle },
      cancelled: { label: '취소됨', variant: 'secondary' as const, icon: XCircle }
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;
    const Icon = config.icon;

    return (
      <Badge variant={config.variant} className="flex items-center gap-1">
        <Icon className="h-3 w-3" />
        {config.label}
      </Badge>
    );
  };

  const getTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      pricing: '가격 변경',
      commission: '수수료 변경',
      msrp: 'MSRP 변경',
      policy: '정책 변경'
    };
    return labels[type] || type;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">승인 요청을 불러오는 중...</p>
        </div>
      </div>
    );
  }

  const pendingRequests = requests.filter(r => r.status === 'pending');
  const processedRequests = requests.filter(r => r.status !== 'pending');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">승인 관리</h1>
          <p className="text-gray-600 mt-1">공급자 정책 변경 요청을 검토하고 승인합니다</p>
        </div>
        <div className="flex items-center space-x-2">
          <Shield className="h-5 w-5 text-blue-600" />
          <span className="text-sm font-medium">공정거래법 준수 모니터링</span>
        </div>
      </div>

      {/* Legal Compliance Alert */}
      <Alert className="border-blue-200 bg-blue-50">
        <AlertCircle className="h-4 w-4 text-blue-600" />
        <AlertDescription className="text-blue-800">
          <strong>법률 준수 안내:</strong> 모든 가격 변경은 공정거래법을 준수해야 합니다. 
          MSRP는 권장 가격이며, 판매자의 자율적 가격 결정권을 보장해야 합니다.
        </AlertDescription>
      </Alert>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">대기중</p>
                <p className="text-2xl font-bold text-yellow-600">{pendingRequests.length}</p>
              </div>
              <Clock className="h-8 w-8 text-yellow-400" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">오늘 처리</p>
                <p className="text-2xl font-bold text-green-600">
                  {processedRequests.filter(r => 
                    new Date(r.reviewedAt || '').toDateString() === new Date().toDateString()
                  ).length}
                </p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-400" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">승인율</p>
                <p className="text-2xl font-bold text-blue-600">
                  {processedRequests.length > 0
                    ? Math.round(processedRequests.filter(r => r.status === 'approved').length / processedRequests.length * 100)
                    : 0}%
                </p>
              </div>
              <TrendingUp className="h-8 w-8 text-blue-400" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">긴급 검토</p>
                <p className="text-2xl font-bold text-red-600">
                  {pendingRequests.filter(r => 
                    new Date().getTime() - new Date(r.createdAt).getTime() > 48 * 60 * 60 * 1000
                  ).length}
                </p>
              </div>
              <AlertTriangle className="h-8 w-8 text-red-400" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs value={activeFilter} onValueChange={(v) => setActiveFilter(v as any)}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="pending">
            대기중 ({pendingRequests.length})
          </TabsTrigger>
          <TabsTrigger value="processed">
            처리됨 ({processedRequests.length})
          </TabsTrigger>
          <TabsTrigger value="all">
            전체 ({requests.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="space-y-4">
          {pendingRequests.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
                <p className="text-gray-600">대기 중인 승인 요청이 없습니다</p>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>승인 대기 요청</CardTitle>
                <CardDescription>검토가 필요한 변경 요청 목록</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>요청자</TableHead>
                      <TableHead>유형</TableHead>
                      <TableHead>대상</TableHead>
                      <TableHead>주요 변경사항</TableHead>
                      <TableHead>요청일시</TableHead>
                      <TableHead>상태</TableHead>
                      <TableHead className="text-right">작업</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pendingRequests.map((request) => (
                      <TableRow key={request.id}>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            <User className="h-4 w-4 text-gray-400" />
                            <div>
                              <p className="font-medium">{request.requesterName}</p>
                              <p className="text-xs text-gray-500">{request.requesterRole}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{getTypeLabel(request.type)}</Badge>
                        </TableCell>
                        <TableCell>
                          <p className="font-medium">{request.entityName}</p>
                          <p className="text-xs text-gray-500">{request.entityType}</p>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            {Object.entries(request.changes).slice(0, 2).map(([key, value]) => {
                              const change = getChangeDescription(key, request.currentValues[key], value);
                              return (
                                <div key={key} className="text-sm">
                                  <span className="text-gray-600">{change.key}:</span>
                                  <span className="ml-1 text-red-600 line-through">{change.current}</span>
                                  <span className="mx-1">→</span>
                                  <span className="text-green-600 font-medium">{change.new}</span>
                                  {change.change && (
                                    <span className="ml-1 text-xs text-gray-500">({change.change})</span>
                                  )}
                                </div>
                              );
                            })}
                            {Object.keys(request.changes).length > 2 && (
                              <p className="text-xs text-gray-500">
                                +{Object.keys(request.changes).length - 2} more changes
                              </p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-1 text-sm text-gray-600">
                            <Calendar className="h-3 w-3" />
                            <span>{new Date(request.createdAt).toLocaleDateString('ko-KR')}</span>
                          </div>
                        </TableCell>
                        <TableCell>{getStatusBadge(request.status)}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end space-x-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setSelectedRequest(request)}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="default"
                              size="sm"
                              onClick={() => {
                                setSelectedRequest(request);
                                setShowApprovalDialog(true);
                              }}
                            >
                              승인
                            </Button>
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => {
                                setSelectedRequest(request);
                                setShowRejectionDialog(true);
                              }}
                            >
                              거절
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="processed" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>처리 완료</CardTitle>
              <CardDescription>최근 처리된 승인 요청 이력</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>요청자</TableHead>
                    <TableHead>유형</TableHead>
                    <TableHead>대상</TableHead>
                    <TableHead>처리일시</TableHead>
                    <TableHead>처리자</TableHead>
                    <TableHead>상태</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {processedRequests.map((request) => (
                    <TableRow key={request.id}>
                      <TableCell>{request.requesterName}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{getTypeLabel(request.type)}</Badge>
                      </TableCell>
                      <TableCell>{request.entityName}</TableCell>
                      <TableCell>
                        {request.reviewedAt 
                          ? new Date(request.reviewedAt).toLocaleDateString('ko-KR')
                          : 'N/A'}
                      </TableCell>
                      <TableCell>{request.reviewedBy || 'System'}</TableCell>
                      <TableCell>{getStatusBadge(request.status)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="all" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>전체 요청</CardTitle>
              <CardDescription>모든 승인 요청 이력</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>요청자</TableHead>
                    <TableHead>유형</TableHead>
                    <TableHead>대상</TableHead>
                    <TableHead>요청일시</TableHead>
                    <TableHead>상태</TableHead>
                    <TableHead className="text-right">작업</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {requests.map((request) => (
                    <TableRow key={request.id}>
                      <TableCell>{request.requesterName}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{getTypeLabel(request.type)}</Badge>
                      </TableCell>
                      <TableCell>{request.entityName}</TableCell>
                      <TableCell>
                        {new Date(request.createdAt).toLocaleDateString('ko-KR')}
                      </TableCell>
                      <TableCell>{getStatusBadge(request.status)}</TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedRequest(request)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Approval Dialog */}
      <Dialog open={showApprovalDialog} onOpenChange={setShowApprovalDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>변경 요청 승인</DialogTitle>
            <DialogDescription>
              이 변경 요청을 승인하시겠습니까? 승인 후에는 즉시 적용됩니다.
            </DialogDescription>
          </DialogHeader>

          {selectedRequest && (
            <div className="space-y-4">
              <div className="p-4 bg-gray-50 rounded-lg">
                <h4 className="font-medium mb-2">변경 내용 요약</h4>
                {Object.entries(selectedRequest.changes).map(([key, value]) => {
                  const change = getChangeDescription(key, selectedRequest.currentValues[key], value);
                  return (
                    <div key={key} className="flex justify-between py-1">
                      <span className="text-sm text-gray-600">{change.key}:</span>
                      <span className="text-sm">
                        <span className="text-red-600 line-through">{change.current}</span>
                        <span className="mx-2">→</span>
                        <span className="text-green-600 font-medium">{change.new}</span>
                      </span>
                    </div>
                  );
                })}
              </div>

              {selectedRequest.legalCompliance && (
                <Alert className={selectedRequest.legalCompliance.fairTradeCompliant ? 'border-green-200' : 'border-red-200'}>
                  <Shield className="h-4 w-4" />
                  <AlertDescription>
                    <strong>법률 준수 검토:</strong> {
                      selectedRequest.legalCompliance.fairTradeCompliant
                        ? '공정거래법 준수 확인'
                        : '공정거래법 위반 가능성 검토 필요'
                    }
                  </AlertDescription>
                </Alert>
              )}

              <div>
                <label className="block text-sm font-medium mb-2">관리자 메모 (선택사항)</label>
                <Textarea
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  placeholder="승인 사유나 추가 지시사항을 입력하세요"
                  rows={3}
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowApprovalDialog(false)}>
              취소
            </Button>
            <Button 
              onClick={() => selectedRequest && handleApprove(selectedRequest.id)}
              disabled={processing}
            >
              {processing ? '처리중...' : '승인'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Rejection Dialog */}
      <Dialog open={showRejectionDialog} onOpenChange={setShowRejectionDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>변경 요청 거절</DialogTitle>
            <DialogDescription>
              거절 사유를 입력해주세요. 요청자에게 전달됩니다.
            </DialogDescription>
          </DialogHeader>

          {selectedRequest && (
            <div className="space-y-4">
              <div className="p-4 bg-gray-50 rounded-lg">
                <h4 className="font-medium mb-2">요청 정보</h4>
                <p className="text-sm text-gray-600">요청자: {selectedRequest.requesterName}</p>
                <p className="text-sm text-gray-600">대상: {selectedRequest.entityName}</p>
                <p className="text-sm text-gray-600">유형: {getTypeLabel(selectedRequest.type)}</p>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">거절 사유 <span className="text-red-500">*</span></label>
                <Textarea
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  placeholder="거절 사유를 상세히 입력해주세요"
                  rows={4}
                  required
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRejectionDialog(false)}>
              취소
            </Button>
            <Button 
              variant="destructive"
              onClick={() => selectedRequest && handleReject(selectedRequest.id)}
              disabled={processing || !adminNotes.trim()}
            >
              {processing ? '처리중...' : '거절'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Detail View Dialog */}
      {selectedRequest && !showApprovalDialog && !showRejectionDialog && (
        <Dialog open={!!selectedRequest} onOpenChange={() => setSelectedRequest(null)}>
          <DialogContent className="max-w-3xl">
            <DialogHeader>
              <DialogTitle>승인 요청 상세 정보</DialogTitle>
            </DialogHeader>

            <div className="space-y-6">
              {/* Request Info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="font-medium text-sm text-gray-600 mb-1">요청자</h4>
                  <p className="font-medium">{selectedRequest.requesterName}</p>
                  <p className="text-sm text-gray-500">{selectedRequest.requesterRole}</p>
                </div>
                <div>
                  <h4 className="font-medium text-sm text-gray-600 mb-1">요청 일시</h4>
                  <p>{new Date(selectedRequest.createdAt).toLocaleString('ko-KR')}</p>
                </div>
                <div>
                  <h4 className="font-medium text-sm text-gray-600 mb-1">대상</h4>
                  <p className="font-medium">{selectedRequest.entityName}</p>
                  <p className="text-sm text-gray-500">{selectedRequest.entityType}</p>
                </div>
                <div>
                  <h4 className="font-medium text-sm text-gray-600 mb-1">상태</h4>
                  {getStatusBadge(selectedRequest.status)}
                </div>
              </div>

              {/* Changes Detail */}
              <div>
                <h4 className="font-medium mb-3">변경 사항 상세</h4>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>항목</TableHead>
                      <TableHead>현재 값</TableHead>
                      <TableHead>변경 요청 값</TableHead>
                      <TableHead>변화율</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {Object.entries(selectedRequest.changes).map(([key, value]) => {
                      const change = getChangeDescription(key, selectedRequest.currentValues[key], value);
                      return (
                        <TableRow key={key}>
                          <TableCell className="font-medium">{change.key}</TableCell>
                          <TableCell>{change.current}</TableCell>
                          <TableCell className="text-green-600">{change.new}</TableCell>
                          <TableCell>
                            {change.change && (
                              <Badge variant={change.change.startsWith('+') ? 'default' : 'destructive'}>
                                {change.change}
                              </Badge>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>

              {/* Legal Compliance */}
              {selectedRequest.legalCompliance && (
                <Alert className={selectedRequest.legalCompliance.fairTradeCompliant ? 'border-green-200' : 'border-yellow-200'}>
                  <Shield className="h-4 w-4" />
                  <AlertDescription>
                    <strong>법률 준수 검토 결과</strong>
                    <ul className="mt-2 space-y-1">
                      <li className="flex items-center space-x-2">
                        {selectedRequest.legalCompliance.msrpCompliant ? (
                          <CheckCircle className="h-4 w-4 text-green-600" />
                        ) : (
                          <XCircle className="h-4 w-4 text-red-600" />
                        )}
                        <span>MSRP 가이드라인 {selectedRequest.legalCompliance.msrpCompliant ? '준수' : '위반'}</span>
                      </li>
                      <li className="flex items-center space-x-2">
                        {selectedRequest.legalCompliance.fairTradeCompliant ? (
                          <CheckCircle className="h-4 w-4 text-green-600" />
                        ) : (
                          <XCircle className="h-4 w-4 text-red-600" />
                        )}
                        <span>공정거래법 {selectedRequest.legalCompliance.fairTradeCompliant ? '준수' : '검토 필요'}</span>
                      </li>
                    </ul>
                    {selectedRequest.legalCompliance.notes && (
                      <p className="mt-2 text-sm">{selectedRequest.legalCompliance.notes}</p>
                    )}
                  </AlertDescription>
                </Alert>
              )}

              {/* Admin Notes */}
              {selectedRequest.adminNotes && (
                <div>
                  <h4 className="font-medium mb-2">관리자 메모</h4>
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <p className="text-sm">{selectedRequest.adminNotes}</p>
                  </div>
                </div>
              )}

              {/* Processing Info */}
              {selectedRequest.status !== 'pending' && (
                <div className="border-t pt-4">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-600">처리자:</span>
                      <span className="ml-2 font-medium">{selectedRequest.reviewedBy || 'System'}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">처리일시:</span>
                      <span className="ml-2 font-medium">
                        {selectedRequest.reviewedAt 
                          ? new Date(selectedRequest.reviewedAt).toLocaleString('ko-KR')
                          : 'N/A'}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setSelectedRequest(null)}>
                닫기
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};

export default ApprovalQueue;