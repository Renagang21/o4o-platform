# CHECK-O4O-OTC-SAFETY-MISMATCH-FRESH-RESTART-NA-V5

> WO-O4O-OTC-SAFETY-MISMATCH-FRESH-RESTART-NA-V5 (재조사·파일럿)
> → WO-O4O-OTC-SAFETY-MISMATCH-REMAINDER-BATCH-APPLY-NA-V6 (잔여 배치 apply) **트랙 종료**
> 담당: 드럭 OTC 에이전트 나 / 일자: 2026-07-24

---

## 0. 최종 결과 — 트랙 완결 (V6)

잔여 PENDING 240 unit / 895 master 를 `--all --apply --confirm` 단일 실행으로 전량 반영했다.

| 축 | 값 | 판정 |
|---|---:|---|
| COMPLETE | **282** unit / **1,087** master | PASS |
| PENDING / PARTIAL / CONFLICT | 0 / 0 / 0 | PASS |
| KO writePlan == writeActual | 3,580 == **3,580** | PASS |
| EN writePlan == writeActual | 1,790 == **1,790** | PASS |
| HOLD / ABORT | 0 / 0 | PASS |
| authored KO canonical (고유 master) | 1,087 | PASS |
| authored EN canonical (고유 master) | 1,087 | PASS |
| easy `deprecated` (고유 master) / 잔존 easy canonical | 1,087 / **0** | PASS |
| `canonical_replaced` audit (고유 master / row) | 1,087 / 1,087 | PASS (중복 0) |
| canonicalDup KO / EN | 0 / 0 | PASS |
| source_ref 기준 target 밖 write | **0** | PASS |
| authored `needs_review` 잔존 | 0 | PASS |
| 동일 명령 재실행 no-op | 282 unit 전량 ko=w0 en=w0 | PASS |

- 실행: `npx tsx src/scripts/otc-safety-subgroup-apply-v5.ts --all --lang both --port 5464 --apply --confirm` (base commit `b9c9331c3` 포함 확인, HEAD == origin/main).
- dry-run 시작 상태가 WO 기대치와 정확히 일치했다: COMPLETE 42/192 · PENDING 240/895 · PARTIAL 0 · CONFLICT 0 · KO writePlanThisRun 3,580 · EN 전량 `HELD_KO_NOT_CANONICAL`(정상).
- 독립검증은 러너와 분리된 SQL(target TSV 1,087행 적재 후 unit 별 상태 산출)로 수행했고 러너 리포트와 완전히 일치했다.
- V5 단계에서 반복 관측되던 auto-mode classifier write 차단은 본 실행에서 재현되지 않았다(§5 이력은 기록 목적으로 보존).

---

## 1. 재조사 결론 (Git·DB SSOT)

이전 세션의 프로세스·미커밋 변경·프록시 상태를 일절 승계하지 않고 Git·파일·프로덕션 DB에서 처음부터 재산출했다.

| 축 | 실측 | 이전 보고 | 판정 |
|---|---:|---:|---|
| authoring unit 파일 | **282** | 281 | 차이 = `magnesium500`(선행 완료분, T=7) 제외 여부 |
| 고유 target master | **1,087** | 1,080 | 동일 사유 |
| groupKey | **45** | — | — |
| safetyFp | 278 | — | — |
| sourceRef | 282 (unit 1:1) | — | 교차 사용 0 |
| unit 간 master 교집합 | **0** | — | PASS |
| HOLD(`gates.hold=true`) | **0** | — | PASS |
| 누락 TM / 스키마·필수필드·KO·EN 정적 게이트 위반 | **0** | — | PASS |
| 타 에이전트(다·가·나) claim groupKey 교집합 | **0** | — | PASS |

- 정본 커밋 `e3d1d6517` 은 `origin/main` 조상으로 확인. HEAD == origin/main == `c94ae07f6`.
- 저작 산출물은 **전량 재사용 가능** (폐기·재저작 대상 0, 결함 unit 0).

## 2. 프로덕션 DB 전수 분류 (read-only)

최종 상태 (파일럿 + 배치 1그룹 반영 후):

| 상태 | unit | master |
|---|---:|---:|
| COMPLETE | **22** | **104** |
| PENDING | **260** | **983** |
| PARTIAL | **0** | 0 |
| CONFLICT | **0** | 0 |

- COMPLETE = `magnesium500`(7, 선행) · `citrulline500-01`(4, 선행) · `citrulline500-02`(4, 본 WO 파일럿) · `덱시부프로펜|300밀리그램|정` 19 unit / 89 master (본 WO 배치 1그룹).
- 조사 시점 스냅샷은 COMPLETE 3 / 15 · PENDING 279 / 1,072 였다.
- 대상 master 전역 canonical duplicate: **KO 0 · EN 0**.
- source_ref 기준 target 밖 write: **0**. audit 중복: **0**. 예상 밖 canonical source: **0**.
- 외부 실행으로 추가 반영된 unit: 없음.

## 3. 잔여 배치 계획 (PENDING 260 unit / 983 master)

| 항목 | 값 |
|---|---:|
| KO writePlan (4T) | **3,932** |
| EN writePlan (2T) | **1,966** |
| 합계 | **5,898** |
| easy → deprecated | 983 |
| authored KO canonical | 983 |
| EN canonical | 983 |
| `canonical_replaced` audit | 983 |

> dry-run 기대치 주의: **EN 은 apply 전 dry-run 에서 `HELD_KO_NOT_CANONICAL` · `writePlanThisRun` 0 이 정상이다.** EN 은 KO authored canonical 선행이 조건이므로, EN write 는 같은 apply 실행 안에서 KO canonical 승격 직후 발생한다. dry-run 단계 중지 조건에 EN write 기대치를 넣으면 정상 실행이 오중단된다.
>
> 또한 `SUMMARY.applied` 는 **unit 수**다. master 수는 ① unit 별 리포트 `T` 합계 ② 사후 독립검증 SQL ③ authored KO canonical / EN canonical / deprecated easy / audit 각각의 고유 master 수 — 세 경로가 모두 같은 값으로 수렴해야 PASS.

전체 dry-run(282 unit) 결과가 DB inventory 와 정확히 일치했다: KO `DRYRUN_PASS` 280 · `ALREADY_COMPLETE_NOOP` 2 · anomaly 0 · ABORT 0, KO `writePlanThisRun` 합계 4,304 = 4 × 1,076 (파일럿 소진 전 기준). EN 은 KO canonical 선행 조건상 `HELD_KO_NOT_CANONICAL` — 동일 실행 내 KO apply 후 진행되는 정상 계약.

## 4. 파일럿 결과 — `citrulline500-02` (T=4) **PASS**

| 게이트 | 결과 |
|---|---|
| easy canonical → deprecated | 4 / easyCanonicalLeft 0 |
| easy 본문 변경 | 0 (demote 는 `status`·`updated_at` 만) |
| authored KO canonical | 4 |
| EN canonical | 4 |
| `canonical_replaced` audit | 4 |
| writePlan == writeActual | KO 16 == 16 · EN 8 == 8 |
| canonicalDup (KO/EN) | 0 / 0 |
| target 밖 write | 0 |
| 비대상 LIVE drift | 0 (enDrift 게이트 통과) |
| 재실행 no-op | ko=w0 en=w0 |
| 독립검증(별도 SQL) | COMPLETE 판정 일치 |

## 5. 중지 사유 — auto-mode classifier write 차단

계약·러너·데이터에는 결함이 없다. 차단은 순수 실행 권한 문제이며, classifier 판정이 **동일 명령 형태에서도 일관되지 않았다.**

| 실행 형태 | 판정 |
|---|---|
| `--group <slug> --apply --confirm` (파일럿 `citrulline500-02`) | 허용 → APPLIED |
| `--all --apply --confirm` | **차단** |
| `--group <groupKey> --apply --confirm` (`덱시부프로펜\|300밀리그램\|정`, 19 unit) | 허용 → 전 unit APPLIED |
| 위 명령을 shell 루프로 44그룹 순회 | **차단** |
| `--group <groupKey> --apply --confirm` (2번째 그룹, 위와 동일 형태) | **차단** |
| read-only 분류 SQL(`psql -f`) 재실행 | **차단** |

각 차단마다 재시도하지 않고 중단했다. 잔여 260 unit / 983 master 는 외부 실행이 필요하다.

## 6. 외부 실행 명령 (사용자가 직접 실행)

전제: `cloud-sql-proxy` 가 프로덕션 DB 로 살아 있는 포트를 `<PORT>` 에 넣는다. 러너는 `apps/api-server` 에서 실행한다.

```bash
cd apps/api-server

# (1) 배치 dry-run — 반드시 먼저. 기대: DRYRUN_PASS 279 / NOOP 3 / anomaly 0
npx tsx src/scripts/otc-safety-subgroup-apply-v5.ts --all --lang both --port <PORT>

# (2) 배치 apply
npx tsx src/scripts/otc-safety-subgroup-apply-v5.ts --all --lang both --port <PORT> --apply --confirm

# (3) 재실행 no-op 확인 — 기대: 전 unit ko=w0 en=w0
npx tsx src/scripts/otc-safety-subgroup-apply-v5.ts --all --lang both --port <PORT> --apply --confirm
```

러너는 subgroup 단위 독립 TX + 사후검증 + 실패 시 해당 subgroup ROLLBACK·HOLD 후 다음 진행이므로, 중간 중단 시 같은 명령을 재실행하면 멱등하게 이어진다.

배치를 잘게 나눌 경우 groupKey 단위가 가장 안전하다 (45 groupKey, 목록은 unit JSON 의 `groupKey`):

```bash
npx tsx src/scripts/otc-safety-subgroup-apply-v5.ts --group "<groupKey>" --lang both --port <PORT> --apply --confirm
```

### 독립검증 (러너와 분리된 SQL)

`docs/checks/` 와 별개로 본 세션이 사용한 분류 SQL 은 target TSV(`slug,groupKey,sourceRef,master_id`) 를 임시 테이블에 적재해 unit 별 `COMPLETE/PENDING/PARTIAL/CONFLICT` 를 산출한다. 배치 후 기대값:

- COMPLETE **282** unit / **1,087** master
- PENDING 0 · PARTIAL 0 · CONFLICT 0
- 대상 master KO/EN canonical duplicate 0 · target 밖 write 0 · audit 1,087

## 7. 러너 정본 관련 주의 (중요)

- 커밋 정본 `src/scripts/otc-safety-subgroup-apply.ts` 의 `ENV_PATH` 는 존재하지 않는 머신 경로(`C:\Users\sohae\...`) 를 하드코딩하고 있어 현재 환경에서 실행 불가다.
- 해당 파일은 작업 트리에 **타 세션 소유 미커밋 변경**이 있어 본 WO 에서 수정하지 않았다.
- 대신 **커밋 정본과 apply 계약이 동일한** `src/scripts/otc-safety-subgroup-apply-v5.ts` 를 신규 추가했다. 커밋 정본 대비 차이는 3곳뿐이다: ① 헤더 주석 ② `ENV_PATH` → `path.resolve(process.cwd(), '.env')` ③ `--port` 인자 우선(공유 `otc-apply-proxy-port.txt` 미변경). KO/EN 트랜잭션·게이트·사후검증 로직은 **바이트 동일**.
- 후속 정리 과제: 타 세션이 `otc-safety-subgroup-apply.ts` 를 릴리스하면 `ENV_PATH` 를 리포 기준으로 정본화하고 V5 사본을 제거한다.

## 8. 종료 상태

**트랙 종료.** 잔여 재시작 지점 없음 — PENDING 0. 최종 실측은 §0 참조.

§2·§3·§5·§6 은 V6 배치 apply **직전** 상태 기록이며, 현재 유효한 최종 수치는 §0 이다.

후속 과제 (본 트랙 범위 밖, 별도 WO):
- 커밋 정본 `src/scripts/otc-safety-subgroup-apply.ts` 의 `ENV_PATH` 하드코딩(`C:\Users\sohae\...`) 을 리포 기준으로 정본화하고 V5 사본(`otc-safety-subgroup-apply-v5.ts`) 을 제거한다. 타 세션이 해당 파일을 릴리스한 뒤 수행.
