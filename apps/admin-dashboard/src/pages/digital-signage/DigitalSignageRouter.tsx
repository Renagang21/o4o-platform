/**
 * Digital Signage Admin Router
 *
 * Admin Dashboard router for Digital Signage system management
 *
 * Route Structure (WO-O4O-SIGNAGE-RESIDUAL-DEAD-RUNTIME-FINAL-RETIREMENT-V1):
 * - / (root): Content Hub
 * - /content: Content Hub (`/api/signage/:serviceKey/global/*`)
 *
 * Phase 6 legacy 화면(media / display / schedule / action / operations)과
 * Channel 기반 monitoring 화면은 consumer 0 이 증명되어 은퇴했다.
 * 남은 canonical admin 진입점은 Content Hub 하나다.
 *
 * IMPORTANT: This router is for ADMIN ONLY.
 * - HQ Operator routes are in Service Frontend (/signage/hq/*)
 * - Store routes are in Service Frontend (/signage/store/*)
 */

import { Routes, Route, Navigate } from 'react-router-dom';
import { lazy, Suspense } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { AppGuard } from '@/components/common/AppGuard';

// Content Hub (WO-SIGNAGE-CONTENT-HUB-V1)
const ContentHub = lazy(() => import('./v2/ContentHub'));

const PageLoader = () => (
  <div className="p-6 space-y-4">
    <Skeleton className="h-8 w-64" />
    <Skeleton className="h-64 w-full" />
  </div>
);

export default function DigitalSignageRouter() {
  return (
    <AppGuard appId="digital-signage-core" appName="Digital Signage">
      <Suspense fallback={<PageLoader />}>
        <Routes>
          {/* Admin Dashboard Root → canonical Content Hub */}
          <Route path="/" element={<Navigate to="content" replace />} />

          {/* Admin: Content Hub (canonical · browse-only) */}
          <Route path="content" element={<ContentHub />} />

          {/* WO-O4O-ADMIN-INFORMATION-ARCHITECTURE-AND-MENU-ROLE-REFACTOR-V1:
              `RemovedRouteRedirect` 안내 화면 9건(preview/hq · v2/hq · preview/store/* ·
              v2/store · templates/* · v2/templates/* · content-blocks · layout-presets · v2/*)
              과 그 컴포넌트를 제거했다.

              이 화면들은 노란 "Route Relocated" 박스만 렌더하는 이전 완료 안내였다.
              Role Reform 이전은 이미 끝났고(HQ → 서비스 프런트 /signage/hq/*,
              Store → /signage/store/*), 안내를 무기한 유지하면 관리자 사이트에
              "이동됨" 화면만 쌓인다. 아래 catch-all 이 canonical 진입점으로 보낸다. */}

          {/* 알 수 없는 경로는 canonical 진입점으로 */}
          <Route path="*" element={<Navigate to="content" replace />} />
        </Routes>
      </Suspense>
    </AppGuard>
  );
}
