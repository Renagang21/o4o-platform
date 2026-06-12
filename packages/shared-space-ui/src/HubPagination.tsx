/**
 * HubPagination — O4O HUB 공통 페이지네이션 UI
 *
 * WO-HUB-PAGINATION-EXTRACT-V1
 *
 * 모든 데이터 목록형 HUB 템플릿(Content, Resources, LMS, Signage)이 공유하는
 * 페이지네이션 프레젠테이션 컴포넌트.
 *
 * 역할 분리:
 *   HubPagination — UI 렌더링 + onPageChange 이벤트 전달
 *   템플릿/서비스 — totalPages 계산, fetch 호출, URL query 반영, page reset
 */

export interface HubPaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  /** 페이지 정보 텍스트 표시 여부 (기본 true) */
  showPageInfo?: boolean;
  disabled?: boolean;
  /**
   * WO-O4O-FORUM-LIST-PAGINATION-UNIFY-V1
   * 처음/마지막(« ») 버튼 표시 (기본 false — 기존 HUB 소비처 무변경).
   */
  showFirstLast?: boolean;
  /**
   * WO-O4O-FORUM-LIST-PAGINATION-UNIFY-V1
   * 현재 페이지 강조 색 (CSS color, 예: 'var(--color-primary)'). 미지정 시 기본 파랑(#2563EB) 유지.
   */
  accentColor?: string;
  /**
   * WO-O4O-FORUM-LIST-PAGINATION-UNIFY-V1
   * 정렬: 'between'(기본 — 페이지정보 좌/버튼 우, HUB 푸터) | 'center'(가운데 정렬).
   */
  align?: 'between' | 'center';
  /**
   * WO-O4O-FORUM-LIST-PAGINATION-UNIFY-V1
   * 상단 구분선 표시 (기본 true — 기존 HUB 소비처 무변경).
   */
  bordered?: boolean;
}

export function HubPagination({
  currentPage,
  totalPages,
  onPageChange,
  showPageInfo = true,
  disabled = false,
  showFirstLast = false,
  accentColor,
  align = 'between',
  bordered = true,
}: HubPaginationProps) {
  if (totalPages <= 1) return null;

  const pages = buildPageNumbers(currentPage, totalPages);

  const wrapperStyle: React.CSSProperties = {
    ...st.wrapper,
    ...(align === 'center' ? { justifyContent: 'center' } : {}),
    ...(bordered ? {} : { borderTop: 'none' }),
  };

  return (
    <div style={wrapperStyle}>
      {showPageInfo && (
        <span style={st.pageInfo}>{currentPage} / {totalPages} 페이지</span>
      )}
      <div style={st.buttons}>
        {showFirstLast && (
          <PgButton
            onClick={() => onPageChange(1)}
            disabled={disabled || currentPage === 1}
            ariaLabel="처음 페이지"
          >
            &laquo;
          </PgButton>
        )}
        <PgButton
          onClick={() => onPageChange(Math.max(1, currentPage - 1))}
          disabled={disabled || currentPage === 1}
          ariaLabel="이전 페이지"
        >
          &lsaquo;
        </PgButton>
        {pages.map(p => (
          <PgButton
            key={p}
            onClick={() => onPageChange(p)}
            active={p === currentPage}
            accentColor={accentColor}
            disabled={disabled}
          >
            {p}
          </PgButton>
        ))}
        <PgButton
          onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
          disabled={disabled || currentPage === totalPages}
          ariaLabel="다음 페이지"
        >
          &rsaquo;
        </PgButton>
        {showFirstLast && (
          <PgButton
            onClick={() => onPageChange(totalPages)}
            disabled={disabled || currentPage === totalPages}
            ariaLabel="마지막 페이지"
          >
            &raquo;
          </PgButton>
        )}
      </div>
    </div>
  );
}

// ─── Internal ────────────────────────────────────────────────────────────────

function PgButton({ onClick, disabled, active, accentColor, ariaLabel, children }: {
  onClick: () => void;
  disabled?: boolean;
  active?: boolean;
  accentColor?: string;
  ariaLabel?: string;
  children: React.ReactNode;
}) {
  const activeStyle: React.CSSProperties = active
    ? (accentColor
        ? { backgroundColor: accentColor, color: WHITE, borderColor: accentColor }
        : st.btnActive)
    : {};
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      aria-label={ariaLabel}
      style={{
        ...st.btn,
        ...activeStyle,
        ...(disabled ? st.btnDisabled : {}),
      }}
    >
      {children}
    </button>
  );
}

function buildPageNumbers(current: number, total: number): number[] {
  const maxVisible = 5;
  let start = Math.max(1, current - Math.floor(maxVisible / 2));
  const end = Math.min(total, start + maxVisible - 1);
  if (end - start + 1 < maxVisible) start = Math.max(1, end - maxVisible + 1);
  const pages: number[] = [];
  for (let i = start; i <= end; i++) pages.push(i);
  return pages;
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const PRIMARY = '#2563EB';
const WHITE = '#FFFFFF';
const NEUTRAL100 = '#F1F5F9';
const NEUTRAL200 = '#E2E8F0';
const NEUTRAL300 = '#CBD5E1';
const NEUTRAL400 = '#94A3B8';
const NEUTRAL700 = '#334155';

const st: Record<string, React.CSSProperties> = {
  wrapper: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '12px 20px',
    borderTop: `1px solid ${NEUTRAL100}`,
  },
  pageInfo: { fontSize: '12px', color: NEUTRAL400 },
  buttons: { display: 'flex', alignItems: 'center', gap: '4px' },
  btn: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: '32px',
    height: '32px',
    padding: '0 6px',
    fontSize: '13px',
    fontWeight: 500,
    color: NEUTRAL700,
    backgroundColor: WHITE,
    border: `1px solid ${NEUTRAL200}`,
    borderRadius: '6px',
    cursor: 'pointer',
  } as React.CSSProperties,
  btnActive: {
    backgroundColor: PRIMARY,
    color: WHITE,
    borderColor: PRIMARY,
  },
  btnDisabled: {
    color: NEUTRAL300,
    cursor: 'default',
    opacity: 0.5,
  },
};

export default HubPagination;
