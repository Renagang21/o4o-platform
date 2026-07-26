# CHECK-O4O-OTC-UNPRODUCED-LARGE-CENSUS-V1 — 에이전트 라

WO: `WO-O4O-OTC-UNPRODUCED-LARGE-CENSUS-V1`
상태: **PROPOSAL — 전 게이트 PASS. DB write 0 · 설명서 생성 0 · dry-run 0 · LIVE apply 0.**

## 0. 결론

> OTC 미생산 **9,244 master** 전수 조사 결과, 생산 후보 **862 fingerprint / 4,356 master** 를 확보했다.
> WO 목표(최소 500, 가능하면 1,000+)를 **4배 이상 상회**한다. 예상 write **26,136T**.
> 기존 LIVE 2,877 master 와 masterId·fp·sourceRef·canonical **4방향 모두 교집합 0**.

## 1. 모집단

| 항목 | 값 |
|---|---:|
| OTC ProductMaster 전체 | 57,572 |
| authored STORE canonical 보유(생산 완료) | 10,542 |
| **미생산 + 공식 원문 보유 = 조사 모집단** | **9,244** |

모집단 정의: `drug_category='otc'` ∧ e약은요 STORE ko canonical 보유 ∧ authored STORE canonical **미보유**.

## 2. 판정 결과

| 판정 | master | 비율 |
|---|---:|---:|
| **READY_SPLIT** | **4,356** | 47.1% |
| **READY_LARGE** | **0** | — |
| HOLD_ROUTE | 3,198 | 34.6% |
| EXCLUDE | 1,073 | 11.6% |
| HOLD_PROFESSIONAL_USE | 275 | 3.0% |
| HOLD_SAFETY_VARIANCE | 193 | 2.1% |
| HOLD_SOURCE | 88 | 1.0% |
| HOLD_MULTI_ROUTE | 61 | 0.7% |
| **계** | **9,244** | 100% |

### READY_LARGE 가 0인 이유 — 구조적 사실이며 생산성 저하가 아니다

READY 대상의 `identityKey`(일반명코드 + 경로)는 **219개**이며, **전부 안전지문 2개 이상으로 분산**되어 있다.

| identityKey 당 안전지문 수 | identityKey 수 |
|---:|---:|
| 2 | 103 |
| 3 | 47 |
| 4 | 25 |
| 5~8 | 29 |
| 10~28 | 15 |
| **1 (= READY_LARGE 조건)** | **0** |

같은 일반명코드라도 **제조사별 e약은요 원문 문구가 미세하게 달라** 안전지문이 갈린다. 따라서 WO 정의상 전건이 READY_SPLIT 이다.

> **생산 준비도는 READY_LARGE 와 동일하다.** 본 census 는 처음부터 **안전지문 단위로 그룹을 구성**하므로 모든 그룹이 "내부 안전지문 일치" 조건을 만족한다. LARGE/SPLIT 구분은 *identity 가 쪼개졌는가* 라는 장부상 구분일 뿐이며, 외용 SPLIT_REQUIRED 감사(`bab6b45f2`)에서 이 분할이 안전함을 이미 검증했다.

## 3. 생산 후보 분포

### route별

| 경로 | master |
|---|---:|
| 경구 (oral) | **3,699** |
| 외용 (topical) | 437 |
| 점안 (ophthalmic) | 159 |
| 구강 (oromucosal) | 40 |
| 질 (vaginal) | 21 |

### 제형별 (상위)

| 제형 | master | | 제형 | master |
|---|---:|---|---|---:|
| 정 | 1,591 | | 시럽 | 132 |
| 캡슐 | 762 | | 현탁액 | 100 |
| 연질캡슐 | 471 | | 산 | 51 |
| 크림 | 377 | | 플라스타 | 32 |
| 장용정 | 321 | | 트로키 | 30 |
| 내복액 | 250 | | 연고 | 28 |
| 점안액 | 151 | | 질정 | 21 |

### 성분군 상위 (일반명코드 `[1-6]` = 성분+함량)

`101804` 246 · `101305` 62 · `101404` 33 · `104303` 28 · `102935` 15 · `102906` 14 · `101842` 11 · `101330` 10

### 최대 그룹 (단일 안전지문 = 단일 설명서)

| master | 경로/제형 | 일반명코드 |
|---:|---|---|
| **193** | 경구/캡슐 | `153101ACH` |
| 117 | 경구/장용정 | `111001ATE` |
| 116 | 경구/캡슐 | `101804ACH` |
| 79 | 경구/정 | `106301ATB` |
| 68 | 외용/크림 | `183807CCM` |
| 62 | 경구/캡슐 | `101804ACH` |
| 59 | 경구/캡슐 | `153101ACH` |
| 50 | 경구/내복액 | `A49300ALQ` |

> 최상위 그룹 예시 — 에리텐캡슐(에르도스테인) 외 **193 master 가 하나의 안전지문**을 공유한다.
> 효능 "급·만성 호흡기질환에서의 점액용해 및 거담" / 용법 "성인은 1회 1캡슐(300 mg)을 1일 2~3회 복용합니다. 급성 호흡기질환에 복용 시 연속으로 10일 이상 복용하지 않습니다."
> `101804ACH`·`153101ACH` 가 목록에 두 번 나오는 것이 identity 분산의 실제 모습이다(같은 코드, 다른 원문 → 다른 설명서).

## 4. HOLD / EXCLUDE 원인

| 판정 | 사유 | master |
|---|---|---:|
| **HOLD_ROUTE 3,198** | 일반명코드 부재 | **2,320** |
| | 일반명코드 다중(2~27) | 610 |
| | 적용부위 미명시 (CLQ 133 · CSI 13) | 146 |
| | allowlist 외 접미 (CSP 38 · AXS 15 · CIS 12 …) | 122 |
| **EXCLUDE 1,073** | 수출용·비매품 등 키워드 | 1,073 |
| **HOLD_PROFESSIONAL_USE 275** | `SURGICAL_SITE` 166 · `SURGEON_HAND` 109 | 275 |
| **HOLD_SAFETY_VARIANCE 193** | 용법에 용량 수치·연령 근거가 모두 없어 안전 동일성 검증 불가 | 193 |
| **HOLD_SOURCE 88** | 주의 61 · 효능 17 · 효능+용법 7 · 용법 3 결손 | 88 |
| **HOLD_MULTI_ROUTE 61** | 코드경로↔용법 모순 22 · 효능↔용법 부위 충돌 22 · 용법 내 복수부위 17 | 61 |

> 최대 잔여 블로커는 **일반명코드 부재 2,320** 이다. 표준코드 데이터셋에 해당 품목의 `일반명코드(성분명코드)` 가 비어 있어 성분·함량·제형을 공식 근거로 확정할 수 없다. 별도 원천 확보 없이는 회수 불가하다.

## 5. 조사 축과 원칙 준수

| 축 | 근거 |
|---|---|
| 성분 · 함량 · 제형 · 단일제/복합제 | 일반명코드 `[1-4]`성분 `[5-6]`함량 `[7-9]`제형 |
| 투여경로 | 코드 접미 allowlist. CLQ/CDS/CSI 는 공식 용법 원문에서 부위 도출 |
| 적용부위 | 공식 용법 원문 + **효능·효과 대조** |
| 효능 · 용법 · 주의 | e약은요 canonical 원문 3축 필수 |
| 연령 · 사용기간 · 용법수치 · 금기 | 공식 원문 signature |
| 전문용 | 다 세션 `3719b8280` 마커·부정문맥 규칙 VERBATIM |
| 수출·비매·취소 | 제품명/규격 키워드 + 표준코드 `isCancelled` 전량 취소 |
| 생산완료 | authored canonical + 4방향 교집합 |

- **제품명으로 성분·경로·적용부위를 추정한 판정 0건** (제품명은 EXCLUDE 판정에만 사용)
- **용법 단독 판정 금지** — 코드 경로 ↔ 용법 모순 대조표(`ROUTE_CONTRADICTION`)로 22건 적발
- 일반명코드·기존 fp 는 후보 연결 키로만 사용, 최종 동일성은 안전지문 9축 전부로 판정

## 6. 게이트 — 전부 PASS

| 게이트 | 결과 |
|---|---|
| 전체 모집단 재현 | **9,244** (판정 합계 일치) |
| STORE canonical 보유 대상 혼입 | **0** |
| **기존 LIVE masterId 교집합** | **0** / 2,877 |
| **기존 LIVE fp 교집합** | **0** / 785 |
| **기존 LIVE sourceRef 교집합** | **0** / 714 |
| master 누락 · 중복 | **0 / 0** |
| READY 그룹 내부 안전지문 불일치 | **0** |
| READY 그룹 간 master 교집합 | **0** |
| 공식 근거 결손 (READY) | **0** |
| 제품명 기반 판정 | **0** |
| 전문용 혼입 (READY) | **0** |
| EXCLUDE 혼입 (READY) | **0** |
| 생산단위 master 합 = READY | **PASS** |
| `dbWrite` | **0** |
| 결정론 | 산출 4파일 2회 실행 **byte-identical** |

## 7. 예상 write · 생산 단위 제안

master 당 **KO 4T + EN 2T = 6T**.

| 항목 | 값 |
|---|---:|
| READY master | 4,356 |
| KO | 17,424T |
| EN | 8,712T |
| **총 write** | **26,136T** |

WO 규칙(>1,500 → 3 단위)에 따라 **3 생산 단위**를 제안한다.

| 단위 | fp | master | write |
|---|---:|---:|---:|
| unit-1 | 286 | 1,452 | 8,712T |
| unit-2 | 288 | 1,452 | 8,712T |
| unit-3 | 288 | 1,452 | 8,712T |

> 조사 단계이므로 **가·나·다 shard 를 만들지 않았다.** 단위는 승인 단계에서 확정한다.

## 8. 상위 후보 순위화

산출 JSON `rankings` 에 4종 순위를 담았다.

- `byMasterCount` — master 수 상위 20 그룹 (최대 193m)
- `byRouteSingleForm` — 단일 경로·단일 제형(코드 allowlist) 그룹 상위 20
- `largestReadyLarge` / `largestReadySplit` — 유형별 상위 15

기존 러너 재사용 관점에서는 **경구 3,699 master(84.9%)** 가 압도적이며, 기존 `otc-oral-combo-store-leaflet-runner` 계열을 그대로 쓸 수 있다. 외용 437 · 점안 159 는 외용/점안 트랙 러너가 필요하다.

## 9. 산출물

| 파일 | 성격 |
|---|---|
| `apps/api-server/src/scripts/otc-unproduced-large-census.ts` | 재실행 가능한 전체 census script |
| `apps/api-server/src/scripts/data/otc-unproduced-large-census-v1.json` | 모집단 요약·분포·순위·게이트 |
| `apps/api-server/src/scripts/data/otc-unproduced-ready-large-proposal-v1.json` | READY_LARGE proposal (0건, 구조 보존) |
| `apps/api-server/src/scripts/data/otc-unproduced-ready-split-proposal-v1.json` | READY_SPLIT proposal — 862 fp / 4,356 master |
| `apps/api-server/src/scripts/data/otc-unproduced-hold-exclude-ledger-v1.json` | HOLD/EXCLUDE 원장 4,888건 (사유·원문 근거) |
| 본 문서 | CHECK |

proposal 각 그룹에 `fp · gencode · suffix · route · form · ingredientStrengthCode · masterIds · sample(제품명·효능·용법·근거)` 을 보존했다. 조사용 임시 probe script 는 실행 후 삭제했다.

**기존 SSOT·감사·러너·생산 원장 수정 0.** 신규 파일만 생성했다.

## 10. 후속 — 다음 승인·생산 단계 착수 가능

게이트 전부 PASS 이고 기존 LIVE 와 4방향 교집합이 0 이므로 **승인 SSOT 단계 착수가 가능**하다.

1. **승인 SSOT 확정 WO** — 4,356 master 전건 근거 보존 + 생산 단위/write-owner 확정 (26,136T)
2. 규모가 크므로 **unit-1 선행 착수 후 나머지 순차** 진행을 권한다
3. **일반명코드 부재 2,320** — 최대 잔여 블로커. 별도 원천 확보 WO 필요
4. HOLD_PROFESSIONAL_USE 275 · HOLD_SAFETY_VARIANCE 193 · HOLD_MULTI_ROUTE 61 — 별도 판단 사안

## 11. Git / 무결성

- 대형 read-only census · **DB write 0** · 설명서 생성 0 · dry-run 0 · LIVE apply 0
- 기존 SSOT·감사·러너·생산 원장 수정 0 · 타 세션 파일 미접촉
- 자격증명: `apps/api-server/.env` 를 `process.env` 로만 전달, 값 열람·출력·수정·삭제 0
- `git add .` 미사용 · reset/clean/stash 미사용 · 본 산출물만 path-specific commit
