import { useState, useEffect } from 'react';
import { Plus, Package } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { SupplierDashboard } from '@/components/vendor/SupplierDashboard';
import { SupplierProductForm } from '@/components/vendor/SupplierProductForm';
import { getSupplierProducts } from '@/api/vendor/products';
import { useAuth } from '@o4o/auth-context';
import type { VendorSupplierStats as SupplierStats } from '@o4o/types';

const SupplierDashboardPage = () => {
  const { user } = useAuth();
  const [showProductForm, setShowProductForm] = useState(false);
  const [stats] = useState<SupplierStats>({
    supplierId: user?.id?.toString() || '',
    period: 'month' as const,
    totalProducts: 45,
    pendingProducts: 3,
    approvedProducts: 38,
    rejectedProducts: 2,
    soldoutProducts: 2,
    totalOrders: 124,
    totalRevenue: 15234000,
    totalProfit: 4821000,
    averageOrderValue: 122900,
    lowStockProducts: 5,
    outOfStockProducts: 2,
    pendingSettlement: 2150000,
    completedSettlement: 8500000
  });

  const [lowStockProducts, setLowStockProducts] = useState<any[]>([]);
  const [pendingProducts, setPendingProducts] = useState<any[]>([]);
  const [recentOrders] = useState([
    {
      id: '1',
      orderNumber: '20240315001',
      productName: '프리미엄 무선 이어폰',
      quantity: 2,
      amount: 178000,
      profit: 42000,
      status: '배송중'
    },
    {
      id: '2',
      orderNumber: '20240314003',
      productName: '스마트 워치 스트랩',
      quantity: 5,
      amount: 125000,
      profit: 31250,
      status: '배송완료'
    }
  ]);

  useEffect(() => {
    loadProducts();
  }, []);

  const loadProducts = async () => {
    try {
      // 재고 부족 제품
      const lowStockResponse = await getSupplierProducts({
        supplierId: user?.id?.toString(),
        status: 'active',
        limit: 5
      });
      
      // 실제로는 재고 필터링 필요
      setLowStockProducts(lowStockResponse.data?.slice(0, 5) || []);

      // 승인 대기 제품
      const pendingResponse = await getSupplierProducts({
        supplierId: user?.id?.toString(),
        approvalStatus: 'pending',
        limit: 5
      });
      setPendingProducts(pendingResponse.data || []);
    } catch (error: any) {
    // Error logging - use proper error handler
    }
  };

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-modern-text-primary">
            공급자 대시보드
          </h1>
          <p className="text-modern-text-secondary mt-1">
            제품 관리와 판매 현황을 확인하세요
          </p>
        </div>
        <Button onClick={() => setShowProductForm(true)}>
          <Plus className="w-4 h-4 mr-2" />
          새 제품 등록
        </Button>
      </div>

      {/* 대시보드 컴포넌트 */}
      <SupplierDashboard
        stats={stats}
        lowStockProducts={lowStockProducts}
        pendingProducts={pendingProducts}
        recentOrders={recentOrders}
      />

      {/* 제품 등록 다이얼로그 */}
      <Dialog open={showProductForm} onOpenChange={setShowProductForm}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Package className="w-5 h-5 text-modern-primary" />
              새 제품 등록
            </DialogTitle>
          </DialogHeader>
          <SupplierProductForm
            onSuccess={() => {
              setShowProductForm(false);
              loadProducts();
            }}
            onCancel={() => setShowProductForm(false)}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SupplierDashboardPage;