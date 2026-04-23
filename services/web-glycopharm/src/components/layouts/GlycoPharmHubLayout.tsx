/**
 * GlycoPharmHubLayout — 매장 운영 허브 탐색 레이아웃
 *
 * WO-O4O-GLYCOPHARM-STORE-HUB-PORT-V1
 *
 * KPA PharmacyHubLayout 패턴:
 * - 좌측 고정 사이드바 (홈 + 메뉴 4개)
 * - 우측 Outlet (메뉴별 페이지)
 * - NavLink 활성 상태 표시기
 */

import { NavLink, Outlet } from 'react-router-dom';
import { Home, ShoppingCart, Monitor, FileText, Megaphone } from 'lucide-react';

const HUB_MENU = [
  {
    key: 'home',
    label: '홈',
    desc: '자원 탐색 허브 · 운영 흐름 안내',
    icon: Home,
    to: '/store-hub',
    end: true,
  },
  {
    key: 'b2b',
    label: 'B2B 상품',
    desc: '공급사 상품을 탐색하고 약국에 신청합니다',
    icon: ShoppingCart,
    to: '/store-hub/b2b',
    end: false,
  },
  {
    key: 'signage',
    label: '사이니지',
    desc: '매장 디스플레이에 활용할 미디어를 탐색합니다',
    icon: Monitor,
    to: '/store/signage/library',
    end: false,
  },
  {
    key: 'content',
    label: '콘텐츠',
    desc: '플랫폼 콘텐츠를 탐색하고 내 매장에 적용합니다',
    icon: FileText,
    to: '/store-hub/content',
    end: false,
  },
  {
    key: 'campaign',
    label: '캠페인',
    desc: '플랫폼 캠페인에 참여합니다',
    icon: Megaphone,
    to: '#',
    end: false,
    badge: '준비중',
  },
];

export function GlycoPharmHubLayout() {
  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-5xl mx-auto px-4 py-8">
        <div className="flex gap-6 items-start">
          {/* ── 좌측 사이드바 ── */}
          <aside className="w-52 shrink-0 bg-white border border-slate-200 rounded-xl overflow-hidden sticky top-20">
            <div className="px-4 py-4 border-b border-slate-100">
              <h2 className="text-sm font-bold text-slate-800">매장 운영 허브</h2>
              <p className="text-xs text-slate-400 mt-0.5">플랫폼 자원을 탐색하고 내 매장에 가져갑니다</p>
            </div>

            <nav className="py-2">
              {HUB_MENU.map((item) => {
                const Icon = item.icon;
                if (item.badge) {
                  return (
                    <div
                      key={item.key}
                      className="flex items-start gap-3 px-4 py-3 opacity-50 cursor-not-allowed"
                    >
                      <Icon className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-sm text-slate-500">{item.label}</span>
                          <span className="px-1.5 py-0.5 text-[10px] font-medium bg-slate-100 text-slate-400 rounded">
                            {item.badge}
                          </span>
                        </div>
                        <p className="text-xs text-slate-400 mt-0.5 line-clamp-2">{item.desc}</p>
                      </div>
                    </div>
                  );
                }

                return (
                  <NavLink
                    key={item.key}
                    to={item.to}
                    end={item.end}
                    className={({ isActive }) =>
                      `flex items-start gap-3 px-4 py-3 transition-colors relative ${
                        isActive
                          ? 'bg-teal-50 text-teal-700'
                          : 'hover:bg-slate-50 text-slate-700'
                      }`
                    }
                  >
                    {({ isActive }) => (
                      <>
                        {isActive && (
                          <span className="absolute right-0 top-1/2 -translate-y-1/2 w-0.5 h-6 bg-teal-500 rounded-l" />
                        )}
                        <Icon
                          className={`w-4 h-4 mt-0.5 shrink-0 ${isActive ? 'text-teal-600' : 'text-slate-400'}`}
                        />
                        <div className="flex-1 min-w-0">
                          <span className={`text-sm font-medium ${isActive ? 'text-teal-700' : 'text-slate-700'}`}>
                            {item.label}
                          </span>
                          <p className="text-xs text-slate-400 mt-0.5 line-clamp-2">{item.desc}</p>
                        </div>
                      </>
                    )}
                  </NavLink>
                );
              })}
            </nav>

            <div className="px-4 py-3 border-t border-slate-100">
              <p className="text-[11px] text-slate-400 leading-relaxed">
                탐색한 자원은 내 약국 (/store)에서 설정·운영합니다.
              </p>
            </div>
          </aside>

          {/* ── 우측 본문 ── */}
          <main className="flex-1 min-w-0">
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  );
}
