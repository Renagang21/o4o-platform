import { useState } from 'react';
import { Clock, CheckCircle, XCircle, Eye, FileText, Mail } from 'lucide-react';

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
  const [vendors] = useState<PendingVendor[]>(mockPendingVendors);
  const [_selectedVendor, setSelectedVendor] = useState<PendingVendor | null>(null);

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

  const handleApprove = (vendorId: string) => {
    console.log('Approving vendor:', vendorId);
    // TODO: Implement approval logic
  };

  const handleReject = (vendorId: string) => {
    console.log('Rejecting vendor:', vendorId);
    // TODO: Implement rejection logic
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
        {vendors.map((vendor) => {
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
                    onClick={() => setSelectedVendor(vendor)}
                    className="flex-1 px-3 py-2 border border-modern-border-primary rounded-lg hover:bg-modern-bg-hover transition-colors flex items-center justify-center gap-2"
                  >
                    <Eye className="w-4 h-4" />
                    상세보기
                  </button>
                  <button
                    onClick={() => handleApprove(vendor.id)}
                    className="flex-1 px-3 py-2 bg-modern-success text-white rounded-lg hover:bg-green-600 transition-colors flex items-center justify-center gap-2"
                  >
                    <CheckCircle className="w-4 h-4" />
                    승인
                  </button>
                  <button
                    onClick={() => handleReject(vendor.id)}
                    className="flex-1 px-3 py-2 bg-modern-danger text-white rounded-lg hover:bg-red-600 transition-colors flex items-center justify-center gap-2"
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
    </div>
  );
};

export default VendorsPending;