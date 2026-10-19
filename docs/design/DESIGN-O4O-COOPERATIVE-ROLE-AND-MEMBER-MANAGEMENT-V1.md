# DESIGN-O4O-COOPERATIVE-ROLE-AND-MEMBER-MANAGEMENT-V1

- 상태: ACTIVE · 사용자 승인 정책의 상세 설계
- 작성: 2026-10-18
- 범위: https://pharmcoop.neture.co.kr 연합회 산하 조합관리·개별 조합원관리
- 실행 계획: [TODO](../work-orders/TODO-O4O-COOPERATIVE-ROLE-AND-MEMBER-MANAGEMENT-V1.md)

## 권한 경계

| 주체 | 허용 | 금지 |
|---|---|---|
| 연합회 admin (`neture:pharmcoop_admin`) | 조합 심사·최종 승인·거절·정지·복구, 조합 admin 지정·해제 | 역할만으로 개별 조합원·콘텐츠 관리 |
| 연합회 operator (`neture:pharmcoop_operator`) | 조합 신청 조회·검토 기록·보완 요청 | 조합 최종 결정·관리자 지정 |
| 조합 admin (`cooperative_roles`, 조합 ID별) | 해당 조합 회원 최종 결정, 조합 operator 지정·해제, 콘텐츠·공급조건 운영 | 다른 조합·플랫폼 계정 삭제·조합 admin 지정 |
| 조합 operator (`cooperative_roles`, 조합 ID별) | 해당 회원 조회·검토·보완·최종 처리 요청, 콘텐츠·공급조건 운영 | 회원 최종 자격 변경·역할 지정 |

연합회 역할은 현재 유효한 역할 기간과 Neture 메인 active 자격을 확인한다. 일반 Neture admin/operator 또는 플랫폼 역할만으로 연합회 관리 권한을 추론하지 않는다. 공통 관리자에서 연합회 역할을 지정하는 기존 경로는 유지한다.
개별 조합 역할은 기존 활성·이메일 인증 계정에 지정하며 Neture 전역 역할을 요구하지 않는다. 관리자 역할과 개인 조합원 자격은 독립이다. 조합·사업 정지 또는 역할 해제는 다음 API 요청부터 즉시 적용된다.

## 업무 흐름

- 조합 신청: 로그인한 활성·이메일 인증 계정 → 조합명·slug·소개·가입 자격 제출 → `pending` 조합과 비활성(`closed`) 사업 생성 → 연합회 operator 검토·보완 → 연합회 admin 최종 결정. 신청자는 자기 신청 상태·보완 이력을 보고 추가 설명을 제출한다.
- 조합 운영 시작: 연합회 admin이 기존 계정 이메일을 지정해 조합 admin 배정. 자기 역할 해제와 마지막 사용 가능한 조합 admin 해제는 서버에서 차단한다. 관리자 교체는 후임을 먼저 배정한다.
- 개인 가입: 조합별 신청(`pending`) → operator 검토·보완 요청 및 승인 요청 → admin 승인(`active`) 또는 거절(`rejected`). 개인은 보완 내용을 다시 제출할 수 있다.
- 정지/복구: active → suspended → active. operator는 요청만 남긴다.
- 탈퇴/제명: active 또는 suspended → withdrawn. 본인 탈퇴 요청은 admin이 처리한다. 제명은 정관상 의결 결과를 사유에 남긴다. 거절·자격 종료 후에는 새 신청을 접수할 수 있다.
- 자격 종료는 해당 조합 개인 접근만 종료한다. 다른 조합·공통 계정·약국 조직·매장 권한은 그대로다. 관리 역할을 보유한 사람의 운영 접근은 별도 배정이므로 별도로 해제한다.

## 데이터와 기존 경로

- 기존 `cooperatives`·`cooperative_memberships` 유지. 조합 상태에 pending/rejected만 forward migration으로 추가한다.
- `cooperative_roles`: 조합·계정별 활성 역할 최대 1개, admin/operator. 해제는 revoked_at으로 남긴다. 기존 전역 역할이나 semi_franchise_operators를 자동 승격/backfill하지 않는다.
- `cooperative_management_events`: 사유·actor·subject·이전/이후 상태·시각. 검토/요청은 이력으로 기록하며 최종 상태 변경은 admin의 별도 동작이다.
- 조합 단위 mutation은 조합 행을 잠근 뒤 현재 역할을 다시 확인한다. 마지막 admin 및 동시 처리 경쟁을 직렬화한다.
- 사업 운영 predicate는 산하 조합을 기존 전역/협업체 역할 경로에서 제외하고 조합별 역할로만 허용한다. 비조합 약국 협업체 동작은 유지한다.
- 개인 가입을 semi_franchise_memberships/organization_members에 복사하지 않는다. 조합 사업 공간 접근은 개인 가입 active 또는 해당 조합 관리 역할로 판정한다.
- 테스트 provisioning CLI는 명시된 테스트 조합에 한해 최초 local admin을 연결한다. 전역 역할은 부여하지 않으며 기존 반대 역할·정지 상태는 충돌로 중단한다. 실제 운영 실행은 별도 승인·통합 절차 대상이다.

## API·화면

`/api/v1/neture/cooperative-management` 아래 모든 경로는 requireAuth + 서버의 live 범위 검사를 사용한다. mutation은 POST이며 GET은 조회만 한다. 관리자용 응답은 private, no-store다.

- `/federation`, `/federation/:coop/actions/:action`, `/federation/:coop/roles`, `/federation/:coop/history`
- `/affiliations`, `/my-affiliations`, `/:coop/supplement`, `/:coop/my-history`
- `/:coop/roles`, `/:coop/roles/:role/revoke`
- `/:coop/applications`, `/:coop/withdrawal-request`, `/:coop/members`, `/:coop/members/:member/actions/:action`, `/:coop/history`

화면은 연합회 `/operator`, 조합 `/:slug/operator`, 개인 신청 `/:slug/membership`, 조합 신청 `/about`에 둔다. 연합회는 개인 조합원 처리 이력을 조회하지 못한다. 조합 operator가 최종 처리 URL을 직접 호출해도 서버에서 거부한다.

## 개인정보·운영 경계

역할·회원 처리 이력은 계정 삭제 inventory와 write fence에 포함한다. 이력은 조합 자격 종료만으로 삭제하지 않는다. 공통 계정의 승인된 완전 삭제에서는 해당 계정이 actor/subject인 이력과 개인 역할 행을 함께 삭제한다. 법정 보존·의결 원본 보관 기능을 신설하는 것은 이 범위가 아니다. 사유에는 불필요한 민감정보를 기록하지 않는다.

개발 결과는 push까지만. migration 적용, 실제 계정 생성·권한 배정, PR 생성·병합·배포·IAM·DNS 변경은 수행하지 않는다.

### 계정 삭제와 마지막 관리자 보호

공통 계정 완전 삭제도 조합 역할 해제를 우회하지 않는다. 삭제 대상이 어느 조합의 마지막 사용 가능한 admin이면 `COOPERATIVE_MANAGEMENT_TRANSFER_REQUIRED`로 검토 보류하고 역할을 보존한다. 연합회 admin이 후임을 지정한 뒤 삭제 검토를 재개한다. 기존 개인정보 보존·writer inventory·외부 저장소 등의 독립 보류 조건은 그대로 적용한다.
