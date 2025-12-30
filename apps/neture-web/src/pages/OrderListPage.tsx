/**
 * Order List Page
 *
 * Phase G-3: 주문/결제 플로우 구현
 * 내 주문 내역 조회
 */

import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://api.neture.co.kr/api/v1';

interface OrderItem {
  id: string;
  product_id: string;
  product_name: string;
  product_image: { url: string; alt?: string } | null;
  quantity: number;
  unit_price: number;
  total_price: number;
}

interface Order {
  id: string;
  order_number: string;
  status: string;
  total_amount: number;
  discount_amount: number;
  shipping_fee: number;
  final_amount: number;
  orderer_name: string;
  created_at: string;
  items?: OrderItem[];
}

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  created: { label: '결제 대기', color: 'bg-yellow-100 text-yellow-800' },
  pending_payment: { label: '결제 대기', color: 'bg-yellow-100 text-yellow-800' },
  paid: { label: '결제 완료', color: 'bg-blue-100 text-blue-800' },
  preparing: { label: '상품 준비중', color: 'bg-indigo-100 text-indigo-800' },
  shipped: { label: '배송중', color: 'bg-purple-100 text-purple-800' },
  delivered: { label: '배송 완료', color: 'bg-green-100 text-green-800' },
  cancelled: { label: '취소됨', color: 'bg-gray-100 text-gray-800' },
  refunded: { label: '환불됨', color: 'bg-red-100 text-red-800' },
};

export default function OrderListPage() {
  const navigate = useNavigate();
  const { isAuthenticated, isLoading: authLoading } = useAuth();

  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 인증 확인
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      navigate('/login', { state: { from: '/orders' } });
    }
  }, [authLoading, isAuthenticated, navigate]);

  // 주문 목록 조회
  useEffect(() => {
    if (!isAuthenticated) return;

    const fetchOrders = async () => {
      try {
        const token = localStorage.getItem('accessToken');
        const response = await axios.get<{ data: Order[] }>(`${API_BASE_URL}/neture/orders`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setOrders(response.data.data);
      } catch (err: any) {
        console.error('Failed to fetch orders:', err);
        setError(err.response?.data?.error?.message || '주문 내역을 불러오는데 실패했습니다.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchOrders();
  }, [isAuthenticated]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">주문 내역</h1>
          <p className="text-gray-600 mt-1">주문하신 상품의 배송 상태를 확인하세요.</p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
            {error}
          </div>
        )}

        {orders.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm p-12 text-center">
            <svg
              className="w-16 h-16 mx-auto text-gray-300 mb-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
              />
            </svg>
            <h2 className="text-xl font-medium text-gray-900 mb-2">
              주문 내역이 없습니다
            </h2>
            <p className="text-gray-500 mb-6">
              마음에 드는 상품을 주문해보세요
            </p>
            <Link
              to="/products"
              className="inline-block bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors"
            >
              상품 둘러보기
            </Link>
          </div>
        ) : (
          <div className="space-y-6">
            {orders.map((order) => {
              const statusInfo = STATUS_LABELS[order.status] || {
                label: order.status,
                color: 'bg-gray-100 text-gray-800',
              };

              return (
                <div key={order.id} className="bg-white rounded-lg shadow-sm overflow-hidden">
                  {/* Order Header */}
                  <div className="p-4 bg-gray-50 border-b flex flex-wrap items-center justify-between gap-4">
                    <div>
                      <p className="text-sm text-gray-500">주문번호</p>
                      <p className="font-medium text-gray-900">{order.order_number}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-gray-500">{formatDate(order.created_at)}</p>
                      <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${statusInfo.color}`}>
                        {statusInfo.label}
                      </span>
                    </div>
                  </div>

                  {/* Order Items */}
                  <div className="p-4">
                    {order.items && order.items.length > 0 ? (
                      <div className="space-y-3">
                        {order.items.slice(0, 2).map((item) => (
                          <div key={item.id} className="flex items-center gap-4">
                            <div className="w-16 h-16 bg-gray-100 rounded overflow-hidden flex-shrink-0">
                              {item.product_image?.url ? (
                                <img
                                  src={item.product_image.url}
                                  alt={item.product_name}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs">
                                  No Image
                                </div>
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-gray-900 line-clamp-1">{item.product_name}</p>
                              <p className="text-sm text-gray-500">
                                {item.unit_price.toLocaleString()}원 x {item.quantity}개
                              </p>
                            </div>
                            <p className="font-medium text-gray-900">
                              {item.total_price.toLocaleString()}원
                            </p>
                          </div>
                        ))}
                        {order.items.length > 2 && (
                          <p className="text-sm text-gray-500 text-center">
                            외 {order.items.length - 2}개 상품
                          </p>
                        )}
                      </div>
                    ) : (
                      <p className="text-gray-500">상품 정보를 불러올 수 없습니다.</p>
                    )}
                  </div>

                  {/* Order Footer */}
                  <div className="p-4 border-t flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-500">총 결제금액</p>
                      <p className="text-lg font-bold text-blue-600">
                        {order.final_amount.toLocaleString()}원
                      </p>
                    </div>
                    <div className="flex gap-2">
                      {order.status === 'created' && (
                        <Link
                          to={`/checkout/payment/${order.id}`}
                          className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
                        >
                          결제하기
                        </Link>
                      )}
                      <Link
                        to={`/orders/${order.id}`}
                        className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50"
                      >
                        상세보기
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
