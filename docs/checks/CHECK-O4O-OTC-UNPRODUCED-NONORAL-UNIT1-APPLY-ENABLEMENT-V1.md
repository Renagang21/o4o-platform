# CHECK-O4O-OTC-UNPRODUCED-NONORAL-UNIT1-APPLY-ENABLEMENT-V1 — apply 경로·사후검증·독립검증 완성

WO: `WO-O4O-OTC-UNPRODUCED-NONORAL-UNIT1-APPLY-ENABLEMENT-V1` · 일자: 2026-07-26 · 담당: **드럭 OTC 에이전트 나**
기준: 승인 `4f188953d` · readiness/EN `6929909ac` · 승인 SSOT 70 fp / 443 master
성격: **apply 코드 구현 + 차단 시험.** **DB write 0** · **LIVE apply 0**.

---

## 0. 결론

> **apply 경로 완성 — 경구 Unit 2 GREEN 후 즉시 LIVE 가능.** 이번 WO 에서 실제 write 는 하지 않았다.
>
> | 축 | 결과 |
> |---|---|
> | apply 인터페이스 | `--mode=apply --lang=ko\|en --apply` + 이중 확인 환경변수 |
> | 차단 3중 | 실행순서(경구 Unit2 GREEN) · `--apply` · 환경변수 |
> | 차단 시험 | **전건 BLOCK** (런타임 exit=3 · 논리 5케이스 전건) |
> | dry-run 회귀 | **14/14 PASS** · 해시 불변 (`64eabad3…`) |
> | rollback 시험 | **PASS** — TX 내 532T 후 전량 롤백, 상태 불변 |
> | 독립검증 스크립트 | 신규 · 12항목 · `PRE_APPLY` 정상 판정 |
> | 예상 write | KO 1,772 + EN 886 = **2,658T** |
> | canonicalDup | **0** |
> | **DB write** | **0** |

---

## 1. apply enablement 변경 경로

| 경로 | 변경 |
|---|---|
| `apps/api-server/src/scripts/otc-unproduced-nonoral-unit1-production.na.ts` | **apply 경로 추가** — `runApply()` · `preGates()` · `postVerify()` · `envBlockTest()` · `oralUnit2Green()`. 기존 `prepare()` 에 `koAnchorOk`(KO 앵커 대조) 1필드 추가 |
| `apps/api-server/src/scripts/otc-unproduced-nonoral-unit1-verify.na.ts` | **독립검증 신규** |

**최소 변경 원칙 준수** — 대상·그룹·sourceRef·writePlan 은 **재생성하지 않고** 승인 SSOT·EN JSON 에서만 읽는다. `fpToUuidV2`·10축 fp·canonical 계약·KO 4T + EN 2T·INSERT-only 전부 불변. 공용 러너·기존 어댑터·승인 SSOT·EN JSON **미수정**.

## 2. KO·EN 이중게이트

| 단계 | 플래그 | 환경변수 | 값 |
|---|---|---|---|
| KO | `--mode=apply --lang=ko --apply` | `OTC_NONORAL_U1_KO_CONFIRM` | `YES` |
| EN | `--mode=apply --lang=en --apply` | `OTC_NONORAL_U1_EN_CONFIRM` | `YES` |

**차단 3중 (순차 · fail-fast)**

1. **실행 순서** — 경구 Unit 2 `state === 'GREEN'` 아니면 차단. 원장 `otc-unproduced-oral-execution-order-v1.json` 을 **read-only 로 읽기만** 한다(현재 `UNBLOCKED`).
2. **`--apply` 미지정** → dry-run 전용, write 0.
3. **환경변수 미설정·값 불일치** → write 0.

셋 중 하나라도 어긋나면 **DB 접속 전에** `exit 3` 으로 종료한다.

## 3. 단계별 사전 게이트

### KO (K1~K10)

| # | 게이트 |
|---|---|
| K1 | SSOT `status=APPROVED_FOR_PRODUCTION` |
| K2 | 70 fp / 443 master |
| K3 | authored KO canonical **0** |
| K4 | EN canonical **0** |
| K5 | easy canonical **443** |
| K6 | 기존 LIVE 교집합 0 (master·fp·sourceRef) |
| K7 | HOLD 대상 혼입 0 |
| K8 | canonicalDup 0 |
| K9 | 예상 KO write **1,772T** |
| K10 | 이상 그룹 0 |

### EN (E1~E10)

| # | 게이트 |
|---|---|
| E1 | authored KO canonical **443** (KO 선행 완료) |
| E2 | **KO 앵커 전건 본 트랙 sourceRef 일치** (`koAnchorOk == size`) |
| E3 | EN canonical **0** (EN 미생산 적극 검증) |
| E4 | EN JSON 70/70 fp |
| E5 | EN 한글 0 |
| E6 | EN 경구동사 0 |
| E7 | 공식 수치·기간·부위 누락 0 |
| E8 | canonicalDup 0 |
| E9 | 예상 EN write **886T** |
| E10 | 이상 그룹 0 |

> E2 는 단순히 "authored 가 443개 있다"가 아니라 **그 443개가 본 트랙이 쓴 것인지**를 `source_ref_id == uuid(md5("otc-combo-leaflet:"+fp))` 로 대조한다. 타 트랙이 먼저 쓴 authored 위에 EN 을 얹는 사고를 막는 게이트다. `prepare(stage='en')` 에서 불일치 시 그룹 이상으로도 올린다.

사전 게이트 실패 시 **트랜잭션 시작 전** `exit 4`, write 0.

## 4. postVerify (커밋 전 · 실패 시 전량 ROLLBACK)

단일 트랜잭션 안에서 write 완료 후 커밋 **직전**에 실행한다. 하나라도 어긋나면 예외 → `rollbackTransaction()`.

| 항목 | KO 단계 기대 | EN 단계 기대 |
|---|---:|---:|
| authored KO canonical | 443 | 443 (유지) |
| easy deprecated | 443 | 443 |
| easy canonical 잔존 | 0 | 0 |
| audit (`canonical_replaced`, ko) | 443 | 443 |
| EN canonical | **0** | **443** |
| needs_review 잔존 | — | 0 |
| canonicalDup | 0 | 0 |
| sourceRef leak (앵커로 본 단위 밖 write) | 0 | 0 |
| EN 한글 | — | 0 |
| **writeActual** | **1,772** | **886** |

- write 수는 트랜잭션 안에서 먼저 `writes !== 예상` 검사로 잡고, 그 다음 상태 검사를 한다. **총 2,658T**.
- audit 은 `shared_product_description_audit_logs`(event_type·previous/new description id·metadata) — 기존 생산 러너 **VERBATIM**.

## 5. 독립검증 스크립트

`apps/api-server/src/scripts/otc-unproduced-nonoral-unit1-verify.na.ts` — **실행기와 분리된 SELECT 전용**.

> 실행기의 in-TX 사후검증과 **코드를 공유하지 않는다.** 같은 로직으로 자기 결과를 재확인하면 검증이 아니라 반복이 되므로, 승인 SSOT 의 대상 집합만 입력으로 받아 독립 쿼리로 산출한다.

| 항목 | 기대 |
|---|---:|
| targetMasters | 443 |
| koAuthoredCanonical | 443 |
| enCanonical | 443 |
| easyDeprecated | 443 |
| easyStillCanonical | 0 |
| auditKo | 443 |
| needsReviewLeft | 0 |
| canonicalDup | 0 |
| sourceRefLeak | 0 |
| enHangul | 0 |
| holdWritten (HOLD 55) | 0 |
| **ophthalmicUnit2Written** (점안 34fp/159m) | **0** |
| 기존 경구·외용 LIVE 불변 | 본 단위 밖 authored canonical 스냅샷 대조 |

**apply 전 실행 결과 (`PRE_APPLY`)**: 12항목 중 7 PASS · 5는 apply 후 채워지는 값(ko/en canonical·easy deprecated·audit = 0, easyStillCanonical = 443)이므로 **정상**. 스크립트는 `state=PRE_APPLY` 를 명시하고 exit 0 으로 종료한다(적용 후에만 FAIL 시 exit 1).
**본 단위 밖 authored canonical 기준선 = 10,696** — apply 후 동일해야 한다(경구 Unit1·외용 LIVE 불변 증거).

## 6. dry-run 회귀

```
tsx src/scripts/otc-unproduced-nonoral-unit1-production.na.ts --mode=dry-run
```

**14/14 PASS** · fp 70/70 · master 443/443 · writePlan KO 1,772 + EN 886 = 2,658 · canonicalDup 0 · EN 70/70 · `dbWrite 0`.
**해시 불변** — apply 코드 추가 전후 동일 `64eabad34a52a29fde5d5601d1597046` (2회 실행 byte-identical). 기존 계약을 건드리지 않았다는 증거다.

## 7. 환경변수 차단 시험

> **작업 중 경구 Unit 2 가 `UNBLOCKED` → `GREEN` 으로 전환**됐다(다 세션 완료, 원장 read-only 확인).
> 덕분에 1번 게이트(실행순서)에 가려져 있던 **환경변수 게이트를 단독으로 실증**할 수 있었다. 아래는 GREEN 상태에서의 결과다.

### 런타임 실증 (실제 실행 · exit code)

| # | 호출 | exit | 차단 사유 |
|---:|---|:---:|---|
| A | `--mode=apply --lang=ko` | **3** | `--apply` 미지정 |
| B | `--mode=apply --lang=ko --apply` | **3** | `OTC_NONORAL_U1_KO_CONFIRM` 미설정 |
| C | `KO_CONFIRM=yes … --apply` | **3** | 값 불일치(`yes` ≠ `YES`) |
| D | `EN_CONFIRM=Y … --lang=en --apply` | **3** | 값 불일치(`Y` ≠ `YES`) |

전건 **DB 접속 전 차단**. 실행순서가 충족된 상태에서도 `--apply`·환경변수 게이트가 독립적으로 작동함이 확인됐다.

> **3조건이 모두 충족되는 케이스는 실행하지 않았다** — 본 WO 는 LIVE apply 금지다.

### 논리 전수 (`--env-block-test`, DB 미접속)

| 케이스 | 판정 | 차단 사유 |
|---|:---:|---|
| `--apply` 없음 | BLOCK | `--apply` 미지정 |
| 환경변수 미설정 | BLOCK | 이중확인 환경변수 |
| 환경변수 값 불일치(`yes`) | BLOCK | 이중확인 환경변수 |
| 환경변수 오타(`Y`) | BLOCK | 이중확인 환경변수 |
| 3조건 전부 충족 | (write 허용 조건) | — 본 시험은 실행하지 않음 |

`dbWrite: 0` → `otc-unproduced-nonoral-unit1-envblock-test.na.json`
5번 케이스가 `wouldWrite: true` 로 나오는 것은 **게이트가 조건을 올바르게 구분한다는 증거**다(무조건 차단이 아니라 조건부 허용).

## 8. rollback 시험 — PASS

| 항목 | 결과 |
|---|---|
| 표본 | 상위 3 fp (133 master) |
| TX 내 write | **532 / 532** (133 × 4T) |
| 그룹 사후검증 | PASS |
| rollback 후 easy canonical | **443 / 443** (불변) |
| rollback 후 authored canonical | **0 / 0** (불변) |
| **순 DB write** | **0** |

## 9. 보고 요약

| 항목 | 값 |
|---|---|
| 예상 write | KO **1,772** + EN **886** = **2,658T** |
| canonicalDup | **0** |
| **DB write** | **0** (rollback 시험 포함 순 write 0) |
| 2회 실행 byte-identical | dry-run `64eabad3…` · env-block `345e0e9d…` · verify `a190be15…` |

## 10. 준수 / 금지

| 항목 | 결과 |
|---|---|
| 실제 LIVE apply | **0** |
| 실행 순서 원장 GREEN 변경 | **0** (read-only 조회만) |
| 경구 Unit 2 파일 | **미수정** |
| 점안 Unit 2 파일 | **미수정** (독립검증에서 write 0 확인 대상으로만 참조) |
| 공용 러너 계약 변경 | **0** |
| 승인 SSOT · EN JSON 수정 | **0** |
| `pnpm-lock.yaml` · 타 세션 변경 | **미접촉** |
| `apps/api-server/.env` | 미수정·미삭제 · 값 출력 0 |
| `git add .` / reset / clean / stash | 미사용 — path-specific add |

## 11. 경구 Unit 2 GREEN 후 즉시 LIVE 가능 여부

> **가능.** 추가 코드 변경 없이 아래 순서만 실행하면 된다.

```bash
cd apps/api-server
# 1) 경구 Unit 2 GREEN 확인 후 write-owner 인계
OTC_NONORAL_U1_KO_CONFIRM=YES tsx src/scripts/otc-unproduced-nonoral-unit1-production.na.ts \
  --mode=apply --lang=ko --apply          # KO 1,772T + in-TX postVerify
OTC_NONORAL_U1_EN_CONFIRM=YES tsx src/scripts/otc-unproduced-nonoral-unit1-production.na.ts \
  --mode=apply --lang=en --apply          # EN 886T + 전체 postVerify
tsx src/scripts/otc-unproduced-nonoral-unit1-verify.na.ts   # 독립검증 12/12 → GREEN
```

이후 원장 GREEN 기록 → **점안 Unit 2 를 `UNBLOCKED` 로 전환**(별도 WO, 본 세션 미수행).

> **선행 조건은 이미 충족됐다** — 작업 중 경구 Unit 2 가 `GREEN` 으로 전환됐다(§7).
> 따라서 남은 것은 **write-owner 인계 확인**뿐이며, 인계 즉시 위 3줄로 LIVE 착수 가능하다.
> 본 WO 는 apply 금지 범위이므로 실행하지 않았고, 3조건이 모두 충족되는 호출도 시험하지 않았다.
