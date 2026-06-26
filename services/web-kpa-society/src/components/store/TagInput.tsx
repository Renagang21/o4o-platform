/**
 * TagInput — 콘텐츠 태그 입력 (chip 기반)
 *
 * WO-O4O-KPA-CONTENT-LIST-TAG-FIELD-AND-DISPLAY-V1
 *
 * 매장 직접 작성 콘텐츠의 태그 입력에 공용으로 사용 (작성 모달 + 편집 페이지).
 * Enter 또는 쉼표(,)로 태그 확정, Backspace(입력 비었을 때)로 마지막 태그 제거,
 * 쉼표 포함 paste 분해. 정규화(trim/빈값 제거/중복 제거/길이·개수 제한)는 입력 시점에 수행.
 *
 * 태그 검색/필터는 본 컴포넌트 범위가 아니다(후속 WO).
 */
import { useState, type CSSProperties, type KeyboardEvent, type ClipboardEvent } from 'react';
import { X } from 'lucide-react';

const TAG_MAX_COUNT = 20;
const TAG_MAX_LEN = 30;

export function normalizeTagList(input: string[]): string[] {
  return Array.from(
    new Set(
      input
        .map((v) => (typeof v === 'string' ? v.trim() : ''))
        .filter(Boolean)
        .map((v) => v.slice(0, TAG_MAX_LEN)),
    ),
  ).slice(0, TAG_MAX_COUNT);
}

interface TagInputProps {
  tags: string[];
  onChange: (tags: string[]) => void;
  placeholder?: string;
  disabled?: boolean;
  id?: string;
}

export function TagInput({ tags, onChange, placeholder, disabled, id }: TagInputProps) {
  const [draft, setDraft] = useState('');

  const commit = (raw: string) => {
    const parts = raw.split(',');
    const next = normalizeTagList([...tags, ...parts]);
    if (next.length !== tags.length || next.some((t, i) => t !== tags[i])) {
      onChange(next);
    }
    setDraft('');
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (disabled) return;
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      if (draft.trim()) commit(draft);
    } else if (e.key === 'Backspace' && draft === '' && tags.length > 0) {
      onChange(tags.slice(0, -1));
    }
  };

  const handlePaste = (e: ClipboardEvent<HTMLInputElement>) => {
    const text = e.clipboardData.getData('text');
    if (text.includes(',')) {
      e.preventDefault();
      commit((draft ? draft + ',' : '') + text);
    }
  };

  const removeTag = (t: string) => onChange(tags.filter((x) => x !== t));

  return (
    <div style={{ ...styles.wrap, ...(disabled ? styles.wrapDisabled : null) }}>
      {tags.map((tag) => (
        <span key={tag} style={styles.chip}>
          {tag}
          {!disabled && (
            <button type="button" onClick={() => removeTag(tag)} style={styles.chipRemove} aria-label={`${tag} 태그 제거`}>
              <X size={11} />
            </button>
          )}
        </span>
      ))}
      <input
        id={id}
        type="text"
        value={draft}
        disabled={disabled}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={handleKeyDown}
        onPaste={handlePaste}
        onBlur={() => draft.trim() && commit(draft)}
        placeholder={tags.length === 0 ? placeholder || '태그 입력 후 Enter (쉼표로 구분)' : ''}
        style={styles.input}
      />
    </div>
  );
}

const styles: Record<string, CSSProperties> = {
  wrap: {
    display: 'flex',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 6,
    padding: '6px 8px',
    border: '1px solid #D1D5DB',
    borderRadius: 8,
    background: '#fff',
    minHeight: 40,
  },
  wrapDisabled: { background: '#F3F4F6', cursor: 'not-allowed' },
  chip: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 4,
    padding: '2px 8px',
    fontSize: 12,
    fontWeight: 500,
    background: '#EFF6FF',
    color: '#1D4ED8',
    border: '1px solid #BFDBFE',
    borderRadius: 999,
  },
  chipRemove: {
    display: 'inline-flex',
    alignItems: 'center',
    border: 'none',
    background: 'transparent',
    color: '#1D4ED8',
    cursor: 'pointer',
    padding: 0,
  },
  input: {
    flex: 1,
    minWidth: 120,
    border: 'none',
    outline: 'none',
    fontSize: 13,
    padding: '2px 0',
    background: 'transparent',
  },
};
