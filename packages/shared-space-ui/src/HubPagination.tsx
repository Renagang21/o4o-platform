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
}

export function HubPagination({
  currentPage,
  totalPages,
  onPageChange,
  showPageInfo = true,
  disabled = false,
}: HubPaginationProps) {
  if (totalPages <= 1) return null;

  const pages = buildPageNumbers(currentPage, totalPages);

  return (
    <div style={st.wrapper}>
      {showPageInfo && (
        <span style={st.pageInfo}>{currentPage} / {totalPages} 페이지</span>
      )}
      <div style={st.buttons}>
        <PgButton
          onClick={() => onPageChange(Math.max(1, currentPage - 1))}
          disabled={disabled || currentPage === 1}
        >
          &lsaquo;
        </PgButton>
        {pages.map(p => (
          <PgButton
            key={p}
            onClick={() => onPageChange(p)}
            active={p === currentPage}
            disabled={disabled}
          >
            {p}
          </PgButton>
        ))}
        <PgButton
          onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
          disabled={disabled || currentPage === totalPages}
        >
          &rsaquo;
        </PgButton>
      </div>
    </div>
  );
}

// ─── Internal ────────────────────────────────────────────────────────────────

function PgButton({ onClick, disabled, active, children }: {
  onClick: () => void; disabled?: boolean; active?: boolean; children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        ...st.btn,
        ...(active ? st.btnActive : {}),
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
