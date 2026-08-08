# WO-O4O-LEGACY-SEED-FIXTURE-PRODUCTION-DATA-INVENTORY-V1 — CHECK

**일자:** 2026-08-08 · **유형:** 운영 DB **읽기 전용** 조사 (삭제 없음)
**산출물:** `scripts/audits/legacy-seed-fixture-inventory.sql` (재현 가능, write 구문 0)

## 결론 (먼저)

**대상 fixture 2집합은 운영 DB 에 존재하지 않는다 — 둘 다 `ABSENT`.**
따라서 **후속 데이터 정리 WO 는 불필요하다.** 삭제할 대상이 없다.

조사 중 같은 prefix 를 가진 **다른 계열 52건**을 발견했으나, 이는 KPA 서비스에 `published` 로 게시되어 **활성 slot 이 소비 중인 운영 콘텐츠**이며 fixture 가 아니다.

---

## 1. read-only 보장 방법과 write 0 증거

Cloud SQL Auth Proxy v2(127.0.0.1:5444) 경유, `o4o_api` 계정. 세션 첫 구문으로 read-only 고정 후 **3종 write 를 실제로 시도해 차단을 실증**했다.

```
SET SESSION CHARACTERISTICS AS TRANSACTION READ ONLY;
SELECT current_setting('default_transaction_read_only');   → on

CREATE TEMP TABLE write_probe(x int);   → ERROR: cannot execute CREATE TABLE in a read-only transaction
UPDATE organizations SET ... WHERE id = '000...0';  → ERROR: cannot execute UPDATE in a read-only transaction
DELETE FROM users WHERE id = '000...0';             → ERROR: cannot execute DELETE in a read-only transaction
```

조사 스크립트는 `SET SESSION CHARACTERISTICS AS TRANSACTION READ ONLY` 로 시작하며 SELECT 외 구문을 포함하지 않는다. **운영 DB write 0건.**

---

## 2. seed 식별 기준과 생성 이력

**prefix 만으로 판정하지 않았다.** `e0000000%` · `f0000000%` 를 쓰는 계열이 5개이며 서로 다른 출처를 가진다. UUID **2번째 세그먼트**로 분리했다.

| 계열 | UUID 패턴 | 출처 | 상태 |
|------|-----------|------|------|
| **SET A** | `e0000000-ee01..ee05-4000-a000` | store-hub seed route (`33bccc567`) | 코드 제거됨 (`4971381fb`) |
| **SET B** | `f0000000-aa01/bb01-4000-a000` | neture-offers seed route (`582dd5285`) | 코드 제거됨 (`4971381fb`) |
| **SET C** | `e0000000-0a00-4000-e000` | `SeedKpaBannerContent` · `SeedKpaBenefitContent` migration | migration 현존 |
| **SET D** | `f0000000-0a00-4000-f000` / `-b000` | KPA test forum seed · GlycoPharm forum category · **market-trial LIVE 상수** | 일부 live 코드 참조 |
| **SET E** | `e0000000-ee10/ee20/ee21` | Care 테스트 (archive 문서에만 존재) | Care 테이블 DROP 됨 |

> ⚠️ **SET D 에는 운영 코드가 참조하는 상수가 있다** — `marketTrialOperatorController.ts:299` 의 `f0000000-0a00-4000-f000-0000000000f1`. prefix 일괄 삭제는 이 상수를 함께 지웠을 것이다.

**SET A 하위 2테이블은 prefix 검색이 불가능하다.** `organization_members` · `organization_product_channels` 는 seed 가 `gen_random_uuid()` 로 만들어 결정적 ID 가 없다. **FK 역방향 검색으로만** 탐지 가능하며, 본 조사는 이를 별도로 수행했다.

---

## 3. 테이블별 존재 건수

### 3-1. SET A — store-hub seed → **0**

| 테이블 | 조건 | rows |
|--------|------|-----:|
| `users` | `id LIKE 'e0000000-ee01%'` | **0** |
| `organizations` | `id LIKE 'e0000000-ee02%'` | **0** |
| `organization_channels` | `id LIKE 'e0000000-ee03%'` | **0** |
| `organization_product_listings` | `id LIKE 'e0000000-ee04%'` | **0** |
| `platform_store_slugs` | `id LIKE 'e0000000-ee05%'` | **0** |
| `organization_members` | FK `organization_id` / `user_id` | **0** / **0** |
| `organization_product_channels` | FK `channel_id` / `product_listing_id` | **0** / **0** |
| `users` | email ∈ (store.owner1/2@test.com, operator@test.com) | **0** |

### 3-2. SET B — neture-offers seed → **0**

| 테이블 | 조건 | rows |
|--------|------|-----:|
| `product_masters` | `id LIKE 'f0000000-aa01%'` | **0** |
| `supplier_product_offers` | `id LIKE 'f0000000-bb01%'` | **0** |
| `organization_product_listings` | `offer_id LIKE 'f0000000-bb01%'` | **0** |
| `offer_service_approvals` | `offer_id LIKE 'f0000000-bb01%'` | **0** |

### 3-3. 전 DB 동적 스캔 (누락 방지)

`information_schema` 로 public 스키마의 **BASE TABLE uuid 컬럼 762개**를 생성해 전수 스캔했다. `e0000000%` 또는 `f0000000%` 가 **1건 이상인 것은 3개뿐**이다.

| 테이블 | 컬럼 | rows |
|--------|------|-----:|
| `cms_contents` | `id` | 52 |
| `cms_content_slots` | `contentId` | 28 |
| `cms_content_recommendations` | `content_id` | 2 |

**SET A·B 는 이 상위 집합에도 없다.** DB 어디에도 존재하지 않음이 확정된다.

---

## 4. 발견된 52건의 정체와 연결 관계 (SET C)

| 항목 | 값 |
|------|-----|
| 계열 | `e0000000-0a00-4000-e000` (배너 hero 28 + 혜택 promo 24) |
| status / serviceKey | **전량 `published` / `kpa-society`** |
| 생성일 | 2026-03-23 (전량 동일) |
| 활성 slot 연결 | `kpa-main-hero` · `kpa-main-benefit` · `kpa-dashboard-banner` · `kpa-dashboard-benefit` · `kpa-pharmacy-banner` · `kpa-supplier-promo` — **6개 slot 모두 `isActive=true`** |
| 고아 여부 | slot → 없는 content 참조 **0건** |

**migration 이력** (`typeorm_migrations`): `CleanupDemoSeedData1709564400000` · `SeedKpaBannerContent20260207500000` · `SeedKpaBenefitContent20260207700000` 3개 모두 실행됨. 그럼에도 `createdAt` 이 2026-03-23 이므로, cleanup 이후 재시딩되어 **현재 KPA 화면이 소비 중인 콘텐츠**다.

---

## 5. 운영 데이터·주문·정산·감사 연결

| 관계 | rows |
|------|-----:|
| `checkout_orders` by `sellerOrganizationId` | **0** |
| `checkout_orders` by `buyerId` | **0** |
| `checkout_payments` by `orderId` | **0** |
| `forum_category_requests` prefix 전체 | **0** |

주문·결제 연결 **전무**. SET A·B 가 애초에 없으므로 정산·감사 연결도 성립하지 않는다.

> 참고(범위 외): `marketTrialOperatorController.ts:299` 가 참조하는 `f0000000-...-0000000000f1` 행도 `forum_category_requests` 에 **0건**이다. 해당 코드는 존재 확인 후 분기하도록 작성돼 있어 즉시 오류는 아니나, **동작하지 않는 상수**로 남아 있다. 본 WO 범위 밖이라 수정하지 않았다.

---

## 6. 삭제 영향과 위험도

**삭제 대상이 없으므로 삭제 영향도 없다.**

다만 **향후 "prefix 일괄 삭제" 를 시도하면 위험**하다는 점이 이번 조사의 실질 산출이다.

| 위험 | 근거 |
|------|------|
| `e0000000%` 일괄 삭제 | **KPA 게시 콘텐츠 52건 + 활성 slot 28건이 삭제된다** (SET C) |
| `f0000000%` 일괄 삭제 | market-trial 코드 상수(SET D) 계열을 함께 지운다 |
| FK 하위 누락 | SET A 하위 2테이블은 랜덤 UUID 라 prefix 삭제가 **닿지 않아 고아를 남긴다** |

---

## 7. 최종 분류

| 집합 | 분류 | 근거 |
|------|------|------|
| **SET A** store-hub seed | **ABSENT** | 5테이블 prefix 0 + FK 역방향 하위 0 + fixture 이메일 0 + 전 DB 스캔 미검출 |
| **SET B** neture-offers seed | **ABSENT** | 4검사 전부 0 + 전 DB 스캔 미검출 |
| **SET C** cms_contents 52 | **LEGITIMATE_DATA** (23건 활성 slot 소비) + **MIXED_OR_AMBIGUOUS** (29건 slot 미연결·`published`) | §4 |
| **SET D** forum 계열 | **ABSENT** (단, live 코드 상수 존재 — 삭제 규칙 설계 시 주의) | §5 |
| **SET E** Care 계열 | **ABSENT** | archive 문서에만 존재, 대상 테이블 DROP 됨 |

---

## 8. 검증 결과

| 항목 | 결과 |
|------|------|
| 세션 read-only 설정 | ✅ `default_transaction_read_only = on` |
| write 차단 실증 | ✅ CREATE TEMP TABLE / UPDATE / DELETE 3종 모두 거부 |
| **운영 DB write** | ✅ **0** |
| 스크립트 재현 실행 | ✅ `ERROR 0` (전 구간) |
| prefix 직접 ↔ FK 역방향 교차검증 | ✅ SET A 부모 0 · 자식 0 → 고아 0 / SET C slot→content 고아 0 |
| 합계 일치 | ✅ 전 DB prefix 행 = 52 = SET A(0) + SET B(0) + SET C(52) |
| 코드·migration·Git 이력 대조 | ✅ `typeorm_migrations` 3건 실행 확인, 계열 출처 전부 특정 |
| 스크립트 내 자격증명 literal | ✅ 0 |
| `git diff --check` | ✅ exit 0 |

---

## 9. 후속 처리 권고

1. **데이터 정리 WO 불필요** — SET A·B 가 `ABSENT` 이므로 삭제 작업 자체가 성립하지 않는다. 선행 CHECK 들의 "과거 seed fixture 잔존" 보류 항목을 **종결**한다.
2. **prefix 기반 일괄 삭제 금지 — 규칙으로 승격됨**
   → [`docs/baseline/operations/O4O-DATA-CLEANUP-IDENTIFICATION-SAFETY-V1.md`](../baseline/operations/O4O-DATA-CLEANUP-IDENTIFICATION-SAFETY-V1.md)
   (본 조사가 그 규칙의 근거 사례다. 아래는 원래 권고 문구.)
   **prefix 기반 일괄 삭제를 금지 규칙으로 둘 것** — `e0000000%` 는 KPA 게시 콘텐츠와, `f0000000%` 는 live 상수와 충돌한다. fixture 식별은 반드시 **2번째 세그먼트까지** 본다.
3. **SET C 의 slot 미연결 29건** — fixture 가 아니라 KPA 콘텐츠 큐레이션 사안이다. 정리하려면 별도 트랙으로 다룬다(본 WO 범위 밖).
4. ~~**market-trial 상수** — 참조 행이 없는 상수. 별도 조사 대상.~~ → **조사 완료**: `WO-O4O-MARKET-TRIAL-FEATURE-LIFECYCLE-INVENTORY-V1`. 상수 자체가 문제가 아니라 **migration(`forum_category` 단수) ↔ 컨트롤러(`forum_category_requests`) 테이블 불일치**로 KPA 포럼 연동이 무음 skip 되고 있었다. market-trial 전체 판정은 `MIXED`(제거 대상 아님).

---

## 10. 트랙 종료 (2026-08-08)

본 WO 로 **legacy seed fixture 정비 트랙을 종료**한다. 추가 삭제 작업은 하지 않는다.

| 항목 | 결론 |
|------|------|
| SET A `e0000000-ee01..ee05` | **ABSENT** |
| SET B `f0000000-aa01/bb01` | **ABSENT** |
| 운영 DB 삭제·격리·비활성화 | **불필요** |
| 후속 데이터 정리 WO | **불필요** |
| 선행 CHECK 의 seed 잔존 보류 3건 | **종결** |
| 운영 DB write | **0** |
| 재현 근거 | 조사 SQL + 본 CHECK 로 저장소에 잔존 |

이번 조사의 판정 원칙은 [`O4O-DATA-CLEANUP-IDENTIFICATION-SAFETY-V1`](../baseline/operations/O4O-DATA-CLEANUP-IDENTIFICATION-SAFETY-V1.md) 로 승격했다.

**분리해 둔 두 항목** — 이번 트랙에 섞지 않는다.

- **SET C 미연결 콘텐츠 29건** — fixture 가 아니라 `cms_contents` 의 KPA 게시 콘텐츠이며, 같은 계열 23건은
  활성 slot 에서 소비 중이다. 보관 중인 콘텐츠인지 / 해제된 콘텐츠인지 / 재사용 가능한 라이브러리인지는
  현재 근거로 판정할 수 없다. **KPA 콘텐츠 큐레이션·보관 정책 정비**에서 함께 조사한다.
  미연결 상태 자체는 삭제 후보를 의미하지 않는다.
- **market-trial live 상수** — 참조 행이 없어도 코드가 존재 여부를 확인한 뒤 분기하므로 운영 장애가 아니다.
  초기화 기준값 / 예약 식별자 / 과거 기능 잔재 / 휴면 기능 중 무엇인지는 **market-trial 영역 정비**에서
  생명주기 조사로 판정한다.
