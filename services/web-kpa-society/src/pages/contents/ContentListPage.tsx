/**
 * ContentListPage — 콘텐츠 허브 (섹션 기반)
 *
 * WO-KPA-CONTENT-HUB-FOUNDATION-V1
 * WO-O4O-CONTENT-HUB-TEMPLATE-TYPE-ALIGNMENT-V1
 * WO-KPA-CONTENT-LIST-TABS-ALIGN-WITH-CREATE-TYPES-V1
 * WO-KPA-CONTENT-SECTION-CREATE-FLOW-ALIGN-V1 (Phase 1: 등록 흐름 정렬)
 * WO-KPA-CONTENT-HUB-SECTION-UI-V1 (Phase 2: 섹션 허브 UI 전환)
 * WO-O4O-CONTENT-LIBRARY-CARD-STANDARD-V1: inline style → Tailwind, hex → theme, Card 적용
 *
 * /content를 2개 섹션의 허브로 표시:
 *   1. 문서형 콘텐츠 — 메인 섹션 (리스트, 등록/상세/링크/수정/삭제)
 *   2. 코스형 자료  — 두 번째 섹션 (리스트, 등록 + 더보기)
 *
 * 데이터 소스:
 *   - 문서: contentApi.list (content_type='information', sub_type='content')
 *   - 코스: lmsInstructorApi.myCourses (Phase 3에서 코스형/강의 분리)
 *
 * 권한: 작성자만 수정/삭제 노출 (createdBy === currentUserId)
 */

import { useEffect, useState, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { contentApi, type ContentItem } from '../../api/content';
import { lmsInstructorApi } from '../../api/lms-instructor';
import type { Course } from '../../api/lms-instructor';
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

      <Card className="overflow-hidden">
        {loading ? (
          <div className="py-8 px-4 text-sm text-slate-400 text-center">불러오는 중...</div>
        ) : items.length === 0 ? (
          <div className="py-8 px-4 text-sm text-slate-400 text-center">아직 문서가 없습니다</div>
        ) : (
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
        )}
      </Card>
    </section>
  );
}

// ─── Section 2: 코스형 자료 ──────────────────────────────────────────────────

function CoursesSection({ isAuthenticated }: { isAuthenticated: boolean }) {
  const navigate = useNavigate();
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    // WO-KPA-CONTENT-COURSE-KIND-SEPARATION-V1: 코스형 자료(content_resource)만 조회
    lmsInstructorApi.myCourses(1, 10, 'content_resource')
      .then((res: any) => {
        if (cancelled) return;
        // axios response shape: res.data = { success, data: Course[] }
        const list = res?.data?.data ?? [];
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
        primaryAction={isAuthenticated ? { label: '코스형 자료 등록', to: '/content/courses/new' } : undefined}
        moreLink={{ label: '전체 보기', to: '/content/courses' }}
      />

      <Card className="overflow-hidden">
        {loading ? (
          <div className="py-8 px-4 text-sm text-slate-400 text-center">불러오는 중...</div>
        ) : courses.length === 0 ? (
          <div className="py-8 px-4 text-sm text-slate-400 text-center">아직 코스형 자료가 없습니다</div>
        ) : (
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
                  onClick={() => navigate(`/instructor/courses/${c.id}`)}
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
        )}
      </Card>
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

  return (
    <div className="max-w-[1100px] mx-auto px-4 pt-8 pb-16">
      <header className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900 mb-1 mt-0">콘텐츠</h1>
        <p className="text-[15px] text-slate-500 m-0">문서·코스형 자료를 한 곳에서 관리합니다.</p>
      </header>

      <DocumentsSection
        currentUserId={user?.id}
        isAuthenticated={isAuthenticated}
        refreshKey={refreshKey}
        onChanged={handleDocumentsChanged}
      />

      <CoursesSection isAuthenticated={isAuthenticated} />
    </div>
  );
}

export default ContentListPage;
