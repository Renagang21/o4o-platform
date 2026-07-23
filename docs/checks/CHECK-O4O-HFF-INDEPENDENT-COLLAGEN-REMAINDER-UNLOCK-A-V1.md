# CHECK — HFF Independent Collagen Remainder Unlock A (콜라겐 잔여·액상·serving 보완)

- **WO**: WO-O4O-HFF-INDEPENDENT-COLLAGEN-REMAINDER-UNLOCK-A-V1 (에이전트 A)
- **자동승인 계약**: WO-O4O-HFF-CONTENT-PRODUCTION-AUTO-AUTHORIZATION-CONTRACT-V1
- **선행 WO**: WO-O4O-HFF-INDEPENDENT-COLLAGEN-MAX-PRODUCTION-A-V1 (완료, `5a659a83d`) · UNLOCK-A (`f9a7da9c2`)
- **완료 시각**: 2026-07-23 KST (착수 동세션 연속)
- **상태**: ✅ CLOSED / PASS — **32 신규 LIVE** (16 solid + 16 liquid), drift 0, canonicalDup 0

---

## 1. 목표와 근본 진단

직전 콜라겐 라운드(선행 WO, 46 LIVE)가 남긴 REVIEW_LATER/HOLD 를 원인별로 해소하고 안전 후보를 소진 생산:
① `REVIEW_NO_MARKER_AMOUNT` 40 ② 액상 29 ③ `COMPOSE_SERVING` 5 ④ Guard REVIEW/BLOCKED 4.

### A-01/A-02 — NO_MARKER_AMOUNT 40 원인 재분류 (READ-ONLY 조사)

40건 중 **39건은 실제로 표시량이 존재**했다. 놓친 이유: 콜라겐 개별인정 지표가 `Gly-Pro-Hyp` 가 아니라 **저분자콜라겐펩타이드 개별인정 지표 서열 `Gly-Pro-Val-Gly-Pro-Ser`**(피쉬 유래 `Gly-Ala-Val-Gly-Pro-Ala`) 이고, 표시량이 `표시량(2.8mg/2,000mg)의 80~120%` 형식으로 서열 뒤에 붙는데 기존 `colHasAmount` 정규식(콜라겐·Gly-Pro-Hyp·하이드록시프롤린만)이 이 서열을 인식하지 못했다.

- **보완**: `colHasAmount` 에 `(?:[A-Z][a-z]{2}\s*-\s*){2,}[A-Z][a-z]{2}` (3+ 아미노산 사슬) + 표시량/수치+단위(30자 이내) 절 추가. additive — 기존 2개 절 무변경.
- 결과: noMarkAmount 40 → 7. **7건은 진짜 표시량 부재**(라이필 더마/더마콜라겐 시그니처/이시샷/젤리스틱/저분자콜라겐펩타이드NS) → REVIEW_LATER 유지.

### 액상 안전성 모델 (A-04/A-05)

`composeSf` 는 **원료 mg 량을 draft 에 절대 기재하지 않는다** — `parseServing(SRV_USE)` 로 섭취 **형태**("1일 N회, 1회 N포/병/스틱")만 추출하고, 못 읽으면 `SERVING_*` 에러로 보류한다. 따라서 WO 의 "총 용량을 원료량으로 오용" 위험은 파이프라인 구조상 발생 불가. `parseServing` 자체가 "명확한 경우만 생산" 게이트. 앰플/mL 등 미인식 단위는 `unitsPerServing=null` → 카운트 생략(정확·비조작). **공유 guard 파서 미수정**(A additive 원칙).

### 복합형 오귀속 방어 (핵심 결함 수정)

`--include-liquid` 로 액상을 흘려보내던 중, `sections()` 가 원료별 `(국문)/(영문)` 블록이 여러 개인 복합형 MAIN_FNCTN 에서 **첫 (영문) 앞만 ko 로 파싱** → 2번째 이후 원료의 비-콜라겐 기능성을 놓치는 것을 발견. `다이어트 콜라겐 샷`(+풋사과 체지방감소), `에스트리션 유한백수오 스킨콜라겐`(+백수오 갱년기여성건강) 등이 단일 콜라겐으로 오통과.

- **보완**: `allKoFuncs(fn)` additive 헬퍼 — 모든 `(국문)` 블록의 기능성 문구를 전수 수집, 콜라겐 집합 밖 기능성이 하나라도 있으면 `MULTI_ING_FN` 복합형으로 차단. `(국문)` 블록 ≤1 이면 [] 반환(기존 동작 무변경).
- 결과: 5건 복합형 신규 차단(체지방·갱년·모발탄력/엘라스틴). **이미 LIVE 인 콜라겐 배치(46+16)와 교집합 0** — 선행 배치에 복합형 오귀속 없음 확인.

---

## 2. 신규 LIVE

| tag | masters | ko SPD | en SPD | canonicalDup | 유형 |
|-----|:---:|:---:|:---:|:---:|------|
| `batch:single-functional-collagen-remainder` | 16 | 16 | 16 | 0 | solid (NO_MARKER_AMOUNT 해소분) |
| `batch:single-functional-collagen-liquid` | 16 | 16 | 16 | 0 | 액상(스틱/젤리/샷/병/앰플) |

- **총 신규 32 · DB write 128** (masters 32 INSERT + candidates 32 UPDATE→approved_new_master + SPD 64 INSERT[ko+en]).
- 원료유형: 저분자콜라겐펩타이드/콜라겐펩타이드/피쉬콜라겐펩타이드. 기능성: 피부보습+자외선 중심.
- 예상 write = 실측 write. postVerifyPass = true (양 배치).

### 독립검증 (별도 재쿼리 코드경로)

| 검증 | remainder | liquid |
|------|:---:|:---:|
| 신규 재쿼리 pass (지표+표시량+콜라겐기능+타원료0+ko/en+링크) | 16/16 | 16/16 |
| DB-side 비-콜라겐 기능성 스캔(전 (국문) 블록) | 0 flag | 0 flag |
| stmt 중복 | 0 | 0 |
| 이미 적용분과 overlap | 0 | 0 |

- **콜라겐 배치 전역 canonicalDup(4 tag: strict/vitmin/remainder/liquid) = 0**.
- 기존 LIVE drift 0 (priorCollagenVitminLive 46·jointCollagenLive 18 불변).
- **총 콜라겐 LIVE = 96** (strict 18 + vitmin 46 + remainder 16 + liquid 16).

---

## 3. REVIEW_LATER / HOLD (원인별 · 전체 중지 아님)

| 사유 | 수 | 분류 · 판단 |
|------|:---:|------|
| COMBO OTHER_FN | 59 | 복합형(타 기능성 문구) |
| COMBO OTHER_MARK | 19 | 복합형(BASE 타 원료 지표) |
| COMBO MULTI_ING_FN | 5 | **신규 차단** — 다원료 비-콜라겐 기능성(체지방/갱년/엘라스틴) |
| REVIEW_MULTIVIT_HERO | 33 | 멀티비타민 hero(콜라겐=부원료) → REVIEW_LATER |
| GUARD_REVIEW PRE-SRC-BASIS-UNVERIFIABLE-003 | 18 | 액상 serving/기준량 guard 미검증 → HOLD("명확한 경우만" 게이트) |
| REVIEW_NO_MARKER_AMOUNT | 7 | 진짜 표시량 부재 → REVIEW_LATER |
| COMPOSE_SERVING_PARSE_FAILED/ABSENT | 5 | 원료(bulk "원료로 사용") 3 + SRV 공란 1 + "1일 2매"(troche·공유파서 미지원) 1 → HOLD |
| GUARD_REVIEW D-CLAIM-GROUNDED-002 | 3 | **성상 "코팅정제"** 의 `코팅` 이 claim 룰 트립(grounded=WARNING). 질환/기능성 아님. 공식 표현 약화·공유 composeSf 수정·guard 우회 모두 금지 → HOLD(사람 검수). 디어퀸/아이힐/케이콜라겐 정 |
| GUARD_BLOCKED PRE-SRC-BULK-004 | 1 | bulk(소비자 섭취법 미성립) → BLOCKED. 에버콜라겐 타임 시그니처 |

**콜라겐 안전 후보 소진 확인**: 단일-콜라겐·비복합·미승격·미선점·지표표시량 존재·serving 파싱·guard PASS 후보를 전량(32) 생산. 잔여는 전부 상기 복합형/부원료hero/표시량부재/bulk/guard 사유(안전 후보 아님).

---

## 4. 게이트·불변식 준수

| 게이트 | 결과 |
|------|------|
| dry-run PASS (양 배치 masters=ko=en, canonicalDup 0) | ✅ |
| apply postVerify PASS | ✅ |
| 예상 write = 실측 write (128) | ✅ |
| rollback manifest 생성 | ✅ (`/c/tmp/hff-a/manifests/`) |
| 기존 LIVE drift 0 (콜라겐 4-tag canonicalDup 0·prior 배치 불변) | ✅ |
| 기존 7 config 회귀 무변경 (colHasAmount 확장·allKoFuncs 는 additive) | ✅ |
| 공용 파일 무접촉 (registry/select/generate/compose/apply/guard read-only) | ✅ |
| A/B/C 소유 원료 교집합 0 (콜라겐=A·히알루론 미접촉=B/C shard) | ✅ |
| 복합형 오귀속 차단 (MULTI_ING_FN 5·이미 LIVE 오귀속 0) | ✅ |
| 매장용 설명서 공식 기능성 원문 보존(피부보습/자외선 그대로) | ✅ |

---

## 5. 산출물 / 남은 TODO

- 신규 코드: `apps/api-server/src/scripts/hff-sf-a-build.ts` — `colHasAmount` 서열 표시량 절 + `allKoFuncs` 다원료 복합형 방어 + 루프 `MULTI_ING_FN` 게이트. **additive, 기존 config·동작 무영향.**
- apply: 기존 `hff-sf-apply.ts` 무수정 재사용. 조사 probe(`_acol_amount/_acol_iv*.cjs`)는 read-only 임시 → 삭제 완료.

### 남은 TODO / 재개 위치
1. GUARD D-CLAIM(코팅 성상) 3 — composeSf 성상 서술 조정(공유파일 WO) 또는 사람 검수 수용 후 생산.
2. GUARD PRE-SRC-BASIS-UNVERIFIABLE 18 (액상) — 액상 기준량 grounding 보강 후 재평가.
3. REVIEW_NO_MARKER_AMOUNT 7 / COMPOSE bulk 5 — 원천 표시량·소비자 serving 확인 후.
4. MULTIVIT_HERO 33 / COMBO 83 — 복합형·멀티비타민 별도 트랙.
5. 히알루론/뮤코다당 — B/C shard 소유(A 미개입).

관련: 선행 CHECK = `docs/checks/CHECK-O4O-HFF-INDEPENDENT-COLLAGEN-MAX-PRODUCTION-A-V1.md`
