# CHECK — HFF Combo Completion A (관절·피부 2원료 이상 복합형 + 뮤코다당·단백 SF)

- **WO**: WO-O4O-HFF-COMBO-COMPLETION-A-JOINT-SKIN-V1 (에이전트 A)
- **자동승인 계약**: WO-O4O-HFF-CONTENT-PRODUCTION-AUTO-AUTHORIZATION-CONTRACT-V1
- **선행 WO**: WO-O4O-HFF-INDEPENDENT-COLLAGEN-* (콜라겐 96 LIVE) · WO-O4O-HFF-INDEPENDENT-MAX-PRODUCTION-A-JOINT-SKIN (관절·피부 단일 260 LIVE)
- **완료 시각**: 2026-07-23 KST
- **상태**: ✅ CLOSED / PASS — **248 신규 LIVE** (27 관절 복합형 + 218 뮤코다당·단백 SF + 3 액상), drift(자기) 0, canonicalDup 0

---

## 1. 목표와 근본 진단

A 소유 관절·피부 원료(콜라겐·히알루론산·엘라스틴·세라마이드·글루코사민·MSM·뮤코다당·단백·N아세틸글루코사민·보스웰리아)의 **2원료 이상 복합형**을 독립 소유·완결 생산. 콜라겐 단일은 선행 WO에서 소진, 본 WO는 **복합형 + 미생산 단일(뮤코다당·단백)** 대상.

### A-01/A-02 — census + 글루코사민 lookbehind 버그 확정

- HFF 후보 2,431건 스캔, **≥2 A원료 signature 169건**, 단일-A 2,021건.
- **핵심 버그**: 초기 probe 의 글루코사민 검출식 `글루코사민(?!.*아세틸)`(lookahead) 이 `N-아세틸글루코사민` **부분 문자열**을 오매칭 → NAG+글루코사민(61)·MSM+NAG+글루코사민(47) signature 허수 팽창. 빌더에서 **lookbehind `(?<!아세틸)글루코사민`** 으로 교정 → 실제 combo 는 대부분 MSM+NAG 로 수렴.
- **뮤코다당·단백 오분류 방지**: 콘드로이친은 뮤코다당·단백의 **지표성분**(별도 고시원료 아님) → `콘드로이틴` 을 A_INGREDIENTS 마커에서 제외 → 뮤코다당 단독 = **N==1 단일-기능성 SF**(최대 물량).

### A-03 — 구조적 불일치 해소: 기능성 기반 A 전용 빌더

공유 `composeCombo` 는 **함량(mg) 기반**(원료별 `declaredAmount` + `SRC_LABEL` + `G-MULTI-AMOUNT-SOURCE` guard 로 각 수치가 BASE_STANDARD 라벨 창에 존재하는지 검증)이며, `SRC_LABEL` 에 A 관절 키가 전무 → 함수 부적합. **결정**: `composeSf` 처럼 **함수(공식 기능성)만 렌더·mg 량 절대 미기재** 하는 A 전용 자기완결 빌더 `hff-combo-a-build.ts` 저작. 함량-소스 guard 를 애초에 회피 → 매장용 설명서 원칙(원문 밖 주장 금지·공식 기능성 보존) 및 Git "A 전용 additive 파일" 규칙 동시 충족.

### 기능성 귀속 안전 모델 (오귀속 0 핵심)

1. **라벨 블록 정밀 귀속**: `[원료명] 텍스트` MAIN_FNCTN 블록에서만 원료별 기능성 파싱. 모든 present 원료가 라벨 블록으로 해소될 때만 사용.
2. **단일-기능성 폴백**(무라벨·부분라벨 다원료): 모든 present 원료가 **단일 기능성**(MSM·글루코사민·뮤코다당·보스웰=관절만)이면 귀속 무모호 → 각 원료 유일 기능성이 MAIN_FNCTN 에 실제 선언되어야 생산(grounding). **다기능 원료(NAG/HA/콜라겐) 포함 시 HOLD** — skinMoist 등 공유 기능성 오귀속 방지.
3. **비-A 기능성 혼입 차단**(`MIXED_NONA`): 오메가·루테인·홍삼·유산균 등 비-A 기능성 원료 존재 시 HOLD(B/C 또는 혼합 트랙).

---

## 2. 신규 LIVE

| tag | masters | ko SPD | en SPD | canonicalDup | 유형 |
|-----|:---:|:---:|:---:|:---:|------|
| `batch:combo-joint-a-v1` | 26 | 26 | 26 | 0 | 관절 복합형(MSM+NAG 중심, 라벨/단일-기능성 귀속) |
| `batch:combo-joint-a-v2` | 1 | 1 | 1 | 0 | MSM+글루코사민(무라벨→단일-기능성 폴백 회수) |
| `batch:single-functional-muco-a-v1` | 218 | 218 | 218 | 0 | 뮤코다당·단백 SF(N==1) — 최대 물량 |
| `batch:combo-muco-liquid-a-v1` | 3 | 3 | 3 | 0 | 액상(병/포): 뮤코다당+MSM+NAG · MSM+NAG · 뮤코다당 |

- **총 신규 248 · DB write 992** (masters 248 INSERT + candidates 248 UPDATE→approved_new_master + SPD 496 INSERT[ko+en]).
- 성분 조합: MSM+N아세틸글루코사민(주력)·MSM+글루코사민·뮤코다당+MSM+NAG(3원료). 기능성: 관절 및 연골 건강 중심 + NAG 피부보습 병기.
- 예상 write = 실측 write(992). 4개 배치 postVerifyPass = true.

### 독립검증 (manifest ID 기준 · drift-proof)

전역 HFF STORE LIVE 는 B/C 동시 생산으로 공유 증가(9,814→10,334, +520)하므로 **전역 count 는 A drift 지표 아님**. rollback manifest 의 정확한 master/candidate ID 로 검증:

| 검증 | 결과 |
|------|:---:|
| manifest masters 합 / unique | 248 / 248 |
| 배치 간 master overlap · candidate overlap | 0 · 0 |
| DB 실존 master | 248/248 |
| 각 master ko 정확히 1 · en 정확히 1 (STORE canonical o4o_hff_generated) | 0 위반 · 0 위반 |
| regulatory_type='건강기능식품' | 0 위반 |
| candidate 링크(matched_product_master_id) | 248/248 |
| **우리 248 master 내 canonicalDup** | **0** |
| SPD 총합 | 496 (=248×2) |

- **기능 충실도 스캔**(별도 signature 재쿼리): A 기능성 미렌더 0 / 비-A 기능성 claim 누출 0. `인지` 1건 플래그는 제조사명 `농업회사법인지에이치내츄럴`(법**인**+**지**에이치…) 부분문자열 오탐 — 기능성 claim 아님(noAfunc=0 로 확인).

---

## 3. REVIEW_LATER / HOLD (원인별 · 전체 중지 아님)

| 사유 | 수 | 분류 · 판단 |
|------|:---:|------|
| `MIXED_NONA` | 241 | 비-A 기능성 원료 혼입(오메가/루테인/홍삼 등) → B/C 또는 혼합 트랙 |
| `UNLABELED_MULTI` | 102 | 무라벨 다원료 + 다기능 원료(NAG/HA/콜라겐) 포함 → 귀속 모호 안전 HOLD |
| `GUARD_REVIEW`(액상 PRE-SRC-BASIS 등) | 35 | 액상 기준량 grounding 미검증 → HOLD("명확한 경우만" 게이트) |
| `GUARD_BLOCKED` | 4 | bulk/성상 룰 트립 → BLOCKED |
| `COMPOSE_HOLD`(serving parse) | 3 | 액상 섭취형태 미파싱 → HOLD |

**A 복합형·뮤코다당 안전 후보 소진 확인**: solid·liquid 양 트랙 최종 funnel `target=0`. 잔여는 전부 상기 혼합/모호/guard 사유(안전 후보 아님). 콜라겐+히알루론/엘라스틴 pair 는 solid freeSolid ≈ 0(히알루론 = B/C shard 원료로 A 미개입) → 해당 없음.

---

## 4. 게이트·불변식 준수

| 게이트 | 결과 |
|------|------|
| dry-run PASS (4배치 masters=ko=en, canonicalDup 0) | ✅ |
| apply postVerify PASS (4배치) | ✅ |
| 예상 write = 실측 write (992) | ✅ |
| rollback manifest 생성 (4배치) | ✅ (`/c/tmp/hff-a-combo/manifests/`) |
| 자기 drift 0 (manifest ID 기준 248 정확·canonicalDup 0) | ✅ |
| A/B/C 소유 원료 교집합 0 (뮤코다당·MSM·NAG·글루코사민=A joint / 히알루론·오메가 미접촉) | ✅ |
| 복합 기능성 삭제 0 (NAG 피부보습 병기 유지) · 원문 밖 주장 0 (mg 미기재·공식 기능성만) | ✅ |
| 전문가 상담 footer 유지 | ✅ |
| 공용 파일 무접촉 (select/compose/generate/registry/apply/guard read-only) | ✅ |
| Git: A 전용 additive 파일만·`git add .` 미사용·pnpm-lock 미접촉 | ✅ |

---

## 5. 산출물 / 남은 TODO

- **신규 코드**: `apps/api-server/src/scripts/hff-combo-a-build.ts` — A 전용 자기완결 함수-기반 복합형/SF 빌더(A registry + 라벨블록 귀속 + 단일-기능성 폴백 + MIXED_NONA 차단 + combo guard). **공용 파일 무영향.**
- apply: 기존 `hff-sf-apply.ts` 무수정 재사용(--target/--tag, --apply + HFF_SF_APPLY_CONFIRM=YES).
- 조사·검증 probe(`C:/tmp/hff-a-combo/*.cjs`)는 read-only 임시 → 커밋 제외.

### 남은 TODO / 재개 위치
1. `UNLABELED_MULTI` 102 — 다기능 원료(NAG/HA/콜라겐) 포함 무라벨 복합형. 원천 라벨 보강 시 재평가.
2. `MIXED_NONA` 241 — 비-A 기능성 혼합. B/C 협의 또는 혼합 전용 트랙.
3. 액상 `GUARD_REVIEW` 35 / bulk `GUARD_BLOCKED` 4 — 기준량 grounding·소비자 섭취법 확인 후.
4. 콜라겐+히알루론/엘라스틴 solid pair — 히알루론(B/C shard) 미개입 → A 범위 외.

관련: 선행 CHECK = `docs/checks/CHECK-O4O-HFF-INDEPENDENT-COLLAGEN-REMAINDER-UNLOCK-A-V1.md`
