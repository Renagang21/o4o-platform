# CHECK — Agent C registry 확장 통합·회귀 + shard 1 언락 생산 (Agent B)

- 성격: Agent A·C 신규 registry를 공통 생산 파이프라인에 통합·회귀검증 + shard 1 언락 후보 생산.
- 기준 commit `54983a836`. T0 15:52.

## 1. 통합 대상·검증

- Agent C가 `hff-nutrient-registry.ts` INGREDIENT_FN 에 **7원료 기능성 매핑 추가**(로컬 워킹트리 미커밋 — Agent C 소유, 미접촉·미커밋): 오메가3·가르시니아·녹차·감마리놀렌산·프로폴리스·은행잎·테아닌.
- **KO→EN 연결 검증**: 7원료 **22개 기능성 전부 `mapFunctionEn` 매핑(gap 0)** — FUNCTION_MAP + COMPONENT 분해로 "…도움을 줄 수 있음"형 EN 정상. 공용 composer(compose.ts) 카드 렌더 정상.
- **언락 실증**: `비타민C+아연+칼슘+프로폴리스` 등 registry 이전 ELIGIBLE 0(귀속 HOLD) → **이후 ELIGIBLE 11·12**(귀속 PASS).

## 2. 회귀검증 (read-only, DB write 0)

| 항목 | 결과 |
|------|:---:|
| single-lutein 21/8/2 | **유지**(rederive changedVsQueue 0) |
| 기존 그룹 drift / target 감소 | **0**(INGREDIENT_FN 은 신규 키 추가 = 기존 키 귀속 불변) |
| 신규 원료 오귀속 | **0**(명시 귀속·mapFunctionEn 게이트) |
| shard 0/1/2 교집합 | **0**(1066 sig, 755/526/895) |

## 3. shard 1 언락 생산 (직접주입 + exclude-taken + 자동apply)

- fresh shard-1 plan(--include-functional): 250 sig / 526 후보.
- 직접주입 strict select → 신규 registry 로 **프로폴리스·감마리놀렌산 조합 언락** + base 잔여 singleton.
- generate READY 64(사이드카 포함 집계) → dry+자동apply **17 그룹 · 55건 LIVE** · write 220 · **ALREADY_PROMOTED 0 · canonicalDup 0**. slug `combo-ext-*`.
- 독립검증 combo-ext masters **55** · canonicalDup **0** · totalComboLive **2,923**.

## 4. shard별 realistic fresh 물량 (장시간 배치 산정)

| shard | clean signature 후보 | realistic producible(추정) |
|:---:|:---:|:---:|
| 0 (Agent A) | 755 | ~150–250 |
| 1 (Agent B) | 526 | 대부분 소진(base) + 언락분 55 적재 |
| 2 (Agent C) | 895 | ~200–350(신규 registry 오메가3/녹차 등 언락 시) |

- **핵심**: HFF 복합형 producible 총량은 **~수백 규모**(clean signature 2,176 중 grounding/attribution/taken 제외 후 실 producible ~500–800 전 shard 합). **10~15시간 배치는 풀 대비 과다** — 현 풀은 ~3–5시간이면 소진.
- **장시간 배치 실효 물량 = 신규 후보 유입(공공데이터 갱신) 또는 registry 추가 확장에 의존**. 현 인프라(shard·직접주입·mga-TE·자동apply·registry 통합)는 유입 시 즉시 대량 처리 가능(정상 구간 ~500건/시간).

## 5. 준수

- Agent C 미커밋 registry/compose/parse **미접촉·미커밋**(사용만) · 자기 shard(1)만 · 교집합 0 · master 오연결 0 · canonicalDup 0 · git add . 미사용 · pnpm-lock·타 세션 파일 미접촉.

*통합·회귀 read-only · 언락 생산 apply(자동, 사전승인) · path-specific commit.*
