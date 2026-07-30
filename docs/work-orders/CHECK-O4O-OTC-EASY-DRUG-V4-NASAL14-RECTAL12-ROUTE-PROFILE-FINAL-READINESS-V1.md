# CHECK — WO-O4O-OTC-EASY-DRUG-V4-NASAL14-RECTAL12-ROUTE-PROFILE-FINAL-READINESS-V1

> nasal 14 + rectal 12 = **26 master** 전용 route profile 신설 · KO/EN 저작 · dry-run · rollback-test ·
> 독립검증까지 수행하여 **PRE_APPLY READY** 도달. **LIVE apply 미실행 · 커밋된 DB write 0.**

- 작성일: 2026-07-30
- 에이전트: 가 (agent-ga)
- 배치 ID: `otc-v4-nr26`
- 선행: route 예외 673 판정 원장 `45b2f1add` → carry-over reconciliation `7bf0b580a` → RECOVERABLE 535 생산 `2424016a0`
- **최종 판정: PRE_APPLY READY (nasal-unit-1 · rectal-unit-1) / 커밋 DB write 0**

---

## 1. 결론 요약

| 항목 | 결과 |
|------|------|
| 대상 | nasal 14 + rectal 12 = **26 master** |
| 입력 게이트 | **19/19 PASS** · SYSTEM STOP 0 |
| KO 저작 | **26/26** composed · blocked 0 |
| EN 저작 | **26/26** composed · blocked 0 · TM 미보유 문장 0 |
| route 요소 게이트 | 26/26 · elementViolations **0** · inversions **0** |
| dry-run | nasal 14/14 · rectal 12/12 · **2회 byte-identical** |
| rollback-test | 26/26 PASS · TX 내부 **156T** 후 전량 ROLLBACK · 잔여 **0** |
| 독립검증 | **43/43 PASS** (+ 게이트 자체 negative control 7/7 PASS) |
| **커밋된 LIVE DB write** | **0** |
| LIVE apply | **LOCKED** (승인 WO + env 2개 동시 충족 필요) |

---

## 2. 모집단 — 재판정 없이 승계

carry-over 원장(`otc-v4-route-673-carryover-ledger.ga.json`)의 `classification='REQUIRES_ROUTE_PROFILE'` 138건 중
`resolvedRoute ∈ {nasal, rectal}` 26건. **route 재판정은 하지 않았다** — 원장의 `resolvedRoute` 를 그대로 승계했고,
독립검증 IV-04 가 drift 0 을 실측 확인했다.

| unit | route | master |
|------|-------|:---:|
| `nasal-unit-1` | nasal | 14 |
| `rectal-unit-1` | rectal | 12 |

### 입력 게이트 (IG-01 ~ IG-19, 전부 PASS)

총 26 · nasal 14 · rectal 12 · 중복 0 · 선행 GREEN 교집합 0 · source terminal 24 교집합 0 ·
기구 멸균제(회수 3) 교집합 0 · exclude 266 교집합 0 · 재투입 큐 535 교집합 0 · 전문의약품 혼입 0 ·
기존 authored KO·EN canonical 0 · 기존 V4 sourceRef 점유 0 · sourceRef 내부 중복 0 ·
resolvedRoute 승계 일치 · 공식 원문 hash 단일 · canonicalDup 0 · 공식 OTC 분모 밖 0 ·
비인체 적용 제품 0 · 선정 26(드롭 0).

---

## 3. 무엇을 새로 만들었나 — 배치 전용 route profile

nasal·rectal 은 기존 composer 지원 route(`oral·oromucosal·ophthalmic·topical·vaginal`) **밖**이라
route 예외로 이월돼 있었다. 이번에 만든 것은 **배치 전용 profile 주입**뿐이다.

- 공용/V3/V4 composer 파일은 **한 줄도 수정하지 않았다.** 기존 `composeKoV3(..., profiles)` /
  `renderEnV3(..., profiles)` 의 **주입 seam** 만 사용한다 → 선행 LIVE 3,378건 산출물 재현성 보존.
- `otc-v4-nr26-profile.ga.ts` — nasal 필수 10요소 / rectal 필수 9요소 검출기 + 경로 계열 마커 10종 +
  KO·EN 금지 표현 + `routeGate()`.

| profile | 필수 요소 |
|---------|----------|
| **nasal (§6)** | 비강 내 사용 · 분무/점적 · 콧구멍/비강 부위 · 1회 분무 수 · 1일 횟수 · 간격 · 기간 · 연령 · 사용 전 조건 · 용기 끝 접촉 주의 |
| **rectal (§7)** | 직장 내 사용 · 좌약 삽입/관장 · 1회 사용량 · 1일 횟수 · 간격 · 기간 · 연령 · 배변 전후 등 조건 · 삽입 깊이·자세 |

금지 표현(§6/§7)은 KO·EN 양쪽에서 강제한다: 경구 복용 · 점안 · 피부 도포 · 질내 삽입 · 원문에 없는
코세척/흡입법/투여 자세 창작 · 좌약과 관장의 동일 표현 단순화.

### 공식 원문 보존 결과 (routeGate 26행)

- `elementViolations` **0** · `inversions` **0** · `ownMarkerInRendered` 26/26 true
- nasal 보존 카운트: site/delivery/nostril/perDose/age 각 14, tipHygiene 7, interval 2
- rectal 보존 카운트: site/delivery/perDay/perDose 각 12, age 9, timing 3

> 존재하지 않는 요소를 만들어내지 않았다. tipHygiene 7 / interval 2 처럼 **원문에 있는 만큼만** 보존된다.

---

## 4. KO·EN 저작

| 항목 | 값 |
|------|---|
| KO composed | **26 / 26** (nasal 14 · rectal 12), blocked 0 |
| EN composed | **26 / 26**, blocked 0 |
| TM 미보유 문장 | 0 |
| EN 이상치 샘플 | 0 |
| route guard 면제 | 18건 — 전부 **공식 원문 근거 있음** (12 × KO `내복용…사용하지 마십시오` → EN `do not use it orally`, 6 × KO `복용하지 마십시오`(상호작용) → EN `do not take`) |

### Translation Memory

`split 19 pending → 3 shard → 19 문장 저작 → merge`: before 6 · applied 19 · after 25 · pendingAfter **0** · rejected **0**.

EN 은 **문장 단위 결정론적 TM 조립**이며 외부 LLM 자유 생성이 아니다. 병합 게이트: 공란 · 한글 잔존 ·
원문 수치 누락 · 원문에 없는 수치 추가 · **경로 표현 역전(이번에 신설)**.

### 이번에 앞당긴 방어 — 경로 표현 역전 게이트

route535 에서는 EN 경구동사 오도입 22건을 **생산 직전 전수검사에서야** 잡았다. 이번에는 **TM 병합 시점**에
막는다. 문장이 쓰이는 경로의 금지 계열 마커가 EN 에 나타났는데 KO 원문에 그 계열 근거가 전혀 없으면 반려한다
(KO 에 근거가 있으면 면제 → 오탐 방지). shard 파일에도 문장별 `forbiddenRouteWords` 를 실어 번역 전에 제약을 노출했다.

**비공허성 negative control 6/6 기대대로**: 직장용에 경구 오도입 → 반려 / 정상 직장 EN → 통과 /
비강용에 점안 오도입 → 반려 / 정상 비강 EN → 통과 / KO 에 복용 근거 있는 `take` → 통과 / 직장용에 질내 오도입 → 반려.

---

## 5. sourceRef (§8)

- namespace `otc-v4-master-leaflet:<masterId>` → md5 → uuid 재포맷. **master 별 결정론적**.
- 26 distinct · 내부 중복 0 · **V2/V3/V4 LIVE 점유 0** · 재실행 시 동일값.
- 독립검증기가 계약 모듈을 import 하지 않고 **산식을 직접 다시 구현**해 26/26 일치를 확인했다 (IV-14).

---

## 6. dry-run (§11)

두 실행 단위를 각각 **동일 조건으로 2회** 실행했다. plan 에는 timestamp·난수·run tag 를 넣지 않는다.

| unit | 결과 | planDigest (sha256) | 2회차 |
|------|------|--------------------|-------|
| nasal-unit-1 | 14/14 DRYRUN_PASS · write 0 | `3358e7b59b7a8af1ef571576fab721ce39a77052dcd843dafd2582d85d284df3` | digest 동일 · plan 파일 **byte-identical** (`cmp`) |
| rectal-unit-1 | 12/12 DRYRUN_PASS · write 0 | `57100f63e1f6a980324e67944aa31eb78516f7e7511362d9921fbcf485b44528` | digest 동일 · plan 파일 **byte-identical** |

독립검증기는 plan 파일을 **직접 다시 해싱**해 실행기가 보고한 digest 와 대조했다 (IV-32).

---

## 7. rollback-test (§12)

**LIVE apply 와 동일한 실행 함수**(`execKo`/`execEn`)를 타고, 커밋 직전 강제 ROLLBACK 한다.

| unit | 결과 | TX 내부 write | 커밋 | 잔여 |
|------|------|:---:|:---:|:---:|
| nasal-unit-1 | 14/14 ROLLBACK_TEST_PASS | **84 T** | 0 | 0 |
| rectal-unit-1 | 12/12 ROLLBACK_TEST_PASS | **72 T** | 0 | 0 |
| 합계 | 26/26 | **156 T** (= 26 × 6) | **0** | **0** |

master 당 6T = KO 4T(authored needs_review INSERT → easy canonical demote → authored canonical flip → audit INSERT)
+ EN 2T(en needs_review INSERT → canonical flip). 실측 156T 가 계약과 정확히 일치한다.

잔여 0 은 **독립 커넥션**에서 다시 확인했다: authored KO/EN 0 · audit 0 · sourceRef 0 · easy ko canonical 원복 1.

---

## 8. 독립검증 (§13) — 43/43 PASS

`otc-v4-nr26-independent-verify.ga.ts` — **select · profile · compose · author · tm-shard · executor 를 하나도 import 하지 않는다.**
섹션 파서 · sourceRef 산식 · 수치/연령/기간 추출 · 경로 마커 · 검증 SQL 을 전부 독자 재구현하고,
`REPEATABLE READ READ ONLY` 트랜잭션에서 DB·파일을 실측 재판정한다.

| 군 | 게이트 | 결과 |
|----|--------|------|
| A 입력 재현 | IV-01~05 | 26 재현 · nasal 14/rectal 12 · 중복 0 · **resolvedRoute drift 0** · unit 배정 정합 |
| B 오염 대조군 | IV-06~10 | 선행 유효 GREEN **3,378** 확인 · 교집합 0 / source terminal 24 · 기구 멸균제 3 · exclude 266 교집합 각 0 |
| C PRE_APPLY 상태 | IV-11~19 | easy ko canonical 1 · authored/EN 점유 0 · canonicalDup 0 · sourceRef 재계산 일치·중복 0·점유 0 · **공식 원문 hash drift 0** · 6섹션 hash drift 0 · 전문의약품 0 |
| D 산출물 품질 | IV-20~31 | payload 26/26 · contentHash 재계산 일치 · **섹션 토큰 커버리지 ≥0.95 미달 0** · 수치/연령/기간 누락 0 · KO·EN 경로 역전 0 · 자기 경로 표현 보존 · EN 한글 0 · EN 신규 수치 0 · 타 master 혼입 0 |
| E dry-run/rollback | IV-32~40 | plan digest 재계산 일치 · rollback 26/26 · TX 156T · **잔여 0** · **커밋 write 0** · 대상 밖 audit 0 · 대조군 write 0 |
| F 선행 불변 | IV-41 | **선행 유효 GREEN 3,378 KO·EN content md5 변경 0 · 소실 0** |
| G 잠금 | IV-42~43 | 이중 게이트 코드 존재 · 현재 세션 잠금 해제 안 됨 |

### 검증기 자체의 비공허성

EN 역전 게이트에는 "부정문 + 공식 근거" 면제가 있다(`do not use it orally` 같은 충실한 번역을 오탐하지 않기 위함).
이 면제가 게이트를 무력화하지 않았음을 `--selftest` 로 확인했다 — **7/7 기대대로**, 특히
`공식 근거 없는 부정문은 면제되지 않는다` 케이스가 정상 반려된다.

### 검증 중 잡아낸 것 (검증기 자체 결함 4건, 모두 수정 후 재실행)

1. EN 역전 12건 → 오탐. 공식 원문 `내복용으로는 사용하지 마십시오` 의 충실한 번역이었다. → 부정문 + 공식 근거 면제 도입.
2. EN 신규 수치 26건 → 오탐. EN 제목의 **허가번호**였다. → 자기 master permitCode 제외.
3. 대조군 write 6건 → 오탐. 대조군 **자기** sourceRef 로 조회해 선행 route535 정상 산출물을 세고 있었다. → 본 배치 26 ref 로 한정.
4. LIVE 잠금 미검출 → env 이름 상수가 계약 파일에 있어 실행기만 보면 놓친다. → 두 파일 모두 실측.

> 전부 **검증기 쪽 오탐/설계 오류**였고 산출물 결함이 아니다. 요구를 완화한 것이 아니라 검출 대상을 정확히 좁혔다.

---

## 9. PRE_APPLY 원장 (§14)

- `otc-v4-nr26-preapply-ledger-nasal-unit-1.ga.json` — 14 master · 예상 write 84T
- `otc-v4-nr26-preapply-ledger-rectal-unit-1.ga.json` — 12 master · 예상 write 72T

각 원장은 master 별 **sourceRef · 공식 원문 hash · 공식 6섹션 hash · KO contentHash · EN contentHash ·
liveState(easy 1 / authored 0 / en 0 / ref 0)** 와 단위별 **dry-run digest · rollback-test 결과 ·
예상 write · 독립검증 결과 · LIVE apply 잠금 상태**를 고정 기록한다. 상태 `PRE_APPLY_READY`.

> 후속 LIVE 생산 WO 는 이 원장을 입력 계약으로 쓴다. 여기 기록된 hash 와 실측이 다르면 그 WO 는 중지해야 한다.

### LIVE apply 잠금

```
LOCKED — OTC_V4_APPLY_NR26=CONFIRM  AND  OTC_V4_NR26_APPROVAL_WO=<승인 WO>  동시 충족 시에만 해제
```

두 조건 모두 없을 때, 그리고 `OTC_V4_APPLY_NR26=CONFIRM` 만 있을 때 각각 실행기가 `LOCKED` 를 출력하고
`exit 3` 으로 거부하는 것을 실측 확인했다. **본 WO 로는 열리지 않는다.**

---

## 10. DB write 회계 (§0 · §3)

| 구분 | write |
|------|:---:|
| dry-run (2 unit × 2회) | **0** |
| rollback-test TX 내부 | 156 T |
| rollback-test 커밋 | **0** |
| **최종 커밋된 LIVE DB write** | **0** |

read-only SELECT 검증 외에 UPDATE/DELETE/DROP/ALTER 는 rollback-test 트랜잭션 내부를 제외하고 수행하지 않았다.

---

## 11. 중지 조건 (§15) — 발생 0

작업 트리 dirty(병행 승인 예외 적용 중) 외에 §15 의 17개 중지 조건 중 **발생한 것은 없다**:
입력 26 재현 실패 · nasal/rectal 수 불일치 · resolvedRoute drift · 공식 원문 hash drift · 비인체 적용 제품 ·
전문의약품 혼입 · 기존 authored canonical · sourceRef 충돌 · canonicalDup · 6섹션 보존 실패 ·
수치/연령/기간 누락 · route 표현 역전 · EN 신규 의료 사실 · rollback 잔여 · 독립검증 실패 · 타 세션 LIVE write 충돌 — 전부 0.

> 병행 세션(HFF) 파일은 삭제·이동·stash·commit 하지 않았고, 커밋은 본 배치 pathspec 으로만 수행했다.

---

## 12. 산출물

**스크립트** (`apps/api-server/src/scripts/`)

| 파일 | 역할 |
|------|------|
| `otc-v4-nr26-contract.ga.ts` | 배치 계약 · unit 정의 · 원장 경로 · LIVE 잠금 env 이름 |
| `otc-v4-nr26-select.ga.ts` | 모집단 재현 + 입력 게이트 19 |
| `otc-v4-nr26-profile.ga.ts` | **nasal/rectal 전용 route profile + 요소 검출기 + routeGate** |
| `otc-v4-nr26-compose.ga.ts` | profile 주입 KO/EN 조립 seam |
| `otc-v4-nr26-tm-shard.ga.ts` | TM split/merge/rekey + **경로 역전 병합 게이트** |
| `otc-v4-nr26-author.ga.ts` | KO·EN 저작 + route 요소 게이트 |
| `otc-v4-nr26-executor.ga.ts` | dry-run · rollback-test · (잠긴) LIVE apply |
| `otc-v4-nr26-independent-verify.ga.ts` | **독립검증 43 게이트 + `--selftest`** |
| `otc-v4-nr26-preapply-ledger.ga.ts` | §14 PRE_APPLY 원장 생성 |

**데이터** (`apps/api-server/src/scripts/data/`) — selection-ledger · source · prep · ko/en-payload ·
tm(+shard) · author-report · dryrun(+plan) × 2 · rollback-test × 2 · independent-verification · preapply-ledger × 2.

---

## 13. 후속 (별도 WO)

1. **nasal 14 LIVE 생산** — 본 CHECK 의 `preapply-ledger-nasal-unit-1` 을 입력 계약으로
2. **rectal 12 LIVE 생산** — `preapply-ledger-rectal-unit-1`
3. TRUE_MULTI_ROUTE 46 조사
4. ROUTE_SOURCE_CONFLICT 31 조사
5. HOLD_UNRESOLVED 35 최종 판정

route 이월 138 중 26 이 PRE_APPLY READY 에 도달했으므로, 잔여 route 이월은 **112**(46 + 31 + 35)이다.
