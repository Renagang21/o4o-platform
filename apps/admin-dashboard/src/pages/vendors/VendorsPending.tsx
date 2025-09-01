import { useState } from 'react';
import { Clock, CheckCircle, XCircle, Eye, FileText, Mail, User, Phone, MapPin } from 'lucide-react';
import { WordPressTable, WordPressTableColumn, WordPressTableRow } from '@/components/common/WordPressTable';
import { BulkActionBar } from '@/components/common/BulkActionBar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { formatDate } from '@/lib/utils';
import toast from 'react-hot-toast';

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
}

const mockPendingVendors: PendingVendor[] = [
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
    appliedAt: '2024-03-10T10:30:00',
    message: '건강식품 전문 판매자로 활동하고 싶습니다.'
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
    appliedAt: '2024-03-09T14:20:00'
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
    appliedAt: '2024-03-08T09:15:00',
    message: '화장품 및 뷰티 제품을 판매하려고 합니다.'
  }
];

const VendorsPending = () => {
  const [vendors, setVendors] = useState(mockPendingVendors);
  const [selectedVendor, setSelectedVendor] = useState<PendingVendor | null>(null);
  const [loading, setLoading] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedRows, setSelectedRows] = useState<string[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [businessTypeFilter, setBusinessTypeFilter] = useState('all');

  const filteredVendors = vendors.filter((vendor) => {
    const matchesSearch = searchTerm === '' ||
      vendor.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      vendor.businessName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      vendor.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesBusinessType = businessTypeFilter === 'all' || vendor.businessType === businessTypeFilter;
    return matchesSearch && matchesBusinessType;
  });

  const getDocumentStatus = (docs: PendingVendor['documents']) => {
    const total = Object.keys(docs).length;
    const verified = Object.values(docs).filter(Boolean).length;
    return { verified, total };
  };

  const getWaitingDays = (appliedAt: string) => {
    const now = new Date();
    const applied = new Date(appliedAt);
    const diffTime = Math.abs(now.getTime() - applied.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const getBusinessTypeBadge = (type: 'seller' | 'supplier') => {
    return (
      <Badge variant={type === 'seller' ? 'default' : 'secondary'}>
        {type === 'seller' ? '판매자' : '공급자'}
      </Badge>
    );
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleApprove = async (vendorId: string) => {
    try {
      setLoading(true);
      // In real implementation, this would be an API call
      // await api.post(`/v1/vendors/${vendorId}/approve`);
      
      // Mock implementation
      toast.success('판매자가 승인되었습니다.');
      setVendors(vendors.filter((v: any) => v.id !== vendorId));
    } catch (error: any) {
    // Error logging - use proper error handler
      toast.error('승인 처리 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleReject = async (vendorId: string) => {
    const reason = prompt('거절 사유를 입력해주세요:');
    if (!reason) return;
    
    try {
      setLoading(true);
      // In real implementation, this would be an API call
      // await api.post(`/v1/vendors/${vendorId}/reject`, { reason });
      
      // Mock implementation
      toast.success('판매자 신청이 거절되었습니다.');
      setVendors(vendors.filter((v: any) => v.id !== vendorId));
    } catch (error: any) {
    // Error logging - use proper error handler
      toast.error('거절 처리 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  // Bulk actions configuration
  const bulkActions = [
    {
      value: 'approve',
      label: '일괄 승인',
      action: async (ids: string[]) => {
        if (!confirm(`${ids.length}개 판매자를 일괄 승인하시겠습니까?`)) return;
        setIsProcessing(true);
        try {
          // API call would go here
          await new Promise(resolve => setTimeout(resolve, 1000));
          toast.success(`${ids.length}개 판매자가 승인되었습니다.`);
          setVendors(vendors.filter(v => !ids.includes(v.id)));
        } catch (error) {
          toast.error('일괄 승인 처리 중 오류가 발생했습니다.');
        } finally {
          setIsProcessing(false);
          setSelectedRows([]);
        }
      },
      confirmMessage: '{count}개 판매자를 일괄 승인하시겠습니까?'
    },
    {
      value: 'reject',
      label: '일괄 거부',
      action: async (ids: string[]) => {
        const reason = prompt('거부 사유를 입력해주세요:');
        if (!reason) return;
        if (!confirm(`${ids.length}개 판매자를 일괄 거부하시겠습니까?`)) return;
        
        setIsProcessing(true);
        try {
          // API call would go here
          await new Promise(resolve => setTimeout(resolve, 1000));
          toast.success(`${ids.length}개 판매자 신청이 거부되었습니다.`);
          setVendors(vendors.filter(v => !ids.includes(v.id)));
        } catch (error) {
          toast.error('일괄 거부 처리 중 오류가 발생했습니다.');
        } finally {
          setIsProcessing(false);
          setSelectedRows([]);
        }
      },
      confirmMessage: '{count}개 판매자를 일괄 거부하시겠습니까?',
      isDestructive: true
    },
    {
      value: 'message',
      label: '메시지 발송',
      action: async (ids: string[]) => {
        const message = prompt('발송할 메시지를 입력해주세요:');
        if (!message) return;
        
        setIsProcessing(true);
        try {
          await new Promise(resolve => setTimeout(resolve, 1000));
          toast.success(`${ids.length}명에게 메시지를 발송했습니다.`);
        } catch (error) {
          toast.error('메시지 발송 중 오류가 발생했습니다.');
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
      id: 'applicant',
      label: '신청자 정보',
      sortable: true
    },
    {
      id: 'businessType',
      label: '유형',
      width: '80px'
    },
    {
      id: 'documents',
      label: '서류 현황',
      width: '120px',
      align: 'center'
    },
    {
      id: 'appliedAt',
      label: '신청일',
      sortable: true,
      width: '120px'
    },
    {
      id: 'waitingDays',
      label: '대기 기간',
      sortable: true,
      width: '100px',
      align: 'center'
    },
    {
      id: 'contact',
      label: '연락처',
      width: '150px'
    }
  ];

  // Transform vendors to table rows
  const rows: WordPressTableRow[] = filteredVendors.map((vendor: PendingVendor) => {
    const docStatus = getDocumentStatus(vendor.documents);
    const waitingDays = getWaitingDays(vendor.appliedAt);
    
    return {
      id: vendor.id,
      data: {
        applicant: (
          <div>
            <div className="text-sm font-medium text-gray-900">
              {vendor.businessName}
            </div>
            <div className="text-sm text-gray-500">
              {vendor.name}
            </div>
            <div className="text-xs text-gray-400 mt-1">
              사업자번호: {vendor.businessNumber}
            </div>
            {vendor.message && (
              <div className="text-xs text-blue-600 mt-1 line-clamp-2">
                "{vendor.message}"
              </div>
            )}
          </div>
        ),
        businessType: getBusinessTypeBadge(vendor.businessType),
        documents: (
          <div className="text-center">
            <div className="inline-flex items-center px-2 py-1 text-xs rounded-full bg-gray-100 text-gray-800">
              {docStatus.verified}/{docStatus.total} 완료
            </div>
            <div className="w-full bg-gray-200 rounded-full h-1.5 mt-1">
              <div 
                className={`h-1.5 rounded-full ${
                  docStatus.verified === docStatus.total ? 'bg-green-600' :
                  docStatus.verified > 0 ? 'bg-yellow-600' : 'bg-red-600'
                }`}
                style={{ width: `${(docStatus.verified / docStatus.total) * 100}%` }}
              />
            </div>
          </div>
        ),
        appliedAt: (
          <div className="text-sm text-gray-600">
            {formatDate(vendor.appliedAt)}
          </div>
        ),
        waitingDays: (
          <div className="text-center">
            <span className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded-full ${
              waitingDays > 3 ? 'bg-red-100 text-red-800' :
              waitingDays > 1 ? 'bg-yellow-100 text-yellow-800' :
              'bg-green-100 text-green-800'
            }`}>
              {waitingDays}일
            </span>
          </div>
        ),
        contact: (
          <div className="text-sm">
            <div className="flex items-center gap-1 text-gray-600">
              <Mail className="w-3 h-3" />
              <span className="truncate">{vendor.email}</span>
            </div>
            <div className="flex items-center gap-1 text-gray-600 mt-1">
              <Phone className="w-3 h-3" />
              <span>{vendor.phoneNumber}</span>
            </div>
          </div>
        )
      },
      actions: [
        {
          label: '상세보기',
          onClick: () => {
            setSelectedVendor(vendor);
            setShowDetailModal(true);
          }
        },
        {
          label: '승인',
          onClick: () => {
            if (confirm('이 판매자를 승인하시겠습니까?')) {
              handleApprove(vendor.id);
            }
          }
        },
        {
          label: '거부',
          onClick: () => {
            handleReject(vendor.id);
          },
          className: 'text-red-600'
        },
        {
          label: '메시지 발송',
          onClick: () => {
            const message = prompt('발송할 메시지를 입력해주세요:');
            if (message) {
              toast.success('메시지를 발송했습니다.');
            }
          }
        },
        {
          label: '서류 다운로드',
          onClick: () => {
            // Download documents functionality
            toast('서류를 다운로드합니다.');
          }
        }
      ]
    };
  });

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
      setSelectedRows(filteredVendors.map((v: PendingVendor) => v.id));
    } else {
      setSelectedRows([]);
    }
  };

  return (
    <div className="wrap">
      <h1 className="wp-heading-inline">승인 대기 판매자</h1>
      <hr className="wp-header-end" />

      {/* Status Filter Links */}
      <ul className="subsubsub">
        <li className="all">
          <a href="#" className="current">
            전체 <span className="count">({vendors.length})</span>
          </a> |
        </li>
        <li className="today">
          <a href="#">
            오늘 신청 <span className="count">(2)</span>
          </a> |
        </li>
        <li className="urgent">
          <a href="#">
            긴급 처리 <span className="count">({vendors.filter(v => getWaitingDays(v.appliedAt) > 3).length})</span>
          </a>
        </li>
      </ul>

      {/* Summary Stats */}
      <div className="postbox-container">
        <div className="meta-box-sortables">
          <div className="postbox">
            <div className="postbox-header">
              <h2 className="hndle">승인 대기 현황</h2>
            </div>
            <div className="inside">
              <div className="main">
                <ul className="wp-list-table widefat">
                  <li>
                    <span className="list-table-label">대기 중:</span>
                    <span className="list-table-value">{vendors.length}명</span>
                  </li>
                  <li>
                    <span className="list-table-label">오늘 신청:</span>
                    <span className="list-table-value">2명</span>
                  </li>
                  <li>
                    <span className="list-table-label">평균 대기 시간:</span>
                    <span className="list-table-value">
                      {vendors.length > 0 ? 
                        Math.round(vendors.reduce((sum, v) => sum + getWaitingDays(v.appliedAt), 0) / vendors.length) : 0
                      }일
                    </span>
                  </li>
                  <li>
                    <span className="list-table-label">서류 완료율:</span>
                    <span className="list-table-value">
                      {vendors.length > 0 ? 
                        Math.round(vendors.filter(v => {
                          const status = getDocumentStatus(v.documents);
                          return status.verified === status.total;
                        }).length / vendors.length * 100) : 0
                      }%
                    </span>
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
          <Select value={businessTypeFilter} onValueChange={setBusinessTypeFilter}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="모든 유형" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">모든 유형</SelectItem>
              <SelectItem value="seller">판매자</SelectItem>
              <SelectItem value="supplier">공급자</SelectItem>
            </SelectContent>
          </Select>
          
          <div className="search-box">
            <Input
              type="search"
              placeholder="신청자 검색..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-[300px]"
            />
            <Button variant="secondary">
              신청자 검색
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
        emptyMessage="승인 대기 중인 판매자가 없습니다."
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

      {/* Detail Modal */}
      {showDetailModal && selectedVendor && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-modern-text-primary">판매자 상세 정보</h2>
                <button
                  onClick={() => setShowDetailModal(false)}
                  className="text-modern-text-tertiary hover:text-modern-text-primary"
                >
                  <XCircle className="w-6 h-6" />
                </button>
              </div>

              <div className="space-y-6">
                {/* Business Information */}
                <div>
                  <h3 className="text-lg font-semibold text-modern-text-primary mb-3">사업자 정보</h3>
                  <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <dt className="text-sm text-modern-text-secondary">사업자명</dt>
                      <dd className="text-modern-text-primary font-medium">{selectedVendor.businessName}</dd>
                    </div>
                    <div>
                      <dt className="text-sm text-modern-text-secondary">사업자 유형</dt>
                      <dd className="text-modern-text-primary font-medium">
                        {selectedVendor.businessType === 'seller' ? '판매자' : '공급자'}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-sm text-modern-text-secondary">사업자번호</dt>
                      <dd className="text-modern-text-primary font-medium">{selectedVendor.businessNumber}</dd>
                    </div>
                    <div>
                      <dt className="text-sm text-modern-text-secondary">신청일</dt>
                      <dd className="text-modern-text-primary font-medium">{formatDate(selectedVendor.appliedAt)}</dd>
                    </div>
                  </dl>
                </div>

                {/* Contact Information */}
                <div>
                  <h3 className="text-lg font-semibold text-modern-text-primary mb-3">연락처 정보</h3>
                  <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <dt className="text-sm text-modern-text-secondary">대표자명</dt>
                      <dd className="text-modern-text-primary font-medium">{selectedVendor.name}</dd>
                    </div>
                    <div>
                      <dt className="text-sm text-modern-text-secondary">이메일</dt>
                      <dd className="text-modern-text-primary font-medium">{selectedVendor.email}</dd>
                    </div>
                    <div>
                      <dt className="text-sm text-modern-text-secondary">전화번호</dt>
                      <dd className="text-modern-text-primary font-medium">{selectedVendor.phoneNumber}</dd>
                    </div>
                    <div>
                      <dt className="text-sm text-modern-text-secondary">주소</dt>
                      <dd className="text-modern-text-primary font-medium">{selectedVendor.address}</dd>
                    </div>
                  </dl>
                </div>

                {/* Documents */}
                <div>
                  <h3 className="text-lg font-semibold text-modern-text-primary mb-3">제출 서류</h3>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between p-3 bg-modern-bg-tertiary rounded-lg">
                      <span className="text-modern-text-primary">사업자등록증</span>
                      {selectedVendor.documents.businessLicense ? (
                        <CheckCircle className="w-5 h-5 text-modern-success" />
                      ) : (
                        <XCircle className="w-5 h-5 text-modern-danger" />
                      )}
                    </div>
                    <div className="flex items-center justify-between p-3 bg-modern-bg-tertiary rounded-lg">
                      <span className="text-modern-text-primary">세금계산서 발행정보</span>
                      {selectedVendor.documents.taxCertificate ? (
                        <CheckCircle className="w-5 h-5 text-modern-success" />
                      ) : (
                        <XCircle className="w-5 h-5 text-modern-danger" />
                      )}
                    </div>
                    <div className="flex items-center justify-between p-3 bg-modern-bg-tertiary rounded-lg">
                      <span className="text-modern-text-primary">통장사본</span>
                      {selectedVendor.documents.bankAccount ? (
                        <CheckCircle className="w-5 h-5 text-modern-success" />
                      ) : (
                        <XCircle className="w-5 h-5 text-modern-danger" />
                      )}
                    </div>
                  </div>
                </div>

                {/* Message */}
                {selectedVendor.message && (
                  <div>
                    <h3 className="text-lg font-semibold text-modern-text-primary mb-3">신청 메시지</h3>
                    <p className="text-modern-text-secondary p-4 bg-modern-bg-tertiary rounded-lg">
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
                    disabled={loading}
                    className="flex-1 px-4 py-2 bg-modern-success text-white rounded-lg hover:bg-green-600 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <CheckCircle className="w-4 h-4" />
                    승인하기
                  </button>
                  <button
                    onClick={() => {
                      handleReject(selectedVendor.id);
                      setShowDetailModal(false);
                    }}
                    disabled={loading}
                    className="flex-1 px-4 py-2 bg-modern-danger text-white rounded-lg hover:bg-red-600 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <XCircle className="w-4 h-4" />
                    거절하기
                  </button>
                  <button
                    onClick={() => setShowDetailModal(false)}
                    className="px-4 py-2 border border-modern-border-primary rounded-lg hover:bg-modern-bg-hover transition-colors"
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

export default VendorsPending;