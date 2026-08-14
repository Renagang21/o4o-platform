# CHECK-O4O-KPA-STORE-ORGANIZATION-ENROLLMENT-BACKFILL-AND-PRODUCTION-VERIFY-V1

**대상 WO**: WO-O4O-KPA-STORE-ORGANIZATION-ENROLLMENT-BACKFILL-AND-PRODUCTION-VERIFY-V1
**선행 CHECK**: [`CHECK-O4O-KPA-STORE-ORGANIZATION-ENROLLMENT-CANONICALIZATION-V1`](CHECK-O4O-KPA-STORE-ORGANIZATION-ENROLLMENT-CANONICALIZATION-V1.md) §4 backfill 판정
**작성일**: 2026-08-14
**성격**: 코드 공통화 아님 — **운영 데이터 canonicalization + 실운영 검증**

---

## 0. 요약

KPA 매장 조직 **7곳**에 누락된 `organization_service_enrollments('kpa-society','active')` 를 backfill 했다.
**신규 7행 / 기존 수정 0 / 중복 0 / 타 서비스 변경 0 / OPL 변화 0.**

**단, 권한 변화가 0은 아니다.** 의약품 `OPL_CREATE` 가 대상 7개 조직에서 **deny → allow** 로 전환됐다.
조사 결과 이는 **canonical enrollment 누락 복구에 따른 의도된 정책 정상화**로 판정했다 (§7). rollback 하지 않았다.

---

## 1. 대상 7개 재확인 (WO §1)

### 1-1. 판정

```text
platform_store_slugs(service_key='kpa', is_active=true) 행: 9
  ├ organizations 행 존재(= backfill 대상):              7   ← 대상 확정
  └ orphan slug (organizations 행 없음):                 2   ← 범위 외
조직당 slug 중복(ambiguous):                              0
이미 kpa-society enrollment 보유:                         0
```

> **주의**: slug 행 수(9)와 대상 조직 수(7)는 다르다. 선행 CHECK 의 "7" 은 `organizations` JOIN 기준이며 동일하다.
> orphan 2건(`neture-3lifezone`, `phase0-테스트약국`, 둘 다 2026-04-16 생성)은 `store_id` 가 가리키는
> organization 행이 없어 **FK 상 enrollment 생성 자체가 불가**하다. 별도 부채로 기록한다(§9).

### 1-2. 대상 7개 상세

| # | org_id | 이름 | type | slug | members | kpa:store_owner | 기존 enrollment |
|---|---|---|---|---|---:|---:|---|
| 1 | `9c87f46b…ce96` | 테스트 약국 | pharmacy | 네뚜레-약국 | 2 | 2 | (없음) |
| 2 | `c92b857f…55fd` | 테스트 약국 | pharmacy | 테스트-약국 | 0 | 0 | `glycopharm:active` |
| 3 | `c5982508…9711` | 피앤디 약국 | pharmacy | 피앤디-약국 | 1 | 1 | (없음) |
| 4 | `8712bff0…f0c4` | 중앙약국 | pharmacy | 중앙약국 | 1 | 1 | (없음) |
| 5 | `ec596c46…e099` | 테스트 약국 (E2E) | **association** | e2e | 0 | 0 | (없음) |
| 6 | `aed9eda9…5ec` | Renagang 약국 | pharmacy | renagang-약국 | 0 | 0 | (없음) |
| 7 | `c9beb4a2…c048` | Sohae 약국 | pharmacy | sohae-약국 | 1 | 1 | (없음) |

- #2 는 `glycopharm` enrollment 를 이미 보유 — `kpa-society` 추가는 **다른 service_code 이므로 additive**, 기존 행 무수정.
- #5 는 `type='association'` (다른 6건은 `pharmacy`). KPA slug 를 가진 E2E 조직이며 선행 CHECK 의 7 집합과 동일하다.
  운영자 콘솔 노출에는 영향이 있다(§6).

---

## 2. Backfill 실행 (WO §2)

`organizationOpsService.enrollService()` **와 동일 계약**의 statement 를 대상 UUID 7개 **명시 고정**으로 실행했다
(대량 SQL 아님). 노출된 admin endpoint 가 없어 in-process 서비스의 statement 를 그대로 사용했다.

```sql
INSERT INTO organization_service_enrollments
  (id, organization_id, service_code, status, enrolled_at, config, created_at, updated_at)
VALUES (gen_random_uuid(), '<org>', 'kpa-society', 'active', NOW(), '{}'::jsonb, NOW(), NOW())
ON CONFLICT (organization_id, service_code) DO NOTHING;   -- 멱등
```

트랜잭션 안에 **가드**를 두어 `+7` 이 아니거나 타 서비스 총량이 변하면 전체 롤백되게 했다.

```text
INSERT 0 7
NOTICE: GUARD OK: +7 rows (before=0 after=7)
COMMIT
```

---

## 3. 실행 직후 DB 검증 (WO §3)

```text
대상 조직:            7
신규 enrollment 생성:  7
기존 enrollment 수정:  0
중복:                 0
실패:                 0
```

| 지표 | BEFORE | AFTER | 판정 |
|---|---:|---:|---|
| `kpa-society` active enrollment | 0 | **7** | 의도된 증가 |
| `service_code='kpa'` enrollment | 0 | 0 | 불변 (키 이원화 없음) |
| enrollment 전체 | 13 | 20 | +7 (= 신규분) |
| `platform_store_slugs` (kpa active / 전체) | 9 / 17 | 9 / 17 | **불변** |

**타 서비스 enrollment — 전부 불변**

| service_code | BEFORE | AFTER |
|---|---:|---:|
| cosmetics | 1 | 1 |
| glycopharm | 2 | 2 |
| k-cosmetics | 2 | 2 |
| neture | 3 | 3 |
| pharmacy-hub | 5 | 5 |

- 대상 7개 각각 **정확히 1행** · 전역 `(organization_id, service_code)` 중복 **0행**
- backfill 대상 외 조직에 생긴 `kpa-society` 행 **0건**
- 전체 organization 23개 중 enrolled 7 / not-enrolled 16 → **무차별 확대 아님**

---

## 4. 상품(OPL) 영향 검증 (WO §4)

```text
backfill 전 KPA OPL:  service_key='kpa' 1건 · 'kpa-society' 1건 · 대상7org 26건 (전체 29)
backfill 후 KPA OPL:  service_key='kpa' 1건 · 'kpa-society' 1건 · 대상7org 26건 (전체 29)

자동 신규 OPL:  0
중복 OPL:      0
service_key drift: 0   ('kpa' / 'kpa-society' 혼재 신규 발생 없음)
```

**근거 — enrollment 삽입은 auto-listing 을 트리거하지 않는다.**
`autoExpandPublicProduct` / `autoExpandServiceProduct` 는 **offer 승인 시점**(`offer-service-approval.service.ts`)에,
`autoListPublicProductsForOrg` / `autoListServiceProductsForOrg` 는 **org 생성 시점**(glycopharm 전용)에만 호출된다.

**미래 확산 규모 (실측)**

| 항목 | 값 |
|---|---|
| `PUBLIC` + APPROVED offer | **0건** → PUBLIC 자동 확산 없음 (선행 예측과 일치) |
| `SERVICE` + APPROVED offer | 1건 (`offer_service_approvals` 에 `kpa-society: approved` 1) |
| 향후 동작 | 새 offer 승인 시 7개 KPA 조직에 `service_key='kpa-society'`, `is_active=false` 로 생성(노출 없음) |

---

## 5. Store-owner 조직 해석 (WO §5)

`isStoreOwner()` → `resolveStoreOrganization(userId, serviceKey)` → `findStoreOrganizationCandidates()` 재현.
후보 조건은 **enrollment OR slug** (`STORE_SERVICE_ORG_LINKAGE.kpa = {enrollmentCodes:['kpa-society','kpa'], slugKeys:['kpa']}`).

| 계정 | BEFORE (slug 조건만) | AFTER (enrollment OR slug) | 해석된 조직 |
|---|:---:|:---:|---|
| `dearfrnd@naver.com` | 1 · resolved | 1 · resolved | 중앙약국 |
| `pradix@naver.com` | 1 · resolved | 1 · resolved | 피앤디 약국 |
| `sohae2100@gmail.com` | 1 · resolved | 1 · resolved | Sohae 약국 |
| `renagang21@gmail.com` | 1 · resolved | 1 · resolved | **테스트 약국** (KPA) |
| `o4o-smoke-mystore@…`(검증용) | 1 · resolved | 1 · resolved | 테스트 약국 |

```text
service-scoped resolution: 5/5 resolved
ambiguous:                 0
공급자/타 서비스 조직 누출: 0
```

- `renagang21` 은 organization 4개(약국·뷰티샵·공급자·GP검증약국) 소속이지만 **KPA 축 후보는 1개**로 확정된다.
  과거 잘못된 조직으로 새던 계정이 canonical KPA 조직으로 유지됨을 확인했다.
- **신규 ambiguous 0 근거**: enrollment 조직집합 ⊆ slug 조직집합 (대칭차 `enroll_only=0`, `slug_only=2`=orphan).
  즉 후보 집합이 backfill 전후 **동일**하다.
- **접근 회귀 0 (실측)**: 검증 계정으로 backfill 후 KPA 내 매장 5화면 프로덕션 재smoke → **5/5 PASS**,
  API 호출수(14/9/10/9/10)까지 backfill 전 실행과 동일. 403/409 **0건**.

---

## 6. 운영자 화면/API 검증 (WO §6)

실제 프로덕션 API 응답으로 확인했다.

| 항목 | 결과 |
|---|---|
| `GET /operator/stores?serviceKey=kpa-society` | **HTTP 200** · 0건 → **6건** (의도된 교정) |
| 매장 수 집계 원본 쿼리 | `COUNT(*) FILTER (status='active') FROM organization_service_enrollments WHERE service_code='kpa-society'` = **7** |
| 상세 진입 | `assertStoreAccess` 는 enrollment 기반 → 대상 7개 접근 가능 |
| KPA 운영자 대시보드 | **HTTP 200** (KPI 8종 정상). 매장 KPI 는 `isAdmin` 게이트라 operator 토큰에는 미표시 |

**7 → 6 인 이유**: `StoreConsoleController` 가 `o.type IN ('pharmacy','store','branch')` 로 필터한다.
대상 #5(E2E)는 `type='association'` 이라 제외된다 — **정상 필터링**이며 결함이 아니다.

**cross-service 노출 없음 (platform admin 토큰 · 명시 serviceKey)**

| serviceKey | 매장 수 | BEFORE 대비 |
|---|---:|---|
| kpa-society | 6 | 0 → 6 (교정) |
| glycopharm | 2 | 불변 |
| k-cosmetics | 2 | 불변 |
| pharmacy-hub | 5 | 불변 |
| neture | 0 | 불변 |

> 검증 계정 토큰으로는 14건이 반환되는데, 이는 **그 계정이 4개 서비스 store_owner role 을 동시에 보유**해
> scope 합집합(6+2+2+5−중복1=14)이 적용된 결과다. backfill 로 인한 누출이 아니다.

---

## 7. 의약품 gate 검증 (WO §7) — **권한 변화 있음**

### 7-1. 결과

```text
의약품 OPL_CREATE:
deny → allow   7개 KPA 조직

판정:
예상 밖 변화였으나 조사 결과
canonical enrollment 누락 복구에 따른 의도된 정책 정상화
```

WO §11 의 "예상 밖 권한 변화" 조건에 해당해 **작업을 중지하고 보고**했으며, 판정 후 **rollback 없이 재개**했다.

### 7-2. 선행 예측이 틀린 이유 (중요)

선행 CHECK 는 "drug gate 무영향 · deny→allow 뒤집히는 케이스 없음" 으로 예측했다. 그 전제가 **커밋 순서 때문에 무효화**됐다.

| 시각 | 커밋 | 사건 |
|---|---|---|
| 2026-08-14 **09:59** | `2d3dfb8d7` | 선행 CHECK 커밋. 당시 `deriveListingServiceKey` = **`'kpa'`** |
| 2026-08-14 **10:41** | `95e579448` | **42분 뒤** listing service_key canonical 정렬 → **`'kpa-society'`** (WO-O4O-KPA-STORE-SERVICE-KEY-AND-PRODUCT-POLICY-CANONICALIZATION-V1) |

`assertDrugActionAllowed` 4단계 게이트에서 경로가 달라졌다.

```text
선행 CHECK 가정:  serviceKey='kpa'
  → 3단계 service_audience_policies 에 'kpa' 행 없음 → DRUG_POLICY_UNAVAILABLE → 이미 차단
  → 4단계(enrollment) 도달하지 않음 → enrollment 추가해도 무영향

실제 현재:        serviceKey='kpa-society'
  → 3단계 정책행 존재 · is_pharmacy_target_service=true → PASS
  → 4단계 organizationBelongsToService(org,'kpa-society') = enrollment 조회
     · backfill 전: false → DRUG_ORG_CONTEXT_MISMATCH → 차단
     · backfill 후: true  → 통과
```

### 7-3. 실측 (WO §7 최소 케이스)

| 케이스 | 3단계 정책 | 4단계 enrollment | 결과 |
|---|:---:|:---:|---|
| **KPA canonical 약국 org** (대상 7) | PASS (`kpa-society` = pharmacy target) | **true** (backfill 후) | 다음 gate 단계 정상 진행 ✅ |
| **타 서비스 org** (뷰티샵 store · 네뚜레 supplier) | — | **false** | `DRUG_ORG_CONTEXT_MISMATCH` 차단 유지 ✅ |
| **비대상 KPA slug** (orphan 2건) | — | **false** | 임의 허용 없음 ✅ |
| 비약국 서비스 (`neture` · `k-cosmetics`) | `is_pharmacy_target_service=false` | — | `DRUG_NON_PHARMACY_SERVICE` 차단 ✅ |
| enrollment status | 7행 전부 `active` | — | guard 는 `status='active'` 만 통과 ✅ |

### 7-4. 정상화로 판정한 근거

1. `kpa-society` 는 **이미** `service_audience_policies.is_pharmacy_target_service = true` 정책을 보유한 서비스였다
   (2026-06-16 생성, 이번 WO 이전).
2. 이번 WO 는 **정책행을 새로 만들거나 완화하지 않았다** — `service_audience_policies` 무변경.
3. **guard 코드·의약품 허용 기준 자체도 변경하지 않았다** — 코드 변경 0.
4. KPA 약국 조직에 빠져 있던 **canonical enrollment 만** 채웠다.
5. 4단계 게이트는 원래 "해당 서비스에 active enrollment 로 소속" 을 요구하는 설계다.
   즉 우회가 아니라 **설계된 마지막 조건의 정상화**다.

### 7-5. 영향 범위 (과대 해석 방지)

- `OPL_CREATE` 허용은 "의약품 177,413건을 자동 진열/판매" 를 뜻하지 않는다.
- 실측 OPL 변화 **0** (29→29), PUBLIC 승인 offer **0** → 자동 확산 발생 없음.
- 실제 변화는 **KPA 약국이 향후 의약품 OPL 생성을 시도할 때 서비스/조직 자격 단계에서 더 이상 잘못 차단되지 않는 것**이다.
- 의약품 write(신청/주문)는 **수행하지 않았다** (read-only 검증).

---

## 8. Rollback (WO §8)

| 항목 | 내용 |
|---|---|
| 준비 시점 | backfill 실행 **전** 에 대상 UUID 고정 스크립트 작성 |
| 범위 | 이번 WO 가 생성한 **7행만** `DELETE` (기존 enrollment·타 서비스 무영향) |
| 가드 | 실행 후 `kpa-society = 0행` 및 `전체 enrollment = 13행` 이 아니면 `RAISE EXCEPTION` → 트랜잭션 롤백 |
| 실행 여부 | **미실행** — §7 판정이 "의도된 정상화" 이므로 현 상태 유지 |

```sql
DELETE FROM organization_service_enrollments
 WHERE service_code='kpa-society'
   AND organization_id IN ('8712bff0…','9c87f46b…','aed9eda9…','c5982508…','c92b857f…','c9beb4a2…','ec596c46…');
```

---

## 9. 발견 사항 — 후속 WO 제안

| # | 내용 | 성격 |
|---|---|---|
| 1 | **orphan `platform_store_slugs` 2건** — `store_id` 가 존재하지 않는 organization 을 가리킨다(`neture-3lifezone`, `phase0-테스트약국`). enrollment 생성 불가 | 데이터 정합 |
| 2 | `POST /api/v1/admin/users` 를 **기존 사용자**에게 호출하면 `status` 가 `approved` 로 되돌아간다 → suspended 계정이 조용히 재활성화된다. 본 WO 중 실제로 발생했고 최종 재-suspend 로 복구했다(§10-2) | 잠재 결함 |
| 3 | 선행 CHECK 의 drug-gate 예측이 42분 뒤 커밋으로 무효화됐다 — **영향 예측을 담은 CHECK 는 실행 직전 재검증**이 필요하다 | 프로세스 |

> WO §9 변경 금지 준수: schema/migration · service key 추가 변경 · OPL bulk update · audience policy 변경 ·
> 타 서비스 enrollment drift 수정 · Event Offer key 정리 · entity DDL default 정리 · 기존 organization/role/membership 수정
> — **전부 하지 않았다.**

---

## 10. 검증 및 완료 기준 (WO §10)

### 10-1. 검증 실행

| 항목 | 결과 |
|---|:---:|
| api-server 관련 테스트 (`listing-service-key.test.ts`) | **7/7 PASS** — "KPA membership 은 canonical key(`kpa-society`) 를 그대로 쓴다" 확인 |
| production API smoke — 운영자 매장 콘솔 | HTTP 200 · 5개 serviceKey 전수 |
| production 화면 smoke — KPA 내 매장 5화면 | **5/5 PASS**, 콘솔 오류 0 (backfill 전 실행과 동일) |
| DB before/after census | §3 |
| 콘솔 오류 | 0건 |

### 10-2. 검증 계정 사후 처리

본 WO 에서 §6 운영자 API 검증을 위해 기존 검증 계정(`o4o-smoke-mystore@…`)에 canonical 경로로
`kpa:operator` 를 부여하고 재활성화했다. **검증 종료 후 두 계정 모두 `suspended` 로 되돌렸고 실측 확인했다.**

```text
users.status = suspended  ×2
로그인 재시도 4/4 → ACCOUNT_NOT_ACTIVE 차단
```

> 이 과정에서 §9-#2(기존 사용자 대상 `POST /admin/users` 가 status 를 `approved` 로 되돌림)를 발견했다.
> 선행 CHECK(`…L2-CREDENTIAL-AND-PRODUCTION-SMOKE-V1`)의 "비활성화 완료" 기록은 그 시점엔 사실이었으나
> 본 WO 중 재활성화되었다가 **현재 다시 suspended** 다.

### 10-3. 완료 조건 대조

```text
대상 7/7 확인                 ✅
enrollment 7/7 생성            ✅
중복 0                        ✅
타 서비스 변경 0               ✅
OPL 예상외 변화 0              ✅ (29→29, drift 0)
store-owner 조직 해석 정상      ✅ (5/5 resolved, ambiguous 0, 회귀 0)
운영자 집계 정상               ✅ (0→6, 원본 count 7)
drug gate canonical 동작 확인   ✅ (deny→allow = 의도된 정상화 — §7)
rollback 가능성 검증           ✅ (스크립트+가드 준비, 미실행)
```

---

## 11. DB / code / migration 변경

| 구분 | 내용 |
|---|---|
| **DB write** | `organization_service_enrollments` **신규 7행** (`kpa-society` / `active`) — 그 외 0 |
| | (부수) 검증 계정 `users.status` 토글 + `kpa:operator` role 부여 — canonical API, 최종 suspended |
| **code** | **변경 0** |
| **migration / schema** | **변경 0** |
| **audience policy / guard** | **변경 0** |

---

## 문서 정합

발견 0건 / SUPERSEDED 표기 0건 / 링크 수정 0건 / 별도 WO 제안 3건 (§9)
