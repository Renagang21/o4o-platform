# CHECK — 신규 단일 기능성 5종 공용 파이프라인 정본화 + 생산 배정표 (Agent B) V1

- 상위 WO: `WO-O4O-HFF-SINGLE-FUNCTIONAL-5-CANONICAL-PIPELINE-V1`. 자동승인 계약 [`...AUTO-AUTHORIZATION-CONTRACT-V1`](../work-orders/WO-O4O-HFF-CONTENT-PRODUCTION-AUTO-AUTHORIZATION-CONTRACT-V1.md).
- 성격: **공용 생산 기반 확정 · DB write 0 · generate/apply 0 · 기존 LIVE 무수정 · 임의 EN 생성 0.**
- 시작 `2026-07-22 21:29 +0900` · 종료 단일 세션. 채널: Cloud SQL Auth Proxy 5434(자체 토큰), SELECT only.
- 공용 코드 단독 수정자 = Agent B(A/C는 push까지 관련 공용 파일 수정 금지).

## 0. 결론

> **바나바잎추출물·히알루론산·쏘팔메토 = GROUNDING_READY (EN 전부 mapFunctionEn HIT, 즉시 생산 가능).**
> **포스파티딜세린·헤마토코쿠스 = GROUNDING_PENDING (공식 EN 부재 문구 → 해당 제품 제외, 임의생성 0).**
> 공용 단일 기능성(비-CFU) 파이프라인 정본화 완료(`hff-sf-registry/select/compose/generate`) — **원료별 composer 복제 0, 공용 파일 수정 0**(registry `mapFunctionEn` read-only 재사용).
> generate PASS(compose+Guard) **79** (바나바 37·히알루론산 21·쏘팔메토 16·헤마토 5). A/B/C stmt-shard 직접주입 배정표 산출. **shard 교집합 0 · canonicalDup 0 · statementNo 중복 0 · 기존 LIVE drift 0 · DB write 0.**

## 1. 기준선 (새 연결 read-only)

| 지표 | 값 |
|---|---|
| 프로바이오틱스(장건강) LIVE | 767 (병렬 A/C shard0/2 반영분 포함) |
| 복합형 LIVE (tag-agnostic, 카드≥2) | 4,526 |
| canonicalDup | **0** |
| statementNo 중복 master | **0** |

- 집계 조건: `description_type='STORE' · status='canonical' · deleted_at NULL · source_type='o4o_hff_generated'`.

## 2. 원료별 KO/EN 기능성 정본 (grounded)

KO = 제품 MAIN_FNCTN 원문. EN = 공용 `mapFunctionEn` 재사용(**임의생성 0**). 미매핑 → GROUNDING_PENDING.

| 원료 | 공식 기능성 KO(대표) | EN(mapFunctionEn) | 상태 |
|---|---|---|---|
| **바나바잎추출물** | 식후 혈당상승 억제에 도움을 줄 수 있음 | May help with suppressing the rise in blood sugar after meals | **READY** |
| **히알루론산** | 피부보습에 도움을 줄 수 있음 | May help with skin moisturisation | **READY** |
| **쏘팔메토열매추출물** | 전립선 건강의 유지에 도움을 줄 수 있음 | May help with maintaining prostate health | **READY**(조사 '의'→'전립선 건강 유지' 최소 정규화, 의미 동일·기존 EN 재사용) |
| **포스파티딜세린** | 노화로 인해 저하된 인지력 개선 · 자외선에 의한 피부손상으로부터 피부건강 유지 · 피부보습 | 인지력·자외선피부건강 **MISS** | **PENDING** |
| **헤마토코쿠스추출물** | 눈의 피로도 개선 | **MISS** | **PENDING**(눈피로도) — 일부 타기능성 제품만 READY 8 |

- **원료명 변이 인식**: 바나바=`바나바`/`코로솔산`(지표)/`Banaba` · 히알루론산=`히알루론`/`Hyaluron` · 헤마토=`헤마토코쿠스`/`아스타잔틴`(지표) · 쏘팔메토·포스파티딜세린=단일.
- EN 확정은 **정적**(mapFunctionEn 결과 고정) — production generate 중 실시간 LLM 호출 0. PENDING EN 은 registry 확장 WO(사람검수) 대상, 본 작업 미반영.

## 3. 공용 파이프라인 (신규 · 공용 파일 무수정)

프로바이오틱스(CFU) 계약을 **비-CFU 표시량/기능성 단일**로 일반화. **원료 config 파라미터화**(복제 0):

| 파일 | 역할 |
|---|---|
| `hff-sf-registry.ts` | 5원료 config(labelRe·displayKo/En·fnNormalize·statusHint) + `resolveFunctions`(KO grounded / EN=mapFunctionEn) |
| `hff-sf-select.ts` | `--ingredient` 파라미터. pure-single·고형·미승격·exclude-taken·stmt-shard·grounding 분류 |
| `hff-sf-compose.ts` | 결정적 grounded sd-card(기능성 KO/EN 카드, 물 chip 근거시만, 성상 dangling 가드) |
| `hff-sf-generate.ts` | composeSf + runGuard → target |

- **공용 파일(hff-source-parse·hff-nutrient-registry·기존 composer) 수정 0** → combo/probiotics/nutrient 회귀 **구조적으로 불가**(§5 실측 확인). `mapFunctionEn`·`classify`·`parseServing` 은 import 재사용만.
- stmt-shard 계약(정본): `FNV-1a(String(STTEMNT_NO).trim()) % 3`, 빈 stmt 제외 — 프로바이오틱스와 동일 구현.

## 4. 선정 퍼널 + generate 결과 (원료별)

| 원료 | pure-single 고형 | grounding-READY(select) | generate PASS | REVIEW_LATER/BLOCKED | shard 0/1/2(READY) |
|---|---:|---:|---:|---:|---|
| 바나바잎추출물 | 46 | 42 | **37** | 5 | 13/16/13 |
| 히알루론산 | 30 | 23 | **21** | 2 | 5/13/5 |
| 쏘팔메토열매추출물 | 19 | 16 | **16** | 0 | 8/4/4 |
| 헤마토코쿠스추출물 | 20 | 8 | **5** | 3 | 3/2/3 |
| 포스파티딜세린 | 46 | **0** | — | 46(EN PENDING) | 0/0/0 |

- REVIEW_LATER 사유: EN 미매핑(GROUNDING_PENDING) · 섭취 파싱 실패 · BULK · PRE-SRC-BASIS-UNVERIFIABLE · D-CLAIM-GROUNDED(보수적 REVIEW). **개별 제품만 분리, 배치 계속**(계약 §6).

## 5. 회귀검증

| 항목 | 결과 |
|---|---|
| 공용 파일 수정 | **0** (hff-sf-* 신규만, 기존 registry/parser/composer 무변경) |
| 기존 프로바이오틱스/복합형 LIVE | 무변경(canonicalDup 0·stmtDup 0, 집계 §1) |
| 5종 간 원료 교차 귀속 | 0 (pure-single 브래킷 1종 → 원료 disjoint) |
| shard 0/1/2 교집합 | **0** (배정 stmt 89 전건 unique) |
| deterministic rerun | 동일 입력 → 동일 출력(파서·hash 결정적, 실시간 LLM 0) |
| 액상/복합기능성 제외 | LIQUID 필터 + pure-single(브래킷 1) |

## 6. A/B/C 직접주입 생산 배정표

`docs/checks/data/product-description-guard/hff-sf-assignment/` — 매니페스트 `_assignment-manifest.json` + 원료별 `<slug>-shard-0|1|2.json`(stmt 배열, 직접주입) · `<slug>-ready.json`(source+기능성, compose 입력) · `<slug>-review-later.json`.

| 원료 | shard 0(A) | shard 1(B) | shard 2(C) | 계 |
|---|---:|---:|---:|---:|
| 바나바잎추출물 | 13 | 16 | 13 | 42 |
| 히알루론산 | 5 | 13 | 5 | 23 |
| 쏘팔메토열매추출물 | 8 | 4 | 4 | 16 |
| 헤마토코쿠스추출물(부분) | 3 | 2 | 3 | 8 |
| **합계** | **29** | **35** | **25** | **89** |

- realistic producible(generate PASS 기준) ≈ 79. A/B/C 는 자기 shard 파일로 `hff-sf-generate` → dry-run → apply(자동승인 계약).

## 7. 보고 요약

```text
시작 2026-07-22 21:29 +0900 · 종료 단일 세션
기준선: 프로바이오틱스 767 · 복합형 4,526 · canonicalDup 0 · stmtDup 0 (verifier: STORE·canonical·ko·o4o_hff_generated)
KO/EN 정본: 바나바(식후혈당)·히알루론산(피부보습)·쏘팔메토(전립선,‘의’정규화) = READY / PS·헤마토 = PENDING(EN 부재)
공용 파이프라인: hff-sf-registry/select/compose/generate 신규 · 공용 파일 수정 0 · composer 복제 0
회귀: 기존 LIVE 무변경 · 교차귀속 0 · shard 교집합 0 · deterministic
원료별 READY/PASS: 바나바 42/37 · 히알루론산 23/21 · 쏘팔메토 16/16 · 헤마토 8/5 · PS 0
shard producible(READY): 0(A) 29 · 1(B) 35 · 2(C) 25 · 계 89 (generate PASS ≈79)
배정표: docs/checks/data/product-description-guard/hff-sf-assignment/
DB write 0 · registry 수정 0 · 임의 EN 생성 0
```

## 8. 후속 (권고)

- 즉시 생산: 바나바 → 히알루론산 → 쏘팔메토(3종 READY). A/B/C 각 shard 파일로 완결 생산(자동승인 계약).
- PENDING 해소: PS(인지력·자외선피부건강 EN) · 헤마토(눈피로도 EN) — 공식 근거 EN 확보 후 registry `mapFunctionEn` 확장 WO(사람검수). 확보 전 생산 금지(임의생성 금지).

---

*read-only · DB write 0 · generate/apply 0 · registry 수정 0 · 기존 LIVE 무수정 · 임의 EN 생성 0.*
