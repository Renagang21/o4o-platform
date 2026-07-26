# CHECK-O4O-OTC-EXTERNAL-SITE-SPLIT-READY-FINAL-PRODUCTION-V1 — READY_SPLIT 생산 완결 (에이전트 다)

WO: `WO-O4O-OTC-EXTERNAL-SITE-SPLIT-READY-FINAL-PRODUCTION-V1`
기준: 감사 `bab6b45f2` · 외부 적용부위 LIVE `f8549e767`(42 fp/199 m) · V2 LIVE 2,509 m
상태: **PASS — 24 fp / 90 master KO+EN LIVE 완결 · 540T (KO 360 + EN 180) · 예상=실측 · canonicalDup 0 · 독립검증 11/11.**

## 0. 결론

> 라 감사가 제안한 READY_SPLIT 을 **DB 원문에서 전건 재도출**해 최종 승인 SSOT 로 확정하고(게이트 13/13), 전체 90 master 를 **단일 생산 단위**로 LIVE apply 했다.
> 단일 write-owner `agent-da`. **HOLD_MULTI_ROUTE 22 · HOLD_PROFESSIONAL_USE 67 은 write 0**, 기존 LIVE 199·2,509 도 불변.

## 1. 최종 승인 SSOT 경로

`apps/api-server/src/scripts/data/otc-external-site-split-final-approved-ssot-v1.json` — `status: APPROVED_FOR_PRODUCTION`
빌더: `apps/api-server/src/scripts/otc-external-site-split-final-ssot-build.ts` (read-only, DB write 0)

감사 proposal 원본(`otc-external-site-split-required-audit-v1.json` · `...-shard-proposal-v1.json`)은 **수정하지 않았다.**

### SSOT 게이트 13/13 PASS

| 게이트 | 결과 |
|---|:---:|
| S1 총계 24 fp / 90 master | PASS |
| S2 master 누락·중복 0 (탈락 0) | PASS |
| S3 fp 내부 9축 안전지문 일치 | PASS |
| S4 fp 간 master 교집합 0 | PASS |
| S5 외부 적용부위 LIVE 199 교집합 0 | PASS |
| S6 V2 LIVE 2,509 교집합 0 | PASS |
| S7 HOLD_MULTI_ROUTE 포함 0 | PASS |
| S8 HOLD_PROFESSIONAL_USE 포함 0 | PASS |
| S9 공식 효능·용법 근거 결손 0 | PASS |
| S10 route별 수량 일치 | PASS |
| S11 예상 write 540T | PASS |
| S12 기존 authored canonical 보유 0 | PASS |
| S13 효능·용법 route 충돌 0 | PASS |

**재도출한 것**: gencode(census 조인 계약) · 공식 3축 · **용법에서 도출한 부위** · **효능·효과 대조** · 9축 안전지문 · `oldFp`(=fingerprintV2 산식) · `newFp`(9축). 90건 전부 감사 기록과 일치했고 탈락 0.

## 2. 생산 실행기 변경 경로

`apps/api-server/src/scripts/otc-external-site-split-production.ts` (신규)

기존 외부 적용부위 실행기와 write 계약·안전장치는 동일하고, **차이는 그룹 키가 9축 안전지문(newFp)** 이라는 점뿐이다.

- 그룹 키 / sourceRef 앵커 = `fpToUuidV2(newFp)`
- V2 지문 = `v2Fp = fingerprintV2(ax, gencode, route)` — **계약 변경 없이 그대로 재현 검증**
- 즉 `fingerprintV2`·`fpToUuidV2` 산식은 손대지 않고 **재현 대상만 2종으로 확장**했다.
- 공용 러너·기존 어댑터·기존 생산기 **수정 0**.

## 3. 최종 fp/master

**24 fp / 90 master** (감사 제안과 동일, 재도출로 확인).

## 4. route별 수량

| route | master | 선언 |
|---|---:|---:|
| cutaneous | 35 | 35 ✔ |
| nasal | 33 | 33 ✔ |
| oromucosal | 22 | 22 ✔ |
| **계** | **90** | 90 ✔ |

## 5. 효능·용법 대조 결과

WO 핵심 원칙(“route 는 용법만 보지 않고 효능과 반드시 대조”)을 SSOT 빌더와 생산 실행기 **양쪽에** 게이트로 넣었다.

- 용법·용량에서 검출된 부위가 **정확히 1종**이 아니면 탈락
- 효능·효과에서 검출된 부위 중 용법 부위와 **다른 것이 하나라도 있으면 탈락**(복수 경로 병존 차단)
- 결과: **mismatch 0 · 충돌 0 · 탈락 0**. 제품명은 어떤 축 판정에도 사용하지 않았다.

## 6. dry-run 결과 — 게이트 11/11 PASS

| # | 게이트 | 결과 |
|---|---|:---:|
| D1 | 최종 SSOT status·수량 일치 | PASS |
| D2 | fp 재현 100% (v2Fp 90 + 9축 90) | PASS |
| D3 | route·효능·용법 대조 mismatch 0 | PASS |
| D4 | 비경구 route 경구동사 0 | PASS |
| D5 | 공식 수치·기간 누락 0 | PASS |
| D6 | HOLD·제외 혼입 0 | PASS |
| D7 | route별 수량 일치 | PASS |
| D8 | authored canonical 상태 정합 | PASS |
| D9 | canonicalDup 0 | PASS |
| D10 | 예상 write 540T | PASS |
| D11 | 이상 그룹 0 | PASS |

**2회 실행 byte-identical** `6814a2b47591f850` · **DB write 0**.
**차단 시험**: `--apply` 만 주고 env 확인 없이 실행 → `이중 게이트 미충족 … dbWrite 0` 로 종료.

## 7. LIVE INSERT

| 언어 | 계약 | 실측 | 예상 | 일치 |
|---|---|---:|---:|:---:|
| KO | 4T/master (easy demote → authored INSERT → canonical 전환 → audit) | **360** | 360 | ✔ |
| EN | 2T/master (INSERT → canonical 전환) | **180** | 180 | ✔ |
| **총계** | 6T/master | **540** | 540 | ✔ |

단일 트랜잭션 · 커밋 전 사후검증 · 실패 시 전량 rollback. INSERT-only, 기존 canonical 본문 UPDATE 재사용 없음.

## 8. canonical 수

**KO authored canonical 90 · EN canonical 90 · easy_drug deprecated 90 · easy_drug ko canonical 잔존 0 · audit 90 · needs_review 0.**

## 9. canonicalDup — **0** (사전·사후 모두)

## 10. HOLD·제외 write 0

| 대상 | 결과 |
|---|---|
| HOLD_MULTI_ROUTE 22 (cutaneous/oromucosal 16 · cutaneous/rectal 6) | write **0** |
| HOLD_PROFESSIONAL_USE 67 | write **0** |
| HOLD_SOURCE 0 · EXCLUDE 0 | 해당 없음 |

독립검증에서 `holdWritten = 0` 으로 직접 확인(READY_SPLIT 이 아닌 감사 대상 전체 89건 대상 조회).

## 11. 기존 LIVE 변경 0

- 외부 적용부위 LIVE **199 master 불변** — 독립검증 `externalLive199Intact = 199`
- V2 LIVE 2,509 master — SSOT 게이트 S6 에서 fp/master 교집합 0 확인, 본 트랙 write 대상에 포함되지 않음
- `sourceRef 충돌 0` — 본 트랙 앵커로 만든 행이 대상 90 밖으로 새지 않음

## 12. 독립 검증 결과 — 11/11 PASS

```
{"targetMasters":90,"koAuthoredCanonical":90,"enCanonical":90,"easyDeprecated":90,
 "easyStillCanonical":0,"needsReviewLeft":0,"auditKo":90,"canonicalDup":0,
 "sourceRefLeak":0,"enHangul":0,"holdWritten":0,"externalLive199Intact":199}
```

산출물 `otc-external-site-split-verify.json`.

## 13. 콘텐츠 충실성

- KO 는 공식 e약은요 효능·용법·주의 원문 grounding, **신규 의료 사실 0**. 경로 동사만 재표현하고 연령·횟수·용량·기간·부위 수치는 전량 보존.
- EN 24 그룹 저작은 **한글 0 · 경구 동사 차단 · 수량 보존** 게이트를 통과한 것만 기록. `usageLabel` 은 저작 페이로드가 아니라 경로에서 주입.
- 특기: `6a5d3be191d4d343` · `d042b01dea09a60b` 은 원문이 “수술자의 손 소독, 수술부위 피부의 소독**은 제외**”로 수술 용도를 **명시 배제**한 제품이다. 배제 문구를 EN 에도 그대로 옮겨 매장에서 오해가 없도록 했다.

## 14. 산출물

| 파일 | 내용 |
|---|---|
| `otc-external-site-split-final-ssot-build.ts` | 승인 SSOT 빌더 (read-only) |
| `otc-external-site-split-final-approved-ssot-v1.json` | **최종 승인 SSOT** (24 fp/90 m, 9축·v2Fp·근거 수록) |
| `otc-external-site-split-production.ts` | 생산 실행기 (dry-run/apply/verify) |
| `otc-external-site-split-final-en.json` | EN 저작 24 그룹 |
| `otc-external-site-split-dryrun.json` | dry-run manifest |
| `otc-external-site-split-apply-run.{ko,en}.json` | apply 실행 기록 |
| `otc-external-site-split-verify.json` | 독립검증 |
| `otc-external-site-split-apply-order.json` | 실행 원장 |

## 15. 잔여 HOLD 수량

| 구분 | master |
|---|---:|
| HOLD_MULTI_ROUTE (복수 경로 병존) | **22** |
| HOLD_PROFESSIONAL_USE (전문 시술 맥락) | **67** |
| 외부 적용부위 트랙 기존 HOLD_PROFESSIONAL_USE | 79 |
| **본 감사 모집단 잔여 계** | **89** (22 + 67) |

HOLD_MULTI_ROUTE 22 는 한 품목에 두 경로가 병존해 단일 매장 설명서로 만들 수 없는 건이고, HOLD_PROFESSIONAL_USE 67 은 전문 시술 맥락이다. 둘 다 **생산 이전에 정책 판단이 필요**하다.

## 16. Git / 환경

- 자기 산출물만 path-specific stage·commit·push · `git add .` 미사용 · reset/clean/stash 미사용
- 감사 JSON·proposal·기존 SSOT·기존 생산 원장 **수정 0** · 다른 세션 파일 미접촉
- `apps/api-server/.env` **수정·삭제 없음** · 자격증명 값 **출력 0** · 루트 `.env` 미사용
- 임시 조회 스크립트는 실행 후 삭제, 커밋 대상 아님
