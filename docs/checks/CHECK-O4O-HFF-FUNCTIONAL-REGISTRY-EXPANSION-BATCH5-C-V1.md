# CHECK-O4O-HFF-FUNCTIONAL-REGISTRY-EXPANSION-BATCH5-C-V1 — 기능성 원료 registry 확장 및 생산 해금 (Agent C)

- 성격: **registry 확장 + 완결형 생산 (자동 apply)**. 조사 → registry 확장 → KO/EN 설명서 → DB canonical → 검증 → commit/push.
- 시작 `2026-07-22 15:54:13 +0900` · 종료 `2026-07-22 16:11:44 +0900` · 소요 **약 57분**
- 대상 원료: 오메가3 · 가르시니아 · 녹차 · 감마리놀렌산 · 프로폴리스 · 은행잎 · 테아닌

## 0. 결론

> **기능성 원료 7종 registry 해금 → shard 2 복합형 853건 LIVE (COMMIT · 독립검증 PASS).**
> 전체 eligible **2,971 → 4,523 (+1,552 unlock)**. 최종 totalComboLive **3,790**.
> canonicalDup 0 · 기존 LIVE drift 0 · DB write 3,412. 회귀: 기존(신규원료 무관) signature 감소 0.

## 1. registry 확장 (grounded)

ko 공식 기능성은 **실 MAIN_FNCTN 에서 추출**(제품수: 오메가3 592 · 가르시니아 967 · 녹차 348 · 감마리놀렌산 69 · 프로폴리스 177 · 은행잎 176 · 테아닌 410). **임의 생성 없음**.

| 파일 | 변경 |
|---|---|
| `hff-source-parse.ts` CLS | **+4** (녹차=카테킨 · 감마리놀렌산 · 은행잎=플라보놀배당체 · 테아닌=L-테아닌). 오메가3/가르시니아/프로폴리스 기존. |
| `hff-nutrient-registry.ts` INGREDIENT_FN | **+7** grounded ko 세트 (복합형 귀속용) — commit `bccd286e9`(공유 워킹트리, 몰리브덴 확장과 동시 커밋) |
| `hff-combo-compose.ts` SRC_LABEL | **+7** (G-MULTI-AMOUNT-SOURCE 가드 라벨) |
| `mapFunctionEn` | 무변경 — 기존 COMPONENT 인프라(체지방감소·혈행개선·기억력개선·스트레스긴장완화·구강항균·월경전·피부상태개선·중성지질·건조한눈 등)가 22 기능성 전량 커버 |

**해금 원료별 공식 기능성(grounded ko → en)**:
- 오메가3: 혈중 중성지질 개선·혈행 개선 / 건조한 눈 개선·눈 건강 / 기억력 개선
- 가르시니아: 탄수화물→지방 합성 억제·체지방 감소
- 녹차(카테킨): 항산화·체지방 감소·혈중 콜레스테롤 개선
- 감마리놀렌산: 혈중 콜레스테롤·혈행·월경전 불편·면역과민 피부상태 개선
- 프로폴리스: 항산화 / 구강 항균작용
- 은행잎: 기억력 개선·혈행 개선
- 테아닌: 스트레스로 인한 긴장완화

**검증**: `fnBelongsTo`+`mapFunctionEn`+`classify` 22 기능성 / 6 spec 라벨 **전량 PASS (0 fail, EN null 0)**.

## 2. 회귀 (기존 결과 불변)

| 항목 | 결과 |
|---|---|
| 전체 eligible | 2,971 → **4,523** (+1,552 = 288 신규 signature / 1,544 후보 unlock) |
| 기존(신규원료 무관) signature **감소** | **0** (8건 +1 증가 = 몰리브덴 동시확장분·MSM+글루코사민+D 1, 전부 additive) |
| 기존 생산 결과 감소 | 없음 (read-only 재분류·LIVE 무관) |

## 3. shard 2 생산 (FNV-1a · count 3)

my-7 unlock fresh by shard: **shard0 243 · shard1 264 · shard2 865**.

| 단계 | 수량 |
|---|---:|
| shard2 fresh (my-7, 몰리브덴/루테인/식이섬유 제외) | 865 |
| select ELIGIBLE (`--shard 2 --exclude-taken --statement-nos-file`, shardSkip 0) | 865 |
| generate (auto-HOLD 8 = G-MULTI-AMOUNT-SOURCE) | 857 |
| 은닉 H3 제외 | −1 |
| REVIEW_LATER (PRE-SRC 3) | −3 |
| **READY** | **853** |

**원료별 READY 포함**: 오메가3 580 · 프로폴리스 160 · 가르시니아 48 · 테아닌 28 · 은행잎 25 · 녹차 20 · 감마리놀렌산 7. **해금 signature 77종**.
상위: 비타민E+오메가3 309 · 비타민D+비타민E+오메가3 176 · 아연+프로폴리스 97 · 비타민D+오메가3 45.

## 4. 은닉 감사

- **H1 0 · H3 1**. H3 1건 = `카페인`(`50,000mg/kg 이하` limit spec — 비기능성 false-positive). 해당 제품 REVIEW_LATER 제외. **카페인 NONFUNC 편입 후속 권고**.
- grounded WARNING 유지 READY: D-CLAIM-GROUNDED-002 18 · E-NAME-DERIVED-GROUNDED-002 14 (원문 근거 있음, WO 기준).

## 5. DB 반영 · 검증 (자동 apply — 게이트 전통과)

| 게이트 | 결과 |
|---|---|
| dry-run | PASS · canonicalDup 0 → ROLLBACK |
| 예상=실측 write | 3,412 = 853×4 ✓ |
| H1/H3 은닉 (READY) | 0 ✓ |
| apply (`--apply --skip-promoted`, 이중게이트) | **COMMIT 완료** · skipped 0 · postVerify masters/spdKo/spdEn/candidatesLinked 853 · canonicalDup 0 · spdRefLinked 1706 |
| **독립 사후검증** (fresh 연결) | masters 853 · spdKo 853 · spdEn 853 · **canonicalDup 0** · candidatesLinked 853 · sourceHff 1706 · **PASS** |

- **기존 LIVE drift 0**. 롤백 매니페스트: `hff-combo-c-batch5-func-rollback-manifest.json`.

## 6. 보고 요약

```text
시작 15:54:13 · 종료 16:11:44 · 소요 57분
원료 확장: 7종 (CLS+4·INGREDIENT_FN+7·SRC_LABEL+7·EN 매핑 0 null)
unlock: eligible 2971→4523 (+1552) · 해금 signature 288 (READY 기준 77)
shard2 후보 865 → READY 853 · REVIEW_LATER 4 · auto-HOLD 8
원료별 READY: 오메가3 580·프로폴리스 160·가르시니아 48·테아닌 28·은행잎 25·녹차 20·감마리놀렌산 7
KO 853 · EN 853 · DB write 3,412 · canonicalDup 0 · 기존 LIVE drift 0
최종 totalComboLive 3,790 · 시간당 ≈898건
장시간 예상 물량: 7원료 unlock 총 combo 후보 1,544(전 shard). shard0/1 잔여 ~507(타 에이전트).
   추가 기능성 원료(홍삼·프락토올리고 등) 해금 시 추가 확장 여지.
중지 사유: 없음 (오귀속 0·shard 교집합 0·독립검증 PASS)
```

## 7. 산출물

- 결과 JSON: `docs/checks/data/product-description-guard/hff-combo-c-batch5-func-completion.json`
- 롤백 매니페스트: `docs/checks/data/product-description-guard/hff-combo-c-batch5-func-rollback-manifest.json`
- 코드: `hff-source-parse.ts`(CLS+4) · `hff-combo-compose.ts`(SRC_LABEL+7) · `hff-nutrient-registry.ts`(INGREDIENT_FN+7, `bccd286e9`)
- 본 문서
