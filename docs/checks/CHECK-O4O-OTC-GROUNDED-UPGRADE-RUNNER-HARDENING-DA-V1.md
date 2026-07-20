# CHECK-O4O-OTC-GROUNDED-UPGRADE-RUNNER-HARDENING-DA-V1 — 범용 Grounded Upgrade Runner 실행 안정성 보강 (에이전트 다)

WO: `WO-O4O-OTC-GROUNDED-UPGRADE-RUNNER-HARDENING-DA-V1` · 일자: 2026-07-20 · 상태: **설계·로컬 검증 완료 — 후속 후보 대기**
기준: 에르도스테인 300mg 정 파일럿(`drug-otc-erdosteine-300mg-canonical-upgrade-pilot.ts`, 26건 LIVE 완료). 신규 파일: `apps/api-server/src/scripts/drug-otc-grounded-upgrade-runner.ts`.

---

## 0. 결론

> **에르도스테인 파일럿을 기준으로, 후속 Track A 그룹에 재사용 가능한 범용 runner 를 신규 파일로 추가하고 실행 안정성만 보강했다. fingerprint 산식·정책(89379627d Option A)·에르도스테인 대상/결과는 변경 없음. 실제 DB write 0(본 WO 범위 = runner 설계까지). typecheck 신규 에러 0 · 비DB self-test 14건 PASS. 파일럿 스크립트·에르도스테인 커밋 산출물은 미접촉(runner 는 자체 네임스페이스 산출 파일 사용). 후보(candidate/target_fp/exclude_fp)는 에이전트 가 dry-run 결과로만 GROUP_REGISTRY 에 등재(임의 추가 금지) — 현재 등록 그룹은 에르도스테인 레퍼런스 1건.**

---

## 1. 하드닝 항목 대응 (7)

| # | WO 요구 | 구현 | 위치 |
|---|---|---|---|
| 1 | 현재 canonical 이 authored → ALREADY_UPGRADED 정상 종료 | 승격 상태 프로브(target master 의 현재 STORE ko canonical source). anomaly 0 + 전부 authored + easy 0 → `status='ALREADY_UPGRADED'`, write 0, exit 0(ABORT 아님). 부분 승격은 anomaly. | `runGroundedUpgrade` upgradeState 블록 |
| 2 | query() 반환값 정규화 헬퍼 공통 적용 | `retRows<T>()` (`[rows,affected]`\|`rows`\|`[]` 정규화) + `firstRow<T>()`. SELECT·INSERT/UPDATE RETURNING 전부 경유. | `retRows` / `firstRow` |
| 3 | dry-run 실패 시에도 진단 JSON 보존 | main 의 try/catch 가 예외 시에도 `persistRun` 호출(status=FAIL/ABORT/... + error). 매 실행 `<base>.run.json`, **dry-run PASS 만** `<base>.dryrun-pass.json` 별도 → PASS 산출물 clobber 방지(파일럿 재실행 clobber 인시던트 교훈 반영). | `persistRun`, `main` catch |
| 4 | target/exclude/other·교집합 게이트 공통화 | `classifyByFingerprint(withFp,cfg)` → target/excluded/other/masterIds/intersection/duplicate/fpDistribution/nonOral + anomalies 일괄 산출. | `classifyByFingerprint` |
| 5 | SPD write 와 audit write 분리 보고 | `report.writePlan = { spd:{...,total}, audit:{...,total}, grand_total }` (dry-run 산정) · `report.writeActual = { spd, audit }` (apply 실측). | writePlan / writeActual |
| 6 | 단일 write-owner 식별값 + 실행 groupKey 로그 | `report.writeOwner = { kind:'authored_source_ref_id', value:candidate, authoredSource, performedBy:null, wo }` · `report.groupKey` · console 에 `group= owner= status=` 출력. audit metadata 에 groupKey 동봉. | writeOwner / groupKey |
| 7 | typecheck + 로컬 비DB 검증 | `--selftest`(DB 미접속): retRows/firstRow · fingerprint 결정성·route/form · classifyByFingerprint 게이트·이상탐지 14건. `tsc --noEmit` 신규 에러 0. | `selfTest` |

---

## 2. 불변 원칙 준수

| 원칙 | 준수 |
|---|---|
| 에르도스테인 대상·결과 변경 금지 | ✅ 파일럿 스크립트·`otc-erdosteine-300mg-upgrade-dryrun-v1.json` 미접촉. runner 는 별도 `outBase`(`otc-grounded-upgrade-erdosteine-300mg-jeong.*`) 사용. |
| fingerprint·정책 변경 금지 | ✅ `normalize/easySections/freeSections/bucketSections/formOf/routeSig/fingerprintOf` 파일럿 VERBATIM. 정책 89379627d Option A 동일. |
| 실제 DB write 금지 | ✅ 본 세션 DB 접속 0(apply 미실행). dry-run·apply 경로는 설계·이중게이트 유지, 실행은 인증 세션 핸드오프. |
| 에이전트 가 후보 임의 추가 금지 | ✅ `GROUP_REGISTRY` = 에르도스테인 레퍼런스 1건. 후속 후보는 에이전트 가 결과로만 등재. |
| 범용 runner 설계까지만 | ✅ 설계 + 로컬 비DB 검증까지. DB 검증/apply 는 후속. |

### coarse enumeration fallback 주의(산식 불변 근거)

- easy content 선택을 `canonical 우선, 없으면 deprecated fallback`(`ORDER BY (status='canonical') DESC, length DESC`)으로 완화.
- **미승격 그룹**: canonical easy 가 항상 우선 → 파일럿과 target/exclude 분류 byte-identical. fingerprint 함수 자체는 verbatim(불변).
- **승격 완료 그룹**(에르도스테인): easy 가 deprecated 여도 fp 재현 → target 26 재식별 → 전부 authored → `ALREADY_UPGRADED` 정상 판정(요구 #1). live 26건 결과에는 영향 없음.

---

## 3. 로컬 검증 결과

| 검증 | 명령 | 결과 |
|---|---|---|
| 비DB self-test | `npx tsx src/scripts/drug-otc-grounded-upgrade-runner.ts --selftest` | **PASS 14건** |
| typecheck | `npx tsc --noEmit` | 신규 파일 에러 **0** (전체 10건은 모두 기존 무관 스크립트 선행 에러 — 본 WO 범위 밖) |
| DB dry-run | (미실행) | 인증 세션 핸드오프 — `--group=erdosteine-300mg-jeong` dry-run 시 `ALREADY_UPGRADED` 기대(승격 완료 그룹) |

---

## 4. 사용법 / 핸드오프

```
# 비DB 로컬 검증
npx tsx src/scripts/drug-otc-grounded-upgrade-runner.ts --selftest

# dry-run (read-only, write 0)
npx tsx src/scripts/drug-otc-grounded-upgrade-runner.ts --group=<key>

# apply (이중게이트)
--apply + DRUG_OTC_GROUNDED_UPGRADE_CONFIRM=YES
```

- 등록 그룹: `erdosteine-300mg-jeong`(레퍼런스). 후속 그룹은 에이전트 가 dry-run 검증 후보를 `GROUP_REGISTRY` 에 추가.
- 산출: `src/scripts/data/<outBase>.run.json`(매 실행) · `<outBase>.dryrun-pass.json`(dry-run PASS).

> **결과**: 범용 Grounded Upgrade Runner 설계·로컬 검증 완료. 실제 DB dry-run/apply·후속 후보 등재는 **에이전트 가의 다음 후보 결과 대기**.
