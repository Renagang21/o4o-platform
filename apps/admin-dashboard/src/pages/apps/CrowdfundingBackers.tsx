import { FC, useState } from 'react';
import { 
  Users, 
  Search, 
  Filter, 
  Download, 
  Mail, 
  Phone,
  Calendar,
  DollarSign,
  MapPin,
  Package,
  CheckCircle,
  XCircle,
  Clock,
  Send,
  FileText
} from 'lucide-react';
import { useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { authClient } from '@o4o/auth-client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import toast from 'react-hot-toast';

interface Backer {
  id: string;
  projectId: string;
  userId: string;
  userName: string;
  userEmail: string;
  userPhone?: string;
  amount: number;
  rewardId?: string;
  rewardTitle?: string;
  paymentStatus: 'pending' | 'paid' | 'failed' | 'refunded';
  paymentMethod?: string;
  paymentDate?: string;
  shippingAddress?: {
    name: string;
    phone: string;
    address: string;
    postalCode: string;
  };
  deliveryStatus?: 'pending' | 'preparing' | 'shipped' | 'delivered';
  trackingNumber?: string;
  message?: string;
  isAnonymous: boolean;
  createdAt: string;
  updatedAt: string;
}

interface BackerStats {
  totalBackers: number;
  totalAmount: number;
  averageAmount: number;
  completedPayments: number;
  pendingPayments: number;
  refundedPayments: number;
}

const CrowdfundingBackers: FC = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedBacker, setSelectedBacker] = useState<Backer | null>(null);
  const [isMessageDialogOpen, setIsMessageDialogOpen] = useState(false);
  const [isRefundDialogOpen, setIsRefundDialogOpen] = useState(false);
  const [messageContent, setMessageContent] = useState('');
  const [refundReason, setRefundReason] = useState('');

  // Fetch backers
  const { data: backersData, isLoading } = useQuery({
    queryKey: ['crowdfunding-backers', projectId, searchTerm, statusFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (searchTerm) params.append('search', searchTerm);
      if (statusFilter !== 'all') params.append('status', statusFilter);
      
      const response = await authClient.api.get(
        `/crowdfunding/projects/${projectId}/backers?${params.toString()}`
      );
      return response.data;
    },
    enabled: !!projectId
  });
  const backers = backersData?.data || [];
  const stats: BackerStats = backersData?.stats || {
    totalBackers: 0,
    totalAmount: 0,
    averageAmount: 0,
    completedPayments: 0,
    pendingPayments: 0,
    refundedPayments: 0
  };

  // Fetch project details
  const { data: projectData } = useQuery({
    queryKey: ['crowdfunding-project', projectId],
    queryFn: async () => {
      const response = await authClient.api.get(`/crowdfunding-simple/projects/${projectId}`);
      return response.data;
    },
    enabled: !!projectId
  });
  const project = projectData?.data;

  // Send message to backer
  const sendMessage = useMutation({
    mutationFn: async ({ backerId, message }: { backerId: string; message: string }) => {
      const response = await authClient.api.post(`/crowdfunding/backers/${backerId}/message`, {
        message
      });
      return response.data;
    },
    onSuccess: () => {
      toast.success('메시지가 전송되었습니다');
      setIsMessageDialogOpen(false);
      setMessageContent('');
      setSelectedBacker(null);
    },
    onError: () => {
      toast.error('메시지 전송 실패');
    }
  });

  // Process refund
  const processRefund = useMutation({
    mutationFn: async ({ backerId, reason }: { backerId: string; reason: string }) => {
      const response = await authClient.api.post(`/crowdfunding/backers/${backerId}/refund`, {
        reason
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crowdfunding-backers', projectId] });
      toast.success('환불이 처리되었습니다');
      setIsRefundDialogOpen(false);
      setRefundReason('');
      setSelectedBacker(null);
    },
    onError: () => {
      toast.error('환불 처리 실패');
    }
  });

  // Update delivery status
  const updateDeliveryStatus = useMutation({
    mutationFn: async ({ backerId, status, trackingNumber }: { 
      backerId: string; 
      status: string;
      trackingNumber?: string;
    }) => {
      const response = await authClient.api.patch(`/crowdfunding/backers/${backerId}/delivery`, {
        status,
        trackingNumber
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crowdfunding-backers', projectId] });
      toast.success('배송 상태가 업데이트되었습니다');
    },
    onError: () => {
      toast.error('배송 상태 업데이트 실패');
    }
  });

  // Export backers list
  const exportBackers = async () => {
    try {
      const response = await authClient.api.get(
        `/crowdfunding/projects/${projectId}/backers/export`,
        { responseType: 'blob' }
      );
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `backers-${projectId}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      
      toast.success('참여자 목록을 다운로드했습니다');
    } catch (error) {
      toast.error('다운로드 실패');
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ko-KR', {
      style: 'currency',
      currency: 'KRW'
    }).format(amount);
  };

  const getPaymentStatusBadge = (status: string) => {
    switch (status) {
      case 'paid':
        return <Badge className="bg-green-100 text-green-800">결제완료</Badge>;
      case 'pending':
        return <Badge className="bg-yellow-100 text-yellow-800">대기중</Badge>;
      case 'failed':
        return <Badge className="bg-red-100 text-red-800">실패</Badge>;
      case 'refunded':
        return <Badge className="bg-gray-100 text-gray-800">환불</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  const getDeliveryStatusBadge = (status?: string) => {
    if (!status) return null;
    
    switch (status) {
      case 'delivered':
        return <Badge className="bg-green-100 text-green-800">배송완료</Badge>;
      case 'shipped':
        return <Badge className="bg-blue-100 text-blue-800">배송중</Badge>;
      case 'preparing':
        return <Badge className="bg-yellow-100 text-yellow-800">준비중</Badge>;
      case 'pending':
        return <Badge className="bg-gray-100 text-gray-800">대기</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  if (isLoading) {
    return <div className="flex items-center justify-center h-64">로딩중...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Users className="h-8 w-8" />
            참여자 관리
          </h1>
          {project && (
            <p className="text-muted-foreground mt-1">
              {project.title} - {stats.totalBackers}명 참여
            </p>
          )}
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={exportBackers}>
            <Download className="h-4 w-4 mr-2" />
            내보내기
          </Button>
          <Button 
            onClick={() => {
              // Send bulk message
              toast('일괄 메시지 기능 준비중');
            }}
          >
            <Send className="h-4 w-4 mr-2" />
            일괄 메시지
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">총 참여자</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalBackers}명</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">총 펀딩액</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(stats.totalAmount)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">평균 펀딩액</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(stats.averageAmount)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">결제 완료</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.completedPayments}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">결제 대기</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{stats.pendingPayments}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">환불</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-600">{stats.refundedPayments}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="이름, 이메일, 전화번호로 검색..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="상태 필터" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">전체</SelectItem>
                <SelectItem value="paid">결제완료</SelectItem>
                <SelectItem value="pending">대기중</SelectItem>
                <SelectItem value="failed">실패</SelectItem>
                <SelectItem value="refunded">환불</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Backers Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>참여자</TableHead>
                <TableHead>리워드</TableHead>
                <TableHead>펀딩액</TableHead>
                <TableHead>결제상태</TableHead>
                <TableHead>배송상태</TableHead>
                <TableHead>참여일</TableHead>
                <TableHead>작업</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {backers.map((backer: Backer) => (
                <TableRow key={backer.id}>
                  <TableCell>
                    <div>
                      <p className="font-medium">
                        {backer.isAnonymous ? '익명 참여자' : backer.userName}
                      </p>
                      {!backer.isAnonymous && (
                        <>
                          <p className="text-sm text-muted-foreground">{backer.userEmail}</p>
                          {backer.userPhone && (
                            <p className="text-sm text-muted-foreground">{backer.userPhone}</p>
                          )}
                        </>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    {backer.rewardTitle || '리워드 없음'}
                  </TableCell>
                  <TableCell className="font-medium">
                    {formatCurrency(backer.amount)}
                  </TableCell>
                  <TableCell>
                    {getPaymentStatusBadge(backer.paymentStatus)}
                  </TableCell>
                  <TableCell>
                    {backer.rewardId ? (
                      <div className="space-y-1">
                        {getDeliveryStatusBadge(backer.deliveryStatus)}
                        {backer.trackingNumber && (
                          <p className="text-xs text-muted-foreground">
                            {backer.trackingNumber}
                          </p>
                        )}
                      </div>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {new Date(backer.createdAt).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setSelectedBacker(backer);
                          setIsMessageDialogOpen(true);
                        }}
                      >
                        <Mail className="h-4 w-4" />
                      </Button>
                      {backer.paymentStatus === 'paid' && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            setSelectedBacker(backer);
                            setIsRefundDialogOpen(true);
                          }}
                        >
                          <XCircle className="h-4 w-4" />
                        </Button>
                      )}
                      {backer.rewardId && backer.deliveryStatus === 'preparing' && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            const trackingNumber = prompt('운송장 번호를 입력하세요:');
                            if (trackingNumber) {
                              updateDeliveryStatus.mutate({
                                backerId: backer.id,
                                status: 'shipped',
                                trackingNumber
                              });
                            }
                          }}
                        >
                          <Package className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Message Dialog */}
      <Dialog open={isMessageDialogOpen} onOpenChange={setIsMessageDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>참여자에게 메시지 보내기</DialogTitle>
            <DialogDescription>
              {selectedBacker?.userName}님에게 메시지를 보냅니다
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>메시지 내용</Label>
              <Textarea
                value={messageContent}
                onChange={(e) => setMessageContent(e.target.value)}
                placeholder="메시지를 입력하세요..."
                rows={5}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setIsMessageDialogOpen(false);
              setMessageContent('');
              setSelectedBacker(null);
            }}>
              취소
            </Button>
            <Button onClick={() => {
              if (selectedBacker && messageContent) {
                sendMessage.mutate({
                  backerId: selectedBacker.id,
                  message: messageContent
                });
              }
            }}>
              전송
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Refund Dialog */}
      <Dialog open={isRefundDialogOpen} onOpenChange={setIsRefundDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>환불 처리</DialogTitle>
            <DialogDescription>
              {selectedBacker?.userName}님의 펀딩을 환불 처리합니다
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="bg-yellow-50 p-4 rounded-lg">
              <p className="text-sm">
                <strong>펀딩액:</strong> {selectedBacker && formatCurrency(selectedBacker.amount)}
              </p>
              <p className="text-sm mt-1">
                <strong>리워드:</strong> {selectedBacker?.rewardTitle || '없음'}
              </p>
            </div>
            <div className="space-y-2">
              <Label>환불 사유</Label>
              <Textarea
                value={refundReason}
                onChange={(e) => setRefundReason(e.target.value)}
                placeholder="환불 사유를 입력하세요..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setIsRefundDialogOpen(false);
              setRefundReason('');
              setSelectedBacker(null);
            }}>
              취소
            </Button>
            <Button 
              variant="destructive"
              onClick={() => {
                if (selectedBacker && refundReason) {
                  processRefund.mutate({
                    backerId: selectedBacker.id,
                    reason: refundReason
                  });
                }
              }}
            >
              환불 처리
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CrowdfundingBackers;
