/**
 * IdlePlaylistEditor — Lightweight editor for tablet idle playlist
 *
 * WO-O4O-TABLET-IDLE-PLAYLIST-EDITOR-V1
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
 *
 * 외부 의존성: react 만 (lucide-react 등 추가 의존성 없음 — inline SVG 사용)
 *
 * 사용:
 *   <IdlePlaylistEditor items={items} onChange={setItems} />
 *
 * 저장은 부모 컴포넌트가 별도 버튼/API 로 수행.
 */

import { useState } from 'react';
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
};

export default IdlePlaylistEditor;
