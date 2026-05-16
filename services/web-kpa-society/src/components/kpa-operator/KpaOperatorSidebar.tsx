/**
 * KpaOperatorSidebar — KPA-only domain IA sidebar
 *
 * WO-O4O-KPA-OPERATOR-SIDEBAR-DOMAIN-IA-RESTRUCTURE-V1
 *
 * 목적:
 *   KPA dashboard 의 2축 운영 (커뮤니티 + 매장 HUB) + 운영 공통 으로 sidebar IA 정렬.
 *   기존 OperatorShell 의 sidebar 가 STANDARD_GROUPS 11-feature flat 구조였던 점을 KPA-only
 *   custom sidebar 로 대체. packages/ui 무수정, cross-service 영향 0.
 *
 * 구성:
 *   - desktop: 도메인 헤딩 (커뮤니티 운영 / 매장 HUB 운영 / 운영 공통) + 그룹별 collapsible
 *   - mobile: 수평 탭 (도메인 헤딩 생략, 그룹 순서로 도메인 클러스터링)
 *   - capability + adminOnly 필터: 호출처(wrapper) 가 menuItems 사전 필터 수행
 *
 * STANDARD_GROUPS 의 icon / label 은 packages/ui 에서 import 하여 시각 일관성 유지.
 */

import { useState, useMemo } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ChevronDown, ChevronRight } from 'lucide-react';
import {
  STANDARD_GROUPS,
  type OperatorGroupKey,
  type OperatorMenuItem,
} from '@o4o/ui';
import type { OperatorCapability } from '@o4o/types';
import {
  DOMAIN_DISPLAY_ORDER,
  DOMAIN_GROUP_ORDER,
  DOMAIN_LABELS,
  GROUP_TO_DOMAIN,
  type OperatorDomainKey,
} from '../../config/operatorMenuGroups';

// ─── Internal types ───────────────────────────────────────────────────────

interface ResolvedGroup {
  key: OperatorGroupKey;
  label: string;
  icon: (typeof STANDARD_GROUPS)[number]['icon'];
  items: OperatorMenuItem[];
}

interface ResolvedDomain {
  key: OperatorDomainKey;
  label: string;
  emoji: string;
  groups: ResolvedGroup[];
}

// ─── Props ────────────────────────────────────────────────────────────────

export interface KpaOperatorSidebarProps {
  /** capability + adminOnly 필터링이 끝난 menu 항목 */
  menuItems: Partial<Record<OperatorGroupKey, OperatorMenuItem[]>>;
  /** 서비스 활성 Capability 목록 (그룹 visibility 필터) */
  capabilities: OperatorCapability[];
  /** sidebar sticky 오프셋 Tailwind 클래스 (default: 'top-6'). GlobalHeader 사용 시 'top-20' */
  sidebarTopOffset?: string;
}

// ─── Component ────────────────────────────────────────────────────────────

export function KpaOperatorSidebar({
  menuItems,
  capabilities,
  sidebarTopOffset = 'top-6',
}: KpaOperatorSidebarProps) {
  const { pathname } = useLocation();

  // ── Resolve visible domains × groups (STANDARD_GROUPS 의 icon/label 재사용) ──
  const resolvedDomains: ResolvedDomain[] = useMemo(() => {
    return DOMAIN_DISPLAY_ORDER
      .map((domainKey): ResolvedDomain | null => {
        const groupOrder = DOMAIN_GROUP_ORDER[domainKey];
        const groups: ResolvedGroup[] = [];

        for (const groupKey of groupOrder) {
          if (GROUP_TO_DOMAIN[groupKey] !== domainKey) continue;
          const items = menuItems[groupKey];
          if (!items || items.length === 0) continue;

          const standard = STANDARD_GROUPS.find((g) => g.key === groupKey);
          if (!standard) continue;

          // Capability gate (OperatorShell 와 동일)
          if (standard.capability && !capabilities.includes(standard.capability)) continue;

          groups.push({
            key: groupKey,
            label: standard.label,
            icon: standard.icon,
            items,
          });
        }

        if (groups.length === 0) return null;

        const meta = DOMAIN_LABELS[domainKey];
        return { key: domainKey, label: meta.label, emoji: meta.emoji, groups };
      })
      .filter((d): d is ResolvedDomain => d !== null);
  }, [menuItems, capabilities]);

  // ── Active detection ──
  const isItemActive = (path: string, exact?: boolean) => {
    if (exact) return pathname === path;
    if (path.includes('/signage/')) return pathname.startsWith(path);
    return pathname === path || pathname.startsWith(path + '/');
  };

  const isGroupActive = (group: ResolvedGroup) =>
    group.items.some((item) => isItemActive(item.path, item.exact));

  // ── Collapsible state ── (active group 자동 open)
  const initialOpen = useMemo(() => {
    const set = new Set<OperatorGroupKey>();
    for (const dom of resolvedDomains) {
      for (const g of dom.groups) {
        if (isGroupActive(g)) set.add(g.key);
      }
    }
    return set;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resolvedDomains]);
  const [openGroups, setOpenGroups] = useState<Set<OperatorGroupKey>>(initialOpen);

  const toggleGroup = (key: OperatorGroupKey) => {
    setOpenGroups((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  // ── Mobile: flat tab list (도메인 순서로 그룹 정렬, 헤딩 생략) ──
  const flatGroupsForMobile = useMemo(
    () => resolvedDomains.flatMap((d) => d.groups),
    [resolvedDomains],
  );

  return (
    <>
      {/* ── Desktop Sidebar ── */}
      <aside className="w-60 flex-shrink-0 hidden md:block">
        <nav className={`bg-white rounded-xl border border-gray-200 overflow-hidden sticky ${sidebarTopOffset}`}>
          {resolvedDomains.map((domain, domainIdx) => (
            <div key={domain.key}>
              {/* Domain heading */}
              <div
                className={`px-4 py-2 ${
                  domainIdx > 0 ? 'border-t border-gray-100' : ''
                } bg-gray-50/60`}
              >
                <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-gray-500">
                  <span aria-hidden>{domain.emoji}</span>
                  <span>{domain.label}</span>
                </div>
              </div>

              {/* Groups inside domain */}
              {domain.groups.map((group) => {
                const Icon = group.icon;
                const active = isGroupActive(group);
                const isOpen = openGroups.has(group.key);
                const isSingle = group.items.length === 1;

                if (isSingle) {
                  const item = group.items[0];
                  const itemActive = isItemActive(item.path, item.exact);
                  return (
                    <Link
                      key={group.key}
                      to={item.path}
                      className={`flex items-center gap-3 px-4 py-3 text-sm font-medium transition-colors border-l-2 ${
                        itemActive
                          ? 'bg-blue-50 text-blue-600 border-blue-600'
                          : 'text-gray-600 border-transparent hover:bg-gray-50 hover:text-gray-900'
                      }`}
                    >
                      <Icon size={18} />
                      {item.label}
                    </Link>
                  );
                }

                return (
                  <div key={group.key}>
                    <button
                      type="button"
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
                        {group.items.map((item) => {
                          const itemActive = isItemActive(item.path, item.exact);
                          return (
                            <Link
                              key={item.path}
                              to={item.path}
                              className={`block pl-11 pr-4 py-2 text-sm transition-colors ${
                                itemActive
                                  ? 'text-blue-600 bg-blue-50 font-medium'
                                  : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'
                              }`}
                            >
                              {item.label}
                            </Link>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </nav>
      </aside>

      {/* ── Mobile Navigation (horizontal tabs, no domain heading) ── */}
      <div className="md:hidden w-full mb-4">
        <nav className="flex gap-1 overflow-x-auto bg-white rounded-xl border border-gray-200 p-1">
          {flatGroupsForMobile.map((group) => {
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
    </>
  );
}
