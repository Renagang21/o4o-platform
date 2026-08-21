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
 *
 * WO-O4O-CROSSSERVICE-HEADER-MENU-FOOTER-UI-COMPLETION-V1:
 *   PublicLayout(공통 GlobalHeader + 푸터) 안에서 렌더된다. 헤더가 이미 브랜드명·서비스명을
 *   표시하므로 페이지 상단의 중복 브랜드 블록을 히어로(가치 제안)로 정리한다.
 */

import { Link } from 'react-router-dom';
import { BRAND, ROLES, ROLE_LABELS } from '../config/service';
import { useAuth } from '../contexts/AuthContext';
import { getServiceMembershipStatus } from '../lib/membershipGate';

const ENTRIES = [
  { to: '/store-owner', role: ROLES.storeOwner, desc: '공급 상품 주문 · 매장 콘텐츠 · 실행 자산(QR·POP·사이니지)' },
  { to: '/operator', role: ROLES.operator, desc: '가입·회원 운영 · 커뮤니티(포럼) 운영' },
];

export default function HomePage() {
  const { user, isAuthenticated } = useAuth();
  const status = getServiceMembershipStatus(user);

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      {/* 페이지 히어로 — banner landmark 는 공통 GlobalHeader 하나뿐이어야 하므로 section 을 쓴다 */}
      <section className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">{BRAND.tagline}</h1>
        <p className="mt-2 text-sm text-gray-600">
          공급자가 올린 상품·자료를 약국이 바로 주문하고, 매장 콘텐츠와 실행 자산
          (QR · POP · 사이니지)까지 한 곳에서 운영합니다.
        </p>
      </section>

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
