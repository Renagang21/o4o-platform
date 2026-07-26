# CHECK-O4O-OTC-UNPRODUCED-NONORAL-UNIT1-FINAL-PRODUCTION-V1 — 비경구 Unit 1 LIVE 완결 (70 fp / 443 master · 2,658T)

WO: `WO-O4O-OTC-UNPRODUCED-NONORAL-UNIT1-FINAL-PRODUCTION-V1` · 일자: 2026-07-26 · **단일 DB write-owner: `agent-na`**
기준: 승인 `4f188953d` · readiness/EN `6929909ac` · apply enablement `c5bf51ac1`
상태: **GREEN — KO 1,772T + EN 886T = 2,658T LIVE 완결 · 예상=실측 · 독립검증 12/12 PASS**

---

## 0. 결론

> **비경구 Unit 1 생산 완결.** 70 fp / 443 master 를 KO(교체)+EN(신규) canonical LIVE 적재했다.
>
> | 축 | 결과 |
> |---|---|
> | KO writeActual | **1,772** (예상 1,772) |
> | EN writeActual | **886** (예상 886) |
> | **총 write** | **2,658** (예상 2,658) |
> | KO authored canonical | **443** |
> | EN canonical | **443** |
> | easy deprecated / 잔존 | **443 / 0** |
> | audit | **443** |
> | needs_review · canonicalDup · sourceRef leak · EN 한글 | **0 · 0 · 0 · 0** |
> | HOLD write · 점안 Unit 2 write | **0 · 0** |
> | 기존 경구·외용 LIVE 변경 | **0** (기준선 10,696 불변) |
> | 독립검증 | **12/12 PASS** |

---

## 1. write-owner 인계 확인

| 항목 | 값 |
|---|---|
| 단일 DB write-owner | **`agent-na`** |
| 선행 단위 | 경구 Unit 1 GREEN(agent-da) · 경구 Unit 2 GREEN(agent-da) |
| 동시 LIVE write | 없음 — 타 세션 변경은 프론트(pharmacy-products)·점안 Unit 2 준비 파일뿐, 본 대상 443 master 무접촉(선행 확인 6에서 실측) |

### 선행 확인 6/6 PASS

| # | 항목 | 결과 |
|---:|---|---|
| 1 | 경구 Unit 2 실행 원장 GREEN | ✅ `oral-unit-1 GREEN` · `oral-unit-2 GREEN` |
| 2 | 다른 세션 LIVE write 없음 | ✅ 대상 443 master authored/en canonical 0 실측 |
| 3 | Cloud SQL Proxy `127.0.0.1:5442` | ✅ LISTENING |
| 4 | `apps/api-server/.env` | ✅ 존재 (값 미열람) |
| 5 | 승인 SSOT·EN JSON·dry-run hash 불변 | ✅ dry-run `64eabad3…` 동일 · SSOT `87b16f66…` · EN `7ffa7a8e…` |
| 6 | authored KO/EN canonical 기존 보유 0 | ✅ ko 0 · en 0 · easy canonical 443 · canonicalDup 0 |

## 2. KO apply 결과

```
$env:OTC_NONORAL_U1_KO_CONFIRM="YES"
tsx src/scripts/otc-unproduced-nonoral-unit1-production.na.ts --mode=apply --lang=ko --apply
```

- 사전 게이트 **K1~K10 전건 PASS** (실패 0)
- **writeActual 1,772 == writePlan 1,772** (443 master × 4T: easy demote → authored INSERT → canonical 전환 → audit)
- 단일 트랜잭션 · INSERT-only · 기존 canonical 본문 UPDATE 0

**in-TX postVerify (커밋 직전)**

| 항목 | 값 | 기대 |
|---|---:|---:|
| koAuthoredCanonical | **443** | 443 |
| easyDeprecated | **443** | 443 |
| easyStillCanonical | **0** | 0 |
| auditKo | **443** | 443 |
| enCanonical | **0** | 0 |
| needsReviewLeft · canonicalDup · sourceRefLeak | 0 · 0 · 0 | 0 |

## 3. EN apply 결과

```
$env:OTC_NONORAL_U1_EN_CONFIRM="YES"
tsx src/scripts/otc-unproduced-nonoral-unit1-production.na.ts --mode=apply --lang=en --apply
```

- 사전 게이트 **E1~E10 전건 PASS** (실패 0) — **E2 KO 앵커 전건 본 트랙 sourceRef 일치** 포함
- **writeActual 886 == writePlan 886** (443 × 2T: EN INSERT → canonical 전환)

**전체 postVerify**

| 항목 | 값 | 기대 |
|---|---:|---:|
| koAuthoredCanonical (유지) | **443** | 443 |
| enCanonical | **443** | 443 |
| easyDeprecated | **443** | 443 |
| easyStillCanonical | **0** | 0 |
| auditKo | **443** | 443 |
| needsReviewLeft | **0** | 0 |
| canonicalDup | **0** | 0 |
| sourceRefLeak | **0** | 0 |
| enHangul | **0** | 0 |

## 4~9. 결과 대조

| # | 필수 결과 | 실측 | 판정 |
|---:|---|---:|:---:|
| 4 | 총 write 2,658 | **2,658** | ✅ |
| 5 | KO authored canonical 443 / EN canonical 443 | **443 / 443** | ✅ |
| 5 | easy deprecated 443 / 잔존 0 | **443 / 0** | ✅ |
| 5 | audit 443 / needs_review 0 | **443 / 0** | ✅ |
| 6 | canonicalDup | **0** | ✅ |
| 7 | sourceRef leak (앵커로 본 단위 밖 write) | **0** | ✅ |
| 8 | HOLD write / 점안 Unit 2 write | **0 / 0** | ✅ |
| 9 | 기존 경구·외용 LIVE 변경 | **0** (기준선 **10,696** 불변) | ✅ |
| — | EN 한글 | **0** | ✅ |

> **route 분포**: topical 390 · oromucosal 32 · vaginal 21 = 443. 그룹 경계는 승인 SSOT 의 10축 안전지문 그대로이며, `sourceRef = uuid(md5("otc-combo-leaflet:"+fp))` 앵커로 고정됐다.

## 10. 독립검증 — 12/12 PASS

```
tsx src/scripts/otc-unproduced-nonoral-unit1-verify.na.ts
```

생산 실행기와 **코드를 공유하지 않는** SELECT 전용 검증기. `state: APPLIED` · `allPass: true` · exit 0.

| 항목 | 실측 / 기대 |
|---|---|
| targetMasters | 443 / 443 |
| koAuthoredCanonical | 443 / 443 |
| enCanonical | 443 / 443 |
| easyDeprecated | 443 / 443 |
| easyStillCanonical | 0 / 0 |
| auditKo | 443 / 443 |
| needsReviewLeft | 0 / 0 |
| canonicalDup | 0 / 0 |
| sourceRefLeak | 0 / 0 |
| enHangul | 0 / 0 |
| holdWritten | 0 / 0 |
| ophthalmicUnit2Written | 0 / 0 |

**본 단위 밖 authored canonical = 10,696** — apply 전 기준선과 **동일**. 경구 Unit 1·2, 외용 기존 LIVE 가 한 건도 변하지 않았다는 직접 증거다.

## 11. 실행 순서 원장 GREEN

`otc-unproduced-nonoral-unit1-execution-order-v1.json` 에 **`executionStatus` 추가 블록**으로 기록했다. 승인 선언·게이트 수치(`status` · `totals` · `gates`)는 **변경하지 않았다**.

| unitId | state | applied |
|---|---|---|
| `nonoral-unit-1` | **GREEN** | KO 1,772 + EN 886 = **2,658** (declared 일치) |

## 12. 점안 Unit 2 — UNBLOCKED

| unitId | state | 범위 | 선행 |
|---|---|---|---|
| `nonoral-unit-2` | **UNBLOCKED** | ophthalmic 34 fp / 159 master (954T) | `nonoral-unit-1` GREEN 충족 |

> 착수 조건만 해제했다. **본 WO 범위에서 점안 LIVE apply 는 수행하지 않았고**, write-owner 지정과 `ophthalmic` RouteProfile 반영은 별도 WO 다. 가 세션이 점안 Unit 2 승인 SSOT 를 준비 중이며 **해당 파일은 미접촉**이다.

## 13. 산출물

| 경로 | 성격 |
|---|---|
| `src/scripts/data/otc-unproduced-nonoral-unit1-apply-run.ko.json` | KO apply 실행기록 (게이트·postVerify·그룹별 T) |
| `src/scripts/data/otc-unproduced-nonoral-unit1-apply-run.en.json` | EN apply 실행기록 |
| `src/scripts/data/otc-unproduced-nonoral-unit1-verify.na.json` | 독립검증 `APPLIED` 12/12 |
| `src/scripts/data/otc-unproduced-nonoral-unit1-execution-order-v1.json` | 실행 순서 원장 (GREEN + 점안 UNBLOCKED) |
| 본 CHECK | 기록 |

## 14. 준수 / 금지

| 항목 | 결과 |
|---|---|
| 승인 SSOT · EN JSON · 공용 러너 수정 | **0** (해시 불변 확인) |
| 경구 Unit 1·2 파일 / 점안 Unit 2 파일 | **미수정** |
| `pnpm-lock.yaml` · 타 세션 변경 | **미접촉** |
| `apps/api-server/.env` | 미수정·미삭제 · 값 출력 0 |
| `git add .` / reset / clean / stash | 미사용 — path-specific add |
| 중지 조건 발동 | **0** (예상=실측 · dup 0 · 충돌 0 · 혼입 0 · TX/postVerify/독립검증 전건 PASS) |

## 15. 잔여

| 단위 | 상태 | 물량 |
|---|---|---|
| 비경구 Unit 1 (피부·구강·질) | **GREEN 완결** | 70 fp / 443 master |
| 비경구 Unit 2 (점안) | **UNBLOCKED** — 별도 WO | 34 fp / 159 master · 954T |

비경구 READY 604 master 중 **443 완결**, 잔여 159(점안)는 착수 가능 상태다.
