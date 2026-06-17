/**
 * SignagePlaylistCreateShell — O4O 표준 디지털 사이니지 플레이리스트 등록 form shell
 *
 * WO-O4O-SIGNAGE-PLAYLIST-CREATE-STANDARD-ALL-SURFACES-V1
 *
 * KPA `/signage/playlist/new` 등록 흐름을 service-neutral 순수 form shell 로 추출.
 * (CommunityContentWriteShell 패턴 — API client / router / toast 미 import, 저장은 onSubmit 주입.)
 *
 * 3개 축(surface)에서 공용:
 *  - community : 제목 / 설명 / 태그(선택) / URL 항목 목록(순서·재생시간) — 단건 저장
 *  - operator  : 제목 / 태그(필수) / 재생 옵션(루프·전환·기본시간) / URL 항목 목록 — 다단계 저장
 *  - store     : 제목 / 설명 / 태그(선택) — 항목 없음(항목은 HUB 복사로 별도 추가)
 *
 * 차이는 모두 config 로 흡수한다. 저장 endpoint·라우팅·인증은 wrapper(adapter) 책임.
 * 검증 / 저장 진행(progress) / 인라인 에러는 shell 소유.
 */

import { useMemo, useState, type CSSProperties, type ReactNode } from 'react';

// ─── Types ───────────────────────────────────────────────

export type SignagePlaylistSurface = 'community' | 'operator' | 'store';

/** 정규화된 항목 (저장용) */
export interface SignagePlaylistCreateItem {
  /** 미디어 소스 URL (YouTube / Vimeo / 직접 URL) */
  url: string;
  /** 항목 제목 (선택) */
  title: string;
  /** 재생 시간(초). 미입력 시 defaultItemDuration 적용 */
  durationSeconds: number;
}

/** onSubmit 으로 전달되는 정규화된 값 */
export interface SignagePlaylistCreateValues {
  name: string;
  description: string;
  tags: string[];
  /** 재생 옵션 (operator 축) */
  loopEnabled: boolean;
  defaultItemDuration: number;
  transitionType: string;
  /** URL 항목 목록 (community / operator 축; store 는 빈 배열) */
  items: SignagePlaylistCreateItem[];
}

export interface SignagePlaylistCreateConfig {
  surface: SignagePlaylistSurface;
  /** 페이지 헤딩 */
  title?: string;
  /** 설명 필드 노출 (기본: store/community true, operator false) */
  showDescription?: boolean;
  /** 태그 필드 노출 (기본 true) */
  showTags?: boolean;
  /** 태그 최소 1개 필수 (기본: operator true, 그 외 false) */
  requireTags?: boolean;
  /** URL 항목 목록 노출 (기본: surface !== 'store') */
  showItems?: boolean;
  /** 항목 최소 1개 필수 (기본: showItems 와 동일) */
  requireItems?: boolean;
  /** 재생 옵션(루프/전환/기본시간) 노출 (기본: operator true) */
  showPlaybackOptions?: boolean;
  /** 항목별 재생시간 입력 노출 (기본: community true / operator false — 단일 기본시간 사용) */
  perItemDuration?: boolean;
  /** 태그 추천 칩 */
  tagSuggestions?: string[];
  // 라벨 / placeholder
  namePlaceholder?: string;
  descriptionPlaceholder?: string;
  cancelLabel?: string;
  submitLabel?: string;
}

export interface SignagePlaylistCreateShellProps {
  config: SignagePlaylistCreateConfig;
  initialValues?: Partial<Omit<SignagePlaylistCreateValues, 'items'>> & {
    items?: Array<Partial<SignagePlaylistCreateItem>>;
  };
  /** 서비스 고유 안내(GuideBlock 등) — form 상단에 렌더 */
  guideSlot?: ReactNode;
  /**
   * 저장 — wrapper 가 API 호출·라우팅 담당.
   * 실패 시 throw 하면 shell 이 인라인 에러를 표시한다.
   * helpers.setProgress 로 다단계 저장 진행 메시지를 표시할 수 있다.
   */
  onSubmit: (
    values: SignagePlaylistCreateValues,
    helpers: { setProgress: (message: string) => void },
  ) => Promise<void> | void;
  onCancel?: () => void;
  disabled?: boolean;
}

// ─── Helpers ─────────────────────────────────────────────

function parseDurationInput(input: string): number {
  const trimmed = input.trim();
  if (!trimmed) return 0;
  const parts = trimmed.split(':').map(Number);
  if (parts.some(Number.isNaN)) return 0;
  if (parts.length === 1) return parts[0];
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
  return formatDuration(sec);
}

let _keyCounter = 0;
function nextKey(): string {
  return `pl-item-${++_keyCounter}`;
}

interface ItemDraft {
  key: string;
  url: string;
  title: string;
  durationInput: string;
}

// ─── Component ───────────────────────────────────────────

export function SignagePlaylistCreateShell({
  config,
  initialValues,
  guideSlot,
  onSubmit,
  onCancel,
  disabled,
}: SignagePlaylistCreateShellProps) {
  const showDescription = config.showDescription ?? config.surface !== 'operator';
  const showTags = config.showTags ?? true;
  const requireTags = config.requireTags ?? config.surface === 'operator';
  const showItems = config.showItems ?? config.surface !== 'store';
  const requireItems = config.requireItems ?? showItems;
  const showPlaybackOptions = config.showPlaybackOptions ?? config.surface === 'operator';
  const perItemDuration = config.perItemDuration ?? config.surface === 'community';

  const [name, setName] = useState(initialValues?.name ?? '');
  const [description, setDescription] = useState(initialValues?.description ?? '');
  const [tags, setTags] = useState<string[]>(initialValues?.tags ?? []);
  const [tagInput, setTagInput] = useState('');
  const [loopEnabled, setLoopEnabled] = useState(initialValues?.loopEnabled ?? true);
  const [defaultItemDuration, setDefaultItemDuration] = useState(initialValues?.defaultItemDuration ?? 10);
  const [transitionType, setTransitionType] = useState(initialValues?.transitionType ?? 'fade');
  const [items, setItems] = useState<ItemDraft[]>(
    (initialValues?.items ?? []).map((it) => ({
      key: nextKey(),
      url: it.url ?? '',
      title: it.title ?? '',
      durationInput: it.durationSeconds ? secToDurationInput(it.durationSeconds) : '',
    })),
  );

  const [saving, setSaving] = useState(false);
  const [progress, setProgress] = useState('');
  const [error, setError] = useState<string | null>(null);

  // ── Tags ──
  const addTag = (value: string) => {
    const tag = value.trim().replace(/^#/, '');
    if (!tag || tags.includes(tag)) return;
    setTags((prev) => [...prev, tag]);
  };
  const removeTag = (tag: string) => setTags((prev) => prev.filter((t) => t !== tag));

  // ── Items ──
  const addItem = () => setItems((prev) => [...prev, { key: nextKey(), url: '', title: '', durationInput: '' }]);
  const updateItem = (key: string, field: keyof Omit<ItemDraft, 'key'>, value: string) =>
    setItems((prev) => prev.map((it) => (it.key === key ? { ...it, [field]: value } : it)));
  const removeItem = (key: string) => setItems((prev) => prev.filter((it) => it.key !== key));
  const moveItem = (index: number, direction: 'up' | 'down') => {
    const target = direction === 'up' ? index - 1 : index + 1;
    if (target < 0 || target >= items.length) return;
    setItems((prev) => {
      const next = [...prev];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  };

  const totalDuration = useMemo(
    () =>
      items.reduce(
        (sum, it) => sum + (parseDurationInput(it.durationInput) || defaultItemDuration),
        0,
      ),
    [items, defaultItemDuration],
  );

  // ── Save ──
  const handleSave = async () => {
    setError(null);
    if (!name.trim()) {
      setError('제목을 입력하세요');
      return;
    }

    const pendingFromInput = tagInput.split(',').map((t) => t.trim().replace(/^#/, '')).filter(Boolean);
    const tagArr = Array.from(new Set([...tags, ...pendingFromInput]));
    if (showTags && requireTags && tagArr.length === 0) {
      setError('태그를 최소 1개 이상 입력하세요');
      return;
    }

    let normalizedItems: SignagePlaylistCreateItem[] = [];
    if (showItems) {
      const validItems = items.filter((it) => it.url.trim());
      if (requireItems && validItems.length === 0) {
        setError('URL이 입력된 항목이 최소 1개 필요합니다');
        return;
      }
      normalizedItems = validItems.map((it) => ({
        url: it.url.trim(),
        title: it.title.trim(),
        durationSeconds: parseDurationInput(it.durationInput) || defaultItemDuration,
      }));
    }

    setSaving(true);
    setProgress('');
    try {
      await onSubmit(
        {
          name: name.trim(),
          description: description.trim(),
          tags: tagArr,
          loopEnabled,
          defaultItemDuration,
          transitionType,
          items: normalizedItems,
        },
        { setProgress },
      );
    } catch (e: any) {
      setError(e?.message || '저장에 실패했습니다');
    } finally {
      setSaving(false);
      setProgress('');
    }
  };

  const busy = saving || !!disabled;
  const validItemCount = items.filter((it) => it.url.trim()).length;

  return (
    <div style={styles.card}>
      {guideSlot}

      {/* 제목 */}
      <div style={styles.field}>
        <label style={styles.label}>제목 <span style={styles.required}>*</span></label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={config.namePlaceholder ?? '플레이리스트 제목을 입력하세요'}
          style={styles.input}
        />
      </div>

      {/* 설명 */}
      {showDescription && (
        <div style={styles.field}>
          <label style={styles.label}>설명 <span style={styles.hint}>(선택)</span></label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder={config.descriptionPlaceholder ?? '플레이리스트 설명'}
            rows={2}
            style={styles.textarea}
          />
        </div>
      )}

      {/* 재생 옵션 (operator) */}
      {showPlaybackOptions && (
        <div style={styles.optionsRow}>
          <div style={styles.optionField}>
            <label style={styles.label}>기본 항목 시간 (초)</label>
            <input
              type="number"
              min={1}
              max={300}
              value={defaultItemDuration}
              onChange={(e) => setDefaultItemDuration(Number(e.target.value))}
              style={styles.input}
            />
          </div>
          <div style={styles.optionField}>
            <label style={styles.label}>전환 효과</label>
            <select value={transitionType} onChange={(e) => setTransitionType(e.target.value)} style={styles.input}>
              <option value="none">없음</option>
              <option value="fade">페이드</option>
              <option value="slide">슬라이드</option>
            </select>
          </div>
          <div style={{ ...styles.optionField, justifyContent: 'flex-end' }}>
            <label style={styles.checkboxLabel}>
              <input type="checkbox" checked={loopEnabled} onChange={(e) => setLoopEnabled(e.target.checked)} />
              반복 재생
            </label>
          </div>
        </div>
      )}

      {/* 태그 */}
      {showTags && (
        <div style={styles.field}>
          <label style={styles.label}>
            태그 {requireTags && <span style={styles.required}>*</span>}{' '}
            <span style={styles.hint}>(Enter 또는 쉼표로 추가{requireTags ? ', 최소 1개' : ''})</span>
          </label>
          <div style={styles.tagsWrap}>
            {tags.map((tag) => (
              <span key={tag} style={styles.tagChip}>
                #{tag}
                <button type="button" onClick={() => removeTag(tag)} style={styles.tagRemove} aria-label={`${tag} 삭제`}>×</button>
              </span>
            ))}
          </div>
          <input
            type="text"
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ',') {
                e.preventDefault();
                addTag(tagInput);
                setTagInput('');
              }
            }}
            placeholder="태그 입력 후 Enter"
            style={styles.input}
          />
          {config.tagSuggestions && config.tagSuggestions.length > 0 && (
            <div style={styles.suggestRow}>
              {config.tagSuggestions.filter((t) => !tags.includes(t)).map((t) => (
                <button key={t} type="button" onClick={() => addTag(t)} style={styles.suggestChip}>#{t}</button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 항목 목록 */}
      {showItems && (
        <div style={styles.itemsSection}>
          <div style={styles.sectionHeader}>
            <h2 style={styles.sectionTitle}>항목 {requireItems && <span style={styles.required}>*</span>}</h2>
            <button type="button" onClick={addItem} style={styles.addBtn}>+ 항목 추가</button>
          </div>

          {items.length === 0 ? (
            <p style={styles.emptyHint}>항목을 추가하세요. URL{perItemDuration ? '과 재생시간을' : '을'} 입력합니다.</p>
          ) : (
            <div style={styles.itemList}>
              {items.map((item, index) => (
                <div key={item.key} style={styles.itemRow}>
                  <span style={styles.itemNum}>{index + 1}</span>
                  <div style={styles.itemFields}>
                    <input
                      type="url"
                      value={item.url}
                      onChange={(e) => updateItem(item.key, 'url', e.target.value)}
                      placeholder="https://www.youtube.com/watch?v=..."
                      style={{ ...styles.input, flex: 2 }}
                    />
                    <input
                      type="text"
                      value={item.title}
                      onChange={(e) => updateItem(item.key, 'title', e.target.value)}
                      placeholder="제목 (선택)"
                      style={{ ...styles.input, flex: 1 }}
                    />
                    {perItemDuration && (
                      <input
                        type="text"
                        value={item.durationInput}
                        onChange={(e) => updateItem(item.key, 'durationInput', e.target.value)}
                        placeholder="mm:ss"
                        style={{ ...styles.input, width: 80, flex: 'none' }}
                      />
                    )}
                  </div>
                  <div style={styles.itemActions}>
                    <button type="button" onClick={() => moveItem(index, 'up')} disabled={index === 0} style={styles.moveBtn} title="위로">↑</button>
                    <button type="button" onClick={() => moveItem(index, 'down')} disabled={index === items.length - 1} style={styles.moveBtn} title="아래로">↓</button>
                    <button type="button" onClick={() => removeItem(item.key)} style={styles.removeBtn} title="삭제">✕</button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {items.length > 0 && (
            <div style={styles.summary}>
              <span>영상 수: {validItemCount}</span>
              <span>총 재생시간: {formatDuration(totalDuration)}</span>
            </div>
          )}
        </div>
      )}

      {/* 진행 상태 */}
      {saving && progress && <div style={styles.progress}>{progress}</div>}

      {error && <p style={styles.error}>{error}</p>}

      {/* 액션 */}
      <div style={styles.actions}>
        {onCancel && (
          <button type="button" onClick={onCancel} disabled={busy} style={styles.cancelBtn}>
            {config.cancelLabel ?? '취소'}
          </button>
        )}
        <button type="button" onClick={handleSave} disabled={busy} style={styles.saveBtn}>
          {saving ? '저장 중...' : (config.submitLabel ?? '저장')}
        </button>
      </div>
    </div>
  );
}

// ─── Styles ──────────────────────────────────────────────

const styles: Record<string, CSSProperties> = {
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    border: '1px solid #e2e8f0',
    padding: 28,
    boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
  },
  field: { marginBottom: 20 },
  label: { display: 'block', fontSize: '0.875rem', fontWeight: 600, color: '#334155', marginBottom: 6 },
  required: { color: '#ef4444' },
  hint: { fontSize: '0.75rem', fontWeight: 400, color: '#94a3b8' },
  input: {
    width: '100%', padding: '10px 14px', fontSize: '0.875rem',
    border: '1px solid #e2e8f0', borderRadius: 8, outline: 'none', boxSizing: 'border-box',
  },
  textarea: {
    width: '100%', padding: '10px 14px', fontSize: '0.875rem',
    border: '1px solid #e2e8f0', borderRadius: 8, outline: 'none', resize: 'vertical', boxSizing: 'border-box',
  },
  optionsRow: { display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' },
  optionField: { display: 'flex', flexDirection: 'column', flex: 1, minWidth: 140 },
  checkboxLabel: { display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: '0.875rem', color: '#334155', height: 40 },
  tagsWrap: { display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 8, minHeight: 24 },
  tagChip: {
    display: 'inline-flex', alignItems: 'center', gap: 4, padding: '2px 8px',
    backgroundColor: '#dbeafe', color: '#1d4ed8', fontSize: 12, borderRadius: 12,
  },
  tagRemove: { background: 'none', border: 'none', color: '#1d4ed8', cursor: 'pointer', fontSize: 14, fontWeight: 700, padding: 0 },
  suggestRow: { display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 8 },
  suggestChip: {
    padding: '2px 8px', fontSize: 12, backgroundColor: '#f1f5f9', color: '#475569',
    border: 'none', borderRadius: 12, cursor: 'pointer',
  },
  itemsSection: { marginBottom: 20, paddingTop: 4 },
  sectionHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  sectionTitle: { margin: 0, fontSize: 16, fontWeight: 600, color: '#1e293b' },
  addBtn: {
    padding: '6px 12px', fontSize: 13, fontWeight: 500, backgroundColor: '#eff6ff',
    color: '#2563eb', border: '1px solid #bfdbfe', borderRadius: 6, cursor: 'pointer',
  },
  emptyHint: { fontSize: 14, color: '#94a3b8', textAlign: 'center', padding: '24px 0' },
  itemList: { display: 'flex', flexDirection: 'column', gap: 8 },
  itemRow: {
    display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px',
    backgroundColor: '#f8fafc', borderRadius: 8, border: '1px solid #f1f5f9',
  },
  itemNum: { fontSize: 13, fontWeight: 600, color: '#94a3b8', minWidth: 20, textAlign: 'center' },
  itemFields: { display: 'flex', flex: 1, gap: 8, flexWrap: 'wrap' },
  itemActions: { display: 'flex', gap: 2, flexShrink: 0 },
  moveBtn: {
    width: 26, height: 26, fontSize: 14, display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: 4, cursor: 'pointer', color: '#475569',
  },
  removeBtn: {
    width: 26, height: 26, fontSize: 14, display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#fef2f2', border: '1px solid #fecaca', borderRadius: 4, cursor: 'pointer', color: '#dc2626',
  },
  summary: { display: 'flex', justifyContent: 'flex-end', gap: 16, marginTop: 12, fontSize: 13, fontWeight: 500, color: '#475569' },
  progress: {
    display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, color: '#2563eb',
    backgroundColor: '#eff6ff', borderRadius: 8, padding: '8px 12px', marginBottom: 12,
  },
  error: { margin: '0 0 12px', fontSize: '0.8125rem', color: '#dc2626' },
  actions: { display: 'flex', justifyContent: 'flex-end', gap: 8, paddingTop: 16, borderTop: '1px solid #f1f5f9' },
  cancelBtn: {
    padding: '10px 20px', fontSize: '0.875rem', fontWeight: 500, color: '#64748b',
    backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: 8, cursor: 'pointer',
  },
  saveBtn: {
    padding: '10px 20px', fontSize: '0.875rem', fontWeight: 600, color: '#fff',
    backgroundColor: '#2563eb', border: '1px solid #2563eb', borderRadius: 8, cursor: 'pointer',
  },
};

export default SignagePlaylistCreateShell;
