# CHECK — WO-O4O-OTC-TOPICAL-SPECIAL-FORM-CONTINUOUS-PRODUCTION-DA-V6

- 작업자: 에이전트 다 (Claude Code)
- 일자: 2026-07-23
- 트랙: TOPICAL_SKIN_STORE_LEAFLET (V5 반납 특수 제형 후보 연속 생산)
- 판정: **PASS — 종료 조건 충족 (반납 풀 전량 소진 + 신규 122fp/300 master ≥ 40fp·150)**

## 1. 생산 결과 (V6 신규)

| 그룹 | fp | master | KO write | EN write | 커밋 |
|---|---:|---:|---:|---:|---|
| 미녹시딜 겔·스프레이·액 (액2%/액3%/겔3%/액5%/겔5%/폼A/폼B 7 sub-run) | 68 | 155 | 620 | 310 | e94ec70f5 |
| 시클로피록스 네일라카(매일형/주기감량형/티지풀큐어)·올아민 두피액·겔 | 36 | 79 | 316 | 158 | a1b6fc268 |
| 아모롤핀염산염 네일라카 (단일 요법) | 9 | 50 | 200 | 100 | d50843bde |
| 살리실산 여드름 외용액(2형)·겔(2형)·팁스왑액 | 9 | 16 | 64 | 32 | 1c40dce5d |
| **합계** | **122** | **300** | **1,200** | **600** | |

- write 계약: master당 KO 4T + EN 2T = 6T → 300×6 = 1,800 = 1,200+600. writePlan==writeActual 전 sub-run 일치.
- 누계 topical LIVE: **1,145 master** (KO canonical 1,145 · EN canonical 1,145).

## 2. 제형·안전 분리

- 미녹시딜: 농도(2/3/5%)×제형(액/겔/폼) 분리. 5% 계열=남성전용(여성 언급 79건 전수=금기 문구 확인, has_female_efficacy=0). 폼=여성 최소기간 3~4개월형/3~6개월형 분리.
- 시클로피록스: 네일라카(손발톱만) ↔ 올아민 두피 세정액 ↔ 피부·두피 겔 EN 완전 분리. 네일라카 내 매일형/주기감량형(로푸록스) 요법 분리.
- 아모롤핀: 전 제품 동일 요법(주 1~2회·줄+패드+스파툴라) 확인 후 단일 EN.
- 살리실산: 전 풀 여드름 효능 — 각질·사마귀·티눈 후보는 현 잔여 풀에 부재. 제품군별(애크린외용액/2%형/애크린겔/센스힐겔/팁스왑) 안전정보 차이로 EN 5분리(감량요법·수두 인플루엔자·유방부위·소아 장기사용 문구 상이).
- 첩부제(재우스오라쿠고에이취플라스타 4 master): WO ⑥에 따라 **조사만, 생산 제외** — drift 0 SQL 확인.

## 3. 게이트·검증

- dry-run×2 byte-identical: 전 sub-run PASS.
- 독립검증 SQL(성분 풀 기준): ko==en==master 수, canonicalDup 0, easy 잔여 0, target 밖 write 0.
- 재실행 no-op: 미녹시딜·시클로피록스·아모롤핀·살리실산 각 0/0/0 PASS.
- replacement audit: metadata wo='WO-…-DA-V6' **300건 == 신규 master 300** (러너 하드코딩 없음, CLI --wo-id 주입).
- 이중게이트: `--apply` + `TOPICAL_APPLY_CONFIRM=YES` 준수. write-owner: apply 시점 가=경구 복합(claim 교집합 0)·나=idle 확인.

## 4. 러너 변경 (V6 중 추가)

- routeSig 음성 가드: 주사/수액/펜주/프리필드→injection, 투석/관류→dialysis, 가글/양치→gargle.
- `--assume-route topical`: routeSig 'unknown'만 지정 route로 간주. 'oral' 약신호(액 접미)는 강경구 토큰(정/캡슐/시럽 등) 부재 + 원문 '외용으로만' 명시 시에만 재분류. 양성 분류(ophthalmic 등) override 불가.
- normalizeOralMisphrase: "다른 약을 복용하고 있을 경우"→"사용하고 있을 경우" (병용 안내 의미 보존 확장).

## 5. 잔여 후보·재시작 지점

- 반납 ~151 풀: **전량 소진** (미녹시딜 155 + 시클로피록스 79 + 아모롤핀 50 + 살리실산 16 — 반납 시점 추산 대비 실 풀 확대분 포함 완결).
- 후속 트랙 후보: 첩부제 대형 풀(케토프로펜·플루르비프로펜·디클로페낙 + 살리실산 플라스타 4) = 별도 WO 선점 필요(V6 범위 외). 프라목신 크림 17=점막 인접 HOLD 유지.
- 재시작 지점: `otc-production-claim.da.json` 기준 신규 단일성분 topical 후보 재조사부터.

## 6. Git

- 커밋: e94ec70f5 → a1b6fc268 → d50843bde → 1c40dce5d (+ 본 CHECK 커밋). 전부 path-specific, git add . 미사용, pnpm-lock 미접촉.
- 종료 시 HEAD==origin/main, 미푸시 자기 산출물 0.
