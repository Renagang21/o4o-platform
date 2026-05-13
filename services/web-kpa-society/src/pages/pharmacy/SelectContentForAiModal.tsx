/**
 * SelectContentForAiModal — 내 자료함 콘텐츠 단일 선택 (AI 브리지용)
 *
 * WO-O4O-STORE-PRODUCTION-MATERIALS-CONTENT-AI-BRIDGE-V1
 *
 * storeLibraryApi.listContents() 를 사용해 내 자료함 문서형 콘텐츠 목록을 보여주고
 * 단일 항목을 선택하면 onSelect 를 호출한다. 선택된 콘텐츠는 부모에서
 * composeSourceTextFromContent() → AiContentModal(initialText=...) 흐름으로 연결된다.
 *
 * 최소 기능: 검색 + 제목 표시 + 콘텐츠 유형 표시 + 단일 선택
 */

import { useEffect, useState, useMemo, type CSSProperties } from 'react';
import { X, Search, BookOpen, FileText } from 'lucide-react';
import { storeLibraryApi, type LibraryContentItem } from '../../api/assetSnapshot';
import { colors } from '../../styles/theme';

const FETCH_LIMIT = 50;

const ORIGIN_LABEL: Record<string, string> = {
  direct: '직접 작성',
  snapshot: '커뮤니티',
};

interface Props {
  open: boolean;
  onClose: () => void;
  onSelect: (item: LibraryContentItem) => void;
}

export function SelectContentForAiModal({ open, onClose, onSelect }: Props) {
  const [items, setItems] = useState<LibraryContentItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      setItems([]);
      setSearch('');
      setSelectedId(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    storeLibraryApi
      .listContents({ type: 'document', limit: FETCH_LIMIT })
      .then((res) => {
        if (cancelled) return;
        setItems(res?.data?.items ?? []);
      })
      .catch(() => {
        if (!cancelled) setItems([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return items;
    return items.filter((it) => it.title.toLowerCase().includes(q));
  }, [items, search]);

  const selectedItem = items.find((it) => it.id === selectedId) ?? null;

  const handleConfirm = () => {
    if (!selectedItem) return;
    onSelect(selectedItem);
    onClose();
  };

  if (!open) return null;

  return (
    <div style={styles.backdrop} role="presentation" onClick={onClose}>
      <div style={styles.modal} onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
        <header style={styles.header}>
          <div style={styles.headerLeft}>
            <h2 style={styles.title}>콘텐츠 선택</h2>
            <span style={styles.hint}>AI 입력에 사용할 내 자료함 콘텐츠를 선택하세요</span>
          </div>
          <button type="button" onClick={onClose} style={styles.closeBtn} aria-label="닫기">
            <X size={16} />
          </button>
        </header>

        <div style={styles.searchWrap}>
          <Search size={14} style={styles.searchIcon} />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="제목 검색"
            style={styles.searchInput}
          />
        </div>

        <div style={styles.body}>
          {loading ? (
            <div style={styles.empty}>불러오는 중...</div>
          ) : filtered.length === 0 ? (
            <div style={styles.empty}>
              {items.length === 0
                ? '내 자료함에 콘텐츠가 없습니다.'
                : '검색 결과가 없습니다'}
            </div>
          ) : (
            <ul style={styles.list}>
              {filtered.map((it) => {
                const isSelected = selectedId === it.id;
                const OriginIcon = it.origin === 'direct' ? FileText : BookOpen;
                return (
                  <li key={it.id}>
                    <label
                      style={{
                        ...styles.listItem,
                        borderColor: isSelected ? colors.primary : colors.neutral200,
                        background: isSelected ? '#EFF6FF' : colors.white,
                      }}
                    >
                      <input
                        type="radio"
                        name="select-content-for-ai"
                        checked={isSelected}
                        onChange={() => setSelectedId(it.id)}
                        style={{ display: 'none' }}
                      />
                      <OriginIcon
                        size={14}
                        style={{
                          color: it.origin === 'direct' ? colors.accentGreen : colors.primary,
                          flexShrink: 0,
                        }}
                      />
                      <div style={styles.itemMain}>
                        <span style={styles.itemTitle} title={it.title}>{it.title}</span>
                        <span style={styles.itemMeta}>{ORIGIN_LABEL[it.origin] ?? it.origin}</span>
                      </div>
                      {isSelected && (
                        <span style={styles.selectedMark}>✓</span>
                      )}
                    </label>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <footer style={styles.footer}>
          <button type="button" onClick={onClose} style={styles.cancelBtn}>취소</button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={!selectedItem}
            style={{ ...styles.confirmBtn, opacity: selectedItem ? 1 : 0.5 }}
          >
            선택 완료 →
          </button>
        </footer>
      </div>
    </div>
  );
}

// ─── composeSourceTextFromContent ─────────────────────────────────────────────

/**
 * 내 자료함 콘텐츠 → AI 입력용 텍스트 변환.
 *
 * WO-O4O-STORE-PRODUCTION-MATERIALS-CONTENT-AI-BRIDGE-V1
 *
 * 권장 시작 문구: "다음 콘텐츠를 참고하여 매장 제작 자료 형태로 정리해 주세요."
 * 포함 항목: title / summary / body text 일부 / source metadata
 * CreateContentFromResourcesModal.composeSourceText() 패턴 참고.
 */
export function composeSourceTextFromContent(item: LibraryContentItem): string {
  const lines: string[] = [
    '다음 콘텐츠를 참고하여 매장 제작 자료 형태로 정리해 주세요.',
    '',
    `제목: ${item.title}`,
  ];

  const cj = item.contentJson as Record<string, unknown>;

  // summary / description
  const summary = typeof cj?.summary === 'string' ? cj.summary.trim() : '';
  const description = typeof cj?.description === 'string' ? cj.description.trim() : '';
  if (summary) lines.push(`요약: ${summary}`);
  else if (description) lines.push(`설명: ${description}`);

  // author
  const authorName = typeof cj?.authorName === 'string' ? cj.authorName.trim() : '';
  if (authorName) lines.push(`작성자: ${authorName}`);

  // body text — HTML → plain text (최대 1500자)
  const bodyHtml =
    typeof cj?.html === 'string'
      ? cj.html
      : typeof cj?.body === 'string'
      ? cj.body
      : '';
  if (bodyHtml) {
    const plainText = bodyHtml
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 1500);
    if (plainText) {
      lines.push('');
      lines.push('본문 내용:');
      lines.push(plainText);
    }
  }

  // source metadata
  lines.push('');
  const originLabel = item.origin === 'direct' ? '매장 직접 작성' : '커뮤니티 콘텐츠';
  lines.push(`출처: ${originLabel}`);
  const sourceUrl = typeof cj?.sourceUrl === 'string' ? cj.sourceUrl.trim() : '';
  if (sourceUrl) lines.push(`원본 URL: ${sourceUrl}`);

  return lines.join('\n').trim();
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles: Record<string, CSSProperties> = {
  backdrop: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(15, 23, 42, 0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1100,
    padding: 16,
  },
  modal: {
    width: '100%',
    maxWidth: 600,
    maxHeight: '80vh',
    background: colors.white,
    borderRadius: 12,
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    boxShadow: '0 20px 50px rgba(15, 23, 42, 0.2)',
  },
  header: {
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    padding: '16px 18px 12px',
    borderBottom: `1px solid ${colors.neutral200}`,
  },
  headerLeft: {
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
  },
  title: {
    margin: 0,
    fontSize: 15,
    fontWeight: 600,
    color: colors.neutral800,
  },
  hint: {
    fontSize: 12,
    color: colors.neutral500,
  },
  closeBtn: {
    width: 28,
    height: 28,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'transparent',
    border: 'none',
    color: colors.neutral500,
    cursor: 'pointer',
    borderRadius: 6,
    flexShrink: 0,
  },
  searchWrap: {
    position: 'relative',
    padding: '12px 18px',
    borderBottom: `1px solid ${colors.neutral200}`,
  },
  searchIcon: {
    position: 'absolute',
    left: 30,
    top: '50%',
    transform: 'translateY(-50%)',
    color: colors.neutral400,
    pointerEvents: 'none',
  },
  searchInput: {
    width: '100%',
    padding: '8px 12px 8px 30px',
    border: `1px solid ${colors.neutral300}`,
    borderRadius: 6,
    fontSize: 13,
    outline: 'none',
    background: colors.white,
    boxSizing: 'border-box',
  },
  body: {
    flex: 1,
    overflowY: 'auto',
    padding: '12px 18px',
  },
  empty: {
    padding: '40px 16px',
    textAlign: 'center',
    color: colors.neutral400,
    fontSize: 13,
  },
  list: {
    listStyle: 'none',
    margin: 0,
    padding: 0,
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
  },
  listItem: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: '10px 12px',
    border: `1px solid`,
    borderRadius: 8,
    cursor: 'pointer',
    transition: 'background 0.1s, border-color 0.1s',
  },
  itemMain: {
    flex: 1,
    minWidth: 0,
    display: 'flex',
    flexDirection: 'column',
    gap: 2,
  },
  itemTitle: {
    fontSize: 13,
    fontWeight: 500,
    color: colors.neutral800,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  itemMeta: {
    fontSize: 11,
    color: colors.neutral400,
  },
  selectedMark: {
    fontSize: 13,
    color: colors.primary,
    fontWeight: 700,
    flexShrink: 0,
  },
  footer: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 8,
    padding: '12px 18px',
    borderTop: `1px solid ${colors.neutral200}`,
    background: colors.neutral100,
  },
  cancelBtn: {
    padding: '8px 14px',
    border: `1px solid ${colors.neutral300}`,
    borderRadius: 6,
    background: colors.white,
    color: colors.neutral700,
    fontSize: 13,
    fontWeight: 500,
    cursor: 'pointer',
  },
  confirmBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    padding: '8px 14px',
    border: 'none',
    borderRadius: 6,
    background: colors.primary,
    color: colors.white,
    fontSize: 13,
    fontWeight: 500,
    cursor: 'pointer',
  },
};
