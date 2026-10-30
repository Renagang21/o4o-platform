import { useLocation, useNavigate } from 'react-router-dom';
import { WORKSPACE_PATHS } from '../config/workspace';
import { useUnifiedStore } from '../contexts/StoreContext';
import { readReturnTo } from '../lib/returnTo';

const ROLE_LABEL: Record<string, string> = { owner: '경영자', admin: '관리자', manager: '매니저' };

/** Store Selector(§3-③) — 접근 가능한 매장이 2개 이상일 때. 선택값은 sessionStorage 에만 둔다(DB 저장 0). */
export default function StoreSelectorPage() {
  const { stores, organizationId, selectStore, error } = useUnifiedStore();
  const navigate = useNavigate();
  const search = useLocation().search;
  const returnTo = readReturnTo(search);
  const requested = new URLSearchParams(search).get('store');
  const matching = requested ? stores.find(store => store.organizationId === requested) : undefined;
  const choices = requested ? (matching ? [matching] : []) : stores;
  const resetPath = WORKSPACE_PATHS.select + (returnTo ? `?returnTo=${encodeURIComponent(returnTo)}` : '');
  return <main className="center-card"><section className="card" data-testid="store-selector">
    <h1>매장 선택</h1>
    <p>이 계정으로 접근할 수 있는 매장이 {stores.length}개 있습니다. 업무를 볼 매장을 선택해 주세요.</p>
    {error && <p className="error">{error}</p>}
    {requested && <p role={matching ? 'status' : 'alert'}>{matching ? `협업체에서 선택한 약국: ${matching.organizationName || '이름 없는 매장'}. 이 약국으로 계속할지 확인해 주세요.` : '요청한 약국에 접근할 수 없습니다. 다른 약국으로 자동 전환하지 않았습니다.'}</p>}
    {requested && <button type="button" onClick={() => navigate(resetPath, { replace: true })}>직접 다른 약국 선택</button>}
    <ul className="option-list">
      {choices.map((s) => (
        <li key={s.organizationId}>
          <button
            type="button"
            className={`option${s.organizationId === organizationId ? ' selected' : ''}`}
            onClick={() => { selectStore(s.organizationId); navigate(returnTo ?? WORKSPACE_PATHS.home, { replace: true }); }}
          >
            <span className="option-name">{s.organizationName || '이름 없는 매장'}</span>
            <span className="option-meta">{ROLE_LABEL[s.memberRole] ?? s.memberRole}</span>
          </button>
        </li>
      ))}
    </ul>
    <p className="muted">선택한 매장은 이 브라우저 탭에서만 기억되며, 상단 <strong>내 매장: ○○ ▼</strong> 에서 언제든 바꿀 수 있습니다.</p>
  </section></main>;
}
