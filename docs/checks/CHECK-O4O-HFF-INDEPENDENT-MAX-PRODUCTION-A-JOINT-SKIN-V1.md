# CHECK — HFF Independent Max Production A (관절·피부 구조 확장)

- **WO**: WO-O4O-HFF-INDEPENDENT-UNLOCK-AND-PRODUCTION-A-V1 (에이전트 A — 콜라겐·관절/피부 구조 확장)
- **자동승인 계약**: WO-O4O-HFF-CONTENT-PRODUCTION-AUTO-AUTHORIZATION-CONTRACT-V1
- **완료 시각**: 2026-07-23 11:11 KST
- **상태**: ✅ CLOSED / PASS — 총 **260 신규 LIVE**, 독립검증 전부 통과, drift 0

---

## 1. 시작 기준선

| 항목 | 값 |
|------|-----|
| origin/main (착수) | `0cbc8a5f4` |
| HFF STORE canonical LIVE (착수) | 9,204 |
| HFF SPD canonical (착수) | 18,408 |
| canonicalDup / permitDup (착수) | 0 / 0 |
| 콜라겐 LIVE (착수) | 0 |
| 초록입홍합 LIVE (착수) | 0 |

---

## 2. 구조적 비생산 원인 (근본 진단)

공용 `hff-sf-select.ts` 는 MAIN_FNCTN 의 `[원료명]` 대괄호를 기준으로 SF 를 선별한다. 그리고 공용 파서 `classify()` 는
지표성분(펩타이드 서열·오메가3 계열)을 별도 원료로 오분류한다. 이 두 구조 제약 때문에:

- **콜라겐**: 286 후보 중 164건이 대괄호 0개(구형 포맷) → 대괄호 기반 select 가 통째로 누락. 지표 = 펩타이드 서열(Gly-Pro-Hyp)로 CLS 미등재.
- **초록입홍합(리프리놀/PCSO-524)**: 공식 기능성 = 관절 건강. 지표성분 = 오메가3 계열(DHA·EPA·DPA·α-linolenic acid). 공용 파서가 이를 "오메가3" 원료로 오분류 → PENDING_SHARED 로 묶여 있었음.
- **관절/피부 단일 활성(MSM·글루코사민·보스웰리아·N-아세틸글루코사민·세라마이드)**: 공용 registry 미등재(shard 파이프라인 미소유) → 비생산 상태로 잔존.

### 우회 설계 (자기완결 additive)

공용 파일을 건드리지 않고 `apps/api-server/src/scripts/hff-sf-a-build.ts` (config-driven, 자기완결) 신설. clean 모듈만 read-only import.
귀속 게이트:

1. **fn-set 게이트** — 제품의 모든 기능성 ∈ 해당 원료 공식 기능성 집합, 타 기능성 0 (`OTHER_FN` 배제).
2. **BASE_STANDARD 지표 순도 게이트** — 자기 원료 지표(`colMark`) 존재 + 타 활성 지표(`otherMark`) 0.
   관절 단일 활성들은 **동일 기능성("관절·연골 건강")을 공유**하므로 fn-set 만으로 단일/복합 구분 불가 → 순도 게이트가 필수 방어선.
3. 비액상 / 미승격 / 미선점(taken) / composeSf 성공 / Grounding Guard BLOCKED·REVIEW 0.

functionsKo = 소스 원문(래퍼 정규화), functionsEn = 소스 (영문) 우선 → 공식 MFDS 영문 overlay. DB write 는 apply 단계에서만.

---

## 3. 성분별 신규 LIVE (독립검증 결과)

| 원료 | tag | masters | ko SPD | en SPD | canonicalDup | permitDup |
|------|-----|:---:|:---:|:---:|:---:|:---:|
| 콜라겐펩타이드 | `batch:single-functional-collagen` | 18 | 18 | 18 | 0 | 0 |
| 초록입홍합추출오일 | `batch:single-functional-green-lipped-mussel` | 16 | 16 | 16 | 0 | 0 |
| MSM(디메틸설폰) | `batch:single-functional-msm` | 148 | 148 | 148 | 0 | 0 |
| 글루코사민 | `batch:single-functional-glucosamine` | 29 | 29 | 29 | 0 | 0 |
| N-아세틸글루코사민 | `batch:single-functional-n-acetyl-glucosamine` | 38 | 38 | 38 | 0 | 0 |
| 보스웰리아추출물 | `batch:single-functional-boswellia` | 8 | 8 | 8 | 0 | 0 |
| 세라마이드 | `batch:single-functional-ceramide` | 3 | 3 | 3 | 0 | 0 |
| **합계** | | **260** | **260** | **260** | **0** | **0** |

- **총 DB write = 1,040** (product_masters 260 INSERT + product_candidates 260 UPDATE + shared_product_descriptions 520 INSERT[ko+en]).
- cross-batch permit 중복 0 (한 제품이 두 배치에 속하지 않음).
- HFF 도메인 전역 canonicalDup **0** (기존 LIVE drift 0). 도메인 총계 9,495 (B/C 병렬 생산분 포함, 충돌 0).

### 마커 인식 규칙 (구현)

- 콜라겐: `콜라겐|Gly-Pro|Pro-Hyp|hydroxyprolyl|hydroxyproline`. 기능성 집합 = 피부보습 / 자외선 피부손상 / 모발상태 / 관절연골.
- 초록입홍합: `초록입홍합|리프리놀|lyprinol|perna|PCSO`. 오메가3(DHA/EPA/DPA) 는 **초록입홍합 지표**로 취급(otherMark 제외). 비타민E = 산화방지 부원료(기능성 클레임 없음) 허용.
- MSM: `MSM|메틸설포닐메탄|디메틸설폰`. 보스웰리아: `보스웰|유니베스틴`. 글루코사민: `(?<!아세틸)글루코사민`(NAG 오귀속 차단). NAG: `아세틸글루코사민`(관절+피부보습 이중 인정). 세라마이드: `세라마이드|글루코실세라마이드`.
- 공통 `otherMark` = 타 관절/피부 활성 전체(글루코사민·콘드로이틴·MSM·보스웰·뮤코다당·콜라겐·히알루론·세라마이드) + 비타민/미네랄 → 자기 원료(colMark) 제외 후 하나라도 지표로 등장 시 복합형 분리.

### 콜라겐 분포

- 콜라겐 후보 총 286 · 대괄호 0개(구형) 164 · 비액상 순수단일 24(2독립방법 수렴) · 액상 25 · 위장복합형 137.
- 생산가능 24 solid → grounded target 18 + HOLD 6. 원료유형: 저분자/피쉬/콜라겐펩타이드. 기능성: 피부보습·관절연골 중심.

---

## 4. 초록입홍합 분류 결과

| 구분 | 수 | 처리 |
|------|:---:|------|
| jointOnly (관절 단일 기능) | 22 | — |
| pure_glm (초록입홍합 단독, 타 기능성 원료 0) | 18 | — |
| 생산 (비액상·미선점·Guard PASS) | **16 LIVE** | 생산 |
| 액상 보류 | 1 | LIQUID_HOLD |
| Guard BLOCKED (D-CLAIM-UNGROUNDED) | 1 | HOLD |
| combo_otherIngredient (비타민D/망간 별도 기능성) | 3 | 복합형 분리 |
| OTHER_FN 복합형 | 9 | 복합형 분리 |

- 비타민E 함유 8건은 **산화방지 부원료**(스펙 80~150%, 기능성 클레임 없음) 확인 → 순수단일 초록입홍합으로 정상 생산.
- "홍삼초록입홍합연질캡슐" 은 BASE_STANDARD 에 진세노사이드 지표 부재 + 관절 단일 기능 → 홍삼은 브랜드/부원료, 순수단일로 확정.

---

## 5. 히알루론산 잔여 경합 정리 결과

| 항목 | 값 |
|------|-----|
| 히알루론산 후보 총 | 506 |
| 기승격/기생산 (shard 파이프라인) | 21 (tag: shard0-a1 4 / shard1-b1 12 / shard2-c1 5) |
| 잔여 미생산 | 485 → **PENDING_SHARED** |
| 내 콜라겐 배치 ∩ 히알루론 후보 | **0** |
| 내 초록입홍합 배치 ∩ 히알루론 후보 | **0** |

히알루론산은 공용 registry 소유(slug `hyaluronic-acid`, READY) + sharded SF 파이프라인이 생산 담당. 내 additive 경로로 생산 시 B/C 병렬 WIP 충돌 + shard 소유권 위반 → **미생산 확정**. 콜라겐/히알루론 공유 기능성(피부보습)에 의한 오귀속 0 검증 완료. 경합 = 문서화·교집합 0 으로 정리 종결.

---

## 6. REVIEW_LATER / HOLD / PENDING_SHARED

- **콜라겐 HOLD 6**: serving 부재/파싱실패 원료등록 5 (AP콜라겐효소분해펩타이드, 저분자콜라겐펩타이드 AG/GT/NS/SH), 벌크 Guard BLOCK 1 (에버콜라겐타임시그니처).
- **관절/피부 REVIEW_LATER (미분류·조사대기)**: 관절·피부 skin/joint-only 미생산 solid 약 897(순도 미검증 포함) 중, 생산분 제외 잔여. 특히 `_기타미분류` 229건(홍관보·천심련·관절본 등 개별인정형 복합추출물 다품종) 은 원료별 정밀 귀속 필요 → REVIEW_LATER.
- **PENDING_SHARED**: 히알루론산 485, 뮤코다당·단백(registry 소유, slug `mucopolysaccharide-protein`) — shard 파이프라인 담당.

---

## 7. 게이트·불변식 준수

| 게이트 | 결과 |
|------|------|
| dry-run PASS (전 배치) | ✅ |
| postVerify PASS (masters=ko=en=EXPECT) | ✅ |
| canonicalDup 0 / permitDup 0 (전 배치) | ✅ |
| expected write = actual write | ✅ (1,040) |
| rollback manifest 생성 | ✅ (`/c/tmp/hff-a/manifests/`) |
| 기존 LIVE drift 0 (도메인 canonicalDup 0) | ✅ |
| A/B/C 소유 원료 교집합 0 | ✅ (히알루론/뮤코다당 미접촉, 신규원료 registry 미등재) |
| 독립검증 PASS (별도 쿼리 경로) | ✅ |
| 공용 파일 무접촉 | ✅ (hff-sf-registry/select/generate/compose/apply read-only) |

---

## 8. 산출물 / 시간당 생산량

- 신규 코드: `apps/api-server/src/scripts/hff-sf-a-build.ts` (config-driven additive build, 콜라겐+초록입홍합+MSM+보스웰리아+글루코사민+NAG+세라마이드 7원료 + A-09 확장 가능).
- apply: 기존 `hff-sf-apply.ts` 무수정 재사용.
- 260 LIVE / 세션 (콜라겐·초록입홍합 구조돌파 조사 포함). 순수 생산 라운드 기준 시간당 다수.

## 9. 남은 TODO / 재개 위치

1. 관절/피부 `_기타미분류` 229 개별인정형 복합추출물 원료별 정밀 귀속(REVIEW_LATER).
2. 콜라겐/NAG 액상 풀(콜라겐 25·NAG 21) — 액상 serving 파싱 보강 후 생산 검토.
3. 히알루론산 485·뮤코다당 → shard 파이프라인(B/C) 담당, A 미개입.
4. 콜라겐 HOLD 6 serving 부재 원료등록 — SPD serving 원천 보강 필요.
