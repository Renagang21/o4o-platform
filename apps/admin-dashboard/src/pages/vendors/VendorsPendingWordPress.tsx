import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ChevronDown,
  ChevronUp,
  Settings,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  FileText,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Search,
  User,
  Building,
  AlertCircle
} from 'lucide-react';
import AdminBreadcrumb from '@/components/common/AdminBreadcrumb';
import toast from 'react-hot-toast';

type DocumentStatus = 'complete' | 'incomplete' | 'partial';
type SortField = 'businessName' | 'appliedAt' | 'waitingDays' | null;
type SortOrder = 'asc' | 'desc';

interface PendingVendor {
  id: string;
  name: string;
  email: string;
  businessName: string;
  businessType: 'seller' | 'supplier';
  businessNumber: string;
  phoneNumber: string;
  address: string;
  documents: {
    businessLicense: boolean;
    taxCertificate: boolean;
    bankAccount: boolean;
  };
  appliedAt: string;
  message?: string;
  urgencyLevel?: 'normal' | 'urgent' | 'critical';
}

const VendorsPendingWordPress = () => {
  const navigate = useNavigate();
  
  const [activeTab, setActiveTab] = useState<'all' | 'today' | 'urgent' | 'incomplete'>(() => {
    const saved = sessionStorage.getItem('vendors-pending-tab');
    return (saved as any) || 'all';
  });
  
  const [vendors, setVendors] = useState<PendingVendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedVendors, setSelectedVendors] = useState<Set<string>>(new Set());
  const [hoveredRow, setHoveredRow] = useState<string | null>(null);
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [showBulkActions, setShowBulkActions] = useState(false);
  const [showScreenOptions, setShowScreenOptions] = useState(false);
  const [selectedBulkAction, setSelectedBulkAction] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedVendor, setSelectedVendor] = useState<PendingVendor | null>(null);
  
  const [sortField, setSortField] = useState<SortField>(null);
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  
  const [visibleColumns, setVisibleColumns] = useState(() => {
    const saved = localStorage.getItem('vendors-pending-columns');
    return saved ? JSON.parse(saved) : {
      businessType: true,
      documents: true,
      contact: true,
      appliedAt: true,
      waitingDays: true,
      urgency: true
    };
  });
  
  const [itemsPerPage, setItemsPerPage] = useState(() => {
    const saved = localStorage.getItem('vendors-pending-items');
    return saved ? parseInt(saved) : 20;
  });

  // Fetch pending vendors (mock data for now)
  useEffect(() => {
    const fetchVendors = async () => {
      try {
        setLoading(true);
        // Mock data
        const mockVendors: PendingVendor[] = [
          {
            id: '1',
            name: '정승인',
            email: 'pending1@example.com',
            businessName: '헬스 프리미엄',
            businessType: 'seller',
            businessNumber: '123-45-67890',
            phoneNumber: '010-1234-5678',
            address: '서울시 강남구 테헤란로 123',
            documents: {
              businessLicense: true,
              taxCertificate: true,
              bankAccount: true
            },
            appliedAt: new Date().toISOString(),
            message: '건강식품 전문 판매자로 활동하고 싶습니다.',
            urgencyLevel: 'normal'
          },
          {
            id: '2',
            name: '김대기',
            email: 'pending2@example.com',
            businessName: '오가닉 팜',
            businessType: 'supplier',
            businessNumber: '234-56-78901',
            phoneNumber: '010-2345-6789',
            address: '경기도 성남시 분당구 판교로 456',
            documents: {
              businessLicense: true,
              taxCertificate: false,
              bankAccount: true
            },
            appliedAt: new Date(Date.now() - 86400000).toISOString(),
            urgencyLevel: 'urgent'
          },
          {
            id: '3',
            name: '이검토',
            email: 'pending3@example.com',
            businessName: '뷰티 플러스',
            businessType: 'seller',
            businessNumber: '345-67-89012',
            phoneNumber: '010-3456-7890',
            address: '부산시 해운대구 센텀로 789',
            documents: {
              businessLicense: true,
              taxCertificate: true,
              bankAccount: false
            },
            appliedAt: new Date(Date.now() - 345600000).toISOString(),
            message: '화장품 및 뷰티 제품을 판매하려고 합니다.',
            urgencyLevel: 'critical'
          }
        ];
        setVendors(mockVendors);
      } catch (error) {
        toast.error('승인 대기 목록을 불러오는데 실패했습니다.');
      } finally {
        setLoading(false);
      }
    };
    
    fetchVendors();
  }, []);

  useEffect(() => {
    sessionStorage.setItem('vendors-pending-tab', activeTab);
  }, [activeTab]);

  useEffect(() => {
    return () => {
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    localStorage.setItem('vendors-pending-columns', JSON.stringify(visibleColumns));
  }, [visibleColumns]);

  useEffect(() => {
    localStorage.setItem('vendors-pending-items', itemsPerPage.toString());
  }, [itemsPerPage]);

  const getWaitingDays = (appliedAt: string) => {
    const now = new Date();
    const applied = new Date(appliedAt);
    const diffTime = Math.abs(now.getTime() - applied.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const getDocumentStatus = (docs: PendingVendor['documents']): DocumentStatus => {
    const total = Object.keys(docs).length;
    const verified = Object.values(docs).filter(Boolean).length;
    if (verified === total) return 'complete';
    if (verified === 0) return 'incomplete';
    return 'partial';
  };

  const isToday = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

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

  const handleApprove = async (id: string) => {
    if (confirm('이 판매자를 승인하시겠습니까?')) {
      setVendors(vendors.filter(v => v.id !== id));
      toast.success('판매자가 승인되었습니다.');
    }
  };

  const handleReject = async (id: string) => {
    const reason = prompt('거부 사유를 입력해주세요:');
    if (reason) {
      setVendors(vendors.filter(v => v.id !== id));
      toast.success('판매자 신청이 거부되었습니다.');
    }
  };

  const handleRequestDocuments = async (id: string) => {
    const message = prompt('요청할 서류에 대한 메시지를 입력해주세요:');
    if (message) {
      toast.success('서류 보완 요청을 발송했습니다.');
    }
  };

  const handleViewDetails = (vendor: PendingVendor) => {
    setSelectedVendor(vendor);
    setShowDetailModal(true);
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
      if (confirm(`선택한 ${selectedVendors.size}개 판매자를 승인하시겠습니까?`)) {
        setVendors(vendors.filter(v => !selectedVendors.has(v.id)));
        toast.success(`${selectedVendors.size}개 판매자가 승인되었습니다.`);
        setSelectedVendors(new Set());
      }
    } else if (selectedBulkAction === 'reject') {
      const reason = prompt('거부 사유를 입력해주세요:');
      if (reason && confirm(`선택한 ${selectedVendors.size}개 판매자 신청을 거부하시겠습니까?`)) {
        setVendors(vendors.filter(v => !selectedVendors.has(v.id)));
        toast.success(`${selectedVendors.size}개 판매자 신청이 거부되었습니다.`);
        setSelectedVendors(new Set());
      }
    } else if (selectedBulkAction === 'message') {
      const message = prompt('발송할 메시지를 입력해주세요:');
      if (message) {
        toast.success(`${selectedVendors.size}명에게 메시지를 발송했습니다.`);
        setSelectedVendors(new Set());
      }
    }
    
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

  const getFilteredVendors = (): PendingVendor[] => {
    let filtered = vendors;
    
    // Filter by tab
    if (activeTab === 'today') {
      filtered = filtered.filter(v => isToday(v.appliedAt));
    } else if (activeTab === 'urgent') {
      filtered = filtered.filter(v => getWaitingDays(v.appliedAt) > 3);
    } else if (activeTab === 'incomplete') {
      filtered = filtered.filter(v => getDocumentStatus(v.documents) !== 'complete');
    }
    
    // Filter by search
    if (searchQuery) {
      filtered = filtered.filter(v => 
        v.businessName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        v.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        v.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        v.businessNumber.includes(searchQuery)
      );
    }
    
    // Sort
    if (sortField) {
      filtered = [...filtered].sort((a, b) => {
        if (sortField === 'businessName') {
          return sortOrder === 'asc' 
            ? a.businessName.localeCompare(b.businessName)
            : b.businessName.localeCompare(a.businessName);
        } else if (sortField === 'appliedAt') {
          return sortOrder === 'asc'
            ? new Date(a.appliedAt).getTime() - new Date(b.appliedAt).getTime()
            : new Date(b.appliedAt).getTime() - new Date(a.appliedAt).getTime();
        } else if (sortField === 'waitingDays') {
          const daysA = getWaitingDays(a.appliedAt);
          const daysB = getWaitingDays(b.appliedAt);
          return sortOrder === 'asc' ? daysA - daysB : daysB - daysA;
        }
        return 0;
      });
    } else {
      // Default sort by appliedAt desc
      filtered = [...filtered].sort((a, b) => 
        new Date(b.appliedAt).getTime() - new Date(a.appliedAt).getTime()
      );
    }
    
    // Apply pagination limit
    return filtered.slice(0, itemsPerPage);
  };

  const getStatusCounts = () => {
    const all = vendors.length;
    const today = vendors.filter(v => isToday(v.appliedAt)).length;
    const urgent = vendors.filter(v => getWaitingDays(v.appliedAt) > 3).length;
    const incomplete = vendors.filter(v => getDocumentStatus(v.documents) !== 'complete').length;
    return { all, today, urgent, incomplete };
  };

  const getUrgencyBadge = (vendor: PendingVendor) => {
    const days = getWaitingDays(vendor.appliedAt);
    if (days > 5) {
      return <span className="text-red-600 font-medium flex items-center gap-1">
        <AlertTriangle className="w-3 h-3" />
        긴급
      </span>;
    } else if (days > 3) {
      return <span className="text-orange-600 font-medium flex items-center gap-1">
        <Clock className="w-3 h-3" />
        주의
      </span>;
    }
    return <span className="text-green-600 font-medium flex items-center gap-1">
      <CheckCircle className="w-3 h-3" />
      정상
    </span>;
  };

  const counts = getStatusCounts();
  const filteredVendors = getFilteredVendors();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#f0f0f1' }}>
        <div className="text-gray-600">승인 대기 목록을 불러오는 중...</div>
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
              { label: '승인 대기' }
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
                        checked={visibleColumns.businessType}
                        onChange={() => handleColumnToggle('businessType')}
                        className="mr-2" 
                      />
                      유형
                    </label>
                    <label className="flex items-center text-sm">
                      <input 
                        type="checkbox" 
                        checked={visibleColumns.documents}
                        onChange={() => handleColumnToggle('documents')}
                        className="mr-2" 
                      />
                      서류 현황
                    </label>
                    <label className="flex items-center text-sm">
                      <input 
                        type="checkbox" 
                        checked={visibleColumns.contact}
                        onChange={() => handleColumnToggle('contact')}
                        className="mr-2" 
                      />
                      연락처
                    </label>
                    <label className="flex items-center text-sm">
                      <input 
                        type="checkbox" 
                        checked={visibleColumns.appliedAt}
                        onChange={() => handleColumnToggle('appliedAt')}
                        className="mr-2" 
                      />
                      신청일
                    </label>
                    <label className="flex items-center text-sm">
                      <input 
                        type="checkbox" 
                        checked={visibleColumns.waitingDays}
                        onChange={() => handleColumnToggle('waitingDays')}
                        className="mr-2" 
                      />
                      대기 기간
                    </label>
                    <label className="flex items-center text-sm">
                      <input 
                        type="checkbox" 
                        checked={visibleColumns.urgency}
                        onChange={() => handleColumnToggle('urgency')}
                        className="mr-2" 
                      />
                      긴급도
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
        {/* Title */}
        <div className="flex items-center gap-3 mb-4">
          <h1 className="text-2xl font-normal text-gray-900">승인 대기 판매자</h1>
          {counts.urgent > 0 && (
            <span className="px-2 py-1 text-xs bg-red-100 text-red-700 rounded-full">
              긴급 처리 {counts.urgent}건
            </span>
          )}
        </div>

        {/* Status Tabs */}
        <div className="flex items-center gap-4 mb-4">
          <button
            onClick={() => setActiveTab('all')}
            className={`text-sm ${activeTab === 'all' ? 'text-gray-900 font-medium' : 'text-blue-600 hover:text-blue-800'}`}
          >
            전체 ({counts.all})
          </button>
          <span className="text-gray-400">|</span>
          <button
            onClick={() => setActiveTab('today')}
            className={`text-sm ${activeTab === 'today' ? 'text-gray-900 font-medium' : 'text-blue-600 hover:text-blue-800'}`}
          >
            오늘 신청 ({counts.today})
          </button>
          <span className="text-gray-400">|</span>
          <button
            onClick={() => setActiveTab('urgent')}
            className={`text-sm ${activeTab === 'urgent' ? 'text-gray-900 font-medium' : 'text-blue-600 hover:text-blue-800'}`}
          >
            긴급 처리 ({counts.urgent})
          </button>
          <span className="text-gray-400">|</span>
          <button
            onClick={() => setActiveTab('incomplete')}
            className={`text-sm ${activeTab === 'incomplete' ? 'text-gray-900 font-medium' : 'text-blue-600 hover:text-blue-800'}`}
          >
            서류 미비 ({counts.incomplete})
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
                {selectedBulkAction === 'approve' ? '일괄 승인' : 
                 selectedBulkAction === 'reject' ? '일괄 거부' :
                 selectedBulkAction === 'message' ? '메시지 발송' : '일괄 작업'}
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
                    일괄 승인
                  </button>
                  <button
                    onClick={() => {
                      setSelectedBulkAction('reject');
                      setShowBulkActions(false);
                    }}
                    className="block w-full text-left px-3 py-2 text-sm hover:bg-gray-50"
                  >
                    일괄 거부
                  </button>
                  <button
                    onClick={() => {
                      setSelectedBulkAction('message');
                      setShowBulkActions(false);
                    }}
                    className="block w-full text-left px-3 py-2 text-sm hover:bg-gray-50"
                  >
                    메시지 발송
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
              placeholder="신청자 검색..."
            />
            <button
              className="px-3 py-1.5 text-sm bg-gray-100 text-gray-700 border border-gray-300 rounded hover:bg-gray-200 transition-colors"
            >
              신청자 검색
            </button>
          </div>
        </div>

        {/* Item count and Summary */}
        <div className="flex justify-between items-center mb-2">
          <div className="text-sm text-gray-600">
            {filteredVendors.length}개 항목
          </div>
          <div className="flex gap-4 text-xs text-gray-500">
            <span>평균 대기: {vendors.length > 0 ? 
              Math.round(vendors.reduce((sum, v) => sum + getWaitingDays(v.appliedAt), 0) / vendors.length) : 0
            }일</span>
            <span>서류 완료율: {vendors.length > 0 ? 
              Math.round(vendors.filter(v => getDocumentStatus(v.documents) === 'complete').length / vendors.length * 100) : 0
            }%</span>
          </div>
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
                <th className="px-3 py-3 text-left">
                  <button 
                    onClick={() => handleSort('businessName')}
                    className="flex items-center gap-1 font-medium text-sm text-gray-700 hover:text-black"
                  >
                    신청자 정보
                    {sortField === 'businessName' ? (
                      sortOrder === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />
                    ) : (
                      <ChevronDown className="w-3 h-3 opacity-50" />
                    )}
                  </button>
                </th>
                {visibleColumns.businessType && (
                  <th className="px-3 py-3 text-left text-sm font-medium text-gray-700">유형</th>
                )}
                {visibleColumns.documents && (
                  <th className="px-3 py-3 text-left text-sm font-medium text-gray-700">서류 현황</th>
                )}
                {visibleColumns.contact && (
                  <th className="px-3 py-3 text-left text-sm font-medium text-gray-700">연락처</th>
                )}
                {visibleColumns.appliedAt && (
                  <th className="px-3 py-3 text-left">
                    <button 
                      onClick={() => handleSort('appliedAt')}
                      className="flex items-center gap-1 font-medium text-sm text-gray-700 hover:text-black"
                    >
                      신청일
                      {sortField === 'appliedAt' ? (
                        sortOrder === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />
                      ) : (
                        <ChevronDown className="w-3 h-3 opacity-50" />
                      )}
                    </button>
                  </th>
                )}
                {visibleColumns.waitingDays && (
                  <th className="px-3 py-3 text-left">
                    <button 
                      onClick={() => handleSort('waitingDays')}
                      className="flex items-center gap-1 font-medium text-sm text-gray-700 hover:text-black"
                    >
                      대기
                      {sortField === 'waitingDays' ? (
                        sortOrder === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />
                      ) : (
                        <ChevronDown className="w-3 h-3 opacity-50" />
                      )}
                    </button>
                  </th>
                )}
                {visibleColumns.urgency && (
                  <th className="px-3 py-3 text-left text-sm font-medium text-gray-700">긴급도</th>
                )}
              </tr>
            </thead>
            <tbody>
              {filteredVendors.map((vendor) => (
                <tr
                  key={vendor.id}
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
                  <td className="px-3 py-3">
                    <div>
                      <button 
                        onClick={() => handleViewDetails(vendor)}
                        className="text-blue-600 hover:text-blue-800 font-medium text-sm text-left"
                      >
                        {vendor.businessName}
                      </button>
                      <div className="text-xs text-gray-500">
                        {vendor.name} · 사업자번호: {vendor.businessNumber}
                      </div>
                      {vendor.message && (
                        <div className="text-xs text-gray-400 mt-1 italic">
                          "{vendor.message.substring(0, 50)}..."
                        </div>
                      )}
                      {hoveredRow === vendor.id && (
                        <div className="flex items-center gap-2 mt-1 text-xs">
                          <button
                            onClick={() => handleViewDetails(vendor)}
                            className="text-blue-600 hover:text-blue-800"
                          >
                            상세보기
                          </button>
                          <span className="text-gray-400">|</span>
                          <button
                            onClick={() => handleApprove(vendor.id)}
                            className="text-green-600 hover:text-green-800"
                          >
                            승인
                          </button>
                          <span className="text-gray-400">|</span>
                          <button
                            onClick={() => handleReject(vendor.id)}
                            className="text-red-600 hover:text-red-800"
                          >
                            거부
                          </button>
                          <span className="text-gray-400">|</span>
                          <button
                            onClick={() => handleRequestDocuments(vendor.id)}
                            className="text-orange-600 hover:text-orange-800"
                          >
                            서류 요청
                          </button>
                        </div>
                      )}
                    </div>
                  </td>
                  {visibleColumns.businessType && (
                    <td className="px-3 py-3 text-sm">
                      {vendor.businessType === 'seller' ? (
                        <span className="text-blue-600">판매자</span>
                      ) : (
                        <span className="text-purple-600">공급자</span>
                      )}
                    </td>
                  )}
                  {visibleColumns.documents && (
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-2">
                        <div className="flex gap-1">
                          {vendor.documents.businessLicense ? 
                            <CheckCircle className="w-4 h-4 text-green-500" /> : 
                            <XCircle className="w-4 h-4 text-red-500" />
                          }
                          {vendor.documents.taxCertificate ? 
                            <CheckCircle className="w-4 h-4 text-green-500" /> : 
                            <XCircle className="w-4 h-4 text-red-500" />
                          }
                          {vendor.documents.bankAccount ? 
                            <CheckCircle className="w-4 h-4 text-green-500" /> : 
                            <XCircle className="w-4 h-4 text-red-500" />
                          }
                        </div>
                        <span className="text-xs text-gray-500">
                          {Object.values(vendor.documents).filter(Boolean).length}/3
                        </span>
                      </div>
                    </td>
                  )}
                  {visibleColumns.contact && (
                    <td className="px-3 py-3 text-sm">
                      <div className="flex items-center gap-1 text-gray-600">
                        <Mail className="w-3 h-3" />
                        <span className="text-xs">{vendor.email}</span>
                      </div>
                      <div className="flex items-center gap-1 text-gray-600 mt-1">
                        <Phone className="w-3 h-3" />
                        <span className="text-xs">{vendor.phoneNumber}</span>
                      </div>
                    </td>
                  )}
                  {visibleColumns.appliedAt && (
                    <td className="px-3 py-3 text-sm text-gray-600">
                      <div>{new Date(vendor.appliedAt).toLocaleDateString()}</div>
                      <div className="text-xs">{new Date(vendor.appliedAt).toLocaleTimeString()}</div>
                    </td>
                  )}
                  {visibleColumns.waitingDays && (
                    <td className="px-3 py-3 text-sm">
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        getWaitingDays(vendor.appliedAt) > 5 ? 'bg-red-100 text-red-700' :
                        getWaitingDays(vendor.appliedAt) > 3 ? 'bg-yellow-100 text-yellow-700' :
                        'bg-green-100 text-green-700'
                      }`}>
                        {getWaitingDays(vendor.appliedAt)}일
                      </span>
                    </td>
                  )}
                  {visibleColumns.urgency && (
                    <td className="px-3 py-3 text-sm">
                      {getUrgencyBadge(vendor)}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>

          {filteredVendors.length === 0 && (
            <div className="text-center py-8">
              <AlertCircle className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">승인 대기 중인 판매자가 없습니다.</p>
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

      {/* Detail Modal */}
      {showDetailModal && selectedVendor && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold">신청자 상세 정보</h2>
                <button
                  onClick={() => setShowDetailModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <XCircle className="w-6 h-6" />
                </button>
              </div>

              <div className="space-y-6">
                {/* Business Information */}
                <div>
                  <h3 className="text-lg font-semibold mb-3">사업자 정보</h3>
                  <dl className="grid grid-cols-2 gap-4">
                    <div>
                      <dt className="text-sm text-gray-500">사업자명</dt>
                      <dd className="font-medium">{selectedVendor.businessName}</dd>
                    </div>
                    <div>
                      <dt className="text-sm text-gray-500">사업자 유형</dt>
                      <dd className="font-medium">
                        {selectedVendor.businessType === 'seller' ? '판매자' : '공급자'}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-sm text-gray-500">사업자번호</dt>
                      <dd className="font-medium">{selectedVendor.businessNumber}</dd>
                    </div>
                    <div>
                      <dt className="text-sm text-gray-500">신청일</dt>
                      <dd className="font-medium">
                        {new Date(selectedVendor.appliedAt).toLocaleString()}
                      </dd>
                    </div>
                  </dl>
                </div>

                {/* Contact Information */}
                <div>
                  <h3 className="text-lg font-semibold mb-3">연락처 정보</h3>
                  <dl className="grid grid-cols-2 gap-4">
                    <div>
                      <dt className="text-sm text-gray-500">대표자명</dt>
                      <dd className="font-medium">{selectedVendor.name}</dd>
                    </div>
                    <div>
                      <dt className="text-sm text-gray-500">이메일</dt>
                      <dd className="font-medium">{selectedVendor.email}</dd>
                    </div>
                    <div>
                      <dt className="text-sm text-gray-500">전화번호</dt>
                      <dd className="font-medium">{selectedVendor.phoneNumber}</dd>
                    </div>
                    <div>
                      <dt className="text-sm text-gray-500">주소</dt>
                      <dd className="font-medium">{selectedVendor.address}</dd>
                    </div>
                  </dl>
                </div>

                {/* Documents */}
                <div>
                  <h3 className="text-lg font-semibold mb-3">제출 서류</h3>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded">
                      <span>사업자등록증</span>
                      {selectedVendor.documents.businessLicense ? (
                        <CheckCircle className="w-5 h-5 text-green-500" />
                      ) : (
                        <XCircle className="w-5 h-5 text-red-500" />
                      )}
                    </div>
                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded">
                      <span>세금계산서 발행정보</span>
                      {selectedVendor.documents.taxCertificate ? (
                        <CheckCircle className="w-5 h-5 text-green-500" />
                      ) : (
                        <XCircle className="w-5 h-5 text-red-500" />
                      )}
                    </div>
                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded">
                      <span>통장사본</span>
                      {selectedVendor.documents.bankAccount ? (
                        <CheckCircle className="w-5 h-5 text-green-500" />
                      ) : (
                        <XCircle className="w-5 h-5 text-red-500" />
                      )}
                    </div>
                  </div>
                </div>

                {/* Message */}
                {selectedVendor.message && (
                  <div>
                    <h3 className="text-lg font-semibold mb-3">신청 메시지</h3>
                    <p className="text-gray-600 p-4 bg-gray-50 rounded">
                      {selectedVendor.message}
                    </p>
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-3 pt-4 border-t">
                  <button
                    onClick={() => {
                      handleApprove(selectedVendor.id);
                      setShowDetailModal(false);
                    }}
                    className="flex-1 px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
                  >
                    <CheckCircle className="w-4 h-4 inline mr-2" />
                    승인하기
                  </button>
                  <button
                    onClick={() => {
                      handleReject(selectedVendor.id);
                      setShowDetailModal(false);
                    }}
                    className="flex-1 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
                  >
                    <XCircle className="w-4 h-4 inline mr-2" />
                    거부하기
                  </button>
                  <button
                    onClick={() => setShowDetailModal(false)}
                    className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-50"
                  >
                    닫기
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default VendorsPendingWordPress;