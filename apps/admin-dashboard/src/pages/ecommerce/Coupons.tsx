import { FC, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Plus,
  Edit,
  Trash2,
  Copy,
  Ticket,
  Calendar,
  TrendingUp,
  AlertCircle,
  Users,
  CheckCircle,
  XCircle,
  Clock
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatCurrency } from '@/lib/utils';
import toast from 'react-hot-toast';
import api from '@/lib/api';
import { WordPressTable, WordPressTableColumn } from '@/components/common/WordPressTable';
import { BulkActionBar } from '@/components/common/BulkActionBar';

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
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [sortColumn, setSortColumn] = useState<string>('createdAt');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  // Fetch coupons
  const fetchCoupons = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '20',
        ...(statusFilter !== 'all' && { status: statusFilter })
      });

      const response = await api.get(`/v1/coupons?${params}`);
      setCoupons(response.data.data || []);
      setTotalPages(response.data.pagination?.totalPages || 1);
    } catch (error) {
      // Error log removed
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
      await api.delete(`/v1/coupons/${id}`);
      toast.success('Coupon deleted successfully');
      fetchCoupons();
    } catch (error) {
      // Error log removed
      toast.error('Failed to delete coupon');
    }
  };

  // Duplicate coupon
  const handleDuplicate = async (coupon: Coupon) => {
    try {
      const newCode = `${coupon.code}_COPY_${Date.now()}`;
      await api.post('/v1/coupons', {
        ...coupon,
        id: undefined,
        code: newCode,
        usedCount: 0
      });
      toast.success('Coupon duplicated successfully');
      fetchCoupons();
    } catch (error) {
      // Error log removed
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

  // Filter and sort coupons
  const filteredCoupons = coupons
    .filter(coupon => {
      const matchesSearch = coupon.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
        coupon.description?.toLowerCase().includes(searchTerm.toLowerCase());
      return matchesSearch;
    })
    .sort((a, b) => {
      let aValue: any = a[sortColumn as keyof Coupon];
      let bValue: any = b[sortColumn as keyof Coupon];
      
      if (sortColumn === 'discountValue') {
        aValue = a.discountType === 'percent' ? a.discountValue / 100 : a.discountValue;
        bValue = b.discountType === 'percent' ? b.discountValue / 100 : b.discountValue;
      }
      
      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
      return 0;
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

  // Bulk actions
  const handleBulkActivate = async () => {
    try {
      await Promise.all(
        selectedItems.map(id => 
          api.patch(`/v1/coupons/${id}`, { status: 'active' })
        )
      );
      toast.success(`${selectedItems.length}개 쿠폰이 활성화되었습니다`);
      setSelectedItems([]);
      fetchCoupons();
    } catch (error) {
      toast.error('쿠폰 활성화에 실패했습니다');
    }
  };

  const handleBulkDeactivate = async () => {
    try {
      await Promise.all(
        selectedItems.map(id => 
          api.patch(`/v1/coupons/${id}`, { status: 'inactive' })
        )
      );
      toast.success(`${selectedItems.length}개 쿠폰이 비활성화되었습니다`);
      setSelectedItems([]);
      fetchCoupons();
    } catch (error) {
      toast.error('쿠폰 비활성화에 실패했습니다');
    }
  };

  const handleBulkDelete = async () => {
    if (!window.confirm(`${selectedItems.length}개 쿠폰을 삭제하시겠습니까?`)) {
      return;
    }

    try {
      await Promise.all(
        selectedItems.map(id => api.delete(`/v1/coupons/${id}`))
      );
      toast.success(`${selectedItems.length}개 쿠폰이 삭제되었습니다`);
      setSelectedItems([]);
      fetchCoupons();
    } catch (error) {
      toast.error('쿠폰 삭제에 실패했습니다');
    }
  };

  const handleBulkExtend = async () => {
    const days = prompt('연장할 일수를 입력하세요 (예: 30)');
    if (!days || isNaN(Number(days))) return;

    try {
      await Promise.all(
        selectedItems.map(id => {
          const coupon = coupons.find(c => c.id === id);
          if (coupon?.validUntil) {
            const newDate = new Date(coupon.validUntil);
            newDate.setDate(newDate.getDate() + Number(days));
            return api.patch(`/v1/coupons/${id}`, { 
              validUntil: newDate.toISOString() 
            });
          }
          return Promise.resolve();
        })
      );
      toast.success(`${selectedItems.length}개 쿠폰 유효기간이 연장되었습니다`);
      setSelectedItems([]);
      fetchCoupons();
    } catch (error) {
      toast.error('유효기간 연장에 실패했습니다');
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return (
          <Badge className="bg-green-100 text-green-800">
            <CheckCircle className="w-3 h-3 mr-1" />
            활성
          </Badge>
        );
      case 'expired':
        return (
          <Badge className="bg-red-100 text-red-800">
            <XCircle className="w-3 h-3 mr-1" />
            만료
          </Badge>
        );
      case 'inactive':
        return (
          <Badge className="bg-gray-100 text-gray-800">
            <Clock className="w-3 h-3 mr-1" />
            비활성
          </Badge>
        );
      default:
        return <Badge>{status}</Badge>;
    }
  };

  // Table columns
  const columns: WordPressTableColumn[] = [
    {
      id: 'code',
      label: '쿠폰 코드',
      sortable: true,
      render: (coupon: Coupon) => (
        <div>
          <div className="font-medium text-gray-900">{coupon.code}</div>
          {coupon.description && (
            <div className="text-sm text-gray-500">{coupon.description}</div>
          )}
        </div>
      )
    },
    {
      id: 'discountValue',
      label: '할인',
      width: '120px',
      sortable: true,
      render: (coupon: Coupon) => (
        <div>
          <div className="font-medium">{getDiscountDisplay(coupon)}</div>
          {coupon.minOrderAmount && (
            <div className="text-xs text-gray-500">
              최소 {formatCurrency(coupon.minOrderAmount)}
            </div>
          )}
        </div>
      )
    },
    {
      id: 'usage',
      label: '사용 현황',
      width: '200px',
      render: (coupon: Coupon) => {
        const usagePercent = coupon.usageLimitPerCoupon 
          ? (coupon.usedCount / coupon.usageLimitPerCoupon) * 100
          : 0;
        
        return (
          <div className="space-y-1">
            <div className="flex justify-between text-sm">
              <span>{coupon.usedCount} / {coupon.usageLimitPerCoupon || '∞'}</span>
              <span className="text-gray-500">고객당 {coupon.usageLimitPerCustomer}회</span>
            </div>
            {coupon.usageLimitPerCoupon && (
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-blue-600 h-2 rounded-full"
                  style={{ width: `${Math.min(usagePercent, 100)}%` }}
                />
              </div>
            )}
          </div>
        );
      }
    },
    {
      id: 'validUntil',
      label: '유효 기간',
      width: '140px',
      sortable: true,
      render: (coupon: Coupon) => {
        if (!coupon.validUntil) {
          return <span className="text-gray-500">무제한</span>;
        }
        
        const daysLeft = Math.ceil(
          (new Date(coupon.validUntil).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
        );
        
        return (
          <div>
            <div className="flex items-center text-sm">
              <Calendar className="w-4 h-4 mr-1" />
              {new Date(coupon.validUntil).toLocaleDateString()}
            </div>
            {daysLeft > 0 && daysLeft <= 7 && (
              <div className="text-xs text-orange-600 font-medium">
                {daysLeft}일 남음
              </div>
            )}
          </div>
        );
      }
    },
    {
      id: 'status',
      label: '상태',
      width: '100px',
      render: (coupon: Coupon) => getStatusBadge(coupon.status)
    },
    {
      id: 'actions',
      label: '작업',
      width: '120px',
      render: (coupon: Coupon) => (
        <div className="flex gap-1">
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
      )
    }
  ];

  const handleSort = (columnId: string) => {
    if (sortColumn === columnId) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(columnId);
      setSortDirection('asc');
    }
  };

  return (
    <div className="wrap">
      {/* WordPress Header */}
      <h1 className="wp-heading-inline">쿠폰 관리</h1>
      <a href="#" className="page-title-action" onClick={(e) => {
        e.preventDefault();
        navigate('/ecommerce/coupons/new');
      }}>
        <Plus className="w-4 h-4 inline mr-1" />
        새 쿠폰 추가
      </a>
      <hr className="wp-header-end" />

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
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

      {/* Status Filter Tabs */}
      <ul className="subsubsub">
        <li>
          <a 
            href="#" 
            className={statusFilter === 'all' ? 'current' : ''}
            onClick={(e) => {
              e.preventDefault();
              setStatusFilter('all');
            }}
          >
            전체 <span className="count">({stats.total})</span>
          </a> |
        </li>
        <li>
          <a 
            href="#" 
            className={statusFilter === 'active' ? 'current' : ''}
            onClick={(e) => {
              e.preventDefault();
              setStatusFilter('active');
            }}
          >
            활성 <span className="count">({stats.active})</span>
          </a> |
        </li>
        <li>
          <a 
            href="#" 
            className={statusFilter === 'inactive' ? 'current' : ''}
            onClick={(e) => {
              e.preventDefault();
              setStatusFilter('inactive');
            }}
          >
            비활성 <span className="count">({coupons.filter(c => c.status === 'inactive').length})</span>
          </a> |
        </li>
        <li>
          <a 
            href="#" 
            className={statusFilter === 'expired' ? 'current' : ''}
            onClick={(e) => {
              e.preventDefault();
              setStatusFilter('expired');
            }}
          >
            만료됨 <span className="count">({stats.expired})</span>
          </a>
        </li>
      </ul>

      {/* Search Box */}
      <div className="wp-filter">
        <div className="search-box">
          <input
            type="search"
            className="wp-filter-search"
            placeholder="쿠폰 코드 또는 설명 검색..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* Bulk Actions */}
      {selectedItems.length > 0 && (
        <BulkActionBar
          selectedCount={selectedItems.length}
          actions={[
            { label: '활성화', onClick: handleBulkActivate },
            { label: '비활성화', onClick: handleBulkDeactivate },
            { label: '유효기간 연장', onClick: handleBulkExtend },
            { label: '삭제', onClick: handleBulkDelete, variant: 'danger' }
          ]}
          onCancel={() => setSelectedItems([])}
        />
      )}

      {/* WordPress Table */}
      <WordPressTable
        columns={columns}
        data={filteredCoupons}
        loading={loading}
        selectedItems={selectedItems}
        onSelectionChange={setSelectedItems}
        onSort={handleSort}
        sortColumn={sortColumn}
        sortDirection={sortDirection}
        emptyState={
          <div className="text-center py-12">
            <Ticket className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500 mb-4">쿠폰이 없습니다</p>
            <Button onClick={() => navigate('/ecommerce/coupons/new')}>
              첫 쿠폰 만들기
            </Button>
          </div>
        }
      />

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