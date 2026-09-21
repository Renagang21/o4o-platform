import { useUnifiedStore } from '../contexts/StoreContext';

/** 기능 없는 canonical 경로 공통 안내 1개(§3-⑥). 하위 메뉴 · 기능 이전은 WO B — 여기서 메뉴 합집합을 만들지 않는다. */
export default function PlaceholderPage({ title }: { title: string }) {
  const { organizationName } = useUnifiedStore();
  return <main className="center-card"><section className="card" data-testid="placeholder">
    <span className="eyebrow">{organizationName}</span>
    <h1>{title}</h1>
    <p>준비 중입니다. 이 영역의 매장 기능은 기존 서비스의 내 매장 화면에서 계속 이용할 수 있으며, 다음 단계에서 이곳으로 옮겨집니다.</p>
  </section></main>;
}
