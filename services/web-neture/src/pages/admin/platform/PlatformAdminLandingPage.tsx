/**
 * PlatformAdminLandingPage — /admin/platform (index)
 *
 * WO-O4O-ADMIN-PLATFORM-SECTION-ROUTING-V1 (skeleton)
 * WO-O4O-PLATFORM-ACCOUNTS-SERVICES-UI-V1 (Tier 2 카드 → 실제 route 연결)
 *
 * platform-admin section home. 상위 PlatformSectionLayout(헤더/nav/guard) 안에서 렌더.
 *   - 플랫폼 계정 관리 → /admin/platform/accounts
 *   - 플랫폼 서비스 관리 → /admin/platform/services
 *   - Global 사용자 관리 → 연결 예정(후속 IR)
 *   - Tier 1(운영자 관리/역할 관리/서비스 대상 정책)은 Neture admin 유지(안내만, 이동 안 함).
 */

import { Link } from 'react-router-dom';
import { Users, LayoutGrid, UserCog, ArrowRight } from 'lucide-react';

interface PlatformCard {
  icon: typeof Users;
  title: string;
  desc: string;
  to: string | null;
  api: string;
  badge?: string;
}

const PLATFORM_CARDS: PlatformCard[] = [
  {
    icon: UserCog,
    title: '플랫폼 계정 관리',
    desc: '전체 관리자 계정 조회 · 비밀번호 재설정 · 활성/비활성. (super_admin 보호 포함)',
    to: '/admin/platform/accounts',
    api: 'GET/PATCH /api/v1/admin/platform-accounts',
  },
  {
    icon: LayoutGrid,
    title: '플랫폼 서비스 관리',
    desc: 'O4O 서비스 목록 · 상태 · 진입 URL · 승인 정책 조회. (1차 read-only)',
    to: '/admin/platform/services',
    api: 'GET /api/v1/admin/platform-services',
  },
  {
    icon: Users,
    title: '전체 사용자 조회',
    desc: 'O4O 전체 사용자 현황 read-only 조회(안전 필드만). 이용중지·삭제·권한 변경은 각 전용 화면 소관.',
    to: '/admin/platform/users',
    api: 'GET /api/v1/admin/platform-users',
    badge: '조회 전용',
  },
];

export default function PlatformAdminLandingPage() {
  return (
    <div className="space-y-8">
      {/* 안내 배너 */}
      <div className="rounded-lg bg-indigo-50 border border-indigo-100 p-3 text-xs text-indigo-800 leading-relaxed">
        이 영역은 <strong>Neture 서비스 관리(/admin)와 분리된 플랫폼 관리 surface</strong>입니다.
        platform 권한(<code>platform:admin</code> / <code>platform:super_admin</code>)으로만 접근할 수 있으며,
        서비스 단위 운영자(neture:admin)와 권한이 구분됩니다.
      </div>

      {/* Tier 2 카드 */}
      <section>
        <h2 className="text-sm font-semibold text-slate-700 mb-1">플랫폼 관리 기능</h2>
        <p className="text-xs text-slate-500 mb-4">여러 O4O 서비스에 영향을 주는 플랫폼 계정 · 서비스 · 권한 정책을 관리합니다.</p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {PLATFORM_CARDS.map((card) => {
            const Icon = card.icon;
            const inner = (
              <>
                <div className="flex items-center justify-between mb-3">
                  <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center">
                    <Icon className="w-5 h-5 text-slate-600" />
                  </div>
                  {card.badge
                    ? <span className="text-[11px] font-semibold rounded-full bg-slate-100 text-slate-600 border border-slate-200 px-2 py-0.5">{card.badge}</span>
                    : card.to
                      ? <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-slate-600 transition-colors" />
                      : <span className="text-[11px] font-semibold rounded-full bg-amber-50 text-amber-700 border border-amber-200 px-2 py-0.5">연결 예정</span>}
                </div>
                <h3 className="font-semibold text-slate-800 mb-1">{card.title}</h3>
                <p className="text-xs text-slate-500 leading-relaxed mb-2">{card.desc}</p>
                <p className="text-[11px] text-slate-400 font-mono break-all">{card.api}</p>
              </>
            );
            return card.to ? (
              <Link key={card.title} to={card.to} className="group block rounded-xl bg-white border border-slate-200 shadow-sm p-5 hover:border-slate-400 transition-colors no-underline">
                {inner}
              </Link>
            ) : (
              <div key={card.title} className="rounded-xl bg-white border border-slate-200 shadow-sm p-5 opacity-80">
                {inner}
              </div>
            );
          })}
        </div>
      </section>

      {/* Tier 1 안내 (이동하지 않음) */}
      <section className="rounded-xl bg-slate-50 border border-slate-200 p-5">
        <h2 className="text-sm font-semibold text-slate-700 mb-2">현재 Neture admin 에서 운영 중인 플랫폼 성격 항목</h2>
        <p className="text-xs text-slate-500 leading-relaxed">
          <strong>운영자 관리 · 역할 관리 · 서비스 대상 정책</strong>은 현재 Neture admin 안에서
          “플랫폼” 라벨로 운영 중입니다(guard: neture:admin). 이 항목들은 후속 정책 결정
          (<code>IR-O4O-PLATFORM-TIER1-MENU-MIGRATION-DECISION-V1</code>)에 따라 본 platform section 으로
          이동될 수 있습니다. 현재 단계에서는 이동하지 않으며, 기존 위치에서 그대로 동작합니다.
        </p>
      </section>
    </div>
  );
}
