# CHECK-O4O-OTC-KO-EN-BUNDLE-RUNNER-HARDENING-DA-V1 — 범용 ko→en bundle runner (에이전트 다)

WO: `WO-O4O-OTC-KO-EN-BUNDLE-RUNNER-HARDENING-DA-V1` · 일자: 2026-07-22 · 상태: **완료 — 코드·문서·비DB 검증 (production DB write 0)**
신규: `apps/api-server/src/scripts/drug-otc-ko-en-bundle-runner.ts` · 시작 HEAD `37a62eb43` · 채널: (검증은 비DB self-test + read-only dry-run only)

---

## 0. 목표

> 여러 READY 그룹을 **하나의 WO 로 순서대로 ko 승격 → en 완결** 연속 처리하는 실행 틀. 그룹별 WO 분할·그룹 사이 중간 승인을 제거하고, 한 그룹 실패가 무관한 안전 그룹을 막지 않게 한다. **기존 그룹별 runner 는 수정하지 않고 자식 프로세스 wrapper 로 재사용**한다.

---

## 1. 기존 runner 재사용 범위 (무수정)

| 정본 | 호출 방식 | 불변 |
|---|---|---|
| `drug-otc-grounded-upgrade-runner.ts` | `spawn npx tsx … --group=<key> [--apply]` (자식) | fingerprintOf()·ko 승격 정책·GROUP_REGISTRY |
| `drug-otc-en-complete-runner.ts` | `spawn npx tsx … --group=<key> [--apply]` (자식) | EN master 스코프·EN_REGISTRY |

- bundle 은 **report 집계·순서 제어·실패 분류만** 한다. 두 runner 파일·기존 그룹 산출물·registry 항목 **미접촉**(add/삭제/재정렬 0).
- report 수집 계약(실측): en runner = stdout 전체 JSON(성공·실패). grounded runner = 성공 stdout JSON / 실패 시 `<outBase>.run.json` 진단 파일 회수. 둘 다 불가 → **runner 계약 불일치**로 bundle 중단.
- confirm env 는 bundle 이 자식에 주입: ko `DRUG_OTC_GROUNDED_UPGRADE_CONFIRM=YES` · en `DRUG_OTC_EN_COMPLETE_CONFIRM=YES` (bundle 게이트 `--apply` + `DRUG_OTC_BUNDLE_CONFIRM=YES` 통과 시에만).

---

## 2. bundle 상태 머신

그룹당: `preflight → ko dry-run → ko apply → ko 검증(재실행 ALREADY_UPGRADED) → en dry-run → en apply → en 검증(재실행 ALREADY_COMPLETE) → 다음 그룹`.

**단계 status**: `READY · ALREADY_UPGRADED · ALREADY_COMPLETE · APPLIED · HOLD · FAILED`
(정본 report.status 매핑: PASS→READY, ABORT→HOLD, APPLIED→APPLIED, ALREADY_*→그대로, FAIL→FAILED)

**bundle status**: `NO_OP`(전 그룹 완료·write 0) · `COMPLETED`(전 그룹 성공) · `PARTIAL`(일부 HOLD/FAILED, 무관 그룹은 계속) · `ABORTED`(전체 중단).

---

## 3. 실패 · 계속 · 전체중단 기준 (§5)

| 판정 | 트리거(정규식 분류) |
|---|---|
| **abort**(bundle 전체 중단) | DB 연결·인증 장애 · runner 계약 불일치 · 공통 스키마 불일치 · TX 사후검증 실패/ROLLBACK · canonical duplicate · writeActual 봉투 초과 · target 밖 write · 소유권 충돌 · **분류 불가(보수적)** |
| **continue**(해당 그룹만 HOLD/FAILED, 다음 진행) | EN 재구성 byte 불일치 · fingerprint 재고정 불일치/미분류 · 기존 canonical/needs_review 충돌 · 그룹 게이트 불일치 · EN 재사용 기준 부재 |

- **ko 실패 시 같은 그룹 en 실행 금지**(enStatus=null). en 실패 시 해당 그룹만 FAILED, 다음 그룹 진행.
- writeActual > writePlan → 즉시 abort(봉투 초과). ko 재실행 ≠ ALREADY_UPGRADED / en 재실행 ≠ ALREADY_COMPLETE → abort(멱등성 위반).

---

## 4. write 산식 (SPD/audit·ko/en 분리)

- 그룹 target = T. **ko = 4T**(STEP A INSERT T + easy demote T + authored flip T = SPD 3T, audit T) · **en = 2T**(persist T + flip T) · **그룹 총 = 6T**.
- bundle 집계: `totals.{koPlan, koActual, enPlan, enActual, planTotal, actualTotal}` — writePlan(예상)/writeActual(실측) 분리, SPD/audit 분리 보존.

---

## 5. 소유권 계약

- bundle 1건 = 단일 `writeOwner`(그룹 전체 production write 소유). groupKey 별 write-owner(=authored source_ref_id) 로그.
- 동시 세션은 bundle 대상 그룹에 read-only 만. EN 대상은 **ko runner target master IDs 정본**(source_ref_id 단독 열거 금지) — 정본 runner 가 강제(bundle 은 재확인만).

---

## 6. 비DB 검증 결과 (§8)

### self-test (`--selftest`, DB 미접속·자식 미기동, mock exec 주입) — **PASS 28건**

| # | 시나리오 | 결과 |
|---|---|---|
| S1 | 완료 3그룹 → `NO_OP` · actual 0 · dbWrite 0 · ALREADY_COMPLETE ×3 | ✅ |
| S2 | 첫 그룹 en 일관성 불일치 HOLD → 다음 그룹 진행, `PARTIAL`, 3그룹 실행 | ✅ |
| S3 | DB 인증 장애 → `ABORTED` at 첫 그룹, 잔여 미실행 | ✅ |
| S3b | report 수집 실패 → `ABORTED`(계약 불일치) | ✅ |
| S4 | apply flow: ko 4T·en 2T·총 6T (3그룹=180), dbWrite 1, `COMPLETED` | ✅ |
| S5 | 동일 fixture 2회 → 결과 JSON 직렬화 동일(결정론) | ✅ |
| S6 | ko 실패 → 같은 그룹 en 미실행(enStatus null), b·c 진행 | ✅ |
| S7 | 실패 분류기(abort/continue/unknown→abort) 5케이스 | ✅ |

### real read-only dry-run (`--bundle=regression-completed-da`, 완료 3그룹)

- 자식으로 **정본 runner 실기동**(ko/en dry-run) → 계약 실측 확인.
- 결과: `status=NO_OP` · 그룹 `{ALREADY_COMPLETE: 3}` · **write actual 0** · plan 320(en 66·56·38 ×2, ko는 ALREADY_UPGRADED 조기종료로 plan 미산정).
- **production DB write 0**(--apply 미사용, 순수 읽기). spawn adapter ↔ 정본 runner 계약 일치 확인.

### typecheck

- `tsc --noEmit`: 신규 파일(`drug-otc-ko-en-bundle-runner.ts`) **에러 0**. 전체 11건은 전부 기존/타 세션 스크립트(nutrition-combo-persist 5·promotion-dryrun 2·track-a-inventory[나] 1·hff 2·apply-pilot 1) — 본 WO 무관.

> 기존 production registry(GROUP_REGISTRY·EN_REGISTRY)에 신규 후보 **추가 0**. `BUNDLE_REGISTRY` 는 완료 그룹 regression 용 1건만.

---

## 7. 향후 실제 bundle 적용 방법

```bash
# (apps/api-server, cloud-sql-proxy :5442 + DB env 주입 후)
# dry-run: 전 그룹 preflight/dry-run 검증(write 0)
npx tsx src/scripts/drug-otc-ko-en-bundle-runner.ts --groups=<k1>,<k2>,<k3>

# apply: 이중게이트 — 그룹 순서대로 ko→en 연속, 중간 승인 없음
--apply + DRUG_OTC_BUNDLE_CONFIRM=YES
```

- 신규 READY 그룹은 **먼저 각 정본 registry(GROUP_REGISTRY·EN_REGISTRY)에 등재**(에이전트 가 감사 결과 기준) 후 groupKey 를 bundle 에 나열.
- bundle 은 완료 그룹을 자동 no-op(ALREADY_*) 처리 → 재실행 안전. 실패 그룹은 진단 JSON(`<outBase>.run.json`) 보존.

---

## 8. 완료 보고 (요약)

| 항목 | 값 |
|---|---|
| 시작/종료 HEAD | `37a62eb43` → (본 커밋) |
| 생성 파일 | `drug-otc-ko-en-bundle-runner.ts` · 본 CHECK · bundle summary JSON |
| self-test | PASS 28건 | typecheck | 신규 0 |
| real DB write | **0**(dry-run only) |
| 기존 runner 수정 | **0**(wrapper) | registry 추가 | 0 |

> 중지 조건 미해당(wrapper 로 호출 가능·정책 변경 불필요·비DB 로 계약 확정). 가·나 진행 파일 미접촉.
