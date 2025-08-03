import { FC, FormEvent, useState } from 'react';
import { Calculator, Settings, Percent, Plus, Edit, Trash2 } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { authClient } from '@o4o/auth-client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import toast from 'react-hot-toast';

interface FeePolicy {
  id: string;
  name: string;
  type: 'platform' | 'category' | 'vendor_tier' | 'payment_method';
  baseRate: number; // percentage
  minFee?: number;
  maxFee?: number;
  isActive: boolean;
  conditions: FeeCondition[];
  description: string;
  createdAt: string;
  updatedAt: string;
}

interface FeeCondition {
  key: string;
  operator: 'equals' | 'greater_than' | 'less_than' | 'in' | 'not_in';
  value: string | number | string[];
  label: string;
}

interface FeeCalculation {
  orderAmount: number;
  platformFee: number;
  tossFee: number;
  vendorAmount: number;
  breakdown: FeeBreakdownItem[];
}

interface FeeBreakdownItem {
  type: string;
  name: string;
  rate: number;
  amount: number;
  description: string;
}

const FeeManagement: FC = () => {
  const queryClient = useQueryClient();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedPolicy, setSelectedPolicy] = useState<FeePolicy | null>(null);
  const [testAmount, setTestAmount] = useState(100000);
  const [policyForm, setPolicyForm] = useState<Partial<FeePolicy>>({
    name: '',
    type: 'platform',
    baseRate: 5.0,
    minFee: 0,
    maxFee: 0,
    isActive: true,
    conditions: [],
    description: ''
  });

  // Fetch fee policies
  const { data: policiesData, isLoading } = useQuery({
    queryKey: ['fee-policies'],
    queryFn: async () => {
      const response = await authClient.api.get('/v1/settlements/fee-policies');
      return response.data;
    }
  });
  const policies: FeePolicy[] = policiesData?.data || [];

  // Fetch fee calculation test
  const { data: calculationData } = useQuery({
    queryKey: ['fee-calculation', testAmount],
    queryFn: async () => {
      const response = await authClient.api.post('/v1/settlements/calculate-fee', {
        orderAmount: testAmount,
        categoryId: 'cat-1',
        vendorTier: 'standard',
        paymentMethod: 'card'
      });
      return response.data;
    },
    enabled: testAmount > 0
  });
  const calculation: FeeCalculation = calculationData?.data || {};

  // Create policy mutation
  const createPolicyMutation = useMutation({
    mutationFn: async (data: Partial<FeePolicy>) => {
      const response = await authClient.api.post('/v1/settlements/fee-policies', data);
      return response.data;
    },
    onSuccess: () => {
      toast.success('수수료 정책이 생성되었습니다');
      queryClient.invalidateQueries({ queryKey: ['fee-policies'] });
      setIsCreateDialogOpen(false);
      resetForm();
    }
  });

  // Update policy mutation
  const updatePolicyMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<FeePolicy> }) => {
      const response = await authClient.api.put(`/v1/settlements/fee-policies/${id}`, data);
      return response.data;
    },
    onSuccess: () => {
      toast.success('수수료 정책이 수정되었습니다');
      queryClient.invalidateQueries({ queryKey: ['fee-policies'] });
      setIsEditDialogOpen(false);
      resetForm();
    }
  });

  // Delete policy mutation
  const deletePolicyMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await authClient.api.delete(`/v1/settlements/fee-policies/${id}`);
      return response.data;
    },
    onSuccess: () => {
      toast.success('수수료 정책이 삭제되었습니다');
      queryClient.invalidateQueries({ queryKey: ['fee-policies'] });
    }
  });

  // Toggle policy status mutation
  const togglePolicyMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      const response = await authClient.api.patch(`/v1/settlements/fee-policies/${id}/toggle`, { isActive });
      return response.data;
    },
    onSuccess: () => {
      toast.success('수수료 정책 상태가 변경되었습니다');
      queryClient.invalidateQueries({ queryKey: ['fee-policies'] });
    }
  });

  const resetForm = () => {
    setPolicyForm({
      name: '',
      type: 'platform',
      baseRate: 5.0,
      minFee: 0,
      maxFee: 0,
      isActive: true,
      conditions: [],
      description: ''
    });
    setSelectedPolicy(null);
  };

  const handleCreatePolicy = (e: FormEvent) => {
    e.preventDefault();
    if (!policyForm.name || !policyForm.baseRate) {
      toast.error('필수 정보를 입력하세요');
      return;
    }
    createPolicyMutation.mutate(policyForm);
  };

  const handleEditPolicy = (e: FormEvent) => {
    e.preventDefault();
    if (!selectedPolicy || !policyForm.name || !policyForm.baseRate) {
      toast.error('필수 정보를 입력하세요');
      return;
    }
    updatePolicyMutation.mutate({ id: selectedPolicy.id, data: policyForm });
  };

  const handleOpenEdit = (policy: FeePolicy) => {
    setSelectedPolicy(policy);
    setPolicyForm({
      name: policy.name,
      type: policy.type,
      baseRate: policy.baseRate,
      minFee: policy.minFee,
      maxFee: policy.maxFee,
      isActive: policy.isActive,
      conditions: policy.conditions,
      description: policy.description
    });
    setIsEditDialogOpen(true);
  };

  const getPolicyTypeName = (type: string) => {
    switch (type) {
      case 'platform': return '기본 플랫폼';
      case 'category': return '카테고리별';
      case 'vendor_tier': return '판매자 등급별';
      case 'payment_method': return '결제 수단별';
      default: return type;
    }
  };

  const formatCurrency = (amount: number) => {
    return `₩${amount.toLocaleString()}`;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-modern-text-primary">수수료 정책 관리</h1>
          <p className="text-modern-text-secondary mt-1">플랫폼 수수료 정책 설정 및 관리</p>
        </div>
        <Button onClick={() => setIsCreateDialogOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          정책 추가
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Fee Policies List */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>수수료 정책 목록</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {isLoading ? (
                  <div className="flex justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-modern-primary"></div>
                  </div>
                ) : policies.length === 0 ? (
                  <div className="text-center py-8 text-modern-text-secondary">
                    수수료 정책이 없습니다.
                  </div>
                ) : (
                  policies.map((policy: any) => (
                    <div key={policy.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex-1">
                        <div className="flex items-center gap-3">
                          <h3 className="font-semibold text-modern-text-primary">{policy.name}</h3>
                          <Badge variant={policy.isActive ? 'default' : 'secondary'}>
                            {policy.isActive ? '활성' : '비활성'}
                          </Badge>
                          <Badge variant={"outline" as const}>
                            {getPolicyTypeName(policy.type)}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-4 mt-2">
                          <div className="flex items-center gap-1">
                            <Percent className="w-4 h-4 text-modern-text-secondary" />
                            <span className="text-sm text-modern-text-secondary">
                              {policy.baseRate}%
                            </span>
                          </div>
                          {policy.minFee && (
                            <span className="text-sm text-modern-text-secondary">
                              최소: {formatCurrency(policy.minFee)}
                            </span>
                          )}
                          {policy.maxFee && (
                            <span className="text-sm text-modern-text-secondary">
                              최대: {formatCurrency(policy.maxFee)}
                            </span>
                          )}
                        </div>
                        {policy.description && (
                          <p className="text-sm text-modern-text-tertiary mt-1">{policy.description}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant={"ghost" as const}
                          size={"sm" as const}
                          onClick={() => togglePolicyMutation.mutate({ 
                            id: policy.id, 
                            isActive: !policy.isActive 
                          })}
                        >
                          <Settings className="w-4 h-4" />
                        </Button>
                        <Button
                          variant={"ghost" as const}
                          size={"sm" as const}
                          onClick={() => handleOpenEdit(policy)}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant={"ghost" as const}
                          size={"sm" as const}
                          onClick={() => deletePolicyMutation.mutate(policy.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Fee Calculator */}
        <div>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calculator className="w-5 h-5" />
                수수료 계산기
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="testAmount">주문 금액</Label>
                <Input
                  id="testAmount"
                  type="number"
                  value={testAmount}
                  onChange={(e: any) => setTestAmount(parseInt(e.target.value) || 0)}
                  placeholder="주문 금액 입력"
                />
              </div>

              {calculation.breakdown && (
                <div className="space-y-3">
                  <div className="p-3 bg-modern-bg-secondary rounded-lg">
                    <div className="text-sm font-medium text-modern-text-secondary">수수료 내역</div>
                    <div className="space-y-2 mt-2">
                      {calculation.breakdown.map((item, index) => (
                        <div key={index} className="flex justify-between text-sm">
                          <span className="text-modern-text-secondary">
                            {item.name} ({item.rate}%)
                          </span>
                          <span className="font-medium">{formatCurrency(item.amount)}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-modern-text-secondary">주문 금액</span>
                      <span className="font-medium">{formatCurrency(calculation.orderAmount)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-modern-text-secondary">플랫폼 수수료</span>
                      <span className="font-medium text-blue-600">
                        -{formatCurrency(calculation.platformFee)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-modern-text-secondary">토스 수수료</span>
                      <span className="font-medium text-orange-600">
                        -{formatCurrency(calculation.tossFee)}
                      </span>
                    </div>
                    <div className="border-t pt-2">
                      <div className="flex justify-between">
                        <span className="font-medium text-modern-text-primary">판매자 수령액</span>
                        <span className="font-bold text-green-600">
                          {formatCurrency(calculation.vendorAmount)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Quick Stats */}
          <Card className="mt-4">
            <CardHeader>
              <CardTitle>정책 요약</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm text-modern-text-secondary">활성 정책</span>
                  <span className="font-medium">
                    {policies.filter(p => p.isActive).length}개
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-modern-text-secondary">전체 정책</span>
                  <span className="font-medium">{policies.length}개</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-modern-text-secondary">기본 수수료율</span>
                  <span className="font-medium">
                    {policies.find(p => p.type === 'platform' && p.isActive)?.baseRate || 0}%
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Create Policy Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="max-w-md">
          <form onSubmit={handleCreatePolicy}>
            <DialogHeader>
              <DialogTitle>수수료 정책 추가</DialogTitle>
              <DialogDescription>
                새로운 수수료 정책을 설정합니다.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div>
                <Label htmlFor="name">정책명 *</Label>
                <Input
                  id="name"
                  value={policyForm.name}
                  onChange={(e: any) => setPolicyForm(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="정책명을 입력하세요"
                  required
                />
              </div>

              <div>
                <Label htmlFor="type">정책 유형 *</Label>
                <select
                  id="type"
                  value={policyForm.type}
                  onChange={(e: any) => setPolicyForm(prev => ({ ...prev, type: e.target.value as any }))}
                  className="w-full px-3 py-2 border border-modern-border-primary rounded-lg mt-1"
                  required
                >
                  <option value="platform">기본 플랫폼</option>
                  <option value="category">카테고리별</option>
                  <option value="vendor_tier">판매자 등급별</option>
                  <option value="payment_method">결제 수단별</option>
                </select>
              </div>

              <div>
                <Label htmlFor="baseRate">기본 수수료율 (%) *</Label>
                <Input
                  id="baseRate"
                  type="number"
                  step="0.1"
                  min="0"
                  max="100"
                  value={policyForm.baseRate}
                  onChange={(e: any) => setPolicyForm(prev => ({ ...prev, baseRate: parseFloat(e.target.value) || 0 }))}
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="minFee">최소 수수료 (원)</Label>
                  <Input
                    id="minFee"
                    type="number"
                    min="0"
                    value={policyForm.minFee}
                    onChange={(e: any) => setPolicyForm(prev => ({ ...prev, minFee: parseInt(e.target.value) || 0 }))}
                  />
                </div>
                <div>
                  <Label htmlFor="maxFee">최대 수수료 (원)</Label>
                  <Input
                    id="maxFee"
                    type="number"
                    min="0"
                    value={policyForm.maxFee}
                    onChange={(e: any) => setPolicyForm(prev => ({ ...prev, maxFee: parseInt(e.target.value) || 0 }))}
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="description">설명</Label>
                <Input
                  id="description"
                  value={policyForm.description}
                  onChange={(e: any) => setPolicyForm(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="정책 설명을 입력하세요"
                />
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="isActive"
                  checked={policyForm.isActive}
                  onChange={(e: any) => setPolicyForm(prev => ({ ...prev, isActive: e.target.checked }))}
                  className="mr-2"
                />
                <Label htmlFor="isActive">정책 활성화</Label>
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant={"outline" as const} onClick={() => setIsCreateDialogOpen(false)}>
                취소
              </Button>
              <Button type="submit" disabled={createPolicyMutation.isPending}>
                생성
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Policy Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-md">
          <form onSubmit={handleEditPolicy}>
            <DialogHeader>
              <DialogTitle>수수료 정책 수정</DialogTitle>
              <DialogDescription>
                {selectedPolicy?.name} 정책을 수정합니다.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div>
                <Label htmlFor="editName">정책명 *</Label>
                <Input
                  id="editName"
                  value={policyForm.name}
                  onChange={(e: any) => setPolicyForm(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="정책명을 입력하세요"
                  required
                />
              </div>

              <div>
                <Label htmlFor="editBaseRate">기본 수수료율 (%) *</Label>
                <Input
                  id="editBaseRate"
                  type="number"
                  step="0.1"
                  min="0"
                  max="100"
                  value={policyForm.baseRate}
                  onChange={(e: any) => setPolicyForm(prev => ({ ...prev, baseRate: parseFloat(e.target.value) || 0 }))}
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="editMinFee">최소 수수료 (원)</Label>
                  <Input
                    id="editMinFee"
                    type="number"
                    min="0"
                    value={policyForm.minFee}
                    onChange={(e: any) => setPolicyForm(prev => ({ ...prev, minFee: parseInt(e.target.value) || 0 }))}
                  />
                </div>
                <div>
                  <Label htmlFor="editMaxFee">최대 수수료 (원)</Label>
                  <Input
                    id="editMaxFee"
                    type="number"
                    min="0"
                    value={policyForm.maxFee}
                    onChange={(e: any) => setPolicyForm(prev => ({ ...prev, maxFee: parseInt(e.target.value) || 0 }))}
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="editDescription">설명</Label>
                <Input
                  id="editDescription"
                  value={policyForm.description}
                  onChange={(e: any) => setPolicyForm(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="정책 설명을 입력하세요"
                />
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="editIsActive"
                  checked={policyForm.isActive}
                  onChange={(e: any) => setPolicyForm(prev => ({ ...prev, isActive: e.target.checked }))}
                  className="mr-2"
                />
                <Label htmlFor="editIsActive">정책 활성화</Label>
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant={"outline" as const} onClick={() => setIsEditDialogOpen(false)}>
                취소
              </Button>
              <Button type="submit" disabled={updatePolicyMutation.isPending}>
                수정
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default FeeManagement;