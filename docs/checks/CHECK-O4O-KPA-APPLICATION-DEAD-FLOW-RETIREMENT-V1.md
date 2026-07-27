# CHECK-O4O-KPA-APPLICATION-DEAD-FLOW-RETIREMENT-V1

> WO: `WO-O4O-KPA-APPLICATION-DEAD-FLOW-RETIREMENT-V1`
> 성격: KPA `KpaApplication` 범용 신청 dead flow 폐기. 소비처 제거, entity+table HOLD.
> **DB write 0 · migration 0 · DROP 0.** Date: 2026-07-27 · commit `43ae74846`(5파일) · Deploy API+Web success · smoke PASS

## 0. 결론 — ✅ PASS

census `kpa_applications=0` 재확인 후 dead flow의 live route·frontend tab·dashboard 의존을 전량 제거.
중지 조건 #1(이메일 shared)·#2(entity/migration coupling) 발동 → 이메일 함수·entity·table는 **KEEP/HOLD**.
canonical 회원 승인 경로 무접촉(회귀 검증만). 최종: live route 0 / frontend 소비처 0 / 대시보드 소비처 0 / write 경로 0.

## 1. 제거한 backend route·controller

- `application.controller.ts`(454줄, KpaApplication 전용) **파일 삭제** — 7 route(POST /·GET /mine·GET /:id·
  DELETE /:id·GET /admin/all·PATCH /:id/review·GET /admin/stats) 소멸.
- `kpa.routes.ts`: `createApplicationController` import + `router.use('/applications', …)` mount 제거.
- barrel 없음(직접 import). 전용 DTO/test 없음.

## 2. 제거한 frontend tab·CTA

- `MemberManagementPage.tsx`: '가입 신청서' outer tab·`ApplicationsTab` function(186줄)·`appStats`/`reloadAppStats`
  (`/applications/admin/stats`)·`?tab=applications` deeplink·`canReviewApplications`/`outerView` state·
  `KpaApplication`/`ApplicationStats`/`ApplicationStatus`/`appStatusConfig` type·미사용 import(useSearchParams·
  ConfirmActionDialog·useAuth·ROLES·4 아이콘) 제거 → **`OperatorMembersConsolePage` 직접 렌더**.
- 회원 관리 canonical 부분(list·상태 approve/reject/suspend/restore/withdraw·KPA edit·password·drawer·batch) 전부 보존.
- 전용 api client 파일 없음(inline apiClient). 정리 대상 0.

## 3. 이메일·dead review URL 처리 (중지 #1)

- KpaApplication 이메일 4종(`sendServiceApplication{OperatorNotification|Submitted|Approved|Rejected}Email`, mail-core)은
  **glycopharm·kpa/organization-join-request 와 SHARED** → 함수 미삭제. KpaApplication 호출 site는 controller 삭제로 자동 소멸.
- review URL `/operator/kpa/applications/:id` 는 controller 문자열에만 존재 → 파일 삭제로 소멸(서빙 route 0).

## 4. 대시보드 recentActivity 처리 (중지 #3 미발동)

- `operator-dashboard.service.ts`: `recentApplicationRows`(SELECT FROM kpa_applications) 쿼리·destructure·merge loop +
  `recentActivity` type union `'application'` 제거. recentActivity 는 `kpa_members`+`kpa_approval_requests` 로 정상 조립.
- `operator-summary.controller.ts`(legacy /operator/summary): 동일 recentActivity 제거 + KpaApplication import 제거 +
  **district-summary `pendingApprovals`를 `appRepo.count(submitted)`(kpa_applications) → canonical
  kpa_approval_requests(entity_type='membership', status='pending') 로 repoint**.
- '회원 승인 대기' KPI(pendingMembers=kpa_members pending)는 kpa_applications 무의존 → 무변경.

## 5. entity·table — KEEP / HOLD (중지 #2 발동)

- `kpa-application.entity.ts`(`@Entity('kpa_applications')`)는 TypeORM registry(`database/entities.ts` import+array)+
  barrel(`entities/index.ts`)에 등록, 테이블은 migration(`20260206190000`)이 생성. entity 제거가 registry/migration과
  결합 → WO 규정("schema DROP/migration 결합 시 HOLD")에 따라 **entity·table·registration 유지**. DROP migration 없음.

## 6. canonical 회원 승인 회귀 — ✅ 무접촉·정상

- `member.controller.ts` `PATCH /kpa/members/:id/status` + provisioning(service_memberships·kpa_members·
  organization_members·role_assignments·kpa:store_owner·회원 승인 이메일)는 KpaApplication 과 별개 코드 → 무변경.
- 라이브: GET /kpa/members 200(5건) · 대시보드 '회원 승인 대기' KPI 정상 · recentActivity(activityLog) 정상 ·
  district-summary pendingApprovals(canonical) 정상 · 회원 목록/상태탭 브라우저 렌더.

## 7. 권한·route 검증

- 배포 후 제거 route 3종 **404**(admin/all·admin/stats·mine). 비로그인 /kpa/members **401**. 회원 관리 화면
  비운영자 차단·super_admin 접근 기존 유지(무변경).

## 8. migration·데이터

- census `kpa_applications=0`(작업 시작 시 read-only 재확인). **데이터 자동 삭제 0 · DROP migration 0 · DB write 0.**

## 9. 배포·smoke

- typecheck(api-server 변경분·web-kpa-society) 0 · KPA build 0 · Deploy API+Web success(내 커밋 `43ae74846`의 최초
  API run 은 병렬 커밋에 밀려 cancelled → 후속 `53ab48611`(내 커밋 포함) 배포로 반영, dead route 404 실측).
- **라이브 smoke**: dead route 3종 404 · members 200 · 대시보드 KPI/activity 정상 · district-summary repoint · 401.
- **브라우저 smoke**: 회원 관리 렌더 · 가입 신청서 탭 **제거**(deeplink ?tab=applications 여도 회원 목록) · 상태탭 정상.
  (배포 직후 stale-chunk `AdminRoutes.js` 404 는 번들 해시 교체 캐시 지연 — 회원 관리 기능과 무관, 렌더 정상.)

## 10. 잔여 참조 census

- `kpa/applications`·`createApplicationController`·`ApplicationsTab` 소비처 **0**(grep). glycopharm application flow는
  별개 도메인(무접촉). entity/table/mail-core 함수만 의도적 잔존(HOLD).

## 11. 커밋

- 코드 `43ae74846`(application.controller 삭제 + kpa.routes + operator-dashboard.service + operator-summary.controller
  + MemberManagementPage) · 본 CHECK.
