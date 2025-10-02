import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Package, Edit, DollarSign, AlertTriangle, CheckCircle, Search, Filter, TrendingUp, Eye } from 'lucide-react';

interface SupplierProductsProps {
  attributes?: {
    limit?: number;
    category?: string;
    status?: 'all' | 'active' | 'pending' | 'rejected';
    showStats?: boolean;
  };
  content?: string;
}

interface SupplierProduct {
  id: string;
  title: string;
  sku: string;
  supplier_sku: string;
  cost_price: number;
  msrp: number;
  partner_commission_rate: number;
  margin_rate: number;
  status: 'active' | 'pending' | 'rejected';
  pending_changes?: {
    cost_price?: number;
    msrp?: number;
    partner_commission_rate?: number;
  };
  stats: {
    total_sales: number;
    total_partners: number;
    avg_selling_price: number;
  };
  created_at: string;
  updated_at: string;
  last_approval?: {
    approved_by: string;
    approved_at: string;
    notes?: string;
  };
}

const SupplierProducts: React.FC<SupplierProductsProps> = ({ 
  attributes = {
    limit: 12,
    status: 'all',
    showStats: true
  } 
}) => {
  const [products, setProducts] = useState<SupplierProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>(attributes.status || 'all');
  const [stats, setStats] = useState({
    total_products: 0,
    active_products: 0,
    pending_approvals: 0,
    total_revenue: 0,
    avg_margin: 0
  });

  useEffect(() => {
    fetchSupplierProducts();
  }, [filterStatus]);

  const fetchSupplierProducts = async () => {
    setLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('인증이 필요합니다');
      }

      const params = new URLSearchParams({
        limit: String(attributes.limit || 12),
        status: filterStatus,
        ...(attributes.category && { category: attributes.category })
      });

      const response = await fetch(`/api/v1/dropshipping/supplier/products?${params}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('상품 목록을 불러올 수 없습니다');
      }

      const data = await response.json();
      setProducts(data.products || []);
      setStats(data.stats || stats);

    } catch (err) {
      
      setError(err instanceof Error ? err.message : '알 수 없는 오류가 발생했습니다');
    } finally {
      setLoading(false);
    }
  };

  const handleEditProduct = (productId: string) => {
    // Navigate to product editor
    window.location.href = `/supplier/product-editor?id=${productId}`;
  };

  const getStatusBadge = (status: string, hasPendingChanges?: boolean) => {
    if (hasPendingChanges) {
      return <Badge variant="warning" className="flex items-center gap-1">
        <AlertTriangle className="h-3 w-3" />
        승인 대기중
      </Badge>;
    }

    switch (status) {
      case 'active':
        return <Badge variant="success" className="flex items-center gap-1">
          <CheckCircle className="h-3 w-3" />
          활성
        </Badge>;
      case 'pending':
        return <Badge variant="warning" className="flex items-center gap-1">
          <AlertTriangle className="h-3 w-3" />
          검토중
        </Badge>;
      case 'rejected':
        return <Badge variant="destructive">반려</Badge>;
      default:
        return <Badge variant="secondary">알 수 없음</Badge>;
    }
  };

  const formatCurrency = (amount: number): string => {
    return `₩${amount.toLocaleString()}`;
  };

  const filteredProducts = products.filter(product =>
    product.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.sku.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin mr-2" />
        <span>공급자 상품 목록을 불러오는 중...</span>
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="supplier-products-container">
      {/* Header with Stats */}
      {attributes.showStats && (
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold">{stats.total_products}</div>
              <p className="text-xs text-muted-foreground">전체 상품</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-green-600">{stats.active_products}</div>
              <p className="text-xs text-muted-foreground">활성 상품</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-yellow-600">{stats.pending_approvals}</div>
              <p className="text-xs text-muted-foreground">승인 대기</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold">{formatCurrency(stats.total_revenue)}</div>
              <p className="text-xs text-muted-foreground">총 거래액</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold">{stats.avg_margin.toFixed(1)}%</div>
              <p className="text-xs text-muted-foreground">평균 마진율</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Legal Compliance Notice */}
      <Alert className="mb-6 border-blue-200 bg-blue-50">
        <AlertTriangle className="h-4 w-4 text-blue-600" />
        <AlertDescription className="text-blue-900">
          <strong>⚖️ 공정거래법 준수 안내</strong><br />
          • MSRP는 <strong>권장 가격</strong>이며, 실제 판매가는 판매자가 자율적으로 결정합니다<br />
          • 가격 또는 수수료율 변경시 관리자 승인이 필요합니다<br />
          • 판매자의 가격 자율성은 법적으로 보호됩니다
        </AlertDescription>
      </Alert>

      {/* Filters and Search */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              내 공급 상품 관리
            </span>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="h-4 w-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <Input
                  placeholder="상품명 또는 SKU 검색..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9 w-64"
                />
              </div>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="px-3 py-2 border rounded-md"
              >
                <option value="all">전체 상태</option>
                <option value="active">활성</option>
                <option value="pending">승인 대기</option>
                <option value="rejected">반려</option>
              </select>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {filteredProducts.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Package className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p>등록된 상품이 없습니다</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-3 px-4">상품 정보</th>
                      <th className="text-left py-3 px-4">공급가</th>
                      <th className="text-left py-3 px-4">MSRP<br /><span className="text-xs font-normal text-gray-500">(권장가)</span></th>
                      <th className="text-center py-3 px-4">마진율<br /><span className="text-xs font-normal text-gray-500">(참고용)</span></th>
                      <th className="text-center py-3 px-4">파트너<br />수수료율</th>
                      <th className="text-center py-3 px-4">상태</th>
                      <th className="text-center py-3 px-4">판매 현황</th>
                      <th className="text-center py-3 px-4">관리</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredProducts.map((product) => (
                      <tr key={product.id} className="border-b hover:bg-gray-50">
                        <td className="py-3 px-4">
                          <div>
                            <div className="font-medium">{product.title}</div>
                            <div className="text-sm text-gray-500">
                              SKU: {product.sku} | 공급자코드: {product.supplier_sku}
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-medium">{formatCurrency(product.cost_price)}</div>
                          {product.pending_changes?.cost_price && (
                            <div className="text-xs text-yellow-600">
                              → {formatCurrency(product.pending_changes.cost_price)} (대기중)
                            </div>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-medium">{formatCurrency(product.msrp)}</div>
                          {product.pending_changes?.msrp && (
                            <div className="text-xs text-yellow-600">
                              → {formatCurrency(product.pending_changes.msrp)} (대기중)
                            </div>
                          )}
                        </td>
                        <td className="text-center py-3 px-4">
                          <Badge variant={product.margin_rate > 20 ? "success" : product.margin_rate > 10 ? "warning" : "destructive"}>
                            {product.margin_rate.toFixed(1)}%
                          </Badge>
                        </td>
                        <td className="text-center py-3 px-4">
                          <div className="font-medium">{product.partner_commission_rate}%</div>
                          {product.pending_changes?.partner_commission_rate && (
                            <div className="text-xs text-yellow-600">
                              → {product.pending_changes.partner_commission_rate}% (대기중)
                            </div>
                          )}
                        </td>
                        <td className="text-center py-3 px-4">
                          {getStatusBadge(product.status, !!product.pending_changes)}
                        </td>
                        <td className="text-center py-3 px-4">
                          <div className="text-sm">
                            <div>{product.stats.total_sales} 판매</div>
                            <div className="text-gray-500">{product.stats.total_partners} 파트너</div>
                          </div>
                        </td>
                        <td className="text-center py-3 px-4">
                          <div className="flex items-center justify-center gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleEditProduct(product.id)}
                              disabled={!!product.pending_changes}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => window.open(`/product/${product.id}`, '_blank')}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Bottom Actions */}
      <div className="flex justify-between items-center">
        <Button variant="outline" onClick={() => window.location.href = '/supplier/add-product'}>
          <Package className="h-4 w-4 mr-2" />
          새 상품 등록
        </Button>
        <div className="text-sm text-gray-500">
          총 {filteredProducts.length}개 상품 표시
        </div>
      </div>
    </div>
  );
};

export default SupplierProducts;