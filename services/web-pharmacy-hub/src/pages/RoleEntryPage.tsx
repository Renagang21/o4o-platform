/**
 * RoleEntryPage — Pharmacy-Hub Foundation
 *
 * WO-PHARMACY-HUB-NEW-SERVICE-FOUNDATION-V1
 *
 * 역할별 진입점 골격. MembershipGate(가입 상태) 통과 후, 해당 역할 보유 여부를
 * role_assignments 기반 prefixed role 로 확인한다.
 *
 * WO-O4O-CROSSSERVICE-HEADER-MENU-FOOTER-UI-COMPLETION-V1:
 *   화면에 "후속 WO 예정 기능" 박스를 렌더하고 있었다. WO 번호는 내부 개발 용어이고,
 *   미구현 기능 목록을 사용자 화면에 상시 노출하는 것은 "준비 중" 표시와 같다.
 *   → 사용자 화면에서 제거하고, 실제 진입 가능한 기능(links)만 남긴다.
 *   plannedFeatures prop 은 호출 측 계약 유지를 위해 optional 로 남기되 렌더하지 않는다.
 *
 * 운영자 진입점 범위 주의 (WO §3):
 *   운영자는 가입 승인·회원 관리·커뮤니티·공지/운영자 콘텐츠를 담당하며,
 *   공급자 ↔ 약국 간 일반 상품 거래와 공급자 콘텐츠 전달에는 개입하지 않는다.
 */

import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { ROLE_LABELS, satisfiesRole } from '../config/service';

interface Props {
  role: string;
  /**
   * @deprecated 사용자 화면에 렌더하지 않는다
   * (WO-O4O-CROSSSERVICE-HEADER-MENU-FOOTER-UI-COMPLETION-V1).
   * 로드맵은 WO 문서가 보유한다 — 화면은 실제 이용 가능한 기능만 안내한다.
   */
  plannedFeatures?: string[];
  /**
   * 이미 연결된 실기능 진입 링크.
   * WO-PHARMACY-HUB-MEMBERSHIP-JOIN-AND-APPROVAL-V1 에서 운영자 가입 신청 관리가 추가되었다.
   */
  links?: { to: string; label: string }[];
}

export default function RoleEntryPage({ role, links = [] }: Props) {
  const { user } = useAuth();
  const roles: string[] = Array.isArray(user?.roles) ? (user!.roles as string[]) : [];
  // WO-PHARMACY-HUB-ADMIN-ROLE-HIERARCHY-V1:
  //   정확히 같은 역할이 아니라 **계층**으로 판정한다 (admin 은 operator 진입점을 통과).
  //   판정표는 config/service.ts 하나뿐이며 backend scopeRoleMapping 과 같은 표다.
  const hasRole = satisfiesRole(roles, role);

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <h1 className="mb-1 text-xl font-bold">{ROLE_LABELS[role] ?? role}</h1>
      <p className="mb-6 text-xs text-gray-400">{role}</p>

      <div className="mb-6 rounded-lg border border-gray-200 bg-white p-4 text-sm">
        {hasRole ? (
          <p>이 역할 진입 권한이 확인되었습니다.</p>
        ) : (
          <p className="text-gray-600">
            이 역할이 부여되지 않았습니다. 역할 부여는 서비스 운영자의 승인 절차를 통해 진행됩니다.
          </p>
        )}
      </div>

      {links.length > 0 && (
        <div className="mb-6 rounded-lg border border-gray-200 bg-white p-4 text-sm">
          <h2 className="mb-2 font-semibold text-gray-700">이용 가능한 기능</h2>
          <ul className="space-y-1">
            {links.map((l) => (
              <li key={l.to}>
                <Link to={l.to} className="text-primary-600 underline">
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}

      <p className="mt-6 text-sm">
        <Link to="/" className="text-gray-500 underline">
          처음으로
        </Link>
      </p>
    </div>
  );
}
