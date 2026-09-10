# CHECK — WO-O4O-STORE-POP-V2-CANONICAL-REBUILD-KPA-PH-V1

- **작업일**: 2026-09-10
- **branch**: `work/store-pop-v2-canonical-rebuild-v1` (base `origin/main` = `428349dab`)
- **성격**: 기존 POP 복구가 아니라 **신규 canonical POP V2** 구축
- **설계 정본**: [`docs/architecture/O4O-STORE-POP-V2-CANONICAL-MODEL-V1.md`](../architecture/O4O-STORE-POP-V2-CANONICAL-MODEL-V1.md)

---

## 1. 모델 전환

```text
기존:  Content → POP 생성 → PDF → 끝
V2:    Content → POP Document(저장·수정·복제·보관) → Renderer → PDF / PNG
```

신규 원장 `store_pop_documents` (migration `20270403000000-CreateStorePopDocuments`).
`store_pops` 재사용하지 않음 — 판정 근거는 §3.

---

## 2. 구현 범위

### 2-1. 공통 Core (서비스 복제 없음)

| 계층 | 파일 |
|---|---|
| entity | `apps/api-server/src/routes/o4o-store/entities/store-pop-document.entity.ts` |
| document 서비스 | `apps/api-server/src/services/store/pop-v2-document.service.ts` |
| source 해석 | `apps/api-server/src/services/store/pop-v2-source.service.ts` |
| renderer | `apps/api-server/src/services/store/pop-v2-renderer.service.ts` |
| controller factory | `apps/api-server/src/routes/o4o-store/controllers/store-pop-v2.controller.ts` |
| 화면 Core | `packages/store-ui-core/src/components/pop-v2/` (List / Editor / hooks / types / api factory) |

### 2-2. adapter (KPA / PH 동일 구조)

```text
        공통 POP V2 Core
         ↑            ↑
    KPA adapter    PH adapter
```

- KPA: `services/web-kpa-society/src/api/popV2.ts` · `pages/pharmacy/StorePopV2Page.tsx` · mount `/api/v1/kpa/pharmacy/pop-v2`
- PH : `services/web-pharmacy-hub/src/lib/api/popV2.ts` · `pages/store-owner/StorePopV2Page.tsx` · mount `/api/v1/pharmacy-hub/store-owner/pop-v2`

두 adapter 는 **base path · accent · 템플릿 · notify · 후보 목록 주입**만 다르다. 화면 본체·계약 사본 0건.
KPA 를 먼저 크게 만든 뒤 PH 로 복제하는 방식을 쓰지 않았고, 같은 회차에서 동일 Core 를 양쪽이 채택했다.

### 2-3. 콘텐츠 기반 POP

`health-info / consult / seasonal / store-guide / campaign / general` 6종. 일반 내 매장 콘텐츠 POP 포함.
**POP 전용 Content 원장을 신설하지 않았다** — 기존 매장 콘텐츠 원장을 읽기만 한다.

### 2-4. 상품 POP fallback (자동 B2B/B2C 설명서 fallback 금지)

```text
1) product-linked store content   → resolvedFrom='store-content'
2) STORE canonical 설명서          → resolvedFrom='store-canonical-description'
3) 상품 기본정보                    → resolvedFrom='product-basic-info'
```

---

## 3. `store_pops` 재사용 여부 판정 — **신규 canonical model 채택**

프로덕션 read-only 실측:

| 대상 | 실측 |
|---|---|
| `store_pop_documents` | 미존재 (신규 migration 대상) |
| `store_pops` | **total 0 / archived 0** |
| `store_execution_assets(usage_type='pop')` | **17건** (generated 16 / uploaded 1, 2026-06-03 ~ 2026-07-28) |
| `typeorm_migrations` 최신 | `CreateLocalAgentTables20270402000000` → 다음 timestamp `20270403000000` |

`store_pops` 는 **운영자 HUB 게시 POP + 매장 사본** 축(`author_role`, `slug`, `status`, `service_key`)이며
V2 가 요구하는 **저장·재편집·복제·보관되는 매장 자체 POP Document** 축이 아니다.
컬럼 의미가 다르고 운영 데이터도 0건이므로 재사용 의무가 없다 → 신규 원장.

---

## 4. 검증

### 4-1. 로컬 E2E (Docker Postgres, 실 migration 적용) — **13/13 PASS**

| # | 항목 | 결과 |
|---|---|---|
| 1 | migration 적용 | PASS |
| 2 | POP AUTHORING (저장) | PASS |
| 3 | POP RE-EDIT | PASS |
| 4 | POP 복제 (`(사본)` · status=draft) | PASS |
| 5 | 보관 / 목록 분리 | PASS |
| 6 | 보관 복원 | PASS |
| 7 | POP OUTPUT (pdf) 9,809 bytes | PASS |
| 8 | POP OUTPUT (png) 52,918 bytes | PASS |
| 9 | 출력 후 status=ready + 산출물 포인터 | PASS |
| 10 | 조직 경계 격리 | PASS |
| 11 | 빈 제목 거부 `POP_TITLE_REQUIRED` | PASS |
| 12 | 소스 없는 POP 거부 `POP_SOURCE_REQUIRED` | PASS |
| 13 | DB CHECK 제약 (sources 비어있음 차단) | PASS |

### 4-2. 산출물 실물 확인

- PDF: 임베드 subset 폰트 `/F2` + `TJ` glyph run + QR 이미지 `/I1 Do` 확인 (한글 깨짐 없음)
- PNG: 1785×2526 (A4 × 3배) — **렌더러 결함 1건 발견·수정**
  SVG width/height 에 이미 배율을 곱한 뒤 sharp `density` 로 또 곱해 9배(5355×7578)로 출력되던 문제.
  SVG 는 pt 단위 그대로 두고 배율은 `density` 에서만 준다.

### 4-3. 프로덕션 read-only 소스 해석 검증

- `listStoreContentSources` → 조직 `9c87f46b-…` 후보 20건 (`library` + `direct`)
- content → `store-content` / listing → `store-canonical-description`(5 bullets, 501자) / local → `product-basic-info`
- **fallback 1단계(product-linked store content)는 표본 행에 해당 링크가 없어 프로덕션 데이터로는 미검증** — 로컬 E2E 로만 확인

### 4-4. 타입·빌드

| 대상 | 결과 |
|---|---|
| `apps/api-server` `tsc -p tsconfig.build.json --noEmit` | exit 0 |
| `apps/api-server` `pnpm run build` | exit 0 |
| `services/web-kpa-society` `tsc -b` / `--noEmit` | exit 0 |
| `services/web-pharmacy-hub` `tsc -b` / `--noEmit` | exit 0 |

---

## 5. 기존 POP legacy 재 census (판정만 · 이번 회차 코드 삭제 0건)

legacy 축은 3개로 갈린다.

### 5-1. RETIRE_CANDIDATE — 매장 POP 즉시 PDF 생성 축 (V2 가 대체하는 축)

| 파일 | 비고 |
|---|---|
| `apps/api-server/src/routes/o4o-store/controllers/store-pop.controller.ts` | `POST /pharmacy/pop/generate` |
| `apps/api-server/src/services/pop-generator.service.ts` | pdfkit 즉시 생성 |
| `services/web-kpa-society/src/api/storePop.ts` · `components/store/StorePopCreateModal.tsx` · `pages/pharmacy/StorePopPage.tsx` | KPA 프론트 |
| `services/web-pharmacy-hub/src/lib/api/pharmacyHubStorePop.ts` · `pages/store-owner/PopPage.tsx` | PH 프론트 |
| `services/web-k-cosmetics/src/pages/store/StorePopPage.tsx` | KCos 프론트 |

**이번 회차에는 제거하지 않는다.** V2 가 프로덕션에서 닫힌 뒤 별도 WO 로 판단한다.

### 5-2. KEEP_UNRELATED — 운영자 HUB POP 게시 축 (`store_pops`)

`operator-pop.controller.ts` · `pop.controller.ts`(staff import) · `store-pop.service.ts`(+`__tests__`) ·
`PharmacyHubStorePopController.ts` · `store-pop.entity.ts` · `20261029000000-CreateStorePops.ts` ·
`hub-content.service.ts#queryPop` · `services/*/api/{operatorPop,popStaff}.ts` · `StorePopStaffPage.tsx`

V2 는 **매장 자체 POP 저작**이고 이 축은 **운영자→매장 HUB 게시·사본**이다. 대체 관계가 아니다.
(데이터는 현재 0건이나, 축 자체는 별건이므로 V2 근거로 정리하지 않는다.)

### 5-3. KEEP_HISTORY_ONLY — 과거 산출물 이력

`store_execution_assets(usage_type='pop')` **17건** 은 과거 output history 로 **보존**한다.
V2 는 이 테이블에 새 산출물을 추가할 뿐 기존 행을 수정·삭제하지 않는다.

### 5-4. DEAD_REMOVE 후보 (보고만)

`asset-snapshot.controller.ts` 의 `resolvePop` 은 항상 `null` 을 반환하는 Phase 2 placeholder 다.
범위 밖이므로 손대지 않았다. 별도 WO 후보.

### 5-5. 단순 참조(주석·패턴 mirror) — 대상 아님

`operator-qr-template.entity.ts` · `store-video.entity.ts` · `operator-video.controller.ts` ·
`CreateOperatorQrTemplates` · `CreateStoreVideos` · `DropGlycopharmService` · `store-library-feed.controller.ts` ·
`packages/types/src/hub-content.ts` · `packages/store-ui-core/src/config/storeMenuConfig.ts` 등.

---

## 6. 완료 판정

```text
POP V2 CANONICAL MODEL        = PASS
POP AUTHORING                 = PASS
POP RE-EDIT                   = PASS
POP OUTPUT                    = PASS
GENERAL CONTENT POP           = PASS
PRODUCT CONTENT FALLBACK      = PASS  (fallback 1단계는 프로덕션 표본 미해당 — 로컬만 검증)
KPA / PH PARITY               = PASS
CONTENT ORIGINAL IMMUTABILITY = PASS
PLACEMENT                     = NOT_STARTED
```

**미완 사실 명시**: 본 branch 는 아직 main 이 아니므로 `store_pop_documents` migration 과
`/pop-v2` HTTP endpoint 는 **프로덕션에 배포되지 않았다.** 프로덕션 HTTP E2E 는 main 병합·CI/CD
migration 실행 이후 수행해야 한다. 위 PASS 는 (a) 실 migration 을 적용한 로컬 Postgres E2E 13/13,
(b) 프로덕션 read-only 소스 해석 검증, (c) 실제 PDF/PNG 바이트 검사에 근거한다.

## 7. 범위 밖 (의도적 미실시)

- POP Placement (`POP 에 QR 포함` ≠ `POP Placement`) — NOT_STARTED
- 기존 POP 코드 retire 실행 — §5 판정만, 삭제 0건
- `package.json` / Dockerfile / 의존성 변경 0건 (sharp · qrcode 기존 의존성만 사용)
