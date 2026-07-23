# CHECK — WO-O4O-OTC-ORAL-MULTI-INGREDIENT-KO-EN-CONTINUOUS-PRODUCTION-GA-V5 종료 기록

- **작성**: 2026-07-23, 에이전트 가 (GA)
- **판정**: **PASS — 종료임계 달성 (신규 70 fp그룹 / 431 master ≥ 기준 40그룹 AND 400 master)**

## 1. 범위

미처리 경구 복합성분 OTC 그룹을 batch(10그룹) 단위로 선정하여 KO 저작 → canonical apply → EN 저작 → canonical apply까지 완결하는 연속 생산. 파이프라인은 V3/V4와 동일한 `otc-oral-combo-store-leaflet-runner.ga.ts` (이중게이트: `--apply` + `OTC_COMBO_LEAFLET_{KO|EN}_CONFIRM=YES`) 재사용.

## 2. 산출 (V5 누적)

| batch | 그룹 | master | commit |
|---|---|---|---|
| batch5 | 10 | 87 | (V5 초기) |
| batch6 | 10 | 60 | — |
| batch7 | 10 | 60 | — |
| batch8 | 10 | 60 | — |
| batch9 | 10 | 60 | 965dce186 |
| batch10 | 10 | 54 | 4c1d8c99c |
| batch11 | 10 | 50 | e2ba104f0 |
| **계** | **70** | **431** | KO+EN 전부 canonical LIVE |

batch11 그룹: 마이파워정 / 맥셀디정 / 신일겔정(A02AH→`mfds_drug_otc`) / 동성비오틴정 / 맥타정 / 파워비큐정 / 임팩타민시그니처정 / 메가트루파워정 / 액티브큐텐연질캡슐 / 비타비스정 (각 5 master).

## 3. 게이트 실행 기록 (batch마다 동일 절차)

1. `git pull origin main` → claim 교집합 0 확인 → claim CLAIMED commit·push (저작 전)
2. easy 원문(`spd.content`, `mfds_easy_drug` STORE canonical) 고정 — 전 그룹 easy≥1·distinct=1
3. KO 저작(grounding 원문 한정, "의사 또는 약사"→"약사", 저장방법 제외) → KO dry PASS → KO apply APPLIED
4. KO 독립검증(verify-ko): authored=n / easyDep=n / easyCan=0 / dup=0 / audit=n — ALL OK
5. KO no-op 재실행 → ALREADY_COMPLETE
6. EN 저작(수치보존 체크리스트) → merge-en 게이트(한글0·필수필드·수치보존) → EN dry ×2 byte-identical → EN apply APPLIED
7. EN 독립검증(verify-post-en): groups PASS 10/10 · en canonical = batch master 수
8. EN no-op → ALREADY_COMPLETE → claim DONE → path-specific commit·push

batch11 검증 수치: KO dry 10/10 PASS · KO apply 10/10 APPLIED · verify-ko ALL OK(각 그룹 authored=5, easyDep=5, easyCan=0, dup=0, audit=5) · KO no-op 10/10 · EN dry×2 byte-identical 10/10 · EN apply 10/10 · verify-post-en 10/10(en canonical 50) · EN no-op 10/10.

## 4. HOLD / 이상

- V5 신규 HOLD 없음. drift 0 · dup 0 · 검증 실패 0.
- 잔여 미처리 경구 복합성분 후보: **43그룹** (batch11 선정 시점 53 − 10). 재시작 지점: claim 파일(`otc-production-claim.ga.json`) 교집합 제외 후 잔여 풀에서 다음 batch12 선정.

## 5. 함정 메모 (후속 에이전트용)

- SP env는 반드시 forward-slash 형태로 매 호출 export (`export SP="C:/Users/..."`).
- easy 원문 컬럼은 `spd.content` (content_json 아님).
- EN 파일 스키마는 `{wo,batch,en:{fp:{groupKey(KO key 정확 일치),...}}}` — 배열 금지.
- config `groups`는 fp-keyed map. sourceType: A11/A12/A13/B03AE→`mfds_drug_otc_nutrition_combo`, A02/A05/A09→`mfds_drug_otc`.
- DB 비밀번호는 `$SP/dbp.txt` → env 전달 전용 (commit 금지).
