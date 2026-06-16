/**
 * PlatformAdminLandingPage — O4O 플랫폼 관리 section 1차 landing
 *
 * WO-O4O-ADMIN-PLATFORM-SECTION-ROUTING-V1 (Phased B)
 *
 * Neture 서비스 admin(`/admin`) 과 분리된 platform-admin section(`/admin/platform`) 의 뼈대.
 *   - guard = platform:admin / platform:super_admin (PlatformRoute) — neture:admin 단독 접근 불가.
 *   - Tier 2(platform-scoped: 플랫폼 계정 / 플랫폼 서비스 / global users)를 받을 표면.
 *   - 본 화면은 landing(안내)만 — 실제 list/관리 UI 는 후속 WO-O4O-PLATFORM-ACCOUNTS-SERVICES-UI-V1.
 *   - Tier 1(운영자 관리/역할 관리/서비스 대상 정책)은 현재 Neture admin 에 유지 — 이동하지 않음(안내만).
 *
 * 별도 앱/도메인 아님(기존 admin 앱 내 section). backend/API/DB 무변경.
 */

import { Link } from 'react-router-dom';
import { ShieldCheck, Users, LayoutGrid, UserCog, ArrowLeft } from 'lucide-react';

interface PlatformCard {
  icon: typeof Users;
  title: string;
  desc: string;
  api: string;
}

const PLATFORM_CARDS: PlatformCard[] = [
  {
    icon: UserCog,
    title: '플랫폼 계정 관리',
    desc: '전체 관리자 계정 조회 · 비밀번호 재설정 · 활성/비활성. (super_admin 보호 포함)',
    api: 'GET/PATCH /api/v1/admin/platform-accounts',
  },
  {
    icon: LayoutGrid,
    title: '플랫폼 서비스 관리',
    desc: 'O4O 서비스 목록 · 상태 · 진입 URL · 승인 정책 관리.',
    api: 'GET/PATCH /api/v1/admin/platform-services',
  },
  {
    icon: Users,
    title: 'Global 사용자 관리',
    desc: '전체 사용자/관리자 조회 및 역할 관리. (노출 범위 후속 정책 결정)',
    api: 'GET /api/v1/admin/users',
  },
];

export default function PlatformAdminLandingPage() {
  return (
    <div className="max-w-5xl mx-auto px-6 py-8 space-y-8">
      {/* 헤더 */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-slate-800 flex items-center justify-center shrink-0">
          <ShieldCheck className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-slate-900">O4O 플랫폼 관리</h1>
          <p className="text-sm text-slate-500">
            여러 O4O 서비스에 영향을 주는 플랫폼 계정 · 서비스 · 권한 정책을 관리하는 영역입니다.
          </p>
        </div>
        <span className="ml-auto inline-flex items-center px-2.5 py-1 text-xs font-semibold rounded-full bg-slate-100 text-slate-700 border border-slate-200">
          platform admin
        </span>
      </div>

      {/* 안내 배너 */}
      <div className="rounded-lg bg-indigo-50 border border-indigo-100 p-3 text-xs text-indigo-800 leading-relaxed">
        이 영역은 <strong>Neture 서비스 관리(/admin)와 분리된 플랫폼 관리 surface</strong>입니다.
        platform 권한(<code>platform:admin</code> / <code>platform:super_admin</code>)으로만 접근할 수 있으며,
        서비스 단위 운영자(neture:admin)와 권한이 구분됩니다.
      </div>

      {/* Tier 2 카드 (연결 예정) */}
      <section>
        <h2 className="text-sm font-semibold text-slate-700 mb-1">플랫폼 관리 기능</h2>
        <p className="text-xs text-slate-500 mb-4">
          백엔드 API 는 이미 존재합니다. 실제 관리 화면은 후속 작업에서 연결됩니다.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {PLATFORM_CARDS.map((card) => {
            const Icon = card.icon;
            return (
              <div key={card.title} className="rounded-xl bg-white border border-slate-200 shadow-sm p-5">
                <div className="flex items-center justify-between mb-3">
                  <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center">
                    <Icon className="w-5 h-5 text-slate-600" />
                  </div>
                  <span className="text-[11px] font-semibold rounded-full bg-amber-50 text-amber-700 border border-amber-200 px-2 py-0.5">
                    연결 예정
                  </span>
                </div>
                <h3 className="font-semibold text-slate-800 mb-1">{card.title}</h3>
                <p className="text-xs text-slate-500 leading-relaxed mb-2">{card.desc}</p>
                <p className="text-[11px] text-slate-400 font-mono break-all">{card.api}</p>
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

      <div className="pt-2">
        <Link to="/admin" className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800 transition-colors">
          <ArrowLeft className="w-4 h-4" /> Neture 서비스 관리로 돌아가기
        </Link>
      </div>
    </div>
  );
}
