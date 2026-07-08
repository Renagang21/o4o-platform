# CHECK-O4O-DRUG-DESCRIPTION-RULES-CONSOLIDATION-V1

## 1. 작업 일시

2026-07-08

WO: `WO-O4O-DRUG-DESCRIPTION-RULES-CONSOLIDATION-V1`

이번 CHECK는 **의약품 소비자 설명서 작성 규칙의 조사·통합·표준화** 결과다. **새 규칙을 만들지 않고**, 프로젝트에 분산된 기존 규칙을 조사하여 출처·중복을 매핑하고 KEEP/MERGE/REMOVE/MOVE/NEW로 분류한 뒤, 표준 문서 구조·CLAUDE.md·MEMORY.md 개편안을 **제안**한다. 실제 반영은 후속 `...STANDARD-DOCUMENT-APPLY-V1`.

> **DB write 0 · 설명서 미작성 · ProductMaster 무변경 · canonical 무변경 · 문서 조사만.**

## 2. 조사 범위

| 유형 | 문서 수 | 조사 방식 |
|---|---:|---|
| 설명서 Guide | 2 | 전문 정독 |
| 설명서 Registry | 1 | 전문 정독 |
| 설명서 WO | 27 | 인벤토리 + 표준/규칙 WO 정독 |
| 설명서 CHECK | 82 | 인벤토리 + 규칙 확립 CHECK 12건 정독 |
| CLAUDE.md / MEMORY.md | 2 | 설명서 규칙 존재 여부 조사 |
| Track memory | ~5 | 배치 진행 기록 |
| **합계(설명서 관련)** | **~119** | — |

**Deep-read(규칙 추출) 대상 18건**: WRITING-GUIDE-V1(**WG**), CANONICAL-STANDARD-V1(**CS**), GROUP-REGISTRY-V1(**RG**), STANDARD-V1(process WO), + 규칙 확립 CHECK 12건(NORM·SEED·COMBO·HIGHRISK·ROUTE·SRCGAP·DRAFT-TO-SHARED·DRAFT-DB-APPLY-DESIGN·DRAFT-DB-APPLY·PARALLEL-BATCH·CANONICAL-STANDARD-REFINEMENT·COMBO-REVIEW), + CLAUDE.md + MEMORY.md.

조사는 병렬 read-only 에이전트 3개(① guide+registry ② grouping·route·SOURCE GAP CHECK ③ draft→canonical 파이프라인 CHECK)로 수행. 파일 변경 0.

## 3. 문서 계층 (조사로 확정)

```text
CS  (CANONICAL-STANDARD-V1)   = 설계 철학 · 상위 SSOT (분리 4축 · canonical 3단계 · HOLD_SOURCE 철학)
 └ WG (WRITING-GUIDE-V1)      = 작성 규칙 · 하위 SSOT (문체 · 구조/템플릿 · §3.5~§3.11 · GMP 문구)
 └ RG (GROUP-REGISTRY-V1)     = 배치 관리 registry (문서, group_key 표준 · 상태머신 · batch 배정)
 └ STANDARD-V1 (process WO)   = 증상군 WO 공통 규격 (작업 흐름 · CHECK 규격 · 구축 현황 tracker)
 └ 규칙 확립 CHECK (NORM/SEED/COMBO/HIGHRISK/ROUTE/SRCGAP) = 규칙의 최초 확립처 → 대부분 WG/CS/RG에 흡수 완료
 └ 파이프라인 CHECK (DRAFT-TO-SHARED/DRAFT-DB-APPLY/PARALLEL-BATCH) = draft→SPD→canonical DB 규칙 (아직 guide 미승격)
```

**핵심 발견 3가지:**
1. **작성·그룹핑·SOURCE GAP 규칙은 이미 WG/CS/RG에 잘 통합**되어 있고, 규칙 확립 CHECK(NORM/SEED/COMBO/HIGHRISK/ROUTE/SRCGAP)의 규칙은 대부분 guide로 **흡수 완료** → 해당 CHECK는 감사(audit) 근거로만 남기고 활성 참조원에서 제외.
2. **파이프라인 규칙(draft 적재·SPD 승격·canonical 상태·registry 상태머신)은 guide로 승격되지 않고 설계 CHECK에만 산재** → **표준 문서로 MOVE 필요(가장 큰 gap).**
3. **CLAUDE.md에 설명서 규칙 참조가 전무**(grep 0건). STANDARD-V1과 WG/CS 사이 공통 원칙(공유 기준·ATC≠route·SOURCE GAP) **중복 재기술** 존재 → MERGE·포인터화 필요.

## 4. 규칙 추출 총괄 (§5 산출물 표)

> 규칙 62건을 11범주로 추출. `최초 문서`=규칙 최초 확립, `중복 문서`=동일 규칙 재등장, `최종 채택`=통합 후 SSOT.

### 4-1. 작성 원칙

| # | 규칙 | 최초 | 중복 | 최종 채택 | 분류 |
|---|---|---|---|---|---|
| R1 | 목적 우선순위(선택>안전>상담>정보), 성분설명 자체 목적 아님 | CS §1.1 | — | CS | KEEP |
| R2 | 소비자 진입=증상축 / canonical 단위=성분·함량 | CS §2·§3 | WG §4.2 | CS | KEEP |
| R3 | 제목=성분+함량+제형, 브랜드 제목 금지 | WG §3.1·§8.3 | CS §2 | WG | KEEP |
| R4 | 질환명·증상명 회피 금지 | WG §4.2·§8.4 | CS §1.2 | WG | KEEP |
| R5 | 효능 과장·우월성 단정 금지(금지표현 목록) | WG §3.4·§4.3·§3.9 | — | WG | KEEP |
| R6 | MFDS 허가원문 > 모든 정보(기억·AI·인터넷·홍보 열위) | CS §7 | WG §8 | CS | KEEP |
| R7 | 문체 톤(건조·친절·짧게·QR/POP/태블릿 가독) | WG §4.1 | — | WG | KEEP |
| R8 | 성분·함량 기준 선택 안내 | WG §4.3 | WG §6 | WG | KEEP |
| R9 | AI 작성 10개조 | WG §8 | 전 batch CHECK | WG(→TEMPLATE) | MERGE |

### 4-2. 구조/템플릿

| # | 규칙 | 최초 | 중복 | 최종 채택 | 분류 |
|---|---|---|---|---|---|
| R10 | WG 기본구조(제목→요약표→효능→복용안내→주의→성분기준) | WG §5 | — | WG | KEEP |
| R11 | Canonical Template 필수블록(사용경우→방법→주의→병원방문→사용확인포인트→성분기준) | CS §12-A | 전 batch CHECK §8 | CS | KEEP |
| R12 | Selection Point / Counseling Point(창작 0) | CS §5·§6 | — | CS | KEEP |
| R13 | 안전성 블록 "병원에 가야 하는 경우" 필수 | CS §11 | 전 batch CHECK | CS | KEEP |
| R14 | GMP 공통문구, "완전히 같다" 금지 | WG §6 | 전 batch CHECK | WG | KEEP |
| R15 | 작성자 CHECKLIST | CS §13 | STANDARD-V1 §8 | CS | KEEP |

### 4-3. 공유 / 분리 (Grouping)

| # | 규칙 | 최초 | 중복 | 최종 채택 | 분류 |
|---|---|---|---|---|---|
| R16 | 공유기준=성분+함량+제형+경로+효능/용법 동일→대표1 복사 | WG §1·§3.3 | CS §4·RG §2·STANDARD-V1 §5 | WG | **MERGE**(STANDARD-V1·CHECK는 참조) |
| R17 | 포장·바코드·용기용량·개수·파스매수=분리기준 아님 | WG §3.2·§8.7 | RG §2·전 batch CHECK | WG | MERGE |
| R18 | 개량성분 별도(이부프로펜≠덱시부프로펜) | WG §3.4 | CS §4 | WG | KEEP |
| R19 | 함량 다르면 별도(OTC/RX 가름) | WG §3.5 | NORM §10·CS §4.1 | WG | KEEP |
| R20 | 제형/투여경로 다르면 별도 | WG §3.6·§3.10 | CS §4.1·STANDARD-V1 §6 | WG | **MERGE** |
| R21 | 대표 분리 4축(경로·기전·선택축·안전성)+함량축 독립 | CS §4.1 | — | CS | KEEP |
| R22 | Non-Merge 확정목록(인공눈물≠충혈완화·1세대≠2세대 등) | CS §4 | 전 batch CHECK | CS | KEEP |

### 4-4. ATC / route / 정규화 조사

| # | 규칙 | 최초 | 중복 | 최종 채택 | 분류 |
|---|---|---|---|---|---|
| R23 | **ATC≠route**, ATC는 후보검색·해부학군 1차 필터 | NORM §8·§9 | SEED·HIGHRISK·ROUTE·WG §3.6·STANDARD-V1 §7·전 batch CHECK | WG §3.6(+STANDARD-V1 §7) | **MERGE**(CHECK 중복 REMOVE) |
| R24 | norm_key=COALESCE(ATC7, 정규화성분명) hybrid | NORM §7 | SEED §3·RG §2 | RG | KEEP |
| R25 | 정규화 우선순위(itemSeq>품목코드>주성분명>사전>name파싱) | WG §3.7 | SEED §4 | WG | KEEP |
| R26 | 표기변형 alias 사전(염명어순·오타·통용명=merge / 염·수화물=review) | SEED §4 | NORM §6·WG §3.7 | WG §3.7 + **GROUPING(사전)** | MOVE |
| R27 | 노이즈 필터(수출/군납/비매 4,018행) | NORM §7 | SEED §5·COMBO·HIGHRISK·ROUTE | **GROUPING** | MOVE |
| R28 | spec 첫토큰=용기용량≠농도, 원문 %·mg/g 재파싱 | HIGHRISK §6 | ROUTE §6·WG §3.10·RG §2·전 batch CHECK | WG §3.10 | **MERGE** |
| R29 | 함량축 OTC/RX 가름, 고함량RX존재→저함량OTC 한정 | NORM §10·§11 | WG §3.5·CS §4.1 | WG | KEEP |

### 4-5. 복합제

| # | 규칙 | 최초 | 중복 | 최종 채택 | 분류 |
|---|---|---|---|---|---|
| R30 | 복합제 탐지=ATC 조합코드(substr(6,2)≥50 or R05X), **name 키워드 게이트 금지** | COMBO §3·§8 | RG §2 | **GROUPING** | MOVE |
| R31 | 복합제 group_key=조합ATC슬러그+`_combo` | COMBO §5 | RG §2 | RG | KEEP |
| R32 | R05X 감기약 catch-all=`blocked`/no_merge | COMBO §6 | RG §2 | RG | KEEP |
| R33 | 복합제 기본=약사 검토 강화(자동초안 0) | COMBO §7 | HIGHRISK | GROUPING | MOVE |
| R34 | 과병합 예외 화이트리스트(생균 A07FA·인공눈물 S01XA20) | SEED §3.1 | COMBO·HIGHRISK·ROUTE·WG §3.10·RG §2 | **GROUPING** | MOVE |

### 4-6. SOURCE GAP

| # | 규칙 | 최초 | 중복 | 최종 채택 | 분류 |
|---|---|---|---|---|---|
| R35 | SOURCE GAP 정의 4조건 AND | SRCGAP §3.11.1 | WG §3.11.1 | WG | KEEP |
| R36 | 조성 추정 금지 | SRCGAP §3.11.2 | WG §3.8·§3.11.2·CS §6 | WG | KEEP |
| R37 | 대표 허용 게이트(효능/용법/주의 수렴+오해없음) | SRCGAP §3.11.3 | WG §3.11.3·CS §9·STANDARD-V1 §9·전 batch CHECK | WG | **MERGE** |
| R38 | HOLD_SOURCE 조건·철학(안전판단·group_key 세분화 금지) | SRCGAP §3.11.4 | WG §3.11.4·CS §8.1 | WG/CS | KEEP |
| R39 | ETL 분리(SOURCE GAP 후속 ETL 일괄해결) | SRCGAP §3.11.5 | WG §3.11.5 | WG | KEEP |
| R40 | 조성확인 선행 분기 흐름 | SRCGAP §3.11.8 | WG §3.11.8 | WG | KEEP |

### 4-7. Grounding

| # | 규칙 | 최초 | 중복 | 최종 채택 | 분류 |
|---|---|---|---|---|---|
| R41 | e약은요 존재만으로 자동초안 아님, 근거충분성 판단 | WG §3.8 | CS §6 | WG | KEEP |
| R42 | 저grounding→검토강화/수동/보류, AI 약리확장 금지 | WG §3.8 | HIGHRISK·RG §5 | WG | KEEP |

### 4-8. 민감 약효군 / 안전

| # | 규칙 | 최초 | 중복 | 최종 채택 | 분류 |
|---|---|---|---|---|---|
| R43 | 민감 약효군 기본=약사 검토 강화(피임약·수면유도·항혈전·질정·철분 등) | WG §3.9 | CS §4.1·RG §4 | WG | KEEP |
| R44 | 비경구 자동초안 0, route별 검토강화/수동 큐레이션 목록 | HIGHRISK §6 | WG §3.10·ROUTE §5·RG §4 | WG §3.10 | **MERGE** |
| R45 | route별 "사용안내" 템플릿(복용→사용, 좌제/질정 경구금지) | ROUTE §3·§4 | WG §3.10·CS §12-A | WG §3.10 | KEEP(REMOVE ROUTE 중복) |
| R46 | 병원 진료 권고 트랙별 기준 | CS §11 | 전 batch CHECK | CS | KEEP |

### 4-9. Draft → SPD → Canonical 파이프라인 (DB)

| # | 규칙 | 최초 | 중복 | 최종 채택 | 분류 |
|---|---|---|---|---|---|
| R47 | draft 적재=`product_candidate_description_drafts`, source_label=`MFDS_DRUG_OTC`, review_status=needs_review, ai_*=null | DRAFT-DB-APPLY-DESIGN | DRAFT-DB-APPLY·COMBO-REVIEW | **PIPELINE(신규)** | MOVE |
| R48 | 이중게이트(`--apply`+env `CONFIRM=YES`), 단일TX+검산, soft-delete rollback | DRAFT-DB-APPLY-V1 | — | **PIPELINE** | MOVE |
| R49 | SPD 승격=needs_review로만, master당 canonical 1개 불변, 대상 master N-copy 전개 | DRAFT-TO-SHARED | COMBO-REVIEW | **PIPELINE** | MOVE |
| R50 | canonical 승격 항상 분리(별도 승인), Phase1=no_spd A안 | DRAFT-TO-SHARED §7 | — | **PIPELINE** | MOVE |
| R51 | SPD status 모델(canonical 노출/needs_review 미노출/candidate) | DRAFT-TO-SHARED §3.1 | — | **PIPELINE** | MOVE |

### 4-10. Registry 거버넌스

| # | 규칙 | 최초 | 중복 | 최종 채택 | 분류 |
|---|---|---|---|---|---|
| R52 | registry=문서(DB 아님), 실제반영=승인 후 파이프라인만 | PARALLEL-BATCH §2 | RG 상단 | RG | KEEP |
| R53 | registry 상태머신 10개, approved_for_import/imported=중앙 전용 | PARALLEL-BATCH §4 | RG §3 | RG | KEEP |
| R54 | 작업방1개=batch1개, 같은 group_key 한 작업방만, 충돌시 `conflict:` notes | PARALLEL-BATCH §5·§6 | RG §6 | RG | KEEP |
| R55 | risk_class=batch 내 표기(민감 약효군 별도 batch 아님) | RG §4 | PARALLEL-BATCH §5 | RG | KEEP |

### 4-11. Process / CHECK / Memory

| # | 규칙 | 최초 | 중복 | 최종 채택 | 분류 |
|---|---|---|---|---|---|
| R56 | 작업흐름(WO→조사→grounding→작성→SOURCE GAP→CHECK→commit→push) | STANDARD-V1 §3 | 전 batch CHECK | STANDARD-V1 | KEEP |
| R57 | 절대금지(DB write/draft insert/canonical/SPD/master 변경/AI 추정) | STANDARD-V1 §4 | 전 batch WO·CHECK | STANDARD-V1 | KEEP |
| R58 | DB read-only 접속표준(cloud-sql-proxy·o4o_api·UTF-8 SQL·ext NULL) | STANDARD-V1 §4-A | 전 batch CHECK §3 | STANDARD-V1 | KEEP |
| R59 | CHECK 필수항목+필수표+대표설명서 목록+적용 ProductMaster 수 | STANDARD-V1 §10 | PARALLEL-BATCH §7 | **CHECK-STANDARD(신규)** | MOVE |
| R60 | Track memory 기록 규격 | STANDARD-V1 §12 | PARALLEL-BATCH §8 | STANDARD-V1 | KEEP |
| R61 | 증상군 WO 최소 작성 항목(대상/제외/bucket/키워드/주의문구/템플릿/후속) | STANDARD-V1 §14 | — | STANDARD-V1 | KEEP |
| R62 | DB 비밀정보 비기록(env 추출·문서/커밋 미기록) | DRAFT-DB-APPLY | STANDARD-V1 §4-A | STANDARD-V1 | KEEP |

## 5. KEEP / MERGE / REMOVE / MOVE / NEW 분류 집계

| 분류 | 수 | 의미 | 해당 |
|---|---:|---|---|
| **KEEP** | 40 | 현 SSOT 유지, 변경 없음 | R1~R8,R10~R15,R18,R19,R21,R22,R24,R25,R29,R31,R32,R35,R36,R38~R43,R46,R52~R58,R60~R62 |
| **MERGE** | 8 | 여러 문서 중복 → SSOT 1곳으로 통합, 나머지는 참조 | R9,R16,R17,R20,R23,R28,R37,R44 |
| **REMOVE** | 6 | 규칙 확립 CHECK의 중복 규칙 → 활성 참조원에서 제외(파일은 감사용 보존) | NORM/SEED/COMBO/HIGHRISK/ROUTE/SRCGAP의 WG·RG 흡수분(R23·R28·R30·R34·R45의 CHECK 사본) |
| **MOVE** | 8 | guide 미승격 규칙 → 표준 문서로 이관 | R26,R27,R30,R33,R34(→GROUPING) · R47~R51(→PIPELINE) · R59(→CHECK-STANDARD) |
| **NEW** | 6 | 신설 필요 | ①PIPELINE guide ②CHECK-STANDARD guide ③`docs/guides/drug-description/` 폴더 ④CLAUDE.md 포인터 ⑤MEMORY.md 불변식 블록 ⑥STANDARD-V1 §13 tracker를 living index로 승격 |

> 중복 규칙(2개 이상 문서 등장) = **24건**. 최다 중복: R16 공유기준(5문서)·R23 ATC≠route(7문서)·R28 spec≠농도(6문서)·R37 SOURCE GAP 게이트(5문서).

## 6. 표준 문서 구조 제안 (WO §6·§10)

기존 CS/WG/RG가 이미 SSOT로 기능하므로, **신규 5문서를 백지 생성하지 않고 기존 문서를 `docs/guides/drug-description/`로 재배치·정렬**하고 파이프라인만 신설한다.

```text
docs/guides/drug-description/
  DRUG-DESCRIPTION-STANDARD.md      ← CS (설계 철학·분리 4축·canonical 3단계·HOLD_SOURCE 철학·version 정책)   [상위 SSOT]
  DRUG-DESCRIPTION-WRITING.md       ← WG (문체·§3.5~§3.11·민감약효군·grounding)                             [작성 SSOT]
  DRUG-DESCRIPTION-TEMPLATE.md      ← WG §5·§6 + CS §12-A (구조·필수/선택 블록·GMP 문구·AI 10개조)           [MERGE R9]
  DRUG-DESCRIPTION-GROUPING.md      ← RG §2 + NORM/SEED/COMBO/HIGHRISK (group_key·정규화 사전·복합·과병합 예외) [MOVE R26,R27,R30,R33,R34]
  DRUG-DESCRIPTION-PROCESS.md       ← STANDARD-V1 (작업 흐름·조사 원칙·ATC≠route·read-only·증상군 WO 최소규칙) [MERGE R16,R20,R23]
  DRUG-DESCRIPTION-PIPELINE.md      ← 【신규】DRAFT-TO-SHARED/DRAFT-DB-APPLY/PARALLEL-BATCH (draft→SPD→canonical DB·이중게이트·rollback) [MOVE R47~R51]
  DRUG-DESCRIPTION-CHECK-STANDARD.md ← 【신규】STANDARD-V1 §10 + PARALLEL-BATCH §7 (CHECK 필수항목·표·완료보고·track memory) [MOVE R59]

docs/registries/O4O-DRUG-OTC-DESCRIPTION-GROUP-REGISTRY-V1.md  ← RG 유지(배치 관리 데이터·상태머신, GROUPING 규칙과 분리)
```

- **기존 rule 확립 CHECK(NORM/SEED/COMBO/HIGHRISK/ROUTE/SRCGAP)**: 규칙은 위 guide로 흡수 완료 → CHECK 파일은 **감사(audit) 근거로 보존**하되, 신규 WO는 CHECK가 아니라 guide를 참조.
- **STANDARD-V1**: PROCESS.md로 흡수하며, 중복(R16 공유기준·R20 경로/제형 분리·R23 ATC≠route)은 WG/CS를 참조하도록 축약.

## 7. CLAUDE.md 개편안 (제안만)

**현황**: CLAUDE.md에 설명서 규칙 참조 **0건**(grep 확인). 설명서 표준이 헌법 문서에서 완전히 누락됨.

**제안**:
- CLAUDE.md는 **규칙을 담지 않고 포인터만** 추가한다(원칙: 상세는 guide, CLAUDE는 참조).
- "상세 규칙 문서 목록"에 1행 추가:
  ```
  | 의약품 설명서 표준 | docs/guides/drug-description/DRUG-DESCRIPTION-STANDARD.md (+ WRITING/GROUPING/PROCESS/PIPELINE/CHECK-STANDARD) |
  ```
- §12(플랫폼 개발 참조) 또는 신규 소절에 **불변 1행**만: "의약품 소비자 설명서는 **외부 초안 미생성**(MFDS 원문 grounding), **route·제형 다르면 공유 금지**, **DB write 없이 read-only 조사**가 원칙 — 상세는 drug-description 표준."
- 규칙 본문·§ 세부는 CLAUDE.md에 넣지 않는다(변경 시 guide 한 곳만 수정).

## 8. MEMORY.md 개편안 (제안만)

**현황**: MEMORY.md `약가마스터/표준상품 seed` 섹션에 **배치 진행 상세가 대량 축적**(수십 개 batch 라인). 변하지 않는 규칙과 진행 상태가 혼재.

**제안**:
- MEMORY.md에는 **불변 규칙만** 남기는 짧은 "설명서 규칙 불변식" 블록 신설:
  ```text
  - ATC = 후보 검색용이다 (설명서 그룹핑 기준 아님)
  - 투여경로가 다르면 공유하지 않는다
  - 제형이 다르면 공유하지 않는다
  - 대표 설명서를 우선 수정한다 (신규 설명서는 공유 불가능할 때만 만든다)
  - 설명서 작업은 DB write 없이 read-only 조사 → draft/SPD는 승인·이중게이트 후에만
  - grounding 없으면 추정하지 말고 HOLD_SOURCE
  ```
- **배치 진행 상세는 track memory 파일로 MOVE**(이미 `wo-drug-otc-description-nonoral-track` 등 존재) — MEMORY.md 인덱스에는 track 파일 포인터 1행만 유지.
- 구축 현황 수치는 STANDARD-V1 §13 living tracker를 단일 출처로 삼고 MEMORY.md는 그 링크만.

## 9. 최종 제안 요약 (WO §10)

| 항목 | 제안 |
|---|---|
| 최종 표준 문서 | `docs/guides/drug-description/` 7문서(STANDARD·WRITING·TEMPLATE·GROUPING·PROCESS·**PIPELINE(신규)**·**CHECK-STANDARD(신규)**) + RG registry 유지 |
| CLAUDE.md | 규칙 미포함, 포인터 1행 + 불변 1행만 추가 |
| MEMORY.md | 불변식 6줄 블록 + track 포인터, 배치 상세는 track memory로 이관 |
| Guide 구조 | CS(철학) > WRITING/TEMPLATE/GROUPING/PROCESS(작성·조사) > PIPELINE(DB) > CHECK-STANDARD(기록) |
| WO 최소 규칙 | STANDARD-V1 §14 유지(대상/제외/bucket/키워드/주의문구/템플릿/후속) — 공통은 표준 참조 |
| CHECK 최소 규칙 | 후보·bucket·grounding·대표·HOLD·EXCLUDE·**대표 목록·적용 ProductMaster 수**·DB write 0·필수 표 |

## 10. 변경 없음 확인

- **DB write 0** · 설명서 미작성 · ProductMaster/Candidate 변경 0 · canonical/SPD 변경 0 · Admin 무개발
- **문서 변경**: 본 CHECK 1건 + WO 1건(선행) — **기존 규칙 문서(CS/WG/RG/STANDARD/CHECK) 무수정** (재배치·이관은 후속 APPLY-V1)
- CLAUDE.md·MEMORY.md **미수정**(개편안 제안만)

## 11. 완료 보고 (WO §13)

- **조사 문서 수**: ~119 (설명서 Guide 2 + Registry 1 + WO 27 + CHECK 82 + CLAUDE.md + MEMORY.md + track ~5). Deep-read 18.
- **추출 규칙 수**: **62** (11범주)
- **중복 규칙 수**: **24** (2개 이상 문서 등장; 최다 R23 ATC≠route 7문서)
- **KEEP**: 40 · **MERGE**: 8 · **REMOVE**: 6 · **MOVE**: 8 · **NEW**: 6
- **최종 표준 문서 수**: **7** (기존 3 재배치 + STANDARD 흡수 + **신규 2**: PIPELINE·CHECK-STANDARD) + registry 유지
- **CLAUDE.md 변경 제안**: 포인터 1행 + 불변 1행(규칙 본문 미포함)
- **MEMORY.md 변경 제안**: 불변식 6줄 블록 + 배치 상세 track 이관
- **DB write 0**: ✅
- **commit / push**: (아래 §13)

## 12. 후속 WO

`WO-O4O-DRUG-DESCRIPTION-STANDARD-DOCUMENT-APPLY-V1` — 본 CHECK의 표준 문서 구조·CLAUDE.md·MEMORY.md 개편안을 실제 반영(문서 재배치·PIPELINE/CHECK-STANDARD 신설·중복 축약·포인터 삽입). Major 재구조이므로 별도 승인·실행 지시 필요.

## 13. commit / push

- commit: (본 CHECK 커밋 해시 — 커밋 시 기록)
- push: main
