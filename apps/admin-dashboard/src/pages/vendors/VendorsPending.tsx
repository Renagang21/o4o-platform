import { useState } from 'react';
import { Clock, CheckCircle, XCircle, Eye, FileText, Mail } from 'lucide-react';
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

  const getDocumentStatus = (docs: PendingVendor['documents']) => {
    const total = Object.keys(docs).length;
    const verified = Object.values(docs).filter(Boolean).length;
    return { verified, total };
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
      setVendors(vendors.filter(v => v.id !== vendorId));
    } catch (error: any) {
      console.error('Error approving vendor:', error);
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
      setVendors(vendors.filter(v => v.id !== vendorId));
    } catch (error: any) {
      console.error('Error rejecting vendor:', error);
      toast.error('거절 처리 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-modern-text-primary flex items-center gap-2">
            <Clock className="w-8 h-8 text-modern-warning" />
            승인 대기 판매자
          </h1>
          <p className="text-modern-text-secondary mt-1">
            새로 가입한 판매자의 신청을 검토하고 승인하세요.
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="wp-card">
          <div className="wp-card-body">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-modern-text-secondary">대기 중</p>
                <p className="text-2xl font-bold text-modern-warning">{vendors.length}</p>
              </div>
              <Clock className="w-8 h-8 text-modern-warning opacity-20" />
            </div>
          </div>
        </div>
        <div className="wp-card">
          <div className="wp-card-body">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-modern-text-secondary">오늘 신청</p>
                <p className="text-2xl font-bold text-modern-primary">2</p>
              </div>
              <FileText className="w-8 h-8 text-modern-primary opacity-20" />
            </div>
          </div>
        </div>
        <div className="wp-card">
          <div className="wp-card-body">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-modern-text-secondary">평균 대기 시간</p>
                <p className="text-2xl font-bold text-modern-text-primary">1.5일</p>
              </div>
              <Clock className="w-8 h-8 text-modern-text-primary opacity-20" />
            </div>
          </div>
        </div>
      </div>

      {/* Pending Vendors List */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {vendors.map((vendor: any) => {
          const docStatus = getDocumentStatus(vendor.documents);
          return (
            <div key={vendor.id} className="wp-card">
              <div className="wp-card-body">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-modern-text-primary">
                      {vendor.businessName}
                    </h3>
                    <p className="text-sm text-modern-text-secondary">
                      {vendor.name} | {vendor.businessType === 'seller' ? '판매자' : '공급자'}
                    </p>
                  </div>
                  <span className="px-2.5 py-0.5 text-xs font-medium bg-yellow-100 text-yellow-800 rounded-full">
                    승인 대기
                  </span>
                </div>

                <div className="space-y-3 mb-4">
                  <div className="flex items-center gap-2 text-sm">
                    <Mail className="w-4 h-4 text-modern-text-tertiary" />
                    <span className="text-modern-text-secondary">{vendor.email}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <FileText className="w-4 h-4 text-modern-text-tertiary" />
                    <span className="text-modern-text-secondary">사업자번호: {vendor.businessNumber}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Clock className="w-4 h-4 text-modern-text-tertiary" />
                    <span className="text-modern-text-secondary">신청일: {formatDate(vendor.appliedAt)}</span>
                  </div>
                </div>

                {/* Document Status */}
                <div className="mb-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-modern-text-primary">서류 확인</span>
                    <span className="text-sm text-modern-text-secondary">
                      {docStatus.verified}/{docStatus.total} 완료
                    </span>
                  </div>
                  <div className="w-full bg-modern-bg-tertiary rounded-full h-2">
                    <div
                      className="bg-modern-primary h-2 rounded-full transition-all"
                      style={{ width: `${(docStatus.verified / docStatus.total) * 100}%` }}
                    />
                  </div>
                  <div className="grid grid-cols-3 gap-2 mt-2">
                    <div className="flex items-center gap-1">
                      {vendor.documents.businessLicense ? (
                        <CheckCircle className="w-4 h-4 text-modern-success" />
                      ) : (
                        <XCircle className="w-4 h-4 text-modern-danger" />
                      )}
                      <span className="text-xs text-modern-text-secondary">사업자등록증</span>
                    </div>
                    <div className="flex items-center gap-1">
                      {vendor.documents.taxCertificate ? (
                        <CheckCircle className="w-4 h-4 text-modern-success" />
                      ) : (
                        <XCircle className="w-4 h-4 text-modern-danger" />
                      )}
                      <span className="text-xs text-modern-text-secondary">세금계산서</span>
                    </div>
                    <div className="flex items-center gap-1">
                      {vendor.documents.bankAccount ? (
                        <CheckCircle className="w-4 h-4 text-modern-success" />
                      ) : (
                        <XCircle className="w-4 h-4 text-modern-danger" />
                      )}
                      <span className="text-xs text-modern-text-secondary">통장사본</span>
                    </div>
                  </div>
                </div>

                {vendor.message && (
                  <div className="mb-4 p-3 bg-modern-bg-tertiary rounded-lg">
                    <p className="text-sm text-modern-text-secondary">{vendor.message}</p>
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setSelectedVendor(vendor);
                      setShowDetailModal(true);
                    }}
                    className="flex-1 px-3 py-2 border border-modern-border-primary rounded-lg hover:bg-modern-bg-hover transition-colors flex items-center justify-center gap-2"
                  >
                    <Eye className="w-4 h-4" />
                    상세보기
                  </button>
                  <button
                    onClick={() => handleApprove(vendor.id)}
                    disabled={loading}
                    className="flex-1 px-3 py-2 bg-modern-success text-white rounded-lg hover:bg-green-600 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <CheckCircle className="w-4 h-4" />
                    승인
                  </button>
                  <button
                    onClick={() => handleReject(vendor.id)}
                    disabled={loading}
                    className="flex-1 px-3 py-2 bg-modern-danger text-white rounded-lg hover:bg-red-600 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <XCircle className="w-4 h-4" />
                    거절
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* No pending vendors */}
      {vendors.length === 0 && (
        <div className="wp-card">
          <div className="wp-card-body text-center py-12">
            <Clock className="w-12 h-12 text-modern-text-tertiary mx-auto mb-4" />
            <p className="text-modern-text-secondary">대기 중인 판매자 신청이 없습니다.</p>
          </div>
        </div>
      )}

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