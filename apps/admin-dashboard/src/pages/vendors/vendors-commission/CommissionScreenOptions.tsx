/**
 * CommissionScreenOptions — Column visibility & pagination settings
 *
 * WO-O4O-VENDORS-ADMIN-PAGES-SPLIT-V1
 * Extracted from VendorsCommissionAdmin.tsx (lines 385-474)
 */

interface CommissionScreenOptionsProps {
  show: boolean;
  visibleColumns: Set<string>;
  itemsPerPage: number;
  onToggleColumn: (column: string) => void;
  onItemsPerPageChange: (value: number) => void;
  onClose: () => void;
}

export function CommissionScreenOptions({
  show,
  visibleColumns,
  itemsPerPage,
  onToggleColumn,
  onItemsPerPageChange,
  onClose,
}: CommissionScreenOptionsProps) {
  if (!show) return null;

  return (
    <div className="o4o-screen-options">
      <div className="screen-options-wrap">
        <fieldset className="columns-group">
          <legend>열</legend>
          <label>
            <input
              type="checkbox"
              checked={visibleColumns.has('period')}
              onChange={() => onToggleColumn('period')}
            />
            기간
          </label>
          <label>
            <input
              type="checkbox"
              checked={visibleColumns.has('sales')}
              onChange={() => onToggleColumn('sales')}
            />
            매출액
          </label>
          <label>
            <input
              type="checkbox"
              checked={visibleColumns.has('rate')}
              onChange={() => onToggleColumn('rate')}
            />
            수수료율
          </label>
          <label>
            <input
              type="checkbox"
              checked={visibleColumns.has('amount')}
              onChange={() => onToggleColumn('amount')}
            />
            수수료 금액
          </label>
          <label>
            <input
              type="checkbox"
              checked={visibleColumns.has('status')}
              onChange={() => onToggleColumn('status')}
            />
            상태
          </label>
          <label>
            <input
              type="checkbox"
              checked={visibleColumns.has('dueDate')}
              onChange={() => onToggleColumn('dueDate')}
            />
            지급예정일
          </label>
          <label>
            <input
              type="checkbox"
              checked={visibleColumns.has('bankAccount')}
              onChange={() => onToggleColumn('bankAccount')}
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
                onItemsPerPageChange(value);
              }}
              min="1"
              max="999"
            />
          </label>
        </fieldset>
      </div>
      <button
        className="o4o-button"
        onClick={onClose}
      >
        적용
      </button>
    </div>
  );
}
