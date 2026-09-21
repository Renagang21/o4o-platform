import { useState } from 'react';
import { useUnifiedStore } from '../contexts/StoreContext';

const MODE_LABEL: Record<string, string> = {
  standard: '표준 업무공간',
  special: '전용 업무공간',
  none: '업무공간 없음',
  undecided: '미정',
};

/**
 * 내 서비스(§3-⑥) — 현재 매장의 enrollments 표시 + 화면 안의 선택 상태만. 클릭해도 handoff 하지 않는다.
 * 같은 Workspace 안에서 service filter/context 를 실제로 바꾸는 동작은 WO B.
 */
export default function MyServicesPage() {
  const { organizationName, services } = useUnifiedStore();
  const [selectedServiceKey, setSelectedServiceKey] = useState<string | null>(null);
  return <main className="page"><section className="hero">
    <span className="eyebrow">{organizationName}</span>
    <h1>내 서비스</h1>
    <p className="muted">이 매장이 가입한 서비스입니다. 선택은 이 화면 안의 상태이며, 서비스별 업무 화면은 다음 단계(WO B)에서 연결됩니다.</p>
    {services.length === 0 && <p data-testid="my-services-empty">가입된 서비스가 없습니다.</p>}
    <ul className="option-list" data-testid="my-services">
      {services.map((s) => {
        const enterable = s.enrollmentStatus === 'active' && s.workspaceAvailable;
        const selected = selectedServiceKey === s.serviceKey;
        return <li key={s.serviceKey}>
          <button
            type="button"
            className={`option${selected ? ' selected' : ''}${enterable ? '' : ' unavailable'}`}
            aria-pressed={selected}
            onClick={() => setSelectedServiceKey(selected ? null : s.serviceKey)}
          >
            <span className="option-name">{s.serviceName}</span>
            <span className="option-meta">
              {s.enrollmentStatus === 'active' ? '이용 중' : '비활성'} · {MODE_LABEL[s.workspaceMode] ?? s.workspaceMode}
              {enterable ? '' : ' · 업무공간 제공 전'}
            </span>
          </button>
        </li>;
      })}
    </ul>
  </section></main>;
}
