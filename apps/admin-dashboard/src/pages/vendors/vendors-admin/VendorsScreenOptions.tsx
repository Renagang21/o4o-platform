/**
 * VendorsScreenOptions — Column visibility & pagination settings
 *
 * WO-O4O-VENDORS-ADMIN-PAGES-SPLIT-V1
 * Extracted from VendorsAdmin.tsx (lines 449-550)
 */

interface VendorsScreenOptionsProps {
  show: boolean;
  visibleColumns: Record<string, boolean>;
  itemsPerPage: number;
  onColumnToggle: (column: string) => void;
  onItemsPerPageChange: (value: string) => void;
  onClose: () => void;
}

export function VendorsScreenOptions({
  show,
  visibleColumns,
  itemsPerPage,
  onColumnToggle,
  onItemsPerPageChange,
  onClose,
}: VendorsScreenOptionsProps) {
  if (!show) return null;

  return (
    <div className="absolute right-0 top-full mt-2 w-72 bg-white border border-gray-300 rounded-md shadow-lg z-50">
      <div className="p-4">
        <h3 className="font-medium text-sm mb-3">표시할 열</h3>
        <div className="grid grid-cols-2 gap-2">
          <label className="flex items-center text-sm">
            <input
              type="checkbox"
              checked={visibleColumns.avatar}
              onChange={() => onColumnToggle('avatar')}
              className="mr-2"
            />
            아바타
          </label>
          <label className="flex items-center text-sm">
            <input
              type="checkbox"
              checked={visibleColumns.tier}
              onChange={() => onColumnToggle('tier')}
              className="mr-2"
            />
            등급
          </label>
          <label className="flex items-center text-sm">
            <input
              type="checkbox"
              checked={visibleColumns.products}
              onChange={() => onColumnToggle('products')}
              className="mr-2"
            />
            상품 수
          </label>
          <label className="flex items-center text-sm">
            <input
              type="checkbox"
              checked={visibleColumns.revenue}
              onChange={() => onColumnToggle('revenue')}
              className="mr-2"
            />
            매출액
          </label>
          <label className="flex items-center text-sm">
            <input
              type="checkbox"
              checked={visibleColumns.rating}
              onChange={() => onColumnToggle('rating')}
              className="mr-2"
            />
            평점
          </label>
          <label className="flex items-center text-sm">
            <input
              type="checkbox"
              checked={visibleColumns.commission}
              onChange={() => onColumnToggle('commission')}
              className="mr-2"
            />
            수수료
          </label>
          <label className="flex items-center text-sm">
            <input
              type="checkbox"
              checked={visibleColumns.lastActivity}
              onChange={() => onColumnToggle('lastActivity')}
              className="mr-2"
            />
            마지막 활동
          </label>
          <label className="flex items-center text-sm">
            <input
              type="checkbox"
              checked={visibleColumns.status}
              onChange={() => onColumnToggle('status')}
              className="mr-2"
            />
            상태
          </label>
        </div>

        <div className="border-t border-gray-200 mt-3 pt-3">
          <h3 className="font-medium text-sm mb-3">페이지네이션</h3>
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-600">페이지당 항목:</label>
            <input
              type="number"
              value={itemsPerPage}
              onChange={(e) => onItemsPerPageChange(e.target.value)}
              min="1"
              max="999"
              className="w-16 px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
            <button
              onClick={onClose}
              className="ml-auto px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
            >
              적용
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
