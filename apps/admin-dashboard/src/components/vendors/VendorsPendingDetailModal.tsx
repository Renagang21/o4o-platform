import React from 'react';
import { 
  X,
  Building,
  User,
  Mail,
  Phone,
  MapPin,
  Calendar,
  FileText,
  CheckCircle,
  XCircle,
  AlertCircle
} from 'lucide-react';
import { PendingVendor } from '@/hooks/vendors/useVendorsPendingData';

interface VendorsPendingDetailModalProps {
  vendor: PendingVendor | null;
  isOpen: boolean;
  onClose: () => void;
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
  onRequestDocuments: (id: string) => void;
}

export const VendorsPendingDetailModal: React.FC<VendorsPendingDetailModalProps> = ({
  vendor,
  isOpen,
  onClose,
  onApprove,
  onReject,
  onRequestDocuments
}) => {
  if (!isOpen || !vendor) return null;

  const getUrgencyBadge = () => {
    if (vendor.urgencyLevel === 'critical') {
      return <span className="urgency-badge critical">긴급 처리 필요</span>;
    }
    if (vendor.urgencyLevel === 'urgent') {
      return <span className="urgency-badge urgent">주의 필요</span>;
    }
    return <span className="urgency-badge normal">정상</span>;
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-container" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>판매자 신청 상세</h2>
          <button className="modal-close" onClick={onClose}>
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="modal-body">
          <div className="vendor-detail-header">
            <h3>{vendor.businessName}</h3>
            {getUrgencyBadge()}
          </div>
          
          <div className="vendor-detail-grid">
            <div className="detail-card">
              <div className="detail-card-header">
                <Building className="w-5 h-5" />
                <h4>사업 정보</h4>
              </div>
              <div className="detail-card-content">
                <div className="detail-row">
                  <span className="label">사업자명:</span>
                  <span className="value">{vendor.businessName}</span>
                </div>
                <div className="detail-row">
                  <span className="label">사업자번호:</span>
                  <span className="value">{vendor.businessNumber}</span>
                </div>
                <div className="detail-row">
                  <span className="label">유형:</span>
                  <span className="value">
                    {vendor.businessType === 'seller' ? '판매자' : '공급자'}
                  </span>
                </div>
              </div>
            </div>
            
            <div className="detail-card">
              <div className="detail-card-header">
                <User className="w-5 h-5" />
                <h4>담당자 정보</h4>
              </div>
              <div className="detail-card-content">
                <div className="detail-row">
                  <span className="label">이름:</span>
                  <span className="value">{vendor.name}</span>
                </div>
                <div className="detail-row">
                  <span className="label">이메일:</span>
                  <span className="value">
                    <a href={`mailto:${vendor.email}`}>{vendor.email}</a>
                  </span>
                </div>
                <div className="detail-row">
                  <span className="label">연락처:</span>
                  <span className="value">
                    <a href={`tel:${vendor.phoneNumber}`}>{vendor.phoneNumber}</a>
                  </span>
                </div>
              </div>
            </div>
            
            <div className="detail-card">
              <div className="detail-card-header">
                <MapPin className="w-5 h-5" />
                <h4>주소</h4>
              </div>
              <div className="detail-card-content">
                <p>{vendor.address}</p>
              </div>
            </div>
            
            <div className="detail-card">
              <div className="detail-card-header">
                <Calendar className="w-5 h-5" />
                <h4>신청 정보</h4>
              </div>
              <div className="detail-card-content">
                <div className="detail-row">
                  <span className="label">신청일:</span>
                  <span className="value">
                    {new Date(vendor.appliedAt).toLocaleDateString('ko-KR')}
                  </span>
                </div>
                <div className="detail-row">
                  <span className="label">대기일:</span>
                  <span className="value">
                    {Math.ceil((Date.now() - new Date(vendor.appliedAt).getTime()) / (1000 * 60 * 60 * 24))}일
                  </span>
                </div>
              </div>
            </div>
            
            <div className="detail-card full-width">
              <div className="detail-card-header">
                <FileText className="w-5 h-5" />
                <h4>제출 서류</h4>
              </div>
              <div className="detail-card-content">
                <div className="document-checklist">
                  <div className={`document-item ${vendor.documents.businessLicense ? 'completed' : 'pending'}`}>
                    {vendor.documents.businessLicense ? 
                      <CheckCircle className="w-5 h-5 text-green-600" /> : 
                      <XCircle className="w-5 h-5 text-red-600" />
                    }
                    <span>사업자등록증</span>
                    {vendor.documents.businessLicense && (
                      <button className="view-document">보기</button>
                    )}
                  </div>
                  <div className={`document-item ${vendor.documents.taxCertificate ? 'completed' : 'pending'}`}>
                    {vendor.documents.taxCertificate ? 
                      <CheckCircle className="w-5 h-5 text-green-600" /> : 
                      <XCircle className="w-5 h-5 text-red-600" />
                    }
                    <span>세금계산서 발행정보</span>
                    {vendor.documents.taxCertificate && (
                      <button className="view-document">보기</button>
                    )}
                  </div>
                  <div className={`document-item ${vendor.documents.bankAccount ? 'completed' : 'pending'}`}>
                    {vendor.documents.bankAccount ? 
                      <CheckCircle className="w-5 h-5 text-green-600" /> : 
                      <XCircle className="w-5 h-5 text-red-600" />
                    }
                    <span>통장사본</span>
                    {vendor.documents.bankAccount && (
                      <button className="view-document">보기</button>
                    )}
                  </div>
                </div>
              </div>
            </div>
            
            {vendor.message && (
              <div className="detail-card full-width">
                <div className="detail-card-header">
                  <Mail className="w-5 h-5" />
                  <h4>추가 메시지</h4>
                </div>
                <div className="detail-card-content">
                  <p className="message-text">{vendor.message}</p>
                </div>
              </div>
            )}
          </div>
        </div>
        
        <div className="modal-footer">
          <button 
            className="o4o-button button-primary"
            onClick={() => {
              onApprove(vendor.id);
              onClose();
            }}
          >
            승인
          </button>
          <button 
            className="o4o-button button-danger"
            onClick={() => {
              onReject(vendor.id);
              onClose();
            }}
          >
            거부
          </button>
          <button 
            className="o4o-button"
            onClick={() => {
              onRequestDocuments(vendor.id);
              onClose();
            }}
          >
            서류 요청
          </button>
          <button 
            className="o4o-button button-secondary"
            onClick={onClose}
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  );
};