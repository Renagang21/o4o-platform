# O4O-DRUG-OTC-DESCRIPTION-GROUP-REGISTRY-V1

> **역할:** OTC 의약품 매장용 설명서 그룹의 **중앙 배치 관리 registry**. 여러 작업방/에이전트가 병행 제작할 때 중복 없이 배정·추적하는 단일 출처.
> **설계 근거:** [`WO-...-PARALLEL-BATCH-REGISTRY-DESIGN-V1`](../work-orders/WO-O4O-DRUG-OTC-DESCRIPTION-PARALLEL-BATCH-REGISTRY-DESIGN-V1.md) · [`CHECK-...-PARALLEL-BATCH-REGISTRY-DESIGN-V1`](../checks/CHECK-O4O-DRUG-OTC-DESCRIPTION-PARALLEL-BATCH-REGISTRY-DESIGN-V1.md)
> **상태:** V1 스켈레톤 — 스키마·batch·규칙 확정 + seed 예시. **전체 group_key 행 population은 각 BATCH DRAFT WO가 수행**(candidate 등록).
> **불변식:** 이 파일은 DB가 아니라 문서 registry다. 실제 DB 반영은 별도 승인 후 `product_candidate_description_drafts`/SPD 파이프라인으로만.

---

## 1. 스키마 (컬럼 정의)

| 필드 | 필수 | 의미 | 값 규칙 |
|---|:-:|---|---|
| `group_key` | ✓ | 그룹 고유 키 | §2 형식. registry 내 유일 |
| `ingredient_key` | ✓ | 성분/성분조합 정규화 슬러그 | 로마자 소문자+`_`, 조합은 `_combo` 접미 |
| `strength_key` | ✓ | 함량 또는 농도 | `10mg` / `1pct` / `0.05pct` (병/튜브 용량 아님) |
| `dosage_form` | ✓ | 제형 | tablet / capsule / soft_capsule / cream / gel / ointment / patch / eye_drop / nasal_spray / suppository / vaginal_tablet / troche / gargle |
| `route` | ✓ | 투여경로 | oral / topical / patch / ophthalmic / nasal / rectal / vaginal / oral_local |
| `single_or_combo` | ✓ | 단일/복합 | single / combo |
| `risk_class` | ✓ | 위험도 | normal / review_required / manual_curation |
| `grounding` | ✓ | 근거 수준 | e약은요 건수 또는 sufficient / partial / insufficient |
| `source_check` | ✓ | 후보 출처 CHECK | 파일명 |
| `assigned_batch` | | 배정 batch | §4 batch id ('-'=미배정) |
| `assigned_agent` | | 담당 작업방 | 세션/에이전트 식별자 |
| `status` | ✓ | 현재 상태 | §3 상태값 |
| `draft_check` | | 초안 결과 CHECK | 파일명 |
| `notes` | | 주의사항 | 자유 |

## 2. group_key 표준

```text
drug_otc::{single|combo}::{route}::{ingredient_key}::{strength_key}::{dosage_form}
```

예시:

```text
drug_otc::single::oral::cetirizine_hcl::10mg::tablet
drug_otc::combo::oral::acetaminophen_combo::500mg::tablet
drug_otc::single::ophthalmic::sodium_hyaluronate::0.1pct::eye_drop
drug_otc::single::topical::terbinafine_hcl::1pct::cream
drug_otc::single::vaginal::clotrimazole::100mg::vaginal_tablet
```

**키 규칙:**
- 포장단위·바코드·병 용량·튜브 용량·1회용 개수·파스 매수는 **넣지 않는다**(같은 설명서 공유).
- `strength_key`는 **농도/함량**만. 점안·외용은 `0.5ml`·`20g` 같은 **용기 용량이 아니라** 원문 `%`·`mg/g`·`mg/ml`를 재확인(가이드 §3.10, ROUTE-TEMPLATE §6).
- route가 다르면 **분리**(같은 성분이라도). 예: 클로트리마졸 질정(vaginal) ≠ 클로트리마졸 크림(topical).
- OTC/RX 혼입 그룹은 `notes`에 표기하고 저함량 OTC로 한정하거나 분리(가이드 §3.5).
- `ingredient_key`는 **표기변형 정규화 후** 결정([GROUPING-DICTIONARY-SEED](../checks/CHECK-O4O-DRUG-OTC-DESCRIPTION-GROUPING-DICTIONARY-SEED-V1.md) 사전 사용). 예: 염산세티리진/세티리진염산염 → `cetirizine_hcl`.
- 복합제 `ingredient_key`는 ATC 조합코드 기반 슬러그(성분 나열 대신 대표 조합명)+`_combo`. 예: `acetaminophen_combo`. **R05X 감기약 catch-all은 registry 등록하되 `blocked`**(no_merge).
- 과병합 예외: 인공눈물 S01XA20·정장 생균 A07FA는 ATC가 아니라 **성분별로 분리**한 `ingredient_key`.

## 3. 상태값 (state machine)

```text
candidate ──assign──> assigned ──start──> drafting ──finish──> drafted ──submit CHECK──> (중앙 검토)
   │                                                                                        │
   └──> excluded (대상 아님)                              ┌──────────────────────┬──────────┤
   └──> blocked (근거 부족/기준 불명확)                    ▼                      ▼          ▼
                                                    needs_review          manual_curation  approved_for_import
                                                          │                      │              │
                                                          └──재작업/검토──────────┴─────> approved_for_import ──import──> imported
```

| 상태 | 의미 | 변경 주체 |
|---|---|---|
| `candidate` | 후보 확인됨 | 후보 산출 WO |
| `assigned` | 작업방 배정됨 | 중앙(배치 관리 방) |
| `drafting` | 초안 작성 중 | 작업방 |
| `drafted` | 초안 완료 | 작업방 |
| `needs_review` | 약사/관리자 검토 필요 | 작업방→중앙 |
| `manual_curation` | 수동 큐레이션 필요 | 작업방→중앙 |
| `blocked` | 근거 부족/기준 불명확 | 작업방/중앙 |
| `excluded` | 설명서 대상 제외 | 중앙 |
| `approved_for_import` | import 가능 | **중앙 전용** |
| `imported` | 실제 draft/import 반영 | **중앙 전용** |

> 개별 작업방은 `approved_for_import`·`imported`로 **직접 변경 금지**. 상태 변경은 CHECK 근거를 남긴다.

## 4. batch 정의 (작업방 1개 = batch 1개)

| batch | 대상 | route | 기본 risk_class | 참조 근거 |
|---|---|---|---|---|
| `BATCH-ORAL-SINGLE` | 단일제 경구 | oral | normal/review_required | NORMALIZATION §12 (신규 32) |
| `BATCH-ORAL-COMBO` | 복합제 경구 | oral | review_required | COMBINATION v2 (Key C 137/경구 68) |
| `BATCH-TOPICAL` | 크림/연고/겔 | topical | review_required / **manual**(스테로이드·항생·미백) | HIGH-RISK §4 (외용 146) |
| `BATCH-PATCH` | 파스/첩부 | patch | review_required | HIGH-RISK (파스 41) |
| `BATCH-EYE` | 점안 | ophthalmic | review_required / manual(항생·스테로이드·복합) | HIGH-RISK (점안 44) |
| `BATCH-NASAL` | 점비/비강 | nasal | review_required / manual(충혈완화) | HIGH-RISK |
| `BATCH-RECTAL` | 좌제 | rectal | manual_curation | ROUTE-TEMPLATE §4.5 |
| `BATCH-VAGINAL` | 질정/질좌제 | vaginal | manual_curation | ROUTE-TEMPLATE §4.6 |
| `BATCH-ORAL-LOCAL` | 트로키/구강/가글 | oral_local | review_required | ROUTE-TEMPLATE §4.7 |

민감 약효군(경구피임·수면유도·항혈전·철분·간담도 등, 가이드 §3.9)은 별도 batch가 아니라 각 batch 내에서 `risk_class=review_required` 이상으로 표기.

## 5. registry 행 (seed / 예시)

> 아래는 **형식 예시 + 확정 완료 그룹**이다. 100그룹 후보 전체 population은 각 BATCH DRAFT WO가 `candidate`로 추가한다. `assigned_agent`는 배정 시 기입.

| group_key | ingredient_key | strength_key | dosage_form | route | single_or_combo | risk_class | grounding | source_check | assigned_batch | status | draft_check | notes |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| drug_otc::single::oral::acetaminophen::500mg::tablet | acetaminophen | 500mg | tablet | oral | single | normal | 48 | GUIDE §7.1 | BATCH-ORAL-SINGLE | imported | 50-GROUP | 기작성(완료) |
| drug_otc::single::oral::cetirizine_hcl::10mg::tablet | cetirizine_hcl | 10mg | tablet | oral | single | review_required | 163 | TEMPLATE-5-GROUP | BATCH-ORAL-SINGLE | imported | 5-GROUP | 기작성. 염산세티리진 정규화 |
| drug_otc::single::oral::acetaminophen::325mg::tablet | acetaminophen | 325mg | tablet | oral | single | normal | 28 | NORMALIZATION §13 | BATCH-ORAL-SINGLE | candidate | - | NET 신규(자동초안 후보) |
| drug_otc::combo::oral::acetaminophen_combo::500mg::tablet | acetaminophen_combo | 500mg | tablet | oral | combo | review_required | 4 | COMBINATION v2 §8 | BATCH-ORAL-COMBO | candidate | - | N02BE51. 조합 성분·함량 원문 확인 |
| drug_otc::combo::oral::probiotics_combo::100mg::tablet | probiotics_combo | 100mg | tablet | oral | combo | review_required | 16 | COMBINATION v2 §8 | BATCH-ORAL-COMBO | candidate | - | A07FA51 듀오레플러스정 |
| drug_otc::single::topical::terbinafine_hcl::1pct::cream | terbinafine_hcl | 1pct | cream | topical | single | review_required | sufficient | HIGH-RISK §5 | BATCH-TOPICAL | candidate | - | D01 항진균. 농도 원문 재확인 |
| drug_otc::single::topical::hydrocortisone::1pct::cream | hydrocortisone | 1pct | cream | topical | single | manual_curation | sufficient | HIGH-RISK §6 | BATCH-TOPICAL | candidate | - | D07 스테로이드=수동 |
| drug_otc::single::topical::mupirocin::2pct::ointment | mupirocin | 2pct | ointment | topical | single | manual_curation | sufficient | HIGH-RISK §6 | BATCH-TOPICAL | candidate | - | D06 항생제=수동(내성) |
| drug_otc::single::patch::ketoprofen::30mg::patch | ketoprofen | 30mg | patch | patch | single | review_required | sufficient | HIGH-RISK §5 | BATCH-PATCH | candidate | - | M02 카타플라스마. 광과민 |
| drug_otc::single::ophthalmic::sodium_hyaluronate::0.1pct::eye_drop | sodium_hyaluronate | 0.1pct | eye_drop | ophthalmic | single | review_required | sufficient | HIGH-RISK §5 | BATCH-EYE | candidate | - | S01XA20 성분분리. 용기용량≠농도 |
| drug_otc::single::nasal::xylometazoline_hcl::0.1pct::nasal_spray | xylometazoline_hcl | 0.1pct | nasal_spray | nasal | single | manual_curation | sufficient | HIGH-RISK §5 | BATCH-NASAL | candidate | - | 반동성 비충혈 경고 |
| drug_otc::single::vaginal::clotrimazole::100mg::vaginal_tablet | clotrimazole | 100mg | vaginal_tablet | vaginal | single | manual_curation | 26 | 20-GROUP §13.12 | BATCH-VAGINAL | imported | 20-GROUP | 기작성(수동). 경구금지 |
| drug_otc::combo::oral::cold_combo::-::tablet | cold_combo | - | tablet | oral | combo | manual_curation | mixed | COMBINATION v2 §6 | - | blocked | - | **R05X 감기약 catch-all no_merge** |

## 6. 운영 규칙 요약

1. 작업방은 시작 전 이 registry에서 대상 group_key의 `status`가 `candidate`이고 `assigned_batch`가 자기 batch인지 확인한다.
2. 같은 `group_key`는 한 batch/작업방에만. 표기변형은 §2 정규화 후 판단.
3. 배정 외 그룹을 임의 추가 작성하지 않는다.
4. 충돌 발견 시 새 초안을 쓰지 말고 `notes`에 `conflict:`로 기록하고 중앙에 보고.
5. 상태 변경(특히 `approved_for_import`/`imported`)은 중앙 배치 관리 방에서만.
6. 초안 완료 시 작업방 CHECK(`CHECK-...-[BATCH]-DRAFT-V1`)를 제출하고 `draft_check`에 링크.

---

*V1 · 2026-07-07 · 스키마·batch·규칙 확정. group_key population은 BATCH DRAFT WO 진행 시.*
