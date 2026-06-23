# CHECK-O4O-KPA-MULTILINGUAL-PRODUCT-CONTENT-PILOT-CLOSURE-V1

> **KPA Society 다국어 상품 콘텐츠 파일럿 전체 closure.**
> 이 문서는 정책·경계를 **고정(freeze-intent)** 하는 closure 문서이며, 코드/API/DB/UI/schema/migration 변경은 포함하지 않는다.
> 대상: **KPA only.** GP/KCos 적용·공통화는 본 closure 범위 밖(별도 IR).

상태: **CLOSED / PASS**
일자: 2026-06-23

---

## 0. 목적

외국인 고객 응대를 위한 KPA 다국어 상품 콘텐츠 흐름이 제품 단위로 완성되었다.
추가 기능을 붙이기 전에, 이미 검증된 정책·경계·데이터 모델을 한 문서에 고정해 drift 를 방지한다.

---

## 1. 운영자 원본 ↔ 매장 사본 분리 (FROZEN)

두 계층은 **물리적으로 분리된 테이블**이며 서로 직접 참조하지 않는다.

| 계층 | 테이블 | 소유/경계 |
|------|--------|-----------|
| 운영자 원본 (HUB Original) | `operator_multilingual_product_content_groups` / `operator_multilingual_product_content_pages` | serviceKey 단위, `author_role='operator'` |
| 매장 사본 (Store Copy) | `store_multilingual_product_content_groups` / `store_multilingual_product_content_pages` | `organization_id` 단위, 상품 target 바인딩 |

- 운영자 원본은 **service-scoped** (특정 상품/매장에 묶이지 않음).
- 매장 사본은 **org-scoped + 상품 target 바인딩**.
- 고객에게 보여지는 콘텐츠는 **항상 매장 사본**이다. 운영자 원본은 고객에게 직접 노출되지 않는다.

---

## 2. 가져오기 = 복사 (FROZEN)

- Store Hub(`/store-hub/multilingual-product-contents`)에서 운영자 발행 원본을 "가져오기"하면 **store-scoped copy** 가 생성된다.
- 복사 시점에 운영자 원본의 **발행된 page** 들이 매장 사본으로 복제되며, 이후 **원본과 분리(detached)** 된다.
- 따라서 **운영자 원본의 수정/삭제/보관은 이미 가져온 매장 사본에 영향을 주지 않는다.**
- 사본 식별: `source_type='operator_hub'`, `source_ref_id`(원본 그룹 id, **내부 전용**).
- 가져오기는 idempotent — 동일 `(organization_id, target_kind, target_id, content_key)` 에 대해 upsert.

---

## 3. target 기준 (FROZEN)

| 노출 대상 | targetKind | 물리 테이블(targetId 출처) |
|-----------|:----------:|---------------------------|
| 매장 취급 상품 | `local` | `store_local_products.id` |
| O4O 주문 가능 상품 | `listing` | `organization_product_listings.id` |

- `content_key` 는 V1 에서 **`default` 만** 사용한다. (tour/event 등 variant 는 미래 확장 여지로 남기되 본 파일럿 범위 밖.)
- 고유성: `(organization_id, target_kind, target_id, content_key)` unique.

---

## 4. 상태 정책 (FROZEN)

| status | 의미 | 목록/summary | public resolve |
|--------|------|:------------:|:--------------:|
| `draft` | 매장 내부 준비 상태 | 노출(배지 localeCount 집계 대상) | **비노출** |
| `published` | 고객 공개 가능 | 노출 | **노출 대상** |
| `archived` | 보관 | **비노출** | **비노출(404)** |

- **public resolve 대상은 `published` page 뿐이다.** (group archived 또는 published page 0 → 404)
- 배지 summary 의 `localeCount` 는 비-archived page 기준(draft 포함), `publishedLocaleCount` 는 published 만.
- 삭제는 **물리 삭제가 아니라 archived** 처리한다 (운영 오염 최소화).

---

## 5. public-key 정책 (FROZEN)

- `public_key` 는 추측 어려운 랜덤 값(24 hex), unique partial index, **lazy 발급**.
- **"고객용 링크/QR/태블릿 보기 발급 = 고객 공개"**:
  - `POST /pharmacy/multilingual-product-contents/:groupId/public-key` 발급 시 store 사본의 **그룹/draft page 를 published 로 승격**한다(운영자 원본 무관, store copy 한정).
  - 별도 publish 워크플로 UI 없이 "공개"가 곧 발급 시점이 된다.
- public landing: `GET /api/v1/kpa/public/multilingual-product-contents/:publicKey?locale=` (무인증).
  - `archived` 그룹 → **404**, published page 0 → **404(NO_PUBLISHED_PAGE)**.
  - fallback: 요청 locale published → 없으면 `en` → `defaultLocale` → `ko` → 없으면 404.
- **public 응답 정보 정제(FROZEN):** `organizationId` / `targetId` / `source_ref_id` / `created_by` / `metadata` / 내부 `id` / `status` 는 **public 응답에 노출 금지**. 노출 필드 = `title, targetKind, contentKey, defaultLocale, requestedLocale, resolvedLocale, fallbackUsed, availableLocales, page{locale,title,summary,contentFormat,content,assets,buttons,updatedAt}`.
- QR 이미지는 backend SVG(`generateQrSvg`)로 생성 — **프론트 QR 라이브러리 의존성 0**.
- 태블릿 표시는 같은 `publicKey`/resolve 를 재사용하고 `?mode=tablet` 쿼리로 **렌더링만 분기**(backend/route/저장소 무변경).

---

## 6. 완성된 KPA 파일럿 흐름 (canonical)

```
운영자 작성·발행 (operator originals)
  → Store Hub 노출 (published 원본만)
  → 매장 가져오기 = store-scoped copy 생성 (draft)
  → 매장 취급 상품(local) / O4O 주문 가능 상품(listing) 연결
  → 상품 목록 다국어 배지 (localeCount / locales)
  → 고객용 링크/QR 발급 = 공개(published 승격)
  → public landing (무인증, locale fallback, 정보 정제)
  → 태블릿 보기 (?mode=tablet, 같은 데이터 재사용)
```

---

## 7. 검증된 WO 목록

| 영역 | WO | 대표 커밋 | 상태 |
|------|----|-----------|------|
| 엔티티 등록·라우트 마운트 | WO-O4O-MULTILINGUAL-PRODUCT-CONTENT-ENTITY-REGISTRY-AND-ROUTE-MOUNT-V1 | `ca0b16063` | 완료 |
| 저장소 | WO-O4O-MULTILINGUAL-PRODUCT-CONTENT-STORAGE-V1 | migration `20260621010000` | 완료 |
| HUB-FLOW backend (원본 + 가져오기=복사) | WO-O4O-KPA-MULTILINGUAL-PRODUCT-CONTENT-HUB-FLOW-PILOT-V1 | `a15c5c8af` | 완료 |
| HUB-FLOW web | WO-O4O-KPA-MULTILINGUAL-PRODUCT-CONTENT-HUB-FLOW-WEB-PILOT-V1 | `0505b15c1` | 완료 |
| 상품 연결 배지 | WO-O4O-KPA-STORE-PRODUCT-MULTILINGUAL-BADGES-PILOT-V1 | `2606e9d07` | CLOSED/PASS |
| QR / public landing | WO-O4O-MULTILINGUAL-PRODUCT-QR-LANDING-V1 | `ea866a738` · `5e43b3dc0` · `5bcb45eae` | CLOSED/PASS |
| listing 고객용 QR 액션 | WO-O4O-KPA-O4O-LISTING-MULTILINGUAL-QR-ACTIONS-V1 | `a2993d790` | 완료 |
| 태블릿 표시 모드 | WO-O4O-MULTILINGUAL-PRODUCT-TABLET-CONTENT-V1 | `0d978a08d` | CLOSED/PASS |

각 WO 의 배포·brower smoke 기록은 해당 `docs/investigations/CHECK-*` 문서 참조.

---

## 8. GP/KCos 정책 (경계)

- 본 closure 는 **KPA only**.
- store 측 컨트롤러/엔티티는 `service_key`(kpa/glycopharm/cosmetics) 중립으로 설계되어 있으나, **GP/KCos 의 UI 적용·공통 컴포넌트 추출·운영자/매장 동선 연결은 본 파일럿에서 수행하지 않는다.**
- backend 공유 컨트롤러에 GP/KCos 도 동일 라우트가 존재하지만 **프론트 소비처가 KPA 뿐**이므로 GP/KCos UX 는 무변경 상태다.
- Cross-service 적용 여부·범위는 **별도 IR 에서 검토**한다.

---

## 9. 후속 IR

```
IR-O4O-MULTILINGUAL-PRODUCT-CONTENT-CROSS-SERVICE-ADOPTION-V1
```
- GP/KCos 적용 타당성, 공통 컴포넌트(badge/actions/landing) 추출 범위, 서비스별 도메인/문구/운영자 동선 차이 검토.
- 본 closure 의 §1~§5 정책을 기준선으로 삼는다.

---

## 10. 판정

KPA 다국어 상품 콘텐츠 파일럿은 **제품 흐름 기준으로 고정**되었다.
정책(§1~§5)·흐름(§6)·검증 WO(§7)·경계(§8)·후속(§9) 확정.

**CHECK-O4O-KPA-MULTILINGUAL-PRODUCT-CONTENT-PILOT-CLOSURE-V1 → CLOSED / PASS**
