# O4O 두 단계 계정 완전 제거 Core 변경 WO

> **상태**: ACTIVE
> **작성일**: 2026-10-12 · **최종 갱신**: 2026-10-13
> **근거 WO/IR**: [통합 WO §10~§11](WO-O4O-FRONTEND-INTEGRATED-STABILIZATION-V1.md) · [후속 TODO](TODO-O4O-INTEGRATED-PRIVACY-FOLLOWUP-V1.md) · [보존 조사](../investigations/IR-O4O-COMMUNITY-MEMBERSHIP-HISTORY-RETENTION-PROPOSAL-V1.md)
> **범위**: 기존 통합 WO 후속 Core/API 코드·격리 합성 검증. §2~§9는 승인 전 조사/제안 기록이며, 승인 후 실제 구현과 한계는 §10을 따른다. 코드/운영 준비 상태와 실제 계정·파일 파기는 구분한다.
> **초기 조사 기준(2026-10-12)**: 시작 시 fetch한 main `63653694b3bc35b4d127541fafb76f021df1bf68`; 로컬 격리 PostgreSQL의 schema metadata와 rollback 합성 fixture. 운영 DB/실계정/GCS 조회·삭제 0.

## 1. 확정 정책과 Core 승인 경계

개인정보 최소화와 서비스 Operator 사용중지 → Admin 전체 계정·일반 개인정보 완전 제거는 사용자 확정 사항이다. 가입/수행자 이력이 있다는 이유로 계정·프로필 전체를 유지하는 guard는 구현하지 않는다. 법정 최소 기록만 일반 회원정보와 분리해 기간까지 보관한다. 이 문서는 새 정책 재질문이 아니라 그 정책을 실행할 **새 Core/API·저장 구조**를 검토하는 구체안이다.

`CORE_CHANGE_REQUIRED`: [Core Freeze §3.1](../architecture/O4O-CORE-FREEZE-V1.md)은 “명시적 Work Order 승인 필요”를 요구하고 [AGENTS.md §5](../../AGENTS.md)는 Core/Frozen/shared/API 계약·DDL·운영 DB 변경의 새 위험 범위를 구분한다. 기존 정책 확정과 통상 push/정상 PR 병합/배포 허가는 아래 저장 구조·계정 삭제 API 계약 변경 또는 운영 삭제의 포괄 승인으로 기록하지 않는다. 이 phase는 runtime Core 파일을 변경하지 않는다.

승인 요청을 분리한다:

1. **구현 승인안**: §3~§8의 중앙 제거 orchestration, 두 DELETE 경로의 동일한 결과 계약, Admin 완료 상태 UI, 로컬 합성 검증, operation/개인 파일 재시도/법정 최소 기록을 위한 명시적 migration 파일 준비 및 격리 로컬 적용. 신규 역할을 만들거나 서비스 Operator에게 계정 삭제를 허용하지 않는다.
2. **운영 집행**: 실제 production DDL/migration, 계정·파일 삭제, retention apply/job 활성화, 법률 본문 DB 게시는 구체 diff·대상·dry-run·실행 계정·복구 한계를 확인하는 별도 승인 범위다. 문서 PR이나 구현 승인이 실제 운영 계정 삭제 테스트를 허용하지 않는다.
3. **별도 판단**: 현재 시스템의 법정 2년 요건, 분회 전용 원장의 보존/최소 기록, 새로운 공개 법률 본문 문구는 해당 책임자의 근거 확인 후 반영한다. 이미 확정된 달력 1년/해당 시 2년은 재질문하지 않는다.

## 2. 현재 API·권한·실제 소비처

| 경로/소비처 | 최신 코드 확인 | 처리 계약의 차이 |
| --- | --- | --- |
| `DELETE /api/v1/admin/users/:id` | `bootstrap/register-routes.ts`가 mount. `routes/admin/users.routes.ts`의 authenticate + DB role guard(`platform:super_admin`), Admin Google 세션 경계 | `AdminUserController.deleteUser`는 super_admin/Demo 보호 후 hard delete. FK 23503 실패 시 `isActive=false`·role 삭제 뒤 success=true. 일반 개인정보/파일 제거 성공이 아님 |
| `DELETE /api/v1/users/:id` | `routes/users.routes.ts`의 authenticate 이후 전역 requireAdmin, UUID 검증. requireAdmin도 DB의 `platform:super_admin`만 허용 | `UserManagementController.deleteUser` → `UserRepository.softDeleteUser` → TypeORM softDelete 시도. 현재 User 엔티티에 DeleteDateColumn 없음. 실제 soft-delete 성공이라고 단정하지 않으며 완전 제거 계약과 별개 |
| `apps/admin-dashboard/src/api/userApi.ts` | `/v1/users/:id` DELETE를 선언. identifier·URL·직접 호출·파일 경로/raw-source 테스트 검색 | `UserApi.deleteUser`의 활성 UI 호출은 검색에서 발견되지 않음. API 자체는 살아 있으며 데드 경로라고 삭제하지 않음 |
| `/users`·`/operators` | `UsersListClean`·`OperatorsPage`는 `/admin/users` 조회와 `/role-assignments/:role` 해제 | 역할 해제를 계정 제거로 바꾸지 않음. 새 제거 UI는 read-only `PlatformUsersPage`의 공통 계정 관리 맥락에 명시적으로 도입하는 승인안 |
| raw-source 소비처 | Admin authorization/menu/legacy route tests 및 API security/self-profile tests가 관련 경로·파일을 읽음 | Core 변경 시 이 테스트와 role guard를 함께 재검증. 단순 API client 이름 검색만으로 소비처 0 주장 금지 |

서비스 1단계는 `MembershipApprovalService.suspendMembershipCore`의 서비스 범위 가입 정지·관련 권한 중지 계약을 유지한다. 공통 계정·다른 서비스·내 매장 소유 원장은 자동 삭제하지 않는다. 현재 이 동작의 성공이 2단계 제거 완료 증명이 아니다.

근거: [Admin controller](../../apps/api-server/src/controllers/admin/AdminUserController.ts), [다른 controller](../../apps/api-server/src/controllers/UserManagementController.ts), [UserApi](../../apps/admin-dashboard/src/api/userApi.ts), [routes mount](../../apps/api-server/src/bootstrap/register-routes.ts), [승인/정지 service](../../apps/api-server/src/services/approval/MembershipApprovalService.ts), [세션 middleware](../../apps/api-server/src/common/middleware/auth/authentication.middleware.ts).

## 3. 로컬 schema census와 데이터 처리 단위

로컬 적용 schema에서 `users` 직접 FK는 **44개 테이블·60개 constraint**다: CASCADE 30, SET NULL 23, NO ACTION 6, RESTRICT 1. FK는 보존/소유 정책이 아니다. schema metadata에서 찾은 user/actor/author/contact/email/JSON 관련 **415개 후보 컬럼은 미분류 후보**이며 개인정보 전수 조사 완료나 운영 row 건수로 보고하지 않는다. 일반 문자열·첨부 외부 저장·이메일 키 기반 참조는 이 검색만으로 탐지되지 않는다. 구현 전 handler별 전수 분류와 snapshot 기준 재생성이 필요하다.

| 종류 | 확인한 테이블/필드 | 제안 처리 |
| --- | --- | --- |
| 공통 신원·자격 | users 프로필/연락처/avatar, kpa_pharmacist_profiles, kpa_student_profiles, member_qualifications, qualification_requests, kyc_documents | 개인 row·실제 개인 파일 제거. 약사면허 등은 전체 프로필을 법정 로그에 복제하지 않음 |
| 인증·세션 | linked_accounts, user_password_credentials, email_verification_tokens, password_reset_tokens, auth_social_flows, service_session_revocations, browser_session_revocations, handoff token 경로, users.refreshTokenFamily | pending 진입 시 모든 origin/device의 family 폐기·발급/refresh/handoff/연결 거절. 완료 시 개인 credential/flow row 제거. 은퇴한 refresh_tokens를 새 원장으로 복구하지 않음 |
| 개인 가입·권한 | service_memberships, role_assignments, community_memberships, forum_category_members, semi_franchise_operators | 권한/소속 책임은 현행 SSOT 유지. 개인 row 제거 전에 필요한 최소 처리 이력 분리. 가입 존재 자체는 보존 guard가 아님 |
| NO ACTION·RESTRICT | forum_post.author_id, forum_comment.author_id, kpa_pharmacist_profiles.user_id, kpa_student_profiles.user_id, kpa_pharmacy_requests.user_id, user_policy_acceptances.user_id, store_owner_termination_cases.user_id(RESTRICT) | 명시적 순서/책임 handler 없이 generic DELETE 금지. 약관 증빙은 목적/근거/기간을 검토하고 최소 법정 증빙과 일반 IP/UA/자유입력 분리. 사업 책임 종료 원장은 일반 계정 보존으로 해결하지 않음 |
| 위험한 business CASCADE | neture_suppliers.user_id는 CASCADE(DEFERRABLE); neture_pharmacy_memberships도 applicant CASCADE | 사용자 작성자가 사업체 자체의 삭제 권한을 뜻하지 않음. supplier/매장/사업 데이터 graph와 개인정보를 분리하고 필요한 소유·책임 이전을 transaction에서 처리. 고객/다른 사용자 자료를 연쇄 삭제하지 않음 |
| 커뮤니티 | communities creator/approver SET NULL; 요청자 CASCADE; membership CASCADE → membership_changes CASCADE, actor SET NULL | 최소 법정 기록 분리 완료 전에 현재 cascade 경로 실행 금지. 이유 자유문·대상/수행자 개인정보 파기. 커뮤니티 본체와 타인 글/댓글 보호 |
| 개인 활동 | forum_bookmark/like/notifications, assistant_tasks/run_frames/procedural_patterns, notifications.userId/actorId/metadata | 개인 내용/소속 제거. 다른 사용자 알림에 복제된 이름/프로필·JSON도 처리. assistant 본문/파일과 AI usage 메타를 같은 보존 대상으로 간주하지 않음 |
| 비FK/복제 참조 | media_assets.uploaded_by/updated_by, organization_members.user_id/metadata, kpa_members.user_id, cms_contents.createdBy/bodyBlocks/attachments/metadata, notifications, audit_logs.changes, action_logs.meta, ai_usage_logs.userId, contact_inquiries.email/phone, email_logs.userId/metadata, checkout_orders.shippingAddress/items/metadata | UUID·이메일·연락처·JSON 내부·파일 링크/캐시/검색 projection까지 handler census. 구조화되지 않은 내용은 소유·개인정보 분류와 처리 담당/기한을 정하고 미분류를 무기한 유지 근거로 쓰지 않음 |
| SET NULL audit | shared_product_description_audit_logs.performed_by, role_assignments.assigned_by, invitations, semi_franchise·supply 처리자 | actor NULL만으로 reason/meta 안의 개인정보가 지워지지 않음. 필수 행위 식별·시각/분류만 필요한 기간 동안 분리 |
| 분회 참조 영향 | branch_creation_requests(requester CASCADE/reviewer SET NULL), branch_memberships, annual_reports.values/revision_history/synced_changes, branch_fee_ledgers, branch_education_credit_ledgers | 공통 제거와 충돌하는 참조로 조사 대상. 전용 기능/기간/배포 변경은 제외하며 커뮤니티 1년 복사 금지. 신규 개발자·개인정보 책임자와 전용 기록 최소화/기간 contract를 분리 확정 |

### 3.1 파일·공용 자료·백업

`MediaLibraryService`는 업로더 UUID와 gcs_path/url 및 `media_entity_links`, derivative/root/parent, Screen Set 사용 참조를 관리한다. upload path는 `media/YYYY/MM/randomUUID`이므로 사용자 폴더 prefix 삭제만으로 개인 파일을 찾을 수 없다. 기존 `deleteAssetIn`은 사용 링크/파생물/Screen Set을 보호하고 GCS 실패 시 throw, 404는 이미 제거된 것으로 처리한다. 이를 account removal에 그대로 반복 호출하면 사용 중인 개인 정보 파일 정리가 영구 중단될 수 있으므로, **재사용 링크의 개인정보를 먼저 대체/제거하고 타인/사업 콘텐츠 보존**을 구체 handler로 해결한다. 업로더=개인 소유의 충분조건이 아니다.

product `ImageStorageService.deleteImage`는 실패를 warn으로 끝낸다. 계정 제거 worker는 이를 완료 증명으로 사용하지 않고 storage deletion 결과/재시도를 직접 검증하는 adapter가 필요하다. 개인 avatar가 외부 provider URL이면 외부 provider 계정을 삭제하지 않으며 O4O의 URL/캐시·복제본만 제거한다.

DB transaction과 GCS 삭제를 원자 transaction이라고 부르지 않는다. operation에 허용된 bucket/object 및 generation을 기록하고 그 generation만 조건부 삭제한다. 객체 재사용·동명 새 generation·404·429/5xx·403·timeout을 별도 검증한다. free-text 파일명/실제 key를 공개 로그에 남기지 않는다. GCS 버전/soft-delete·캐시 정책과 IAM은 현재 미확인으로, 확인 없이 “완전 제거”를 표시하지 않는다.

백업은 보유기간 정본의 7일 순환과 복원 시 재삭제/복원 차단 절차를 따르는 별도 단계다. snapshot/백업의 모든 과거 복제본이 즉시 없어졌다고 응답하지 않는다. restore 재삭제에 필요한 최소 지표의 필드·접근·만료도 migration review에 포함한다.

## 4. 제안 operation·API 결과 계약

기존 두 DELETE는 중앙 orchestrator 하나로 정렬하고 인증/현재 DB `platform:super_admin`·Google 세션·Demo/super_admin 보호를 동일하게 유지한다. 새 UI는 역할 해제와 완전 제거를 분리해 대상과 미완료 상태를 표시한다. 접근권을 넓히거나 기존 role-revoke route를 폐기하지 않는다.

제안 응답은 HTTP **202** `data.state=pending|processing|retry_required`, `data.erased=false`, opaque operation ID로 접수·미완료를 표시한다. HTTP **200** `state=completed, erased=true`는 §6의 완료 검증 후에만 반환한다. `success=true`가 있더라도 접수 여부일 뿐 완료가 아니며 UI는 state/erased를 확인해야 한다. 실행중 중복 요청은 같은 operation, 이미 완료된 같은 idempotency key도 같은 결과를 반환한다. operation에 없는 대상 404는 완료라고 주장하지 않는다. 신규 GET operation-status는 같은 platform 권한으로만 조회한다. 과거 success-only client와 호환·안내를 함께 검증한다.

제안 저장 구조는 migration review에서 최소 컬럼/기한을 확정한다:

- `account_erasure_operations`: operation UUID, 일시적인 subject UUID, state, handler version, idempotency key hash, 단계별 counts, 재시도 시각/횟수, safe error code, 담당/기한. email/name/phone/원본 요청·응답 payload 금지.
- `account_erasure_file_tasks`: operation 참조, 제한된 bucket/object/generation, 상태·retry. 파일 key는 restricted worker만 열람하고 완료 후 제거. 영구 개인정보 원장으로 쓰지 않음.
- 법정 최소 기록: 기존 live membership/user FK와 독립된 증빙 구조에 사건 UUID, pseudonymous subject/actor 키, community/service scope, action·변경 role/status, 원래 created_at, 보존 class/근거·expires_at만 허용. reason·프로필·이메일/연락처·원본 JSON 복제 금지. 보존 목적별 접근을 분리하고 만료 시 파기. 모든 일반 활동을 법정 기록으로 복제하지 않음.

terminal operation/idempotency/restore 지표의 보존 필요·기간은 별도 field-level contract에 명시하며 users/profile tombstone을 그대로 남기지 않는다. 이러한 신규 operational metadata의 기간은 커뮤니티 1년으로 자동 결정하지 않는다. 현재 이 저장 구조·실제 worker·API 계약은 **미구현**이다.

## 5. 삭제 순서·실패·재시도·동시성 계약

1. **scope/manifest**: 현재 DB 권한 및 보호 대상을 확인하고 개인/사업/타인/법정 minimum handler manifest를 만든다. 각 서비스 Operator의 사용중지 처리 증거와 담당을 연결하되 가입/수행자 기록만으로 계정 유지를 강제하지 않는다. 중지 실패·사업 책임 이전 필요는 작업 단계/담당/기한으로 추적한다.
2. **원자 pending fence**: `users FOR UPDATE`와 subject별 operation uniqueness로 중복 요청을 통합한다. pending 상태와 family 회전/인증 차단을 같은 commit에 기록한다. 사용중지와 공통 계정 접근 차단을 구분한다.
3. **writer fence**: 가입·역할 부여·profile·글/댓글·file upload·social-link/handoff writer가 같은 subject fence를 확인해야 한다. 신규 업로드는 GCS 업로드 전/DB link commit 전 재확인하고 commit 실패의 신규 객체도 정리 task에 기록한다. FK 없는 JSON/이메일 writer와 진행 중 요청도 포함한다. users 잠금 하나만으로 모든 비FK writer가 차단된다고 가정하지 않는다.
4. **증빙 분리 및 DB 제거**: 원래 생성시각/분류의 필요한 최소 법정 기록을 idempotent event ID로 분리한다. 같은 DB transaction에서 개인 FK/비FK/복제 자료 정리 및 사업 책임 이전, file manifest 확정, 완료 후 verification용 residual count를 기록한다. 단순 cascade나 generic user DELETE 먼저 실행하지 않는다.
5. **storage worker**: durable task claim/lease, generation 조건부 삭제, 404는 완료, 일시 실패 exponential backoff, 권한/분류 오류는 retry_required + 담당/기한. GCS 일부 삭제 뒤 DB rollback 가능성을 감안하고 살아 있는 콘텐츠 링크가 유실되지 않도록 순서/manifest를 검증한다. 완료된 외부 삭제를 rollback했다고 주장하지 않는다.
6. **rescan·최종 DB 제거**: 등록된 모든 handler의 개인 잔여·세션 발급/refresh·법정 분리 및 파일 task를 확인하고 마지막 users 삭제를 commit한다. FK 실패/unknown reference는 safe error와 미완료 counts로 반환하며 비활성화 성공으로 감추지 않는다. 일반 프로필 보존을 예외의 기본 처리로 채택하지 않는다.
7. **completed**: live 개인정보/개인 객체 부재, 인증 거절, 최소 증빙 분리 및 사업/타인 자료 보존 검증을 충족한 뒤 완료한다. worker crash/중복 요청/동시 역할·가입·재업로드/법정 hold 변경을 lease+version 기반으로 다시 판정한다. hold의 존재는 users/profile 보존 사유가 아니다.

DB cleanup 중 실패는 rollback하여 pending fence와 durable retry 상태를 보존한다. file task 완료 증명 없이 operation을 completed로 올리지 않는다. 사용자 프로필·object key를 exception log에 덤프하지 않는다. unresolved 데이터 분류는 책임자/해결 기한과 escalation을 요구하며 무기한 보관/가짜 성공으로 끝내지 않는다.

## 6. 완료 판정과 합성 검증의 한계

완료 조건은 **handler/file manifest 전수 확인 + DB 개인 잔여 확인 + 모든 origin/device 세션 거절 확인 + 개인 file 삭제/이미 없음 + unresolved 참조 0 + 필수 법정 기록 분리**다. 빈 manifest만으로 파일 없음이라고 판정하지 않는다. 단순 roles=0/isActive=false/PID/200은 이 조건의 대체물이 아니다.

[read-only 설계 planner](../../scripts/privacy/community-retention-plan.mjs)와 [11개 경계 테스트](../../scripts/privacy/community-retention-plan.test.mjs)는 달력 기간·재가입/복구·불명확 anchor/hold·미완료 성공 방지의 **제안 계약**을 검증한다. API/job에서 import하지 않으며 DB/GCS 삭제를 구현하지 않았다. [로컬 FK fixture](../../scripts/privacy/verify-erasure-fk-fixture.mjs)는 실제 schema에서 fallback 프로필 잔여·actor reason 잔여·target cascade를 재현하고 rollback 후 fixture 부재를 확인했다. HTTP handler/worker/실제 세션 무효화·GCS·동시성 검증이 완료됐다는 의미가 아니다.

구현 후 필수 추가 검증: 두 DELETE 실제 권한/Google 경계·Operator 거절·Demo/super_admin 보호, scoped stop, 여러 서비스/브라우저의 기존 access/refresh/handoff 거절, 잘못된 classification, legal minimum의 CASCADE 독립, 사업/타인 내용 보호, FK/비FK/이메일/JSON/첨부 잔여, DB rollback·부분 file 실패/404/generation 재사용·worker 재시작/중복·동시 writer. 실제 계정 삭제 대신 격리 합성 fixture로 실행한다.

## 7. 커뮤니티 분류·2년·예외/파기 제안

정본의 각 row created_at + **Asia/Seoul 달력 1년**, 해당 시스템 법정 요건이면 **달력 2년**을 사용한다. 2월29일은 만료 연도에 기념일이 없으면3월1일 같은 시각이다. 탈퇴/재가입/복구는 이전 timestamp/classification을 다시 생성하지 않는다. 기본1년 확정과 실제 2년 해당 여부 조사/자동 job 활성화는 별개다.

| 사건 출처 | 분류 제안 | 구현 전 확인 |
| --- | --- | --- |
| 커뮤니티 개설 reviewer의 create, 승인/반려, role, suspend/restore, 운영자 withdraw | 개인정보취급자 처리 증빙. 필요한 최소 필드만 일반 내용과 분리 | 실제 처리 시스템·현재 개인정보 항목·규모·민감정보/고유식별정보 취급 및 법률 담당 근거로 1/2년 판정 |
| 본인 withdraw | 기본1년 변경 이력; 본인 동작을 운영자 취급 증빙이라고 자동 판정하지 않음 | 원래 사건 출처와 목적을 구조화. 계정 제거 때 법정 필요가 없는 개인 내용은 파기 |
| migration | 배포/시스템 처리 출처. action 문자열만으로 사람의 개인정보 열람 증빙이라고 간주하지 않음 | 원본 migration/작성 근거·대상과 anchor를 확인. 알 수 없는 actor를 임의 보완하지 않음 |

정본의2년 요건은5만 명 이상 정보주체 또는 민감정보/고유식별정보 등 해당 시스템 기준이다. action/reason·로컬 fixture 규모·과거58명 기록으로 현재 미해당을 단정하지 않는다. 시스템의 평가 근거/평가일/담당, 적용 기간과 기존 기록 상향 처리 원칙을 기록한다. 분회 전용 신고/회비·교육 원장의 기간을 이 판단으로 확정하지 않는다.

실제 분쟁/법정 예외는 관련 최소 event만 사건 근거·책임자·구체 종료 사건/날짜·다음 검토 기한과 restricted access로 분리한다. 단순 reason/사유 미입력/unknown class는 무기한 hold가 아니다. 검토 기한 만료는 review-required로 escalation하며 자동 연장하지 않는다. 종료 이벤트가 확정되면 예외를 해제하고 **원래 법정/base 만료일과 실제 적용 법정 종료**를 다시 계산한다. 만료된 row만 batch 파기하고 현재 membership/권한/콘텐츠는 삭제하지 않는다.

현재6개 generic retention target에 community_membership_changes는 여전히 없다. 새 planner를 운영 job에서 사용하지 않았으며 generic365일을 그대로 복사하거나 기존 job 범위를 확대하지 않았다. 분류·예외·증빙 분리 migration·dry-run 증거·운영 승인 이후에만 집행한다.

## 8. 법률 본문·게시·사용자 테스트 후속

인증 담당 [CHECK의 최신 완료 기록](../checks/CHECK-O4O-AUTH-KAKAO-AND-EXPLICIT-LINK-V1.md)을 재사용한다. #457/#497 serving/Demo, #498/#500 My Home 배포 완료와 아직 미실행인 일반 계정/OAuth를 구분한다. 실제 공고2026-10-12 KST, 시행 예정2026-11-13 KST·30일 요건을 충족한 뒤 기존 정책 게시/재동의 flow를 사용하며 오늘 새 정책 DB 게시를 실행하지 않는다.

현재 `services/web-neture/src/content/legal/neture-account-terms-v2.txt` 제7/12/14조는 처리방침·법령/실제 절차를 참조하지만 이번 두 단계 완전 제거·달력 보존의 구체문을 포함하지 않는다. 이 사실을 기존 공개 본문의 승인이나 이번 개정안이 공고에 자동 포함됐다는 근거로 삼지 않는다. 전문을 이 WO에 복제하지 않는다.

| 기존 담당 본문 | 이번 정책과의 대조 | 시행 전 남은 조치 |
| --- | --- | --- |
| [공통 개인정보 초안](../design/DESIGN-NETURE-ACCOUNT-PRIVACY-V2.md)와 `neture-account-privacy-v2.txt` §4 | “기존 보유기간을 변경하지 않는다”, 탈퇴/목적 종료·일반1년/로그30일·법정 분리만 기재. 커뮤니티 달력1/2년·두 단계 구체문 없음 | 정본 §2/§6.1과 대조해 문구·version/content hash·공고 포함 범위 확정 |
| 같은 본문의 §6 | 미제공 자동 탈퇴/미디어 파기 기능을 약속하지 않는 현행 제한을 명시 | 실제 구현/검증·배포 전 완료 표현 금지. 파일/백업/실패·재시도 범위와 새 시행 계약 대조 |
| [서비스별 본문](../design/DESIGN-NETURE-SERVICE-POLICY-BODIES-V2.md)와 `service-policies-v2.txt` 공통 원칙·커뮤니티 개인정보 | 기존1년 보유·새 보유기간 신설 없음, 닉네임/가입/역할/활동 목적 안내 | 커뮤니티 변경 이력 최소 항목·법정2년·예외/파기 추가를 기존 초안에서 통합 검토. 분회 기간을 함께 신설하지 않음 |
| `AccountPolicyNoticePage.tsx` | 공고2026-10-12·시행 예정2026-11-13, 위 raw 본문 import | 32일의 달력 차이가 실제 공고/중요 변경의 법적 요건 충족을 자동 증명하지 않음. 새 중요한 문구가 기존 공고 범위인지 담당 확인 후 실제 게시 상태·version/hash 검증 |

후속 공개 후보는 [기존 보존 조사 §4](../investigations/IR-O4O-COMMUNITY-MEMBERSHIP-HISTORY-RETENTION-PROPOSAL-V1.md#4-개인정보-처리방침-개정-문구-제안--게시-전)를 재사용한다. 새 공개 본문/공고 자산을 이번 설계 phase에서 바꾸지 않았으며 이 후보를 이미 공개된 현행 정책이라고 주장하지 않는다.

법률 게시·재동의는 시행 조건과 그 운영 실행 승인 후의 별도 작업이다. 마지막 사용자 실계정 테스트는 기존 통합 WO/TODO의 운영자 공급자/내 매장·Google/Kakao·명시적 연결/서비스 이동·본인 My Home·약국 홈·공개 지정/비로그인/철회를 유지한다. 분회 전용 기능 개발/배포·이전 환경 삭제는 이 작업에서 실행하지 않는다.

## 9. 이 phase 결과와 미완료

- 최신 main/정본/인계 확인, TODO 초안/보완, 두 API·소비처·60 FK와 비FK 후보·GCS 연결 차이 조사 완료.
- 로컬 의존성 frozen-lockfile 설치 완료; 달력/제안 completion11개 tests 및 로컬 SQL counterexample·rollback 검증 PASS.
- runtime Core/API/DDL/운영 삭제/법률 게시/분회 개발·배포는0. schema metadata census는 운영 개인정보 전수 분류/worker 완성을 증명하지 않는다.
- 다음 단계는 §1의 **구체 Core/API/DDL 코드 준비·격리 로컬 검증 승인**이다. 승인 후 handler 전수 분류·implementation·관련 E2E·PR/main 통합을 수행한다. 운영 migration/삭제/job 게시와 법률 본문 시행은 각각의 범위/조건을 따로 확인한다.

문서 정합: 과거 FK 실패 성공/soft-delete/GCS 미연동 문제를 완전 제거 완료로 표시하지 않는다. 당시 분회 실패/HELD·인증 대기는 최신 담당 완료 기록으로 해소됐으며 새 분회 개발·정책 집행 완료로 확대하지 않는다.

## 10. 승인 후 구현 phase — 2026-10-12

사용자는 §1의 Core/API/migration 코드 준비와 격리 합성 검증을 승인했다. 같은 코드 승인을 다시 요청하지 않는다. **운영 migration·실계정/개인 GCS 삭제·retention job 활성화·법률 게시 승인은 포함하지 않는다.** §2~§9의 미구현/다음 승인 문구는 조사 phase 당시 기록이며 다음 결과를 함께 읽는다.

### 10.1 실제 처리와 완료 계약

두 기존 DELETE를 `AccountErasureService`로 통합했다. 인증·현재 DB platform super admin·기존 Admin Google 경계를 유지하며 Demo/super admin을 보호한다. 사용 중인 서비스는 Operator가 먼저 중지해야 한다. 검증된 이메일의 묵시적 Neture 접근도 scoped stop으로만 suspended 원장을 만들며 다른 서비스나 전체 계정은 중지하지 않는다. 가입/수행자 이력 자체를 계정 유지 guard로 쓰지 않는다.

operation의 pending 진입과 계정 비활성화/token family 회전은 원자 처리한다. 상태/재시도/capability API와 Admin UI는 `completed && erased=true`만 완료로 표시하며 접수/검토/재시도는202·미완료다. 고정24시간 검토 기한을 재시도 때 연장하지 않는다. 자동 retry/backoff/lease worker는 아직 등록하지 않았으며 권한 있는 Admin의 명시적 retry를 사용한다.

새 migration은 operation·개인 파일 task·일시 reference keys·독립 커뮤니티 최소 증빙·제거 최소 audit 5개 테이블과 writer fence를 추가한다. 커뮤니티 최소 증빙은 원래 created_at의 KST 달력1/2년(µs 보존, 윤일3월1일 규칙), 사건/목적별 보존 근거만 사용하며 재가입/복구로 초기화하지 않는다. 프로필·reason·이메일·전화번호를 복제하지 않고 live user/membership/community FK를 두지 않는다. 본인 탈퇴/migration은 자동으로 법정 취급 증빙에 승격하지 않는다. 시스템1/2년 판정과 근거 입력은 활성화 전 필수이며 테스트용1/2년이 운영 법률 판단을 대신하지 않는다.

보존 maintenance는 명시 호출·기본 dry-run이다. 검토 기한이 지난 hold를 자동 연장하지 않으며 종료 후 원래 만료일을 따른다. 기존6개 retention target/job과 `community_membership_changes` 자동 파기 범위는 바꾸지 않았다. 완료 operation/restore fence는7일 만료이며 실제 파기는 승인된 maintenance가 필요하다. 최소 audit은 최초 요청자와 실제 완료 수행자를 구분하며, 모든 retry 수행자를 기록하는 새 활동 원장은 아니다.

### 10.2 구현 범위와 운영 활성화 전 필수 잔여

검토된 개인 소유 row(인증·세션·개인 자격/profile·알림·북마크·일부 assistant·membership/role)만 명시 순서로 제거한다. canonical schema의 문자열/JSON/다른 Users/소유 row UUID를 재조회하고 미분류 business·타인 글·약관 증빙·분회 원장·공유 파일·개인 첨부는 `review_required`로 남긴다. 이 상태는 계정/일반 개인정보 제거 **미완료**다. 415개 후보 전체 handler 분류, 사업 책임 이전, branch 최소 기록 목적/기간, 검색/캐시/백업/외부 저장 전수 inventory는 아직 완료하지 않았다. 그 잔여를 일반 계정의 무기한 보관 정책으로 승인하지 않는다.

DB writer는 전역 shared transaction advisory barrier를 거치며 manifest/final rescan은 exclusive barrier를 사용한다. 먼저 시작한 비FK writer를 기다린 뒤 snapshot을 만들고 완료된 UUID/reference의 복원을7일 차단한다. 전역 barrier와 전체 값 census의 운영 규모 latency/lock 영향은 미측정이다. DB deadlock/오류는 rollback 후 미완료·retry로 처리하며 모든 외부 upload producer의 선행 GCS upload/orphan task 계약까지 구현된 것은 아니다. 운영 활성화 전 producer와 파일 inventory 경계를 닫아야 한다.

GCS adapter는 소유 bucket의 avatar에 대해 객체 metadata `o4o_owner_user_id`와 `o4o_asset_purpose=personal`을 확인하고 durable generation을 먼저 commit한 뒤 조건부 삭제한다. 업로더/URL만으로 소유를 추정하지 않는다. metadata가 없는 legacy 객체·공유 참조·기타 개인 첨부는 검토 대상이다. 실제 GCS/IAM/soft-delete/버전/복제/캐시는 미검증이며 synthetic adapter/SDK mock 검증을 운영 완전 제거 증명으로 사용하지 않는다.

기본은 **비활성화**다. 활성화에는 `ACCOUNT_ERASURE_MODE=apply`, `ACCOUNT_ERASURE_FILE_INVENTORY_REVIEW=confirmed`, `ACCOUNT_ERASURE_SYSTEM_YEARS`, `ACCOUNT_ERASURE_SYSTEM_POLICY_BASIS`와 migration 존재가 모두 필요하다. 이번 작업은 이 운영 값을 설정하지 않았다. inventory confirmed를 미완료 파일 전수 조사 대신 입력하지 않는다.

### 10.3 검증 및 통합 추적

격리 PostgreSQL 실제 schema/합성 계정 테스트22개: 두 실제 HTTP 경로·실제 JWT/현재 DB role·보호 대상·scoped stop·중복/비FK 동시 writer·개인/타인 자료·최소 증빙·기존 access/refresh/handoff와 stale 발급·file failure/retry·ownership/inventory·restore fence·달력 µs/hold 검증 PASS. 실제 Google/Kakao OAuth나 실계정 테스트는 아니다.

승인/정지 회귀7 suites157개, 인증 회귀6 suites182개, Admin UI6개, 설계 planner11개 PASS. API build·Admin typecheck/build·migration contract21 checks PASS. 실제 Chromium에서 합성 API를 사용한 제거 control을1440/375/320 폭으로 확인(3 checks); 일반 사용자 전체 앱/OAuth 검증을 대체하지 않는다. storage SDK mock과 PR CI/검토·main/Delivery 최종 결과는 [공통 영향 CHECK](../checks/CHECK-O4O-TWO-STAGE-ACCOUNT-ERASURE-V1.md)에 기록한다.

새 empty disposable DB에서 정식 migrate runner의 baseline→23단계 전체 적용·pre/post schema assertion PASS: 최종 `c45f9b5235a55aa0c5e008b159c7bc2bf0ddab97f9cc743d88322e916d12a45f`, 6617 lines. 격리 empty fixture down은 기존22단계 fingerprint로 복귀하며 up은 새 fingerprint를 재현했다. 운영 DB migration/기존 실제 row 조회·삭제0. 데이터가 존재하는 새 원장의 down은 거절하며 운영 복구는 별도 forward repair review다.

법률 새 본문·게시/재동의·2년 해당성 판정과 마지막 사용자 테스트는 §8/TODO의 후속이다. 분회 전용 개발/배포와 이전 환경 삭제는 수행하지 않는다.

재시도 권한 회수 회귀 PASS: 준비·파일 단계·최종 DB commit에서 현재 platform super admin을 재확인한다. 회수된 권한의 retry는403이며 operation을 재분류/수정하지 않는다. 최종 격리 DB22개+storage mock4개=26 tests PASS.

UUID 없는 고유 이메일/출처 식별자의 문자열·JSON 재복사도7일 writer fence로 차단하는 합성 회귀 PASS. restore key에는 원문 대신 해시·문자 길이만 저장하며 완료 시 transient UUID를 제거한다. 이 추가 fence의 운영 성능/충돌 영향도 활성화 전 평가 대상이다.

Codex `f8fc042`의 P1/P2 처리: 공통 이름·닉네임·IP·전화·avatar/business 값은 타인의 정당한 데이터와 구분되지 않으므로 단독 자동 차단/해시 fence에서 제외했다. 고유 UUID/이메일/provider·소유 row 출처 식별자로 연관 복제를 검출하고 source UUID가 있는 이름 복제는 계속 미완료다. 분류 근거 없는 타인 이름을 지우지 않는다. 실제 완료 Admin이 audit actor를 기록하고 최초 요청 event는 원래 요청자를 유지한다. 동명이인/공통 접속·연락처 보존과 두 Admin의 요청/완료 구분을 포함한22+4 tests PASS.

PR CI shard2 실패를 로컬 전체 shard로 재현했다(155 suites2635 tests PASS, 실패1개). 원인은 email verification token consumer를 인증 발급 경로 하나로 고정한 기존 source guard였다. 계정 제거의 소유 토큰 파기 경로를 명시적으로 추가하고 토큰 INSERT/UPDATE 부재를 검증한다. 수정된 정적 인증/Demo guard26 tests PASS; 전체 PR CI 재실행 결과를 통합 gate로 사용한다.

main #503(`64b8df16f1`)의 직원 접근/My Home 정본을 확인하고 정상 merge로 통합했다. 해당 소유 트랙 기능을 이 작업에서 재구현하지 않았다. 역할 is_active뿐 아니라 valid_from/valid_until을 각 제거 단계의 현재 시점으로 재확인한다. 만료/미시작 역할은 요청·retry403이며 기존 operation을 변경하지 않는다. 최신 main 통합 후 격리 DB22+storage4+정적 인증17=43 tests, API build·lint PASS.

### 10.4 검증 후속의 실제 최종 범위

[CHECK의 PR #507 후속](../checks/CHECK-O4O-TWO-STAGE-ACCOUNT-ERASURE-V1.md#검증-후속--pr-507)을 적용한다. 현재 및 예정 super admin target grant를 보호하고, caller는 현재 유효 grant만 인가한다. 타인의 긴 이메일/metadata actor를 대상 신원으로 추정하지 않으며 동일 연락처의 새 UUID 가입과 원래 calendar anchor를 유지한다. typed providerId/provider_id는 AuthProvider 전체 namespace를 구분하고, 일반 memo/저장소 provider에는 namespace를 확장하지 않는다. 후보는 SQL 경계 검사 후64행 cursor로 처리한다. 전체 alias/domain/file handler 완료를 의미하지 않는다.

최종 집중 DB37+storage4+정적 인증17+Demo9=67 tests·API build·focused lint PASS. #505/#507 정상 main 통합·각 post-merge CI PASS. #507 main은 `b1570cc9bf9dcd1440c2ec37bf46afb06ce6fa5f`다. API/Admin 선택 dry-run만 실행했으며 실제 운영 DDL/배포·계정/GCS 제거·job/법률 게시0이다. 운영 활성화 전 잔여는 §10.2와 CHECK를 따른다.

### 10.5 legacy 완료 operation의 연락처 marker retirement

24단계 migration은 완료 operation까지 legacy identity hash를 파기하고 UUID-only writer 함수를 적용한다. table lock 안에서 UUID-only CHECK를 추가해 구버전 serving API의 hash 재삽입도 거절한다. capability/ready는 이 제약의 validated 상태를 필수로 확인한다. 최종 schema 지문 `0d25da3dee92c48e7457571661be41c369fe27066009798e038309f5d20c4b50`,6618 lines이며 fresh baseline→24/기존23→24/no-op·migration contract21 checks PASS.23단계 원본/지문은 불변이다. 새24단계 코드·격리 검증은 승인된 Core WO 재검토 수정 범위이며 실제 운영23/24 적용은 별도 승인 대상이다. 파기한 연락처 hash를 복원하지 않고 forward repair를 요구한다.


### 10.6 운영 준비 상태 재확인 — 2026-10-13

사용자가23/24 migration 및 기능 OFF API/Admin 실행안을 승인했다. 현재 운영은 소유 트랙의 API/Admin verified target `88d45b8208`까지 이미 반영됐고23/24/25 history가 준비 상태다. 이번 standalone read-only plan38336196583도 세 history=true·schemaReady=true를 확인했다. 중복 DDL/재배포를 실행하지 않았다. 배포 설정은 erasure flags를 주입하지 않아 코드 기본 OFF이며, 실제 super-admin capability 응답은 마지막 본인 Google 검증으로 구분한다.

상세 run/증거와 한계는 CHECK의2026-10-13 절을 따른다.12일 dry-run/HELD/운영 실행0 문구는 당시 기록이다. 운영 준비 확인으로 §10.2의 전수 분류·법정 적용 근거·GCS/backup/producer·lock 검증을 완료하거나 계정/파일 파기·job/법률 게시를 승인했다고 해석하지 않는다. 마지막 일반 계정/본인 OAuth/운영자 테스트도 아직 미완료다. 같은 통합 WO를 ACTIVE로 유지한다.

### 10.7 필요한 내부 정비 후 원래 후속 재개 — 2026-10-13

사용자 지시: 앞으로 반복 정비를 전제로 지금 효과가 있는 항목만 선별해 정비하고 원래 작업을 재개한다.
같은 ACTIVE Core WO의 연속 phase이며 기존 `wo/integrated-account-erasure-contract` 작업공간을 유지한다.
시작 시 최신 main `38d0eb81df`를 clean 상태에서 정상 fast-forward로 반영했다. 완료된 phase2 작업공간은 재사용하지 않는다.

선별 기준: 다음 작업의 수정 지점을 줄이고, 현재 검증으로 동작 보존을 확인할 수 있는 내부 중복만 처리한다.
- 선택: request transaction과 resume 준비 transaction의 현재 super-admin 검사. 같은 WHERE/시각/오류/행 잠금이며 기존 assertActor와 동일하다.
- 유지: request 초입의 non-locking 검사. transaction의 FOR SHARE 검사를 이 시점으로 옮기지 않는다.
- 유지: 대상 계정의 예정·유효 super-admin 보호는 caller 인가와 다른 규칙이므로 합치지 않는다.
- 이번 제외: 서비스 간 공통화, 광범위한 파일/함수 분해, 회원 수정 원자성·권한 계약 변경, 키오스크 확장.

TODO 및 구현 전 검증:
- [x] 최신 main·승인된 Core WO·현재 서비스·검사 시점/SQL/lock 및 기존 합성 회귀 대조.
- [x] 수정 전 전용 local PG 55469에서 기존 제거/파일 회귀 기준 확인.
- [x] 두 transaction의 중복을 기존 private assertActor 호출로 정리, preflight/target 검사는 보존.
- [x] 같은 실제 PG/인증·파일 회귀와 타입/빌드·lint로 동작 보존 확인.
- [x] 원래 §10.2의 domain/file/producer inventory를 현재 schema·source 기반으로 재개하고 검증된 처리/미분류를 구분.
- [ ] 변경 scope commit/push·required CI/review·정상 main 통합 및 현재 Delivery 판정.

기존 Core 구현/운영 준비를 재구현하지 않는다. flags OFF를 유지하며, 실제 운영 계정·파일 제거,
자동 파기 job, 정책 본문 게시/재동의, 새로운 운영 DDL은 이번 작업에 포함하지 않는다.

원래 §10.2 파일 조사에서 실제 producer(`business-registration-document.service.ts`, supplier onboarding/regulation)가
`gcs://...` 및 camelCase `fileUrl`을 저장함을 확인했다. 기존 private 첨부 predicate는 `gs://`/Google HTTPS와
snake_case `file_url`만 인식하므로 미검토 개인 KYC manifest를 없애고 완료로 표시할 수 있다.
이는 이미 승인된 미분류 개인 파일의 review_required 계약을 충족시키는 수정이다.
새 삭제 범위/파일 handler/보존 정책·GCS 실행·권한/API/DDL 변경은 도입하지 않는다.

- [x] 실제 KYC schema의 gcs://·외부 HTTPS fileUrl·기존 gs://를 합성 회귀로 재현(RED 확인).
- [x] 이미 있는 PRIVATE_ATTACHMENT_MANIFEST_REVIEW_REQUIRED 조건에서 scheme/필드 표기 누락만 보완.
- [x] KYC 원장/manifest·계정 보존 및 completed audit/외부 storage 호출 부재, 전체 회귀 확인.

검증 결과: 수정 전41 PASS. 실제 KYC producer 회귀2 RED/기존gs1 PASS를 확인한 뒤
전체44 PASS. native PG+실제 loopback HTTP 검증은 local CLI testTimeout=15000을 사용했으며
기본5초 route1건의 일시 timeout도 기록했다. Assertions/test source timeout·운영 SLA는 바꾸지 않았다.
source type-check/build PASS, focused ESLint0, migration contract21 PASS/0 FAIL, whitespace PASS.
작업공간의 stale auth-utils dist는 기존 package build로 갱신해 Demo 타입6개 오류를 해소했다.
새 dependency/lockfile/CI/workflow 변경0.

현재25단계 공식 fresh bootstrap/assertion과 READ ONLY metadata collector를 검증했다.
307관계/3944columns/44관계60 FK, 기존private owner27관계, 추가domain273관계, 신원·문자열·JSON 후보2595개와
파일이름 후보222개를 구분했다. row/실제 파일/법정 보유 승인 또는 모든 handler 완료를 뜻하지 않는다.
remote host/다른 port/다른 database 거절과 출력 미생성도 검증했다.
상세 source/producer/다음 큰 묶음은 [inventory IR](../investigations/IR-O4O-ACCOUNT-ERASURE-DOMAIN-FILE-INVENTORY-V1.md)를 따른다.

최신 main #549의 AI 통합/신규26단계를 정상 merge해 조사 범위를 갱신했다. 개인 제거 source 변경은 겹치지 않는다.
새 격리 bootstrap/assertion·collector는26단계087e2d4c/6650 lines,308관계3965columns/기존private27/추가domain274/후보2608을 확인했다.
users FK44관계60개는 동일하다. 신규 ai_usage_reservations는 비FK user_id/JSON과 trigger0이므로
미분류 domain/producer/writer 검증 잔여에 포함한다. 과거25단계 결과를 현재 운영 schema로 주장하지 않는다.
현재 ai-core dist를 기존 package build로 갱신한 뒤 API type-check/build PASS.
운영26 migration은 AI 소유 WO에서 별도 명시 승인 대상으로 남겼으므로 기존23/24 승인으로 실행하지 않는다.
