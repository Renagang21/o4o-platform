# CHECK-O4O-KPA-OPERATOR-ORGANIZATION-REQUESTS-ROLE-BOUNDARY-RESOLVE-V1

> WO: `WO-O4O-KPA-OPERATOR-ORGANIZATION-REQUESTS-ROLE-BOUNDARY-RESOLVE-V1`
> 성격: `/operator/organization-requests` 데드링크 해결. **유형 B(재배선 불가 → 대시보드 항목 제거)**.
> **신규 승인 기능·DB·migration 0.** Date: 2026-07-24 · commit `97a6cfbf7`(2파일) · Deploy API success · smoke PASS

## 0. 결론 — ✅ PASS (유형 B: 3개 대시보드 항목 제거)

KPA 운영자 대시보드의 `service-apps` KPI·`ai-service-apps`·`aq-service-apps`(전부 isAdmin 전용)가 실재 화면
없는 dead route `/operator/organization-requests`를 링크했다. 재배선이 불가능한 3가지 이유로 **항목 제거**를
확정: ① 조직 가입 승인 관리 프론트 화면 부재 ② KPI가 잘못된 entity_type 카운트로 **항상 0** ③ 실 승인 큐는
별도 controller(`kpa:admin`). 조직 가입 승인 API·데이터는 유지, 대시보드 광고만 제거.

## 1. 최종 판단 근거 (A vs B)

| 확인 | 결과 |
|---|---|
| dead route `/operator/organization-requests` | OperatorRoutes.tsx에 Route element 없음(주석만) · AdminRoutes `*`→kpa-dashboard. **실재 화면 0** |
| KPI count `serviceApplicationCount` | `kpa_approval_requests WHERE entity_type IN ('organization_join','org_join')` — 이 entity_type은 **어디서도 INSERT 안 됨**(DB 실측 0건, 존재하는 건 forum_member_join 1). **항상 0인 죽은 지표** |
| 실 조직 가입 승인 | `organization-join-request.controller.ts`(`/api/v1/kpa/organization-join-requests`, **`kpa:admin` 가드**, `entity_type='membership'`). 승인=단일 org `organization_members` insert(플랫폼 권한 영향 없음) |
| KPI count ↔ controller 일치 | **불일치**(KPI=organization_join/org_join, controller=membership). 올바른 count `membershipPendingCount`는 존재하나 대시보드 미소비 |
| 관리 프론트 화면 | web-kpa-society에 org-join-request 소비 화면 **없음**(재배선 대상 부재) |
| admin 폴더 `KpaOperatorDashboardPage.tsx`(미사용) | import 0 dead 컴포넌트 + `/admin/organization-requests` dead link 3 — **병렬 DEADCODE 정리(971a013c2 등)로 이미 origin/main에서 제거됨** |

→ 재배선하려면 (a) 신규 operator 페이지 제작(WO 제외) + (b) KPI entity_type 수정 두 변경 필요 → **B(제거)가 최소·정당**.

## 2. 중지 조건 — 전부 미해당

| 조건 | 판정 |
|---|---|
| 승인이 플랫폼 전체 조직 권한 영향 | ❌ 단일 KPA org `organization_members` insert + users.status, cross-service role 없음 |
| KPA service scope 분리 불가 | ❌ 전부 `/api/v1/kpa`·requireKpaScope·kpa-society |
| admin-API 권한 완화 필요 | ❌ 제거만, 권한 변경 0. KPI 이미 isAdmin-gated, controller kpa:admin — 정합 |
| 타 서비스 동일 KPI·route 공용 | ❌ `buildKpaOperatorDashboardConfig` KPA 전용, GP 대시보드에 service-apps/organization-requests 없음 |
| 동일 파일 동시 작업 | ❌ operator-dashboard.service/OperatorRoutes 미커밋 0 |

## 3. 변경

- `apps/api-server/src/routes/kpa/services/operator-dashboard.service.ts`: `service-apps` KPI + `ai-service-apps`
  AiSummary + `aq-service-apps` ActionQueue 제거 + 미사용 `serviceApplicationCount`(interface/fetch/return/
  destructure) 정리.
- `services/web-kpa-society/src/routes/OperatorRoutes.tsx`: `organization-requests AdminRoutes에서 이동` 오해 주석 정정.
- (별도) 미사용 dead 컴포넌트 `pages/admin/KpaOperatorDashboardPage.tsx` — 병렬 DEADCODE WO가 이미 제거(내 로컬
  base가 뒤처져 조사 시점엔 보였음). 내 커밋 대상 아님.

## 4. 유지 (제거 대상 아님)

- `organization-join-request.controller.ts`(조직 가입 승인 API, kpa:admin) + `entity_type='membership'` 데이터 무변경.
- 기존 KPI 8종(pending/forum/content/signage/event-offers/product-applications/recruitment-exposure/total-members) 무변경.
- `membershipPendingCount`(올바른 org-join count) 코드 잔존 — recentActivity에서 사용 중이라 유지(대시보드 KPI 미소비).

## 5. 검증

### 정적
- 대시보드 config에서 organization-requests 링크 0 · service-apps 계열 3항목 0 · 미사용 count 제거 ·
  신규 DB/migration 0 · typecheck(api-server 변경 파일/web-kpa-society) 0 · KPA build 0.

### 라이브 smoke (프로덕션, admin sohae2100, 배포 후)
- `GET /kpa/operator/dashboard` 200 · **service-apps KPI 제거 확인** · **organization-requests dead link 0** ·
  KPI keys 8종(기존 무회귀) · 전 KPI/AI/Queue 링크에 organization-requests 없음.

### 권한 경계
- 조직 가입 승인 controller는 `kpa:admin` 유지(operator 권한 확대 0). 대시보드 KPI도 isAdmin-gated였음 → 제거로 권한 변화 0.

## 6. KPA 외 영향

- `operator-dashboard.service.ts`/`buildKpaOperatorDashboardConfig`는 KPA operator-summary.controller 전용.
  GP/KCos 대시보드는 자체 service(service-apps/organization-requests 미보유) → **무영향**. Neture 무관.

## 7. 커밋

- 코드 `97a6cfbf7`(operator-dashboard.service.ts / OperatorRoutes.tsx) · 본 CHECK.

## 8. 후속 (비차단)

- 조직 가입 승인(`organization-join-request.controller`, kpa:admin)을 대시보드에 다시 노출하려면 별도 WO에서
  ① 전용 admin 관리 페이지 제작 ② KPI count를 `entity_type='membership'`로 교정(이미 `membershipPendingCount`
  존재) ③ 실재 route 링크 — 3가지가 함께 필요(이번 WO 제외 범위).
