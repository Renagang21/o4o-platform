# 개별 커뮤니티 admin/operator 및 회원 제재 설계

> **상태**: IMPLEMENTED · 작업 branch 구현·로컬 검증 · 운영 적용 대기
> **작성일**: 2026-10-10 · **최종 갱신**: 2026-10-10
> **근거 WO/IR**: 사용자 개별 admin/operator·회원 제재 설계 지시 · [후속 TODO](../work-orders/WO-O4O-COMMUNITY-OPERATOR-MEMBER-FOLLOWUP-V1.md)

## 1. 설계와 현재 구현의 구분

이 문서의 확정 설계를 작업 branch 코드와 migration에 반영했다. 운영 migration과 배포는 수행하지 않았다.
현행 역할과 중앙 서비스 권한은 [역할 정본](../baseline/O4O-ROLE-WORKSPACE-ARCHITECTURE-V1.md) §5,
[서비스 회원 관리 표준](../platform/operator/O4O-OPERATOR-USER-MANAGEMENT-STANDARD-V1.md) §1.1을 따른다.
사용자가 아래 권한표와 기존 operator → admin 전환을 확정했다. 정본에는 구현 대기 정책으로 반영하며 현행 코드 동작과 구분한다.

현재 `CommunityMembership.ts`와 `1790400000000-CreateCommunityDomain.ts`는
role을 operator/member, status를 pending/active/rejected/withdrawn으로 제한한다.
가입 승인·반려 API만 존재하며 정지·해제·개별 탈퇴 API는 없다.
따라서 suspended와 admin은 타입 추가만으로 도입할 수 없으며 DB CHECK 제약 변경도 필요하다.

## 2. 역할과 권한 설계안

서비스 역할은 `role_assignments`의 community:admin/operator로 유지한다.
개별 역할은 `community_memberships.role`에 admin/operator/member를 둔다.
개별 admin을 community:admin으로 저장하거나 일반 가입 승인으로 서비스 역할을 부여하지 않는다.

| 업무 | 개별 admin | 개별 operator | 서비스 community:admin | 서비스 community:operator |
|---|---|---|---|---|
| 활성 독립 커뮤니티 회원 조회·승인·반려 | 자기 커뮤니티 | 자기 커뮤니티 | 해당 서비스 전체 | 해당 서비스 전체 |
| 개별 가입 정지·해제·관리 탈퇴 | 자기 커뮤니티 | 차단 | 해당 서비스 전체 | 차단 |
| 개별 admin/operator 지정·회수 | 차단 | 차단 | 허용 | 차단 |
| 공통 계정 활성 상태 복구 | 차단 | 차단 | 차단 | 차단 |
| community 서비스 가입 상태 변경 | 별도 서비스 권한 필요 | 별도 서비스 권한 필요 | 서비스 회원 콘솔 | 기존 서비스 정책 적용 |

권한 표의 제재 권한과 기존 operator → admin 전환은 사용자 확정 정책(2026-10-10)이다.
회원 조회·승인·반려는 기존 서비스 역할의 개별 심사 권한을 유지한다.
공통 프로필 수정은 기존 서비스 회원 콘솔에서 유지하며 개별 커뮤니티 화면에 새 수정 경로를 만들지 않는다.
사업 회원 포럼과 게시판 소유자/게시판 회원 권한은 이 설계의 대상이 아니다.

## 3. 가입 상태 전이

| 요청 | 허용 이전 상태 | 결과 | 주체 |
|---|---|---|---|
| 가입 승인 | pending | active | 심사 가능한 admin/operator |
| 가입 반려 | pending | rejected | 심사 가능한 admin/operator |
| 정지 | active | suspended | 개별 admin 또는 서비스 admin |
| 정지 해제 | suspended | active | 개별 admin 또는 서비스 admin |
| 관리 탈퇴 | active, suspended | withdrawn | 개별 admin 또는 서비스 admin |
| 재가입 신청 | rejected, withdrawn | pending + member | 본인 |

rejected/withdrawn을 정지 해제로 복구하지 않는다. suspended 회원의 재가입으로 정지를 우회하지 않는다.
pending 신청의 종료는 가입 반려로 처리한다. 같은 상태에 대한 중복 변경은 새 이벤트 없이 changed=false를 반환하는 안을 사용한다.
승인/해제는 현재 메인 자격과 community 서비스 가입 상태를 확인한다.
승인은 최초 서비스 가입만 만들 수 있으며 해제는 active 서비스 가입이 없으면 거절한다.
제재는 공통 users, 다른 community_memberships, service_memberships, role_assignments를 변경하지 않는다.
탈퇴는 행을 삭제하지 않고 상태를 남기며 개별 역할은 member로 회수한다.
정지는 역할을 보존하되 다음 요청부터 기능을 차단하고, 해제 시 해당 개별 역할의 효력을 복구한다.
중앙의 별도 역할 회수로 member가 된 회원은 해제해도 예전 역할을 재부여하지 않는다.

## 4. 운영자 보호와 복구

개설 승인자는 첫 개별 admin이 되는 안을 사용한다.
유효 admin은 같은 활성 커뮤니티의 active 개별 가입·admin 역할·메인 자격·active 서비스 가입을 모두 만족해야 한다.
admin 강등·회수·정지·탈퇴 시 유효 admin이 최소 한 명 남아야 한다. operator만 남는 것으로 대체하지 않는다.
admin을 둘 이상 둘 수 있으며 단일 사용자로 제한하지 않는다.

중앙 계정 정지와 서비스 정지는 이 보호 때문에 금지하지 않는다.
그 결과 유효 admin이 없어도 서비스 admin이 적격 active 회원을 후임 admin으로 지정할 수 있다.
서비스 operator는 기존 조회·심사로 적격 회원을 확보할 수 있지만 후임 지정이나 제재는 수행하지 못한다.
적격 회원이 전혀 없다면 계정 상태 복구는 중앙 계정 관리에서, 서비스 상태는 서비스 회원 관리에서 처리한다.
제재된 운영자 본인이 자기 제재를 해제하는 예외를 만들지 않는다.

## 5. API·권한 판정

기존 개별 심사 route를 유지하고 서버에서 현재 역할을 판정한다.
구현된 제재 route는 다음과 같다:

- POST /api/v1/communities/:communitySlug/memberships/:membershipId/suspend
- POST /api/v1/communities/:communitySlug/memberships/:membershipId/restore
- POST /api/v1/communities/:communitySlug/memberships/:membershipId/withdraw

대상 가입 행은 id와 resolveCommunity가 확정한 community_id로 함께 검증한다.
다른 커뮤니티 membershipId는 404로 거절한다. 클라이언트의 userId/role/serviceKey로 권한을 대체하지 않는다.
제재는 reason을 필수로 받고 길이를 제한한다. 사유에 개인정보를 입력하지 않도록 안내한다.
기존 역할 지정 API의 허용값을 admin/operator/member로 확장하되 서비스 admin 전용 guard를 유지한다.

`requireCommunityScope`에는 조회·심사와 제재를 구분하는 admin 수준을 추가한다.
현재 중앙 서비스 operator의 조기 next 분기는 admin 제재 route를 통과시키면 안 된다.
workspace의 기존 canManage는 게시판 관리 의미를 유지하고 회원 제재는 별도 capability로 표시한다.
canManage=true만으로 새 회원 제재를 허용하지 않는다.
메뉴·버튼은 서버 권한을 표시하며 실제 API는 매 요청 DB 판정을 다시 한다.

## 6. 저장·동시 처리·이력

기존 가입 원장을 유지하고 role/status CHECK와 TypeScript union을 함께 확장한다.
역할과 상태 변경 이벤트는 단일 개별 가입 변경 이력 테이블로 보존하는 안이다.
community_id, membership_id, actor_user_id, action, before/after role·status, reason, created_at을 저장한다.
이메일·이름·연락처나 JWT를 이벤트에 복제하지 않는다. 실패 요청은 성공 이력으로 남기지 않는다.
이력 열람은 같은 커뮤니티 admin 및 서비스 admin으로 한정하는 안이며 보존 기간은 추가 정책 확인 대상이다.

가입·역할 변경과 이력 INSERT를 같은 트랜잭션에 넣는다.
커뮤니티별 parent 행을 먼저 FOR UPDATE하여 마지막 admin 보호와 승격·제재의 동시 실행을 직렬화한다.
이어 대상 및 admin 가입 행을 id 순서로 잠그고 메인·서비스 자격을 확인한 뒤 변경한다.
외부 계정/서비스 변경은 다른 원장 변경이므로 모든 동시 상황이 자동 직렬화된다고 주장하지 않는다.
권한 해제·정지 후 기존 로그인도 다음 요청에서 현재 DB 역할·상태로 차단한다.

## 7. 전환과 구현 순서

1. 권한 표·기존 operator 전환은 확정 완료. 자기 탈퇴 범위·이력 보존 정책은 구현 전에 별도 확인.
2. 타입·CHECK 제약·이력 migration 작성과 rollback/data 영향 검토.
3. 모든 개별 역할 소비처를 admin/operator 인식 및 admin 제재 경계로 정비.
4. lifecycle 제재 API·이력 원자성·마지막 admin 보호 구현.
5. 운영자 지정 UI를 3역할 선택으로 변경하고 가입 화면에 권한별 제재 버튼 추가.
6. 테스트 DB에서 migration·역할 전환 검증 후 운영 적용 절차를 별도 승인.

확정된 기존 operator → admin 전환은 기존 운영 담당을 보존하며 신규 admin 권한을 부여하는 정책 변경이다.
서비스 역할이나 다른 공간 역할은 전환하지 않는다.
불필요한 legacy operator alias를 추가하지 않는다. 실제 CHECK 제약과 데이터 전환은 검토된 새 migration으로 수행한다.
운영 migration은 실행하지 않는다. 격리 PostgreSQL 15에서 전체 기준 스키마·incremental replay, 기존 역할 전환 및 실제 동시성을 검증했다.

## 8. 영향 소비처와 완료 기준

필수 API 소비처: CommunityMembership entity/migration, community-lifecycle,
community-operator-designation, community-scope, community-workspace,
community-access middleware, community-access resolver, communities.routes 및 연결된 Forum scope.
`expected-schema-states.ts`의 제약 검사와 migration contract tests도 함께 정합을 확인한다.
semi-franchise-community-access의 독립 가입 조회와 서비스 role catalog의 설명은 영향 여부를 확인하되 사업 원장을 바꾸지 않는다.
화면 소비처: communityOperator/communityServiceAdmin API 타입,
MyCommunityOperatorPage, CommunityServiceAdminPage, 커뮤니티 workspace의 운영 진입·표시.
회원 상태가 공개 서비스 진입을 제한하는 근거로 확장되지 않도록 공개 탐색 정책도 구분한다.

완료 검증은 A admin/operator/member와 B 역할, 중앙 서비스 admin/operator를 조합한다.
operator 제재 403, A 역할의 B 제재 403/404, 마지막 admin 변경 409,
유효 후임 지정 후 기존 admin 해제 성공, 기존 로그인 권한 차단,
A 제재의 B·서비스·공통 계정 불변, 동시 마지막 admin 변경 한 건 거절,
이력 저장 실패 시 상태 rollback, 정지 해제로 탈퇴·중앙 역할 회수 우회 금지를 확인한다.
실계정·실제 PostgreSQL 동시성 검증은 코드 단위 테스트와 별도로 수행한다.

## 9. 구현·배포 경계

작업 branch에 역할·상태, admin guard, 제재·이력 API, 중앙 역할 선택 및 회원 상태별 화면을 구현했다.
역할 변경과 제재는 사유를 필수로 받고 actor·시각·before/after를 같은 트랜잭션으로 보존한다.
이력 조회는 해당 커뮤니티 admin 또는 서비스 admin 전용이며 최근 50건을 반환한다.
자기 탈퇴 API와 자동 이력 삭제는 도입하지 않았다. 해당 정책은 별도 결정 대상이다.

migration은 기존 개별 operator 행만 admin으로 전환하고 가입 상태·다른 원장을 보존한다.
기존 CHECK 제약을 확장하고 이력을 만들며 기존 historical migration은 수정하지 않는다.
전환 후 down은 이력이나 새 역할·상태가 사용 중이면 거절하고 검토된 forward repair를 요구한다.

배포 전에는 운영 DB의 역할 전환을 포함한 migration 적용 승인이 필요하다.
현재 배포 방식은 migration을 새 API revision보다 먼저 적용하므로, 전환된 admin을 인식하지 못하는
구버전 개별 운영 경로가 새 revision 서빙 전까지 일시 차단된다. 유지보수 시간과 새 revision의 성공·실패 복구 절차를 함께 검토한다.
새 revision 배포가 실패하면 이전 operator-only 코드로 자동 data rollback하지 않고 중앙 서비스 운영자 경로와 검토된 forward 수정으로 복구한다.
이번 작업은 코드·문서 push까지이며 이 운영 절차를 실행하지 않는다.

개별 역할 지정 경로에는 공통 플랫폼 bypass 외에 명시 community 서비스 admin 판정을 추가했다. 플랫폼 계정이라는 이유만으로 개별 역할 지정 권한을 합성하지 않는다.
