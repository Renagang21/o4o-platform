# WO-O4O-PRODUCT-QR-CONTENT-FLOW-MINIMAL-V1

> 성격: **핸드오프 전용 작업요청서** (본 문서 = 계획·근거. 실행 착수는 별도 명시 지시 필요)
> 목표: **신규 QR 엔진 생성이 아니라, 기존 구조를 활용해 "상품 기준 다국어 QR 콘텐츠 생성·연결 동선"만 추가**
> 상위 근거: `IR-O4O-PRODUCT-TO-QR-FLOW-AUDIT-V1` (축 3) + `IR-O4O-KPA-QR-MULTILINGUAL-LANGUAGE-OPTION-AUDIT-V1` (2026-06-25)
> 작성: 2026-07-09 · Status: Draft (실행 전)

---

## 0. 한 줄 요약

사용자가 원하는 "상품에 한국어/중국어 QR 판매 콘텐츠를 각각 붙이고 QR까지 등록"은 **저장·다국어·공개 랜딩이 이미 구현된 시스템(`store_multilingual_product_content_groups`/`_pages`)으로 대부분 해결된다.** 빠진 것은 **(1) 상품 화면에서 이 시스템으로 진입하는 동선, (2) QR ↔ 다국어 그룹 연결** 두 가지이며, 둘 다 **대체로 프론트 작업 + 기존 API 재사용**으로 가능하다.

---

## 1. 조사로 확정된 사실 (WO 전제)

### 1-1. 저장소 — 이미 존재, 재사용
`store_multilingual_product_content_groups` + `store_multilingual_product_content_pages`
- **상품 기준 연결**: group `target_kind`(listing/local) + `target_id` → ProductMaster 기반 listing 또는 매장 local 상품.
- **언어별 독립 콘텐츠**: page `(group_id, locale)` unique. `locale ∈ ko|en|zh|ja|vi|th|id` → 한국어/중국어 **각각 독립 row(독립 버전)**.
- **HTML 저장**: page `content_format='html'` + `content` jsonb.
- **QR/공개 랜딩**: group `public_key`(지연 발급) → `/api/v1/kpa/public/multilingual-product-contents/:publicKey?locale=`. published locale만 노출·언어 탭·fallback(요청→en→default→ko) **이미 구현**.
- **소유 경계**: `organization_id`(매장 소유). ⇒ "상품 기준 + 매장 소유" 동시 충족.
- 엔티티 주석 명시: "정규화된 제품 스펙/성분 설명서가 아니라 **자유 마케팅 콘텐츠**" — 사용자의 "표준 성분 설명서가 아닌 매장 QR 판매 콘텐츠"와 정확히 일치.

### 1-2. shared_product_descriptions 는 부적합 (여기 넣지 말 것)
공용·master 소유·`(master_id, description_type)` canonical 1개 제약·`organizationId` 부재. **특정 매장의 QR 판매 콘텐츠를 담을 수 없음.** 아쿠아셀 콘텐츠를 여기에 넣는 것은 금지.

### 1-3. QR 저장 구조 = A안(동적 생성)
`store_qr_codes` 는 `slug`/`landing_type`/`landing_target_id` 등 **메타데이터만** 저장. QR 이미지는 `qr-print.service.ts` 가 **요청 시 온디맨드 생성**(DB 비저장, F12 불변식 ④). ⇒ **"QR-code 등록" = `store_qr_codes` row 생성 + slug + landingType + landingTargetId 연결.** QR 이미지 파일을 media_assets 등에 새로 저장할 필요 **없음**(섹션 6 질문 A/B 중 **A** 확정).

### 1-4. QR ↔ 다국어 그룹 연결은 현재 미배선
- QR `landingType='page'` 는 단일 언어 `kpa_contents` 만 연다(다국어 필드 없음).
- 선행 IR 권장안(**안 1**): QR `landingType='link'` + `landingTargetId = ${origin}/multilingual-products/:publicKey`. publicKey 발급 엔드포인트(`POST /pharmacy/multilingual-product-contents/:groupId/public-key`) **이미 존재**. **백엔드 변경 0, migration 0, 프론트 위주.**

### 1-5. 상품 화면 → 다국어 콘텐츠 진입 동선 현황
- `StoreLocalProductsPage` 편집 모달: 다국어 콘텐츠가 이미 연결된 경우에만 `MultilingualPublicActions`(QR 보기 포함) 노출 — **부분 존재**.
- `StoreHandledProductsPage`(O4O listing) / admin `ProductMasterDetailPage`: **진입 동선 없음**.

---

## 2. 범위 (In Scope) — **개정 2026-07-09 (구현 착수 결정 반영)**

> 구현 착수 전 배선 매핑 결과, 매장(store)에는 다국어 page(한/중)를 직접 작성하는 편집기·API가 없고 운영자(operator) 전용임이 확인됨. 사용자 결정(§4-B): **매장 직접 저작 편집기를 신규**한다. 따라서 범위가 "프론트 연결만"에서 "**매장 저작 편집기 + 매장 스코프 백엔드 엔드포인트 신설**"로 확장됨. 단 **엔티티·테이블은 그대로(migration 0)**, 로직은 기존 operator 컨트롤러/서비스를 매장 스코프로 미러링한다.

1. **매장 저작 다국어 편집기 신규** — `store_created` 그룹 생성 + 한국어/중국어 page 작성(HTML). 기존 `OperatorMultilingualContentWritePage` 를 store 스코프로 이식.
2. **매장 스코프 백엔드 엔드포인트 신설** — store `createGroup`(target_kind/target_id 바인딩 + `source_type='store_created'`) / `upsertPage(groupId, locale)` / `publishGroup`. 기존 operator 서비스 로직 재사용 + `organizationId` 소유 가드. 신규 테이블 없음.
3. **상품 화면 진입 CTA** — 취급상품(`StoreHandledProductsPage`, listing/local) 행에서 해당 상품 다국어 편집기 진입 + 요약 배지(`StoreLocalProductsPage` 참조 이식). `sourceType`(listing/local) → `targetKind` 직결.
4. **QR = 다국어 그룹 publicKey QR** (§4-C 결정) — `MultilingualPublicActions`(`ensureMlcPublicKey` → `getMlcQr`) 재사용. **store_qr_codes row 미생성.** 공개 경로 = **`/multilingual-products/:publicKey`**.
5. 신규 상품이면 먼저 상품 생성(취급상품/로컬) 후 그 id로 target 지정.
6. `neture.co.kr/r/{resourceId}` 경로 **사용 금지**(미구현).

---

## 3. 재사용 인벤토리 (신규 생성 최소화)

| 필요 기능 | 기존 자산 | 신규 필요? |
|------|------|:---:|
| 상품별 다국어 콘텐츠 저장 (엔티티/테이블) | `store_multilingual_product_content_groups/pages` | ❌ 재사용 (migration 0) |
| 한/중 HTML 별도 저장 | page `(group_id, locale)` + `content_format='html'` | ❌ 재사용 |
| 공개/QR 랜딩 (언어 탭·fallback) | `/multilingual-products/:publicKey` + `MultilingualProductPublicLandingPage` (`App.tsx:1084`) | ❌ 재사용 |
| publicKey 발급 + QR SVG | `ensureMlcPublicKey` + `getMlcQr` (`MultilingualPublicActions`) | ❌ 재사용 |
| 다국어 저작 서비스 로직 | operator 컨트롤러/서비스(`createGroup`/`upsertPage`/`publish`) | ♻️ 매장 스코프로 **미러링** |
| 매장 스코프 저작 엔드포인트 | (없음 — store API엔 import/summary/ensureKey/getQr만) | ⚠️ **신설** (organizationId 가드) |
| 매장 저작 편집기 화면 | `OperatorMultilingualContentWritePage`(operator 전용) | ⚠️ store 스코프로 **이식** |
| 상품 화면 진입 CTA + 배지 | `StoreLocalProductsPage`(getMlcSummaryMap→summary.groupId→PublicActions) | ♻️ `StoreHandledProductsPage`로 **이식**(listing+local 2 kind) |

---

## 4. QR 개수 정책 — **B-1 확정** (2026-07-09)

**결정: B-1 = 하나의 QR + 언어 탭.** (사용자 확정)

- QR **1개** → `landingType='link'` + `landingTargetId = ${origin}/multilingual-products/:publicKey`.
- publicKey 랜딩(`MultilingualProductPublicLandingPage`)이 published locale(한/중)을 **언어 탭으로 자동 노출**. 단일 언어면 탭 없이 바로 표시, 없는 언어는 fallback.
- `store_qr_codes` 에 lang 컬럼 없음과 완전 정합. **신규 스키마·migration 0.**
- 아쿠아셀 적용: 한 상품(그룹)에 한국어 page + 중국어 page 저장 → **QR 1개 발급** → 스캔 시 언어 탭.

> (참고) 대안 B-2(언어별 QR 2개, `?locale=` 링크)는 미채택. 향후 인쇄물을 언어별로 분리 배포할 필요가 생기면 같은 publicKey에 `?locale=` 를 붙인 추가 QR을 스키마 변경 없이 발급하는 방식으로 병행 가능(별도 판단).

## 4-B. 저작 주체 — **매장 직접 저작 확정** (2026-07-09)
**결정: 매장이 상품 화면에서 한/중 HTML을 직접 작성**(store_created 그룹). 운영자 저작→매장 가져오기 모델은 미채택. ⇒ 매장 스코프 저작 편집기·엔드포인트 신설(범위 §2 개정 참조). 신규 테이블 없음.

## 4-C. QR 등록 형태 — **다국어 그룹 publicKey QR 확정** (2026-07-09)
**결정: 다국어 그룹의 publicKey QR(`MultilingualPublicActions`)을 그대로 사용.** `store_qr_codes` row 미생성(중복 방지). 상품 화면에서 QR 보기/URL 복사/인쇄. **공개 경로 = `/multilingual-products/:publicKey`** (`/qr/{slug}` 아님 — 이 QR 형태는 다국어 전용 랜딩을 씀).

---

## 5. 금지 사항 (Guard)

- ❌ 신규 QR 엔진 생성 (기존 `getMlcQr` SVG 생성 재사용)
- ❌ 신규 저장소/테이블 생성 — 기존 `store_multilingual_product_content_*` 재사용 (**migration 0 필수**)
- ❌ 상품 원본 데이터 임의 변경
- ❌ 기존 설명서(`shared_product_descriptions`) 덮어쓰기 / 여기에 QR 판매 콘텐츠 저장
- ❌ `kpa_contents` 다국어화(선행 IR 비권장)
- ❌ `/r/{resourceId}` 경로 사용
- ⚠️ 백엔드 신설은 **매장 스코프 저작 엔드포인트로 한정**(operator 로직 미러 + organizationId 가드). 그 외 core/공통 계약 변경 금지.

---

## 6. 완료 기준 (사용자 §7 체크리스트 대응)

- [ ] 매장이 상품 화면에서 다국어 그룹 생성 가능 (target_kind + target_id, `source_type='store_created'`)
- [ ] 한국어/중국어 HTML page 분리 저작·저장·publish 가능 (page 2 row, `content_format='html'`)
- [ ] QR = 다국어 그룹 publicKey QR (상품당 1개, 언어 탭 랜딩)
- [ ] **`/multilingual-products/:publicKey`** 로 접근·모바일 렌더 확인 (한/중 탭)
- [ ] 상품 관리 화면(취급상품)에서 배지·QR 확인 가능
- [ ] 기존 상품 데이터·분류를 임의 변경하지 않음
- [ ] migration 0 (스키마 변경 없음)
- [ ] smoke: 선행 IR §5 시나리오(단일 언어 바로 표시 / 한·중 탭 / 없는 언어 fallback)

---

## 7. 후속

본 WO 완료 후 → `WO-O4O-STORE-OWN-PRODUCT-QR-CONTENT-AQUACELLE-OMEGA3-APPLY-V1` (아쿠아셀 알티지 오메가-3 The Pure 실제 콘텐츠 등록). 그 전까지 아쿠아셀 등록은 **보류**.

---

## 8. 핵심 코드 참조

| 위치 | 파일:라인 |
|------|------|
| 다국어 그룹 엔티티 (target_kind/target_id/public_key) | `apps/api-server/src/routes/platform/entities/store-multilingual-product-content-group.entity.ts` |
| 다국어 페이지 엔티티 ((group,locale) unique·html) | `apps/api-server/src/routes/platform/entities/store-multilingual-product-content-page.entity.ts` |
| 공개 랜딩 API (published locale·fallback) | `apps/api-server/src/routes/o4o-store/controllers/multilingual-product-content.controller.ts:188-265` |
| publicKey 발급 | `multilingual-product-content.controller.ts:417-501` |
| 공개 랜딩 UI (언어 탭 >1) | `services/web-kpa-society/src/pages/public/MultilingualProductPublicLandingPage.tsx:231-250` |
| QR 생성 API | `apps/api-server/src/routes/o4o-store/controllers/store-qr-landing.controller.ts:762` |
| QR 온디맨드 생성 (비저장) | `apps/api-server/src/services/qr-print.service.ts:8` |
| 상품 화면 (진입 CTA 추가 대상) | `services/web-kpa-society/src/pages/pharmacy/StoreHandledProductsPage.tsx` |
