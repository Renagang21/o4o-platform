/**
 * Phase PD-4: Supplier Orders Page
 *
 * Allows suppliers to view orders for their products
 */

import { useState, useEffect } from 'react';
import { authClient } from '@o4o/auth-client';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Search, Package } from 'lucide-react';

interface Order {
  id: string;
  orderNumber: string;
  buyerName: string;
  status: string;
  paymentStatus: string;
  summary: {
    total: number;
  };
  orderDate: string;
  items: Array<{
    id: string;
    productName: string;
    quantity: number;
    unitPrice: number;
    sellerName: string;
    basePriceSnapshot?: number;
  }>;
}

interface OrdersResponse {
  success: boolean;
  orders: Order[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export default function SupplierOrders() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const { toast } = useToast();

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '20',
        ...(search && { search }),
      });

      const response = await authClient.api.get<OrdersResponse>(
        `/v2/supplier/orders?${params.toString()}`
      );
      const responseData = response.data;

      if (responseData.success && responseData.orders) {
        setOrders(responseData.orders);
        setTotalPages(responseData.totalPages);
        setTotal(responseData.total);
      }
    } catch (error) {
      console.error('Failed to fetch orders:', error);
      toast({
        title: '오류',
        description: '주문 목록을 불러오는데 실패했습니다.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, [page, search]);

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'destructive'> = {
      pending: 'secondary',
      confirmed: 'default',
      processing: 'default',
      shipped: 'default',
      delivered: 'default',
      cancelled: 'destructive',
    };
    return <Badge variant={variants[status] || 'secondary'}>{status}</Badge>;
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchOrders();
  };

  if (loading && orders.length === 0) {
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
        <h1 className="text-3xl font-bold text-gray-900">공급 주문 관리</h1>
        <p className="mt-2 text-gray-600">
          내 상품이 포함된 주문을 확인하고 처리하세요
        </p>
      </div>

      {/* Search Bar */}
      <form onSubmit={handleSearchSubmit} className="flex gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            type="text"
            placeholder="주문번호 또는 구매자명으로 검색..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <Button type="submit">검색</Button>
      </form>

      {/* Stats */}
      <div className="text-sm text-gray-600">
        총 {total}개의 주문
      </div>

      {/* Orders Table */}
      {orders.length === 0 ? (
        <div className="border rounded-lg p-12 text-center">
          <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">아직 주문이 없습니다.</p>
        </div>
      ) : (
        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>주문번호</TableHead>
                <TableHead>판매자</TableHead>
                <TableHead>상품</TableHead>
                <TableHead className="text-right">공급가</TableHead>
                <TableHead className="text-center">상태</TableHead>
                <TableHead>주문일시</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {orders.map((order) => (
                <TableRow key={order.id}>
                  <TableCell className="font-medium">
                    {order.orderNumber}
                  </TableCell>
                  <TableCell>
                    {order.items[0]?.sellerName || 'N/A'}
                  </TableCell>
                  <TableCell>
                    <div className="max-w-xs">
                      {order.items.map((item, idx) => (
                        <div key={idx} className="text-sm">
                          {item.productName} x {item.quantity}
                        </div>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    {order.items.reduce((sum, item) => sum + (item.basePriceSnapshot || 0) * item.quantity, 0).toLocaleString()}원
                  </TableCell>
                  <TableCell className="text-center">
                    {getStatusBadge(order.status)}
                  </TableCell>
                  <TableCell>
                    {new Date(order.orderDate).toLocaleDateString('ko-KR')}
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
    </div>
  );
}
