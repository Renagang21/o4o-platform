# CHECK-O4O-OTC-EXTERNAL-SITE-RECOVERABLE-V2-RUNNER-ADAPTER-V1 — 외용 회수분 입력 어댑터 + 가·나·다 dry-run (에이전트 다)

WO: `WO-O4O-OTC-EXTERNAL-SITE-RECOVERABLE-V2-RUNNER-ADAPTER-V1`
기준: 승인 SSOT `172a792fd` · 공용 러너 `394ab0e4b` (V2 3-shard 완료 `e421890b9`)
상태: **PASS — 가·나·다 3 shard 전부 게이트 14/14. 47 fp / 278 master · fp 재현 278/278(100%) · DB write 0 · LIVE apply 미실행.**

## 0. 결론

> 라 승인 SSOT(47 fp / 278 master)를 기존 V2 공용 러너가 소비하도록 어댑터를 신규 작성했다.
> **가 17/93 · 나 16/93 · 다 14/92** 전부 선언과 일치, fp 재현 100%, 이상 그룹 0, 2회 실행 byte-identical.
> 예상 write **KO 1,112 + EN 556 = 1,668T** 실측 일치. **가 shard 생산 착수 가능(READY)**, 나·다 는 순서 게이트로 정상 차단.

## 1. adapter 경로

`apps/api-server/src/scripts/otc-v2-external-site-recovery-adapter.ts` — 가·나·다 **공용** 자산(Shared Module Change Protocol).

### 설계 원칙

공용 러너의 `admissionCheck` 는 CLQ/CDS/CSI 를 하드 차단한다. 그 차단은 **옳다** — 접미만 보고는 경로를 정할 수 없기 때문이다(같은 CLQ 에 관장액·질세정액·가글액·피부소독액이 공존). 본 어댑터는 그 차단을 **푸는 것이 아니라 원문 근거를 요구**한다: 승인 SSOT 의 `officialSite` + `evidence`(용법·용량 원문 인용) 가 있고, 근거 텍스트가 경로 패턴과 합치할 때만 통과시킨다.

| 항목 | 처리 |
|---|---|
| fingerprint | 공용 러너 `fingerprintV2` **그대로**. 산식 변경 0 |
| sourceRef | 공용 러너 `fpToUuidV2` **그대로**. 별도 앵커 없음 |
| route | 승인 SSOT 값만 사용. **제품명 미개입** |
| form | CLQ/CDS/CSI 는 제형이 확정되지 않으므로 **경로 라벨**을 쓴다(없는 제형을 단정하지 않음) |
| KO/EN write 계약 | 공용 러너 것 재사용 (master당 KO 4T + EN 2T) |
| 원장·manifest | **V2 READY 트랙과 분리** (`otc-v2-recovery-apply-order.json` · `otc-v2-recovery-dryrun-manifest.{shard}.json`) |
| 순서 게이트 | 별도 게이트, 가 → 나 → 다 |
| LIVE apply | **경로 자체를 구현하지 않았다** (본 WO 금지 준수) |

공용 러너에는 **추가만** 했다: `normalize`·`NONORAL_REWRITE`·`ORAL_VERB_RE`·`EN_ORAL_VERB_RE`·`AUTHORED_SOURCES`·`BLOCKED_*` export, `composeKo`/`renderEn`/`buildGroupKo` 에 **선택적** `profiles` 파라미터(기본값 = 기존 `ROUTE_PROFILE`), `readLedger(path?)`. 기존 호출부는 인자를 주지 않으므로 동작 불변.

## 2. 지원 route (5)

| route | KO 라벨 | EN 라벨 | 경구 동사 |
|---|---|---|---|
| cutaneous | 사용 안내 | How to apply it to the affected area | **차단** |
| oromucosal | 사용 안내 | How to use it in the mouth or throat as directed | **차단** |
| nasal | 사용 안내 | How to use it in the nostril | **차단** |
| rectal | 사용 안내 | How to use it rectally | **차단** |
| vaginal | 사용 안내 | How to use it vaginally | **차단** |

기존 `ROUTE_PROFILE`(oral/topical/ophthalmic/…)은 **건드리지 않았다** — V2 READY 계약 불변.

## 3. shard별 fp/master 재현

| shard | 선언 | 실측 | fp 재현 | 이상 그룹 | route |
|---|---|---|---|---|---|
| 가 | 17 fp / 93 m | **17 / 93** | **93/93** | 0 | cutaneous 5fp/35m · nasal 7fp/28m · oromucosal 4fp/23m · rectal 1fp/7m |
| 나 | 16 fp / 93 m | **16 / 93** | **93/93** | 0 | cutaneous 9fp/54m · oromucosal 3fp/25m · nasal 3fp/8m · vaginal 1fp/6m |
| 다 | 14 fp / 92 m | **14 / 92** | **92/92** | 0 | cutaneous 10fp/73m · oromucosal 2fp/10m · nasal 2fp/9m |
| **계** | **47 / 278** | **47 / 278** | **278/278 (100%)** | **0** | |

SSOT 내부 정합도 독립 확인: fp 내 route·gencode·shard 균질(불균질 0), `route == officialSite` 278/278, `evidenceSection` 전건 `용법·용량`.

## 4. 기존 완료분 교집합

| 대상 | 결과 |
|---|---|
| V2 READY 716 fp / 2,517 master | **fp 0 / master 0** (파일 대조, 규모도 716·2,517 로 확인) |
| V2 LIVE 완료 2,509 master | **0** — 278 전건 authored STORE canonical 보유 **0** (DB 실측) |
| shard 상호 (가∩나∩다) | fp **0** / master **0** |
| master 중복 | **0** (278 unique) |
| 차단 모집단(감사 샘플: HOLD 80 · SPLIT 60 · EXCLUDE 샘플) | 혼입 **0** |

> 차단 모집단은 라 감사에 **샘플만** 실려 있다(HOLD 80/194, SPLIT 60/179). 전수 목록이 없어 샘플 교집합 + 접미 모집단(CLQ/CDS/CSI) 소속 + 근거 보유로 대체 검증했다. 전수 대조가 필요하면 라 세션에 전체 id 목록을 요청해야 한다.

## 5. route·evidence 검증

278 전건에 대해 DB 원문과 대조했다 — `evidence` 가 공식 용법·용량 원문에 실재하는지 + 경로 패턴이 원문에 나타나는지. **mismatch 0**.

### 검증 중 잡은 자기 결함 2건

1. **site 패턴을 직접 재도출한 것이 오류였다.** 처음에는 패턴을 스스로 만들었는데 라 정본보다 좁아, 수술자 손소독 스크럽(`문지르`·`씻어내고`)을 **거짓 FAIL** 로 떨어뜨렸다(나 8m · 다 8m). 승인 판정의 근거가 된 패턴과 다른 잣대로 재검증하면 그것은 검증이 아니라 **다른 기준의 재판정**이다. → 라 감사 `sitePatterns` 를 VERBATIM 채택하고, selftest 가 감사 파일과 문자열 일치하는지 교차 확인(drift 탐지)하도록 고쳤다.
2. **근거 대조를 raw 원문과 하고 있었다.** 라는 `evidence` 를 **정규화된** 용법 원문에서 인용했다(`audit.evidenceField`). 같은 `normalize()` 를 통과시킨 텍스트끼리 비교하도록 바꿔 like-for-like 로 맞췄다(나 3건 잔여 mismatch 해소).

두 결함 모두 **대상의 문제가 아니라 내 검증기의 문제**였다. 수정 후 3 shard 전부 mismatch 0.

## 6. dry-run 결과 — 게이트 14/14 (3 shard 공통)

| # | 게이트 | 가 | 나 | 다 |
|---|---|:---:|:---:|:---:|
| G1 | SSOT 총계 47 fp / 278 m | PASS | PASS | PASS |
| G2 | shard 선언 일치 | PASS | PASS | PASS |
| G3 | fp 재현 100% | PASS | PASS | PASS |
| G4 | master 중복 0 | PASS | PASS | PASS |
| G5 | shard fp/master 교집합 0 | PASS | PASS | PASS |
| G6 | V2 READY 716/2,517 교집합 0 | PASS | PASS | PASS |
| G7 | LIVE 완료 2,509 교집합 0 | PASS | PASS | PASS |
| G8 | authored STORE canonical ko/en 보유 0 | PASS | PASS | PASS |
| G9 | route·officialSite·evidence 일치 | PASS | PASS | PASS |
| G10 | 근거 결손 0 | PASS | PASS | PASS |
| G11 | 차단 모집단 혼입 0 | PASS | PASS | PASS |
| G12 | canonicalDup 0 | PASS | PASS | PASS |
| G13 | dry-run DB write 0 | PASS | PASS | PASS |
| G14 | 예상 write 일치 | PASS | PASS | PASS |

**2회 실행 byte-identical** — 가 `dea40a4799ce5bfa` · 나 `5beef0b7ff0791ce` · 다 `f0c1dfdac5991270`, 정본 manifest 와도 동일.

### 경로별 샘플 (5 route 전건 PASS)

가 7건 · 나 7건 · 다 6건 — **fp 재현 true · 경구 동사 용법/주의 모두 false · 부위 표현 보존 true · 수치 누락 0 · 이상 0**.

실물 대조 (공식 → 합성, 원문 보존):

- **rectal** `1회 5 mL 직장내 주입… 3세 미만의 소아는 약액의 1/2정도… 항문에 삽입` → 동일 보존, 라벨 `사용 안내` / `How to use it rectally`
- **vaginal** `30 mL를 온수 약 1 L에 희석하여 질내외를 1일 1~2회 세정… 1주 1~2회` → 동일 보존
- **nasal** `만 12세 이상… 1일 1~3회, 1회 1번 각 코안에 뿌립니다. 적용간격은 8시간 이상` → 동일 보존
- **oromucosal** `1회 적당량을 1일 2~3회… 입안을 헹구어 냅니다. 구강내 소독시에는 2.5배 희석` → 동일 보존
- **cutaneous** `이 약 5 mL를 손바닥에… 3분 이상 문지르면서… 2회 실시… 30초 동안` → 동일 보존

연령·횟수·용량·기간·부위 전부 보존, 경구 표현 0건.

## 7. 예상 write

| shard | master | KO 4T | EN 2T | 계 |
|---|---:|---:|---:|---:|
| 가 | 93 | 372 | 186 | **558** |
| 나 | 93 | 372 | 186 | **558** |
| 다 | 92 | 368 | 184 | **552** |
| **계** | **278** | **1,112** | **556** | **1,668** |

WO 확정치와 **전부 일치**(dry-run 실측 계획 == 예상).

## 8~9. canonicalDup · DB write

**canonicalDup 0** (3 shard 전부) · **DB write 0** — 어댑터에 apply 경로가 존재하지 않는다. 회수분 apply 원장 파일도 미생성.

## 10. 산출물

- adapter: `apps/api-server/src/scripts/otc-v2-external-site-recovery-adapter.ts`
- manifest: `otc-v2-recovery-dryrun-manifest.{ga,na,da}.json`
- samples: `otc-v2-recovery-samples.{ga,na,da}.json`
- 본 CHECK

## 11. 기존 V2 계약 불변 확인

공용 러너 확장은 전부 additive 이며, 기존 V2 다 shard dry-run 재실행 결과의 **`koHtmlMd5` 238/238 · `fpOk` 238/238 동일**(fingerprint·KO 합성 불변). manifest 전체 md5 는 달라지는데, 이는 코드가 아니라 **다 shard 가 그 사이 LIVE apply(`e421890b9`) 되어 DB 슬롯 상태(easy canonical → deprecated, authored/en canonical 생성)가 바뀐 결과**다. `easyCanonical1`·`authoredConflict`·`enCanonical`·`anomalies` 외 필드는 전부 동일하다.

## 12. 가 shard 생산 착수 가능 여부

| shard | 판정 |
|---|---|
| **가** | **READY** — 게이트 14/14 PASS · 적격 17 fp / 93 master · 558T. 순서 차단 없음 |
| 나 | NOT READY — 선행 `ga` KO/EN apply·독립검증 미완료 (차단 3건) |
| 다 | NOT READY — 선행 `ga`·`na` 미완료 (차단 6건) |

단, **본 WO 범위에서 LIVE apply 는 금지**이며 어댑터에 apply 경로가 없다. 실제 착수는 apply 지원 WO 이후다.

## 13. 검토 요청 (게이트 밖 관찰)

`cutaneous` 대상에 **수술자 손 소독 스크럽**(큐앤큐포비돈요오드스크랍 · 큐앤큐헥시딘스크랍 등)이 포함되어 있다. route 판정은 정확하다(피부). 다만 과거 topical V6 트랙에서 *"가글·질세정·수술자스크럽·수술부위어플리케이터 = 점막·전문용 제외"* 로 보류한 선례가 있어, **소비자 매장 설명서 대상으로 적절한지**는 별도 판단이 필요하다. 본 WO 게이트는 전부 통과하므로 차단하지 않고 기록만 남긴다.

## 14. 준수 / Git

- **LIVE apply 미실행** · **DB write 0** · apply 경로 미구현
- 기존 V2 러너 fingerprint 계약 **변경 0** · V2 READY 원장 **수정 0** · 라 승인 SSOT/감사/proposal **수정 0**
- 제품명 route 추정 **0** · 기존 완료 2,509 master 재처리 **0**
- `apps/api-server/.env` **보존**(삭제 금지 준수) · 자격증명 값 **출력 0** · 루트 `.env` **미사용**
- `git add .` 미사용 · reset/clean/stash 미사용 · 다른 세션 파일 **미접촉**
