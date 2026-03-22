/**
 * CommissionTable — Commission list table with inline rate edit & expanded details
 *
 * WO-O4O-VENDORS-ADMIN-PAGES-SPLIT-V1
 * Extracted from VendorsCommissionAdmin.tsx (lines 634-961 + 963-1157)
 */

import React from 'react';
import {
  ChevronDown,
  ChevronUp,
  Calculator,
  CreditCard,
  FileText,
  AlertCircle,
} from 'lucide-react';
import type { CommissionRecord, CommissionSortField, CommissionSortOrder } from './vendors-commission-types';

interface CommissionTableProps {
  commissions: CommissionRecord[];
  selectedIds: Set<string>;
  expandedRows: Set<string>;
  editingRates: Map<string, number>;
  visibleColumns: Set<string>;
  sortField: CommissionSortField;
  sortOrder: CommissionSortOrder;
  selectAllRef: React.RefObject<HTMLInputElement>;
  onSelectAll: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onSelect: (id: string) => void;
  onSort: (field: CommissionSortField) => void;
  onEditingRatesChange: (rates: Map<string, number>) => void;
  onQuickEditRate: (id: string, rate: number) => void;
  onPayCommission: (id: string) => void;
  onToggleRowExpansion: (id: string) => void;
  getStatusBadge: (status: string) => React.ReactNode;
}

export function CommissionTable({
  commissions,
  selectedIds,
  expandedRows,
  editingRates,
  visibleColumns,
  sortField,
  sortOrder,
  selectAllRef,
  onSelectAll,
  onSelect,
  onSort,
  onEditingRatesChange,
  onQuickEditRate,
  onPayCommission,
  onToggleRowExpansion,
  getStatusBadge,
}: CommissionTableProps) {
  if (commissions.length === 0) {
    return (
      <div className="o4o-no-items">
        수수료 내역이 없습니다.
      </div>
    );
  }

  return (
    <>
      <table className="o4o-list-table widefat fixed striped">
        <thead>
          <tr>
            <td className="check-column">
              <input
                ref={selectAllRef as React.RefObject<HTMLInputElement>}
                type="checkbox"
                onChange={onSelectAll}
                checked={selectedIds.size > 0 && selectedIds.size === commissions.length}
              />
            </td>
            <th className="column-title column-primary">
              <a
                href="#"
                onClick={(e) => {
                  e.preventDefault();
                  onSort('vendorName');
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
                    onSort('sales');
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
                    onSort('rate');
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
                    onSort('amount');
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
                    onSort('date');
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
          {commissions.map(commission => {
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
                      onChange={() => onSelect(commission.id)}
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
                      </span> |{' '}
                      {commission.status === 'pending' && (
                        <>
                          <span className="pay">
                            <a href="#" onClick={(e) => {
                              e.preventDefault();
                              onPayCommission(commission.id);
                            }} className="text-green-600">지급하기</a>
                          </span> |{' '}
                        </>
                      )}
                      <span className="edit">
                        <a href="#" onClick={(e) => {
                          e.preventDefault();
                          onEditingRatesChange(new Map([[commission.id, commission.commissionRate]]));
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
                      <strong>{'\u20A9'}{commission.sales.toLocaleString()}</strong>
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
                              onEditingRatesChange(newRates);
                            }}
                            className="rate-input"
                          />
                          <span>%</span>
                          <button
                            className="o4o-button button-primary button-small"
                            onClick={() => onQuickEditRate(commission.id, editingRates.get(commission.id) || commission.commissionRate)}
                          >
                            저장
                          </button>
                          <button
                            className="o4o-button button-secondary button-small"
                            onClick={() => onEditingRatesChange(new Map())}
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
                        {'\u20A9'}{commission.commissionAmount.toLocaleString()}
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
                      onClick={() => onToggleRowExpansion(commission.id)}
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
                            <p><strong>총 매출:</strong> {'\u20A9'}{commission.sales.toLocaleString()}</p>
                            <p><strong>수수료율:</strong> {commission.commissionRate}%</p>
                            <p><strong>수수료 금액:</strong> {'\u20A9'}{commission.commissionAmount.toLocaleString()}</p>
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
                              onClick={() => onPayCommission(commission.id)}
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
    </>
  );
}
