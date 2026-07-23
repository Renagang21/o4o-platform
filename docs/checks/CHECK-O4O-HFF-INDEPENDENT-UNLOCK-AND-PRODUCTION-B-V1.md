# CHECK — HFF 독립 UNLOCK & 생산 B (프락토올리고당·장 기능 잔여 확장) / 신규 44 STORE LIVE

- WO: **WO-O4O-HFF-INDEPENDENT-UNLOCK-AND-PRODUCTION-B-V1** (에이전트 나 / Agent B 독립 소유: 장·배변·대사·면역 잔여 확장).
- 성격: 직전 308 LIVE 이후 잔여 blocker 를 **B 스스로 해소**(EN 미확정·basis 실패)하고, 안전하게 생산 가능한 후보를 프로덕션 LIVE 까지 자율 완결.
- 파이프라인: **B 소유 신규 파일**(`hff-sf-b-registry` / `hff-sf-b-select` / `hff-sf-b-generate`) + CLEAN 공용 `hff-sf-apply` / `hff-sf-verify` / `hff-sf-compose`. 공용 `hff-sf-registry` / `hff-sf-select` / `hff-nutrient-registry`(Agent C 미커밋 WIP) **미접촉**.

## 1. 핵심 UNLOCK — 프락토올리고당 EN 정적 mapping (B 소유)

- 직전 CHECK 의 PENDING_SHARED = 프락토올리고당 `장내 유익균 증식` 이 공용 `mapFunctionEn` 에 미매핑(Agent C 소유 파일 → 미편집).
- 해소: 공용 파일을 건드리지 않고 **B 소유 `hff-sf-b-registry.ts` 에 정적 grounded EN mapping** (`B_COMPONENT` + `mapFunctionEnB` + `resolveFunctionsB`) 추가. 공용 `mapFunctionEn` 을 먼저 시도하고 미매핑 benefit 만 B_COMPONENT 로 보강 → **임의 LLM 생성 0**.
- 확정 KO→EN (MFDS 문체·기존 mapFunctionEn 구조 준수):

| KO 기능성 benefit | EN |
|------|------|
| 장내 유익균 증식 | the growth of beneficial intestinal bacteria |
| 유익균 증식 / 유익균의 증식 | the growth of beneficial bacteria |
| 유해균 억제 / 유해균의 억제 | inhibiting harmful bacteria |
| 배변활동 원활 / 배변활동 | smooth bowel movements |
| 칼슘 흡수 | calcium absorption |
| 장 건강 | intestinal health |
| 피부 건강 | skin health |
| 혈중 콜레스테롤 개선 / 콜레스테롤 개선 | improving blood cholesterol |
| 면역기능 증진 | supporting immune function |

- KO 문구에 기능성이 둘 이상(예 `장내 유익균 증식 및 배변활동 원활`)이면 **분해 후 전부 보존**(하나로 축약 0). "May help ..." join 은 공용 문체 재사용.

## 2. 생산 결과 (프로덕션 LIVE, apply COMMIT + 독립검증 완료)

| 원료 | slug | tag(`batch:single-functional-*-b1`) | master | ko | en |
|------|------|-----|:---:|:---:|:---:|
| 프락토올리고당 | fructooligosaccharide | fructo | 26 | 26 | 26 |
| 알로에(겔/원료 기준) | aloe | aloe | 1 | 1 | 1 |
| 레몬밤 | lemon-balm | lemonbalm | 3 | 3 | 3 |
| 동결건조누에분말 | silkworm-powder | silkworm | 3 | 3 | 3 |
| 그린커피빈 | green-coffee-bean | greencoffee | 1 | 1 | 1 |
| L-카르니틴 | l-carnitine-tartrate | lcarnitine | 1 | 1 | 1 |
| 알콕시글리세롤상어간유 | alkoxyglycerol-shark-liver-oil | alkoxyshark | 3 | 3 | 3 |
| 키토올리고당 | chitooligosaccharide | chitooligo | 1 | 1 | 1 |
| 베타글루칸 | beta-glucan | betaglucan | 5 | 5 | 5 |
| **합계** | | | **44** | **44** | **44** |

- 계약: status=canonical · description_type=STORE · source_type=o4o_hff_generated · source_ref_id=candidate.id · barcode NULL · mfds_permit_number=STTEMNT_NO · candidate=approved_new_master · regulatory_type=건강기능식품.
- **총 DB write = 44×4 = 176** (master INSERT 44 + candidate UPDATE 44 + SPD ko 44 + SPD en 44).

## 3. 게이트·독립검증 (전 배치 PASS)

- 각 배치: dry-run(exec+rollback, DB write 0) postVerifyPass → apply COMMIT → 독립 새 연결 `hff-sf-verify` PASS.
- **통합 독립검증(별도 연결)**: totalMasters **44** · ko **44** · en **44** · **canonicalDup 0** · **stmtDupWithinMine 0** · **crossPermitDupWithOthers 0**(A/C 등 타 permit 교집합 0) · candidatesLinked **44**.
- 프락토올리고당 개별 검증: master26/ko26/en26/canonicalDup0/candidatesLinked26/stmtDupMasters0.
- exclude-taken 으로 기존 LIVE 재적재 0 → A/C 교집합 0(statementNo 전역 중복 0 구조적 보장). 예상 write == 실제 write.

## 4. 알로에·키토산 basis 실패 원인별 분해 (WO TODO B-06/B-07)

pure-single 후보를 원인별로 분해한 결과, **대부분은 정당 배제**이고 안전 복구는 알로에 1건뿐.

| 원인 | 판정 | 처리 |
|------|------|------|
| 지표성분 기준량(무수바바로인/barbaloin basis) | 제품 원료량 아님 → 환산 불가 | REVIEW_LATER (PRE-SRC-BASIS-UNVERIFIABLE-003) |
| 복합형([원료] 2종 이상) | pure-single 아님 | 제외(select 브래킷 필터) |
| 겔/액상/농축액 | 고형 아님 | 제외(LIQUID 필터) |
| 1일 섭취량 환산·원료 기준량(무수물 아님) | 안전 환산 가능 | **생산**(알로에 1) |
| source 표기 변이 | 파싱 실패 | REVIEW_LATER(SERVING_*) |

- Guard 는 지표성분 basis 에 대해 **false positive 아님** — 무수바바로인 등 지표성분을 제품 원료량으로 오인하지 않도록 정당하게 차단. 콘텐츠 순화·방어적 축소 없이 REVIEW_LATER 유지.
- 키토산 pure-single: 안전 복구 가능 신규 0(대부분 복합형·지표성분 basis). 키토올리고당은 별도 1건 생산.

## 5. REVIEW_LATER / HOLD / PENDING_SHARED

- **REVIEW_LATER**: SERVING 미파싱·BULK·지표성분 basis(무수바바로인 등)·EN 미확정 benefit → select/Guard 단계 자동 보류, 전체 중지 없이 다음 후보 계속.
- **HOLD**: 올리고당 계열 다수(자일로/갈락토/이소말토/라피노스/폴리덱스트로스 등)는 serving·등급표기 파싱 실패로 ready 0 → HOLD.
- **PENDING_SHARED**: 없음(프락토올리고당 blocker 는 B 소유 mapping 으로 해소). 프로바이오틱스(CFU)·홍삼 own-track = WO 명시 제외.

## 6. 콘텐츠 원칙 준수

- 기능성 KO = 제품 MAIN_FNCTN **원문 grounded**, EN = 공용 `mapFunctionEn` + B_COMPONENT **정적 grounded**(임의생성 0).
- 공식 기능성 전부 보존(둘 이상이면 분해 후 병기). 질병·기능성명 회피/약화·방어적 축소 없음. 매장 하단 전문가 상담 안내 유지.

## 7. 준수 요약 (Git / 경계)

- 공용 `hff-sf-registry`/`hff-sf-select`/`hff-nutrient-registry`(Agent C 미커밋 WIP) **미접촉·미커밋**. 타 세션 OTC WIP(`otc-safety-subgroup-*`) 미접촉.
- 자기 산출물(`hff-sf-b-registry`/`hff-sf-b-select`/CHECK)만 path-specific commit. `git add .` 미사용 · pnpm-lock 미접촉 · no force push.
- read-only 조사 + apply(WO 사전승인 계약) + 독립검증 + rollback manifest 보장.

*이번 WO 신규 44 STORE canonical LIVE(ko+en) · 누적 B 단일 기능성 352(308+44) · canonicalDup 0 · A/C 교집합 0 · 독립검증 PASS.*
