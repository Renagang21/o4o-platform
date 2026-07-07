# CHECK-O4O-DRUG-OTC-DESCRIPTION-NUTRITION-COMBO-ADMIN-REVIEW-SMOKE-V1

- WO: `WO-O4O-DRUG-OTC-DESCRIPTION-NUTRITION-COMBO-ADMIN-REVIEW-SMOKE-V1`
- 선행: `...DRAFT-DB-APPLY-V1` (run_id `otc-nutrition-combo-draft-v1`, 23건 적재)
- 작성일: 2026-07-07
- 작업 유형: **admin 검토 화면 read-only smoke** (승인/수정/승격 없음)
- DB write: **0**
- 결론: 적재 23건이 admin 검토 목록/상세 경로에서 **정상 조회·렌더 가능** 확인. 제외 대상(보류 2 + 약사검토 10) **미노출**. **minor 1건**: 목록의 `spdMasters` 컬럼 공백(값 위치 불일치, 화면 무손상) → 후속 revise 권고.

---

## 1. 검증 방식

프로덕션 DB는 방화벽으로 직접 HTTP 인증 호출이 제약되므로, **admin 컨트롤러/서비스가 실제 실행하는 파라미터라이즈드 SQL을 그대로 재현**하여 검증했다(CLAUDE.md §8 허용: API 쿼리 경로 정적 분석 + read-only SQL). 화면 최종 렌더 확인은 아래 엔드포인트/페이지로 사람이 브라우저 검증 가능하다.

| 구성 | 경로 |
|---|---|
| 목록 API | `GET /api/v1/admin/product-candidate-description-drafts` (`listForAdmin`) |
| 상세 API | `GET /api/v1/admin/product-candidate-description-drafts/:id` (`getByIdForAdmin`) |
| Admin 화면 | `apps/admin-dashboard/src/pages/o4o-product-db/DrugDescriptionDraftsPage.tsx` (기본 `sourceLabel=MFDS_DRUG_OTC`) |
| 권한 | platform/neture/glycopharm/cosmetics/kpa-society의 admin·operator (read-only 컨트롤러, mutation 없음) |

재현 필터 = 컨트롤러 목록 쿼리와 동일: `source_label='MFDS_DRUG_OTC' AND seed_json->>'applyRunId'='otc-nutrition-combo-draft-v1' AND review_status='needs_review'`.

---

## 2. 검증 결과

### A. 목록 조회 (listForAdmin COUNT)
- 필터 결과 **total = 23** ✅ (적재 23건 전부 목록 노출)

### B. 목록 행 렌더 (컨트롤러 SELECT 컬럼)
- 23행 모두 `title` / `groupKey`(source_identifier_value) / `verdict`=`INSERT_nutrition_review` / `masterTotal` / `otc` / `manufacturers` / `efficacyPreview` **정상 출력**.
- 예: `종합비타민 정제 — 비타민 B군·C·D·E + 아연 (비타민A·철 없음)` (a11jc::noA-noFe::tablet, masterTotal 709, mfr 73, efficacyPreview 정상).
- ⚠ **minor**: 목록 컬럼 `spdMasters`가 **공백**. 목록 쿼리는 `seed_json->'groupScope'->>'spdMasters'`를 읽는데, 적재 시 `spdMasters`를 `seed_json->'grounding'->>'spdMasters'`에 저장함(§4 발견). 상세·grounding에는 정상 존재.

### C. 필드 무결성 (렌더 필수 필드 NULL/깨짐 검사, 23건)
| null_title | null_efficacy | bad_content | bad_seed | bad_guard | null_verdict | null_bodyMarkdown |
|--:|--:|--:|--:|--:|--:|--:|
| 0 | 0 | 0 | 0 | 0 | 0 | 0 |
- content_json/seed_json/guard_result 전부 유효 JSON object, 렌더 깨짐 **0** ✅

### D. 상세 조회 (getByIdForAdmin)
- 표본 1건(비오틴 5mg, id `78bea136…`): `content_json` object, `summaryTable`·`bodyMarkdown`·`caution`·`groupScope`·`verdict` 키 **전부 존재**, `review_status=needs_review` ✅

### E. 제외 대상 미노출 (run 내)
| 비타민C 보류(500·100mg) | 철분/엽산(b03) | Fe 포함 변형 |
|--:|--:|--:|
| 0 | 0 | 0 |
- needs_pharmacist_review 10 + 보류 2 는 애초 미적재 → 목록에 **섞이지 않음** ✅

### F. admin 기본 스코프 상태 분포
- `source_label=MFDS_DRUG_OTC` 전체 = **95건 전부 `needs_review`** (기존 72 + 신규 23). 승인/반려 없이 검토 대기 상태 유지 ✅

---

## 3. 완료 기준 점검

| 완료 기준 | 결과 |
|---|---|
| DB 기준 23건 존재 | ✅ 23 |
| admin 목록 조회 | ✅ 23 (컨트롤러 쿼리 재현) |
| 상세 조회 | ✅ 필드 전체 존재 |
| 제외 대상 미노출 | ✅ 0 |
| DB write 0 | ✅ SELECT only |

---

## 4. 발견 (minor, 비차단)

**목록 `spdMasters` 컬럼 공백** — 적재 seed_json 구조에서 `spdMasters`를 `grounding.spdMasters`에만 두고 `groupScope.spdMasters`에는 두지 않음. 기존 72건은 양쪽 모두 보유하여 목록에 값이 표시된다. 영향: **화면 무손상**(컬럼만 빈값), `masterTotal`/`otc`/`manufacturers`는 정상. 상세·guard(`groundingEasyDrug`)에도 grounding 수치 존재.

- 조치: 이번 WO는 write 금지 → **수정하지 않음**. 후속 revise 배치에서 `seed_json.groupScope.spdMasters` 보강 권고(1회 UPDATE 또는 재적재 시 반영). 검토·승인 판단에는 영향 없음(상세에서 grounding 확인 가능).

---

## 5. 금지사항 준수 확인

| 항목 | 상태 |
|---|---|
| 승인/반려 | ✅ 없음 |
| canonical 승격 | ✅ 없음 |
| draft 수정 | ✅ 없음 |
| DB write | ✅ 0 (SELECT only) |
| shared_product_descriptions 변경 | ✅ 없음 |
| 매장 콘텐츠/QR/POP/태블릿 연결 | ✅ 없음 |

---

## 6. 완료 보고

```
완료 보고 — WO-O4O-DRUG-OTC-DESCRIPTION-NUTRITION-COMBO-ADMIN-REVIEW-SMOKE-V1

결과:
- DB target: 23 존재
- admin list visible: 23 (source_label=MFDS_DRUG_OTC · applyRunId · needs_review 필터)
- detail open: OK (content_json/seed_json/guard_result 전체 필드 무손상)
- excluded visible: 0 (보류 2 + 약사검토 10 미노출)
- DB write: 0
- minor: 목록 spdMasters 컬럼 공백(grounding에만 저장) — 화면 무손상, 후속 revise 권고
```

---

## 부록. 재현 쿼리 개요

- 목록: `product-candidate-description-draft.service.ts::listForAdmin` SELECT를 동일 필터로 재현.
- 상세: `getByIdForAdmin` SELECT 재현(키 존재 검사).
- 세션 스크래치패드 `v1_admin.sql`. 영속 테이블 무변경(DB write 0).
