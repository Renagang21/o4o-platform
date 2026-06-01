# CHECK-O4O-CROSSSERVICE-DASHBOARD-PENDING-COUNT-DATA-AUDIT-V1

**검증 일자**: 2026-05-30
**검증 환경**: production `o4o-platform-db` (host 34.64.96.252, POSTGRES_15, RUNNABLE)
**검증 방식**: read-only SELECT only (gcloud sql IP allowlist + 직접 psql 17 client). DDL/DML/migration 일절 없음
**선행 IR**: [IR-O4O-CROSSSERVICE-OPERATOR-ADMIN-DASHBOARD-CANONICAL-AUDIT-V1](IR-O4O-CROSSSERVICE-OPERATOR-ADMIN-DASHBOARD-CANONICAL-AUDIT-V1.md) §9
**Tier**: 5 (데이터 검증 CHECK)
**작업 성격**: 데이터 검증 전용 — 코드/DB/소스 파일 수정 일절 없음

---

## 0. 핵심 결론 (TL;DR)

> **5개 검증 영역 모두 데이터 측면에서는 'A. 데이터 없음 / legacy label 가능성 높음' 으로 정리.**
>
> - §1 KPA signage pending count: signage_media/playlists 의 KPA 데이터 자체가 **0건** — dashboard 카운트는 항상 0
> - §2 GlycoPharm orders STUB=0: 실제 checkout_orders 의 glycopharm scope **0건** + ecommerce_orders 테이블 **부재** → STUB 유지 타당
> - §3 K-Cosmetics active-orders: ecommerce_orders 테이블 자체가 **부재** + checkout_orders cosmetics scope **0건** → 코드가 비존재 테이블 참조 (구조적 gap)
> - §4 K-Cos pharmacist/supplier 어휘: `pharmacist` 글로벌 **0건**, `supplier` 글로벌 3건이나 cosmetics 멤버십 보유자 **0건** → K-Cos UI 의 두 라벨 모두 **legacy, 제거 안전**
> - §5 Neture pharmacy placeholder: neture_suppliers 의 business_type 값 모두 비어 있음 + neture-related 테이블에 pharmacy 컬럼 0개 → placeholder 는 **legacy 문구, 어휘 정리 안전**
>
> **결론**: Tier 2 W4 (K-Cos 어휘 정리) / W6 (Neture placeholder) 는 데이터 의존성 없이 **즉시 진행 가능**. W5 (GlycoPharm Care 어휘) 는 본 CHECK 범위 외이나 데이터 의존성 적음.
>
> **별도 발견 (out-of-scope)**: 본 CHECK 조사 중 GlycoPharm `/api/v1/glycopharm/forum/posts` 500 의 근본 원인 (broken UUID `forum00000001` in `FORUM_ORGS.GLYCOPHARM` 상수) 발견. 다른 세션의 hotfix commit `de0f96ddc` 로 처리 중 (§10 별도 항목).

---

## 1. Executive Summary

| § | 영역 | 발견 | 판정 |
|:-:|------|------|:----:|
| 1 | KPA signage_media/playlists pending (kpa scope) | 0건 / 0건 | **A** |
| 2 | GlycoPharm orders STUB=0 vs checkout_orders | STUB=0 일치, ecommerce_orders 부재 | **A** |
| 3 | K-Cos active-orders 데이터 소스 | ecommerce_orders **부재**, checkout_orders cosmetics 0건 | **C** (count=0 이지만 코드 구조적 gap) |
| 4 | K-Cos pharmacist/supplier 어휘 잔재 | pharmacist 0건, supplier 3건이나 cosmetics 멤버십 0건 | **A** |
| 5 | Neture pharmacy placeholder | suppliers business_type 모두 비어있음, pharmacy 컬럼 0개 | **A** |

### W4/W5/W6 진행 가능 여부

| WO | 판정 | 사유 |
|----|------|------|
| **W4** K-Cos pharmacy/약사 어휘 정리 | ✅ **즉시 진행 가능** | pharmacist 데이터 0건, supplier 는 cosmetics scope 외 — K-Cos UI 에서 두 라벨 모두 제거 안전 |
| **W5** GlycoPharm Care 어휘 정리 | ✅ **진행 가능** | 본 CHECK 범위 외이나 데이터 의존성 적음 (IR §11 W5 기반 정적 정리 가능) |
| **W6** Neture pharmacy placeholder | ✅ **즉시 진행 가능** | neture-related 테이블에 pharmacy 컬럼 0개 + suppliers business_type 모두 빈값 — placeholder 는 legacy |

---

## 2. 실행한 SQL 목록

총 14건 SELECT-only 쿼리. 실행 환경: psql 17 → o4o-platform-db (production).

| § | 쿼리 의도 | 대상 테이블 |
|:-:|----------|------------|
| 1a | signage_media KPA 상태 분포 | `signage_media` |
| 1b | signage_playlists KPA 상태 분포 | `signage_playlists` |
| 2a | ecommerce_orders 테이블 존재 여부 | `information_schema.tables` |
| 2b | checkout_orders 의 glycopharm scope 총건수 | `checkout_orders` |
| 2c | checkout_orders 의 glycopharm 상태 분포 | `checkout_orders` |
| 3a | cosmetics_stores 존재 여부 (schema-qualified) | `information_schema.tables` |
| 3b | ecommerce_orders 존재 여부 재확인 (DO 블록) | — |
| 3c | checkout_orders 의 cosmetics scope 총건수 | `checkout_orders` |
| 3d | checkout_orders 의 cosmetics 상태 분포 | `checkout_orders` |
| 4a | role_assignments 의 cosmetics scope role 분포 | `role_assignments` |
| 4b | role_assignments 의 pharmacist/supplier 글로벌 분포 | `role_assignments` |
| 4c | service_memberships 의 cosmetics 상태/역할 분포 | `service_memberships` |
| 4d | LEFT JOIN — supplier role 보유자의 cosmetics 멤버십 여부 | `role_assignments ⨝ service_memberships` |
| 5a-5d | neture_suppliers business_type 분포 + 관련 테이블 컬럼 검색 | `neture_suppliers`, `information_schema.columns` |

스키마 발견 (사전 조사):
- `role_assignments.role` (not `role_key`)
- `service_memberships.service_key` (snake_case, not `serviceKey`)

---

## 3. KPA signage pending 결과

| 쿼리 | 결과 |
|------|------|
| `signage_media WHERE serviceKey='kpa' AND deletedAt IS NULL GROUP BY status` | **0 rows** (테이블에 KPA 데이터 없음) |
| `signage_playlists WHERE serviceKey='kpa' AND deletedAt IS NULL GROUP BY status` | **0 rows** |

### 해석

- KPA operator dashboard 의 "사이니지 검수 대기" KPI count = 항상 **0** (데이터 없음)
- W1 (signage dead link fix) 는 이미 완료 (`8246b2da4`); link 가 `/operator/signage/hq-media` 로 정정되었으나, 이동해도 보여줄 pending 데이터 자체가 없음
- 운영상 dead link 위험은 없지만, KPI 카드가 항상 0 으로 노출됨

### 판정: **A** — 데이터 없음, label/카운트 무관

### 후속 권장 (별도 WO 후보)

`WO-KPA-SIGNAGE-PENDING-KPI-ZERO-STATE-UX-V1` (가칭) — KPI 카드가 항상 0 인 경우 (a) 운영 시작 안내 문구로 대체 (b) KPI 자체를 비활성화 (c) 그대로 유지. 본 CHECK 범위 외, IR Tier 2 후보로 분리 추적.

---

## 4. GlycoPharm orders 결과

| 쿼리 | 결과 |
|------|------|
| `EXISTS ecommerce_orders` | **false** — 테이블 자체 부재 |
| `COUNT checkout_orders WHERE serviceKey='glycopharm'` | **0** |
| status 분포 | 0 rows |

### 해석

- GlycoPharm `operator-dashboard.service.ts:59` 의 `total-orders: 0 STUB` 는 **실제 데이터와 일치**
- 코드 주석 "STUB: E-commerce Core 미통합" 이 정확한 상태
- ecommerce_orders 테이블 미생성 + checkout_orders 의 glycopharm scope 0건 → STUB 제거 시 동일 결과
- Memory: "ecommerce_orders table does not exist" (migration `20260212000002-AddStoreAttributionToEcommerceOrders.ts:6`) 와 일치

### 판정: **A** — STUB 유지 또는 제거 모두 데이터 측면 결과 동일

### 후속 권장

별도 WO 불필요. E-commerce Core 통합 시점 (별도 IR) 에 STUB 제거 + 실제 query 도입.

---

## 5. K-Cosmetics active-orders 결과

| 쿼리 | 결과 |
|------|------|
| `EXISTS cosmetics.cosmetics_stores` | **true** — 스키마 존재 |
| `EXISTS ecommerce_orders` | **false** — 테이블 자체 부재 |
| `COUNT checkout_orders WHERE serviceKey='cosmetics'` | **0** |
| status 분포 | 0 rows |

### 해석

[cosmetics-store-summary.service.ts:213-220](../../apps/api-server/src/routes/cosmetics/services/cosmetics-store-summary.service.ts#L213-L220) 의 active-orders 쿼리:

```sql
SELECT COUNT(*)::int as count
FROM ecommerce_orders
WHERE store_id IS NOT NULL
  AND store_id IN (SELECT id FROM cosmetics.cosmetics_stores)
  AND metadata->>'serviceKey' = 'cosmetics'
  AND status IN ('created', 'pending_payment', 'paid', 'confirmed', 'processing', 'shipped')
```

- 이 쿼리는 **존재하지 않는 ecommerce_orders 테이블 참조** → 실행 시 PostgreSQL 에러
- `monthly-revenue` / `recent-orders` 같은 인접 쿼리도 동일 테이블 참조 — 모두 fail
- [operator-dashboard.controller.ts:52](../../apps/api-server/src/routes/cosmetics/controllers/operator-dashboard.controller.ts#L52) 의 catch 블록이 에러를 swallow 하고 `{ totalStores: 0, activeOrders: 0, monthlyRevenue: 0, recentOrders: [] }` 반환
- 결과적으로 K-Cos dashboard 의 `active-orders` = 항상 **0**
- 그러나 코드는 표면상 "정상 0건" 으로 보여 진단을 어렵게 함 (silent failure)

### 판정: **C** — 데이터 존재하지 않지만 코드 구조 gap (비존재 테이블 참조)

### 후속 권장 (IR §11 W3/W4 와 다른 후속 후보)

`WO-O4O-KCOSMETICS-DASHBOARD-ACTIVE-ORDERS-SOURCE-FIX-V1` (가칭):
- 옵션 A: `ecommerce_orders` 참조를 `checkout_orders` 로 마이그레이션 (Neture 가 사용하는 패턴과 동기화)
- 옵션 B: 명시적 STUB 처리 + 코드 주석 (GlycoPharm 패턴 채택)
- 데이터 변화 없음 (count=0 동일) → 우선순위 낮음, 단 silent failure 가시화 차원에서 정리 권장

---

## 6. K-Cosmetics role / member type 결과

### 6.1 role_assignments — cosmetics scope role 분포

| role | cnt |
|------|----:|
| `cosmetics:admin` | 1 |
| `cosmetics:operator` | 1 |
| `cosmetics:store_owner` | 1 |

→ `cosmetics:pharmacist` 또는 `cosmetics:supplier` **존재 안 함**.

### 6.2 role_assignments — pharmacist/supplier 글로벌 분포

| role | cnt |
|------|----:|
| `pharmacist` | **0** |
| `supplier` | 3 (unprefixed) |

### 6.3 service_memberships — cosmetics 서비스 사용자

- `service_key='cosmetics'`: **0 rows**
- 즉 어느 사용자도 cosmetics service membership 보유 안 함

### 6.4 LEFT JOIN — supplier role 보유자의 cosmetics 멤버십 여부

| assignment_role | membership_role | cnt |
|-----------------|-----------------|----:|
| `supplier` | NULL | 3 |

→ 3명의 supplier-role 사용자 모두 **cosmetics 멤버십 없음**.

### 해석

- K-Cos UsersPage 의 `KCOS_ROLE_DISPLAY` (`pharmacist:'약사'`, `supplier:'공급자'`) 두 라벨 모두:
  - `pharmacist` 라벨: 글로벌 0 rows → **legacy, 표시될 일 없음**
  - `supplier` 라벨: 글로벌 3 rows 있으나 모두 K-Cos 멤버십 없음 → K-Cos UI 에서 노출될 일 없음
- StoresPage typeLabels 의 `pharmacy:'약국'` 도 같은 맥락 (관련 storeType 데이터 부재 추정)
- 코드 주석 line 33-36 "role prefix 가 'cosmetics:' / 'k-cosmetics:' 로 혼재" — 검증 결과 `cosmetics:` prefix 만 사용 중, `k-cosmetics:` prefix 도 0건

### 판정: **A** — 데이터 없음, label 제거 안전

### W4 진행 가능 ✅

W4 (`WO-O4O-KCOSMETICS-OPERATOR-VOCABULARY-PHARMACY-CLEANUP-V1`) 는 **즉시 진행 가능**. UsersPage `KCOS_ROLE_DISPLAY` 에서 `pharmacist` / `supplier` 키 제거, StoresPage `pharmacy:'약국'` typeLabel 제거.

---

## 7. Neture pharmacy placeholder 결과

### 7.1 neture_suppliers 총괄

| status | cnt |
|--------|----:|
| PENDING | 2 |
| ACTIVE | 1 |

→ 총 3 rows.

### 7.2 business_type 분포

| business_type | cnt |
|---------------|----:|
| `(empty/null)` | 3 |

→ 3 rows 모두 business_type 값이 비어 있음. `pharmacy` / `cosmetics` / `health` 등 값 0건.

### 7.3 pharmacy 컬럼 검색 (neture-related tables)

`SELECT table_name, column_name FROM information_schema.columns WHERE table_name ILIKE 'neture%' AND column_name ILIKE '%pharm%'` → **0 rows**.

### 7.4 Recruiting / Partner 테이블 인벤토리

`neture_partner_applications`, `neture_partner_dashboard_item_contents`, `neture_partner_dashboard_items`, `neture_partner_recruitments`, `neture_partners`, `neture_partnership_products`, `neture_partnership_requests` (총 7개) — 모두 pharmacy 관련 컬럼/타입 없음.

### 7.5 neture_supplier_requests 존재 여부

**False** — 테이블 부재 (Memory 의 enum 명 `neture_supplier_requests` 와는 다름 — enum 만 정의되었거나 다른 테이블명 사용).

### 해석

- Neture 의 RecruitingProductsOverviewPage 의 "약국명 검색" placeholder + "약국/공급자" column header 는 **legacy 문구**
- DB / entity 구조 어디에도 pharmacy 의존성 없음
- IR §11 W6 의 "조직/공급사/참여 조직 어휘로 정리" 권고는 데이터 의존성 없이 안전

### 판정: **A** — 데이터 없음, placeholder cleanup 안전

### W6 진행 가능 ✅

W6 (`WO-O4O-NETURE-OPERATOR-PAGES-RESIDUAL-PHARMACY-LABEL-CLEANUP-V1`) 는 **즉시 진행 가능**. RecruitingProductsOverviewPage placeholder/column header + StoreManagementPage `pharmacy:'약국'` mapping 정리.

---

## 8. W4/W5/W6 진행 가능 여부

| WO | 데이터 검증 결과 | 진행 가능 | 권장 우선순위 |
|----|----------------|:---------:|:------------:|
| **W4** K-Cos pharmacy/약사 어휘 정리 | pharmacist 0건, supplier 글로벌 3건이나 cosmetics 멤버십 0건 | ✅ | 높음 (가장 작은 단위, 검증 완료) |
| **W5** GlycoPharm Care 어휘 정리 | 본 CHECK 범위 외이나 KPI 자체가 admin only + capability 선언 잔재 | ✅ | 중간 (데이터 의존성 없음) |
| **W6** Neture pharmacy placeholder | neture 테이블에 pharmacy 컬럼 0개 + business_type 모두 빈값 | ✅ | 높음 (UI 1~2 라인 수정) |

W4/W6 은 데이터 의존성이 명확히 해소되었으므로 **두 WO 묶음 또는 단건 순차 진행 모두 가능**. W5 는 본 CHECK 와 직접 관련 없으나 같은 어휘 정리 트랙으로 묶을 수 있음.

---

## 9. 추가 IR / WO 필요 여부

본 CHECK 에서 파생된 후속 후보:

| ID (가칭) | 사유 | 우선순위 |
|----------|------|:--------:|
| `WO-KPA-SIGNAGE-PENDING-KPI-ZERO-STATE-UX-V1` | §3 — KPA signage 데이터 0건 → KPI 카드가 항상 0. zero-state UX 결정 필요 | 낮음 |
| `WO-O4O-KCOSMETICS-DASHBOARD-ACTIVE-ORDERS-SOURCE-FIX-V1` | §5 — ecommerce_orders 비존재 테이블 참조 silent failure. checkout_orders 로 migrate 또는 명시적 STUB 처리 | 중간 |
| `IR-O4O-ECOMMERCE-ORDERS-VS-CHECKOUT-ORDERS-ALIGNMENT-V1` | §5 — Neture(neture_orders/checkout_orders) vs Cosmetics(ecommerce_orders) vs GlycoPharm(STUB) 의 주문 source 정합성. 구조적 정책 결정 IR | 중간 |

---

## 10. 별도 발견 (Out-of-Scope) — GlycoPharm forum 500

본 CHECK 조사 도중 발견된 production 이슈로, **본 CHECK 의 데이터 검증 범위와는 분리하여 추적**:

| 항목 | 값 |
|------|------|
| 증상 | `GET /api/v1/glycopharm/forum/posts?limit=30` → **500 Internal Server Error** (referer: `https://glycopharm.co.kr/`) |
| 근본 원인 | `FORUM_ORGS.GLYCOPHARM = 'a1b2c3d4-0001-4000-a000-forum00000001'` — **invalid UUID** (`forum` 의 o/r/u/m 은 hex 아님 + 마지막 segment 길이 13 ≠ 12) |
| 위치 | `apps/api-server/src/controllers/forum/forum-organizations.ts:12` + `2026020400002-SeedForumServiceOrganizations.ts:32` |
| 영향 | GlycoPharm `/api/v1/glycopharm/forum/*` 전 endpoint (middleware 통한 UUID 주입) |
| 추적 evidence | Cloud Run stdout 로그: `QueryFailedError: invalid input syntax for type uuid: "a1b2c3d4-0001-4000-a000-forum00000001"` at `ForumPostController.listPosts` |
| 처리 상태 | **별도 작업 공간 hotfix 진행 중 — commit `de0f96ddc`** |
| 본 CHECK 처리 | 코드/DB 수정 없음. **CI/CD 자동 배포 + migration 완료 대기 중**. 본 CHECK 의 dashboard pending count 검증 범위와 분리 |
| 배포 후 검증 후보 | (1) forum posts API 500 해소 (2) 비로그인 forum list 정상 (3) 로그인 forum list 정상 (4) forum_category_request 관련 오류 해소 (5) migration 재실행 안전성 |

> 본 항목은 dashboard pending count CHECK 와 분리된 production 이슈이며, 본 세션은 이 문제를 수정하지 않음.

---

## 11. 최종 판정

> ✅ **PASS** — 5개 검증 영역 모두 데이터 측면에서 A (legacy / 데이터 없음) 또는 C (데이터 0건이지만 코드 구조 gap) 로 정리. W4/W5/W6 진행 안전성 확정.

### 정리

| 기준 | 결과 |
|------|:----:|
| SQL 실행 가능 여부 | ✅ (직접 psql via gcloud IP allowlist) |
| 14건 read-only SELECT 실행 완료 | ✅ |
| DDL/DML/migration 없음 | ✅ |
| 코드 수정 없음 | ✅ |
| W4 데이터 검증 통과 | ✅ |
| W5 진행 가능 (데이터 의존성 없음) | ✅ |
| W6 데이터 검증 통과 | ✅ |
| GlycoPharm forum 500 — out-of-scope 별도 hotfix 추적 | ✅ |

### 다음 우선순위

1. **W6 Neture placeholder** — UI 1~2 라인 수정, 가장 작은 단위
2. **W4 K-Cos pharmacy/약사 어휘** — UsersPage / StoresPage label cleanup
3. **W5 GlycoPharm Care 어휘** — Admin KPI / capabilities.CARE 정리
4. **외부 hotfix 배포 완료 후** — GlycoPharm forum 500 prod endpoint 검증
5. (선택) §9 후속 후보 WO/IR 분리 진행

---

## 12. 완료 보고 (commit 미실행)

| 항목 | 값 |
|------|------|
| 판정 | **PASS** |
| 작성 문서 | `docs/investigations/CHECK-O4O-CROSSSERVICE-DASHBOARD-PENDING-COUNT-DATA-AUDIT-V1.md` (본 문서) |
| SQL 실행 가능 여부 | ✅ — `gcloud sql connect` 의 IP allowlist 활성화 후 직접 psql 17 client 로 read-only 접속 성공 |
| §1 KPA signage pending | media=0 / playlists=0 (kpa scope) → 판정 A |
| §2 GlycoPharm orders STUB | checkout_orders glycopharm=0 + ecommerce_orders 부재 → 판정 A (STUB 일치) |
| §3 K-Cos active-orders | ecommerce_orders 부재 + checkout_orders cosmetics=0 → 판정 C (silent failure) |
| §4 K-Cos roles | pharmacist=0, supplier 글로벌 3건이지만 cosmetics 멤버십 0건 → 판정 A |
| §5 Neture placeholder | neture_suppliers business_type 모두 빈값, pharmacy 컬럼 0개 → 판정 A |
| 코드 / DB 수정 없음 | ✅ |
| 다른 세션 WIP 미포함 | ✅ (`web-neture/src/components/NetureGlobalHeader.tsx` working tree 보존) |
| W4 진행 가능 | ✅ |
| W5 진행 가능 | ✅ |
| W6 진행 가능 | ✅ |
| 별도 발견 (GlycoPharm forum 500) | 외부 hotfix `de0f96ddc` 진행 중 — §10 에 분리 추적 기록 |
| Commit 여부 | **사용자 승인 대기** — 본 CHECK 문서 1개만 path-restricted commit 예정 |

---

> **상태**: 데이터 검증 완료. 본 CHECK 문서 commit 은 사용자 승인 후 단일 파일 path-restricted commit 으로 진행 예정. 다른 세션 WIP (NetureGlobalHeader.tsx M) 격리 보존.
