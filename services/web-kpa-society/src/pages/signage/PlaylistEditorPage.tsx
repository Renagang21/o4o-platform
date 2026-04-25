/**
 * PlaylistEditorPage — 플레이리스트 생성/수정
 *
 * WO-KPA-SIGNAGE-VIDEO-PLAYLIST-STRUCTURE-REFORM-V2
 *
 * - /signage/playlist/new → 생성 모드
 * - /signage/playlist/:id/edit → 수정 모드
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { publicContentApi } from '../../lib/api/signageV2';
import { getAccessToken, useAuth } from '../../contexts/AuthContext';

const API_BASE = import.meta.env.VITE_API_BASE_URL || '';
const SERVICE_KEY = 'kpa-society';

// ─── Helpers ──────────────────────────────────────────────

function parseDurationInput(input: string): number {
  const parts = input.trim().split(':').map(Number);
  if (parts.some(isNaN)) return 0;
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  return 0;
}

function formatDuration(sec: number): string {
  if (sec <= 0) return '0:00';
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  return `${m}:${String(s).padStart(2, '0')}`;
}

function secToDurationInput(sec: number): string {
  if (sec <= 0) return '';
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  return `${m}:${String(s).padStart(2, '0')}`;
}

let keyCounter = 0;
function nextKey() { return `item-${++keyCounter}-${Date.now()}`; }

// ─── Types ───────────────────────────────────────────────

interface PlaylistItem {
  key: string;
  sourceUrl: string;
  name: string;
  durationInput: string;
}

// ─── Main Component ──────────────────────────────────────

export default function PlaylistEditorPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const isEdit = !!id;

  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [items, setItems] = useState<PlaylistItem[]>([]);

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  // ── Load existing playlist (edit mode) ──
  useEffect(() => {
    if (!isEdit || !id) return;
    setLoading(true);
    publicContentApi.getPlaylist(id, SERVICE_KEY)
      .then((res: any) => {
        if (res.success && res.data) {
          const d = res.data;
          setTitle(d.name || '');
          setDescription(d.description || '');
          setTags(d.tags || []);
          const loadedItems: PlaylistItem[] = (d.items || [])
            .sort((a: any, b: any) => (a.displayOrder ?? a.sortOrder ?? 0) - (b.displayOrder ?? b.sortOrder ?? 0))
            .map((item: any) => ({
              key: nextKey(),
              sourceUrl: item.media?.sourceUrl || item.media?.url || '',
              name: item.media?.name || '',
              durationInput: secToDurationInput(item.displayDuration || item.duration || item.media?.duration || 0),
            }));
          setItems(loadedItems);
        }
      })
      .catch(() => setError('플레이리스트를 불러올 수 없습니다'))
      .finally(() => setLoading(false));
  }, [isEdit, id]);

  // ── Redirect if not authenticated ──
  useEffect(() => {
    if (!user) navigate('/signage', { replace: true });
  }, [user, navigate]);

  // ── Tag management ──
  const addTag = (value: string) => {
    const tag = value.trim().replace(/^#/, '');
    if (!tag || tags.includes(tag)) return;
    setTags(prev => [...prev, tag]);
  };
  const removeTag = (tag: string) => setTags(prev => prev.filter(t => t !== tag));

  // ── Item management ──
  const addItem = () => {
    setItems(prev => [...prev, { key: nextKey(), sourceUrl: '', name: '', durationInput: '' }]);
  };

  const updateItem = (key: string, field: keyof PlaylistItem, value: string) => {
    setItems(prev => prev.map(item => item.key === key ? { ...item, [field]: value } : item));
  };

  const removeItem = (key: string) => {
    setItems(prev => prev.filter(item => item.key !== key));
  };

  const moveItem = (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= items.length) return;
    const newItems = [...items];
    [newItems[index], newItems[targetIndex]] = [newItems[targetIndex], newItems[index]];
    setItems(newItems);
  };

  // ── Computed ──
  const totalDuration = useMemo(() => {
    return items.reduce((sum, item) => sum + parseDurationInput(item.durationInput), 0);
  }, [items]);

  // ── Save ──
  const handleSave = async () => {
    if (!title.trim()) { setError('제목을 입력하세요'); return; }
    if (items.length === 0) { setError('항목을 추가하세요'); return; }

    const validItems = items.filter(item => item.sourceUrl.trim());
    if (validItems.length === 0) { setError('URL이 입력된 항목이 필요합니다'); return; }

    setSaving(true);
    setError(null);
    try {
      const payload = {
        name: title.trim(),
        description: description.trim() || undefined,
        tags: tags.length > 0 ? tags : undefined,
        items: validItems.map(item => ({
          sourceUrl: item.sourceUrl.trim(),
          name: item.name.trim() || undefined,
          duration: parseDurationInput(item.durationInput) || 0,
        })),
      };

      if (isEdit) {
        await apiFetch(`/api/v1/kpa/signage/playlists/${id}`, {
          method: 'PATCH',
          body: JSON.stringify(payload),
        });
      } else {
        await apiFetch(`/api/v1/kpa/signage/playlists`, {
          method: 'POST',
          body: JSON.stringify(payload),
        });
      }

      navigate('/signage?tab=playlists');
    } catch (err: any) {
      setError(err?.message || '저장에 실패했습니다');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div style={styles.page}><div style={styles.container}><p style={{ color: '#64748b' }}>불러오는 중...</p></div></div>;
  }

  return (
    <div style={styles.page}>
      <div style={styles.container}>
        {/* Header */}
        <div style={styles.header}>
          <button onClick={() => navigate('/signage?tab=playlists')} style={styles.backBtn}>← 뒤로</button>
          <h1 style={styles.title}>{isEdit ? '플레이리스트 수정' : '플레이리스트 생성'}</h1>
        </div>

        {/* Form */}
        <div style={styles.card}>
          <div style={styles.field}>
            <label style={styles.label}>제목 *</label>
            <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="플레이리스트 제목" style={styles.input} />
          </div>
          <div style={styles.field}>
            <label style={styles.label}>설명 (선택)</label>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="플레이리스트 설명" rows={2} style={styles.textarea} />
          </div>
          <div style={styles.field}>
            <label style={styles.label}>태그 (선택)</label>
            <div style={styles.tagsWrap}>
              {tags.map(tag => (
                <span key={tag} style={styles.tagChip}>
                  #{tag}
                  <button type="button" onClick={() => removeTag(tag)} style={styles.tagRemove}>×</button>
                </span>
              ))}
            </div>
            <input type="text" value={tagInput} onChange={(e) => setTagInput(e.target.value)} onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); addTag(tagInput); setTagInput(''); }
            }} placeholder="태그 입력 후 Enter" style={styles.input} />
          </div>
        </div>

        {/* Items */}
        <div style={styles.card}>
          <div style={styles.sectionHeader}>
            <h2 style={styles.sectionTitle}>항목</h2>
            <button onClick={addItem} style={styles.addBtn}>+ 항목 추가</button>
          </div>

          {items.length === 0 ? (
            <p style={styles.emptyHint}>항목을 추가하세요. URL과 재생시간을 입력합니다.</p>
          ) : (
            <div style={styles.itemList}>
              {items.map((item, index) => (
                <div key={item.key} style={styles.itemRow}>
                  <span style={styles.itemNum}>{index + 1}</span>
                  <div style={styles.itemFields}>
                    <input type="url" value={item.sourceUrl} onChange={(e) => updateItem(item.key, 'sourceUrl', e.target.value)} placeholder="URL" style={{ ...styles.input, flex: 2 }} />
                    <input type="text" value={item.name} onChange={(e) => updateItem(item.key, 'name', e.target.value)} placeholder="제목 (선택)" style={{ ...styles.input, flex: 1 }} />
                    <input type="text" value={item.durationInput} onChange={(e) => updateItem(item.key, 'durationInput', e.target.value)} placeholder="mm:ss" style={{ ...styles.input, width: 80, flex: 'none' }} />
                  </div>
                  <div style={styles.itemActions}>
                    <button onClick={() => moveItem(index, 'up')} disabled={index === 0} style={styles.moveBtn} title="위로">↑</button>
                    <button onClick={() => moveItem(index, 'down')} disabled={index === items.length - 1} style={styles.moveBtn} title="아래로">↓</button>
                    <button onClick={() => removeItem(item.key)} style={styles.removeBtn} title="삭제">✕</button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Summary */}
          {items.length > 0 && (
            <div style={styles.summary}>
              <span>영상 수: {items.filter(i => i.sourceUrl.trim()).length}</span>
              <span>총 재생시간: {formatDuration(totalDuration)}</span>
            </div>
          )}
        </div>

        {/* Error */}
        {error && <p style={styles.errorText}>{error}</p>}

        {/* Actions */}
        <div style={styles.footerActions}>
          <button onClick={() => navigate('/signage?tab=playlists')} disabled={saving} style={styles.cancelBtn}>취소</button>
          <button onClick={handleSave} disabled={saving} style={styles.saveBtn}>{saving ? '저장 중...' : '저장'}</button>
        </div>
      </div>
    </div>
  );
}

// ─── Styles ───────────────────────────────────────────────

const styles: Record<string, React.CSSProperties> = {
  page: { minHeight: '100vh', backgroundColor: '#f8fafc' },
  container: { maxWidth: 800, margin: '0 auto', padding: '24px 16px 48px' },
  header: { marginBottom: 24 },
  backBtn: {
    background: 'none', border: 'none', fontSize: 14, color: '#2563eb',
    cursor: 'pointer', padding: 0, marginBottom: 8, display: 'block',
  },
  title: { margin: 0, fontSize: 22, fontWeight: 700, color: '#1e293b' },
  card: {
    backgroundColor: '#fff', borderRadius: 12, border: '1px solid #e2e8f0',
    padding: 20, marginBottom: 16,
  },
  field: { marginBottom: 16 },
  label: { display: 'block', fontSize: 13, fontWeight: 500, color: '#475569', marginBottom: 4 },
  input: {
    width: '100%', padding: '8px 12px', fontSize: 14,
    border: '1px solid #e2e8f0', borderRadius: 8, outline: 'none', boxSizing: 'border-box' as const,
  },
  textarea: {
    width: '100%', padding: '8px 12px', fontSize: 14,
    border: '1px solid #e2e8f0', borderRadius: 8, outline: 'none', resize: 'none' as const, boxSizing: 'border-box' as const,
  },
  tagsWrap: { display: 'flex', flexWrap: 'wrap' as const, gap: 4, marginBottom: 8, minHeight: 24 },
  tagChip: {
    display: 'inline-flex', alignItems: 'center', gap: 4,
    padding: '2px 8px', backgroundColor: '#dbeafe', color: '#1d4ed8', fontSize: 12, borderRadius: 12,
  },
  tagRemove: { background: 'none', border: 'none', color: '#1d4ed8', cursor: 'pointer', fontSize: 14, fontWeight: 700, padding: 0 },
  sectionHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  sectionTitle: { margin: 0, fontSize: 16, fontWeight: 600, color: '#1e293b' },
  addBtn: {
    padding: '6px 12px', fontSize: 13, fontWeight: 500,
    backgroundColor: '#eff6ff', color: '#2563eb', border: '1px solid #bfdbfe',
    borderRadius: 6, cursor: 'pointer',
  },
  emptyHint: { fontSize: 14, color: '#94a3b8', textAlign: 'center' as const, padding: '24px 0' },
  itemList: { display: 'flex', flexDirection: 'column' as const, gap: 8 },
  itemRow: {
    display: 'flex', alignItems: 'center', gap: 8,
    padding: '8px 12px', backgroundColor: '#f8fafc', borderRadius: 8, border: '1px solid #f1f5f9',
  },
  itemNum: { fontSize: 13, fontWeight: 600, color: '#94a3b8', minWidth: 20, textAlign: 'center' as const },
  itemFields: { display: 'flex', flex: 1, gap: 8, flexWrap: 'wrap' as const },
  itemActions: { display: 'flex', gap: 2, flexShrink: 0 },
  moveBtn: {
    width: 26, height: 26, fontSize: 14,
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: 4,
    cursor: 'pointer', color: '#475569',
  },
  removeBtn: {
    width: 26, height: 26, fontSize: 14,
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#fef2f2', border: '1px solid #fecaca', borderRadius: 4,
    cursor: 'pointer', color: '#dc2626',
  },
  summary: {
    display: 'flex', justifyContent: 'flex-end', gap: 16, marginTop: 12,
    fontSize: 13, fontWeight: 500, color: '#475569',
  },
  errorText: { fontSize: 13, color: '#dc2626', marginBottom: 8 },
  footerActions: { display: 'flex', justifyContent: 'flex-end', gap: 8 },
  cancelBtn: {
    padding: '8px 20px', fontSize: 14,
    border: '1px solid #e2e8f0', borderRadius: 8, backgroundColor: '#fff', color: '#475569', cursor: 'pointer',
  },
  saveBtn: {
    padding: '8px 20px', fontSize: 14, fontWeight: 500,
    border: 'none', borderRadius: 8, backgroundColor: '#2563eb', color: '#fff', cursor: 'pointer',
  },
};
