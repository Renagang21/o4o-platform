/**
 * HomePage — Pharmacy-Hub Foundation
 *
 * WO-PHARMACY-HUB-NEW-SERVICE-FOUNDATION-V1
 *
 * 역할별 진입점 3개(약국 경영자 / 공급자 / 서비스 운영자)와 로그인 진입점만 노출한다.
 * 실제 기능(카탈로그·주문·콘텐츠·커뮤니티)은 후속 WO.
 */

import { Link } from 'react-router-dom';
import { BRAND, ROLES, ROLE_LABELS } from '../config/service';
import { useAuth } from '../contexts/AuthContext';
import { getServiceMembershipStatus } from '../lib/membershipGate';

const ENTRIES = [
  { to: '/store-owner', role: ROLES.storeOwner, desc: '매장 운영·공급 상품 확인 (준비 중)' },
  { to: '/supplier', role: ROLES.supplier, desc: '공급 상품·자료 제공 (준비 중)' },
  { to: '/operator', role: ROLES.operator, desc: '가입 신청 승인·회원 관리 (커뮤니티는 준비 중)' },
];

export default function HomePage() {
  const { user, isAuthenticated } = useAuth();
  const status = getServiceMembershipStatus(user);

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <header className="mb-8">
        <h1 className="text-2xl font-bold">
          {BRAND.name} <span className="text-gray-500">{BRAND.nameKo}</span>
        </h1>
        <p className="mt-1 text-sm text-gray-600">{BRAND.tagline}</p>
        <p className="mt-1 text-xs text-gray-400">{BRAND.domain}</p>
      </header>

      <section className="mb-8 rounded-lg border border-gray-200 bg-white p-4 text-sm">
        {isAuthenticated ? (
          <p>
            로그인 상태 · 서비스 가입 상태: <strong>{status}</strong>
            {status !== 'active' && (
              <>
                {' · '}
                <Link to="/join/status" className="text-primary-600 underline">
                  신청 상태 확인
                </Link>
              </>
            )}
          </p>
        ) : (
          <p>
            <Link to="/login" className="text-primary-600 underline">
              로그인
            </Link>
            {' '}후 이용할 수 있습니다. 아직 회원이 아니라면{' '}
            <Link to="/join" className="text-primary-600 underline">
              가입 신청
            </Link>
            을 진행해 주세요.
          </p>
        )}
      </section>

      <section>
        <h2 className="mb-3 text-sm font-semibold text-gray-700">역할별 진입점</h2>
        <ul className="grid gap-3 sm:grid-cols-3">
          {ENTRIES.map((e) => (
            <li key={e.to} className="rounded-lg border border-gray-200 bg-white p-4">
              <Link to={e.to} className="font-medium text-primary-700">
                {ROLE_LABELS[e.role]}
              </Link>
              <p className="mt-1 text-xs text-gray-500">{e.desc}</p>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
