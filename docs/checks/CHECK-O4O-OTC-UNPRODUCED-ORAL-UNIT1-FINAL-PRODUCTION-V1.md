# CHECK-O4O-OTC-UNPRODUCED-ORAL-UNIT1-FINAL-PRODUCTION-V1 — 경구 미생산 Unit 1 (에이전트 다)

WO: `WO-O4O-OTC-UNPRODUCED-ORAL-UNIT1-FINAL-PRODUCTION-V1`
기준: 승인 SSOT `8328047ac` · Unit 1 = 373 fp / 1,850 master · 예상 11,100T
상태: **SUPERSEDED BY 후속 CHECK — 본 문서 시점은 KO 7,400T 완료 / EN 미실행이었다. EN 3,700T 는 이후 완료됐다.**
후속: [`CHECK-O4O-OTC-UNPRODUCED-ORAL-UNIT1-EN-CONTINUE-TO-FINAL-GREEN-V1.md`](CHECK-O4O-OTC-UNPRODUCED-ORAL-UNIT1-EN-CONTINUE-TO-FINAL-GREEN-V1.md) — EN 373/373 저작 → EN 3,700T LIVE → 독립검증 10/10 · 범위 사후검증 7/7 → Unit 1 총 11,100T **GREEN** · Unit 2 착수 조건 해제. 아래 §15 의 "불가" 판정은 그 시점 기준이며 현재는 해소됐다.

## 0. 결론

> 적용 전 게이트 **13/13 PASS** · 2회 byte-identical · **rollback 시험 PASS** 후 **KO 7,400T 를 LIVE apply** 했다. 예상=실측 정확 일치, 독립검증에서 KO 관련 전 항목 GREEN.
> **EN 3,700T 는 실행하지 않았다** — 373 개 fp 그룹 각각에 영문 저작 페이로드가 필요한데 아직 저작되지 않았다. 없는 상태로 돌리면 러너가 입력 단계에서 중단한다(설계상 차단).
> 따라서 **실행 순서 원장은 GREEN 으로 갱신하지 않았고, Unit 2 는 착수 불가 상태를 유지**한다.

## 1. 생산 실행기 경로

`apps/api-server/src/scripts/otc-unproduced-oral-unit1-production.ts`

기존 경구/외용 러너 계열의 write 계약·안전장치를 그대로 재사용하고, **입력만 Unit 1 승인 SSOT 로 한정**했다.

- 그룹 키 = 승인 SSOT 의 **10축 안전지문 fp**
- `sourceRef = fpToUuidV2(fp)` — 기존 앵커 함수 그대로. `fingerprintV2`·`fpToUuidV2` **산식 변경 0**
- KO 4T/master · EN 2T/master · INSERT-only · 기존 canonical 본문 UPDATE 재사용 없음
- **Unit 2 SSOT 파일 경로를 참조하지 않는다** (읽기 자체를 하지 않음)
- 제품명은 성분·제형·경로 판정에 사용하지 않는다 — 축은 전부 승인 SSOT 의 공식 원문·일반명코드에서 나온다

### 10축 fp 재현 — 교정 1건

승인 SSOT 의 fp 산식은
`H([indication, dosage, caution, numeric, age, duration, contraindication, codeIngredientStrength, codeForm, route])` 다.

첫 dry-run 에서 **1,555/1,850 이 fp 재현 실패**했다. 축 단위로 좁힌 결과 `contraindication` 하나만 어긋났다 — 금기 선행 문맥을 자르는 정규식을 외용 트랙에서 그대로 가져오는 바람에 **경구 금기 표현 `복용하지 마십시오`가 빠져** 절단 지점이 달라진 것이다. `복용하지`를 선두 대안으로 추가해 교정했고, 재실행에서 **1,850/1,850 재현**됐다.

> 대상이나 승인 SSOT 의 문제가 아니라 **내 재현기의 문제**였다. DB 상태는 처음부터 정상이었다(1,850 전건 easy_drug ko canonical 1개, authored 0, 타 세션 write 없음 — 최종 갱신 2026-07-16).

## 2. 단일 write-owner

**agent-da**. 사전 게이트에서 `authored STORE canonical ko/en 0` 및 `sourceRef 사전 충돌 0` 을 확인했고, 사후 `sourceRef leak 0` 으로 재확인했다. 대상 1,850 의 최종 갱신 시각이 apply 직전까지 2026-07-16 로 고정돼 있어 **다른 세션 write 없음**을 확인했다.

## 3. dry-run 결과 — 게이트 13/13 PASS

| # | 게이트 | 결과 |
|---|---|:---:|
| G1 | SSOT status=APPROVED_FOR_PRODUCTION | PASS |
| G2 | 총계 373 fp / 1,850 master | PASS |
| G3 | fp 재현 100% (1,850/1,850) | PASS |
| G4 | master 누락·중복 0 | PASS |
| G5 | 10축 안전지문 mismatch 0 | PASS |
| G6 | 공식 효능·용법·주의 결손 0 | PASS |
| G7 | route=oral 전건 일치 | PASS |
| G8 | 기존 LIVE sourceRef 교집합 0 | PASS |
| G9 | authored canonical 상태 정합 | PASS |
| G10 | Unit 2 대상 혼입 0 | PASS |
| G11 | canonicalDup 0 | PASS |
| G12 | 예상 write (KO 7,400 + EN 3,700 = 11,100) | PASS |
| G13 | 이상 그룹 0 | PASS |

**2회 실행 byte-identical** `c99d8104ab05fb42` · **DB write 0**.

## 4. rollback 시험 — PASS

상위 2 그룹에 실제 INSERT 4건을 넣은 뒤 의도적 실패를 주입했다. **before 272 → after 272**, 전량 rollback 확인. DB 최종 상태 무변경.

## 5. LIVE INSERT

| 언어 | 계약 | 실측 | 예상 | 일치 |
|---|---|---:|---:|:---:|
| KO | 4T/master (easy demote → authored INSERT → canonical 전환 → audit) | **7,400** | 7,400 | ✔ |
| EN | 2T/master | **0 (미실행)** | 3,700 | — |
| 총계 | | **7,400 / 11,100** | 11,100 | 진행 중 |

373 그룹 단일 트랜잭션 · 커밋 전 사후검증 통과 후 커밋.

## 6~8. canonical · dup · sourceRef

| 항목 | 값 |
|---|---:|
| KO authored canonical | **1,850** |
| EN canonical | **0** (미실행) |
| easy_drug deprecated | **1,850** |
| easy_drug canonical 잔존 | **0** |
| audit(canonical_replaced ko) | **1,850** |
| needs_review 잔존 | **0** |
| canonicalDup | **0** |
| sourceRef leak(대상 밖 유출) | **0** |
| EN 한글 | **0** |

## 9. Unit 2 write 0

Unit 2 SSOT 는 **읽지 않았다**. 본 실행기는 Unit 1 SSOT 만 로드하며 대상은 1,850 로 고정된다. G10 에서 총계 일치로 혼입 0 을 확인했다.

## 10. 기존 LIVE 변경 0

- 사전: `authored STORE canonical ko/en 보유 0` · `sourceRef 사전 충돌 0`
- 사후: `sourceRef leak 0` — 본 트랙 앵커로 만든 행이 대상 1,850 밖으로 새지 않음
- 승인 SSOT 의 `liveExclusionVerification` (masterId·fp·sourceRef·authored 4방향, 기존 LIVE 2,877 master / 785 fp / 714 sourceRef 대비 전부 0) 과 정합

## 11. 독립 검증 결과

생산 실행기와 분리된 쿼리 경로로 재확인 — **KO 관련 9항목 전부 PASS, EN canonical 만 미달**:

```
{"targetMasters":1850,"koAuthoredCanonical":1850,"enCanonical":0,"easyDeprecated":1850,
 "easyStillCanonical":0,"needsReviewLeft":0,"auditKo":1850,"canonicalDup":0,
 "sourceRefLeak":0,"enHangul":0}
```

## 12. 실행 순서 원장 상태

`otc-unproduced-oral-execution-order-v1.json` — **갱신하지 않았다.** Unit 1 이 EN 미완이라 GREEN 조건(`완료 · postVerify · 독립검증 GREEN`)을 충족하지 못한다.
실행 기록은 별도 원장 `otc-unproduced-oral-unit1-apply-order.json` 에 `koApplied: true · enApplied: false · independentVerified: false` 로 남겼다.

## 13. 남은 작업 — EN 저작 373 그룹

EN 은 그룹별 영문 저작 페이로드(`title` · `efficacy` · `usage` · `caution` · `summaryTable`)가 있어야 한다. 러너는 페이로드가 없는 그룹이 하나라도 있으면 **입력 단계에서 중단**하고, 렌더 시 한글 잔존·수량 누락·필수필드 게이트를 통과한 것만 기록한다.

| 항목 | 값 |
|---|---:|
| 저작 필요 그룹 | **373** |
| 커버 master | 1,850 |
| 남은 write | **3,700T** |
| 저작 파일 경로(예정) | `src/scripts/data/otc-unproduced-oral-unit1-en.json` |

그룹 크기 분포: 10 master 이상 25 그룹(최대 193) · 5~9 63 그룹 · 2~4 283 그룹 · 1 2 그룹.
상위 20 그룹이 666 master, 상위 100 그룹이 1,168 master 를 덮는다 — 저작을 배치로 나누더라도 **373 그룹 전부가 준비돼야 EN apply 가 가능**하다(부분 적용은 예상 write 게이트에서 차단된다).

## 14. 산출물

| 파일 | 내용 |
|---|---|
| `otc-unproduced-oral-unit1-production.ts` | 생산 실행기 (dry-run / rollback-test / apply / verify) |
| `otc-unproduced-oral-unit1-dryrun.json` | dry-run manifest (게이트 13/13) |
| `otc-unproduced-oral-unit1-apply-run.ko.json` | KO apply 실행 기록 (373 그룹 · 7,400T) |
| `otc-unproduced-oral-unit1-verify.json` | 독립검증 |
| `otc-unproduced-oral-unit1-apply-order.json` | Unit 1 실행 원장 |

## 15. Unit 2 착수 가능 여부 — **불가**

Unit 1 이 EN 미완이므로 `nextUnit.condition`(Unit 1 완료 · postVerify · 독립검증 GREEN)을 충족하지 못한다. EN 3,700T 완료 + 독립검증 GREEN 후에 해제된다.

## 16. Git / 환경

- 자기 산출물만 path-specific stage·commit·push · `git add .` 미사용 · reset/clean/stash 미사용
- Unit 1·2 승인 SSOT **수정 0** · 실행 순서 원장 **수정 0** · 기존 census·러너·생산 원장 **수정 0** · 다른 세션 파일 미접촉
- `apps/api-server/.env` **수정·삭제 없음** · 자격증명 값 **출력 0** · 루트 `.env` 미사용
- 임시 진단 스크립트는 실행 후 삭제, 커밋 대상 아님
