/**
 * ContentDocumentsPage — /content/documents
 *
 * WO-KPA-CONTENT-HUB-UNIFIED-SECTION-RULES-V1
 *
 * 문서형 콘텐츠 전체 목록.
 * /content 허브의 문서 섹션 미리보기 → "전체 보기" 클릭 시 이 페이지로 이동.
 *
 * API: contentApi.list (content_type='information', sub_type='content')
 * 권한: 작성자만 수정/삭제 노출 (created_by === currentUserId)
 */

import { useEffect, useState, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { contentApi, type ContentItem } from '../../api/content';
import { useAuth } from '../../contexts/AuthContext';
import { toast } from '@o4o/error-handling';
import { Card } from '@o4o/ui';

const PAGE_LIMIT = 20;

function formatDate(d: string | Date | null | undefined) {
  if (!d) return '-';
  try { return new Date(d).toLocaleDateString('ko-KR'); } catch { return '-'; }
}

// ─── Row Action Menu ──────────────────────────────────────────────────────────

function RowActionMenu({
  onView,
  onCopyLink,
  onEdit,
  onDelete,
  isOwner,
}: {
  onView: () => void;
  onCopyLink: () => void;
  onEdit: () => void;
  onDelete: () => void;
  isOwner: boolean;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative inline-block">
      <button
        onClick={(e) => { e.stopPropagation(); setOpen((o) => !o); }}
        className="px-2 py-0.5 text-sm font-bold text-slate-500 bg-transparent border border-slate-200 rounded cursor-pointer tracking-wider"
        title="액션"
      >
        ···
      </button>
      {open && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={(e) => { e.stopPropagation(); setOpen(false); }}
          />
          <div className="absolute right-0 top-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg z-20 min-w-[100px] overflow-hidden">
            <button className="block w-full px-3.5 py-2 text-[13px] font-medium text-slate-700 bg-transparent border-none text-left cursor-pointer hover:bg-slate-50" onClick={(e) => { e.stopPropagation(); setOpen(false); onView(); }}>
              상세보기
            </button>
            <button className="block w-full px-3.5 py-2 text-[13px] font-medium text-slate-700 bg-transparent border-none text-left cursor-pointer hover:bg-slate-50" onClick={(e) => { e.stopPropagation(); setOpen(false); onCopyLink(); }}>
              링크 복사
            </button>
            {isOwner && (
              <button className="block w-full px-3.5 py-2 text-[13px] font-medium text-slate-700 bg-transparent border-none text-left cursor-pointer hover:bg-slate-50" onClick={(e) => { e.stopPropagation(); setOpen(false); onEdit(); }}>
                수정
              </button>
            )}
            {isOwner && (
              <button
                className="block w-full px-3.5 py-2 text-[13px] font-medium text-red-500 bg-transparent border-none text-left cursor-pointer hover:bg-slate-50"
                onClick={(e) => { e.stopPropagation(); setOpen(false); onDelete(); }}
              >
                삭제
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export function ContentDocumentsPage() {
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  const currentUserId = user?.id;

  const [items, setItems] = useState<ContentItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  const load = useCallback((pageNum: number) => {
    setLoading(true);
    contentApi.list({
      page: pageNum,
      limit: PAGE_LIMIT,
      sort: 'latest',
      content_type: 'information',
      sub_type: 'content',
    })
      .then((res) => {
        setItems(res.data?.items ?? []);
        setTotal(res.data?.total ?? 0);
      })
      .catch(() => {
        setItems([]);
        setTotal(0);
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load(page);
  }, [load, page]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_LIMIT));

  const handleCopyLink = useCallback((id: string) => {
    const url = `${window.location.origin}/content/${id}`;
    navigator.clipboard.writeText(url)
      .then(() => toast.success('링크가 복사되었습니다'))
      .catch(() => toast.error('링크 복사에 실패했습니다'));
  }, []);

  const handleDelete = useCallback(async (id: string) => {
    if (!window.confirm('이 콘텐츠를 삭제하시겠습니까?')) return;
    try {
      await contentApi.remove(id);
      toast.success('삭제되었습니다');
      load(page);
    } catch (e: any) {
      toast.error(e?.message || '삭제에 실패했습니다');
    }
  }, [load, page]);

  return (
    <div className="max-w-[1100px] mx-auto px-4 pt-8 pb-16">
      <header className="flex items-end justify-between mb-6 gap-3 flex-wrap">
        <div>
          <Link to="/content" className="text-[13px] text-slate-500 no-underline mb-2 inline-block">← 콘텐츠 허브</Link>
          <h1 className="text-2xl font-bold text-slate-900 mb-1 mt-1">문서형 콘텐츠</h1>
          <p className="text-sm text-slate-500 m-0">리치 텍스트 편집기로 작성한 문서 전체 목록</p>
        </div>
        {isAuthenticated && (
          <Link to="/content/documents/new" className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-primary text-white text-sm font-semibold rounded-lg no-underline whitespace-nowrap">
            문서 등록
          </Link>
        )}
      </header>

      {loading ? (
        <Card className="overflow-hidden">
          <div className="py-12 px-4 text-sm text-slate-400 text-center">불러오는 중...</div>
        </Card>
      ) : items.length === 0 ? (
        <Card className="overflow-hidden">
          <div className="py-12 px-4 text-sm text-slate-400 text-center">
            <p className="m-0 mb-2">아직 등록된 문서가 없습니다.</p>
            {isAuthenticated && (
              <Link to="/content/documents/new" className="text-sm font-semibold text-primary no-underline">
                첫 문서 작성하기 →
              </Link>
            )}
          </div>
        </Card>
      ) : (
        <>
          {/* Desktop: Table */}
          <Card className="overflow-hidden hidden md:block">
            <table className="w-full border-collapse table-fixed">
              <thead>
                <tr>
                  <th className="px-3 py-2.5 text-xs font-semibold text-slate-500 bg-slate-50 border-b border-slate-200 text-left">제목</th>
                  <th className="px-3 py-2.5 text-xs font-semibold text-slate-500 bg-slate-50 border-b border-slate-200 text-left w-24">작성자</th>
                  <th className="px-3 py-2.5 text-xs font-semibold text-slate-500 bg-slate-50 border-b border-slate-200 text-left w-[100px]">작성일</th>
                  <th className="px-3 py-2.5 text-xs font-semibold text-slate-500 bg-slate-50 border-b border-slate-200 text-center w-14">조회</th>
                  <th className="px-3 py-2.5 text-xs font-semibold text-slate-500 bg-slate-50 border-b border-slate-200 text-center w-14">좋아요</th>
                  <th className="px-3 py-2.5 text-xs font-semibold text-slate-500 bg-slate-50 border-b border-slate-200 text-left w-12"></th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => {
                  const isOwner = !!(currentUserId && item.created_by === currentUserId);
                  return (
                    <tr
                      key={item.id}
                      onClick={() => navigate(`/content/${item.id}`)}
                      className="cursor-pointer transition-colors hover:bg-slate-50"
                    >
                      <td className="px-3 py-3 text-sm text-slate-900 border-b border-slate-100 overflow-hidden text-ellipsis whitespace-nowrap">
                        <span className="font-semibold text-sm text-slate-800">{item.title}</span>
                      </td>
                      <td className="px-3 py-3 text-[13px] text-slate-500 border-b border-slate-100 overflow-hidden text-ellipsis whitespace-nowrap">{item.author_name || '-'}</td>
                      <td className="px-3 py-3 text-[13px] text-slate-400 border-b border-slate-100 overflow-hidden text-ellipsis whitespace-nowrap">{formatDate(item.created_at)}</td>
                      <td className="px-3 py-3 text-[13px] text-slate-400 border-b border-slate-100 text-center whitespace-nowrap">👁 {item.view_count ?? 0}</td>
                      <td className="px-3 py-3 text-[13px] text-slate-400 border-b border-slate-100 text-center whitespace-nowrap">👍 {item.like_count ?? 0}</td>
                      <td className="px-3 py-3 border-b border-slate-100 text-center" onClick={(e) => e.stopPropagation()}>
                        <RowActionMenu
                          isOwner={isOwner}
                          onView={() => navigate(`/content/${item.id}`)}
                          onCopyLink={() => handleCopyLink(item.id)}
                          onEdit={() => navigate(`/content/${item.id}/edit`)}
                          onDelete={() => handleDelete(item.id)}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </Card>

          {/* Mobile: Card List */}
          <div className="block md:hidden flex flex-col gap-3">
            {items.map((item) => (
              <Card
                key={item.id}
                className="p-4 cursor-pointer hover:bg-slate-50 transition-colors"
                onClick={() => navigate(`/content/${item.id}`)}
              >
                <div className="flex flex-col gap-2">
                  <span className="text-sm font-medium text-slate-800 line-clamp-2">{item.title}</span>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-slate-500">
                      {item.author_name || '-'} · {formatDate(item.created_at)}
                    </span>
                    <div className="flex items-center gap-3 text-xs text-slate-400">
                      <span>👁 {item.view_count ?? 0}</span>
                      {(item.like_count ?? 0) > 0 && <span>👍 {item.like_count}</span>}
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center items-center gap-4 mt-5">
          <button
            onClick={() => setPage(Math.max(1, page - 1))}
            disabled={page <= 1}
            className="px-3.5 py-1.5 text-[13px] font-medium text-slate-600 bg-white border border-slate-200 rounded-md disabled:opacity-40 disabled:cursor-not-allowed"
          >
            « 이전
          </button>
          <span className="text-[13px] text-slate-500">{page} / {totalPages}</span>
          <button
            onClick={() => setPage(Math.min(totalPages, page + 1))}
            disabled={page >= totalPages}
            className="px-3.5 py-1.5 text-[13px] font-medium text-slate-600 bg-white border border-slate-200 rounded-md disabled:opacity-40 disabled:cursor-not-allowed"
          >
            다음 »
          </button>
        </div>
      )}
    </div>
  );
}

export default ContentDocumentsPage;
