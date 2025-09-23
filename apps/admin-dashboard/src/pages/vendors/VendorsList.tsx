import { ChangeEvent, useState } from 'react';
import { Store, UserCheck, Clock, Ban, Search, Filter, MoreVertical, DollarSign, Star, Eye, Edit2, CheckCircle, XCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { WordPressTable, WordPressTableColumn, WordPressTableRow } from '@/components/common/WordPressTable';
import { BulkActionBar } from '@/components/common/BulkActionBar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { formatDate } from '@/lib/utils';
import toast from 'react-hot-toast';

interface Vendor {
  id: string;
  name: string;
  email: string;
  businessName: string;
  status: 'active' | 'pending' | 'suspended';
  products: number;
  revenue: number;
  commission: number;
  joinedAt: string;
  lastActivity: string;
  rating: number;
  reviewCount: number;
  tier: 'bronze' | 'silver' | 'gold' | 'platinum';
  avatar?: string;
}

// Vendor data will be fetched from API

const VendorsList = () => {
  const [vendors] = useState<Vendor[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [tierFilter, setTierFilter] = useState('all');
  const [selectedRows, setSelectedRows] = useState<string[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  const filteredVendors = vendors.filter((vendor: any) => {
    const matchesSearch = vendor.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         vendor.businessName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         vendor.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || vendor.status === statusFilter;
    const matchesTier = tierFilter === 'all' || vendor.tier === tierFilter;
    return matchesSearch && matchesStatus && matchesTier;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return (
          <Badge variant="default" className="flex items-center gap-1">
            <UserCheck className="w-3 h-3" />
            활성
          </Badge>
        );
      case 'pending':
        return (
          <Badge variant="secondary" className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            승인 대기
          </Badge>
        );
      case 'suspended':
        return (
          <Badge variant="destructive" className="flex items-center gap-1">
            <Ban className="w-3 h-3" />
            정지
          </Badge>
        );
      default:
        return null;
    }
  };

  const getTierBadge = (tier: string) => {
    const tierConfig = {
      bronze: { label: '브론즈', className: 'bg-amber-100 text-amber-800' },
      silver: { label: '실버', className: 'bg-gray-100 text-gray-800' },
      gold: { label: '골드', className: 'bg-yellow-100 text-yellow-800' },
      platinum: { label: '플래티넘', className: 'bg-purple-100 text-purple-800' }
    };
    
    const config = tierConfig[tier as keyof typeof tierConfig];
    if (!config) return null;
    
    return (
      <span className={`px-2 py-1 text-xs font-medium rounded-full ${config.className}`}>
        {config.label}
      </span>
    );
  };

  // Bulk actions configuration
  const bulkActions = [
    {
      value: 'approve',
      label: '승인',
      action: async (ids: string[]) => {
        setIsProcessing(true);
        try {
          // API call would go here
          await new Promise(resolve => setTimeout(resolve, 1000));
          toast.success(`${ids.length}개 판매자가 승인되었습니다.`);
        } catch (error) {
          toast.error('승인 처리 중 오류가 발생했습니다.');
        } finally {
          setIsProcessing(false);
          setSelectedRows([]);
        }
      }
    },
    {
      value: 'suspend',
      label: '정지',
      action: async (ids: string[]) => {
        if (!confirm(`${ids.length}개 판매자를 정지하시겠습니까?`)) return;
        setIsProcessing(true);
        try {
          // API call would go here
          await new Promise(resolve => setTimeout(resolve, 1000));
          toast.success(`${ids.length}개 판매자가 정지되었습니다.`);
        } catch (error) {
          toast.error('정지 처리 중 오류가 발생했습니다.');
        } finally {
          setIsProcessing(false);
          setSelectedRows([]);
        }
      },
      confirmMessage: '{count}개 판매자를 정지하시겠습니까?',
      isDestructive: true
    },
    {
      value: 'export',
      label: '내보내기',
      action: async (ids: string[]) => {
        toast.success('선택한 판매자 정보를 내보내는 중입니다.');
      }
    }
  ];

  // Table columns configuration
  const columns: WordPressTableColumn[] = [
    {
      id: 'vendor',
      label: '판매자 정보',
      sortable: true
    },
    {
      id: 'status',
      label: '상태',
      width: '120px'
    },
    {
      id: 'tier',
      label: '등급',
      width: '100px'
    },
    {
      id: 'products',
      label: '상품 수',
      sortable: true,
      width: '80px',
      align: 'center'
    },
    {
      id: 'revenue',
      label: '매출액',
      sortable: true,
      width: '120px'
    },
    {
      id: 'rating',
      label: '평점',
      sortable: true,
      width: '100px',
      align: 'center'
    },
    {
      id: 'joined',
      label: '가입일',
      sortable: true,
      width: '120px'
    },
    {
      id: 'lastActivity',
      label: '마지막 활동',
      sortable: true,
      width: '120px'
    }
  ];

  // Transform vendors to table rows
  const rows: WordPressTableRow[] = filteredVendors.map((vendor: Vendor) => ({
    id: vendor.id,
    data: {
      vendor: (
        <div className="flex items-center">
          <div className="flex-shrink-0 h-10 w-10">
            {vendor.avatar ? (
              <img className="h-10 w-10 rounded-full" src={vendor.avatar} alt="" />
            ) : (
              <div className="h-10 w-10 bg-blue-100 rounded-full flex items-center justify-center">
                <Store className="h-5 w-5 text-blue-600" />
              </div>
            )}
          </div>
          <div className="ml-4">
            <div className="text-sm font-medium text-gray-900">
              {vendor.businessName}
            </div>
            <div className="text-sm text-gray-500">
              {vendor.name} ({vendor.email})
            </div>
          </div>
        </div>
      ),
      status: getStatusBadge(vendor.status),
      tier: getTierBadge(vendor.tier),
      products: (
        <span className="text-center block font-mono">
          {vendor.products}
        </span>
      ),
      revenue: (
        <div className="text-sm">
          ₩{vendor.revenue.toLocaleString()}
        </div>
      ),
      rating: vendor.rating > 0 ? (
        <div className="flex items-center justify-center">
          <Star className="h-4 w-4 text-yellow-400 fill-current" />
          <span className="ml-1 text-sm">{vendor.rating}</span>
          <span className="ml-1 text-xs text-gray-500">({vendor.reviewCount})</span>
        </div>
      ) : (
        <span className="text-gray-400 text-center block">—</span>
      ),
      joined: (
        <div className="text-sm text-gray-600">
          {formatDate(vendor.joinedAt)}
        </div>
      ),
      lastActivity: (
        <div className="text-sm text-gray-600">
          {formatDate(vendor.lastActivity)}
        </div>
      )
    },
    actions: [
      {
        label: '상세보기',
        onClick: () => {
          // Navigate to vendor detail
          window.location.href = `/vendors/${vendor.id}`;
        }
      },
      {
        label: '편집',
        onClick: () => {
          // Navigate to vendor edit
          window.location.href = `/vendors/${vendor.id}/edit`;
        }
      },
      ...(vendor.status === 'pending' ? [
        {
          label: '승인',
          onClick: () => {
            if (confirm('이 판매자를 승인하시겠습니까?')) {
              toast.success('판매자가 승인되었습니다.');
            }
          }
        },
        {
          label: '거부',
          onClick: () => {
            if (confirm('이 판매자 신청을 거부하시겠습니까?')) {
              toast.success('판매자 신청이 거부되었습니다.');
            }
          },
          className: 'text-red-600'
        }
      ] : []),
      ...(vendor.status === 'active' ? [
        {
          label: '정지',
          onClick: () => {
            if (confirm('이 판매자를 정지하시겠습니까?')) {
              toast.success('판매자가 정지되었습니다.');
            }
          },
          className: 'text-red-600'
        }
      ] : []),
      ...(vendor.status === 'suspended' ? [
        {
          label: '정지 해제',
          onClick: () => {
            if (confirm('이 판매자의 정지를 해제하시겠습니까?')) {
              toast.success('판매자 정지가 해제되었습니다.');
            }
          }
        }
      ] : [])
    ]
  }));

  // Handle row selection
  const handleSelectRow = (rowId: string, selected: boolean) => {
    if (selected) {
      setSelectedRows([...selectedRows, rowId]);
    } else {
      setSelectedRows(selectedRows.filter(id => id !== rowId));
    }
  };

  const handleSelectAll = (selected: boolean) => {
    if (selected) {
      setSelectedRows(filteredVendors.map((v: Vendor) => v.id));
    } else {
      setSelectedRows([]);
    }
  };

  return (
    <div className="wrap">
      <h1 className="wp-heading-inline">판매자 관리</h1>
      <Link to="/vendors/new" className="page-title-action">
        새 판매자 추가
      </Link>
      <hr className="wp-header-end" />

      {/* Status Filter Links */}
      <ul className="subsubsub">
        <li className="all">
          <a 
            href="#" 
            className={statusFilter === 'all' ? 'current' : ''}
            onClick={(e) => { e.preventDefault(); setStatusFilter('all'); }}
          >
            전체 <span className="count">({vendors.length})</span>
          </a> |
        </li>
        <li className="active">
          <a 
            href="#" 
            className={statusFilter === 'active' ? 'current' : ''}
            onClick={(e) => { e.preventDefault(); setStatusFilter('active'); }}
          >
            활성 <span className="count">({vendors.filter(v => v.status === 'active').length})</span>
          </a> |
        </li>
        <li className="pending">
          <a 
            href="#" 
            className={statusFilter === 'pending' ? 'current' : ''}
            onClick={(e) => { e.preventDefault(); setStatusFilter('pending'); }}
          >
            승인 대기 <span className="count">({vendors.filter(v => v.status === 'pending').length})</span>
          </a> |
        </li>
        <li className="suspended">
          <a 
            href="#" 
            className={statusFilter === 'suspended' ? 'current' : ''}
            onClick={(e) => { e.preventDefault(); setStatusFilter('suspended'); }}
          >
            정지 <span className="count">({vendors.filter(v => v.status === 'suspended').length})</span>
          </a>
        </li>
      </ul>

      {/* Filters */}
      <div className="wp-filter">
        <div className="filter-items">
          <Select value={tierFilter} onValueChange={setTierFilter}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="모든 등급" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">모든 등급</SelectItem>
              <SelectItem value="bronze">브론즈</SelectItem>
              <SelectItem value="silver">실버</SelectItem>
              <SelectItem value="gold">골드</SelectItem>
              <SelectItem value="platinum">플래티넘</SelectItem>
            </SelectContent>
          </Select>
          
          <div className="search-box">
            <Input
              type="search"
              placeholder="판매자 검색..."
              value={searchTerm}
              onChange={(e: any) => setSearchTerm(e.target.value)}
              className="w-[300px]"
            />
            <Button variant="secondary">
              판매자 검색
            </Button>
          </div>
        </div>
      </div>

      {/* Bulk Actions - Top */}
      <BulkActionBar
        actions={bulkActions}
        selectedCount={selectedRows.length}
        onActionExecute={async (action) => {
          const actionConfig = bulkActions.find(a => a.value === action);
          if (actionConfig) {
            await actionConfig.action(selectedRows);
          }
        }}
        isProcessing={isProcessing}
        position="top"
      />

      {/* WordPress Table */}
      <WordPressTable
        columns={columns}
        rows={rows}
        selectable={true}
        selectedRows={selectedRows}
        onSelectRow={handleSelectRow}
        onSelectAll={handleSelectAll}
        emptyMessage="등록된 판매자가 없습니다. 새 판매자를 추가해보세요!"
      />

      {/* Bulk Actions - Bottom */}
      <BulkActionBar
        actions={bulkActions}
        selectedCount={selectedRows.length}
        onActionExecute={async (action) => {
          const actionConfig = bulkActions.find(a => a.value === action);
          if (actionConfig) {
            await actionConfig.action(selectedRows);
          }
        }}
        isProcessing={isProcessing}
        position="bottom"
      />
    </div>
  );
};

export default VendorsList;