# CHECK-O4O-OTC-UNPRODUCED-ORAL-UNIT1-EN-CONTINUE-TO-FINAL-GREEN-V1 — 경구 Unit 1 EN 완결 (에이전트 다)

WO: `WO-O4O-OTC-UNPRODUCED-ORAL-UNIT1-EN-CONTINUE-TO-FINAL-GREEN-V1`
선행: `CHECK-O4O-OTC-UNPRODUCED-ORAL-UNIT1-FINAL-PRODUCTION-V1` (KO 7,400T LIVE 완료 · EN 미실행)
기준: 승인 SSOT `8328047ac` · Unit 1 = 373 fp / 1,850 master · EN 3,700T
상태: **GREEN — EN 373/373 저작 완료 → EN 3,700T LIVE apply → 독립검증 10/10 · 범위 사후검증 7/7. Unit 1 총 11,100T 완결. Unit 2 착수 조건 해제.**

## 0. 결론

> EN 저작을 373/373 완료했고, 병합 산출물이 **2회 byte-identical** (`c42ebe21747d95aa20e6fd656c2c6d37`) 임을 확인한 뒤 EN dry-run **13/13 PASS**, 이어서 **EN 3,700T 를 LIVE apply** 했다. 예상=실측 정확 일치(3700 MATCH).
> 독립검증 **10/10 PASS**, 범위 사후검증 **7/7 PASS** — Unit 2 write 0, 선행 외용 LIVE(199m + 90m) 무변경.
> 실행 순서 원장에 집행 상태를 기록해 **oral-unit-1 = GREEN / oral-unit-2 = UNBLOCKED** 로 올렸다. 단 **Unit 2 LIVE apply 는 본 WO 범위 밖이므로 수행하지 않았다.**

## 1. EN 저작 — 373/373

배치 도구: `apps/api-server/src/scripts/otc-unproduced-oral-unit1-en-batch.ts` (`--dump` / `--status` / `--merge`)

- 부분 파일 누적: `src/scripts/data/unit1-en-parts/part-001.json` ~ `part-014.json`
- `--merge` 는 **373/373 저작 + 렌더 게이트 전건 통과일 때만** `otc-unproduced-oral-unit1-en.json` 을 생성한다. 부분 상태에서는 병합 파일을 만들지 않아 **부분 EN apply 가 구조적으로 불가능**하다.
- 각 그룹 payload = `{ fp, title, efficacy, usage, caution, summaryTable }`. `usageLabel` 은 경로 프로파일에서 주입되며 저작하지 않는다.
- 저작은 승인 SSOT 의 공식 원문(효능·용법·주의)만 grounding 으로 사용했다. 제품명은 성분·경로 판정에 쓰지 않았다.

| 배치 | 그룹 | 누적 | 렌더 게이트 |
|---|---:|---:|---|
| 1~10 | 240 | 240/373 | 240/240 PASS |
| 11 | 34 | 274/373 | PASS · 문제 0 |
| 12 | 34 | 308/373 | PASS · 문제 0 |
| 13 | 34 | 342/373 | PASS · 문제 0 |
| 14 | 31 | **373/373** | **373/373 PASS · 문제 0** |

### 저작 중 판단 2건

1. **원문 자체가 중간 절단된 그룹** — `cd08cf678751db75` / `d167fe6e902361ec` / `6e83fe17cbff2978` 등은 공식 용법 필드가 문장 중간에서 끊겨 있다. 없는 뒷부분을 추정해 채우지 않고, 끊긴 지점까지를 그대로 옮긴 뒤 "나머지 용량 세부는 허가사항 참조" 로 닫았다.
2. **효능 필드에 용법이 들어간 그룹** — `813e9f819c9d1824`(경구피임제)는 공식 효능 필드 내용이 복용 스케줄이다. 다른 적응증을 만들어 넣지 않고 해당 원문을 그대로 번역했다. 제품 성격("경구피임제")은 같은 원문의 주의사항에 명시된 표현에 근거한다.

## 2. 수치 게이트 — 범위 표기 보정 (승인 반영)

`missingNumericsEn` 이 `200-600` 류 범위를 천단위 구분자로 오독해 실재하지 않는 `200600` 을 요구하던 문제를 승인 범위에서 보정했다.

- 명시 범위(`-` `–` `—` `~`) → **양 끝값 모두 필수** (더 엄격해짐)
- 쉼표 결합은 대안 집합으로 해소 — `1,000`/`4,000`/`1,200` 은 단일값, `3,4회`/`30,40 mg/kg` 은 양 끝값
- 끝값 누락 시 FAIL 유지 — **게이트를 끄거나 우회하지 않았다**
- `200600 mg` 같은 허위 용량은 EN 에 삽입하지 않았다

`normalize` · fingerprint · KO 경로 · writePlan 은 무영향(EN 수량 게이트 내부에만 적용).

보류돼 있던 2 그룹(`998366614345e8f2` · `76cb6ae9a1db974e`)은 보정 후 정상 저작·게이트 통과했다. 보류 기록 `otc-unproduced-oral-unit1-en-HELD-numeric-artifact.json` 은 판단 이력으로 **삭제하지 않고 유지**한다.

## 3. 병합 결정성

```
merge #1 → c42ebe21747d95aa20e6fd656c2c6d37
merge #2 → c42ebe21747d95aa20e6fd656c2c6d37   (cmp 결과 byte-identical)
```

## 4. EN dry-run — 게이트 13/13 PASS

`--mode=dry-run --lang=en` → `otc-unproduced-oral-unit1-dryrun.en.json`

| # | 게이트 | 결과 |
|---|---|---|
| G1 | SSOT status=APPROVED_FOR_PRODUCTION | PASS |
| G2 | 총계 373fp / 1,850master | PASS |
| G3 | fp 재현 100% (1,850/1,850) | PASS |
| G4 | master 누락·중복 0 | PASS |
| G5 | 10축 안전지문 mismatch 0 | PASS |
| G6 | 공식 효능·용법·주의 결손 0 | PASS |
| G7 | route=oral 전건 일치 | PASS |
| G8 | sourceRef 정합 (EN 단계 기대값) | PASS |
| G9 | authored canonical 상태 정합 | PASS |
| G10 | Unit 2 대상 혼입 0 | PASS |
| G11 | canonicalDup 0 | PASS |
| G12 | 예상 write = EN 3,700 | PASS |
| G13 | 이상 그룹 0 | PASS |

### 단계 인식 보정 — 게이트를 건너뛰지 않고 기대값을 뒤집었다

dry-run 이 `--lang` 을 무시하고 항상 KO 단계 기대값으로 판정해 KO apply 이후 G8·G9·G12·G13 이 FAIL 로 떴다. 원인은 판정 기준이지 DB 상태가 아니다.

- `dryRun()` 이 `--lang=ko|en` 을 받아 `prepare`/`gatesOf` 에 단계를 전달
- G8 은 EN 단계에서 **"앵커 1,850건 전량이 본 트랙 KO authored canonical 행"** 임을 확인하는 쪽으로 반전 — 이전 apply 경로의 `SKIP(KO 앵커 생성됨)` 처리를 제거하고 실제 검사로 대체했다(약화 아님, 강화)
- KO 단계 manifest 경로(`...dryrun.json`)는 그대로 두고 EN 은 `...dryrun.en.json` 으로 분리

## 5. EN LIVE apply

```
UNIT1 APPLY en — 373fp/1850m · write-owner agent-da
  게이트 13/13 PASS
APPLIED en — 373그룹 · writeActual 3700 MATCH
```

- 이중 게이트: `--apply` + `OTC_ORAL_U1_EN_CONFIRM=YES`
- EN 2T/master (authored en INSERT → canonical 전환) · INSERT-only · 단일 트랜잭션 · 커밋 전 사후검증
- 실행 기록: `otc-unproduced-oral-unit1-apply-run.en.json`

## 6. 독립검증 — 10/10 PASS

```json
{"targetMasters":1850,"koAuthoredCanonical":1850,"enCanonical":1850,"easyDeprecated":1850,
 "easyStillCanonical":0,"needsReviewLeft":0,"auditKo":1850,"canonicalDup":0,
 "sourceRefLeak":0,"enHangul":0}
```

대상 master 1,850 / KO authored canonical 1,850 / easy_drug deprecated 1,850 / easy_drug canonical 잔존 0 / audit 1,850 / needs_review 0 / canonicalDup 0 / sourceRef leak 0 / EN 한글 0 / EN canonical 1,850 — 전항목 PASS.

## 7. 범위 사후검증 — 7/7 PASS

`otc-unproduced-oral-unit1-postverify-scope.ts` (read-only · DB write 0)

| # | 게이트 | 실측 | 결과 |
|---|---|---|---|
| S1 | KO apply 원장 7,400 | 7,400 | PASS |
| S2 | EN apply 원장 3,700 | 3,700 | PASS |
| S3 | Unit 1 총 write 11,100 | 11,100 | PASS |
| S4 | Unit 2 전용 master KO write 0 | 0 / 1,849 | PASS |
| S5 | Unit 2 전용 master EN write 0 | 0 / 1,849 | PASS |
| S6 | 외용 final 199m KO/EN 무변경 | 199 / 199 | PASS |
| S7 | split 90m KO/EN 무변경 | 90 / 90 | PASS |

Unit 1 ∩ Unit 2 master 교집합은 **0** (Unit 2 = 1,849 master).

## 8. 실행 순서 원장 — GREEN

- `otc-unproduced-oral-unit1-apply-order.json` → `koApplied: true` · `enApplied: true` · `independentVerified: true`
  독립검증 전항목 PASS + KO/EN apply 완료일 때만 플래그가 올라간다(Unit 2 차단 해제 스위치는 이 한 곳).
- `otc-unproduced-oral-execution-order-v1.json` → **`executionStatus` 블록을 추가**해 `oral-unit-1 = GREEN`, `oral-unit-2 = UNBLOCKED` 로 기록.
  라 세션이 승인한 선언 수치(`totals` / `sequence` / `gates` / `allGatesPass`)는 **한 글자도 바꾸지 않았다** — 집행 상태만 추가 블록으로 append.

## 9. Unit 2 착수 가능 여부 — **가능(조건 해제) · 단 본 WO 에서 실행하지 않음**

`nextUnit.condition`(Unit 1 완료 · postVerify · 독립검증 GREEN)이 충족됐다.

- Unit 2 = 374 fp / 1,849 master / 11,094T (KO 7,396 + EN 3,698)
- Unit 2 EN 저작은 별도 세션에서 진행 중인 산출물(`otc-unit2-en-config-ga-*.json`, `otc-unproduced-oral-unit2-authoring-source.ga.json`)이 있으므로, **write-owner 지정과 저작 소유권 정리를 별도 WO 로 확정**해야 한다. 본 세션은 Unit 2 에 write 0.

## 10. 산출물

| 파일 | 내용 |
|---|---|
| `otc-unproduced-oral-unit1-en-batch.ts` | EN 저작 배치 도구 (dump/status/merge) |
| `unit1-en-parts/part-001~014.json` | EN 저작 부분 파일 (373 그룹) |
| `otc-unproduced-oral-unit1-en.json` | 병합 EN SSOT (373 그룹 · 2회 byte-identical) |
| `otc-unproduced-oral-unit1-dryrun.en.json` | EN dry-run manifest (13/13) |
| `otc-unproduced-oral-unit1-apply-run.en.json` | EN apply 실행 기록 (373 그룹 · 3,700T) |
| `otc-unproduced-oral-unit1-verify.json` | 독립검증 10/10 |
| `otc-unproduced-oral-unit1-postverify-scope.ts` / `.json` | 범위 사후검증 7/7 |
| `otc-unproduced-oral-unit1-apply-order.json` | Unit 1 실행 원장 (GREEN) |

## 11. Git / 환경

- 자기 산출물만 path-specific stage·commit·push · `git add .` 미사용 · reset/clean/stash 미사용
- Unit 1·2 승인 SSOT **수정 0** · 라 census/SSOT/proposal/회수 감사 **수정 0** · 실행 순서 원장은 `executionStatus` **추가만**(기존 선언 무변경)
- 공용 fingerprint / sourceRef / write 계약 **변경 0** — EN 수량 게이트 내부 범위 인식만 승인 범위에서 보정
- ophthalmic RouteProfile **수정 0** · 비경구 작업 0 · 다른 에이전트 산출물 **수정 0**
- 부분 EN apply 0 · Unit 2 LIVE apply 0 · 빅콘에스600정 HOLD 유지(write 0)
- `apps/api-server/.env` **수정·삭제 없음** · 자격증명 값 **출력 0** · 루트 `.env` 미사용 · `_msm.mjs`/`_msmx.mjs` 미접촉
