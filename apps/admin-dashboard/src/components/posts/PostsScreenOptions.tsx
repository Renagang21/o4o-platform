import React from 'react';
import { Settings, ChevronDown } from 'lucide-react';

interface PostsScreenOptionsProps {
  show: boolean;
  setShow: (show: boolean) => void;
  visibleColumns: Record<string, boolean>;
  onColumnToggle: (column: string) => void;
  itemsPerPage: number;
  onItemsPerPageChange: (value: string) => void;
}

export const PostsScreenOptions: React.FC<PostsScreenOptionsProps> = ({
  show,
  setShow,
  visibleColumns,
  onColumnToggle,
  itemsPerPage,
  onItemsPerPageChange
}) => {
  return (
    <div className="relative">
      <button
        onClick={() => setShow(!show)}
        className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded transition-colors"
      >
        <Settings className="w-4 h-4" />
        Screen Options
        <ChevronDown className="w-3 h-3" />
      </button>
      
      {show && (
        <div className="absolute right-0 top-full mt-2 w-72 bg-white border border-gray-300 rounded-md shadow-lg z-50">
          <div className="p-4">
            <h3 className="font-medium text-sm mb-3">Columns</h3>
            <div className="grid grid-cols-2 gap-2">
              <label className="flex items-center text-sm">
                <input 
                  type="checkbox" 
                  checked={visibleColumns.author}
                  onChange={() => onColumnToggle('author')}
                  className="mr-2" 
                />
                글쓴이
              </label>
              <label className="flex items-center text-sm">
                <input 
                  type="checkbox" 
                  checked={visibleColumns.categories}
                  onChange={() => onColumnToggle('categories')}
                  className="mr-2" 
                />
                카테고리
              </label>
              <label className="flex items-center text-sm">
                <input 
                  type="checkbox" 
                  checked={visibleColumns.tags}
                  onChange={() => onColumnToggle('tags')}
                  className="mr-2" 
                />
                태그
              </label>
              <label className="flex items-center text-sm">
                <input 
                  type="checkbox" 
                  checked={visibleColumns.comments}
                  onChange={() => onColumnToggle('comments')}
                  className="mr-2" 
                />
                댓글
              </label>
              <label className="flex items-center text-sm">
                <input 
                  type="checkbox" 
                  checked={visibleColumns.date}
                  onChange={() => onColumnToggle('date')}
                  className="mr-2" 
                />
                날짜
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
              <h3 className="font-medium text-sm mb-3">Pagination</h3>
              <div className="flex items-center gap-2">
                <label className="text-sm text-gray-600">페이징 항목 수:</label>
                <input
                  type="number"
                  value={itemsPerPage}
                  onChange={(e) => onItemsPerPageChange(e.target.value)}
                  onBlur={(e) => {
                    if (!e.target.value || e.target.value === '0') {
                      onItemsPerPageChange('20');
                    }
                  }}
                  min="1"
                  max="999"
                  className="w-16 px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
                <button
                  onClick={() => setShow(false)}
                  className="ml-auto px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                >
                  적용
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-2">1-999 사이의 숫자를 입력하세요</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};