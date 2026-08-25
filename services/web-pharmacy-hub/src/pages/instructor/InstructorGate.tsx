/**
 * InstructorGate — /instructor/* 역할 가드
 *
 * WO-O4O-PHARMACYHUB-COMMUNITY-AND-MY-STORE-FULL-PARITY-CLOSURE-V1 §4 (#42)
 *
 * GlycoPharm/K-Cosmetics 는 RoleGuard(allowedRoles=[...]) 를 쓰지만 PH 는 그 컴포넌트가
 * 없고 satisfiesRole + MembershipGate 조합이 서비스 표준이다(AdminLayoutWrapper 와 동일).
 * 허용 역할 표는 다른 서비스와 같다: lms:instructor · {service}:admin · {service}:operator
 * · platform:super_admin. 실제 경계는 backend `requireInstructor` 가 강제하며 이 가드는
 * UX(빈 화면·403 노출 방지)다.
 *
 * 강사는 가입 역할이 아니라 사후 부여 역할이다
 * (docs/baseline/O4O-PHARMACY-HUB-SERVICE-MODEL-BASELINE-V1.md) —
 * 신청 동선을 여기서 노출하지 않는다(PH 에는 강사 신청 승인 backend 가 없다: requireKpaAdmin).
 */

import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { MembershipGate } from '../../components/MembershipGate';
import { ROLES, PLATFORM_SUPER_ADMIN } from '../../config/service';

const INSTRUCTOR_ROLE = 'lms:instructor';

const ALLOWED: readonly string[] = [
  INSTRUCTOR_ROLE,
  ROLES.admin,
  ROLES.operator,
  PLATFORM_SUPER_ADMIN,
];

export function InstructorGate({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const roles: string[] = Array.isArray(user?.roles) ? (user!.roles as string[]) : [];
  const allowed = roles.some((r) => ALLOWED.includes(r));

  return (
    <MembershipGate>
      {allowed ? (
        <>{children}</>
      ) : (
        <div className="mx-auto max-w-md rounded-lg border border-slate-200 bg-white p-6 text-center my-10">
          <h2 className="mb-2 text-lg font-semibold text-slate-800">강사 권한이 필요합니다</h2>
          <p className="mb-4 text-sm text-slate-600">
            강의 개설·운영은 강사 역할이 부여된 회원만 사용할 수 있습니다.
          </p>
          <Link to="/education" className="text-sm text-teal-600 underline">
            교육 홈으로 이동
          </Link>
        </div>
      )}
    </MembershipGate>
  );
}

export default InstructorGate;
