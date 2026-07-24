# CHECK-O4O-HFF-UNREGISTERED-INDICATOR-REMAINDER-A-V1

> WO: `WO-O4O-HFF-UNREGISTERED-INDICATOR-REMAINDER-A-V1` (에이전트 A)
> 상태: **CLOSED / PASS** — 안전 후보 소진
> 일자: 2026-07-24

## 1. 범위

직전 [`CHECK-O4O-HFF-UNREGISTERED-INGREDIENT-BULK-PRODUCTION-A-V1`](CHECK-O4O-HFF-UNREGISTERED-INGREDIENT-BULK-PRODUCTION-A-V1.md)
(433 LIVE, `8d33b33af`) 및 Agent B 생산 commit `cfe1442d0` 이후에도 남아 있는
**미등록 지표성분형 건강기능식품** 중 Agent A shard 의 안전 후보를 최대 생산.

- shard: `stableHash(STTEMNT_NO) % 3 === 0` (shard 0) — 타 에이전트(B/C) 충돌 회피 축.
- 미선점: `matched_product_master_id IS NULL` · STORE canonical `o4o_hff_generated` SPD 없음 ·
  `mfds_permit_number` 기보유 master 없음 · A/B/C 기생산 statementNo 제외.
- 우선 후보: 공식 BASE_STANDARD·MAIN_FNCTN 에 **원료↔지표성분이 명시된 단일 원료**
  (보스웰리아·콘드로이친·폴리코사놀·아스타잔틴·마늘·참당귀·석류 등).

## 2. 산출 (LIVE)

| 배치 tag | 제품 | DB write |
|---|---:|---:|
| `batch:ind-a-0` | 18 | 72 |

DB write 내역 = `product_masters` INSERT 18 · `product_candidates` UPDATE 18(`approved_new_master`) ·
`shared_product_descriptions` INSERT 36(ko 18 + en 18 · `description_type='STORE'` · `status='canonical'` ·
`source_type='o4o_hff_generated'`).

### 원료별 생산량

| 원료 | 제품 |
|---|---:|
| 보스웰리아추출물 | 8 |
| 콘드로이친 | 2 |
| 아스타잔틴 | 2 |
| 참당귀추출분말 | 2 |
| 석류추출물 | 2 |
| 폴리코사놀(사탕수수왁스알코올) | 1 |
| 마늘 | 1 |

구조 형식별: `bracket` 8 · `numbered` 7 · `bracket1` 2 · `colon` 1.

## 3. 파이프라인

```
hff-ind-a-build.ts  (신규·A 전용) = hff-ui-a-build.ts + INDICATOR EXTENSION(단일 원료 지표성분 8종) + 액상 게이트
        ↓ (무수정 재사용)
hff-source-parse.ts · hff-sf-registry.ts · hff-nutrient-registry.ts · hff-sf-c-en-overlay.ts ·
content-guard(runGuard) · source-grounding-parser · hff-sf-apply.ts(dry-run/apply/rollback manifest)
        ↓
hff-nb-a-verify.ts  (기존·A 전용) rollback manifest ID 기준 독립검증 — `--tagPrefix batch:ind-a-`
```

공용 parser·registry·composer·apply 및 직전 committed `hff-ui-a-build.ts` 는 **한 줄도 수정하지 않았다.**

## 4. 지표성분 규격 게이트 (본 WO 의 핵심)

INDICATOR EXTENSION 은 빌더 내부 A 전용 `UI_MAP` 에 **단일 원료 라벨 + 공식 지표성분 regex(`basis`)** 를 additive 로 추가한다.
신규 매핑 원료(`viaUi`)에 대해서만 `SPEC_BASIS_MISSING` 게이트가 작동하여,
정규화된 BASE_STANDARD 에 해당 원료의 **공식 지표성분**이 존재해야 통과한다.

- 보스웰리아→보스웰릭/AKBA/KBA · 콘드로이친→chondroitin · 폴리코사놀→octacosanol/policosanol ·
  아스타잔틴→astaxanthin · 마늘→알리인/alliin · 참당귀→데커신/decursin · 석류→엘라그산/ellagic.
- EN 은 `mapFunctionEnC ?? mapFunctionEn` 만 사용, 하나라도 미매핑이면 `GROUNDING_PENDING_EN` HOLD (임의 영문 생성 0).
- **액상 게이트(`LIQUID_FORM`)**: 신규 원료 제품이 액상·액제·드링크·음료·시럽이면 HOLD (58건 제외).

카드는 표시량을 렌더링하지 않는 **기능성 기반** 구성 — 규격 파싱 한계의 영향을 받지 않는다.

## 5. 게이트 결과

| 게이트 | 결과 |
|---|---|
| expected write = actual write | 일치 (72 / 72) |
| dry-run → rollback (DB write 0) 선행 | 수행 |
| `postVerifyPass` | true |
| canonicalDup | **0** |
| statementNo(=`mfds_permit_number`) 중복 | **0** |
| 기능성 누락 | **0** (`FN_ATOM_UNRENDERED` 2건은 승격 전 HOLD) |
| master·candidate·source_ref 연결 | 18/18/18 정상 |
| 기존 LIVE drift | **0** (본 배치 master 에 manifest 밖 SPD 0건 = `foreignSpdOnOwnMasters 0`) |
| Guard BLOCKED 승격 | **0** |
| rollback manifest | 보존 (`C:/tmp/hff-a-ind/manifests`) |

### 독립검증 (`hff-nb-a-verify.ts --tagPrefix batch:ind-a-`, manifest ID 재조회)

```
masters    manifest 18 / unique 18 / alive 18 / regulatoryType=건강기능식품 / permitUnique / statementDup 0
spd        manifest 36 / alive 36 / ko 18 / en 18 / allStore / allCanonical / allHffSource
           / sourceRefLinked / minLen 1,505
candidates manifest 18 / alive 18 / linked 18 / approved_new_master 18
canonicalDup 0 · foreignSpdOnOwnMasters 0
VERDICT: PASS
```

> 전역 HFF LIVE 총량은 B/C 동시 생산으로 drift 지표에 쓰지 않고, **본 배치 manifest ID 집합만으로** 검증했다.

## 6. HOLD (상위 원인)

재실행 시 target **0** — 현재 규칙 하에서 shard 0 지표성분 안전 후보 소진.

| 원인 | 건수 | 성격 |
|---|---:|---|
| `NO_EXPLICIT_STRUCTURE` | 4,863 | 원문에 원료↔기능성 연결 없음 — 생산 불가 |
| `GROUNDING_PENDING_EN` | 1,279 | 공용 EN 매퍼 미보유 |
| `LABEL_UNMAPPED` | 625 | 라벨 미해석 |
| `EMPTY_FN_BLOCK` | 365 | 라벨은 있으나 블록 기능성 문장 0 (영지버섯 "①혈행개선" 4자 포함) |
| `SPEC_BASIS_MISSING` | 224 | 신규 매핑 원료인데 공식 지표성분 규격 미확인 |
| `PENDING_SHARED_FIBER` | 189 | 공용 fiber 해석 대기 |
| `RESIDUE_PREAMBLE` | 156 | 첫 라벨 앞 귀속 불명 문장 |
| `LIQUID_FORM` | 58 | 액상 HOLD(§4) |
| `DUP_KEY_LABELS` 45 · `GUARD_REVIEW` 61 · `GUARD_BLOCKED` 39 · `COMPOSE_SERVING_*` 11 · `FN_ATOM_UNRENDERED` 2 | 158 | 개별 |

## 7. 남은 후보

재실행 target **0** = shard 0 지표성분 안전 후보 소진. 잔여는 전량 §6 HOLD 사유.

후속 조건(별도 WO · 공용 모듈 변경 필요):
- 공용 EN 매퍼 확장(면역기능 증진·근력개선·활성산소제거 계열) → `GROUNDING_PENDING_EN` 1,279
- 개별인정형 "…등복합물" 라벨 registry 확장 → `LABEL_UNMAPPED` 625
- `NO_EXPLICIT_STRUCTURE` 4,863 은 원문 자체에 귀속 정보 없어 본 규칙으로는 **영구 HOLD**.

## 8. 콘텐츠 원칙 준수

- 공식 기능성 문장은 **원문 그대로** 렌더링(삭제·순화·완화 0). 질환명·증상명·전문용어 보존.
- 원문 밖 치료·예방 주장 추가 0. EN 은 공용 매퍼 매핑분만 사용 — 임의 영문 생성 0.
- 전문가 상담 footer 유지.

## 9. 변경 파일

| 파일 | 성격 |
|---|---|
| `apps/api-server/src/scripts/hff-ind-a-build.ts` | 신규 · A 전용 지표성분 빌더 (UI_MAP INDICATOR EXTENSION + 액상 게이트) |
| `docs/checks/CHECK-O4O-HFF-UNREGISTERED-INDICATOR-REMAINDER-A-V1.md` | 본 문서 |

공용 모듈 수정 0 · committed `hff-ui-a-build.ts` 미접촉 · `pnpm-lock.yaml` 미접촉 · 타 세션 WIP 미접촉 · force push 없음.
