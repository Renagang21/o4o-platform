/**
 * MemberListLayout — 회원 리스트 표준 레이아웃
 *
 * WO-O4O-MEMBER-LIST-STANDARDIZATION-V1
 *
 * 구조: 검색바 + Role 탭 + DataTable + 페이지네이션
 * 각 서비스는 tabs/columns/actions만 커스텀하고 레이아웃은 공유.
 */

import type { ReactNode } from 'react';

// ── Types ──

export interface MemberTab {
  key: string;
  label: string;
  count?: number;
}

export interface MemberListLayoutProps {
  /** 페이지 제목 */
  title?: string;
  /** 페이지 설명 */
  description?: string;
  /** Role 탭 정의 */
  tabs: MemberTab[];
  /** 현재 선택된 탭 key */
  activeTab: string;
  /** 탭 변경 핸들러 */
  onTabChange: (tabKey: string) => void;
  /** 검색어 */
  search: string;
  /** 검색어 변경 */
  onSearchChange: (value: string) => void;
  /** 검색 실행 (Enter/debounce) */
  onSearch: (value: string) => void;
  /** 검색 placeholder */
  searchPlaceholder?: string;
  /** 상단 우측 액션 (새로고침 버튼 등) */
  headerActions?: ReactNode;
  /** 테이블 영역 (DataTable) */
  children: ReactNode;
}

// ── Component ──

export function MemberListLayout({
  title = '회원 관리',
  description,
  tabs,
  activeTab,
  onTabChange,
  search,
  onSearchChange,
  onSearch,
  searchPlaceholder = '이름, 이메일로 검색',
  headerActions,
  children,
}: MemberListLayoutProps) {
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') onSearch(search);
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-800">{title}</h1>
          {description && <p className="text-sm text-slate-500 mt-1">{description}</p>}
        </div>
        {headerActions}
      </div>

      {/* Search Bar */}
      <div className="relative max-w-md">
        <svg
          className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <circle cx="11" cy="11" r="8" />
          <path d="m21 21-4.3-4.3" strokeLinecap="round" />
        </svg>
        <input
          type="text"
          value={search}
          onChange={(e) => {
            onSearchChange(e.target.value);
            // debounce
            clearTimeout((handleKeyDown as any).__timer);
            const timer = setTimeout(() => onSearch(e.target.value), 300);
            (handleKeyDown as any).__timer = timer;
          }}
          onKeyDown={handleKeyDown}
          placeholder={searchPlaceholder}
          className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
        />
      </div>

      {/* Role Tabs */}
      <div className="flex gap-1 border-b border-slate-200">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => onTabChange(tab.key)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab.key
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
            }`}
          >
            {tab.label}
            {tab.count != null && (
              <span className={`ml-1.5 text-xs px-1.5 py-0.5 rounded-full ${
                activeTab === tab.key
                  ? 'bg-blue-100 text-blue-700'
                  : 'bg-slate-100 text-slate-500'
              }`}>
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Table Content */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        {children}
      </div>
    </div>
  );
}
