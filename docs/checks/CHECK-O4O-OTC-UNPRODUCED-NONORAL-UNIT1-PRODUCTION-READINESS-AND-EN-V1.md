# CHECK-O4O-OTC-UNPRODUCED-NONORAL-UNIT1-PRODUCTION-READINESS-AND-EN-V1 — 생산 준비 완료 · EN 70/70 · dry-run GREEN

WO: `WO-O4O-OTC-UNPRODUCED-NONORAL-UNIT1-PRODUCTION-READINESS-AND-EN-V1` · 일자: 2026-07-26 · 담당: **드럭 OTC 에이전트 나**
승인 SSOT: `otc-unproduced-nonoral-unit1-approved-ssot-v1.json` (**`4f188953d`**, 70 fp / 443 master, `APPROVED_FOR_PRODUCTION`)
성격: **생산 준비 · EN 저작 · dry-run · rollback 시험.** **DB write 0** · **LIVE apply 0**.

---

## 0. 결론

> **생산 준비 완료 — write-owner 인계 직후 LIVE apply 가능.**
>
> | 축 | 결과 |
> |---|---|
> | dry-run 게이트 | **14/14 PASS** |
> | fp / master 재현 | **70 / 443** (적격 70 fp / 443 master) |
> | EN 저작 | **70/70 fp** · 한글 0 · 경구동사 0 · 수치 누락 0 |
> | rollback 시험 | **PASS** — TX 내 532T 수행 후 전량 롤백, 상태 불변 |
> | 예상 write | KO 1,772 + EN 886 = **2,658T** |
> | canonicalDup | **0** |
> | 2회 실행 byte-identical | **PASS** (`64eabad3…`) |
> | **DB write** | **0** (순 write 0 — rollback 시험 포함) |

---

## 1. 생산 실행기 · 어댑터

| 경로 | 역할 |
|---|---|
| `apps/api-server/src/scripts/otc-unproduced-nonoral-unit1-adapter.na.ts` | **생산 입력 어댑터** — 승인 SSOT 로더 · route 프로파일 · 10축 fp 재현기 |
| `apps/api-server/src/scripts/otc-unproduced-nonoral-unit1-production.na.ts` | **생산 실행기** — `--dump-source` / `--mode=dry-run` / `--rollback-test` |

### 왜 전용 어댑터인가 (공용 러너 미수정)

기존 `otc-external-site-split-production.ts` 는 (a) 그룹키가 **9축** fp, (b) route 명이 `cutaneous`, (c) 그룹마다 `v2Fp` 보유다.
본 승인 SSOT 는 (a) **10축** safetyFp, (b) route 명 `topical`, (c) v2Fp 미보유 — **산식·계약이 다르다.**
따라서 **공용 러너와 기존 어댑터는 수정하지 않고** 본 트랙 전용 어댑터를 두었다.

**재사용한 것**(계약 변경 0):

- 공용 러너 원시 함수 — `officialAxes` · `composeKo`/`buildGroupKo` · `renderEn` · `fetchTargetState` · **`fpToUuidV2`**
- **write 계약 VERBATIM** — master당 KO 4T(easy demote → authored INSERT → canonical 전환 → audit) + EN 2T, INSERT-only, 단일 TX, 커밋 전 사후검증 → 실패 시 전량 ROLLBACK
- **audit 계약 VERBATIM** — `shared_product_description_audit_logs`(`event_type='canonical_replaced'`, previous/new description id, metadata)

> route 프로파일은 공용 `ROUTE_PROFILE` 을 건드리지 않고 본 트랙 전용(`UNIT1_ROUTE_PROFILE`)으로 정의했다 — 기존 recovery 어댑터가 쓴 것과 동일한 분리 방식이다.
> **form 은 접미로 확정**되므로(크림·연고·플라스타·트로키·껌·질정) 경로 라벨 폴백을 쓰지 않고 확정 제형명을 그대로 썼다.

## 2. EN JSON 경로

`apps/api-server/src/scripts/data/otc-unproduced-nonoral-unit1-en.na.json` — **70 translations**, fp 기준 정렬.
grounding 덤프: `otc-unproduced-nonoral-unit1-ko-source.na.json` (70 fp 공식 3축 원문, DB write 0).

## 3. fp / master 재현 · route별 검증

| route | fp | master | 기대 | 판정 |
|---|---:|---:|---:|:---:|
| topical | 56 | **390** | 390 | ✅ |
| oromucosal | 7 | **32** | 32 | ✅ |
| vaginal | 7 | **21** | 21 | ✅ |
| **합계** | **70** | **443** | 443 | ✅ |

- **10축 fp 재현 443/443** (실패 0) · 이상 그룹 0 · SSOT 밖 master 0.
- route 는 **용법·용량 원문에서 도출**하고 효능·효과와 대조했다(제품명 미사용). 부위 상충·충돌 **0**.

## 4. EN 저작 결과

| 게이트 | 결과 |
|---|---|
| EN payload | **70 / 70 fp** |
| EN 한글 잔존 | **0** |
| EN 경구동사(`take`/`taken`/`orally`/`by mouth`) | **0** |
| EN 필수필드 누락 | 0 |
| 공식 수치·연령·기간 누락 | **0** |

**route별 표현 (usageLabel 은 프로파일에서 주입 — 저작자 자유입력 금지)**

| route | enUsageLabel |
|---|---|
| topical | `How to apply it to the affected area` |
| oromucosal | `How to use it in the mouth or throat according to the official directions` |
| vaginal | `How to insert or use it vaginally` |

> **구강 제형의 `swallow` 예외**: oromucosal 만 EN 금지어에서 `swallow` 를 뺐다. 원문의 「씹거나 삼키지 말고 입안에서 천천히 녹여서」는 **삼키지 말라는 금지 지시**이므로, 이를 막으면 안전 지시를 옮길 수 없다. `take`·`orally`·`by mouth` 는 그대로 차단한다. topical·vaginal 은 전체 금지어 유지.

### 수치·연령·기간·부위 보존 — 저작 중 발견한 결손 1건 정정

`8137728114ad6559`(니코틴 껌)에서 게이트가 **`3` 누락**을 잡았다. 조사 결과 단순 숫자 누락이 아니라 **1일 총량과 투여기간이 통째로 빠진 것**이었다.

- 누락분: 「통상 하루 2 mg 또는 4 mg 껌 **8~12개**, 하루 총 **15개** 초과 금지 / 흡연 욕구가 줄면 1일 수량 감소 / 일반적으로 **3개월** 정도 투여」
- 정정 후 전량 반영 → D5·D12 PASS.

> 수치 게이트가 **정보층 결손을 잡아낸 사례**다. 게이트를 우회해 숫자만 끼워 넣지 않고 원문 문장을 복원했다.

## 5. dry-run 결과 (게이트 14/14 PASS)

```
tsx src/scripts/otc-unproduced-nonoral-unit1-production.na.ts --mode=dry-run
```

| # | 게이트 | 판정 |
|---:|---|:---:|
| D1 | 승인 SSOT status·수량 일치 | ✅ |
| D2 | 10축 fp 재현 100% (443/443) | ✅ |
| D3 | route·효능·용법 대조 mismatch 0 | ✅ |
| D4 | KO 경구동사 0 | ✅ |
| D5 | 공식 수치·기간 누락 0 | ✅ |
| D6 | HOLD·SSOT밖 혼입 0 | ✅ |
| D7 | route별 수량 일치 (390/32/21) | ✅ |
| D8 | authored canonical 상태 정합 (기존 authored 0 · en 0) | ✅ |
| D9 | canonicalDup 0 | ✅ |
| D10 | 예상 write 2,658T | ✅ |
| D11 | 이상 그룹 0 | ✅ |
| D12 | EN 70/70 fp | ✅ |
| D13 | EN 한글 0 | ✅ |
| D14 | EN 경구동사 0 | ✅ |

- 산출: `otc-unproduced-nonoral-unit1-dryrun.na.json` · `allGatesPass: true` · `dbWrite: 0`
- **2회 실행 byte-identical** — `64eabad34a52a29fde5d5601d1597046`

## 6. rollback 시험 — PASS

실제 write 계약을 트랜잭션 안에서 **그대로 수행한 뒤 무조건 ROLLBACK** 한다. 커밋 경로를 타지 않으므로 순 DB write 는 0이며, 사후검증 로직이 실제로 동작하는지·write 수가 계약과 일치하는지를 실증한다.

| 항목 | 결과 |
|---|---|
| 표본 | 상위 3 fp (133 master) |
| TX 내 write | **532 / 532** (133 × 4T) — 계약 일치 |
| 그룹 사후검증 | authored canonical == 그룹 size · canonicalDup 0 → **PASS** |
| rollback 후 easy canonical | **443 / 443** (불변) |
| rollback 후 authored canonical | **0 / 0** (불변) |
| **순 DB write** | **0** |

- 산출: `otc-unproduced-nonoral-unit1-rollback-test.na.json` · `verdict: PASS`
- audit 계약 오류(테이블·컬럼)가 이 시험에서 먼저 드러나 정정했다 — LIVE 에서 터졌다면 전량 롤백 사유였을 것이다.

## 7. 필수 게이트 대조

| # | WO 게이트 | 결과 |
|---:|---|---|
| 1 | 70 fp / 443 master 재현 | ✅ 70 / 443 |
| 2 | fp 누락·중복 0 | ✅ 0 / 0 |
| 3 | 안전지문 mismatch 0 | ✅ 0 (10축 443/443 재현) |
| 4 | route별 390/32/21 일치 | ✅ |
| 5 | 기존 LIVE 교집합 0 | ✅ (승인 SSOT 게이트 + D8 상태 정합) |
| 6 | authored ko/en canonical 0 | ✅ 0 / 0 |
| 7 | HOLD 대상 혼입 0 | ✅ 0 |
| 8 | EN 70/70 fp | ✅ |
| 9 | EN 한글 0 | ✅ |
| 10 | 경구 동사 0 | ✅ (KO·EN 양쪽) |
| 11 | 공식 수치·기간·부위 누락 0 | ✅ (결손 1건 정정 후) |
| 12 | 예상 write 2,658T | ✅ KO 1,772 + EN 886 |
| 13 | canonicalDup 0 | ✅ |
| 14 | dry-run DB write 0 | ✅ |
| 15 | 2회 실행 byte-identical | ✅ |
| 16 | rollback 시험 PASS | ✅ |

## 8. 산출물

| 경로 | 성격 |
|---|---|
| `src/scripts/otc-unproduced-nonoral-unit1-adapter.na.ts` | 생산 입력 어댑터 |
| `src/scripts/otc-unproduced-nonoral-unit1-production.na.ts` | 생산 실행기 (apply 경로는 하드 차단) |
| `src/scripts/data/otc-unproduced-nonoral-unit1-en.na.json` | **EN 70 fp** |
| `src/scripts/data/otc-unproduced-nonoral-unit1-ko-source.na.json` | 공식 KO 3축 덤프(grounding) |
| `src/scripts/data/otc-unproduced-nonoral-unit1-dryrun.na.json` | dry-run 매니페스트 |
| `src/scripts/data/otc-unproduced-nonoral-unit1-rollback-test.na.json` | rollback 시험 결과 |
| 본 CHECK | 기록 |

## 9. 준수 / 금지

| 항목 | 결과 |
|---|---|
| LIVE apply | **0** — `--apply` 는 실행기에서 **하드 차단**(예외 throw) |
| 실행 순서 원장 상태 변경 | **0** (미접촉) |
| 공용 러너·기존 어댑터 수정 | **0** (`otc-v2-store-leaflet-runner.shared.ts` · `otc-v2-external-site-recovery-adapter.ts` · `otc-external-site-split-production.ts` 읽기만) |
| 경구 Unit 1·2 파일 | **미수정** |
| ophthalmic 프로파일 작업 | **0** (Unit 2 범위) |
| 승인 SSOT | **미수정** (읽기만) |
| `apps/api-server/.env` | 미수정·미삭제 · 값 출력 0 |
| `git add .` / reset / clean / stash | 미사용 — path-specific add |
| **DB write** | **0** |

## 10. write-owner 인계 후 즉시 LIVE 생산 가능 여부

> **가능.** dry-run 게이트 14/14 PASS · EN 70/70 · rollback 시험으로 write 계약과 사후검증이 실증됐다.
>
> **인계 시 열어야 할 것 1건**: 현 실행기는 `--apply` 를 하드 차단한다(본 WO 금지 준수). LIVE 착수 WO 에서 apply 경로(KO/EN 이중게이트 환경변수 포함)를 여는 최소 변경만 하면 된다. 대상·그룹·앵커·EN payload·write 계획은 전부 고정돼 있어 재저작·재검증이 필요 없다.
