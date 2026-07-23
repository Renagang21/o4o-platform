# CHECK — WO-O4O-OTC-TOPICAL-STORE-LEAFLET-CONTINUOUS-PRODUCTION-DA-V5

- **작성**: 에이전트 다 · 2026-07-23
- **판정**: **PASS (최소 정족 ≥400 master 달성 — 443 master)**
- **트랙**: 피부 외용제(topical skin) OTC 매장 설명서 KO+EN canonical 연속 생산
- **파이프라인**: `apps/api-server/src/scripts/drug-otc-topical-store-leaflet-batch.ts` (검증된 V4 러너 재사용 — 재설계 없음, V5 추가분은 oral-misphrase 정규화 게이트 확장뿐)

## 1. 세션 산출 총계

| 항목 | 값 |
|---|---|
| 신규 fp 그룹 | **214** (정족 ≥40 초과) |
| 신규 master | **443** (정족 ≥400 달성) |
| 누적 LIVE (o4o_drug_otc_topical, ko) | 402 → **845** |
| 누적 LIVE (en) | **845** (ko=en, drift 0) |
| KO write | 1,772 (443×4T) |
| EN write | 886 (443×2T) |
| canonicalDup | **0** |
| easy canonical 잔존(demote 누락) | **0** |
| audit(canonical_replaced) 세션 증가 | 443 (총 854 = V2 106 + V4라벨 748) |
| no-op 재실행 | 전 그룹 producedFps 0 확인 |

> ⚠️ audit metadata `wo` 값은 당시 러너 하드코딩으로 `...DA-V4` 라벨 유지 — 본 세션(V5) 기록도 V4 라벨로 적재됨. 카운트·target·source 연결은 정상이므로 재적재하지 않고 본 예외 기록만 유지. 카운트 정합은 세션 전후 delta로 확인.
> 하드코딩은 61e31b54d에서 제거됨 — 이후 신규 audit부터 실제 WO ID 기록 (해석 우선순위: `--wo-id` > EN config `woId`/`wo` > env `TOPICAL_WO_ID` > 미지정 시 실행 중지).

## 2. 그룹별 실적 (ingredient×form → fp/masters)

| # | 그룹 | fp | masters |
|---|---|---|---|
| 1 | 무피로신\|연고 | - | 39 |
| 2 | 퓨시드산나트륨\|연고 | - | 28 |
| 3 | 프레드니솔론VA\|크림 | - | 26 |
| 4 | 프레드니솔론VA\|로션 | - | 5 |
| 5 | 티로트리신\|겔 | - | 26 |
| 6 | 히드로퀴논\|크림 | - | 23 |
| 7 | 클로트리마졸\|크림 | - | 14 |
| 8 | 부테나핀염산염\|크림 | - | 13 |
| 9 | 구아야줄렌\|크림 | - | 17 |
| 10 | 구아야줄렌\|연고 | - | 14 |
| 11 | 테르비나핀염산염\|액 (3서브런: 어루러기/족부백선/조갑) | 25 | 41 |
| 12 | 이소코나졸질산염\|크림 | 4 | 10 |
| 13 | 케토코나졸\|크림 | 5 | 5 |
| 14 | 아젤라산\|크림 | 4 | 8 |
| 15 | 요소\|연고 | 6 | 8 |
| 16 | 덱스판테놀·D-판테놀\|연고 (a+b 2서브런) | 10 | 12 |
| 17 | 포비돈요오드 (연고5+스왑47+거즈볼48+탈지면54) | 48 | 154 |
| | **합계** | **214** | **443** |

포비돈 액 서브런은 apply 시 0건 — 액 10 master는 스왑/거즈/탈지면 form 토큰 중복으로 선행 서브런에서 이미 커버(순차 배제 정상 동작).

## 3. HOLD 목록

| 그룹 | 사유 | 규모 |
|---|---|---|
| 프라목신염산염\|크림 | mucosa-adjacent (치질·항문 전용 — WO 리도카인 준용 후순위) | 17 |
| 포비돈요오드\|액 잔여 | HOLD_EFF_MISMATCH — 질세정·구강스프레이·수술자 손스크럽·수술부위 어플리케이터 (점막/전문용, 피부 상처소독 트랙 제외 정당) | 11fp/13 |
| 가글액·질좌제 | routeSig 비-topical로 select 단계 배제 | 24 |

## 4. V5 러너 변경 (재설계 아님 — misphrase 정규화 게이트만)

`normalizeOralMisphrase` topical-clarity 게이트: `/외용으로만|외용으로 사용|도포|바르|바릅|발라/` (활용형 바릅/발라 추가 — 포비돈 스왑류 "환부에 적당량을 바릅니다"가 미매칭되어 HOLD_KO 오탐하던 것 해소) + `/내복용/→'먹는 용도'` 재표현 ("안과용 및 내복용으로 사용하지 마십시오" 정당 외용 경고의 `복용` 부분열 가드 오탐 해소). 의미 보존 재표현만 수행, `/복용|삼키/` 잔존 가드는 불변.

## 5. 커밋 목록 (전부 origin/main push 완료)

| 커밋 | 내용 |
|---|---|
| f136f47b6 | claim 파일 초기 선점 |
| 6497d6ab2 | checkpoint 1 (무피로신~부테나핀) |
| 0940ab5f4 | checkpoint 2 (러너 misphrase 1차 + 구아야줄렌·테르비나핀) |
| 7ac91ca53 | checkpoint 3 (러너 게이트 확장 + 아졸계·요소·판테놀·포비돈 48fp/154 + claim DONE/RELEASED) |
| (본 문서) | CHECK doc |

## 6. 재개 지점 (V6 후속)

claim `otc-production-claim.da.json`에서 RELEASED 상태로 반납된 풀:
미녹시딜|겔·스프레이·액 36 · 시클로피록스|네일라카·외용액 56 · 아모롤핀염산염|네일라카 50 · 살리실산|액 9 (~151 master). 그 외 프라목신 HOLD 및 케토프로펜/플루르비프로펜/디클로페낙 첩부제 대형 풀 미선점.

## 7. 검증 방법

각 그룹: 원문 probe → EN grounded 저작 → dry-run ×2 byte-identical diff → APPLY(이중게이트 `--apply`+`TOPICAL_APPLY_CONFIRM=YES`) → 독립 SQL 검증(LIVE·dup) → no-op 재실행 0. 최종 전수: live_ko=live_en=845, drift 0, dup 0, easy 잔존 0.
