import { useState, FC } from 'react';
import { AlertTriangle, Search, Filter, Edit, Eye } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { authClient } from '@o4o/auth-client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
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
import { Textarea } from '@/components/ui/textarea';
import toast from 'react-hot-toast';

interface InventoryItem {
  id: string;
  productId: string;
  productName: string;
  sku: string;
  variantId?: string;
  variantOptions?: Record<string, string>;
  currentStock: number;
  reservedStock: number;
  availableStock: number;
  reorderPoint: number;
  maxStock: number;
  cost: number;
  location?: string;
  batch?: string;
  expiryDate?: string;
  lastUpdated: string;
  status: 'in_stock' | 'low_stock' | 'out_of_stock' | 'discontinued';
}

interface StockMovement {
  id: string;
  inventoryItemId: string;
  type: 'in' | 'out' | 'adjustment' | 'reserved' | 'unreserved';
  quantity: number;
  remainingStock: number;
  reason: string;
  reference?: string; // Order ID, Adjustment ID, etc.
  notes?: string;
  performedBy: string;
  createdAt: string;
}

interface StockAdjustmentFormData {
  inventoryItemId: string;
  type: 'increase' | 'decrease' | 'set';
  quantity: number;
  reason: string;
  notes?: string;
}

const InventoryManagement: FC = () => {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedInventoryItem, setSelectedInventoryItem] = useState<InventoryItem | null>(null);
  const [isAdjustmentDialogOpen, setIsAdjustmentDialogOpen] = useState(false);
  const [isMovementHistoryOpen, setIsMovementHistoryOpen] = useState(false);
  const [adjustmentForm, setAdjustmentForm] = useState<StockAdjustmentFormData>({
    inventoryItemId: '',
    type: 'increase',
    quantity: 0,
    reason: '',
    notes: ''
  });

  // Fetch inventory data
  const { data: inventoryData, isLoading } = useQuery({
    queryKey: ['inventory', searchTerm, statusFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (searchTerm) params.append('search', searchTerm);
      if (statusFilter !== 'all') params.append('status', statusFilter);

      const response = await authClient.api.get(`/v1/inventory?${params.toString()}`);
      return response.data;
    }
  });
  const inventory = inventoryData?.data || [];

  // Fetch stock movements for selected item
  const { data: movementsData } = useQuery({
    queryKey: ['stock-movements', selectedInventoryItem?.id],
    queryFn: async () => {
      if (!selectedInventoryItem?.id) return { data: [] };
      const response = await authClient.api.get(`/v1/inventory/${selectedInventoryItem.id}/movements`);
      return response.data;
    },
    enabled: !!selectedInventoryItem?.id && isMovementHistoryOpen
  });
  const movements = movementsData?.data || [];

  // Fetch inventory statistics
  const { data: statsData } = useQuery({
    queryKey: ['inventory-stats'],
    queryFn: async () => {
      const response = await authClient.api.get('/v1/inventory/stats');
      return response.data;
    }
  });
  const stats = statsData?.data || {};

  // Stock adjustment mutation
  const adjustStockMutation = useMutation({
    mutationFn: async (data: StockAdjustmentFormData) => {
      const response = await authClient.api.post('/v1/inventory/adjust', data);
      return response.data;
    },
    onSuccess: () => {
      toast.success('재고가 조정되었습니다');
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
      queryClient.invalidateQueries({ queryKey: ['inventory-stats'] });
      setIsAdjustmentDialogOpen(false);
      setAdjustmentForm({
        inventoryItemId: '',
        type: 'increase',
        quantity: 0,
        reason: '',
        notes: ''
      });
    }
  });

  // Bulk reorder mutation
  const bulkReorderMutation = useMutation({
    mutationFn: async (itemIds: string[]) => {
      const response = await authClient.api.post('/v1/inventory/bulk-reorder', { itemIds });
      return response.data;
    },
    onSuccess: () => {
      toast.success('대량 재주문이 요청되었습니다');
    }
  });

  const getStatusBadge = (status: string, currentStock: number, reorderPoint: number) => {
    if (status === 'out_of_stock' || currentStock === 0) {
      return <Badge variant="destructive">품절</Badge>;
    }
    if (status === 'low_stock' || currentStock <= reorderPoint) {
      return <Badge variant={"outline" as const} className="text-orange-600 border-orange-600">부족</Badge>;
    }
    if (status === 'discontinued') {
      return <Badge variant="secondary">단종</Badge>;
    }
    return <Badge>정상</Badge>;
  };

  const handleOpenAdjustment = (item: InventoryItem) => {
    setSelectedInventoryItem(item);
    setAdjustmentForm({
      inventoryItemId: item.id,
      type: 'increase',
      quantity: 0,
      reason: '',
      notes: ''
    });
    setIsAdjustmentDialogOpen(true);
  };

  const handleOpenMovementHistory = (item: InventoryItem) => {
    setSelectedInventoryItem(item);
    setIsMovementHistoryOpen(true);
  };

  const handleAdjustmentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjustmentForm.quantity || !adjustmentForm.reason) {
      toast.error('수량과 사유를 입력하세요');
      return;
    }
    adjustStockMutation.mutate(adjustmentForm);
  };

  const getMovementTypeDisplay = (type: string) => {
    switch (type) {
      case 'in': return { label: '입고', color: 'text-green-600' };
      case 'out': return { label: '출고', color: 'text-red-600' };
      case 'adjustment': return { label: '조정', color: 'text-blue-600' };
      case 'reserved': return { label: '예약', color: 'text-orange-600' };
      case 'unreserved': return { label: '예약해제', color: 'text-purple-600' };
      default: return { label: type, color: 'text-gray-600' };
    }
  };

  const lowStockItems = inventory.filter((item: InventoryItem) => 
    item.currentStock <= item.reorderPoint && item.status !== 'discontinued'
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-modern-text-primary">재고 관리</h1>
          <p className="text-modern-text-secondary mt-1">실시간 재고 추적 및 관리</p>
        </div>
        <div className="flex gap-2">
          {lowStockItems.length > 0 && (
            <Button
              variant={"outline" as const}
              onClick={() => bulkReorderMutation.mutate(lowStockItems.map((item: any) => item.id))}
              disabled={bulkReorderMutation.isPending}
            >
              <AlertTriangle className="w-4 h-4 mr-2" />
              부족 재고 재주문 ({lowStockItems.length})
            </Button>
          )}
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-modern-text-secondary">
              총 상품 수
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-modern-text-primary">
              {stats.totalItems || 0}
            </div>
            <p className="text-xs text-modern-text-tertiary mt-1">
              활성 상품 기준
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-modern-text-secondary">
              부족 재고
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {stats.lowStockItems || 0}
            </div>
            <p className="text-xs text-modern-text-tertiary mt-1">
              재주문 필요
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-modern-text-secondary">
              품절 상품
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {stats.outOfStockItems || 0}
            </div>
            <p className="text-xs text-modern-text-tertiary mt-1">
              즉시 보충 필요
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-modern-text-secondary">
              총 재고 가치
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-modern-text-primary">
              ₩{(stats.totalValue || 0).toLocaleString()}
            </div>
            <p className="text-xs text-modern-text-tertiary mt-1">
              원가 기준
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-modern-text-tertiary w-5 h-5" />
            <Input
              type="text"
              placeholder="상품명, SKU로 검색..."
              value={searchTerm}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Filter className="w-5 h-5 text-modern-text-secondary" />
          <select
            value={statusFilter}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setStatusFilter(e.target.value)}
            className="px-4 py-2 border border-modern-border-primary rounded-lg focus:outline-none focus:ring-2 focus:ring-modern-primary"
          >
            <option value="all">모든 상태</option>
            <option value="in_stock">정상 재고</option>
            <option value="low_stock">부족 재고</option>
            <option value="out_of_stock">품절</option>
            <option value="discontinued">단종</option>
          </select>
        </div>
      </div>

      {/* Inventory Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-modern-bg-tertiary border-b border-modern-border-primary">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-modern-text-secondary uppercase tracking-wider">
                    상품 정보
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-modern-text-secondary uppercase tracking-wider">
                    현재 재고
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-modern-text-secondary uppercase tracking-wider">
                    예약 재고
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-modern-text-secondary uppercase tracking-wider">
                    재주문점
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-modern-text-secondary uppercase tracking-wider">
                    상태
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-modern-text-secondary uppercase tracking-wider">
                    위치
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-modern-text-secondary uppercase tracking-wider">
                    작업
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-modern-border-primary">
                {isLoading ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center">
                      <div className="flex justify-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-modern-primary"></div>
                      </div>
                    </td>
                  </tr>
                ) : inventory.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center text-modern-text-secondary">
                      재고 데이터가 없습니다.
                    </td>
                  </tr>
                ) : (
                  inventory.map((item: InventoryItem) => (
                    <tr key={item.id} className="hover:bg-modern-bg-hover">
                      <td className="px-6 py-4">
                        <div>
                          <div className="text-sm font-medium text-modern-text-primary">
                            {item.productName}
                          </div>
                          <div className="text-sm text-modern-text-secondary">
                            SKU: {item.sku}
                          </div>
                          {item.variantOptions && (
                            <div className="text-xs text-modern-text-tertiary">
                              {Object.entries(item.variantOptions).map(([key, value]) => `${key}: ${value}`).join(', ')}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-modern-text-primary">
                            {item.currentStock}
                          </span>
                          {item.currentStock <= item.reorderPoint && (
                            <AlertTriangle className="w-4 h-4 text-orange-500" />
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm text-modern-text-secondary">
                          {item.reservedStock}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm text-modern-text-secondary">
                          {item.reorderPoint}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        {getStatusBadge(item.status, item.currentStock, item.reorderPoint)}
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm text-modern-text-secondary">
                          {item.location || '-'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <Button
                            variant={"ghost" as const}
                            size={"sm" as const}
                            onClick={() => handleOpenAdjustment(item)}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            variant={"ghost" as const}
                            size={"sm" as const}
                            onClick={() => handleOpenMovementHistory(item)}
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Stock Adjustment Dialog */}
      <Dialog open={isAdjustmentDialogOpen} onOpenChange={setIsAdjustmentDialogOpen}>
        <DialogContent>
          <form onSubmit={handleAdjustmentSubmit}>
            <DialogHeader>
              <DialogTitle>재고 조정</DialogTitle>
              <DialogDescription>
                {selectedInventoryItem?.productName} - {selectedInventoryItem?.sku}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div>
                <Label>현재 재고: {selectedInventoryItem?.currentStock}개</Label>
              </div>

              <div>
                <Label htmlFor="type">조정 유형</Label>
                <select
                  id="type"
                  value={adjustmentForm.type}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setAdjustmentForm(prev => ({ ...prev, type: e.target.value as any }))}
                  className="w-full px-3 py-2 border border-modern-border-primary rounded-lg mt-1"
                >
                  <option value="increase">증가</option>
                  <option value="decrease">감소</option>
                  <option value="set">절대값 설정</option>
                </select>
              </div>

              <div>
                <Label htmlFor="quantity">수량</Label>
                <Input
                  id="quantity"
                  type="number"
                  min="0"
                  value={adjustmentForm.quantity}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setAdjustmentForm(prev => ({ ...prev, quantity: parseInt(e.target.value) || 0 }))}
                  required
                />
              </div>

              <div>
                <Label htmlFor="reason">조정 사유 *</Label>
                <select
                  id="reason"
                  value={adjustmentForm.reason}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setAdjustmentForm(prev => ({ ...prev, reason: e.target.value }))}
                  className="w-full px-3 py-2 border border-modern-border-primary rounded-lg mt-1"
                  required
                >
                  <option value="">사유를 선택하세요</option>
                  <option value="manual_count">실사 조정</option>
                  <option value="damaged">손상품 처리</option>
                  <option value="expired">유통기한 만료</option>
                  <option value="returned">반품 처리</option>
                  <option value="promotional">판촉 사용</option>
                  <option value="theft">분실/도난</option>
                  <option value="other">기타</option>
                </select>
              </div>

              <div>
                <Label htmlFor="notes">메모</Label>
                <Textarea
                  id="notes"
                  value={adjustmentForm.notes}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setAdjustmentForm(prev => ({ ...prev, notes: e.target.value }))}
                  placeholder="추가 설명을 입력하세요..."
                  rows={3}
                />
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant={"outline" as const} onClick={() => setIsAdjustmentDialogOpen(false)}>
                취소
              </Button>
              <Button type="submit" disabled={adjustStockMutation.isPending}>
                조정하기
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Movement History Dialog */}
      <Dialog open={isMovementHistoryOpen} onOpenChange={setIsMovementHistoryOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>입출고 이력</DialogTitle>
            <DialogDescription>
              {selectedInventoryItem?.productName} - {selectedInventoryItem?.sku}
            </DialogDescription>
          </DialogHeader>

          <div className="max-h-96 overflow-y-auto">
            <table className="w-full">
              <thead className="bg-modern-bg-tertiary sticky top-0">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-modern-text-secondary">일시</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-modern-text-secondary">유형</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-modern-text-secondary">수량</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-modern-text-secondary">잔여</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-modern-text-secondary">사유</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-modern-text-secondary">참조</th>
                </tr>
              </thead>
              <tbody>
                {movements.map((movement: StockMovement) => {
                  const typeDisplay = getMovementTypeDisplay(movement.type);
                  return (
                    <tr key={movement.id} className="border-b border-modern-border-primary">
                      <td className="px-4 py-2 text-sm">
                        {new Date(movement.createdAt).toLocaleString('ko-KR')}
                      </td>
                      <td className="px-4 py-2">
                        <span className={`text-sm font-medium ${typeDisplay.color}`}>
                          {typeDisplay.label}
                        </span>
                      </td>
                      <td className="px-4 py-2 text-sm">
                        {movement.type === 'out' || movement.type === 'adjustment' ? '-' : '+'}
                        {movement.quantity}
                      </td>
                      <td className="px-4 py-2 text-sm">
                        {movement.remainingStock}
                      </td>
                      <td className="px-4 py-2 text-sm">
                        {movement.reason}
                      </td>
                      <td className="px-4 py-2 text-sm">
                        {movement.reference || '-'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <DialogFooter>
            <Button onClick={() => setIsMovementHistoryOpen(false)}>
              닫기
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default InventoryManagement;