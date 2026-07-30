# CHECK-O4O-HFF-KO-SKIPPED-EXISTING-2451-FUNCTION-CANONICAL-BACKFILL-V1

> WO: `WO-O4O-HFF-KO-SKIPPED-EXISTING-2451-FUNCTION-CANONICAL-BACKFILL-V1`
> Base commit: `0fd8cb626` (직전 WO = CREATED 5,269 backfill)
> 실행일: 2026-07-30 · 환경: 프로덕션 `o4o-platform-db` / `o4o_platform`
> 결과: **APPLIED · 13건 LIVE 반영 · 독립검증 PASS · 사후 corpus 감사 PASS**

---

## 1. 결론

V2 전수 감사에서 `SKIPPED_EXISTING` 안전 후보로 분류된 2,451건을 **기존 생성 출처와 renderer
family 를 보존한 상태로** 재검증했다. 자동 안전 적용이 가능한 것은 **13건**이며, 이 13건에만
공식 기능성 절을 **삽입 전용**으로 보완했다. 나머지는 DB write 없이 분리했다.

| 판정 | 건수 | 처리 |
|------|---:|------|
| `NO_CHANGE` — 공식 기능성 이미 전량 반영 | 2,232 | 변경 없음 |
| `SAFE_APPLY` — 안전 삽입 대상 | **13** | **LIVE 반영** |
| `HUMAN_REVIEW` — 원료 대응·절 경계 불명확 | 138 | 사람 검토 분리 (write 0) |
| `UNSUPPORTED_STRUCTURE` — 기능성 섹션 부재 | 68 | 구조 어댑터 필요 (write 0) |
| 합계 | 2,451 | |

§28 은 "안전 적용 대상이 2,451보다 적음 / 사람 검토 대상 발생" 을 **중지 사유가 아님**으로
명시한다. 기존 구조를 보존하며 삽입할 수 없는 제품은 자동 UPDATE 하지 않고 분리했다.

---

## 2. 반영 내역 (13건 전수)

모두 COMPOSITE family. 삽입 15개, 총 증가 **588 byte**.

| 제품명 | mode | 삽입 | +byte |
|--------|------|---:|---:|
| 웨이크 뉴로(WAKE NEURO) | PER_INGREDIENT `[비타민 E]` | 1 | 40 |
| jw중외제약 치아튼튼 인사프로 | PER_INGREDIENT `[비타민 C]` | 1 | 40 |
| 인사튼튼 덴탈케어 | PER_INGREDIENT `[비타민 C]` | 1 | 40 |
| 키클래오042 | FLAT (홍삼 lane `sd-fn`) | 1 | 29 |
| 메타그린 젤리 더블컷 | FLAT | 1 | 33 |
| 스몰윈도우 마디프리놀 골드 | FLAT | 1 | 40 |
| 프리미엄 초록입홍합오일 | FLAT | 1 | 40 |
| 웰스루테인지아잔틴 | PER_INGREDIENT `[비타민 E]` | 1 | 40 |
| 오큐시안 멀티 | PER_INGREDIENT `[비타민 E]` | 1 | 40 |
| 스템플렉스 캡슐 | PER_INGREDIENT `[비타민 C]`·`[비타민 E]` | 2 | 80 |
| 레스플렉스 캡슐 | PER_INGREDIENT `[비타민 C]`·`[비타민 E]` | 2 | 80 |
| 웰러스 바른 핏 가르시니아 | PER_INGREDIENT `[가르시니아캄보지아 추출물]` | 1 | 46 |
| 초임계 루테인 아스타잔틴 | PER_INGREDIENT `[비타민 E]` | 1 | 40 |

변경 컬럼은 `content`, `updated_at` 뿐이다. `master_id` / `description_type` / `language` /
`status` / `source_type` / `source_ref_id` / `created_at` 은 전부 불변임을 DB 실측으로 확인했다.

---

## 3. 안전 계약 (§2·§6·§14)

허용된 변경은 **기존 canonical 내부 기능성 표현의 제한 보완**뿐이며, 구현은 전용 최소 모듈
[hff-ko-function-family-preserving-patch.mjs](../../apps/api-server/src/scripts/hff-ko-function-family-preserving-patch.mjs)
로 한정했다. 공용 renderer·CSS 는 수정하지 않았다.

- **삽입 전용(additive-only)**: after 에서 삽입 문자열을 원본 offset 에서 제거하면 before 와
  **byte 동일**해야 한다. 이 증명을 patch 시점과 반영 후 DB 실측 양쪽에서 재수행했다.
- 전후 동일 확인 항목(§6, 대상 13건 전수 · 불변식 20종):
  제품명 / 섭취방법 / 섭취 시 참고사항 / 기준·규격 / footer / **기능성 섹션을 제거한 나머지
  전문 byte 동일** / h2 순서 / class 집합 / 카드 순서 / source metadata.
- 금지 사항 준수: DRIVER HTML 전면 교체 0 / renderer family 변경 0 / 카드 구조 평면화 0 /
  신규 INSERT 0 / DELETE 0 / 전체 문자열 재생성 0 / 외부 LLM 생성 문구 0 / 영문 단독 절 0.
- §13 준수: COMPOSITE 에 DRIVER 기준(기능성 전용 h2 등) 을 강제하지 않았다.

### 자동 적용 차단 가드 (사람 검토로 분리한 사유)

| 사유 | 건수 |
|------|---:|
| `NO_FUNCTIONAL_SECTION` (기능성 섹션 자체 없음) | 68 |
| `INSERT_CLAUSE_MULTI_CLAUSE_SEGMENT` (절 경계 결합) | 38 |
| `INGREDIENT_CARD_NOT_FOUND` | 33 |
| `MISSING_CLAUSE_WITHOUT_INGREDIENT_LABEL` | 26 |
| `INSERT_CLAUSE_LEADING_PUNCTUATION` | 10 |
| `FLAT_LIST_WITH_MULTIPLE_OFFICIAL_INGREDIENTS` | 9 |
| `INSERT_CLAUSE_NO_FUNCTION_PREDICATE` | 6 |
| `MULTIPLE_FUNCTIONAL_SECTIONS` | 5 |
| `FLAT_LIST_WITH_MULTIPLE_OFFICIAL_CLAUSE_GROUPS` | 4 |
| `PARTIAL_DUPLICATION_RISK` | 4 |
| `INSERT_CLAUSE_CARRIES_INLINE_LABEL` | 3 |
| `DUPLICATE_INSERT_TEXT` | 1 |
| 합계 | 206 |

---

## 4. 검증 과정에서 확정한 사실

1. **V2 manifest 의 `beforeContentHash`/`proposedContentHash` 는 DRIVER 렌더 해시**이며 DB
   content 해시가 아니다(2,451/2,451 양쪽 불일치). 따라서 `proposedContentHash` 는 patch
   payload 로 쓸 수 없고, apply WHERE 절 기준은 **DB 실측 baseline** 으로 확정했다.
2. **거짓 누락 3종**을 커버리지 판정에서 제거했다 — ① 쉼표로 결합된 공식 절(기존 렌더는 개별
   `<li>` 로 분해 저장) ② 대괄호 고시·제조방법 주석만 없는 경우 ③ 반각 가운뎃점 `･`(U+FF65).
   보정 전에는 이 3종에서 **중복 삽입**이 발생했을 것이다.
3. **원료 혼입 위험 차단** — `EPA및DHA함유유지 : …` 처럼 선두 원료 라벨을 품은 절이 루테인
   카드에 삽입되려는 사례를 `INSERT_CLAUSE_CARRIES_INLINE_LABEL` 로 차단했다.
4. **라벨 없는 다중 영양성분 원문** — 세그먼터는 무라벨 블록을 하나로 평탄화하므로, 공식 원문의
   열거 재시작(`①`/`(1)`) 횟수를 그룹 경계 신호로 삼아 평면 목록 삽입을 차단했다
   (`FLAT_LIST_WITH_MULTIPLE_OFFICIAL_CLAUSE_GROUPS`). 이 가드로 SAFE 16 → 13 이 되었고,
   콜라겐 제품 2건에 7~10개 절을 무귀속 삽입하려던 계획이 제거되었다.
5. **관측 사항(결함 아님)** — 반영된 13건 중 9건은 기존 항목의 상위 표현(예: 기존
   `유해산소로부터 세포를 보호하는데 필요` + 공식 `항산화 작용을 하여 유해산소로부터 세포를
   보호하는데 필요`) 이 함께 표시된다. §27 은 공식 기능성 반복을 실패로 계산하지 않으며, 삽입
   문구는 전부 공식 원문 내 verbatim 이다.

---

## 5. 게이트 결과

| 게이트 | 결과 | 근거 산출물 |
|--------|------|------------|
| §9~§11 대상·family·출처 실측 (2,451 / DRIVER 15 · COMPOSITE 2,436 / UNKNOWN 0) | PASS | `-preapply-verification-v1.json` · `-renderer-family-audit-v1.json` · `-source-metadata-audit-v1.json` |
| §15 fixture 26 + 삽입 가드 단위검증 8 | PASS 26/26 · 8/8 | `-fixture-results-v1.json` |
| §12·§13 function diff (baseline drift 0 · render failure 0) | PASS | `-function-diff-v1.json` · `-safe-targets-v1.json` · `-review-targets-v1.json` |
| §18·§20 변경범위·표본 수기검증 (SAFE 13 전수 + 대조 64, 불변식 위반 0) | PASS | `-quality-samples-v1.json` |
| §19 전체 41,261 보호 회귀 (교집합 CREATED-5269 / 검토-3652 / HOLD-348 = 0, DB write 0) | PASS | `-full-regression-v1.json` |
| §20 실브라우저 렌더 430·820·1280 (before/after 비교, 위반 0 · console error 0) | PASS | `-render-audit-v1.json` |
| §21~§23 교집합 + rollback manifest + apply gate | APPLY_APPROVED | `-apply-gate-v1.json` · `-rollback-manifest-v1.json` |
| §24·§25 dry-run → LIVE 제한 UPDATE 13/13 | APPLIED | `-apply-results-v1.json` |
| §26 독립 검증 (DB 실측만 사용, 실패 0 · canonicalDup 0) | PASS | `-independent-verification-v1.json` |
| §27 전체 corpus 사후 감사 (변경 13 · 예상 외 변경 0 · row 40,913 불변 · byte +588) | PASS | `-post-corpus-audit-v1.json` |

렌더 검증 CSS 는 `packages/content-editor/src/components/ContentRenderer.tsx` 의
`storeDescriptionCss` 를 **원문 그대로 추출**해 사용했다(공용 CSS 수정 0).

---

## 6. Rollback

[hff-ko-skipped-existing-2451-rollback-manifest-v1.json](../../apps/api-server/src/scripts/data/hff-ko-skipped-existing-2451-rollback-manifest-v1.json)
의 각 항목은 apply 직전 DB content 전문(`rollbackContent`) 과 사후 해시(`afterContentHash`) 를
함께 보유한다. 원상복구는 manifest 대상에 한해 다음 형태로만 수행한다.

```sql
UPDATE shared_product_descriptions
SET content = :rollbackContent, updated_at = now()
WHERE id = :canonicalId AND md5(content) = md5(:afterContent);
```

manifest 밖 행에 대한 write 는 금지한다.

---

## 7. 산출물

`apps/api-server/src/scripts/data/hff-ko-skipped-existing-2451-*` (14종 + apply-gate + 렌더 입력 HTML)

영구 스크립트:

- [hff-ko-function-family-preserving-patch.mjs](../../apps/api-server/src/scripts/hff-ko-function-family-preserving-patch.mjs) — §14 family 보존 patch 모듈 (HFF 전용)
- [hff-ko-skipped-existing-2451-fixture-check.mjs](../../apps/api-server/src/scripts/hff-ko-skipped-existing-2451-fixture-check.mjs)
- [hff-ko-skipped-existing-2451-function-diff.mjs](../../apps/api-server/src/scripts/hff-ko-skipped-existing-2451-function-diff.mjs)
- [hff-ko-skipped-existing-2451-quality-samples.mjs](../../apps/api-server/src/scripts/hff-ko-skipped-existing-2451-quality-samples.mjs)
- [hff-ko-skipped-existing-2451-full-regression.mjs](../../apps/api-server/src/scripts/hff-ko-skipped-existing-2451-full-regression.mjs)
- [hff-ko-skipped-existing-2451-render-audit.mjs](../../apps/api-server/src/scripts/hff-ko-skipped-existing-2451-render-audit.mjs)
- [hff-ko-skipped-existing-2451-apply-gate.mjs](../../apps/api-server/src/scripts/hff-ko-skipped-existing-2451-apply-gate.mjs)
- [hff-ko-skipped-existing-2451-apply.mjs](../../apps/api-server/src/scripts/hff-ko-skipped-existing-2451-apply.mjs)
- [hff-ko-skipped-existing-2451-independent-verify.mjs](../../apps/api-server/src/scripts/hff-ko-skipped-existing-2451-independent-verify.mjs)

---

## 8. 후속 대상 (이번 WO 범위 외)

- 사람 검토 138건 — 원료 대응·절 경계 판단이 필요한 기능성 보완.
- 구조 어댑터 68건 — 기능성 섹션이 없는 기존 canonical. 구조 신설은 별도 WO 필요.
- V2 사람 검토 3,652건 / HOLD 348건 — 이번 WO 에서 손대지 않았다(교집합 0 확인).
