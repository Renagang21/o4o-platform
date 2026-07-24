# CHECK — WO-O4O-HFF-UNREGISTERED-INGREDIENT-BULK-PRODUCTION-B-V1

- 담당: 에이전트 나 (Agent B) · shard `stableHash(STTEMNT_NO) % 3 = 1`
- 일자: 2026-07-24
- 상태: **CLOSED · PASS** — 신규 LIVE 493 · DB write 1,972 · gateFail 0 · drift 0

## 1. 문제 확정

직전 라운드([[project-hff-unknown-spec-bulk-production-b]], `814cf5341`)에서 규격 라인이
**완전히 구조화되어 있는데도** 미생산으로 남은 후보의 지배적 원인은 파서가 아니라
**registry 미등록 실재 기능성 원료**였다. shard 1 미생산·미선점 후보를 라벨 센서스(`hff-unreg-b-census.ts`)
한 결과, 상위 미해석 라벨이 전부 실재 원료의 **지표성분(marker)** 이었다:

- 코로솔산 → 바나바잎추출물(식후 혈당상승 억제)
- 로르산 → 쏘팔메토열매추출물(전립선 건강의 유지)
- 아스타잔틴 → 헤마토코쿠스추출물(눈의 피로도 개선)
- 로사빈 → 홍경천추출물(스트레스로 인한 피로 개선)
- 소포리코사이드 → 회화나무열매추출물(갱년기 여성의 건강)
- 포스콜린 → 콜레우스포스콜리추출물(체지방 감소)
- 히알루론산 / 포스파티딜세린 / 폴리감마글루탐산 / 칼륨 / 진세노사이드(홍삼·인삼)

규격 라벨은 지표성분명으로, MAIN_FNCTN 은 기능성 원료명으로 기재되는 공전 관례를 그대로 따른다.

## 2. 최소 수정 (공용 파일 무편집)

WO 제약 "공용 parser·registry 수정 금지" + "기존 composer·Guard·apply 재사용" 을 동시에 만족하기 위해
**B 소유 additive 계층**만 신설했다. 공용 `hff-source-parse.ts` · `hff-nutrient-registry.ts` ·
`hff-combo-compose.ts` · `hff-combo-generate.ts` 는 한 줄도 건드리지 않았다.

| 파일 | 성격 | 역할 |
|------|------|------|
| `hff-b-ingredient-registry.ts` | **신규** | 12 원료 `B_META`(displayKo=`원료명 (지표성분)`)·`B_INGREDIENT_FN`(전량 실측)·`B_SRC_LABEL`·`B_COMPONENT`. `bMeta`/`bFnBelongsTo`(정확일치)/`bMapFunctionEn` |
| `hff-spec-b-resolve.ts` | 확장 | B 지표성분 라벨 + 라벨 내부공백 재시도 + 진세노사이드 열거형 장문 라벨 pre-pass |
| `hff-combo-b-compose.ts` | 신규(공용 사본) | 공용과 **두 곳만 상이** — `meta()` 가 B registry 조회, `SRC_LABEL` 에 B 라벨 추가 |
| `hff-combo-b-generate.ts` | 신규(공용 사본) | 공용과 **import 한 줄만 상이** (B compose 사용) |
| `hff-combo-b-select.ts` | 수정 | `bMeta`/`bFnBelongsTo`/`bMapFunctionEn` 로 교체 |
| `hff-unreg-b-plan.ts` | 신규 | "B키 ≥1 회수" 게이트 + 공용 parseSpecs conflict 게이트 + meta 게이트 |
| `hff-unreg-b-{census,probe,fncensus}.ts` | 신규(READ-ONLY) | 근거 수집 |

### 핵심 안전 판정
- **지표성분 표시 관례**: `displayKo = 기능성원료명 (지표성분명)`. 두 이름 모두 공식 원문에 존재 →
  완전 grounded 이며, "지표성분 표시량을 원료 표시량처럼" 보이게 하는 오해를 차단한다.
- **교차귀속 차단**: 공용 `fnBelongsTo` 의 양방향 substring 포함은 홍삼 `피로개선` 이 홍경천
  `스트레스로 인한 피로 개선` 을 삼키는 오귀속을 만든다. B 키는 `normFn` **정확일치**만 인정하고
  미등재 변형은 `unattributed>0 → HOLD` 로 흘려보낸다.
- **`X% 이상` 비율은 미지원 유지**: 진세노사이드 규격은 `표시량(5mg/10g)의 80% 이상`(하한 %만)이
  대부분이다. 기존 파이프라인은 `이상` 계열을 `표시량 이상`으로 보고 `badAmt` 로 HOLD 한다.
  이를 지원하면 **전 원료의 ratio 선언 의미가 바뀌므로**(WO 금지) 그대로 HOLD. 홍삼 1·인삼 0 은
  이 정책의 정상 귀결이며, 열거형 라벨 pre-pass 는 양측 비율(`80~120%`) 케이스만 안전하게 회수한다.

## 3. 실행·게이트

- plan(shard 1): B키 보유 후보 996 → 351 그룹 / 834 제품. reject `noBKey 8006 · stillUnknown 160 · noMeta 0 · conflict 2`
- sweep(B select + B generate): 351/351 그룹 완료, SELECT/GEN 실패 0. 초안 BLOCKED 0.
- **dry-run**: 208 sig · gateFail 0 · expectedWrites 1,972 = 493 × 4
- **apply(이중게이트)**: 208 sig COMMIT · applied 493 · DB write 1,972 · gateFail 0
  - 게이트/제품: master INSERT + candidate `approved_new_master` + SPD ko + SPD en (=4)
  - A 도메인(MSM·글루코사민) 교집합 0 (침범 없음)

## 4. 독립검증 (별도 연결, read-only)

`hff-combo-b-verify.ts` (`HFF_COMBO_B_VERIFY_TAG='batch:unreg-b-%'`):

```
myMasters 493 · myKo 493 · myEn 493 · candidatesLinked 493
canonicalDup 0 · permitDup 0 · crossPermitWithOthers 0
barcodeNonNull 0 · wrongRegType 0 · wrongSourceType 0 · PASS true
```

보강 cross-permit·drift 쿼리:
```
mine_masters 493 · cross_other_master 0 · spd_preexisting 0 · other_rows_modified 0
```
→ 기존 LIVE **drift 0**, 타 라운드/에이전트 산출물 무변경.

## 5. 원료별 생산량 (복합제 중복계수)

| 원료 | 제품 | | 원료 | 제품 |
|------|---:|---|------|---:|
| 쏘팔메토열매추출물 (로르산) | 128 | | 폴리감마글루탐산 | 35 |
| 바나바잎추출물 (코로솔산) | 97 | | 포스파티딜세린 | 31 |
| 히알루론산 | 53 | | 칼륨 | 27 |
| 홍경천추출물 (로사빈) | 45 | | 회화나무열매추출물 (소포리코사이드) | 27 |
| 헤마토코쿠스추출물 (아스타잔틴) | 36 | | 콜레우스포스콜리추출물 (포스콜린) | 24 |
| | | | 홍삼 (진세노사이드 Rg1·Rb1·Rg3의 합) | 1 |

동반 공용원료(상위): 아연 201 · 비타민B2 153 · 비타민B1 137 · 비타민B6 112 · 옥타코사놀 109 · 비타민D 101.

## 6. HOLD 상위 원인 (개별 HOLD 후 계속)

| 코드 | 건수 | 의미 |
|------|---:|------|
| HOLD_GROUNDING | 285 | 표시량/비율 추출 실패(`X% 이상` 하한%·미귀속 기능성 등) |
| HOLD_UNSUPPORTED_DIMENSION | 35 | 액상·mL·겔 |
| BULK | 8 | 벌크 원료 |
| HOLD_IDENTITY | 1 | 제품명 수량 스케일어 |

## 7. 남은 후보

- shard 1 B키 보유 미해석 잔여: `stillUnknown 160`(신규 지표성분 라벨 — 모나콜린K·라이코펜·대두이소플라본·
  베르바스코사이드 등, 이 라운드 12원료 밖) + `conflict 2`(공용↔B 값 불일치, 제외 정답).
- `noBKey 8006` 은 본 라운드 대상 아님(기존 라운드에서 처리되었거나 안전 근거 미확보).
- 안전 근거(공식 원료명·기능성·표시량·serving)가 명확한 shard 1 미등록-원료 후보는 **소진**.

## 8. 전면 중지 조건 — 미발동

ProductMaster 오연결 0 · 원료/기능성 오귀속 0(정확일치 게이트) · 공식 기능성 누락 0 ·
canonical/rollback 실패 0 · write 불일치 0 · 기존 LIVE drift 0 · 독립검증 PASS.
