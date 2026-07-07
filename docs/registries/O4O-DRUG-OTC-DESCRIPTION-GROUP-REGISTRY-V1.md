# O4O-DRUG-OTC-DESCRIPTION-GROUP-REGISTRY-V1

> **역할:** OTC 의약품 매장용 설명서 그룹의 **중앙 배치 관리 registry**. 여러 작업방/에이전트가 병행 제작할 때 중복 없이 배정·추적하는 단일 출처.
> **설계 근거:** [`WO-...-PARALLEL-BATCH-REGISTRY-DESIGN-V1`](../work-orders/WO-O4O-DRUG-OTC-DESCRIPTION-PARALLEL-BATCH-REGISTRY-DESIGN-V1.md) · [`CHECK-...-PARALLEL-BATCH-REGISTRY-DESIGN-V1`](../checks/CHECK-O4O-DRUG-OTC-DESCRIPTION-PARALLEL-BATCH-REGISTRY-DESIGN-V1.md)
> **상태:** V1 populated (2026-07-07, POPULATE WO) — **177행** 등록: 적용완료 66(`imported`) + 100그룹 후보(단일 32 + 복합 68, `candidate`) + 비경구 route 대표 11(`candidate`). group_key 중복 0. route 전량 enumeration(외용 146·점안 44·파스 41 등)은 각 route batch DRAFT WO가 추가.
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

## 5. registry 행 (populated V1 — 177행)

> **채움 출처(WO POPULATE-V1):** 적용 완료 66(product_candidate_description_drafts, `imported`) + 100그룹 후보(단일 32 + 복합 68, `candidate`) + 비경구 route 대표 11(`candidate`, 전량 enumeration은 route batch WO). group_key 중복 **0**. ingredient_key = 단일=성분 정규화 토큰(공백·기호 제거, 로마자화는 후속 기계 작업), 복합=ATC 조합코드 슬러그+`_combo`, route 대표=로마자. strength_key = 농도/함량(밀리그램→mg·마이크로그램→ug·IU→iu·그램→g·밀리리터→ml·없음→na).

| group_key | ingredient_key | strength_key | dosage_form | route | single_or_combo | risk_class | grounding | source_check | assigned_batch | status | draft_check | notes |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| drug_otc::single::oral::폴산::1mg::tablet | 폴산 | 1mg | tablet | oral | single | normal | 18 | 50G/apply(20g) | BATCH-ORAL-SINGLE | imported | otc-draft-v1 |  |
| drug_otc::single::oral::나프록센::250mg::soft_capsule | 나프록센 | 250mg | soft_capsule | oral | single | review_required | 87 | 50G/apply(20g) | BATCH-ORAL-SINGLE | imported | otc-draft-v1 |  |
| drug_otc::single::oral::니자티딘::75mg::tablet | 니자티딘 | 75mg | tablet | oral | single | normal | 21 | 50G/apply(20g) | BATCH-ORAL-SINGLE | imported | otc-draft-v1 |  |
| drug_otc::single::oral::디오스민::600mg::tablet | 디오스민 | 600mg | tablet | oral | single | normal | 64 | 50G/apply(20g) | BATCH-ORAL-SINGLE | imported | otc-draft-v1 |  |
| drug_otc::single::oral::디오스민::300mg::capsule | 디오스민 | 300mg | capsule | oral | single | normal | 45 | 50G/apply(20g) | BATCH-ORAL-SINGLE | imported | otc-draft-v1 |  |
| drug_otc::single::oral::로라타딘::10mg::tablet | 로라타딘 | 10mg | tablet | oral | single | normal | 41 | 50G/apply(20g) | BATCH-ORAL-SINGLE | imported | otc-draft-v1 |  |
| drug_otc::single::oral::아스피린::100mg::tablet | 아스피린 | 100mg | tablet | oral | single | review_required | 105 | 50G/apply(20g) | BATCH-ORAL-SINGLE | imported | otc-draft-v1 |  |
| drug_otc::single::oral::파모티딘::10mg::tablet | 파모티딘 | 10mg | tablet | oral | single | review_required | 104 | 50G/apply(20g) | BATCH-ORAL-SINGLE | imported | otc-draft-v1 |  |
| drug_otc::single::oral::브로멜라인::100mg::tablet | 브로멜라인 | 100mg | tablet | oral | single | normal | 86 | 50G/apply(20g) | BATCH-ORAL-SINGLE | imported | otc-draft-v1 |  |
| drug_otc::single::oral::알파칼시돌::0.5ug::soft_capsule | 알파칼시돌 | 0.5ug | soft_capsule | oral | single | review_required | 29 | 50G/apply(20g) | BATCH-ORAL-SINGLE | imported | otc-draft-v1 |  |
| drug_otc::single::oral::엘카르니틴::330mg::tablet | 엘카르니틴 | 330mg | tablet | oral | single | normal | 42 | 50G/apply(20g) | BATCH-ORAL-SINGLE | imported | otc-draft-v1 |  |
| drug_otc::single::vaginal::클로트리마졸::100mg::vaginal_tablet | 클로트리마졸 | 100mg | vaginal_tablet | vaginal | single | manual_curation | 26 | 20G §13.12 | BATCH-VAGINAL | imported | otc-draft-v1 | 질정·경구금지·질내삽입 |
| drug_otc::single::oral::아세틸시스테인::200mg::capsule | 아세틸시스테인 | 200mg | capsule | oral | single | normal | 228 | 50G/apply(20g) | BATCH-ORAL-SINGLE | imported | otc-draft-v1 |  |
| drug_otc::single::oral::암브록솔염산염::30mg::tablet | 암브록솔염산염 | 30mg | tablet | oral | single | normal | 71 | 50G/apply(20g) | BATCH-ORAL-SINGLE | imported | otc-draft-v1 |  |
| drug_otc::single::oral::독시라민숙신산염::25mg::tablet | 독시라민숙신산염 | 25mg | tablet | oral | single | review_required | 19 | 50G/apply(20g) | BATCH-ORAL-SINGLE | imported | otc-draft-v1 |  |
| drug_otc::single::oral::펙소페나딘염산염::120mg::tablet | 펙소페나딘염산염 | 120mg | tablet | oral | single | normal | 29 | 50G/apply(20g) | BATCH-ORAL-SINGLE | imported | otc-draft-v1 |  |
| drug_otc::single::oral::펙소페나딘염산염::60mg::tablet | 펙소페나딘염산염 | 60mg | tablet | oral | single | normal | 36 | 50G/apply(20g) | BATCH-ORAL-SINGLE | imported | otc-draft-v1 |  |
| drug_otc::single::oral::디펜히드라민염산염::50mg::soft_capsule | 디펜히드라민염산염 | 50mg | soft_capsule | oral | single | review_required | 15 | 50G/apply(20g) | BATCH-ORAL-SINGLE | imported | otc-draft-v1 |  |
| drug_otc::single::oral::클로닉신리시네이트::125mg::tablet | 클로닉신리시네이트 | 125mg | tablet | oral | single | review_required | 51 | 50G/apply(20g) | BATCH-ORAL-SINGLE | imported | otc-draft-v1 |  |
| drug_otc::single::oral::바실루스리케니포르미스균::250mg::capsule | 바실루스리케니포르미스균 | 250mg | capsule | oral | single | normal | 88 | 50G/apply(20g) | BATCH-ORAL-SINGLE | imported | otc-draft-v1 |  |
| drug_otc::single::oral::비오틴::5mg::tablet | 비오틴 | 5mg | tablet | oral | single | normal | 19 | 50G/apply(50g) | BATCH-ORAL-SINGLE | imported | otc-draft-v1 |  |
| drug_otc::single::oral::로라타딘::10mg::soft_capsule | 로라타딘 | 10mg | soft_capsule | oral | single | normal | 12 | 50G/apply(50g) | BATCH-ORAL-SINGLE | imported | otc-draft-v1 |  |
| drug_otc::single::oral::소브레롤::200mg::capsule | 소브레롤 | 200mg | capsule | oral | single | normal | 15 | 50G/apply(50g) | BATCH-ORAL-SINGLE | imported | otc-draft-v1 |  |
| drug_otc::single::oral::덱스판테놀::100mg::tablet | 덱스판테놀 | 100mg | tablet | oral | single | normal | 21 | 50G/apply(50g) | BATCH-ORAL-SINGLE | imported | otc-draft-v1 |  |
| drug_otc::single::oral::메코발라민::500ug::capsule | 메코발라민 | 500ug | capsule | oral | single | normal | 10 | 50G/apply(50g) | BATCH-ORAL-SINGLE | imported | otc-draft-v1 |  |
| drug_otc::single::oral::브로멜라인::45mg::tablet | 브로멜라인 | 45mg | tablet | oral | single | normal | 14 | 50G/apply(50g) | BATCH-ORAL-SINGLE | imported | otc-draft-v1 |  |
| drug_otc::single::oral::알파칼시돌::1ug::soft_capsule | 알파칼시돌 | 1ug | soft_capsule | oral | single | review_required | 10 | 50G/apply(50g) | BATCH-ORAL-SINGLE | imported | otc-draft-v1 |  |
| drug_otc::single::oral::이부프로펜::200mg::soft_capsule | 이부프로펜 | 200mg | soft_capsule | oral | single | review_required | 46 | 50G/apply(50g) | BATCH-ORAL-SINGLE | imported | otc-draft-v1 |  |
| drug_otc::single::oral::이부프로펜::200mg::tablet | 이부프로펜 | 200mg | tablet | oral | single | review_required | 14 | 50G/apply(50g) | BATCH-ORAL-SINGLE | imported | otc-draft-v1 |  |
| drug_otc::single::oral::이부프로펜::400mg::soft_capsule | 이부프로펜 | 400mg | soft_capsule | oral | single | review_required | 28 | 50G/apply(50g) | BATCH-ORAL-SINGLE | imported | otc-draft-v1 |  |
| drug_otc::single::oral::플루벤다졸::500mg::tablet | 플루벤다졸 | 500mg | tablet | oral | single | normal | 7 | 50G/apply(50g) | BATCH-ORAL-SINGLE | imported | otc-draft-v1 |  |
| drug_otc::single::oral::니푸록사지드::200mg::capsule | 니푸록사지드 | 200mg | capsule | oral | single | normal | 19 | 50G/apply(50g) | BATCH-ORAL-SINGLE | imported | otc-draft-v1 |  |
| drug_otc::single::oral::데소게스트렐::0.075mg::tablet | 데소게스트렐 | 0.075mg | tablet | oral | single | review_required | 6 | 50G/apply(50g) | BATCH-ORAL-SINGLE | imported | otc-draft-v1 |  |
| drug_otc::single::oral::덱시부프로펜::300mg::tablet | 덱시부프로펜 | 300mg | tablet | oral | single | normal | 97 | 50G/apply(50g) | BATCH-ORAL-SINGLE | imported | otc-draft-v1 |  |
| drug_otc::single::oral::에르도스테인::300mg::tablet | 에르도스테인 | 300mg | tablet | oral | single | normal | 30 | 50G/apply(50g) | BATCH-ORAL-SINGLE | imported | otc-draft-v1 |  |
| drug_otc::single::oral::침강탄산칼슘::500mg::tablet | 침강탄산칼슘 | 500mg | tablet | oral | single | normal | 11 | 50G/apply(50g) | BATCH-ORAL-SINGLE | imported | otc-draft-v1 |  |
| drug_otc::single::oral::세티리진염산염::10mg::soft_capsule | 세티리진염산염 | 10mg | soft_capsule | oral | single | normal | 23 | 50G/apply(50g) | BATCH-ORAL-SINGLE | imported | otc-draft-v1 |  |
| drug_otc::single::oral::수산화마그네슘::500mg::tablet | 수산화마그네슘 | 500mg | tablet | oral | single | normal | 15 | 50G/apply(50g) | BATCH-ORAL-SINGLE | imported | otc-draft-v1 |  |
| drug_otc::single::oral::시트룰린말산염::500mg::tablet | 시트룰린말산염 | 500mg | tablet | oral | single | normal | 14 | 50G/apply(50g) | BATCH-ORAL-SINGLE | imported | otc-draft-v1 |  |
| drug_otc::single::oral::아세트아미노펜::650mg::tablet | 아세트아미노펜 | 650mg | tablet | oral | single | normal | 78 | 50G/apply(50g) | BATCH-ORAL-SINGLE | imported | otc-draft-v1 |  |
| drug_otc::single::oral::아세트아미노펜::325mg::soft_capsule | 아세트아미노펜 | 325mg | soft_capsule | oral | single | normal | 24 | 50G/apply(50g) | BATCH-ORAL-SINGLE | imported | otc-draft-v1 |  |
| drug_otc::single::oral::아세트아미노펜::160mg::tablet | 아세트아미노펜 | 160mg | tablet | oral | single | normal | 12 | 50G/apply(50g) | BATCH-ORAL-SINGLE | imported | otc-draft-v1 |  |
| drug_otc::single::oral::아세틸시스테인::100mg::capsule | 아세틸시스테인 | 100mg | capsule | oral | single | normal | 18 | 50G/apply(50g) | BATCH-ORAL-SINGLE | imported | otc-draft-v1 |  |
| drug_otc::single::oral::은행엽건조엑스::80mg::tablet | 은행엽건조엑스 | 80mg | tablet | oral | single | review_required | 10 | 50G/apply(50g) | BATCH-ORAL-SINGLE | imported | otc-draft-v1 | 저grounding |
| drug_otc::single::oral::탄산수소나트륨::500mg::tablet | 탄산수소나트륨 | 500mg | tablet | oral | single | normal | 14 | 50G/apply(50g) | BATCH-ORAL-SINGLE | imported | otc-draft-v1 |  |
| drug_otc::single::oral::포도엽건조엑스::180mg::capsule | 포도엽건조엑스 | 180mg | capsule | oral | single | review_required | 7 | 50G/apply(50g) | BATCH-ORAL-SINGLE | imported | otc-draft-v1 | 저grounding |
| drug_otc::single::oral::로페라미드염산염::2mg::capsule | 로페라미드염산염 | 2mg | capsule | oral | single | normal | 19 | 50G/apply(50g) | BATCH-ORAL-SINGLE | imported | otc-draft-v1 |  |
| drug_otc::single::oral::우르소데옥시콜산::100mg::tablet | 우르소데옥시콜산 | 100mg | tablet | oral | single | normal | 13 | 50G/apply(50g) | BATCH-ORAL-SINGLE | imported | otc-draft-v1 |  |
| drug_otc::single::oral::펙소페나딘염산염::60mg::soft_capsule | 펙소페나딘염산염 | 60mg | soft_capsule | oral | single | normal | 9 | 50G/apply(50g) | BATCH-ORAL-SINGLE | imported | otc-draft-v1 |  |
| drug_otc::single::oral::이부프로펜아르기닌::368.9mg::tablet | 이부프로펜아르기닌 | 368.9mg | tablet | oral | single | review_required | 8 | 50G/apply(50g) | BATCH-ORAL-SINGLE | imported | otc-draft-v1 |  |
| drug_otc::single::oral::클로닉신리시네이트::125mg::soft_capsule | 클로닉신리시네이트 | 125mg | soft_capsule | oral | single | review_required | 29 | 50G/apply(50g) | BATCH-ORAL-SINGLE | imported | otc-draft-v1 |  |
| drug_otc::single::oral::트리메부틴말레산염::200mg::tablet | 트리메부틴말레산염 | 200mg | tablet | oral | single | normal | 39 | 50G/apply(50g) | BATCH-ORAL-SINGLE | imported | otc-draft-v1 |  |
| drug_otc::single::oral::트리메부틴말레산염::150mg::tablet | 트리메부틴말레산염 | 150mg | tablet | oral | single | normal | 49 | 50G/apply(50g) | BATCH-ORAL-SINGLE | imported | otc-draft-v1 |  |
| drug_otc::single::oral::폴리사카리드철착염::326.1mg::capsule | 폴리사카리드철착염 | 326.1mg | capsule | oral | single | normal | 11 | 50G/apply(50g) | BATCH-ORAL-SINGLE | imported | otc-draft-v1 |  |
| drug_otc::single::oral::결정글루코사민황산염::250mg::capsule | 결정글루코사민황산염 | 250mg | capsule | oral | single | normal | 10 | 50G/apply(50g) | BATCH-ORAL-SINGLE | imported | otc-draft-v1 |  |
| drug_otc::single::oral::아르기닌티디아시케이트::200mg::soft_capsule | 아르기닌티디아시케이트 | 200mg | soft_capsule | oral | single | review_required | 7 | 50G/apply(50g) | BATCH-ORAL-SINGLE | imported | otc-draft-v1 | 저grounding |
| drug_otc::single::oral::락토바실루스아시도필루스균::300mg::capsule | 락토바실루스아시도필루스균 | 300mg | capsule | oral | single | normal | 13 | 50G/apply(50g) | BATCH-ORAL-SINGLE | imported | otc-draft-v1 |  |
| drug_otc::single::oral::사카로마이세스보울라르디균::282.5mg::capsule | 사카로마이세스보울라르디균 | 282.5mg | capsule | oral | single | normal | 11 | 50G/apply(50g) | BATCH-ORAL-SINGLE | imported | otc-draft-v1 |  |
| drug_otc::single::oral::엔테로코쿠스페슘스트레인세르넬레68균::30mg::capsule | 엔테로코쿠스페슘스트레인세르넬레68균 | 30mg | capsule | oral | single | normal | 27 | 50G/apply(50g) | BATCH-ORAL-SINGLE | imported | otc-draft-v1 |  |
| drug_otc::single::oral::L시스틴::500mg::soft_capsule | L시스틴 | 500mg | soft_capsule | oral | single | normal | 8 | 50G/apply(50g) | BATCH-ORAL-SINGLE | imported | otc-draft-v1 |  |
| drug_otc::single::oral::알벤다졸::400mg::tablet | 알벤다졸 | 400mg | tablet | oral | single | normal | 92 | 50G/apply(5g) | BATCH-ORAL-SINGLE | imported | otc-draft-v1 |  |
| drug_otc::single::oral::알마게이트::500mg::tablet | 알마게이트 | 500mg | tablet | oral | single | normal | 124 | 50G/apply(5g) | BATCH-ORAL-SINGLE | imported | otc-draft-v1 |  |
| drug_otc::single::oral::나프록센나트륨::275mg::tablet | 나프록센나트륨 | 275mg | tablet | oral | single | review_required | 96 | 50G/apply(5g) | BATCH-ORAL-SINGLE | imported | otc-draft-v1 |  |
| drug_otc::single::oral::세티리진염산염::10mg::tablet | 세티리진염산염 | 10mg | tablet | oral | single | normal | 163 | 50G/apply(5g) | BATCH-ORAL-SINGLE | imported | otc-draft-v1 |  |
| drug_otc::single::oral::트리메부틴말레산염::100mg::tablet | 트리메부틴말레산염 | 100mg | tablet | oral | single | normal | 127 | 50G/apply(5g) | BATCH-ORAL-SINGLE | imported | otc-draft-v1 |  |
| drug_otc::single::oral::에르도스테인::300mg::capsule | 에르도스테인 | 300mg | capsule | oral | single | normal | 373 | 50G/apply(pilot) | BATCH-ORAL-SINGLE | imported | otc-draft-v1 |  |
| drug_otc::single::oral::아세트아미노펜::325mg::tablet | 아세트아미노펜 | 325mg | tablet | oral | single | normal | 28 | NORMALIZATION §13 (N02BE01) | BATCH-ORAL-SINGLE | candidate | - | 자동초안 후보 |
| drug_otc::single::oral::브롬화부틸스코폴라민::10mg::tablet | 브롬화부틸스코폴라민 | 10mg | tablet | oral | single | normal | 7 | NORMALIZATION §13 (A03BB01) | BATCH-ORAL-SINGLE | candidate | - | 자동초안 후보 |
| drug_otc::single::oral::비타민이::1000iu::soft_capsule | 비타민이 | 1000iu | soft_capsule | oral | single | normal | 14 | NORMALIZATION §13 (A11HA03) | BATCH-ORAL-SINGLE | candidate | - | 자동초안 후보 |
| drug_otc::single::oral::밀크시슬엑스::350mg::soft_capsule | 밀크시슬엑스 | 350mg | soft_capsule | oral | single | review_required | 3 | NORMALIZATION §13 (A05BA03) | BATCH-ORAL-SINGLE | candidate | - |  |
| drug_otc::single::oral::은행엽엑스::120mg::tablet | 은행엽엑스 | 120mg | tablet | oral | single | review_required | 3 | NORMALIZATION §13 (N06DX02) | BATCH-ORAL-SINGLE | candidate | - |  |
| drug_otc::single::oral::은행엽엑스::40mg::tablet | 은행엽엑스 | 40mg | tablet | oral | single | review_required | 3 | NORMALIZATION §13 (N06DX02) | BATCH-ORAL-SINGLE | candidate | - |  |
| drug_otc::single::oral::미세정제플라보노이드분획물::500mg::tablet | 미세정제플라보노이드분획물 | 500mg | tablet | oral | single | review_required | 4 | NORMALIZATION §13 (C05CA53) | BATCH-ORAL-SINGLE | candidate | - |  |
| drug_otc::single::oral::덱시부프로펜::150mg::tablet | 덱시부프로펜 | 150mg | tablet | oral | single | review_required | 5 | NORMALIZATION §13 (M01AE14) | BATCH-ORAL-SINGLE | candidate | - |  |
| drug_otc::single::oral::아세트아미노펜::350mg::tablet | 아세트아미노펜 | 350mg | tablet | oral | single | review_required | 3 | NORMALIZATION §13 (N02BE01) | BATCH-ORAL-SINGLE | candidate | - |  |
| drug_otc::single::oral::인산벤프로페린::26.33mg::tablet | 인산벤프로페린 | 26.33mg | tablet | oral | single | review_required | 3 | NORMALIZATION §13 (R05DB02) | BATCH-ORAL-SINGLE | candidate | - |  |
| drug_otc::single::oral::비타민이::100mg::soft_capsule | 비타민이 | 100mg | soft_capsule | oral | single | review_required | 5 | NORMALIZATION §13 (A11HA03) | BATCH-ORAL-SINGLE | candidate | - |  |
| drug_otc::single::oral::콘드로이친황산나트륨::400mg::capsule | 콘드로이친황산나트륨 | 400mg | capsule | oral | single | review_required | 4 | NORMALIZATION §13 (M01AX25) | BATCH-ORAL-SINGLE | candidate | - |  |
| drug_otc::single::oral::아세트아미노펜::80mg::tablet | 아세트아미노펜 | 80mg | tablet | oral | single | review_required | 3 | NORMALIZATION §13 (N02BE01) | BATCH-ORAL-SINGLE | candidate | - |  |
| drug_otc::single::oral::아스피린::100mg::capsule | 아스피린 | 100mg | capsule | oral | single | review_required | 17 | NORMALIZATION §13 (B01AC06) | BATCH-ORAL-SINGLE | candidate | - |  |
| drug_otc::single::oral::건조수산화알루미늄겔::392mg::tablet | 건조수산화알루미늄겔 | 392mg | tablet | oral | single | review_required | 11 | NORMALIZATION §13 (A02AB01) | BATCH-ORAL-SINGLE | candidate | - |  |
| drug_otc::single::oral::콜레칼시페롤과립::10mg::tablet | 콜레칼시페롤과립 | 10mg | tablet | oral | single | review_required | 9 | NORMALIZATION §13 (A11CC05) | BATCH-ORAL-SINGLE | candidate | - |  |
| drug_otc::single::oral::카페인무수물::50mg::tablet | 카페인무수물 | 50mg | tablet | oral | single | review_required | 9 | NORMALIZATION §13 (N06BC01) | BATCH-ORAL-SINGLE | candidate | - |  |
| drug_otc::single::oral::바실루스리케니포르미스균::500mg::capsule | 바실루스리케니포르미스균 | 500mg | capsule | oral | single | review_required | 8 | NORMALIZATION §13 (A07FA01) | BATCH-ORAL-SINGLE | candidate | - |  |
| drug_otc::single::oral::폴산::0.4mg::tablet | 폴산 | 0.4mg | tablet | oral | single | review_required | 8 | NORMALIZATION §13 (B03BB01) | BATCH-ORAL-SINGLE | candidate | - |  |
| drug_otc::single::oral::브롬헥신염산염::8mg::tablet | 브롬헥신염산염 | 8mg | tablet | oral | single | review_required | 7 | NORMALIZATION §13 (R05CB02) | BATCH-ORAL-SINGLE | candidate | - |  |
| drug_otc::single::oral::철아세틸트랜스페린::200mg::capsule | 철아세틸트랜스페린 | 200mg | capsule | oral | single | review_required | 6 | NORMALIZATION §13 (B03AB08) | BATCH-ORAL-SINGLE | candidate | - |  |
| drug_otc::single::oral::아셀렌산나트륨오수화물::0.333mg::tablet | 아셀렌산나트륨오수화물 | 0.333mg | tablet | oral | single | review_required | 6 | NORMALIZATION §13 (A12CE02) | BATCH-ORAL-SINGLE | candidate | - |  |
| drug_otc::single::oral::바실루스리케니포르미스균::200mg::capsule | 바실루스리케니포르미스균 | 200mg | capsule | oral | single | review_required | 6 | NORMALIZATION §13 (A07FA01) | BATCH-ORAL-SINGLE | candidate | - |  |
| drug_otc::single::oral::바실루스리케니포르미스균::100mg::tablet | 바실루스리케니포르미스균 | 100mg | tablet | oral | single | review_required | 3 | NORMALIZATION §13 (A07FA01) | BATCH-ORAL-SINGLE | candidate | - |  |
| drug_otc::single::oral::밀크시슬엑스::175mg::soft_capsule | 밀크시슬엑스 | 175mg | soft_capsule | oral | single | review_required | 2 | NORMALIZATION §13 (A05BA03) | BATCH-ORAL-SINGLE | candidate | - | 저grounding(e약은요<=2) |
| drug_otc::single::oral::아스코르빈산::1000mg::tablet | 아스코르빈산 | 1000mg | tablet | oral | single | review_required | 2 | NORMALIZATION §13 (A11GA01) | BATCH-ORAL-SINGLE | candidate | - | 저grounding(e약은요<=2) |
| drug_otc::single::oral::나프록센::250mg::tablet | 나프록센 | 250mg | tablet | oral | single | review_required | 2 | NORMALIZATION §13 (M01AE02) | BATCH-ORAL-SINGLE | candidate | - | 저grounding(e약은요<=2) |
| drug_otc::single::oral::디시클로민염산염::10mg::capsule | 디시클로민염산염 | 10mg | capsule | oral | single | review_required | 2 | NORMALIZATION §13 (A03AA07) | BATCH-ORAL-SINGLE | candidate | - | 저grounding(e약은요<=2) |
| drug_otc::single::oral::건조하이페리시엑스::300mg::tablet | 건조하이페리시엑스 | 300mg | tablet | oral | single | review_required | 2 | NORMALIZATION §13 (N06AX25) | BATCH-ORAL-SINGLE | candidate | - | 저grounding(e약은요<=2) |
| drug_otc::single::oral::이부프로펜::200mg::capsule | 이부프로펜 | 200mg | capsule | oral | single | review_required | 2 | NORMALIZATION §13 (M01AE01) | BATCH-ORAL-SINGLE | candidate | - | 저grounding(e약은요<=2) |
| drug_otc::single::oral::니코틴산아미드::500mg::tablet | 니코틴산아미드 | 500mg | tablet | oral | single | review_required | 1 | NORMALIZATION §13 (A11HA01) | BATCH-ORAL-SINGLE | candidate | - | 저grounding(e약은요<=2) |
| drug_otc::single::oral::덱시부프로펜::300mg::capsule | 덱시부프로펜 | 300mg | capsule | oral | single | review_required | 1 | NORMALIZATION §13 (M01AE14) | BATCH-ORAL-SINGLE | candidate | - | 저grounding(e약은요<=2) |
| drug_otc::combo::oral::m03bb53_combo::150mg::tablet | m03bb53_combo | 150mg | tablet | oral | combo | review_required | 64 | 100-GROUP §부록A | BATCH-ORAL-COMBO | candidate | - | 담엔쿨정 |
| drug_otc::combo::oral::a06ab52_combo::5mg::tablet | a06ab52_combo | 5mg | tablet | oral | combo | review_required | 53 | 100-GROUP §부록A | BATCH-ORAL-COMBO | candidate | - | 비센큐정 |
| drug_otc::combo::oral::m09ab52_combo::40mg::tablet | m09ab52_combo | 40mg | tablet | oral | combo | review_required | 44 | 100-GROUP §부록A | BATCH-ORAL-COMBO | candidate | - | 인플라정 |
| drug_otc::combo::oral::n02be51_combo::500mg::tablet | n02be51_combo | 500mg | tablet | oral | combo | review_required | 40 | 100-GROUP §부록A | BATCH-ORAL-COMBO | candidate | - | 편해정 |
| drug_otc::combo::oral::m01ae51_combo::200mg::soft_capsule | m01ae51_combo | 200mg | soft_capsule | oral | combo | review_required | 36 | 100-GROUP §부록A | BATCH-ORAL-COMBO | candidate | - | 퓨어펜연질캡슐 |
| drug_otc::combo::oral::r01ba52_combo::60mg::tablet | r01ba52_combo | 60mg | tablet | oral | combo | review_required | 34 | 100-GROUP §부록A | BATCH-ORAL-COMBO | candidate | - | 가네카정 |
| drug_otc::combo::oral::a06ab52_combo::16.75mg::tablet | a06ab52_combo | 16.75mg | tablet | oral | combo | review_required | 32 | 100-GROUP §부록A | BATCH-ORAL-COMBO | candidate | - | 씨락정 |
| drug_otc::combo::oral::m01ae51_combo::400mg::soft_capsule | m01ae51_combo | 400mg | soft_capsule | oral | combo | review_required | 24 | 100-GROUP §부록A | BATCH-ORAL-COMBO | candidate | - | 이브엔연질캡슐 |
| drug_otc::combo::oral::a06ab52_combo::55mg::tablet | a06ab52_combo | 55mg | tablet | oral | combo | review_required | 19 | 100-GROUP §부록A | BATCH-ORAL-COMBO | candidate | - | 쾌통정 |
| drug_otc::combo::oral::r01ba52_combo::60mg::liquid | r01ba52_combo | 60mg | liquid | oral | combo | review_required | 18 | 100-GROUP §부록A | BATCH-ORAL-COMBO | candidate | - | 액소도스정 |
| drug_otc::combo::oral::m01ae51_combo::200mg::tablet | m01ae51_combo | 200mg | tablet | oral | combo | review_required | 17 | 100-GROUP §부록A | BATCH-ORAL-COMBO | candidate | - | 원펜정 |
| drug_otc::combo::oral::a02ba53_combo::10mg::tablet | a02ba53_combo | 10mg | tablet | oral | combo | review_required | 17 | 100-GROUP §부록A | BATCH-ORAL-COMBO | candidate | - | 파모컴정 |
| drug_otc::combo::oral::n02be51_combo::400mg::tablet | n02be51_combo | 400mg | tablet | oral | combo | review_required | 14 | 100-GROUP §부록A | BATCH-ORAL-COMBO | candidate | - | 수프리정 |
| drug_otc::combo::oral::n02be51_combo::450mg::tablet | n02be51_combo | 450mg | tablet | oral | combo | review_required | 12 | 100-GROUP §부록A | BATCH-ORAL-COMBO | candidate | - | 다아펜정 |
| drug_otc::combo::oral::r01ba52_combo::5ml::liquid | r01ba52_combo | 5ml | liquid | oral | combo | review_required | 12 | 100-GROUP §부록A | BATCH-ORAL-COMBO | candidate | - | 챔프노즈시럽 |
| drug_otc::combo::oral::a06ab52_combo::6mg::tablet | a06ab52_combo | 6mg | tablet | oral | combo | review_required | 11 | 100-GROUP §부록A | BATCH-ORAL-COMBO | candidate | - | 비사린정 |
| drug_otc::combo::oral::r01ba53_combo::500ml::liquid | r01ba53_combo | 500ml | liquid | oral | combo | review_required | 11 | 100-GROUP §부록A | BATCH-ORAL-COMBO | candidate | - | 콜민-에이시럽 |
| drug_otc::combo::oral::r01ba53_combo::10mg::tablet | r01ba53_combo | 10mg | tablet | oral | combo | review_required | 10 | 100-GROUP §부록A | BATCH-ORAL-COMBO | candidate | - | 콜민-에이정 |
| drug_otc::combo::oral::a06ab52_combo::10mg::tablet | a06ab52_combo | 10mg | tablet | oral | combo | review_required | 10 | 100-GROUP §부록A | BATCH-ORAL-COMBO | candidate | - | 이지굿정 |
| drug_otc::combo::oral::r01ba53_combo::na::liquid | r01ba53_combo | na | liquid | oral | combo | review_required | 9 | 100-GROUP §부록A | BATCH-ORAL-COMBO | candidate | - | 콜민-에이시럽 |
| drug_otc::combo::oral::n02be51_combo::300mg::tablet | n02be51_combo | 300mg | tablet | oral | combo | review_required | 8 | 100-GROUP §부록A | BATCH-ORAL-COMBO | candidate | - | 속콜펜정 |
| drug_otc::combo::oral::m01ae51_combo::368.9mg::tablet | m01ae51_combo | 368.9mg | tablet | oral | combo | review_required | 8 | 100-GROUP §부록A | BATCH-ORAL-COMBO | candidate | - | 캐롤에프정 |
| drug_otc::combo::oral::a04ad51_combo::20ml::liquid | a04ad51_combo | 20ml | liquid | oral | combo | review_required | 8 | 100-GROUP §부록A | BATCH-ORAL-COMBO | candidate | - | 오네론액 |
| drug_otc::combo::oral::r01ba52_combo::30mg::capsule | r01ba52_combo | 30mg | capsule | oral | combo | review_required | 8 | 100-GROUP §부록A | BATCH-ORAL-COMBO | candidate | - | 코코엔캡슐 |
| drug_otc::combo::oral::a06ab52_combo::100mg::tablet | a06ab52_combo | 100mg | tablet | oral | combo | review_required | 7 | 100-GROUP §부록A | BATCH-ORAL-COMBO | candidate | - | 비카린엠장용정 |
| drug_otc::combo::oral::r06ab54_combo::3mg::capsule | r06ab54_combo | 3mg | capsule | oral | combo | review_required | 7 | 100-GROUP §부록A | BATCH-ORAL-COMBO | candidate | - | 감콜파워캡슐 |
| drug_otc::combo::oral::n02be51_combo::14.888g::liquid | n02be51_combo | 14.888g | liquid | oral | combo | review_required | 7 | 100-GROUP §부록A | BATCH-ORAL-COMBO | candidate | - | 테라플루데이타임건조시럽 |
| drug_otc::combo::oral::a06ab52_combo::20mg::soft_capsule | a06ab52_combo | 20mg | soft_capsule | oral | combo | review_required | 6 | 100-GROUP §부록A | BATCH-ORAL-COMBO | candidate | - | 센스락유연질캡슐 |
| drug_otc::combo::oral::r06ab54_combo::0.13mg::capsule | r06ab54_combo | 0.13mg | capsule | oral | combo | review_required | 6 | 100-GROUP §부록A | BATCH-ORAL-COMBO | candidate | - | 시노카엔캡슐 |
| drug_otc::combo::oral::n02be51_combo::na::liquid | n02be51_combo | na | liquid | oral | combo | review_required | 6 | 100-GROUP §부록A | BATCH-ORAL-COMBO | candidate | - | 테라플루데이타임건조시럽 |
| drug_otc::combo::oral::r01ba52_combo::2.5mg::tablet | r01ba52_combo | 2.5mg | tablet | oral | combo | review_required | 6 | 100-GROUP §부록A | BATCH-ORAL-COMBO | candidate | - | 러지피드정 |
| drug_otc::combo::oral::a06ab52_combo::3mg::liquid | a06ab52_combo | 3mg | liquid | oral | combo | review_required | 6 | 100-GROUP §부록A | BATCH-ORAL-COMBO | candidate | - | 액티큐정 |
| drug_otc::combo::oral::r01ba52_combo::na::liquid | r01ba52_combo | na | liquid | oral | combo | review_required | 5 | 100-GROUP §부록A | BATCH-ORAL-COMBO | candidate | - | 액티피드시럽 |
| drug_otc::combo::oral::a06ab52_combo::12mg::tablet | a06ab52_combo | 12mg | tablet | oral | combo | review_required | 5 | 100-GROUP §부록A | BATCH-ORAL-COMBO | candidate | - | 듀오그린정 |
| drug_otc::combo::oral::a06ab52_combo::15mg::tablet | a06ab52_combo | 15mg | tablet | oral | combo | review_required | 5 | 100-GROUP §부록A | BATCH-ORAL-COMBO | candidate | - | 디유비정 |
| drug_otc::combo::oral::a06ac51_combo::4g::granule | a06ac51_combo | 4g | granule | oral | combo | review_required | 4 | 100-GROUP §부록A | BATCH-ORAL-COMBO | candidate | - | 아락실과립 |
| drug_otc::combo::oral::c05ca53_combo::500mg::tablet | c05ca53_combo | 500mg | tablet | oral | combo | review_required | 4 | 100-GROUP §부록A | BATCH-ORAL-COMBO | candidate | - | 프라본정 |
| drug_otc::combo::oral::a04ad51_combo::25mg::tablet | a04ad51_combo | 25mg | tablet | oral | combo | review_required | 4 | 100-GROUP §부록A | BATCH-ORAL-COMBO | candidate | - | 메카인정 |
| drug_otc::combo::oral::m01ae51_combo::75mg::tablet | m01ae51_combo | 75mg | tablet | oral | combo | review_required | 4 | 100-GROUP §부록A | BATCH-ORAL-COMBO | candidate | - | 그날엔정 |
| drug_otc::combo::oral::a06ab52_combo::21mg::soft_capsule | a06ab52_combo | 21mg | soft_capsule | oral | combo | review_required | 4 | 100-GROUP §부록A | BATCH-ORAL-COMBO | candidate | - | 이지클린장용연질캡슐 |
| drug_otc::combo::oral::r06ab54_combo::10mg::capsule | r06ab54_combo | 10mg | capsule | oral | combo | review_required | 4 | 100-GROUP §부록A | BATCH-ORAL-COMBO | candidate | - | 콘택골드캡슐 |
| drug_otc::combo::oral::a06ab52_combo::50mg::tablet | a06ab52_combo | 50mg | tablet | oral | combo | review_required | 4 | 100-GROUP §부록A | BATCH-ORAL-COMBO | candidate | - | 아락실큐정 |
| drug_otc::combo::oral::r01ba52_combo::200mg::soft_capsule | r01ba52_combo | 200mg | soft_capsule | oral | combo | review_required | 4 | 100-GROUP §부록A | BATCH-ORAL-COMBO | candidate | - | 레티코연질캡슐 |
| drug_otc::combo::oral::m01ae51_combo::250mg::soft_capsule | m01ae51_combo | 250mg | soft_capsule | oral | combo | review_required | 4 | 100-GROUP §부록A | BATCH-ORAL-COMBO | candidate | - | 도나펜알파연질캡슐 |
| drug_otc::combo::oral::r01ba52_combo::500ml::liquid | r01ba52_combo | 500ml | liquid | oral | combo | review_required | 4 | 100-GROUP §부록A | BATCH-ORAL-COMBO | candidate | - | 액티피드시럽 |
| drug_otc::combo::oral::a04ad51_combo::20mg::tablet | a04ad51_combo | 20mg | tablet | oral | combo | review_required | 4 | 100-GROUP §부록A | BATCH-ORAL-COMBO | candidate | - | 키미테정 |
| drug_otc::combo::oral::a06ab52_combo::3mg::tablet | a06ab52_combo | 3mg | tablet | oral | combo | review_required | 4 | 100-GROUP §부록A | BATCH-ORAL-COMBO | candidate | - | 뉴코딜정 |
| drug_otc::combo::oral::m03bb53_combo::25mg::tablet | m03bb53_combo | 25mg | tablet | oral | combo | review_required | 4 | 100-GROUP §부록A | BATCH-ORAL-COMBO | candidate | - | 스카풀라정 |
| drug_otc::combo::oral::m03bb53_combo::300mg::tablet | m03bb53_combo | 300mg | tablet | oral | combo | review_required | 3 | 100-GROUP §부록A | BATCH-ORAL-COMBO | candidate | - | 리렉사정 |
| drug_otc::combo::oral::n02be51_combo::250mg::tablet | n02be51_combo | 250mg | tablet | oral | combo | review_required | 3 | 100-GROUP §부록A | BATCH-ORAL-COMBO | candidate | - | 사리돈에이정 |
| drug_otc::combo::oral::a02ba53_combo::800mg::tablet | a02ba53_combo | 800mg | tablet | oral | combo | review_required | 3 | 100-GROUP §부록A | BATCH-ORAL-COMBO | candidate | - | 파모콤푸츄정 |
| drug_otc::combo::oral::r06ab54_combo::100ml::liquid | r06ab54_combo | 100ml | liquid | oral | combo | review_required | 3 | 100-GROUP §부록A | BATCH-ORAL-COMBO | candidate | - | 베비맥시럽 |
| drug_otc::combo::oral::r01ba52_combo::100ml::liquid | r01ba52_combo | 100ml | liquid | oral | combo | review_required | 3 | 100-GROUP §부록A | BATCH-ORAL-COMBO | candidate | - | 모드콜노즈시럽 |
| drug_otc::combo::oral::r01ba53_combo::4mg::tablet | r01ba53_combo | 4mg | tablet | oral | combo | review_required | 3 | 100-GROUP §부록A | BATCH-ORAL-COMBO | candidate | - | 코비안에스정 |
| drug_otc::combo::oral::r01ba52_combo::90ml::liquid | r01ba52_combo | 90ml | liquid | oral | combo | review_required | 3 | 100-GROUP §부록A | BATCH-ORAL-COMBO | candidate | - | 액티피드시럽 |
| drug_otc::combo::oral::a06ab52_combo::6mg::soft_capsule | a06ab52_combo | 6mg | soft_capsule | oral | combo | review_required | 2 | 100-GROUP §부록A | BATCH-ORAL-COMBO | candidate | - | 듀얼싹플러스장용연질캡슐·저grounding(2) |
| drug_otc::combo::oral::r06aa52_combo::45mg::tablet | r06aa52_combo | 45mg | tablet | oral | combo | review_required | 2 | 100-GROUP §부록A | BATCH-ORAL-COMBO | candidate | - | 파인에스정·저grounding(2) |
| drug_otc::combo::oral::m09ab52_combo::1mg::tablet | m09ab52_combo | 1mg | tablet | oral | combo | review_required | 2 | 100-GROUP §부록A | BATCH-ORAL-COMBO | candidate | - | 트로멜정·저grounding(2) |
| drug_otc::combo::oral::n02be51_combo::400mg::soft_capsule | n02be51_combo | 400mg | soft_capsule | oral | combo | review_required | 2 | 100-GROUP §부록A | BATCH-ORAL-COMBO | candidate | - | 그날엔에이스연질캡슐·저grounding(2) |
| drug_otc::combo::oral::r06ab54_combo::15mg::tablet | r06ab54_combo | 15mg | tablet | oral | combo | review_required | 2 | 100-GROUP §부록A | BATCH-ORAL-COMBO | candidate | - | 세리펙에스정·저grounding(2) |
| drug_otc::combo::oral::r01ba53_combo::10mg::soft_capsule | r01ba53_combo | 10mg | soft_capsule | oral | combo | review_required | 2 | 100-GROUP §부록A | BATCH-ORAL-COMBO | candidate | - | 노즈그린연질캡슐·저grounding(2) |
| drug_otc::combo::oral::a06ac51_combo::na::granule | a06ac51_combo | na | granule | oral | combo | review_required | 1 | 100-GROUP §부록A | BATCH-ORAL-COMBO | candidate | - | 아락실과립·저grounding(1) |
| drug_otc::combo::oral::r06ab54_combo::na::liquid | r06ab54_combo | na | liquid | oral | combo | review_required | 1 | 100-GROUP §부록A | BATCH-ORAL-COMBO | candidate | - | 베비맥시럽·저grounding(1) |
| drug_otc::combo::oral::r06ab54_combo::60ml::liquid | r06ab54_combo | 60ml | liquid | oral | combo | review_required | 1 | 100-GROUP §부록A | BATCH-ORAL-COMBO | candidate | - | 베비맥시럽·저grounding(1) |
| drug_otc::combo::oral::p03ac51_combo::na::liquid | p03ac51_combo | na | liquid | oral | combo | review_required | 1 | 100-GROUP §부록A | BATCH-ORAL-COMBO | candidate | - | 라이센드플러스액·저grounding(1) |
| drug_otc::combo::oral::r01ba52_combo::75ml::liquid | r01ba52_combo | 75ml | liquid | oral | combo | review_required | 1 | 100-GROUP §부록A | BATCH-ORAL-COMBO | candidate | - | 코스펜에이시럽·저grounding(1) |
| drug_otc::combo::oral::r06ab54_combo::30mg::capsule | r06ab54_combo | 30mg | capsule | oral | combo | review_required | 1 | 100-GROUP §부록A | BATCH-ORAL-COMBO | candidate | - | 하벤유에스캡슐·저grounding(1) |
| drug_otc::combo::oral::a04ad51_combo::na::liquid | a04ad51_combo | na | liquid | oral | combo | review_required | 1 | 100-GROUP §부록A | BATCH-ORAL-COMBO | candidate | - | 토스롱액·저grounding(1) |
| drug_otc::single::topical::terbinafine_hcl::1pct::cream | terbinafine_hcl | 1pct | cream | topical | single | review_required | sufficient | HIGH-RISK §5 | BATCH-TOPICAL | candidate | - | D01 항진균. 농도 원문 재확인. 대표군 |
| drug_otc::single::topical::hydrocortisone::1pct::cream | hydrocortisone | 1pct | cream | topical | single | manual_curation | sufficient | HIGH-RISK §6 | BATCH-TOPICAL | candidate | - | D07 스테로이드=수동. 대표군 |
| drug_otc::single::topical::mupirocin::2pct::ointment | mupirocin | 2pct | ointment | topical | single | manual_curation | sufficient | HIGH-RISK §6 | BATCH-TOPICAL | candidate | - | D06 항생=수동. 대표군 |
| drug_otc::single::topical::hydroquinone::2pct::cream | hydroquinone | 2pct | cream | topical | single | manual_curation | partial | HIGH-RISK §5 | BATCH-TOPICAL | candidate | - | D11 미백=수동. 대표군 |
| drug_otc::single::patch::ketoprofen::30mg::patch | ketoprofen | 30mg | patch | patch | single | review_required | sufficient | HIGH-RISK §5 | BATCH-PATCH | candidate | - | M02 파스. 광과민·NSAID중복. 대표군 |
| drug_otc::single::ophthalmic::sodium_hyaluronate::0.1pct::eye_drop | sodium_hyaluronate | 0.1pct | eye_drop | ophthalmic | single | review_required | sufficient | HIGH-RISK §5 | BATCH-EYE | candidate | - | S01XA20 성분분리. 용기용량≠농도. 대표군 |
| drug_otc::single::ophthalmic::ketotifen_fumarate::0.025pct::eye_drop | ketotifen_fumarate | 0.025pct | eye_drop | ophthalmic | single | review_required | sufficient | HIGH-RISK §5 | BATCH-EYE | candidate | - | S01GX08 항알레르기. 대표군 |
| drug_otc::single::nasal::xylometazoline_hcl::0.1pct::nasal_spray | xylometazoline_hcl | 0.1pct | nasal_spray | nasal | single | manual_curation | sufficient | HIGH-RISK §5 | BATCH-NASAL | candidate | - | 반동성 비충혈=수동. 대표군 |
| drug_otc::single::nasal::sodium_chloride::0.9pct::nasal_spray | sodium_chloride | 0.9pct | nasal_spray | nasal | single | review_required | sufficient | HIGH-RISK §5 | BATCH-NASAL | candidate | - | 비강세척. 대표군 |
| drug_otc::single::rectal::acetaminophen::300mg::suppository | acetaminophen | 300mg | suppository | rectal | single | manual_curation | sufficient | HIGH-RISK §5 | BATCH-RECTAL | candidate | - | 해열 좌제. 경구금지. 대표군 |
| drug_otc::single::oral_local::cetylpyridinium_chloride::-::troche | cetylpyridinium_chloride | na | troche | oral_local | single | review_required | partial | ROUTE-TEMPLATE §4.7 | BATCH-ORAL-LOCAL | candidate | - | 인후 트로키. 삼킴금지. 대표군 |

## 6. 운영 규칙 요약

1. 작업방은 시작 전 이 registry에서 대상 group_key의 `status`가 `candidate`이고 `assigned_batch`가 자기 batch인지 확인한다.
2. 같은 `group_key`는 한 batch/작업방에만. 표기변형은 §2 정규화 후 판단.
3. 배정 외 그룹을 임의 추가 작성하지 않는다.
4. 충돌 발견 시 새 초안을 쓰지 말고 `notes`에 `conflict:`로 기록하고 중앙에 보고.
5. 상태 변경(특히 `approved_for_import`/`imported`)은 중앙 배치 관리 방에서만.
6. 초안 완료 시 작업방 CHECK(`CHECK-...-[BATCH]-DRAFT-V1`)를 제출하고 `draft_check`에 링크.

---

*V1 · 2026-07-07 · 스키마·batch·규칙 확정. group_key population은 BATCH DRAFT WO 진행 시.*
