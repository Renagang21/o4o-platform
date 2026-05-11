/**
 * ContentDocumentsPage — /content/documents 및 /content/resources
 *
 * WO-KPA-CONTENT-HUB-UNIFIED-SECTION-RULES-V1
 * WO-O4O-CONTENT-HUB-TABLE-CANONICAL-ALIGN-V1:
 *   - O4O canonical table 패턴(BaseTable + RowActionMenu + ActionBar + BaseDetailDrawer) 적용
 *   - "링크 복사" → "내 자료함 가져가기" (contentApi.copyToStore)
 *   - "상세보기" 메뉴 제거 — row 클릭 시 Drawer 오픈
 *   - bulk select + bulk 가져가기/삭제(소유자만 필터) 추가
 * WO-O4O-CMS-CONTENT-REUSABLE-POLICY-ALIGN-V1: restricted 콘텐츠 가져가기 차단
 * WO-O4O-RESOURCES-LIBRARY-IMPORT-FLOW-V1:
 *   subType prop 추가 — 동일 페이지 코드로 '문서형 콘텐츠' (sub_type='content') 와
 *   '자료실' (sub_type='resource') 두 라우트를 처리. asset_type='content' 재사용
 *   (resolver 가 sub_type 을 content_json 에 자동 보존하므로 backend 변경 불필요).
 *
 * 문서형 콘텐츠 / 자료실 전체 목록.
 * /content 허브의 섹션 미리보기 → "전체 보기" 클릭 시 이 페이지로 이동.
 *
 * API: contentApi.list (content_type='information', sub_type=props.subType)
 * 권한: 작성자만 수정/삭제 노출 (created_by === currentUserId).
 *       자료실(sub_type='resource') 은 일반 사용자가 직접 등록하는 메뉴를 제공하지 않는다
 *       (운영자 등록 → 사용자 가져가기). 단 작성자 수정/삭제 권한은 기존과 동일하게 동작.
 */

import { useEffect, useState, useCallback, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { contentApi, type ContentItem } from '../../api/content';
import { assetSnapshotApi } from '../../api/assetSnapshot';
import { useAuth } from '../../contexts/AuthContext';
import { toast } from '@o4o/error-handling';
import {
  Card,
  BaseTable,
  BaseDetailDrawer,
  RowActionMenu,
  ActionBar,
  type O4OColumn,
  type RowActionItem,
  type ActionBarAction,
} from '@o4o/ui';

const PAGE_LIMIT = 20;

function formatDate(d: string | Date | null | undefined) {
  if (!d) return '-';
  try { return new Date(d).toLocaleDateString('ko-KR'); } catch { return '-'; }
}

export interface ContentDocumentsPageProps {
  /**
   * WO-O4O-RESOURCES-LIBRARY-IMPORT-FLOW-V1
   * 'content' (default) — 문서형 콘텐츠 / 'resource' — 자료실
   */
  subType?: 'content' | 'resource';
}

export function ContentDocumentsPage({ subType = 'content' }: ContentDocumentsPageProps = {}) {
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  const currentUserId = user?.id;

  // WO-O4O-RESOURCES-LIBRARY-IMPORT-FLOW-V1: subType 별 라벨/링크
  const isResource = subType === 'resource';
  const pageTitle = isResource ? '자료실' : '문서형 콘텐츠';
  const pageDescription = isResource
    ? '커뮤니티 자료를 매장 내 자료함으로 가져갈 수 있습니다.'
    : '리치 텍스트 편집기로 작성한 문서 전체 목록';
  const newItemHref = '/content/documents/new';
  const newItemLabel = isResource ? '자료 등록' : '문서 등록';
  const emptyText = isResource ? '아직 등록된 자료가 없습니다.' : '아직 등록된 문서가 없습니다.';
  const emptyCtaText = isResource ? '첫 자료 작성하기 →' : '첫 문서 작성하기 →';

  const [items, setItems] = useState<ContentItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set());

  // Drawer state
  const [drawerItem, setDrawerItem] = useState<ContentItem | null>(null);
  const [drawerDetail, setDrawerDetail] = useState<ContentItem | null>(null);
  const [drawerLoading, setDrawerLoading] = useState(false);

  // 가져가기 진행 표시
  const [copyingId, setCopyingId] = useState<string | null>(null);
  const [bulkBusy, setBulkBusy] = useState(false);

  const load = useCallback((pageNum: number) => {
    setLoading(true);
    contentApi.list({
      page: pageNum,
      limit: PAGE_LIMIT,
      sort: 'latest',
      content_type: 'information',
      sub_type: subType,
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
  }, [subType]);

  useEffect(() => {
    load(page);
    setSelectedKeys(new Set());
  }, [load, page]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_LIMIT));

  const openDrawer = useCallback((item: ContentItem) => {
    setDrawerItem(item);
    setDrawerDetail(null);
    setDrawerLoading(true);
    contentApi.detail(item.id)
      .then((res) => { if (res.success) setDrawerDetail(res.data); })
      .catch(() => {})
      .finally(() => setDrawerLoading(false));
  }, []);

  const closeDrawer = useCallback(() => {
    setDrawerItem(null);
    setDrawerDetail(null);
  }, []);

  // WO-O4O-CONTENT-HUB-ASSET-SNAPSHOT-WIRING-V1
  // assetSnapshotApi.copy() — o4o_asset_snapshots 표준 자료함에 저장 (assetType='content').
  const handleCopyToStore = useCallback(async (id: string) => {
    setCopyingId(id);
    try {
      await assetSnapshotApi.copy({
        sourceService: 'kpa',
        sourceAssetId: id,
        assetType: 'content',
      });
      toast.success('내 자료함에 가져왔습니다');
    } catch (e: any) {
      if (e?.code === 'DUPLICATE_SNAPSHOT') {
        toast.success('이미 자료함에 있습니다');
      } else {
        toast.error(e?.message || '가져오기에 실패했습니다');
      }
    } finally {
      setCopyingId(null);
    }
  }, []);

  const handleDelete = useCallback(async (id: string) => {
    try {
      await contentApi.remove(id);
      toast.success('삭제되었습니다');
      if (drawerItem?.id === id) closeDrawer();
      setSelectedKeys((prev) => { const next = new Set(prev); next.delete(id); return next; });
      load(page);
    } catch (e: any) {
      toast.error(e?.message || '삭제에 실패했습니다');
    }
  }, [load, page, drawerItem, closeDrawer]);

  const handleBulkCopy = useCallback(async () => {
    setBulkBusy(true);
    try {
      // WO-O4O-CMS-CONTENT-REUSABLE-POLICY-ALIGN-V1:
      //   restricted 항목은 사전 제외 (backend resolver 도 차단하나 client 에서 미리 거른다)
      const allIds = Array.from(selectedKeys);
      const restrictedSet = new Set(
        items.filter((it) => it.reusable_policy === 'restricted').map((it) => it.id),
      );
      const ids = allIds.filter((id) => !restrictedSet.has(id));
      const skipped = allIds.length - ids.length;

      const results = await Promise.allSettled(
        ids.map((id) =>
          assetSnapshotApi.copy({
            sourceService: 'kpa',
            sourceAssetId: id,
            assetType: 'content',
          }),
        ),
      );
      // 이미 자료함에 있는 항목(DUPLICATE_SNAPSHOT)은 성공으로 합산
      let ok = 0;
      let dup = 0;
      let failed = 0;
      for (const r of results) {
        if (r.status === 'fulfilled') ok += 1;
        else if ((r.reason as any)?.code === 'DUPLICATE_SNAPSHOT') dup += 1;
        else failed += 1;
      }
      const acquired = ok + dup;
      if (acquired > 0) {
        const dupNote = dup > 0 ? ` (이미 보유 ${dup}개 포함)` : '';
        toast.success(`${acquired}개를 자료함에 가져왔습니다${dupNote}`);
      }
      if (failed > 0) toast.error(`${failed}개 가져오기 실패`);
      if (skipped > 0) toast(`가져가기 불가 ${skipped}개는 제외됨`);
    } finally {
      setBulkBusy(false);
    }
  }, [selectedKeys, items]);

  const handleBulkDelete = useCallback(async () => {
    if (!currentUserId) return;
    setBulkBusy(true);
    try {
      // 소유자 필터: 본인 콘텐츠만 삭제 시도
      const ownIds = items
        .filter((it) => selectedKeys.has(it.id) && it.created_by === currentUserId)
        .map((it) => it.id);
      if (ownIds.length === 0) {
        toast.error('삭제 가능한 항목(본인 작성)이 없습니다');
        return;
      }
      const results = await Promise.allSettled(ownIds.map((id) => contentApi.remove(id)));
      const ok = results.filter((r) => r.status === 'fulfilled').length;
      if (ok > 0) toast.success(`${ok}개 삭제되었습니다`);
      setSelectedKeys(new Set());
      load(page);
    } finally {
      setBulkBusy(false);
    }
  }, [selectedKeys, items, currentUserId, load, page]);

  const columns = useMemo((): O4OColumn<ContentItem>[] => [
    // ─── 선택 컬럼 (BaseTable selectable 계약: _select key + system:true)
    // 헤더 체크박스는 BaseTable이 auto-wire, body 체크박스는 여기서 직접 렌더.
    // restricted 콘텐츠는 체크박스 미표시 (선택 불가).
    {
      key: '_select',
      header: '',
      width: '44px',
      align: 'center',
      system: true,
      render: (_v, row) => {
        const isRestricted = row.reusable_policy === 'restricted';
        if (isRestricted) return null;
        const isChecked = selectedKeys.has(row.id);
        return (
          <input
            type="checkbox"
            checked={isChecked}
            onChange={() => {
              setSelectedKeys((prev) => {
                const next = new Set(prev);
                if (next.has(row.id)) next.delete(row.id);
                else next.add(row.id);
                return next;
              });
            }}
            onClick={(e) => e.stopPropagation()}
            className="w-4 h-4 accent-blue-600 cursor-pointer"
            aria-label={`${row.title} 선택`}
          />
        );
      },
    },
    {
      key: 'title',
      header: '제목',
      render: (_v, row) => (
        <span className="font-semibold text-sm text-slate-800 overflow-hidden text-ellipsis whitespace-nowrap">{row.title}</span>
      ),
    },
    {
      key: 'author_name',
      header: '작성자',
      width: '100px',
      render: (val) => <span className="text-[13px] text-slate-500">{val || '-'}</span>,
    },
    {
      key: 'created_at',
      header: '작성일',
      width: '100px',
      render: (val) => <span className="text-[13px] text-slate-400">{formatDate(val)}</span>,
    },
    {
      key: 'view_count',
      header: '조회',
      width: '60px',
      align: 'center',
      render: (val) => <span className="text-[13px] text-slate-400">{val ?? 0}</span>,
    },
    {
      key: 'like_count',
      header: '좋아요',
      width: '60px',
      align: 'center',
      render: (val) => <span className="text-[13px] text-slate-400">{val ?? 0}</span>,
    },
    {
      key: '_actions',
      header: '',
      width: '52px',
      align: 'center',
      system: 'last',
      render: (_v, row) => {
        const isOwner = !!(currentUserId && row.created_by === currentUserId);
        // WO-O4O-CMS-CONTENT-REUSABLE-POLICY-ALIGN-V1: restricted 콘텐츠는 가져가기 차단
        const isRestricted = row.reusable_policy === 'restricted';
        const actions: RowActionItem[] = [
          {
            key: 'copy-to-store',
            label: isRestricted ? '내 자료함 가져가기 (불가)' : '내 자료함 가져가기',
            onClick: () => handleCopyToStore(row.id),
            loading: copyingId === row.id,
            disabled: isRestricted,
          },
        ];
        if (isOwner) {
          actions.push({
            key: 'edit',
            label: '수정',
            onClick: () => navigate(`/content/${row.id}/edit`),
          });
          actions.push({
            key: 'delete',
            label: '삭제',
            variant: 'danger',
            onClick: () => handleDelete(row.id),
            confirm: {
              title: '콘텐츠 삭제',
              message: '이 콘텐츠를 삭제하시겠습니까?',
              variant: 'danger',
            },
          });
        }
        return <RowActionMenu actions={actions} />;
      },
    },
  ], [currentUserId, copyingId, selectedKeys, navigate, handleCopyToStore, handleDelete]);

  const bulkActions: ActionBarAction[] = [
    {
      key: 'copy',
      label: '내 자료함 가져가기',
      onClick: handleBulkCopy,
      loading: bulkBusy,
    },
    {
      key: 'delete',
      label: '삭제',
      variant: 'danger',
      onClick: handleBulkDelete,
      loading: bulkBusy,
      confirm: {
        title: '선택 항목 삭제',
        message: `선택한 항목 중 본인 작성 콘텐츠를 삭제합니다.`,
        variant: 'danger',
      },
    },
  ];

  const drawerIsOwner = !!(currentUserId && drawerItem && drawerItem.created_by === currentUserId);
  // WO-O4O-CMS-CONTENT-REUSABLE-POLICY-ALIGN-V1: drawer 에서도 restricted 차단
  const drawerIsRestricted = drawerItem?.reusable_policy === 'restricted';
  const drawerActions = drawerItem ? [
    {
      label: drawerIsRestricted ? '내 자료함 가져가기 (불가)' : '내 자료함 가져가기',
      variant: 'primary' as const,
      onClick: () => handleCopyToStore(drawerItem.id),
      loading: copyingId === drawerItem.id,
      disabled: drawerIsRestricted,
    },
    ...(drawerIsOwner ? [
      {
        label: '수정',
        onClick: () => navigate(`/content/${drawerItem.id}/edit`),
      },
    ] : []),
    {
      label: '전체 페이지',
      onClick: () => navigate(`/content/${drawerItem.id}`),
    },
  ] : undefined;

  const emptyMessage = (
    <div className="py-12 px-4 text-sm text-slate-400 text-center">
      <p className="m-0 mb-2">{emptyText}</p>
      {/* WO-O4O-RESOURCES-LIBRARY-IMPORT-FLOW-V1: 자료실(resource) 은 사용자 직접 등록 진입점 미제공 */}
      {isAuthenticated && !isResource && (
        <Link to={newItemHref} className="text-sm font-semibold text-primary no-underline">
          {emptyCtaText}
        </Link>
      )}
    </div>
  );

  return (
    <div className="max-w-[1100px] mx-auto px-4 pt-8 pb-16">
      <header className="flex items-end justify-between mb-6 gap-3 flex-wrap">
        <div>
          <Link to="/content" className="text-[13px] text-slate-500 no-underline mb-2 inline-block">← 콘텐츠 허브</Link>
          <h1 className="text-2xl font-bold text-slate-900 mb-1 mt-1">{pageTitle}</h1>
          <p className="text-sm text-slate-500 m-0">{pageDescription}</p>
        </div>
        {/* WO-O4O-RESOURCES-LIBRARY-IMPORT-FLOW-V1: 자료실은 등록 버튼 미노출 */}
        {isAuthenticated && !isResource && (
          <Link to={newItemHref} className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-primary text-white text-sm font-semibold rounded-lg no-underline whitespace-nowrap">
            {newItemLabel}
          </Link>
        )}
      </header>

      {/* Bulk ActionBar */}
      {selectedKeys.size > 0 && (
        <ActionBar
          selectedCount={selectedKeys.size}
          actions={bulkActions}
          onClearSelection={() => setSelectedKeys(new Set())}
        />
      )}

      {/* Info bar */}
      {!loading && (
        <div className="flex justify-between items-center py-2 mb-1">
          <span className="text-xs text-slate-500">총 {total}개</span>
          {totalPages > 1 && (
            <span className="text-xs text-slate-400">{page} / {totalPages} 페이지</span>
          )}
        </div>
      )}

      {loading ? (
        <Card className="overflow-hidden">
          <div className="py-12 px-4 text-sm text-slate-400 text-center">불러오는 중...</div>
        </Card>
      ) : (
        <>
          {/* Desktop: BaseTable */}
          <div className="hidden md:block bg-white rounded-lg border border-slate-200 overflow-hidden mb-2">
            <BaseTable<ContentItem>
              columns={columns}
              data={items}
              rowKey={(row) => row.id}
              selectable
              selectedKeys={selectedKeys}
              onSelectionChange={setSelectedKeys}
              onRowClick={(row) => openDrawer(row)}
              emptyMessage={emptyMessage}
            />
          </div>

          {/* Mobile: Card list */}
          <div className="block md:hidden mb-2">
            {items.length === 0 ? emptyMessage : (
              <div className="flex flex-col gap-3">
                {items.map((item) => (
                  <Card
                    key={item.id}
                    className="p-4 cursor-pointer hover:bg-slate-50 transition-colors"
                    onClick={() => openDrawer(item)}
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
            )}
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

      {/* Detail Drawer */}
      <BaseDetailDrawer
        open={!!drawerItem}
        onClose={closeDrawer}
        title={drawerItem?.title ?? ''}
        loading={drawerLoading}
        actions={drawerActions}
      >
        {drawerDetail && (
          <div className="flex flex-col gap-4">
            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
              <span>{drawerDetail.author_name || '익명'}</span>
              <span>·</span>
              <span>{formatDate(drawerDetail.created_at)}</span>
              <span>·</span>
              <span>조회 {drawerDetail.view_count ?? 0}</span>
              <span>·</span>
              <span>좋아요 {drawerDetail.like_count ?? 0}</span>
            </div>
            {drawerDetail.summary && (
              <p className="text-sm text-slate-600 bg-slate-50 rounded-md px-3 py-2 m-0">{drawerDetail.summary}</p>
            )}
            {Array.isArray(drawerDetail.tags) && drawerDetail.tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {drawerDetail.tags.map((tag) => (
                  <span key={tag} className="px-2 py-0.5 text-[11px] font-medium text-slate-500 bg-slate-100 rounded">#{tag}</span>
                ))}
              </div>
            )}
            {drawerDetail.body ? (
              <div className="text-sm text-slate-800 leading-relaxed" dangerouslySetInnerHTML={{ __html: drawerDetail.body }} />
            ) : (
              <p className="text-sm text-slate-400 m-0">본문이 없습니다.</p>
            )}
          </div>
        )}
      </BaseDetailDrawer>
    </div>
  );
}

export default ContentDocumentsPage;
