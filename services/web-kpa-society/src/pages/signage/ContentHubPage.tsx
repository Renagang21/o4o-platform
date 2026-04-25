/**
 * Signage Content Hub Page — KPA-Society
 *
 * WO-KPA-SIGNAGE-VIDEO-PLAYLIST-STRUCTURE-REFORM-V2
 *   "콘텐츠 기반" → "동영상 / 플레이리스트 기반" 탭 구조 재구성.
 *   SignageHubTemplate 제거, 탭 UI 직접 구현.
 */

import { useState, useEffect, useCallback } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { publicContentApi } from '../../lib/api/signageV2';
import { getAccessToken, useAuth } from '../../contexts/AuthContext';

const API_BASE = import.meta.env.VITE_API_BASE_URL || '';
const SERVICE_KEY = 'kpa-society';
const PAGE_LIMIT = 20;

const DEFAULT_TAG_SUGGESTIONS = [
  '복약지도', '당뇨', '혈압', '면역', '건강기능식품',
  '의약외품', '이벤트', '프로모션', '신제품', '추천상품',
];

// ─── Helpers ──────────────────────────────────────────────

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

// ─── Types ───────────────────────────────────────────────

interface MediaItem {
  id: string;
  name: string;
  description?: string;
  mediaType: string;
  sourceType?: string;
  sourceUrl?: string;
  url?: string;
  duration?: number;
  tags?: string[];
  source: string;
  createdByUserId?: string;
  createdAt: string;
  creatorName?: string;
}

interface PlaylistItem {
  id: string;
  name: string;
  description?: string;
  itemCount: number;
  totalDuration: number;
  source: string;
  createdByUserId?: string;
  createdAt: string;
  updatedAt: string;
  tags?: string[];
  metadata?: { tags?: string[] };
}

type TabType = 'videos' | 'playlists';

// ─── Main Component ──────────────────────────────────────

export default function ContentHubPage() {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();

  // Tab
  const initialTab = (searchParams.get('tab') === 'playlists' ? 'playlists' : 'videos') as TabType;
  const [activeTab, setActiveTab] = useState<TabType>(initialTab);

  // Search
  const [keyword, setKeyword] = useState('');
  const [debouncedKeyword, setDebouncedKeyword] = useState('');

  // Data
  const [videos, setVideos] = useState<MediaItem[]>([]);
  const [playlists, setPlaylists] = useState<PlaylistItem[]>([]);
  const [videoTotal, setVideoTotal] = useState(0);
  const [playlistTotal, setPlaylistTotal] = useState(0);
  const [videoPage, setVideoPage] = useState(1);
  const [playlistPage, setPlaylistPage] = useState(1);
  const [loading, setLoading] = useState(false);

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

  // Reload trigger
  const [reloadKey, setReloadKey] = useState(0);

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

  // ── Debounce search ──
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedKeyword(keyword), 350);
    return () => clearTimeout(timer);
  }, [keyword]);

  // ── Tab change → sync URL ──
  const handleTabChange = (tab: TabType) => {
    setActiveTab(tab);
    setSearchParams(tab === 'playlists' ? { tab: 'playlists' } : {});
  };

  // ── Fetch videos ──
  useEffect(() => {
    if (activeTab !== 'videos') return;
    setLoading(true);
    publicContentApi.listMedia(undefined, SERVICE_KEY, {
      page: videoPage,
      limit: PAGE_LIMIT,
      search: debouncedKeyword || undefined,
    })
      .then((res: any) => {
        if (res.success && res.data) {
          setVideos((res.data as any).items ?? []);
          setVideoTotal((res.data as any).total ?? 0);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [activeTab, videoPage, debouncedKeyword, reloadKey]);

  // ── Fetch playlists ──
  useEffect(() => {
    if (activeTab !== 'playlists') return;
    setLoading(true);
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
      .finally(() => setLoading(false));
  }, [activeTab, playlistPage, debouncedKeyword, reloadKey]);

  // ── Tags ──
  const addTag = (value: string) => {
    const tag = value.trim().replace(/^#/, '');
    if (!tag || formTags.includes(tag)) return;
    setFormTags(prev => [...prev, tag]);
  };
  const removeTag = (tag: string) => setFormTags(prev => prev.filter(t => t !== tag));

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
      await apiFetch(`/api/v1/kpa/signage/media`, {
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
  const openEditModal = (v: MediaItem) => {
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

  // ── Pagination ──
  const currentPage = activeTab === 'videos' ? videoPage : playlistPage;
  const total = activeTab === 'videos' ? videoTotal : playlistTotal;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_LIMIT));
  const setPage = activeTab === 'videos' ? setVideoPage : setPlaylistPage;

  return (
    <div style={styles.page}>
      <div style={styles.container}>
        {/* Header */}
        <div style={styles.header}>
          <div>
            <h1 style={styles.title}>디지털 사이니지</h1>
            <p style={styles.desc}>동영상과 플레이리스트를 관리하세요</p>
          </div>
          {user && (
            <div>
              {activeTab === 'videos' ? (
                <button onClick={() => {
                  setCreateForm({ name: '', description: '', sourceUrl: '', durationInput: '' });
                  setFormTags([]);
                  setFormTagInput('');
                  setCreateError(null);
                  setCreateModal(true);
                }} style={styles.primaryBtn}>+ 동영상 등록</button>
              ) : (
                <Link to="/signage/playlist/new" style={{ ...styles.primaryBtn, textDecoration: 'none' }}>+ 플레이리스트 등록</Link>
              )}
            </div>
          )}
        </div>

        {/* Tabs */}
        <div style={styles.tabBar}>
          <button
            onClick={() => handleTabChange('videos')}
            style={activeTab === 'videos' ? styles.tabActive : styles.tab}
          >동영상</button>
          <button
            onClick={() => handleTabChange('playlists')}
            style={activeTab === 'playlists' ? styles.tabActive : styles.tab}
          >플레이리스트</button>
        </div>

        {/* Search */}
        <div style={styles.searchBar}>
          <input
            type="text"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            placeholder="제목으로 검색..."
            style={styles.searchInput}
          />
        </div>

        {/* Content */}
        {loading ? (
          <div style={styles.emptyBox}><p style={styles.emptyText}>불러오는 중...</p></div>
        ) : activeTab === 'videos' ? (
          videos.length === 0 ? (
            <div style={styles.emptyBox}><p style={styles.emptyText}>등록된 동영상이 없습니다</p></div>
          ) : (
            <div style={styles.tableWrap}>
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th style={styles.th}>제목</th>
                    <th style={{ ...styles.th, width: 200 }}>URL</th>
                    <th style={{ ...styles.th, width: 80 }}>재생시간</th>
                    <th style={{ ...styles.th, width: 140 }}>태그</th>
                    <th style={{ ...styles.th, width: 90 }}>등록일</th>
                    <th style={{ ...styles.th, width: 100 }}>액션</th>
                  </tr>
                </thead>
                <tbody>
                  {videos.map(v => (
                    <tr key={v.id} style={styles.tr}>
                      <td style={styles.td}>
                        <span style={styles.cellTitle}>{v.name}</span>
                        {v.description && <span style={styles.cellDesc}>{v.description}</span>}
                      </td>
                      <td style={styles.td}>
                        <span style={styles.urlText}>{v.sourceUrl || v.url || '-'}</span>
                      </td>
                      <td style={{ ...styles.td, textAlign: 'center' }}>{formatDuration(v.duration)}</td>
                      <td style={styles.td}>
                        <div style={styles.tagRow}>
                          {(v.tags ?? []).slice(0, 2).map(t => (
                            <span key={t} style={styles.tagBadge}>#{t}</span>
                          ))}
                          {(v.tags ?? []).length > 2 && (
                            <span style={styles.tagBadge}>+{(v.tags ?? []).length - 2}</span>
                          )}
                        </div>
                      </td>
                      <td style={{ ...styles.td, fontSize: 13, color: '#64748b' }}>
                        {v.createdAt ? new Date(v.createdAt).toLocaleDateString('ko-KR') : '-'}
                      </td>
                      <td style={styles.td}>
                        <div style={styles.actionRow}>
                          {(v.sourceUrl || v.url) && (
                            <button onClick={() => window.open(v.sourceUrl || v.url, '_blank')} style={styles.actionBtn} title="새창 재생">▶</button>
                          )}
                          {user && v.source === 'community' && v.createdByUserId === user.id && (
                            <>
                              <button onClick={() => openEditModal(v)} style={styles.actionBtn} title="수정">✎</button>
                              <button onClick={() => setDeleteConfirm({ id: v.id, name: v.name, type: 'video' })} style={styles.deleteActionBtn} title="삭제">✕</button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        ) : (
          playlists.length === 0 ? (
            <div style={styles.emptyBox}><p style={styles.emptyText}>등록된 플레이리스트가 없습니다</p></div>
          ) : (
            <div style={styles.tableWrap}>
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th style={styles.th}>제목</th>
                    <th style={{ ...styles.th, width: 80 }}>영상 수</th>
                    <th style={{ ...styles.th, width: 100 }}>총 재생시간</th>
                    <th style={{ ...styles.th, width: 140 }}>태그</th>
                    <th style={{ ...styles.th, width: 90 }}>수정일</th>
                    <th style={{ ...styles.th, width: 100 }}>액션</th>
                  </tr>
                </thead>
                <tbody>
                  {playlists.map(p => {
                    const tags = p.tags ?? [];
                    return (
                      <tr key={p.id} style={styles.tr}>
                        <td style={styles.td}>
                          <span style={styles.cellTitle}>{p.name}</span>
                          {p.description && <span style={styles.cellDesc}>{p.description}</span>}
                        </td>
                        <td style={{ ...styles.td, textAlign: 'center' }}>{p.itemCount}</td>
                        <td style={{ ...styles.td, textAlign: 'center' }}>{formatDuration(p.totalDuration)}</td>
                        <td style={styles.td}>
                          <div style={styles.tagRow}>
                            {tags.slice(0, 2).map((t: string) => (
                              <span key={t} style={styles.tagBadge}>#{t}</span>
                            ))}
                            {tags.length > 2 && (
                              <span style={styles.tagBadge}>+{tags.length - 2}</span>
                            )}
                          </div>
                        </td>
                        <td style={{ ...styles.td, fontSize: 13, color: '#64748b' }}>
                          {p.updatedAt ? new Date(p.updatedAt).toLocaleDateString('ko-KR') : '-'}
                        </td>
                        <td style={styles.td}>
                          <div style={styles.actionRow}>
                            {user && p.source === 'community' && p.createdByUserId === user.id && (
                              <>
                                <Link to={`/signage/playlist/${p.id}/edit`} style={styles.actionBtn} title="수정">✎</Link>
                                <button onClick={() => setDeleteConfirm({ id: p.id, name: p.name, type: 'playlist' })} style={styles.deleteActionBtn} title="삭제">✕</button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )
        )}

        {/* Pagination */}
        {total > PAGE_LIMIT && (
          <div style={styles.pagination}>
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={currentPage <= 1} style={styles.pageBtn}>이전</button>
            <span style={styles.pageInfo}>{currentPage} / {totalPages}</span>
            <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={currentPage >= totalPages} style={styles.pageBtn}>다음</button>
          </div>
        )}
      </div>

      {/* ── Create Video Modal ── */}
      {createModal && (
        <div style={modalStyles.overlay}>
          <div style={modalStyles.dialog}>
            <div style={modalStyles.dialogHeader}>
              <h3 style={modalStyles.dialogTitle}>동영상 등록</h3>
              <button onClick={() => setCreateModal(false)} style={modalStyles.closeBtn}>✕</button>
            </div>
            <div style={modalStyles.dialogBody}>
              <div>
                <label style={modalStyles.label}>제목 *</label>
                <input type="text" value={createForm.name} onChange={(e) => setCreateForm(f => ({ ...f, name: e.target.value }))} placeholder="예: 약사회 건강 안내 영상" style={modalStyles.input} />
              </div>
              <div>
                <label style={modalStyles.label}>URL *</label>
                <input type="url" value={createForm.sourceUrl} onChange={(e) => setCreateForm(f => ({ ...f, sourceUrl: e.target.value }))} placeholder="https://www.youtube.com/watch?v=..." style={modalStyles.input} />
              </div>
              <div>
                <label style={modalStyles.label}>재생시간 (선택, mm:ss)</label>
                <input type="text" value={createForm.durationInput} onChange={(e) => setCreateForm(f => ({ ...f, durationInput: e.target.value }))} placeholder="예: 10:30" style={modalStyles.input} />
              </div>
              <div>
                <label style={modalStyles.label}>설명 (선택)</label>
                <textarea value={createForm.description} onChange={(e) => setCreateForm(f => ({ ...f, description: e.target.value }))} placeholder="간단한 설명을 입력하세요" rows={2} style={modalStyles.textarea} />
              </div>
              <div>
                <label style={modalStyles.label}>태그 *</label>
                <div style={modalStyles.tagsWrap}>
                  {formTags.map(tag => (
                    <span key={tag} style={modalStyles.tagChip}>
                      #{tag}
                      <button type="button" onClick={() => removeTag(tag)} style={modalStyles.tagRemove}>×</button>
                    </span>
                  ))}
                </div>
                <input type="text" value={formTagInput} onChange={(e) => setFormTagInput(e.target.value)} onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); addTag(formTagInput); setFormTagInput(''); }
                }} placeholder="태그 입력 후 Enter" style={modalStyles.input} />
                <div style={modalStyles.suggestRow}>
                  {DEFAULT_TAG_SUGGESTIONS.filter(t => !formTags.includes(t)).slice(0, 6).map(t => (
                    <button key={t} type="button" onClick={() => addTag(t)} style={modalStyles.suggestBtn}>#{t}</button>
                  ))}
                </div>
              </div>
              {createError && <p style={modalStyles.errorText}>{createError}</p>}
            </div>
            <div style={modalStyles.dialogFooter}>
              <button onClick={() => setCreateModal(false)} disabled={isCreating} style={modalStyles.cancelBtn}>취소</button>
              <button onClick={handleCreateVideo} disabled={isCreating} style={modalStyles.submitBtn}>{isCreating ? '등록 중...' : '등록'}</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Edit Video Modal ── */}
      {editModal && (
        <div style={modalStyles.overlay}>
          <div style={modalStyles.dialog}>
            <div style={modalStyles.dialogHeader}>
              <h3 style={modalStyles.dialogTitle}>동영상 수정</h3>
              <button onClick={() => setEditModal(false)} style={modalStyles.closeBtn}>✕</button>
            </div>
            <div style={modalStyles.dialogBody}>
              <div>
                <label style={modalStyles.label}>제목 *</label>
                <input type="text" value={editForm.name} onChange={(e) => setEditForm(f => ({ ...f, name: e.target.value }))} placeholder="예: 약사회 건강 안내 영상" style={modalStyles.input} />
              </div>
              <div>
                <label style={modalStyles.label}>URL *</label>
                <input type="url" value={editForm.sourceUrl} onChange={(e) => setEditForm(f => ({ ...f, sourceUrl: e.target.value }))} placeholder="https://www.youtube.com/watch?v=..." style={modalStyles.input} />
              </div>
              <div>
                <label style={modalStyles.label}>재생시간 (선택, mm:ss)</label>
                <input type="text" value={editForm.durationInput} onChange={(e) => setEditForm(f => ({ ...f, durationInput: e.target.value }))} placeholder="예: 10:30" style={modalStyles.input} />
              </div>
              <div>
                <label style={modalStyles.label}>설명 (선택)</label>
                <textarea value={editForm.description} onChange={(e) => setEditForm(f => ({ ...f, description: e.target.value }))} placeholder="간단한 설명을 입력하세요" rows={2} style={modalStyles.textarea} />
              </div>
              <div>
                <label style={modalStyles.label}>태그 *</label>
                <div style={modalStyles.tagsWrap}>
                  {editTags.map(tag => (
                    <span key={tag} style={modalStyles.tagChip}>
                      #{tag}
                      <button type="button" onClick={() => removeEditTag(tag)} style={modalStyles.tagRemove}>×</button>
                    </span>
                  ))}
                </div>
                <input type="text" value={editTagInput} onChange={(e) => setEditTagInput(e.target.value)} onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); addEditTag(editTagInput); setEditTagInput(''); }
                }} placeholder="태그 입력 후 Enter" style={modalStyles.input} />
                <div style={modalStyles.suggestRow}>
                  {DEFAULT_TAG_SUGGESTIONS.filter(t => !editTags.includes(t)).slice(0, 6).map(t => (
                    <button key={t} type="button" onClick={() => addEditTag(t)} style={modalStyles.suggestBtn}>#{t}</button>
                  ))}
                </div>
              </div>
              {editError && <p style={modalStyles.errorText}>{editError}</p>}
            </div>
            <div style={modalStyles.dialogFooter}>
              <button onClick={() => setEditModal(false)} disabled={isEditing} style={modalStyles.cancelBtn}>취소</button>
              <button onClick={handleEditVideo} disabled={isEditing} style={modalStyles.submitBtn}>{isEditing ? '저장 중...' : '저장'}</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Delete Confirmation Modal ── */}
      {deleteConfirm && (
        <div style={modalStyles.overlay}>
          <div style={{ ...modalStyles.dialog, maxWidth: '380px' }}>
            <h3 style={modalStyles.dialogTitle}>{deleteConfirm.type === 'video' ? '동영상 삭제' : '플레이리스트 삭제'}</h3>
            <p style={modalStyles.deleteDesc}>삭제하면 더 이상 표시되지 않습니다.</p>
            <div style={modalStyles.deleteNameBox}>
              <p style={modalStyles.deleteName}>{deleteConfirm.name}</p>
            </div>
            <div style={modalStyles.dialogFooter}>
              <button onClick={() => setDeleteConfirm(null)} disabled={isDeleting} style={modalStyles.cancelBtn}>취소</button>
              <button onClick={handleDeleteConfirmed} disabled={isDeleting} style={modalStyles.deleteBtn}>{isDeleting ? '삭제 중...' : '삭제'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Page Styles ──────────────────────────────────────────

const styles: Record<string, React.CSSProperties> = {
  page: { minHeight: '100vh', backgroundColor: '#f8fafc' },
  container: { maxWidth: 960, margin: '0 auto', padding: '24px 16px 48px' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 },
  title: { margin: 0, fontSize: 24, fontWeight: 700, color: '#1e293b' },
  desc: { margin: '4px 0 0', fontSize: 14, color: '#64748b' },
  primaryBtn: {
    display: 'inline-flex', alignItems: 'center', gap: 6,
    padding: '8px 14px', fontSize: 14, fontWeight: 500,
    backgroundColor: '#2563eb', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer',
  },
  tabBar: { display: 'flex', gap: 0, borderBottom: '2px solid #e2e8f0', marginBottom: 16 },
  tab: {
    padding: '10px 20px', fontSize: 14, fontWeight: 500, color: '#64748b',
    backgroundColor: 'transparent', border: 'none', borderBottom: '2px solid transparent',
    marginBottom: -2, cursor: 'pointer',
  },
  tabActive: {
    padding: '10px 20px', fontSize: 14, fontWeight: 600, color: '#2563eb',
    backgroundColor: 'transparent', border: 'none', borderBottom: '2px solid #2563eb',
    marginBottom: -2, cursor: 'pointer',
  },
  searchBar: { marginBottom: 16 },
  searchInput: {
    width: '100%', padding: '8px 12px', fontSize: 14,
    border: '1px solid #e2e8f0', borderRadius: 8, outline: 'none', boxSizing: 'border-box' as const,
  },
  emptyBox: {
    display: 'flex', justifyContent: 'center', alignItems: 'center',
    minHeight: 200, backgroundColor: '#fff', borderRadius: 12, border: '1px solid #e2e8f0',
  },
  emptyText: { fontSize: 14, color: '#94a3b8' },
  tableWrap: { overflowX: 'auto' as const, backgroundColor: '#fff', borderRadius: 12, border: '1px solid #e2e8f0' },
  table: { width: '100%', borderCollapse: 'collapse' as const, fontSize: 14 },
  th: { textAlign: 'left' as const, padding: '10px 12px', fontSize: 12, fontWeight: 600, color: '#64748b', borderBottom: '1px solid #e2e8f0', backgroundColor: '#f8fafc' },
  tr: { borderBottom: '1px solid #f1f5f9' },
  td: { padding: '10px 12px', verticalAlign: 'middle' as const },
  cellTitle: { display: 'block', fontWeight: 500, color: '#1e293b', marginBottom: 2 },
  cellDesc: { display: 'block', fontSize: 12, color: '#94a3b8', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const, maxWidth: 300 },
  urlText: { fontSize: 12, color: '#64748b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const, display: 'block', maxWidth: 180 },
  tagRow: { display: 'flex', flexWrap: 'wrap' as const, gap: 4 },
  tagBadge: { fontSize: 11, padding: '1px 6px', backgroundColor: '#f1f5f9', color: '#475569', borderRadius: 10 },
  actionRow: { display: 'flex', gap: 4 },
  actionBtn: {
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
    width: 28, height: 28, fontSize: 14, color: '#2563eb',
    backgroundColor: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 6, cursor: 'pointer', textDecoration: 'none',
  },
  deleteActionBtn: {
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
    width: 28, height: 28, fontSize: 14, color: '#dc2626',
    backgroundColor: '#fef2f2', border: '1px solid #fecaca', borderRadius: 6, cursor: 'pointer',
  },
  pagination: { display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 12, marginTop: 16 },
  pageBtn: {
    padding: '6px 14px', fontSize: 13, color: '#475569',
    backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: 6, cursor: 'pointer',
  },
  pageInfo: { fontSize: 13, color: '#64748b' },
};

// ─── Modal Styles ─────────────────────────────────────────

const modalStyles: Record<string, React.CSSProperties> = {
  overlay: {
    position: 'fixed', inset: 0, zIndex: 50,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  dialog: {
    backgroundColor: '#fff', borderRadius: 12,
    boxShadow: '0 20px 60px rgba(0,0,0,0.15)',
    padding: 24, width: '100%', maxWidth: 420, margin: '0 16px',
  },
  dialogHeader: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  dialogTitle: { margin: 0, fontSize: 18, fontWeight: 600, color: '#1e293b' },
  closeBtn: { background: 'none', border: 'none', fontSize: 18, color: '#94a3b8', cursor: 'pointer', padding: 4 },
  dialogBody: { display: 'flex', flexDirection: 'column' as const, gap: 12 },
  dialogFooter: { display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 16 },
  label: { display: 'block', fontSize: 12, fontWeight: 500, color: '#64748b', marginBottom: 4 },
  input: {
    width: '100%', padding: '8px 12px', fontSize: 14,
    border: '1px solid #e2e8f0', borderRadius: 8, outline: 'none', boxSizing: 'border-box' as const,
  },
  textarea: {
    width: '100%', padding: '8px 12px', fontSize: 14,
    border: '1px solid #e2e8f0', borderRadius: 8, outline: 'none', resize: 'none' as const, boxSizing: 'border-box' as const,
  },
  tagsWrap: { display: 'flex', flexWrap: 'wrap' as const, gap: 4, marginBottom: 8, minHeight: 28 },
  tagChip: {
    display: 'inline-flex', alignItems: 'center', gap: 4,
    padding: '2px 8px', backgroundColor: '#dbeafe', color: '#1d4ed8', fontSize: 12, borderRadius: 12,
  },
  tagRemove: { background: 'none', border: 'none', color: '#1d4ed8', cursor: 'pointer', fontSize: 14, fontWeight: 700, padding: 0 },
  suggestRow: { display: 'flex', flexWrap: 'wrap' as const, gap: 4, marginTop: 8 },
  suggestBtn: {
    padding: '2px 8px', fontSize: 12,
    backgroundColor: '#f1f5f9', color: '#475569', borderRadius: 12, border: 'none', cursor: 'pointer',
  },
  errorText: { margin: 0, fontSize: 12, color: '#dc2626' },
  cancelBtn: {
    padding: '8px 16px', fontSize: 14,
    border: '1px solid #e2e8f0', borderRadius: 8, backgroundColor: '#fff', color: '#475569', cursor: 'pointer',
  },
  submitBtn: {
    padding: '8px 16px', fontSize: 14, fontWeight: 500,
    border: 'none', borderRadius: 8, backgroundColor: '#2563eb', color: '#fff', cursor: 'pointer',
  },
  deleteBtn: {
    padding: '8px 16px', fontSize: 14, fontWeight: 500,
    border: 'none', borderRadius: 8, backgroundColor: '#dc2626', color: '#fff', cursor: 'pointer',
  },
  deleteDesc: { margin: '0 0 12px', fontSize: 14, color: '#64748b' },
  deleteNameBox: { backgroundColor: '#f8fafc', borderRadius: 8, padding: 12, marginBottom: 4 },
  deleteName: {
    margin: 0, fontSize: 14, fontWeight: 500, color: '#334155',
    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const,
  },
};
