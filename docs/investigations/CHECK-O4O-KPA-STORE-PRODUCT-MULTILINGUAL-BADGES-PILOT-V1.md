# CHECK-O4O-KPA-STORE-PRODUCT-MULTILINGUAL-BADGES-PILOT-V1

WO: **WO-O4O-KPA-STORE-PRODUCT-MULTILINGUAL-BADGES-PILOT-V1**
작업 제목: KPA 매장 상품 다국어 콘텐츠 연결 상태 배지 파일럿

## 1. 목적

QR 랜딩 전 단계로, store-owner 가 매장 상품 목록/상세에서 해당 상품에
store-scoped 다국어 콘텐츠가 연결되어 있는지(지원 언어 수/목록)를 눈으로 확인할 수 있게 한다.
콘텐츠 제작/가져오기 기능 확장이 아니라 **관찰성(observability)** 작업이다.

## 2. 조사 결과 (선행 구조)

- 엔티티: `store_multilingual_product_content_groups` / `store_multilingual_product_content_pages`
  - 핵심 컬럼: `target_kind`(local|listing), `target_id`, `content_key`(default), `status`, `source_type`, locale별 page
- 기존 store-owner API: `/api/v1/kpa/pharmacy/multilingual-product-contents` (+ `/hub`, `/import`, `/:groupId/resolve`)
  - 컨트롤러: `apps/api-server/src/routes/o4o-store/controllers/multilingual-product-content.controller.ts`
  - 기존 목록 GET 은 **단일 targetId** 필터만 지원 → 목록 배지에 그대로 쓰면 **N+1** 발생
- 프론트 (web-kpa-society):
  - 매장 취급 상품(local): `pages/pharmacy/StoreLocalProductsPage.tsx` (BaseTable), targetId = `store_local_products.id`
  - O4O 주문 가능 상품(listing): `pages/pharmacy/PharmacyB2BPage.tsx` (DataTable), targetId = `organization_product_listings.id`(=listingId)
  - Store Hub 가져오기 UI 이미 존재: `/store-hub/multilingual-product-contents` (HubMultilingualContentLibraryPage) + `/my`

## 3. 문제 확정 / 결정

목록 화면에서 상품별 배지를 N+1 없이 표시하려면 집계 API 가 필요하다.
→ 공유 컨트롤러에 **org-scoped summary 엔드포인트 1개**를 최소 추가한다.

```
GET /pharmacy/multilingual-product-contents/summary?targetKind=local|listing
→ { success, data: [{ groupId, targetKind, targetId, title, status, sourceType,
                       defaultLocale, updatedAt, locales[], localeCount, publishedLocaleCount }] }
```

- `content_key='default'` 한정, `status<>'archived'` 만 집계 (V1 범위)
- 컨트롤러는 kpa/cosmetics/glycopharm 공통이므로 GP/KCos backend 에도 동일 라우트가 생기지만
  **프론트에서 호출하는 곳은 web-kpa-society 뿐** → GP/KCos UX 무변경 (Shared Module 정책 준수: KPA-only 포크 대신 공통 엔드포인트 추가)

## 4. 변경 파일

### Backend (1)
- `apps/api-server/src/routes/o4o-store/controllers/multilingual-product-content.controller.ts`
  - `/summary` GET 엔드포인트 추가 (메인 목록 GET 직후, `/hub` 앞). 정적 경로라 `:groupId` 라우트와 무충돌.

### Frontend (web-kpa-society, 4)
- `src/api/multilingualProductContentStore.ts` — `StoreMlcSummaryItem` 타입 + `getMlcSummaryMap(targetKind)` 추가
- `src/components/MultilingualContentBadge.tsx` — 신규 공용 배지 컴포넌트 (`localeLabel` export)
- `src/pages/pharmacy/StoreLocalProductsPage.tsx` — summary 조회 + "다국어" 컬럼 + 편집 모달 상세 패널(연결/빈상태 Store Hub 링크)
- `src/pages/pharmacy/PharmacyB2BPage.tsx` — summary 조회 + "다국어" 컬럼

연결 없는 상품: 목록은 배지 미표시(과도 표시 방지), 상세(모달)는 안내 문구 + Store Hub 링크.
QR 관련 문구 미사용 (후속 단계 안내만 약하게 표기).

## 5. 검증

### 5.1 정적 검증
- web-kpa-society `tsc --noEmit`: **error 0**
- api-server `tsc --noEmit`: **error 0**

### 5.2 배포 후 브라우저 smoke (2026-06-22, kpa-society.co.kr, 체험용 약국 경영자 계정)
배포: Deploy Web + Deploy API Cloud Run 모두 success.

| # | 항목 | 결과 |
|---|------|------|
| 1 | store-owner 로그인 | ✅ (체험 계정 "테스트 약국 매장") |
| 2 | 매장 취급 상품 목록 진입 | ✅ 렌더 정상 (상품 0개 — 빈 상태) |
| 3 | local 다국어 배지(데이터) | ⚠️ 데이터 0 — 검증 불가, 빈 상태 정상 |
| 4 | 연결 없는 상품 배지 미표시 | ✅ 빈 목록 자연 처리 |
| 5 | 편집 모달 연결 정보 패널 | ⚠️ 상품 0개 — 모달 대상 없음 |
| 6 | 빈 상태 Store Hub 링크 | ⚠️ 모달 미검증 / Store Hub route 자체 정상 |
| 7 | O4O 주문 가능 상품 목록 진입 | ✅ 렌더 정상 (상품 0개) |
| 8 | listing 다국어 배지(데이터) | ⚠️ 데이터 0 — 검증 불가 |
| 9 | 기존 Store Hub 다국어 route | ✅ 정상 ("매장 HUB 다국어 상품 콘텐츠" 렌더) |
| 10 | console error | ✅ 0 (로그인 전 auth/me 401 1건은 benign) |
| 11 | 관련 4xx/5xx | ✅ 0 — `summary?targetKind=local` 200, `summary?targetKind=listing` 200 |

**판정: 회귀/관찰성 PASS.** 신규 summary API 정상 배포·200 응답, 빈 상태 정상, 콘솔/네트워크 클린.

### 5.3 데이터 표시 smoke (2026-06-22, 테스트 데이터 생성 승인 후 — [PILOT] prefix)
운영자(sohae2100=kpa:admin) → store-owner(체험 약국 경영자=renagang21, 실제 password `3Lz157727791!`) 2계정 UI 흐름으로 실제 연결 데이터를 만들어 표시 경로 검증.

생성·연결 흐름:
1. 운영자: `[PILOT] 다국어 배지 스모크 콘텐츠` 그룹 생성 → ko/en 페이지 발행 → 그룹 발행(HUB 노출)
2. store-owner: `[PILOT] 다국어 배지 테스트 상품`(매장 취급 상품=local) 1건 등록
3. Store Hub `/store-hub/multilingual-product-contents` → 가져오기 → local 상품에 연결 (store-scoped 초안 복사)

| # | 항목 | 결과 |
|---|------|------|
| 1 | 목록 "다국어" 컬럼 배지 표시 | ✅ **"다국어 2 · en · ko"** (tooltip "다국어 콘텐츠 · 언어 2개 (en · ko)") |
| 2 | 편집 모달 연결 정보 패널 | ✅ 배지 + 제목 + **"운영자 자료 복사"**(sourceType=operator_hub) + "작성 중 · 2026.6.22" + English/한국어 + "QR/타블렛 후속 안내" |
| 3 | summary API 필드 | ✅ 200 — `localeCount=2`, `locales=[en,ko]`, `publishedLocaleCount=0`(가져온 초안), `sourceType=operator_hub`, `status=draft` |
| 4 | console error | ✅ 0 |
| 5 | 관련 4xx/5xx | ✅ 0 (앱 요청 전부 200) |
| 6 | archived 제외 필터 재확인 | ✅ store 그룹 archived 후 summary `data:[]` (0건) |

**판정: 데이터 표시 경로 PASS.** 목록 배지·모달 상세·summary 필드 모두 실데이터로 정상 동작.

### 5.4 테스트 데이터 정리 (물리 삭제 없음)
- store-scoped 그룹 → `PATCH status=archived` (200, summary 0건 확인)
- 매장 취급 상품 → UI 비활성화 (목록 0건)
- 운영자 그룹 → UI 보관(archived) 처리 (HUB 비노출)

> 참고: `docs/local/TEST-ACCOUNTS.local.md` 의 KPA 약국 경영자 password 가 실제와 불일치(`seochuran1!` → 실제 체험계정 `3Lz157727791!`). 별도 갱신 권장.

## 6. 최종 판정

**WO-O4O-KPA-STORE-PRODUCT-MULTILINGUAL-BADGES-PILOT-V1 → CLOSED / PASS**
- 정적 검증 PASS · 회귀/관찰성 PASS · 데이터 표시 경로 PASS (실데이터 검증 완료)
- 성공 기준 1~7 모두 충족, GP/KCos 무변경, QR 미노출, 테스트 데이터 정리 완료

## 7. 후속

WO-O4O-MULTILINGUAL-PRODUCT-QR-LANDING-V1 → TABLET-CONTENT → CROSS-SERVICE-ADOPTION
