# CHECK-O4O-OTC-FULL-CORPUS-AUTHORED-BRIDGE-INTEGRATION-V1 — grounded↔authored 최종 bridge 통합 (에이전트 가)

WO: `WO-O4O-OTC-FULL-CORPUS-AUTHORED-BRIDGE-INTEGRATION-EXECUTE-AGENT-GA-V1` · 일자: 2026-07-18 · 상태: **완료 (read-only 통합 확정 실행)**
정본 스크립트: **`f2c819451`** (에이전트 나 교정본 — full-content conflict=12 + 드리프트 게이트 + 복원력 배치 read). **`686d795fa` 는 폐기본**(conflict=6/section-based).
입력: grounded=`0aa64a0ef`(3-shard 통합) · authored=`d7b3017ad`(authored audit) · 실행=에이전트 가(안정 프로덕션 인증 :5442).
채널: **Cloud SQL Auth Proxy(:5442) → production `o4o_platform`, SELECT only.** DB write **0** · canonical/draft/번역/원본 변경 **0**.

---

## 0. 결론

> **정본 f2c819451 로 grounded 19,131 + authored 3,149(baseline 3,128 + concurrent canonical +21, 손실 0) 전수 단일 규칙 연결. full-content 충돌 12그룹 전부 검토후확장으로 자동 확장 제외. 기존 authored 로 확장 가능 grounded 2,383(그대로확장 1,201 + 검토후확장 1,182). 안전지문 불일치 1,424 제품/410 그룹 하위 분리. 신규 작성 필요 2,882 그룹/9,101 제품. 비경구·복합제 6,223 별도 트랙. 대표 설명서 134개로 apply 대상 2,383 커버 — top10 56% · top50 86.4% · top100 96.7%. 1차 대량 apply 후보 = 그대로확장 157 그룹/1,201 제품. 재실행 결과 content-결정론(summary byte-identical 4회, groups/exceptions set·정렬내용 identical). DB write 0.**

---

## 1. 게이트 (라이브 드리프트 리포팅 · 정본 f2c819451)

| 게이트 | baseline | 실측 | 판정·근거 |
|---|---:|---:|---|
| grounded distinct | 19,131 | **19,131** | ✅ 무결성(중복·손실 0) anchor |
| authored distinct | 3,128 | **3,149** | ✅ drift +21 = **알파칼시돌 ko canonical 승격**(직전 WO, created_at 신규 0·status 전환, superset·손실 0) |
| grounded fingerprint 그룹 | 6,216 | **6,261** | ✅ baseline 은 shard-merge 근사, 본 스크립트 전량 단일패스 재계산=정본(drift +45) |
| authored full-content 충돌 그룹 | 12 | **12** | ✅ 충돌 정의 = 전체 content 지문(norm_full, authored audit 계승). **12 전부 자동 확장 제외** |
| authored 안전상충 그룹 | 6 | **6** | ✅ |
| **DB write** | 0 | **0** | ✅ |

> grounded anchor(19,131) 무결. authored +21 은 직전 알파칼시돌 승격의 정상 편입(재사용 authored). 폐기본(686d795fa)의 conflict=6 은 section-based 정의라 참고값일 뿐, **정본 full-content conflict=12** 가 최종.

---

## 2. master 파티션 (grounded 19,131 전수)

| 판정 | 제품수 | 의미 |
|---|---:|---|
| authored 그대로확장 | **1,201** | pharmKey 일치 + authored 무충돌 + grounded 안전 대표프로파일 → 1차 apply 후보 |
| 검토후확장 | **1,182** | pharmKey 일치하나 authored full-content 충돌(12그룹) → 자동 확장 금지, 사람 검토 |
| 안전지문 불일치 | **1,424** | pharmKey 일치 + 안전 이질 프로파일 → 하위 그룹 분리 |
| 새 설명서 필요 | **9,101** | authored 후보 없음 |
| 비경구·별도트랙 | **6,223** | route≠oral 또는 복합제 |
| **합** | **19,131** | ✅ (1,201+1,182+1,424+9,101+6,223) |

그룹 롤업: 그대로확장 157그룹 · 검토후확장 193그룹 · 안전불일치 410그룹 · 새설명서 2,882그룹 · 비경구 2,619그룹.

---

## 3. 필수 결과

| # | 항목 | 값 |
|---|---|---|
| 1 | authored 289그룹 중 grounded 연결 가능 그룹수 | **115** |
| 2 | 기존 authored 로 확장 가능 grounded 제품수 | **2,383** (그대로확장 1,201 + 검토후확장 1,182) |
| 3 | 무성분명 ATC bridge (대상 7,301) | 성공 **1,027**(그대로확장 295 + 검토후확장 314 + 안전불일치 418) / 실패 **6,274**(후보없음) / ATC코드없음 0 |
| 4 | 안전지문 불일치 | **1,424 제품 / 410 그룹** |
| 5 | 신규 작성 필요 | **2,882 그룹 / 9,101 제품** |
| 6 | 대표 설명서 apply 커버리지 | top10 **1,334(56%)** · top50 **2,058(86.4%)** · top100 **2,304(96.7%)** / 총 apply대상 2,383 · 대표설명서 134 |

---

## 4. 첫 대량 apply 후보

- **1차 배치 후보 = authored 그대로확장 157 그룹 / 1,201 제품**(authored 무충돌 + grounded 안전 대표프로파일 일치, 자동 확장 우선).
- 대표 설명서 134개가 apply 대상 2,383(그대로+검토)을 커버, **top100=96.7% 누적**. 소수 대표로 대량 커버 구조.
- ⚠️ 총량 상위 대표 다수가 `groundedReview`(검토후확장, full-content 충돌) — 예: 에르도스테인·아세틸시스테인·세티리진·비타민류(A11JC)는 authored 충돌 → **review 트랙(자동 제외)**. 순수 `groundedApply`(그대로확장) 대표만 1차 배치 편입.
- 검토후확장 1,182·안전불일치 1,424 는 사람 검토/하위 분리 후 후속 배치.

---

## 5. 재실행 결정론

| 산출물 | 결과 |
|---|---|
| summary-v1.json | **byte-identical** (4회 실행 md5 `16742508…` 동일) |
| groups-v1.json (6,261 그룹) | content-identical (fingerprint set·정렬내용 동일), **요소 나열 순서만 변동** |
| exceptions-v1.json | content-identical (모든 하위배열 set 동일), **요소 순서만 변동** |

> 데이터·수치·집계·판정은 **완전 재현(결정론)**. groups/exceptions 의 byte 차이는 grounded/authored DB read 에 `ORDER BY` 부재 → 동률 그룹 정렬·샘플의 **요소 순서**만 실행마다 달라지는 것(내용 불변). 엄밀 byte-determinism 은 정본 스크립트에 stable tiebreaker 1줄이 필요하나, 정본(f2c819451)은 에이전트 나 소유이므로 본 실행에서 미수정(경계 준수) — 필요 시 소유 세션이 반영.

---

## 6. 산출물 / 다음

- `apps/api-server/src/scripts/drug-otc-full-corpus-authored-bridge-integration.ts` (정본 `f2c819451`, 에이전트 나 소유 — **미수정 실행만**)
- `apps/api-server/src/scripts/data/otc-full-corpus-authored-bridge-summary-v1.json`
- `apps/api-server/src/scripts/data/otc-full-corpus-authored-bridge-groups-v1.json`
- `apps/api-server/src/scripts/data/otc-full-corpus-authored-bridge-exceptions-v1.json`
- 본 CHECK 문서

> **다음**: 1차 대량 apply 배치 = authored 그대로확장 157 그룹/1,201 제품. apply 스크립트는 이중 게이트·단일 TX·멱등·ko↔en 정합·안전지문 재검증 설계(별도 WO). 검토후확장 1,182(full-content 충돌 12그룹 포함)·안전불일치 1,424 는 사람 검토/하위 분리 후 후속. 충돌 12 전부 자동 확장 제외 원칙 유지.
