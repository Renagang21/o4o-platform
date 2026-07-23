# CHECK — HFF Combo Unregistered A (미등록·HOLD Combo 재분류 · 관절·연골·피부)

- **WO**: WO-O4O-HFF-COMBO-UNREGISTERED-A-JOINT-SKIN-V1 (에이전트 A)
- **자동승인 계약**: WO-O4O-HFF-CONTENT-PRODUCTION-AUTO-AUTHORIZATION-CONTRACT-V1
- **선행 WO**: WO-O4O-HFF-COMBO-COMPLETION-A-JOINT-SKIN-V1 (248 LIVE, `44cd8ddd0`) · B `9ef60ef69` · C `7b747297c`
- **완료 시각**: 2026-07-23 KST
- **상태**: ✅ CLOSED / PASS — **36 신규 LIVE** (solid combo 32 + liquid/콜라겐 combo 4), 자기 drift 0, canonicalDup 0, 비-A 누출 0

---

## 1. 목표와 근본 진단

선행 WO 가 HOLD 한 `UNLABELED_MULTI` 102·MIXED_NONA·액상 REVIEW 를 **전수 재분류**하여 안전 후보를 A 전용 additive seam 으로 최대 LIVE 반영.

### 핵심 진단 — "UNLABELED_MULTI 는 무라벨이 아니다"

선행 빌더의 귀속은 (a) `[원료]` **대괄호 라벨 블록**, (b) 모든 present 원료가 **단일-기능성**일 때의 폴백 두 경로뿐이었다. census 결과 다수 제품이 **대괄호는 없지만 원료명 자체를 구분자로** 기능성을 나열(`1) N-아세틸글루코사민 : 관절…·피부보습`, `히알루론산 : 피부보습`)하고 있었다. 즉 라벨은 존재하되 형식이 대괄호가 아니었을 뿐 → 회수 가능.

### A-03 — A 전용 additive 3-파일 seam (공용 파일 무접촉)

| 파일 | 역할 |
|------|------|
| `hff-combo-a-unregistered-registry.ts` | A 기능성 canonical 문구(FN) + A_INGREDIENTS(뮤코다당·MSM·NAG·글루코사민·히알루론산·세라마이드·보스웰리아·**초록입홍합**·콜라겐·엘라스틴) + NONA_FUNC + LIQUID. 값은 선행 build 인라인 정의를 동등 이관. |
| `hff-combo-a-classify.ts` | **귀속 엔진** `attributeFunctions(present, mf)` — 3계층. |
| `hff-combo-a-build.ts` | 위 2개를 import 하도록 리팩터(인라인 중복 제거). SQL fetch 정규식에 `초록입홍합\|리프리놀` 보강. |

### 기능성 귀속 3계층 (오귀속 0)

1. **SINGLE**(N==1): 원료 canonical 기능성 중 MAIN_FNCTN 에 실제 선언된 것만.
2. **TIER-NAME**(이름-앵커 세그먼트): 각 A 원료명이 MAIN 에 등장하면 `원료명 위치 ~ 다음 앵커(다른 원료명·부원료명) 직전`을 세그먼트로 삼아 **세그먼트 안에서만** 기능성 파싱. `[라벨]`·`* 이름`·`- 이름 :`·`N) 이름 :`·`이름(...) 기능성` 구분자 무관(위치 앵커). 세그먼트 밖 기능성은 절대 미귀속 → 정밀·무모호. 부원료 비타민/미네랄 문구('…에 필요')는 FN 정규식 미매칭이라 세그먼트에 포함돼도 무해.
3. **TIER-UNIQUE**(이름-무표기 폴백): 관절(joint/jointOnly)은 present 중 capable 원료 전체에 부여(관절 원료 핵심·상시 기능성). 피부(skinMoist/skinUV)는 **유일 capable 원료**에만 부여, 2개 이상 capable 이면 `SKIN_AMBIGUOUS` HOLD.

**source grounding 실검증**(4종 raw MAIN_FNCTN 대조): 인스킨밸런스(NAG:관절연골·피부보습 / HA:피부보습), 마이포텐(HA:피부보습·자외선), 더모이스처([NAG]관절연골 / [HA]피부보습 — 대괄호+부원료 브라켓 혼재를 이름앵커로 정확 분리), 더 콜라겐 뷰티(콜라겐:피부보습·자외선 / HA:피부보습) — 전부 원문과 정확 일치, 부원료(비타민C·판토텐산·셀레늄·아연·비오틴) 미귀속.

---

## 2. 신규 LIVE

| tag | masters | ko | en | canonicalDup | 유형 |
|-----|:---:|:---:|:---:|:---:|------|
| `batch:combo-a-unreg-solid-v1` | 32 | 32 | 32 | 0 | 고형 복합형: MSM+NAG 28 · NAG+히알루론산 3 · NAG+뮤코다당 1 |
| `batch:combo-a-unreg-liquid-v1` | 4 | 4 | 4 | 0 | 액상 MSM+NAG 3 · **콜라겐+히알루론산** 1 |

- **총 신규 36 · DB write 144** (master 36 INSERT + candidate 36 UPDATE→approved_new_master + SPD 72 INSERT[ko+en]). 예상 write = 실측 write. 2배치 postVerifyPass = true.
- signature: MSM+N아세틸글루코사민(주력 31) · N아세틸글루코사민+히알루론산 3 · 콜라겐+히알루론산 1 · N아세틸글루코사민+뮤코다당·단백 1.
- 귀속 tier 분포(고형 32): TIER-NAME 18 · TIER-UNIQUE 14. **다기능 원료(NAG/HA/콜라겐) 포함 복합형은 선행 단일-기능성 폴백에서 전부 HOLD 되던 것을 TIER-NAME 이 세그먼트 grounding 으로 회수**(NAG+HA 3·콜라겐+HA 1 등).

### 독립검증 (manifest ID 기준 · drift-proof)

전역 HFF STORE LIVE 는 B/C 동시 생산으로 공유 증가하므로 **전역 count 는 A drift 지표 아님**. rollback manifest 의 master/candidate ID 로 검증:

| 검증 | 결과 |
|------|:---:|
| manifest masters 합 / unique | 36 / 36 |
| 배치 간 master · candidate overlap | 0 · 0 |
| DB 실존 master | 36/36 |
| 각 master ko 1 · en 1 (STORE canonical o4o_hff_generated) | 36 · 36 · 위반 0 |
| regulatory_type='건강기능식품' | 위반 0 |
| candidate 링크(matched_product_master_id) | 36/36 |
| **우리 36 master 내 canonicalDup** | **0** |
| SPD 총합 | 72 (=36×2) |
| 비-A 기능성 claim 누출(ko SPD 본문 스캔) | **0** |

---

## 3. HOLD (원인별 · 전체 중지 아님 · 안전 후보 소진)

최종 exhaustion 재실행 결과 **target = 0**(모든 생산 가능 후보 소진). 잔여는 전부 아래 정당 HOLD:

| 사유 | 수 | 판단 |
|------|:---:|------|
| `MIXED_NONA` | 244 | 비-A **기능성** 원료 혼입. `nonA 기능성 claim 이 MAIN_FNCTN 에 실존` 213 + `nonA 가 BASE 지표에만 있으나 MAIN 에 비-A 기능성 문구 실존` 25 = 전수 cross-domain. A-only 렌더 시 감마리놀렌(혈행·월경전)·커큐민(근력)·크릴오일(관절)·홍삼(면역)·은행잎(기억)·프락토올리고(장) 등 **비-A 기능성 삭제 필요 → 매장설명서 원칙 위반**. B/C 도메인 경계로 HOLD. |
| `GUARD_REVIEW` | 73 | 액상 `PRE-SRC-BASIS-UNVERIFIABLE-003` 52 + `D-CLAIM-GROUNDED-002` 21 → 기준량·주장 grounding 미검증. WO "basis 명확한 제품만" 게이트. |
| `GUARD_BLOCKED` | 4 | `Q-TRUNCATED-002` — 제품명에 함량(1200mg 등) 절단 표기. |
| `SKIN_AMBIGUOUS` | 2 | 히알루론산+세라마이드 무표기, 둘 다 피부보습 capable → 귀속 모호 HOLD. |
| `NAME_SEG_NO_FUNC` | 1 | 히알루론산+보스웰리아 — 히알루론산 세그먼트에 피부 기능성 미선언(부원료). |
| `COMPOSE_SERVING_PARSE_FAILED` | 3 | 액상 섭취형태 미파싱. |
| `ALREADY_PROMOTED` | 386 | 이미 생산(선행 A + 본 WO 36 + B/C). |

**초록입홍합**: registry·fetch 보강했으나 잔여 후보 1건이 오메가3(초록입홍합 자체 지표) co-occurrence 로 MIXED_NONA 편입(비표준 문구 '될 수 있습니다' 포함) → HOLD. 초록입홍합 SF 는 선행 WO 에서 생산 완료.

---

## 4. 게이트·불변식 준수

| 게이트 | 결과 |
|------|------|
| dry-run PASS (2배치 masters=ko=en, canonicalDup 0, candMatch missing0/ambiguous0) | ✅ |
| apply postVerify PASS (2배치) | ✅ |
| 예상 write = 실측 write (144) | ✅ |
| rollback manifest 생성 (2배치, `/c/tmp/hff-a-combo/manifests/`) | ✅ |
| 자기 drift 0 (manifest ID 기준 36 정확·canonicalDup 0) | ✅ |
| A/B/C statementNo 교집합 0 (본 candidate 전부 사전 미링크·promoted/taken 제외) | ✅ |
| 복합 기능성 삭제 0 (NAG 피부보습·콜라겐 자외선 병기 유지) · 원문 밖 주장 0 (mg 미기재·공식 기능성만) | ✅ |
| 전문가 상담 footer 유지 | ✅ |
| 공용 파일 무접촉 (compose/generate/registry/guard/apply read-only 재사용) | ✅ |
| Git: A 전용 additive 파일만·`git add .` 미사용·pnpm-lock/OTC 미접촉·heredoc `<<'EOF'` | ✅ |

---

## 5. 산출물 / 남은 TODO

- **신규 코드**: `apps/api-server/src/scripts/hff-combo-a-unregistered-registry.ts` · `hff-combo-a-classify.ts` (신규) · `hff-combo-a-build.ts` (registry/classify import 리팩터 + fetch 정규식 보강).
- apply: 기존 `hff-sf-apply.ts` 무수정 재사용.
- 조사·검증 probe(`C:/tmp/hff-a-combo/*.cjs`) 및 manifest 는 read-only/rollback 용 → 커밋 제외.

### 남은 TODO
1. `GUARD_REVIEW` 액상 73 — 기준량 grounding 확보 시 재평가(현재 안전 후보 아님).
2. `MIXED_NONA` 244 — B/C 협의 또는 다-도메인 혼합 전용 트랙(A 단독 생산 불가).
3. `SKIN_AMBIGUOUS`/`NAME_SEG_NO_FUNC` 3 — 원천 라벨 정밀화 시 재평가.

관련: 선행 CHECK = `docs/checks/CHECK-O4O-HFF-COMBO-COMPLETION-A-JOINT-SKIN-V1.md`
