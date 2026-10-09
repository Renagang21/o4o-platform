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
 *   - 운영자·역할·서비스 대상 정책은 전체관리자 공간에 배치한다.
 */

import { Link } from 'react-router-dom';
import { Users, LayoutGrid, UserCog, ArrowRight, ShieldCheck, Target } from 'lucide-react';

// WO-O4O-PLATFORM-TIER1-CROSSLINK-CARDS-V1: 플랫폼 운영 권한·정책 진입
interface Tier1Card {
  icon: typeof Users;
  title: string;
  desc: string;
  to: string;
  badge: string;
  badgeTone: 'keep' | 'move' | 'decide';
}

const TIER1_CARDS: Tier1Card[] = [
  {
    icon: UserCog,
    title: '운영자 관리',
    // WO-O4O-NETURE-ADMIN-OPERATORS-GUIDE-REPLACE-V1: Neture 자체 관리 UI 는 제거되었고,
    //   해당 경로는 중앙 관리자 `/operators` 로 이동을 안내하는 화면이다.
    desc: '운영자/관리자 부여·회수는 중앙 관리자에서 수행합니다. 담당 업무에 맞는 운영 권한을 지정합니다.',
    to: '/operators',
    badge: '중앙 관리 안내',
    badgeTone: 'move',
  },
  {
    icon: ShieldCheck,
    title: '역할 관리',
    desc: '서비스별 역할과 권한을 확인하고 관리합니다.',
    to: '/admin/platform/roles',
    badge: '플랫폼 관리',
    badgeTone: 'keep',
  },
  {
    icon: Target,
    title: '서비스 대상 정책',
    desc: '서비스별로 이용할 수 있는 상품 범위와 정책을 관리합니다.',
    to: '/admin/platform/service-audience',
    badge: '플랫폼 관리',
    badgeTone: 'move',
  },
];

const TIER1_BADGE_CLASS: Record<Tier1Card['badgeTone'], string> = {
  keep: 'bg-slate-100 text-slate-600 border-slate-200',
  move: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  decide: 'bg-amber-50 text-amber-700 border-amber-200',
};

interface PlatformCard {
  icon: typeof Users;
  title: string;
  desc: string;
  to: string | null;
  badge?: string;
}

const PLATFORM_CARDS: PlatformCard[] = [
  {
    icon: UserCog,
    title: '플랫폼 계정 관리',
    desc: '전체 관리자 계정 조회 · 비밀번호 재설정 · 활성/비활성. (super_admin 보호 포함)',
    to: '/admin/platform/accounts',
  },
  {
    icon: LayoutGrid,
    title: '플랫폼 서비스 관리',
    desc: 'O4O 서비스 목록 · 상태 · 진입 URL · 승인 정책 조회. (1차 read-only)',
    to: '/admin/platform/services',
  },
  {
    icon: Users,
    title: '전체 사용자 조회',
    desc: 'O4O 전체 사용자 현황 read-only 조회(안전 필드만). 이용중지·삭제·권한 변경은 각 전용 화면 소관.',
    to: '/admin/platform/users',
    badge: '조회 전용',
  },
];

export default function PlatformAdminLandingPage() {
  return (
    <div className="space-y-8">
      {/* 안내 배너 */}
      <div className="rounded-lg bg-indigo-50 border border-indigo-100 p-3 text-xs text-indigo-800 leading-relaxed">
        플랫폼 전체 계정과 서비스 정책을 관리합니다. 각 서비스의 운영 업무는 해당 서비스 관리 화면에서 처리합니다.
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

      {/* Tier 1 crosslink (WO-O4O-PLATFORM-TIER1-CROSSLINK-CARDS-V1 — 안내·링크만, 이동/guard 변경 없음) */}
      <section>
        <h2 className="text-sm font-semibold text-slate-700 mb-1">운영 권한 · 정책</h2>
        <p className="text-xs text-slate-500 mb-4 leading-relaxed">
          담당 운영자를 지정하고 서비스의 역할과 상품 이용 정책을 관리합니다.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {TIER1_CARDS.map((card) => {
            const Icon = card.icon;
            return (
              <Link
                key={card.title}
                to={card.to}
                className="group block rounded-xl bg-white border border-slate-200 shadow-sm p-5 hover:border-slate-400 transition-colors no-underline"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center">
                    <Icon className="w-5 h-5 text-slate-600" />
                  </div>
                  <span className={`text-[11px] font-semibold rounded-full border px-2 py-0.5 ${TIER1_BADGE_CLASS[card.badgeTone]}`}>
                    {card.badge}
                  </span>
                </div>
                <h3 className="font-semibold text-slate-800 mb-1 flex items-center gap-1">
                  {card.title}
                  <ArrowRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-slate-600 transition-colors" />
                </h3>
                <p className="text-xs text-slate-500 leading-relaxed mb-2">{card.desc}</p>
                <p className="text-[11px] text-slate-400 font-mono break-all">{card.to}</p>
              </Link>
            );
          })}
        </div>
      </section>
    </div>
  );
}
