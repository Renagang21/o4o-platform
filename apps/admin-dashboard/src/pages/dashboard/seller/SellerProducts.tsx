/**
 * Phase PD-3: Seller Products Management Page
 *
 * Allows sellers to manage their imported products (pricing, status, etc.)
 */

import { useState, useEffect } from 'react';
import { authClient } from '@o4o/auth-client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Edit, Trash2, Search, Package } from 'lucide-react';

interface SellerProduct {
  id: string;
  productId: string;
  name: string;
  description: string;
  supplierName: string;
  thumbnailUrl: string | null;
  basePrice: number;
  salePrice: number;
  marginRate: number;
  marginAmount: number;
  syncPolicy: 'auto' | 'manual';
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface ProductsResponse {
  success: boolean;
  items: SellerProduct[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export default function SellerProducts() {
  const [products, setProducts] = useState<SellerProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [editingProduct, setEditingProduct] = useState<SellerProduct | null>(null);
  const [editFormData, setEditFormData] = useState({
    salePrice: 0,
    marginRate: 0,
    isActive: true,
    syncPolicy: 'auto' as 'auto' | 'manual',
  });
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '20',
        ...(search && { search }),
      });

      const response = await authClient.api.get<ProductsResponse>(
        `/v2/seller/products?${params.toString()}`
      );
      const responseData = response.data;

      if (responseData.success && responseData.items) {
        setProducts(responseData.items);
        setTotalPages(responseData.totalPages);
        setTotal(responseData.total);
      }
    } catch (error) {
      console.error('Failed to fetch products:', error);
      toast({
        title: '오류',
        description: '상품 목록을 불러오는데 실패했습니다.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, [page, search]);

  const handleEdit = (product: SellerProduct) => {
    setEditingProduct(product);
    setEditFormData({
      salePrice: product.salePrice,
      marginRate: product.marginRate * 100, // Convert to percentage
      isActive: product.isActive,
      syncPolicy: product.syncPolicy,
    });
  };

  const handleSave = async () => {
    if (!editingProduct) return;

    try {
      setSaving(true);
      const response = await authClient.api.patch<{ success: boolean }>(
        `/v2/seller/products/${editingProduct.id}`,
        {
          salePrice: editFormData.salePrice,
          isActive: editFormData.isActive,
          syncPolicy: editFormData.syncPolicy,
        }
      );

      if (response.data.success) {
        toast({
          title: '성공',
          description: '상품 정보가 업데이트되었습니다.',
        });
        setEditingProduct(null);
        fetchProducts();
      }
    } catch (error: any) {
      console.error('Failed to update product:', error);
      const message = error.response?.data?.error || '상품 업데이트에 실패했습니다.';
      toast({
        title: '오류',
        description: message,
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (productId: string, productName: string) => {
    if (!confirm(`"${productName}"을(를) 삭제하시겠습니까?`)) return;

    try {
      setDeleting(productId);
      const deleteResponse = await authClient.api.delete<{ success: boolean }>(
        `/v2/seller/products/${productId}`
      );

      if (deleteResponse.data.success) {
        toast({
          title: '성공',
          description: '상품이 삭제되었습니다.',
        });
        fetchProducts();
      }
    } catch (error: any) {
      console.error('Failed to delete product:', error);
      const message = error.response?.data?.error || '상품 삭제에 실패했습니다.';
      toast({
        title: '오류',
        description: message,
        variant: 'destructive',
      });
    } finally {
      setDeleting(null);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchProducts();
  };

  if (loading && products.length === 0) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">내 상품 관리</h1>
        <p className="mt-2 text-gray-600">
          가져온 상품의 가격, 상태 등을 관리하세요
        </p>
      </div>

      {/* Search Bar */}
      <form onSubmit={handleSearchSubmit} className="flex gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            type="text"
            placeholder="상품명으로 검색..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <Button type="submit">검색</Button>
      </form>

      {/* Stats */}
      <div className="text-sm text-gray-600">
        총 {total}개의 상품
      </div>

      {/* Products Table */}
      {products.length === 0 ? (
        <div className="border rounded-lg p-12 text-center">
          <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">아직 가져온 상품이 없습니다.</p>
          <p className="text-sm text-gray-500 mt-2">
            카탈로그에서 상품을 추가해보세요.
          </p>
        </div>
      ) : (
        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>상품명</TableHead>
                <TableHead>공급업체</TableHead>
                <TableHead className="text-right">공급가</TableHead>
                <TableHead className="text-right">판매가</TableHead>
                <TableHead className="text-right">마진율</TableHead>
                <TableHead className="text-center">동기화</TableHead>
                <TableHead className="text-center">상태</TableHead>
                <TableHead className="text-right">작업</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {products.map((product) => (
                <TableRow key={product.id}>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-3">
                      {product.thumbnailUrl && (
                        <img
                          src={product.thumbnailUrl}
                          alt={product.name}
                          className="w-10 h-10 object-cover rounded"
                        />
                      )}
                      <span className="line-clamp-1">{product.name}</span>
                    </div>
                  </TableCell>
                  <TableCell>{product.supplierName}</TableCell>
                  <TableCell className="text-right">
                    {product.basePrice.toLocaleString()}원
                  </TableCell>
                  <TableCell className="text-right font-medium text-blue-600">
                    {product.salePrice.toLocaleString()}원
                  </TableCell>
                  <TableCell className="text-right">
                    {(product.marginRate * 100).toFixed(1)}%
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge variant={product.syncPolicy === 'auto' ? 'default' : 'secondary'}>
                      {product.syncPolicy === 'auto' ? '자동' : '수동'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge variant={product.isActive ? 'default' : 'secondary'}>
                      {product.isActive ? '활성' : '비활성'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEdit(product)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(product.id, product.name)}
                        disabled={deleting === product.id}
                      >
                        {deleting === product.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Trash2 className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button
            variant="outline"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
          >
            이전
          </Button>
          <span className="text-sm text-gray-600">
            {page} / {totalPages}
          </span>
          <Button
            variant="outline"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
          >
            다음
          </Button>
        </div>
      )}

      {/* Edit Dialog */}
      <Dialog open={!!editingProduct} onOpenChange={() => setEditingProduct(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>상품 정보 수정</DialogTitle>
            <DialogDescription>
              {editingProduct?.name}의 판매가와 설정을 변경할 수 있습니다.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="salePrice">판매가 (원)</Label>
              <Input
                id="salePrice"
                type="number"
                value={editFormData.salePrice}
                onChange={(e) =>
                  setEditFormData({ ...editFormData, salePrice: parseFloat(e.target.value) })
                }
              />
              {editingProduct && (
                <p className="text-sm text-gray-500">
                  공급가: {editingProduct.basePrice.toLocaleString()}원 |
                  현재 마진율: {((editFormData.salePrice - editingProduct.basePrice) / editFormData.salePrice * 100).toFixed(1)}%
                </p>
              )}
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="isActive">상품 활성화</Label>
              <Switch
                id="isActive"
                checked={editFormData.isActive}
                onCheckedChange={(checked) =>
                  setEditFormData({ ...editFormData, isActive: checked })
                }
              />
            </div>

            <div className="space-y-2">
              <Label>가격 동기화 정책</Label>
              <div className="flex gap-4">
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="syncPolicy"
                    value="auto"
                    checked={editFormData.syncPolicy === 'auto'}
                    onChange={(e) =>
                      setEditFormData({ ...editFormData, syncPolicy: 'auto' })
                    }
                  />
                  <span className="text-sm">자동 (공급가 변경 시 자동 업데이트)</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="syncPolicy"
                    value="manual"
                    checked={editFormData.syncPolicy === 'manual'}
                    onChange={(e) =>
                      setEditFormData({ ...editFormData, syncPolicy: 'manual' })
                    }
                  />
                  <span className="text-sm">수동</span>
                </label>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingProduct(null)}>
              취소
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  저장 중...
                </>
              ) : (
                '저장'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
