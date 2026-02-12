import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ChevronDown,
  ChevronUp,
  Settings,
  Store,
  DollarSign,
  Package,
  Star,
  Calendar,
  Search,
  UserCheck,
  Clock,
  Ban,
  AlertCircle
} from 'lucide-react';
import AdminBreadcrumb from '@/components/common/AdminBreadcrumb';
import toast from 'react-hot-toast';
import { authClient } from '@o4o/auth-client';

type VendorStatus = 'active' | 'pending' | 'suspended' | 'trash';
type VendorTab = 'all' | 'active' | 'pending' | 'suspended' | 'trash';
type SortField = 'businessName' | 'revenue' | 'joinedAt' | 'products' | null;
type SortOrder = 'asc' | 'desc';

interface Vendor {
  id: string;
  name: string;
  email: string;
  businessName: string;
  status: VendorStatus;
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

const VendorsAdmin = () => {
  const navigate = useNavigate();
  
  const [activeTab, setActiveTab] = useState<VendorTab>(() => {
    const saved = sessionStorage.getItem('vendors-active-tab');
    return (saved as VendorTab) || 'all';
  });
  
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedVendors, setSelectedVendors] = useState<Set<string>>(new Set());
  const [hoveredRow, setHoveredRow] = useState<string | null>(null);
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [showBulkActions, setShowBulkActions] = useState(false);
  const [showScreenOptions, setShowScreenOptions] = useState(false);
  const [selectedBulkAction, setSelectedBulkAction] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  
  const [sortField, setSortField] = useState<SortField>(null);
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [quickEditId, setQuickEditId] = useState<string | null>(null);
  const [quickEditData, setQuickEditData] = useState({
    businessName: '',
    status: 'active' as VendorStatus,
    tier: 'bronze' as Vendor['tier'],
    commission: 0
  });
  
  const [visibleColumns, setVisibleColumns] = useState(() => {
    const saved = localStorage.getItem('vendors-visible-columns');
    return saved ? JSON.parse(saved) : {
      avatar: true,
      tier: true,
      products: true,
      revenue: true,
      rating: true,
      commission: true,
      lastActivity: true,
      status: true
    };
  });
  
  const [itemsPerPage, setItemsPerPage] = useState(() => {
    const saved = localStorage.getItem('vendors-items-per-page');
    return saved ? parseInt(saved) : 20;
  });

  // Fetch vendors from database
  useEffect(() => {
    const fetchVendors = async () => {
      try {
        setLoading(true);

        const response = await authClient.api.get('/vendors');
        const data = response.data;
        const vendorsArray = data.data || data.vendors || [];
        
        // Transform API data to match Vendor interface
        const transformedVendors = vendorsArray.map((vendor: any) => {
          // Determine tier based on revenue or other metrics
          let tier: 'bronze' | 'silver' | 'gold' | 'platinum' = 'bronze';
          const revenue = vendor.revenue || vendor.total_revenue || 0;
          if (revenue > 50000000) tier = 'platinum';
          else if (revenue > 20000000) tier = 'gold';
          else if (revenue > 5000000) tier = 'silver';
          
          return {
            id: vendor.id,
            name: vendor.contactName || vendor.contact_name || vendor.name || 'Unknown',
            email: vendor.email || '',
            businessName: vendor.businessName || vendor.business_name || vendor.company_name || 'Unknown Business',
            status: vendor.status || 'pending',
            products: vendor.productCount || vendor.product_count || vendor.products || 0,
            revenue: revenue,
            commission: vendor.commissionRate || vendor.commission_rate || vendor.commission || 10,
            joinedAt: vendor.joinedAt || vendor.createdAt || vendor.created_at || new Date().toISOString(),
            lastActivity: vendor.lastActivity || vendor.last_activity || vendor.updatedAt || new Date().toISOString(),
            rating: vendor.rating || vendor.average_rating || 0,
            reviewCount: vendor.reviewCount || vendor.review_count || vendor.reviews || 0,
            tier: vendor.tier || tier
          };
        });
        
        setVendors(transformedVendors);
      } catch (error) {
        toast.error('판매자 목록을 불러오는데 실패했습니다.');
        setVendors([]);
      } finally {
        setLoading(false);
      }
    };
    
    fetchVendors();
  }, []);

  useEffect(() => {
    sessionStorage.setItem('vendors-active-tab', activeTab);
  }, [activeTab]);

  useEffect(() => {
    return () => {
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    localStorage.setItem('vendors-visible-columns', JSON.stringify(visibleColumns));
  }, [visibleColumns]);

  useEffect(() => {
    localStorage.setItem('vendors-items-per-page', itemsPerPage.toString());
  }, [itemsPerPage]);

  const handleColumnToggle = (column: string) => {
    setVisibleColumns((prev: any) => ({
      ...prev,
      [column]: !prev[column]
    }));
  };

  const handleItemsPerPageChange = (value: string) => {
    const num = parseInt(value) || 20;
    if (num < 1) {
      setItemsPerPage(1);
    } else if (num > 999) {
      setItemsPerPage(999);
    } else {
      setItemsPerPage(num);
    }
  };

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedVendors(new Set(getFilteredVendors().map(v => v.id)));
    } else {
      setSelectedVendors(new Set());
    }
  };

  const handleSelectVendor = (id: string) => {
    const newSelection = new Set(selectedVendors);
    if (newSelection.has(id)) {
      newSelection.delete(id);
    } else {
      newSelection.add(id);
    }
    setSelectedVendors(newSelection);
  };

  const handleAddNew = () => {
    navigate('/vendors/new');
  };

  const handleEdit = (id: string) => {
    navigate(`/vendors/${id}/edit`);
  };

  const handleQuickEdit = (id: string) => {
    const vendor = vendors.find(v => v.id === id);
    if (vendor) {
      setQuickEditId(id);
      setQuickEditData({
        businessName: vendor.businessName,
        status: vendor.status,
        tier: vendor.tier,
        commission: vendor.commission
      });
    }
  };

  const handleSaveQuickEdit = async () => {
    if (quickEditId) {
      try {
        // API call would go here
        setVendors(vendors.map(vendor => 
          vendor.id === quickEditId
            ? {
                ...vendor,
                businessName: quickEditData.businessName,
                status: quickEditData.status,
                tier: quickEditData.tier,
                commission: quickEditData.commission
              }
            : vendor
        ));
        setQuickEditId(null);
        toast.success('판매자 정보가 업데이트되었습니다.');
      } catch {
        toast.error('업데이트에 실패했습니다.');
      }
    }
  };

  const handleCancelQuickEdit = () => {
    setQuickEditId(null);
    setQuickEditData({
      businessName: '',
      status: 'active',
      tier: 'bronze',
      commission: 0
    });
  };

  const handleApprove = async (id: string) => {
    if (confirm('이 판매자를 승인하시겠습니까?')) {
      setVendors(vendors.map(v => 
        v.id === id ? { ...v, status: 'active' as VendorStatus } : v
      ));
      toast.success('판매자가 승인되었습니다.');
    }
  };

  const handleSuspend = async (id: string) => {
    if (confirm('이 판매자를 정지하시겠습니까?')) {
      setVendors(vendors.map(v => 
        v.id === id ? { ...v, status: 'suspended' as VendorStatus } : v
      ));
      toast.success('판매자가 정지되었습니다.');
    }
  };

  const handleTrash = async (id: string) => {
    if (confirm('이 판매자를 휴지통으로 이동하시겠습니까?')) {
      setVendors(vendors.map(v => 
        v.id === id ? { ...v, status: 'trash' as VendorStatus } : v
      ));
      toast.success('휴지통으로 이동되었습니다.');
    }
  };

  const handleRestore = async (id: string) => {
    if (confirm('이 판매자를 복원하시겠습니까?')) {
      setVendors(vendors.map(v => 
        v.id === id ? { ...v, status: 'active' as VendorStatus } : v
      ));
      toast.success('판매자가 복원되었습니다.');
    }
  };

  const handlePermanentDelete = async (id: string) => {
    if (confirm('이 판매자를 영구적으로 삭제하시겠습니까? 이 작업은 취소할 수 없습니다.')) {
      setVendors(vendors.filter(v => v.id !== id));
      toast.success('판매자가 삭제되었습니다.');
    }
  };

  const handleView = (id: string) => {
    window.open(`/vendors/${id}`, '_blank');
  };

  const handleApplyBulkAction = async () => {
    if (!selectedBulkAction) {
      alert('작업을 선택해주세요.');
      return;
    }
    
    if (selectedVendors.size === 0) {
      alert('판매자를 선택해주세요.');
      return;
    }
    
    if (selectedBulkAction === 'approve') {
      setVendors(vendors.map(v => 
        selectedVendors.has(v.id) ? { ...v, status: 'active' as VendorStatus } : v
      ));
      toast.success(`${selectedVendors.size}개 판매자가 승인되었습니다.`);
    } else if (selectedBulkAction === 'suspend') {
      if (confirm(`선택한 ${selectedVendors.size}개 판매자를 정지하시겠습니까?`)) {
        setVendors(vendors.map(v => 
          selectedVendors.has(v.id) ? { ...v, status: 'suspended' as VendorStatus } : v
        ));
        toast.success(`${selectedVendors.size}개 판매자가 정지되었습니다.`);
      }
    } else if (selectedBulkAction === 'trash') {
      if (confirm(`선택한 ${selectedVendors.size}개 판매자를 휴지통으로 이동하시겠습니까?`)) {
        setVendors(vendors.map(v => 
          selectedVendors.has(v.id) ? { ...v, status: 'trash' as VendorStatus } : v
        ));
        toast.success(`${selectedVendors.size}개 판매자가 휴지통으로 이동되었습니다.`);
      }
    }
    
    setSelectedVendors(new Set());
    setSelectedBulkAction('');
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  const getFilteredVendors = (): Vendor[] => {
    let filtered = vendors;
    
    // Filter by tab
    if (activeTab === 'active') {
      filtered = filtered.filter(v => v.status === 'active');
    } else if (activeTab === 'pending') {
      filtered = filtered.filter(v => v.status === 'pending');
    } else if (activeTab === 'suspended') {
      filtered = filtered.filter(v => v.status === 'suspended');
    } else if (activeTab === 'trash') {
      filtered = filtered.filter(v => v.status === 'trash');
    } else if (activeTab === 'all') {
      filtered = filtered.filter(v => v.status !== 'trash');
    }
    
    // Filter by search
    if (searchQuery) {
      filtered = filtered.filter(v => 
        v.businessName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        v.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        v.email.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    
    // Sort
    if (sortField) {
      filtered = [...filtered].sort((a, b) => {
        if (sortField === 'businessName') {
          return sortOrder === 'asc' 
            ? a.businessName.localeCompare(b.businessName)
            : b.businessName.localeCompare(a.businessName);
        } else if (sortField === 'revenue') {
          return sortOrder === 'asc' ? a.revenue - b.revenue : b.revenue - a.revenue;
        } else if (sortField === 'products') {
          return sortOrder === 'asc' ? a.products - b.products : b.products - a.products;
        } else if (sortField === 'joinedAt') {
          return sortOrder === 'asc'
            ? new Date(a.joinedAt).getTime() - new Date(b.joinedAt).getTime()
            : new Date(b.joinedAt).getTime() - new Date(a.joinedAt).getTime();
        }
        return 0;
      });
    } else {
      // Default sort by joinedAt desc
      filtered = [...filtered].sort((a, b) => 
        new Date(b.joinedAt).getTime() - new Date(a.joinedAt).getTime()
      );
    }
    
    // Apply pagination limit
    return filtered.slice(0, itemsPerPage);
  };

  const getStatusCounts = () => {
    const active = vendors.filter(v => v.status === 'active').length;
    const pending = vendors.filter(v => v.status === 'pending').length;
    const suspended = vendors.filter(v => v.status === 'suspended').length;
    const trash = vendors.filter(v => v.status === 'trash').length;
    const all = vendors.filter(v => v.status !== 'trash').length;
    return { all, active, pending, suspended, trash };
  };

  const getTierBadge = (tier: Vendor['tier']) => {
    const config = {
      bronze: { label: '브론즈', className: 'text-orange-600' },
      silver: { label: '실버', className: 'text-gray-600' },
      gold: { label: '골드', className: 'text-yellow-600' },
      platinum: { label: '플래티넘', className: 'text-purple-600' }
    };
    return <span className={config[tier].className}>{config[tier].label}</span>;
  };

  const counts = getStatusCounts();
  const filteredVendors = getFilteredVendors();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#f0f0f1' }}>
        <div className="text-gray-600">판매자 목록을 불러오는 중...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#f0f0f1' }}>
      {/* Header with Breadcrumb and Screen Options */}
      <div className="bg-white border-b border-gray-200 px-8 py-3">
        <div className="flex items-center justify-between">
          <AdminBreadcrumb 
            items={[
              { label: '관리자', path: '/admin' },
              { label: '판매자/공급자', path: '/vendors' },
              { label: '모든 판매자' }
            ]}
          />
          
          {/* Screen Options Button */}
          <div className="relative">
            <button
              onClick={() => setShowScreenOptions(!showScreenOptions)}
              className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded transition-colors"
            >
              <Settings className="w-4 h-4" />
              화면 옵션
              <ChevronDown className="w-3 h-3" />
            </button>
            
            {showScreenOptions && (
              <div className="absolute right-0 top-full mt-2 w-72 bg-white border border-gray-300 rounded-md shadow-lg z-50">
                <div className="p-4">
                  <h3 className="font-medium text-sm mb-3">표시할 열</h3>
                  <div className="grid grid-cols-2 gap-2">
                    <label className="flex items-center text-sm">
                      <input 
                        type="checkbox" 
                        checked={visibleColumns.avatar}
                        onChange={() => handleColumnToggle('avatar')}
                        className="mr-2" 
                      />
                      아바타
                    </label>
                    <label className="flex items-center text-sm">
                      <input 
                        type="checkbox" 
                        checked={visibleColumns.tier}
                        onChange={() => handleColumnToggle('tier')}
                        className="mr-2" 
                      />
                      등급
                    </label>
                    <label className="flex items-center text-sm">
                      <input 
                        type="checkbox" 
                        checked={visibleColumns.products}
                        onChange={() => handleColumnToggle('products')}
                        className="mr-2" 
                      />
                      상품 수
                    </label>
                    <label className="flex items-center text-sm">
                      <input 
                        type="checkbox" 
                        checked={visibleColumns.revenue}
                        onChange={() => handleColumnToggle('revenue')}
                        className="mr-2" 
                      />
                      매출액
                    </label>
                    <label className="flex items-center text-sm">
                      <input 
                        type="checkbox" 
                        checked={visibleColumns.rating}
                        onChange={() => handleColumnToggle('rating')}
                        className="mr-2" 
                      />
                      평점
                    </label>
                    <label className="flex items-center text-sm">
                      <input 
                        type="checkbox" 
                        checked={visibleColumns.commission}
                        onChange={() => handleColumnToggle('commission')}
                        className="mr-2" 
                      />
                      수수료
                    </label>
                    <label className="flex items-center text-sm">
                      <input 
                        type="checkbox" 
                        checked={visibleColumns.lastActivity}
                        onChange={() => handleColumnToggle('lastActivity')}
                        className="mr-2" 
                      />
                      마지막 활동
                    </label>
                    <label className="flex items-center text-sm">
                      <input 
                        type="checkbox" 
                        checked={visibleColumns.status}
                        onChange={() => handleColumnToggle('status')}
                        className="mr-2" 
                      />
                      상태
                    </label>
                  </div>
                  
                  <div className="border-t border-gray-200 mt-3 pt-3">
                    <h3 className="font-medium text-sm mb-3">페이지네이션</h3>
                    <div className="flex items-center gap-2">
                      <label className="text-sm text-gray-600">페이지당 항목:</label>
                      <input
                        type="number"
                        value={itemsPerPage}
                        onChange={(e) => handleItemsPerPageChange(e.target.value)}
                        min="1"
                        max="999"
                        className="w-16 px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                      <button
                        onClick={() => setShowScreenOptions(false)}
                        className="ml-auto px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                      >
                        적용
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="px-8 py-6">
        {/* Title and Add New */}
        <div className="flex items-center gap-3 mb-4">
          <h1 className="text-2xl font-normal text-gray-900">판매자</h1>
          <button
            onClick={handleAddNew}
            className="px-3 py-1 text-sm bg-white border border-gray-300 rounded hover:bg-gray-50 transition-colors"
          >
            새 판매자 추가
          </button>
        </div>

        {/* Status Tabs */}
        <div className="flex items-center gap-4 mb-4">
          <button
            onClick={() => setActiveTab('all')}
            className={`text-sm ${activeTab === 'all' ? 'text-gray-900 font-medium' : 'text-blue-600 hover:text-blue-800'}`}
          >
            모든 판매자 ({counts.all})
          </button>
          <span className="text-gray-400">|</span>
          <button
            onClick={() => setActiveTab('active')}
            className={`text-sm ${activeTab === 'active' ? 'text-gray-900 font-medium' : 'text-blue-600 hover:text-blue-800'}`}
          >
            활성 ({counts.active})
          </button>
          <span className="text-gray-400">|</span>
          <button
            onClick={() => setActiveTab('pending')}
            className={`text-sm ${activeTab === 'pending' ? 'text-gray-900 font-medium' : 'text-blue-600 hover:text-blue-800'}`}
          >
            승인 대기 ({counts.pending})
          </button>
          <span className="text-gray-400">|</span>
          <button
            onClick={() => setActiveTab('suspended')}
            className={`text-sm ${activeTab === 'suspended' ? 'text-gray-900 font-medium' : 'text-blue-600 hover:text-blue-800'}`}
          >
            정지 ({counts.suspended})
          </button>
          <span className="text-gray-400">|</span>
          <button
            onClick={() => setActiveTab('trash')}
            className={`text-sm ${activeTab === 'trash' ? 'text-gray-900 font-medium' : 'text-blue-600 hover:text-blue-800'}`}
          >
            휴지통 ({counts.trash})
          </button>
        </div>

        {/* Search Box and Bulk Actions */}
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center gap-2">
            <div className="relative">
              <button
                onClick={() => setShowBulkActions(!showBulkActions)}
                className="flex items-center gap-1 px-3 py-1.5 text-sm bg-white border border-gray-300 rounded hover:bg-gray-50"
              >
                {selectedBulkAction === 'approve' ? '승인' : 
                 selectedBulkAction === 'suspend' ? '정지' :
                 selectedBulkAction === 'trash' ? '휴지통으로 이동' : '일괄 작업'}
                <ChevronDown className="w-3 h-3" />
              </button>
              
              {showBulkActions && (
                <div className="absolute left-0 top-full mt-1 w-48 bg-white border border-gray-300 rounded shadow-lg z-20">
                  <button
                    onClick={() => {
                      setSelectedBulkAction('approve');
                      setShowBulkActions(false);
                    }}
                    className="block w-full text-left px-3 py-2 text-sm hover:bg-gray-50"
                  >
                    승인
                  </button>
                  <button
                    onClick={() => {
                      setSelectedBulkAction('suspend');
                      setShowBulkActions(false);
                    }}
                    className="block w-full text-left px-3 py-2 text-sm hover:bg-gray-50"
                  >
                    정지
                  </button>
                  <button
                    onClick={() => {
                      setSelectedBulkAction('trash');
                      setShowBulkActions(false);
                    }}
                    className="block w-full text-left px-3 py-2 text-sm hover:bg-gray-50"
                  >
                    휴지통으로 이동
                  </button>
                </div>
              )}
            </div>
            <button 
              onClick={handleApplyBulkAction}
              className={`px-3 py-1.5 text-sm border border-gray-300 rounded transition-colors ${
                selectedBulkAction && selectedVendors.size > 0 
                  ? 'bg-white text-gray-700 hover:bg-gray-50 cursor-pointer'
                  : 'bg-gray-100 text-gray-400 cursor-not-allowed'
              }`}
              disabled={!selectedBulkAction || selectedVendors.size === 0}
            >
              적용
            </button>
          </div>

          {/* Search */}
          <div className="flex items-center gap-2">
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="px-3 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
              placeholder="판매자 검색..."
            />
            <button
              className="px-3 py-1.5 text-sm bg-gray-100 text-gray-700 border border-gray-300 rounded hover:bg-gray-200 transition-colors"
            >
              판매자 검색
            </button>
          </div>
        </div>

        {/* Item count */}
        <div className="text-sm text-gray-600 mb-2">
          {filteredVendors.length}개 항목
        </div>

        {/* Table */}
        <div className="bg-white border border-gray-300 rounded-lg overflow-hidden">
          <table className="w-full">
            <thead className="bg-white border-b border-gray-200">
              <tr>
                <th className="w-10 px-3 py-3 text-left">
                  <input
                    type="checkbox"
                    onChange={handleSelectAll}
                    checked={selectedVendors.size === filteredVendors.length && filteredVendors.length > 0}
                  />
                </th>
                {visibleColumns.avatar && (
                  <th className="w-12 px-3 py-3"></th>
                )}
                <th className="px-3 py-3 text-left">
                  <button 
                    onClick={() => handleSort('businessName')}
                    className="flex items-center gap-1 font-medium text-sm text-gray-700 hover:text-black"
                  >
                    판매자 정보
                    {sortField === 'businessName' ? (
                      sortOrder === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />
                    ) : (
                      <ChevronDown className="w-3 h-3 opacity-50" />
                    )}
                  </button>
                </th>
                {visibleColumns.tier && (
                  <th className="px-3 py-3 text-left text-sm font-medium text-gray-700">등급</th>
                )}
                {visibleColumns.products && (
                  <th className="px-3 py-3 text-left">
                    <button 
                      onClick={() => handleSort('products')}
                      className="flex items-center gap-1 font-medium text-sm text-gray-700 hover:text-black"
                    >
                      상품
                      {sortField === 'products' ? (
                        sortOrder === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />
                      ) : (
                        <ChevronDown className="w-3 h-3 opacity-50" />
                      )}
                    </button>
                  </th>
                )}
                {visibleColumns.revenue && (
                  <th className="px-3 py-3 text-left">
                    <button 
                      onClick={() => handleSort('revenue')}
                      className="flex items-center gap-1 font-medium text-sm text-gray-700 hover:text-black"
                    >
                      매출액
                      {sortField === 'revenue' ? (
                        sortOrder === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />
                      ) : (
                        <ChevronDown className="w-3 h-3 opacity-50" />
                      )}
                    </button>
                  </th>
                )}
                {visibleColumns.rating && (
                  <th className="px-3 py-3 text-left text-sm font-medium text-gray-700">평점</th>
                )}
                {visibleColumns.commission && (
                  <th className="px-3 py-3 text-left text-sm font-medium text-gray-700">수수료</th>
                )}
                {visibleColumns.lastActivity && (
                  <th className="px-3 py-3 text-left text-sm font-medium text-gray-700">마지막 활동</th>
                )}
                {visibleColumns.status && (
                  <th className="px-3 py-3 text-left text-sm font-medium text-gray-700">상태</th>
                )}
              </tr>
            </thead>
            <tbody>
              {filteredVendors.map((vendor) => (
                <React.Fragment key={vendor.id}>
                  {quickEditId === vendor.id ? (
                    // Quick Edit Row
                    <tr className="border-b border-gray-200 bg-gray-50">
                      <td colSpan={100} className="p-4">
                        <div className="bg-white border border-gray-300 rounded p-4">
                          <h3 className="font-medium text-sm mb-3">빠른 편집</h3>
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">상호명</label>
                              <input
                                type="text"
                                value={quickEditData.businessName}
                                onChange={(e) => setQuickEditData({...quickEditData, businessName: e.target.value})}
                                className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">상태</label>
                              <select
                                value={quickEditData.status}
                                onChange={(e) => setQuickEditData({...quickEditData, status: e.target.value as VendorStatus})}
                                className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                              >
                                <option value="active">활성</option>
                                <option value="pending">승인 대기</option>
                                <option value="suspended">정지</option>
                              </select>
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">등급</label>
                              <select
                                value={quickEditData.tier}
                                onChange={(e) => setQuickEditData({...quickEditData, tier: e.target.value as Vendor['tier']})}
                                className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                              >
                                <option value="bronze">브론즈</option>
                                <option value="silver">실버</option>
                                <option value="gold">골드</option>
                                <option value="platinum">플래티넘</option>
                              </select>
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">수수료율 (%)</label>
                              <input
                                type="number"
                                value={quickEditData.commission}
                                onChange={(e) => setQuickEditData({...quickEditData, commission: parseFloat(e.target.value)})}
                                className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                              />
                            </div>
                          </div>
                          <div className="flex gap-2 mt-4">
                            <button
                              onClick={handleSaveQuickEdit}
                              className="px-4 py-1.5 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
                            >
                              업데이트
                            </button>
                            <button
                              onClick={handleCancelQuickEdit}
                              className="px-4 py-1.5 text-sm bg-gray-100 text-gray-700 border border-gray-300 rounded hover:bg-gray-200"
                            >
                              취소
                            </button>
                          </div>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    // Normal Row
                    <tr
                      className="border-b border-gray-100 hover:bg-gray-50"
                      onMouseEnter={() => {
                        if (hoverTimeoutRef.current) {
                          clearTimeout(hoverTimeoutRef.current);
                        }
                        hoverTimeoutRef.current = setTimeout(() => {
                          setHoveredRow(vendor.id);
                        }, 300);
                      }}
                      onMouseLeave={() => {
                        if (hoverTimeoutRef.current) {
                          clearTimeout(hoverTimeoutRef.current);
                          hoverTimeoutRef.current = null;
                        }
                        setHoveredRow(null);
                      }}
                    >
                      <td className="px-3 py-3">
                        <input
                          type="checkbox"
                          checked={selectedVendors.has(vendor.id)}
                          onChange={() => handleSelectVendor(vendor.id)}
                        />
                      </td>
                      {visibleColumns.avatar && (
                        <td className="px-3 py-3">
                          {vendor.avatar ? (
                            <img 
                              src={vendor.avatar} 
                              alt={vendor.name}
                              className="w-8 h-8 rounded-full"
                            />
                          ) : (
                            <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center">
                              <Store className="w-4 h-4 text-gray-400" />
                            </div>
                          )}
                        </td>
                      )}
                      <td className="px-3 py-3">
                        <div>
                          <button 
                            onClick={() => handleEdit(vendor.id)}
                            className="text-blue-600 hover:text-blue-800 font-medium text-sm text-left"
                          >
                            {vendor.businessName}
                          </button>
                          <div className="text-xs text-gray-500">
                            {vendor.name} · {vendor.email}
                          </div>
                          {hoveredRow === vendor.id && (
                            <div className="flex items-center gap-2 mt-1 text-xs">
                              {vendor.status === 'trash' ? (
                                <>
                                  <button
                                    onClick={() => handleRestore(vendor.id)}
                                    className="text-blue-600 hover:text-blue-800"
                                  >
                                    복원
                                  </button>
                                  <span className="text-gray-400">|</span>
                                  <button
                                    onClick={() => handlePermanentDelete(vendor.id)}
                                    className="text-red-600 hover:text-red-800"
                                  >
                                    영구 삭제
                                  </button>
                                </>
                              ) : (
                                <>
                                  <button
                                    onClick={() => handleEdit(vendor.id)}
                                    className="text-blue-600 hover:text-blue-800"
                                  >
                                    편집
                                  </button>
                                  <span className="text-gray-400">|</span>
                                  <button
                                    onClick={() => handleQuickEdit(vendor.id)}
                                    className="text-blue-600 hover:text-blue-800"
                                  >
                                    빠른 편집
                                  </button>
                                  {vendor.status === 'pending' && (
                                    <>
                                      <span className="text-gray-400">|</span>
                                      <button
                                        onClick={() => handleApprove(vendor.id)}
                                        className="text-green-600 hover:text-green-800"
                                      >
                                        승인
                                      </button>
                                    </>
                                  )}
                                  {vendor.status === 'active' && (
                                    <>
                                      <span className="text-gray-400">|</span>
                                      <button
                                        onClick={() => handleSuspend(vendor.id)}
                                        className="text-orange-600 hover:text-orange-800"
                                      >
                                        정지
                                      </button>
                                    </>
                                  )}
                                  <span className="text-gray-400">|</span>
                                  <button
                                    onClick={() => handleTrash(vendor.id)}
                                    className="text-red-600 hover:text-red-800"
                                  >
                                    휴지통
                                  </button>
                                  <span className="text-gray-400">|</span>
                                  <button
                                    onClick={() => handleView(vendor.id)}
                                    className="text-blue-600 hover:text-blue-800"
                                  >
                                    보기
                                  </button>
                                </>
                              )}
                            </div>
                          )}
                        </div>
                      </td>
                      {visibleColumns.tier && (
                        <td className="px-3 py-3 text-sm">
                          {getTierBadge(vendor.tier)}
                        </td>
                      )}
                      {visibleColumns.products && (
                        <td className="px-3 py-3 text-sm">
                          <div className="flex items-center gap-1">
                            <Package className="w-3 h-3 text-gray-400" />
                            {vendor.products}
                          </div>
                        </td>
                      )}
                      {visibleColumns.revenue && (
                        <td className="px-3 py-3 text-sm">
                          <div className="flex items-center gap-1">
                            <DollarSign className="w-3 h-3 text-gray-400" />
                            {vendor.revenue.toLocaleString()}원
                          </div>
                        </td>
                      )}
                      {visibleColumns.rating && (
                        <td className="px-3 py-3 text-sm">
                          {vendor.rating > 0 ? (
                            <div className="flex items-center gap-1">
                              <Star className="w-3 h-3 text-yellow-400 fill-current" />
                              <span>{vendor.rating.toFixed(1)}</span>
                              <span className="text-gray-400">({vendor.reviewCount})</span>
                            </div>
                          ) : (
                            <span className="text-gray-400">—</span>
                          )}
                        </td>
                      )}
                      {visibleColumns.commission && (
                        <td className="px-3 py-3 text-sm text-gray-600">
                          {vendor.commission}%
                        </td>
                      )}
                      {visibleColumns.lastActivity && (
                        <td className="px-3 py-3 text-sm text-gray-600">
                          {new Date(vendor.lastActivity).toLocaleDateString()}
                        </td>
                      )}
                      {visibleColumns.status && (
                        <td className="px-3 py-3 text-sm">
                          {vendor.status === 'active' && (
                            <span className="flex items-center gap-1 text-green-600">
                              <UserCheck className="w-3 h-3" />
                              활성
                            </span>
                          )}
                          {vendor.status === 'pending' && (
                            <span className="flex items-center gap-1 text-yellow-600">
                              <Clock className="w-3 h-3" />
                              승인 대기
                            </span>
                          )}
                          {vendor.status === 'suspended' && (
                            <span className="flex items-center gap-1 text-red-600">
                              <Ban className="w-3 h-3" />
                              정지
                            </span>
                          )}
                          {vendor.status === 'trash' && (
                            <span className="text-gray-500">휴지통</span>
                          )}
                        </td>
                      )}
                    </tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>

          {filteredVendors.length === 0 && (
            <div className="text-center py-8">
              <AlertCircle className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">판매자가 없습니다.</p>
            </div>
          )}
        </div>

        {/* Bottom Actions */}
        <div className="flex items-center justify-between mt-4">
          <div className="flex items-center gap-2">
            <div className="relative">
              <button
                onClick={() => setShowBulkActions(!showBulkActions)}
                className="flex items-center gap-1 px-3 py-1.5 text-sm bg-white border border-gray-300 rounded hover:bg-gray-50"
              >
                일괄 작업
                <ChevronDown className="w-3 h-3" />
              </button>
            </div>
            <button 
              onClick={handleApplyBulkAction}
              className={`px-3 py-1.5 text-sm border border-gray-300 rounded transition-colors ${
                selectedBulkAction && selectedVendors.size > 0 
                  ? 'bg-white text-gray-700 hover:bg-gray-50 cursor-pointer'
                  : 'bg-gray-100 text-gray-400 cursor-not-allowed'
              }`}
              disabled={!selectedBulkAction || selectedVendors.size === 0}
            >
              적용
            </button>
          </div>
          
          <div className="text-sm text-gray-600">
            {filteredVendors.length}개 항목
          </div>
        </div>
      </div>
    </div>
  );
};

export default VendorsAdmin;