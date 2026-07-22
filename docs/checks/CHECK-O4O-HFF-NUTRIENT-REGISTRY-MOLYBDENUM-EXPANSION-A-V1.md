# CHECK — HFF 영양소 registry 확장(몰리브덴) 및 후보 해금 (Agent A)

- 성격: registry 확장 + 회귀검증 + 해금 후보 생산 시도. 코드 변경 = `hff-nutrient-registry.ts` 1파일.
- 대상 원료: 크롬 · 몰리브덴 · 요오드 (SELECT_FAIL 유발 후보 해금 목적).

## 1. 원료별 registry 추가 내용

| 원료 | 기존 상태 | 조치 |
|------|:---:|------|
| **크롬** | **이미 완비** | NUTRIENT_META(`chromium`) + INGREDIENT_FN(`체내 당질 대사에 필요`) + EN 매핑 존재 → 변경 없음 |
| **요오드** | **이미 완비** | NUTRIENT_META(`iodine`) + INGREDIENT_FN(갑상선 호르몬 합성·에너지 생성·신경발달) + EN 매핑 존재 → 변경 없음 |
| **몰리브덴** | **전면 누락** | 신규 추가 (아래) |

### 몰리브덴 추가 (3곳 + 정규화 1)
- **공식 기능성(grounded)**: `산화·환원 효소의 활성에 필요` — 실제 제품 MAIN_FNCTN 60건에서 확정(예: `[몰리브덴] 산화·환원 효소의 활성에 필요`). **LLM 추정 아님**.
- `NUTRIENT_META['몰리브덴']` = {slug:`molybdenum`, displayKo:`몰리브덴`, displayEn:`Molybdenum`}.
- `INGREDIENT_FN['몰리브덴']` = [`산화·환원 효소의 활성에 필요`] (fnBelongsTo 귀속용).
- `RAW_MAP` EN: `Needed for the activity of oxidation-reduction (redox) enzymes` (기존 "Needed for …" 프레임 유지).
- **normFn 보강**: 중점 변이 `･`(U+FF65)·`・`(U+30FB)·`‧` 를 strip 세트에 추가 — 원문에 `산화·환원`/`산화 ･ 환원` 혼재 → 정규화 일치. 기존 항목은 전부 `·`(이미 strip) 사용이라 **무영향**.

## 2. 회귀검증 — 무영향 확인

| 항목 | 결과 |
|------|------|
| 몰리브덴 combo select | **metaOf throw 제거**(SELECT_FAIL 0, 이전 32) |
| 셀레늄+아연 재실행 | ELIGIBLE **32**(확장 전과 동일) — normFn/registry 변경 무회귀 |
| 컴파일 | 정상(select 실행 성공) |

## 3. 해금 후보 생산 시도 (shard 0, 몰리브덴 32 signature)

| 결과 | 수 |
|------|:-:|
| SELECT_FAIL | **0** (이전 32 → 전부 해소) |
| **READY(APPLIED)** | **0** |
| DROP(elig<4, grounding HOLD) | 32 |
| GATE_FAIL / REVIEW_LATER | 0 / 0 |

- 몰리브덴 함유 signature는 **전부 대형 종합비타민(N10~21)**. 미승격 잔여는 select 엄격검증에서 **grounding HOLD**(예 20원료 종합비타민 mention 10 → grounding 10). 우량 제품은 선행 생산 소진, 잔여는 원문 basis 결함 편중.
- **분류 해금은 성공**(throw 제거)이나 **현시점 clean producible 0**. 향후 미소진 데이터·타 shard의 몰리브덴 조합은 이제 생산 경로 진입 가능(registry 영구 자산).

## 4. DB 영향

- 생산 0 → **DB write 0 · canonicalDup 0 · 기존 LIVE drift 0**. totalComboLive 무변경(내 기여 0).

## 5. 보고 요약

```text
registry 추가: 몰리브덴(NUTRIENT_META+INGREDIENT_FN+EN, 공식 기능성 grounded '산화·환원 효소의 활성에 필요') + normFn 중점변이 보강. 크롬·요오드 기완비(무변경)
해금 signature: 몰리브덴 함유 32 (SELECT_FAIL 32→0)
READY 0 · REVIEW_LATER 0 · DROP 32(grounding HOLD)
생산 완료 0 · DB write 0 · canonicalDup 0 · LIVE drift 0
회귀: 셀레늄+아연 ELIGIBLE 32 불변(무회귀)
최종 totalComboLive: 무변경
```

- **중지 조건 무해당**: 공식 기능성 근거 확정(원문 grounded) · 오귀속 0(normFn 변경 기존 무영향) · 다수 오분류 0 · canonical/rollback 정상 · LIVE drift 0.
- **결론**: registry 확장은 정확·안전하게 완료(SELECT_FAIL 근절), 단 몰리브덴 함유 대형 종합비타민은 미승격 잔여가 grounding 결함이라 즉시 생산 대상 0. registry는 영구 자산으로 잔존.

*read-only 검증 + 코드 변경(registry) 1파일. 생산 apply 0(clean 후보 부재).*
