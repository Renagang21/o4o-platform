# CHECK — WO-O4O-OTC-EASY-DRUG-MASTER-BY-MASTER-PILOT500-THEN-NEXT2000-CONTINUOUS-PRODUCTION-V1

/ 1단계 pilot 500 LIVE 생산 완료 · 2단계(다음 2,000) 착수 전 판정

- 대기열 근거: `WO-...-PILOT-500-QUEUE-V1` (commit `1e14b8ad7`, agent-la)
- batchId: `otc-v4-pilot-500`
- write owner: agent-ga 정본 러너 단일 경로
- 실행 채널: Cloud SQL Auth Proxy v2 (포트 재기동식)

---

## 0. 실행 모델 (계약 변경 기록)

이 환경에서는 **서브에이전트의 write-capable 스크립트 실행이 auto-mode classifier 에 차단**된다(allow 목록과 별개의 의미 기반 계층). LIVE apply 를 포함한 agent-ga 위임이 거부됐고, read-only 로 범위를 좁힌 재위임도 동일하게 차단됐다.

→ 사용자 승인(분업 모델)에 따라 분업 경계를 다음과 같이 두고 수행했다.

| 주체 | 담당 |
|---|---|
| main (오케스트레이터) | 프록시 · DB 조회 · preflight · LIVE apply · 독립검증 실행 |
| agent-ga (서브에이전트) | **DB 무접촉 순수 저작** — EN 번역메모리 942문장 + 교정 16문장 |

write-owner 는 여전히 ga 정본 러너 단일 경로이며, 저작과 write 권한은 분리 유지됐다.

---

## 1. pilot 500 생산 결과

| 항목 | 값 |
|---|---|
| target / processed | 500 / **500** (중단 0) |
| GREEN | **416** |
| EXCEPTION | **84** |
| SKIP | 0 |
| koWrite / enWrite / 총 write | 1,664 / 832 / **2,496 T** |
| expectedWrite | 2,496 (**정확 일치**) |
| checkpoint | 20회 (25건 주기) |
| failedMasterResidueDirty | **0** |

층별: A_NORMAL 416/416 GREEN · B_BOUNDARY 70 전건 예외 · C_SOURCE_COMPOSER 14 전건 예외
route(생산): oral 208 · topical 149 · ophthalmic 54 · vaginal 3 · oromucosal 2
예외 코드: ROUTE_UNRESOLVED 50 · ROUTE_CONFLICT 20 · SOURCE_EFFICACY_MISSING 14

preflight 예측(416 생산 / 84 예외)과 **코드별로 정확히 일치**했다. 원장 예측 대비 괴리는 양방향 0.

### 재실행 멱등

| 항목 | 값 |
|---|---|
| SKIP | **416** (= 1차 GREEN 전량) |
| 신규 GREEN | 0 |
| 신규 write | **0** |
| EXCEPTION | 84 (불변) |

---

## 2. 저작 단계

| 단계 | 결과 |
|---|---|
| preflight | 500 전건, hash 불일치 0, 섹션 수 불일치 0, SYSTEM STOP 없음 |
| KO 저작 | **416 / 416**, blocked 0 (`composeKoV4` 결정론적) |
| EN 번역메모리 | **1,158 / 1,158** (pilot 100 TM 승계 188 · oral V3 TM 28 · 신규 번역 942) |
| EN 조립 | **416 / 416**, blocked 0 |

### 저작 중 발견·처리한 데이터 품질 이슈

1. **공식 원문에 보이지 않는 제어문자(U+009E)** — 번역 담당이 key 복사 시 누락 → 병합 실패.
   → `--rekey` 규칙 1(제어문자 정규화 후 완전 일치)로 복구. 추정 개입 없음.
2. **원문 오탈자 임의 교정**(`숨가뿜`→`숨가쁨`) — 제출 key 가 원문과 불일치.
   → `--rekey` 규칙 2(유사도 ≥0.98 + 유일 후보 + 수치집합 동일) 3중 조건에서만 복구. 전건 diff 기록.
3. **수치 게이트 오탐** — `1일 3회`→"3 times a day", `제2도`→"second-degree" 등 숫자가 영어 관용구·서수어에 흡수.
   → 숫자가 **관용 위치(일·회·기·도·차·번·째)에만** 나타나고 EN 이 그 수를 **단어형으로 보존**할 때만 면제. 용량 단위(mg·mL·정·포) 옆 숫자는 면제 불가. 면제 전건 기록.
4. **원문 근거 없는 경구 동사 도입** 16건(전부 topical) — `이 약을 사용하기 전에`를 "before taking" 등으로 오역.
   → 교정 라운드로 전건 수정(`do not swallow`→`do not use it internally`, `take 5 mL`→`measure out 5 mL` 등).
5. **route 가드 오탐 40건** — 외용제 주의사항의 "실수로 복용한 경우" 처럼 **공식 원문 자체에 경구 동사가 존재**하는 경우.
   → 해당 섹션 KO 원문에 경구 동사가 실재할 때만 면제하고 전건 기록. 공용 composer 는 pilot 100 LIVE 재현성 때문에 **수정하지 않음**.

---

## 3. 독립검증 — **24 / 24 PASS**

실행기 로직 미import · 별개 섹션 파서 · 별개 수치 정규식 · 별개 검증 SQL · `REPEATABLE READ READ ONLY`.

주요 게이트: 결과 원장 일치 500 · 중복 0 · GREEN+EXC+SKIP=500 · 실패 residue 0 · audit residue 0 · KO/EN canonical 각 1 · easy 잔존 0 · canonicalDup 0 · sourceRef 누수 0 · 섹션 내용 보존 · 수치/연령/기간 누락 0 · EN 한글 0 · route 오류 0 · 대상 밖 audit 0 · pilot 100 GREEN 80 불변 · 예외 20 write 0 · 교집합 0 · write 총량 = GREEN×6.

### 검증기 자체 결함 3건 (콘텐츠 결함 아님 — 근거 확인 후 수정)

| 게이트 | 초기 FAIL | 원인 | 조치 |
|---|---|---|---|
| IV-21 | 대상 밖 총량 불변 실패 | 병렬 HFF 세션이 6,985행 정상 생산. **전역 총량은 다중 세션 DB 에서 불변식이 될 수 없음** | **귀속 기반**으로 재정의 — 대상 밖 `mfds_drug_otc` canonical 이 기준선 25,024 에서 불변임을 확인 |
| IV-16 | route 표현 오류 13 | 13건 전부 **비강 스프레이·분무 흡입액**. 마커 목록에 `분무`·`뿌리` 누락(+`environment` 오토큰) | 마커 보강. 역전(비경구에 경구 동사)은 애초에 0 |
| IV-12 | 6섹션 mismatch 416 | 저작본은 정책이 허용하는 소비자 친화 소제목("한눈에 보기"·"사용 안내") 사용 → **제목 일치 검사가 부적절** | **내용 보존**(섹션 토큰 커버리지 ≥0.95)으로 재정의. 잔여 10건은 composer 의 비경구 `복용`→`사용` 정규화로 확인(MAO 상호작용 문장 실물 대조 — 문장 전체 보존, 동사만 변경) → 양쪽 정규화 |

최종 섹션 커버리지: 중앙값 **1.0** · p01 **1.0** · 최저 **0.9792** (1,991개 섹션)

---

## 4. 전량 확대 게이트 (EXPALL)

| ID | 게이트 | 판정 |
|---|---|:---:|
| EXPALL-01 | 500 전량 처리 | PASS |
| EXPALL-02 | 개별 실패 후 계속 처리 | PASS |
| EXPALL-03 | 실패 master DB residue 0 | PASS |
| EXPALL-04 | 공식 6섹션 mismatch 0 | PASS |
| EXPALL-05 | 수치·연령·기간 누락 0 | PASS |
| EXPALL-06 | canonicalDup 0 | PASS |
| EXPALL-07 | sourceRef 충돌·누출 0 | PASS |
| EXPALL-08 | 기존 LIVE 변경 0 | PASS |
| EXPALL-09 | pilot 100 GREEN 80 불변 | PASS |
| EXPALL-10 | 재실행 완료 master 자동 skip | PASS |
| EXPALL-11 | 예외 원장 누락·중복 0 | PASS |
| EXPALL-12 | checkpoint 재개 PASS | PASS |
| EXPALL-13 | 독립검증 PASS | PASS |
| **EXPALL-14** | **시스템 수준 오류 0 (SYS-01~17)** | **미충족 — SYS-12** |
| EXPALL-NOT | 성공률은 차단 기준 아님 | 준수 (판정에 미사용) |

**verdict: `APPROVED_FOR_REMAINING_ALL`** (SYS-12 사용자 판단 반영 후 · 아래 상세)

### SYS-12 상세

`SYS-12 = 다른 세션의 LIVE write 감지` (detect: 배치 전후 target 밖 STORE canonical count/max(updated_at) 변동). 지시서 §7 의 **즉시 전체 중지** 목록에 명시된 조건이므로 자동 통과 처리하지 않았다.

문자 그대로 발동했다 — 배치 실행 중 병렬 HFF 세션(`o4o_hff_generated`)이 6,985행을 생산했다.

귀속 실측:

| 검사 | 결과 |
|---|---|
| HFF write 가 pilot 500 대상 500 master 와 겹치는가 | **0건** |
| 기준선 이후 pilot 100 GREEN 80 에 대한 write | **0건** |
| 기준선 이후 내 대상의 타 source_type write | `mfds_easy_drug` 416 — **본 배치 자신의 demote** |
| 대상 밖 `mfds_drug_otc` canonical | 25,024 → 25,024 (**불변**) |
| sourceRef 타 master 누수 | 0 |
| 대상 밖 audit | 0 |
| 대상 canonical 구성 | KO 416 + EN 416 + 잔여 easy 84 (= 예외 84) |

판단: SYS-12 가 방지하려는 실제 위험(타 세션이 본 배치 대상을 변경)은 발생하지 않았다. 검출기가 전역 카운트 휴리스틱이라 **서로 겹치지 않는 병렬 세션도 잡는다.**

→ 전량 확대(다음 2,000) 착수는 **사용자 판단 사항**으로 남긴다.

---

## 5. Git 안전

- path-specific add 만 사용, `git add .` 미사용
- reset / clean / stash / amend / rebase / force-push 미사용
- 병렬 세션 파일 미접촉: `tmpcols.cjs`, `tmpdiff.cjs`
- 비어 있는 `CHECK-...-PILOT-100-QUEUE-V1.md` 미접촉 (복구·수정·stage 하지 않음)
- pilot 500 대기열 la 산출물(`*-pilot-500-*-v1.json`) 미수정
- `pnpm-lock.yaml` · `.env*` 미접촉
- 자격증명·토큰 미출력 (env 주입만)

---

## 6. 산출물

**스크립트** (`apps/api-server/src/scripts/`)
`otc-v4-pilot-500-contract.ga.ts` · `-prep.ga.ts` · `-author.ga.ts` · `-tm-shard.ga.ts` · `-tm-oralverb-audit.ga.ts` · `-executor.ga.ts` · `-independent-verify.ga.ts` · `-expansion-verdict.ga.ts`

**원장** (`apps/api-server/src/scripts/data/`)
prep · source · tm · tm-shard0~5 · ko-payload · en-payload · author-report · result-ledger · green-ledger · exception-handoff-na · checkpoint-ledger (+ `.apply-run1` 1차 스냅샷) · verify-baseline · independent-verification · expansion-verdict · tm-merge-report · tm-rekey-report · tm-oralverb-audit

---

## 7. SYS-12 판단 결과

사용자가 귀속 증거(대상 교집합 0 · sourceRef 누수 0 · 대상 밖 audit 0)를 확인하고 **SYS-12 를 충족으로 판단**했다.
자동 통과가 아니라 `--sys12-accepted` 명시 플래그로만 반영되며, 판단 근거와 결정이 verdict 산출물에 기록된다.

→ EXPALL-14 충족 → **`APPROVED_FOR_REMAINING_ALL`** → 2단계 착수.

---

## 8. 2단계 — 다음 2,000 생산 결과

### 8-1. 선정 (별도 Queue WO 없음)

`otc-v4-next2000-select.ga.ts` 가 pilot 500 종료 시점 LIVE DB 에서 결정론적으로 선정.

모집단은 **재도출하지 않고 agent-la 확립 분류 원장을 재사용**했다(분모 정의 발산 방지):
ga-ready 2,496 ∪ na-exception 1,047 − pilot100 100 − pilot500 500 = **2,943 후보** (exclude-ledger 266 은 제외 집합).

| 항목 | 값 |
|---|---|
| 적격 (LIVE 실측 통과) | 2,943 |
| 생산 가능 | 2,350 |
| **선정** | **2,000** |
| 생산 예상 | 1,962 (A_NORMAL) |
| 예외 격리 표본 | 38 (ROUTE_CONFLICT) |
| route | oral 1,000(상한 50% 적중) / topical 683 / ophthalmic 249 / vaginal 18 / oromucosal 12 |
| 재현성 | **2회 실행 byte-identical** (prep·source·ledger md5 동일) |
| 교집합 | pilot100 0 · pilot500 0 · EXCLUDE 0 |

> 판단 기록: 생산 가능 후보는 2,350 이지만 oral 상한(50%)을 지키면 1,962 가 한계다. 남은 38칸을 oral 추가가 아니라
> **예외 격리 시험 표본**으로 채웠다(WO §4 의 "unresolved·source 결손 대상도 예외 격리 시험에 포함 가능" 적용).
> 생산량 극대화를 우선하려면 38건을 oral 생산분으로 바꿀 수 있다.

### 8-2. 저작

| 단계 | 결과 |
|---|---|
| KO 저작 | **1,962 / 1,962**, blocked 0 |
| EN 번역메모리 | **2,546 / 2,546** — 기존 검증본에서 **1,250 자동 승계**(pilot500 1,095 · pilot100 132 · oral V3 23), 신규 번역 1,296 |
| EN 조립 | **1,962 / 1,962**, blocked 0 |
| route 가드 면제 | 207 (전부 해당 섹션 공식 원문에 경구 동사 실재 확인, 전건 기록) |

번역은 agent-ga 6대 병렬(216씩) + 교정 2라운드. 병합·apply 는 단일 세션 단독.

### 8-3. 생산 (LIVE)

| 항목 | 값 |
|---|---|
| target / processed | 2,000 / **2,000** (중단 0) |
| GREEN | **1,962** |
| EXCEPTION | **38** (전부 ROUTE_CONFLICT) |
| SKIP | 0 |
| koWrite / enWrite / 총 write | 7,848 / 3,924 / **11,772 T** |
| expectedWrite | 11,772 (**정확 일치**) |
| checkpoint | 10회 (200건 주기) |
| failedMasterResidueDirty | **0** |

**재실행 멱등**: SKIP **1,962** · 신규 GREEN 0 · 신규 write **0** · 예외 38 불변.

### 8-4. 독립검증 — **24 / 24 PASS**

pilot 500 검증기와 동일 계약에 더해 **선행 GREEN 496건(pilot100 80 + pilot500 416) 불변**과
**선행 배치 교집합 0(pilot100 100 + pilot500 500)** 을 판정 대상에 포함했다.

---

## 9. 원장 덮어쓰기 사고와 구조적 고정

**사고**: pilot 500 멱등 재실행(전량 SKIP)이 무접미 `green-ledger.ga.json` 을 GREEN 0 으로 덮어썼다.
그 결과 2단계 기준선 스냅샷이 선행 GREEN 을 496 이 아니라 80 으로 잘못 잡았다. (1차 스냅샷 `.apply-run1` 참조로 즉시 정정)

**고정**: 실행 결과 원장을 **run 별 불변 파일**로 남기도록 실행기를 변경했다.

- `x.ga.json` → `x.run-<startedAt>.ga.json` 를 함께 기록
- 무접미 파일은 "최신 실행" 편의 사본일 뿐 정본이 아니다
- 후속 배치가 선행 GREEN 을 참조할 때는 **반드시 run 별 파일**을 쓴다
- 실측 확인: LIVE apply(`run-20260729T154307`)의 GREEN 1,962 원장이 재실행(`run-20260729T160610`)에 덮이지 않고 보존됨

---

## 10. 누적 예외 원장 (agent-na 인계)

`otc-v4-exception-consolidate.ga.ts` → `otc-v4-exception-consolidated-na.ga.json`

| 배치 | 예외 |
|---|---|
| pilot 100 | 20 |
| pilot 500 | 84 |
| next 2,000 | 38 |
| **합계** | **142** |

원인별 그룹: **route 118** (ROUTE_CONFLICT 62 · ROUTE_UNRESOLVED 56) · **source 24** (SOURCE_EFFICACY_MISSING 24)
재투입 가능: 118 / terminal(원문 부재): 24

불변식 확인: 전건 `dbWriteActual=0` · 중복 masterId **0** · 필수필드 누락 **0** · 합계 일치.
각 배치의 정본은 **run 별 불변 파일**에서 취했다(무접미 파일 미사용).

---

## 11. 누적 현황

| 배치 | GREEN | 예외 |
|---|:---:|:---:|
| pilot 100 | 80 | 20 |
| pilot 500 | 416 | 84 |
| next 2,000 | 1,962 | 38 |
| **누적 V4 GREEN** | **2,458** | **142** |

공식 미완료: pilot 500 종료 시점 3,313 → **1,351** (= 3,313 − 1,962)
이 1,351 에는 기존 예외와 이번 38건이 포함된다.

---

## 12. 다음 단계 (마감 순서)

1. **정상 잔여 전량 생산** — 별도 준비 WO 없이 동일 파이프라인으로 확대
2. **누적 예외 142건을 agent-na 가 원인별 일괄 정리** (route 118 / source 24)
3. **복구된 대상 최종 생산** — agent-ga 정본 실행기 재투입 (sourceRef 는 masterRefV4 로 동일 결정)
