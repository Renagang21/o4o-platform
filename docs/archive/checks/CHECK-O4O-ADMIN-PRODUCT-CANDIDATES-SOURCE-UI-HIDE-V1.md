# CHECK — 상품 후보 화면 source UI 비노출

**WO:** WO-O4O-ADMIN-PRODUCT-CANDIDATES-SOURCE-UI-HIDE-V1
**Date:** 2026-07-09
**Status:** 구현 완료 · 타입체크 PASS
**성격:** 프론트엔드 UI 정리 (데이터 구조 변경 아님)

---

## 1. 목표

`admin.neture.co.kr/admin/o4o-product-db/candidates` 후보 목록 화면에서
데이터 원천(source) 관련 UI를 제거한다. source는 운영자 기본 관리 업무의 판단 기준이 아니므로 화면에 노출하지 않는다.

> **핵심 원칙: source는 삭제하지 않고 숨긴다.**
> source(sourceType/sourceLabel)는 **데이터 이력으로 DB·API·백엔드에 그대로 보존**하되, **운영 화면에서는 비노출** 처리한다.

---

## 2. 변경 내역 (Frontend only)

파일: `apps/admin-dashboard/src/pages/o4o-product-db/ProductCandidatesPage.tsx`

| # | 제거 대상 | 내용 |
|---|-----------|------|
| 1 | source 필터 select | `전체 source` + supplier_web/pharmacy_web/store_web/mobile_draft/csv_import/xlsx_import/operator_import/external_api/unknown 옵션 제거 |
| 2 | source_label 입력 + presets | `source_label` datalist 입력(MFDS_* 프리셋) 제거 |
| 3 | source 테이블 컬럼 | 목록의 `source` 컬럼(sourceType + sourceLabel 배지) 제거 |
| 4 | 내부 enum 노출 | `SOURCE_TYPE_OPTIONS`, `SOURCE_LABEL_PRESETS` 상수 제거 |
| 5 | 상태/쿼리 | `sourceType`, `sourceLabel`, `sourceLabelInput` state 제거. `load()`·URL sync 에서 source 파라미터 미전송 → 기존 URL 에 남아도 replace 시 자동 제거 |

**보존:** 검색(상품명/업체명/식별번호), 상태 필터(groupedStatus: 등록 전/등록 완료/제외), 분류·식별자·상태·매칭 컬럼, 선택 일괄작업(archive/ignore/manual_review), 서버 페이지네이션, 충돌 드로어.

---

## 3. 미변경 (금지 사항 준수)

- ✅ 백엔드 API 수정 **없음** — `listProductCandidates` 는 sourceType/sourceLabel 파라미터를 계속 지원(호환 유지), 프론트가 전송만 안 함
- ✅ `product_candidates.source*` 컬럼/Entity/DTO/Service **무변경**
- ✅ DB / migration **없음**
- ✅ import / promotion / cleanup / audit 로직 **무변경**
- ✅ 공공데이터/외부 API 유입 이력 **보존** (source 값은 DB 그대로)
- ✅ API 타입(`ProductCandidateRow.sourceType/sourceLabel`)·params(`sourceType/sourceLabel`) 시그니처 유지

---

## 4. 검증

| 항목 | 결과 |
|------|------|
| admin-dashboard `tsc --noEmit` | **PASS (exit 0)** |
| 파일 내 live source 참조 sweep | 0 (주석/문서만 잔존) |
| 후보 조회·검색·상태필터·페이지네이션 로직 | 보존(파라미터에서 source 만 제외) |

### 배포 후 화면 검증(대기)

1. `/admin/o4o-product-db/candidates` 에 source 필터·source_label 입력·source 컬럼 미노출
2. supplier_web/pharmacy_web/store_web/mobile_draft/csv_import/xlsx_import/operator_import/external_api/unknown 값 화면 비노출
3. 검색·상태(등록 전/등록 완료/제외) 필터·페이지네이션 정상 동작
4. 기존 후보 목록 조회 정상

---

## 5. 결론

**source는 데이터 이력으로 보존하되, 운영 화면에서는 비노출 처리했다.**
후보 화면의 기본 관리 기준은 검색 / 상태(등록 흐름) / 상품군 / 등록 여부 중심으로 유지된다.
