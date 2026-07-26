/**
 * ContentListPage — 콘텐츠 허브 (섹션 기반)
 *
 * WO-KPA-CONTENT-HUB-FOUNDATION-V1
 * WO-O4O-KPA-CONTENT-COURSE-TYPE-REMOVE-V1
 * WO-O4O-CONTENT-HUB-TEMPLATE-TYPE-ALIGNMENT-V1
 * WO-KPA-CONTENT-LIST-TABS-ALIGN-WITH-CREATE-TYPES-V1
 * WO-KPA-CONTENT-SECTION-CREATE-FLOW-ALIGN-V1
 * WO-KPA-CONTENT-HUB-SECTION-UI-V1
 * WO-O4O-CONTENT-LIBRARY-CARD-STANDARD-V1
 * WO-KPA-CONTENT-HUB-SURVEY-SECTION-RESTORE-V1
 * WO-KPA-PARTICIPATION-SETS-404-CLEANUP-V1
 * WO-O4O-CONTENT-HUB-TABLE-CANONICAL-ALIGN-V1:
 *   - DocumentsSection을 BaseTable + BaseDetailDrawer + RowActionMenu canonical로 정렬
 *   - "링크 복사" → "내 자료함 가져가기" (contentApi.copyToStore)
 *   - "상세보기" 액션 제거 → 제목/row 클릭 시 Drawer 오픈
 *
 * /content를 2개 섹션의 허브로 표시:
 *   1. 문서형 콘텐츠 — 메인 섹션 (리스트, BaseTable + Drawer)
 *   2. 설문조사     — 두 번째 섹션
 *
 * 권한: 작성자만 수정/삭제 노출 (createdBy === currentUserId)
 */

import { useEffect, useState, useCallback } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { ContentRenderer } from '@o4o/content-editor';
// WO-O4O-KPA-CONTENT-LIST-SEARCH-CONNECTION-V1: ContentDocumentsPage 와 동일한 공통 검색 입력
import { CommunityContentSearchBar } from '@o4o/shared-space-ui';
import { contentApi, type ContentItem } from '../../api/content';
// WO-O4O-KPA-CONTENT-DETAIL-STORE-IMPORT-LINK-V1:
//   가져가기 호출/판정/라벨을 공용 모듈로 이동 — 콘텐츠 상세(/content/:id)와 동일 동작 공유.
//   동작·정책 변경 없음(동일 assetSnapshotApi.copy 호출).
import {
  CONTENT_IMPORT_LABEL,
  CONTENT_IMPORT_RESTRICTED_LABEL,
  isContentImportRestricted,
  importContentToStore,
} from '../../api/contentStoreImport';
// WO-O4O-KPA-CONTENT-IMPORT-COMPLETE-CANONICAL-MANAGEMENT-LINK-V1: 완료 CTA(단일=사본 편집 / 일괄=자료함 목록)
import { notifyContentImported, notifyContentsImported } from '../../components/contentImportToast';
import { participationApi } from '../../api/participation';
import type { ParticipationSet } from '../participation/types';
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
} from '@o4o/ui';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatDate(d: string | Date | null | undefined) {
  if (!d) return '-';
  try { return new Date(d).toLocaleDateString('ko-KR'); } catch { return '-'; }
}

// ─── Section Header (공통) ────────────────────────────────────────────────────

function SectionHeader({
  title,
  description,
  primaryAction,
  moreLink,
}: {
  title: string;
  description?: string;
  primaryAction?: { label: string; to: string };
  moreLink?: { label: string; to: string };
}) {
  return (
    <div className="flex items-end justify-between mb-3 gap-3 flex-wrap">
      <div>
        <h2 className="text-lg font-bold text-slate-900 mb-1 mt-0">{title}</h2>
        {description && <p className="text-[13px] text-slate-500 m-0">{description}</p>}
      </div>
      <div className="flex items-center gap-3">
        {moreLink && (
          <Link to={moreLink.to} className="text-[13px] text-slate-600 no-underline whitespace-nowrap hover:underline">
            {moreLink.label} →
          </Link>
        )}
        {primaryAction && (
          <Link to={primaryAction.to} className="inline-flex items-center gap-1.5 px-4 py-2 bg-primary text-white text-sm font-semibold rounded-lg no-underline whitespace-nowrap">
            {primaryAction.label}
          </Link>
        )}
      </div>
    </div>
  );
}

// ─── Section 1: 문서형 콘텐츠 ─────────────────────────────────────────────────

function DocumentsSection({
  currentUserId,
  isAuthenticated,
  refreshKey,
  onChanged,
  search,
}: {
  currentUserId?: string;
  isAuthenticated: boolean;
  refreshKey: number;
  onChanged: () => void;
  /** WO-O4O-KPA-CONTENT-LIST-SEARCH-CONNECTION-V1: 서버 search 파라미터(제목·요약·본문·작성자·태그) */
  search: string;
}) {
  const navigate = useNavigate();
  const [items, setItems] = useState<ContentItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Drawer + 가져가기 상태 (WO-O4O-CONTENT-HUB-TABLE-CANONICAL-ALIGN-V1)
  const [drawerItem, setDrawerItem] = useState<ContentItem | null>(null);
  const [drawerDetail, setDrawerDetail] = useState<ContentItem | null>(null);
  const [drawerLoading, setDrawerLoading] = useState(false);
  const [copying, setCopying] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  // 페이지/데이터 변경 시 사라진 selection 정리
  useEffect(() => {
    setSelected((prev) => {
      const validKeys = new Set(items.map((r) => r.id));
      const next = new Set<string>();
      for (const k of prev) { if (validKeys.has(k)) next.add(k); }
      return next.size === prev.size ? prev : next;
    });
  }, [items]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    contentApi.list({
      page: 1,
      limit: 6,
      sort: 'latest',
      content_type: 'information',
      sub_type: 'content',
      // WO-O4O-KPA-CONTENT-LIST-SEARCH-CONNECTION-V1: 기존 서버 search 계약 그대로 사용
      search: search || undefined,
    })
      .then((res) => {
        if (cancelled) return;
        setItems(res.data?.items ?? []);
      })
      .catch(() => {
        if (cancelled) return;
        setItems([]);
      })
      .finally(() => {
        if (cancelled) return;
        setLoading(false);
      });
    return () => { cancelled = true; };
  }, [refreshKey, search]);

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
  // WO-O4O-STORE-LIBRARY-COPY-INDEPENDENCE-ALIGN-V1: 중복 허용 — 매번 새 library item 생성
  // assetSnapshotApi.copy() — o4o_asset_snapshots 표준 자료함에 저장 (assetType='content').
  // 가져온 콘텐츠는 /library/contents 페이지에서 보이며 POP/QR/블로그 제작에서 선택 가능.
  // WO-O4O-KPA-CONTENT-IMPORT-COMPLETE-CANONICAL-MANAGEMENT-LINK-V1:
  //   행 액션·Drawer 공용 — 복사 응답의 사본 id 로 "가져온 콘텐츠 보기" CTA 제공(자동 이동 없음).
  const handleCopyToStore = useCallback(async (id: string) => {
    setCopying(id);
    try {
      const res = await importContentToStore(id);
      notifyContentImported(res?.data?.id, navigate);
    } catch (e: any) {
      toast.error(e?.message || '가져오기에 실패했습니다');
    } finally {
      setCopying(null);
    }
  }, [navigate]);

  const handleBulkCopyToStore = useCallback(async () => {
    const selectedItems = items.filter((r) => selected.has(r.id) && !isContentImportRestricted(r));
    if (selectedItems.length === 0) {
      toast.error('가져갈 수 있는 항목이 없습니다');
      return;
    }
    setCopying('bulk');
    try {
      await Promise.all(
        selectedItems.map((r) => importContentToStore(r.id)),
      );
      // 일괄은 특정 사본으로 이동하지 않는다 — canonical 자료함 목록으로 연결
      notifyContentsImported(
        selectedItems.length,
        `${selectedItems.length}개를 내 자료함에 가져왔습니다`,
        navigate,
      );
      setSelected(new Set());
    } catch (e: any) {
      toast.error(e?.message || '가져오기에 실패했습니다');
    } finally {
      setCopying(null);
    }
  }, [items, selected, navigate]);

  const handleDelete = useCallback(async (id: string) => {
    try {
      await contentApi.remove(id);
      toast.success('삭제되었습니다');
      if (drawerItem?.id === id) closeDrawer();
      onChanged();
    } catch (e: any) {
      toast.error(e?.message || '삭제에 실패했습니다');
    }
  }, [onChanged, drawerItem, closeDrawer]);

  const columns: O4OColumn<ContentItem>[] = [
    {
      key: '_select',
      header: '',
      system: true,
      width: '44px',
      align: 'center',
      onCellClick: () => {},
      // WO-O4O-KPA-CONTENT-REUSABLE-POLICY-LIST-DETAIL-PARITY-V1:
      //   restricted 는 체크박스 미표시(선택 불가) — ContentDocumentsPage 와 동일 규칙.
      //   목록이 reusable_policy 를 반환하지 않던 동안에는 구분 자체가 불가능했다.
      render: (_v, row) => (
        isContentImportRestricted(row) ? null : (
        <input
          type="checkbox"
          checked={selected.has(row.id)}
          onChange={(e) => {
            e.stopPropagation();
            setSelected((prev) => {
              const next = new Set(prev);
              if (next.has(row.id)) next.delete(row.id);
              else next.add(row.id);
              return next;
            });
          }}
          onClick={(e) => e.stopPropagation()}
          className="w-4 h-4 accent-blue-600 cursor-pointer"
        />
        )
      ),
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
        const isRestricted = isContentImportRestricted(row);
        const actions: RowActionItem[] = [
          {
            key: 'copy-to-store',
            label: isRestricted ? CONTENT_IMPORT_RESTRICTED_LABEL : CONTENT_IMPORT_LABEL,
            onClick: () => handleCopyToStore(row.id),
            loading: copying === row.id,
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
  ];

  const drawerIsOwner = !!(currentUserId && drawerItem && drawerItem.created_by === currentUserId);
  // WO-O4O-CMS-CONTENT-REUSABLE-POLICY-ALIGN-V1: drawer 에서도 restricted 차단
  // WO-O4O-KPA-CONTENT-REUSABLE-POLICY-LIST-DETAIL-PARITY-V1:
  //   상세 응답이 authoritative — 로드 전에는 목록 행으로 폴백(이제 목록도 필드를 반환)
  const drawerIsRestricted = isContentImportRestricted(drawerDetail ?? drawerItem);
  const drawerActions = drawerItem ? [
    {
      label: drawerIsRestricted ? CONTENT_IMPORT_RESTRICTED_LABEL : CONTENT_IMPORT_LABEL,
      variant: 'primary' as const,
      onClick: () => handleCopyToStore(drawerItem.id),
      loading: copying === drawerItem.id,
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

  return (
    <section className="mb-10">
      <SectionHeader
        title="문서형 콘텐츠"
        description="리치 텍스트 편집기로 작성한 문서"
        primaryAction={isAuthenticated ? { label: '문서 등록', to: '/content/documents/new' } : undefined}
        // WO-O4O-KPA-CONTENT-LIST-SEARCH-CONNECTION-V1:
        //   허브는 6건 요약이므로, 검색 중이면 '전체 보기'가 검색어를 그대로 넘겨
        //   전체 목록(페이지네이션 보유)에서 나머지 결과를 볼 수 있게 한다.
        moreLink={{
          label: search ? '검색 결과 전체 보기' : '전체 보기',
          to: search ? `/content/documents?search=${encodeURIComponent(search)}` : '/content/documents',
        }}
      />

      {loading ? (
        <Card className="overflow-hidden">
          <div className="py-8 px-4 text-sm text-slate-400 text-center">불러오는 중...</div>
        </Card>
      ) : (
        <>
          {/* Desktop: BaseTable */}
          <div className="hidden md:block bg-white rounded-lg border border-slate-200 overflow-hidden">
            {selected.size > 0 && (
              <ActionBar
                selectedCount={selected.size}
                actions={[
                  {
                    key: 'bulk-copy',
                    label: CONTENT_IMPORT_LABEL,
                    onClick: handleBulkCopyToStore,
                    loading: copying === 'bulk',
                  },
                ]}
                onClearSelection={() => setSelected(new Set())}
              />
            )}
            <BaseTable<ContentItem>
              columns={columns}
              data={items}
              rowKey={(row) => row.id}
              selectable
              selectedKeys={selected}
              onSelectionChange={setSelected}
              onRowClick={(row) => openDrawer(row)}
              emptyMessage={
                <div className="py-8 px-4 text-sm text-slate-400 text-center">
                  {search ? '검색 결과가 없습니다' : '아직 문서가 없습니다'}
                </div>
              }
            />
          </div>

          {/* Mobile: Card List */}
          <div className="block md:hidden">
            {items.length === 0 ? (
              <Card className="overflow-hidden">
                <div className="py-8 px-4 text-sm text-slate-400 text-center">
                  {search ? '검색 결과가 없습니다' : '아직 문서가 없습니다'}
                </div>
              </Card>
            ) : (
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
              <ContentRenderer html={drawerDetail.body || ''} className="text-sm text-slate-800 leading-relaxed" />
            ) : (
              <p className="text-sm text-slate-400 m-0">본문이 없습니다.</p>
            )}
          </div>
        )}
      </BaseDetailDrawer>
    </section>
  );
}

// ─── Section 2: 설문조사 ──────────────────────────────────────────────────
// WO-O4O-SURVEY-CORE-PHASE1-V1: O4O 공통 Survey API 연결, placeholder 제거.
// participationApi는 내부에서 /api/v1/surveys?serviceKey=kpa-society를 호출한다.

function SurveysSection({ isAuthenticated, search }: { isAuthenticated: boolean; search: string }) {
  const navigate = useNavigate();
  const [items, setItems] = useState<ParticipationSet[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    // WO-O4O-KPA-CONTENT-LIST-SEARCH-CONNECTION-V1: 설문도 기존 search 파라미터 지원
    participationApi.getParticipationSets({ page: 1, limit: 6, search: search || undefined })
      .then((res) => {
        if (cancelled) return;
        setItems(Array.isArray(res.data) ? res.data : []);
      })
      .catch(() => {
        if (cancelled) return;
        setItems([]);
      })
      .finally(() => {
        if (cancelled) return;
        setLoading(false);
      });
    return () => { cancelled = true; };
  }, [search]);

  useEffect(() => {
    setSelected((prev) => {
      const validKeys = new Set(items.map((r) => r.id));
      const next = new Set<string>();
      for (const k of prev) { if (validKeys.has(k)) next.add(k); }
      return next.size === prev.size ? prev : next;
    });
  }, [items]);

  const targetForSurvey = (set: ParticipationSet) =>
    set.status === 'active'
      ? `/participation/${set.id}/respond`
      : `/participation/${set.id}/results`;

  const columns: O4OColumn<ParticipationSet>[] = [
    {
      key: '_select',
      header: '',
      system: true,
      width: '44px',
      align: 'center',
      onCellClick: () => {},
      render: (_v, row) => (
        <input
          type="checkbox"
          checked={selected.has(row.id)}
          onChange={(e) => {
            e.stopPropagation();
            setSelected((prev) => {
              const next = new Set(prev);
              if (next.has(row.id)) next.delete(row.id);
              else next.add(row.id);
              return next;
            });
          }}
          onClick={(e) => e.stopPropagation()}
          className="w-4 h-4 accent-blue-600 cursor-pointer"
        />
      ),
    },
    {
      key: 'title',
      header: '제목',
      render: (_v, row) => (
        <span className="font-semibold text-sm text-slate-800 overflow-hidden text-ellipsis whitespace-nowrap">{row.title}</span>
      ),
    },
    {
      key: 'status',
      header: '상태',
      width: '80px',
      render: (val) => (
        <span className={`inline-block px-2 py-0.5 text-[11px] font-semibold rounded ${
          val === 'active' ? 'bg-emerald-50 text-emerald-700'
          : val === 'closed' ? 'bg-red-50 text-red-700'
          : 'bg-slate-100 text-slate-500'
        }`}>
          {val === 'active' ? '진행중' : val === 'closed' ? '종료' : '초안'}
        </span>
      ),
    },
    {
      key: 'questions',
      header: '질문',
      width: '60px',
      align: 'center',
      render: (val) => <span className="text-[13px] text-slate-400">{Array.isArray(val) ? val.length : 0}개</span>,
    },
    {
      key: 'createdAt',
      header: '작성일',
      width: '100px',
      render: (val) => <span className="text-[13px] text-slate-400">{val ? new Date(val).toLocaleDateString('ko-KR') : '-'}</span>,
    },
  ];

  return (
    <section className="mb-10">
      <SectionHeader
        title="설문조사"
        description="의견을 수집하거나 참여를 받는 설문"
        primaryAction={isAuthenticated ? { label: '설문 등록', to: '/content/surveys/new' } : undefined}
        // WO-O4O-KPA-CONTENT-LIST-SEARCH-CONNECTION-V1: ContentSurveysPage 는 이미 ?search= 를 읽는다
        moreLink={{
          label: search ? '검색 결과 전체 보기' : '전체 보기',
          to: search ? `/content/surveys?search=${encodeURIComponent(search)}` : '/content/surveys',
        }}
      />

      {loading ? (
        <Card className="overflow-hidden">
          <div className="py-8 px-4 text-sm text-slate-400 text-center">불러오는 중...</div>
        </Card>
      ) : (
        <>
          {/* Desktop: BaseTable */}
          <div className="hidden md:block bg-white rounded-lg border border-slate-200 overflow-hidden">
            {selected.size > 0 && (
              <ActionBar
                selectedCount={selected.size}
                actions={[]}
                onClearSelection={() => setSelected(new Set())}
              />
            )}
            <BaseTable<ParticipationSet>
              columns={columns}
              data={items}
              rowKey={(row) => row.id}
              selectable
              selectedKeys={selected}
              onSelectionChange={setSelected}
              onRowClick={(row) => navigate(targetForSurvey(row))}
              emptyMessage={
                <div className="py-8 px-4 text-sm text-slate-400 text-center">
                  {search ? '검색 결과가 없습니다' : '아직 등록된 설문이 없습니다'}
                </div>
              }
            />
          </div>

          {/* Mobile: Card List */}
          <div className="block md:hidden">
            {items.length === 0 ? (
              <Card className="overflow-hidden">
                <div className="py-8 px-4 text-sm text-slate-400 text-center">
                  {search ? '검색 결과가 없습니다' : '아직 등록된 설문이 없습니다'}
                </div>
              </Card>
            ) : (
              <div className="flex flex-col gap-3">
                {items.map((s) => (
                  <Card
                    key={s.id}
                    className="p-4 cursor-pointer hover:bg-slate-50 transition-colors"
                    onClick={() => navigate(targetForSurvey(s))}
                  >
                    <div className="flex flex-col gap-2">
                      <div className="flex items-center justify-between">
                        <span className={`inline-block px-2 py-0.5 text-[11px] font-semibold rounded ${
                          s.status === 'active' ? 'bg-emerald-50 text-emerald-700'
                          : s.status === 'closed' ? 'bg-red-50 text-red-700'
                          : 'bg-slate-100 text-slate-500'
                        }`}>
                          {s.status === 'active' ? '진행중' : s.status === 'closed' ? '종료' : '초안'}
                        </span>
                        <span className="text-xs text-slate-400">
                          {s.createdAt ? new Date(s.createdAt).toLocaleDateString('ko-KR') : '-'}
                        </span>
                      </div>
                      <span className="text-sm font-medium text-slate-800 line-clamp-2">{s.title}</span>
                      <span className="text-xs text-slate-400">질문 {s.questions?.length ?? 0}개</span>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </section>
  );
}

// ─── Component ───────────────────────────────────────────────────────────────

export function ContentListPage() {
  const { user, isAuthenticated } = useAuth();

  // 문서 섹션의 삭제 후 재조회 트리거
  const [refreshKey, setRefreshKey] = useState(0);
  const handleDocumentsChanged = useCallback(() => {
    setRefreshKey((k) => k + 1);
  }, []);

  // WO-O4O-KPA-CONTENT-LIST-SEARCH-CONNECTION-V1:
  //   검색어는 KPA canonical 패턴대로 query string(`?search=`)에 보존한다
  //   (ContentSurveysPage / CourseHubPage / ForumListPage 와 동일). 새 규칙 신설 아님.
  //   디바운스 300ms 는 ContentDocumentsPage 와 동일 값.
  const [searchParams, setSearchParams] = useSearchParams();
  const search = searchParams.get('search') || '';
  const [searchInput, setSearchInput] = useState(search);

  // 뒤로가기 등으로 URL 이 바뀌면 입력값도 따라간다
  useEffect(() => { setSearchInput(search); }, [search]);

  useEffect(() => {
    const next = searchInput.trim();
    if (next === search) return;
    const t = setTimeout(() => {
      setSearchParams((prev) => {
        const p = new URLSearchParams(prev);
        if (next) p.set('search', next); else p.delete('search');
        return p;
      }, { replace: true });
    }, 300);
    return () => clearTimeout(t);
  }, [searchInput, search, setSearchParams]);

  return (
    <div className="max-w-[1100px] mx-auto px-4 pt-8 pb-16">
      <header className="mb-8 flex items-end justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 mb-1 mt-0">콘텐츠</h1>
          <p className="text-[15px] text-slate-500 m-0">문서형 콘텐츠와 설문조사를 한 곳에서 관리합니다.</p>
        </div>
        {/* WO-O4O-RESOURCES-LIBRARY-IMPORT-FLOW-V1: 자료실 진입 링크 */}
        <Link
          to="/content/resources"
          className="text-sm font-medium text-primary no-underline whitespace-nowrap hover:underline"
        >
          자료실 →
        </Link>
      </header>

      {/* WO-O4O-KPA-CONTENT-LIST-SEARCH-CONNECTION-V1:
          공통 CommunityContentSearchBar 재사용 — 두 섹션이 각자의 기존 search 파라미터로 조회한다.
          (신규 검색 컴포넌트·통합 검색·랭킹 없음) */}
      <div className="mb-6">
        <CommunityContentSearchBar
          value={searchInput}
          onChange={setSearchInput}
          onClear={() => setSearchInput('')}
          placeholder="제목, 내용, 태그로 검색"
        />
      </div>

      <DocumentsSection
        currentUserId={user?.id}
        isAuthenticated={isAuthenticated}
        refreshKey={refreshKey}
        onChanged={handleDocumentsChanged}
        search={search}
      />

      <SurveysSection isAuthenticated={isAuthenticated} search={search} />
    </div>
  );
}

export default ContentListPage;
