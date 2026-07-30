/**
 * RoleEntryPage — Pharmacy-Hub Foundation
 *
 * WO-PHARMACY-HUB-NEW-SERVICE-FOUNDATION-V1
 *
 * 역할별 진입점 골격. MembershipGate(가입 상태) 통과 후, 해당 역할 보유 여부를
 * role_assignments 기반 prefixed role 로 확인한다. 실제 기능은 후속 WO 에서 채운다.
 *
 * 운영자 진입점 범위 주의 (WO §3):
 *   운영자는 가입 승인·회원 관리·커뮤니티·공지/운영자 콘텐츠를 담당하며,
 *   공급자 ↔ 약국 간 일반 상품 거래와 공급자 콘텐츠 전달에는 개입하지 않는다.
 */

import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { ROLE_LABELS } from '../config/service';

interface Props {
  role: string;
  /** 후속 WO 에서 채울 기능 목록 (설명용) */
  plannedFeatures: string[];
}

export default function RoleEntryPage({ role, plannedFeatures }: Props) {
  const { user } = useAuth();
  const roles: string[] = Array.isArray(user?.roles) ? (user!.roles as string[]) : [];
  const hasRole = roles.includes(role);

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

      <div className="rounded-lg border border-dashed border-gray-300 p-4 text-sm">
        <h2 className="mb-2 font-semibold text-gray-700">후속 WO 예정 기능</h2>
        <ul className="list-inside list-disc space-y-1 text-gray-600">
          {plannedFeatures.map((f) => (
            <li key={f}>{f}</li>
          ))}
        </ul>
      </div>

      <p className="mt-6 text-sm">
        <Link to="/" className="text-gray-500 underline">
          처음으로
        </Link>
      </p>
    </div>
  );
}
