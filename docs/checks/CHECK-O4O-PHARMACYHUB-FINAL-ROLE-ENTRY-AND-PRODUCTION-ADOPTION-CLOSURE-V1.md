# CHECK — PharmacyHub 최종 역할·진입·프로덕션 반영 마감

> **WO**: `WO-O4O-PHARMACYHUB-FINAL-ROLE-ENTRY-AND-PRODUCTION-ADOPTION-CLOSURE-V1`
> **일자**: 2026-08-21 · **판정**: **CLOSED** (PharmacyHub 회원가입·회원·역할·진입 축 최종 완료)
> **정본**: [`O4O-PHARMACY-HUB-SERVICE-MODEL-BASELINE-V1`](../baseline/O4O-PHARMACY-HUB-SERVICE-MODEL-BASELINE-V1.md) §4 · §8
> **선행**: `WO-O4O-PHARMACYHUB-PHARMACIST-MEMBER-AND-STORE-OWNER-MODEL-CLOSURE-V1` (commit `c3e99f85c`)

---

## 1. 프로덕션 역할 census (read-only)

Cloud SQL Auth Proxy 경유 read-only SELECT. 식별자는 앞 8자 마스킹, 개인정보 미조회.

**roles (service_key = 'pharmacy-hub')**

| name | is_active | is_assignable |
|---|:---:|:---:|
| `pharmacy-hub:admin` | true | true |
| `pharmacy-hub:operator` | true | true |
| `pharmacy-hub:member` | true | true |
| `pharmacy-hub:store_owner` | true | true |
| `pharmacy-hub:supplier` | **false** | **false** |

**migration 반영**: `20270314000000`(supplier 카탈로그 폐기) · `20270315000000`(member seed) ·
`20270316000000`(member membership 표기 교정) 모두 `typeorm_migrations` 에 존재.
배포 리비전 `o4o-core-api-03430-697` · `pharmacy-hub-web-00130-b62` (선행 push 이후).

**service_memberships (pharmacy-hub)**: prefixed 표기가 정상 다수.
prefix 없는 잔여 3건 = `admin`(`a4e0d308…`) · `operator`(`3aff8f49…`) · `store_owner`(`3f5582bc…`) —
**세 계정 모두 user status = suspended**. `member` 1건(`44fa7733…`)은 `20270316000000` 으로
이미 `pharmacy-hub:member` 로 교정 완료.

---

## 2. prefix 없는 role 처리 결과

**판정: 표기 drift (권한 결과 무변화)** — 근거:

- authz 는 `createMembershipScopeGuard` 가 `role_assignments` 파생 `user.roles` + `service_memberships.status`
  만 읽는다. **`service_memberships.role` 은 인가 판정에 쓰이지 않는다.**
- 실측상 3건 모두 **같은 prefixed role 을 이미 활성 보유**한다 → 재승인 시 부여될 값도 동일해진다.

**조치**: `20270317000000-NormalizePharmacyHubBareMembershipRoles`

```sql
UPDATE service_memberships sm SET role = 'pharmacy-hub:' || sm.role
 WHERE sm.service_key = 'pharmacy-hub' AND sm.role IN ('admin','operator','store_owner')
   AND EXISTS (SELECT 1 FROM role_assignments ra
                WHERE ra.user_id = sm.user_id AND ra.role = 'pharmacy-hub:' || sm.role
                  AND ra.is_active = true)
```

**배포 후 프로덕션 확인 (commit `adbd04ef6` · api `Deploy API Server` success)**:
`typeorm_migrations` 에 `NormalizePharmacyHubBareMembershipRoles20270317000000` 기록,
`service_memberships` 의 **prefix 없는 pharmacy-hub row 잔여 = 0**.
현재 분포 = `pharmacy-hub:admin` 1(active) · `member` 2(active) · `operator` 2(active) ·
`store_owner` 5(active)+1(rejected). 운영자 가입 신청 관리 화면도 세 건이 원문 `operator`/`admin`/
`store_owner` 대신 "서비스 운영자"/"서비스 관리자"/"약국 경영자" 로 표시된다.

활성 bare `role_assignments` 는 4건 유지 — `pharmacy`(deleted/active 각 1) ·
`store_owner`(deleted 1) · `member`(suspended 1). 모두 PharmacyHub scope 를 열지 않으며
위 표의 보존 사유가 적용된다.

EXISTS 가드로 **권한 확대가 구조적으로 불가능**하다. row 삭제·사용자·자격증명·승인 상태 무변경.
`down()` 은 문서화된 no-op (표기 되돌림이 오히려 drift 복원).

**보존 사유를 기록하고 손대지 않은 것 (범위 밖·PharmacyHub 아님)**

| 대상 | 사유 |
|---|---|
| bare `member` role_assignment (`44fa7733…`) | KPA-Society/GlycoPharm/K-Cosmetics/Neture 가 membership.role 을 bare `member` 로 저장 → **다른 서비스 축에서 유래**. PharmacyHub scope 를 부여하지 않는다. 타 서비스 role 변경은 WO 금지 항목. |
| bare `store_owner` role_assignment (`5196c1f8…`) | user status = `deleted`, membership 0건인 legacy orphan. hard delete 금지 · 사용자 삭제 금지. PharmacyHub scope 미부여. |
| legacy role `pharmacy` (2계정) | PharmacyHub role 이 아니며 어떤 scope 도 열지 않는다. 별도 legacy 정리 축. |

---

## 3. active role 카탈로그 최종값

운영자 역할 관리 화면(`/operator/roles`) 실측 헤더 = **"역할 관리 (4개)"**.
`admin` / `member` / `operator` / `store_owner` 만 노출, 전부 `ASSIGNABLE` 배지.
`supplier` · `공급자` · `student` · prefix 없는 role · legacy role **노출 0**.
(본문에 걸리는 "pharmacist" 문자열은 member 설명문 `general pharmacist member` 뿐이다.)

---

## 4. 일반 약사 회원 E2E (프로덕션)

| 단계 | 결과 |
|---|:---:|
| `/join` 가입 유형 2개(약사 회원 기본 선택 / 약국 경영자), **공급자 선택지 0** | PASS |
| member 선택 시 입력 필드 4개 — **약국명 요구 없음** | PASS |
| 신청 → `/join/status?submitted=1` → 승인 대기 (신청 역할 "약사 회원") | PASS |
| 승인 전 로그인 → `/join/status` 로 라우팅, 서비스 화면 진입 차단 | PASS |
| 운영자 콘솔 승인 → 상태 `활성` | PASS |
| 로그인 → 홈 진입, `/community` · `/education` · `/forum` · `/account` 정상 | PASS |
| `GET /pharmacy-hub/me/access` → `roles: ["pharmacy-hub:member"]` · `entryPoints { storeOwner: false, operator: false }` | PASS |
| `/store-owner`, `/store-owner/products` → "접근 권한이 없습니다" 차단 | PASS |
| `/operator`, `/operator/memberships` → "운영자 권한이 필요합니다" 차단 | PASS |
| store_owner API 4종 직접 호출 → **403 `Required scope: pharmacy-hub:store_owner`** | PASS |
| operator API 직접 호출 → **403 `Required scope: pharmacy-hub:operator`** | PASS |

**배포 후 확인**: 홈 역할 카드가 실제로 필터링된다 — operator+admin 계정은 "서비스 운영자" 카드만,
store_owner 계정은 "약국 경영자" 카드만, 비로그인 방문자는 2개 모두. JS 예외 0.

**발견 1건 (수정함)**: 홈 "역할별 진입점" 카드가 로그인 사용자에게도 **보유 역할과 무관하게** 노출돼
약사 회원에게 매장 경영/운영자 카드가 dead link 로 보였다 → `HomePage.tsx` 를 `satisfiesRole` 기준으로
필터링(비로그인 방문자에게는 서비스 안내 목적으로 전체 유지). 정본 §7 Drift Guard 11 로 명문화.

---

## 5. 약국 경영자 E2E (프로덕션)

| 단계 | 결과 |
|---|:---:|
| store_owner 선택 시 입력 필드 5개(**약국명 필수**) | PASS |
| 신청 → 대기 (신청 역할 "약국 경영자", 약국명 표시) | PASS |
| 운영자 승인 → `활성` | PASS |
| 로그인 → 헤더에 "매장 허브 / 내 약국" 노출 · `roles: ["pharmacy-hub:store_owner"]` · `entryPoints.storeOwner = true` | PASS |
| 프로비저닝 — `store-owner/info` · `dashboard` → `status: "connected"` + 조직 생성 | PASS |
| `/store-owner`(홈) · `/products` · `/content` · `/qr` · `/info` · `/store-hub` 렌더 | PASS |
| 공급 상품 목록 200 (Neture 공급 결과 유입 확인) | PASS |
| `/operator*` 라우트 차단 + operator API 403 | PASS |

---

## 6. operator / admin E2E (프로덕션)

- `/operator` · `/operator/members` · `/operator/analytics` · `/operator/memberships` · `/operator/roles` 정상.
  가입 승인 동작 확인(위 §4·§5 승인이 이 콘솔에서 수행됨).
- 운영자 메뉴 = 가입 신청 관리 / 회원 관리 / 포럼 운영 / 분석 / 역할 관리 — **공급자·상품 승인 기능 없음** (정본 §5).
- `/admin` · `/admin/settings/legal-terms` 정상 — 구조·정책(법정정보·약관)만.
- member / store_owner 의 `/operator*` 직접 접근 → 차단 화면 + API 403 (§4·§5).

---

## 7. entryPoint · menu · route 정합성

- `services/web-pharmacy-hub` 에 `/supplier` route · SupplierShell · supplier 메뉴 **0건**
  (잔여 문자열은 `supplierId` / `supplierNotified` 등 **Neture 공급 데이터 필드** — 정본 §6-A 로 정상).
- `routes/pharmacy-hub/**` 에 `/supplier/*` 엔드포인트 0건, scope 0건.
- URL 직접 입력 구멍 없음: 미보유 역할 경로는 전부 차단 화면 + API 403.
- `/store-owner/dashboard` 는 프론트 라우트가 없어 앱 404 (메뉴에서 연결되지 않는 경로 — dead link 아님).

---

## 8. 회귀 · 기술 검증

| 항목 | 결과 |
|---|:---:|
| JoinPage / JoinStatus / MembershipConsole(승인·반려 UI) / 역할 관리 | PASS |
| store provisioning · 매장 HUB · 커뮤니티(forum) · 교육 · profile/account | PASS |
| Neture → PharmacyHub 공급 결과 노출(공급 상품 목록) | PASS |
| `services/web-pharmacy-hub` typecheck (`tsc --noEmit`) | PASS |
| api-server typecheck | PASS (아래 기존 실패 제외) |
| Jest `pharmacy-hub-member-model-contract` + `pharmacy-hub-scope-guard` | **35 tests PASS** |
| browser smoke — desktop 1440×900 / mobile 390×844 | PASS · JS 예외 0 · 가로 overflow 0 · 백지 0 |

**본 WO 범위 밖 기존 실패(수정하지 않음)**

- `packages/action-log-core` 소스가 다른 세션 작업으로 작업트리에서 삭제 상태 → api-server `TS2307` 23건.
- `pharmacy-hub-web` 의 `tsc -b` 에서 `src/pages/operator/UserDetailPage.tsx(26,3) TS2353 serviceKey` —
  `packages/ui/operator-user-detail` 의 병행 세션 작업과 얽힌 기존 상태. 본 WO 변경과 무관
  (본 WO 파일만 포함하는 `tsc -p --noEmit` 은 통과).

---

## 9. E2E 계정

프로덕션 운영 사용자 데이터를 변경하지 않기 위해 **E2E 전용 계정 2개**를 신규 생성해 사용했다
(`e2e.ph.20260821b.member@example.com` · `e2e.ph.20260821b.owner@example.com`, 이름 접두 `E2E`).
비밀번호는 어디에도 기록하지 않았다. 계정·조직은 검증 이력 재현을 위해 남긴다(삭제는 사용자 판단).

---

## 10. 판정

**CLOSED** — PharmacyHub 회원가입·회원·역할·진입 구조는 정본 §4 · §8 로 최종 확정한다.
supplier 재유입 0, 4역할 카탈로그 확정, member/store_owner/operator/admin 진입 전 축 프로덕션 PASS.
후속 분할 WO 없이 유지보수 대상으로 전환한다.

*Status: CLOSED · 2026-08-21*
