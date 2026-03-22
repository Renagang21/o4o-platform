/**
 * useVendorsCommission — Custom hook for Commission Admin state & operations
 *
 * WO-O4O-VENDORS-ADMIN-PAGES-SPLIT-V1
 * Extracted from VendorsCommissionAdmin.tsx
 *
 * Responsibilities:
 *   - All state management (commissions, selection, sort, filter, editing)
 *   - API calls via authClient
 *   - Action handlers (sort/select/bulk/rate edit/pay/toggle)
 *   - Filter/sort logic & summary calculation
 *   - SessionStorage/localStorage persistence
 */

import React, { useState, useEffect, useRef } from 'react';
import toast from 'react-hot-toast';
import { authClient } from '@o4o/auth-client';
import {
  CheckCircle,
  Clock,
  AlertCircle,
  Calendar,
} from 'lucide-react';
import type {
  CommissionStatus,
  CommissionSortField,
  CommissionSortOrder,
  CommissionRecord,
} from './vendors-commission-types';

// Get current period (YYYY-MM format)
function getCurrentPeriod() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

// Get default due date (15th of next month)
function getDefaultDueDate() {
  const now = new Date();
  const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 15);
  return nextMonth.toISOString().split('T')[0];
}

export function useVendorsCommission() {
  const [activeTab, setActiveTab] = useState<CommissionStatus>(() => {
    const saved = sessionStorage.getItem('commission-active-tab');
    return (saved as CommissionStatus) || 'all';
  });

  const [commissions, setCommissions] = useState<CommissionRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPeriod, setSelectedPeriod] = useState(() => {
    const saved = sessionStorage.getItem('commission-selected-period');
    return saved || getCurrentPeriod();
  });
  const [sortField, setSortField] = useState<CommissionSortField>(null);
  const [sortOrder, setSortOrder] = useState<CommissionSortOrder>('desc');
  const [selectedAction, setSelectedAction] = useState('');
  const [showScreenOptions, setShowScreenOptions] = useState(false);
  const [itemsPerPage, setItemsPerPage] = useState(() => {
    const saved = localStorage.getItem('commission-per-page');
    return saved ? parseInt(saved) : 20;
  });
  const [visibleColumns, setVisibleColumns] = useState<Set<string>>(() => {
    const saved = localStorage.getItem('commission-visible-columns');
    if (saved) {
      return new Set(JSON.parse(saved));
    }
    return new Set(['period', 'sales', 'rate', 'amount', 'status', 'dueDate']);
  });
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [editingRates, setEditingRates] = useState<Map<string, number>>(new Map());

  const searchInputRef = useRef<HTMLInputElement>(null);
  const selectAllRef = useRef<HTMLInputElement>(null);

  // Fetch commissions from API
  useEffect(() => {
    const fetchCommissions = async () => {
      try {
        setLoading(true);

        const response = await authClient.api.get(`/vendors/commissions?period=${selectedPeriod}`);

        const data = response.data;
        const commissionsArray = data.data || data.commissions || [];

        // Transform API data to match CommissionRecord interface
        const transformedCommissions = commissionsArray.map((commission: any) => ({
          id: commission.id || `${commission.vendorId}-${commission.period}`,
          vendorId: commission.vendorId || commission.vendor_id,
          vendorName: commission.vendorName || commission.vendor_name || 'Unknown',
          businessName: commission.businessName || commission.business_name || 'Unknown Business',
          period: commission.period || selectedPeriod,
          sales: commission.sales || commission.total_sales || 0,
          commissionRate: commission.commissionRate || commission.commission_rate || 10,
          commissionAmount: commission.commissionAmount || commission.commission_amount || 0,
          status: commission.status || 'pending',
          paidDate: commission.paidDate || commission.paid_date,
          dueDate: commission.dueDate || commission.due_date || getDefaultDueDate(),
          bankAccount: commission.bankAccount || commission.bank_account,
          taxInvoice: commission.taxInvoice || commission.tax_invoice || false,
          notes: commission.notes
        }));

        setCommissions(transformedCommissions);
      } catch (error) {
        toast.error('수수료 데이터를 불러오는데 실패했습니다.');
        setCommissions([]);
      } finally {
        setLoading(false);
      }
    };

    fetchCommissions();
  }, [selectedPeriod]);

  // Save preferences
  useEffect(() => {
    sessionStorage.setItem('commission-active-tab', activeTab);
  }, [activeTab]);

  useEffect(() => {
    sessionStorage.setItem('commission-selected-period', selectedPeriod);
  }, [selectedPeriod]);

  // Filter and sort commissions
  const getFilteredCommissions = () => {
    let filtered = [...commissions];

    // Filter by status tab
    if (activeTab !== 'all') {
      filtered = filtered.filter(c => c.status === activeTab);
    }

    // Filter by search query
    if (searchQuery) {
      filtered = filtered.filter(c =>
        c.vendorName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.businessName.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Sort
    if (sortField) {
      filtered = filtered.sort((a, b) => {
        let aValue: any = a[sortField as keyof CommissionRecord];
        let bValue: any = b[sortField as keyof CommissionRecord];

        if (typeof aValue === 'string') {
          return sortOrder === 'asc'
            ? aValue.localeCompare(bValue)
            : bValue.localeCompare(aValue);
        } else if (typeof aValue === 'number') {
          return sortOrder === 'asc' ? aValue - bValue : bValue - aValue;
        } else if (aValue instanceof Date) {
          return sortOrder === 'asc'
            ? aValue.getTime() - bValue.getTime()
            : bValue.getTime() - aValue.getTime();
        }
        return 0;
      });
    } else {
      // Default sort by due date
      filtered = filtered.sort((a, b) => {
        const dateA = new Date(a.dueDate || '').getTime();
        const dateB = new Date(b.dueDate || '').getTime();
        return dateB - dateA;
      });
    }

    // Apply pagination
    return filtered.slice(0, itemsPerPage);
  };

  // Calculate summary statistics
  const calculateSummary = () => {
    const filtered = getFilteredCommissions();
    const total = filtered.reduce((sum, c) => sum + c.commissionAmount, 0);
    const paid = filtered.filter(c => c.status === 'paid').reduce((sum, c) => sum + c.commissionAmount, 0);
    const pending = filtered.filter(c => c.status === 'pending' || c.status === 'processing').reduce((sum, c) => sum + c.commissionAmount, 0);
    const avgRate = filtered.length > 0 ? filtered.reduce((sum, c) => sum + c.commissionRate, 0) / filtered.length : 0;

    return { total, paid, pending, avgRate };
  };

  // Handle actions
  const handleSort = (field: CommissionSortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedIds(new Set(getFilteredCommissions().map(c => c.id)));
    } else {
      setSelectedIds(new Set());
    }
  };

  const handleSelect = (id: string) => {
    const newSelectedIds = new Set(selectedIds);
    if (newSelectedIds.has(id)) {
      newSelectedIds.delete(id);
    } else {
      newSelectedIds.add(id);
    }
    setSelectedIds(newSelectedIds);
  };

  const handleBulkAction = async () => {
    if (!selectedAction) {
      alert('작업을 선택해주세요.');
      return;
    }

    if (selectedIds.size === 0) {
      alert('선택된 항목이 없습니다.');
      return;
    }

    if (selectedAction === 'pay') {
      if (confirm(`선택한 ${selectedIds.size}개 수수료를 지급 처리하시겠습니까?`)) {
        // API call would go here
        toast.success(`${selectedIds.size}개 수수료가 지급 처리되었습니다.`);
        setCommissions(commissions.map(c =>
          selectedIds.has(c.id) ? { ...c, status: 'paid' as const, paidDate: new Date().toISOString() } : c
        ));
        setSelectedIds(new Set());
        setSelectedAction('');
      }
    } else if (selectedAction === 'export') {
      toast.success('수수료 내역을 내보내는 중입니다.');
      // Export logic would go here
      setSelectedIds(new Set());
      setSelectedAction('');
    } else if (selectedAction === 'recalculate') {
      toast.success('수수료를 재계산하고 있습니다.');
      // Recalculation logic would go here
      setSelectedIds(new Set());
      setSelectedAction('');
    }
  };

  const handleQuickEditRate = (id: string, newRate: number) => {
    if (newRate < 0 || newRate > 100) {
      toast.error('수수료율은 0-100% 사이여야 합니다.');
      return;
    }

    setCommissions(commissions.map(c => {
      if (c.id === id) {
        const newAmount = Math.floor(c.sales * (newRate / 100));
        return { ...c, commissionRate: newRate, commissionAmount: newAmount };
      }
      return c;
    }));

    setEditingRates(new Map());
    toast.success('수수료율이 변경되었습니다.');
  };

  const handlePayCommission = async (id: string) => {
    if (confirm('이 수수료를 지급 처리하시겠습니까?')) {
      // API call would go here
      setCommissions(commissions.map(c =>
        c.id === id ? { ...c, status: 'paid' as const, paidDate: new Date().toISOString() } : c
      ));
      toast.success('수수료가 지급 처리되었습니다.');
    }
  };

  const toggleRowExpansion = (id: string) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedRows(newExpanded);
  };

  const toggleColumn = (column: string) => {
    const newVisibleColumns = new Set(visibleColumns);
    if (newVisibleColumns.has(column)) {
      newVisibleColumns.delete(column);
    } else {
      newVisibleColumns.add(column);
    }
    setVisibleColumns(newVisibleColumns);
    localStorage.setItem('commission-visible-columns', JSON.stringify(Array.from(newVisibleColumns)));
  };

  const getStatusBadge = (status: string) => {
    const badges = {
      paid: { icon: CheckCircle, color: 'text-green-600', bg: 'bg-green-100', label: '지급완료' },
      pending: { icon: Clock, color: 'text-yellow-600', bg: 'bg-yellow-100', label: '대기중' },
      processing: { icon: AlertCircle, color: 'text-blue-600', bg: 'bg-blue-100', label: '처리중' },
      scheduled: { icon: Calendar, color: 'text-purple-600', bg: 'bg-purple-100', label: '예정' }
    };

    const badge = badges[status as keyof typeof badges] || badges.pending;
    const Icon = badge.icon;

    return (
      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${badge.bg} ${badge.color}`}>
        <Icon className="w-3 h-3 mr-1" />
        {badge.label}
      </span>
    );
  };

  // Get tab counts
  const getTabCounts = () => {
    const all = commissions.length;
    const paid = commissions.filter(c => c.status === 'paid').length;
    const pending = commissions.filter(c => c.status === 'pending').length;
    const processing = commissions.filter(c => c.status === 'processing').length;
    const scheduled = commissions.filter(c => c.status === 'scheduled').length;

    return { all, paid, pending, processing, scheduled };
  };

  return {
    // State
    activeTab, setActiveTab,
    commissions, loading,
    selectedIds,
    searchQuery, setSearchQuery,
    selectedPeriod, setSelectedPeriod,
    sortField, sortOrder,
    selectedAction, setSelectedAction,
    showScreenOptions, setShowScreenOptions,
    itemsPerPage, setItemsPerPage,
    visibleColumns,
    expandedRows,
    editingRates, setEditingRates,
    searchInputRef, selectAllRef,
    // Handlers
    handleSort, handleSelectAll, handleSelect,
    handleBulkAction,
    handleQuickEditRate, handlePayCommission,
    toggleRowExpansion, toggleColumn,
    // Computed
    getFilteredCommissions, calculateSummary,
    getStatusBadge, getTabCounts,
    getCurrentPeriod: getCurrentPeriod,
  };
}
