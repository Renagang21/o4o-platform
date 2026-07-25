# CHECK-O4O-OTC-REMAINING-READY-SHARD-DA-V1-PREFLIGHT — 다 shard 사전검증 · 생산 미착수 (에이전트 다)

WO: `WO-O4O-OTC-REMAINING-READY-SHARD-DA-V1`
SSOT: `otc-remaining-shard-assignment-ssot-v1.json` (라 census `bae254d0e`)
상태: **HOLD_POPULATION — 구조 게이트 전부 PASS 이나 대상 품질 결함 142 fp / 359 master(55.8%) 확인. 생산 미착수, DB write 0.**

## 0. 결론

> shard 구조(교집합·격리·완료분 분리)는 **독립 재검증 GREEN**.
> 그러나 READY 판정된 다 shard 643 master 중 **359 master(55.8%)** 가 `ingredient` / `strength` / `route` 축 파싱 결함 또는 비소매 포장으로, 그대로 저작하면 **잘못된 성분·경로로 매장 설명서가 생산**된다.
> 근거 부족·조성 혼합 방지 원칙에 따라 **착수 전 중지**하고 처분 결정을 요청한다. **설명서 생성 0 · apply 0 · DB write 0 · DB 접속 0.**

## 1. 구조 게이트 — 독립 재검증 (전부 PASS)

라 census 의 게이트를 SSOT JSON 으로 직접 재계산했다.

| 게이트 | 결과 |
|---|---|
| da fp 수 | **260** (선언 일치) |
| da master 수 | **643** unique, 행 중복 **0** (선언 일치) |
| fp 교집합 da∩ga / da∩na / ga∩na | **0 / 0 / 0** |
| master 교집합 da∩ga / da∩na | **0 / 0** |
| 빅콘에스600정 3 master ∈ da | **0** (fp `44a15789a2cc1596` ∈ da = false) |
| 빅콘에스600정 ∈ 전체 READY(가+나+다) | **0** — HOLD_SOURCE 격리 유지 |
| 기존 shard C(68 fp/204 m 완료분) ∩ da — fp | **0** |
| 라 census 자체 게이트 | `classSumEqualsUniverse` true · `readyCompleteIntersection` 0 · `dbWrite` 0 |

→ **shard 배정·격리·재처리 방지는 문제 없음.** 아래는 배정 자체가 아니라 **READY 판정 모집단의 품질** 문제다.

## 2. 대상 품질 결함 (핵심 중지 사유)

라 census 의 축 추출식:

```
ingredientOf = name.match(/\(([^()]+)\)\s*$/)[1]   // 제품명 끝 괄호 = 성분으로 간주
strengthOf   = spec.split(' / ')[0]                 // 액상은 농도가 아니라 용량이 들어옴
EXCLUDE_RE   = 전량수출|수출전용|수출용|for export|군납|보건소용|비매품|임상시험용|샘플용
```

제품명 끝 괄호가 **성분이 아닌 경우**(수출명 주기·향/맛 변형·국가·상품명)에 그대로 성분 축으로 채택된다. 결과:

| # | 결함 | fp | master | 실제 사례 |
|---|------|---:|---:|---|
| D1 | `ingredient` = **수출명 주기** — EXCLUDE_RE 가 `수출용`은 잡지만 `수출명:`은 불포착 | **88** | **270** | `수출명:KEFEN`(49m, 첩부제 30mg) · `수출명:UPRO400IBUFEN`(11m) · `수출명:별첨`(8m) · `수출명:다티펜점안액`(6m) |
| D2 | `ingredient` = **맛·향·변형·국가** | 18 | 34 | `모과맛` · `딸기향포도향` · `청포도향` · `무향` · `라이트` · `쿨-1회용` · `순-1회용` · `소` · `베트남` |
| D3 | `ingredient` = **라틴 상품명** | 2 | 6 | `Calteo-40Tablets` · `Artifen` |
| D4 | **비소매 대용량 포장** | 13 | 19 | 포비돈요오드 `3785밀리리터`(1갤런) · 벤지다민 `10000밀리리터` · 알벤다졸 `400킬로그램` · 차아염소산나트륨 `4리터` |
| D5 | **route 오분류 의심** — 소독·외용제가 `oral` 로 분류 | 21 | 30 | 클로르헥시딘·포비돈요오드 세정액, 케토코나졸/나프티핀/피리티온아연(외용), 인산나트륨에네마(직장) |
| | **REVIEW 소계** | **142** | **359 (55.8%)** | |
| | **CLEAN 소계** | **118** | **284 (44.2%)** | |

부수 확인: 액상 `strength` 가 농도가 아닌 **용량(mL)** 으로 들어오는 문제는 과거 HFF 액상 트랙에서 이미 재생산으로 교정한 동일 함정이다(`3ed118f8c` · `d31ecc657` · `da8e05b42`). CLEAN 분류분에도 `5밀리리터` 형태가 다수 있어, 액상은 **동일 성분·상이 농도가 한 fp 로 병합될 위험**이 남는다.

### 왜 중지인가

- D1 은 성분 축이 **수출명 문자열**이므로, 저작 시 제품 성분을 잘못 기재하거나 서로 다른 조성이 한 그룹으로 묶일 수 있다 → CLAUDE.md 콘텐츠 불변 원칙 "제품 간 조성·효능·용법이 다르면 혼합하지 않는다" 위반 위험.
- D5 는 경로가 틀리면 **용법 자체가 잘못된 설명서**가 된다(외용 소독액을 경구로 기술).
- D4 는 소비자 매장 판매 대상이 아니다(기존 첩부제 V9 에서 수출용·군납·보건소용·비매품 **전량 생산 제외** 확정 전례).
- 이들 판정을 세션 자체 추정으로 뒤집는 것은 금지 범위(원문 근거 없는 재분류)에 해당하므로, **처분 결정을 요청**한다.

## 3. 실행 채널 점검 (미충족 2건)

| 항목 | 상태 |
|---|---|
| `WO-O4O-OTC-REMAINING-READY-SHARD-GA-V1` (실행·중지·금지·보고 형식 준거) | **repo 부재** — 파일·commit·이력 모두 없음. 준거 규칙 미확보 |
| DB 자격증명 `apps/api-server/.env` | **이 클론에 파일 없음** (열람 시도 없음) |
| 로컬 리스닝 | `127.0.0.1:5442` 활성 — **라 census 세션 소유 추정**. 다 세션 전용 write proxy 아님 |
| 러너 | `otc-oral-combo-store-leaflet-runner.ga.ts` · `drug-otc-topical-*` 존재 (oral/topical 커버, ophthalmic·nasal·vaginal 전용 러너 없음) |
| write-owner | **미확보** — 단일 write-owner 순차 원칙(SSOT `principle`) 상 선점 확인 필요 |

→ 현 상태로는 CLEAN 분(118 fp/284 m)도 dry-run·apply 실행 불가.

## 4. 검증 결과 (본 세션)

| 항목 | 값 |
|---|---|
| 대상 fingerprint / master | 260 / 643 (배정), 착수 **0 / 0** |
| PASS / REVIEW / HOLD | 0 / **142 fp·359 m** / 빅콘에스600정 1 fp·3 m(기존 HOLD_SOURCE 유지, 다 shard 밖) |
| dry-run | **미실행** (실행 채널 미충족) |
| apply | **미실행** |
| canonicalDup | **0** (신규 생성 0) |
| 사후검증 | 해당 없음 |
| DB write / DB 접속 | **0 / 0** |
| 설명서 생성 | **0** |
| 기존 shard C 재처리 | **0** (fp 교집합 0) |

## 5. 요청 — 진행에 필요한 결정 3건

1. **D1~D5 처분** — ① CLEAN 118 fp/284 m 만 생산하고 REVIEW 142 fp/359 m 는 라 세션에 축 재추출(EXCLUDE_RE 에 `수출명` 추가 + `ingredientOf` 괄호 함정 보정 + route 재판정) 요청, ② 또는 다 세션이 원문 대조로 직접 재판정, ③ 또는 전량 그대로 진행(권장하지 않음).
2. **GA-V1 준거 규칙** — 파일 커밋 또는 본문 전달.
3. **write-owner·DB 채널** — 다 세션 전용 proxy 포트와 자격증명 경로 지정, LIVE apply 승인 범위(예상 write = CLEAN 284 m × 6T = 1,704T) 확정.

권장: **①** — CLEAN 분 선행 생산으로 진행률을 확보하고, 결함분은 축 재추출 후 별도 라운드로 회수한다.

## 6. Git / 무결성

- read-only 조사만 수행 · DB 접속 0 · 설명서 생성 0
- 라 census 산출물(`otc-remaining-full-corpus-census-v1.json` · `otc-remaining-shard-assignment-ssot-v1.json` · `otc-remaining-full-corpus-census.ts`) **읽기 전용 참조, 수정 0**
- `apps/api-server/.env` 미열람(부재) · `_msm.mjs` / `_msmx.mjs` 미접촉
- `git add .` 미사용 · reset/clean/stash 미사용 · 타 세션 파일 미접촉 · 본 CHECK 만 path-specific commit
