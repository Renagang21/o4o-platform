import React from 'react';
import { Package, TrendingUp, AlertCircle, DollarSign, ShoppingBag, Clock } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { formatPrice, getStockStatus, getProductStatusBadge } from '@/utils/vendorUtils';
import type { SupplierStats, VendorProduct } from '@o4o/types';

interface SupplierDashboardProps {
  stats: SupplierStats;
  lowStockProducts: VendorProduct[];
  pendingProducts: VendorProduct[];
  recentOrders: any[];
}

export const SupplierDashboard: React.FC<SupplierDashboardProps> = ({
  stats,
  lowStockProducts,
  pendingProducts,
  recentOrders
}) => {
  return (
    <div className="space-y-6">
      {/* 통계 카드 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-modern-text-secondary">총 제품</p>
                <p className="text-2xl font-bold text-modern-text-primary">
                  {stats.totalProducts}
                </p>
                <p className="text-xs text-modern-text-secondary mt-1">
                  승인: {stats.approvedProducts} | 대기: {stats.pendingProducts}
                </p>
              </div>
              <Package className="w-8 h-8 text-modern-primary opacity-20" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-modern-text-secondary">이번 달 매출</p>
                <p className="text-2xl font-bold text-modern-text-primary">
                  {formatPrice(stats.totalRevenue)}
                </p>
                <p className="text-xs text-modern-success mt-1">
                  +12.5% 전월 대비
                </p>
              </div>
              <TrendingUp className="w-8 h-8 text-modern-success opacity-20" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-modern-text-secondary">이번 달 수익</p>
                <p className="text-2xl font-bold text-modern-text-primary">
                  {formatPrice(stats.totalProfit)}
                </p>
                <p className="text-xs text-modern-text-secondary mt-1">
                  수익률 {((stats.totalProfit / stats.totalRevenue) * 100).toFixed(1)}%
                </p>
              </div>
              <DollarSign className="w-8 h-8 text-modern-accent opacity-20" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-modern-text-secondary">재고 부족</p>
                <p className="text-2xl font-bold text-modern-warning">
                  {stats.lowStockProducts}
                </p>
                <p className="text-xs text-modern-error mt-1">
                  품절: {stats.outOfStockProducts}개
                </p>
              </div>
              <AlertCircle className="w-8 h-8 text-modern-warning opacity-20" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 알림 섹션 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 재고 부족 제품 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-modern-warning" />
                재고 부족 제품
              </span>
              <Button size="sm" variant="outline">
                전체 보기
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {lowStockProducts.length === 0 ? (
              <p className="text-center text-modern-text-secondary py-8">
                재고 부족 제품이 없습니다
              </p>
            ) : (
              <div className="space-y-3">
                {lowStockProducts.slice(0, 5).map((product) => {
                  const stockStatus = getStockStatus(product.supplierStock || 0, product.lowStockThreshold || 10);
                  return (
                    <div key={product.id} className="flex items-center justify-between p-3 border border-modern-border-primary rounded-lg">
                      <div>
                        <p className="font-medium text-modern-text-primary">{product.name}</p>
                        <p className="text-sm text-modern-text-secondary">
                          SKU: {product.sku}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className={`text-sm font-medium ${stockStatus.color}`}>
                          {stockStatus.message}
                        </p>
                        <Button size="sm" variant="outline" className="mt-1">
                          재고 추가
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* 승인 대기 제품 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-modern-primary" />
                승인 대기 제품
              </span>
              <Badge variant="secondary">{pendingProducts.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {pendingProducts.length === 0 ? (
              <p className="text-center text-modern-text-secondary py-8">
                승인 대기 중인 제품이 없습니다
              </p>
            ) : (
              <div className="space-y-3">
                {pendingProducts.slice(0, 5).map((product) => {
                  const statusBadge = getProductStatusBadge(product.approvalStatus);
                  return (
                    <div key={product.id} className="flex items-center justify-between p-3 border border-modern-border-primary rounded-lg">
                      <div>
                        <p className="font-medium text-modern-text-primary">{product.name}</p>
                        <p className="text-sm text-modern-text-secondary">
                          등록일: {new Date(product.createdAt).toLocaleDateString('ko-KR')}
                        </p>
                      </div>
                      <Badge variant={statusBadge.variant}>
                        {statusBadge.label}
                      </Badge>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* 최근 주문 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShoppingBag className="w-5 h-5 text-modern-primary" />
            최근 주문
          </CardTitle>
        </CardHeader>
        <CardContent>
          {recentOrders.length === 0 ? (
            <p className="text-center text-modern-text-secondary py-8">
              최근 주문이 없습니다
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-modern-border-primary">
                    <th className="text-left py-3 px-2 text-sm font-medium text-modern-text-secondary">주문번호</th>
                    <th className="text-left py-3 px-2 text-sm font-medium text-modern-text-secondary">제품</th>
                    <th className="text-left py-3 px-2 text-sm font-medium text-modern-text-secondary">수량</th>
                    <th className="text-left py-3 px-2 text-sm font-medium text-modern-text-secondary">금액</th>
                    <th className="text-left py-3 px-2 text-sm font-medium text-modern-text-secondary">수익</th>
                    <th className="text-left py-3 px-2 text-sm font-medium text-modern-text-secondary">상태</th>
                  </tr>
                </thead>
                <tbody>
                  {recentOrders.slice(0, 5).map((order) => (
                    <tr key={order.id} className="border-b border-modern-border-primary">
                      <td className="py-3 px-2 text-sm">#{order.orderNumber}</td>
                      <td className="py-3 px-2 text-sm">{order.productName}</td>
                      <td className="py-3 px-2 text-sm">{order.quantity}</td>
                      <td className="py-3 px-2 text-sm">{formatPrice(order.amount)}</td>
                      <td className="py-3 px-2 text-sm font-medium text-modern-success">
                        {formatPrice(order.profit)}
                      </td>
                      <td className="py-3 px-2">
                        <Badge variant="outline" className="text-xs">
                          {order.status}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};