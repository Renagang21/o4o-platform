# CHECK — HFF 독립 최대생산 B (장·배변·대사·면역) / 단일 기능성 8원료 308 LIVE

- WO: **WO-O4O-HFF-INDEPENDENT-MAX-PRODUCTION-B-V1** (에이전트 나 / Agent B 독립 소유: 장·배변·대사·면역).
- 성격: 단일 기능성(비-CFU) pure-single 원료를 research→dry-run→apply→독립검증까지 자율 완결.
- 파이프라인: **B 소유 신규 파일**(`hff-sf-b-registry` / `hff-sf-b-select` / `hff-sf-b-generate`) + CLEAN 공용 `hff-sf-apply` / `hff-sf-verify`.

## 1. 공용 파일 동시편집 회피 (핵심 준수)

- 공용 `hff-sf-registry.ts` · `hff-sf-select.ts` 는 **다른 세션(Agent C, 눈·혈행·인지·항산화 도메인) 미커밋 WIP** 상태(은행잎·마리골드·감마리놀렌산·빌베리·스피루리나·클로렐라 + `allowClassified` 필드). → **동시편집 금지** 원칙에 따라 미접촉.
- 대신 Agent B 소유 원료 config 를 **신규 파일 `hff-sf-b-registry.ts`(B_INGREDIENTS)** 에 additive 선언하고, select/generate 를 B 소유 신규 파일로 복제(원료 config 만 주입). `resolveFunctions`/`classify`/`composeSf`/`mapFunctionEn` 등은 **read-only import**(편집·커밋 0).
- apply/verify 는 registry 미의존 CLEAN 모듈 → 무수정 재사용.

## 2. 생산 결과 (프로덕션 LIVE, apply COMMIT 완료)

| 원료 | slug | tag | master | ko | en | canonicalDup |
|------|------|-----|:---:|:---:|:---:|:---:|
| 차전자피식이섬유 | psyllium-husk-fiber | ...-psyllium-b1 | 161 | 161 | 161 | 0 |
| 가르시니아캄보지아 | garcinia-cambogia | ...-garcinia-b1 | 104 | 104 | 104 | 0 |
| 난소화성말토덱스트린 | indigestible-maltodextrin | ...-maltodextrin-b1 | 12 | 12 | 12 | 0 |
| 오비엑스(Ob-X) | ob-x | ...-obx-b1 | 10 | 10 | 10 | 0 |
| 귀리식이섬유 | oat-fiber | ...-oat-fiber-b1 | 8 | 8 | 8 | 0 |
| 이눌린/치커리추출물 | inulin-chicory | ...-inulin-chicory-b1 | 6 | 6 | 6 | 0 |
| 레시틴 | lecithin | ...-lecithin-b1 | 4 | 4 | 4 | 0 |
| 피니톨 | pinitol | ...-pinitol-b1 | 3 | 3 | 3 | 0 |
| **합계** | | | **308** | **308** | **308** | **0** |

- tag 접두: `batch:single-functional-*-b1` · tags = `['import:mfds-hff', TAG, 'wo:hff-single-functional']`.
- 계약: status=canonical · description_type=STORE · source_type=o4o_hff_generated · source_ref_id=candidate.id · barcode NULL · mfds_permit_number=STTEMNT_NO · candidate=approved_new_master · regulatory_type=건강기능식품.
- **총 DB write = 308×4 = 1,232** (master INSERT 308 + candidate UPDATE 308 + SPD ko 308 + SPD en 308).

## 3. 게이트·독립검증 (전 배치 PASS)

- 각 배치: dry-run(exec+rollback, DB write 0) postVerifyPass=true → apply COMMIT → 독립 새 연결 `hff-sf-verify` postVerifyPass=true.
- 통합 독립검증(별도 연결): master **308** · ko **308** · en **308** · **canonicalDup 0** · **cross-tag permit(statementNo) dup 0** · stmtDupMasters 0.
- ALREADY_PROMOTED 0 · master 오연결 0 · exclude-taken 으로 기존 LIVE 재적재 0 → **A/C 교집합 0**(apply candMatch 클린 + statementNo 전역 중복 0로 구조적 보장).
- 예상 write == 실제 write(각 배치 expectedWrites.total == postVerify).

## 4. 콘텐츠 원칙 준수

- 기능성 KO = 제품 MAIN_FNCTN **원문 grounded**, EN = 공용 `mapFunctionEn` 재사용(**임의생성 0**, 미매핑 시 GROUNDING_PENDING 제외).
- **공식 기능성 전부 보존** — 예: 차전자피식이섬유 161건 중 111건 `혈중 콜레스테롤 개선` + `배변활동 원활` **둘 다** 카드 반영(임의 축약 0), 50건은 원문이 배변 단일.
- 매장 하단 **전문가 상담 안내** 유지(`섭취 시 주의사항 · … 전문가와 상담`). 질병·기능성명 회피/약화 없음, 방어적 축소 없음.

## 5. REVIEW_LATER / 제외 (정당 배제, 전체 생산 계속)

- **PRE-SRC-BASIS-UNVERIFIABLE-003 / D-CLAIM-GROUNDED-002 / E-NAME-DERIVED-GROUNDED-002**: 지표성분 기반 표시량(예 알로에 무수바바로인)·검증불가 basis·제품명 EN 파생 불가 → Guard REVIEW/BLOCKED 로 자동 제외. 가르시니아 38(REVIEW 28+BLOCKED 10), 이눌린치커리 1, 차전자피 1, 말토덱스트린 0.
- SERVING 미파싱·BULK·EN 미매핑 → select 단계 review-later (차전자피 37 중 34 = EN 미매핑, 말토덱스트린 4 등).
- **Round 1(키토산·키토올리고당·알로에전잎)**: pure-single 대부분 지표성분 basis 로 Guard REVIEW → 정당 REVIEW_LATER, 미적재.

## 6. PENDING_SHARED (공용 코드 변경 필요 — 기록·스킵)

| 원료 | 공식 기능성(KO) | EN 후보 | 필요 변경 | 예상물량 |
|------|------|------|------|:---:|
| 프락토올리고당 | 장내 유익균 증식 및 배변활동 원활에 도움을 줄 수 있음 | May help increase beneficial intestinal bacteria and support smooth bowel movements | 공용 `hff-nutrient-registry.mapFunctionEn` 에 `장내 유익균 증식` FUNCTION_MAP 추가(Agent C 소유 파일 → 미접촉) | ~10–28 |

- 프로바이오틱스(CFU, 438) = WO 명시 제외. 홍삼·인삼(면역 own-track) = 제외. EPA·DHA·오메가3·녹차·감마리놀렌산·밀크씨슬 = 타 도메인(혈행/항산화/간) → 미청구.

## 7. 준수 요약

- 공용 파일(hff-sf-registry/select) **미접촉·미커밋** · Agent C 미커밋(registry/compose/parse/shard-plan/c-census) 미접촉 · 자기 산출물(hff-sf-b-*)만 path-specific commit · git add . 미사용 · pnpm-lock·타 세션 WIP 미접촉 · no force push.
- read-only 조사 + apply(자동, WO 사전승인 계약) + 독립검증 + rollback manifest 보장.

*단일 기능성 8원료 308 STORE canonical LIVE(ko+en) · canonicalDup 0 · A/C 교집합 0 · 독립검증 PASS.*
