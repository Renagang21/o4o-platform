# CHECK — WO-O4O-OTC-TOPICAL-PATCH-FULL-CORPUS-COMPLETION-DA-V9

> 일반의약품 첩부제 **잔여 전체 후보** 전수 조사·정규화·분류 후 생산 가능한 전량을 KO+EN 매장용 설명서 canonical 로 완결 — 에이전트 다
> 실행일: 2026-07-24 · 상태: **CLOSED / PASS (첩부제 트랙 완결 — 생산 가능 후보 0)**

---

## 1. 결과 요약

| 항목 | 값 |
|------|-----|
| 신규 canonical master | **545** (니코틴 패치 63 + 무괄호 한방·복합 등 482) |
| write 행 | KO 2,180T (545×4) + EN 1,090T (545×2) |
| 생산 unit | 니코틴 3 + 무괄호 87 = **90** / fingerprint 167(무괄호) |
| HOLD (최종) | **0** |
| canonicalDup (자기 audit set) | 0 |
| target 밖 write / drift | 0 |
| route·제형 혼입 | 0 (첩부제 전용 게이트 HOLD_ROUTE·HOLD_NOT_PATCH) |
| replacement audit | 545 (WO 필터 = master 수 일치) |
| no-op 재실행 | 전 unit masters 0 |
| topical KO canonical LIVE 누계 | **2,558** (직전 2,013 → +545) |
| 잔여 생산 가능 후보 | **0** |

## 2. 전체 후보 census (프로덕션 read-only, proxy 5473 + o4o_api)

대상 정의: 제품명에 첩부 제형 토큰(플라스타·플라스터·카타플라스마·파프·패치·패취·첩부·경고제)을 포함하고 `mfds_easy_drug` STORE canonical 이 살아 있으며 authored canonical(`o4o_drug_otc_topical`·`mfds_drug_otc`·`nutrition_combo`)이 없는 master.

| 분류 | master | 제품명 | 처리 |
|------|-------:|------:|------|
| **READY (생산 완료)** | 482 | 109 | 87 unit 전량 생산 |
| **EXCLUDE — 수출용** | 203 | 33 | 소매 유통 대상 아님 |
| **EXCLUDE — 군납** | 7 | 2 | 동일 |
| **EXCLUDE — 보건소용** | 3 | 3 | 니코스탑20/10/30패취(보건소용) |
| **EXCLUDE — 비매품** | 1 | 1 | 케토톱엘플라스타(비매품) |
| **SPLIT_REQUIRED** | (0 잔여) | — | 3 content-hash 그룹을 제형·성분 축으로 분리해 본 WO 내에서 소진 (8256ca 첩부/플라스타, 3b8c58 첩부/플라스타, b1fd71 플라스타/첩부) |
| **HOLD_SOURCE** | 0 | — | 공식 원문 결손 사례 없음 |
| **HOLD_IDENTITY** | 0 | — | 제품명 성분 미표기는 HOLD 사유로 쓰지 않음(§4) |

니코틴 패치(순서 3)는 census 측정 이전에 본 WO 에서 선행 완료(63 master)되어 위 표에서는 이미 제외되어 있다.

## 3. 무괄호 한방·복합 첩부제 처리 방식 (순서 4)

- 제품명에 성분·함량이 없다는 이유로 HOLD 하지 않았다. 판단 근거는 **공식 원문(e약은요 STORE canonical)의 효능·용법·주의사항 본문**이며, 원문이 존재하고 첩부 제형이 확정되면 READY 로 분류했다.
- 정규화는 **read-only census + 로컬 스크립트**만 사용했고 신규 공용 ETL·시스템은 만들지 않았다.
- 84 content-hash 그룹 → 제형·성분 축 분리 후 **87 생산 unit**. unit 별 제품명 집합은 상호 배타(1 제품명 = 1 unit)이며, target 은 정확 제품명 집합(`--names`)으로만 고정했다.

### 성분·함량 복원 결과

| 구분 | unit | master | 표기 |
|------|-----:|------:|------|
| 제품명에 성분 명시 → 성분 행 표기 | 5 | 24 | 펠비낙 21 · 케토프로펜 3 |
| 제품명·원문 모두 성분 미표기 → 성분 행 생략 | 82 | 458 | 제형·효능 기반 제목만 사용 |

성분 미표기 458 master 는 4개 공개 소스(제품명·규격·e약은요 본문·허가 요약) 어디에도 성분명이 없어 **복원 실패**로 분류했다. 추정 표기는 하지 않았고, 대신 제형(파프/플라스타/첩부제/경고제)과 원문 효능을 그대로 제목·본문에 반영했다.

### 제목 분포 (master 기준)

진통·소염 파프(카타플라스마) 334 · 진통·소염 플라스타 74 · 벌레 물린 데·가려움 플라스타 33 · 펠비낙 첩부제 16 · 진통·소염 경고제 9 · 금연보조 패치 3 · 케토프로펜 플라스타 3 · 펠비낙 파프 3 · 진통·소염 첩부제 3 · 펠비낙 플라스타 2 · 티눈·굳은살 경고제 2

## 4. EN 저작 파이프라인 (창작 차단 설계)

- 원문 문장을 섹션별로 분해하고 **문장 사전(CAU_FULL) + 항목 사전(EFF_TERMS·LIST_TERMS·AE_TERMS) + 좁은 구문 패턴**으로만 번역한다.
- 사전에 없는 문장·용어가 하나라도 나오면 **즉시 중단(exit 2)** 하고 사전을 보강한 뒤 재생성한다. 따라서 EN 본문에 원문에 없는 의료 사실이 들어갈 경로가 없다.
- 87 unit 생성 시 미매핑 0 · 중복 slug 0 · 한글 잔존 0(러너 EN 게이트) · 약사 상담 footer 100%.

## 5. 러너 보완 (본 WO 중 수정)

`apps/api-server/src/scripts/drug-otc-topical-patch-store-leaflet-batch.ts`

1. 부착 신호 탐지에 `붙여/붙인/붙일` 추가 — `환부에 붙여서 사용합니다` 형 원문에서 경구 오기 정규화가 통째로 건너뛰어져 HOLD_KO 로 떨어지던 문제.
2. 첩부제 원문 쇽 증상 주해의 `복용후 바로 두드러기…` → `사용 후 바로` 정규화. 부착 시점을 뜻하는 원문 오기이며 안전정보 내용은 그대로 유지.

두 수정 모두 기존 LIVE 본문에는 영향이 없다(write 는 `NOT EXISTS` 기반 신규 insert 만 수행).

## 6. 운영 중 발견한 실행 함정 (재발 방지)

- **CRLF spec + MSYS argv**: Windows 개행이 남은 spec 파일에서 마지막 필드가 `\r` 로 비어 있지 않게 되어 `--form $'\r'` 가 붙고, 빈 인자가 argv 전달 과정에서 소실되어 `--form --apply` 로 결합 → target 0 rows / mode 는 APPLY 로 표시되는 조용한 무write 가 발생했다. spec 파일 CR 제거 + 러너 실행기에서 `tr -d '\r'` 로 방어.
- **`--form` substring 필터의 표기 편차**: `제일쿨파프`, `제일한방파프에이카타플라즈마`, `니코스탑20패취` 처럼 제품명 표기가 제형 토큰과 달라 master 가 통째로 누락된다. unit 별 제품명이 배타적이므로 form 필터를 제거하고 `--names` 만으로 target 을 고정했다.
- **원문의 zero-width space**: `어깨 결림에 따른 어깨 ​​통증` 처럼 비가시 문자가 섞여 `--effkey` 매칭이 실패한다(HOLD_EFF_MISMATCH). effkey 는 원문 raw 에 실제 존재하는 최장 접두부만 사용하도록 생성기를 수정.

## 7. 검증 (프로덕션 read-only)

| 검증 | 결과 |
|------|------|
| WO audit DISTINCT master (slug `np-%`) | 482 |
| 동 master KO canonical(`o4o_drug_otc_topical`) | 482 ✅ |
| 동 master EN canonical | 482 ✅ |
| 동 master easy `deprecated` | 482 ✅ |
| canonical duplicate (master×language) | 0 ✅ |
| audit rows | 482 ✅ |
| KO `삼키`·`바르는 방법` 잔존 | 0 ✅ |
| KO 약사 상담 footer 누락 | 0 ✅ |
| EN 한글 잔존 | 0 ✅ |
| EN pharmacist footer 누락 | 0 ✅ |
| dry-run ×2 byte-identical | 87/87 ✅ |
| apply 후 재실행 no-op | 87/87 masters 0 ✅ |
| topical KO canonical LIVE 누계 | 2,558 (= 2,076 + 482, drift 0) ✅ |
| census 재산출 후 `생산대상` 버킷 | 0건 (버킷 소멸) ✅ |

## 8. 잔여 후보와 사유

| 잔여 | master | 사유 |
|------|-------:|------|
| 수출용 | 203 | 국내 소매 유통 대상 아님 — 생산 제외 정책 |
| 군납 | 7 | 동일 |
| 보건소용 | 3 | 동일 (동일 제품의 소매판은 생산 완료) |
| 비매품 | 1 | 동일 |

**생산 가능한 첩부제 후보는 0 이며, 첩부제 트랙은 완결되었다.**

## 9. 산출물

- EN config: `apps/api-server/src/scripts/data/topical-patch/otc-patch-en-np-*.json` (87) · `otc-patch-en-nico-*.json` (3)
- run manifest: `apps/api-server/src/scripts/data/topical-patch/otc-topical-patch-batch-np-*.run.json`
- claim: `apps/api-server/src/scripts/data/otc-production-claim.da.json`
