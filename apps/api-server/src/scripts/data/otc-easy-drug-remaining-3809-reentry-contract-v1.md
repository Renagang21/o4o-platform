# 가→나→가 재진입 계약 (Reentry Contract) — 잔여 3,809 제품별 생산

**WO**: WO-O4O-OTC-EASY-DRUG-REMAINING-3809-MASTER-BY-MASTER-PRODUCTION-QUEUE-AND-EXCEPTION-HANDOFF-DESIGN-V1
**Agent**: 라 (설계 세션 — READ-ONLY, DB write 0)
**Base**: `otc-easy-drug-remaining-3809-master-by-master-census-v1.json`

> 본 문서는 **설계 계약**이다. 실제 생산·재진입은 후속 세션(가/나/다)이 수행하며, 본 세션은 스키마·불변식만 확정한다.

---

## 1. 3자 역할 (single write owner)

| Agent | 역할 | DB write |
|-------|------|:--------:|
| **agent-ga (가)** | 정상 생산 큐(`READY_MASTER_PRODUCTION` 2,496) 소비. 제품별 공식 원문 grounding으로 설명서 생성·적재. **유일한 write owner.** | ✅ (생산 세션) |
| **agent-na (나)** | 예외 큐(1,047) 소비. 예외 해소·경로 확정·식별 명확화·operator 승인 수집. **DB write 0.** 해소된 master를 가로 반환(return 레코드만). | ❌ (불변) |
| **agent-da (다)** | 감사·회귀 검증. census 재현·게이트 재실행·2회 byte-identical 확인. **DB write 0.** | ❌ |

**불변식**: 재진입 후에도 write owner는 항상 agent-ga. 나/다는 어떤 경우에도 DB write를 하지 않는다.

---

## 2. 상태 기계 (per-master)

```
                 EXCEPTION_* 발생
   [가: READY] ───────────────────▶ [나: EXCEPTION QUEUE]
       ▲                                    │
       │  reentryAllowed=true               │ resolution
       │  resolution ∈ {ROUTE_RESOLVED,     │
       │   IDENTITY_DISAMBIGUATED,          ▼
       │   COMPOSER_PROFILE_ADDED,     ┌──────────────┐
       └───────OPERATOR_APPROVED}──────┤  해소 판정   │
                                       └──────┬───────┘
                                              │ REJECTED / SOURCE 부재 / EXCLUDE
                                              ▼
                                        [TERMINAL — 생산 대상 아님]
```

### 2.1 forwardWhen (가 → 나)
agent-ga가 master 처리 중 `EXCEPTION_*` 발생. handoff 레코드(`handoffSchema.gaToNa`) 기록. **이 시점 DB write 0** (`dbWriteAttempted=false` 불변). 배치는 중단하지 않고 다음 master로 계속(failure isolation).

### 2.2 returnWhen (나 → 가)
agent-na의 `resolution ∈ {ROUTE_RESOLVED, IDENTITY_DISAMBIGUATED, COMPOSER_PROFILE_ADDED, OPERATOR_APPROVED}` 이고 `reentryAllowed=true`. return 레코드(`handoffSchema.naToGa`) 기록. master는 다음 가 배치의 입력으로 재편입.

### 2.3 terminalWhen (재진입 없음)
- `resolution=REJECTED`, 또는
- `EXCEPTION_SOURCE`(원문 효능/용법 부재 — 나가 생성할 수 없음), 또는
- `EXCLUDE_CONFIRMED`(수출/비매품/취소).

Terminal master는 생산 대상에서 제외되고 어떤 큐로도 재편입되지 않는다.

---

## 3. 예외 코드별 재진입 가능성 (census `reentryPotential`)

| 카테고리 | 코드 | 현재 수 | reentry | 나의 해소 방법 |
|----------|------|:------:|:-------:|----------------|
| EXCEPTION_IDENTITY | IDENTITY_CONFLICT | 610 | ✅ | gencode 다중 → 대표 gencode 확정 or 제품별 원문 단독 grounding 승인 |
| EXCEPTION_ROUTE | ROUTE_UNRESOLVED | 216 | ✅ | operator/원문 재판독으로 경로 확정 (좌제=rectal·관류=irrigation 등 composer 미지원은 REJECTED) |
| EXCEPTION_ROUTE | ROUTE_CONFLICT | 197 | ✅ | 부위 모호 gencode(CLQ/CSI 등) 실제 경로 확정 |
| EXCEPTION_SOURCE | SOURCE_EFFICACY_MISSING | 24 | ❌ | terminal — 원문 효능 부재는 저작 근거 없음 |

**reentryPotential 합계: 1,023** (610+216+197). EXCLUDE 266·SOURCE 24는 non-reentry.

> **경계**: 나가 경로를 확정하더라도 그 경로가 composer 미지원(rectal 좌제, parenteral 관류/수액)이면 `REJECTED`로 terminal 처리한다. 나는 새 composer route profile을 **설계·승인**할 수 있으나(→ `COMPOSER_PROFILE_ADDED`), 이는 별도 WO 승인 범위다.

---

## 4. 중복 편입 금지 (WO §13)
한 master는 동시에 **정상 큐(가)와 예외 큐(나) 양쪽에 존재할 수 없다** (census 게이트 `no_master_in_multiple_queues` PASS로 보증). 재진입은 나에서 terminal/return 판정이 **확정된 후에만** 가 큐로 이동하며, 이동 순간 나 큐에서 제거된다.

## 5. sourceRef 불변 (V4)
재진입 전후로 master의 `sourceRef`는 `otc-v4-master-leaflet:<masterId>` (uuid=md5) 로 불변. 경로가 바뀌어도 sourceRef는 masterId에만 의존하므로 재적재 시 `source_ref_id` 충돌·중복이 발생하지 않는다 (census `v4_sourceref_dup_0`·`v4_sourceref_live_conflict_0` PASS).

## 관련 문서
- 트랜잭션·savepoint 전략: `otc-easy-drug-remaining-3809-transaction-strategy-v1.md`
- 후속 가/나/다 agent request: `otc-easy-drug-remaining-3809-followup-agent-requests-v1.md`
