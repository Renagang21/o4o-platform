/**
 * Phase PD-3: Seller Product Catalog Page
 *
 * Allows sellers to browse and import supplier products into their catalog
 */

import { useState, useEffect } from 'react';
import { authClient } from '@o4o/auth-client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Plus, Check, Search, Package } from 'lucide-react';

interface CatalogProduct {
  id: string;
  name: string;
  description: string;
  supplierName: string;
  supplierId: string;
  basePrice: number;
  recommendedPrice: number;
  currency: string;
  thumbnailUrl: string | null;
  status: string;
  inventory: number;
  isImported: boolean;
  sellerProductId: string | null;
  isActive: boolean;
}

interface CatalogResponse {
  success: boolean;
  items: CatalogProduct[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export default function SellerCatalog() {
  const [products, setProducts] = useState<CatalogProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [importingIds, setImportingIds] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const { toast } = useToast();

  const fetchCatalog = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '12',
        ...(search && { search }),
      });

      const response = await authClient.api.get<CatalogResponse>(
        `/v2/seller/catalog?${params.toString()}`
      );
      const responseData = response.data;

      if (responseData.success && responseData.items) {
        setProducts(responseData.items);
        setTotalPages(responseData.totalPages);
        setTotal(responseData.total);
      }
    } catch (error) {
      console.error('Failed to fetch catalog:', error);
      toast({
        title: '오류',
        description: '카탈로그를 불러오는데 실패했습니다.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCatalog();
  }, [page, search]);

  const handleImport = async (product: CatalogProduct) => {
    try {
      setImportingIds((prev) => new Set(prev).add(product.id));

      const importResponse = await authClient.api.post<{ success: boolean; data: any }>(
        '/v2/seller/catalog/import',
        {
          productId: product.id,
          // Use default 20% margin rate
          marginRate: 0.20,
          syncPolicy: 'auto',
        }
      );

      if (importResponse.data.success) {
        toast({
          title: '성공',
          description: `${product.name}을(를) 성공적으로 가져왔습니다.`,
        });
        // Refresh catalog to update import status
        fetchCatalog();
      }
    } catch (error: any) {
      console.error('Failed to import product:', error);
      const message = error.response?.data?.error || '상품 가져오기에 실패했습니다.';
      toast({
        title: '오류',
        description: message,
        variant: 'destructive',
      });
    } finally {
      setImportingIds((prev) => {
        const next = new Set(prev);
        next.delete(product.id);
        return next;
      });
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1); // Reset to first page on search
    fetchCatalog();
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
        <h1 className="text-3xl font-bold text-gray-900">상품 카탈로그</h1>
        <p className="mt-2 text-gray-600">
          공급업체 상품을 검색하고 내 카탈로그에 추가하세요
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

      {/* Product Grid */}
      {products.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Package className="h-12 w-12 text-gray-400 mb-4" />
            <p className="text-gray-600">검색 결과가 없습니다.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {products.map((product) => (
            <Card key={product.id} className="flex flex-col">
              <CardHeader>
                {product.thumbnailUrl && (
                  <img
                    src={product.thumbnailUrl}
                    alt={product.name}
                    className="w-full h-48 object-cover rounded-lg mb-4"
                  />
                )}
                <CardTitle className="line-clamp-2">{product.name}</CardTitle>
                <CardDescription className="line-clamp-3">
                  {product.description}
                </CardDescription>
              </CardHeader>
              <CardContent className="flex-1 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">공급업체</span>
                  <span className="font-medium">{product.supplierName}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">공급가</span>
                  <span className="font-medium">
                    {product.basePrice.toLocaleString()} {product.currency}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">권장 판매가</span>
                  <span className="font-medium text-blue-600">
                    {product.recommendedPrice.toLocaleString()} {product.currency}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">재고</span>
                  <span className="font-medium">{product.inventory}개</span>
                </div>
              </CardContent>
              <CardFooter>
                {product.isImported ? (
                  <Button variant="outline" className="w-full" disabled>
                    <Check className="h-4 w-4 mr-2" />
                    가져온 상품
                  </Button>
                ) : (
                  <Button
                    onClick={() => handleImport(product)}
                    disabled={importingIds.has(product.id)}
                    className="w-full"
                  >
                    {importingIds.has(product.id) ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        가져오는 중...
                      </>
                    ) : (
                      <>
                        <Plus className="h-4 w-4 mr-2" />
                        내 카탈로그에 추가
                      </>
                    )}
                  </Button>
                )}
              </CardFooter>
            </Card>
          ))}
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
    </div>
  );
}
