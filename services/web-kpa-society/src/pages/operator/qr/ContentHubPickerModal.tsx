/**
 * ContentHubPickerModal — QR 템플릿 '콘텐츠 허브' 대상 선택기
 *
 * WO-O4O-KPA-QR-CONTENT-PICKER-V1
 *
 * 운영자가 QR 템플릿(내부 콘텐츠 → 콘텐츠 허브)에서 kpa_contents 항목을
 * 검색/선택한다. 선택 시 onSelect 로 { id, title } 을 돌려준다.
 * free-form id 직접 입력을 대체하는 운영자 기본 흐름.
 */

import { useEffect, useState, useCallback } from 'react';
import { X, Search, Loader2, FileText, AlertCircle, ChevronRight } from 'lucide-react';
import { listContentHubItems, type ContentHubItem } from '../../../api/contentHub';

interface Props {
  onSelect: (item: { id: string; title: string }) => void;
  onClose: () => void;
}

export default function ContentHubPickerModal({ onSelect, onClose }: Props) {
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [items, setItems] = useState<ContentHubItem[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await listContentHubItems({ page, limit: 8, search });
      setItems(data.items);
      setTotalPages(data.totalPages || 1);
    } catch (e: any) {
      setError(e?.message || '콘텐츠를 불러올 수 없습니다');
    } finally {
      setIsLoading(false);
    }
  }, [page, search]);

  useEffect(() => { load(); }, [load]);

  const handleSearch = () => { setSearch(searchInput.trim()); setPage(1); };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-100">
          <div>
            <h2 className="text-lg font-bold text-slate-800">콘텐츠 선택</h2>
            <p className="text-xs text-slate-500 mt-0.5">콘텐츠 허브에서 QR 에 연결할 항목을 선택하세요</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search */}
        <div className="p-4 border-b border-slate-100">
          <div className="flex gap-2">
            <div className="flex-1 relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchInput}
                onChange={e => setSearchInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleSearch(); } }}
                placeholder="제목 검색..."
                className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <button
              onClick={handleSearch}
              className="px-4 py-2 rounded-lg bg-slate-700 text-white text-sm font-medium hover:bg-slate-800"
            >
              검색
            </button>
          </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto p-2">
          {isLoading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-16 gap-2 text-slate-500">
              <AlertCircle className="w-6 h-6 text-red-400" />
              <p className="text-sm">{error}</p>
            </div>
          ) : items.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-2 text-slate-400">
              <FileText className="w-6 h-6" />
              <p className="text-sm">콘텐츠가 없습니다</p>
            </div>
          ) : (
            <ul className="divide-y divide-slate-100">
              {items.map(item => (
                <li key={item.id}>
                  <button
                    onClick={() => onSelect({ id: item.id, title: item.title })}
                    className="w-full text-left px-3 py-3 hover:bg-blue-50 rounded-lg flex items-center gap-3 group"
                  >
                    <FileText className="w-4 h-4 text-slate-400 flex-shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-slate-800 truncate group-hover:text-blue-600">{item.title}</p>
                      {item.summary && (
                        <p className="text-xs text-slate-400 truncate mt-0.5">{item.summary}</p>
                      )}
                    </div>
                    {item.category && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 flex-shrink-0">{item.category}</span>
                    )}
                    <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-blue-400 flex-shrink-0" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-3 p-3 border-t border-slate-100">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="px-3 py-1.5 text-sm rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40"
            >
              이전
            </button>
            <span className="text-xs text-slate-500">{page} / {totalPages}</span>
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="px-3 py-1.5 text-sm rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40"
            >
              다음
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
