import React, { useState, useEffect, useRef } from 'react';
import {
  Search,
  Download,
  DollarSign,
  Percent,
  Calendar,
  TrendingUp,
  TrendingDown,
  AlertCircle,
  CheckCircle,
  Clock,
  CreditCard,
  FileText,
  Calculator,
  Settings,
  ChevronDown,
  ChevronUp,
  Filter
} from 'lucide-react';
import AdminBreadcrumb from '@/components/common/AdminBreadcrumb';
import toast from 'react-hot-toast';
import { authClient } from '@o4o/auth-client';

type CommissionStatus = 'all' | 'paid' | 'pending' | 'processing' | 'scheduled';
type SortField = 'vendorName' | 'sales' | 'rate' | 'amount' | 'date' | null;
type SortOrder = 'asc' | 'desc';

interface CommissionRecord {
  id: string;
  vendorId: string;
  vendorName: string;
  businessName: string;
  period: string;
  sales: number;
  commissionRate: number;
  commissionAmount: number;
  status: 'paid' | 'pending' | 'processing' | 'scheduled';
  paidDate?: string;
  dueDate?: string;
  bankAccount?: string;
  taxInvoice?: boolean;
  notes?: string;
}

const VendorsCommissionAdmin = () => {
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
  const [sortField, setSortField] = useState<SortField>(null);
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
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

  // Get current period (YYYY-MM format)
  function getCurrentPeriod() {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  }

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

  // Get default due date (15th of next month)
  function getDefaultDueDate() {
    const now = new Date();
    const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 15);
    return nextMonth.toISOString().split('T')[0];
  }

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
  const handleSort = (field: SortField) => {
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

  const filteredCommissions = getFilteredCommissions();
  const summary = calculateSummary();

  // Get tab counts
  const getTabCounts = () => {
    const all = commissions.length;
    const paid = commissions.filter(c => c.status === 'paid').length;
    const pending = commissions.filter(c => c.status === 'pending').length;
    const processing = commissions.filter(c => c.status === 'processing').length;
    const scheduled = commissions.filter(c => c.status === 'scheduled').length;
    
    return { all, paid, pending, processing, scheduled };
  };

  const counts = getTabCounts();

  if (loading) {
    return (
      <div className="o4o-admin-container">
        <div className="loading-spinner">로딩 중...</div>
      </div>
    );
  }

  return (
    <div className="o4o-admin-container">
      <AdminBreadcrumb
        items={[
          { label: '판매자/공급자', path: '/admin/vendors' },
          { label: '수수료 관리' }
        ]} 
      />
      
      <div className="o4o-page-header">
        <h1 className="o4o-heading-inline">수수료 관리</h1>
        <a href="#" className="page-title-action" onClick={(e) => {
          e.preventDefault();
          toast.success('수수료 내역을 다운로드하고 있습니다.');
        }}>
          <Download className="w-4 h-4 inline mr-1" />
          내역 다운로드
        </a>
        <button 
          className="o4o-screen-options-toggle"
          onClick={() => setShowScreenOptions(!showScreenOptions)}
        >
          <Settings className="w-4 h-4" />
          화면 옵션
        </button>
      </div>

      {/* Screen Options */}
      {showScreenOptions && (
        <div className="o4o-screen-options">
          <div className="screen-options-wrap">
            <fieldset className="columns-group">
              <legend>열</legend>
              <label>
                <input 
                  type="checkbox"
                  checked={visibleColumns.has('period')}
                  onChange={() => toggleColumn('period')}
                />
                기간
              </label>
              <label>
                <input 
                  type="checkbox"
                  checked={visibleColumns.has('sales')}
                  onChange={() => toggleColumn('sales')}
                />
                매출액
              </label>
              <label>
                <input 
                  type="checkbox"
                  checked={visibleColumns.has('rate')}
                  onChange={() => toggleColumn('rate')}
                />
                수수료율
              </label>
              <label>
                <input 
                  type="checkbox"
                  checked={visibleColumns.has('amount')}
                  onChange={() => toggleColumn('amount')}
                />
                수수료 금액
              </label>
              <label>
                <input 
                  type="checkbox"
                  checked={visibleColumns.has('status')}
                  onChange={() => toggleColumn('status')}
                />
                상태
              </label>
              <label>
                <input 
                  type="checkbox"
                  checked={visibleColumns.has('dueDate')}
                  onChange={() => toggleColumn('dueDate')}
                />
                지급예정일
              </label>
              <label>
                <input 
                  type="checkbox"
                  checked={visibleColumns.has('bankAccount')}
                  onChange={() => toggleColumn('bankAccount')}
                />
                계좌정보
              </label>
            </fieldset>
            
            <fieldset className="pagination-group">
              <legend>페이지당 항목 수</legend>
              <label>
                페이지당 항목 수:
                <input 
                  type="number"
                  value={itemsPerPage}
                  onChange={(e) => {
                    const value = Math.max(1, parseInt(e.target.value) || 20);
                    setItemsPerPage(value);
                    localStorage.setItem('commission-per-page', value.toString());
                  }}
                  min="1"
                  max="999"
                />
              </label>
            </fieldset>
          </div>
          <button 
            className="o4o-button"
            onClick={() => setShowScreenOptions(false)}
          >
            적용
          </button>
        </div>
      )}

      {/* Summary Cards */}
      <div className="o4o-stats-cards">
        <div className="stats-card">
          <div className="stats-icon bg-blue-100">
            <DollarSign className="w-6 h-6 text-blue-600" />
          </div>
          <div className="stats-content">
            <div className="stats-label">총 수수료</div>
            <div className="stats-value">₩{summary.total.toLocaleString()}</div>
          </div>
        </div>
        <div className="stats-card">
          <div className="stats-icon bg-green-100">
            <CheckCircle className="w-6 h-6 text-green-600" />
          </div>
          <div className="stats-content">
            <div className="stats-label">지급 완료</div>
            <div className="stats-value text-green-600">₩{summary.paid.toLocaleString()}</div>
          </div>
        </div>
        <div className="stats-card">
          <div className="stats-icon bg-yellow-100">
            <Clock className="w-6 h-6 text-yellow-600" />
          </div>
          <div className="stats-content">
            <div className="stats-label">미지급</div>
            <div className="stats-value text-yellow-600">₩{summary.pending.toLocaleString()}</div>
          </div>
        </div>
        <div className="stats-card">
          <div className="stats-icon bg-purple-100">
            <Percent className="w-6 h-6 text-purple-600" />
          </div>
          <div className="stats-content">
            <div className="stats-label">평균 수수료율</div>
            <div className="stats-value">{summary.avgRate.toFixed(1)}%</div>
          </div>
        </div>
      </div>

      {/* Status Tabs */}
      <ul className="o4o-tabs">
        <li className={activeTab === 'all' ? 'active' : ''}>
          <a
            href="#"
            onClick={(e) => {
              e.preventDefault();
              setActiveTab('all');
            }}
          >
            전체 <span className="count">({counts.all})</span>
          </a>
        </li>
        <li className={activeTab === 'paid' ? 'active' : ''}>
          <a
            href="#"
            onClick={(e) => {
              e.preventDefault();
              setActiveTab('paid');
            }}
          >
            지급완료 <span className="count">({counts.paid})</span>
          </a>
        </li>
        <li className={activeTab === 'pending' ? 'active' : ''}>
          <a
            href="#"
            onClick={(e) => {
              e.preventDefault();
              setActiveTab('pending');
            }}
          >
            대기중 <span className="count">({counts.pending})</span>
          </a>
        </li>
        <li className={activeTab === 'processing' ? 'active' : ''}>
          <a
            href="#"
            onClick={(e) => {
              e.preventDefault();
              setActiveTab('processing');
            }}
          >
            처리중 <span className="count">({counts.processing})</span>
          </a>
        </li>
        <li className={activeTab === 'scheduled' ? 'active' : ''}>
          <a
            href="#"
            onClick={(e) => {
              e.preventDefault();
              setActiveTab('scheduled');
            }}
          >
            예정 <span className="count">({counts.scheduled})</span>
          </a>
        </li>
      </ul>

      {/* Controls */}
      <div className="o4o-list-controls">
        <div className="o4o-bulk-actions">
          <select 
            value={selectedAction}
            onChange={(e) => setSelectedAction(e.target.value)}
            className="o4o-select"
          >
            <option value="">일괄 작업</option>
            <option value="pay">일괄 지급</option>
            <option value="export">내보내기</option>
            <option value="recalculate">재계산</option>
          </select>
          <button 
            className="o4o-button"
            onClick={handleBulkAction}
          >
            적용
          </button>
          
          <select 
            value={selectedPeriod}
            onChange={(e) => setSelectedPeriod(e.target.value)}
            className="o4o-select"
            style={{ marginLeft: '10px' }}
          >
            <option value={getCurrentPeriod()}>{getCurrentPeriod()} (이번달)</option>
            <option value="2024-11">2024-11</option>
            <option value="2024-10">2024-10</option>
            <option value="2024-09">2024-09</option>
            <option value="2024-08">2024-08</option>
          </select>
        </div>
        
        <div className="o4o-search-box">
          <input 
            ref={searchInputRef}
            type="search" 
            placeholder="판매자 검색..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
              }
            }}
          />
          <button className="o4o-button">
            <Search className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Table */}
      {filteredCommissions.length === 0 ? (
        <div className="o4o-no-items">
          {selectedPeriod} 수수료 내역이 없습니다.
        </div>
      ) : (
        <table className="o4o-list-table widefat fixed striped">
          <thead>
            <tr>
              <td className="check-column">
                <input 
                  ref={selectAllRef}
                  type="checkbox" 
                  onChange={handleSelectAll}
                  checked={selectedIds.size > 0 && selectedIds.size === filteredCommissions.length}
                />
              </td>
              <th className="column-title column-primary">
                <a 
                  href="#" 
                  onClick={(e) => {
                    e.preventDefault();
                    handleSort('vendorName');
                  }}
                  className={sortField === 'vendorName' ? 'sorted' : ''}
                >
                  판매자
                  {sortField === 'vendorName' && (
                    <span className="sorting-indicator" data-order={sortOrder} />
                  )}
                </a>
              </th>
              {visibleColumns.has('period') && <th>기간</th>}
              {visibleColumns.has('sales') && (
                <th>
                  <a 
                    href="#" 
                    onClick={(e) => {
                      e.preventDefault();
                      handleSort('sales');
                    }}
                    className={sortField === 'sales' ? 'sorted' : ''}
                  >
                    매출액
                    {sortField === 'sales' && (
                      <span className="sorting-indicator" data-order={sortOrder} />
                    )}
                  </a>
                </th>
              )}
              {visibleColumns.has('rate') && (
                <th>
                  <a 
                    href="#" 
                    onClick={(e) => {
                      e.preventDefault();
                      handleSort('rate');
                    }}
                    className={sortField === 'rate' ? 'sorted' : ''}
                  >
                    수수료율
                    {sortField === 'rate' && (
                      <span className="sorting-indicator" data-order={sortOrder} />
                    )}
                  </a>
                </th>
              )}
              {visibleColumns.has('amount') && (
                <th>
                  <a 
                    href="#" 
                    onClick={(e) => {
                      e.preventDefault();
                      handleSort('amount');
                    }}
                    className={sortField === 'amount' ? 'sorted' : ''}
                  >
                    수수료
                    {sortField === 'amount' && (
                      <span className="sorting-indicator" data-order={sortOrder} />
                    )}
                  </a>
                </th>
              )}
              {visibleColumns.has('status') && <th>상태</th>}
              {visibleColumns.has('dueDate') && (
                <th>
                  <a 
                    href="#" 
                    onClick={(e) => {
                      e.preventDefault();
                      handleSort('date');
                    }}
                    className={sortField === 'date' ? 'sorted' : ''}
                  >
                    지급예정일
                    {sortField === 'date' && (
                      <span className="sorting-indicator" data-order={sortOrder} />
                    )}
                  </a>
                </th>
              )}
              {visibleColumns.has('bankAccount') && <th>계좌정보</th>}
              <th className="column-expand"></th>
            </tr>
          </thead>
          <tbody>
            {filteredCommissions.map(commission => {
              const isEditing = editingRates.has(commission.id);
              const isExpanded = expandedRows.has(commission.id);
              const isSelected = selectedIds.has(commission.id);
              
              return (
                <React.Fragment key={commission.id}>
                  <tr className={`o4o-list-row ${isSelected ? 'selected' : ''}`}>
                    <td className="check-column">
                      <input 
                        type="checkbox" 
                        checked={isSelected}
                        onChange={() => handleSelect(commission.id)}
                      />
                    </td>
                    <td className="title-column">
                      <div className="vendor-info">
                        <strong>{commission.businessName}</strong>
                        <div className="vendor-meta">
                          {commission.vendorName}
                        </div>
                      </div>
                      <div className="row-actions">
                        <span className="view">
                          <a href="#">상세보기</a>
                        </span> | 
                        {commission.status === 'pending' && (
                          <>
                            <span className="pay">
                              <a href="#" onClick={(e) => {
                                e.preventDefault();
                                handlePayCommission(commission.id);
                              }} className="text-green-600">지급하기</a>
                            </span> | 
                          </>
                        )}
                        <span className="edit">
                          <a href="#" onClick={(e) => {
                            e.preventDefault();
                            setEditingRates(new Map([[commission.id, commission.commissionRate]]));
                          }}>수수료율 변경</a>
                        </span> |
                        <span className="invoice">
                          <a href="#">세금계산서</a>
                        </span>
                      </div>
                    </td>
                    {visibleColumns.has('period') && (
                      <td>{commission.period}</td>
                    )}
                    {visibleColumns.has('sales') && (
                      <td className="amount-column">
                        <strong>₩{commission.sales.toLocaleString()}</strong>
                      </td>
                    )}
                    {visibleColumns.has('rate') && (
                      <td className="rate-column">
                        {isEditing ? (
                          <div className="rate-edit">
                            <input 
                              type="number"
                              min="0"
                              max="100"
                              step="0.1"
                              value={editingRates.get(commission.id)}
                              onChange={(e) => {
                                const newRates = new Map(editingRates);
                                newRates.set(commission.id, parseFloat(e.target.value));
                                setEditingRates(newRates);
                              }}
                              className="rate-input"
                            />
                            <span>%</span>
                            <button 
                              className="o4o-button button-primary button-small"
                              onClick={() => handleQuickEditRate(commission.id, editingRates.get(commission.id) || commission.commissionRate)}
                            >
                              저장
                            </button>
                            <button 
                              className="o4o-button button-secondary button-small"
                              onClick={() => setEditingRates(new Map())}
                            >
                              취소
                            </button>
                          </div>
                        ) : (
                          <div className="rate-display">
                            <span className="rate-badge">{commission.commissionRate}%</span>
                            <div className="rate-bar">
                              <div 
                                className="rate-bar-fill"
                                style={{ width: `${Math.min((commission.commissionRate / 20) * 100, 100)}%` }}
                              />
                            </div>
                          </div>
                        )}
                      </td>
                    )}
                    {visibleColumns.has('amount') && (
                      <td className="amount-column">
                        <strong className="commission-amount">
                          ₩{commission.commissionAmount.toLocaleString()}
                        </strong>
                      </td>
                    )}
                    {visibleColumns.has('status') && (
                      <td>{getStatusBadge(commission.status)}</td>
                    )}
                    {visibleColumns.has('dueDate') && (
                      <td>
                        {commission.status === 'paid' ? (
                          <span className="paid-date">
                            {commission.paidDate ? new Date(commission.paidDate).toLocaleDateString('ko-KR') : '-'}
                          </span>
                        ) : (
                          <span className="due-date">
                            {commission.dueDate ? new Date(commission.dueDate).toLocaleDateString('ko-KR') : '-'}
                          </span>
                        )}
                      </td>
                    )}
                    {visibleColumns.has('bankAccount') && (
                      <td className="bank-account">
                        {commission.bankAccount || '-'}
                      </td>
                    )}
                    <td className="expand-column">
                      <button
                        onClick={() => toggleRowExpansion(commission.id)}
                        className="expand-button"
                      >
                        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </button>
                    </td>
                  </tr>
                  {isExpanded && (
                    <tr className="expanded-details">
                      <td colSpan={10}>
                        <div className="commission-details-grid">
                          <div className="detail-section">
                            <h4>
                              <Calculator className="w-4 h-4 inline mr-1" />
                              수수료 계산 상세
                            </h4>
                            <div className="detail-content">
                              <p><strong>총 매출:</strong> ₩{commission.sales.toLocaleString()}</p>
                              <p><strong>수수료율:</strong> {commission.commissionRate}%</p>
                              <p><strong>수수료 금액:</strong> ₩{commission.commissionAmount.toLocaleString()}</p>
                              <p><strong>세금계산서:</strong> {commission.taxInvoice ? '발행완료' : '미발행'}</p>
                            </div>
                          </div>
                          
                          <div className="detail-section">
                            <h4>
                              <CreditCard className="w-4 h-4 inline mr-1" />
                              지급 정보
                            </h4>
                            <div className="detail-content">
                              <p><strong>상태:</strong> {getStatusBadge(commission.status)}</p>
                              <p><strong>지급예정일:</strong> {commission.dueDate ? new Date(commission.dueDate).toLocaleDateString('ko-KR') : '-'}</p>
                              <p><strong>지급일:</strong> {commission.paidDate ? new Date(commission.paidDate).toLocaleDateString('ko-KR') : '-'}</p>
                              <p><strong>계좌정보:</strong> {commission.bankAccount || '등록필요'}</p>
                            </div>
                          </div>
                          
                          <div className="detail-section">
                            <h4>
                              <FileText className="w-4 h-4 inline mr-1" />
                              관련 문서
                            </h4>
                            <div className="detail-content">
                              <div className="document-list">
                                <a href="#" className="document-link">정산내역서 다운로드</a>
                                <a href="#" className="document-link">세금계산서 다운로드</a>
                                <a href="#" className="document-link">거래명세서 다운로드</a>
                              </div>
                            </div>
                          </div>
                          
                          {commission.notes && (
                            <div className="detail-section">
                              <h4>
                                <AlertCircle className="w-4 h-4 inline mr-1" />
                                메모
                              </h4>
                              <div className="detail-content">
                                <p>{commission.notes}</p>
                              </div>
                            </div>
                          )}
                          
                          <div className="detail-actions">
                            {commission.status === 'pending' && (
                              <button 
                                className="o4o-button button-primary"
                                onClick={() => handlePayCommission(commission.id)}
                              >
                                지급 처리
                              </button>
                            )}
                            <button className="o4o-button">
                              정산서 발송
                            </button>
                            <button className="o4o-button">
                              세금계산서 발행
                            </button>
                            <button className="o4o-button button-secondary">
                              수정
                            </button>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      )}

      <div className="tablenav bottom">
        <div className="tablenav-pages">
          <span className="displaying-num">{filteredCommissions.length}개 항목</span>
        </div>
      </div>

      <style>{`
        .o4o-stats-cards {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
          gap: 20px;
          margin: 20px 0;
        }
        
        .stats-card {
          background: white;
          border: 1px solid #ccd0d4;
          padding: 20px;
          display: flex;
          align-items: center;
          gap: 15px;
        }
        
        .stats-icon {
          width: 50px;
          height: 50px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        
        .stats-content {
          flex: 1;
        }
        
        .stats-label {
          font-size: 13px;
          color: #646970;
          margin-bottom: 5px;
        }
        
        .stats-value {
          font-size: 20px;
          font-weight: 600;
          color: #1d2327;
        }
        
        .vendor-info {
          margin-bottom: 5px;
        }
        
        .vendor-meta {
          font-size: 12px;
          color: #646970;
        }
        
        .amount-column {
          text-align: right;
        }
        
        .commission-amount {
          color: #10b981;
        }
        
        .rate-column {
          width: 150px;
        }
        
        .rate-display {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }
        
        .rate-badge {
          display: inline-block;
          padding: 2px 8px;
          background: #e0f2fe;
          color: #0369a1;
          border-radius: 3px;
          font-size: 12px;
          font-weight: 600;
        }
        
        .rate-bar {
          width: 100%;
          height: 4px;
          background: #e5e7eb;
          border-radius: 2px;
          overflow: hidden;
        }
        
        .rate-bar-fill {
          height: 100%;
          background: #0369a1;
          transition: width 0.3s ease;
        }
        
        .rate-edit {
          display: flex;
          align-items: center;
          gap: 5px;
        }
        
        .rate-input {
          width: 60px;
          padding: 2px 4px;
          border: 1px solid #8c8f94;
        }
        
        .bank-account {
          font-family: monospace;
          font-size: 12px;
        }
        
        .paid-date {
          color: #10b981;
          font-weight: 500;
        }
        
        .due-date {
          color: #646970;
        }
        
        .expand-button {
          background: none;
          border: none;
          padding: 4px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        
        .expand-button:hover {
          background: #f0f0f1;
          border-radius: 3px;
        }
        
        .expanded-details {
          background: #f6f7f7;
        }
        
        .expanded-details td {
          padding: 20px;
        }
        
        .commission-details-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
          gap: 20px;
          margin-bottom: 20px;
        }
        
        .detail-section {
          background: white;
          padding: 15px;
          border: 1px solid #dcdcde;
          border-radius: 4px;
        }
        
        .detail-section h4 {
          margin: 0 0 10px 0;
          font-size: 14px;
          font-weight: 600;
          display: flex;
          align-items: center;
        }
        
        .detail-content p {
          margin: 5px 0;
        }
        
        .document-list {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        
        .document-link {
          color: #2271b1;
          text-decoration: none;
        }
        
        .document-link:hover {
          text-decoration: underline;
        }
        
        .detail-actions {
          display: flex;
          gap: 10px;
          padding-top: 15px;
          border-top: 1px solid #dcdcde;
        }
        
        .button-small {
          padding: 2px 8px;
          font-size: 12px;
        }
      `}</style>
    </div>
  );
};

export default VendorsCommissionAdmin;