# CHECK — WO-O4O-KPA-MULTILINGUAL-PRODUCT-CONTENT-HUB-FLOW-PILOT-V1 (Phase 1 — Backend)

> KPA 다국어 상품 콘텐츠 운영 흐름 파일럿. **Phase 1 = 백엔드만** (사용자 결정: 백엔드 먼저).
> 운영자 HUB 원본 저장소 + 운영자 write API + 매장 가져오기(=복사) import 엔드포인트.
> Phase 2(KPA web UI)는 후속.

**상위:** `WO-O4O-MULTILINGUAL-PRODUCT-CONTENT-ENTITY-REGISTRY-AND-ROUTE-MOUNT-V1` (store-owner API live)

---

## 1. 설계 결정 (사용자 확정)

| 결정 | 선택 | 근거 |
|------|------|------|
| 운영자 원본 저장 | **신규 전용 테이블** | `operator_qr_templates` 선례. store 테이블과 분리, org-less, source_type 모호성 없음 |
| 구현 범위 | **백엔드 먼저** | 위험 분할 — API smoke로 import-copy 검증 후 UI는 Phase 2 |

## 2. 신규 백엔드 구조

### 2.1 entity (2개, org-less 운영자 원본)

| 테이블 | 설명 |
|--------|------|
| `operator_multilingual_product_content_groups` | 운영자 HUB 원본 그룹. service_key 스코프, author_role='operator' 하드락(CHECK), **target 없음**(매장이 import 시 바인딩). title/description/default_locale/status/published_at |
| `operator_multilingual_product_content_pages` | locale page (ko/en/zh/ja/vi/th/id). store page와 동형. FK CASCADE |

- entity: `routes/platform/entities/operator-multilingual-product-content-{group,page}.entity.ts`
- ManyToOne은 CLAUDE.md §2 FROZEN 규칙 준수 — `@ManyToOne('...')` 문자열 + `import type`.
- migration: `20261119000000-CreateOperatorMultilingualProductContent.ts` (기존 max 20261118000000 이후, glob 자동 등록). 클래스명 timestamp 일치.
- `entities.ts` registry + `platform/entities/index.ts` export 등록 (connection.ts 미수정).

### 2.2 운영자 write controller

`operator-multilingual-content.controller.ts` — mount `/api/v1/{service}/operator/multilingual-product-contents`

```
GET    /groups                          목록(draft+published+archived, status 필터, 페이지네이션)
GET    /groups/:id                      단일 +pages
POST   /groups                          생성(draft) — 서버강제 author_role='operator', service_key
PUT    /groups/:id                      수정(title/description/defaultLocale/contentKey/metadata)
PATCH  /groups/:id/publish              발행(published_at set)
PATCH  /groups/:id/archive              보관
DELETE /groups/:id                      삭제(pages CASCADE)
PUT    /groups/:id/pages/:locale        locale page upsert
PATCH  /groups/:id/pages/:locale/status page 상태 변경
```

- 가드: `requireOperator` inline (operator-pop.controller.ts 동일) — `{service}:operator|admin` / `platform:admin|super_admin`. store_owner/supplier/member 차단.

### 2.3 매장 가져오기 = 복사 (store-owner controller 확장)

`multilingual-product-content.controller.ts` 에 2개 추가:

```
GET  /pharmacy/multilingual-product-contents/hub      published 운영자 원본 탐색(locale 목록/수 카드)
POST /pharmacy/multilingual-product-contents/import   가져오기=복사
     body: { sourceGroupId, targetKind(local|listing), targetId, contentKey? }
```

import 동작:
1. store-owner 인증(`requireStoreOwner`)
2. target 이 내 매장 소유 검증(`assertTargetBelongsToStore` — local=store_local_products / listing=organization_product_listings)
3. 운영자 원본 published 조회(service_key 스코프)
4. store group upsert — `source_type='operator_hub'` + `source_ref_id`=운영자 groupId + metadata.importedFromOperatorGroupId
5. published locale pages 만 store pages 로 복사(locale upsert, status='draft')
6. **복사 후 원본과 분리** — 운영자 원본 수정/삭제가 사본에 영향 없음(별 테이블 + 값 복사)

## 3. route mount

| 서비스 | 운영자 controller | hub/import (store-owner controller) |
|--------|:----------------:|:-----------------------------------:|
| KPA | ✅ `/operator/multilingual-product-contents` | ✅ (기존 3-mount controller) |
| GlycoPharm | ✅ (backend symmetry) | ✅ |
| K-Cosmetics | ✅ (backend symmetry) | ✅ |

> **3-서비스 백엔드 mount 결정:** operator-pop / store-owner multilingual 이 이미 3서비스 대칭 mount 이므로 동일 패턴 유지. WO §3.1 "KPA only" 는 **UI/운영 흐름/smoke** 레벨에서 준수 — glyco/cosmetics 는 UI 0, operator 원본 0 이므로 운영 흐름 미활성. §8 성공기준 6("GlycoPharm/K-Cosmetics UI 변경 없음") 은 UI 한정이라 충족.

## 4. 검증

### 4.1 정적
`tsc -p tsconfig.build.json --noEmit` — 본 변경 신규 오류 **0**. 유일 오류 `marketTrialController.ts(105)` 는 clean main 동일(pre-existing, 무관).

### 4.2 route smoke (배포 후)
비인증 호출 401 기대:
```
GET  /api/v1/kpa/operator/multilingual-product-contents/groups        → 401
GET  /api/v1/kpa/pharmacy/multilingual-product-contents/hub           → 401
POST /api/v1/kpa/pharmacy/multilingual-product-contents/import        → 401
```

### 4.3 인증 기능 smoke (Phase 2 UI 와 함께 / 또는 토큰 기반 API)
```
운영자: POST /groups → PUT ko/en page → PATCH publish
매장:   GET /hub(원본 노출) → POST /import(target 바인딩) → GET resolve?locale=en → zh fallback
```

## 5. 무접촉/안전

- `connection.ts` 미수정.
- `services/mobile-app/*` (다른 세션 WIP) **미접촉** — 명시 pathspec commit.
- 기존 QR/POP/blog/상품/허브 route 무영향 (additive only).

## 6. Phase 2 (후속)

```
KPA web 운영자 작성 UI (/operator/multilingual-product-contents, 언어 탭 — RichTextEditor)
KPA Store Hub 노출 (/store-hub/multilingual 또는 content 하위)
매장 가져오기 UI + target 선택(local/listing)
KPA store-owner 인증 기능 smoke (실제 row)
이후: STORE-PRODUCT-MULTILINGUAL-BADGES / QR-LANDING / TABLET-CONTENT / CROSS-SERVICE-ADOPTION
```

---

*Date: 2026-06-21 · Phase 1 Backend · 신규 operator 테이블 2개 + 운영자 write API + import(=copy) · 3서비스 backend mount(UI는 KPA 파일럿) · typecheck 신규 오류 0 · connection.ts/mobile-app 미접촉*
