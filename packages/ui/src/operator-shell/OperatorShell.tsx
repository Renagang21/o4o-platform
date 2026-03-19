/**
 * OperatorShell — O4O 플랫폼 Operator UI 통합 레이아웃
 *
 * WO-O4O-OPERATOR-UI-STANDARDIZATION-V1
 *
 * 모든 서비스의 Operator UI를 단일 컴포넌트로 통합.
 * 11-Capability Group 순서 고정 (CLAUDE.md Section 11).
 * 서비스 차이 = Capability + 메뉴 라우트 매핑만.
 *
 * Layout 구조 (contained pattern, Neture 참조):
 * ┌─────────────────────────────────────────┐
 * │ Header: serviceName + Operator + user    │
 * ├──────────┬──────────────────────────────┤
 * │ Sidebar  │ {children}                   │
 * │ (md:+)   │                              │
 * ├──────────┴──────────────────────────────┤
 * │ Footer                                   │
 * └─────────────────────────────────────────┘
 */

import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Home, ChevronRight, ChevronDown, LogOut } from 'lucide-react';
import { STANDARD_GROUPS } from './constants';
import type { StandardGroup } from './constants';
import type { OperatorShellProps, OperatorMenuItem } from './types';

/* ------------------------------------------------------------------ */
/*  Internal types                                                      */
/* ------------------------------------------------------------------ */

interface ResolvedGroup {
  key: string;
  label: string;
  icon: StandardGroup['icon'];
  items: OperatorMenuItem[];
}

/* ------------------------------------------------------------------ */
/*  OperatorShell                                                       */
/* ------------------------------------------------------------------ */

export function OperatorShell({
  serviceName,
  menuItems,
  capabilities,
  user,
  onLogout,
  homeLink = '/',
  footer,
  headerActions,
  children,
}: OperatorShellProps) {
  const { pathname } = useLocation();

  /* ── Resolve visible groups ── */
  const visibleGroups: ResolvedGroup[] = STANDARD_GROUPS
    .filter((g) => {
      // Capability check
      if (g.capability && !capabilities.includes(g.capability)) return false;
      // Items check
      const items = menuItems[g.key];
      return items && items.length > 0;
    })
    .map((g) => ({
      key: g.key,
      label: g.label,
      icon: g.icon,
      items: menuItems[g.key]!,
    }));

  /* ── Active path detection ── */
  const isItemActive = (path: string, exact?: boolean) => {
    if (exact) return pathname === path;
    // Signage sub-path handling
    if (path.includes('/signage/')) {
      return pathname.startsWith(path);
    }
    return pathname === path || pathname.startsWith(path + '/');
  };

  const isGroupActive = (group: ResolvedGroup) =>
    group.items.some((item) => isItemActive(item.path, item.exact));

  /* ── Collapsible group state ── */
  const [openGroups, setOpenGroups] = useState<Set<string>>(
    () => new Set(visibleGroups.filter((g) => isGroupActive(g)).map((g) => g.key)),
  );

  const toggleGroup = (key: string) => {
    setOpenGroups((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* ══════════════════════════════════════════════════════════ */}
      {/*  Header                                                    */}
      {/* ══════════════════════════════════════════════════════════ */}
      <header className="bg-white border-b border-gray-200 shrink-0">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-14">
            {/* Left — Logo & Section */}
            <div className="flex items-center gap-4">
              <Link to="/operator" className="flex items-center gap-2">
                <span className="text-xl font-bold text-blue-600">{serviceName}</span>
                <span className="text-xs font-medium text-slate-500 border-l border-slate-300 pl-2">
                  Operator
                </span>
              </Link>
              <Link
                to={homeLink}
                className="flex items-center gap-1 text-xs text-slate-400 hover:text-blue-500 transition-colors"
                title="메인 사이트로 이동"
              >
                <Home className="w-3.5 h-3.5" />
                <span>메인</span>
              </Link>
            </div>

            {/* Right — Actions + User */}
            <div className="flex items-center gap-3">
              {headerActions}
              {!headerActions && user && (
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                      <span className="text-blue-600 text-sm font-medium">
                        {user.name.charAt(0) || '?'}
                      </span>
                    </div>
                    <span className="hidden sm:block text-sm text-slate-700">{user.name}</span>
                  </div>
                  <button
                    onClick={onLogout}
                    className="flex items-center gap-1 text-sm text-slate-500 hover:text-red-600 transition-colors"
                  >
                    <LogOut size={16} />
                    <span className="hidden sm:inline">로그아웃</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* ══════════════════════════════════════════════════════════ */}
      {/*  Body: Sidebar + Content                                   */}
      {/* ══════════════════════════════════════════════════════════ */}
      <div className="flex-1 max-w-[1400px] w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex gap-6">
          {/* ── Desktop Sidebar ── */}
          <aside className="w-60 flex-shrink-0 hidden md:block">
            <nav className="bg-white rounded-xl border border-gray-200 overflow-hidden sticky top-6">
              {visibleGroups.map((group) => {
                const Icon = group.icon;
                const active = isGroupActive(group);
                const isOpen = openGroups.has(group.key);
                const isSingle = group.items.length === 1;

                // Single-item group → direct link
                if (isSingle) {
                  const item = group.items[0];
                  return (
                    <Link
                      key={group.key}
                      to={item.path}
                      className={`flex items-center gap-3 px-4 py-3 text-sm font-medium transition-colors border-l-2 ${
                        isItemActive(item.path, item.exact)
                          ? 'bg-blue-50 text-blue-600 border-blue-600'
                          : 'text-gray-600 border-transparent hover:bg-gray-50 hover:text-gray-900'
                      }`}
                    >
                      <Icon size={18} />
                      {item.label}
                    </Link>
                  );
                }

                // Multi-item group → collapsible
                return (
                  <div key={group.key}>
                    <button
                      onClick={() => toggleGroup(group.key)}
                      className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-medium transition-colors border-l-2 ${
                        active
                          ? 'text-blue-600 border-blue-600'
                          : 'text-gray-600 border-transparent hover:bg-gray-50 hover:text-gray-900'
                      }`}
                    >
                      <Icon size={18} />
                      <span className="flex-1 text-left">{group.label}</span>
                      {isOpen ? (
                        <ChevronDown className="w-4 h-4 text-gray-400" />
                      ) : (
                        <ChevronRight className="w-4 h-4 text-gray-400" />
                      )}
                    </button>

                    {isOpen && (
                      <div className="pb-1">
                        {group.items.map((item) => (
                          <Link
                            key={item.path}
                            to={item.path}
                            className={`block pl-11 pr-4 py-2 text-sm transition-colors ${
                              isItemActive(item.path, item.exact)
                                ? 'text-blue-600 bg-blue-50 font-medium'
                                : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'
                            }`}
                          >
                            {item.label}
                          </Link>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </nav>
          </aside>

          {/* ── Mobile Navigation ── */}
          <div className="md:hidden w-full mb-4">
            <nav className="flex gap-1 overflow-x-auto bg-white rounded-xl border border-gray-200 p-1">
              {visibleGroups.map((group) => {
                const Icon = group.icon;
                const active = isGroupActive(group);
                const firstPath = group.items[0].path;
                return (
                  <Link
                    key={group.key}
                    to={firstPath}
                    className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg whitespace-nowrap transition-colors ${
                      active
                        ? 'bg-blue-50 text-blue-600'
                        : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    <Icon size={14} />
                    {group.label}
                  </Link>
                );
              })}
            </nav>
          </div>

          {/* ── Main Content ── */}
          <main className="flex-1 min-w-0">
            {children}
          </main>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════ */}
      {/*  Footer                                                    */}
      {/* ══════════════════════════════════════════════════════════ */}
      {footer !== false && (
        <footer className="bg-white border-t border-gray-200 mt-auto shrink-0">
          <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-6">
            {footer || (
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-gray-500">
                <div className="text-center sm:text-left">
                  <p>&copy; 2026 {serviceName}. 플랫폼 운영</p>
                  <p className="mt-1 text-xs text-gray-400">
                    <Link to={homeLink} className="hover:text-blue-600">
                      메인으로
                    </Link>
                  </p>
                </div>
              </div>
            )}
          </div>
        </footer>
      )}
    </div>
  );
}
