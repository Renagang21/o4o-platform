/**
 * ProductDbLayout — O4O 상품 DB (read-only) 진입 레이아웃
 *
 * WO-O4O-ADMIN-PUBLIC-PRODUCT-DB-READONLY-SKELETON-V1
 *
 * 정부/공공데이터 기반 기본 상품 DB 조회 허브. 하위 탭:
 *  - 현황 (요약 대시보드)
 *  - 공공데이터 후보 (ProductCandidate)
 *  - 기본 상품 (ProductMaster)
 *  - 데이터 정비 (준비중)
 */

import { Suspense } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { Database } from 'lucide-react';

const TABS = [
  { to: 'overview', label: '현황' },
  { to: 'candidates', label: '공공데이터 후보' },
  // WO-O4O-KPA-STORE-NEW-PRODUCT-REQUEST-AND-ADMIN-APPROVAL-V1 (P2): 매장 신규 상품 등록 요청 검토
  { to: 'store-requests', label: '상품 등록 요청' },
  { to: 'masters', label: '기본 상품' },
  { to: 'image-quality', label: '이미지 상태' },
  { to: 'maintenance', label: '데이터 정비' },
];

export default function ProductDbLayout() {
  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center gap-2 mb-1">
        <Database className="w-6 h-6 text-admin-blue" />
        <h1 className="text-2xl font-bold text-gray-900">O4O 상품 DB</h1>
      </div>
      <p className="text-sm text-gray-500 mb-4">
        정부/공공데이터 기반 기본 상품 DB (조회 전용)
      </p>

      <div className="border-b border-gray-200 mb-6">
        <nav className="flex gap-1">
          {TABS.map((t) => (
            <NavLink
              key={t.to}
              to={t.to}
              className={({ isActive }) =>
                `px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
                  isActive
                    ? 'border-admin-blue text-admin-blue'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`
              }
            >
              {t.label}
            </NavLink>
          ))}
        </nav>
      </div>

      <Suspense fallback={<div className="text-gray-400 py-10 text-center">불러오는 중…</div>}>
        <Outlet />
      </Suspense>
    </div>
  );
}
