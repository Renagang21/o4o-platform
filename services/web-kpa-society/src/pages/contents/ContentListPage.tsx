/**
 * ContentListPage — 콘텐츠 허브 (섹션 기반)
 *
 * WO-KPA-CONTENT-HUB-FOUNDATION-V1
 * WO-O4O-CONTENT-HUB-TEMPLATE-TYPE-ALIGNMENT-V1
 * WO-KPA-CONTENT-LIST-TABS-ALIGN-WITH-CREATE-TYPES-V1
 * WO-KPA-CONTENT-SECTION-CREATE-FLOW-ALIGN-V1 (Phase 1: 등록 흐름 정렬)
 * WO-KPA-CONTENT-HUB-SECTION-UI-V1 (Phase 2: 섹션 허브 UI 전환)
 * WO-O4O-CONTENT-LIBRARY-CARD-STANDARD-V1: inline style → Tailwind, hex → theme, Card 적용
 * WO-KPA-CONTENT-HUB-SURVEY-SECTION-RESTORE-V1: 설문조사 섹션 추가
 *
 * /content를 3개 섹션의 허브로 표시:
 *   1. 문서형 콘텐츠 — 메인 섹션 (리스트, 등록/상세/링크/수정/삭제)
 *   2. 코스형 자료  — 두 번째 섹션 (리스트, 등록 + 더보기)
 *   3. 설문조사     — 세 번째 섹션 (카드 미리보기, 등록 + 더보기)
 *
 * 데이터 소스:
 *   - 문서: contentApi.list (content_type='information', sub_type='content')
 *   - 코스: lmsApi.getCourses (공개 API, contentKind='content_resource', status='published')
 *   - 설문: participationApi.getParticipationSets (최대 6개)
 *
 * WO-KPA-CONTENT-COURSES-PUBLIC-VISIBILITY-FIX-V1:
 *   코스형 자료 섹션을 강사 전용 API에서 공개 API로 교체.
 *   모든 이용자가 공개 코스형 자료를 볼 수 있도록 수정.
 *
 * 권한: 작성자만 수정/삭제 노출 (createdBy === currentUserId)
 */

import { useEffect, useState, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { contentApi, type ContentItem } from '../../api/content';
import { lmsApi } from '../../api/lms';
import { participationApi } from '../../api/participation';
import type { Course } from '../../types';
import type { ParticipationSet } from '../participation/types';
import { useAuth } from '../../contexts/AuthContext';
import { toast } from '@o4o/error-handling';
import { Card } from '@o4o/ui';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatDate(d: string | Date | null | undefined) {
  if (!d) return '-';
  try { return new Date(d).toLocaleDateString('ko-KR'); } catch { return '-'; }
}

// ─── Row Action Menu (문서 섹션 전용) ─────────────────────────────────────────

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

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    contentApi.list({
      page: 1,
      limit: 10,
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
      onChanged();
    } catch (e: any) {
      toast.error(e?.message || '삭제에 실패했습니다');
    }
  }, [onChanged]);

  return (
    <section className="mb-10">
      <SectionHeader
        title="문서형 콘텐츠"
        description="리치 텍스트 편집기로 작성한 문서"
        primaryAction={isAuthenticated ? { label: '문서 등록', to: '/content/documents/new' } : undefined}
      />

      {loading ? (
        <Card className="overflow-hidden">
          <div className="py-8 px-4 text-sm text-slate-400 text-center">불러오는 중...</div>
        </Card>
      ) : items.length === 0 ? (
        <Card className="overflow-hidden">
          <div className="py-8 px-4 text-sm text-slate-400 text-center">아직 문서가 없습니다</div>
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

          {/* Mobile: Card List (WO-O4O-RESPONSIVE-LIST-EXPAND-V1) */}
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

// ─── Section 3: 설문조사 (WO-KPA-CONTENT-HUB-SURVEY-SECTION-RESTORE-V1) ─────

function SurveysSection({ isAuthenticated }: { isAuthenticated: boolean }) {
  const navigate = useNavigate();
  const [surveys, setSurveys] = useState<ParticipationSet[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    participationApi.getParticipationSets({ page: 1, limit: 6 })
      .then((res: any) => {
        if (cancelled) return;
        const list = res?.data?.items ?? res?.items ?? [];
        setSurveys(Array.isArray(list) ? list : []);
      })
      .catch(() => {
        if (cancelled) return;
        setSurveys([]);
      })
      .finally(() => {
        if (cancelled) return;
        setLoading(false);
      });
    return () => { cancelled = true; };
  }, []);

  const handleClick = (s: ParticipationSet) => {
    if (s.status === 'active') {
      navigate(`/participation/${s.id}/respond`);
    } else {
      navigate(`/participation/${s.id}/results`);
    }
  };

  const statusBadge = (status: string) => {
    if (status === 'active') return { cls: 'bg-emerald-50 text-emerald-700', label: '진행 중' };
    if (status === 'closed') return { cls: 'bg-slate-100 text-slate-500', label: '종료됨' };
    return { cls: 'bg-amber-50 text-amber-700', label: '초안' };
  };

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
      ) : surveys.length === 0 ? (
        <Card className="overflow-hidden">
          <div className="py-8 px-4 text-sm text-slate-400 text-center">아직 설문조사가 없습니다</div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {surveys.map((s) => {
            const badge = statusBadge(s.status);
            return (
              <Card
                key={s.id}
                className="p-4 cursor-pointer hover:bg-slate-50 transition-colors"
                onClick={() => handleClick(s)}
              >
                <div className="flex flex-col gap-2">
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-sm font-medium text-slate-800 line-clamp-1 flex-1 min-w-0">{s.title}</span>
                    <span className={`inline-block px-2 py-0.5 text-[11px] font-semibold rounded shrink-0 ${badge.cls}`}>
                      {badge.label}
                    </span>
                  </div>
                  {s.description && (
                    <p className="text-xs text-slate-500 line-clamp-2 m-0">{s.description}</p>
                  )}
                  <div className="flex items-center gap-3 text-xs text-slate-400">
                    <span>질문 {s.questions?.length ?? 0}개</span>
                    <span>{formatDate(s.createdAt)}</span>
                  </div>
                </div>
              </Card>
            );
          })}
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
