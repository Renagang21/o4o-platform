# CHECK-O4O-OTC-REMAINING-CENSUS-IDENTITY-ROUTE-STRENGTH-CORRECTION-V2 — 에이전트 라

WO: `WO-O4O-OTC-REMAINING-CENSUS-IDENTITY-ROUTE-STRENGTH-CORRECTION-V2`
선행: `WO-O4O-OTC-REMAINING-FULL-CORPUS-CENSUS-AND-THREE-SHARD-DESIGN-V1` (commit `bae254d0e`)
상태: **PASS — V2 census 완료. 전 게이트 통과. DB write 0 · 설명서 생성 0 · apply 0.**

## 0. 결론

> V1 의 축 추출 결함(D1~D6)을 코드 레벨에서 재현 확인하고, **제품명을 성분·함량·제형·경로 판정에서 완전히 배제**한 V2 census 를 전수 재실행했다.
> V1 READY 786 fp / 1,928 master 및 기존 가·나·다 shard 는 **SUPERSEDED_FOR_PRODUCTION**(생산 금지). V1 파일은 삭제·덮어쓰지 않았다.
> V2 READY = **716 fp / 2,517 master**. 새 가·나·다 shard 를 SSOT v2 로 산출했다.

## 1. V1 결함 — 코드 레벨 재현

`apps/api-server/src/scripts/otc-remaining-full-corpus-census.ts` 실측:

| # | 라인 | V1 코드 | 결함 |
|---|---|---|---|
| D1 | 109 | `name.match(/\(([^()]+)\)\s*$/)` | 제품명 끝 괄호를 성분으로 채택 → `수출명:KEFEN` · `모과맛` · `Artifen` 통과 |
| D2 | 34 | `EXCLUDE_RE` 에 `수출명` 부재 | 수출명 주기 품목이 READY 로 유입 |
| D3 | 94–103 | 제품명 정규식 route | `액$` 가 `포비돈요오드액` 을 **oral** 로 판정 |
| D4 | 110 | `spec.split(' / ')[0]` | 액상 포장용량(mL)을 함량으로 오인 |
| D5 | — | 대용량 포장 미탐지 | 1갤런·10,000mL·400kg 품목 잔류 |
| D6 | — | fp 조성 균질성 미검증 | 이질 조성 병합 위험 |

다 세션 사전검증(`CHECK-…-DA-V1-PREFLIGHT`)의 142 fp / 359 master(55.8%) 결함 보고와 일치한다.

## 2. 핵심 발견 — 구조화 공식 성분 원천의 실제 소재

WO 는 "성분은 구조화된 공식 성분/허가 원천 필드로만 확정"을 요구한다. 후보 원천을 read-only 로 전수 점검한 결과:

| 후보 | 실측 | 판정 |
|---|---|---|
| `product_drug_extensions.active_ingredients` | OTC 57,572 / RX 119,548 / 전 행 **채움 0** | 사용 불가 |
| `product_drug_extensions.ingredient_summary` · `dosage_form` · `strength` | 동일하게 **채움 0** | 사용 불가 |
| `product_candidates` `source_label='MFDS_DRUG_OTC'` (허가사항 원문) | **0 행** (존재 자체가 없음) | 사용 불가 |
| e약은요 STORE canonical 섹션 | 효능·효과 / 용법·용량 / 저장방법 / 주의사항 / 이상반응 / 상호작용 / 경고 — **성분 섹션 없음** | 사용 불가 |
| 의약품 표준코드 `mfds-drug-master-standard-code_2025-10-31` (305,522 행) 의 **일반명코드(성분명코드)** | OTC **57,572 / 57,572 = 100% 연결**, 일반명코드 보유 27,677 | **채택** |

> V1 의 `officialSourceSeq` 가 참조한 `MFDS_DRUG_OTC` 는 **DB 에 0 행**이다. V1 이 제품명 파싱에 의존한 근본 원인이 여기에 있다.
>
> **연결축 주의**: 표준코드 candidate 의 `identifier_value` 는 13자리 `KOREA_DRUG_CODE` 다. `MFDS_CODE` 로 조인하면 **0 건**이고, `raw_payload->>'mfdsCode'` 로 조인해야 100% 연결된다.

### 일반명코드 축 검증 (추정 아님 · 실데이터 대조)

9자리 = `[1-4]` 성분 · `[5-6]` 함량 · `[7]` 투여경로 · `[8-9]` 제형.

grounded OTC 13,533 행 교차표:

| `[7]` | master | 경구어휘 | 외용어휘 | 점안 | 질/좌 | 주사 |
|---|---:|---:|---:|---:|---:|---:|
| A (내복) | 6,825 | 5,376 | 148 | **0** | 3 | **0** |
| C (외용/국소) | 6,696 | 679 | 1,559 | 772 | 80 | **0** |
| B (주사) | 12 | 0 | 0 | 0 | 0 | 0 |

- `A` 인데 연고/크림/점안인 반례 = **1건**, 그마저 `크레파스정` 의 `파스` 오매칭이다 → 실질 반례 0.
- `C` 인데 정/캡슐인 사례 = 전부 **질정**(클로트리마졸 등) → 정합.
- 함량이 `[5-6]` 에 있으므로 **약품규격 mL 을 함량으로 쓸 필요가 없다** → D4 함정이 구조적으로 소거된다.

### 코드 우선 원칙이 이름 판독을 이긴 실사례

| 제품명 | 이름 기반 판독 | 일반명코드 | 실제 |
|---|---|---|---|
| `마스질정(클레마스틴푸마르산염)` | 질정 → vaginal | `135201ATB` = 내복·정 | 클레마스틴 = **경구** 항히스타민. 코드가 정답 |
| `옵타젠트점안액(포비돈)` | "포비돈" → 소독제와 동일군 | `216134COS` | 포비돈(인공눈물)과 포비돈요오드(`216206/216207`)를 **분리**. 이름만으로는 혼입 |

## 3. V2 판정 규칙

| 축 | 근거 | 불가 시 |
|---|---|---|
| 성분·함량·제형 | 일반명코드 **단일** 확정 | 부재/다중/형식오류 → `HOLD_IDENTITY` |
| 투여경로 | 일반명코드 `[7-9]` 3자 접미 **allowlist** | 미등재 → `HOLD_ROUTE` |
| 원문 | e약은요 canonical 에 **효능·효과 + 용법·용량 2축 필수** | 결손 → `HOLD_SOURCE` |
| 제외 | 제품명·규격의 수출명/군납/비매품/별첨 등 + 대용량 포장 | `EXCLUDE` / `EXCLUDE_NONRETAIL` |

**제품명은 EXCLUDE 판정과 대용량 탐지에만 쓰이며, 성분·함량·제형·경로 판정에 일절 개입하지 않는다.**

### 적용부위 미확정 접미 — 의도적 보류 (651 master)

`[7]=C` 는 "외용" 대분류일 뿐 적용부위를 확정하지 않는다. 실측 반례:

| gencode | 제품명 | 실제 적용부위 |
|---|---|---|
| `544700CLQ` | 렉크린액(인산나트륨에네마) | 직장 |
| `216207CLQ` | 지노베타딘질세정액 | 질 |
| `116131CLQ` | 퍼스가글액(벤지다민) | 구강인두 |
| `216206CLQ` | 그린포비돈세정액 | 피부 |

네 건이 모두 `CLQ` 다. 단일 route 로 확정 불가하므로 `CLQ`·`CDS`·`CSI` 를 allowlist 에서 **제외**하고 `HOLD_ROUTE(external_site_ambiguous)` 로 보냈다. 규모 **651 master** — 승인 시 회수 가능한 상한이다. 이 조치로 다 세션 D5 지적(외용 소독액의 경구 기술)이 재발 불가하다.

## 4. V2 분류 결과 (universe 57,572)

| 분류 | master | 비고 |
|---|---:|---|
| **READY** | **2,517** (716 fp) | 가·나·다 재배정 대상 |
| SPLIT_REQUIRED | 4,617 (884 fp) | 동일 identity 다중 fp |
| HOLD_SOURCE | 32,412 | 공식 원문 부재 32,385 + 원문 축 결손 27 |
| ALREADY_COMPLETE | 7,636 | ko+en canonical |
| EXCLUDE | 4,021 | 수출명·군납·비매품 등 |
| EXCLUDE_NONRETAIL | 30 | ≥1L / ≥1kg / 갤런 |
| HOLD_IDENTITY | 3,035 | 일반명코드 부재 2,425 · 다중 610 |
| HOLD_ROUTE | 773 | 적용부위 미확정 651 · 미등재 접미 122 |
| OTHER_SOURCE_NON_EASY | 2,531 | 원문 존재·미승격 |
| **합계** | **57,572** | universe 일치 |

### V1 대조

| 항목 | 값 |
|---|---:|
| V1 READY master | 1,928 |
| V2 READY master | 2,517 |
| V1 READY 중 V2 도 READY | 477 |
| V1 READY 중 **탈락** | **1,451** |
| ├ EXCLUDE (수출명·군납 등) | 678 |
| ├ HOLD_IDENTITY | 307 |
| ├ SPLIT_REQUIRED | 235 |
| ├ HOLD_ROUTE | 229 |
| └ HOLD_SOURCE | 2 |
| V2 신규 READY (V1 에 없던 건) | 2,040 |

> V1 READY 의 **75.3%(1,451/1,928)** 가 생산 부적격이었다. 세 세션의 사전검증 중지 판단이 옳았음이 수치로 확인된다.

## 5. 게이트 — 전부 PASS

| 게이트 | 결과 |
|---|---|
| `classSumEqualsUniverse` | **true** (57,572 = 57,572) |
| 모든 분류 상호배타 | **true** (단일 우선순위 분기) |
| `readyIdentityAllStructured` (성분 = 단일 일반명코드) | **true** |
| `readyRouteAllOfficial` (경로 = allowlist 접미) | **true** |
| `readyNoNameDerivedAxis` | **true** |
| `fpCompositionHomogeneous` | **true** (이질 fp 0) |
| `readyNoExportOrBulk` | **true** |
| 가·나·다 fp 교집합 | **0** |
| 가·나·다 master 교집합 | **0** |
| `readyCompleteIntersection` (기존 완료분) | **0** |
| `bigconInReady` (빅콘에스600정) | **0** — 용법 1축 부재로 HOLD_SOURCE (선례 `8bab22471` 준수) |
| `exportNameInReady` (수출명 품목) | **0** |
| `dbWrite` | **0** |
| 결정론 | 2회 실행 **byte-identical** (md5 일치) |

## 6. WO 명시 검증 샘플 — READY 혼입 확인

| 샘플 | 매칭 | READY | 처분 |
|---|---:|---:|---|
| VilexCetirin | 14 | **0** | EXCLUDE 14 |
| ArtritoPlast / KEPAX | 16 | **0** | EXCLUDE 16 |
| KetotopPainReliefPlaster30mg | 20 | **0** | EXCLUDE 20 |
| 다티펜점안액 | 32 | **0** | EXCLUDE 32 |
| KEFEN | 49 | **0** | EXCLUDE 49 |
| UPRO400 / IBUFEN | 11 | **0** | EXCLUDE 11 |
| Calteo / Artifen | 21 | **0** | EXCLUDE 12 · SPLIT 5 · 완료 4 |
| 알벤다졸 (대용량 포함) | 190 | **0** | 완료 125 · EXCLUDE 36 · SPLIT 26 · HOLD 3 |
| 벤지다민 | 64 | **0** | 전량 HOLD/SPLIT (CLQ 보류) |
| 케토코나졸 | 80 | **0** | HOLD/EXCLUDE/SPLIT |
| 피리티온아연 | 5 | **0** | HOLD_ROUTE 5 |
| 에네마 / 관장 | 19 | **0** | HOLD_ROUTE·EXCLUDE·HOLD_SOURCE |
| 빅콘에스600정 | 3 | **0** | HOLD_SOURCE(용법 축 부재) |
| 포비돈 계열 | 434 | 6 | **점안액 6건만** (`216134COS` 인공눈물 포비돈, 소독용과 분리) |
| 클로르헥시딘 | 203 | 2 | 크림/연고 2건 (topical 정확) |
| 맛/향 변형 | 36 | 3 | 경구 3건 — identity 가 코드 유래라 향 변형은 축이 아님 |

> 맛/향·포비돈·클로르헥시딘의 잔존 READY 는 **오분류가 아니라 정확한 재분류**다. WO 요구는 "제거 또는 정확히 재분류"이며 후자에 해당한다.

## 7. V2 shard 설계

| shard | fp | master | route 분포 |
|---|---:|---:|---|
| 가 | 238 | 839 | oral 634 · ophthalmic 112 · topical 79 · oromucosal 14 |
| 나 | 240 | 839 | oral 626 · topical 136 · ophthalmic 52 · vaginal 15 · oromucosal 10 |
| 다 | 238 | 839 | oral 697 · topical 87 · ophthalmic 38 · oromucosal 17 |
| **계** | **716** | **2,517** | 교집합 fp 0 · master 0 |

SSOT: `apps/api-server/src/scripts/data/otc-remaining-shard-assignment-ssot-v2.json`

## 8. 산출물

| 파일 | 성격 |
|---|---|
| `apps/api-server/src/scripts/otc-remaining-full-corpus-census-v2.ts` | V2 census script (신규) |
| `apps/api-server/src/scripts/data/otc-remaining-full-corpus-census-v2.json` | V2 census (신규) |
| `apps/api-server/src/scripts/data/otc-remaining-shard-assignment-ssot-v2.json` | V2 shard SSOT (신규) |
| 본 문서 | V2 CHECK |

**V1 산출물 처리**: `otc-remaining-full-corpus-census.ts` · `-v1.json` · `shard-assignment-ssot-v1.json` **미수정·미삭제**. V2 산출물 내부에 `supersedes.status = SUPERSEDED_FOR_PRODUCTION` 으로 명시했다. 기존 가·나·다 shard 는 **생산 금지** 상태로 기록한다.

## 9. 후속 결정 요청

1. **적용부위 미확정 651 master(CLQ/CDS/CSI) 처분** — ① 현행 유지(보류), ② 원문 용법 대조로 적용부위 확정 후 회수, ③ 세부 route 없이 생산. 권장 ①→② 순.
2. **HOLD_IDENTITY 2,425(일반명코드 부재) 처분** — 표준코드에 일반명코드가 없는 품목군. 별도 원천 확보 WO 필요 여부.
3. **HOLD_SOURCE 32,385 의 근본 해소** — `MFDS_DRUG_OTC` 허가사항 원문이 DB 에 0 행이다. 잔여 생산 규모를 좌우하는 최대 변수이며, 적재 WO 없이는 회수 불가. (관련: `docs/investigations/IR-O4O-OTC-OFFICIAL-SOURCE-RECOVERY-AUDIT-V1.md`)
4. **가·나·다 재개 승인** — V2 shard SSOT 기준 착수 여부 및 write-owner 지정.

## 10. Git / 무결성

- read-only census · **DB write 0** · 설명서 생성 0 · apply 0 · dry-run 0
- V1 산출물 3종 읽기 전용 참조, 수정 0
- 조사용 임시 probe script 7종은 실행 후 전량 삭제 (커밋 대상 아님)
- 자격증명: `apps/api-server/.env` 를 `process.env` 로만 전달, 값 열람·출력·수정 0, census 완료 후 삭제
- `git add .` 미사용 · reset/clean/stash 미사용 · 타 세션 파일 미접촉 · 본 산출물만 path-specific commit
