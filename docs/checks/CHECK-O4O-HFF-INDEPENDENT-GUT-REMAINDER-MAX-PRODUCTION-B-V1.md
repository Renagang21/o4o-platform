# CHECK — HFF 장·대사·면역 잔여 최대생산 B / 신규 20 STORE LIVE

- WO: **WO-O4O-HFF-INDEPENDENT-GUT-REMAINDER-MAX-PRODUCTION-B-V1** (에이전트 나 / Agent B, 장·배변·대사·면역 잔여).
- 자동 승인 계약: **WO-O4O-HFF-CONTENT-PRODUCTION-AUTO-AUTHORIZATION-CONTRACT-V1** 적용(정본 확정·정적 mapping·config·fixture·generate·dry-run·apply·독립검증·CHECK·push 사전승인).
- 선행 WO(`...-UNLOCK-AND-PRODUCTION-B-V1`, 신규 44) 완결 상태에서 재개. 파이프라인 동일: **B 소유** `hff-sf-b-registry`/`b-select`/`b-generate` + CLEAN 공용 `hff-sf-apply`/`verify`/`compose`. 공용 `hff-sf-registry`/`hff-sf-select`/`hff-nutrient-registry`(Agent C 미커밋 WIP) **미접촉**.

## 1. 생산 결과 (프로덕션 LIVE, apply COMMIT + 독립검증 완료)

| 원료 | slug | tag(`batch:single-functional-*`) | master | ko | en | 유형 |
|------|------|-----|:---:|:---:|:---:|------|
| 표고버섯균사체 | shiitake-mycelium | shiitake-b1 | 5 | 5 | 5 | 신규 발굴(면역·간건강) |
| 청국장균배양정제물 | chungkookjang-culture | chungkookjang-b1 | 2 | 2 | 2 | 신규 발굴(면역) |
| 풋사과추출물 애플페논 | green-apple-applephenon | greenapple-b1 | 1 | 1 | 1 | 신규 발굴(체지방) |
| 바나바잎 | banaba-leaf | banaba-b1 | 2 | 2 | 2 | 잔여(미생산 원료) |
| 베타글루칸 | beta-glucan | betaglucan-b2 | 6 | 6 | 6 | 잔여 확장 |
| 그린커피빈 | green-coffee-bean | greencoffee-b2 | 2 | 2 | 2 | 잔여 확장 |
| 알로에(원료기준) | aloe | aloe-b2 | 1 | 1 | 1 | 잔여 확장 |
| 피니톨 | pinitol | pinitol-b2 | 1 | 1 | 1 | 잔여 확장 |
| **합계** | | | **20** | **20** | **20** | |

- 계약: status=canonical · description_type=STORE · source_type=o4o_hff_generated · source_ref_id=candidate.id · barcode NULL · mfds_permit_number=STTEMNT_NO · candidate=approved_new_master · regulatory_type=건강기능식품.
- **총 DB write = 20×4 = 80** (master INSERT 20 + candidate UPDATE 20 + SPD ko 20 + SPD en 20).
- 누적 B 단일 기능성 = 308(MAX) + 44(UNLOCK) + 20(GUT-REMAINDER) = **372**.

## 2. 신규 원료 발굴 (discovery)

- 미승격 MFDS HFF pure-single 라벨을 장·대사·면역 기능성 키워드로 집계 → 미소유 라벨 추출.
- **표고버섯균사체**(간건강·면역기능 증진), **청국장균배양정제물**(면역기능 증진), **풋사과추출물 애플페논**(체지방 감소) = 신규 registry 추가·생산.
- EN 정적 보강(B_COMPONENT additive): `간건강→liver health` · `체지방 감소→reducing body fat` · `면역력 증진→boosting immunity`(공용 mapFunctionEn 미매핑 benefit만, 임의생성 0). 실제 대부분은 공용 mapFunctionEn 직접 매핑이 우선 적용됨(예 체지방 감소→body-fat reduction, 면역기능 증진→supporting immune function).

## 3. 잔여 재산출 (기존 registry 전체 재-select)

- 기존 registry 원료 전량을 exclude-taken 으로 재-select → **미생산 잔여 ready** 확보: 바나바 2·베타글루칸 6·그린커피 2·피니톨 1·알로에 1(원료기준).
- 바나바잎은 직전 WO 에서 registry 등재되었으나 미생산 → 이번에 안전 복구 2건 생산.

## 4. basis 실패 원인별 분해 (알로에·키토산·가르시니아 등)

| 원료 | 잔여 ready(pre-Guard) | PASS | 정당 배제 | 원인 |
|------|:---:|:---:|:---:|------|
| 가르시니아캄보지아 | 38 | 0 | 36 REVIEW + 2 BLOCKED | HCA(하이드록시시트르산) 지표성분 basis |
| 알로에 | 7 | 1 | 5 REVIEW + 1 BLOCKED | 무수바바로인 지표 basis / 겔·복합 |
| 키토산 | 2 | 0 | 2 REVIEW | 키토산 지표성분 basis / 명칭파생 |
| 알콕시상어간유 | 3 | 0 | 3 REVIEW | 지표성분 basis |
| 홍국·미역등복합·콜레우스·돌외잎·락토페린·이눌린·차전자피·키토올리고·레몬밤·프락토 잔여 | — | 0 | REVIEW/BLOCKED | basis 검증불가 / D-CLAIM / E-NAME |

- Guard(PRE-SRC-BASIS-UNVERIFIABLE-003 / D-CLAIM-GROUNDED-002 / E-NAME-DERIVED-GROUNDED-002)는 지표성분을 제품 원료량으로 오인하지 않도록 **정당 차단**(false positive 아님). 콘텐츠 순화·방어적 축소 없이 REVIEW_LATER 유지, 전체 중지 없이 다음 후보 진행.

## 5. HOLD (도메인 경계 / 정책)

- **밀크씨슬**(간, 33건)·**마늘**(간·콜레스테롤, C pending)·**녹차**(항산화, C 도메인)·**스피루리나/클로렐라**(C 항산화) = 타 에이전트 도메인 경계로 HOLD.
- **인삼·홍삼** = own-track WO 명시 제외. **EPA·DHA·오메가3** = 혈행/눈(C) 도메인. **프로바이오틱스 CFU** = 제외.
- **홍국**(D-CLAIM REVIEW)·**미역등복합추출물 잔티젠**(4 BLOCKED, 복합명칭) = Guard 정당 배제 HOLD.

## 6. 게이트·독립검증 (전 배치 PASS)

- 각 배치 dry-run(exec+rollback, DB write 0) postVerifyPass → apply COMMIT → 독립 새 연결 verify PASS.
- **통합 독립검증(별도 연결, 8 태그)**: totalMasters **20** · ko **20** · en **20** · **canonicalDup 0** · **stmtDupWithinMine 0** · **crossPermitDupWithOthers 0**(A/C 등 타 permit 교집합 0) · candidatesLinked **20**.
- exclude-taken 으로 기존 LIVE 재적재 0 → drift 0. 예상 write == 실제 write. 전체 단일기능성 LIVE(A+B+C) = 1015.

## 7. 콘텐츠 원칙 준수

- 기능성 KO = MAIN_FNCTN 원문 grounded, EN = 공용 mapFunctionEn + B_COMPONENT 정적(임의생성 0).
- 다중 기능성 전부 보존(예 알로에 `피부건강·장 건강·면역력 증진` → skin health, intestinal health, and boosting immunity — 3기능성 병기, 축약 0). 질병·기능성명 회피/약화·방어적 축소 없음. 전문가 상담 footer 유지.

## 8. 준수 요약 (Git / 경계)

- 공용 파일(Agent C WIP) 및 타 세션 OTC WIP(`otc-safety-subgroup-*`) 미접촉. 자기 산출물(`hff-sf-b-registry`/CHECK)만 path-specific commit. `git add .` 미사용 · pnpm-lock 미접촉 · no force push.

*이번 WO 신규 20 STORE canonical LIVE(ko+en) · 누적 B 372 · canonicalDup 0 · A/C 교집합 0 · 독립검증 PASS.*
