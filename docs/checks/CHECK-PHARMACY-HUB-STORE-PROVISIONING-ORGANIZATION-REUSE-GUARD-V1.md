# CHECK — WO-PHARMACY-HUB-STORE-PROVISIONING-ORGANIZATION-REUSE-GUARD-V1

| 항목 | 값 |
|------|------|
| 작업요청서 | `WO-PHARMACY-HUB-STORE-PROVISIONING-ORGANIZATION-REUSE-GUARD-V1` |
| 선행 조사 | `IR-PHARMACY-HUB-STORE-PROVISIONING-REPLAY-SAFETY-V1` §D-1 · §D-2 |
| 작업 방식 | worktree 격리 — `C:\tmp\o4o-ph-provisioning-reuse-guard` / `fix/pharmacy-hub-provisioning-organization-reuse-guard` |
| 기준 커밋 | `daf4f5f37` (origin/main) |
| 검증일 | 2026-08-09 |
| 결과 | **PASS** |

---

## 1. 기존 재사용 로직과 결함 재확인

`resolveOrganization()` 은 후보가 **정확히 1개면 그 조직이 무엇인지 보지 않고** 재사용했다.

| 결함 | 내용 |
|---|---|
| **D-1** | 조직 `type`/업태 미검사 — 사업자번호만 맞으면 `type='store'`(K-Cosmetics 뷰티샵)도 약국으로 재사용 |
| **D-2** | 기존 타 서비스 자산 미검사 — 경계가 `organization_id` 단독인 자산은 PH enrollment 추가만으로 그대로 유입 |

두 결함 모두 **후보가 1개일 때만** 발현한다. `renagang21` 이 held 로 막힌 것은 후보가 3개였기 때문이지
가드가 있어서가 아니었다.

---

## 2. 조사 — 실데이터로 확정 (추측 확대 없음)

### 2-1. `organizations.type` 실사용 분포 (프로덕션)

| type | 조직 수 | PH enrollment 보유 |
|---|:--:|:--:|
| `pharmacy` | 11 | **5 (전부)** |
| `supplier` | 7 | 0 |
| `store` | 2 | 0 |
| `association` | 1 | 0 |
| `division` | 1 | 0 |

→ 약국을 나타내는 canonical type 이 **둘 이상 충돌하지 않는다**(중지 조건 미해당).
   allowlist = `['pharmacy']` 단일. 신규 생성 경로의 `ORG_TYPE` 과도 일치한다.

### 2-2. service-neutral 매장 자산 확정 — **컬럼이 아니라 조회 경로로 판정**

작업요청서가 "실제 schema 를 조사해 확정" 하라고 한 부분에서 **중요한 함정**을 발견했다.

> `service_key` **컬럼이 있다** ≠ **실제로 service 로 거른다**

| 테이블 | 컬럼 | 실제 조회 필터 | 판정 |
|---|---|---|:--:|
| `store_qr_codes` | org only | `organization_id` | **neutral** |
| `store_local_products` | org only | `organization_id` | **neutral** |
| `store_execution_assets` | org only | `organization_id` | **neutral** |
| `store_playlists` | org only | `organization_id` | **neutral** |
| `store_tablets` | org only | `organization_id` | **neutral** |
| `kpa_store_contents` | org only | `organization_id` | **neutral** |
| `organization_product_listings` | org + **service_key** | `WHERE opl.organization_id = $1` — **service_key 미사용** | **neutral (실효)** |
| `store_tablet_screen_sets` | org + **service_key** | `organization_id + origin` — **service_key 미사용** | **neutral (실효)** |
| `store_pops` | store_id + service_key | `{storeId, serviceKey, authorRole}` 복합 | scoped ✅ |
| `store_blog_posts` | store_id + service_key | 복합 | scoped ✅ |

컬럼만 봤다면 뒤 두 개(`organization_product_listings` · `store_tablet_screen_sets`)를 안전하다고
오판했을 것이다. **가드 대상 8개**로 확정했다.

---

## 3. 최종 reuse allow/deny 규칙

```
0. 이미 pharmacy-hub active enrollment 보유  → allow  (멱등 재실행 — §5 참조)
1. organizations.type ∉ {pharmacy}           → held  ORGANIZATION_TYPE_NOT_COMPATIBLE
2. 타 서비스 active enrollment 보유           → held  ORGANIZATION_HAS_OTHER_SERVICE_ENROLLMENT
3. service-neutral 자산 1건이라도 보유        → held  ORGANIZATION_HAS_SERVICE_NEUTRAL_ASSETS
4. 그 외                                      → allow
```

- 임계값 없음 — **1건이라도** 있으면 held (보수적)
- held detail 에 **어떤 자산이 몇 건인지** 담아 사람이 판단할 근거를 남긴다
- 자산 이동·삭제·복사 0, 타 서비스 enrollment 무접촉 (읽기만)

### 적용 위치 — 두 경로가 **같은 helper** 사용

`validateOrganizationReuseSafety(organizationId)` 하나를 아래 두 곳이 공유한다(복제 0).

```
A. organization_members 단일 후보
B. businessNumber 단일 매칭
```

신규 생성 경로(후보 0개)는 **의미 변경 없음** — 가드를 타지 않는다.

---

## 4. 케이스 검증 (단위 테스트 15/15 PASS)

`apps/api-server/src/services/pharmacy-hub/__tests__/PharmacyHubStoreProvisioningService.reuse-guard.test.ts`

DB 를 붙이지 않고 `dataSource.query` 를 SQL 패턴으로 라우팅해 시나리오를 만든다 —
**운영 DB 에 위험 fixture 를 만들지 않기 위한 선택**이다.

| 케이스 | 기대 | 결과 |
|---|---|:--:|
| A. 안전한 pharmacy 1개 | 재사용 | ✅ |
| B. `type=store` 1개 | held TYPE_NOT_COMPATIBLE | ✅ |
| B-2. `type=supplier` 1개 | held TYPE_NOT_COMPATIBLE | ✅ |
| C. pharmacy + 타 서비스 enrollment | held OTHER_SERVICE_ENROLLMENT | ✅ |
| D. pharmacy + 자산 보유 (QR 50·제품 20) | held SERVICE_NEUTRAL_ASSETS + 건수 안내 | ✅ |
| D-2. QR 1건만 | held (임계값 없음) | ✅ |
| E. businessNumber 매칭이 비약국 | held (경로 B 도 동일 가드) | ✅ |
| E-2. businessNumber 매칭이 안전한 pharmacy | 재사용 | ✅ |
| F. 후보 0개 | 신규 생성 (`ph-pharm-…`) | ✅ |
| 기존 계약 — 후보 2개+ | AMBIGUOUS_ORGANIZATION 유지 | ✅ |
| 기존 계약 — 사업자번호 2개+ | DUPLICATE_BUSINESS_NUMBER 유지 | ✅ |
| 기존 계약 — store_owner 아님 | skipped | ✅ |
| **가드는 읽기만** | held 시 INSERT/UPDATE/DELETE 0 | ✅ |
| 멱등 — PH enrollment 보유 + 자산 다수 | 재사용(noop 경로 보존) | ✅ |
| 멱등 대조 — PH enrollment 없음 + 같은 자산 | held | ✅ |

---

## 5. 운영 실측이 잡아낸 오탐 1건 (구현 중 수정)

1차 구현으로 운영 모집단을 계산했더니 **W9 검증 계정이 held** 로 나왔다.

```
e2e.test.ph.w9.owner@example.com
  → held: ORGANIZATION_HAS_SERVICE_NEUTRAL_ASSETS
     [ph-pharm-4f42110aee2a → store_qr_codes=5, store_execution_assets=1,
      store_playlists=1, store_tablets=2, store_tablet_screen_sets=2]
```

**오탐이다.** 그 조직은 **이미 그 사용자의 PH 매장**이고, 자산도 PH 가 스스로 만든 것이다.
타 서비스 유입이 아니라 **멱등 재실행**인데 held 로 바뀌면
backfill `--mode=apply` 의 "재실행 시 추가 생성 0(noop)" 계약이 깨진다(완료 기준 8).

→ 가드 **0단계** 추가: 대상 조직에 이미 `pharmacy-hub` active enrollment 가 있으면 통과시킨다.
   이 가드는 *남의 조직을 입양하는 것*을 막는 것이지 *우리 매장을 다시 확인하는 것*을 막는 게 아니다.

수정 후 재계산 결과는 §6.

---

## 6. 운영 모집단 영향 (read-only)

| 항목 | 값 |
|---|---|
| 전체 PH `store_owner` 후보 | **2명** |
| 신규 생성 가능 | 0 |
| 안전 재사용 | 0 |
| **이미 PH 매장 (멱등)** | **1** — `e2e.test.ph.w9.owner@example.com` → `ph-pharm-4f42110aee2a` |
| type 불일치 | 0 |
| 타 서비스 enrollment 보유 | 0 |
| service-neutral 자산 보유 | 0 |
| **ambiguous** | **1** — `renagang21@gmail.com` (3개 조직) |
| 기타 held | 0 |

### **가드로 인해 새로 held 되는 계정 = 0명**

기존 PH enrollment 조직 5개(전부 `[E2E_TEST]`, `type=pharmacy`)는 이미 만들어진 것이라 영향 없다.
→ 중지 조건 "가드를 넣으면 기존 정상 PH 운영 조직이 대량 held 됨" **미해당**.

### renagang21 재검증 — WO 기대 결과 유지

```
organization_members 후보 3개
  KCOSA3DDC841B946 (뷰티샵) · neture-supplier-6967ebe0 (공급자) · kpa-pharm-1088602873 (KPA 약국)
→ AMBIGUOUS_ORGANIZATION → held → write 0
```

세 조직 중 어느 것도 자동 선택되지 않는다. 조직·자산 **무접촉**.

> 참고: 가드 도입으로 이 계정은 **이중 안전망**을 갖게 됐다. 설령 후보가 1개로 줄어도
> 뷰티샵은 type 에서, KPA 약국은 자산(QR 50·제품 20·자료함 7)에서, 공급자는 type 에서 각각 막힌다.

---

## 7. backfill 계약 확인

`scripts/pharmacy-hub-store-subject-provisioning.ts` 는 이 서비스를 그대로 호출하므로
`--mode=dry-run | apply | post-verify` 계약이 유지된다.

- `dry-run` : write 0 — 가드는 held 를 **write 이전에** 반환한다(테스트로 고정)
- `apply` : 멱등 유지 — §5 의 0단계로 기존 PH 매장은 계속 `noop/reused`
- `post-verify` : read-only, 불변식 미변경

held 대상은 기존과 같이 **건너뛰고 사유를 출력**한다 — 스크립트 흐름 변경 없음.
실제 `apply` 는 수행하지 않았다(모집단 2명 중 1명은 이미 완비, 1명은 held).

---

## 8. 검증 결과

| 항목 | 결과 |
|---|---|
| 재사용 가드 단위 테스트 | ✅ **15/15 PASS** |
| `src/services/` 전체 | ✅ **138/138 PASS** (9 suites) |
| `api-server` tsc --noEmit | ✅ clean |
| 운영 모집단 영향 | ✅ 새로 held 0명 |

### DB write 및 원상 복구

**프로덕션 DB write 0** — 전 과정 `SELECT` 만 수행했다(스키마 조사·모집단 계산 포함).
위험 fixture 를 만들지 않았고, 단위 테스트는 DB 를 붙이지 않는다.
따라서 원상 복구 대상이 없다.

### 타 서비스 영향

`resolveStoreAccess` · 공통 가드 · W9 실행 자산 코드 · 기존 조직 type/자산/enrollment —
**전부 무접촉.** 변경은 `PharmacyHubStoreProvisioningService.ts` 한 파일과 신규 테스트뿐이다.

---

## 9. 완료 기준 대조

| # | 기준 | 결과 |
|:--:|---|:--:|
| 1 | 비약국 조직 자동 재사용 차단 | ✅ Case B·B-2·E |
| 2 | 타 서비스 enrollment 조직 차단 | ✅ Case C |
| 3 | service-neutral 자산 보유 조직 차단 | ✅ Case D·D-2 |
| 4 | 두 재사용 경로가 동일 guard 사용 | ✅ `validateOrganizationReuseSafety` 공유 |
| 5 | 신규 조직 생성 경로 불변 | ✅ Case F |
| 6 | renagang21 held 유지 / write 0 | ✅ §6 |
| 7 | 정상 신규 가입·승인 flow PASS | ✅ Case F + 기존 W9 E2E 경로 무변경 |
| 8 | 멱등성 유지 | ✅ §5 0단계 — 실측 오탐을 수정해 확보 |
| 9 | schema/migration 0 | ✅ |
| 10 | 타 서비스 데이터 변경 0 | ✅ read-only |
| 11 | CHECK 작성 | ✅ 본 문서 |
| 12 | 전용 branch commit·push | ✅ |
| 13 | 검증 후 main 반영 | ✅ |

---

## 10. 변경 파일

```
수정: apps/api-server/src/services/pharmacy-hub/PharmacyHubStoreProvisioningService.ts
신규: apps/api-server/src/services/pharmacy-hub/__tests__/
        PharmacyHubStoreProvisioningService.reuse-guard.test.ts
신규: docs/checks/CHECK-PHARMACY-HUB-STORE-PROVISIONING-ORGANIZATION-REUSE-GUARD-V1.md
```

DB schema · migration · 조직 type 자동 변경 · 자산 이동/삭제 · enrollment 제거 ·
renagang21 수동 연결 · `organization_members` 수동 보정 · service-neutral 자산에 serviceKey 추가 ·
공통 `resolveStoreAccess` · W9 실행 자산 코드 — **전부 무접촉.**

---

## 11. 남은 관찰 사항 (이번 범위 밖)

`organization_product_listings` 와 `store_tablet_screen_sets` 는 **`service_key` 컬럼을 갖고도
조회에서 쓰지 않아** 실효적으로 org-scoped 다. 이번 가드는 이를 "neutral" 로 취급해 안전을 확보했지만,
근본적으로는 두 조회 경로가 `service_key` 를 필터에 넣는 편이 맞다.
다만 이는 KPA·GlycoPharm·K-Cosmetics 의 기존 목록 결과를 바꿀 수 있는 변경이라 별도 판단이 필요하다.
→ 후속 관찰: `WO-O4O-STORE-ASSET-SERVICE-KEY-FILTER-ALIGNMENT-V1` (제안)
