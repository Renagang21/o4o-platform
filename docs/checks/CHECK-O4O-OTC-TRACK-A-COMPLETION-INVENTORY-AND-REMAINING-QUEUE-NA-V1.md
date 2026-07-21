# CHECK-O4O-OTC-TRACK-A-COMPLETION-INVENTORY-AND-REMAINING-QUEUE-NA-V1 — Track A 완료 인벤토리·잔여 queue (에이전트 나)

WO: `WO-O4O-OTC-TRACK-A-COMPLETION-INVENTORY-AND-REMAINING-QUEUE-NA-V1` · 일자: 2026-07-21 · 상태: **완료 — read-only 감사, DB write 0**
스크립트: `apps/api-server/src/scripts/otc-track-a-completion-inventory-and-queue.ts` · 산출: `apps/api-server/src/scripts/data/otc-track-a-completion-inventory-and-queue-v1.json` (md5 `cf9decf2fdebbaeca7e936bd0fc2f8b1`, 2회 byte-identical)
채널: Cloud SQL Auth Proxy(127.0.0.1:5442) → production `o4o_platform` · **SELECT only**

---

## 0. 결론

> **Track A(e약은요 STORE ko canonical → authored canonical 교체) 완료 = 27 그룹 · 591 master.** ko canonical 591 · easy deprecated 591 · audit `canonical_replaced` **591(정확히 1행/master)** · canonical duplicate **0** · authored needs_review 잔여 **0**. **en 완결 26 그룹(565)**, **en 미완결 1 그룹 = 에르도스테인 300mg 정 26건**(Track A 최초 파일럿, EN 레지스트리 미등재). anomaly **0**. 남은 authored그대로확장 후보에서 **READY_SINGLE 12개** queue 확정(ko=4T·en=2T·총=6T). 에이전트 가의 batch(덱시부프로펜·디오스민600·수산화마그네슘 24건)는 감사 중 커밋 완료되어 **COMPLETED 로 반영**, 소유권 충돌·중복 배정 **0**.

---

## 1. 시작/종료 상태

| 항목 | 값 |
|---|---|
| 시작 HEAD | `6a2769045` (= origin/main, working tree clean) |
| 감사 중 HEAD 전진 | `e8cb43f46` (타 세션 push: 가 `WO-...-NEXT-BATCH-AUDIT-AND-KO-EN-COMPLETE-GA-V1` 등 3커밋) |
| 종료 HEAD | 본 커밋 (origin/main 동기) |
| 브랜치 | `main` |
| 에이전트 나 미완료 이전 WO | 없음 (직전 NA WO 2건 `52fbdd9a7`·`b82d7e7ed` 모두 커밋 완료) |
| 타 세션 파일 접촉 | **0** (hub-content·store-tablet·web-kpa-society 수정분 미접촉) |

> **이식성 정정**: 기존 NA 감사 스크립트(`otc-next-batch-8b-audit.ts`)는 `ENV_PATH` 에 노트북 절대경로(`C:\Users\sohae\...`)가 하드코딩돼 본 사무실 PC에서 실행 불가. 타 세션/기존 파일 수정 대신 **신규 자기 산출물**을 repo 상대경로 해석으로 작성했다(`resolveApiServerDir()`).

---

## 2. Track A 완료 inventory (production 정본, 27 그룹 · 591 master)

**Track A 판별 정본** = `audit.event_type='canonical_replaced' AND metadata.previousSource='mfds_easy_drug' AND metadata.newSource='mfds_drug_otc'`.
(⚠️ `canonical_replaced` 단독 집계 금지 — supplier 등 타 흐름도 같은 event_type 을 쓴다. §4 참조.)

| # | source_ref_id | 대표 제품 | target=ko | en | en결손 | easy dep | audit | en완결 |
|---:|---|---|---:|---:|---:|---:|---:|:-:|
| 1 | `003beef8` | 트리메부틴말레산염 100mg 정 | 66 | 66 | 0 | 66 | 66 | ✅ |
| 2 | `022f4af0` | 바실루스리케니포르미스균 250mg 캡슐 | 56 | 56 | 0 | 56 | 56 | ✅ |
| 3 | `0178f85b` | 알벤다졸 400mg 정 | 38 | 38 | 0 | 38 | 38 | ✅ |
| 4 | `05be62a5` | 디오스민 300mg 캡슐 | 38 | 38 | 0 | 38 | 38 | ✅ |
| 5 | `0a7dee0b` | 로라타딘 10mg 정 | 38 | 38 | 0 | 38 | 38 | ✅ |
| 6 | `01a231cd` | 알마게이트 500mg 정 | 37 | 37 | 0 | 37 | 37 | ✅ |
| 7 | `00f0325a` | 트리메부틴말레산염 150mg 정 | 28 | 28 | 0 | 28 | 28 | ✅ |
| 8 | `03de1849` | 클로닉신리시네이트 125mg 연질캡슐 | 27 | 27 | 0 | 27 | 27 | ✅ |
| 9 | `01994863` | 클로닉신리시네이트 125mg 정 | 26 | 26 | 0 | 26 | 26 | ✅ |
| **10** | **`03e0af9d`** | **에르도스테인 300mg 정** | **26** | **0** | **26** | 26 | 26 | ❌ |
| 11 | `0308eaa4` | 브로멜라인 100mg 정 | 22 | 22 | 0 | 22 | 22 | ✅ |
| 12 | `048ba86f` | 니자티딘 75mg 정 | 18 | 18 | 0 | 18 | 18 | ✅ |
| 13 | `07fd7b8f` | 아세트아미노펜 325mg 연질캡슐 | 18 | 18 | 0 | 18 | 18 | ✅ |
| 14 | `035efa8f` | 엘카르니틴 330mg 정 | 16 | 16 | 0 | 16 | 16 | ✅ |
| 15 | `02355c78` | 나프록센 250mg 연질캡슐 | 15 | 15 | 0 | 15 | 15 | ✅ |
| 16 | `0ff909f4` | 소브레롤 200mg 캡슐 | 15 | 15 | 0 | 15 | 15 | ✅ |
| 17 | `0175e433` | 트리메부틴말레산염 200mg 정 | 13 | 13 | 0 | 13 | 13 | ✅ |
| 18 | `177466cf` | 락토바실루스아시도필루스균 300mg 캡슐 | 13 | 13 | 0 | 13 | 13 | ✅ |
| 19 | `0436f0d8` | 알파칼시돌 0.5μg 연질캡슐 | 12 | 12 | 0 | 12 | 12 | ✅ |
| 20 | `0908968f` | 메코발라민 500μg 캡슐 | 10 | 10 | 0 | 10 | 10 | ✅ |
| 21 | `068e2176` | 폴산 1mg 정 | 9 | 9 | 0 | 9 | 9 | ✅ |
| 22 | `0d2b2ef8` | 덱스판테놀 100mg 정 | 9 | 9 | 0 | 9 | 9 | ✅ |
| 23 | `240871d7` | 아세틸시스테인 100mg 캡슐 | 9 | 9 | 0 | 9 | 9 | ✅ |
| 24 | `002c309a` | 덱시부프로펜 300mg 정 | 8 | 8 | 0 | 8 | 8 | ✅ |
| 25 | `006f1a2b` | 나프록센나트륨 275mg 정 | 8 | 8 | 0 | 8 | 8 | ✅ |
| 26 | `014af1cd` | 디오스민 600mg 정 | 8 | 8 | 0 | 8 | 8 | ✅ |
| 27 | `048b8e71` | 수산화마그네슘 500mg 정 | 8 | 8 | 0 | 8 | 8 | ✅ |
| — | **합계** | **27 그룹** | **591** | **565** | **26** | **591** | **591** | 26/27 |

### ko/en canonical 정합 게이트

| 게이트 | 값 | 기대 | 판정 |
|---|---:|---:|:-:|
| canonical duplicate (master,type,lang) | **0** | 0 | ✅ |
| authored STORE needs_review 잔여 | **0** | 0 | ✅ |
| easy deprecated 총계 == Track A master | **591 == 591** | 일치 | ✅ |
| audit(Track A) == Track A master (1행/master) | **591 == 591** | 일치 | ✅ |
| 전 그룹 easy dep == target | 27/27 | 27 | ✅ |
| 전 그룹 audit == target | 27/27 | 27 | ✅ |
| ko canonical == target (authored) | 591 | 591 | ✅ |

---

## 3. anomaly

**스크립트 검출 anomaly = 0.** 아래 2건은 **anomaly 아님**으로 판정했고, 근거를 남긴다(향후 오집계 방지).

| # | 관측 | 판정 | 근거 |
|---|---|---|---|
| N1 | `canonical_replaced` 전체 **593행/592 master** vs Track A **591행/591 master** | **anomaly 아님** | 차이 2행/1 master(`33cc8fe7`)는 `metadata.previousSource/newSource = null` 이고 ko 행이 전부 `supplier/hidden` · 발생 2026-07-14(Track A 최초 파일럿 2026-07-18 **이전**) → **Track A 아닌 supplier 흐름**. Track A 집계는 metadata 한정이 정본. |
| N2 | 커밋 산출물 기준 24 그룹/567 master vs DB 27 그룹/591 master | **anomaly 아님(시점차)** | 차 = +3 그룹/+24 master = 가 batch(덱시부프로펜 8·디오스민600 8·수산화마그네슘 8). 감사 도중 `e8cb43f46` 로 커밋됨. DB 정본이 최신. |

> **중지 조건 해당 없음**: 완료 그룹 수 불일치(N2=시점차로 해소) · canonical duplicate 0 · audit 누락 0 · target 밖 write 정황 0 · bridge 정본 재현 성공(queue 12 전건 `targetReproduced=true`) · 가 소유권 충돌 0.

---

## 4. 남은 후보 상태별 분류 (bridge full-content fingerprint 정본)

기준: `otc-full-corpus-authored-bridge-groups-v1.json`. 전체 6,261 fp-entry.

| 상태 | 수 | 근거 |
|---|---:|---|
| **READY_SINGLE** | **12** | `authored그대로확장` · ingredient-keyed · oral · fp 재현 · easy canonical 정확히1 · authored 충돌 0 · 안전지문 균일 → §5 queue |
| COMPLETED | 52 | Track A 완료 groupKey 와 일치하는 fp-entry (재배정 금지) |
| PENDING_EXAMINATION | 18 | `authored그대로확장` ingredient-keyed 잔여. **queue 12 충족 시점에 DB gate walk 를 중단**(WANT_QUEUE=12, MAX_EXAMINE=40) — 미검사이지 부적합 아님 |
| HOLD_SENSITIVE | 1 | 민감 약효군 정규식 매칭 |
| HOLD_MULTI_INGREDIENT | 74 | 같은 버킷의 **atc-keyed** entry — `ingredientOf()` 로 coarse 열거 불가(복합/다성분) → 현 파이프라인 부적합 |
| SAFETY_MISMATCH | 410 | bucket `안전지문불일치` 전량 |
| HOLD_NON_ORAL | 2,619 | bucket `비경구별도트랙` 전량 |
| HOLD_SOURCE | 3,075 | bucket `새설명서필요` 2,882 + `검토후확장` 193 (grounded authored 부재/검토 필요) |
| HOLD_CONFLICT | 0 | 검사한 후보 중 authored canonical/needs_review·스코프 충돌 검출 0 |

> **무언의 절단 없음 명시**: `authored그대로확장` = 157 entry(ingredient 83 + atc 74). ingredient 83 = COMPLETED 52 + READY_SINGLE 12 + HOLD_SENSITIVE 1 + PENDING_EXAMINATION 18. PENDING 18 은 **queue 상한(12) 도달로 미검사**이며, 다음 배치에서 동일 스크립트로 이어서 검사하면 된다.

---

## 5. 후속 queue — READY_SINGLE 상위 12

write 산식 정본: **T=target master 수 · ko=4T · en=2T · 총=6T**. 전건 `other=0` · `target∩exclude=0` · `기존 en canonical=0` · `authored 충돌 0` · `needs_review 0`.

| 순 | groupKey | target fp | T | coarse | exclude | source_ref | 공유 | **out-of-scope** | ko | en | 총 | 위험도 |
|---:|---|---|---:|---:|---:|---|---:|---:|---:|---:|---:|---|
| 1 | `비오틴\|5밀리그램\|정` | `458af310d5beda5f` | 8 | 13 | 5 | `27768939` | 0 | **0** | 32 | 16 | **48** | 낮음 |
| 2 | `니푸록사지드\|200밀리그램\|캡슐` | `0a755506d14ebefe` | 7 | 19 | 12 | `05c733cd` | 11 | 4 | 28 | 14 | **42** | 낮음 |
| 3 | `사카로마이세스보울라르디균\|282.5밀리그램\|캡슐` | `ba82fd1299f5d730` | 7 | 11 | 4 | `16f0c2ef` | 5 | **0** | 28 | 14 | **42** | 낮음 |
| 4 | `아르기닌티디아시케이트\|200밀리그램\|연질캡슐` | `509aaaf470ce860f` | 7 | 7 | 0 | `20d395df` | 10 | 3 | 28 | 14 | **42** | 낮음 |
| 5 | `아세트아미노펜\|650밀리그램\|정` | `bdc125f5b4cd5c39` | 7 | 78 | 71 | `05690081` | 13 | 6 | 28 | 14 | **42** | 중(coarse 78, 제외 71) |
| 6 | `이부프로펜\|200밀리그램\|연질캡슐` | `f8d2054ae6613aa8` | 7 | 46 | 39 | `0203e1b4` | 7 | **0** | 28 | 14 | **42** | 중(coarse 46) |
| 7 | `브로멜라인\|45밀리그램\|정` | `6c44c0a0c81e392f` | 6 | 14 | 8 | `11b41481` | 9 | 3 | 24 | 12 | **36** | 낮음 |
| 8 | `시트룰린말산염\|500밀리그램\|정` | `66df757d3628ec4d` | 6 | 14 | 8 | `12b056c0` | 16 | 10 | 24 | 12 | **36** | 중(out-of-scope 10) |
| 9 | `알파칼시돌\|1마이크로그램\|연질캡슐` | `7c9fbdf7fb512fb4` | 6 | 10 | 4 | `06a1eed0` | 10 | 4 | 24 | 12 | **36** | 낮음 |
| 10 | `은행엽건조엑스\|80밀리그램\|정` | `398cbe43456451db` | 6 | 10 | 4 | `018897db` | 203 | **197** | 24 | 12 | **36** | **높음 — 스코프 오염 위험 최대** |
| 11 | `이부프로펜아르기닌\|368.9밀리그램\|정` | `76e28dff9afce6d4` | 6 | 8 | 2 | `11b84cc1` | 6 | **0** | 24 | 12 | **36** | 낮음 |
| 12 | `폴리사카리드철착염\|326.1밀리그램\|캡슐` | `8a412570da8697c4` | 6 | 11 | 5 | `096e8a7c` | 2 | **0** | 24 | 12 | **36** | 낮음 |
| — | **합계** | | **79** | | | | | | **316** | **158** | **474** | |

### 스코프 경고 (EN 가드 §0-C 적용 필수)

- **#10 은행엽건조엑스 80mg 정**: `source_ref_id 018897db` 를 **203 master 가 공유**하는데 target 은 **6** 뿐 → **out-of-scope 197**. `source_ref_id` 단독 열거 시 197건 오염. **반드시 target master_id 리스트로만 스코프**([BULK-TRANSLATION §0-C](../guides/products/drug/OTC-BULK-TRANSLATION-EXECUTION-GUIDE-V1.md)).
- #8(10) · #5(6) · #2/#9(4) · #4/#7(3) 도 out-of-scope > 0 → 동일 가드 적용.
- 전건 `기존 en canonical = 0` → EN 은 빈 슬롯 직접 INSERT 경로.

### 배정 보류 표시

- 본 감사 시점에 **IN_PROGRESS_GA 는 없음**: 가의 batch 3그룹은 감사 도중 apply·커밋 완료되어 COMPLETED 로 편입됨(중복 배정 위험 해소).
- 다만 queue 상위(#1~#3)는 가가 다음 배치로 선점할 가능성이 있어 **"가 작업 결과 확인 후 배정"** 으로 둔다. **본 WO 는 runner 등재·apply 를 하지 않았다.**

---

## 6. 준수 / 금지

| 항목 | 결과 |
|---|---|
| DB write | ❌ 0 (SELECT only) |
| runner registry 수정 | ❌ 안 함 |
| 실제 apply | ❌ 안 함 |
| `git add .` / reset·clean·stash·restore | ❌ 안 함 |
| pnpm-lock.yaml 수정 | ❌ 안 함 |
| 타 세션 파일 수정·삭제·커밋 | ❌ 안 함 (hub-content·store-tablet·web-kpa 미접촉) |
| 가 진행 groupKey 선점 | ❌ 안 함 |
| 결정론 2회 byte-identical | ✅ md5 `cf9decf2fdebbaeca7e936bd0fc2f8b1` |

---

## 7. 다음 배정 제안

1. **최우선 — 에르도스테인 300mg 정 EN 26건 완결** (`03e0af9d`): Track A 유일한 en 결손. 최초 파일럿이라 `EN_REGISTRY` 미등재 → 범용 `drug-otc-en-complete-runner.ts` 에 등재만 하면 나머지 26 그룹과 동일 경로. **예상 write = en 2T = 52**. → **에이전트 다** 권장(가는 신규 ko 배치 진행 중).
2. **신규 ko/en 배치** — queue #1~#6(T=8·7×5, ko 4T·en 2T): **에이전트 가** 권장. 단 #5(coarse 78)·#6(coarse 46)은 제외 검증 강화.
3. **#10 은행엽 80mg 정은 후순위** — out-of-scope 197 로 스코프 위험 최대. 단독 WO 로 분리하고 target master_id 고정 후에만 착수.
4. PENDING_EXAMINATION 18 은 다음 감사에서 `WANT_QUEUE` 상향으로 이어서 검사.

---

## 8. 완료 보고 요약

- **시작 HEAD** `6a2769045` → **종료 HEAD** 본 커밋 (origin/main 동기)
- **완료 그룹 27 · master 591** · ko 591 · en 565 · easy dep 591 · audit 591(1행/master)
- **ko/en 정합**: duplicate 0 · 잔여 needs_review 0 · 전 그룹 easy dep/audit == target ✅
- **anomaly 0** (N1·N2 는 anomaly 아님으로 근거 기록)
- **상태별 잔여**: READY_SINGLE 12 · PENDING 18 · SENSITIVE 1 · MULTI 74 · SAFETY_MISMATCH 410 · NON_ORAL 2,619 · SOURCE 3,075 · CONFLICT 0
- **READY_SINGLE 상위 12** = §5 (합계 T 79 · ko 316 · en 158 · 총 474)
- **IN_PROGRESS_GA**: 없음(가 batch 커밋 완료) · queue #1~#3 은 "가 결과 확인 후 배정"
- **미푸시 자기 산출물 0** (스크립트·JSON·본 CHECK path-specific commit·push)

> read-only 감사 전용. DB write 0 · runner 미수정 · apply 미실행. 실행 배정은 별도 WO.
