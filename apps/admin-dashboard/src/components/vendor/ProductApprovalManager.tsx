import { useState, useEffect } from 'react';
import { Check, X, Eye, Search } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { approveProducts, getPendingProducts } from '@/api/vendor/products';
import { formatPrice, calculateProfitDistribution } from '@/utils/vendorUtils';
import { useAuth } from '@o4o/auth-context';
import toast from 'react-hot-toast';
import type { VendorProduct, ProductApprovalRequest } from '@o4o/types';

export const ProductApprovalManager: React.FC = () => {
  const { user } = useAuth();
  const [products, setProducts] = useState<VendorProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProducts, setSelectedProducts] = useState<Set<string>>(new Set());
  const [filter, setFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [rejectReason, setRejectReason] = useState('');

  // 제품 목록 로드
  useEffect(() => {
    loadPendingProducts();
  }, []);

  const loadPendingProducts = async () => {
    try {
      setLoading(true);
      const response = await getPendingProducts({ limit: 50 });
      setProducts(response.data || []);
    } catch (error) {
      toast.error('승인 대기 제품을 불러오는데 실패했습니다');
    } finally {
      setLoading(false);
    }
  };

  // 전체 선택/해제
  const toggleSelectAll = () => {
    if (selectedProducts.size === filteredProducts.length) {
      setSelectedProducts(new Set());
    } else {
      setSelectedProducts(new Set(filteredProducts.map(p => p.id)));
    }
  };

  // 개별 선택
  const toggleSelect = (productId: string) => {
    const newSelected = new Set(selectedProducts);
    if (newSelected.has(productId)) {
      newSelected.delete(productId);
    } else {
      newSelected.add(productId);
    }
    setSelectedProducts(newSelected);
  };

  // 일괄 승인
  const handleBulkApprove = async () => {
    if (selectedProducts.size === 0) {
      toast.error('승인할 제품을 선택해주세요');
      return;
    }

    const request: ProductApprovalRequest = {
      productIds: Array.from(selectedProducts),
      action: 'approve',
      approvedBy: user?.id || ''
    };

    try {
      const response = await approveProducts(request);
      if (response.success) {
        toast.success(`${response.approved.length}개 제품이 승인되었습니다`);
        setSelectedProducts(new Set());
        loadPendingProducts();
      } else {
        toast.error(response.message || '승인 처리 중 오류가 발생했습니다');
      }
    } catch (error) {
      toast.error('승인 처리 중 오류가 발생했습니다');
    }
  };

  // 거절 다이얼로그 열기
  const openRejectDialog = (product?: VendorProduct) => {
    if (product) {
      setSelectedProducts(new Set([product.id]));
    } else if (selectedProducts.size === 0) {
      toast.error('거절할 제품을 선택해주세요');
      return;
    }
    setShowRejectDialog(true);
  };

  // 거절 처리
  const handleReject = async () => {
    if (!rejectReason.trim()) {
      toast.error('거절 사유를 입력해주세요');
      return;
    }

    const request: ProductApprovalRequest = {
      productIds: Array.from(selectedProducts),
      action: 'reject',
      reason: rejectReason,
      approvedBy: user?.id || ''
    };

    try {
      const response = await approveProducts(request);
      if (response.success) {
        toast.success(`${response.rejected.length}개 제품이 거절되었습니다`);
        setSelectedProducts(new Set());
        setRejectReason('');
        setShowRejectDialog(false);
        loadPendingProducts();
      } else {
        toast.error(response.message || '거절 처리 중 오류가 발생했습니다');
      }
    } catch (error) {
      toast.error('거절 처리 중 오류가 발생했습니다');
    }
  };

  // 필터링된 제품 목록
  const filteredProducts = products.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         product.sku.toLowerCase().includes(searchQuery.toLowerCase());
    
    if (filter === 'all') return matchesSearch;
    if (filter === 'lowmargin') {
      const calc = calculateProfitDistribution({
        sellPrice: product.sellPrice,
        supplyPrice: product.supplyPrice,
        affiliateRate: product.affiliateRate,
        adminFeeRate: product.adminFeeRate
      });
      return matchesSearch && calc.marginRate < 20;
    }
    return matchesSearch;
  });

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-modern-text-primary">제품 승인 관리</h2>
          <p className="text-modern-text-secondary mt-1">
            공급자가 등록한 제품을 검토하고 승인/거절할 수 있습니다
          </p>
        </div>
        <Badge variant="secondary" className="text-lg px-4 py-2">
          대기 중: {products.length}개
        </Badge>
      </div>

      {/* 액션 바 */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-4 flex-1">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-modern-text-tertiary w-4 h-4" />
                <Input
                  placeholder="제품명 또는 SKU로 검색..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={filter} onValueChange={setFilter}>
                <SelectTrigger className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">전체</SelectItem>
                  <SelectItem value="lowmargin">낮은 마진율</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                onClick={() => openRejectDialog()}
                disabled={selectedProducts.size === 0}
              >
                <X className="w-4 h-4 mr-2" />
                선택 거절 ({selectedProducts.size})
              </Button>
              <Button
                onClick={handleBulkApprove}
                disabled={selectedProducts.size === 0}
              >
                <Check className="w-4 h-4 mr-2" />
                선택 승인 ({selectedProducts.size})
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 제품 목록 */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-modern-border-primary bg-modern-bg-secondary">
                  <th className="p-4 text-left">
                    <Checkbox
                      checked={selectedProducts.size === filteredProducts.length && filteredProducts.length > 0}
                      onCheckedChange={toggleSelectAll}
                    />
                  </th>
                  <th className="p-4 text-left text-sm font-medium text-modern-text-secondary">제품 정보</th>
                  <th className="p-4 text-left text-sm font-medium text-modern-text-secondary">공급자</th>
                  <th className="p-4 text-left text-sm font-medium text-modern-text-secondary">가격 정보</th>
                  <th className="p-4 text-left text-sm font-medium text-modern-text-secondary">수익 분배</th>
                  <th className="p-4 text-left text-sm font-medium text-modern-text-secondary">등록일</th>
                  <th className="p-4 text-left text-sm font-medium text-modern-text-secondary">액션</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={7} className="text-center py-8 text-modern-text-secondary">
                      로딩 중...
                    </td>
                  </tr>
                ) : filteredProducts.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-8 text-modern-text-secondary">
                      승인 대기 중인 제품이 없습니다
                    </td>
                  </tr>
                ) : (
                  filteredProducts.map((product) => {
                    const calc = calculateProfitDistribution({
                      sellPrice: product.sellPrice,
                      supplyPrice: product.supplyPrice,
                      affiliateRate: product.affiliateRate,
                      adminFeeRate: product.adminFeeRate
                    });

                    return (
                      <tr key={product.id} className="border-b border-modern-border-primary hover:bg-modern-bg-tertiary">
                        <td className="p-4">
                          <Checkbox
                            checked={selectedProducts.has(product.id)}
                            onCheckedChange={() => toggleSelect(product.id)}
                          />
                        </td>
                        <td className="p-4">
                          <div>
                            <p className="font-medium text-modern-text-primary">{product.name}</p>
                            <p className="text-sm text-modern-text-secondary">SKU: {product.sku}</p>
                          </div>
                        </td>
                        <td className="p-4">
                          <p className="text-sm text-modern-text-primary">{product.supplierName || '공급자'}</p>
                        </td>
                        <td className="p-4">
                          <div className="space-y-1">
                            <p className="text-sm">
                              <span className="text-modern-text-secondary">공급가:</span>{' '}
                              <span className="font-medium">{formatPrice(product.supplyPrice)}</span>
                            </p>
                            <p className="text-sm">
                              <span className="text-modern-text-secondary">판매가:</span>{' '}
                              <span className="font-medium">{formatPrice(product.sellPrice)}</span>
                            </p>
                            <p className="text-sm">
                              <span className="text-modern-text-secondary">마진율:</span>{' '}
                              <span className={`font-medium ${calc.marginRate < 20 ? 'text-modern-warning' : 'text-modern-success'}`}>
                                {calc.marginRate.toFixed(1)}%
                              </span>
                            </p>
                          </div>
                        </td>
                        <td className="p-4">
                          <div className="space-y-1 text-sm">
                            <p>공급자: {formatPrice(calc.supplierProfit)}</p>
                            <p>제휴: {formatPrice(calc.affiliateCommission)}</p>
                            <p>관리자: {formatPrice(calc.adminCommission)}</p>
                          </div>
                        </td>
                        <td className="p-4">
                          <p className="text-sm text-modern-text-secondary">
                            {new Date(product.createdAt).toLocaleDateString('ko-KR')}
                          </p>
                        </td>
                        <td className="p-4">
                          <div className="flex items-center gap-2">
                            <Button size="sm" variant="ghost">
                              <Eye className="w-4 h-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-modern-success"
                              onClick={() => {
                                setSelectedProducts(new Set([product.id]));
                                handleBulkApprove();
                              }}
                            >
                              <Check className="w-4 h-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-modern-error"
                              onClick={() => openRejectDialog(product)}
                            >
                              <X className="w-4 h-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* 거절 사유 다이얼로그 */}
      <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>제품 거절</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <p className="text-sm text-modern-text-secondary mb-2">
                선택한 {selectedProducts.size}개 제품을 거절합니다.
              </p>
              <Textarea
                placeholder="거절 사유를 입력해주세요..."
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRejectDialog(false)}>
              취소
            </Button>
            <Button variant="destructive" onClick={handleReject}>
              거절
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};