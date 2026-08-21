/**
 * MembershipsPage — Pharmacy-Hub 운영자 가입 신청 콘솔 (목록)
 *
 * WO-PHARMACY-HUB-MEMBERSHIP-JOIN-AND-APPROVAL-V1 §6-D (업무 규칙)
 * WO-O4O-PHARMACY-HUB-OPERATOR-MEMBERSHIP-CONSOLE-COMMON-CORE-ADOPTION-V1 (공통화)
 *
 * 목록 · 검색 · 상태 필터 · 상세(Drawer) · 승인 · 반려 UI 는
 * `@o4o/operator-core-ui` 의 OperatorMembersConsolePage(`consoleMode='approval'`) 가 담당한다.
 * 이 파일에는 **Pharmacy-Hub 고유 정책만** 남는다:
 *   - 가입 승인 축 (service_memberships) — 회원 일반 관리가 아니다
 *   - 상태 어휘 pending / active / rejected (+ suspended / withdrawn 표시)
 *   - 반려 사유 필수
 *   - 상세 deep link = /operator/memberships/:membershipId
 *
 * 권한 경계는 프론트가 아니라 backend `pharmacy-hub:operator` scope guard 가 강제한다.
 */

import { OperatorMembersConsolePage } from '@o4o/operator-core-ui/modules/members';
import { membershipConsoleClient } from '../../lib/membershipConsoleClient';
import { BRAND, ROLE_LABELS, ROLES, SERVICE_KEY } from '../../config/service';

/** 신청 역할 표시 — service.ts 의 ROLE_LABELS 를 그대로 쓴다(라벨 사본 금지). */
const ROLE_DISPLAY: Record<string, string> = {
  // WO-O4O-PHARMACYHUB-PHARMACIST-MEMBER-AND-STORE-OWNER-MODEL-CLOSURE-V1:
  //   자가 가입 유형 2개(약사 회원 / 약국 경영자)를 신청 역할 컬럼에서 구분한다.
  [ROLES.member]: ROLE_LABELS[ROLES.member],
  [ROLES.storeOwner]: ROLE_LABELS[ROLES.storeOwner],
  [ROLES.operator]: ROLE_LABELS[ROLES.operator],
  [ROLES.admin]: ROLE_LABELS[ROLES.admin],
};

export default function MembershipsPage() {
  return (
    <OperatorMembersConsolePage
      serviceKey={SERVICE_KEY}
      client={membershipConsoleClient}
      consoleMode="approval"
      title={`${BRAND.name} 가입 신청 관리`}
      description="회원 가입 신청의 승인·반려만 처리합니다. 상품·주문·콘텐츠 승인은 이 콘솔의 범위가 아닙니다."
      searchPlaceholder="이메일 · 이름 검색"
      // 신청 역할은 컬럼으로 보여주고 탭으로 나누지 않는다
      // (역할 탭은 현재 페이지 안의 client-side 필터라 신청 큐 운영과 맞지 않는다).
      roleTabs={[]}
      roleColumnHeader="신청 역할"
      roleDisplayMap={ROLE_DISPLAY}
      statusTabs={[
        { key: 'status-active', label: '승인 완료', status: 'active' },
        { key: 'status-rejected', label: '반려', status: 'rejected' },
      ]}
      rejectReason={{ required: true, label: '반려 사유', placeholder: '반려 사유를 입력해 주세요.' }}
      // UserData.id = membership id (membershipConsoleClient 식별자 계약)
      fullDetailHref={(u) => `/operator/memberships/${u.id}`}
      extraColumns={[
        {
          key: 'company',
          header: '약국/회사',
          width: '160px',
          render: (v: any) => <span className="text-sm text-slate-600">{v || '-'}</span>,
        },
      ]}
      tableId="pharmacy-hub-operator-memberships"
    />
  );
}
