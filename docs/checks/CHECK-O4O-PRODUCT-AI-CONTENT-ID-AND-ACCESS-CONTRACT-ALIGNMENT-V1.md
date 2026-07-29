# CHECK-O4O-PRODUCT-AI-CONTENT-ID-AND-ACCESS-CONTRACT-ALIGNMENT-V1

> **판정: 중지 (STOP) — 구현 미착수.**
> WO §11 필수 중지 게이트 및 §16 중지 조건이 **동시에 3개 충족**되었다.
> 코드 변경 0 / DB write 0 / migration 0 / 배포 0. 프로덕션 접근은 `SELECT` 전용.

| 항목 | 값 |
|------|-----|
| WO | `WO-O4O-PRODUCT-AI-CONTENT-ID-AND-ACCESS-CONTRACT-ALIGNMENT-V1` |
| 선행 IR | [IR-O4O-KPA-STORE-PRODUCT-AI-CONTENTS-403-AUTH-AUDIT-V1](../investigations/IR-O4O-KPA-STORE-PRODUCT-AI-CONTENTS-403-AUTH-AUDIT-V1.md) |
| 작성일 | 2026-07-29 |
| 결과 | **중지** — 소유권 계약 미확정 + 프론트 정렬 전제(masterId) 부재 |

---

## 1. 중지 사유 요약

WO 는 §11 에서 **소유권 계약이 확정되기 전에는 단순 가드 수정·FK 추가를 하지 않는다** 고 명시했다.
스키마·서비스·프로덕션 데이터 확인 결과 그 전제가 **깨져 있음**이 확정되었다.

| # | 중지 조건 (WO §11·§16) | 확인 결과 |
|---|----------------------|----------|
| S1 | `organization_id` 없이 여러 매장이 같은 ProductMaster row 를 덮어쓸 수 있음 | **충족** — `product_ai_contents` 에 `organization_id` **컬럼 없음**, unique 제약 **0개**, upsert 키 = `(product_id, content_type)` 전역 |
| S2 | ProductMaster 연결 없는 local product 가 핵심 업무의 대부분 | **충족** — `store_local_products` 에 `master_id` **컬럼 자체가 없음**. 프로덕션 43행 **전부(100%)** 미연결 |
| S3 | `product_ai_contents` 가 전역 콘텐츠인데 매장 화면이 매장별 설명을 저장 | **충족** — 전역 row 를 KPA/GP/K-Cos 매장 편집 화면이 직접 upsert |

---

## 2. 확정된 사실 (증거)

### 2.1 `product_ai_contents` 는 전역(플랫폼 공용) 테이블이다

프로덕션 스키마 (read-only 확인):

```
columns : id, product_id, content_type, content, model, created_at, updated_at
              └ organization_id / store_id / service_key 없음
constraints : PRIMARY KEY (id)  ← 그 외 UNIQUE·FK·CHECK 전무
indexes : (product_id), (product_id, content_type)   ← 둘 다 non-unique
```

서비스 계층의 upsert 키도 동일하다 — [product-ai-content.service.ts:145](../../apps/api-server/src/modules/store-ai/services/product-ai-content.service.ts#L145) `findOne({ where: { productId, contentType } })` 후 `save`.

> **귀결:** `(ProductMaster, content_type)` 당 **전역 단일 row**.
> A 약국이 저장하면 B 약국이 같은 상품에 대해 저장한 내용을 **말없이 덮어쓴다.**
> 현재 403 이 이 덮어쓰기를 우연히 막고 있는 상태다. **가드만 고치면 이 덮어쓰기가 즉시 열린다.**

### 2.2 `store_local_products` 에는 ProductMaster 연결이 없다

```
columns : id, organization_id, name, description, images, category, price_display,
          is_active, sort_order, created_at, updated_at, summary, detail_html,
          usage_info, caution_info, thumbnail_url, gallery_images, badge_type,
          highlight_flag, barcode
          └ master_id / product_master_id 없음
```

프로덕션 43행(활성 10), 조직 2곳. `store_local_products.id` ↔ `product_masters.id` 우연 일치 **0건**.

> **귀결:** WO §6.1 이 전제한 `masterId` 필드는 **스키마에 존재하지 않는다.**
> WO §6.2/§6.3 을 그대로 적용하면 이 화면들이 나열하는 상품의 **100%가 "기능 사용 불가" 안내**가 되어,
> `StoreProductDescriptionsPage` · `ProductPopBuilderPage` 가 사실상 **빈 화면**이 된다.
> 이는 CLAUDE.md §1 "기능 은폐 0" 과 충돌하므로 설계 승인 없이 진행할 수 없다.
> WO §6.4 가 상품명·바코드·UUID 추정 연결을 금지하므로, 코드로 우회할 수단도 없다.

### 2.3 매장별 상품 설명 저장소는 이미 따로 있다

| 테이블 | 소유 축 | 프로덕션 |
|--------|--------|---------|
| `store_product_profiles` | `organization_id` + `master_id` + `description` + `pharmacist_comment` | 2행 (조직 1곳) |
| `shared_product_descriptions` (SPD) | master 기준 **전역 canonical** (언어별) | 대량 |
| `product_ai_contents` | **소유 축 없음** (전역, AI 초안) | 3행 (전부 고아) |

즉 "매장별 설명"과 "전역 AI 초안"을 담을 자리는 **이미 분리되어 존재**한다.
문제는 매장 편집 UI 가 전역 AI 초안 테이블을 매장별 저장소처럼 쓰고 있다는 점이다.

### 2.4 취급 상품의 실제 canonical 링크

`organization_product_listings` (org + master_id, 20행/1조직) 가 master 연결된 취급 상품이다.
그러나 문제의 두 화면은 OPL 을 조회하지 않고 `fetchLocalProducts()`(= `store_local_products`)만 나열한다.
**화면이 보는 집합과 백엔드가 요구하는 집합이 애초에 교집합 0 이다.**

---

## 3. WO 중지 보고 (§16 형식)

### 3.1 확정된 ID 계약

`product_ai_contents.product_id` = **`product_masters.id`** (WO §5.1 채택안 유지 — 근거: SPD seed·POP PDF·임포트 경로 모두 masterId 기준).
이 부분은 이견 없이 확정 가능하다.

### 3.2 확정된 접근 계약 (부분)

- 죽은 `OPL.offer_id → supplier_product_offers.master_id` JOIN 제거 → `OPL.organization_id + OPL.master_id` 기준 판정: **방향 확정**.
- 무접두 `admin`/`operator` 정확 일치 우회 폐기 → prefix RBAC + service scope 검증: **방향 확정**.
- 단, 아래 3.3 이 미확정이라 **적용 시점을 잡을 수 없다** (가드를 먼저 열면 §2.1 덮어쓰기가 열림).

### 3.3 불명확한 소유권 — **핵심 미결**

`product_ai_contents` 가 **전역 콘텐츠**인지 **매장별 콘텐츠**인지 확정되지 않았다.

- 스키마·서비스·엔티티 주석은 **전역**을 말한다.
- 매장 편집 UI 3종은 **매장별**처럼 쓴다.
- 두 해석이 같은 테이블에서 충돌한다.

### 3.4 영향 서비스

| 서비스 | 영향 화면 |
|--------|----------|
| KPA | `StoreProductDescriptionsPage`, `ProductPopBuilderPage` |
| GlycoPharm | 동일 2화면 (`pages/store-management/`) |
| K-Cosmetics | 동일 2화면 (`pages/store/`) |
| 공통 | `/:productId/ai-tags` 6개 엔드포인트 (동일 가드) · POP PDF · SPD candidate seed |

### 3.5 필요한 설계 결정 — 택 1 (WO §11 A/B)

| 안 | 내용 | 파급 |
|---|------|------|
| **A. 전역 유지 (권장)** | `product_ai_contents` = 플랫폼 공용 AI 초안. **매장 편집 화면은 이 테이블 쓰기 금지.** 매장별 설명은 `store_product_profiles`(또는 매장 콘텐츠 구조)로 전환 | 프론트 3서비스 저장 대상 변경. 스키마 변경 최소. 덮어쓰기 위험 원천 차단 |
| **B. 매장별 전환** | `organization_id` 추가 + `(organization_id, product_id, content_type)` UNIQUE + 가드를 org scope 로 정렬 | migration 필요. 기존 전역 소비처(SPD seed·POP PDF·임포트)가 "어느 매장 row 를 쓸지" 재정의 필요 → 파급 큼 |

여기에 더해 **local product 문제**의 결정이 별도로 필요하다:

| 안 | 내용 |
|---|------|
| **L1** | `store_local_products` 에 nullable `master_id` 를 도입하고 연결 UI 를 제공 (연결된 상품만 AI 콘텐츠 사용) |
| **L2** | 두 화면의 상품 목록 소스를 `organization_product_listings`(master 연결 취급 상품)로 교체 |
| **L3** | local product 전용 설명은 `store_local_products.detail_html` 등 자체 필드/매장 콘텐츠 구조로 처리하고, ProductMaster AI 콘텐츠와 분리 |

> 이 두 축(A/B × L1/L2/L3)의 조합은 F12 Product Resource Architecture 및 CLAUDE.md §7 Boundary Policy 와 정합해야 하므로 **구현자가 임의로 고를 사안이 아니다.**

### 3.6 안전한 다음 단계

1. **소유권 판정 WO**(설계 전용, 코드 변경 0)로 A/B 및 L1/L2/L3 를 확정한다. F12·Boundary Policy 정합 검토 포함.
2. 확정 후 **가드 교정 + 프론트 정렬을 같은 배포**로 진행한다 (IR 결론 유지 — 분리 시 고아 데이터 계속 발생).
3. 고아 3행은 그 WO 에서 archive 또는 삭제 방침을 승인받아 처리한다. **재연결 금지**(원 소유 상품 식별 불가).
4. `/:productId/ai-tags` 는 같은 가드를 쓰므로 동일 배포에서 회귀 확인한다.

---

## 4. 이번 작업에서 하지 않은 것

```
가드 수정 · FK 추가 · unique 추가 · migration 작성
프론트 masterId 전환 · 오류 UX 변경
고아 3행 삭제/재연결 · 운영 데이터 write
배포 · 권한 변경
다른 세션 WIP 접촉
```

프로덕션 접근은 `SELECT`(정보스키마·카운트) 전용이며 결과는 §2 에 기록했다.

---

*CHECK-O4O-PRODUCT-AI-CONTENT-ID-AND-ACCESS-CONTRACT-ALIGNMENT-V1 · 판정 STOP · 2026-07-29*
