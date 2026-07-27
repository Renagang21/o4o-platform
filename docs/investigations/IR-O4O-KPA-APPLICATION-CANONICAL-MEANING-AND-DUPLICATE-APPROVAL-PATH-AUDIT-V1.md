# IR-O4O-KPA-APPLICATION-CANONICAL-MEANING-AND-DUPLICATE-APPROVAL-PATH-AUDIT-V1

**성격:** read-only 조사 전용 (코드/DB/배포 무변경).
**대상 DB:** 프로덕션 `o4o_platform` (cloud-sql-proxy `127.0.0.1:5442`, user `o4o_api`) — SELECT/COUNT only, 개인정보 미출력.
**목적:** `KpaApplication`(kpa_applications)의 실제 업무 의미 확정 + canonical 회원 승인 경로와의 중복·dead-end 구조 정리 근거 확보 + 다음 구현 WO 1개 제안.

---

## 1. `KpaApplication` schema·type·상태

Entity: [kpa-application.entity.ts](../../apps/api-server/src/routes/kpa/entities/kpa-application.entity.ts)

| 필드 | 타입 | 비고 |
|------|------|------|
| `id` | uuid | PK |
| `user_id` | uuid | 신청자 (auth-core user) |
| `organization_id` | uuid | `@ManyToOne('OrganizationStore')` → 물리 테이블 **`organizations`** (조인 정상, 결함 아님) |
| `type` | varchar | **`membership` \| `service` \| `other`** |
| `payload` | jsonb | 신청 상세 |
| `status` | varchar | **`submitted` \| `approved` \| `rejected` \| `cancelled`** |
| `note` | text | 신청자 메모 |
| `reviewer_id` | uuid | 검토자 |
| `review_comment` | text | |
| `reviewed_at` / `created_at` / `updated_at` | timestamp | 별도 승인자 정보 필드 없음(reviewer_id만) |

프로덕션 컬럼 = entity 정의와 일치(census 확인). membership/role/organization 식별자는 `user_id`·`organization_id` 2개뿐 — membership_id·role 참조 컬럼 없음.

## 2. 생성 경로

- 백엔드 **존재**: `POST /api/v1/kpa/applications` — [application.controller.ts:44](../../apps/api-server/src/routes/kpa/controllers/application.controller.ts#L44) (`requireAuth`만, scope 불필요) → 등록 [kpa.routes.ts:219](../../apps/api-server/src/routes/kpa/kpa.routes.ts#L219) → prefix [register-routes.ts:844](../../apps/api-server/src/bootstrap/register-routes.ts#L844). 동일 컨트롤러: `GET /mine`, `GET /:id`, `DELETE /:id`, `GET /admin/all`·`PATCH /:id/review`·`GET /admin/stats`(kpa:admin).
- 프론트 **호출부 0건 — dead 생성경로**: `services/web-kpa-society/src` 전수 grep 시 `/kpa/applications` POST 및 `type:'membership'|'service'|'other'` 생성 코드 0건. `/applications` 사용처는 전부 운영자 읽기/검토(GET admin/all·stats, PATCH review)뿐. 사용자가 신청을 시작하는 화면·CTA가 **없음**. (기존 아카이브 [IR-...-MEMBER-APPLICATION-LIST-MISSING-AUDIT-V1](../archive/investigations/IR-O4O-KPA-MEMBER-APPLICATION-LIST-MISSING-AUDIT-V1.md)도 "❌ 생성되지 않음"으로 기록.)

## 3. 승인 경로와 실제 효과

`PATCH /api/v1/kpa/applications/:id/review` ([application.controller.ts:317](../../apps/api-server/src/routes/kpa/controllers/application.controller.ts#L317), `requireScope('kpa:admin')`)가 하는 일 **전부**:

1. `kpa_applications` 단일 행의 `status`/`reviewer_id`/`review_comment`/`reviewed_at` 갱신.
2. 신청자에게 승인/반려 이메일 발송(`sendServiceApplicationApproved/RejectedEmail`).
3. audit log `APPLICATION_REVIEWED` 기록.

**membership·role·organization provisioning 전무.** `service_memberships`/`role_assignments`/`organizations`/`organization_members`/`users.isActive`를 일절 건드리지 않음(grep: `ensureOrganization`/`assignRole`/`role_assignments` 매치 0). idempotency = `status!=='submitted'` → `400 ALREADY_REVIEWED`.

→ **승인 이메일("가입 승인")이 나가도 실제 회원 상태 변화 0.** IR이 경계한 "승인 이메일 = 처리 완료 증거" 안티패턴에 정확히 해당.

## 4. 회원 canonical 승인 경로 비교

canonical 온보딩 = `PATCH /api/v1/kpa/members/:id/status` (status `active`) — [member.controller.ts:502](../../apps/api-server/src/routes/kpa/controllers/member.controller.ts#L502).

| | canonical 회원 승인 | KpaApplication review |
|---|---|---|
| 프론트 진입 | [MemberManagementPage.tsx](../../services/web-kpa-society/src/pages/operator/MemberManagementPage.tsx) "회원 관리" 탭 + Drawer | 같은 파일 "가입 신청서" 탭(`ApplicationsTab`, admin 전용) |
| API | `PATCH /kpa/members/:id/status` | `PATCH /kpa/applications/:id/review` |
| 테이블 변경 | `users`+`kpa_members`+**`service_memberships`(canonical)**+`kpa_pharmacist/student_profiles`+`kpa_member_services`; pharmacy_owner 시 `organizations`+`organization_members`+`role_assignments`(`kpa:store_owner`)+`platform_store_slugs` | **`kpa_applications` 단일** |
| role 주입 | pharmacy_owner 한정 `kpa:store_owner` | 없음 |
| organization provisioning | pharmacy_owner 한정 org/owner/slug 생성 | 없음 |
| idempotency | 하위연산 멱등 + `pending→active` 전이 가드(재승인 no-op, 명시적 409 없음) | `ALREADY_REVIEWED` 409 |

두 경로는 **동일 업무가 아님**: canonical은 실제 온보딩, KpaApplication은 상태 라벨+이메일 로그. 라벨/CTA만 "가입 승인"으로 겹칠 뿐 provisioning 책임은 canonical에만 있음.

## 5. 프로덕션 데이터 census

| 테이블 | 건수 | 비고 |
|--------|-----:|------|
| **`kpa_applications`** | **0** | type×status·중복(user+type)·dead-ref(user/org)·payload 키 전부 vacuously 0. 시각 범위 null. |
| `kpa_approval_requests` | 1 | KPI "회원 승인 대기" 소스(별도 테이블) |
| `kpa_member_services` | 5 | kpa-a 서비스 신청 |
| `kpa_members` | 6 | active 5 · withdrawn 1 (canonical 회원) |
| `organization_members` | 12 | |
| `organization_service_enrollments` | 7 | |
| `kpa_join_inquiries` / `kpa_organization_join_requests` / `kpa_pharmacy_requests` | 0 | |

`kpa_applications`는 **한 번도 사용된 적 없음**. IR 원칙에 따라 "0건=dead"로 단정하지 않고 §2 정적 추적(생성 CTA 부재)과 결합해 판정 → 생성 경로 부재 + 0 데이터 = 실질 dead flow.

## 6. 중복·dead-end 사례

- **생성 dead-end**: 백엔드 create/mine/delete 엔드포인트 실재하나 프론트 호출부 0 → 도달 불가.
- **이메일 reviewUrl dead link**: create 시 발송되는 `${OPERATOR_URL}/operator/kpa/applications/:id`([application.controller.ts:114](../../apps/api-server/src/routes/kpa/controllers/application.controller.ts#L114))가 가리키는 라우트가 프론트에 **부재**. 실제 운영자 화면은 `/operator/members?tab=applications`([OperatorRoutes.tsx:160](../../services/web-kpa-society/src/routes/OperatorRoutes.tsx#L160), `ApplicationsTab`). `/operator/kpa/applications/:id`는 catch-all([OperatorRoutes.tsx:248](../../services/web-kpa-society/src/routes/OperatorRoutes.tsx#L248))로 `/operator` 리다이렉트.
- **개념 중복(3중)**: "회원 승인" 개념이 (a) `kpa_members.status`(canonical 온보딩) (b) `kpa_approval_requests`(대시보드 KPI "회원 승인 대기") (c) `kpa_applications`(dead, provisioning 없음) 3곳에 분산. (a)와 (c)는 CTA 라벨상 겹치나 (c)는 실효 없음.
- **승인 = 이메일만**: §3대로 approved 처리해도 membership/role/org 변화 0 (0 데이터라 실피해는 없으나 구조적 false-completion 위험).

## 7. 권한 경계

| 엔드포인트 | 가드 | 접근 |
|-----------|------|------|
| `POST /applications` | `requireAuth` | 로그인 사용자 누구나(단 프론트 호출부 없음) |
| `GET /mine` | `requireAuth` | 본인 |
| `GET /:id` | `requireAuth` + 본인\|`kpa:admin`\|`kpa:operator` | 소유자 또는 KPA 운영자 |
| `DELETE /:id` | `requireAuth` + 본인 + `submitted`만 | 본인 취소 |
| `GET /admin/all`·`PATCH /:id/review`·`GET /admin/stats` | `requireScope('kpa:admin')` | **kpa:admin 전용**(kpa:operator 불가 — `WO-KPA-A-GUARD-STANDARDIZATION-FINAL-V1` 정렬) |

- `platform:super_admin`의 review 접근 여부는 `requireScope('kpa:admin')` 가드 구현에 의존(본 조사 범위 밖·권한 변경 안 함).
- admin/all·review는 organization scope 필터 없음(선택 필터만) → kpa:admin은 모든 application 열람/검토 가능. 0 데이터로 현재 노출 없음.
- **본 조사에서 권한 확대/축소 없음.**

## 8. UI·이메일·알림·KPI 정합

- **UI**: `ApplicationsTab` 탭 배지 `가입 신청서 (n)`, 확인 다이얼로그 "가입 승인 확인 / 이 가입 신청을 승인하시겠습니까?" — **온보딩을 암시하나 실제 provisioning 없음(불일치)**. 유형 라벨 `membership→회원가입`, `service→서비스`.
- **이메일**: create 2종(운영자 알림+신청자 접수), review 2종(승인/반려). 승인 메일이 실제 회원화 없이 발송(false-completion 소지).
- **알림/KPI**: kpa_applications는 KPI 카드에 **미연결**. operator-summary/operator-dashboard의 `recentActivity` 피드에만 `type:'application'`, `${name} 입회 신청`으로 LIMIT 5 표시([operator-dashboard.service.ts:200](../../apps/api-server/src/routes/kpa/services/operator-dashboard.service.ts#L200)). KPI "회원 승인 대기"는 `kpa_approval_requests` 기반(별도).

## 9. 최종 판정 — **C (레거시 dead flow)** + D성 위험 주석

- **C 근거**: 프론트 생성 경로 0 · 프로덕션 0행 · 승인 시 운영 데이터 영향 0 · 이메일 reviewUrl dead link · KPI 미연결. 실질적으로 종료 가능한 dead flow.
- **D성 위험(활성 아님)**: 단일 `application.controller`가 3 type을 뭉뚱그리고, 'membership' CTA가 canonical 온보딩과 라벨상 중복되면서 provisioning은 하지 않음. 데이터·생성경로가 없어 **현재는 활성 혼합모델이 아니라 dead**지만, 이 컨트롤러를 되살려 쓰면 즉시 false-completion 구조가 됨.
- **A/B 아님**: 회원 승인과 동일 업무를 수행하지 않으므로 A(통합 대상) 아님. 별도 부가 신청으로 유지하려면 실효 로직·정정이 필요하나 현재 근거·수요 없음 → B로 유지할 이유도 없음.

## 10. 유지·통합·폐기 권고

**권고 = 폐기(retire) 후보.** 단, "generic application 접수 채널"을 향후 상품 정책상 원하는지에 대한 **정책 판단이 선행**되어야 완전 확정(§ 중지 조건).

- 폐기 시: `kpa_applications` route+controller+`ApplicationsTab` UI + 전용 이메일 템플릿 호출 제거, dead reviewUrl 제거, dashboard `recentActivity`의 kpa_applications 소스를 canonical(`kpa_members`/`kpa_approval_requests`)로 전환.
- canonical 회원 승인·KPI(`kpa_approval_requests`)는 그대로 유지(중복의 진짜 실효 경로).

## 11. 필요한 migration·데이터 보정 여부

- **데이터 보정 불필요**: `kpa_applications` 0행 → archive/migration 대상 없음. 폐기 시 테이블 DROP은 별도 판단(0행이므로 보존 부담 없음, 단 F-series/Core 동결 여부 확인 필요).
- **코드 정합 필요**: dashboard recentActivity 쿼리가 kpa_applications 참조 → 폐기 시 lockstep 수정 필수(누락 시 피드 항목 소멸). 이메일 reviewUrl 라우트 부재는 폐기든 유지든 정정 대상.

## 12. 다음 통합 구현 WO 제안 (1개)

**WO-O4O-KPA-APPLICATION-DEAD-FLOW-RETIREMENT-V1** (제안, 실행 지시 대기)

- **선결 정책 질문(중지 조건)**: KPA가 회원가입과 **구별되는** generic 신청 접수 채널을 유지할 의사가 있는가?
  - **없음 → 폐기 경로**: `application.controller`·route(`kpa.routes.ts:219`)·`ApplicationsTab`·전용 이메일 호출 제거, recentActivity 피드를 canonical 소스로 전환, dead reviewUrl 제거. (0행이므로 데이터 보정 없음.)
  - **있음 → 재정의 경로**: type별 실제 업무·후속 provisioning 계약을 정의하고 생성 CTA·상세 라우트·정확한 CTA 문구를 신설(회원 온보딩 로직 중복 구현 금지 — canonical 재사용). 이 경우 별도 설계 WO 필요.
- **불변식**: 회원 provisioning은 canonical(`PATCH /kpa/members/:id/status`) 단일 경로 유지, 중복 구현 금지. 승인 이메일을 완료 증거로 쓰지 않음.

## 13. IR commit SHA

- 문서: `docs/investigations/IR-O4O-KPA-APPLICATION-CANONICAL-MEANING-AND-DUPLICATE-APPROVAL-PATH-AUDIT-V1.md`
- commit: (아래 커밋 후 기입)

---

*read-only 조사 완료. 코드/DB/배포 무변경. 권한 미변경. 판정 C(dead flow)+D성 위험. 다음 WO는 폐기 vs 재정의 정책 판단 선행.*
