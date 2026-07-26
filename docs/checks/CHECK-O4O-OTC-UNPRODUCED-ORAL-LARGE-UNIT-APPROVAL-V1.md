# CHECK-O4O-OTC-UNPRODUCED-ORAL-LARGE-UNIT-APPROVAL-V1 — 에이전트 라

WO: `WO-O4O-OTC-UNPRODUCED-ORAL-LARGE-UNIT-APPROVAL-V1`
기준: 전체 미생산 census `6ca15aa81` (862 fp / 4,356 master)
상태: **APPROVED_FOR_PRODUCTION — 전 게이트 PASS. DB write 0 · 설명서 생성 0 · dry-run 0 · LIVE apply 0.**

## 0. 결론

> 경구 READY_SPLIT **747 fingerprint / 3,699 master** 를 DB 공식 원문에서 전건 재검증하고,
> fingerprint 그룹을 **한 건도 분할하지 않은 채** 2개 생산 단위로 확정했다.
> Unit 1 **373 fp / 1,850 master / 11,100T** · Unit 2 **374 fp / 1,849 master / 11,094T** · 합계 **22,194T**.
> 기존 LIVE 와 masterId·fp·sourceRef·canonical **4방향 모두 교집합 0**.

## 1. 재검증 방식

넓은 재탐색이 아니라 **proposal ↔ DB 원문 전건 대조**다.

census proposal 의 경구 그룹을 읽고, 각 master 의 안전지문 10축을 **DB e약은요 canonical 원문에서 다시 계산**해 proposal 의 fingerprint 와 일치하는지 확인했다.

| 검증 | 결과 |
|---|---:|
| 대조 대상 | 3,699 master |
| 안전지문 재계산 불일치 | **0** |
| 공식 원문 결손 | **0** |
| 비경구 혼입 | **0** |
| 경구 경로 ↔ 용법 원문 모순 | **0** |

## 2. 최종 승인 수량

| 항목 | fp | master | KO | EN | 총 write |
|---|---:|---:|---:|---:|---:|
| **Unit 1** | **373** | **1,850** | 7,400 | 3,700 | **11,100T** |
| **Unit 2** | **374** | **1,849** | 7,396 | 3,698 | **11,094T** |
| **합계** | **747** | **3,699** | 14,796 | 7,398 | **22,194T** |

WO 지정 범위(각 1,800~1,900)와 총계 3,699·22,194T 에 정확히 부합한다. 편차는 **1 master** 로, fingerprint 그룹을 분할하지 않는 제약 하에서 달성 가능한 최소 편차다.

## 3. 제형별 분포

| 제형 | 전체 | Unit 1 | Unit 2 |
|---|---:|---:|---:|
| 정 | 1,591 | 881 | 710 |
| 캡슐 | 762 | 407 | 355 |
| 연질캡슐 | 471 | 248 | 223 |
| 장용정 | 321 | 104 | 217 |
| 내복액 | 250 | 85 | 165 |
| 시럽 | 132 | 60 | 72 |
| 현탁액 | 100 | 39 | 61 |
| 산 | 51 | 24 | 27 |
| 과립 | 11 | 2 | 9 |
| 장용캡슐 | 10 | 0 | 10 |

## 4. 주요 성분군 분포 (일반명코드 `[1-6]` = 성분+함량)

### 전체 상위

| 코드 | master | 코드 | master |
|---|---:|---|---:|
| `153101` (에르도스테인) | **369** | `142301` | 122 |
| `101804` | 246 | `A49300` | 99 |
| `130501` | 177 | `106301` | 97 |
| `111001` (아스피린) | 171 | `157301` | 95 |

### Unit 1 상위

`153101` 305 · `130501` 94 · `106301` 82 · `157301` 69 · `142301` 58

### Unit 2 상위

`101804` 207 · `111001` 127 · `A49300` 99 · `130501` 83 · `142301` 64

## 5. 안전지문 검증

10축 전부를 명시 검증했다.

| 축 | 근거 |
|---|---|
| 성분 · 함량 | 일반명코드 `[1-4]` · `[5-6]` |
| 제형 · 단일제/복합제 | 일반명코드 `[7-9]` · `[1-6]` |
| 경구 투여경로 | 코드 접미 allowlist(ATB/ATE/ATR/ACH/ACS/ACE/ASY/ASS/ALQ/AGN/APD) + 용법 원문 모순 대조 |
| 효능·효과 / 용법·용량 / 금기·주의 | e약은요 canonical 원문 signature |
| 용법 수치 · 연령 · 사용 기간 | 공식 원문 token signature |

| 검증 | 결과 |
|---|---:|
| fp 내부 안전지문 mismatch | **0** |
| 제품명 기반 성분·경로·제형 추정 | **0** (제품명 미사용) |

## 6. 기존 LIVE 교집합 — 4방향 모두 0

| 방향 | 대조 규모 | 교집합 |
|---|---:|---:|
| masterId | 2,877 | **0** |
| fingerprint | 785 | **0** |
| sourceRef | 714 | **0** |
| authored STORE canonical | — | **0** |

대조 트랙: OTC V2 LIVE 2,509 · 외용 적용부위 LIVE 199 · 외용 READY_SPLIT LIVE 90 · authored canonical 보유 전체.

## 7. 게이트 — 전부 PASS

| 게이트 | 결과 |
|---|---|
| 전체 합계 3,699 master | **PASS** |
| 전체 747 fingerprint | **PASS** |
| master 누락 · 중복 | **0 / 0** |
| **fp 그룹 분할** | **0** |
| unit 간 fp 교집합 | **0** |
| unit 간 master 교집합 | **0** |
| fp 내부 안전지문 mismatch | **0** |
| 공식 원문 결손 | **0** |
| 비경구 혼입 | **0** |
| 경구 경로↔용법 모순 | **0** |
| HOLD·EXCLUDE 혼입 | **0** (READY_SPLIT 경구만 입력) |
| 기존 LIVE 4방향 교집합 | **0** |
| authored canonical 기존 보유 | **0** |
| 예상 write 총계 22,194T | **PASS** |
| `dbWrite` | **0** |
| 결정론 | 산출 3파일 2회 실행 **byte-identical** |

## 8. 산출물

| 파일 | 성격 |
|---|---|
| `apps/api-server/src/scripts/otc-unproduced-oral-unit-approval.ts` | 승인 검증 script (신규) |
| `apps/api-server/src/scripts/data/otc-unproduced-oral-unit1-approved-ssot-v1.json` | **Unit 1 승인 SSOT** (신규) |
| `apps/api-server/src/scripts/data/otc-unproduced-oral-unit2-approved-ssot-v1.json` | **Unit 2 승인 SSOT** (신규) |
| `apps/api-server/src/scripts/data/otc-unproduced-oral-execution-order-v1.json` | 실행 순서 원장 (신규) |
| 본 문서 | CHECK |

각 승인 SSOT 는 `status: APPROVED_FOR_PRODUCTION` · `unitId` · `executionOrder` · fp 목록 · masterId 목록 · 일반명코드 · 성분/함량/제형 · `route=oral` · **master 전건의 공식 효능·용법·주의 근거** · 안전지문 10축 · KO/EN/총 write · LIVE 제외 검증 결과 · 다음 unit 실행 조건을 포함한다.

**기존 census·proposal·SSOT·러너·생산 원장 수정 0.** 신규 파일만 생성했다.

## 9. 실행 순서

| 순서 | unit | fp | master | write | 선행 조건 |
|---:|---|---:|---:|---:|---|
| 1 | `oral-unit-1` | 373 | 1,850 | 11,100T | 승인 즉시 착수 가능 |
| 2 | `oral-unit-2` | 374 | 1,849 | 11,094T | **Unit 1 완료 · postVerify · 독립검증 GREEN** |

- unit 은 에이전트 분할이 아니라 **transaction·검증 단위**다.
- Unit 1·2 의 DB write-owner 는 **동일 단일 에이전트** 사용을 권고한다.
- 이번 WO 에서는 실제 생산하지 않았다.

## 10. 작업 중 정정 1건 — 성분군 순위 산출 오류

승인 스크립트 초안이 성분군 순위를 객체 키 순서에 의존해 만들었다. 일반명코드 앞 6자리(`101804` 등)는 **정수형 문자열**이라 객체 키로 쓰면 V8 이 숫자 오름차순으로 재정렬하여 `Object.entries()` 의 정렬이 무효화된다. 결과가 "상위 N" 이 아니라 "코드값이 작은 N" 이 되었다.

배열 기반 `rankOf()` 로 교체하고 재실행했다. 실제 상위는 `153101` 369 · `101804` 246 · `130501` 177 · `111001` 171 이다.

> **선행 census(`6ca15aa81`)의 `ingredientGroupTop` 필드와 그 CHECK 의 "성분군 상위" 표기에도 동일한 정렬 아티팩트가 있다.** 해당 문서에 `101804 246 · 101305 62 · 101404 33 …` 로 적은 것은 실제 상위가 아니라 코드값 오름차순이었다. 본 WO 는 기존 census 수정을 금지하므로 파일은 그대로 두고 여기에 정정을 기록한다.
> **승인 대상 집합·수량·게이트에는 영향이 없다.** 순위 표기 전용 필드이며, 그룹 구성·배분은 fingerprint 기준으로 산출된다.

## 11. 후속 — Unit 1 생산 준비 가능

전 게이트 PASS 이고 기존 LIVE 와 교집합이 0 이므로 **Unit 1 생산 착수가 가능**하다.

1. **write-owner 단일 에이전트 지정** (Unit 1 · 2 동일 에이전트 권고)
2. Unit 1 dry-run → LIVE apply (11,100T) → postVerify → 독립검증
3. 독립검증 GREEN 후 Unit 2 착수
4. 경구 트랙은 기존 `otc-oral-combo-store-leaflet-runner` 계열 재사용이 가능하다

## 12. Git / 무결성

- read-only 승인 검증 · **DB write 0** · 설명서 생성 0 · dry-run 0 · LIVE apply 0
- 기존 census·proposal·SSOT·러너·생산 원장 수정 0 · 타 세션 파일 미접촉
- 자격증명: `apps/api-server/.env` 를 `process.env` 로만 전달, 값 열람·출력·수정·삭제 0
- `git add .` 미사용 · reset/clean/stash 미사용 · 본 산출물만 path-specific commit
