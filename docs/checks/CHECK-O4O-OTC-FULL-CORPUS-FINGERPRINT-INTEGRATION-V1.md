# CHECK — O4O OTC 원문 지문 3-shard 통합 조사

**WO:** WO-O4O-OTC-FULL-CORPUS-FINGERPRINT-INTEGRATION-V1
**성격:** read-only · DB write 0 · 순수 파일 병합
**입력:** `otc-fingerprint-shard-{0,1,2}-{summary,groups,bridge}-v1.json`
**산출:** `apps/api-server/src/scripts/data/otc-full-corpus-fingerprint-integrated-{summary,groups,bridge,exceptions}-v1.json`
**스크립트:** `apps/api-server/src/scripts/drug-otc-full-corpus-fingerprint-integration.ts`

---

## 0. 방법론 — 왜 파일 병합인가

- **샤딩 키 = `md5(item_seq) % 3`** → master 는 shard 간 **배타**(중복 0, 구조적).
- **fingerprint(원문 지문) = 정규화 효능·용법·주의 + 성분\|함량\|제형\|경로 해시** → **item_seq 와 무관**. 따라서 동일 원문(동일 fingerprint)이 **여러 shard 에 산재**한다. 통합의 본질은 이 산재 fingerprint 를 **shard 경계 없이 병합**해 그룹 수·커버리지·singleton 을 재계산하는 것.
- 로컬 DB 는 prod 19,131 모집단을 보유하지 않고(프로덕션 방화벽, CLAUDE.md §0), shard 데이터는 DB 연결 환경에서 생성·커밋됨 → **DB 재스캔 불가·불필요**. WO 명세대로 **shard 산출 파일을 병합**한다.
- per-group 정본 스키마 = **bridge 파일**(3 shard 일관). groups 파일은 shard 0/1 이 `bridgeKey`/`extendability` 미포함(초기 스키마)이라 병합엔 bridge 파일 사용.

---

## 1. 통합 게이트 — 전부 PASS

| 게이트 | 값 | 판정 |
|---|---|---|
| 3-shard 합계 19,131 | 6,407 + 6,452 + 6,272 = **19,131** | ✓ |
| bridge sumSize = shardMasters | [6407, 6452, 6272] 일치 | ✓ |
| groups sumSize = shardMasters | [6407, 6452, 6272] 일치 | ✓ |
| extract 실패 0 | [0, 0, 0] | ✓ |
| master 중복 0 | 샤딩 `%3` 배타 분할(구조적) | ✓ |
| 누락 0 | 병합 후 sum(size) = **19,131** | ✓ |
| fingerprint 규칙 동일 | bridgeKey-inconsistent = **0** | ✓ |
| DB write | **0** | ✓ |

---

## 2. 병합 결과 — fingerprint 재계산

| 항목 | 값 |
|---|---|
| per-shard group rows (병합 전) | 2,285 + 2,232 + 2,265 = **6,782** |
| **통합 fingerprint 그룹 수** | **6,216** |
| 병합 소거된 중복 fingerprint 행 | 566 |
| shard 경계 넘는 collided fingerprint | **433** (2-shard 300 · 3-shard 133) |

> 순진한 concat(6,782 그룹)은 그룹을 566 과다 계상하고 singleton 을 오분류한다. 통합의 실효는 여기서 나온다.

**tier 분포(병합, 보수적 max-merge):**

| Tier | groups | masters |
|---|---|---|
| Tier1 | 3,586 | 12,468 |
| Tier2 | 11 | 130 |
| Tier3 | 15 | 310 |
| Tier5 | 2,604 | 6,223 |

**그룹 크기 분포:** singleton 2,130 · 2–5: 3,403 · 6–20: 637 · 21–50: 36 · 51+: 10.

---

## 3. 필수 산출 수치

| 지표 | 값 |
|---|---|
| 전체 fingerprint 그룹 수 | **6,216** |
| 경구(단일제) master | **12,908** |
| 비경구·복합 master(별도트랙) | **6,223** |
| 기존 authored 확장 가능 제품 수 | **2,732** (검토후확장후보) |
| 확장 가능 authored 대표 설명서 수 | **60** (distinct `source_ref_id`) |
| 신규 작성 필요 그룹 수 | **1,071** (제품 2,879) |
| singleton 그룹 수 | **2,130** |
| 무성분명(ATC 보강 대상, 경구·단일) | **7,301** |
| 무성분명 전체(경구+비경구) | **9,622** |

**누적 커버리지(전체 6,216 그룹 기준):**

| 상위 N | 제품 | 누적 % |
|---|---|---|
| 10 | 762 | 3.98% |
| 50 | 1,965 | 10.27% |
| 100 | 2,758 | 14.42% |
| 500 | 6,196 | 32.39% |

**X% 커버에 필요한 대표 그룹 수:** 50% → **1,187** · 70% → **2,361** · 80% → **3,238** · 90% → **4,303**.

> 원문이 롱테일이다. 상위 500 그룹이 전체의 32% 만 덮고, 90% 도달에 4,303 그룹이 필요. 소수 대표 설명서로 대량 흡수되는 구조는 아니며, **커버리지 큰 그룹 우선** 전략이 여전히 유효(§5).

---

## 4. 4구획 (재사용 · 신규 · 분리 · 비경구)

| 구획 | masters | groups |
|---|---|---|
| 검토후확장후보(기존 authored 확장) | 2,732 | 400 |
| 새설명서필요 | 2,879 | 1,071 |
| 주성분코드필요(무성분명) | 7,301 | 2,142 |
| 비경구-별도트랙 | 6,219 | 2,603 |
| **합** | **19,131** | **6,216** |

- 고정 원칙 유지: **ATC = 후보 연결 키 / 안전지문 = 최종 분리 키**.
- 비경구 track master = 6,219(4구획, 병합 fingerprint 기준) vs 6,223(Tier5, per-shard 배타 합). **4-master 격차**는 shard 가·나·다 스크립트 진화 차(tier vs extendability 판정 미세 상이)에서 발생 — 이 격차는 `...-exceptions-v1.json` 에 기록.

### ⚠️ ATC 안전지문 대조 — 합산 불가, 글로벌 재계산 대상

- shard 별 **방법론 상이**: shard1 = 명명+무성분명 pool(안전일치 2,883 / 3,014 후보), shard2 = 무성분명·grounded-named pool(안전일치 213 / 후보 421 / 대상 2,465), shard0 = ATC 필드 부재.
- 후보풀·대상 정의가 달라 **산술 합산 부당**. 통합 확정 = **대상 모집단(무성분명 경구·단일 7,301)** 뿐. 안전지문 일치/불일치·흡수 수는 **단일 규칙 글로벌 재계산(DB-백드 후속 WO)** 으로 확정한다. shard-local 원값은 `atcBridge.perShard_안전매칭_방법론상이` 에 투명 보존.

---

## 5. 다음 대량 apply 후보 (커버리지 우선)

`검토후확장후보`·`새설명서필요` fingerprint 를 size 내림차순(상위 100 = 산출 bridge 파일). 대표:

| size | tier | 구획 | bridgeKey | authored refs |
|---|---|---|---|---|
| 190 | Tier1 | 검토후확장 | 에르도스테인\|300밀리그램\|캡슐\|oral | 1 |
| 90 | Tier3 | 검토후확장 | 아세틸시스테인\|200밀리그램\|캡슐\|oral | 1 |
| 67 | Tier1 | 검토후확장 | 아스피린\|100밀리그램\|정\|oral | 1 |
| 66 | Tier1 | 검토후확장 | 트리메부틴말레산염\|100밀리그램\|정\|oral | 1 |
| 63 | Tier1 | 검토후확장 | 아세틸시스테인\|200밀리그램\|캡슐\|oral | 1 |
| 62 | Tier1 | 검토후확장 | 에르도스테인\|300밀리그램\|캡슐\|oral | 1 |

> ⚠️ **동일 약학단위 원문 분열**: `에르도스테인\|300밀리그램\|캡슐\|oral` 이 size-190 과 size-62 **두 fingerprint** 로 존재(같은 bridgeKey, 다른 원문). authored 1건으로 일괄 확장 시 원문·안전지문 대조 후 병합 판단 필요 — 후보키만으로 확정 금지(shard 문서 §7 계승).

---

## 6. 예외 / 한계 (exceptions 파일)

- **extract 실패 0** (3 shard 전부).
- shard 간 미세 불일치(가·나·다 스크립트 진화 차, `...-exceptions-v1.json` 수록):
  - bridgeKey-inconsistent: **0** (fingerprint 규칙 동일 확증)
  - extendability-inconsistent: **1**
  - tier-inconsistent(shard 간): **13**
- **collided fingerprint 433** 의 Tier1/2/3 세부는 shard 경계 넘는 raw/norm-full 원문 비교가 필요 → 파일만으로 정밀 재계산 불가. 병합 tier 는 **보수적 최악값**으로 표기, 433 을 세부 불확실성 상한으로 명시. (Tier5 총계 6,223 은 구조적으로 정확.)

---

## 7. 완료 기준 대조

| 기준 | 판정 |
|---|---|
| grounded OTC 19,131 전체 병합 | ✓ (sum(size)=19,131) |
| authored bridge 완료 | ✓ (검토후확장 2,732 / 대표 refs 60) |
| 재사용·신규·분리·비경구 수치 확정 | ✓ (§4) |
| 다음 대량 apply 후보 제시 | ✓ (§5, bridge 파일 top100) |
| DB write 0 | ✓ |
| 재실행 byte-identical | ✓ |
| 자기 파일만 commit·push | ↓ 진행 |

---

*Generated read-only. 다음 단계 = 커버리지 큰 fingerprint 그룹부터 대량 apply(소규모 성분 배치 아님) + ATC 안전지문 글로벌 재계산 후속 WO.*
