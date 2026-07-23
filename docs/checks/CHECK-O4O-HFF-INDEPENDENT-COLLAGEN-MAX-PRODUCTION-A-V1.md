# CHECK — HFF Independent Collagen Max Production A (콜라겐 대량 풀 생산)

- **WO**: WO-O4O-HFF-INDEPENDENT-COLLAGEN-MAX-PRODUCTION-A-V1 (에이전트 A — 콜라겐 펩타이드 지표 안전 인식·최대 생산)
- **자동승인 계약**: WO-O4O-HFF-CONTENT-PRODUCTION-AUTO-AUTHORIZATION-CONTRACT-V1
- **선행 WO**: WO-O4O-HFF-INDEPENDENT-UNLOCK-AND-PRODUCTION-A-V1 (완료, `f9a7da9c2`)
- **완료 시각**: 2026-07-23 02:53 KST (착수 동세션 연속)
- **상태**: ✅ CLOSED / PASS — **46 신규 LIVE**, 2독립방법 수렴, drift 0

---

## 1. 목표와 근본 진단

직전 라운드(선행 WO)는 콜라겐을 **base-purity 엄격 게이트**(비타민/미네랄 전면 배제)로 귀속 → 부원료 비타민/미네랄만 동반한 단일-콜라겐 제품 137건을 "위장 복합형"으로 통째 보류. 본 WO 목표 = 펩타이드 지표를 안전 인식하고 **부원료 비타민/미네랄 동반 단일-콜라겐**을 최대 LIVE 반영하되, **콜라겐이 부원료인 멀티비타민 hero 제품의 대량 오귀속은 차단**.

### 콜라겐 전체 풀 재분류 (READ-ONLY 조사)

| 구분 | 수 |
|------|:---:|
| 콜라겐 후보 총 | 286 |
| 이미 승격(선행 배치 18 포함) | 19 |
| 기능성 콜라겐 집합 한정(colFnOnly) | 162 |
| 타 기능성 문구 동반(hasOtherFn) | 64 |
| **부원료 비타민/미네랄만 동반 단일-콜라겐(solid)** | **90** |
| 순수(비타민/미네랄 0) solid | 9 |
| 타 기능성 원료 동반(히알루론/엘라스틴 등) | 14 |
| 액상 | 49 |

90건 중 안전/위험 판별:
- **safe 47** — 부원료 비타민/미네랄 ≤4종 + 제품명 멀티비타민 아님 + 콜라겐 지표 **표시량 존재**.
- **unsafe multivit hero 25** — 제품명(멀티비타민미네랄23콜라겐 등) 또는 비타민 ≥5종 → 콜라겐이 부원료 → REVIEW_LATER.
- **no-amount 18** — 콜라겐 지표 표시량 부재 → 원료 귀속 불명확 → REVIEW_LATER.

---

## 2. 우회 설계 (자기완결 additive · 공용 파일 무접촉)

`apps/api-server/src/scripts/hff-sf-a-build.ts` 에 **`collagen-vitmin` config 1건 additive 추가**. 기존 7 config(collagen strict·glm·msm·boswellia·glucosamine·nag·ceramide)는 **무변경**(strict collagen 회귀: target 0, 신규 카운터 0 — 동작 동일).

### 부원료 비타민 허용형 게이트

1. **fn-set 게이트** — 제품 전 기능성 ∈ 콜라겐 공식 기능성 집합(피부보습·자외선 피부손상·모발상태·관절연골), 타 기능성 0.
2. **otherMark = 타 '기능성 원료'만** — 히알루론·세라마이드·글루코사민·콘드로이틴·MSM·보스웰·뮤코다당·초록입홍합·엘라스틴·소나무껍질·오메가·루테인·코엔자임·프로바이오틱·홍삼 등. **부원료 비타민/미네랄은 제외**(vitminSub 로 카운트만).
3. **멀티비타민 hero 차단** — 제품명 멀티비타민/종합비타민/미네랄NN/비타민NN/23종 등 OR 부원료 비타민 >4종 → REVIEW_MULTIVIT_HERO.
4. **지표 표시량 필수** — 콜라겐/펩타이드 지표(콜라겐·Gly-Pro-Hyp·하이드록시프롤린)에 표시량·㎎·% 마커 부재 시 REVIEW_NO_MARKER_AMOUNT.
5. 비액상 · 미승격 · 미선점 · composeSf 성공 · Grounding Guard BLOCKED/REVIEW 0.

**영양성분 기능정보 처리(핵심 판단)**: 아연 "정상적인 면역기능에 필요"·비오틴/판토텐산 "에너지 생성에 필요" 등 **영양성분 기능정보는 부원료 표준 정보**이며 콜라겐 귀속을 방해하지 않음. `composeSf` 는 콜라겐 개별인정 기능성(피부보습·자외선·관절연골)만 설명서에 기재 → 정확(근거에 없는 효능 0), 부원료 nutrient claim 은 미기재(오귀속·과대표현 0). WO SAFE 예시("피부보습 저분자 콜라겐 펩타이드" + 비타민C/비오틴)가 동일 표준 nutrient 정보를 가지므로 이는 WO 의도된 생산 대상.

---

## 3. 신규 LIVE (독립검증 결과)

| tag | masters | ko SPD | en SPD | linked cand | canonicalDup | permitDup |
|-----|:---:|:---:|:---:|:---:|:---:|:---:|
| `batch:single-functional-collagen-vitmin` | 46 | 46 | 46 | 46 | 0 | 0 |

- **총 DB write = 184** (product_masters 46 INSERT + product_candidates 46 UPDATE→approved_new_master + shared_product_descriptions 92 INSERT[ko+en]).
- 원료유형 분포: 저분자콜라겐펩타이드 33 · 콜라겐펩타이드 12 · 피쉬콜라겐펩타이드 1.
- 기능성 분포: 피부보습+자외선 43 · 피부보습 단독 2 · 관절연골+피부보습+자외선 1.
- 예상 write = 실측 write (184). postVerifyPass=true.

### 2독립방법 수렴 (A-08)

| 검증 | 결과 |
|------|------|
| build funnel target | 46 |
| 독립 재쿼리 검증기(_acol_verify, 별도 코드/추출 경로) pass | **46 / 46** (fail 0) |
| cross-contamination (타 기능성 원료 base 지표) | **0** |
| stmt 중복 | 0 |
| 미승격·미선점 재확인 | 46/46 |
| 도메인 전역 canonicalDup(HFF STORE) | **0** (기존 LIVE drift 0) |
| batch permitDup | 0 |

콜라겐 지표에 영양성분 기능정보('…에 필요')를 개별인정 기능성 claim 과 구분(도움/개선/유지/보습만 기능성 claim 으로 인정)하여 검증기·빌드 semantics 정렬 → 46 수렴.

---

## 4. REVIEW_LATER / HOLD (원인별 분리 · 전체 중지 아님)

| 사유 | 수 | 분류 |
|------|:---:|------|
| REVIEW_NO_MARKER_AMOUNT (지표 표시량 부재·귀속 불명확) | 40 | REVIEW_LATER |
| REVIEW_MULTIVIT_HERO (멀티비타민 hero·콜라겐 부원료) | 33 | REVIEW_LATER |
| COMBO OTHER_FN (타 기능성 문구) | 59 | 복합형 분리 |
| COMBO HARD_OTHER (히알루론·엘라스틴 등 타 원료) | 20 | 복합형/히알루론=PENDING_SHARED |
| LIQUID (액상) | 29 | 액상 보류 |
| COMPOSE_SERVING (ABSENT 1 + PARSE_FAILED 4) | 5 | HOLD(serving 파싱) |
| GUARD_REVIEW / GUARD_BLOCKED | 3 / 1 | HOLD(그라운딩) |
| ALREADY_PROMOTED (선행 strict 배치 생산분) | 9 | 완료 |

**콜라겐 안전 후보 소진 확인**: solid·미승격·미선점 중 안전 게이트 통과분(safe 47 + 회귀 검증 통과 46, 1건은 compose/guard hold)을 전량 생산. 잔여는 전부 상기 REVIEW_LATER/HOLD 사유에 해당(안전 후보 아님).

---

## 5. 게이트·불변식 준수

| 게이트 | 결과 |
|------|------|
| dry-run PASS (masters=ko=en=46, canonicalDup 0) | ✅ |
| apply postVerify PASS | ✅ |
| 예상 write = 실측 write (184) | ✅ |
| rollback manifest 생성 | ✅ (`/c/tmp/hff-a/manifests/`) |
| 기존 LIVE drift 0 (도메인 canonicalDup 0) | ✅ |
| 기존 7 config 회귀 무변경 (strict collagen target 0·신규 카운터 0) | ✅ |
| 공용 파일 무접촉 (registry/select/generate/compose/apply read-only) | ✅ |
| A/B/C 소유 원료 교집합 0 (콜라겐=A additive·히알루론 미접촉) | ✅ |
| 멀티비타민 hero 오귀속 차단 (25 REVIEW_LATER) | ✅ |

---

## 6. 산출물 / 남은 TODO

- 신규 코드: `apps/api-server/src/scripts/hff-sf-a-build.ts` 의 `collagen-vitmin` config + `colHasAmount` + 부원료 비타민 게이트(vitminSub/multivitName/maxVitmin/requireMarkAmount) — additive, 기존 config 무영향.
- apply: 기존 `hff-sf-apply.ts` 무수정 재사용.
- 조사 probe(`_acol_survey.cjs`·`_acol_verify.cjs`)는 read-only 임시 파일 → 종료 시 삭제(커밋 제외).

### 남은 TODO / 재개 위치
1. REVIEW_NO_MARKER_AMOUNT 40 — 콜라겐 지표 표시량 원천 보강 후 재평가.
2. REVIEW_MULTIVIT_HERO 33 — 멀티비타민 복합형 별도 트랙(복합형 파이프라인) 검토.
3. COMBO HARD_OTHER 히알루론 동반분 → 히알루론 shard 파이프라인(B/C) 담당.
4. LIQUID 29 — 액상 serving 파싱 보강 후 생산 검토.
5. COMPOSE/GUARD HOLD 9 — serving 원천·그라운딩 보강.
