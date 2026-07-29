# CHECK — WO-O4O-OTC-EASY-DRUG-V4-ROUTE-EXCEPTION-673-BULK-RESOLUTION-V1

route 예외 673 master 원인별 일괄 판정 (agent-na, READ-ONLY)

- 선행 commit: `a15c7119d`
- **LIVE 설명서 생산 0 · DB write 0** — 공식 원문 + 구조화 데이터 read-only 판정만 수행
- 결정론: 전량 규칙 기반(LLM 판단 미개입) → 2회 실행 byte-identical

---

## 1. 입력 673

| 출처 | 건수 |
|---|---|
| 기존 생산 예외 route | 118 |
| selectionExcluded route | 555 |
| **합계 (중복 제거 후)** | **673** |

제외 확인: SOURCE_EFFICACY_MISSING 24 · EXCLUDE 266 · 기존 GREEN 2,846 혼입 **전부 0** (독립검증 RV-05~07).

---

## 2. 판정 결과

| 분류 | 건수 |
|---|---:|
| **RECOVERABLE_ROUTE_CONFIRMED** | **535** |
| TRUE_MULTI_ROUTE | 46 |
| ROUTE_SOURCE_CONFLICT | 31 |
| HOLD_UNRESOLVED | 35 |
| REQUIRES_ROUTE_PROFILE | 26 |
| EXCLUDE_CONFIRMED | 0 |
| **합계** | **673** |

### route별 분포

| route | 확정 | composer |
|---|---:|---|
| topical | 496 | 지원 |
| oromucosal | 39 | 지원 |
| nasal | 14 | **미지원** |
| rectal | 12 | **미지원** |
| unresolved | 112 | — |

- **기존 composer 로 즉시 생산 가능: 535** (topical 496 + oromucosal 39)
- **신규 profile 필요: 26** (nasal 14 + rectal 12)
- **true multi-route: 46**
- **unresolved: 35**
- **conflict: 31**
- **agent-ga 재투입: 535**

---

## 3. 판정 근거

우선순위 고정: 용법 원문 → 효능 원문 → 제형구분 → 기타 섹션 부위·동사 → ATC 표준코드 → composer 계약.
규칙 전문은 `otc-v4-route-673-decision-rules.na.md`.

### 실측으로 드러난 데이터 성질

**제형구분은 route 근거로 약하다.** 실제 값이 포장 단위와 제형이 혼재돼 있다 — 개 509 · 통 154 · 매 120 · 포 31 · 앰플 29 · 정 14 · 주사 12 · 산제 8 · 크림 2 · 겔 2, 게다가 전 master 에 null 행도 함께 존재한다.
→ route 힌트가 명확한 값(크림·겔·매 → topical, 정·산제·포 → oral)만 채택하고 나머지는 근거로 쓰지 않았다.

**ATC 가 실질적 주 축이다.** 673 분포: D08 183 · D09 137 · D02 114 · V07 54 · D11 35 · B05 35 · R02 21 · A06 21 · R01 19 · A01 18 · C05 12 · D06 10 · D04 7 · N02 5 · M02 2.
D 계열 486 + M02 2 = 488 이 피부과용이라 topical 다수의 근거가 됐다. V07(비치료 제품) 54 · B05(관류액) 35 는 route 특정이 불가해 매핑하지 않았다.

### 불변 원칙 준수

- **제품명 단독 확정 0** — 전 행 `productNameUsedInDecision: false`, 독립검증 RV-12 확인
- **타 master route 대표값 사용 0** — master 자기 원문·자기 표준코드만 사용
- **ATC 단독 확정 금지** — ATC 만 있고 원문 부위·동사 근거가 없으면 HOLD_UNRESOLVED
- **상충 시 임의 선택 0** — `resolvedRoute=null` + `conflictingCandidates` 에 후보 보존 (RV-15)
- **frozen 계약 미수정** — 더 넓은 부위 어휘를 판정기가 자체 정의

---

## 4. 독립검증 — **20 / 20 PASS**

판정기 미import · 별개 섹션 파서(태그 분할 방식) · 별개 부위 어휘 · 별개 ATC 매핑 · 별개 검증 SQL · `REPEATABLE READ READ ONLY` 실측 확인.

| 게이트 | 결과 |
|---|---|
| 입력 673 / 분류 합계 673 / master 중복 0 | PASS |
| 인계 원장 route 대상과 동일 집합 | 누락 0 |
| 기존 GREEN · source terminal 24 · exclude 266 혼입 | 0 / 0 / 0 |
| agent-ga 재투입 원장 = RECOVERABLE 수 | 535 일치 |
| HOLD 원장 = 비-RECOVERABLE 수 | 138 일치 |
| RECOVERABLE 전건 composer 지원 route | 위반 0 |
| REQUIRES_ROUTE_PROFILE 전건 미지원 route | 위반 0 |
| 제품명 단독 확정 | 0 |
| 근거 없는 route 확정 | 0 |
| TRUE_MULTI_ROUTE · CONFLICT 의 route 강제 선택 | 0 / 0 |
| **RECOVERABLE route 가 독자 어휘 실측으로 지지됨** | **미지지 0** |
| RECOVERABLE 전건 공식 원문 존재 | 부재 0 |
| RECOVERABLE 에 전문의약품 혼입 | 0 |
| RECOVERABLE 은 authored canonical 미보유 | 0 |
| DB write | **0** |

### 검증 과정에서 잡은 결함 1건

초기 실행에서 **RV-15 FAIL** — `ROUTE_SOURCE_CONFLICT` 25건에 `resolvedRoute` 가 채워져 있었다.
정보로는 유용하지만 하류가 "확정된 route" 로 오독할 수 있고 WO 의 "임의 선택 금지"에 어긋난다.
→ 후보를 `conflictingCandidates` 로 옮기고 `resolvedRoute` 는 null 로 고쳤다. 재실행 20/20 PASS.

---

## 5. 재현성

2회 실행 byte-identical (수정 후 재확인):

| 산출물 | md5 |
|---|---|
| resolution-ledger | `91e250b0abb3a2caf9f8e06f1bfd9467` |
| agent-ga-reentry | `07c452269accadcd4d96401edcb7a180` |
| hold-ledger | `8785dee4b499a7cce0d30dec1826fba1` |

---

## 6. 후속 처리

### RECOVERABLE_ROUTE_CONFIRMED 535 → agent-ga 최종 생산 대기열

`otc-v4-route-673-agent-ga-reentry.na.json`.
route 는 `resolvedRoute` 를 사용하고, sourceRef 는 `masterRefV4` 로 동일 결정되므로 기존 LIVE 와 충돌하지 않는다.

> ⚠️ 재투입 시 유의: 이 535건은 frozen resolver 가 route 를 확정하지 못해 예외 처리된 master 다.
> 따라서 executor 가 다시 frozen `resolveRouteForMaster` 를 호출하면 **또 예외로 떨어진다.**
> 재투입 배치는 prep 단계에서 `resolvedRoute` 를 **주입**하는 경로가 필요하다. 후속 WO 에서 이 주입 계약을 먼저 정의해야 한다.

### REQUIRES_ROUTE_PROFILE 26 → profile 준비 후 편입

| route | 건수 | 기존 profile 매핑 |
|---|---:|---|
| nasal | 14 | topical 매핑 선례 있음(next2000 LIVE) — 참고 정보로만 기록, 자동 편입 안 함 |
| rectal | 12 | 매핑 대상 아님 — 좌약 삽입 절차가 도포 안내와 실질적으로 다름 |

### TRUE_MULTI_ROUTE 46

제품별 전용 구조 필요 여부를 별도 판정한다. 기존 단일 route composer 에 억지로 넣지 않는다.

### ROUTE_SOURCE_CONFLICT 31 · HOLD_UNRESOLVED 35

공식 근거 부족·상충 상태로 유지. 원문 재수집 또는 표준코드 정정 없이는 확정하지 않는다.

---

## 7. Git 안전

- 자기 산출물만 path-specific add/commit, `git add .` 미사용
- reset / clean / stash / amend / rebase / force-push 미사용
- 병렬 세션 파일 미접촉 (`tmpcols.cjs`, `tmpdiff.cjs`)
- **기존 run별 GREEN 원장 수정 0** (읽기만)
- `pnpm-lock.yaml` · `.env*` 미접촉
- 자격증명·confirm token 미출력
