# CHECK — Model B(grounded 원문 신규 authoring) 첫 파일럿 후보 집계

**맥락:** Model A(기존 authored 재사용) 전 구간 0 확인 → 첫 파일럿을 grounded 원문 신규 authoring 으로 재정의
**성격:** read-only · DB write 0
**스크립트:** `apps/api-server/src/scripts/drug-otc-modelB-pilot-candidates.ts`
**산출:** `apps/api-server/src/scripts/data/otc-modelB-pilot-candidates-v1.json`

---

## 0. 방법

무성분명 경구·단일 **7,301**(주성분코드필요)을 fingerprint(자기 e약은요 원문 지문)별로 묶고, DB 에서 원문·기존 canonical 을 재조회해 그룹 내 안전지문/첨가제/금기/용법 동일성까지 검증.

**clean 후보 조건 (전부 AND):** 기존 ko/en canonical 0 · 단일 함량/제형/경로 · 원문 확보 100% · 그룹 내 안전지문·첨가제·금기·용법 **동일(충돌 0)**. 추천 = clean + 안전지문 corroboration(named e약은요 제품과 안전 일치 = 임상 일관성 확인) + 커버리지 순.

---

## 1. 전체 집계

| 지표 | 값 |
|---|---:|
| 무성분명 경구·단일 대상 | 7,301 |
| fingerprint 그룹 | 2,142 |
| singleton | 253 |
| **기존 canonical 보유 master** | **0** (전 구간 충돌 없음 — clean slate) |
| clean 후보 그룹 | 2,142 |
| clean + 안전 corroborated | 43 |
| 재실행 | **byte-identical ✓** |

---

## 2. 추천 첫 파일럿 후보 Top 3 (커버리지 순)

모두 원문 확보 **100%** · 그룹 내 안전지문 동일 · 첨가제·금기·용법 충돌 **0** · 기존 canonical **0** · 안전 corroboration **100%(fully)**.

| 순위 | ATC | fingerprint | 제품 | 함량/제형/경로 | 예상 ko/en INSERT · flip | 대표 |
|:---:|---|---|---:|---|---|---|
| **1** | B01AC06 | `1c2e3823` | **52** | 100mg · 정 · oral | 52·52 / 52·52 | 삼익아스피린장용정 |
| **2** | A03AA05 | `f55debd2` | **37** | 100mg · 정 · oral | 37·37 / 37·37 | 신일트리메부틴말레산염정 |
| **3** | A02AD03 | `eac58291` | **22** | 500mg · 정 · oral | 22·22 / 22·22 | 에이프로젠알마게이트정 |

- **롤백 ID**: 각 후보 `rollback_master_ids` (52 / 37 / 22) 산출물에 동결.
- **제외/예외**: clean 후보 내 제외 0(원문 100%·충돌 0·기존 canonical 0). 안전지문 미corroborated 그룹은 추천에서 제외(별도 검토 대상).

---

## 3. 필수 집계 대조 (WO 요청 9항목)

| # | 항목 | 결과 |
|---|---|---|
| 1 | 후보 ATC-key · fingerprint | ✓ (§2) |
| 2 | 대상 master 수 | ✓ (52/37/22) |
| 3 | 원문 출처·확보율 | ✓ (e약은요, 100%) |
| 4 | 안전지문 일치 | ✓ (그룹내 동일 + named corroborated 100%) |
| 5 | 기존 canonical 보유 | ✓ (0) |
| 6 | 제외 제품·사유 | ✓ (추천 3그룹 내 제외 0) |
| 7 | 예상 ko/en INSERT · flip | ✓ (§2) |
| 8 | 재실행 결정론 | ✓ (byte-identical) |
| 9 | 롤백 대상 ID 목록 | ✓ (산출물) |

---

## 4. 다음

- DB write **0** 유지. 첫 Model B 파일럿 **대상 확정은 위 3개 중 사용자 승인 후**.
- 승인 시 별도 write WO: 자기 e약은요 원문 grounding(`buildDrugOtcConsumerHtml`, 알파칼시돌 방식) → ko needs_review → en needs_review → flip, 이중게이트 단일 TX, 멱등·롤백.
- 참고: 1순위 아스피린 52 는 앞선 파일럿에서 보류했던 그룹 — Model B 관점에선 가장 큰 clean·corroborated 후보로 복귀.

---

*read-only 집계. 첫 Model B 파일럿 대상 승인 대기.*
