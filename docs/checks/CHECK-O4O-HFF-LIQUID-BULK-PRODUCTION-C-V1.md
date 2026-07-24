# CHECK — HFF 액상·용기분할 대량 생산 shard-2 (Agent C) V1

- WO: `WO-O4O-HFF-LIQUID-BULK-PRODUCTION-C-V1` · 자동승인 계약 [`...AUTO-AUTHORIZATION-CONTRACT-V1`](../work-orders/WO-O4O-HFF-CONTENT-PRODUCTION-AUTO-AUTHORIZATION-CONTRACT-V1.md).
- 담당 shard: **`stableHash(statementNo) % 3 == 2`** (FNV-1a, 3에이전트 공통 stmt-shard). 정본 해시 = `hff-combo-shard-plan.ts:24`.
- 대상: 기존 solid selector(nutrient/sf)가 **전량 제외**하던 액상·젤·앰플·병·포·스틱 제형의 **단일 기능성** 후보.
- 성격: **공용 parser/registry/composer/Guard/apply 무수정** — C 전용 selector·passfilter 2종만 신설. 기존 composeNutrient+Guard+apply 재사용.
- 시작 `2026-07-25 07:15 +0900` · 종료 단일 세션. 채널 Cloud SQL Proxy 5449(자체 OAuth 토큰). 동기화 HEAD=origin/main `19c966e08`(behind 0).

## 0. 결론

> **shard-2 신규 LIVE = 60** (단일 기능성 액상·용기분할). **DB write 240 rows**(각 4). dry-run→apply COMMIT→**독립검증 PASS**.
> canonicalDup 0 · statementNo 중복 0 · BLOCKED target 0 · expected=actual · 기존 LIVE drift 0 · A/B 교집합 0(stmt-shard).
> **총량↔원료량 분리 강제**: 원료 표시량 value 단위 = mg/g/μg(총 내용량 mL·g 아님), 기준량 basisUnit 은 mL·g 허용. mL-value 원료(총량 오인) = HOLD(0건 발생).

## 1. Census (shard-2 not-taken 9,280)

| 항목 | 수 |
|---|--:|
| 액상·용기분할 제형 | 2,347 |
| 단일 composable 기능성 | 306 |
| 다원료(combo 대상, 본 배치 외) | 502 |
| **ELIGIBLE(단일·serving명확·grounded)** | 162 |
| HOLD: 원료표시량 미검출(총량만/미등록) | 1,539 |
| HOLD: 기능성 EN 미매핑 | 110 |
| HOLD: 1회/1일 섭취 불명확 | 31 · BULK 3 |

- 원료 분포(single): 식이섬유 88·아연 65·비타민D 26·프로폴리스 21·MSM 18·… · serving 형태: 포 115·병 22·mL 18·방울 6.

## 2. Guard 분리 → PASS-only apply

- ELIGIBLE 162 → composeNutrient+Guard 전수 → **PASS 60 · REVIEW 99 · BLOCKED 3**.
- **REVIEW 자동 apply 제외**(WO "불명확 HOLD"): 주원인 `PRE-SRC-BASIS-UNVERIFIABLE-003` 93(WARNING·"사람이 원문 확정" — mL 기준량 원문 자동검증 실패). `hff-combo-c-categorize.ts:19` REVIEW_LATER 관례 준수. E-NAME-DERIVED-GROUNDED-002 8·MISMATCH 3.
- **적용 = PASS 60** (basisUnit g 56·mg 4 — mL 기준량 원료는 전량 REVIEW_LATER 로 분리). 형태: 포 53·병 2·방울 4·캡슐 1. 원료: 식이섬유 31·아연 11·MSM 3·테아닌 3·비타민D 2·프로폴리스 2·옥타코사놀 2·가르시니아/셀레늄/마그네슘/글루코사민/엽산/밀크씨슬 각 1.
- serving 명확성 실측: unitsPerServing>0·servingsPerDay>0 전수(bad 0). 예: "1일 3회 5방울", "1일 1회 1포에 식이섬유 5g(표시 기준 15g당)".

## 3. Apply 게이트 (PASS 60)

| 단계 | 결과 |
|---|---|
| dry-run | postVerifyPass ✓ · expectedWrites 240 · skipped 0 · canonicalDup 0 |
| apply | COMMIT · masters 60 · canonicalDup 0 · postVerifyPass ✓ |
| 독립검증 | masters60·spdKo60·spdEn60·candLinked60·sourceHff120 · **independentVerifyPass ✓** |

- 계약: status=canonical·description_type=STORE·source_type=o4o_hff_generated·barcode NULL·candidate=approved_new_master. rollback manifest 1종. 자기 manifest ID drift 0.
- 설명서: 원료 공식 기능성 verbatim, 질환·증상·전문표현 순화 0, 원문밖 치료·예방 클레임 0, 전문가 상담 footer, EN 충실 번역.

## 4. HOLD 상위 원인 / 남은 후보

- **HOLD_NO_COMPOSABLE_SPEC 1,539**: 총 내용량만 표기·미등록 원료(레지스트리 외). 원료량 미검출 → 생산 불가(추정 금지).
- **REVIEW_LATER 99(mL 기준량 자동검증 실패)**: 원료 표시량은 원문 spec 라인에서 grounded 이나 Guard parseBasis 가 mL 기준량 재검증 불가 → 사람 확정 필요. 공용 parser mL 지원 별도 WO 전까지 HOLD.
- **다원료 액상 502**: combo 트랙(mL 기준량 동일 이슈) — 본 단일 배치 외.
- **EN 미매핑 110 · serving 불명확 31 · BULK 3**: 개별 HOLD.
- 안전(PASS) 단일 기능성 액상 후보 **소진**(60 전량 apply). 재개 조건: 공용 Guard/parser mL 기준량 검증 지원 · combo-액상 트랙.

## 5. 전체 중지 조건 점검

ProductMaster 오연결 0 · 기능성 오귀속/누락 0 · canonical/rollback 실패 0 · write 불일치 0 · 기존 LIVE drift 0 · 독립검증 실패 0 · 총량↔원료량 혼동 0 → **중지 사유 없음**.

## 6. 산출물 (C 전용, 공용 무수정)

- 신규 도구: `apps/api-server/src/scripts/hff-liquid-c-select.ts`(액상 단일 기능성 selector, 총량/원료량 분리·serving 명확성 게이트) · `hff-liquid-c-passfilter.ts`(Guard PASS 분리). tsc 오류 0.
- 재사용(무편집): hff-nutrient-generate/store-canonical-apply(composeNutrient+Guard+apply) · hff-combo-c-independent-verify.
- data: `docs/checks/data/product-description-guard/hff-liquid-bulk-c/` — target-liquid-pass · rollback-manifest · liquid-census · review-hold · select-holds-summary.
- 본 문서.

## 7. 재생산 (mL 기준량 하드닝 후 — 2026-07-25)

- 선행: 공용 parser/Guard mL 기준량 검증 commit `72d78afc9`([`CHECK-...-ML-BASIS-HARDENING-V1`](CHECK-O4O-HFF-SOURCE-PARSER-ML-BASIS-HARDENING-V1.md)). 이전 REVIEW_LATER(mL 기준량 자동검증 실패) 해소.
- fresh not-taken shard-2(9,220, 기존 60 제외) 재선정 → pool 102 → **Guard PASS 90**(전량 mL 기준량) → generate 90.
- dry-run→apply COMMIT: masters 90 · **DB write 360** · canonicalDup 0 · skipped 0 · postVerifyPass ✓.
- 독립검증: masters90·spdKo90·spdEn90·candLinked90·sourceHff180 · **independentVerifyPass ✓**.
- 총량↔원료량 분리 유지(예: 식이섬유 4.2g / 표시 기준 500mL당). manifest `hff-liq2-s2c-apply-rollback-manifest.json`.
- **액상 shard-2 누적 LIVE = 150** (60 고형기준 + 90 mL기준). 잔여 12 held(genuine MISMATCH/UNVERIFIABLE).

---

*stmt-shard 2 · 액상·용기분할 단일 기능성 · PASS-only · 신규 LIVE 60+90=150 · 총량↔원료량 분리 · 독립검증 PASS · A/B 교집합 0. mL 재생산은 parser/Guard commit 72d78afc9 기준.*
