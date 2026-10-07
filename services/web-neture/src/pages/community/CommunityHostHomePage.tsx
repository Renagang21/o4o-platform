/**
 * community.neture.co.kr `/` — 커뮤니티 진입 (CHECK-O4O-URL-FIRST-CENSUS-V1 §21-10)
 *
 * 약사 커뮤니티로 들어가는 주소 진입점이다. 현재 커뮤니티 활동(포럼)은 각 서비스
 * 앱이 제공하므로 `/pharmacist` 는 그 포럼으로 이어진다(HostBoundary).
 * 소매업소 커뮤니티(`/retail` → retail.neture.co.kr)는 K-Cosmetics 공개 서비스 종료로 제거했다 — WO-O4O-KCOSMETICS-RETIREMENT-PHASE1A-WEB-APP-AND-DEPLOY-TARGET-V1.
 * 커뮤니티별 독립 가입 · 승인은 아직 없다 — 이 화면은 그 기능을 대신하지 않는다.
 *
 * WO-O4O-CROSS-SERVICE-PUBLIC-DESIGN-AND-BRAND-REFRESH-V1: 상단을 공통 O4OPublicHero(확정 문구)로.
 *   주 CTA 는 실제로 동작하는 커뮤니티(`/pharmacist`) 하나뿐이다 — 없는 커뮤니티를 만들지 않는다.
 */
import { Link } from 'react-router-dom';
import { O4OPublicHero } from '@o4o/auth-react';
import { COMMUNITY_HERO } from '../../config/publicHero';

const COMMUNITIES = [
  { path: '/pharmacist', title: '약사 커뮤니티', desc: '약사 회원이 함께 쓰는 포럼과 자료' },
];

export default function CommunityHostHomePage() {
  const primary = COMMUNITIES[0];
  return (
    <O4OPublicHero
      eyebrow={COMMUNITY_HERO.eyebrow}
      title={COMMUNITY_HERO.title}
      description={COMMUNITY_HERO.description}
      accent={COMMUNITY_HERO.accent}
      actions={
        <Link to={primary.path} className="o4o-cta" data-testid="community-hero-primary">
          {primary.title} 들어가기
        </Link>
      }
    >
      <h2 className="text-sm font-semibold text-slate-500">참여할 수 있는 커뮤니티</h2>
      <ul className="mt-3 divide-y divide-slate-100 border-y border-slate-100">
        {COMMUNITIES.map((c) => (
          <li key={c.path}>
            <Link to={c.path} className="flex items-center justify-between gap-4 py-4 hover:text-slate-900">
              <span>
                <span className="block text-base font-semibold text-slate-900">{c.title}</span>
                <span className="mt-0.5 block text-sm text-slate-600">{c.desc}</span>
              </span>
              <span aria-hidden="true" className="text-slate-400">→</span>
            </Link>
          </li>
        ))}
      </ul>
    </O4OPublicHero>
  );
}
