# OTC 신규 draft 대량 authoring 실행 지침서 V1

> **목적**: bridge 통합에서 확정된 **"새설명서필요" 그룹**(authored 후보 없음)에 대해, 각 제품의 **e약은요 원문을 grounding**으로 구조화 draft를 **여러 세션에서 동일 절차**로 작성 → ko draft → en 번역 → canonical 전환하는 배치 실행 표준.
> **원칙**: 검증된 규칙만 담는다. 판정·conflict·집계 로직은 이 문서가 정의하지 않으며 [bridge 통합](../../../checks/CHECK-O4O-OTC-BRIDGE-INTEGRATION-FINAL-REVIEW-NA-V1.md) 확정치를 입력으로 소비한다.
> **상태**: Active · 일자 2026-07-18 · WO-O4O-OTC-NEW-DRAFT-AUTHORING-RULES-NA-V1
> **선행 규칙(상속)**: [DRUG-WRITING](DRUG-WRITING.md) · [DRUG-GROUPING](DRUG-GROUPING.md) · [DRUG-STANDARD](DRUG-STANDARD.md) · [DRUG-TEMPLATE](DRUG-TEMPLATE.md) · [DRUG-RULE-REGISTRY](DRUG-RULE-REGISTRY.md) (DR-001~017) · 공통 [CR-001~007](../../common/CONTENT-RULE-REGISTRY.md) · AI [AR-002](../../ai/AI-RULE-REGISTRY.md)
> **후속 단계**: en 번역·공개 전환은 [OTC-BULK-TRANSLATION-EXECUTION-GUIDE-V1](OTC-BULK-TRANSLATION-EXECUTION-GUIDE-V1.md).

---

## 0. 범위 · 전제

| 항목 | 값 |
|---|---|
| 작업 대상 | bridge 통합 **`새설명서필요`** 구획 = **2,882 그룹 / 9,101 제품**(정본 `90342ce7d` 검토 확정, 스크립트 `9dc8f3ebf`) — authored 후보 없음 |
| grounding 원천 | 각 대상 master에 연결된 **식약처 e약은요 원천 레코드**(`mfds_easy_drug`). **STORE canonical 보유 여부와 별개**(원천 데이터 ≠ 표시용 canonical). 신규 draft는 이 원천 레코드에서만 구조화(창작 금지, CR-004/AR-002). **제외 = authored 표시본(mfds_drug_otc/nutrition_combo) canonical 보유 master**(이미 승격됨). **e약은요 canonical 보유는 제외가 아니라 [승격(교체) 대상](OTC-EASY-DRUG-TO-AUTHORED-CANONICAL-UPGRADE-POLICY-V1.md)** — 슬롯 점유이므로 단순 INSERT 불가, demote→replace 계약 적용 |
| 산출 | 그룹당 **ko 구조화 draft 1건** → 연결 master 전개 → en 번역 → canonical |
| **제외(이 배치와 섞지 않음)** | 검토후확장 1,182 · 안전지문불일치 1,424 · 비경구별도트랙 6,223 · 무성분명 atc_code 없음 · rx · 복합제 |
| 후보 선정 | **본 문서는 규칙만 정의**. Top20·추천5 등 실제 그룹 선정은 에이전트 가 소관(개입 금지) |
| DB 채널 | Cloud SQL Auth Proxy(`127.0.0.1:<검증포트>`, `gcloud` 토큰). 자격증명은 프로세스 env 로만, 커밋 금지 |
| 공통 규칙 | **read-only 조사 우선**, write는 **INSERT/상태전환만·단일 TX·이중 게이트·dry-run 먼저**([번역 지침 §0-A 쓰기 소유권](OTC-BULK-TRANSLATION-EXECUTION-GUIDE-V1.md) 상속) |

> 고정 원칙(전 단계 불변): **ATC = 후보 연결 키 / 안전지문 = 최종 분리 키**(DR-001). 외부 LLM 초안 자동생성 금지 — 공식 원문 grounding(CLAUDE.md §상세규칙).

---

## 1. 신규 draft 대상 선정 규칙

대상 = `새설명서필요` 구획의 그룹 중 **아래 clean 조건을 모두 충족**하는 그룹만 자동 배치에 편입.

**clean 조건(전부 AND):**
1. **경구 단일제**(route=oral, 복합제 아님) — 비경구·복합은 §4로 제외.
2. **성분 또는 ATC 후보 키 존재**(pharmKey ≠ `none:` — 무성분명이면 atc_code 보유).
3. **grounding 충분** — 그룹 내 e약은요 원문에서 효능·용법·주의가 **수렴**(SOURCE GAP CR-007 통과). 결손·불일치면 §4.
4. **그룹 내 안전지문 단일**(동일 pharmKey 후보 풀에서 dominant 안전 프로파일과 일치 = 대표 프로파일). 소수 이질(안전지문불일치)은 §4.
5. **기존 canonical 무충돌** — 대상 master에 mfds_drug_otc/nutrition_combo canonical 부재(신규만), e약은요 표시본과 별개 축.
6. **민감 약효군 아님**(DR-008) — 해당 시 clean 아님(검토 강화 트랙).

> clean 미충족 그룹은 **자동 배치 제외 + 사유 태깅**(HOLD_SOURCE / SAFETY_SPLIT / SENSITIVE / NONORAL / COMBO / RX / CANONICAL_CONFLICT) 후 사람 검토 큐로.

---

## 2. grounded 원문 → 구조화 draft 작성 기준

- **제목** = 성분 + 함량 + 제형(DR-002/010). 브랜드·질환·증상명 제목 금지.
- **3단계 구조**(DR-016): 소비자 대표 설명 → 성분 canonical → 제품. 조성 추정 금지.
- **필수 블록**(DR-017): 사용 경우 → 사용 방법 → 주의 → 병원 방문 → 사용 확인 포인트 → 성분 기준 선택 + GMP 문구.
- **route 템플릿**(DR-009): 경구=복용, 좌제/질정 등은 본 배치 제외(§4).
- **grounding 규칙**: 효능·성분·수치·용법·금기·첨가제는 **e약은요 원문에 있는 값만** 구조화. 원문에 없으면 **작성 금지**(창작·추정 금지, CR-004/AR-002). 원문 결손이면 HOLD_SOURCE(§4).
- **안전지문 보존**: 용법 수치·연령·기간·최대량·금기·임신/수유·상호작용·첨가제를 원문 그대로 반영(정규화만, 수치 변형 금지).
- **작성 주체**: 구조화는 원문 재배열·정규화이며 **외부 LLM 자동초안 금지**. AI 보조는 원문 범위 내 편집·정규화로 한정.

---

## 3. 동일 그룹 병합 · 분리 기준 (명문화)

- **공유(병합)** = 성분 + 함량 + 제형 + 투여경로 + 허가 효능/용법 동일(DR-004) **AND 안전지문 동일**(최종 분리 키). group_key = `drug_otc::single::oral::{ingredient}::{strength}::{form}`(DR-010).
- **분리**: route 다름(DR-002) · 제형 다름(DR-003) · 함량이 OTC/RX·용법 가름(DR-005) · **안전지문 상이**(용법수치·연령·기간·금기·임신·상호작용·첨가제 중 하나라도 다르면 하위 그룹 분리).
- **분리 기준 아님**: 포장·바코드·용기용량·개수(같은 설명서 공유).
- **과병합 예외**(DR-007): 인공눈물 S01XA20 · 정장 생균 A07FA = 성분별 분리(단, 대부분 §4 대상).
- ATC 동일이라도 **함량·제형·경로 + 안전지문**으로 분리 담보(broad ATC 오병합 방지, DR-001).

---

## 4. 자동 제외 규칙 (배치 진입 차단 + 태깅)

아래 중 하나라도 해당하면 **자동 배치에서 즉시 제외**하고 사람 검토 큐로 태깅:

| 사유 태그 | 조건 |
|---|---|
| `SAFETY_SPLIT` | 그룹 내 안전지문 충돌(불일치) — 하위 그룹 분리 필요 |
| `SAFETY_CONFLICT` | 수치·연령·기간·최대량·금기·임신/수유·첨가제 상충 |
| `HOLD_SOURCE` | e약은요 원문 결손·효능/용법/주의 미수렴(CR-007 미통과) |
| `RX` | 처방(전문)의약품 혼입 |
| `NONORAL` | 비경구·특수제형(좌제·질정·점안·외용·점비 등, DR-002/STANDARD §2 4축) |
| `COMBO` | 복합제(DR-006/014) |
| `CANONICAL_CONFLICT` | 기존 authored canonical과 충돌(무충돌 신규만 허용) |
| `SENSITIVE` | 민감 약효군(DR-008) — 약사 검토 강화 |

> bridge 통합의 **full-content 충돌 12그룹·안전상충 6그룹은 이미 검토후확장으로 자동 제외**됨. 본 배치는 `새설명서필요`만 다루므로 그와 disjoint이나, 신규 작성 중 위 조건 발견 시 즉시 태깅·제외.

---

## 5. 실행 단계 (ko draft → en 번역 → canonical apply)

각 단계 **dry-run 먼저**, write는 **단일 TX + 이중 게이트**, INSERT/상태전환만:

1. **STEP 0 — read-only 조사**: 그룹의 e약은요 원문·안전지문·현재 canonical 상태 확인. clean 판정(§1) / 제외 태깅(§4).
2. **STEP 1 — ko draft 작성**(needs_review INSERT): §2 기준 구조화. `INSERT ... WHERE NOT EXISTS(authored canonical|needs_review)`.
3. **STEP 2 — ko canonical 승격(슬롯 교체)**: ⚠️ grounded는 **e약은요 canonical이 (master,STORE,ko) 슬롯을 점유** → 단순 flip 불가. **[승격(교체) 정책](OTC-EASY-DRUG-TO-AUTHORED-CANONICAL-UPGRADE-POLICY-V1.md) §2를 따른다**: 동일 TX에서 e약은요 canonical→`deprecated` demote(원문 보존) → authored canonical flip/INSERT → 사후검증(canonical==1·authored·dup==0·deprecated 보존), 불일치 ROLLBACK. 이중 게이트 GATE_ENV=YES.
4. **STEP 3 — en 번역·전개·검수·공개**: [OTC-BULK-TRANSLATION-EXECUTION-GUIDE-V1](OTC-BULK-TRANSLATION-EXECUTION-GUIDE-V1.md) 절차 그대로(그룹당 en 1건 → 연결 master 전개 → 검수 → canonical).
5. **STEP 4 — 독립 검증**: 재조회로 ko/en canonical 정합·연결 master 전개 수·no-op 확인.

- **쓰기 소유권**(번역 지침 §0-A 상속): 동일 group_key·master 집합 production write는 **단일 세션만 소유**, apply 시작~no-op 확인까지 타 세션 write 금지(read-only 검증만).
- **멱등**: 모든 INSERT는 NOT EXISTS 가드, 재실행 시 no-op.

---

## 6. 승인 봉투 (clean 그룹 연속 수행)

> **봉투 = 사용자 1회 승인으로 clean 그룹을 중간 승인 없이 연속 apply**하는 범위. Stop gate(§7) 해당 시에만 중단.

**봉투 범위(사용자 승인 시 부여):**
```text
대상   : §1 clean 조건 전부 충족 + §4 제외 태그 없음 그룹
단계   : STEP 1(ko draft INSERT) → STEP 2(ko canonical flip) → STEP 3(en) → STEP 4(검증)
방식   : dry-run → 이중 게이트 apply → 사후검증(count==EXPECTED·dup==0) → no-op 확인
연속   : clean 그룹은 그룹 간 중간 승인 없이 순차 수행
로그   : 그룹별 group_key·master수·INSERT수·flip수·en수·검증결과 기록
소유   : 소유 세션 단독 write, 봉투 완료까지 유지
중단   : §7 stop gate 중 하나라도 → 즉시 중단·보고, 승인 대기
금지   : DB write 외 구조/정책 변경, conflict 기준 변경, 타 구획(검토후/불일치/비경구) 편입
```

**첫 5개 그룹 재사용 봉투(템플릿):**
```text
[APPROVAL ENVELOPE · OTC-NEW-DRAFT · BATCH-01 · 5 groups]
전제  : 에이전트 가가 선정한 clean 그룹 5개(각 §1 6조건 PASS, §4 태그 0)
승인  : 아래를 그룹 5개에 대해 중간 승인 없이 연속 수행함을 1회 승인
수행  : 그룹별 STEP0 재검증 → STEP1 dry-run→apply → STEP2 dry-run→flip→사후검증
        → STEP3 en(번역 지침) → STEP4 독립검증
가드  : NOT EXISTS INSERT · 단일 TX · 이중 게이트 · flip 후 count/dup 검증 · 쓰기 소유권
산출  : 그룹 5건 ko+en canonical + 그룹별 실행 로그(수치) + 요약 CHECK
중단  : §7 stop gate 발생 시 해당 그룹에서 즉시 중단, 나머지 보류, 보고
확인  : 5건 완료 후 사용자 확인 → 다음 봉투(BATCH-02) 승인 요청
```

---

## 7. Stop Gate (자동 중단 조건)

아래 중 **하나라도** 발생하면 **즉시 중단 · 현재까지 상태 보고 · 승인 대기**(봉투 무효):

1. **대상 수 증가** — clean 대상 그룹/제품 수가 기준(90342ce7d 확정치)보다 증가(라이브 드리프트).
2. **수치·금기·첨가제 충돌** — 그룹 내/기존 canonical과 용법수치·금기·첨가제·연령·기간 상충.
3. **원문 결손** — e약은요 grounding 부재·미수렴(HOLD_SOURCE).
4. **rx·비경구·복합제 혼입** — 대상에 처방/비경구/복합 발견.
5. **기존 canonical 충돌** — 대상 master에 기존 authored canonical 존재(무충돌 전제 위반).
6. **정책 변경 필요** — 규칙(DR/CR/AR)·group_key·안전지문 정의 변경이 필요한 신규 케이스.

---

## 8. 자율 실행 가능 단계 vs 사용자 승인 필요 단계

| 단계 | 승인 |
|---|---|
| read-only 조사(STEP 0)·clean 판정·제외 태깅·dry-run | **자율**(승인 불필요) |
| ko draft INSERT(STEP 1)·canonical flip(STEP 2)·en 전개(STEP 3)·검증(STEP 4) | **봉투 1회 승인 내 연속 자율** — clean 그룹 한정 |
| 봉투 최초 발급 / 다음 봉투(BATCH-02+) / stop gate 해제 | **사용자 승인 필요** |
| 규칙·group_key·안전지문 정의 변경 | **사용자 승인 + 별도 WO** |

---

## 9. 완료 기준 (배치 실행 세션용)

- clean 그룹 전수 STEP1~4 완료(또는 stop gate 태깅).
- 그룹별 count==EXPECTED · dup==0 · no-op 재검증 PASS.
- ko/en canonical 정합 + 연결 master 전개 정확.
- DB write = INSERT/상태전환만(구조 변경 0).
- 자기 산출물(스크립트·로그·CHECK)만 path-specific commit·push, 자격증명·.env 미커밋.

---

## 부록 · 링크

- 판정 입력: [bridge 통합 검토](../../../checks/CHECK-O4O-OTC-BRIDGE-INTEGRATION-FINAL-REVIEW-NA-V1.md)(90342ce7d) · 스크립트 `9dc8f3ebf`
- en 단계: [OTC-BULK-TRANSLATION-EXECUTION-GUIDE-V1](OTC-BULK-TRANSLATION-EXECUTION-GUIDE-V1.md)
- 규칙: [DRUG-RULE-REGISTRY](DRUG-RULE-REGISTRY.md)(DR-001~017) · [DRUG-WRITING](DRUG-WRITING.md) · [DRUG-GROUPING](DRUG-GROUPING.md) · [DRUG-STANDARD](DRUG-STANDARD.md) · [DRUG-TEMPLATE](DRUG-TEMPLATE.md)
