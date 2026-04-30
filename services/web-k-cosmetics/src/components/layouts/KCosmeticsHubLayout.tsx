/**
 * KCosmeticsHubLayout — K-Cosmetics 매장 운영 허브 탐색 레이아웃
 *
 * WO-O4O-STOREHUB-STRUCTURE-ALIGNMENT-V1
 *
 * GlycoPharmHubLayout 패턴:
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
    desc: '공급사 상품을 탐색하고 매장에 신청합니다',
    icon: ShoppingCart,
    to: '/store-hub/b2b',
    end: false,
  },
  {
    key: 'signage',
    label: '사이니지',
    desc: '매장 디스플레이에 활용할 미디어를 탐색합니다',
    icon: Monitor,
    to: '/store-hub/signage',
    end: false,
  },
  {
    key: 'content',
    label: '콘텐츠/자료',
    desc: '플랫폼 콘텐츠를 탐색하고 내 매장에 복사합니다',
    icon: FileText,
    to: '/store-hub/content',
    end: false,
  },
  {
    key: 'event-offers',
    label: '캠페인·이벤트',
    desc: '플랫폼 캠페인에 참여합니다',
    icon: Megaphone,
    to: '/store-hub/event-offers',
    end: false,
  },
];

export function KCosmeticsHubLayout() {
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
                return (
                  <NavLink
                    key={item.key}
                    to={item.to}
                    end={item.end}
                    className={({ isActive }) =>
                      `flex items-start gap-3 px-4 py-3 transition-colors relative ${
                        isActive
                          ? 'bg-pink-50 text-pink-700'
                          : 'hover:bg-slate-50 text-slate-700'
                      }`
                    }
                  >
                    {({ isActive }) => (
                      <>
                        {isActive && (
                          <span className="absolute right-0 top-1/2 -translate-y-1/2 w-0.5 h-6 bg-pink-500 rounded-l" />
                        )}
                        <Icon
                          className={`w-4 h-4 mt-0.5 shrink-0 ${isActive ? 'text-pink-600' : 'text-slate-400'}`}
                        />
                        <div className="flex-1 min-w-0">
                          <span className={`text-sm font-medium ${isActive ? 'text-pink-700' : 'text-slate-700'}`}>
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
                탐색한 자원은 내 매장 (/store)에서 설정·운영합니다.
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
