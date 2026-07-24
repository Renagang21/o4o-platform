# CHECK-O4O-HFF-NOBRACKET-BULK-PRODUCTION-A-V1

> WO: `WO-O4O-HFF-NOBRACKET-BULK-PRODUCTION-A-V1` (에이전트 A)
> 상태: **CLOSED / PASS** — 안전 후보 소진
> 일자: 2026-07-24

## 1. 범위

`MAIN_FNCTN` 에 `[원료]` 브래킷이 **없는**(noBracket) MFDS 건강기능식품 후보 중
`stableHash(STTEMNT_NO) % 3 === 0` (shard 0) · 미승격(`matched_product_master_id IS NULL`) · 미선점
(STORE canonical `o4o_hff_generated` SPD 없음) 제품을 **제품 단위**로 KO+EN STORE canonical 설명서까지 생산.

shard 0 은 타 에이전트(B/C·나·다)와의 충돌 회피 축이며, 본 WO 는 shard 0 외부를 조회·수정하지 않는다.

## 2. 산출 (LIVE)

| 배치 tag | 경로 | 제품 | DB write |
|---|---|---:|---:|
| `batch:nb-a-0` | 단일 원료 | 250 | 1,000 |
| `batch:nb-a-1` | 단일 원료 | 30 | 120 |
| `batch:nb-a-2` | 단일 원료(식별 회수분) | 71 | 284 |
| `batch:nb-a-c0` | 복합형(명시 귀속) | 37 | 148 |
| **합계** | | **388** | **1,552** |

DB write 내역 = `product_masters` INSERT 388 · `product_candidates` UPDATE 388(`approved_new_master`) ·
`shared_product_descriptions` INSERT 776(ko 388 + en 388, `description_type='STORE'` · `status='canonical'` ·
`source_type='o4o_hff_generated'`).

## 3. 파이프라인 (기존 자산 재사용)

```
hff-nb-a-build.ts        (신규·A 전용) 단일 원료 노브래킷 → target JSON
hff-nb-a-combo-build.ts  (신규·A 전용) 명시 귀속 복합형 → target JSON
        ↓ (무수정 재사용)
hff-source-parse.ts(parseSpecs·classify·parseFnAttribution) · hff-sf-registry.ts ·
hff-nutrient-registry.ts · hff-sf-c-en-overlay.ts · hff-sf-compose.ts(composeSf) ·
content-guard(runGuard) · hff-sf-apply.ts(dry-run/apply/rollback manifest)
        ↓
hff-nb-a-verify.ts       (신규·A 전용) rollback manifest ID 기준 독립검증
```

공용 parser·registry·composer·apply 는 **한 줄도 수정하지 않았다.**

## 4. 귀속 규칙 (오귀속 방지)

### 4-1 단일 원료 경로
1. `BASE_STANDARD` → `parseSpecs().byKey` 로 기능성 원료 키 추출.
2. 미분류 규격 라벨(`unknownLabels`)은 SF registry `labelRe/indicatorRe` → 공용 `classify()` 순으로 2차 해석.
   - 배경: `parseSpecs` 의 LOOSE 안전망은 **비율 표기 변이**로 `SPEC_RE` 를 못 지난 규격 라인을 분류 없이
     `unknownLabels` 로 강제 편입한다(철·아연 등 정상 원료도 포함). `composeSf` 는 규격 **수치를 렌더링하지 않고**
     이 키를 원료 **식별(단일/복수 판정)** 에만 쓰므로, 수치 소비 없이 식별만 회수했다.
   - 어느 쪽도 못 읽는 조각(`)` · `Rg3의 합` · `조단백질` 등)은 **HOLD 유지**.
3. **정확히 1종일 때만 생산.** 0종 → `NO_FUNCTIONAL_KEY`, 2종 이상 → `MULTI_INGREDIENT` HOLD.
4. 기능성 KO = 원문 문장 그대로(`extractFunctionsKo`), EN = `mapFunctionEnC ?? mapFunctionEn`.
   하나라도 미매핑이면 `GROUNDING_PENDING_EN` HOLD(임의 영문 생성 0).

### 4-2 복합형 경로 (명시 귀속만)
- `parseFnAttribution` mode 가 **`colon` 또는 `numbered`** 인 경우만 사용(원문 라벨 구조).
  `inline`(registry 추정 폴백)·`none` 은 제외 → `NO_EXPLICIT_STRUCTURE` HOLD.
- **fullCover 만 생산**: 규격 식별 원료 전부가 귀속을 받고 · 미귀속 문장 0 · 미해석 라벨 0 ·
  귀속 키 ⊆ 규격 키(`FN_KEY_NOT_IN_SPEC` 차단). 하나라도 남으면 HOLD.
- 로컬 combo guard: 원료 카드 수 ko=en=N · 원료별 기능성 KO/EN 개수 일치 · 문구 draft 포함 · 키 중복 0.

### 4-3 식이섬유 PENDING_SHARED
`식이섬유` 는 차전자피·난소화성말토덱스트린·이눌린·프락토올리고당 등 **상이 원료가 한 키로 접히는** 구조라
단일 판정이 성립해도 실제로는 복수 원료일 수 있다. 공용 fiber 해석 확장 전까지 **생산하지 않는다**(단일 133 · 복합 143).

## 5. 게이트 결과

| 게이트 | 결과 |
|---|---|
| expected write = actual write | 4/4 배치 일치 (1,000 / 120 / 284 / 148) |
| dry-run → rollback (DB write 0) 선행 | 4/4 배치 수행 |
| `postVerifyPass` | 4/4 true |
| canonicalDup | **0** |
| statementNo(=`mfds_permit_number`) 중복 | **0** |
| master·candidate·source_ref 연결 | 388/388/388 정상 |
| KO·EN 존재 | 388 / 388 |
| 기존 LIVE 변경 | **0** (본 배치 master 에 manifest 밖 SPD 0건) |
| rollback manifest | 4개 보존 (`C:/tmp/hff-a-nb/manifests`) |
| Guard BLOCKED 승격 | **0** (BLOCKED·REVIEW_REQUIRED 전량 HOLD) |

### 독립검증 (`hff-nb-a-verify.ts`, manifest ID 기준 재조회)

```
masters   manifest 388 / unique 388 / alive 388 / regulatoryType=건강기능식품 / permitUnique
spd       manifest 776 / alive 776 / ko 388 / en 388 / allStore / allCanonical
          / allHffSource / sourceRefLinked / minLen 1,154
candidates manifest 388 / linked 388 / approved_new_master 388
canonicalDup 0 · foreignSpdOnOwnMasters 0
VERDICT: PASS
```

> 전역 HFF LIVE 총량은 B/C·타 에이전트가 동시 생산하므로 drift 지표로 쓰지 않았고,
> **본 배치 manifest ID 집합만으로** 검증했다.

## 6. HOLD (상위 원인)

재실행 시 양 경로 target **0** — 안전 후보 소진.

**단일 경로 잔여**

| 원인 | 건수 | 성격 |
|---|---:|---|
| `NO_FUNCTIONAL_KEY` | 2,065 | 프로바이오틱스(CFU 규격)·홍삼(진세노사이드) 등 — 전용 파이프라인 소관 |
| `UNKNOWN_SPEC_LABEL` | 2,007 | 규격 라인 미해석 조각 잔존 → 원료 누락 위험 |
| `MULTI_INGREDIENT` | 1,323 | 라벨 없는 다원료(복합형 경로에서 재평가됨) |
| `GROUNDING_PENDING_EN` | 256 | 공용 EN 매퍼 미보유 문구(대부분 장 건강/유산균 계열) |
| `PENDING_SHARED_FIBER` | 133 | §4-3 |
| `GUARD_REVIEW` | 75 | `PRE-SRC-BASIS-UNVERIFIABLE-003` 17 · `D-CLAIM-GROUNDED-002` · `E-NAME-DERIVED-GROUNDED-002` |
| `NO_FUNCTION` 33 · `GUARD_BLOCKED` 11 · `COMPOSE_SERVING_*` 12 | 56 | 개별 |

**복합형 경로 잔여**

| 원인 | 건수 |
|---|---:|
| `NO_EXPLICIT_STRUCTURE`(inline/none) | 788 |
| `RESIDUE_UNATTRIBUTED` | 218 |
| `PENDING_SHARED_FIBER` | 143 |
| `GROUNDING_PENDING_EN` | 113 |
| `PARTIAL_COVER` | 58 |
| `FN_KEY_NOT_IN_SPEC` 2 · `GUARD_REVIEW` 1 | 3 |

## 7. 남은 noBracket 후보

shard 0 noBracket 총 7,975 → 승격 완료 2,060(본 WO 388 포함) → **미생산 5,915**.
전부 §6 의 HOLD 사유에 해당하며, 현재 규칙 하에서 **안전 후보는 0**이다.

후속 조건(별도 WO 필요):
- 프로바이오틱스 CFU 규격 · 홍삼 지표성분 전용 해석 → `NO_FUNCTIONAL_KEY` 2,065
- 공용 fiber source 해석 확장 → `PENDING_SHARED_FIBER` 276
- 공용 EN 매퍼 장 건강/유산균 문구 확장 → `GROUNDING_PENDING_EN` 369
- 규격 라인 비율 표기 변이 하드닝(공용 파서 — 본 WO 범위 외) → `UNKNOWN_SPEC_LABEL` 2,007

## 8. 콘텐츠 원칙 준수

- 공식 기능성 문장은 **원문 그대로** 렌더링(삭제·순화·완화 0). 질환명·증상명·전문용어 보존.
- 원문 밖 치료·예방 주장 추가 0(카드 문구는 공식 원문 + 표시기준만 사용, 표시량 미기재).
- 전문가 상담 footer 유지: "건강기능식품은 질병의 예방·치료를 위한 의약품이 아니며, 궁금한 점은
  매장 내 약사 등 전문가와 상담하십시오".

## 9. 변경 파일

| 파일 | 성격 |
|---|---|
| `apps/api-server/src/scripts/hff-nb-a-build.ts` | 신규 · A 전용 단일 원료 빌더 |
| `apps/api-server/src/scripts/hff-nb-a-combo-build.ts` | 신규 · A 전용 명시 귀속 복합형 빌더 |
| `apps/api-server/src/scripts/hff-nb-a-verify.ts` | 신규 · manifest ID 독립검증 (READ-ONLY) |
| `docs/checks/CHECK-O4O-HFF-NOBRACKET-BULK-PRODUCTION-A-V1.md` | 본 문서 |

공용 모듈 수정 0 · `pnpm-lock.yaml` 미접촉 · 타 세션 WIP 미접촉 · force push 없음.
