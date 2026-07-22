# CHECK-O4O-HFF-COMBO-PARALLEL-BATCH-INTEGRATED-BASELINE-C-V1 — 병렬 배치 통합 기준선 확인 (Agent C)

- 성격: **read-only · DB write 0**. 추가 생성/적재 없음. 새 DB 연결(fresh proxy 5455)에서 SSOT 재확정만.
- 일자: 2026-07-22
- 계기: Agent A(9906aa590, 영양소 복합형 198건, 838→1,036)와 Agent C(c735ecc93, 관절·항산화 194건) 병렬 완결 후 전체 복합형 LIVE SSOT 재확정 필요.

## 0. 결론

> **현재 복합형(다원료) LIVE SSOT = 1,099** (tag-agnostic, 원료 카드 수 기준 authoritative).
> Agent A 198 · Agent C 194 **모두 LIVE** · 배치 간 statementNo 교집합 **0** · 전역 canonicalDup **0**.
> `605→799`(내 1차 보고)·`1,036`·추정치 `1,230` 은 **정본 아님** — 아래 정본 사용.

## 1. SSOT 계수 방식 — 왜 tag-verifier 를 정본으로 쓰지 않았나

`hff-combo-verify-committed` 는 배치 tag(`batch:single-nutrient-combo-%` + 12개 allowlist)로 복합형을 집계한다.
그러나 **Agent A 배치 slug 은 `nc-*`(비-`combo-` 접두)** 라 allowlist 에 없어 tag 집계에서 누락된다.

| 방식 | totalComboLive |
|---|---:|
| tag-verifier (`combo-%` + allowlist) | **870** ← Agent A 198 등 **229 과소집계** |
| **tag-agnostic (원료 카드 수 ≥2)** | **1,099** ← 정본 |

- tag-agnostic: HFF STORE canonical ko 설명서에서 원료 카드 마커 `</b><ul class="sd-why">` 개수로 판정.
  ≥2 = 복합형. batch tag 무관 → 전 배치 포착.
- 검증 스크립트: `hff-combo-c-ssot-reconcile.ts`.

**카드 수 분포 (HFF STORE canonical ko 총 5,011)**:

| 카드 | 마스터 | 구분 |
|---:|---:|---|
| 0 | 3,912 | 단일영양소(다른 composer, sd-why 마커 없음) |
| 2 | 511 | 복합형 |
| 3 | 285 | 복합형 |
| 4 | 151 | 복합형 |
| 5 | 62 | 복합형 |
| 6 | 38 | 복합형 |
| 7 | 9 | 복합형 |
| 8 | 43 | 복합형 |
| **≥2 계** | **1,099** | **복합형 LIVE** |

> **권고**: tag-verifier allowlist 에 `nc-*` 등 비접두 복합형 slug 을 추가하거나, 향후 복합형 배치는 slug 에 `combo-` 접두를 사용해 자동 포착되게 한다(스크립트 주석 권고와 동일). 그 전까지 SSOT 는 tag-agnostic 계수를 정본으로 삼는다.

## 2. 두 배치 LIVE 확인 (독립 검증, fresh 연결)

| 배치 | commit | 기대 | masters | spdKo | spdEn | canonicalDup | candidatesLinked | sourceHff | PASS |
|---|---|---:|---:|---:|---:|---:|---:|---:|:-:|
| Agent A (nc-batch1, 9그룹) | 9906aa590 | 198 | 198 | 198 | 198 | 0 | 198 | 396 | ✓ |
| Agent C (combo-c-batch1, 9그룹) | c735ecc93 | 194 | 194 | 194 | 194 | 0 | 194 | 388 | ✓ |

- 두 배치 마스터 전량 `cards≥2` 버킷 소속 확인(Agent A 198/198 · Agent C 194/194) → 1,099 SSOT 에 **정확히 포함**.
- Agent A 마스터/신고번호는 커밋된 롤백 매니페스트 9개(`nc-batch1/manifests/`)에서 확보.

## 3. 배치 간 중복 · 무결성

| 항목 | 결과 |
|---|---|
| Agent A ∩ Agent C statementNo | **0** (A 198 unique · C 194 unique) |
| 교집합 0 보강 근거 | Agent C apply 의 `masterDup` 가드 = 0 (내 194 permit 이 기존 마스터에 없음 → 이미 LIVE 이던 A 와 겹쳤다면 MASTER_EXISTS 로 abort). COMMIT 성공 = 사전 마스터와 0 중복. |
| 전역 canonicalDup (HFF STORE canonical 전체) | **0** |
| DB write (본 확인 turn) | **0** (SELECT only) |

## 4. 보고 요약

```text
현재 totalComboLive (SSOT, tag-agnostic 카드≥2) : 1,099
Agent A 배치 LIVE                                : 198  (독립검증 PASS)
Agent C 배치 LIVE                                : 194  (독립검증 PASS)
배치 간 statementNo 중복                          : 0
전역 canonicalDup                                : 0
DB write                                         : 0
tag-verifier(870)는 229 과소집계 — Agent A nc-* slug 비접두로 누락. 정본=1,099.
proxy 5455: 타 에이전트 미사용 확인 후 종료.
```

## 5. 산출물

- `hff-combo-c-ssot-reconcile.ts` (tag-agnostic 카드 수 계수)
- `hff-combo-c-ssot-crosscheck.ts` (두 배치 cards≥2 포함 + 전역 canonicalDup)
- 본 문서
