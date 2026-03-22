/**
 * useVendorsAdmin — Custom hook for Vendors Admin state & operations
 *
 * WO-O4O-VENDORS-ADMIN-PAGES-SPLIT-V1
 * Extracted from VendorsAdmin.tsx
 *
 * Responsibilities:
 *   - All state management (vendors, selection, sort, filter, quick edit)
 *   - API calls via authClient
 *   - CRUD/action handlers (approve/suspend/trash/restore/delete/bulk)
 *   - Filter/sort logic
 *   - SessionStorage/localStorage persistence
 */

import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { authClient } from '@o4o/auth-client';
import type {
  VendorStatus,
  VendorTab,
  VendorSortField,
  VendorSortOrder,
  Vendor,
} from './vendors-admin-types';

export function useVendorsAdmin() {
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

  const [sortField, setSortField] = useState<VendorSortField>(null);
  const [sortOrder, setSortOrder] = useState<VendorSortOrder>('desc');
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

  // Column/display handlers
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

  // Selection handlers
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

  // Navigation handlers
  const handleAddNew = () => {
    navigate('/vendors/new');
  };

  const handleEdit = (id: string) => {
    navigate(`/vendors/${id}/edit`);
  };

  const handleView = (id: string) => {
    window.open(`/vendors/${id}`, '_blank');
  };

  // Quick edit handlers
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

  // Status action handlers
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

  // Bulk action handler
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

  // Sort handler
  const handleSort = (field: VendorSortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  // Filter/sort logic
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

  return {
    // State
    activeTab, setActiveTab,
    vendors, loading,
    selectedVendors,
    hoveredRow, setHoveredRow,
    hoverTimeoutRef,
    showBulkActions, setShowBulkActions,
    showScreenOptions, setShowScreenOptions,
    selectedBulkAction, setSelectedBulkAction,
    searchQuery, setSearchQuery,
    sortField, sortOrder,
    quickEditId,
    quickEditData, setQuickEditData,
    visibleColumns,
    itemsPerPage,
    // Handlers
    handleColumnToggle, handleItemsPerPageChange,
    handleSelectAll, handleSelectVendor,
    handleAddNew, handleEdit, handleView,
    handleQuickEdit, handleSaveQuickEdit, handleCancelQuickEdit,
    handleApprove, handleSuspend, handleTrash, handleRestore, handlePermanentDelete,
    handleApplyBulkAction,
    handleSort,
    // Computed
    getFilteredVendors, getStatusCounts, getTierBadge,
  };
}
