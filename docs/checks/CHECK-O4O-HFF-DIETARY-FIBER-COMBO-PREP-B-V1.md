# CHECK — 식이섬유 Combo 생산 준비 (census·fixture) + C parser 대기 (Agent B) V1

- 상위 WO: `WO-O4O-HFF-DIETARY-FIBER-COMBO-PRODUCTION-B-V1`. 자동승인 계약 [`...AUTO-AUTHORIZATION-CONTRACT-V1`](../work-orders/WO-O4O-HFF-CONTENT-PRODUCTION-AUTO-AUTHORIZATION-CONTRACT-V1.md).
- 성격: **준비 단계(read-only) · DB write 0 · 공용 parser 무접촉**(이번 라운드 `hff-source-parse.ts` 소유자 = Agent C).
- 시작 `2026-07-23 20:37 +0900` · 종료 단일 세션. 채널 Proxy 5436(자체 토큰).
- 선행 커밋 확인: A `2c33268f2` · B `26cb4253f` · C `828704e82` — 전부 origin 포함 ✓.

## 0. 결론

> **B-01~B-04 준비 완료** — 식이섬유 family 전수 census(2,335 제품) · 표기 변이 · fixture 10종(실원문) 확보.
> **Agent C 의 식이섬유 parser 확장 commit 은 아직 origin 미반영**(최신 parser 변경 = `9b872b05d`) → **B-05 감지 대기**. 반영 즉시 회귀 fixture(본 문서 §3) 실행 → 생산(B-06~B-10) 자동 전환.
> DB write 0 · 공용 parser/registry 수정 0 · generic 식이섬유(원료 특정 불가) 642 는 **생산 제외** 확정.

## 1. 기준선 (read-only)

- 전체 LIVE 총량은 병렬 생산으로 유동 → 자기 manifest drift 판정에 미사용(WO 지침). canonicalDup·stmtDup 는 직전 세션 0 확인 유지.
- B 누적 LIVE(직전): 단일 기능성 44(독립 TODO) + shard1 30 + probiotics 52 + 이전 배치.

## 2. B-01 식이섬유 family census (스캔 41,261)

식이섬유 기능성(배변/유익균/식후혈당/콜레스테롤) 보유 제품 **2,335** · **generic-only 642(생산 제외)** · 다원료 혼합 38.

| 원료 | total | solid | **notTaken(생산가능 상한)** | pure-fiber | 타원료 동반 |
|---|---:|---:|---:|---:|---:|
| 프락토올리고당 | 625 | 586 | **559** | 118 | 507 |
| 차전자피 | 526 | 504 | **287** | 311 | 215 |
| 난소화성말토덱스트린 | 397 | 123 | **107** | 108 | 289 |
| 자일로올리고당 | 88 | 67 | **63** | 26 | 62 |
| 귀리 | 34 | 33 | **25** | 18 | 16 |
| 이눌린·치커리 | 27 | 22 | **15** | 18 | 9 |
| 폴리덱스트로스 | 34 | 1 | **1** | 4 | 30 |

- **타도메인 동반원료(B-04, parser 확장 시 누락 감시)**: 아연 457 · 가르시니아 420 · 프로바이오틱스 388 · 비타민류 249 · 녹차 62 · 바나바 24 · 알로에 14 · 은행잎 12 · 키토산 2 · 밀크씨슬 3.

## 3. B-02/B-03 표기 변이 + fixture (회귀 계약)

- **포맷 분포**: 표시량형 1,663 · %단독 1,035 · X이상형 948 · 비율형 680 · 기타 18.
- **라벨 변이(상위)**: `N) 식이섬유` / `N. 식이섬유` / `N) 프락토올리고당` / `식이섬유(%)` 등 — 번호·마침표·괄호%(형) 변이.
- **fixture 10종**(실원문, `hff-fiber-prep/fiber-fixtures.json` — 기대 원료 귀속 포함):
  차전자단독 · 난소화성단독 · 폴리덱스트로스단독 · 다원료동반(난소화성+프락토) · 총량+개별(귀리) · X이상형 · ㎎표기 · 줄바꿈형 · 타원료동반 · generic만(생산제외 케이스).
- **코퍼스 부재 2종**: `그램표기`·`표형식` — 41,261 전수에서 미발견(존재하지 않는 포맷). fixture 미작성이 아니라 **해당 포맷 무존재** 기록.

## 4. B-05 — Agent C parser commit 대기 상태

- 폴링 실측: `hff-source-parse.ts` 최신 변경 = `9b872b05d`(registry 7종 해금) — **식이섬유 확장 아님**.
- 반영 감지 시 절차(자동 전환): pull/ff → **본 fixture 10종으로 회귀**(원료별 표시량 보존 · 다원료 비붕괴 · 타도메인 원료 비누락 · 기존 등록원료 combo 회귀 0 · deterministic) → PASS 포맷만 생산, FAIL 포맷 HOLD.
- 생산 우선순위(§2 기준): 차전자피(고형·pure 다수) → 프락토올리고당 combo → 난소화성 → 자일로/귀리/이눌린. 폴리덱스트로스는 solid 1 뿐(사실상 액상 원료).

## 5. 준수 사항

- 공용 parser/classify/registry **수정 0**(C 소유권 존중) · 임시 유사 parser 미작성.
- generic 식이섬유 642 생산 제외 확정. 원료별 기능성 임의 합침/삭제 0. DB write 0.

## 6. 산출물

- census: `docs/checks/data/product-description-guard/hff-fiber-prep/fiber-census.json`
- fixture: `.../hff-fiber-prep/fiber-fixtures.json` (기대 귀속 포함)
- 도구(B 전용): `apps/api-server/src/scripts/hff-fiber-census.ts`

---

*준비 단계 read-only · DB write 0 · 공용 parser 무접촉. 생산은 C parser commit 반영 + fixture 회귀 PASS 후 자동.*
