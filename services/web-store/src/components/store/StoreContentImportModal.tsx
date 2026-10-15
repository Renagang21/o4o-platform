/**
 * StoreContentImportModal — 내 매장 콘텐츠 본문 가져오기(복사)
 *
 * WO-O4O-KPA-STORE-LOCAL-PRODUCT-REGISTRATION-ENHANCEMENT-V1 §8
 *
 * 매장이 직접 만든 콘텐츠(자료함 통합 feed 의 source='mine' = direct + 매장 제작 자료)를
 * 선택하면 본문 HTML 을 추출해 호출부(상품 설명 편집기)로 "복사"한다.
 *
 * 정책:
 *  - 연결이 아니라 복사 — 가져온 뒤 원본 수정/삭제와 무관하게 사본이 유지된다.
 *  - source='mine' 만 조회 → 운영자/커뮤니티 콘텐츠 노출 안 함.
 *  - 백엔드 feed(/store-library/contents)가 인증 사용자의 매장(org)으로 스코프 →
 *    다른 매장 콘텐츠 노출 차단(소유권·조직 범위 검증).
 *  - 제목은 가져오지 않는다(상품명 자동 변경 금지) — 본문 HTML 만 전달.
 */

import { Search, X, FileText, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import { useContentImport } from './useContentImport';
import { StoreProductDialog, useStoreProductScope } from './StoreProductSession';

// /store-library/contents 피드 contentJson 본문 HTML 추출.
// 우선순위: html(direct/execution + 일부 snapshot) → blocks[] → body/content → imageUrl.
function escAttr(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
function escHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
function contentJsonToHtml(json: Record<string, unknown> | undefined): string {
  if (!json) return '';
  if (typeof json.html === 'string' && json.html.trim()) return json.html;
  const blocks = Array.isArray(json.blocks) ? (json.blocks as Array<Record<string, unknown>>) : null;
  if (blocks && blocks.length > 0) {
    return blocks
      .map((b) => {
        const type = typeof b.type === 'string' ? b.type : 'text';
        const value = typeof b.value === 'string' ? b.value : '';
        if (!value) return '';
        if (type === 'image' && value) return `<p><img src="${escAttr(value)}" alt="" /></p>`;
        if (type === 'link' && value) {
          const label = typeof b.label === 'string' ? b.label : value;
          return `<p>${escHtml(label)}: ${escHtml(value)}</p>`;
        }
        return `<p>${escHtml(String(value))}</p>`;
      })
      .join('\n');
  }
  const body =
    typeof json.body === 'string' ? json.body : typeof json.content === 'string' ? json.content : '';
  let html = body || '';
  if (typeof json.imageUrl === 'string' && json.imageUrl) {
    html += `<p><img src="${escAttr(json.imageUrl)}" alt="" /></p>`;
  }
  return html;
}

interface StoreContentImportModalProps {
  open: boolean;
  onClose: () => void;
  /** 선택한 콘텐츠 본문 HTML 을 호출부로 전달(복사). title 은 참고용(상품명 변경에는 사용하지 않음). */
  onImport: (html: string, title: string) => void;
}

export default function StoreContentImportModal(props: StoreContentImportModalProps) {
  const scope = useStoreProductScope();
  if (!props.open || !scope.ready) return null;
  return <ContentImport key={scope.key} {...props} organizationId={scope.organizationId!} />;
}
function ContentImport({ onClose, onImport, organizationId }: StoreContentImportModalProps & { organizationId: string }) {
  const state = useContentImport(organizationId);
  const { items, loading, search, setSearch, selectedId, setSelectedId, page, setPage,
    totalPages, error, setError, selected } = state;

  const handleConfirm = () => {
    if (!selected || !state.current()) return;
    const html = contentJsonToHtml(selected.contentJson);
    if (!html.replace(/<[^>]*>/g, '').trim() && !/<(img|video|audio)\b/i.test(html)) {
      setError('이 콘텐츠에는 가져올 본문이 없습니다. 다른 콘텐츠를 선택해 주세요.');
      return;
    }
    onImport(html, selected.title);
  };

  return (
    <StoreProductDialog label="콘텐츠에서 가져오기" style={{ position: 'fixed', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,.5)', padding: 16 }} onClose={onClose}>
      <div
        className="bg-white rounded-2xl w-full max-w-xl max-h-[85vh] flex flex-col shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b">
          <h3 className="text-base font-bold text-slate-900">콘텐츠에서 가져오기</h3>
          <button aria-label="콘텐츠 가져오기 닫기" onClick={onClose} className="p-1 rounded-lg hover:bg-slate-100">
            <X className="w-5 h-5 text-slate-400" />
          </button>
        </div>

        {/* Search */}
        <div className="px-5 pt-4">
          <div className="flex items-center gap-2 px-3 py-2 border border-slate-200 rounded-lg bg-slate-50">
            <Search className="w-4 h-4 text-slate-400 flex-shrink-0" />
            <input
              aria-label="내 매장 콘텐츠 검색"
              data-request-autofocus
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="내 매장 콘텐츠 검색..."
              className="flex-1 bg-transparent text-sm outline-none text-slate-800"
            />
          </div>
          <p className="text-xs text-slate-400 mt-2 leading-relaxed">
            내 매장에서 만든 콘텐츠의 본문을 설명으로 복사합니다. 가져온 뒤에는 원본과 독립적으로 유지됩니다.
          </p>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-4 min-h-[240px]">
          {loading ? (
            <div className="flex items-center justify-center py-16 text-slate-400">
              <Loader2 className="w-5 h-5 animate-spin" />
            </div>
          ) : error ? (
            <div role="alert" className="p-3 text-sm text-red-700">{error} <button onClick={state.reload}>다시 시도</button></div>
          ) : items.length === 0 ? (
            <div className="text-center py-16">
              <FileText className="w-10 h-10 text-slate-200 mx-auto mb-2" />
              <p className="text-sm text-slate-400">
                {search.trim() ? '검색 결과가 없습니다' : '가져올 수 있는 내 매장 콘텐츠가 없습니다'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {items.map((item) => (
                <button
                  key={item.selectionKey || item.id}
                  onClick={() => setSelectedId(item.id)}
                  className={`text-left flex items-start gap-2 px-3 py-2.5 rounded-xl border transition-colors ${
                    selectedId === item.id
                      ? 'border-teal-500 ring-2 ring-teal-200 bg-teal-50/40'
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <FileText className="w-4 h-4 text-slate-400 mt-0.5 flex-shrink-0" />
                  <span className="text-sm text-slate-700 line-clamp-2">{item.title || '(제목 없음)'}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-3 px-5 py-2">
            <button
              onClick={() => setPage(Math.max(1, page - 1))}
              disabled={page <= 1}
              className="p-1.5 rounded-lg hover:bg-slate-100 disabled:opacity-30"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-sm text-slate-600">
              {page} / {totalPages}
            </span>
            <button
              onClick={() => setPage(Math.min(totalPages, page + 1))}
              disabled={page >= totalPages}
              className="p-1.5 rounded-lg hover:bg-slate-100 disabled:opacity-30"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {error && items.length > 0 && (
          <div className="px-5">
            <p className="text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>
          </div>
        )}

        {/* Footer */}
        <div className="px-5 py-3 border-t flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200"
          >
            취소
          </button>
          <button
            onClick={handleConfirm}
            disabled={!selected || loading || !!error}
            className="px-4 py-2 text-sm font-medium text-white bg-teal-600 rounded-lg hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            본문 가져오기
          </button>
        </div>
      </div>
    </StoreProductDialog>
  );
}
