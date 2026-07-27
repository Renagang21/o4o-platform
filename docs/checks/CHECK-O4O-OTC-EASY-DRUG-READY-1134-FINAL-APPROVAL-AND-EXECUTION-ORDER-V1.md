# CHECK-O4O-OTC-EASY-DRUG-READY-1134-FINAL-APPROVAL-AND-EXECUTION-ORDER-V1

- WO: `WO-O4O-OTC-EASY-DRUG-READY-1134-FINAL-APPROVAL-AND-EXECUTION-ORDER-V1`
- 에이전트: 라 (승인 SSOT · 조사 전용)
- 성격: **READ-ONLY** — DB write 0 / 설명서 생성 0 / dry-run 0 / LIVE apply 0
- 기준 commit: `14e9424e8` (final approval proposal SSOT)
- 최종 승인 상태: **APPROVED_FOR_PRODUCTION**

## 1. 최종 승인 상태

commit 14e9424e8 의 proposal SSOT 를 재현·전 게이트 검증 통과 → **APPROVED_FOR_PRODUCTION** 확정.

| 재현 항목 | 값 | 기대 |
|-----------|-----|------|
| baseline READY 재현 | 1,134 | 1,134 ✅ |
| baseline incomplete | 4,943 | 4,943 ✅ |
| HOLD 분포 | IDENTITY 3,246 / ROUTE 536 / SOURCE 27 / READY 1,134 | ✅ |
| drift (ALREADY_COMPLETED) | 0 | 0 ✅ |
| remaining READY | 1,134 | 1,134 ✅ |
| baseline 밖 편입 | 0 | 0 ✅ |

## 2. 스냅샷

| 구분 | 값 |
|------|-----|
| 승인 스냅샷 시각 | `2026-07-27 04:57:04.349109+00` |
| 승인 스냅샷 xmin | `4051330` |
| baseline census TS | `2026-07-27 03:46:25.177729+00` |
| 격리 수준 | `REPEATABLE READ READ ONLY` 단일 트랜잭션 |

## 3. Fingerprint 정의

fingerprint = 표준코드 **일반명코드(성분명코드) gencode**. READY 는 gencodeCount==1 이므로 master당 유일.
동일 gencode = 동일 성분·함량·제형·route = 동일 authored 설명서 → 한 fingerprint 를 여러 unit 으로 분할 금지.

## 4. Route별 fingerprint / master

| route | master | fingerprint | 예상 write |
|-------|:------:|:-----------:|:---------:|
| oral | 540 | 101 | 3,240 |
| topical | 327 | 37 | 1,962 |
| ophthalmic | 253 | 12 | 1,518 |
| oromucosal | 14 | 2 | 84 |
| **합계** | **1,134** | **152** | **6,804** |

## 5. Unit별 fingerprint / master (fingerprint 무분할)

| unit | route | fingerprint | master | write(KO/EN) | 상태 |
|------|-------|:-----------:|:------:|:------------:|:----:|
| oral-unit-1 | oral | 50 | 270 | 1,620 (1,080/540) | APPROVED |
| oral-unit-2 | oral | 51 | 270 | 1,620 (1,080/540) | APPROVED |
| topical-unit-1 | topical | 37 | 327 | 1,962 (1,308/654) | APPROVED |
| ophthalmic-unit-1 | ophthalmic | 12 | 253 | 1,518 (1,012/506) | APPROVED |
| oromucosal-unit-1 | oromucosal | 2 | 14 | 84 (56/28) | APPROVED |
| **합계** | | **152** | **1,134** | **6,804** | |

- oral 540(101 fp) → least-loaded greedy(masterCount desc, fp asc)로 270/270 균등 2-unit. fingerprint 무분할.
- topical·ophthalmic·oromucosal → 각 route 전체 1-unit.

## 6. 예상 write

master당 KO 4T + EN 2T = 6T. 전체 **KO 4,536T + EN 2,268T = 6,804T**. EN 은 KO canonical 선행 필요(dry-run HELD 정상).

## 7. 실행 순서 + write-owner 인계

| step | unit | write-owner | master | 인계 조건 |
|:----:|------|-------------|:------:|-----------|
| 1 | oral-unit-1 | agent-da | 270 | start |
| 2 | oral-unit-2 | agent-da | 270 | step1 GREEN 후 |
| 3 | topical-unit-1 | agent-na | 327 | step2 GREEN 후 |
| 4 | ophthalmic-unit-1 | agent-ga | 253 | step3 GREEN 후 |
| 5 | oromucosal-unit-1 | agent-na | 14 | step4 GREEN 후 |

**단일 write-owner 인계 규칙**
- 준비(select/generate/Guard/dry-run 검증 문서화)는 병렬 가능.
- LIVE apply 는 반드시 한 시점에 한 명(single write-owner)만.
- 이전 unit 이 GREEN(독립검증 통과) 된 뒤 다음 write-owner 에게 인계.
- 한 fingerprint(gencode)를 여러 unit 으로 분할 금지.
- HOLD_IDENTITY/HOLD_ROUTE/HOLD_SOURCE 및 baseline READY 1,134 밖 master 편입 금지.

담당(권장): agent-da = oral unit 1·2 / agent-na = topical + oromucosal / agent-ga = ophthalmic / agent-ra = 승인 SSOT·원장·독립검증 지원(write 안 함).

## 8. 교집합·중복 검증 (전부 PASS)

| 게이트 | 결과 |
|--------|------|
| 전체 1,134 재현 | ✅ |
| route 합 1,134 (고정 모집단 일치) | ✅ |
| unit 합 1,134 | ✅ |
| unit 간 master 교집합 | ✅ 0 |
| fingerprint 분할 | ✅ 0 |
| 기존 LIVE 교집합 | ✅ 0 |
| authored canonical 기존 보유 | ✅ 0 |
| sourceRef 충돌(>1 canonical easy ko) | ✅ 0 |
| sourceRef 누락(0 canonical easy ko) | ✅ 0 |
| canonicalDup | ✅ 0 |
| baseline 밖 편입 | ✅ 0 |
| DB write | ✅ 0 |
| 2회 실행 byte-identical(스냅샷 필드 제외) | ✅ |

## 9. 독립검증 기준선 + 기존 LIVE 불변

- 독립검증: unit 완료 후 해당 unit masterIds 전부 STORE canonical ko(authored) AND en(authored) 존재 · canonicalDup 0 · grounding source(mfds_easy_drug canonical ko) 보존 · write 수 = masterCount×6 · **manifest(unit masterId 원장) 대조**(전역 LIVE 카운트 아님).
- 기존 LIVE 불변: 승인 스냅샷의 authored 완료 집합은 감소시키지 않는다(기존 완료 훼손 0). READY 1,134 는 스냅샷 시점 authored 미보유(기존 LIVE 교집합 0) — 생산은 신규 추가만.

## 10. 산출물

- `apps/api-server/src/scripts/otc-easy-drug-ready-1134-execution-order.ts` (승인·실행순서 스크립트, read-only)
- `apps/api-server/src/scripts/data/otc-easy-drug-ready-1134-approved-for-production-ssot-v1.json` (status=APPROVED_FOR_PRODUCTION)
- `apps/api-server/src/scripts/data/otc-easy-drug-ready-1134-unit-ledger-v1.json`
- `apps/api-server/src/scripts/data/otc-easy-drug-ready-1134-execution-order-v1.json`
- `apps/api-server/src/scripts/data/otc-easy-drug-ready-1134-verification-baseline-v1.json`
- `docs/checks/CHECK-O4O-OTC-EASY-DRUG-READY-1134-FINAL-APPROVAL-AND-EXECUTION-ORDER-V1.md` (본 문서)

## 11. 각 생산 에이전트 착수 가능 여부

전 게이트 GREEN · 5 unit 전부 APPROVED. unit별 masterId/fingerprint 원장 확정 → **후속 생산 에이전트는 추가 조사 없이 각자 unit 준비(select/generate/Guard/dry-run) 병렬 착수 가능**. LIVE apply 는 실행 순서·단일 write-owner 인계 규칙에 따라 순차 수행.
