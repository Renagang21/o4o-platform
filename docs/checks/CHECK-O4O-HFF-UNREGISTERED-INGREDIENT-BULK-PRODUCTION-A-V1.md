# CHECK-O4O-HFF-UNREGISTERED-INGREDIENT-BULK-PRODUCTION-A-V1

> WO: `WO-O4O-HFF-UNREGISTERED-INGREDIENT-BULK-PRODUCTION-A-V1` (에이전트 A)
> 상태: **CLOSED / PASS** — 안전 후보 소진
> 일자: 2026-07-24

## 1. 범위

미생산 건강기능식품 중 **실제 기능성 원료가 공식 원문에 명확하지만 공용 registry 에 없어 생산되지 않은**
후보를 제품 단위로 KO+EN STORE canonical 설명서까지 생산.

- shard: `stableHash(STTEMNT_NO) % 3 === 0` (shard 0) — B/C 충돌 회피 축. 외부 조회·수정 없음.
- 미선점: `matched_product_master_id IS NULL` · STORE canonical `o4o_hff_generated` SPD 없음 ·
  `mfds_permit_number` 기보유 master 없음.
- 규모: shard 0 후보 **13,743** 중 선점·기승격 4,822 를 제외한 **8,921 건이 평가 대상**
  (= 생산 433 + noUiIng skip 553 + HOLD 7,935).
- 직전 [`CHECK-O4O-HFF-MULTI-INGREDIENT-BULK-PRODUCTION-A-V1`](CHECK-O4O-HFF-MULTI-INGREDIENT-BULK-PRODUCTION-A-V1.md)
  의 최대 잔여 원인이 `LABEL_UNMAPPED` 2,179 였고, 그 실체가 **원료 라벨 미해석**(기능성 문장 문제가 아님)
  이었으므로 본 WO 는 **A 전용 additive 원료 매핑**으로 그 구간만 개방한다.

## 2. 산출 (LIVE)

| 배치 tag | 제품 | DB write |
|---|---:|---:|
| `batch:ui-a-0` | 250 | 1,000 |
| `batch:ui-a-1` | 183 | 732 |
| **합계** | **433** | **1,732** |

DB write 내역 = `product_masters` INSERT 433 · `product_candidates` UPDATE 433(`approved_new_master`) ·
`shared_product_descriptions` INSERT 866(ko 433 + en 433 · `description_type='STORE'` ·
`status='canonical'` · `source_type='o4o_hff_generated'`).

### 확인한 신규 원료 · 원료별 생산량

공식 원문(주된 기능성 라벨 + 기준·규격)에서 원료명·기능성·표시 근거를 확인한 **48 종**을 A 전용 매핑에 등록했고,
그중 shard 0 에서 실제 생산된 원료는 다음 18 종이다.

| 원료 | 제품 | 원료 | 제품 |
|---|---:|---|---:|
| 철 | 127 | 키토산 | 6 |
| 바나바잎추출물 | 86 | 오메가-3 지방산 함유 유지 | 5 |
| 홍삼 | 62 | 인삼 | 5 |
| 히알루론산 | 54 | 락토페린 | 3 |
| 홍국 | 42 | 스피루리나 | 2 |
| 헤마토코쿠스 추출물 | 33 | 그린커피빈추출물 | 2 |
| 포스파티딜세린 | 26 | 저분자콜라겐펩타이드 | 2 |
| 콜레우스포스콜리추출물 | 21 | 아프리카망고종자추출물 | 2 |
| | | 표고버섯균사체 | 1 |
| | | 프로바이오틱스 | 1 |

(합계 > 433 — 한 제품이 신규 원료를 2종 이상 포함할 수 있다.)

매핑 등록 48 종 전체: 프로바이오틱스 · 철 · 홍삼 · 인삼 · 히알루론산 · 바나바잎추출물 · 쏘팔메토열매추출물 ·
포스파티딜세린 · 홍경천추출물 · 헤마토코쿠스추출물 · 홍국 · 폴리감마글루탐산 · 회화나무열매추출물 · 단백질 ·
대두이소플라본 · 알로에겔 · 콜레우스포스콜리추출물 · 감마오리자놀 · 감마리놀렌산 · 공액리놀레산 · 락토페린 ·
크레아틴 · 저분자콜라겐펩타이드 · 곤약감자추출물 · 그린커피빈추출물 · 돌외잎추출물 · 토마토추출물 · 키토산 ·
빌베리추출물 · 나토배양물 · 자일로올리고당 · 초록입홍합추출오일 · 유단백가수분해물 · 미숙여주추출물 ·
모로오렌지추출물 · 유산균발효굴추출물 · HK표고버섯균사체 · 아쉬아간다추출물 · 스피루리나 · 클로렐라 ·
구아바잎추출물 · 달맞이꽃종자유 · 칼륨 · 오메가-3지방산함유유지 · 스페인감초추출물 ·
아프리카망고종자추출물 · 시서스추출물 외.

### 구조·원료 수 분포

구조 형식별: `bracket` 328 · `bracket1` 61 · `numbered` 31 · `colon` 13.

원료 수별: 1원료 61 · 2원료 90 · 3원료 54 · 4원료 50 · 5원료 32 · 6원료 22 · 7원료 21 · 8~14원료 59 ·
15~22원료 44.

## 3. 파이프라인

```
hff-ui-a-build.ts   (신규·A 전용) 미등록 원료 additive 매핑 + 라벨 충실 파서 + 함수기반 카드 → target JSON
        ↓ (무수정 재사용)
hff-source-parse.ts(classify·normalizeSpecText·splitFunctions) · hff-sf-registry.ts ·
hff-nutrient-registry.ts · hff-sf-c-en-overlay.ts · content-guard(runGuard) ·
source-grounding-parser(parseServing·normalizeSource) · hff-sf-apply.ts(dry-run/apply/rollback manifest)
        ↓
hff-nb-a-verify.ts  (기존·A 전용) rollback manifest ID 기준 독립검증 — `--tagPrefix batch:ui-a-` 로 재사용
```

공용 parser·registry·composer·apply 는 **한 줄도 수정하지 않았다.** 매핑은 빌더 내부 `UI_MAP` 에만 존재한다.

## 4. 직전 WO 대비 확장 3가지

1. **`UI_MAP` (A 전용 additive 원료 매핑)** — 공용 `classify()` 가 해석하지 못하는 라벨을
   빌더 내부에서만 원료 메타(key·KO·EN·지표성분)로 해석한다. 공용 registry 는 미변경이므로 타 lane 영향 0.
   라벨 정규화(`normLabel`)는 고시번호·®·괄호·"제품/원료/분말" 접미만 제거하고 **완전일치**만 허용한다
   (부분일치 오귀속 방지). `철` 같은 1글자 원료명도 유효 라벨로 취급한다.
2. **`bracket1`** — `[원료]` 블록이 1개뿐인 단일원료 제품도 명시 구조로 인정(직전 WO 는 2개 이상만 인정).
   61 건이 이 경로로 생산되었다.
3. **규격 근거 게이트(`SPEC_BASIS_MISSING`)** — 신규 매핑 원료는 **기준·규격 원문에 원료명 또는
   공식 지표성분이 실재**해야만 통과한다(홍삼→진세노사이드/Rg1/Rb1, 바나바→코로솔산, 쏘팔메토→로르산,
   홍국→모나콜린, 콜레우스→포스콜린 등). 표시량·단위·섭취 기준이 불명확하면 HOLD.
   공용 registry 원료는 기존 경로에서 이미 검증된 축이므로 본 게이트를 중복 적용하지 않는다.
   본 게이트로 222 건 HOLD.

**신규 원료가 1종 이상 포함된 제품만** 생산한다(`noUiIng` 553 skip) — 직전 WO 범위와의 중복 생산 0.

## 5. 기능성 누락 0 설계 (직전 WO 계약 승계)

공용 `parseFnAttribution` 은 `classify()` 실패 라벨의 블록을 결과에서 제외하므로 사용하지 않고,
빌더 내부 라벨 충실 파서를 유지했다.

1. 명시 구조만 사용(`[원료]` / `n) 원료 :` / `원료 :`) — 추정 폴백·구조 없음은 HOLD.
2. 블록을 하나도 버리지 않는다 — 미해석 라벨 = 제품 전체 `LABEL_UNMAPPED` HOLD, 기능성 0 블록 = `EMPTY_FN_BLOCK` HOLD.
3. 첫 라벨 앞 귀속 불명 문장 → `RESIDUE_PREAMBLE` HOLD.
4. 서로 다른 라벨이 같은 키로 접히면 `DUP_KEY_LABELS` HOLD. `식이섬유` → `PENDING_SHARED_FIBER` HOLD.
5. 최종 재확인 — `splitFunctions(MAIN_FNCTN)` 원자가 렌더 결과에 모두 포함되는지 정규화 비교,
   누락 시 `FN_ATOM_UNRENDERED` HOLD (2건 검출·전량 HOLD).
6. EN 은 `mapFunctionEnC ?? mapFunctionEn` 만 사용, 하나라도 미매핑이면 `GROUNDING_PENDING_EN` HOLD
   (임의 영문 생성 0).

카드는 표시량을 렌더링하지 않는 **기능성 기반** 구성이다.

## 6. 게이트 결과

| 게이트 | 결과 |
|---|---|
| 원료명·기능성·표시량 공식 근거 | §4-3 규격 근거 게이트 통과분만 승격(미충족 222 HOLD) |
| expected write = actual write | 2/2 배치 일치 (1,000 / 732) |
| dry-run → rollback (DB write 0) 선행 | 2/2 배치 수행 |
| `postVerifyPass` | 2/2 true |
| canonicalDup | **0** |
| statementNo(=`mfds_permit_number`) 중복 | **0** |
| **기능성 누락** | **0** (§5) |
| master·candidate·source_ref 연결 | 433/433/433 정상 |
| KO·EN 존재 | 433 / 433 |
| 기존 LIVE drift | **0** (본 배치 master 에 manifest 밖 SPD 0건) |
| Guard BLOCKED 승격 | **0** (BLOCKED 41 · REVIEW_REQUIRED 109 전량 HOLD) |
| rollback manifest | 2개 보존 (`C:/tmp/hff-a-ui/manifests`) |

### 독립검증 (`hff-nb-a-verify.ts --tagPrefix batch:ui-a-`, manifest ID 재조회)

```
masters    manifest 433 / unique 433 / alive 433 / regulatoryType=건강기능식품 / permitUnique / statementDup 0
spd        manifest 866 / alive 866 / ko 433 / en 433 / allStore / allCanonical / allHffSource
           / sourceRefLinked / minLen 1,390
candidates manifest 433 / alive 433 / linked 433 / approved_new_master 433
canonicalDup 0 · foreignSpdOnOwnMasters 0
VERDICT: PASS
```

> 전역 HFF LIVE 총량은 B/C 가 동시 생산하므로 drift 지표로 쓰지 않고, **본 배치 manifest ID 집합만으로** 검증했다.

## 7. HOLD (상위 원인)

재실행 결과 target **0** — 현재 규칙 하에서 shard 0 안전 후보 소진.

| 원인 | 건수 | 성격 |
|---|---:|---|
| `NO_EXPLICIT_STRUCTURE` | 4,863 | 원문에 원료↔기능성 연결 없음 — 생산 불가(영구 HOLD) |
| `GROUNDING_PENDING_EN` | 1,268 | 공용 EN 매퍼 미보유. 상위: 유산균 증식 및 유해균 억제·배변활동 원활·장 건강 97 · 면역력 증진 92 · 전립선 건강의 유지 87 · 유산균 증식 및 유해균 억제 85 · 스트레스로 인한 피로 개선 44 |
| `LABEL_UNMAPPED` | 660 | 잔여 라벨. 상위는 전부 100건 미만 롱테일이며 실체가 원료명이 아닌 파편(추출물 70 · 유지 56 · B1 28 · 내용 19 · 필수지방산 10) 또는 개별인정형 복합물(보스웰리아 9 · 호박씨등복합물 8 …) |
| `noUiIng` (skip) | 553 | 신규 원료 미포함 — 직전 WO 범위, 본 WO 대상 아님 |
| `EMPTY_FN_BLOCK` | 363 | 라벨은 있으나 블록에 기능성 문장 0 |
| `SPEC_BASIS_MISSING` | 222 | §4-3 규격 근거 미확인 |
| `PENDING_SHARED_FIBER` | 189 | §5-4 |
| `RESIDUE_PREAMBLE` | 156 | 첫 라벨 앞 귀속 불명 문장 |
| `GUARD_REVIEW` 109 · `GUARD_BLOCKED` 41 · `DUP_KEY_LABELS` 45 · `COMPOSE_SERVING_PARSE_FAILED` 17 · `FN_ATOM_UNRENDERED` 2 | 214 | 개별 |

## 8. 남은 후보

shard 0 총 13,743 · 선점·기승격 5,255(본 WO 433 승격 후) → **미생산 8,488**, 전량 §7 사유 보유.

후속 조건(별도 WO · 대부분 **공용 모듈 변경 필요**):
- 공용 EN 매퍼 확장(장 건강·면역력 증진·전립선 계열) → `GROUNDING_PENDING_EN` 1,268 — 최대 잔여 가용 구간
- 개별인정형 "…등 복합물" 라벨 체계 정비 → `LABEL_UNMAPPED` 660 (단일 원인 100건 이상 없음 → 본 WO 범위 밖)
- 공용 fiber source 해석 확장 → `PENDING_SHARED_FIBER` 189
- `NO_EXPLICIT_STRUCTURE` 4,863 은 원문 자체에 귀속 정보가 없어 **영구 HOLD**
  (원료별 귀속 추정 생성은 콘텐츠 원칙 위반).

## 9. 콘텐츠 원칙 준수

- 공식 기능성 문장은 **원문 그대로** 렌더링(삭제·순화·완화 0). 질환명·증상명·전문용어 보존.
- 원문 밖 치료·예방 주장 추가 0. 제품명만으로 원료·기능성을 추정하지 않았다(명시 구조만 사용).
- EN 은 공용 매퍼 매핑분만 사용 — 임의 영문 생성 0, 미매핑 제품은 HOLD.
- 전문가 상담 footer 유지: "건강기능식품은 질병의 예방·치료를 위한 의약품이 아니며, 궁금한 점은
  매장 내 약사 등 전문가와 상담하십시오".

## 10. 변경 파일

| 파일 | 성격 |
|---|---|
| `apps/api-server/src/scripts/hff-ui-a-build.ts` | 신규 · A 전용 미등록 원료 빌더 (`UI_MAP` + bracket1 + 규격 근거 게이트) |
| `docs/checks/CHECK-O4O-HFF-UNREGISTERED-INGREDIENT-BULK-PRODUCTION-A-V1.md` | 본 문서 |

공용 모듈 수정 0 · `pnpm-lock.yaml` 미접촉 · 타 세션 WIP 미접촉 · force push 없음.
