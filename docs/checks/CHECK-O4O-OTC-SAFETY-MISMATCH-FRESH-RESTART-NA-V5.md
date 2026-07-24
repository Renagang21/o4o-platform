# CHECK-O4O-OTC-SAFETY-MISMATCH-FRESH-RESTART-NA-V5

> WO-O4O-OTC-SAFETY-MISMATCH-FRESH-RESTART-NA-V5 — 신규 세션 전수 재조사 · 파일럿 LIVE · 배치 apply 외부 실행 핸드오프
> 담당: 드럭 OTC 에이전트 나 (신규 세션) / 일자: 2026-07-24

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

파일럿 반영 후 최종 상태:

| 상태 | unit | master |
|---|---:|---:|
| COMPLETE | **3** | **15** |
| PENDING | **279** | **1,072** |
| PARTIAL | **0** | 0 |
| CONFLICT | **0** | 0 |

- COMPLETE = `magnesium500`(7) · `citrulline500-01`(4) · `citrulline500-02`(4, 본 WO 파일럿).
- 대상 master 전역 canonical duplicate: **KO 0 · EN 0**.
- source_ref 기준 target 밖 write: **0**. audit 중복: **0**. 예상 밖 canonical source: **0**.
- 외부 실행으로 추가 반영된 unit: 없음.

## 3. 고정된 배치 계획 (PENDING 279 / 1,072 master)

| 항목 | 값 |
|---|---:|
| KO writePlan (4T) | **4,288** |
| EN writePlan (2T) | **2,144** |
| 합계 | **6,432** |
| easy → deprecated | 1,072 |
| authored KO canonical | 1,072 |
| EN canonical | 1,072 |
| `canonical_replaced` audit | 1,072 |

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

배치 apply(`--all --apply --confirm`) 가 auto-mode classifier 에 의해 차단되었다. WO 규정에 따라 **재시도하지 않고** read-only 검증·핸드오프 상태로 전환했다. 단일 `--group` 파일럿은 통과했으므로 계약·러너·데이터에는 결함이 없으며, 차단은 순수 실행 권한 문제다.

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

## 8. 잔여 재시작 지점

트랙 미완결. 재시작 지점 = **PENDING 279 unit / 1,072 master 배치 apply** (위 §6 명령). 저작·계약·러너·dry-run 은 전부 검증 완료 상태이므로 남은 것은 write 실행뿐이다.
