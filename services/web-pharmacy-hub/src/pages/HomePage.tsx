/**
 * HomePage — Pharmacy-Hub Foundation
 *
 * WO-PHARMACY-HUB-NEW-SERVICE-FOUNDATION-V1
 *
 * 역할별 진입점 3개(약국 경영자 / 공급자 / 서비스 운영자)와 로그인·커뮤니티 진입점을 노출한다.
 *
 * WO-O4O-OPERATOR-CROSSSERVICE-PRODUCTION-INTEGRATION-AND-REAL-USAGE-E2E-V1:
 *   진입점 설명이 "(준비 중)" 으로 남아 있었으나 세 영역 모두 실제 화면이 있다
 *   (매장 경영 셸 20+ 화면 · 공급자 상품 제공 설정 · 운영자 대시보드/가입 승인).
 *   커뮤니티도 /forum 으로 구현되어 별도 섹션에 있다. 설명을 실제 기능으로 정정한다.
 */

import { Link } from 'react-router-dom';
import { BRAND, ROLES, ROLE_LABELS } from '../config/service';
import { useAuth } from '../contexts/AuthContext';
import { getServiceMembershipStatus } from '../lib/membershipGate';

const ENTRIES = [
  { to: '/store-owner', role: ROLES.storeOwner, desc: '공급 상품 주문 · 매장 콘텐츠 · 실행 자산(QR·POP·사이니지)' },
  { to: '/supplier', role: ROLES.supplier, desc: '내 상품 Pharmacy-Hub 제공 설정' },
  { to: '/operator', role: ROLES.operator, desc: '가입 신청 승인·반려' },
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

      <section className="mb-8 rounded-lg border border-primary-100 bg-white p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="font-semibold text-gray-900">커뮤니티</h2>
            <p className="mt-1 text-sm text-gray-600">
              PharmacyHub 회원끼리 정보를 나누는 공간입니다.
            </p>
          </div>
          <Link
            to="/forum"
            className="shrink-0 rounded bg-primary-600 px-4 py-2 text-sm font-medium text-white"
          >
            커뮤니티 보기
          </Link>
        </div>
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
