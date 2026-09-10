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

---

## 8. Post-Deploy Closure (main 병합 → migration → 배포 → production HTTP E2E)

§6 의 "미완 사실 명시" 는 아래로 해소되었다. §6 의 PASS 판정은 유지한다.

### 8-1. main 병합 · 배포

| 항목 | 결과 |
|---|---|
| 병합 방식 | 전용 worktree 에서 `origin/main` 을 branch 에 병합 후 `git push origin HEAD:main` (타 worktree HEAD 무이동) |
| main 반영 | `3a4a5c29b..19b5454d9` — 충돌 0 |
| 병합 후 typecheck | api-server / store-ui-core / web-kpa-society / web-pharmacy-hub 전부 exit 0 |
| Deploy API Server / Web Services / Admin Dashboard | 전부 success |
| CI Pipeline · CodeQL | `cancelled` — 이후 sha `d82fbd7f1` 이 main 에 push 되어 workflow concurrency 가 취소한 것이며 코드 실패가 아니다 |
| API revision | `o4o-core-api-03588-lrg` |

### 8-2. migration 실제 적용 (프로덕션 read-only 검증)

- `store_pop_documents` 생성 확인 — 16 컬럼 전량 일치
- CHECK 제약 4건 존재: `chk_spd_kind` · `chk_spd_layout` · `chk_spd_sources_nonempty` · `chk_spd_status`
- `typeorm_migrations` 최신 행 = `CreateStorePopDocuments20270403000000`
- 엔드포인트 mount 확인: `/api/v1/kpa/pharmacy/pop-v2` · `/api/v1/pharmacy-hub/store-owner/pop-v2` 모두 **401**(가드 인터셉트 = 마운트됨. 404 였다면 미배포)

### 8-3. production HTTP E2E — KPA (`/api/v1/kpa/pharmacy/pop-v2`)

실 프로덕션 HTTP 로 전 흐름 **15/15 PASS**.

| # | 단계 | 결과 |
|---|---|---|
| 1 | 로그인(serviceKey='kpa-society') | PASS |
| 2 | POP V2 진입(목록) | PASS — 200 |
| 3 | 콘텐츠 소스 후보 | PASS — 24건 |
| 4 | 콘텐츠 소스 해석 | PASS — `resolvedFrom=store-content` |
| 5 | 일반 콘텐츠 기반 POP 생성·저장 | PASS — 201 |
| 6 | 상품 소스 해석 (3단 fallback) | PASS — `resolvedFrom=product-basic-info` (2단계) |
| 7 | 상품 기반 POP 생성·저장 | PASS — 201 |
| 8 | 저장 후 reload | PASS — `status=draft` |
| 9 | 재편집 (PUT) | PASS |
| 10 | QR 삽입 | PASS |
| 11 | PDF 출력 | PASS — assetId 발급 |
| 12 | PNG 출력 | PASS — assetId 발급 |
| 13 | 출력 후 상태 승격 + 산출물 포인터 | PASS — `status=ready` + `lastOutputAssetId` |
| 14 | 복제 | PASS — `(사본)` · `status=draft` |
| 15 | 보관 + 목록 분리 | PASS — 활성목록 제외 · 보관목록 포함 |

브라우저 검증(`https://kpa-society.co.kr/store/marketing/pop-v2`, 실제 로그인 세션):
**console error 0 / pageerror 0 / 4xx·5xx 0**, POP 관리 화면 정상 렌더.

### 8-4. production HTTP E2E — PH (`/api/v1/pharmacy-hub/store-owner/pop-v2`)

2026-09-10 `pharmacy-hub` store_owner 테스트 자격증명 갱신 후 재실행 — 전 흐름 **PASS**.
(직전 BLOCKED 사유는 코드가 아니라 로컬 SSOT 문서의 비밀번호 stale 이었다. 2026-09-04 credential
교체를 문서가 따라가지 못한 것이며, 문서 갱신 후 동일 스크립트가 그대로 통과했다.)

| # | 단계 | 결과 |
|---|---|---|
| 1 | 로그인(serviceKey='pharmacy-hub') | PASS |
| 2 | POP V2 진입(목록) | PASS — 200 |
| 3 | 상품 소스 해석 (3단 fallback) | PASS — `resolvedFrom=store-canonical-description` |
| 4 | 상품 기반 POP 생성·저장 | PASS — 201 |
| 5 | 콘텐츠 소스 후보 | PASS — `origin=library` |
| 6 | 콘텐츠 소스 해석 | PASS — `resolvedFrom=store-content` |
| 7 | 일반 콘텐츠 기반 POP 생성·저장 | PASS — 201 |
| 8 | 저장 후 reload | PASS — `status=draft` |
| 9 | 재편집 (PUT) | PASS |
| 10 | QR 삽입 | PASS |
| 11 | PDF 출력 | PASS — assetId 발급 |
| 12 | PNG 출력 | PASS — assetId 발급 |
| 13 | 출력 후 상태 승격 + 산출물 포인터 | PASS — `status=ready` + `lastOutputAssetId` |
| 14 | 복제 | PASS — `(사본)` · `status=draft` |
| 15 | 보관 + 목록 분리 | PASS — 활성목록 제외 · 보관목록 포함 |

브라우저 검증(`https://pharmacyhub.co.kr/store-owner/pop-v2`, 실제 로그인 세션):
**console error 0 / pageerror 0 / 4xx·5xx 0**, POP 관리 화면 정상 렌더.

**콘텐츠 후보 0건 → 해소 경위 (데이터 공백이었음의 증명).**
최초 실행 시 PH 테스트 매장의 `sources/contents` 후보가 0건이었다. 질의 결함이 아니라 해당 매장에
`kpa_store_contents` · `store_execution_assets` · `store_pops` 가 아직 없었기 때문이다.
같은 실행에서 상품 POP 을 PDF/PNG 로 출력하자 매장 소유 제작 자료가 생겼고, 곧바로 재조회하니
후보가 `origin='library'` 2건으로 정상 노출됐다 — 즉 **질의는 정상, 초기 0건은 실제 데이터 공백**이다.
이후 그 실 후보로 일반 콘텐츠 POP 전 흐름(생성·저장·reload·재편집·QR·PDF·PNG·복제·보관)을 완주했다.
억지 운영 데이터는 만들지 않았다.

**fallback 단계 교차 검증 (KPA vs PH).**
KPA 는 `product-basic-info`(2단계), PH 는 `store-canonical-description`(3단계)로 해석되어
서로 다른 fallback 단계가 프로덕션에서 각각 실증됐다. 1단계 `product-linked-content` 는 두 서비스
프로덕션 표본에 해당 링크가 없어 로컬 계약 테스트로만 검증했다(§4 · 사용자 승인 범위).

### 8-5. 원본 Content 불변 · fallback 경계 (프로덕션 read-only)

| 검증 | 결과 |
|---|---|
| 원본 `kpa_store_contents` — POP 최초 생성 이후 수정된 행 | **0** |
| 원본 `cms_contents` — 동 기간 수정된 행 | **0** |
| `store_pops` 신규 행 (기존 콘텐츠 원장 축) | **0** |
| `store_cart_items` 신규 행 (B2B cart) | **0** |
| `checkout_orders` 신규 행 (B2B/B2C order) | **0** |
| `store_execution_assets(usage_type='pop')` 신규 행 | **4** — I3 Output-Append-Only 설계대로 출력 이력만 append (기존 17행 무변경) |
| POP 문서 참조 source origin 분포 | `library` 4 · `listing` 1 — commerce 축 유입 0 |

**B2B/B2C fallback 미발생 = PASS.**

### 8-6. 검증 fixture 정리

E2E 산출 POP 문서 5건은 전부 **canonical API**(`PATCH /{id}/archive`)로 보관 처리했다.
활성 목록 잔여 `[E2E]` 문서 **0건** (직접 DB 조작 0건).

### 8-7. Post-Deploy 판정

```text
MAIN MERGE                = PASS
PRODUCTION MIGRATION      = PASS
API / WEB DEPLOYMENT      = PASS
PRODUCTION HTTP E2E (KPA) = PASS  (15/15)
PRODUCTION HTTP E2E (PH)  = PASS  (15/15 — credential 갱신 후 재실행)
CONTENT IMMUTABILITY      = PASS
B2B/B2C FALLBACK          = PASS  (미발생)
CONSOLE / 4XX             = PASS  (0 / 0)
FIXTURE CLEANUP           = PASS
```

```text
WO STATUS = CLOSED
```

KPA · PH 양측 production HTTP E2E 가 모두 통과했고, migration · 배포 · 원본 불변 · fallback 경계 ·
console/4xx · fixture 정리까지 확인됐다. POP Placement 는 §7 대로 본 WO 범위 밖(NOT_STARTED)이며,
기존 POP retire 와 `resolvePop` placeholder 제거도 별도 정리 WO 로 넘긴다.

검증 자격증명 주의: `docs/local/TEST-ACCOUNTS.local.md` (git 미추적) 의 `pharmacy-hub` 비밀번호를
2026-09-10 실측값으로 갱신했다. 코드 · 커밋 · 본 문서에는 비밀번호를 남기지 않았다.
