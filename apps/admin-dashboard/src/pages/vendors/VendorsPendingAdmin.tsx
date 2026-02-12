import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search } from 'lucide-react';
import AdminBreadcrumb from '@/components/common/AdminBreadcrumb';
import { useVendorsPendingData } from '@/hooks/vendors/useVendorsPendingData';
import { useVendorsPendingActions } from '@/hooks/vendors/useVendorsPendingActions';
import { VendorsPendingStatusTabs } from '@/components/vendors/VendorsPendingStatusTabs';
import { VendorsPendingBulkActions } from '@/components/vendors/VendorsPendingBulkActions';
import { VendorsPendingRow } from '@/components/vendors/VendorsPendingRow';
import { VendorsPendingScreenOptions } from '@/components/vendors/VendorsPendingScreenOptions';
import { VendorsPendingDetailModal } from '@/components/vendors/VendorsPendingDetailModal';
import type { VendorStatus, SortField, SortOrder, PendingVendor } from '@/hooks/vendors/useVendorsPendingData';

const VendorsPendingWordPress = () => {
  const navigate = useNavigate();
  
  // State management
  const [activeTab, setActiveTab] = useState<VendorStatus>(() => {
    const saved = sessionStorage.getItem('vendors-pending-active-tab');
    return (saved as VendorStatus) || 'all';
  });
  
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [sortField, setSortField] = useState<SortField>(null);
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [selectedAction, setSelectedAction] = useState('');
  const [showScreenOptions, setShowScreenOptions] = useState(false);
  const [itemsPerPage, setItemsPerPage] = useState(() => {
    const saved = localStorage.getItem('vendors-pending-per-page');
    return saved ? parseInt(saved) : 20;
  });
  const [visibleColumns, setVisibleColumns] = useState<Set<string>>(() => {
    const saved = localStorage.getItem('vendors-pending-visible-columns');
    if (saved) {
      return new Set(JSON.parse(saved));
    }
    return new Set(['type', 'contact', 'documents', 'appliedAt', 'waitingDays']);
  });
  const [selectedVendor, setSelectedVendor] = useState<PendingVendor | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  
  const searchInputRef = useRef<HTMLInputElement>(null);
  const selectAllRef = useRef<HTMLInputElement>(null);

  // Custom hooks
  const { 
    vendors, 
    setVendors, 
    loading, 
    error, 
    filteredVendors, 
    counts,
    calculateWaitingDays,
    getDocumentStatus
  } = useVendorsPendingData({
    activeTab,
    searchQuery,
    sortField,
    sortOrder,
    itemsPerPage
  });

  const {
    handleApprove,
    handleReject,
    handleRequestDocuments,
    handleBulkAction
  } = useVendorsPendingActions({ vendors, setVendors });

  // Event handlers
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
      setSelectedIds(new Set(filteredVendors.map((v: any) => v.id)));
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

  const handleApplyBulkAction = async () => {
    const success = await handleBulkAction(selectedAction, selectedIds);
    if (success) {
      setSelectedIds(new Set());
      setSelectedAction('');
    }
  };

  const handleViewDetail = (vendor: PendingVendor) => {
    setSelectedVendor(vendor);
    setShowDetailModal(true);
  };

  const toggleColumn = (column: string) => {
    const newVisibleColumns = new Set(visibleColumns);
    if (newVisibleColumns.has(column)) {
      newVisibleColumns.delete(column);
    } else {
      newVisibleColumns.add(column);
    }
    setVisibleColumns(newVisibleColumns);
    localStorage.setItem('vendors-pending-visible-columns', JSON.stringify(Array.from(newVisibleColumns)));
  };

  // Render loading state
  if (loading) {
    return (
      <div className="wordpress-admin-container">
        <div className="loading-spinner">로딩 중...</div>
      </div>
    );
  }

  // Render error state
  if (error) {
    return (
      <div className="wordpress-admin-container">
        <div className="error-message">오류: {error}</div>
      </div>
    );
  }

  return (
    <div className="wordpress-admin-container">
      <AdminBreadcrumb 
        items={[
          { label: '판매자/공급자', path: '/admin/vendors' },
          { label: '승인 대기' }
        ]} 
      />
      
      <div className="wordpress-page-header">
        <h1 className="o4o-heading-inline">승인 대기 판매자</h1>
        <VendorsPendingScreenOptions
          showScreenOptions={showScreenOptions}
          setShowScreenOptions={setShowScreenOptions}
          itemsPerPage={itemsPerPage}
          setItemsPerPage={setItemsPerPage}
          visibleColumns={visibleColumns}
          toggleColumn={toggleColumn}
        />
      </div>

      <VendorsPendingStatusTabs
        activeTab={activeTab}
        setActiveTab={(tab) => setActiveTab(tab as VendorStatus)}
        counts={counts}
      />

      <div className="wordpress-list-controls">
        <VendorsPendingBulkActions
          selectedAction={selectedAction}
          setSelectedAction={setSelectedAction}
          onApply={handleApplyBulkAction}
          selectedCount={selectedIds.size}
          onClearSelection={() => setSelectedIds(new Set())}
        />
        
        <div className="wordpress-search-box">
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
          <button className="wordpress-button">
            <Search className="w-4 h-4" />
          </button>
        </div>
      </div>

      {filteredVendors.length === 0 ? (
        <div className="wordpress-no-items">
          승인 대기 중인 판매자가 없습니다.
        </div>
      ) : (
        <table className="wordpress-list-table widefat fixed striped">
          <thead>
            <tr>
              <td className="check-column">
                <input 
                  ref={selectAllRef}
                  type="checkbox" 
                  onChange={handleSelectAll}
                  checked={selectedIds.size > 0 && selectedIds.size === filteredVendors.length}
                />
              </td>
              <th className="column-title column-primary">
                <a 
                  href="#" 
                  onClick={(e) => {
                    e.preventDefault();
                    handleSort('businessName');
                  }}
                  className={sortField === 'businessName' ? 'sorted' : ''}
                >
                  사업자명
                  {sortField === 'businessName' && (
                    <span className="sorting-indicator" data-order={sortOrder} />
                  )}
                </a>
              </th>
              {visibleColumns.has('type') && <th>유형</th>}
              {visibleColumns.has('contact') && <th>담당자</th>}
              {visibleColumns.has('phone') && <th>연락처</th>}
              {visibleColumns.has('businessNumber') && <th>사업자번호</th>}
              {visibleColumns.has('documents') && <th>서류 상태</th>}
              {visibleColumns.has('appliedAt') && (
                <th>
                  <a 
                    href="#" 
                    onClick={(e) => {
                      e.preventDefault();
                      handleSort('appliedAt');
                    }}
                    className={sortField === 'appliedAt' ? 'sorted' : ''}
                  >
                    신청일
                    {sortField === 'appliedAt' && (
                      <span className="sorting-indicator" data-order={sortOrder} />
                    )}
                  </a>
                </th>
              )}
              {visibleColumns.has('waitingDays') && (
                <th>
                  <a 
                    href="#" 
                    onClick={(e) => {
                      e.preventDefault();
                      handleSort('waitingDays');
                    }}
                    className={sortField === 'waitingDays' ? 'sorted' : ''}
                  >
                    대기일
                    {sortField === 'waitingDays' && (
                      <span className="sorting-indicator" data-order={sortOrder} />
                    )}
                  </a>
                </th>
              )}
              <th className="column-expand"></th>
            </tr>
          </thead>
          <tbody>
            {filteredVendors.map((vendor: any) => (
              <VendorsPendingRow
                key={vendor.id}
                vendor={vendor}
                isSelected={selectedIds.has(vendor.id)}
                onSelect={handleSelect}
                onApprove={handleApprove}
                onReject={handleReject}
                onRequestDocuments={handleRequestDocuments}
                onViewDetail={handleViewDetail}
                calculateWaitingDays={calculateWaitingDays}
                getDocumentStatus={getDocumentStatus}
                visibleColumns={visibleColumns}
              />
            ))}
          </tbody>
        </table>
      )}

      <div className="tablenav bottom">
        <div className="tablenav-pages">
          <span className="displaying-num">{filteredVendors.length}개 항목</span>
        </div>
      </div>

      <VendorsPendingDetailModal
        vendor={selectedVendor}
        isOpen={showDetailModal}
        onClose={() => {
          setShowDetailModal(false);
          setSelectedVendor(null);
        }}
        onApprove={handleApprove}
        onReject={handleReject}
        onRequestDocuments={handleRequestDocuments}
      />

      <style>{`
        .urgency-badge {
          display: inline-block;
          padding: 2px 6px;
          border-radius: 3px;
          font-size: 11px;
          font-weight: 600;
          text-transform: uppercase;
        }
        
        .urgency-badge.critical {
          background: #fee2e2;
          color: #dc2626;
        }
        
        .urgency-badge.urgent {
          background: #fef3c7;
          color: #f59e0b;
        }
        
        .urgency-badge.normal {
          background: #d1fae5;
          color: #10b981;
        }
        
        .vendor-type-badge {
          display: inline-block;
          padding: 3px 8px;
          border-radius: 3px;
          font-size: 12px;
        }
        
        .vendor-type-badge.seller {
          background: #e0f2fe;
          color: #0369a1;
        }
        
        .vendor-type-badge.supplier {
          background: #f3e8ff;
          color: #7c3aed;
        }
        
        .documents-status {
          display: flex;
          align-items: center;
          gap: 4px;
        }
        
        .waiting-days {
          font-weight: 600;
        }
        
        .contact-info {
          font-size: 13px;
          line-height: 1.4;
        }
        
        .business-number {
          font-family: monospace;
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
        
        .vendor-details-grid {
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
          gap: 5px;
        }
        
        .detail-content p {
          margin: 5px 0;
        }
        
        .document-list {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        
        .document-list > div {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        
        .document-list .completed {
          color: #10b981;
        }
        
        .document-list .pending {
          color: #dc2626;
        }
        
        .detail-actions {
          display: flex;
          gap: 10px;
          padding-top: 15px;
          border-top: 1px solid #dcdcde;
        }
        
        .selected-count {
          margin-left: 15px;
          color: #2271b1;
        }
        
        .clear-selection {
          margin-left: 10px;
          color: #d63638;
          text-decoration: underline;
          background: none;
          border: none;
          cursor: pointer;
        }
        
        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.7);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 999999;
        }
        
        .modal-container {
          background: white;
          border-radius: 8px;
          max-width: 900px;
          width: 90%;
          max-height: 90vh;
          overflow: auto;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
        }
        
        .modal-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 20px;
          border-bottom: 1px solid #dcdcde;
        }
        
        .modal-header h2 {
          margin: 0;
          font-size: 20px;
        }
        
        .modal-close {
          background: none;
          border: none;
          cursor: pointer;
          padding: 5px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        
        .modal-close:hover {
          background: #f0f0f1;
          border-radius: 3px;
        }
        
        .modal-body {
          padding: 20px;
        }
        
        .vendor-detail-header {
          display: flex;
          align-items: center;
          gap: 15px;
          margin-bottom: 20px;
        }
        
        .vendor-detail-header h3 {
          margin: 0;
          font-size: 18px;
        }
        
        .vendor-detail-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 20px;
        }
        
        .detail-card {
          border: 1px solid #dcdcde;
          border-radius: 4px;
          overflow: hidden;
        }
        
        .detail-card.full-width {
          grid-column: span 2;
        }
        
        .detail-card-header {
          background: #f6f7f7;
          padding: 10px 15px;
          display: flex;
          align-items: center;
          gap: 8px;
          border-bottom: 1px solid #dcdcde;
        }
        
        .detail-card-header h4 {
          margin: 0;
          font-size: 14px;
          font-weight: 600;
        }
        
        .detail-card-content {
          padding: 15px;
        }
        
        .detail-row {
          display: flex;
          margin-bottom: 8px;
        }
        
        .detail-row .label {
          font-weight: 600;
          width: 120px;
          flex-shrink: 0;
        }
        
        .detail-row .value {
          flex: 1;
        }
        
        .document-checklist {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 15px;
        }
        
        .document-item {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        
        .document-item.completed {
          color: #10b981;
        }
        
        .document-item.pending {
          color: #dc2626;
        }
        
        .view-document {
          margin-left: auto;
          padding: 2px 8px;
          background: #2271b1;
          color: white;
          border: none;
          border-radius: 3px;
          font-size: 12px;
          cursor: pointer;
        }
        
        .view-document:hover {
          background: #135e96;
        }
        
        .message-text {
          background: #f6f7f7;
          padding: 10px;
          border-radius: 4px;
          margin: 0;
        }
        
        .modal-footer {
          display: flex;
          gap: 10px;
          padding: 20px;
          border-top: 1px solid #dcdcde;
          justify-content: flex-end;
        }
        
        .button-danger {
          background: #d63638;
          color: white;
          border-color: #d63638;
        }
        
        .button-danger:hover {
          background: #b32d2e;
          border-color: #b32d2e;
        }
      `}</style>
    </div>
  );
};

export default VendorsPendingWordPress;