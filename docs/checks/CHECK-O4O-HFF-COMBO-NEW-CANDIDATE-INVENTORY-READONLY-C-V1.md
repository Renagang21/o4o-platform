# CHECK-O4O-HFF-COMBO-NEW-CANDIDATE-INVENTORY-READONLY-C-V1 — 복합형 신규 후보 전수 인벤토리 (Agent C)

- 상위 WO: `WO-O4O-HFF-MX-MULTI-INGREDIENT-EXPANSION-PILOT-V1` §6 (higher-N 라인 종료 후 신규 후보 재탐색 축)
- 일자: 2026-07-20 · 상태: **완료 (read-only)**
- 성격: **read-only · DB write 0**. generate / dry-run / apply / LIVE수정 **미실행**.
- 소스: `G:/…/mfds-health-functional-food-info-raw.jsonl` (44,885) — `hff-combo-mx-inventory-strict` 의 CLS/엄격 SPEC 로직 1:1 포팅(N2~N12 확장)
- 기준선: 복합형 LIVE 572 · 기생산/HOLD/lut-va 제외

## 0. 결론

> **기생산 28 full-set(1,266후보)을 차감한 신규 조합 = 1,524그룹 / 4,065후보. 이 중 기존 basis 전부 재사용 가능 = 1,377그룹 / 3,778(realBasis). 라인 종료 후에도 후보 풀은 충분히 남아 있음.**
>
> **⚠ 단, 본 인벤토리의 `realBasis` 는 pure full-set 모집단 상한이며 ELIGIBLE 예측치가 아니다.** Agent A 실측(§3)에서 상한 대비 실 ELIGIBLE 수율이 **0%~21%** 로 확인됐고, 탈락 사유는 basis(표시량 비율)가 아니라 **MAIN_FNCTN 기능성 귀속 실패**였다. → **그룹별 `hff-combo-select` 실측 없이 생산 우선순위를 확정하지 말 것.**

## 1. 인벤토리 (N2~N12, 고형·비수출·비벌크, 스펙 전부 분류·unknown 0)

| 구분 | 그룹 | 후보 |
|---|---:|---:|
| 전체 | 1,552 | 5,331 |
| 기생산 28 full-set 차감 | 28 | 1,266 |
| **신규(잔여)** | **1,524** | **4,065** |
| └ 기존 basis 전부 재사용 | 1,377 | 3,778 |
| └ 신규 basis/원료 필요 | 147 | 287 |

N대역(신규·basis 재사용): N2 143그룹/996 · N3 233/801 · N4-5 374/776 · N6-8 376/706 · N9-12 251/499.

**기생산 판정 방법**: 복합형 guard 파일 23 slug + `multi-ingredient-20` 의 statementNo 599건을 raw 스캔과 교차대조 → 기생산 full-set 28개 확정 후 차감. 신규 그룹에 기생산 stmt 혼입 **0**. (lut-va 포함 제외.)

산출물: `docs/checks/data/product-description-guard/hff-combo-new-candidate-inventory.json` (신규 1,524그룹 전량).

## 2. 신규 · basis 전부 재사용 상위 그룹 (상한 기준)

| 조합 | N | 후보 | 비고 |
|---|---:|---:|---|
| 비타민D + 비타민E | 2 | 144 | **Agent A 검수완료 → ELIGIBLE 27 / READY 24** |
| 식이섬유 + 아연 | 2 | 94 | **DROP 확정 (ELIGIBLE 0)** |
| 비타민D + 셀레늄 + 아연 | 3 | 39 | **Agent A 검수완료 → ELIGIBLE 8 (clean)** |
| 루테인 + 비타민E | 2 | 38 | 미검수 |
| 마그네슘 + 망간 + 칼슘 | 3 | 36 | 미검수 |
| 구리+나이아신+망간+B1+B2+B6+비타민C+비타민E+아연+판토텐산 | 10 | 35 | 미검수 |
| 비타민A + 비타민E | 2 | 35 | 미검수 |
| 나이아신+B1+B2+B6+비타민C+판토텐산 | 6 | 31 | 미검수 |
| 비타민D + 아연 + 칼슘 | 3 | 30 | 미검수 |
| 나이아신+B1+B2+B6+판토텐산 (B군 5종) | 5 | 30 | 미검수 |
| MSM + 아연 | 2 | 30 | 미검수 |
| 마그네슘 + 망간 + 아연 + 칼슘 | 4 | 29 | 미검수 |
| 루테인 + 비타민A + 비타민E | 3 | 28 | 미검수 |
| 비타민C + 비타민D | 2 | 28 | 미검수 |

임계별 신규 그룹 수(basis 재사용): realBasis≥20 → **25** · ≥15 → 36 · ≥10 → 57 · ≥5 → 162.

## 3. 선행 조사와의 정합 (중복 방지 · 수율 캘리브레이션)

본 인벤토리의 상한값은 선행 문서와 **정합**하며, 실측 ELIGIBLE 은 상한과 크게 다르다.

| 그룹 | 본 인벤토리 상한 | 선행 실측 ELIGIBLE | 수율 | 출처 |
|---|---:|---:|---:|---|
| 비타민D+비타민E | 144 | **27** (clean 24) | 19% | `…COMBO-NEW-CANDIDATE-TOP3-REVIEW-A-V1` |
| 식이섬유+아연 | 94 | **0** | 0% | 동 문서 · `…COMBO-FIBER-ZN-READONLY-INVESTIGATION-V1` |
| 비타민D+셀레늄+아연 | 39 | **8** | 21% | `…COMBO-NEW-CANDIDATE-TOP3-REVIEW-A-V1` |
| 오메가3+비타민E | 44 | **0** | 0% | `…COMBO-OMEGA3-VE-READONLY-INVESTIGATION-V1` |
| 철+엽산 | (순수 2조합 부재) | **0** | — | `…COMBO-IRON-FOLATE-READONLY-INVESTIGATION-V1` |

**해석 — 수율은 basis 가 아니라 기능성 귀속이 결정한다.**
- 상기 그룹 전부 `shelfOnly=0`(표시량 비율 basis 완비)인데도 탈락 → 탈락 사유는 `HOLD_GROUNDING` = **MAIN_FNCTN 기능성 귀속/매핑 실패**.
- **기능성 원료 계열(식이섬유·오메가3·프로폴리스·가르시니아)은 귀속 실패로 수율 ~0%** — 식이섬유는 대상 제품 다수가 프리바이오틱스(프락토올리고당 등)라 공식 기능성 귀속 불가.
- 반면 **영양소(비타민·미네랄) 전용 조합은 기생산 실적상 고수율**(mg-vd-ca 75→72 ≈96%, b-complex-n8 41→41 100%). → §2 미검수 상위군은 대부분 영양소 전용이라 기대 수율이 D+E(19%)보다 높을 여지가 있으나 **실측 전 확정 금지**.

## 4. 신규 basis/원료 필요 그룹 (원료 1개 해금 효과)

`hff-nutrient-registry.ts` `INGREDIENT_FN` 미등록 원료가 그룹을 차단. 대부분 META·en 매핑은 이미 존재.

| 미등록 원료 | 차단 그룹 | 후보 | 등록 난이도 | 실효성 |
|---|---:|---:|---|---|
| **크롬** | 70 | 115 | **낮음** — en(`Needed for carbohydrate metabolism`) FUNCTION_MAP 기존, `INGREDIENT_FN` 한 줄 추가 | 영양소 계열 → 기대 수율 상대적 양호 |
| 오메가3 | 20 | 73 | 중 | **실측 0% (§3) — selector 갭 해소 선행 필요** |
| 가르시니아 | 33 | 57 | 중 | 기능성 원료 계열 → 저수율 위험 |
| 프로폴리스 | 11 | 29 | 중 | 기능성 원료 계열 → 저수율 위험 |
| 몰리브덴 | 24 | 26 | 중 (en·INGREDIENT_FN 둘 다 신설) | 영양소 계열 |

→ **비용 대비 1순위 = 크롬**(한 줄 추가로 70그룹/115후보 해금, 영양소 계열).

## 5. 알려진 selector 갭 (본 인벤토리에도 동일 적용됨 — 과대/과소 집계 요인)

- **`EPA와 DHA의 합` 라벨 미포착**: SPEC 라벨 캡처가 공백 미포함이라 오메가3 주력 제품이 pure {D,E} 등으로 오통과. Agent A 가 D+E ELIGIBLE 27 중 **3건** 적발(§4 of TOP3 문서). → 본 인벤토리의 D+E·기타 조합 후보수도 동일하게 **오메가3 은닉분을 포함**한다.
- **비표준 spec 포맷 미포착**(`셀렌:(x/y)` — `표시량` 접두 누락): 복합 제품이 단일/저N 조합으로 흡수. single-Zn LIVE 1건 실사례(stmt `20040015107573`). → 본 인벤토리도 저N 그룹을 **과대**, 고N 그룹을 **과소** 집계할 수 있음.

## 6. 다음 단계 (권고 — 미실행)

```text
1. §2 미검수 상위군에 hff-combo-select 실측 (read-only, --source file, 결정적)
   우선 후보: 루테인+비타민E(38) / 마그네슘+망간+칼슘(36) / 비타민A+비타민E(35)
              / 비타민D+아연+칼슘(30) / B군 N5·N6(30·31) / MSM+아연(30)
   ※ 영양소 전용 조합 우선 — 기능성 원료(식이섬유·오메가3·가르시니아·프로폴리스) 포함 그룹은 후순위
2. 크롬 INGREDIENT_FN 등록 검토 → 70그룹/115후보 해금 (별도 WO)
3. selector 갭 2건(§5) 해소 후 인벤토리 재산출 — 현 수치는 갭 포함 기준
```

## 7. 보고 요약

```text
범위      복합형 신규 후보 전수 인벤토리 (N2~N12), read-only
DB write  0 · generate/dry-run/apply 0 · LIVE 무변경
결과      전체 1,552그룹/5,331후보 → 기생산 28 full-set 차감 → 신규 1,524그룹/4,065후보
          basis 재사용 가능 1,377그룹/3,778 · 신규 basis 필요 147그룹/287
정합      선행 실측(D+E 27 / fiber+zn 0 / D+Se+Zn 8 / omega3+E 0)과 상한값 정합 확인
핵심      realBasis=상한이지 ELIGIBLE 아님. 수율 결정 요인 = 기능성 귀속(basis 아님).
          그룹별 select 실측 없이 우선순위 확정 금지.
산출물    docs/checks/data/product-description-guard/hff-combo-new-candidate-inventory.json (1,524그룹)
```
