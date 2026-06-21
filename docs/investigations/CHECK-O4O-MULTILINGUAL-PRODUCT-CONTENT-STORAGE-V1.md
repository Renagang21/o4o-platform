# CHECK-O4O-MULTILINGUAL-PRODUCT-CONTENT-STORAGE-V1

> **WO:** `WO-O4O-MULTILINGUAL-PRODUCT-CONTENT-STORAGE-V1`  
> **일자:** 2026-06-21  
> **범위:** store-scoped 다국어 상품 마케팅 콘텐츠 저장소 기반 추가. API/UI/QR 랜딩/타블렛/파트너/DSL 연동 없음.  
> **결과:** PARTIAL PASS — DB migration + TypeORM entity + platform entity export 추가. API 사용 시 `connection.ts` entity registration은 후속 API/landing WO에서 함께 처리 필요.

---

## 1. 배경

선행 `IR-O4O-MULTILINGUAL-PRODUCT-CONTENT-QR-AUDIT-V1`에서 다음 기준을 확정했다.

- 상품 정보는 표준 설명서가 아니라 자유 마케팅 콘텐츠 페이지다.
- O4O는 `기본 안내/특징/용도/주의사항` 같은 콘텐츠 항목 분류를 강제하지 않는다.
- 언어별 콘텐츠는 단순 번역본이 아니라 독립 마케팅 버전일 수 있다.
- 기존 `product_ai_contents`는 master-global 저장소라 매장별 다국어 마케팅 콘텐츠 저장소로 사용하면 안 된다.
- QR은 기존 `store_qr_codes`를 재사용하되, 우선 `landingType='page'`로 다국어 콘텐츠 그룹을 가리키는 방식이 안전하다.

따라서 이번 WO는 QR/UI 연결이 아니라, 후속 QR/허브/타블렛 구현이 사용할 수 있는 store-scoped 저장소 기반을 만든다.

---

## 2. 변경 파일

| 파일 | 내용 |
|---|---|
| `apps/api-server/src/routes/platform/entities/store-multilingual-product-content-group.entity.ts` | 상품별 다국어 콘텐츠 그룹 entity 추가 |
| `apps/api-server/src/routes/platform/entities/store-multilingual-product-content-page.entity.ts` | 언어별 자유 콘텐츠 페이지 entity 추가 |
| `apps/api-server/src/routes/platform/entities/index.ts` | 신규 entity/type export 추가 |
| `apps/api-server/src/database/migrations/20260621010000-CreateStoreMultilingualProductContent.ts` | 실제 테이블 생성 migration 추가 |
| `docs/investigations/CHECK-O4O-MULTILINGUAL-PRODUCT-CONTENT-STORAGE-V1.md` | 본 CHECK |

---

## 3. 저장 모델

### 3.1 콘텐츠 그룹

테이블:

```text
store_multilingual_product_content_groups
```

핵심 컬럼:

```text
id
organization_id
service_key
target_kind      -- local | listing
target_id        -- store_local_products.id 또는 organization_product_listings.id
content_key      -- default, future tourist/event 등 자유 key
title
default_locale   -- ko
source_type      -- store_created | operator_hub | supplier_offline_imported
source_ref_id
status           -- draft | published | archived
metadata
created_by_user_id
created_at / updated_at
```

Unique 기준:

```text
organization_id + target_kind + target_id + content_key
```

`content_key`는 고정 콘텐츠 유형이 아니다. V1 기본값은 `default`이며, 후속에서 `tour`, `event`, `guide` 같은 변형을 enum 없이 수용할 수 있게 하는 자유 key다.

### 3.2 언어별 페이지

테이블:

```text
store_multilingual_product_content_pages
```

핵심 컬럼:

```text
id
group_id
locale          -- ko | en | zh | ja | vi | th | id
title
summary
content_format  -- blocks | html | image_sequence | json
content         -- jsonb
assets          -- jsonb ordered asset refs
buttons         -- jsonb CTA refs
status          -- draft | published | archived
is_default
sort_order
metadata
created_by_user_id
created_at / updated_at
```

Unique 기준:

```text
group_id + locale
```

즉 한 상품 콘텐츠 그룹은 언어별 페이지를 하나씩 가질 수 있고, 각 페이지는 독립 콘텐츠다.

---

## 4. 지원 언어 V1

```text
ko: 한국어
en: English
zh: 中文
ja: 日本語
vi: Tiếng Việt
th: ภาษาไทย
id: Bahasa Indonesia
```

힌디어는 사용자 결정에 따라 제외했다.

---

## 5. 의도적으로 하지 않은 것

이번 WO에서는 다음을 하지 않았다.

```text
QR 랜딩 연결
운영자/허브 등록 API
내 매장 가져오기 API
매장 상품 리스트 배지
타블렛 표시
파트너/가이드/수수료
DSL/POS 연동
실시간 AI 번역
콘텐츠 항목 표준 분류
```

---

## 6. 주의 / 후속 필요

### 6.1 `connection.ts` entity registration

이번 세션은 GitHub contents API 기반 파일 단위 작업이며 로컬 체크아웃/typecheck가 없다. 1000줄 이상의 `connection.ts` 대형 파일을 무리하게 재작성하면 동시 세션 변경 혼입 위험이 크므로, 이번 commit에는 신규 entity export까지만 반영했다.

후속 API/QR 랜딩 WO에서 실제 repository 사용을 시작할 때 아래 작업이 필요하다.

```text
connection.ts imports에 신규 entity 2개 추가
AppDataSource.entities 배열에 신규 entity 2개 추가
```

그 전까지는 migration으로 DB 테이블은 생성되지만, TypeORM repository 기반 API에서 신규 entity를 사용하려면 등록이 필요하다.

### 6.2 API 없음

이번 WO는 저장소 기반만 추가했다. 운영자 등록/허브/내 매장 가져오기/QR 랜딩은 다음 WO에서 API와 UI를 설계해야 한다.

---

## 7. 검증

- 코드 변경 방식: GitHub contents API, path별 변경.
- 로컬 checkout 없음 → `pnpm typecheck` 미실행.
- DB 접속 없음 → migration 실적용 미수행.
- 정적 검토:
  - migration `up/down` 존재.
  - `IF NOT EXISTS` 기반 생성.
  - locale/status/source/content_format CHECK 존재.
  - group 삭제 시 page cascade.
  - platform entity index export 완료.

---

## 8. 후속 WO

권장 순서:

1. `WO-O4O-MULTILINGUAL-PRODUCT-CONTENT-API-V1`
   - entity registration
   - 운영자/매장 저장·조회 API
   - locale fallback read API
2. `WO-O4O-MULTILINGUAL-PRODUCT-CONTENT-HUB-FLOW-V1`
   - 운영자 등록 → 매장 허브 → 내 매장 가져오기=복사
3. `WO-O4O-STORE-PRODUCT-MULTILINGUAL-BADGES-V1`
   - 내 매장 상품 리스트 다국어 지원 배지
4. `WO-O4O-MULTILINGUAL-PRODUCT-QR-LANDING-V1`
   - 기존 QR `page` 연결 + 언어 선택/유지/fallback
5. `WO-O4O-MULTILINGUAL-PRODUCT-TABLET-CONTENT-V1`
   - 같은 콘텐츠 페이지를 타블렛에서 표시

---

## 9. 최종 판정

```text
PARTIAL PASS
```

store-scoped 다국어 상품 마케팅 콘텐츠를 저장할 DB 기반은 추가됐다. 다만 API에서 신규 entity repository를 사용하려면 후속 WO에서 `connection.ts` entity registration을 완료해야 한다.
