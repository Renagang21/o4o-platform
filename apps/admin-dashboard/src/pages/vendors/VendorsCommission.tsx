import { ChangeEvent, useState } from 'react';
import { DollarSign, Percent, Calendar, Download, TrendingUp, TrendingDown, Filter, Eye, Edit2, CreditCard } from 'lucide-react';
import { WordPressTable, WordPressTableColumn, WordPressTableRow } from '@/components/common/WordPressTable';
import { BulkActionBar } from '@/components/common/BulkActionBar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { formatDate } from '@/lib/utils';
import toast from 'react-hot-toast';

interface CommissionData {
  vendorId: string;
  vendorName: string;
  businessName: string;
  period: string;
  sales: number;
  commissionRate: number;
  commissionAmount: number;
  status: 'paid' | 'pending' | 'processing';
  paidDate?: string;
}

// Commission data will be fetched from API

interface CommissionRate {
  category: string;
  rate: number;
  minSales?: number;
}

const commissionRates: CommissionRate[] = [
  { category: '일반 상품', rate: 10 },
  { category: '프리미엄 상품', rate: 8 },
  { category: '대량 판매자', rate: 7, minSales: 50000000 },
  { category: '신규 판매자', rate: 12 }
];

const VendorsCommission = () => {
  const [commissions] = useState<CommissionData[]>([]);
  const [selectedPeriod, setSelectedPeriod] = useState('2024-03');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedRows, setSelectedRows] = useState<string[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const filteredCommissions = commissions.filter((commission: any) => {
    const matchesPeriod = commission.period === selectedPeriod || selectedPeriod === 'all';
    const matchesStatus = statusFilter === 'all' || commission.status === statusFilter;
    const matchesSearch = searchTerm === '' || 
      commission.vendorName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      commission.businessName.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesPeriod && matchesStatus && matchesSearch;
  });

  const totalCommission = filteredCommissions.reduce((sum: number, c) => sum + c.commissionAmount, 0);
  const paidCommission = filteredCommissions
    .filter((c: any) => c.status === 'paid')
    .reduce((sum: number, c) => sum + c.commissionAmount, 0);
  const pendingCommission = filteredCommissions
    .filter((c: any) => c.status === 'pending' || c.status === 'processing')
    .reduce((sum: number, c) => sum + c.commissionAmount, 0);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'paid':
        return (
          <Badge variant="default" className="bg-green-100 text-green-800">
            지급완료
          </Badge>
        );
      case 'pending':
        return (
          <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
            대기중
          </Badge>
        );
      case 'processing':
        return (
          <Badge variant="outline" className="bg-blue-100 text-blue-800">
            처리중
          </Badge>
        );
      default:
        return null;
    }
  };

  // Bulk actions configuration
  const bulkActions = [
    {
      value: 'pay',
      label: '일괄 지급',
      action: async (ids: string[]) => {
        if (!confirm(`${ids.length}개 항목을 일괄 지급하시겠습니까?`)) return;
        setIsProcessing(true);
        try {
          // API call would go here
          await new Promise(resolve => setTimeout(resolve, 1000));
          toast.success(`${ids.length}개 수수료가 지급되었습니다.`);
        } catch (error) {
          toast.error('지급 처리 중 오류가 발생했습니다.');
        } finally {
          setIsProcessing(false);
          setSelectedRows([]);
        }
      },
      confirmMessage: '{count}개 항목을 일괄 지급하시겠습니까?'
    },
    {
      value: 'export',
      label: '내보내기',
      action: async (ids: string[]) => {
        toast.success('선택한 수수료 내역을 내보내는 중입니다.');
        // Export functionality would go here
      }
    },
    {
      value: 'calculate',
      label: '재계산',
      action: async (ids: string[]) => {
        setIsProcessing(true);
        try {
          await new Promise(resolve => setTimeout(resolve, 1000));
          toast.success('수수료가 재계산되었습니다.');
        } catch (error) {
          toast.error('재계산 중 오류가 발생했습니다.');
        } finally {
          setIsProcessing(false);
          setSelectedRows([]);
        }
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
      id: 'period',
      label: '기간',
      width: '100px'
    },
    {
      id: 'sales',
      label: '매출액',
      sortable: true,
      width: '120px'
    },
    {
      id: 'rate',
      label: '수수료율',
      sortable: true,
      width: '100px',
      align: 'center'
    },
    {
      id: 'commission',
      label: '수수료 금액',
      sortable: true,
      width: '120px'
    },
    {
      id: 'status',
      label: '상태',
      width: '100px'
    },
    {
      id: 'paidDate',
      label: '지급일',
      sortable: true,
      width: '120px'
    }
  ];

  // Transform commissions to table rows
  const rows: WordPressTableRow[] = filteredCommissions.map((commission: CommissionData) => ({
    id: `${commission.vendorId}-${commission.period}`,
    data: {
      vendor: (
        <div>
          <div className="text-sm font-medium text-gray-900">
            {commission.businessName}
          </div>
          <div className="text-sm text-gray-500">
            {commission.vendorName}
          </div>
        </div>
      ),
      period: (
        <div className="text-sm text-gray-600">
          {commission.period}
        </div>
      ),
      sales: (
        <div className="text-sm font-medium">
          ₩{commission.sales.toLocaleString()}
        </div>
      ),
      rate: (
        <div className="text-center">
          <div className="inline-flex items-center px-2 py-1 bg-blue-100 text-blue-800 text-sm rounded-full">
            {commission.commissionRate}%
          </div>
          {/* Visual progress bar */}
          <div className="w-full bg-gray-200 rounded-full h-1.5 mt-1">
            <div 
              className="bg-blue-600 h-1.5 rounded-full" 
              style={{ width: `${(commission.commissionRate / 15) * 100}%` }}
            />
          </div>
        </div>
      ),
      commission: (
        <div className="text-sm font-bold text-green-600">
          ₩{commission.commissionAmount.toLocaleString()}
        </div>
      ),
      status: getStatusBadge(commission.status),
      paidDate: (
        <div className="text-sm text-gray-600">
          {commission.paidDate ? formatDate(commission.paidDate) : '—'}
        </div>
      )
    },
    actions: [
      {
        label: '상세보기',
        onClick: () => {
          // Navigate to commission detail
          window.location.href = `/vendors/${commission.vendorId}/commission/${commission.period}`;
        }
      },
      {
        label: '내역보기',
        onClick: () => {
          // Show commission history
          toast('수수료 변경 내역을 조회합니다.');
        }
      },
      ...(commission.status === 'pending' ? [
        {
          label: '지급하기',
          onClick: () => {
            if (confirm('이 수수료를 지급하시겠습니까?')) {
              toast.success('수수료가 지급되었습니다.');
            }
          }
        }
      ] : []),
      ...(commission.status === 'paid' ? [
        {
          label: '정산서 보기',
          onClick: () => {
            // Show settlement document
            window.open(`/vendors/${commission.vendorId}/settlement/${commission.period}`);
          }
        }
      ] : []),
      {
        label: '수정',
        onClick: () => {
          // Edit commission
          window.location.href = `/vendors/${commission.vendorId}/commission/${commission.period}/edit`;
        }
      }
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
      setSelectedRows(filteredCommissions.map((c: CommissionData) => `${c.vendorId}-${c.period}`));
    } else {
      setSelectedRows([]);
    }
  };

  return (
    <div className="wrap">
      <h1 className="wp-heading-inline">수수료 관리</h1>
      <Button className="page-title-action" variant="default">
        <Download className="w-4 h-4 mr-2" />
        수수료 내역 다운로드
      </Button>
      <hr className="wp-header-end" />

      {/* Status Filter Links */}
      <ul className="subsubsub">
        <li className="all">
          <a 
            href="#" 
            className={statusFilter === 'all' ? 'current' : ''}
            onClick={(e) => { e.preventDefault(); setStatusFilter('all'); }}
          >
            전체 <span className="count">({commissions.length})</span>
          </a> |
        </li>
        <li className="paid">
          <a 
            href="#" 
            className={statusFilter === 'paid' ? 'current' : ''}
            onClick={(e) => { e.preventDefault(); setStatusFilter('paid'); }}
          >
            지급완료 <span className="count">({commissions.filter(c => c.status === 'paid').length})</span>
          </a> |
        </li>
        <li className="pending">
          <a 
            href="#" 
            className={statusFilter === 'pending' ? 'current' : ''}
            onClick={(e) => { e.preventDefault(); setStatusFilter('pending'); }}
          >
            대기중 <span className="count">({commissions.filter(c => c.status === 'pending').length})</span>
          </a> |
        </li>
        <li className="processing">
          <a 
            href="#" 
            className={statusFilter === 'processing' ? 'current' : ''}
            onClick={(e) => { e.preventDefault(); setStatusFilter('processing'); }}
          >
            처리중 <span className="count">({commissions.filter(c => c.status === 'processing').length})</span>
          </a>
        </li>
      </ul>

      {/* Commission Summary Stats */}
      <div className="postbox-container">
        <div className="meta-box-sortables">
          <div className="postbox">
            <div className="postbox-header">
              <h2 className="hndle">수수료 요약</h2>
            </div>
            <div className="inside">
              <div className="main">
                <ul className="wp-list-table widefat">
                  <li>
                    <span className="list-table-label">총 수수료:</span>
                    <span className="list-table-value">₩{totalCommission.toLocaleString()}</span>
                  </li>
                  <li>
                    <span className="list-table-label">지급 완료:</span>
                    <span className="list-table-value text-green-600">₩{paidCommission.toLocaleString()}</span>
                  </li>
                  <li>
                    <span className="list-table-label">미지급:</span>
                    <span className="list-table-value text-yellow-600">₩{pendingCommission.toLocaleString()}</span>
                  </li>
                  <li>
                    <span className="list-table-label">평균 수수료율:</span>
                    <span className="list-table-value">9.5%</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="wp-filter">
        <div className="filter-items">
          <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="전체 기간" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">전체 기간</SelectItem>
              <SelectItem value="2024-03">2024년 3월</SelectItem>
              <SelectItem value="2024-02">2024년 2월</SelectItem>
              <SelectItem value="2024-01">2024년 1월</SelectItem>
            </SelectContent>
          </Select>
          
          <div className="search-box">
            <Input
              type="search"
              placeholder="판매자 검색..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
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
        emptyMessage="수수료 내역이 없습니다."
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

export default VendorsCommission;