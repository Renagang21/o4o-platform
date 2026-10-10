# O4O Store POP V2 — Canonical Model V1

> **상태**: ACTIVE · **작성일**: 2026-09-10
> **WO**: `WO-O4O-STORE-POP-V2-CANONICAL-REBUILD-KPA-PH-V1`
> **선행 조사**: [`IR-O4O-STORE-POP-REAL-WORLD-USAGE-AND-PLACEMENT-AUDIT-V1`](../investigations/IR-O4O-STORE-POP-REAL-WORLD-USAGE-AND-PLACEMENT-AUDIT-V1.md)

본 문서는 **POP V2 의 canonical 계약**이다. 기존 POP 구현의 복구 문서가 아니다.

---

## 1. 모델 전환

```text
기존:  Content → POP 생성 → PDF → 끝
V2:    Content → POP Document(저장·수정·복제·보관) → Renderer → PDF / PNG
```

기존 경로는 **출력이 종점**이었다. 재편집·복제·보관이 없으므로 매장이 POP 을
"관리"할 수 없었고, 그것이 실사용 0 의 구조적 원인이다 (IR §12·§18).

V2 의 1급 개체는 **POP Document** 다. 출력물은 Document 의 부산물이다.

---

## 2. 기존 POP 3축 재조사 결과 (reference-only)

조사 결과 기존 "POP" 은 **서로 다른 3개 축**이 같은 이름을 쓰고 있었다.

| 축 | 실체 | 테이블 | 마운트 | V2 취급 |
|---|---|---|---|---|
| **A. 콘텐츠 원장** | 블로그형 발행 아티클 (`slug`·`published_at`·operator→HUB→매장 배포) | `store_pops` | KPA `/stores/:slug/pop/staff` · Cosmetics 동일 · PH `/store-owner/pop` | **원장으로 재사용 안 함 / V2 의 source 로는 사용** |
| **B. 출력 파이프라인** | `POST /pharmacy/pop/generate` → pdfkit PDF | (없음) | KPA · Cosmetics 만 (**PH 미채택**) | Renderer 로 **재사용** |
| **C. 산출물 로그** | 생성된 PDF 파일 이력 | `store_execution_assets(usage_type='pop')` | 3서비스 공통 | **과거 output history 로 보존** |

### 2-1. 이미 존재하는 공통 Core

`packages/store-ui-core/src/components/pop/` 13파일
(`StorePopComposerView` · `usePopComposer` · `PopLayoutTemplateSection` · `PopQrSelector` …)
— `WO-O4O-MY-STORE-POP-COMPOSER-KCOS-GP-COMMONIZATION-V1` 산출물.

**그러나 현재 소비처는 K-Cosmetics 1곳뿐이다.** KPA `StorePopPage.tsx` 와
PH `PopPage.tsx` 는 이 Core 를 쓰지 않는다. 즉 "공통화됐다"는 기록은 있으나
**채택은 1/3** 이다.

V2 는 이 Core 를 **버리지 않고 상위 개념으로 승격**한다 —
`usePopComposer` 의 상태 모델(선택 8개 상한 · 자료 1개 이상 · 실패 시 선택 유지)은
V2 Editor 안에서 그대로 유효하다. 다만 종점이 `generate()` 가 아니라 `save()` 로 바뀐다.

---

## 3. 판정 — `store_pops` 재사용 여부

**판정: 재사용하지 않는다 (NEW CANONICAL TABLE).**
`store_pops` 는 **삭제하지 않는다.** 콘텐츠 축으로 계속 살아 있고, V2 의 **source** 가 된다.

근거:

1. `store_pops` 는 **발행(publishing) 모델**이다. `@Index(['storeId','slug'], {unique:true})`
   가 slug 를 강제하는데, 매장 내부 인쇄용 POP Document 에는 slug 개념이 없다.
2. `content` 가 `text NOT NULL` (아티클 HTML) 이다. POP Document 는
   `title / bullets[] / shortText / longText / imageUrl` 의 **필드 집합**이고
   `templateId · layout · qrCodeId` 를 갖는다. 이를 `content` 에 JSON 으로 밀어넣는 것은
   legacy physical table 오버로딩이며 CLAUDE.md §5 가 경고하는 함정이다.
3. `author_role` + `CHK_store_pops_author_role_store_id` + `IDX_store_pops_hub_query` 는
   **operator → HUB → 매장 배포 의미**를 인코딩한다. 저작(authoring) 과 직교한다.
4. `status: draft|published|archived` 의 `published` 는 "매장 밖에 공개" 를 뜻한다.
   POP Document 의 상태축은 `draft|ready|archived` 이고 공개 개념이 없다.

### 3-1. "POP 전용 Content 원장 신규 생성 금지" 와의 정합

새 테이블은 **content 원장이 아니라 document(저작물) 원장**이다.
경계를 코드로 강제한다:

> **불변식 I1 — Source-Required**: `store_pop_documents.sources` 는 항상 **1개 이상**의
> 기존 콘텐츠 소스를 참조한다 (`CHECK jsonb_array_length(sources) >= 1`).
> POP Document 는 **스스로 콘텐츠를 창조하지 않는다.**

허용 source origin (기존 `ProductionSourceItem.origin` 어휘 그대로):

| origin | 실제 원장 |
|---|---|
| `direct` | `kpa_store_contents` (Store Production Material) |
| `snapshot` | `o4o_asset_snapshots` |
| `library` | `store_execution_assets` |
| `local` | `store_local_products` (매장 경영활용 제품 기본정보) |
| `store_pop` | `store_pops` (콘텐츠 축 — V2 에서 신규 허용) |
| `spd` | `shared_product_descriptions` (**STORE** canonical 설명서 전용) |
| `listing` | `organization_product_listings` (O4O 기반 상품 기본정보) |

---

## 4. POP V2 Document 계약

### 4-1. 테이블 `store_pop_documents`

| 컬럼 | 타입 | 비고 |
|---|---|---|
| `id` | uuid PK | |
| `organization_id` | uuid NOT NULL | **Store Ops 경계 (§7 Boundary Policy)** |
| `service_key` | varchar(50) NOT NULL | adapter 표시축. **경계 판정에 쓰지 않는다** |
| `title` | varchar(255) NOT NULL | |
| `pop_kind` | varchar(20) NOT NULL | `product` \| `content` |
| `content_type` | varchar(40) NULL | `pop_kind='content'` 일 때: `health-info` \| `consult` \| `seasonal` \| `store-guide` \| `campaign` \| `general` |
| `sources` | jsonb NOT NULL | `PopV2Source[]` — `{origin, id, title}` · **길이 ≥ 1** |
| `fields` | jsonb NOT NULL | `{title, bullets[], shortText, longText, imageUrl}` |
| `template_id` | varchar(60) NOT NULL | `PRODUCTION_TEMPLATE_REGISTRY` id |
| `layout` | varchar(10) NOT NULL | `A4` \| `A5` |
| `qr_code_id` | uuid NULL | `store_qr_codes.id` — **선택 삽입** |
| `status` | varchar(20) NOT NULL | `draft` \| `ready` \| `archived` |
| `last_output_asset_id` | uuid NULL | 마지막 산출 `store_execution_assets.id` |
| `created_by` | uuid NULL | |
| `created_at` / `updated_at` | timestamptz | |

인덱스: `(organization_id, status)` · `(organization_id, updated_at DESC)`
제약: `CHK_spd_sources_nonempty` · `CHK_spd_kind` · `CHK_spd_status` · `CHK_spd_layout`

### 4-2. 불변식

| # | 불변식 |
|---|---|
| **I1** | **Source-Required** — `sources` 길이 ≥ 1. POP Document 는 콘텐츠 원장이 아니다 |
| **I2** | **Content Original Immutability** — Document 편집은 `fields` 만 바꾼다. source 원본 원장에 write 하지 않는다 |
| **I3** | **Output-Append-Only** — 출력은 `store_execution_assets(usage_type='pop')` 에 **append**. 기존 17행 포함 과거 이력은 수정·삭제하지 않는다 |
| **I4** | **상품 POP fallback chain** — `product-linked store content` → `STORE canonical 설명서` → `상품 기본정보`. **B2B/B2C 설명서 자동 fallback 금지** |
| **I5** | **QR ≠ Placement** — `qr_code_id` 는 "POP 지면에 QR 을 넣는다" 일 뿐이다. 매장 배치 사실을 뜻하지 않는다. **Placement 는 V2 범위 밖** |
| **I6** | **Single Core** — KPA/PH 는 같은 공통 Core 를 adapter 로 소비한다. 본체 복제 금지 |

### 4-3. API 계약 (공통 controller factory · serviceKey 주입)

```text
GET    /{svc}/pharmacy/pop-v2                   목록 (status filter)
POST   /{svc}/pharmacy/pop-v2                   생성 (draft)
GET    /{svc}/pharmacy/pop-v2/:id               상세 (재편집 진입)
PUT    /{svc}/pharmacy/pop-v2/:id               수정
POST   /{svc}/pharmacy/pop-v2/:id/duplicate     복제
PATCH  /{svc}/pharmacy/pop-v2/:id/archive       보관 / 복원
POST   /{svc}/pharmacy/pop-v2/:id/render        출력 → {format: 'pdf'|'png'}
GET    /{svc}/pharmacy/pop-v2/sources/product/:productId   상품 기본 콘텐츠 해석(I4)
GET    /{svc}/pharmacy/pop-v2/sources/contents             내 매장 콘텐츠 목록
```

PH 는 `/pharmacy-hub/store-owner/pop-v2/*` 로 **같은 factory** 를 마운트한다.

### 4-4. Renderer

하나의 `PopV2RenderModel` 위에 backend 2개:

```text
PopV2RenderModel ──> renderPdf  (pdfkit · 기존 generatePopPdf 재사용 · 벡터·폰트 임베드)
                 └─> renderPng  (SVG → sharp · 신규)
```

`renderPdf` 는 검증된 기존 `generatePopPdf(PopGenerateInput[])` 에 위임한다 —
V2 를 위해 PDF 품질을 후퇴시키지 않는다.
`renderPng` 는 신규 경로다. Debian slim 런타임에 CJK 시스템 폰트가 없으므로
`FONTCONFIG_PATH` 로 앱 내장 `NotoSansKR-Regular.ttf` 를 fontconfig 에 노출한다.

---

## 5. 사용자 동선

```text
POP 관리 → [새 POP 만들기] → 대상 선택(상품 | 내 매장 콘텐츠) → 사용할 콘텐츠 결정
→ 템플릿 선택 → 편집 → 저장 → 미리보기 → PDF/PNG 출력 → 나중에 다시 열어 수정
```

목록 화면이 진입점이다. 기존 POP 은 목록이 없었고 "만들면 끝" 이었다.

---

## 6. 범위 밖

- **POP Placement** (어느 매대·코너에 실제로 붙었는가) — `NOT_STARTED`.
  IR §19 판정 `POP_PLACEMENT_NEED = NOT_YET_JUSTIFIED` 를 유지한다.
- 기존 POP 코드의 retire — V2 가 닫힌 뒤 별도로 판단한다.
