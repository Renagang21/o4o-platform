import { FC, useState } from 'react';
import { 
  Gift, 
  Plus, 
  Edit2, 
  Trash2, 
  Users, 
  Package,
  Calendar,
  DollarSign,
  Copy,
  MoreVertical
} from 'lucide-react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { authClient } from '@o4o/auth-client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import toast from 'react-hot-toast';

interface CrowdfundingReward {
  id: string;
  projectId: string;
  title: string;
  description: string;
  minAmount: number;
  quantity?: number;
  quantityClaimed: number;
  deliveryDate?: string;
  shippingRequired: boolean;
  items: string[];
  imageUrl?: string;
  status: 'active' | 'sold_out' | 'hidden';
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

interface RewardFormData {
  title: string;
  description: string;
  minAmount: number;
  quantity?: number;
  deliveryDate?: string;
  shippingRequired: boolean;
  items: string[];
  imageUrl?: string;
}

const CrowdfundingRewards: FC = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [selectedReward, setSelectedReward] = useState<CrowdfundingReward | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [formData, setFormData] = useState<RewardFormData>({
    title: '',
    description: '',
    minAmount: 0,
    quantity: undefined,
    deliveryDate: undefined,
    shippingRequired: false,
    items: [],
    imageUrl: ''
  });

  // Fetch rewards
  const { data: rewardsData, isLoading } = useQuery({
    queryKey: ['crowdfunding-rewards', projectId],
    queryFn: async () => {
      const response = await authClient.api.get(`/crowdfunding/projects/${projectId}/rewards`);
      return response.data;
    },
    enabled: !!projectId
  });
  const rewards = rewardsData?.data || [];

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

  // Create reward
  const createReward = useMutation({
    mutationFn: async (data: RewardFormData) => {
      const response = await authClient.api.post(`/crowdfunding/projects/${projectId}/rewards`, data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crowdfunding-rewards', projectId] });
      toast.success('리워드가 생성되었습니다');
      setIsCreateDialogOpen(false);
      resetForm();
    },
    onError: () => {
      toast.error('리워드 생성 실패');
    }
  });

  // Update reward
  const updateReward = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: RewardFormData }) => {
      const response = await authClient.api.put(`/crowdfunding/rewards/${id}`, data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crowdfunding-rewards', projectId] });
      toast.success('리워드가 수정되었습니다');
      setIsEditDialogOpen(false);
      setSelectedReward(null);
      resetForm();
    },
    onError: () => {
      toast.error('리워드 수정 실패');
    }
  });

  // Delete reward
  const deleteReward = useMutation({
    mutationFn: async (id: string) => {
      const response = await authClient.api.delete(`/crowdfunding/rewards/${id}`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crowdfunding-rewards', projectId] });
      toast.success('리워드가 삭제되었습니다');
    },
    onError: () => {
      toast.error('리워드 삭제 실패');
    }
  });

  // Update reward status
  const updateRewardStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const response = await authClient.api.patch(`/crowdfunding/rewards/${id}/status`, { status });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crowdfunding-rewards', projectId] });
      toast.success('리워드 상태가 변경되었습니다');
    },
    onError: () => {
      toast.error('상태 변경 실패');
    }
  });

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      minAmount: 0,
      quantity: undefined,
      deliveryDate: undefined,
      shippingRequired: false,
      items: [],
      imageUrl: ''
    });
  };

  const handleEdit = (reward: CrowdfundingReward) => {
    setSelectedReward(reward);
    setFormData({
      title: reward.title,
      description: reward.description,
      minAmount: reward.minAmount,
      quantity: reward.quantity,
      deliveryDate: reward.deliveryDate,
      shippingRequired: reward.shippingRequired,
      items: reward.items,
      imageUrl: reward.imageUrl
    });
    setIsEditDialogOpen(true);
  };

  const handleDelete = (id: string) => {
    if (confirm('정말 이 리워드를 삭제하시겠습니까?')) {
      deleteReward.mutate(id);
    }
  };

  const handleDuplicate = (reward: CrowdfundingReward) => {
    setFormData({
      title: `${reward.title} (복사본)`,
      description: reward.description,
      minAmount: reward.minAmount,
      quantity: reward.quantity,
      deliveryDate: reward.deliveryDate,
      shippingRequired: reward.shippingRequired,
      items: [...reward.items],
      imageUrl: reward.imageUrl
    });
    setIsCreateDialogOpen(true);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-green-100 text-green-800">활성</Badge>;
      case 'sold_out':
        return <Badge className="bg-red-100 text-red-800">품절</Badge>;
      case 'hidden':
        return <Badge className="bg-gray-100 text-gray-800">숨김</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ko-KR', {
      style: 'currency',
      currency: 'KRW'
    }).format(amount);
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
            <Gift className="h-8 w-8" />
            리워드 관리
          </h1>
          {project && (
            <p className="text-muted-foreground mt-1">
              {project.title} - {rewards.length}개 리워드
            </p>
          )}
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => navigate(`/apps/crowdfunding/projects/${projectId}`)}
          >
            프로젝트로 돌아가기
          </Button>
          <Button onClick={() => setIsCreateDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            리워드 추가
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">총 리워드</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{rewards.length}개</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">활성 리워드</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {rewards.filter((r: CrowdfundingReward) => r.status === 'active').length}개
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">총 선택</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {rewards.reduce((sum: number, r: CrowdfundingReward) => sum + r.quantityClaimed, 0)}건
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">평균 펀딩액</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(
                rewards.length > 0 
                  ? rewards.reduce((sum: number, r: CrowdfundingReward) => sum + r.minAmount, 0) / rewards.length
                  : 0
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Rewards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {rewards.map((reward: CrowdfundingReward) => (
          <Card key={reward.id} className="relative">
            <CardHeader>
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <CardTitle className="text-lg">{reward.title}</CardTitle>
                  <CardDescription className="mt-1">
                    {formatCurrency(reward.minAmount)} 이상 펀딩
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  {getStatusBadge(reward.status)}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => handleEdit(reward)}>
                        <Edit2 className="h-4 w-4 mr-2" />
                        수정
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleDuplicate(reward)}>
                        <Copy className="h-4 w-4 mr-2" />
                        복제
                      </DropdownMenuItem>
                      {reward.status === 'active' ? (
                        <DropdownMenuItem 
                          onClick={() => updateRewardStatus.mutate({ id: reward.id, status: 'hidden' })}
                        >
                          숨기기
                        </DropdownMenuItem>
                      ) : (
                        <DropdownMenuItem 
                          onClick={() => updateRewardStatus.mutate({ id: reward.id, status: 'active' })}
                        >
                          활성화
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuItem 
                        onClick={() => handleDelete(reward.id)}
                        className="text-red-600"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        삭제
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                {reward.description}
              </p>
              
              {reward.items && reward.items.length > 0 && (
                <div className="mb-4">
                  <p className="text-sm font-medium mb-2">포함 내역:</p>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    {reward.items.map((item, index) => (
                      <li key={index} className="flex items-center gap-1">
                        <Package className="h-3 w-3" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-1">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    <span>{reward.quantityClaimed}명 선택</span>
                  </div>
                  {reward.quantity && (
                    <div className="flex items-center gap-1">
                      <Package className="h-4 w-4 text-muted-foreground" />
                      <span>{reward.quantity - reward.quantityClaimed}개 남음</span>
                    </div>
                  )}
                </div>
              </div>

              {reward.deliveryDate && (
                <div className="flex items-center gap-1 mt-2 text-sm text-muted-foreground">
                  <Calendar className="h-4 w-4" />
                  <span>배송 예정: {new Date(reward.deliveryDate).toLocaleDateString()}</span>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Create/Edit Dialog */}
      <Dialog open={isCreateDialogOpen || isEditDialogOpen} 
        onOpenChange={(open) => {
          if (!open) {
            setIsCreateDialogOpen(false);
            setIsEditDialogOpen(false);
            setSelectedReward(null);
            resetForm();
          }
        }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {isEditDialogOpen ? '리워드 수정' : '새 리워드 추가'}
            </DialogTitle>
            <DialogDescription>
              펀딩 참여자에게 제공할 리워드를 설정하세요
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>리워드 제목</Label>
                <Input
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="얼리버드 패키지"
                />
              </div>
              <div className="space-y-2">
                <Label>최소 펀딩 금액</Label>
                <Input
                  type="number"
                  value={formData.minAmount}
                  onChange={(e) => setFormData({ ...formData, minAmount: parseInt(e.target.value) })}
                  placeholder="100000"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>설명</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="이 리워드에 대한 설명을 입력하세요"
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>수량 (선택사항)</Label>
                <Input
                  type="number"
                  value={formData.quantity || ''}
                  onChange={(e) => setFormData({ 
                    ...formData, 
                    quantity: e.target.value ? parseInt(e.target.value) : undefined 
                  })}
                  placeholder="제한 없음"
                />
              </div>
              <div className="space-y-2">
                <Label>배송 예정일 (선택사항)</Label>
                <Input
                  type="date"
                  value={formData.deliveryDate || ''}
                  onChange={(e) => setFormData({ ...formData, deliveryDate: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>포함 아이템 (줄바꿈으로 구분)</Label>
              <Textarea
                value={formData.items.join('\n')}
                onChange={(e) => setFormData({ 
                  ...formData, 
                  items: e.target.value.split('\n').filter(item => item.trim()) 
                })}
                placeholder="제품 본품 x1&#10;스티커 세트&#10;감사 카드"
                rows={4}
              />
            </div>

            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="shippingRequired"
                checked={formData.shippingRequired}
                onChange={(e) => setFormData({ ...formData, shippingRequired: e.target.checked })}
                className="rounded border-gray-300"
              />
              <Label htmlFor="shippingRequired">배송 필요</Label>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setIsCreateDialogOpen(false);
              setIsEditDialogOpen(false);
              setSelectedReward(null);
              resetForm();
            }}>
              취소
            </Button>
            <Button onClick={() => {
              if (isEditDialogOpen && selectedReward) {
                updateReward.mutate({ id: selectedReward.id, data: formData });
              } else {
                createReward.mutate(formData);
              }
            }}>
              {isEditDialogOpen ? '수정' : '생성'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CrowdfundingRewards;