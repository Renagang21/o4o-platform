/**
 * ContentListPage — 콘텐츠 허브 (섹션 기반)
 *
 * WO-KPA-CONTENT-HUB-FOUNDATION-V1
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
 * /content를 3개 섹션의 허브로 표시:
 *   1. 문서형 콘텐츠 — 메인 섹션 (리스트, BaseTable + Drawer)
 *   2. 코스형 자료  — 두 번째 섹션 (리스트, 등록 + 더보기)
 *   3. 설문조사     — 세 번째 섹션
 *
 * 권한: 작성자만 수정/삭제 노출 (createdBy === currentUserId)
 */

import { useEffect, useState, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { contentApi, type ContentItem } from '../../api/content';
import { assetSnapshotApi } from '../../api/assetSnapshot';
import { lmsApi } from '../../api/lms';
import { participationApi } from '../../api/participation';
import type { Course } from '../../types';
import type { ParticipationSet } from '../participation/types';
import { useAuth } from '../../contexts/AuthContext';
import { toast } from '@o4o/error-handling';
import {
  Card,
  BaseTable,
  BaseDetailDrawer,
  RowActionMenu,
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
}: {
  currentUserId?: string;
  isAuthenticated: boolean;
  refreshKey: number;
  onChanged: () => void;
}) {
  const navigate = useNavigate();
  const [items, setItems] = useState<ContentItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Drawer + 가져가기 상태 (WO-O4O-CONTENT-HUB-TABLE-CANONICAL-ALIGN-V1)
  const [drawerItem, setDrawerItem] = useState<ContentItem | null>(null);
  const [drawerDetail, setDrawerDetail] = useState<ContentItem | null>(null);
  const [drawerLoading, setDrawerLoading] = useState(false);
  const [copying, setCopying] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    contentApi.list({
      page: 1,
      limit: 6,
      sort: 'latest',
      content_type: 'information',
      sub_type: 'content',
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
  }, [refreshKey]);

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
  // 가져온 콘텐츠는 /library/contents 페이지에서 보이며 POP/QR/블로그 제작에서 선택 가능.
  const handleCopyToStore = useCallback(async (id: string) => {
    setCopying(id);
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
      setCopying(null);
    }
  }, []);

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
        const actions: RowActionItem[] = [
          {
            key: 'copy-to-store',
            label: '내 자료함 가져가기',
            onClick: () => handleCopyToStore(row.id),
            loading: copying === row.id,
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
  const drawerActions = drawerItem ? [
    {
      label: '내 자료함 가져가기',
      variant: 'primary' as const,
      onClick: () => handleCopyToStore(drawerItem.id),
      loading: copying === drawerItem.id,
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
        moreLink={{ label: '전체 보기', to: '/content/documents' }}
      />

      {loading ? (
        <Card className="overflow-hidden">
          <div className="py-8 px-4 text-sm text-slate-400 text-center">불러오는 중...</div>
        </Card>
      ) : (
        <>
          {/* Desktop: BaseTable */}
          <div className="hidden md:block bg-white rounded-lg border border-slate-200 overflow-hidden">
            <BaseTable<ContentItem>
              columns={columns}
              data={items}
              rowKey={(row) => row.id}
              onRowClick={(row) => openDrawer(row)}
              emptyMessage={
                <div className="py-8 px-4 text-sm text-slate-400 text-center">아직 문서가 없습니다</div>
              }
            />
          </div>

          {/* Mobile: Card List */}
          <div className="block md:hidden">
            {items.length === 0 ? (
              <Card className="overflow-hidden">
                <div className="py-8 px-4 text-sm text-slate-400 text-center">아직 문서가 없습니다</div>
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
              <div className="text-sm text-slate-800 leading-relaxed" dangerouslySetInnerHTML={{ __html: drawerDetail.body }} />
            ) : (
              <p className="text-sm text-slate-400 m-0">본문이 없습니다.</p>
            )}
          </div>
        )}
      </BaseDetailDrawer>
    </section>
  );
}

// ─── Section 2: 코스형 자료 ──────────────────────────────────────────────────

function CoursesSection({ canCreateCourse }: { canCreateCourse: boolean }) {
  const navigate = useNavigate();
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    // WO-KPA-CONTENT-COURSES-PUBLIC-VISIBILITY-FIX-V1:
    // 공개 API로 교체 — 모든 이용자가 published content_resource를 조회할 수 있음
    lmsApi.getCourses({ page: 1, limit: 10, status: 'published', contentKind: 'content_resource' })
      .then((res: any) => {
        if (cancelled) return;
        // apiClient (fetch) response shape: { success, data: Course[], pagination }
        const list = res?.data ?? [];
        setCourses(Array.isArray(list) ? list : []);
      })
      .catch(() => {
        if (cancelled) return;
        setCourses([]);
      })
      .finally(() => {
        if (cancelled) return;
        setLoading(false);
      });
    return () => { cancelled = true; };
  }, []);

  return (
    <section className="mb-10">
      <SectionHeader
        title="코스형 자료"
        description="목록형으로 구성된 분량 많은 콘텐츠"
        primaryAction={canCreateCourse ? { label: '코스형 자료 등록', to: '/content/courses/new' } : undefined}
        moreLink={{ label: '전체 보기', to: '/content/courses' }}
      />

      {loading ? (
        <Card className="overflow-hidden">
          <div className="py-8 px-4 text-sm text-slate-400 text-center">불러오는 중...</div>
        </Card>
      ) : courses.length === 0 ? (
        <Card className="overflow-hidden">
          <div className="py-8 px-4 text-sm text-slate-400 text-center">아직 코스형 자료가 없습니다</div>
        </Card>
      ) : (
        <>
          {/* Desktop: Table */}
          <Card className="overflow-hidden hidden md:block">
            <table className="w-full border-collapse table-fixed">
              <thead>
                <tr>
                  <th className="px-3 py-2.5 text-xs font-semibold text-slate-500 bg-slate-50 border-b border-slate-200 text-left">제목</th>
                  <th className="px-3 py-2.5 text-xs font-semibold text-slate-500 bg-slate-50 border-b border-slate-200 text-left w-20">레슨</th>
                  <th className="px-3 py-2.5 text-xs font-semibold text-slate-500 bg-slate-50 border-b border-slate-200 text-left w-[100px]">작성일</th>
                  <th className="px-3 py-2.5 text-xs font-semibold text-slate-500 bg-slate-50 border-b border-slate-200 text-left w-20">상태</th>
                </tr>
              </thead>
              <tbody>
                {courses.map((c) => (
                  <tr
                    key={c.id}
                    onClick={() => navigate(`/content/courses/${c.id}`)}
                    className="cursor-pointer transition-colors hover:bg-slate-50"
                  >
                    <td className="px-3 py-3 text-sm text-slate-900 border-b border-slate-100 overflow-hidden text-ellipsis whitespace-nowrap">
                      <span className="font-semibold text-sm text-slate-800">{c.title}</span>
                    </td>
                    <td className="px-3 py-3 text-[13px] text-slate-500 border-b border-slate-100">{c.duration > 0 ? `${c.duration}분` : '-'}</td>
                    <td className="px-3 py-3 text-[13px] text-slate-400 border-b border-slate-100">{formatDate(c.createdAt)}</td>
                    <td className="px-3 py-3 border-b border-slate-100">
                      <span className={`inline-block px-2 py-0.5 text-[11px] font-semibold rounded ${
                        c.status === 'published' ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'
                      }`}>
                        {c.status === 'published' ? '공개' : c.status === 'archived' ? '보관' : '초안'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>

          {/* Mobile: Card List (WO-O4O-RESPONSIVE-LIST-EXPAND-V1) */}
          <div className="block md:hidden flex flex-col gap-3">
            {courses.map((c) => (
              <Card
                key={c.id}
                className="p-4 cursor-pointer hover:bg-slate-50 transition-colors"
                onClick={() => navigate(`/content/courses/${c.id}`)}
              >
                <div className="flex flex-col gap-2">
                  <span className="text-sm font-medium text-slate-800 line-clamp-2">{c.title}</span>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-slate-500">
                      {formatDate(c.createdAt)}
                      {c.duration > 0 && ` · ${c.duration}분`}
                    </span>
                    <span className={`inline-block px-2 py-0.5 text-[11px] font-semibold rounded ${
                      c.status === 'published' ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'
                    }`}>
                      {c.status === 'published' ? '공개' : c.status === 'archived' ? '보관' : '초안'}
                    </span>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </>
      )}
    </section>
  );
}

// ─── Section 3: 설문조사 ──────────────────────────────────────────────────
// WO-O4O-SURVEY-CORE-PHASE1-V1: O4O 공통 Survey API 연결, placeholder 제거.
// participationApi는 내부에서 /api/v1/surveys?serviceKey=kpa-society를 호출한다.

function SurveysSection({ isAuthenticated }: { isAuthenticated: boolean }) {
  const navigate = useNavigate();
  const [items, setItems] = useState<ParticipationSet[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    participationApi.getParticipationSets({ page: 1, limit: 6 })
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
  }, []);

  const targetForSurvey = (set: ParticipationSet) =>
    set.status === 'active'
      ? `/participation/${set.id}/respond`
      : `/participation/${set.id}/results`;

  return (
    <section className="mb-10">
      <SectionHeader
        title="설문조사"
        description="의견을 수집하거나 참여를 받는 설문"
        primaryAction={isAuthenticated ? { label: '설문 등록', to: '/content/surveys/new' } : undefined}
        moreLink={{ label: '전체 보기', to: '/content/surveys' }}
      />
      {loading ? (
        <Card className="overflow-hidden">
          <div className="py-8 px-4 text-sm text-slate-400 text-center">불러오는 중...</div>
        </Card>
      ) : items.length === 0 ? (
        <Card className="overflow-hidden">
          <div className="py-8 px-4 text-sm text-slate-400 text-center">아직 등록된 설문이 없습니다</div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {items.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => navigate(targetForSurvey(s))}
              className="flex flex-col items-start p-4 bg-white border border-slate-200 rounded-lg cursor-pointer text-left transition-colors hover:border-slate-400 min-h-[120px]"
            >
              <div className="flex items-center justify-between w-full mb-2">
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
              <div className="text-sm font-semibold text-slate-900 mb-1.5 line-clamp-2 w-full">
                {s.title}
              </div>
              {s.description && (
                <div className="text-[13px] text-slate-500 mb-2 line-clamp-2 w-full">{s.description}</div>
              )}
              <div className="text-xs text-slate-400 mt-auto">질문 {s.questions?.length ?? 0}개</div>
            </button>
          ))}
        </div>
      )}
    </section>
  );
}

// ─── Component ───────────────────────────────────────────────────────────────

export function ContentListPage() {
  const { user, isAuthenticated } = useAuth();

  // WO-KPA-CONTENT-COURSES-PUBLIC-VISIBILITY-FIX-V1:
  // 코스형 자료 등록은 lms:instructor 또는 kpa:admin 역할 필요
  const roles = user?.roles ?? [];
  const canCreateCourse = roles.includes('lms:instructor') || roles.includes('kpa:admin');

  // 문서 섹션의 삭제 후 재조회 트리거
  const [refreshKey, setRefreshKey] = useState(0);
  const handleDocumentsChanged = useCallback(() => {
    setRefreshKey((k) => k + 1);
  }, []);

  return (
    <div className="max-w-[1100px] mx-auto px-4 pt-8 pb-16">
      <header className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900 mb-1 mt-0">콘텐츠</h1>
        <p className="text-[15px] text-slate-500 m-0">문서·코스형 자료·설문조사를 한 곳에서 관리합니다.</p>
      </header>

      <DocumentsSection
        currentUserId={user?.id}
        isAuthenticated={isAuthenticated}
        refreshKey={refreshKey}
        onChanged={handleDocumentsChanged}
      />

      <CoursesSection canCreateCourse={canCreateCourse} />

      <SurveysSection isAuthenticated={isAuthenticated} />
    </div>
  );
}

export default ContentListPage;
