import { Link } from 'react-router-dom';
import { PLATFORM_ORIGIN, WORKSPACE_PATHS } from '../config/workspace';
import { useUnifiedStore } from '../contexts/StoreContext';

/**
 * 설정(§3-⑥ 상위 nav 6 중 하나) — Workspace 수준 설정 진입점.
 * 매장 정보는 내 매장(/store/info)의 canonical 화면을 재사용한다(중복 화면 0). 계정·약관은 대표 도메인 정본.
 */
export default function SettingsPage() {
  const { organizationName, stores } = useUnifiedStore();
  return <main className="page"><section className="hero">
    <span className="eyebrow">{organizationName}</span>
    <h1>설정</h1>
    <ul className="option-list" data-testid="settings-list">
      <li><Link className="option" to={`${WORKSPACE_PATHS.myStore}/info`}><span className="option-name">매장 정보</span><span className="option-meta">매장명 · 주소 · 연락처 · 공개 slug</span></Link></li>
      {stores.length > 1 && <li><Link className="option" to={WORKSPACE_PATHS.select}><span className="option-name">매장 전환</span><span className="option-meta">접근 가능한 매장 {stores.length}개</span></Link></li>}
      <li><a className="option" href={PLATFORM_ORIGIN}><span className="option-name">계정 · 약관</span><span className="option-meta">neture.co.kr 에서 관리</span></a></li>
    </ul>
  </section></main>;
}
