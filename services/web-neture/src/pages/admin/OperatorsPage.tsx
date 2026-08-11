/**
 * OperatorsPage — Neture `/admin/operators`
 *
 * WO-O4O-NETURE-ADMIN-OPERATORS-GUIDE-REPLACE-V1
 *   Neture 자체 운영자 관리 UI(목록·생성·역할 지정·해제)를 제거하고
 *   중앙 관리자 `/operators` 로 안내하는 화면으로 교체한다.
 *
 * 배경:
 *   운영자·관리자 역할 부여·회수는 플랫폼 관리자 권한이다
 *   (IR-O4O-NETURE-OPERATOR-ROLE-ASSIGNMENT-AUTHORITY-V1).
 *   Neture 전용 화면을 남겨두면 서비스 admin 이 중앙 정책을 우회하는 동선이 유지된다.
 *
 * 원칙:
 *   - 이 화면은 운영자 정보·역할 목록을 **조회하지 않는다** (API 호출 0).
 *   - 자동 redirect 하지 않는다. 사용자가 선택하는 이동 버튼만 제공한다.
 *   - 중앙 화면은 플랫폼 관리자 전용이므로, 권한이 없으면 이동해도 사용할 수 없음을 명시한다.
 */

import { UserCog, ExternalLink, ShieldAlert } from 'lucide-react';

/**
 * 중앙 관리자 운영자 관리 화면.
 *   route  : apps/admin-dashboard `/operators` (routes/users.routes.tsx)
 *   guard  : AdminProtectedRoute requiredRoles=['admin','super_admin','platform:super_admin']
 *   domain : .github/workflows/deploy-admin.yml (production app_origin)
 */
const CENTRAL_OPERATORS_URL = 'https://admin.neture.co.kr/operators';

export default function OperatorsPage() {
  return (
    <div className="p-6">
      <div className="mx-auto max-w-2xl">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">운영자 관리</h1>
          <p className="mt-1 text-sm text-gray-500">
            Neture 운영자·관리자 권한은 중앙 관리자에서 관리합니다.
          </p>
        </div>

        <div className="rounded-lg border border-gray-200 bg-white p-6">
          <div className="flex items-start gap-4">
            <div className="rounded-lg bg-indigo-50 p-3">
              <UserCog className="h-6 w-6 text-indigo-600" />
            </div>
            <div className="flex-1">
              <h2 className="text-base font-semibold text-gray-900">
                중앙 관리자로 이동해 관리하세요
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-gray-600">
                운영자·관리자 역할의 부여와 해제는 여러 서비스에 공통으로 적용되는 플랫폼 권한
                작업입니다. 서비스별 화면에서 각각 처리하지 않고 중앙 관리자
                <span className="font-medium text-gray-900"> 운영자 관리</span> 한 곳에서 수행합니다.
              </p>

              <div className="mt-4 flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 p-3">
                <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
                <p className="text-sm text-amber-800">
                  중앙 운영자 관리는 <span className="font-medium">플랫폼 관리자 전용</span>입니다.
                  권한이 없는 계정은 이동하더라도 화면을 사용할 수 없습니다.
                </p>
              </div>

              <a
                href={CENTRAL_OPERATORS_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-5 inline-flex items-center gap-2 rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
              >
                중앙 관리자에서 운영자 관리 열기
                <ExternalLink className="h-4 w-4" />
              </a>
              <p className="mt-2 text-xs text-gray-400">{CENTRAL_OPERATORS_URL}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
