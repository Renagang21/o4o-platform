/**
 * IdlePlaylistEditor — Lightweight editor for tablet idle playlist
 *
 * WO-O4O-TABLET-IDLE-PLAYLIST-EDITOR-V1
 * WO-O4O-TABLET-IDLE-PREVIEW-V1 — 내부 Preview sub-component 추가
 *
 * 매장 운영자가 tablet idle 화면에 재생할 항목(image/video URL + duration)을
 * 편집하는 controlled component.
 *
 * 정책:
 * - lightweight UI (signage editor 톤 X)
 * - upload/media-library 통합 없음 (URL 직접 입력만)
 * - 순서: up/down 버튼 (drag-drop 미사용)
 * - validation 은 add 시점에 inline 표시
 * - duration 은 image 항목 전용 (video 는 onEnded 자동 진행)
 * - Preview 는 편집 보조 — 실제 kiosk fullscreen runtime 과 100% 동일하지 않음
 *   (URL/순서/타입 확인 목적). IdleOverlay runtime 미터치.
 *
 * 외부 의존성: react 만 (lucide-react 등 추가 의존성 없음 — inline SVG 사용)
 *
 * 사용:
 *   <IdlePlaylistEditor items={items} onChange={setItems} />
 *
 * 저장은 부모 컴포넌트가 별도 버튼/API 로 수행.
 *
 * Preview 동작:
 * - 빈 배열: "재생 항목이 없습니다" 안내
 * - image: <img> 노출 (durationMs 기준 자동 진행 미사용 — 수동 이전/다음 버튼만)
 * - video: <video controls muted playsInline> (운영자 수동 재생/일시정지)
 * - 로딩 실패: onError 안내 메시지
 * - items 가 변경되어 previewIndex 가 범위를 벗어나면 0 으로 보정
 */

import { useEffect, useMemo, useState } from 'react';
import type { IdlePlaylistItem } from './types';

export interface IdlePlaylistEditorProps {
  items: IdlePlaylistItem[];
  onChange: (next: IdlePlaylistItem[]) => void;
  /** read-only 모드 (저장 중일 때 등) */
  disabled?: boolean;
}

const DEFAULT_IMAGE_DURATION_MS = 5000;
const MIN_DURATION_MS = 1000;

function normalizeUrl(url: string): string {
  return url.trim();
}

function inferTypeFromUrl(url: string): 'image' | 'video' {
  const lower = url.toLowerCase();
  if (/\.(mp4|webm|ogg|mov|m4v)(\?.*)?$/.test(lower)) return 'video';
  return 'image';
}

function isLikelyValidUrl(url: string): boolean {
  if (!url) return false;
  return /^https?:\/\//i.test(url) || url.startsWith('/');
}

export function IdlePlaylistEditor({ items, onChange, disabled = false }: IdlePlaylistEditorProps) {
  const [newUrl, setNewUrl] = useState('');
  const [newType, setNewType] = useState<'image' | 'video'>('image');
  const [newDuration, setNewDuration] = useState<string>(String(DEFAULT_IMAGE_DURATION_MS));
  const [autoType, setAutoType] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const handleAdd = () => {
    setError(null);
    const url = normalizeUrl(newUrl);
    if (!isLikelyValidUrl(url)) {
      setError('URL 은 http(s):// 또는 / 로 시작해야 합니다.');
      return;
    }
    const type = autoType ? inferTypeFromUrl(url) : newType;
    let durationMs: number | undefined;
    if (type === 'image') {
      const n = Number(newDuration);
      if (!Number.isFinite(n) || n < MIN_DURATION_MS) {
        setError(`이미지 노출 시간은 ${MIN_DURATION_MS}ms 이상이어야 합니다.`);
        return;
      }
      durationMs = Math.floor(n);
    }
    const next: IdlePlaylistItem[] = [
      ...items,
      durationMs !== undefined
        ? { type, url, durationMs }
        : { type, url },
    ];
    onChange(next);
    setNewUrl('');
    setNewDuration(String(DEFAULT_IMAGE_DURATION_MS));
  };

  const handleRemove = (index: number) => {
    onChange(items.filter((_, i) => i !== index));
  };

  const handleMove = (index: number, direction: 'up' | 'down') => {
    const target = direction === 'up' ? index - 1 : index + 1;
    if (target < 0 || target >= items.length) return;
    const next = [...items];
    [next[index], next[target]] = [next[target], next[index]];
    onChange(next);
  };

  return (
    <div style={styles.container}>
      {/* Add row */}
      <div style={styles.addRow}>
        <input
          type="text"
          value={newUrl}
          onChange={(e) => {
            setNewUrl(e.target.value);
            if (autoType) setNewType(inferTypeFromUrl(e.target.value));
          }}
          placeholder="이미지 또는 영상 URL (https://... 또는 /...)"
          disabled={disabled}
          style={styles.input}
        />
        <select
          value={newType}
          onChange={(e) => {
            setNewType(e.target.value as 'image' | 'video');
            setAutoType(false);
          }}
          disabled={disabled}
          style={styles.select}
        >
          <option value="image">이미지</option>
          <option value="video">영상</option>
        </select>
        {(autoType ? inferTypeFromUrl(newUrl) : newType) === 'image' && (
          <input
            type="number"
            value={newDuration}
            onChange={(e) => setNewDuration(e.target.value)}
            min={MIN_DURATION_MS}
            step={500}
            placeholder="노출 시간 (ms)"
            disabled={disabled}
            style={styles.numberInput}
            title="이미지 노출 시간 (ms). 최소 1000."
          />
        )}
        <button
          type="button"
          onClick={handleAdd}
          disabled={disabled || newUrl.trim().length === 0}
          style={{
            ...styles.addBtn,
            opacity: disabled || newUrl.trim().length === 0 ? 0.5 : 1,
            cursor: disabled || newUrl.trim().length === 0 ? 'not-allowed' : 'pointer',
          }}
        >
          + 추가
        </button>
      </div>

      {error && <div style={styles.error}>{error}</div>}

      {/* List + Preview (responsive: wrap to stack on narrow screens) */}
      <div style={styles.splitRow}>
      <div style={styles.listCol}>
      {/* List */}
      {items.length === 0 ? (
        <div style={styles.empty}>
          등록된 idle 항목이 없습니다. 위에서 URL 을 입력해 추가하세요.
          <div style={styles.hint}>비어있어도 저장 가능 — kiosk 는 "화면을 터치해주세요" placeholder 를 표시합니다.</div>
        </div>
      ) : (
        <ul style={styles.list}>
          {items.map((item, index) => (
            <li key={`${item.type}-${index}-${item.url}`} style={styles.row}>
              <span style={styles.idx}>{index + 1}</span>
              <span style={item.type === 'video' ? styles.badgeVideo : styles.badgeImage}>
                {item.type === 'video' ? '영상' : '이미지'}
              </span>
              <span style={styles.url} title={item.url}>{item.url}</span>
              {item.type === 'image' && (
                <span style={styles.duration}>
                  {(item.durationMs ?? DEFAULT_IMAGE_DURATION_MS) / 1000}s
                </span>
              )}
              <div style={styles.actions}>
                <button
                  type="button"
                  onClick={() => handleMove(index, 'up')}
                  disabled={disabled || index === 0}
                  style={styles.iconBtn}
                  title="위로"
                  aria-label="위로 이동"
                >
                  ↑
                </button>
                <button
                  type="button"
                  onClick={() => handleMove(index, 'down')}
                  disabled={disabled || index === items.length - 1}
                  style={styles.iconBtn}
                  title="아래로"
                  aria-label="아래로 이동"
                >
                  ↓
                </button>
                <button
                  type="button"
                  onClick={() => handleRemove(index)}
                  disabled={disabled}
                  style={styles.removeBtn}
                  title="제거"
                  aria-label="제거"
                >
                  ×
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
      </div>
      <div style={styles.previewCol}>
        <IdlePlaylistPreview items={items} />
      </div>
      </div>
    </div>
  );
}

// ── IdlePlaylistPreview (internal — WO-O4O-TABLET-IDLE-PREVIEW-V1) ────────────
// 편집 보조 preview. 실제 kiosk fullscreen runtime 과 동일하지 않음 (URL/순서/타입
// 확인 목적). IdleOverlay (TabletKioskPage 내부) 는 별개 — 본 컴포넌트는 그것을
// 침범하지 않는다.
//
// 동작:
// - 빈 배열: "재생 항목이 없습니다" 안내
// - 수동 이전/다음 (autoplay 미사용 — 운영자가 직접 확인)
// - image: <img onError> 로 로딩 실패 안내
// - video: <video controls muted playsInline> + onError 안내

interface IdlePlaylistPreviewProps {
  items: IdlePlaylistItem[];
}

function IdlePlaylistPreview({ items }: IdlePlaylistPreviewProps) {
  const [previewIndex, setPreviewIndex] = useState(0);
  const [loadError, setLoadError] = useState(false);

  // items 변경 시 index 가 범위 벗어나면 0 으로 보정
  useEffect(() => {
    if (previewIndex >= items.length) {
      setPreviewIndex(0);
    }
  }, [items.length, previewIndex]);

  // 항목/index 변경 시 에러 상태 리셋
  const currentKey = useMemo(() => {
    const it = items[previewIndex];
    return it ? `${it.type}-${it.url}` : 'empty';
  }, [items, previewIndex]);
  useEffect(() => {
    setLoadError(false);
  }, [currentKey]);

  if (items.length === 0) {
    return (
      <div style={styles.previewBox}>
        <div style={styles.previewHeader}>
          <span style={styles.previewLabel}>미리보기</span>
        </div>
        <div style={styles.previewStage}>
          <span style={styles.previewEmpty}>재생 항목이 없습니다</span>
        </div>
      </div>
    );
  }

  const safeIndex = Math.min(previewIndex, items.length - 1);
  const current = items[safeIndex];

  const goPrev = () => setPreviewIndex((i) => (i - 1 + items.length) % items.length);
  const goNext = () => setPreviewIndex((i) => (i + 1) % items.length);

  return (
    <div style={styles.previewBox}>
      <div style={styles.previewHeader}>
        <span style={styles.previewLabel}>미리보기</span>
        <span style={styles.previewIdx}>
          {safeIndex + 1} / {items.length}
        </span>
      </div>
      <div style={styles.previewStage}>
        {loadError ? (
          <div style={styles.previewEmpty}>
            {current.type === 'video' ? '영상' : '이미지'} 로드 실패
            <div style={styles.previewHint}>{current.url}</div>
          </div>
        ) : current.type === 'image' ? (
          <img
            src={current.url}
            alt=""
            style={styles.previewMedia}
            onError={() => setLoadError(true)}
            draggable={false}
          />
        ) : (
          <video
            key={current.url}
            src={current.url}
            controls
            muted
            playsInline
            style={styles.previewMedia}
            onError={() => setLoadError(true)}
          />
        )}
      </div>
      <div style={styles.previewControls}>
        <button
          type="button"
          onClick={goPrev}
          disabled={items.length <= 1}
          style={styles.previewBtn}
          aria-label="이전 항목"
          title="이전"
        >
          ‹ 이전
        </button>
        <span style={styles.previewMeta}>
          <span style={current.type === 'video' ? styles.badgeVideo : styles.badgeImage}>
            {current.type === 'video' ? '영상' : '이미지'}
          </span>
          <span style={styles.previewUrl} title={current.url}>{current.url}</span>
        </span>
        <button
          type="button"
          onClick={goNext}
          disabled={items.length <= 1}
          style={styles.previewBtn}
          aria-label="다음 항목"
          title="다음"
        >
          다음 ›
        </button>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  addRow: {
    display: 'flex',
    gap: '8px',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  input: {
    flex: 1,
    minWidth: '240px',
    padding: '8px 10px',
    borderRadius: '8px',
    border: '1px solid #e2e8f0',
    fontSize: '13px',
    outline: 'none',
  },
  select: {
    padding: '8px 10px',
    borderRadius: '8px',
    border: '1px solid #e2e8f0',
    fontSize: '13px',
    backgroundColor: '#fff',
  },
  numberInput: {
    width: '110px',
    padding: '8px 10px',
    borderRadius: '8px',
    border: '1px solid #e2e8f0',
    fontSize: '13px',
    outline: 'none',
  },
  addBtn: {
    padding: '8px 14px',
    borderRadius: '8px',
    border: 'none',
    backgroundColor: '#0d9488',
    color: '#fff',
    fontSize: '13px',
    fontWeight: 600,
  },
  error: {
    padding: '8px 12px',
    borderRadius: '8px',
    border: '1px solid #fecaca',
    backgroundColor: '#fef2f2',
    color: '#991b1b',
    fontSize: '13px',
  },
  empty: {
    padding: '24px 16px',
    textAlign: 'center',
    color: '#94a3b8',
    fontSize: '13px',
    backgroundColor: '#f8fafc',
    borderRadius: '8px',
  },
  hint: {
    marginTop: '6px',
    fontSize: '12px',
    color: '#cbd5e1',
  },
  list: {
    listStyle: 'none',
    margin: 0,
    padding: 0,
    border: '1px solid #e2e8f0',
    borderRadius: '8px',
    overflow: 'hidden',
  },
  row: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '8px 12px',
    borderBottom: '1px solid #f1f5f9',
    backgroundColor: '#fff',
  },
  idx: {
    width: '20px',
    textAlign: 'right',
    fontSize: '12px',
    color: '#94a3b8',
  },
  badgeImage: {
    fontSize: '11px',
    fontWeight: 600,
    padding: '2px 8px',
    borderRadius: '4px',
    backgroundColor: '#dbeafe',
    color: '#1e40af',
  },
  badgeVideo: {
    fontSize: '11px',
    fontWeight: 600,
    padding: '2px 8px',
    borderRadius: '4px',
    backgroundColor: '#ede9fe',
    color: '#6d28d9',
  },
  url: {
    flex: 1,
    fontSize: '13px',
    color: '#334155',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  duration: {
    fontSize: '11px',
    color: '#64748b',
    fontVariantNumeric: 'tabular-nums',
  },
  actions: {
    display: 'flex',
    gap: '2px',
    flexShrink: 0,
  },
  iconBtn: {
    width: '26px',
    height: '26px',
    borderRadius: '6px',
    border: '1px solid #e2e8f0',
    backgroundColor: '#fff',
    color: '#475569',
    fontSize: '13px',
    cursor: 'pointer',
  },
  removeBtn: {
    width: '26px',
    height: '26px',
    borderRadius: '6px',
    border: '1px solid #fecaca',
    backgroundColor: '#fff',
    color: '#dc2626',
    fontSize: '14px',
    cursor: 'pointer',
    marginLeft: '4px',
  },
  // Split layout (List + Preview, responsive via flexWrap)
  splitRow: {
    display: 'flex',
    gap: '12px',
    flexWrap: 'wrap',
    alignItems: 'flex-start',
  },
  listCol: {
    flex: '1 1 320px',
    minWidth: '0',
  },
  previewCol: {
    flex: '1 1 320px',
    minWidth: '0',
  },
  // Preview sub-component
  previewBox: {
    border: '1px solid #e2e8f0',
    borderRadius: '8px',
    overflow: 'hidden',
    backgroundColor: '#fff',
    display: 'flex',
    flexDirection: 'column' as const,
  },
  previewHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '8px 12px',
    backgroundColor: '#f8fafc',
    borderBottom: '1px solid #e2e8f0',
  },
  previewLabel: {
    fontSize: '12px',
    fontWeight: 600,
    color: '#475569',
  },
  previewIdx: {
    fontSize: '11px',
    color: '#64748b',
    fontVariantNumeric: 'tabular-nums',
  },
  previewStage: {
    position: 'relative' as const,
    aspectRatio: '16 / 9',
    width: '100%',
    backgroundColor: '#0f172a',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  previewMedia: {
    maxWidth: '100%',
    maxHeight: '100%',
    objectFit: 'contain' as const,
    display: 'block',
  },
  previewEmpty: {
    color: '#94a3b8',
    fontSize: '13px',
    textAlign: 'center' as const,
    padding: '12px',
  },
  previewHint: {
    marginTop: '6px',
    fontSize: '11px',
    color: '#64748b',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap' as const,
    maxWidth: '260px',
  },
  previewControls: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '8px 12px',
    borderTop: '1px solid #f1f5f9',
  },
  previewBtn: {
    padding: '6px 10px',
    borderRadius: '6px',
    border: '1px solid #e2e8f0',
    backgroundColor: '#fff',
    color: '#475569',
    fontSize: '12px',
    fontWeight: 600,
    cursor: 'pointer',
    flexShrink: 0,
  },
  previewMeta: {
    flex: 1,
    minWidth: 0,
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  },
  previewUrl: {
    flex: 1,
    fontSize: '11px',
    color: '#64748b',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap' as const,
    minWidth: 0,
  },
};

export default IdlePlaylistEditor;
