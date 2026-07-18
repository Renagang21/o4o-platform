# CHECK-O4O-HFF-COMBO-VD-CA-READONLY-INVESTIGATION-V1 — 비타민D+칼슘 복합형 read-only 조사 (에이전트 가)

WO: PART B 복합형 첫 그룹(비타민D+칼슘) · 일자: 2026-07-18 · 상태: **완료 (read-only 조사 — 신규 apply 대상 0)**
채널: **Cloud SQL Auth Proxy(:5442) → production `o4o_platform`, SELECT only.** DB write **0** · canonical/draft/번역 변경 **0** · 실제 apply **0**.
파이프라인: `hff-combo-db-identify.ts`(preflight) → `hff-combo-select.ts --combo "비타민D,칼슘" --source db`(DB `product_candidates.raw_payload`, G-drive 비의존).

---

## 0. 결론

> **비타민D+칼슘 순수 2-원료 조합 eligible 풀 = 45. 그 45가 전부 이미 적재(candidate matched 45 · master 45 · `batch:single-nutrient-combo-vd-ca` 태그 45)되어 있어 신규 apply 대상 = 0. 이 그룹은 이미 완결. 예상 write 0. dry-run 설계 = no-op. apply 불필요.**

---

## 1. preflight (db-identify)

| 항목 | 값 |
|---|---|
| server | o4o_platform · o4o_api · PostgreSQL 15.17 |
| HFF candidate / master / STORE canonical | 41,261 / 4,181 / 8,362 |
| 기존 복합형 배치 태그 | mg-vd-ca 72 · **vd-ca 45** · vd-zn 38 · vc-zn 37 · se-zn 26 · mg-ca 20 |

---

## 2. 12항목 조사 결과

| # | 항목 | 값 |
|---|---|---|
| 1 | 대상 candidate / ProductMaster 수 | **45 / 45** (전부 promoted) |
| 2 | 성분 조합 / 함량 조합 | 비타민D + 칼슘(2원료) · **40 distinct 함량 조합**(VD 표시량/기준 + Ca 표시량/기준) |
| 3 | 제형 · 경로 | 정 28 · 캡슐 6 · 분말 5 · 젤리/구미 4 · 연질캡슐 1 · 기타 1 — **전부 경구(oral)** (액상 1건은 select 제외) |
| 4 | grounding 원문 확보 | select grounding 지표 12 · 기적재 45는 적재 시점 grounding 처리 완료(직접 grounded 아닌 건 HOLD 처리 축) |
| 5 | ko/en 초안 존재 | 45 전부 STORE canonical(ko/en) 보유 = 적재 완료 |
| 6 | 용법·연령·금기·상호작용 차이 | 안전지문(intake+caution) **43 distinct / 45** — 제품별 거의 개별 → 이미 개별 canonical로 분리 적재 |
| 7 | 안전지문 그룹 수 | **43** |
| 8 | HOLD·REVIEW·BLOCKED 분포 | mention 708 → ELIGIBLE 45 / HOLD_MULTI 650(≥3원료·타조합) / 액상 1. ELIGIBLE 45 = BLOCKED 0(통과·적재 완료) |
| 9 | 기존 canonical·candidate 연결 중복 | **45/45 이미 matched·promoted** (batch vd-ca 45). 신규 dedup 결과 **0** |
| 10 | 예상 master/candidate/ko/en write | **0 / 0 / 0 / 0** (신규 대상 0) |
| 11 | rollback 대상 ID | **없음** (apply 없음) |
| 12 | 재실행 결정론 | ✅ select 재실행 45 statementNo set **identical** |

---

## 3. 복합제 원칙 대조 (기적재 상태가 이미 원칙 반영)

| 원칙 | 상태 |
|---|---|
| 성분 조합 같아도 함량 다르면 분리 | ✅ 40 함량 조합 개별 |
| 용법·연령·금기·상호작용 다르면 분리 | ✅ 43 안전지문 개별 canonical |
| 제품명만으로 조합 추정 안 함 | ✅ spec 집합 정확 매칭(BASE_STANDARD ILIKE ALL 비타민·칼슘 후 정확 조합만 eligible) |
| grounding 없는 제품 apply 제외 | ✅ select HOLD 축(액상·다원료·미귀속 제외) |
| 여러 조합 한 트랜잭션 합치기 금지 | ✅ (해당 없음 — 신규 0) |

---

## 4. dry-run 설계

- **신규 apply 대상 0 → dry-run = no-op(예상 write 0).** 적재 스크립트 실행 불필요.
- 만약 후속으로 vd-ca를 재적재·보완한다면 계약 = 기존 combo 계약(단일 조합·단일 TX·이중 게이트·트랜잭션 내 사후검증·rollback manifest·재실행 no-op). 단 현재는 대상 0이라 실행 없음.

---

## 5. 산출물 / 다음

- 본 CHECK 문서 (read-only 조사). pool/hold JSON 은 세션 scratchpad(session-local, 미커밋).
- `hff-combo-select.ts`·`hff-combo-db-identify.ts` 는 기존 자산 — **미수정 실행만**.

> **다음**: 비타민D+칼슘은 신규 apply 없음(완결). PART B 실제 진행 대상은 **다음 조합(MSM+비타민D 등)** 이 되어야 함. 또는 vd-ca HOLD_MULTI 650(≥3원료·타조합)의 재분류가 필요하면 별도 조합(mg-vd-ca 등)으로 이미 일부 처리됨(72). 다음 조합 read-only 조사는 별도 지시 시 동일 프로토콜로 진행.
