/**
 * Signage Content Hub Page — KPA-Society
 *
 * WO-O4O-SIGNAGE-CONTENT-CENTERED-REFACTOR-V1
 * WO-O4O-SIGNAGE-HUB-TEMPLATE-FOUNDATION-V1:
 *   인라인 구현 → SignageHubTemplate + kpaSignageConfig 구조로 전환.
 *   커뮤니티 등록 모달 / 삭제 확인 모달은 서비스 코드에 보존.
 */

import { useState, useCallback } from 'react';
import { SignageHubTemplate } from '@o4o/shared-space-ui';
import type { SignageHubConfig, SignageHubItem } from '@o4o/shared-space-ui';
import { publicContentApi } from '../../lib/api/signageV2';
import { assetSnapshotApi } from '../../api/assetSnapshot';
import { getAccessToken, useAuth } from '../../contexts/AuthContext';

const API_BASE = import.meta.env.VITE_API_BASE_URL || '';
const SERVICE_KEY = 'kpa-society';

const DEFAULT_TAG_SUGGESTIONS = [
  '복약지도', '당뇨', '혈압', '면역', '건강기능식품',
  '의약외품', '이벤트', '프로모션', '신제품', '추천상품',
];

// ─── Badge Mappings ───────────────────────────────────────

const KPA_SOURCE_LABELS: Record<string, { label: string; bg: string; text: string }> = {
  hq:        { label: '운영자',  bg: '#dbeafe', text: '#1d4ed8' },
  community: { label: '커뮤니티', bg: '#dcfce7', text: '#15803d' },
  supplier:  { label: '공급자',  bg: '#fef3c7', text: '#b45309' },
};

const KPA_MEDIA_TYPE_LABELS: Record<string, { label: string; bg: string; text: string }> = {
  youtube:   { label: 'YouTube',   bg: '#fee2e2', text: '#b91c1c' },
  video:     { label: '영상',      bg: '#f3e8ff', text: '#7e22ce' },
  image:     { label: '이미지',    bg: '#e0f2fe', text: '#0369a1' },
  url:       { label: 'URL',       bg: '#f1f5f9', text: '#475569' },
  html:      { label: 'HTML',      bg: '#ffedd5', text: '#c2410c' },
  text:      { label: '텍스트',    bg: '#ccfbf1', text: '#0f766e' },
  rich_text: { label: 'Rich Text', bg: '#ccfbf1', text: '#0f766e' },
};

// ─── Types ────────────────────────────────────────────────

interface MediaItem {
  id: string;
  name: string;
  description?: string;
  category?: string;
  mediaType: string;
  url?: string;
  thumbnailUrl?: string;
  duration?: number;
  tags?: string[];
  source: string;
  createdByUserId?: string;
  createdAt: string;
  creatorName?: string;
}

// ─── Main Component ───────────────────────────────────────

export default function ContentHubPage() {
  const { user } = useAuth();

  // Modals
  const [createModal, setCreateModal] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: string; name: string } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Create modal state
  const [createForm, setCreateForm] = useState({ name: '', description: '', sourceUrl: '' });
  const [isCreating, setIsCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [formTags, setFormTags] = useState<string[]>([]);
  const [formTagInput, setFormTagInput] = useState('');

  // Reload trigger
  const [reloadKey, setReloadKey] = useState(0);

  // Auth fetch helper
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

  // ── Config ──
  const config: SignageHubConfig = {
    serviceKey: SERVICE_KEY,
    heroTitle: '안내 영상 · 자료',
    heroDesc: '영상과 플레이리스트를 검색하고 활용하세요',
    headerAction: user ? (
      <button
        onClick={() => {
          setCreateForm({ name: '', description: '', sourceUrl: '' });
          setFormTags([]);
          setFormTagInput('');
          setCreateError(null);
          setCreateModal(true);
        }}
        style={modalStyles.createBtn}
      >
        + 콘텐츠 등록
      </button>
    ) : undefined,
    searchPlaceholder: '제목 또는 설명으로 검색...',
    showTagFilter: true,
    pageLimit: 20,
    fetchItems: async (params) => {
      const res = await publicContentApi.listMedia(undefined, SERVICE_KEY, {
        page: params.page,
        limit: params.limit,
        search: params.search || undefined,
      });
      if (res.success && res.data) {
        const raw = (res.data as any).items ?? [];
        const items: SignageHubItem[] = raw.map((m: MediaItem) => ({
          id: m.id,
          name: m.name,
          description: m.description || null,
          mediaType: m.mediaType,
          source: m.source,
          tags: m.tags,
          creatorName: m.creatorName || null,
          createdAt: m.createdAt,
          url: m.url || null,
          canDelete: !!user && m.source === 'community' && m.createdByUserId === user.id,
        }));
        return { items, total: (res.data as any).total ?? 0 };
      }
      throw new Error('콘텐츠를 불러오는 데 실패했습니다.');
    },
    onCopy: async (item) => {
      await assetSnapshotApi.copy({
        sourceService: 'kpa',
        sourceAssetId: item.id,
        assetType: 'signage',
      });
    },
    onDelete: (item) => {
      setDeleteConfirm({ id: item.id, name: item.name });
    },
    sourceLabels: KPA_SOURCE_LABELS,
    mediaTypeLabels: KPA_MEDIA_TYPE_LABELS,
    showInfoBlock: true,
    infoTitle: '가져가기 안내',
    infoDesc: '콘텐츠를 가져가기하면 내 매장 콘텐츠 보관함에 독립적으로 저장됩니다. 원본이 변경되어도 영향 없으며, 매장에서 직접 수정·삭제 가능합니다.',
    emptyMessage: '등록된 콘텐츠가 없습니다',
    emptyFilteredMessage: '선택한 태그에 해당하는 콘텐츠가 없습니다',
  };

  // ── Delete handler ──
  const handleDeleteConfirmed = async () => {
    if (!deleteConfirm) return;
    setIsDeleting(true);
    try {
      await apiFetch(`/api/signage/${SERVICE_KEY}/community/media/${deleteConfirm.id}`, { method: 'DELETE' });
      setDeleteConfirm(null);
      setReloadKey(k => k + 1);
    } catch {
      setDeleteConfirm(null);
    } finally {
      setIsDeleting(false);
    }
  };

  // ── Create handlers ──
  const addTag = (value: string) => {
    const tag = value.trim().replace(/^#/, '');
    if (!tag || formTags.includes(tag)) return;
    setFormTags(prev => [...prev, tag]);
  };

  const removeTag = (tag: string) => {
    setFormTags(prev => prev.filter(t => t !== tag));
  };

  const handleCreate = async () => {
    if (!createForm.name.trim()) { setCreateError('제목을 입력하세요'); return; }
    if (!createForm.sourceUrl.trim()) { setCreateError('URL을 입력하세요'); return; }
    if (formTags.length === 0) { setCreateError('태그를 최소 1개 이상 입력해주세요'); return; }
    setIsCreating(true);
    setCreateError(null);
    try {
      await apiFetch(`/api/signage/${SERVICE_KEY}/community/media`, {
        method: 'POST',
        body: JSON.stringify({
          name: createForm.name.trim(),
          description: createForm.description.trim() || undefined,
          sourceUrl: createForm.sourceUrl.trim(),
          tags: formTags,
          mediaType: 'youtube',
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

  return (
    <>
      <SignageHubTemplate key={reloadKey} config={config} />

      {/* ── Community Content Creation Modal ── */}
      {createModal && (
        <div style={modalStyles.overlay}>
          <div style={modalStyles.dialog}>
            <div style={modalStyles.dialogHeader}>
              <h3 style={modalStyles.dialogTitle}>커뮤니티 콘텐츠 등록</h3>
              <button onClick={() => setCreateModal(false)} style={modalStyles.closeBtn}>✕</button>
            </div>
            <div style={modalStyles.dialogBody}>
              <div>
                <label style={modalStyles.label}>제목 *</label>
                <input
                  type="text"
                  value={createForm.name}
                  onChange={(e) => setCreateForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="예: 약사회 건강 안내 영상"
                  style={modalStyles.input}
                />
              </div>
              <div>
                <label style={modalStyles.label}>YouTube URL *</label>
                <input
                  type="url"
                  value={createForm.sourceUrl}
                  onChange={(e) => setCreateForm(f => ({ ...f, sourceUrl: e.target.value }))}
                  placeholder="https://www.youtube.com/watch?v=..."
                  style={modalStyles.input}
                />
              </div>
              <div>
                <label style={modalStyles.label}>설명 (선택)</label>
                <textarea
                  value={createForm.description}
                  onChange={(e) => setCreateForm(f => ({ ...f, description: e.target.value }))}
                  placeholder="간단한 설명을 입력하세요"
                  rows={2}
                  style={modalStyles.textarea}
                />
              </div>
              <div>
                <label style={modalStyles.label}>태그 * (최소 1개)</label>
                <div style={modalStyles.tagsWrap}>
                  {formTags.map(tag => (
                    <span key={tag} style={modalStyles.tagChip}>
                      #{tag}
                      <button type="button" onClick={() => removeTag(tag)} style={modalStyles.tagRemove}>×</button>
                    </span>
                  ))}
                </div>
                <input
                  type="text"
                  value={formTagInput}
                  onChange={(e) => setFormTagInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ',') {
                      e.preventDefault();
                      addTag(formTagInput);
                      setFormTagInput('');
                    }
                  }}
                  placeholder="태그 입력 후 Enter 또는 쉼표"
                  style={modalStyles.input}
                />
                <div style={modalStyles.suggestRow}>
                  {DEFAULT_TAG_SUGGESTIONS.filter(t => !formTags.includes(t)).map(t => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => addTag(t)}
                      style={modalStyles.suggestBtn}
                    >
                      #{t}
                    </button>
                  ))}
                </div>
              </div>
              {createError && (
                <p style={modalStyles.errorText}>{createError}</p>
              )}
            </div>
            <div style={modalStyles.dialogFooter}>
              <button onClick={() => setCreateModal(false)} disabled={isCreating} style={modalStyles.cancelBtn}>
                취소
              </button>
              <button onClick={handleCreate} disabled={isCreating || formTags.length === 0} style={modalStyles.submitBtn}>
                {isCreating ? '등록 중...' : '등록'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Delete Confirmation Modal ── */}
      {deleteConfirm && (
        <div style={modalStyles.overlay}>
          <div style={{ ...modalStyles.dialog, maxWidth: '380px' }}>
            <h3 style={modalStyles.dialogTitle}>콘텐츠 삭제</h3>
            <p style={modalStyles.deleteDesc}>삭제하면 커뮤니티에서 더 이상 표시되지 않습니다.</p>
            <div style={modalStyles.deleteNameBox}>
              <p style={modalStyles.deleteName}>{deleteConfirm.name}</p>
              <p style={modalStyles.deleteHint}>내가 등록한 커뮤니티 콘텐츠</p>
            </div>
            <div style={modalStyles.dialogFooter}>
              <button onClick={() => setDeleteConfirm(null)} disabled={isDeleting} style={modalStyles.cancelBtn}>
                취소
              </button>
              <button onClick={handleDeleteConfirmed} disabled={isDeleting} style={modalStyles.deleteBtn}>
                {isDeleting ? '삭제 중...' : '삭제'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// ─── Modal Styles ─────────────────────────────────────────

const modalStyles: Record<string, React.CSSProperties> = {
  overlay: {
    position: 'fixed', inset: 0, zIndex: 50,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  dialog: {
    backgroundColor: '#fff', borderRadius: '12px',
    boxShadow: '0 20px 60px rgba(0,0,0,0.15)',
    padding: '24px', width: '100%', maxWidth: '420px', margin: '0 16px',
  },
  dialogHeader: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    marginBottom: '16px',
  },
  dialogTitle: { margin: 0, fontSize: '18px', fontWeight: 600, color: '#1e293b' },
  closeBtn: {
    background: 'none', border: 'none', fontSize: '18px',
    color: '#94a3b8', cursor: 'pointer', padding: '4px',
  },
  dialogBody: { display: 'flex', flexDirection: 'column', gap: '12px' } as React.CSSProperties,
  dialogFooter: {
    display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '16px',
  },
  label: {
    display: 'block', fontSize: '12px', fontWeight: 500,
    color: '#64748b', marginBottom: '4px',
  },
  input: {
    width: '100%', padding: '8px 12px', fontSize: '14px',
    border: '1px solid #e2e8f0', borderRadius: '8px',
    outline: 'none', boxSizing: 'border-box',
  } as React.CSSProperties,
  textarea: {
    width: '100%', padding: '8px 12px', fontSize: '14px',
    border: '1px solid #e2e8f0', borderRadius: '8px',
    outline: 'none', resize: 'none', boxSizing: 'border-box',
  } as React.CSSProperties,
  tagsWrap: {
    display: 'flex', flexWrap: 'wrap', gap: '4px',
    marginBottom: '8px', minHeight: '28px',
  } as React.CSSProperties,
  tagChip: {
    display: 'inline-flex', alignItems: 'center', gap: '4px',
    padding: '2px 8px', backgroundColor: '#dbeafe', color: '#1d4ed8',
    fontSize: '12px', borderRadius: '12px',
  },
  tagRemove: {
    background: 'none', border: 'none', color: '#1d4ed8',
    cursor: 'pointer', fontSize: '14px', fontWeight: 700, padding: 0,
  },
  suggestRow: {
    display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '8px',
  } as React.CSSProperties,
  suggestBtn: {
    padding: '2px 8px', fontSize: '12px',
    backgroundColor: '#f1f5f9', color: '#475569', borderRadius: '12px',
    border: 'none', cursor: 'pointer',
  },
  errorText: {
    margin: 0, fontSize: '12px', color: '#dc2626',
  },
  cancelBtn: {
    padding: '8px 16px', fontSize: '14px',
    border: '1px solid #e2e8f0', borderRadius: '8px',
    backgroundColor: '#fff', color: '#475569', cursor: 'pointer',
  },
  submitBtn: {
    padding: '8px 16px', fontSize: '14px', fontWeight: 500,
    border: 'none', borderRadius: '8px',
    backgroundColor: '#2563eb', color: '#fff', cursor: 'pointer',
  },
  deleteBtn: {
    padding: '8px 16px', fontSize: '14px', fontWeight: 500,
    border: 'none', borderRadius: '8px',
    backgroundColor: '#dc2626', color: '#fff', cursor: 'pointer',
  },
  createBtn: {
    display: 'inline-flex', alignItems: 'center', gap: '6px',
    padding: '8px 14px', fontSize: '14px', fontWeight: 500,
    backgroundColor: '#2563eb', color: '#fff', border: 'none',
    borderRadius: '8px', cursor: 'pointer',
  },
  deleteDesc: {
    margin: '0 0 12px', fontSize: '14px', color: '#64748b',
  },
  deleteNameBox: {
    backgroundColor: '#f8fafc', borderRadius: '8px', padding: '12px',
    marginBottom: '4px',
  },
  deleteName: {
    margin: 0, fontSize: '14px', fontWeight: 500, color: '#334155',
    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
  } as React.CSSProperties,
  deleteHint: {
    margin: '4px 0 0', fontSize: '12px', color: '#94a3b8',
  },
};
