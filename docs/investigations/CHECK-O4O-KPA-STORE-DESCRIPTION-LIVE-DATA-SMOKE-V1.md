# CHECK-O4O-KPA-STORE-DESCRIPTION-LIVE-DATA-SMOKE-V1

**WO:** WO-O4O-KPA-STORE-DESCRIPTION-LIVE-DATA-SMOKE-V1
**선행:** WO-O4O-KPA-STORE-HANDLED-PRODUCT-DESCRIPTION-USAGE-POLICY-FIX-V1 (commit `766d6baa2`)
**일자:** 2026-07-10 · **환경:** 프로덕션 (kpa-society-web / o4o-core-api) · **계정:** 체험용 약국 경영자(renagang21@gmail.com)

## 목적

`/store/handled-products` 의 `매장용 상세설명 보기` 를 **실제 매장용(STORE) 상세설명서가 있는 제품**으로 운영 환경에서 검증한다. (선행 WO smoke 에서는 test 매장 3개 listing 에 STORE 설명서가 없어 empty state 만 확인)

## 조사 (read-only, cloud-sql-proxy)

- `shared_product_descriptions` 中 `description_type='STORE'` **status 분포: canonical 21,092 / candidate 254**. → "STORE 데이터 없음"은 오판이었음(test 매장 3 listing 의 master 에만 없었던 것).
- 최근(2026-07-09) 등록 STORE 설명서 다수 확인. `<table>` 포함 설명서도 존재.

## 검증 대상

| 항목 | 값 |
|------|-----|
| 제품명 | 파비스비타민씨정(아스코르빈산) |
| ProductMaster id | `06c2baed-b533-498c-b8bb-3f858a31e595` |
| barcode | `8806218004401` |
| STORE 상세설명서 id | `126bcc98-c509-4e87-bd89-2b0bd45ce485` (STORE / canonical / ko / 848자 / `<p>`+`<table>` 포함) |
| 테스트용 생성 listing | `3e921ba5-d25c-4d2e-89eb-6556619ba11d` (org `9c87f46b-57a1-4afe-80bd-60782c49ce96`, is_active=t, created 2026-07-10) |

## 절차

1. 기존 UI `O4O 표준 상품에서 추가` 모달에서 barcode `8806218004401` 검색 → 단일 매칭(파비스비타민씨정) `등록`.
2. `/store/handled-products` 에서 해당 제품 선택 → ActionBar `매장용 상세설명 보기` 실행.

## 결과 — PASS

- **제목**: "파비스비타민씨정(아스코르빈산)" 정상.
- **본문 HTML 렌더**: 요약("괴혈병 예방·비타민 C 보급") + `<p>` 문단(효능·효과 / 복용 안내 / 주의 대상) + **`<table>` 12셀(항목/내용) 정상 렌더**. (`hasTable=true`, `tableCells=12`, `hasP=true`)
- **이미지**: 이 설명서엔 `<img>` 없음(대상 설명서 특성). 표/문단으로 HTML 렌더 검증 충족.
- **읽기 전용**: 모달 내 편집 요소 0 (`inputs/textarea=0`), `닫기` 만 존재.
- **복사 없음(DB 확인)**: 뷰 실행 전후 모두
  - `kpa_store_contents.generatedBy='o4o-b2c-import'` = **0**
  - `kpa_store_content_product_links(master_id=06c2baed…)` = **0**
  - `kpa_store_contents.source_metadata.masterId=06c2baed…` = **0**
  → `kpa_store_contents` 생성/링크 생성 전혀 없음. 순수 조회.
- **콘솔 오류**: 뷰어 플로우에서 앱 오류 0. (전역 배경 `GET api/v1/auth/me` 401 토큰 프로브만 — 모든 페이지 공통, 본 변경과 무관)

## 부수 발견 (범위 외)

- `/store/my-products`(공유 `@o4o/store-products-ui` `StoreProductsManagerPage`) 직접 접속 시 **`TypeError: Cannot read properties of null (reading 'primaryImage')` → ErrorBoundary 전체 화면 오류**. 원인 = DataTable 에 **null row** 유입(컬럼 render 의 `row.primaryImage` 접근 시 `row` 자체가 null).
- 이는 선행 WO item 6/7 이 지목한 "관리 → /store/my-products 잘못된 진입점/오류"의 실체이며, **진입점 제거(선행 WO)로 사용자 노출 경로가 사라진 것이 올바른 처리**였음을 확인.
- `/store/my-products` 라우트/화면 수정은 **선행·본 WO 범위 외**(공유 패키지). 별도 WO 대상.

## 정리(cleanup)

- 검증용 생성 listing `3e921ba5-…`(파비스비타민씨정)은 실제 활용 제품이 아님.
- `/store/my-products`(유일한 listing 관리 UI)가 위 null 오류로 크래시 → **UI 로 비활성/삭제 불가**.
- 소프트 비활성/삭제는 DB write → CLAUDE.md §0 상 사용자 승인 필요. 체험용 매장은 "예고 없이 초기화"되는 공용 데모라 잔존 영향 낮음. **승인 시 `UPDATE organization_product_listings SET is_active=false WHERE id='3e921ba5-…'` 로 정리 예정.**
