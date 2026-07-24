# CHECK-O4O-HFF-MULTI-INGREDIENT-BULK-PRODUCTION-A-V1

> WO: `WO-O4O-HFF-MULTI-INGREDIENT-BULK-PRODUCTION-A-V1` (에이전트 A)
> 상태: **CLOSED / PASS** — 안전 후보 소진
> 일자: 2026-07-24

## 1. 범위

미생산 건강기능식품 중 **다원료(MULTI_INGREDIENT · HOLD_MULTI_FUNCTIONAL · NO_EXPLICIT_STRUCTURE)** 제품을
제품 단위로 KO+EN STORE canonical 설명서까지 생산.

- shard: `stableHash(STTEMNT_NO) % 3 === 0` (shard 0) — 타 에이전트(B/C) 충돌 회피 축. 외부 조회·수정 없음.
- 미선점: `matched_product_master_id IS NULL` · STORE canonical `o4o_hff_generated` SPD 없음 ·
  `mfds_permit_number` 기보유 master 없음.
- 직전 [`CHECK-O4O-HFF-NOBRACKET-BULK-PRODUCTION-A-V1`](CHECK-O4O-HFF-NOBRACKET-BULK-PRODUCTION-A-V1.md) 이
  **noBracket 만** 다뤘으므로, 본 WO 는 **`[원료]` 브래킷 구조를 포함한 전 도메인 다원료**를 새로 개방한다.

## 2. 산출 (LIVE)

| 배치 tag | 제품 | DB write |
|---|---:|---:|
| `batch:mi-a-0` | 250 | 1,000 |
| `batch:mi-a-1` | 250 | 1,000 |
| `batch:mi-a-2` | 192 | 768 |
| **합계** | **692** | **2,768** |

DB write 내역 = `product_masters` INSERT 692 · `product_candidates` UPDATE 692(`approved_new_master`) ·
`shared_product_descriptions` INSERT 1,384(ko 692 + en 692 · `description_type='STORE'` · `status='canonical'` ·
`source_type='o4o_hff_generated'`).

### 원료 수별 생산량

| 원료 수 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14 | 15 | 16 | 17 | 18 | 19 | 21 |
|---|--:|--:|--:|--:|--:|--:|--:|--:|--:|--:|--:|--:|--:|--:|--:|--:|--:|--:|--:|
| 제품 | 185 | 127 | 85 | 55 | 43 | 29 | 39 | 29 | 26 | 21 | 12 | 14 | 6 | 7 | 2 | 5 | 2 | 4 | 1 |

구조 형식별: `bracket` 598 · `colon` 78 · `numbered` 16.

## 3. 파이프라인

```
hff-mi-a-build.ts   (신규·A 전용) 다원료 라벨 충실 파서 + 함수기반 카드 → target JSON
        ↓ (무수정 재사용)
hff-source-parse.ts(classify·normalizeSpecText·splitFunctions) · hff-sf-registry.ts ·
hff-nutrient-registry.ts · hff-sf-c-en-overlay.ts · content-guard(runGuard) ·
source-grounding-parser(parseServing·normalizeSource) · hff-sf-apply.ts(dry-run/apply/rollback manifest)
        ↓
hff-nb-a-verify.ts  (기존·A 전용) rollback manifest ID 기준 독립검증 — `--tagPrefix batch:mi-a-` 로 재사용
```

공용 parser·registry·composer·apply 는 **한 줄도 수정하지 않았다.**

## 4. 기능성 누락 0 설계 (본 WO 의 핵심)

공용 `parseFnAttribution` 은 라벨을 `classify()` 로 해석하지 못하면 해당 블록을 `unknownLabels` 로 보내고
**그 블록의 기능성 문장을 결과에서 제외**한다. 그대로 쓰면 "일부 기능성을 삭제해 생산"하게 되므로,
공용 모듈을 수정하지 않고 빌더 내부에 **라벨 충실(label-faithful) 로컬 파서**를 두었다.

1. **명시 구조만 사용** — `[원료] …` / `n) 원료 : …` / `원료 : …`(2건 이상). 원문에 원료↔기능성 연결이
   존재하는 경우만이다. registry 추정 폴백(`inline`)·구조 없음(`none`)은 오귀속 위험 → HOLD.
2. **블록을 하나도 버리지 않는다.** 라벨이 `classify()`+META 로 해석되지 않으면 → 제품 전체 `LABEL_UNMAPPED` HOLD.
   기능성 문장이 0개인 블록 → `EMPTY_FN_BLOCK` HOLD.
3. **첫 라벨 앞 기능성 문장**(preamble)이 있으면 귀속 불명 잔여 → `RESIDUE_PREAMBLE` HOLD.
4. **서로 다른 라벨이 같은 키로 접히면** 카드가 합쳐져 누락이 되므로 `DUP_KEY_LABELS` HOLD.
   `식이섬유`(차전자피·난소화성말토덱스트린·이눌린·프락토올리고당 접힘)는 `PENDING_SHARED_FIBER` HOLD.
5. **최종 재확인** — 원문 전체 기능성 원자(`splitFunctions(MAIN_FNCTN)`)가 렌더 결과에 모두 포함되는지
   정규화 비교로 검사, 하나라도 빠지면 `FN_ATOM_UNRENDERED` HOLD.
6. EN 은 `mapFunctionEnC ?? mapFunctionEn` 만 사용하고 하나라도 미매핑이면 `GROUNDING_PENDING_EN` HOLD
   (임의 영문 생성 0).

카드는 표시량을 렌더링하지 않는 **기능성 기반** 구성이므로 액상·비율표기 등 규격 파싱 한계의 영향을 받지 않는다.

## 5. 게이트 결과

| 게이트 | 결과 |
|---|---|
| expected write = actual write | 3/3 배치 일치 (1,000 / 1,000 / 768) |
| dry-run → rollback (DB write 0) 선행 | 3/3 배치 수행 |
| `postVerifyPass` | 3/3 true |
| canonicalDup | **0** |
| statementNo(=`mfds_permit_number`) 중복 | **0** |
| **기능성 누락** | **0** (§4 · `FN_ATOM_UNRENDERED` 2건은 승격 전 HOLD) |
| master·candidate·source_ref 연결 | 692/692/692 정상 |
| 기존 LIVE drift | **0** (본 배치 master 에 manifest 밖 SPD 0건) |
| Guard BLOCKED 승격 | **0** (BLOCKED·REVIEW_REQUIRED 전량 HOLD) |
| rollback manifest | 3개 보존 (`C:/tmp/hff-a-mi/manifests`) |

### 독립검증 (`hff-nb-a-verify.ts --tagPrefix batch:mi-a-`, manifest ID 재조회)

```
masters    manifest 692 / unique 692 / alive 692 / regulatoryType=건강기능식품 / permitUnique / statementDup 0
spd        manifest 1384 / alive 1384 / ko 692 / en 692 / allStore / allCanonical / allHffSource
           / sourceRefLinked / minLen 1,595
candidates manifest 692 / alive 692 / linked 692 / approved_new_master 692
canonicalDup 0 · foreignSpdOnOwnMasters 0
VERDICT: PASS
```

> 전역 HFF LIVE 총량은 B/C 가 동시 생산하므로 drift 지표로 쓰지 않고, **본 배치 manifest ID 집합만으로** 검증했다.

## 6. HOLD (상위 원인)

재실행 시 target **0** — 현재 규칙 하에서 shard 0 다원료 안전 후보 소진.

| 원인 | 건수 | 성격 |
|---|---:|---|
| `NO_EXPLICIT_STRUCTURE` | 5,878 | 원문에 원료↔기능성 연결 없음(inline 추정 폴백 포함) — 생산 불가 |
| `LABEL_UNMAPPED` | 2,179 | 라벨 미해석. 상위: 프로바이오틱스 133 · 철 111 · 히알루론산 36 · 바나바잎추출물 36 · 쏘팔메토열매추출물 33 · 홍삼 32 · 포스파티딜세린 24 · 홍경천추출물 21 |
| `EMPTY_FN_BLOCK` | 192 | 라벨은 있으나 블록에 기능성 문장 0 |
| `GROUNDING_PENDING_EN` | 171 | 공용 EN 매퍼 미보유(대다수는 원문 줄바꿈·오탈자로 문장이 잘린 형태) |
| `PENDING_SHARED_FIBER` | 165 | §4-4 |
| `RESIDUE_PREAMBLE` | 137 | 첫 라벨 앞 귀속 불명 문장 |
| `GUARD_REVIEW` | 110 | `PRE-SRC-BASIS-UNVERIFIABLE-003` 23 · `D-CLAIM-GROUNDED-002` · `E-NAME-DERIVED-GROUNDED-002` |
| `GUARD_BLOCKED` | 53 | `D-CLAIM-UNGROUNDED-001` 12 · `Q-TRUNCATED-002` 6 · `PRE-SRC-BULK-004` 2 등 |
| `DUP_KEY_LABELS` 28 · `COMPOSE_SERVING_*` 6 · `FN_ATOM_UNRENDERED` 2 | 36 | 개별 |

## 7. 남은 후보

shard 0 총 13,743 · 선점·기승격 4,822 → **미생산 8,921**, 전량 위 HOLD 사유에 해당.

후속 조건(별도 WO · 공용 모듈 변경 필요):
- 프로바이오틱스 CFU · 홍삼 지표성분 · 개별인정형 추출물 라벨 registry 확장 → `LABEL_UNMAPPED` 2,179
- 공용 fiber source 해석 확장 → `PENDING_SHARED_FIBER` 165
- 공용 EN 매퍼 확장 + 원문 줄바꿈/오탈자 정규화 → `GROUNDING_PENDING_EN` 171
- `NO_EXPLICIT_STRUCTURE` 5,878 은 원문 자체에 귀속 정보가 없어 **본 규칙으로는 영구 HOLD**
  (원료별 귀속을 추정 생성하는 것은 콘텐츠 원칙 위반).

## 8. 콘텐츠 원칙 준수

- 공식 기능성 문장은 **원문 그대로** 렌더링(삭제·순화·완화 0). 질환명·증상명·전문용어 보존.
- 원문 밖 치료·예방 주장 추가 0(카드 문구는 공식 원문 + 표시기준만 사용, 표시량 미기재).
- EN 은 공용 매퍼 매핑분만 사용 — 임의 영문 생성 0.
- 전문가 상담 footer 유지: "건강기능식품은 질병의 예방·치료를 위한 의약품이 아니며, 궁금한 점은
  매장 내 약사 등 전문가와 상담하십시오".

## 9. 변경 파일

| 파일 | 성격 |
|---|---|
| `apps/api-server/src/scripts/hff-mi-a-build.ts` | 신규 · A 전용 다원료 빌더 (라벨 충실 파서 + 함수기반 카드) |
| `docs/checks/CHECK-O4O-HFF-MULTI-INGREDIENT-BULK-PRODUCTION-A-V1.md` | 본 문서 |

공용 모듈 수정 0 · `pnpm-lock.yaml` 미접촉 · 타 세션 WIP 미접촉 · force push 없음.
