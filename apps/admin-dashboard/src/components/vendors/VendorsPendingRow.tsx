import React, { useState } from 'react';
import { 
  ChevronDown,
  ChevronUp,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  FileText,
  Mail,
  Phone,
  MapPin,
  User,
  Building,
  AlertCircle
} from 'lucide-react';
import { PendingVendor, DocumentStatus } from '@/hooks/vendors/useVendorsPendingData';

interface VendorsPendingRowProps {
  vendor: PendingVendor;
  isSelected: boolean;
  onSelect: (id: string) => void;
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
  onRequestDocuments: (id: string) => void;
  onViewDetail: (vendor: PendingVendor) => void;
  calculateWaitingDays: (appliedAt: string) => number;
  getDocumentStatus: (documents: PendingVendor['documents']) => DocumentStatus;
  visibleColumns: Set<string>;
}

export const VendorsPendingRow: React.FC<VendorsPendingRowProps> = ({
  vendor,
  isSelected,
  onSelect,
  onApprove,
  onReject,
  onRequestDocuments,
  onViewDetail,
  calculateWaitingDays,
  getDocumentStatus,
  visibleColumns
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  
  const waitingDays = calculateWaitingDays(vendor.appliedAt);
  const documentStatus = getDocumentStatus(vendor.documents);

  const getUrgencyColor = () => {
    if (vendor.urgencyLevel === 'critical') return '#dc2626';
    if (vendor.urgencyLevel === 'urgent') return '#f59e0b';
    return '#10b981';
  };

  const getDocumentStatusIcon = () => {
    if (documentStatus === 'complete') {
      return <CheckCircle className="w-4 h-4 text-green-600" />;
    } else if (documentStatus === 'incomplete') {
      return <AlertTriangle className="w-4 h-4 text-yellow-600" />;
    } else {
      return <XCircle className="w-4 h-4 text-red-600" />;
    }
  };

  return (
    <>
      <tr 
        className={`o4o-list-row ${isHovered ? 'hovered' : ''} ${isSelected ? 'selected' : ''}`}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <td className="check-column">
          <input 
            type="checkbox" 
            checked={isSelected}
            onChange={() => onSelect(vendor.id)}
          />
        </td>
        <td className="title-column">
          <div className="vendor-title-wrapper">
            <strong>
              <a 
                href="#" 
                onClick={(e) => {
                  e.preventDefault();
                  setIsExpanded(!isExpanded);
                }}
                className="row-title"
              >
                {vendor.businessName}
              </a>
            </strong>
            {vendor.urgencyLevel === 'critical' && (
              <span className="urgency-badge critical ml-2">긴급</span>
            )}
            {vendor.urgencyLevel === 'urgent' && (
              <span className="urgency-badge urgent ml-2">주의</span>
            )}
            {isHovered && (
              <div className="row-actions">
                <span className="view">
                  <a href="#" onClick={(e) => {
                    e.preventDefault();
                    onViewDetail(vendor);
                  }}>상세보기</a>
                </span> | 
                <span className="approve">
                  <a href="#" onClick={(e) => {
                    e.preventDefault();
                    onApprove(vendor.id);
                  }} className="text-green-600">승인</a>
                </span> | 
                <span className="reject">
                  <a href="#" onClick={(e) => {
                    e.preventDefault();
                    onReject(vendor.id);
                  }} className="text-red-600">거부</a>
                </span> |
                <span className="request">
                  <a href="#" onClick={(e) => {
                    e.preventDefault();
                    onRequestDocuments(vendor.id);
                  }}>서류 요청</a>
                </span>
              </div>
            )}
          </div>
        </td>
        {visibleColumns.has('type') && (
          <td>
            <span className={`vendor-type-badge ${vendor.businessType}`}>
              {vendor.businessType === 'seller' ? '판매자' : '공급자'}
            </span>
          </td>
        )}
        {visibleColumns.has('contact') && (
          <td>
            <div className="contact-info">
              <div>{vendor.name}</div>
              <div className="text-gray-500">{vendor.email}</div>
            </div>
          </td>
        )}
        {visibleColumns.has('phone') && (
          <td>{vendor.phoneNumber}</td>
        )}
        {visibleColumns.has('businessNumber') && (
          <td className="business-number">{vendor.businessNumber}</td>
        )}
        {visibleColumns.has('documents') && (
          <td>
            <div className="documents-status">
              {getDocumentStatusIcon()}
              <span className="ml-1">
                {documentStatus === 'complete' ? '완료' :
                 documentStatus === 'incomplete' ? '일부' : '미제출'}
              </span>
            </div>
          </td>
        )}
        {visibleColumns.has('appliedAt') && (
          <td>{new Date(vendor.appliedAt).toLocaleDateString('ko-KR')}</td>
        )}
        {visibleColumns.has('waitingDays') && (
          <td>
            <span 
              className="waiting-days"
              style={{ color: getUrgencyColor() }}
            >
              {waitingDays}일
            </span>
          </td>
        )}
        <td className="expand-column">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="expand-button"
          >
            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </td>
      </tr>
      {isExpanded && (
        <tr className="expanded-details">
          <td colSpan={10}>
            <div className="vendor-details-grid">
              <div className="detail-section">
                <h4><Building className="w-4 h-4 inline mr-1" />사업 정보</h4>
                <div className="detail-content">
                  <p><strong>사업자명:</strong> {vendor.businessName}</p>
                  <p><strong>사업자번호:</strong> {vendor.businessNumber}</p>
                  <p><strong>유형:</strong> {vendor.businessType === 'seller' ? '판매자' : '공급자'}</p>
                </div>
              </div>
              
              <div className="detail-section">
                <h4><User className="w-4 h-4 inline mr-1" />담당자 정보</h4>
                <div className="detail-content">
                  <p><strong>이름:</strong> {vendor.name}</p>
                  <p><strong>이메일:</strong> {vendor.email}</p>
                  <p><strong>연락처:</strong> {vendor.phoneNumber}</p>
                </div>
              </div>
              
              <div className="detail-section">
                <h4><MapPin className="w-4 h-4 inline mr-1" />주소</h4>
                <div className="detail-content">
                  <p>{vendor.address}</p>
                </div>
              </div>
              
              <div className="detail-section">
                <h4><FileText className="w-4 h-4 inline mr-1" />제출 서류</h4>
                <div className="detail-content">
                  <div className="document-list">
                    <div className={vendor.documents.businessLicense ? 'completed' : 'pending'}>
                      {vendor.documents.businessLicense ? 
                        <CheckCircle className="w-4 h-4 text-green-600" /> : 
                        <XCircle className="w-4 h-4 text-red-600" />
                      }
                      <span>사업자등록증</span>
                    </div>
                    <div className={vendor.documents.taxCertificate ? 'completed' : 'pending'}>
                      {vendor.documents.taxCertificate ? 
                        <CheckCircle className="w-4 h-4 text-green-600" /> : 
                        <XCircle className="w-4 h-4 text-red-600" />
                      }
                      <span>세금계산서</span>
                    </div>
                    <div className={vendor.documents.bankAccount ? 'completed' : 'pending'}>
                      {vendor.documents.bankAccount ? 
                        <CheckCircle className="w-4 h-4 text-green-600" /> : 
                        <XCircle className="w-4 h-4 text-red-600" />
                      }
                      <span>통장사본</span>
                    </div>
                  </div>
                </div>
              </div>
              
              {vendor.message && (
                <div className="detail-section">
                  <h4><Mail className="w-4 h-4 inline mr-1" />메시지</h4>
                  <div className="detail-content">
                    <p>{vendor.message}</p>
                  </div>
                </div>
              )}
              
              <div className="detail-actions">
                <button 
                  className="o4o-button button-primary"
                  onClick={() => onApprove(vendor.id)}
                >
                  승인
                </button>
                <button 
                  className="o4o-button button-secondary"
                  onClick={() => onReject(vendor.id)}
                >
                  거부
                </button>
                <button 
                  className="o4o-button"
                  onClick={() => onRequestDocuments(vendor.id)}
                >
                  서류 요청
                </button>
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  );
};