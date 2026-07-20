# CHECK — HFF 신규 후보 상위 3그룹 검수 (Agent A) V1

- 상위 WO: `WO-O4O-HFF-MX-MULTI-INGREDIENT-EXPANSION-PILOT-V1` §6 (higher-N 라인 종료 후 신규 후보 재탐색 축)
- 성격: **read-only · DB write 0**. strict select 실측만. generate/dry-run/apply/LIVE수정 미실행. 도구 = `hff-combo-select` (`--source file`, G:드라이브 raw 44,885).
- 대상 3그룹(상한 = 사전 인벤토리 full-set 추정):

| # | N | 조합 | 상한 |
|---|:-:|------|:-:|
| 1 | 2 | 비타민D+비타민E | 144 |
| 2 | 2 | 식이섬유+아연 | 94 |
| 3 | 3 | 비타민D+셀레늄+아연 | 39 |

---

## 1. strict select 실측 + full-set 정확 일치

`hff-combo-select` 는 `keys(byKey) === TARGET_SET` (기능성 표시량 spec 집합이 조합과 **정확 일치**) 인 건만 mention 으로 집계하고, 추가 기능성 원료/미분류 spec 존재 시 `HOLD_MULTI_FUNCTIONAL` 로 분리한다.

| 그룹 | mention | ELIGIBLE | HOLD_MULTI | grounding | 기타 HOLD | **full-set(pure)** |
|------|:-:|:-:|:-:|:-:|:-:|:-:|
| 비타민D+비타민E | 1081 | **27** | 931 | 122 | bulk 1 | **150** (27+122+1) |
| 식이섬유+아연 | 193 | **0** | 92 | 96 | export2·identity1·bulk2 | **101** (0+96+5) |
| 비타민D+셀레늄+아연 | 839 | **8** | 795 | 32 | identity 4 | **44** (8+32+4) |

- full-set(pure exact-set) ≈ mention − HOLD_MULTI. 사전 상한(144/94/39)과 정합(집계 dedup 차이 내).
- **mention 은 D&E 공존 제품 전체**(멀티 포함)이며, pure exact-set 이 조합 정확일치 모집단이다.

## 2. ELIGIBLE / HOLD 산출 + 제형

| 그룹 | ELIGIBLE | 제형(eligible) | 판정 |
|------|:-:|------|------|
| 비타민D+비타민E | 27 → **24 clean** | softgel 22 · chewable 2 · tablet 2 · powder 1 | **READY (24)** — 3건 REVIEW(§4) |
| 식이섬유+아연 | **0** | — | **DROP** (생산가치 없음) |
| 비타민D+셀레늄+아연 | 8 | softgel 3 · tablet 5 | **READY (8, clean)** |

- **식이섬유+아연 = ELIGIBLE 0**: grounding 96 전량 "원료 기능성 귀속/매핑 실패" — 대상 제품 대부분 **프리바이오틱스/신바이오틱스**(프락토올리고당 등)로 식이섬유 공식 기능성 귀속 불가 + HOLD_MULTI 92(3+원료). **클린 배치 불가 → 제외.**
- 액상/드롭 0 · 벌크 소수 · 수출 소수. eligible 제형 전부 검증완료 제형.

## 3. 기존 단일형·복합형 LIVE 중복 및 오분류 검사

### 3-1. 복합형 LIVE 중복 = 0
- 3그룹 eligible 전건을 기존 `hff-combo-*.json` (복합형 eligible 파일 전체)과 교차 → **중복 0**. 신규 조합.

### 3-2. 단일형 LIVE 흡수 검사 (양방향)

단일형 LIVE 모집단(산출물 실측): single-D **417** · single-E **147** · single-Zn **190** · single-Se **39** (합 793).

- **정방향** (pure exact-set 제품이 단일 LIVE 에 게시됐는가): D+E 150 / fiber+zn 101 / D+Se+Zn 44 전건 대조 → **흡수 0**.
- **역방향** (단일 LIVE 제품이 실제 복합원료인가 — lut-va류 결함): 단일 793 전건의 원문 BASE_STANDARD 기능성 spec 재파싱(strict + 광역 키워드) →

  - strict(표시량 비율 spec ≥2): **0**
  - 광역(비표준 포맷 포함, 전 영양소 키워드): **1** — 아래 §3-3.

### 3-3. ⚠ 발견 — single-Zn LIVE 1건 복합 흡수 (본 3그룹과 무관, 별도 교정 대상)

- **stmt `20040015107573` "정상적인 면역기능에 필요한 프로그램"** — 실제 **아연+셀렌+크롬 3원료** 제품인데 `batch:single-nutrient-zinc`(single-Zn LIVE) 로 게시됨 → **셀레늄·크롬 기능성 누락**.
- 원문 BASE:
  ```text
  ② 아연: 표시량(8.5 mg/7,500 mg)의 80~150%
  ③ 셀렌: (55 ㎍/7,500 mg)의 80~150%      ← "표시량" 누락 + 선행 괄호
  ④ 크롬: (50 ㎍/7,500 mg)의 80~180%      ← 동일 비표준 포맷
  ```
- 원인: 셀렌·크롬 spec 라인이 **비표준 포맷**(`셀렌:(x/y)` — 표시량 접두 누락·선행 괄호)이라 SPEC 정규식 미포착 → 셀렉터가 아연 1 spec 만 인식 → 단일로 흡수. **lut-va(베타카로틴) 와 동일 계열 결함.**
- **범위**: 본 3그룹(D+E / fiber+zn / D+Se+Zn) 제품이 아님(이 제품엔 비타민D 없음). **별도 single-Zn 라인 교정 트랙** 대상.

### 3-4. N2 흡수 결론 (특별 지시 항목)
- **비타민D+비타민E, 식이섬유+아연 두 N2 그룹 모두: 기존 단일형 LIVE 의 복합 제품 흡수 = 0.**
- 근거: D/E/Zn/Se 는 분류 키가 서로 독립(베타카로틴→비타민A 식의 키 병합 없음) + 단일 라인이 "표시량 spec ≥2 → 복합 제외" 규칙 정상 적용. lut-va 와 달리 clean.

## 4. ⚠ REVIEW — D+E eligible 중 오메가3 은닉 3건 (generate 전 필수 처리)

D+E ELIGIBLE 27 중 **3건이 실제 오메가3(EPA+DHA) 주력 제품**이며 비타민D·E 는 부수 원료:

| stmt | 제품 | 은닉 spec |
|------|------|------|
| 200400200142058 | 광동rTG오메가3 | EPA와 DHA의 합 표시량(600mg/1,050mg) |
| 20120019007573 | 멀티케어 초임계 알티지 오메가3 | EPA와 DHA의 합 표시량(600mg/1025mg) |
| 20120019007579 | 장용성 초임계 알티지오메가3 1000 비타민D | EPA와 DHA의 합 표시량(1000mg/1700mg) |

- 원인: 기능성 라벨 `EPA와 DHA의 합` 에 **공백 포함** → SPEC 라벨 캡처(`[가-힣A-Za-z0-9()\-·]` 공백 불포함)가 미포착 → 오메가3 기능성(혈중 중성지질·혈행 개선) 은닉된 채 pure {D,E} 로 통과.
- 조치: **3건 REVIEW/HOLD**. 2원료 D+E 설명서로 게시 시 제품 정체성 왜곡 + 주력 기능성 누락 → 게시 금지. → **clean D+E = 24**.
- 일반화: 오메가3 함유 제품이 섞일 수 있는 모든 조합에서 동일 갭 주의(selector 개선 후속 과제).

## 5. basis · 원료 · 제형 · Guard 재사용 판정

| 항목 | 비타민D+비타민E | 비타민D+셀레늄+아연 | 식이섬유+아연 |
|------|:-:|:-:|:-:|
| basis 재사용 | YES (신규 0, 제품별 기존 mg 표기) | YES | — (DROP) |
| 신규 원료 | 0 (D·E registry 기존) | 0 (D·Se·Zn 기존) | 식이섬유 귀속실패 |
| 신규 제형 | 0 (softgel/chewable/tablet/powder) | 0 (softgel/tablet) | — |
| 신규 Guard | 0 (compose N-generic + G-MULTI, N8 검증범위 ⊂) | 0 | — |
| 시각 스모크 | 불요 (기존 제형·Guard) | 불요 | — |

**중지 사유: 없음** (신규 원료/제형/basis/Guard 0).

## 6. Agent B 생산 우선순위

```text
1순위: 비타민D+비타민E (N2)      READY 24  — ELIGIBLE 27 − 오메가3 은닉 3 REVIEW. 최고 수율.
2순위: 비타민D+셀레늄+아연 (N3)  READY 8   — clean(은닉 0·흡수 0). 소량 완결.
제외 : 식이섬유+아연 (N2)        DROP 0    — 식이섬유 기능성 귀속 실패(프리바이오틱스) + HOLD_MULTI. 배치 불가.

전제조건(1순위): generate 전 오메가3 은닉 3건(§4) REVIEW 제외 확정.
별도 트랙: single-Zn LIVE 흡수 1건(§3-3, stmt 20040015107573) 교정 — 본 배치와 분리.
```

## 7. 보고 요약

```text
그룹 3 (비타민D+비타민E / 식이섬유+아연 / 비타민D+셀레늄+아연)
strict select 실측: full-set 정확일치 150 / 101 / 44
ELIGIBLE: 27(→24 clean) / 0 / 8
복합형 LIVE 중복: 0 (3그룹 전부)
단일형 LIVE 흡수(정방향): 0 / 0 / 0
N2 흡수(특별검사): 0 — D+E·fiber+zn 모두 단일 LIVE 흡수 없음(lut-va류 아님)
단일 LIVE 역방향 감사: single-Zn 1건 복합흡수 발견(20040015107573, 아연+셀렌+크롬 → 별도 트랙)
REVIEW: D+E 오메가3 은닉 3건(EPA와 DHA 공백라벨 미포착)
basis/원료/제형/Guard 재사용: YES / 신규 0
우선순위: #1 D+E(24) · #2 D+Se+Zn(8) · 제외 fiber+zn(0)
중지 사유: 없음
```

---

## 8. 실행 기록 — #1 비타민D+비타민E 24 LIVE (Agent B · 2026-07-20 · COMMIT)

§6 1순위 생산 실행 완료. **DB write 96 · COMMIT.**

| 단계 | 실측 |
|------|------|
| select (`--source db`, proxy 5433) | ELIGIBLE **27** · 제형 softgel 22·chewable 2·tablet 2·powder 1 (§2 file-source와 정확 일치) |
| 오메가3 은닉 3건 제외(§4) | `200400200142058`·`20120019007573`·`20120019007579` 모두 pool 존재 확인 후 제외 → **clean 24** (softgel 22→19) |
| generate·Guard | PASS **24** · REVIEW 0 · BLOCKED 0 · G-MULTI HOLD 0 · 자동HOLD 0. 전건 원료 카드 2(D+E)·EPA/DHA/오메가 누출 0 |
| dry-run(exec+rollback) | postVerifyPass ✓ · 예상=실측 96 · canonicalDup 0 → ROLLBACK(DB write 0) |
| COMMIT (`--apply`, 이중게이트) | **완료** — ProductMaster 24 · candidate UPDATE 24 · STORE SPD ko 24 · en 24 = **96** |

### 독립 사후검증 (새 DB 연결 · 2종)
- `hff-vd-ve-postverify.ts`: masters 24 · spdKo 24 · spdEn 24 · **canonicalDup 0** · candidateLinks 24 · spdRefLinks 48 · **badCards(EPA/DHA/오메가) 0** · **omega3Contam(제외 3건 혼입) 0** · 건강기능식품/ACTIVE
- `hff-combo-verify-committed.ts --slug vd-ve --expect 24`: independentVerifyPass **true** · **existingTotal(baseline) 573 → totalComboLive 597**

### 결과
- **복합형 LIVE 573 → 597** (baseline 573 + vd-ve 24). 기존 LIVE drift 0.
- tag `batch:single-nutrient-vd-ve` · rollback manifest `hff-vd-ve-apply-rollback-manifest.json`.
- 아티팩트: `docs/checks/data/product-description-guard/hff-combo-vd-ve.json` (target 24, drafts 포함).
- verifier allowlist 에 `batch:single-nutrient-vd-ve` 추가(비-`combo-` 접두 복합형 slug 집계 정합).

> #2 비타민D+셀레늄+아연(8, clean) 은 후속 배치. 별도 트랙 single-Zn 흡수 1건(§3-3)·lut-va(기능성 단일형 흡수 교정 프로그램 하위, PAUSED 유지) 은 본 배치와 분리.

---

*§1~7 read-only 조사(select 실측). §8 생산은 승인·이중게이트 후 COMMIT 실행 완료.*
