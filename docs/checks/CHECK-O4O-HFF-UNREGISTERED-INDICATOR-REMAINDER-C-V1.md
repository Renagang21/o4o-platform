# CHECK — WO-O4O-HFF-UNREGISTERED-INDICATOR-REMAINDER-C-V1 (에이전트 다)

**결과: 19 신규 LIVE · DB write 76 · 안전 후보 소진(eligible 0) · 독립검증 PASS · drift 0**

## 1. 목표 / 범위

Agent B 생산(`cfe1442d0`) 이후 남은 **미등록 지표성분형 건강기능식품** 중 Agent C
shard(`stableHash(STTEMNT_NO)%3 === 2`)의 안전 후보를 최대 생산. 우선 후보: 모나콜린 K(홍국) ·
라이코펜 · 대두이소플라본 · 베르바스코사이드 · 계피산(프로폴리스) · 시트리닌(홍국) · 로사빈(홍경천).

## 2. 원인 (왜 미생산이었나)

**원료가 없어서가 아니라, 공용 registry 가 그 제품의 «지표성분/확인 라벨»을 몰라서**다.
지표성분형 원료는 BASE_STANDARD 규격이 원료명이 아니라 **지표성분명**으로 표기된다
(모나콜린 K=홍국 지표, 로사빈=홍경천 지표, 소포리코사이드=회화나무열매 지표,
계피산·파라(ρ)-쿠마르산=프로폴리스 «확인» 라벨). 공용 SF/classify 는 원료명 라벨만 인식하므로
이 제품군은 전량 `UNKNOWN_SPEC_LABEL` 로 미해소였다. 프로폴리스는 정량 라벨 «총 플라보노이드»는
공용이 알지만 «계피산/쿠마르산 확인» 라벨이 미해소여서 결국 전량 HOLD.

## 3. 추가 mapping (C 전용 additive — 공용 파일 무수정)

`hff-uir-c-registry.ts` 확장(전부 census/실측 근거, 제품명 추정 0):

| key | 라벨(지표성분) | 공식 기능성(grounded) | 원료 meta |
|-----|-----|-----|-----|
| 홍국 | 모나콜린 K | 혈중 콜레스테롤 개선 | 공용 SF `홍국` 재사용 |
| 프로폴리스 | 총 플라보노이드(공용) + 계피산/파라쿠마르산 «확인» | 항산화 · 구강에서의 항균작용 | 공용 FUNCTIONAL_META `프로폴리스` 재사용 |
| 대두이소플라본 | 대두이소플라본(비배당체로서) | 뼈 건강 | 신규 |
| 홍경천 | 로사빈(Rosavin) | 스트레스로 인한 피로 개선 | 신규(홍경천추출물) |
| 회화나무열매 | 소포리코사이드 | 갱년기 여성의 건강 | 신규(회화나무열매추출물) |
| 폴리감마글루탐산 | 폴리감마글루탐산 | 체내 칼슘흡수 촉진 | 신규 |

- **시트리닌**(홍국 곰팡이독소 한도) → C 전용 `UIR_NONFUNC` 비기능 규격으로 추가(공용 NONFUNC 미포함분).
- **EN 정본**: 뼈 건강 / 갱년기 여성의 건강 / 스트레스로 인한 피로 개선 / 체내 칼슘흡수 촉진은
  공용 `FUNCTION_MAP` 이 null 반환 → C 정본 문장 추가. 혈중 콜레스테롤·항산화·구강 항균은 공용 폴백 사용.
- **EN 매퍼 접두/접미 정규화**: 원문 «홍경천 추출물 : …» / «기능성 내용 : …» 헤더, «(기타기능Ⅱ)»·«(제2등급)»
  등급 접미를 **EN 매핑 단계에서만** 제거. KO 본체는 보존 → 커버리지·FN집합 게이트 무훼손(단일 제품 2건 추가 회수).

## 4. 안전장치 (게이트 전량 통과)

1. **규격 라벨 전수 열거** — 비기능/공용/SF/NFK/UIR 중 하나로 반드시 해소, 하나라도 미해소면 HOLD.
2. **기능성 키 정확히 1종** — 0=NO_FUNCTIONAL_KEY, ≥2=MULTI_INGREDIENT HOLD. (지표성분+비타민/미네랄 복합은 전량 MULTI 로 자동 HOLD)
3. **공식 기능성 집합 게이트** — 추출 KO 전량이 그 key 의 공식 FN 집합에 속해야 함.
   → 대두이소플라본의 «방광 배뇨기능 개선»(개별인정형 2등급)은 집합 밖이라 자동 HOLD(오귀속 불가).
4. **커버리지 잔여 차단** · **foreign-fn 차단** · **EN 미매핑 전량 HOLD**(임의 영문 생성 0).
5. **본 WO lane 한정** — 최소 1개 라벨이 UIR mapping 으로만 해소되는 제품만 담당.

## 5. 생산 결과 (batch b1)

| key | 생산량 |
|-----|:---:|
| 회화나무열매 | 9 |
| 홍경천 | 5 |
| 프로폴리스 | 3 |
| 대두이소플라본 | 2 |
| **합계** | **19** |

- 홍국·폴리감마글루탐산 = 0. 실측상 이 두 원료는 거의 전량 복합제(홍국+은행잎/코엔자임Q10,
  폴리감마글루탐산+칼슘/비타민D)로 MULTI_INGREDIENT HOLD → 단일 제품 없음. mapping 은 등재(향후 단일 제품 대비).

**Apply (이중게이트):** dry-run OK → `HFF_SF_APPLY_CONFIRM=YES … --apply` COMMIT.
expectedWrites 76 = masters 19 + candidates_update 19 + SPD 38(KO 19+EN 19). candMatch 19(missing 0, ambiguous 0),
masterDup 0, canonicalDup 0.

## 6. 독립검증 · 소진 · drift

- **독립검증(manifest createdMasters 19 기준 재조회):** masters 19 · KO 19 · EN 19 · canonical STORE o4o_hff_generated 38. PASS.
- **소진:** 재빌드 promoted 4468 → 4487(+19), **eligible 0**, distKey {}.
- **drift:** taken 0(기존 LIVE 미선점) · canonicalDup 0 · 기존 LIVE 무접촉.
- **잔여 HOLD 상위:** MULTI_INGREDIENT 3,835 · UNKNOWN_SPEC_LABEL 1,021 · NO_FUNCTIONAL_KEY 718 ·
  LIQUID 2,277 · notUirLane 1,360(타 lane). 지표성분형 단일 안전 후보는 소진.

## 7. 산출물

- 코드: `apps/api-server/src/scripts/hff-uir-c-registry.ts`(6 key additive) · `hff-uir-c-build.ts`(UIR_NONFUNC 결합)
- 데이터: `docs/checks/data/product-description-guard/hff-uir-c-ind/`(target/pool/hold/selfcheck + manifests/)

관련: `CHECK-O4O-HFF-UNREGISTERED-INGREDIENT-BULK-PRODUCTION-C-V1.md`
