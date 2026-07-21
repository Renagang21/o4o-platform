# CHECK-O4O-OTC-TRACK-A-COMPLETION-INVENTORY-AND-REMAINING-QUEUE-NA-V1 — Track A 완료 인벤토리·잔여 queue (에이전트 나)

WO: `WO-O4O-OTC-TRACK-A-COMPLETION-INVENTORY-AND-REMAINING-QUEUE-NA-V1` · 일자: 2026-07-21 · 상태: **완료 — read-only 감사, DB write 0**
스크립트: `apps/api-server/src/scripts/otc-track-a-completion-inventory-and-queue.ts` · 산출: `apps/api-server/src/scripts/data/otc-track-a-completion-inventory-and-queue-v1.json` (md5 `b0b2df97c3079a280bb2e05d0dbbab9f`, 2회 byte-identical)
채널: Cloud SQL Auth Proxy(127.0.0.1:5442) → production `o4o_platform` · **SELECT only**

> **재실행판(2차)**: 1차 감사(`37a62eb43`, 27 그룹/591 master) 이후 에이전트 가가 실행을 이어가 DB 가 전진했고, WO §2/§5 요구 필드(그룹별 groupKey·target fp·ALREADY_* · queue 의 reviewed EN sibling·EN byte-identical 재구성 가능성)를 보강해 재집계했다. 본 문서가 최신 정본이다.

---

## 0. 결론

> **Track A 완료 = 30 그룹 · 612 master.** ko canonical 612 · easy deprecated 612 · audit `canonical_replaced` **612(정확히 1행/master)** · canonical duplicate **0** · authored needs_review 잔여 **0** · **anomaly 0**. 아티팩트(run.json) target 과 DB 실측이 **29/29 전건 일치**(에르도스테인만 파일럿 네임스페이스라 러너 아티팩트 없음). **en 완결 29 그룹(586)**, **en 미완결 1 그룹 = 에르도스테인 300mg 정 26건**(Track A 최초 파일럿, `EN_REGISTRY` 미등재) — 유일한 결손. 잔여 후보에서 **READY_SINGLE 12** queue 확정(T 73 · ko 292 · en 146 · 총 438), 그중 **11건은 EN byte-identical 재구성 가능**.

---

## 1. 시작/종료 상태

| 항목 | 값 |
|---|---|
| 브랜치 | `main` |
| 시작 HEAD | `37a62eb43` (= origin/main, working tree clean, 신규 커밋 0) |
| 종료 HEAD | 본 커밋 (origin/main 동기) |
| modified·untracked | 시작 시 **0** — 타 세션 파일 없음. 종료 시 자기 산출물 2건(스크립트·JSON)+본 CHECK |
| 에이전트 나 미완료 이전 WO | 없음 |
| 타 세션 파일 접촉 | **0** |

---

## 2. Track A 완료 inventory (production 정본, 30 그룹 · 612 master)

**Track A 판별 정본** = `audit.event_type='canonical_replaced' AND metadata.previousSource='mfds_easy_drug' AND metadata.newSource='mfds_drug_otc'`.
⚠️ `canonical_replaced` 단독 집계 금지 — supplier 등 타 흐름도 같은 event_type 을 쓴다(§3 N1).

`artT` = 커밋 아티팩트(run.json) 의 target · `일치` = 아티팩트 target == DB 실측 · `KO/EN` = 재실행 상태 토큰.

| # | groupKey | source_ref | target fp | T=ko | en | 결손 | easy dep | audit | artT | 일치 | KO | EN |
|---:|---|---|---|---:|---:|---:|---:|---:|---:|:-:|:-:|:-:|
| 1 | `트리메부틴말레산염\|100밀리그램\|정` | `003beef8` | `7a4aab0b31b1ed19` | 66 | 66 | 0 | 66 | 66 | 66 | ✅ | UPG | CPL |
| 2 | `바실루스리케니포르미스균\|250밀리그램\|캡슐` | `022f4af0` | `13208b062a9c8c79` | 56 | 56 | 0 | 56 | 56 | 56 | ✅ | UPG | CPL |
| 3 | `알벤다졸\|400밀리그램\|정` | `0178f85b` | `879d80e7afe2d0f4` | 38 | 38 | 0 | 38 | 38 | 38 | ✅ | UPG | CPL |
| 4 | `디오스민\|300밀리그램\|캡슐` | `05be62a5` | `e0a551d8020daa5c` | 38 | 38 | 0 | 38 | 38 | 38 | ✅ | UPG | CPL |
| 5 | `로라타딘\|10밀리그램\|정` | `0a7dee0b` | `83bcf192525baa16` | 38 | 38 | 0 | 38 | 38 | 38 | ✅ | UPG | CPL |
| 6 | `알마게이트\|500밀리그램\|정` | `01a231cd` | `b08e3e7b13e8836f` | 37 | 37 | 0 | 37 | 37 | 37 | ✅ | UPG | CPL |
| 7 | `트리메부틴말레산염\|150밀리그램\|정` | `00f0325a` | `f4c610df21cf32ef` | 28 | 28 | 0 | 28 | 28 | 28 | ✅ | UPG | CPL |
| 8 | `클로닉신리시네이트\|125밀리그램\|연질캡슐` | `03de1849` | `5f1cb691ae1d06e8` | 27 | 27 | 0 | 27 | 27 | 27 | ✅ | UPG | CPL |
| 9 | `클로닉신리시네이트\|125밀리그램\|정` | `01994863` | `30552579b0a3088e` | 26 | 26 | 0 | 26 | 26 | 26 | ✅ | UPG | CPL |
| **10** | **`에르도스테인\|300밀리그램\|정`** | `03e0af9d` | `4b4e162690065e8e` | **26** | **0** | **26** | 26 | 26 | — | — | — | **❌** |
| 11 | `브로멜라인\|100밀리그램\|정` | `0308eaa4` | `f79d8c596f934095` | 22 | 22 | 0 | 22 | 22 | 22 | ✅ | UPG | CPL |
| 12 | `니자티딘\|75밀리그램\|정` | `048ba86f` | `db6e1f0bb7d9763f` | 18 | 18 | 0 | 18 | 18 | 18 | ✅ | UPG | CPL |
| 13 | `아세트아미노펜\|325밀리그램\|연질캡슐` | `07fd7b8f` | `26587fd5ff28e6b3` | 18 | 18 | 0 | 18 | 18 | 18 | ✅ | UPG | CPL |
| 14 | `엘카르니틴\|330밀리그램\|정` | `035efa8f` | `a75d4ff900dbe2a9` | 16 | 16 | 0 | 16 | 16 | 16 | ✅ | UPG | CPL |
| 15 | `나프록센\|250밀리그램\|연질캡슐` | `02355c78` | `b2b5edea34cff218` | 15 | 15 | 0 | 15 | 15 | 15 | ✅ | UPG | CPL |
| 16 | `소브레롤\|200밀리그램\|캡슐` | `0ff909f4` | `2e37307573cfb189` | 15 | 15 | 0 | 15 | 15 | 15 | ✅ | UPG | CPL |
| 17 | `트리메부틴말레산염\|200밀리그램\|정` | `0175e433` | `559c4ffae3658ec7` | 13 | 13 | 0 | 13 | 13 | 13 | ✅ | UPG | CPL |
| 18 | `락토바실루스아시도필루스균\|300밀리그램\|캡슐` | `177466cf` | `4ec78870b3318967` | 13 | 13 | 0 | 13 | 13 | 13 | ✅ | UPG | CPL |
| 19 | `알파칼시돌\|0.5마이크로그램\|연질캡슐` | `0436f0d8` | `8ac89c4550d02b6d` | 12 | 12 | 0 | 12 | 12 | 12 | ✅ | UPG | CPL |
| 20 | `메코발라민\|500마이크로그램\|캡슐` | `0908968f` | `c6c4dcfbf46d229c` | 10 | 10 | 0 | 10 | 10 | 10 | ✅ | UPG | CPL |
| 21 | `폴산\|1밀리그램\|정` | `068e2176` | `cb05e790cbe3b054` | 9 | 9 | 0 | 9 | 9 | 9 | ✅ | UPG | CPL |
| 22 | `덱스판테놀\|100밀리그램\|정` | `0d2b2ef8` | `37d1268f8f721dda` | 9 | 9 | 0 | 9 | 9 | 9 | ✅ | UPG | CPL |
| 23 | `아세틸시스테인\|100밀리그램\|캡슐` | `240871d7` | `41701ec292bc3fa6` | 9 | 9 | 0 | 9 | 9 | 9 | ✅ | UPG | CPL |
| 24 | `덱시부프로펜\|300밀리그램\|정` | `002c309a` | `605e64748c7bc3da` | 8 | 8 | 0 | 8 | 8 | 8 | ✅ | UPG | CPL |
| 25 | `나프록센나트륨\|275밀리그램\|정` | `006f1a2b` | `124cccc95fde01af` | 8 | 8 | 0 | 8 | 8 | 8 | ✅ | UPG | CPL |
| 26 | `디오스민\|600밀리그램\|정` | `014af1cd` | `bbb731cc8414d08a` | 8 | 8 | 0 | 8 | 8 | 8 | ✅ | UPG | CPL |
| 27 | `수산화마그네슘\|500밀리그램\|정` | `048b8e71` | `2d3b7629b0aeafca` | 8 | 8 | 0 | 8 | 8 | 8 | ✅ | UPG | CPL |
| 28 | `니푸록사지드\|200밀리그램\|캡슐` | `05c733cd` | `0a755506d14ebefe` | 7 | 7 | 0 | 7 | 7 | 7 | ✅ | UPG | CPL |
| 29 | `사카로마이세스보울라르디균\|282.5밀리그램\|캡슐` | `16f0c2ef` | `ba82fd1299f5d730` | 7 | 7 | 0 | 7 | 7 | 7 | ✅ | UPG | CPL |
| 30 | `아르기닌티디아시케이트\|200밀리그램\|연질캡슐` | `20d395df` | `509aaaf470ce860f` | 7 | 7 | 0 | 7 | 7 | 7 | ✅ | UPG | CPL |
| — | **합계 30 그룹** | | | **612** | **586** | **26** | **612** | **612** | | 29/29 | | 29/30 |

`UPG`=`ALREADY_UPGRADED` · `CPL`=`ALREADY_COMPLETE`.

### ko/en canonical 정합 게이트

| 게이트 | 값 | 기대 | 판정 |
|---|---:|---:|:-:|
| canonical duplicate (master,type,lang) | **0** | 0 | ✅ |
| authored STORE needs_review 잔여 | **0** | 0 | ✅ |
| easy deprecated 총계 == Track A master | 612 == 612 | 일치 | ✅ |
| audit(Track A) == master (**1행/master**) | 612 == 612 | 일치 | ✅ |
| 전 그룹 easy dep == target · audit == target | 30/30 | 30 | ✅ |
| 아티팩트 target == DB 실측 | 29/29 | 전건 | ✅ |
| ko duplicate / en duplicate | 0 / 0 | 0 | ✅ |

---

## 3. anomaly

**검출 anomaly = 0.** 아래 2건은 **anomaly 아님**으로 판정하고 근거를 남긴다.

| # | 관측 | 판정 | 근거 |
|---|---|---|---|
| N1 | `canonical_replaced` 전체 **614행/613 master** vs Track A **612행/612 master** | anomaly 아님 | 차 2행/1 master(`33cc8fe7`)는 metadata `previousSource/newSource=null`, ko 행 전부 `supplier/hidden`, 발생 2026-07-14(Track A 최초 파일럿 2026-07-18 **이전**) → **supplier 흐름**. Track A 집계는 metadata 한정이 정본. |
| N2 | 1차 감사 27 그룹/591 vs 본 감사 30 그룹/612 | anomaly 아님(**시점차**) | 차 = +3 그룹/+21 master = 니푸록사지드200(7)·사카로마이세스282.5(7)·아르기닌티디아시케이트200(7). **1차 queue 의 #2·#3·#4 를 에이전트 가가 실제 적용**. DB 정본이 최신. |

> **중지 조건 해당 없음**: 완료 그룹 수 불일치(N2=시점차) · canonical duplicate 0 · audit 누락 0 · target 밖 write 정황 0 · bridge 정본 재현 성공(queue 12 전건 `targetReproduced=true`) · 가 소유권 충돌 0(가 적용분은 COMPLETED 로 편입되어 queue 에서 자동 제외).

### 본 재실행에서 정정한 산식 2건 (1차 감사 대비)

| 항목 | 1차(오류) | 정정 | 영향 |
|---|---|---|---|
| out-of-scope | `scope - target` 뺄셈 | **실제 집합차 쿼리**(`master_id <> ALL(target)`) | 미승격 후보의 target 은 아직 easy canonical 이라 authored scope 와 **서로소** → 뺄셈은 과소집계. 예: 은행엽 197→**203**, 이부프로펜200정 19→**24** |
| EN byte-identical 재구성 | target 의 *easy* 원문 vs sibling 의 *authored* 본문 비교 | **동일 `source_ref`(=동일 authored draft) 기준** + sibling ko/en 지문 균일성 | 서로 다른 소스를 비교해 전건 false 였음. 정정 후 **11/12 feasible** |

---

## 4. 남은 후보 상태별 분류 (bridge full-content fingerprint 정본)

기준 `otc-full-corpus-authored-bridge-groups-v1.json` (전체 6,261 fp-entry).

| 상태 | 수 | 근거 |
|---|---:|---|
| **READY_SINGLE** | **12** | `authored그대로확장`·ingredient-keyed·oral·fp 재현·easy canonical 정확히1·authored 충돌 0·안전지문 균일 → §5 |
| COMPLETED | 55 | Track A 완료 groupKey 와 일치 (재배정 금지) |
| PENDING_EXAMINATION | 14 | 동일 버킷 잔여. **queue 12 충족 시 DB gate walk 중단**(WANT_QUEUE=12·MAX_EXAMINE=40) — 미검사이지 부적합 아님 |
| HOLD_SENSITIVE | 1 | 민감 약효군 |
| HOLD_SOURCE | 1 | authored draft(source_ref) 부재 |
| HOLD_MULTI_INGREDIENT | 74 | 같은 버킷의 **atc-keyed** — `ingredientOf()` coarse 열거 불가(복합·다성분) |
| SAFETY_MISMATCH | 410 | bucket `안전지문불일치` 전량 |
| HOLD_NON_ORAL | 2,619 | bucket `비경구별도트랙` 전량 |
| HOLD_SOURCE(버킷) | 3,075 | `새설명서필요` 2,882 + `검토후확장` 193 |
| HOLD_CONFLICT | 0 | 검사분 중 authored canonical/needs_review·스코프 충돌 0 |

> **무언의 절단 없음**: `authored그대로확장` 157 = ingredient 83 + atc 74. ingredient 83 = COMPLETED 55 + READY_SINGLE 12 + PENDING 14 + SENSITIVE 1 + SOURCE 1.

---

## 5. 후속 queue — READY_SINGLE 상위 12

write 산식 정본 **T · ko=4T · en=2T · 총=6T**. 전건 `other=0` · `target∩exclude=0` · `기존 en canonical=0` · `authored 충돌 0` · `needs_review 0` · `targetReproduced=true`.
`sibEN` = 동일 source_ref out-of-scope 중 **검토완료 EN 보유 sibling 수** · `EN재구성` = ko/en 지문 균일 → build==live 게이트로 새 medical fact 0 구조 증명 가능.

| 순 | groupKey | target fp | T | coarse | ex | source_ref | **out-of-scope** | sibEN | EN재구성 | ko | en | 총 | 위험도 |
|---:|---|---|---:|---:|---:|---|---:|---:|:-:|---:|---:|---:|---|
| 1 | `비오틴\|5밀리그램\|정` | `458af310d5beda5f` | 8 | 13 | 5 | `27768939` | **0** | 0 | ❌ 신규번역 | 32 | 16 | **48** | 낮음 |
| 2 | `아세트아미노펜\|650밀리그램\|정` | `bdc125f5b4cd5c39` | 7 | 78 | 71 | `05690081` | 13 | 13 | ✅ | 28 | 14 | **42** | 중(coarse 78·제외 71) |
| 3 | `이부프로펜\|200밀리그램\|연질캡슐` | `f8d2054ae6613aa8` | 7 | 46 | 39 | `0203e1b4` | 7 | 7 | ✅ | 28 | 14 | **42** | 중(coarse 46) |
| 4 | `브로멜라인\|45밀리그램\|정` | `6c44c0a0c81e392f` | 6 | 14 | 8 | `11b41481` | 9 | 9 | ✅ | 24 | 12 | **36** | 낮음 |
| 5 | `시트룰린말산염\|500밀리그램\|정` | `66df757d3628ec4d` | 6 | 14 | 8 | `12b056c0` | 16 | 16 | ✅ | 24 | 12 | **36** | 중 |
| 6 | `알파칼시돌\|1마이크로그램\|연질캡슐` | `7c9fbdf7fb512fb4` | 6 | 10 | 4 | `06a1eed0` | 10 | 10 | ✅ | 24 | 12 | **36** | 낮음 |
| 7 | `은행엽건조엑스\|80밀리그램\|정` | `398cbe43456451db` | 6 | 10 | 4 | `018897db` | **203** | 203 | ✅ | 24 | 12 | **36** | **높음 — 스코프 오염 최대** |
| 8 | `이부프로펜아르기닌\|368.9밀리그램\|정` | `76e28dff9afce6d4` | 6 | 8 | 2 | `11b84cc1` | 6 | 6 | ✅ | 24 | 12 | **36** | 낮음 |
| 9 | `폴리사카리드철착염\|326.1밀리그램\|캡슐` | `8a412570da8697c4` | 6 | 11 | 5 | `096e8a7c` | 2 | 2 | ✅ | 24 | 12 | **36** | 낮음 |
| 10 | `독시라민숙신산염\|25밀리그램\|정` | `b2684c9a7e31a7b2` | 5 | 19 | 14 | `0be1a647` | 13 | 13 | ✅ | 20 | 10 | **30** | 중 |
| 11 | `로페라미드염산염\|2밀리그램\|캡슐` | `b6f8ec48477251b1` | 5 | 19 | 14 | `01c34c17` | 4 | 4 | ✅ | 20 | 10 | **30** | 낮음 |
| 12 | `이부프로펜\|200밀리그램\|정` | `b4f3651ae36d1387` | 5 | 14 | 9 | `0168e020` | **24** | 24 | ✅ | 20 | 10 | **30** | 중(oos 24) |
| — | **합계** | | **73** | | | | | | 11/12 | **292** | **146** | **438** | |

### 스코프 경고 (EN 가드 §0-C 필수 적용)

- **#7 은행엽건조엑스 80mg 정**: `source_ref 018897db` 를 **203 master 가 공유**, target 은 **6**. `source_ref_id` 단독 열거 시 203건 오염 → **반드시 target master_id 리스트로만 스코프**([BULK-TRANSLATION §0-C](../guides/products/drug/OTC-BULK-TRANSLATION-EXECUTION-GUIDE-V1.md)).
- #12(24) · #5(16) · #2/#10(13) · #6(10) · #4(9) · #3/#8(7·6) 도 out-of-scope > 0 → 동일 가드.
- 전건 `기존 en canonical = 0` → EN 은 빈 슬롯 직접 INSERT 경로.

### 배정 보류

- **IN_PROGRESS_GA(커밋 기준) = 없음**. 단 1차 감사의 queue #2~#4 를 가가 그대로 선택·적용한 전례가 있으므로, 본 queue **#1~#3 은 "GA 작업 결과 확인 후 배정"** 으로 둔다.
- 본 WO 는 **runner 등재·apply 를 하지 않았다**.

---

## 6. 준수 / 금지

| 항목 | 결과 |
|---|---|
| DB write | ❌ **0** (SELECT only) |
| runner registry 수정 | ❌ 안 함 |
| 실제 apply | ❌ 안 함 |
| `git add .` / reset·clean·stash·restore | ❌ 안 함 |
| pnpm-lock.yaml 수정 | ❌ 안 함 |
| 타 세션 파일 수정·삭제·커밋 | ❌ 안 함 |
| 가 진행 groupKey 선점 | ❌ 안 함 |
| 결정론 2회 byte-identical | ✅ md5 `b0b2df97c3079a280bb2e05d0dbbab9f` |

---

## 7. 다음 배정 제안

1. **최우선 — 에르도스테인 300mg 정 EN 26건** (`03e0af9d`): Track A **유일한 en 결손**. 최초 파일럿이라 `EN_REGISTRY` 미등재 → 범용 `drug-otc-en-complete-runner.ts` 등재만 하면 나머지 29 그룹과 동일 경로. **예상 write = en 2T = 52**. → **에이전트 다** 권장.
2. **신규 ko/en 배치** — queue #2~#6(EN 재구성 가능, T 7·7·6·6·6): **에이전트 가** 권장. #2(coarse 78)·#3(coarse 46)은 제외 검증 강화.
3. **#7 은행엽 80mg 정 후순위** — out-of-scope 203 으로 스코프 위험 최대. 단독 WO 로 분리하고 target master_id 고정 후에만 착수.
4. **#1 비오틴 5mg 정**은 sibling EN 이 없어 **신규 번역 + TEST-LOG 대조** 경로(다른 11건과 검수 부담이 다름).
5. PENDING_EXAMINATION 14 는 다음 감사에서 `WANT_QUEUE` 상향으로 이어서 검사.

---

## 8. 완료 보고 요약

- **시작 HEAD** `37a62eb43` → **종료 HEAD** 본 커밋 (origin/main 동기)
- **완료 그룹 30 · master 612** · ko 612 · en 586 · easy dep 612 · audit 612(1행/master)
- **ko/en 정합**: duplicate 0/0 · 잔여 needs_review 0 · 전 그룹 easy dep·audit == target · 아티팩트 target == DB 29/29 ✅
- **anomaly 0** (N1·N2 근거 기록) · 산식 정정 2건(out-of-scope 집합차 · EN 재구성 판정) 명시
- **상태별 잔여**: READY_SINGLE 12 · PENDING 14 · SENSITIVE 1 · SOURCE 1 · MULTI 74 · SAFETY_MISMATCH 410 · NON_ORAL 2,619 · SOURCE(버킷) 3,075 · CONFLICT 0
- **READY_SINGLE 상위 12** = §5 (T 73 · ko 292 · en 146 · 총 438 · EN 재구성 11/12)
- **IN_PROGRESS_GA** 커밋 기준 없음 · queue #1~#3 "GA 결과 확인 후 배정"
- **미푸시 자기 산출물 0**

> read-only 감사 전용. DB write 0 · runner 미수정 · apply 미실행. 실행 배정은 별도 WO.
