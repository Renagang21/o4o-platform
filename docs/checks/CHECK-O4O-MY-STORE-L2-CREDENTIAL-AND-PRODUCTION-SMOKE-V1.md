# CHECK-O4O-MY-STORE-L2-CREDENTIAL-AND-PRODUCTION-SMOKE-V1

**대상 WO**: WO-O4O-MY-STORE-L2-CREDENTIAL-AND-PRODUCTION-SMOKE-V1
**선행 CHECK**: [`CHECK-O4O-MY-STORE-REMAINING-VIEW-DUPLICATION-ZERO-CLEANUP-V1`](CHECK-O4O-MY-STORE-REMAINING-VIEW-DUPLICATION-ZERO-CLEANUP-V1.md) §7-1 미검증 3항목
**작성일**: 2026-08-13
**대상 배포**: `8c0ec320d` — 2026-08-13T12:47Z deploy 성공, 리비전 live 12:50Z (프로덕션이 공통화 코드로 동작 중임을 확인)

---

## 0. 요약

프로덕션 **실계정 로그인** smoke 를 수행했다. 검증 화면 **27개 중 26 PASS · 1 BLOCKED(환경) · 0 FAIL**.
공통화로 인한 **회귀 0건**. 검증 계정은 smoke 종료 후 **비활성화**했다.

---

## 1. Credential 상태 조사 (WO §1)

### 1-1. 인증 계약 확정 (코드 실측)

[`auth-login.service.ts:188-216`](../../apps/api-server/src/services/auth/auth-login.service.ts)

```text
serviceKey 있음 + credential 있음 → V2 (service_credentials.password_hash)
serviceKey 있음 + credential 없음 → V1 fallback (users.password)     ← Phase 1 "G-B No Backfill"
serviceKey 없음                   → V1 fallback
+ serviceKey 지정 시 active service_memberships 필수 (없으면 "가입되어 있지 않습니다")
```

### 1-2. 계정별 실측 (프로덕션 DB read-only)

| 계정 | membership | service_credentials | store_owner role | 매장 org | L2 로그인 가능 |
|---|---|---|---|---|:---:|
| `renagang21@gmail.com` | kpa-society·glycopharm·k-cosmetics·pharmacy-hub·neture·platform (전부 active) | **5건 전부 존재 · L1과 상이** | kpa·cosmetics·glycopharm·pharmacy-hub **4종** | 테스트 약국 / 테스트 뷰티샵 / 네뚜레 공급자 | ❌ (비밀번호 불명) |
| `sohae2100@gmail.com` | 6개 active | 4건 존재 · L1과 상이 | kpa 만 | Sohae 약국 | ❌ |
| `sohae21@naver.com` | — | 2건 | — | — | ❌ (users.status=`deleted`) |
| `renariver21@gmail.com` | platform 만 | **0건** | 없음 | 없음 | ✅ (credential 부재 → L1 fallback) |

> `renariver21` 의 "L2 `neture` 200" 은 credential 부재로 인한 **L1 fallback** 임이 확정됐다
> (기존 문서의 "확정하지 않았다" 관찰 메모 해소).

### 1-3. 로그인 시도 없이 판정한 이유

DB 에서 `password_hash = users.password` 가 **전부 false** 임을 확인했으므로
"L1 비밀번호로 serviceKey 로그인 시 401" 은 시도 없이 확정된다.
문서 §6 의 **5회/30분 계정 잠금** 위험을 피하기 위해 추측 대입을 하지 않았다.

### 1-4. 복구 불가 확정

기존 credential 을 **재설정하는 canonical API 가 없다.**
[`AdminUserController.ts:386-400`](../../apps/api-server/src/controllers/admin/AdminUserController.ts) 는
credential 이 이미 있으면 `KEEP_EXISTING_CREDENTIAL` 로 보존만 한다
("관리자가 현재 비밀번호를 모른 채 바꿔버리는 것 금지"). `/forgot-password` 메일 흐름은 에이전트가 접근 불가.

→ WO §2 "신규 테스트 계정 생성은 기존 계정 복구가 불가능할 때만" 조건 **충족**.

---

## 2. Credential 정비 (WO §2)

**사용자 승인 사항**: 기존 회원 계정(`renagang21`)의 자격증명은 **건드리지 않고**, 신규 검증 전용 계정을 생성한다.
추가 지시: *canonical 생성 경로 재사용 · SQL 로 users/service_memberships/service_credentials 임의 조립 금지 ·
credential isolation 확인 · 종료 후 삭제보다 비활성화.*

### 2-1. 생성 — 전부 canonical API

`POST /api/v1/admin/users` (platform:super_admin 인증) 를 **서비스별로 1회씩** 호출했다.
서비스당 **서로 다른 비밀번호**를 주어 격리를 실증할 수 있게 했다.

| 호출 | roles | 파생 serviceKey | 응답 |
|---|---|---|---|
| 1 | `kpa:store_owner` | `kpa-society` | `credentialPolicy=CREATED` |
| 2 | `cosmetics:store_owner` | `k-cosmetics` | `credentialPolicy=CREATED` |
| 3 | `glycopharm:store_owner` | `glycopharm` | `credentialPolicy=CREATED` |
| 4 | `pharmacy-hub:store_owner` | `pharmacy-hub` | `credentialPolicy=CREATED` |
| 5 | `cosmetics:store_owner` (계정 B) | `k-cosmetics` | `credentialPolicy=CREATED` |

canonical 경로가 `users` · `service_memberships`(4건 active) · `service_credentials`(4건) ·
`role_assignments`(4건) 를 모두 생성했다. **SQL 조립 0건.**

### 2-2. DB write 전량 (변경 전/후)

| # | 대상 | 경로 | 변경 전 | 변경 후 |
|---|---|---|---|---|
| 1 | `users` ×2 | canonical API | 없음 | 신규 2건 (`o4o-smoke-mystore@…`, `o4o-smoke-mystore-kcos@…`) |
| 2 | `service_memberships` ×5 | canonical API | 없음 | active/store_owner 5건 |
| 3 | `service_credentials` ×5 | canonical API | 없음 | 5건 (서비스별 상이 비밀번호) |
| 4 | `role_assignments` ×5 | canonical API | 없음 | active 5건 |
| 5 | `organization_members` ×2 | **canonical statement 직접 실행** | 없음 | 계정A→테스트 약국(manager) · 계정B→테스트 뷰티샵(manager) |
| 6 | `users.status` ×2 | canonical `PATCH /admin/users/:id/status` | `approved` | **`suspended`** (smoke 종료 후) |

> **#5 만 API 가 없다.** `organizationOpsService.addMember()` 는 in-process 서비스로만 존재하고
> 노출된 admin endpoint 가 없다. 따라서 **그 메서드의 statement 를 그대로**
> (`INSERT … ON CONFLICT (organization_id, user_id) DO NOTHING`) 실행했다. role 은 guard 통과 최소 권한인
> `manager` 를 썼다(`owner` 아님). **기존 사용자·기존 org 의 기존 row 는 하나도 수정/삭제하지 않았다.**

### 2-3. 계정 B 가 별도로 필요했던 이유 (구조적 발견)

[`store-owner.utils.ts:103-107`](../../apps/api-server/src/utils/store-owner.utils.ts) 의 `isStoreOwner()` 는

```sql
SELECT organization_id, role FROM organization_members
WHERE user_id = $1 AND role IN ('owner','admin','manager') AND left_at IS NULL LIMIT 1
```

로 org 를 고른다 — **serviceKey 필터가 없고 `LIMIT 1`** 이다.
따라서 한 계정이 여러 org 에 속하면 **서비스별 org 해석이 비결정적**이 된다.
그래서 "서비스당 org 1개 = 계정 1개"로 분리했다(계정A=테스트 약국, 계정B=테스트 뷰티샵).

→ 이 성질은 다중 org 보유 사용자(`renagang21` = org 3개)에게 실제로 적용된다. **후속 WO 로 분리 기록**(§7).

---

## 3. 서비스별 결과표 (WO §7)

| 서비스 | 계정/credential | 로그인 | 실제 API | 화면 smoke | 콘솔 오류 | 결과 |
|---|---|:---:|:---:|:---:|:---:|:---:|
| **KPA-Society** | 계정A / `kpa-society` L2 | ✅ 200 | ✅ 9~14 call/화면 | 5/5 | 0 | **PASS** |
| **K-Cosmetics** | 계정B / `k-cosmetics` L2 | ✅ 200 | ✅ 5~7 call/화면 | 9/9 | 0 | **PASS** |
| **GlycoPharm** | 계정A / `glycopharm` L2 | ✅ 200 | ✅ 5~8 call/화면 | 8/9 | 1화면 | **PASS**(1 BLOCKED) |
| **PharmacyHub** | 계정A / `pharmacy-hub` L2 | ✅ 200 | ✅ 2~3 call/화면 | 4/4 | 0 | **PASS** |
| **Neture** | — | — | — | — | — | **해당 없음**(§3-2) |

### 3-1. 화면별 상세

| 서비스 | 화면 | route | 결과 |
|---|---|---|:---:|
| KPA | 내 매장 홈 | `/store` | PASS |
| KPA | 매장 경영활용 제품 | `/store/handled-products` | PASS |
| KPA | 매장 자체 상품 | `/store/commerce/local-products` | PASS |
| KPA | **상품 상세설명 관리** ★ | `/store/marketing/product-descriptions` | PASS |
| KPA | 블로그 관리(콘텐츠) ★ | `/store/content/blog` | PASS |
| KCos | 홈 | `/store` | PASS |
| KCos | 매장 자체 상품 | `/store/commerce/local-products` | PASS |
| KCos | POP | `/store/marketing/pop` | PASS |
| KCos | 자료함 | `/store/library/resources` | PASS |
| KCos | 태블릿 | `/store/commerce/tablet-displays` | PASS |
| KCos | **채널 콘솔** ★ | `/store/channels` | PASS |
| KCos | **QR 콘솔** ★ | `/store/marketing/qr` | PASS |
| KCos | 상품 상세설명 ★ | `/store/library/product-descriptions` | PASS |
| KCos | **블로그 관리** ★ | `/store/content/blog` | PASS |
| GP | 홈 | `/store` | **BLOCKED** (§4) |
| GP | 매장 자체 상품 | `/store/commerce/local-products` | PASS |
| GP | POP | `/store/marketing/pop` | PASS |
| GP | 자료함 | `/store/library/resources` | PASS |
| GP | 태블릿 | `/store/commerce/tablet-displays` | PASS |
| GP | **채널 콘솔** ★ | `/store/channels` | PASS |
| GP | **QR 콘솔** ★ | `/store/marketing/qr` | PASS |
| GP | 상품 상세설명 ★ | `/store/library/product-descriptions` | PASS |
| GP | **블로그 관리** ★ | `/store/content/blog` | PASS |
| PH | 홈 | `/store-owner` | PASS |
| PH | 매장 경영활용 제품 | `/store-owner/handled-products` | PASS |
| PH | 매장 자체 상품 | `/store-owner/local-products` | PASS |
| PH | 자료함 | `/store-owner/library` | PASS |

★ = 선행 WO 에서 공통화된 7 화면군에 해당. **전부 PASS.**

### 3-2. Neture 제외 근거

선행 census 기준 Neture 의 내 매장 항목 3건 중 공통 소비처는
`StoreProductsManagerPage`(`@o4o/store-products-ui`) 1건뿐이고, 이번 공통화(`store-ui-core` 채널/QR/블로그/상품설명)의
**소비처가 없다**. WO §3 "실제 소비처가 있는 항목만" 에 따라 제외했다.

---

## 4. BLOCKED 1건 — GlycoPharm 홈

| 항목 | 내용 |
|---|---|
| 화면 | GlycoPharm `/store` (StoreOverviewPage) |
| 증상 | `404 /glycopharm/pharmacy/cockpit/ai-summary` · `403 /glycopharm/pharmacy/products` → 콘솔 오류 |
| **원인 (API 직접 실측)** | `404 {"code":"PHARMACY_NOT_FOUND"}` · `403 {"code":"GLYCOPHARM_NOT_ENROLLED","message":"No active glycopharm enrollment found."}` |
| 근본 원인 | 검증 org(**테스트 약국**)에 `organization_service_enrollments` 행이 **0건** — glycopharm 미등록 |
| 회귀 여부 | **아니다.** ① `8c0ec320d` 는 StoreOverviewPage 도 api-server 도 건드리지 않았다 ② 실패는 backend enrollment guard 의 **정상 거부**다 |
| 조치 안 함 | 해당 org 를 glycopharm 에 enroll 하면 실제 환자 검색에 노출되는 **운영 의미 변경**이므로 검증 목적의 write 를 하지 않았다 |

> 이 거부는 오히려 WO §5 "**다른 서비스 데이터 노출 없음**" 을 실증한다 —
> GlycoPharm 이 미등록 org 에 자기 데이터를 내주지 않았다.

---

## 5. WO §5 회귀 항목 검증

| 확인 항목 | 방법 | 결과 |
|---|---|:---:|
| `serviceKey` 로그인 401 재발 | 4 서비스 웹 로그인 폼 실제 제출 | ✅ 4/4 `200 success:true` |
| **서비스별 credential isolation** | 교차 조합 3회 실측 | ✅ 3/3 `INVALID_CREDENTIALS` 거부 (kcos+GP pw · gp+PH pw · ph+KCos pw) |
| KPA `#2563EB` · KPA 전용 문구 | 프로덕션 스크린샷 | ✅ breadcrumb "약국 경영지원 / 상품 설명", 제목 "상품 상세설명 관리", 사이드바 "매장 자체 상품 (8)", primary `#2563EB` |
| KCos / GP accent 분리 | 프로덕션 스크린샷 (동일 공통 View) | ✅ KCos **pink** `#db2777` + "매장 QR…" / GP **teal** `#0d9488` + "약국 QR…" |
| StoreHome 공통 component 실제 렌더 | KPA/KCos/PH 홈 | ✅ KPI 그리드·홍보 성과·최근 활동·실행 흐름 실데이터 렌더 |
| handled-products ↔ `StoreLocalProduct` 축 혼동 | KPA 홈 실행 흐름 + 두 화면 개별 진입 | ✅ "O4O 제품" ↔ "매장 경영활용 제품" 분리 유지, 두 route 각각 정상 |
| 공통 View adapter 의 API prefix | 네트워크 실측 | ✅ KCos → `/api/v1/cosmetics/*`, GP → `/api/v1/glycopharm/*` (교차 호출 0) |
| QR/POP/자료함/태블릿 서비스별 고유 route 보존 | 개별 진입 | ✅ 전부 PASS |
| 다른 서비스 데이터 노출 | GP enrollment guard | ✅ 미등록 org 거부 (§4) |
| 권한 오류 | 전 화면 | ✅ `접근 권한이 없습니다` 0건 |

### 5-1. 실데이터 확인

| 화면 | 실제 렌더된 프로덕션 데이터 |
|---|---|
| KPA 상품 상세설명 | 자체 상품 8건 — 후시딘연고(퓨시드산나트륨)·케어가글액·비판텐연고·마데카솔겔·퍼스가글액 등 |
| KPA 홈 | 자료실 파일 7 · 활성 QR 21 · 진열 상품 20 · 이번주 스캔 1 · 홍보 성과 3건 · 최근 활동 1건 |
| GP QR 콘솔 | QR 20건 (실 landing URL · 스캔수 · 생성일 · 복사/다운로드/수정/삭제 액션) |
| KCos QR 콘솔 | 0건 → **정상 empty 상태** ("등록된 QR 코드가 없습니다" + "첫 QR 만들기") |

---

## 6. write 수행 여부 (WO §4)

**등록/수정/삭제 버튼은 하나도 누르지 않았다.** 전 화면 read-only 로 검증했다.
읽기로 확인 불가한 치명 경로가 없어 최소 write·원복도 수행하지 않았다.

DB write 는 §2-2 의 검증 계정 provisioning 6종뿐이며, **기존 사용자·기존 org·운영 데이터는 무변경**이다.

---

## 7. 발견 사항 — 후속 WO 제안

| # | 내용 | 성격 | 조치 |
|---|---|---|---|
| 1 | `isStoreOwner()` 가 `organization_members` 를 **serviceKey 필터 없이 `LIMIT 1`** 로 선택 → 다중 org 사용자의 서비스별 org 해석이 비결정적 (`renagang21` 은 org 3개 보유) | **구조적** | 이번 WO 범위 밖. 후속 WO 로 분리 |
| 2 | 기존 `service_credentials` 를 재설정하는 canonical 관리자 경로 부재 → 테스트/운영 계정의 L2 비밀번호 분실 시 `/forgot-password` 외 복구 수단 없음 | **구조적** | 후속 WO 로 분리 |
| 3 | 검증 계정 생성 시 한글 `firstName/lastName` 이 mojibake 로 저장됨(`displayName` 깨짐). suspended 검증 계정 한정이라 운영 영향 없음 | 경미 | 기록만 |
| 4 | GP 홈이 미등록 org 에서 콘솔 오류를 남김(안내 UI 없이 404/403 노출) | 경미 | 기록만 |

> WO §6 에 따라 **구조적 문제는 이번 WO 에서 고치지 않았다.** 작고 명확한 결함은 발견되지 않았다
> (= 이번 공통화 코드에서 수정할 결함 0건).

---

## 8. 최종 집계

```text
L2 credential 정비 건수: 5   (신규 생성 5 · 기존 계정 credential 변경 0)
DB write:               6종  (users 2 · service_memberships 5 · service_credentials 5 ·
                              role_assignments 5 · organization_members 2 · users.status 2)
                              ※ 기존 사용자/기존 org 의 기존 row 수정·삭제 0
검증 화면 수:            27
PASS:                   26
FAIL:                    0
BLOCKED:                 1   (GlycoPharm 홈 — 검증 org 의 glycopharm 미등록, §4)
```

**FAIL 0건.** BLOCKED 1건은 화면명·원인·회귀 아님 근거를 §4 에 전부 기록했다.

---

## 9. 검증 계정 사후 처리

| 항목 | 결과 |
|---|---|
| 처리 방식 | **비활성화** (삭제하지 않음) — canonical `PATCH /admin/users/:id/status {"status":"suspended"}` |
| 결과 실측 | 4 서비스 재로그인 전부 `ACCOUNT_NOT_ACTIVE` 로 차단 확인 |
| DB 상태 | `users.status = suspended` ×2 |
| 자격정보 | 로컬에만 보관. CHECK·커밋·리포트에 비밀번호 미기록 |
| 문서화 | `docs/local/TEST-ACCOUNTS.local.md` §7 에 계정·org·재사용 절차 기록 (gitignored, 비밀번호 literal 미기록) |

---

## 10. 완료 판정

| WO 조건 | 충족 |
|---|:---:|
| credential 상태 조사 (5서비스) | ✅ §1 |
| 운영 사용자 비밀번호 임의 변경 없음 | ✅ 기존 계정 credential 변경 0 |
| canonical 생성 경로 재사용 (SQL 조립 금지) | ✅ §2-1 (`organization_members` 만 API 부재 — 근거 §2-2) |
| credential isolation 확인 | ✅ 교차 3/3 거부 |
| 프로덕션 실계정 로그인 smoke | ✅ 4서비스 4/4 로그인 200 |
| 서비스별 대표 화면군 검증 | ✅ 27화면 (KPA 5 · KCos 9 · GP 9 · PH 4) |
| write 버튼 미실행 | ✅ read-only |
| 공통화 추가 리팩터링/UI 개선/신규 기능 없음 | ✅ 코드 변경 0 |
| FAIL/BLOCKED 전량 기록 | ✅ §4 |
| 검증 계정 비활성화 | ✅ §9 |

### 판정

> **내 매장 공통화 프로덕션 계정 smoke 완료**

선행 CHECK §7-1 의 미검증 3항목 중 **프로덕션 실데이터 · 실제 로그인**은 해소됐다.
**모바일 뷰포트**와 **실제 저장(write) 결과**는 이번 WO 범위(read-only)에서 제외됐으므로 여전히 미검증이다.

---

## 11. 코드 변경

**없음.** 이번 WO 에서 수정이 필요한 결함이 발견되지 않았다.
산출물은 본 CHECK 문서와 로컬 `TEST-ACCOUNTS.local.md` §7(gitignored) 갱신뿐이다.

---

## 문서 정합

발견 0건 / SUPERSEDED 표기 0건 / 링크 수정 0건 / 별도 WO 제안 2건 (§7 #1 org 해석 `LIMIT 1`, #2 L2 재설정 경로 부재)
