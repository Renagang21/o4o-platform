/**
 * StoreDashboardLayout - Store Owner 대시보드 공통 Shell
 * WO-O4O-STORE-ADMIN-LAYOUT-STANDARDIZATION-V1
 *
 * 레이아웃 구조:
 *   flex-col 전체 → sticky header + flex-row 본문
 *   본문 = sticky sidebar (desktop) / drawer (mobile) + flex-1 content
 *
 * fixed+margin 패턴에서 flex+sticky 패턴으로 전환.
 * 사이드바가 문서 흐름에 참여하여 마진 오프셋 불필요.
 */

import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import type { StoreDashboardConfig } from '../config/storeMenuConfig';
import { StoreTopBar } from '../components/StoreTopBar';
import type { StoreNavItem } from '../components/StoreTopBar';
import { StoreSidebar } from '../components/StoreSidebar';

interface StoreDashboardLayoutProps {
  config: StoreDashboardConfig;
  userName?: string;
  userInitial?: string;
  homeLink?: string;
  onLogout?: () => void;
  banner?: React.ReactNode;
  /** 서비스 네비게이션 링크 (TopBar 중앙에 표시) */
  navItems?: StoreNavItem[];
  /** 활성 서비스 이름 (제공 시 2-line 모드) */
  serviceLabel?: string;
  /** 서비스 뱃지 텍스트 (미제공 시 "내 매장") */
  serviceBadge?: string;
  /** 소속 조직명 */
  orgName?: string;
}

export function StoreDashboardLayout({
  config,
  userName = '',
  userInitial,
  homeLink = '/',
  onLogout,
  banner,
  navItems,
  serviceLabel,
  serviceBadge,
  orgName,
}: StoreDashboardLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen flex flex-col bg-slate-100">
      {/* ──── TopBar ──── */}
      <StoreTopBar
        config={config}
        userName={userName}
        userInitial={userInitial}
        homeLink={homeLink}
        onLogout={onLogout}
        onMenuToggle={() => setSidebarOpen(true)}
        navItems={navItems}
        serviceLabel={serviceLabel}
        serviceBadge={serviceBadge}
        orgName={orgName}
      />

      {/* ──── Body: sidebar + content ──── */}
      <div className="flex flex-1 min-h-0">
        {/* Mobile backdrop */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 bg-black/50 z-40 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Sidebar: fixed drawer on mobile, sticky in-flow on desktop */}
        <aside
          className={`fixed top-14 left-0 z-40 h-[calc(100vh-3.5rem)] w-64 bg-white shadow-xl transform transition-transform duration-300 lg:sticky lg:top-14 lg:z-auto lg:shadow-none lg:border-r lg:border-slate-200 lg:shrink-0 lg:translate-x-0 ${
            sidebarOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
        >
          <StoreSidebar
            config={config}
            onLogout={onLogout}
            onItemClick={() => setSidebarOpen(false)}
            onClose={() => setSidebarOpen(false)}
            orgName={orgName}
          />
        </aside>

        {/* Main content */}
        <div className="flex-1 min-w-0">
          <main className="p-4 md:p-6">
            {banner}
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  );
}
