/**
 * PharmacyPopPage — Staff POP 사본 관리 (내 매장 POP)
 *
 * WO-O4O-KPA-STORE-HUB-POP-CONTENT-IMPORT-V1 (2026-05-24)
 *
 * 경로: /store/content/pop
 * 인증 + PharmacyGuard
 *
 * 매장 경영자가 운영자 HUB POP 에서 가져온 매장 사본 (author_role='store') 을
 * 확인·수정·삭제한다.
 *
 * 본 페이지 범위:
 *   - 사본 목록 (status 필터 포함)
 *   - 사본 인라인 수정 (title / slug / excerpt / content)
 *   - 사본 삭제
 *
 * 본 페이지 범위 외 (후속):
 *   - 매장 직접 POP 작성 (POST endpoint 미제공)
 *   - publish / archive 흐름
 *   - POP 디자인 캔버스 / 템플릿 / PDF 출력 (기존 StorePopPage 가 별도 담당)
 *
 * 패턴: PharmacyBlogPage 의 list / editor mode 분리 구조를 minimal 로 차용 — settings/
 *   AI/template 영역은 본 WO 범위 외.
 */

import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, AlertCircle, Edit3, Trash2, ArrowLeft, Save, ExternalLink, Printer } from 'lucide-react';
import { RichTextEditor } from '@o4o/content-editor';
import { toast } from '@o4o/error-handling';
import {
  fetchStaffPopPosts,
  updateStaffPopPost,
  deleteStaffPopPost,
  type StaffPopPost,
} from '../../api/popStaff';
import { getStoreSlug } from '../../api/pharmacyInfo';

type ViewMode = 'list' | 'editor';
type StatusFilter = '' | 'draft' | 'published' | 'archived';

const STATUS_LABEL: Record<StaffPopPost['status'], string> = {
  draft: '초안',
  published: '발행',
  archived: '보관',
};

const STATUS_BADGE: Record<StaffPopPost['status'], string> = {
  draft: 'bg-slate-100 text-slate-600',
  published: 'bg-emerald-50 text-emerald-700',
  archived: 'bg-amber-50 text-amber-700',
};

export function PharmacyPopPage() {
  const navigate = useNavigate();
  const [slug, setSlug] = useState<string | null>(null);
  const [slugResolved, setSlugResolved] = useState(false);
  const [posts, setPosts] = useState<StaffPopPost[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Editor state
  const [mode, setMode] = useState<ViewMode>('list');
  const [editing, setEditing] = useState<StaffPopPost | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editSlug, setEditSlug] = useState('');
  const [editExcerpt, setEditExcerpt] = useState('');
  const [editContent, setEditContent] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const limit = 20;
  const totalPages = Math.ceil(total / limit);

  // Resolve store slug
  useEffect(() => {
    let canceled = false;
    (async () => {
      try {
        const resolved = await getStoreSlug();
        if (!canceled) {
          setSlug(resolved);
          setSlugResolved(true);
        }
      } catch {
        if (!canceled) {
          setSlug(null);
          setSlugResolved(true);
        }
      }
    })();
    return () => {
      canceled = true;
    };
  }, []);

  // Load posts
  const loadData = useCallback(async () => {
    if (!slug) return;
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetchStaffPopPosts(slug, {
        page,
        limit,
        status: statusFilter || undefined,
      });
      setPosts(res.data);
      setTotal(res.meta.total);
    } catch (e: any) {
      setError(e?.message || '목록을 불러올 수 없습니다');
    } finally {
      setIsLoading(false);
    }
  }, [slug, page, statusFilter]);

  useEffect(() => {
    if (slug) loadData();
  }, [slug, loadData]);

  const openEditor = (post: StaffPopPost) => {
    setEditing(post);
    setEditTitle(post.title);
    setEditSlug(post.slug);
    setEditExcerpt(post.excerpt ?? '');
    setEditContent(post.content ?? '');
    setMode('editor');
  };

  const handleSave = async () => {
    if (!slug || !editing) return;
    if (!editTitle.trim()) {
      toast.error('제목을 입력하세요');
      return;
    }
    if (!editContent.trim() || editContent.trim() === '<p></p>') {
      toast.error('본문을 입력하세요');
      return;
    }
    setIsSaving(true);
    try {
      await updateStaffPopPost(slug, editing.id, {
        title: editTitle.trim(),
        content: editContent,
        excerpt: editExcerpt.trim() || undefined,
        slug: editSlug.trim() || undefined,
      });
      toast.success('저장되었습니다');
      setMode('list');
      setEditing(null);
      loadData();
    } catch (e: any) {
      toast.error(e?.message || '저장에 실패했습니다');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string, title: string) => {
    if (!slug) return;
    if (!window.confirm(`"${title}" POP 사본을 삭제하시겠습니까? 되돌릴 수 없습니다.`)) return;
    try {
      await deleteStaffPopPost(slug, id);
      toast.success('POP 사본이 삭제되었습니다');
      loadData();
    } catch (e: any) {
      toast.error(e?.message || '삭제에 실패했습니다');
    }
  };

  // ── Render: editor mode ─────────────────────────────────
  if (mode === 'editor' && editing) {
    return (
      <div className="space-y-6 max-w-4xl">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                setMode('list');
                setEditing(null);
              }}
              className="p-2 rounded-lg hover:bg-slate-100 text-slate-500"
              title="목록"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div>
              <h1 className="text-xl font-bold text-slate-800">POP 사본 수정</h1>
              <p className="text-xs text-slate-500 mt-0.5">
                상태: <span className="font-medium text-slate-700">{STATUS_LABEL[editing.status]}</span>
                {' · 내 매장 POP'}
              </p>
            </div>
          </div>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
          >
            {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            저장
          </button>
        </div>

        <div className="space-y-4 bg-white rounded-xl border border-slate-100 p-6">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">제목</label>
            <input
              type="text"
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={isSaving}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">슬러그</label>
            <input
              type="text"
              value={editSlug}
              onChange={(e) => setEditSlug(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={isSaving}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              요약 <span className="text-xs text-slate-400 font-normal">(가져올 때 자동으로 "[운영자 자료 가져옴]" 표시)</span>
            </label>
            <textarea
              value={editExcerpt}
              onChange={(e) => setEditExcerpt(e.target.value)}
              rows={2}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              disabled={isSaving}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">본문</label>
            <RichTextEditor
              value={editContent}
              onChange={(c) => setEditContent(c.html)}
              placeholder="POP 본문을 작성하세요"
              minHeight="500px"
              editable={!isSaving}
            />
          </div>
        </div>
      </div>
    );
  }

  // ── Render: list mode ──────────────────────────────────
  return (
    <div className="space-y-6 max-w-5xl">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-800">내 매장 POP</h1>
          <p className="text-sm text-slate-500 mt-1">
            매장 HUB 에서 가져온 POP 사본 목록입니다. 자유롭게 수정할 수 있으며,
            PDF 출력은 기존 POP 출력 화면에서 진행합니다.
          </p>
        </div>
        <div className="flex gap-2 shrink-0">
          <button
            onClick={() => navigate('/store-hub/pop')}
            className="flex items-center gap-1.5 px-3 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
          >
            <ExternalLink className="w-4 h-4" />
            매장 HUB POP
          </button>
          <button
            onClick={() => navigate('/store/marketing/pop')}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-200"
          >
            <Printer className="w-4 h-4" />
            POP 출력
          </button>
        </div>
      </div>

      {/* No store hint */}
      {slugResolved && !slug && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-sm text-amber-800">
          매장 정보가 연결되지 않아 POP 을 사용할 수 없습니다. 매장 등록 후 다시 시도해 주세요.
        </div>
      )}

      {/* Status filter */}
      {slug && (
        <div className="flex gap-2">
          {(['', 'draft', 'published', 'archived'] as StatusFilter[]).map((s) => (
            <button
              key={s || 'all'}
              onClick={() => {
                setStatusFilter(s);
                setPage(1);
              }}
              className={`px-3 py-1.5 rounded-lg text-sm border ${
                statusFilter === s
                  ? 'bg-blue-50 border-blue-300 text-blue-700 font-medium'
                  : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              {s === '' ? '전체' : STATUS_LABEL[s as StaffPopPost['status']]}
            </button>
          ))}
        </div>
      )}

      {/* Content */}
      {!slug ? null : error ? (
        <div className="flex flex-col items-center justify-center py-16 gap-3 text-slate-500">
          <AlertCircle className="w-8 h-8 text-red-400" />
          <p className="text-sm">{error}</p>
        </div>
      ) : isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
        </div>
      ) : posts.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 gap-3">
          <p className="text-sm text-slate-400">
            {statusFilter ? '해당 상태의 POP 사본이 없습니다' : '아직 가져온 POP 사본이 없습니다'}
          </p>
          {!statusFilter && (
            <button
              onClick={() => navigate('/store-hub/pop')}
              className="text-sm text-blue-600 hover:underline"
            >
              매장 HUB POP 에서 가져오기
            </button>
          )}
        </div>
      ) : (
        <>
          <div className="space-y-3">
            {posts.map((item) => (
              <div
                key={item.id}
                className="bg-white rounded-xl border border-slate-100 p-4 flex items-center gap-4 hover:border-slate-200 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-semibold text-slate-800 truncate">{item.title}</h3>
                    <span className={`px-2 py-0.5 rounded-full text-xs ${STATUS_BADGE[item.status]}`}>
                      {STATUS_LABEL[item.status]}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 mt-1 text-xs text-slate-400">
                    <span className="truncate">/{item.slug}</span>
                    <span>·</span>
                    <span>{new Date(item.updatedAt).toLocaleDateString('ko-KR')} 수정</span>
                  </div>
                  {item.excerpt && (
                    <p className="text-xs text-slate-500 mt-1 line-clamp-1">{item.excerpt}</p>
                  )}
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => openEditor(item)}
                    className="p-2 rounded-lg hover:bg-slate-100 text-slate-500"
                    title="수정"
                  >
                    <Edit3 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(item.id, item.title)}
                    className="p-2 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-500"
                    title="삭제"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex justify-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="px-3 py-1.5 rounded-lg border border-slate-200 text-sm text-slate-600 disabled:opacity-40"
              >
                이전
              </button>
              <span className="px-3 py-1.5 text-sm text-slate-500">
                {page} / {totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="px-3 py-1.5 rounded-lg border border-slate-200 text-sm text-slate-600 disabled:opacity-40"
              >
                다음
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default PharmacyPopPage;
