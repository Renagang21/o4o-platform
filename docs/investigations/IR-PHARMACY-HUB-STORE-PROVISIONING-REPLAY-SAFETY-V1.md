# IR — Pharmacy-Hub 매장 프로비저닝 재실행 안전성 조사

| 항목 | 값 |
|------|------|
| 목적 | W9 정상 경로 검증에 필요한 PH 매장 조직을, W1 정식 경로로 **안전하게** 확보할 수 있는지 판정 |
| 대상 | `renagang21@gmail.com` (`6967ebe0-2f87-4cab-809b-8c7190493cef`) |
| 조사일 | 2026-08-08 |
| 수행 범위 | **read-only** — 코드 변경 0 · DB write 0 · migration 0 · 수동 INSERT/UPDATE 0 · 배포 0 |
| 채널 | Cloud SQL Auth Proxy + `SELECT` 전용 쿼리 (프로덕션 `o4o_platform`) |
| **최종 판정** | **B. AMBIGUOUS_EXISTING_ORGANIZATION** (+ D 성격 결함 2건 동반 발견) |

---

## 1. W1 현재 프로비저닝 flow

`apps/api-server/src/services/pharmacy-hub/PharmacyHubStoreProvisioningService.ts`
— 호출 지점 2곳: `PharmacyHubMembershipConsoleController`(승인 시) ·
`scripts/pharmacy-hub-store-subject-provisioning.ts`(backfill, `--mode=dry-run|apply|post-verify`).

대상 자격: `service_memberships` 가 `pharmacy-hub` / `active` / `pharmacy-hub:store_owner` 인 사용자만.
그 외는 `skipped`.

### 조직 결정 전략 (`resolveOrganization`) — 재사용 우선

| 단계 | 조건 | 결과 |
|:--:|---|---|
| 1 | `organization_members`(role ∈ owner/admin/manager, `left_at IS NULL`) 후보 **2개 이상** | **held `AMBIGUOUS_ORGANIZATION`** |
| 1 | 후보 **정확히 1개** | 그 조직 **재사용** |
| 2 | 후보 0개 + `businessInfo.businessNumber` 로 매칭되는 활성 조직 **2개 이상** | held `DUPLICATE_BUSINESS_NUMBER` |
| 2 | 후보 0개 + 사업자번호 매칭 **1개** | 그 조직 **재사용** |
| 3 | 그 외 | **신규 생성** (`ph-pharm-{userId 앞 12hex}`, type=`pharmacy`) |

이후 write 단계(멱등): `organization_members(owner)` → `organization_service_enrollments(pharmacy-hub)`
→ `role_assignments` 보강 → `platform_store_slugs` 발급. slug 실패는 `SLUG_UNRESOLVABLE` 보류로만 보고하고
앞 단계를 롤백하지 않는다.

---

## 2. `renagang21` 현재 상태 (실측)

### 2-1. 서비스 자격 — PH 자격은 완비

| 축 | 값 |
|---|---|
| `service_memberships` | `pharmacy-hub` / `pharmacy-hub:store_owner` / **active** (2026-07-29) |
| `role_assignments` | `pharmacy-hub:store_owner` **is_active=true** |
| 타 서비스 membership | glycopharm(`pharmacy`) · k-cosmetics(`cosmetics:store_owner`) · kpa-society(`user`) · neture(`supplier`) · platform(`super_admin`) — 전부 active |

즉 **role·membership 은 이미 충족**돼 있고, 빠진 것은 조직 2행(`organization_members` + `enrollment`)뿐이다.

### 2-2. 소속 조직 — 3개 (전부 owner, `left_at IS NULL`)

| code | name | type | 기존 enrollment | slug |
|---|---|---|---|---|
| `KCOSA3DDC841B946` | 테스트 뷰티샵 | `store` | `k-cosmetics:active` | — |
| `kpa-pharm-1088602873` | 테스트 약국 | `pharmacy` | *(없음)* | `kpa=네뚜레-약국` |
| `neture-supplier-6967ebe0` | (주)네뚜레 공급자 테스트 | `supplier` | `neture:active` | — |

---

## 3. 과거 HOLD 원인의 현재 재현 여부 — **동일하게 재현됨**

`resolveOrganization()` 1단계 후보 = **3개** → **`held: AMBIGUOUS_ORGANIZATION`**.

W1 backfill 모집단(active PH store_owner) 전체를 조회해도 대상은 이 계정 1명뿐이며
`store_org_count = 3` 이다. 즉 **"프로비저닝이 빠진 계정"이 아니라 "설계대로 보류된 계정"** 이다.
지금 `--mode=apply` 를 재실행해도 결과는 `held` 이고 write 는 0 이다.

---

## 4. 조직 후보별 판단 근거 — 추측하지 않고 실측으로 정리

### 4-1. 각 후보가 이미 보유한 매장 자산

| code | QR | POP | playlist | 자료함 | listing | 태블릿 |
|---|:--:|:--:|:--:|:--:|:--:|:--:|
| `KCOSA3DDC841B946` (뷰티샵) | 0 | 0 | 0 | 0 | 0 | 0 |
| **`kpa-pharm-1088602873` (약국)** | **50** | 0 | **5** | **7** | **20** | **4** |
| `neture-supplier-6967ebe0` (공급자) | 0 | 0 | 0 | 0 | 0 | 0 |

### 4-2. ⚠️ 결정적 위험 — `store_qr_codes` 의 경계에 service 축이 없다

`information_schema` 실측: `store_qr_codes` 의 경계 컬럼은 **`organization_id` 단독**이다
(service 계열 컬럼 없음).

> **따라서 `kpa-pharm-1088602873` 에 PH enrollment 를 추가하면,
> Pharmacy-Hub `/store-owner/qr` 화면에 KPA QR 50건이 그대로 나타난다.**
> 자료함 7건·listing 20건·재생목록 5건도 마찬가지다.

이는 본 WO 가 23/23 으로 실증한 서비스 간 격리(§CHECK 5-7A)를 정면으로 무너뜨린다.
**객관적 근거로 재사용 금지 대상이다.**

### 4-3. 사업자번호 매칭(W1 2단계)이 가리키는 곳도 약국이 아니다

| 출처 | 값 |
|---|---|
| `users.businessInfo.businessNumber` | `108-8699992` → digits `1088699992` |
| 매칭되는 활성 조직 | **`KCOSA3DDC841B946` 테스트 뷰티샵 (1개)** |
| `kpa-pharm-1088602873` 의 사업자번호 | `1088602873` — **사용자 값과 불일치** |

즉 만약 1단계 후보가 0개였다면 W1 은 **뷰티샵을 Pharmacy-Hub 약국으로 재사용**했을 것이다.
type=`store`(뷰티샵)이고 이미 `k-cosmetics` 에 enroll 돼 있는데도 검사하지 않는다.

### 4-4. 판정 요약

| 후보 | PH 약국으로 확정할 객관적 근거 | 판정 |
|---|---|---|
| 뷰티샵 | 사업자번호는 일치하나 **type=store · K-Cosmetics 매장** | ❌ 업태 불일치 |
| KPA 약국 | 유일한 `type=pharmacy` 지만 **KPA 실자산 50+ 보유 · 사업자번호 불일치** | ❌ 격리 파괴 |
| 공급자 조직 | **type=supplier** — 매장이 아님 | ❌ 역할 불일치 |

**세 후보 모두 Pharmacy-Hub 약국으로 확정할 근거가 없다.** 자동 선택 금지가 맞다.

---

## 5. 기존 PH 조직 재사용 가능성 — 불가

시스템 전체에 PH enrollment 조직은 4개 존재하나 **전부 E2E 픽스처**다.

| code | name | 소유자 | 소유자 status | PH membership | 자산 |
|---|---|---|---|:--:|:--:|
| `ph-pharm-2b06dc6bf7c8` | [E2E_TEST] W7 … | `e2e.test.ph.w7.owner@example.com` | **deleted** | 없음 | 전부 0 |
| `ph-pharm-5ee375662a51` | [E2E_TEST] Pharmacy-Hub 검증약국 A | `e2e.test.pharmacyhub.owner.active@…` | **deleted** | 없음 | 전부 0 |
| `ph-pharm-88a71161000b` | [E2E_TEST] W8 약국 | `e2e.test.ph.w8b.owner@example.com` | **deleted** | 없음 | 전부 0 |
| `ph-pharm-cdb7b2c94c2b` | [E2E_TEST] W8c 약국 | `e2e.test.ph.w8c.owner@example.com` | **deleted** | 없음 | 전부 0 |

소유자 계정이 전부 삭제 상태라 **로그인할 수 없고**, PH membership·role 도 없어
`resolvePharmacyHubStoreOrganization()` 을 통과하지 못한다. 검증에 쓸 수 없다.

---

## 6. 신규 생성 경로의 안전성 (참고 — 실행하지 않음)

| 항목 | 실측 |
|---|---|
| 결정적 code `ph-pharm-6967ebe02f87` | **미점유** (조직 0건) → 충돌 없음, 멱등 재실행 안전 |
| `businessInfo.businessName` | `'테스트 사업자'` 존재 → `MISSING_STORE_NAME` 보류 안 걸림 |

즉 **조직 후보 판정만 우회하면** 신규 PH 전용 조직 생성은 기술적으로 깨끗하다.
다만 현재 W1 코드에는 "기존 후보를 무시하고 신규 생성" 하는 입력이 없다 —
`resolveOrganization` 이 1단계에서 held 로 끝난다.

---

## 7. 최종 판정

### **B. AMBIGUOUS_EXISTING_ORGANIZATION**

- W1 정식 경로 재실행(`--mode=apply`)은 **지금도 `held` 로 끝나며 write 0** 이다. 안전하지만 **아무것도 해결하지 못한다**.
- 후보 3개 중 어느 것도 PH 약국으로 확정할 객관적 근거가 없다 (§4-4).
- 특히 유일한 `type=pharmacy` 후보는 재사용 시 **KPA 자산 50+ 가 PH 화면에 유입**된다 (§4-2).
- ⇒ **자동 replay 금지. 수동 SQL 로 두 행을 채우는 것도 같은 판단을 건너뛰는 것이므로 금지.**

### 동반 발견 — D 성격 결함 2건 (W9 범위 밖, 선행 WO 대상)

| # | 결함 | 근거 |
|:--:|---|---|
| D-1 | **재사용 시 조직 type·업태를 검사하지 않는다** | 사업자번호 매칭 하나로 `type='store'` 뷰티샵을 PH 약국으로 재사용할 수 있다 (§4-3) |
| D-2 | **재사용 시 그 조직이 이미 가진 타 서비스 매장 자산을 검사하지 않는다** | `store_qr_codes` 등의 경계가 `organization_id` 단독이라, enroll 만으로 타 서비스 자산이 PH 로 유입된다 (§4-2) |

두 결함은 "후보가 정확히 1개" 인 계정에서 **조용히 잘못된 매장을 만든다** — 현재 held 로 막힌 것은
후보가 3개였기 때문이지 검사가 있어서가 아니다.

---

## 8. write 없이 가능한 다음 실행 — 사용자 결정 사항

| 선택지 | 내용 | 필요한 승인 |
|:--:|---|---|
| ① | **PH 가입 flow 를 신규 계정으로 정상 통과**시켜 W1 이 `created` 경로를 타게 한다 — 후보 0개이므로 held 없이 `ph-pharm-*` 신규 조직이 생긴다. **가장 정석이며 기존 조직을 건드리지 않는다.** | 신규 테스트 계정 1개 생성 |
| ② | W1 에 **명시적 조직 선택/신규 강제 입력**을 추가하는 선행 WO (D-1·D-2 가드 포함) 후 재실행 | 코드 변경 WO |
| ③ | 운영자 콘솔에서 매장 조직을 지정하는 UX 신설 | 제품 결정 |

> ①이 가장 빠르고 안전하다. `renagang21` 은 이미 3개 조직에 묶여 있어 어떤 경로로도
> 깨끗한 PH 매장을 얻기 어렵다 — **검증 전용 신규 계정**으로 가입시키는 편이
> 운영 데이터를 건드리지 않으면서 W9 정상 경로 4축(QR·POP·사이니지·설명서)을 완결할 수 있다.

### 이번 조사에서 하지 않은 것

`resolvePharmacyHubStoreOrganization()` 0/1/2+ 계약 무변경 · W9 자산 코드 무변경 ·
`organization_members`/`enrollment` 수동 생성 0 · 기존 KPA/K-Cosmetics/Neture 조직 재사용 0 ·
E2E 픽스처 정리 0 (별도 판단 대상).
