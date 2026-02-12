import React from 'react';
import { Settings } from 'lucide-react';

interface VendorsPendingScreenOptionsProps {
  showScreenOptions: boolean;
  setShowScreenOptions: (show: boolean) => void;
  itemsPerPage: number;
  setItemsPerPage: (count: number) => void;
  visibleColumns: Set<string>;
  toggleColumn: (column: string) => void;
}

const allColumns = [
  { key: 'type', label: '유형' },
  { key: 'contact', label: '담당자' },
  { key: 'phone', label: '연락처' },
  { key: 'businessNumber', label: '사업자번호' },
  { key: 'documents', label: '서류 상태' },
  { key: 'appliedAt', label: '신청일' },
  { key: 'waitingDays', label: '대기일' }
];

export const VendorsPendingScreenOptions: React.FC<VendorsPendingScreenOptionsProps> = ({
  showScreenOptions,
  setShowScreenOptions,
  itemsPerPage,
  setItemsPerPage,
  visibleColumns,
  toggleColumn
}) => {
  return (
    <>
      <button 
        className="o4o-screen-options-toggle"
        onClick={() => setShowScreenOptions(!showScreenOptions)}
      >
        <Settings className="w-4 h-4" />
        화면 옵션
      </button>
      
      {showScreenOptions && (
        <div className="o4o-screen-options">
          <div className="screen-options-wrap">
            <fieldset className="columns-group">
              <legend>열</legend>
              {allColumns.map(col => (
                <label key={col.key}>
                  <input 
                    type="checkbox"
                    checked={visibleColumns.has(col.key)}
                    onChange={() => toggleColumn(col.key)}
                  />
                  {col.label}
                </label>
              ))}
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
                    localStorage.setItem('vendors-pending-per-page', value.toString());
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
    </>
  );
};