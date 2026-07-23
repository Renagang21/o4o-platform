# CHECK — HFF 지표성분 basis 검증·잔여 대량 생산 B / 신규 101 STORE LIVE

- WO: **WO-O4O-HFF-INDEPENDENT-BASIS-UNLOCK-B-V1** (에이전트 나 / Agent B, 장·배변·대사·면역 basis 검증·잔여 대량 생산).
- 자동 승인 계약: **WO-O4O-HFF-CONTENT-PRODUCTION-AUTO-AUTHORIZATION-CONTRACT-V1** 적용(공식 환산 근거 조사·B 전용 verifier/config/fixture·generate·dry-run·apply·독립검증·CHECK·push 사전승인).
- 선행: `...-UNLOCK-AND-PRODUCTION-B-V1`(44) + `...-GUT-REMAINDER-MAX-PRODUCTION-B-V1`(20) 완결 상태에서 재개. 파이프라인 동일: **B 소유** `hff-sf-b-registry`/`b-select`/`b-generate`/`b-census` + CLEAN 공용 `hff-sf-apply`/`verify`/`compose`. 공용 `hff-sf-registry`/`hff-sf-select`/`hff-nutrient-registry`(Agent C 미커밋 WIP) **미접촉**.

## 1. basis 가설 실증 결과 (WO 핵심)

- **핵심 발견: 이 콘텐츠 타입에서 "지표성분 vs 원료량 혼동"은 구조적으로 발생 불가.** `composeSf` 본문은 **용량/mg/g/지표성분 함량을 일절 임베드하지 않는다** — 원료명·공식 기능성(MAIN_FNCTN grounded)·섭취방법(1일 N회·1회 N정 = 정수 단위, mg 아님)·성상·유통기한·주의사항만 구성. grounding=`{declaredAmount:null, serving:null, calculationAllowed:false}`. 따라서 WO 전체 중지 조건의 "지표성분과 원료량의 광범위한 혼동"은 이 매장용 설명서 산출물에는 해당하지 않음.
- 실제 "차단군"의 정체 = ① **GROUNDING_PENDING_EN**(공식 기능성의 EN 미매핑 — false negative, 보완 대상) ② generate-stage Guard **E-NAME-DERIVED-GROUNDED-002**(제품명 토큰이 공식 기능성과 우연 일치) ③ **D-CLAIM-GROUNDED/UNGROUNDED**(마케팅 클레임) ④ **PRE-SRC-BASIS-UNVERIFIABLE-003**(진짜 지표성분 basis 우려 — 정당 차단) ⑤ **Q-TRUNCATED**(원문 절단).
- 안전 복구 기준 = `select ready` ∩ `generate runGuard PASS`. 유일 승격 opt-in = **`--accept-grounded-name`** (E-NAME-DERIVED-GROUNDED-002 만이 유일한 비-PASS 사유인 항목만 승격 — BLOCKED/D-CLAIM/PRE-SRC-BASIS/Q-TRUNCATED 는 절대 승격 안 함). Agent C `hff-sf-generate --accept-grounded-name` 과 동일 semantics.

## 2. 확정한 공식 basis 규칙 (grounded false-negative 보완, 임의생성 0)

`hff-sf-b-registry.ts` `mapFunctionEnB` 를 공식 MFDS 기능성 문구 파서로 강화(각 fragment 는 `B_COMPONENT` anchored-exact 정규식에 정확히 일치해야 하며, 하나라도 미매핑이면 전체 pending → 오생성 0):

- 분해자: `…에 도움을 줄 수 있음` 완결구를 콤마 경계로 치환 → 콤마/중점/및 로 분해((가)(나) 다항 기능성 전부 보존). **`과/와` 는 어절 내부(과체중 등) 오분할 위험으로 제외.**
- 분류 꼬리표((기타기능II)/고시형/개별인정형)·따옴표·(가)(나) 라벨 제거 후 매핑.
- 신규 `B_COMPONENT` 공식 EN(전부 MFDS 표준 영문): 식후 혈당상승 억제→suppressing the rise in blood sugar after meals · 혈중 중성지질 개선→improving blood triglyceride levels · 유산균 증식→the growth of lactic acid bacteria · 과체중인 성인의 체지방 감소→reducing body fat in overweight adults · (높은) 혈중 콜레스테롤 수치(의) 개선→improving blood cholesterol levels · 건강한 혈당의 유지→maintaining healthy blood sugar levels.

## 3. 생산 결과 (프로덕션 LIVE, apply COMMIT + 독립검증 완료 — 신규 101)

| 단계 | 원료 | 신규 |
|------|------|:---:|
| B-04 가르시니아 | garcinia-cambogia | 25 |
| READY pool | chitosan 1 · lemon-balm 1 · lactoferrin 1 · gynostemma-leaf 1 · alkoxyglycerol-shark-liver-oil 3 | 7 |
| EN 보완 재생산 | psyllium-husk-fiber 32 · shiitake-mycelium 6 · red-yeast-rice 2 · chitosan 2 · xylooligosaccharide 2 · inulin-chicory 1 · alkoxyglycerol-shark-liver-oil 1 · indigestible-maltodextrin 1 · fructooligosaccharide 1 | 48 |
| B-11 discovery | conjugated-linoleic-acid(CLA) 18 · pine-needle-distillate 2 · policosanol 1 | 21 |
| **합계** | | **101** |

- 계약: status=canonical · description_type=STORE · source_type=o4o_hff_generated · source_ref_id=candidate.id · barcode NULL · mfds_permit_number=STTEMNT_NO · candidate=approved_new_master · regulatory_type=건강기능식품.
- **총 DB write = 101×4 = 404** (master INSERT 101 + candidate UPDATE 101 + SPD ko 101 + SPD en 101).

## 4. 신규 원료 발굴 (discovery — A/C 미청구·own-track 아님, 전부 대사 도메인)

- **공액리놀레산(CLA)** — 과체중인 성인의 체지방 감소(대사). 최대 발굴 22 ready → PASS 18 / BLOCKED 4(D-CLAIM-UNGROUNDED-001 3·Q-TRUNCATED 1 정당 차단).
- **솔잎증류농축액** — 건강한 혈당의 유지 2. **폴리코사놀** — 혈중 콜레스테롤 수치 개선 1(개별인정형 라벨, `도움이 됨` 종결형 1건은 pending 유지).
- 도메인 경계 배제(스캐너 OTHER 필터): 관절/피부/눈/혈행/인지/항산화/간건강/인삼·홍삼/오메가/프로바이오틱스 = A/C·own-track.

## 5. 정당 배제 / 잔여 (HOLD — 공식 환산 근거 미확정)

- **가르시니아 잔여 13** = generate Guard 정당 REVIEW/BLOCKED(D-CLAIM-GROUNDED-002 7 · PRE-SRC-BASIS-UNVERIFIABLE-003 3 · Q-TRUNCATED). HCA 지표성분 basis 정당 차단 유지.
- **알로에** = 무수바바로인 지표 basis(PRE-SRC-BASIS) + 겔/액상 LIQUID 제외 + 원문 추출 결손(`장 건강에 도움에 도움을`, 이중 도움/부분 추출). 안전 복구 0.
- **미역등복합(잔티젠) 4** = 복합 명칭 Q-TRUNCATED-002 BLOCKED. **콜레우스·바나바** = D-CLAIM/E-NAME REVIEW + BLOCKED.
- **원문 추출 결손(source-side)** = `<NO_KO_EXTRACTED>`, 용량 bleed(`0~44 g) (나)…`), 삼중 중복(`콜레스테롤 개선 콜레스테롤 개선…`), 가르시니아 기전 문장, L-카르니틴 운동피로, 라피노스 `하는데` 변형 = 안전 grounding 불가로 pending 유지(임의 보완 안 함).

## 6. 게이트·독립검증 (전 배치 PASS)

- 각 배치 dry-run(exec+rollback, DB write 0) postVerifyPass=true → apply COMMIT → 예상 write == 실제 write.
- **통합 독립검증(별도 신규 연결, 18 태그)**: baseline→now delta **bCumulativeLive = 101**(= 신규 생산 정확 일치) · myTaggedMasters=myKo=myEn=candidatesLinked(전 master 완결) · **canonicalDup 0** · **stmtDupWithinMine 0** · **crossPermitDupWithOthers 0**(A/C 등 타 permit 교집합 0).
- INSERT-only(기존 SPD UPDATE 0) + canonicalDup 0 → **기존 LIVE drift 0**. exclude-taken 으로 기존 LIVE 재적재 0. (all-total delta +16 · store row delta 초과분 = 동시 A/C 생산, 내 permit 교집합 0.)

## 7. 콘텐츠 원칙 준수

- 기능성 KO = MAIN_FNCTN 원문 grounded, EN = 공용 mapFunctionEn + B_COMPONENT 정적(임의생성 0). 체지방 감소·혈당·콜레스테롤·배변활동·면역기능 등 공식 표현 축소·회피·약화 0. 다항 기능성 전부 보존(예 psyllium `improving blood cholesterol and smooth bowel movements`, xylo 3기능성 병기). mg/g/HCA/지표성분 함량 본문 임베드 0. 근거 밖 치료·예방 표현 0. 전문가 상담 footer 유지.

## 8. 준수 요약 (Git / 경계)

- 공용 파일(Agent C WIP: hff-sf-registry/select/nutrient-registry) 및 타 세션 OTC WIP(`otc-safety-subgroup-*`·`otc-combo-leaflet-*`·`otc-topical-*`) **미접촉**. 자기 산출물(`hff-sf-b-registry`/`hff-sf-b-generate`/`hff-sf-b-census`/CHECK)만 path-specific commit. `git add .` 미사용 · pnpm-lock 미접촉 · no force push.

*이번 WO 신규 101 STORE canonical LIVE(ko+en) · 누적 B 549 · canonicalDup 0 · A/C 교집합 0 · 기존 LIVE drift 0 · 독립검증 PASS. basis 가설 실증: 매장용 설명서에는 지표성분/원료량 혼동 구조적 불가, 실제 차단=EN false-negative(보완) + Guard 정당 차단(유지).*
