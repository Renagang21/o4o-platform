import { FC, useState } from 'react';
import { Settings, Package, TrendingUp, AlertCircle, Save } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { authClient } from '@o4o/auth-client';
import toast from 'react-hot-toast';

interface ReorderRule {
  id: string;
  productId: string;
  productName: string;
  sku: string;
  enabled: boolean;
  reorderPoint: number;
  reorderQuantity: number;
  maxStock: number;
  leadTime: number; // days
  supplierId?: string;
  supplierName?: string;
  autoApprove: boolean;
  lastTriggered?: string;
  nextReviewDate?: string;
}

interface GlobalSettings {
  autoReorderEnabled: boolean;
  defaultLeadTime: number;
  defaultReorderMultiplier: number;
  reviewPeriod: 'weekly' | 'biweekly' | 'monthly';
  notificationEmail: string;
  requireApproval: boolean;
}

export const AutoReorderSettings: FC = () => {
  const queryClient = useQueryClient();
  const [selectedTab, setSelectedTab] = useState('global');
  const [editingRule, setEditingRule] = useState<ReorderRule | null>(null);

  // Fetch global settings
  const { data: globalSettings, isLoading: loadingGlobal } = useQuery({
    queryKey: ['reorder-settings-global'],
    queryFn: async () => {
      const response = await authClient.api.get('/inventory/reorder/settings');
      return response.data?.data;
    }
  });

  // Fetch reorder rules
  const { data: rulesData, isLoading: loadingRules } = useQuery({
    queryKey: ['reorder-rules'],
    queryFn: async () => {
      const response = await authClient.api.get('/inventory/reorder/rules');
      return response.data;
    }
  });
  const rules = rulesData?.data || [];

  // Update global settings
  const updateGlobalSettings = useMutation({
    mutationFn: async (settings: GlobalSettings) => {
      const response = await authClient.api.put('/inventory/reorder/settings', settings);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reorder-settings-global'] });
      toast.success('글로벌 설정이 업데이트되었습니다');
    },
    onError: () => {
      toast.error('설정 업데이트 실패');
    }
  });

  // Update reorder rule
  const updateRule = useMutation({
    mutationFn: async (rule: ReorderRule) => {
      const response = await authClient.api.put(`/inventory/reorder/rules/${rule.id}`, rule);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reorder-rules'] });
      toast.success('재주문 규칙이 업데이트되었습니다');
      setEditingRule(null);
    },
    onError: () => {
      toast.error('규칙 업데이트 실패');
    }
  });

  // Calculate suggested reorder point based on average daily usage
  const calculateReorderPoint = (avgDailyUsage: number, leadTime: number, safetyStock: number) => {
    return Math.ceil((avgDailyUsage * leadTime) + safetyStock);
  };

  // Calculate suggested reorder quantity based on EOQ formula
  const calculateEOQ = (annualDemand: number, orderCost: number, holdingCost: number) => {
    return Math.ceil(Math.sqrt((2 * annualDemand * orderCost) / holdingCost));
  };

  const handleGlobalSettingChange = (key: keyof GlobalSettings, value: any) => {
    if (globalSettings) {
      updateGlobalSettings.mutate({
        ...globalSettings,
        [key]: value
      });
    }
  };

  const handleRuleToggle = (rule: ReorderRule) => {
    updateRule.mutate({
      ...rule,
      enabled: !rule.enabled
    });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            자동 재주문 설정
          </CardTitle>
          <CardDescription>
            재고 수준에 따라 자동으로 구매 주문을 생성하는 규칙을 설정합니다
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={selectedTab} onValueChange={setSelectedTab}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="global">글로벌 설정</TabsTrigger>
              <TabsTrigger value="rules">재주문 규칙</TabsTrigger>
              <TabsTrigger value="analytics">분석 & 최적화</TabsTrigger>
            </TabsList>

            {/* Global Settings Tab */}
            <TabsContent value="global" className="space-y-4">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>자동 재주문 활성화</Label>
                    <p className="text-sm text-muted-foreground">
                      시스템이 자동으로 구매 주문을 생성할 수 있도록 허용
                    </p>
                  </div>
                  <Switch
                    checked={globalSettings?.autoReorderEnabled || false}
                    onCheckedChange={(checked) => handleGlobalSettingChange('autoReorderEnabled', checked)}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>기본 리드타임 (일)</Label>
                    <Input
                      type="number"
                      value={globalSettings?.defaultLeadTime || 7}
                      onChange={(e) => handleGlobalSettingChange('defaultLeadTime', parseInt(e.target.value))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>기본 재주문 배수</Label>
                    <Input
                      type="number"
                      step="0.1"
                      value={globalSettings?.defaultReorderMultiplier || 1.5}
                      onChange={(e) => handleGlobalSettingChange('defaultReorderMultiplier', parseFloat(e.target.value))}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>검토 주기</Label>
                  <Select
                    value={globalSettings?.reviewPeriod || 'weekly'}
                    onValueChange={(value) => handleGlobalSettingChange('reviewPeriod', value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="weekly">매주</SelectItem>
                      <SelectItem value="biweekly">격주</SelectItem>
                      <SelectItem value="monthly">매월</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>알림 이메일</Label>
                  <Input
                    type="email"
                    value={globalSettings?.notificationEmail || ''}
                    onChange={(e) => handleGlobalSettingChange('notificationEmail', e.target.value)}
                    placeholder="admin@example.com"
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>승인 필요</Label>
                    <p className="text-sm text-muted-foreground">
                      자동 생성된 주문에 대해 수동 승인 요구
                    </p>
                  </div>
                  <Switch
                    checked={globalSettings?.requireApproval || false}
                    onCheckedChange={(checked) => handleGlobalSettingChange('requireApproval', checked)}
                  />
                </div>
              </div>
            </TabsContent>

            {/* Reorder Rules Tab */}
            <TabsContent value="rules" className="space-y-4">
              <div className="space-y-4">
                {rules.map((rule: ReorderRule) => (
                  <Card key={rule.id}>
                    <CardContent className="pt-6">
                      <div className="flex items-start justify-between">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <h4 className="font-medium">{rule.productName}</h4>
                            <Badge variant="outline">{rule.sku}</Badge>
                          </div>
                          <div className="text-sm text-muted-foreground">
                            재주문점: {rule.reorderPoint} | 재주문량: {rule.reorderQuantity} | 최대 재고: {rule.maxStock}
                          </div>
                          {rule.supplierName && (
                            <div className="text-sm text-muted-foreground">
                              공급업체: {rule.supplierName} | 리드타임: {rule.leadTime}일
                            </div>
                          )}
                          {rule.lastTriggered && (
                            <div className="text-xs text-muted-foreground">
                              마지막 실행: {new Date(rule.lastTriggered).toLocaleDateString()}
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setEditingRule(rule)}
                          >
                            편집
                          </Button>
                          <Switch
                            checked={rule.enabled}
                            onCheckedChange={() => handleRuleToggle(rule)}
                          />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
                {rules.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    재주문 규칙이 설정되지 않았습니다
                  </div>
                )}
              </div>
            </TabsContent>

            {/* Analytics Tab */}
            <TabsContent value="analytics" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">재주문 성과</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm">이번 달 자동 주문</span>
                        <span className="font-medium">24건</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm">평균 리드타임 준수율</span>
                        <span className="font-medium text-green-600">92%</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm">재고 부족 방지</span>
                        <span className="font-medium">18건</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">최적화 제안</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex items-start gap-2">
                        <AlertCircle className="h-4 w-4 text-yellow-500 mt-0.5" />
                        <div className="text-sm">
                          <p className="font-medium">SKU-1234 재주문점 조정 필요</p>
                          <p className="text-muted-foreground">현재: 50, 제안: 75</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-2">
                        <TrendingUp className="h-4 w-4 text-green-500 mt-0.5" />
                        <div className="text-sm">
                          <p className="font-medium">SKU-5678 리드타임 단축</p>
                          <p className="text-muted-foreground">평균 5일 → 3일</p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">재주문 최적화 계산기</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label>일평균 사용량</Label>
                      <Input type="number" placeholder="10" />
                    </div>
                    <div className="space-y-2">
                      <Label>리드타임 (일)</Label>
                      <Input type="number" placeholder="7" />
                    </div>
                    <div className="space-y-2">
                      <Label>안전재고</Label>
                      <Input type="number" placeholder="20" />
                    </div>
                  </div>
                  <div className="mt-4 p-4 bg-muted rounded-lg">
                    <p className="text-sm">
                      <span className="font-medium">권장 재주문점:</span> 90개
                    </p>
                    <p className="text-sm text-muted-foreground mt-1">
                      (일평균 사용량 × 리드타임) + 안전재고
                    </p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Edit Rule Dialog */}
      {editingRule && (
        <Dialog open={!!editingRule} onOpenChange={() => setEditingRule(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>재주문 규칙 편집</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>재주문점</Label>
                <Input
                  type="number"
                  value={editingRule.reorderPoint}
                  onChange={(e) => setEditingRule({
                    ...editingRule,
                    reorderPoint: parseInt(e.target.value)
                  })}
                />
              </div>
              <div className="space-y-2">
                <Label>재주문량</Label>
                <Input
                  type="number"
                  value={editingRule.reorderQuantity}
                  onChange={(e) => setEditingRule({
                    ...editingRule,
                    reorderQuantity: parseInt(e.target.value)
                  })}
                />
              </div>
              <div className="space-y-2">
                <Label>최대 재고</Label>
                <Input
                  type="number"
                  value={editingRule.maxStock}
                  onChange={(e) => setEditingRule({
                    ...editingRule,
                    maxStock: parseInt(e.target.value)
                  })}
                />
              </div>
              <div className="space-y-2">
                <Label>리드타임 (일)</Label>
                <Input
                  type="number"
                  value={editingRule.leadTime}
                  onChange={(e) => setEditingRule({
                    ...editingRule,
                    leadTime: parseInt(e.target.value)
                  })}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label>자동 승인</Label>
                <Switch
                  checked={editingRule.autoApprove}
                  onCheckedChange={(checked) => setEditingRule({
                    ...editingRule,
                    autoApprove: checked
                  })}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditingRule(null)}>
                취소
              </Button>
              <Button onClick={() => updateRule.mutate(editingRule)}>
                저장
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};

// Import required Dialog components
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';