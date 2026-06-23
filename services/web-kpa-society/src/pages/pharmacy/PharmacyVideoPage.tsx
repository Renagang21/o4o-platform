/**
 * PharmacyVideoPage — Staff 동영상 사본 관리 (내 매장 동영상, QR 전용)
 *
 * WO-O4O-KPA-QR-CODE-VIDEO-CONTENT-V1 (2026-06-23)
 *
 * 경로: /store/content/video  (인증 + PharmacyGuard)
 *
 * 매장 경영자가 운영자 HUB 동영상에서 가져온 매장 사본 (author_role='store') 을
 * 확인·수정·삭제하고, QR-code 생성 대상으로 사용한다.
 *
 * 본 페이지 범위:
 *   - 사본 목록 (status 필터)
 *   - 사본 인라인 수정 (title / slug / videoUrl / description)
 *   - 사본 삭제 / 일괄 삭제
 *   - 해당 동영상으로 QR 생성 진입 (/store/marketing/qr 로 prefill 전달)
 *
 * 본 페이지 범위 외 (WO 고정 — 2차): 매장 직접 동영상 등록.
 *
 * 패턴: PharmacyPopPage mirror (RichTextEditor 본문 → videoUrl 입력 + embed 미리보기).
 */

import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertCircle, Edit3, Trash2, ArrowLeft, Save, ExternalLink, QrCode, Loader2 } from 'lucide-react';
import { toast } from '@o4o/error-handling';
import { DataTable, type Column, ActionBar, BulkResultModal } from '@o4o/ui';
import { useBatchAction } from '@o4o/operator-ux-core';
import {
  fetchStaffVideoPosts,
  updateStaffVideoPost,
  deleteStaffVideoPost,
  type StaffVideoPost,
} from '../../api/videoStaff';
import { getStoreSlug } from '../../api/pharmacyInfo';
import { toVideoEmbed } from '../../utils/videoEmbed';

type ViewMode = 'list' | 'editor';
type StatusFilter = '' | 'draft' | 'published' | 'archived';

const STATUS_LABEL: Record<StaffVideoPost['status'], string> = {
  draft: '초안',
  published: '발행',
  archived: '보관',
};

const STATUS_BADGE: Record<StaffVideoPost['status'], string> = {
  draft: 'bg-slate-100 text-slate-600',
  published: 'bg-emerald-50 text-emerald-700',
  archived: 'bg-amber-50 text-amber-700',
};

export function PharmacyVideoPage() {
  const navigate = useNavigate();
  const [slug, setSlug] = useState<string | null>(null);
  const [slugResolved, setSlugResolved] = useState(false);
  const [posts, setPosts] = useState<StaffVideoPost[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [selectedKeys, setSelectedKeys] = useState<string[]>([]);
  const batch = useBatchAction();

  // Editor state
  const [mode, setMode] = useState<ViewMode>('list');
  const [editing, setEditing] = useState<StaffVideoPost | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editSlug, setEditSlug] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editVideoUrl, setEditVideoUrl] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const limit = 20;
  const totalPages = Math.ceil(total / limit);

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

  const loadData = useCallback(async () => {
    if (!slug) return;
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetchStaffVideoPosts(slug, {
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

  const openEditor = (post: StaffVideoPost) => {
    setEditing(post);
    setEditTitle(post.title);
    setEditSlug(post.slug);
    setEditDescription(post.description ?? '');
    setEditVideoUrl(post.videoUrl ?? '');
    setMode('editor');
  };

  const handleSave = async () => {
    if (!slug || !editing) return;
    if (!editTitle.trim()) {
      toast.error('제목을 입력하세요');
      return;
    }
    if (!editVideoUrl.trim()) {
      toast.error('동영상 URL 을 입력하세요');
      return;
    }
    setIsSaving(true);
    try {
      await updateStaffVideoPost(slug, editing.id, {
        title: editTitle.trim(),
        videoUrl: editVideoUrl.trim(),
        description: editDescription.trim() || undefined,
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
    if (!window.confirm(`"${title}" 동영상 사본을 삭제하시겠습니까? 되돌릴 수 없습니다.`)) return;
    try {
      await deleteStaffVideoPost(slug, id);
      toast.success('동영상 사본이 삭제되었습니다');
      loadData();
    } catch (e: any) {
      toast.error(e?.message || '삭제에 실패했습니다');
    }
  };

  const goCreateQr = (post: StaffVideoPost) => {
    // QR 생성 화면으로 동영상 대상 prefill 전달 (landingType='video', landingTargetId=사본 id)
    navigate('/store/marketing/qr', {
      state: { prefillVideo: { id: post.id, title: post.title } },
    });
  };

  const batchVideoDelete = async (
    ids: string[],
  ): Promise<{ data: { results: Array<{ id: string; status: 'success' | 'failed'; error?: string }> } }> => {
    if (!slug) {
      return { data: { results: ids.map((id) => ({ id, status: 'failed' as const, error: 'no slug' })) } };
    }
    const settled = await Promise.allSettled(ids.map((id) => deleteStaffVideoPost(slug, id)));
    const results = settled.map((r, i) => {
      const id = ids[i];
      if (r.status === 'fulfilled') return { id, status: 'success' as const };
      const err = r.reason as { message?: string } | null;
      return { id, status: 'failed' as const, error: err?.message || 'Network error' };
    });
    return { data: { results } };
  };

  const handleBulkDelete = async () => {
    if (selectedKeys.length === 0) return;
    if (!window.confirm(`선택한 ${selectedKeys.length}개 동영상 사본을 삭제하시겠습니까? 되돌릴 수 없습니다.`)) return;
    const result = await batch.executeBatch(batchVideoDelete, selectedKeys);
    if (result.successCount > 0) {
      setSelectedKeys([]);
      loadData();
    }
  };

  // ── Render: editor mode ─────────────────────────────────
  if (mode === 'editor' && editing) {
    const embed = editVideoUrl.trim() ? toVideoEmbed(editVideoUrl) : null;
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
              <h1 className="text-xl font-bold text-slate-800">동영상 사본 수정</h1>
              <p className="text-xs text-slate-500 mt-0.5">
                상태: <span className="font-medium text-slate-700">{STATUS_LABEL[editing.status]}</span>
                {' · 내 매장 동영상'}
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
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              동영상 URL <span className="text-xs text-slate-400 font-normal">(YouTube / Vimeo 등 외부 URL)</span>
            </label>
            <input
              type="url"
              value={editVideoUrl}
              onChange={(e) => setEditVideoUrl(e.target.value)}
              placeholder="https://www.youtube.com/watch?v=..."
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={isSaving}
            />
          </div>

          {embed && embed.embedUrl && embed.provider !== 'unknown' && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">미리보기</label>
              <div className="relative w-full overflow-hidden rounded-lg bg-black" style={{ aspectRatio: '16 / 9' }}>
                <iframe
                  src={embed.embedUrl}
                  title="동영상 미리보기"
                  className="absolute inset-0 w-full h-full"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              </div>
            </div>
          )}

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
            <label className="block text-sm font-medium text-slate-700 mb-1.5">설명</label>
            <textarea
              value={editDescription}
              onChange={(e) => setEditDescription(e.target.value)}
              rows={2}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              disabled={isSaving}
            />
          </div>
        </div>
      </div>
    );
  }

  // ── Render: list mode ──────────────────────────────────
  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-800">내 매장 동영상</h1>
          <p className="text-sm text-slate-500 mt-1">
            매장 HUB 에서 가져온 동영상 사본 목록입니다. 수정할 수 있으며, QR-code 로 연결하면
            QR 스캔 시 동영상 전용 화면이 열립니다.
          </p>
        </div>
        <div className="flex gap-2 shrink-0">
          <button
            onClick={() => navigate('/store-hub/video')}
            className="flex items-center gap-1.5 px-3 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
          >
            <ExternalLink className="w-4 h-4" />
            매장 HUB 동영상
          </button>
          <button
            onClick={() => navigate('/store/marketing/qr')}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-200"
          >
            <QrCode className="w-4 h-4" />
            QR 관리
          </button>
        </div>
      </div>

      {slugResolved && !slug && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-sm text-amber-800">
          매장 정보가 연결되지 않아 동영상을 사용할 수 없습니다. 매장 등록 후 다시 시도해 주세요.
        </div>
      )}

      {slug && (
        <div className="flex gap-2">
          {(['', 'draft', 'published', 'archived'] as StatusFilter[]).map((s) => (
            <button
              key={s || 'all'}
              onClick={() => {
                setStatusFilter(s);
                setPage(1);
                setSelectedKeys([]);
              }}
              className={`px-3 py-1 text-xs font-medium rounded-full transition-colors ${
                statusFilter === s
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
              }`}
            >
              {s === '' ? '전체' : STATUS_LABEL[s as StaffVideoPost['status']]}
            </button>
          ))}
        </div>
      )}

      {!slug ? null : error ? (
        <div className="flex flex-col items-center justify-center py-16 gap-3 text-slate-500">
          <AlertCircle className="w-8 h-8 text-red-400" />
          <p className="text-sm">{error}</p>
        </div>
      ) : (
        <>
          <div>
            <ActionBar
              selectedCount={selectedKeys.length}
              onClearSelection={() => setSelectedKeys([])}
              actions={[
                {
                  key: 'bulk-delete',
                  label: `일괄 삭제 (${selectedKeys.length})`,
                  onClick: handleBulkDelete,
                  variant: 'danger' as const,
                  icon: <Trash2 className="w-3.5 h-3.5" />,
                  loading: batch.loading,
                  group: 'actions',
                  visible: selectedKeys.length > 0,
                  tooltip: '선택한 동영상 사본을 일괄 삭제 (되돌릴 수 없음)',
                },
              ]}
            />
          </div>

          <BulkResultModal
            open={batch.showResult}
            onClose={() => batch.clearResult()}
            result={batch.result}
            onRetry={() => batch.retryFailed()}
          />

          <DataTable<StaffVideoPost>
            rowSelection={{
              selectedRowKeys: selectedKeys,
              onChange: setSelectedKeys,
            }}
            columns={[
              {
                key: 'title',
                title: '제목',
                render: (_v, item) => (
                  <span className="font-medium text-slate-800 text-sm truncate">{item.title}</span>
                ),
              },
              {
                key: 'videoUrl',
                title: '동영상 URL',
                render: (_v, item) => (
                  <span className="text-xs text-slate-500 font-mono truncate">{item.videoUrl}</span>
                ),
              },
              {
                key: 'status',
                title: '상태',
                align: 'center',
                render: (_v, item) => (
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs ${STATUS_BADGE[item.status]}`}>
                    {STATUS_LABEL[item.status]}
                  </span>
                ),
              },
              {
                key: 'updatedAt',
                title: '수정일',
                render: (_v, item) => (
                  <span className="text-xs text-slate-500">
                    {new Date(item.updatedAt).toLocaleDateString('ko-KR')}
                  </span>
                ),
              },
              {
                key: 'actions',
                title: '액션',
                align: 'right',
                render: (_v, item) => (
                  <div className="flex items-center justify-end gap-1">
                    <button
                      onClick={(e) => { e.stopPropagation(); goCreateQr(item); }}
                      className="p-1.5 rounded hover:bg-blue-50 text-slate-400 hover:text-blue-600"
                      title="QR 생성"
                    >
                      <QrCode className="w-4 h-4" />
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); openEditor(item); }}
                      className="p-1.5 rounded hover:bg-slate-100 text-slate-500"
                      title="수정"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDelete(item.id, item.title); }}
                      className="p-1.5 rounded hover:bg-red-50 text-slate-400 hover:text-red-500"
                      title="삭제"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ),
              },
            ] as Column<StaffVideoPost>[]}
            dataSource={posts}
            rowKey="id"
            loading={isLoading}
            emptyText={
              statusFilter ? '해당 상태의 동영상 사본이 없습니다' : '아직 가져온 동영상 사본이 없습니다'
            }
          />

          {!isLoading && posts.length === 0 && !statusFilter && (
            <div className="text-center mt-3">
              <button
                onClick={() => navigate('/store-hub/video')}
                className="text-sm text-blue-600 hover:underline"
              >
                매장 HUB 동영상에서 가져오기
              </button>
            </div>
          )}

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

export default PharmacyVideoPage;
