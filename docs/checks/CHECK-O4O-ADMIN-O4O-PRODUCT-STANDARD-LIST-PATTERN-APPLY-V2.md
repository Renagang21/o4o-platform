# CHECK-O4O-ADMIN-O4O-PRODUCT-STANDARD-LIST-PATTERN-APPLY-V2

Status: 코드 완료 + typecheck/build 통과 → 프로덕션 smoke 진행 (2026-07-08)
WO: `WO-O4O-ADMIN-O4O-PRODUCT-STANDARD-LIST-PATTERN-APPLY-V2`
선행: `WO-...-STANDARD-LIST-PATTERN-V1`(ProductMasters+Candidates canonical 확정)

Scope: V1에서 확정한 표준 목록 패턴을 **나머지 4개 o4o-product-db 목록에 복사 적용**. 새 패턴/새 API/백엔드 변경 없음. 서버 페이지네이션 기존 유지. 정렬·bulk write·수정/삭제 action 없음. row action = 기존 read-only 이동 흐름만.

대상 4개:
- **DescriptionStatusPage** (설명 상태)
- **DescriptionReviewPage** (설명 검토)
- **ImageQualityPage** (이미지 품질)
- **DrugDescriptionDraftsPage** (OTC 초안)

---

## 1. 적용한 표준 패턴 (V1 복사)

| 요소 | 적용 |
| --- | --- |
| **BaseTable + O4OColumn** | raw `<table>`+로컬 Th/Td 제거 → `<BaseTable>`. 기존 셀 렌더(배지/썸네일/truncate)는 O4OColumn `render`로 이관 |
| **RowActionMenu** | `_actions`(system:'last') 컬럼. **기존 이동 링크를 그대로 액션으로 매핑**(신규 write 없음) |
| **selectable + `_select`** | `_select`(system:true) 체크박스 컬럼 + `selectedKeys:Set` + `onSelectionChange`. (V1에서 확인: BaseTable selectable은 헤더 select-all만 auto-wire, body 체크박스는 consumer `_select` 컬럼 필수) |
| **ActionBar** | 선택 시 노출(count+선택 해제+statusInfo). **actions=[]** — 일괄 write는 후속 WO |
| **서버 페이지네이션** | 기존 API/state 그대로 유지 + 표준 pagination footer(이전/다음, n/total) |
| **필터/검색/요약** | 기존 그대로 유지(설명상태·이미지 summary pill, 다중 select, 검색 제출 커밋) |
| **컬럼 상태** | `tableId` + `columnVisibility` + `persistState` |
| **Empty/Loading/Error** | emptyMessage(loading 반영) + 기존 error 배너/재시도 유지 |

### row action 매핑 (기존 이동 흐름 → RowActionMenu)
| 페이지 | onRowClick | RowActionMenu |
| --- | --- | --- |
| DescriptionStatus | masters/{masterId} | 상품 상세 / 설명 상세(review/{descId}, 조건부) / 초안 상세(drafts/{draftId}, 조건부) |
| DescriptionReview | masters/{masterId} | 상품 상세 / 큐레이션 상세(review/{id}) |
| ImageQuality | masters/{masterId} | 상품 상세 |
| DrugDescriptionDrafts | drafts/{id} | 초안 상세 |

`_select`/`_actions` 셀은 `onCellClick: () => {}` + 체크박스 `stopPropagation`으로 row 이동과 분리.

---

## 2. 의도적 미포함 (WO 준수)

- 정렬(sortable) 없음 — 서버 sort 파라미터 부재(V1과 동일 판단, 후속).
- bulk write / 수정·삭제·승격·반려 action 없음 — ActionBar 구조만.
- 새 API/백엔드/공통 컴포넌트 변경 없음. 서버 페이지네이션 API 그대로.
- URL sync: 기존에 없던 페이지에 신규 도입하지 않음(V1 Masters만 도입, 나머지는 기존 유지 — 범위 최소화). 설명/이미지/초안은 summary·filter state 기반.

---

## 3. 검증

| 항목 | 결과 |
| --- | --- |
| admin-dashboard typecheck | **에러 0** (`tsc --noEmit`) |
| admin-dashboard build | **EXIT 0** (`vite build`, 4개 페이지 청크 정상 생성) |
| 변경 파일 | 4개 (DescriptionStatus/DescriptionReview/ImageQuality/DrugDescriptionDrafts) — API/백엔드/공통 컴포넌트 무변경 |
| DB write | **0** (GET-only 유지) |
| 프로덕션 브라우저 smoke | 진행 (배포 후) |

---

## 4. 완료 기준 / 후속

- 4개 목록 BaseTable 표준화 + row action + 체크박스/ActionBar 구조: 코드 완료.
- **본 WO 완료 시 admin.neture.co.kr O4O 상품관리 목록 표준화 = 6/6 완료** (Masters·Candidates[V1] + 설명상태·설명검토·이미지·초안[V2]).
- 남는 후속(별도 WO): 서버 정렬(API sortBy/sortOrder), 목록 bulk write 액션(백엔드 bulk 엔드포인트).
