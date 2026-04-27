/**
 * Signage Content Hub Page — KPA-Society
 *
 * WO-O4O-SIGNAGE-HUB-TEMPLATE-FOUNDATION-V1
 *   SignageManagerTemplate 기반으로 전환.
 *   동영상/플레이리스트 탭 구조 유지.
 *   API 연결 + 모달(등록/수정/삭제) 유지.
 */

import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { SignageManagerTemplate } from '@o4o/shared-space-ui';
import type { SignageHubVideo, SignageHubPlaylist } from '@o4o/shared-space-ui';
import { publicContentApi } from '../../lib/api/signageV2';
import { getAccessToken, useAuth } from '../../contexts/AuthContext';

const API_BASE = import.meta.env.VITE_API_BASE_URL || '';
const SERVICE_KEY = 'kpa-society';
const PAGE_LIMIT = 20;

const DEFAULT_TAG_SUGGESTIONS = [
  '복약지도', '당뇨', '혈압', '면역', '건강기능식품',
  '의약외품', '이벤트', '프로모션', '신제품', '추천상품',
];

function formatDuration(sec: number | null | undefined): string {
  if (!sec || sec <= 0) return '-';
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  return `${m}:${String(s).padStart(2, '0')}`;
}

function parseDurationInput(input: string): number {
  const parts = input.trim().split(':').map(Number);
  if (parts.some(isNaN)) return 0;
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  return 0;
}

export default function ContentHubPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const initialTab = (searchParams.get('tab') === 'playlists' ? 'playlists' : 'videos') as 'videos' | 'playlists';
  const [activeTab, setActiveTab] = useState<'videos' | 'playlists'>(initialTab);

  // Search keywords (populated by template's debounced callbacks)
  const [videoKeyword, setVideoKeyword] = useState('');

  // Data
  const [videos, setVideos] = useState<SignageHubVideo[]>([]);
  const [playlists, setPlaylists] = useState<SignageHubPlaylist[]>([]);
  const [videoTotal, setVideoTotal] = useState(0);
  const [playlistTotal, setPlaylistTotal] = useState(0);
  const [videoPage, setVideoPage] = useState(1);
  const [playlistPage, setPlaylistPage] = useState(1);
  const [videosLoading, setVideosLoading] = useState(false);
  const [playlistsLoading, setPlaylistsLoading] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  // Modals
  const [createModal, setCreateModal] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: string; name: string; type: 'video' | 'playlist' } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Create form
  const [createForm, setCreateForm] = useState({ name: '', description: '', sourceUrl: '', durationInput: '' });
  const [isCreating, setIsCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [formTags, setFormTags] = useState<string[]>([]);
  const [formTagInput, setFormTagInput] = useState('');

  // Edit form
  const [editModal, setEditModal] = useState(false);
  const [editMediaId, setEditMediaId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ name: '', description: '', sourceUrl: '', durationInput: '' });
  const [isEditing, setIsEditing] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  const [editTags, setEditTags] = useState<string[]>([]);
  const [editTagInput, setEditTagInput] = useState('');

  // ── Auth fetch helper ──
  const apiFetch = useCallback(async (path: string, options?: RequestInit) => {
    const token = getAccessToken();
    const res = await fetch(`${API_BASE}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...options?.headers,
      },
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body?.error || body?.message || `API error ${res.status}`);
    }
    return res.json();
  }, []);

  // ── Fetch videos ──
  useEffect(() => {
    if (activeTab !== 'videos') return;
    setVideosLoading(true);
    publicContentApi.listMedia(undefined, SERVICE_KEY, {
      page: videoPage,
      limit: PAGE_LIMIT,
      search: videoKeyword || undefined,
    })
      .then((res: any) => {
        if (res.success && res.data) {
          setVideos((res.data as any).items ?? []);
          setVideoTotal((res.data as any).total ?? 0);
        }
      })
      .catch(() => {})
      .finally(() => setVideosLoading(false));
  }, [activeTab, videoPage, videoKeyword, reloadKey]);

  // ── Fetch playlists ──
  useEffect(() => {
    if (activeTab !== 'playlists') return;
    setPlaylistsLoading(true);
    publicContentApi.listPlaylists(undefined, SERVICE_KEY, {
      page: playlistPage,
      limit: PAGE_LIMIT,
    })
      .then((res: any) => {
        if (res.success && res.data) {
          setPlaylists((res.data as any).items ?? []);
          setPlaylistTotal((res.data as any).total ?? 0);
        }
      })
      .catch(() => {})
      .finally(() => setPlaylistsLoading(false));
  }, [activeTab, playlistPage, reloadKey]);

  // ── Tags (create) ──
  const addTag = (value: string) => {
    const tag = value.trim().replace(/^#/, '');
    if (!tag || formTags.includes(tag)) return;
    setFormTags(prev => [...prev, tag]);
  };
  const removeTag = (tag: string) => setFormTags(prev => prev.filter(t => t !== tag));

  // ── Tags (edit) ──
  const addEditTag = (value: string) => {
    const tag = value.trim().replace(/^#/, '');
    if (!tag || editTags.includes(tag)) return;
    setEditTags(prev => [...prev, tag]);
  };
  const removeEditTag = (tag: string) => setEditTags(prev => prev.filter(t => t !== tag));

  // ── Create video ──
  const handleCreateVideo = async () => {
    if (!createForm.name.trim()) { setCreateError('제목을 입력하세요'); return; }
    if (!createForm.sourceUrl.trim()) { setCreateError('URL을 입력하세요'); return; }
    if (formTags.length === 0) { setCreateError('태그를 최소 1개 입력하세요'); return; }
    setIsCreating(true);
    setCreateError(null);
    try {
      const durationSec = parseDurationInput(createForm.durationInput);
      await apiFetch('/api/v1/kpa/signage/media', {
        method: 'POST',
        body: JSON.stringify({
          name: createForm.name.trim(),
          sourceUrl: createForm.sourceUrl.trim(),
          description: createForm.description.trim() || undefined,
          tags: formTags.length > 0 ? formTags : undefined,
          duration: durationSec > 0 ? durationSec : undefined,
        }),
      });
      setCreateModal(false);
      setReloadKey(k => k + 1);
    } catch (err: any) {
      setCreateError(err?.message || '등록에 실패했습니다');
    } finally {
      setIsCreating(false);
    }
  };

  // ── Edit video ──
  const openEditModal = (v: SignageHubVideo) => {
    setEditMediaId(v.id);
    setEditForm({
      name: v.name,
      description: v.description || '',
      sourceUrl: v.sourceUrl || v.url || '',
      durationInput: v.duration ? formatDuration(v.duration) : '',
    });
    setEditTags(v.tags ?? []);
    setEditTagInput('');
    setEditError(null);
    setEditModal(true);
  };

  const handleEditVideo = async () => {
    if (!editForm.name.trim()) { setEditError('제목을 입력하세요'); return; }
    if (!editForm.sourceUrl.trim()) { setEditError('URL을 입력하세요'); return; }
    if (editTags.length === 0) { setEditError('태그를 최소 1개 입력하세요'); return; }
    setIsEditing(true);
    setEditError(null);
    try {
      const durationSec = parseDurationInput(editForm.durationInput);
      await apiFetch(`/api/v1/kpa/signage/media/${editMediaId}`, {
        method: 'PATCH',
        body: JSON.stringify({
          name: editForm.name.trim(),
          sourceUrl: editForm.sourceUrl.trim(),
          description: editForm.description.trim() || undefined,
          tags: editTags,
          duration: durationSec > 0 ? durationSec : undefined,
        }),
      });
      setEditModal(false);
      setReloadKey(k => k + 1);
    } catch (err: any) {
      setEditError(err?.message || '수정에 실패했습니다');
    } finally {
      setIsEditing(false);
    }
  };

  // ── Delete ──
  const handleDeleteConfirmed = async () => {
    if (!deleteConfirm) return;
    setIsDeleting(true);
    try {
      const path = deleteConfirm.type === 'video'
        ? `/api/signage/${SERVICE_KEY}/community/media/${deleteConfirm.id}`
        : `/api/signage/${SERVICE_KEY}/community/playlists/${deleteConfirm.id}`;
      await apiFetch(path, { method: 'DELETE' });
      setDeleteConfirm(null);
      setReloadKey(k => k + 1);
    } catch {
      setDeleteConfirm(null);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <>
      <SignageManagerTemplate config={{
        title: '디지털 사이니지',
        description: '동영상과 플레이리스트를 관리하세요',

        // ── 동영상 탭 ──
        videos,
        videosLoading,
        videoTotal,
        videoPage,
        videoPageLimit: PAGE_LIMIT,
        onVideoPageChange: (p) => setVideoPage(p),
        onVideoSearch: (kw) => { setVideoKeyword(kw); setVideoPage(1); },
        onAddVideo: user ? () => {
          setCreateForm({ name: '', description: '', sourceUrl: '', durationInput: '' });
          setFormTags([]);
          setFormTagInput('');
          setCreateError(null);
          setCreateModal(true);
        } : undefined,
        onEditVideo: (v) => openEditModal(v),
        onDeleteVideo: (v) => setDeleteConfirm({ id: v.id, name: v.name, type: 'video' }),
        canEditVideo: (v) => !!user && v.source === 'community' && v.createdByUserId === user.id,

        // ── 플레이리스트 탭 ──
        playlists,
        playlistsLoading,
        playlistTotal,
        playlistPage,
        playlistPageLimit: PAGE_LIMIT,
        onPlaylistPageChange: (p) => setPlaylistPage(p),
        onAddPlaylist: user ? () => navigate('/signage/playlist/new') : undefined,
        onEditPlaylist: (p) => navigate(`/signage/playlist/${p.id}/edit`),
        onDeletePlaylist: (p) => setDeleteConfirm({ id: p.id, name: p.name, type: 'playlist' }),
        canEditPlaylist: (p) => !!user && p.source === 'community' && p.createdByUserId === user?.id,

        // ── 탭 제어 ──
        initialTab,
        onTabChange: (tab) => {
          setActiveTab(tab);
          setSearchParams(tab === 'playlists' ? { tab: 'playlists' } : {});
        },
      }} />

      {/* ── Create Video Modal ── */}
      {createModal && (
        <div style={overlayStyle}>
          <div style={dialogStyle}>
            <div style={dialogHeaderStyle}>
              <h3 style={dialogTitleStyle}>동영상 등록</h3>
              <button onClick={() => setCreateModal(false)} style={closeBtnStyle}>✕</button>
            </div>
            <div style={dialogBodyStyle}>
              <div>
                <label style={labelStyle}>제목 *</label>
                <input type="text" value={createForm.name} onChange={(e) => setCreateForm(f => ({ ...f, name: e.target.value }))} placeholder="예: 약사회 건강 안내 영상" style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>URL *</label>
                <input type="url" value={createForm.sourceUrl} onChange={(e) => setCreateForm(f => ({ ...f, sourceUrl: e.target.value }))} placeholder="https://www.youtube.com/watch?v=..." style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>재생시간 (선택, mm:ss)</label>
                <input type="text" value={createForm.durationInput} onChange={(e) => setCreateForm(f => ({ ...f, durationInput: e.target.value }))} placeholder="예: 10:30" style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>설명 (선택)</label>
                <textarea value={createForm.description} onChange={(e) => setCreateForm(f => ({ ...f, description: e.target.value }))} placeholder="간단한 설명을 입력하세요" rows={2} style={textareaStyle} />
              </div>
              <div>
                <label style={labelStyle}>태그 *</label>
                <div style={tagsWrapStyle}>
                  {formTags.map(tag => (
                    <span key={tag} style={tagChipStyle}>
                      #{tag}
                      <button type="button" onClick={() => removeTag(tag)} style={tagRemoveStyle}>×</button>
                    </span>
                  ))}
                </div>
                <input type="text" value={formTagInput} onChange={(e) => setFormTagInput(e.target.value)} onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); addTag(formTagInput); setFormTagInput(''); }
                }} placeholder="태그 입력 후 Enter" style={inputStyle} />
                <div style={suggestRowStyle}>
                  {DEFAULT_TAG_SUGGESTIONS.filter(t => !formTags.includes(t)).slice(0, 6).map(t => (
                    <button key={t} type="button" onClick={() => addTag(t)} style={suggestBtnStyle}>#{t}</button>
                  ))}
                </div>
              </div>
              {createError && <p style={errorTextStyle}>{createError}</p>}
            </div>
            <div style={dialogFooterStyle}>
              <button onClick={() => setCreateModal(false)} disabled={isCreating} style={cancelBtnStyle}>취소</button>
              <button onClick={handleCreateVideo} disabled={isCreating} style={submitBtnStyle}>{isCreating ? '등록 중...' : '등록'}</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Edit Video Modal ── */}
      {editModal && (
        <div style={overlayStyle}>
          <div style={dialogStyle}>
            <div style={dialogHeaderStyle}>
              <h3 style={dialogTitleStyle}>동영상 수정</h3>
              <button onClick={() => setEditModal(false)} style={closeBtnStyle}>✕</button>
            </div>
            <div style={dialogBodyStyle}>
              <div>
                <label style={labelStyle}>제목 *</label>
                <input type="text" value={editForm.name} onChange={(e) => setEditForm(f => ({ ...f, name: e.target.value }))} placeholder="예: 약사회 건강 안내 영상" style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>URL *</label>
                <input type="url" value={editForm.sourceUrl} onChange={(e) => setEditForm(f => ({ ...f, sourceUrl: e.target.value }))} placeholder="https://www.youtube.com/watch?v=..." style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>재생시간 (선택, mm:ss)</label>
                <input type="text" value={editForm.durationInput} onChange={(e) => setEditForm(f => ({ ...f, durationInput: e.target.value }))} placeholder="예: 10:30" style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>설명 (선택)</label>
                <textarea value={editForm.description} onChange={(e) => setEditForm(f => ({ ...f, description: e.target.value }))} placeholder="간단한 설명을 입력하세요" rows={2} style={textareaStyle} />
              </div>
              <div>
                <label style={labelStyle}>태그 *</label>
                <div style={tagsWrapStyle}>
                  {editTags.map(tag => (
                    <span key={tag} style={tagChipStyle}>
                      #{tag}
                      <button type="button" onClick={() => removeEditTag(tag)} style={tagRemoveStyle}>×</button>
                    </span>
                  ))}
                </div>
                <input type="text" value={editTagInput} onChange={(e) => setEditTagInput(e.target.value)} onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); addEditTag(editTagInput); setEditTagInput(''); }
                }} placeholder="태그 입력 후 Enter" style={inputStyle} />
                <div style={suggestRowStyle}>
                  {DEFAULT_TAG_SUGGESTIONS.filter(t => !editTags.includes(t)).slice(0, 6).map(t => (
                    <button key={t} type="button" onClick={() => addEditTag(t)} style={suggestBtnStyle}>#{t}</button>
                  ))}
                </div>
              </div>
              {editError && <p style={errorTextStyle}>{editError}</p>}
            </div>
            <div style={dialogFooterStyle}>
              <button onClick={() => setEditModal(false)} disabled={isEditing} style={cancelBtnStyle}>취소</button>
              <button onClick={handleEditVideo} disabled={isEditing} style={submitBtnStyle}>{isEditing ? '저장 중...' : '저장'}</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Delete Confirmation Modal ── */}
      {deleteConfirm && (
        <div style={overlayStyle}>
          <div style={{ ...dialogStyle, maxWidth: 380 }}>
            <h3 style={dialogTitleStyle}>{deleteConfirm.type === 'video' ? '동영상 삭제' : '플레이리스트 삭제'}</h3>
            <p style={{ margin: '0 0 12px', fontSize: 14, color: '#64748b' }}>삭제하면 더 이상 표시되지 않습니다.</p>
            <div style={{ backgroundColor: '#f8fafc', borderRadius: 8, padding: 12, marginBottom: 4 }}>
              <p style={{ margin: 0, fontSize: 14, fontWeight: 500, color: '#334155', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{deleteConfirm.name}</p>
            </div>
            <div style={dialogFooterStyle}>
              <button onClick={() => setDeleteConfirm(null)} disabled={isDeleting} style={cancelBtnStyle}>취소</button>
              <button onClick={handleDeleteConfirmed} disabled={isDeleting} style={deleteBtnStyle}>{isDeleting ? '삭제 중...' : '삭제'}</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// ─── Modal Styles ─────────────────────────────────────────

const overlayStyle: React.CSSProperties = {
  position: 'fixed', inset: 0, zIndex: 50,
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  backgroundColor: 'rgba(0,0,0,0.4)',
};
const dialogStyle: React.CSSProperties = {
  backgroundColor: '#fff', borderRadius: 12,
  boxShadow: '0 20px 60px rgba(0,0,0,0.15)',
  padding: 24, width: '100%', maxWidth: 420, margin: '0 16px',
};
const dialogHeaderStyle: React.CSSProperties = { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 };
const dialogTitleStyle: React.CSSProperties = { margin: 0, fontSize: 18, fontWeight: 600, color: '#1e293b' };
const closeBtnStyle: React.CSSProperties = { background: 'none', border: 'none', fontSize: 18, color: '#94a3b8', cursor: 'pointer', padding: 4 };
const dialogBodyStyle: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: 12 };
const dialogFooterStyle: React.CSSProperties = { display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 16 };
const labelStyle: React.CSSProperties = { display: 'block', fontSize: 12, fontWeight: 500, color: '#64748b', marginBottom: 4 };
const inputStyle: React.CSSProperties = { width: '100%', padding: '8px 12px', fontSize: 14, border: '1px solid #e2e8f0', borderRadius: 8, outline: 'none', boxSizing: 'border-box' };
const textareaStyle: React.CSSProperties = { width: '100%', padding: '8px 12px', fontSize: 14, border: '1px solid #e2e8f0', borderRadius: 8, outline: 'none', resize: 'none', boxSizing: 'border-box' };
const tagsWrapStyle: React.CSSProperties = { display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 8, minHeight: 28 };
const tagChipStyle: React.CSSProperties = { display: 'inline-flex', alignItems: 'center', gap: 4, padding: '2px 8px', backgroundColor: '#dbeafe', color: '#1d4ed8', fontSize: 12, borderRadius: 12 };
const tagRemoveStyle: React.CSSProperties = { background: 'none', border: 'none', color: '#1d4ed8', cursor: 'pointer', fontSize: 14, fontWeight: 700, padding: 0 };
const suggestRowStyle: React.CSSProperties = { display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 8 };
const suggestBtnStyle: React.CSSProperties = { padding: '2px 8px', fontSize: 12, backgroundColor: '#f1f5f9', color: '#475569', borderRadius: 12, border: 'none', cursor: 'pointer' };
const errorTextStyle: React.CSSProperties = { margin: 0, fontSize: 12, color: '#dc2626' };
const cancelBtnStyle: React.CSSProperties = { padding: '8px 16px', fontSize: 14, border: '1px solid #e2e8f0', borderRadius: 8, backgroundColor: '#fff', color: '#475569', cursor: 'pointer' };
const submitBtnStyle: React.CSSProperties = { padding: '8px 16px', fontSize: 14, fontWeight: 500, border: 'none', borderRadius: 8, backgroundColor: '#2563eb', color: '#fff', cursor: 'pointer' };
const deleteBtnStyle: React.CSSProperties = { padding: '8px 16px', fontSize: 14, fontWeight: 500, border: 'none', borderRadius: 8, backgroundColor: '#dc2626', color: '#fff', cursor: 'pointer' };
