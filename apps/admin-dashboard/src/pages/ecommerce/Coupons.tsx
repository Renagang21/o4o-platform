import { FC, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Plus,
  Search,
  Edit,
  Trash2,
  Copy,
  Ticket,
  Calendar,
  TrendingUp,
  AlertCircle,
  Users
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatCurrency } from '@/lib/utils';
import toast from 'react-hot-toast';
import api from '@/lib/api';

interface Coupon {
  id: string;
  code: string;
  description?: string;
  discountType: 'percent' | 'fixed_cart' | 'fixed_product';
  discountValue: number;
  minOrderAmount?: number;
  maxDiscountAmount?: number;
  validFrom?: string;
  validUntil?: string;
  usageLimitPerCoupon: number;
  usageLimitPerCustomer: number;
  usedCount: number;
  status: 'active' | 'inactive' | 'expired';
  freeShipping: boolean;
  individualUseOnly: boolean;
  createdAt: string;
  updatedAt: string;
}

const Coupons: FC = () => {
  const navigate = useNavigate();
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Fetch coupons
  const fetchCoupons = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '20',
        ...(statusFilter !== 'all' && { status: statusFilter })
      });

      const response = await api.get(`/coupons?${params}`);
      setCoupons(response.data.data || []);
      setTotalPages(response.data.pagination?.totalPages || 1);
    } catch (error) {
      console.error('Error fetching coupons:', error);
      toast.error('Failed to load coupons');
      
      // Use mock data for development
      setCoupons([
        {
          id: '1',
          code: 'WELCOME10',
          description: 'Welcome discount for new customers',
          discountType: 'percent',
          discountValue: 10,
          minOrderAmount: 50000,
          usageLimitPerCoupon: 100,
          usageLimitPerCustomer: 1,
          usedCount: 23,
          status: 'active',
          freeShipping: false,
          individualUseOnly: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        },
        {
          id: '2',
          code: 'SAVE5000',
          description: 'Fixed discount coupon',
          discountType: 'fixed_cart',
          discountValue: 5000,
          minOrderAmount: 30000,
          maxDiscountAmount: 5000,
          usageLimitPerCoupon: 50,
          usageLimitPerCustomer: 2,
          usedCount: 12,
          status: 'active',
          freeShipping: true,
          individualUseOnly: false,
          validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        },
        {
          id: '3',
          code: 'EXPIRED20',
          description: 'Expired promotional coupon',
          discountType: 'percent',
          discountValue: 20,
          usageLimitPerCoupon: 10,
          usageLimitPerCustomer: 1,
          usedCount: 10,
          status: 'expired',
          freeShipping: false,
          individualUseOnly: true,
          validUntil: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCoupons();
  }, [page, statusFilter]);

  // Delete coupon
  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this coupon?')) {
      return;
    }

    try {
      await api.delete(`/coupons/${id}`);
      toast.success('Coupon deleted successfully');
      fetchCoupons();
    } catch (error) {
      console.error('Error deleting coupon:', error);
      toast.error('Failed to delete coupon');
    }
  };

  // Duplicate coupon
  const handleDuplicate = async (coupon: Coupon) => {
    try {
      const newCode = `${coupon.code}_COPY_${Date.now()}`;
      await api.post('/coupons', {
        ...coupon,
        id: undefined,
        code: newCode,
        usedCount: 0
      });
      toast.success('Coupon duplicated successfully');
      fetchCoupons();
    } catch (error) {
      console.error('Error duplicating coupon:', error);
      toast.error('Failed to duplicate coupon');
    }
  };

  // Calculate statistics
  const stats = {
    total: coupons.length,
    active: coupons.filter(c => c.status === 'active').length,
    expired: coupons.filter(c => c.status === 'expired').length,
    totalUsage: coupons.reduce((sum, c) => sum + c.usedCount, 0)
  };

  // Filter coupons
  const filteredCoupons = coupons.filter(coupon => {
    const matchesSearch = coupon.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      coupon.description?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  const getDiscountDisplay = (coupon: Coupon) => {
    switch (coupon.discountType) {
      case 'percent':
        return `${coupon.discountValue}%`;
      case 'fixed_cart':
      case 'fixed_product':
        return formatCurrency(coupon.discountValue);
      default:
        return coupon.discountValue;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-green-100 text-green-800">Active</Badge>;
      case 'expired':
        return <Badge className="bg-red-100 text-red-800">Expired</Badge>;
      case 'inactive':
        return <Badge className="bg-gray-100 text-gray-800">Inactive</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">쿠폰 관리</h1>
          <p className="text-gray-600 mt-1">할인 쿠폰을 생성하고 관리하세요</p>
        </div>
        <div className="flex gap-3">
          <Button
            onClick={() => navigate('/ecommerce/coupons/new')}
          >
            <Plus className="w-4 h-4 mr-2" />
            새 쿠폰
          </Button>
        </div>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">전체 쿠폰</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
              <Ticket className="w-8 h-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">활성 쿠폰</p>
                <p className="text-2xl font-bold text-green-600">{stats.active}</p>
              </div>
              <TrendingUp className="w-8 h-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">만료된 쿠폰</p>
                <p className="text-2xl font-bold text-red-600">{stats.expired}</p>
              </div>
              <AlertCircle className="w-8 h-8 text-red-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">총 사용 횟수</p>
                <p className="text-2xl font-bold">{stats.totalUsage}</p>
              </div>
              <Users className="w-8 h-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="쿠폰 코드 또는 설명 검색..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">모든 상태</option>
              <option value="active">활성</option>
              <option value="inactive">비활성</option>
              <option value="expired">만료됨</option>
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Coupons Table */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-8 text-center">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
            </div>
          ) : filteredCoupons.length === 0 ? (
            <div className="p-8 text-center">
              <Ticket className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">쿠폰이 없습니다</p>
              <Button
                className="mt-4"
                onClick={() => navigate('/ecommerce/coupons/new')}
              >
                첫 쿠폰 만들기
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      쿠폰 코드
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      할인
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      사용 현황
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      유효 기간
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      상태
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      작업
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredCoupons.map((coupon) => (
                    <tr key={coupon.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {coupon.code}
                          </div>
                          {coupon.description && (
                            <div className="text-sm text-gray-500">
                              {coupon.description}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium">
                            {getDiscountDisplay(coupon)}
                          </div>
                          {coupon.minOrderAmount && (
                            <div className="text-xs text-gray-500">
                              최소 {formatCurrency(coupon.minOrderAmount)}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm">
                          {coupon.usedCount} / {coupon.usageLimitPerCoupon || '∞'}
                        </div>
                        <div className="text-xs text-gray-500">
                          고객당 {coupon.usageLimitPerCustomer}회
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {coupon.validUntil ? (
                          <div className="text-sm">
                            <Calendar className="w-4 h-4 inline mr-1" />
                            {new Date(coupon.validUntil).toLocaleDateString()}
                          </div>
                        ) : (
                          <span className="text-sm text-gray-500">무제한</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {getStatusBadge(coupon.status)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => navigate(`/ecommerce/coupons/${coupon.id}/edit`)}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleDuplicate(coupon)}
                          >
                            <Copy className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleDelete(coupon.id)}
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center gap-2">
          <Button
            variant="outline"
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
          >
            이전
          </Button>
          <span className="flex items-center px-4">
            {page} / {totalPages}
          </span>
          <Button
            variant="outline"
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
          >
            다음
          </Button>
        </div>
      )}
    </div>
  );
};

export default Coupons;