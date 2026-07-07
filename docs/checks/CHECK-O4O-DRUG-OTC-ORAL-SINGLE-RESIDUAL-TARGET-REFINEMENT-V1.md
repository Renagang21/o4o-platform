# CHECK-O4O-DRUG-OTC-ORAL-SINGLE-RESIDUAL-TARGET-REFINEMENT-V1

> **WO:** WO-O4O-DRUG-OTC-ORAL-SINGLE-RESIDUAL-TARGET-REFINEMENT-V1 (HANDOFF)
> **성격:** 경구 단일제 설명서 Batch-01~03 이후 **잔여 대상 정리(read-only)**. 설명서 작성 0 · DB write 0 · registry 변경 0.
> **핵심 결론:** len7 clean 단일 경구는 **사실상 소진**. 즉시 작성 가능한 잔여는 **단일제조사 grounded 단일 ~8개(Batch-04 후보, 저시장존재감)** 뿐. **coarse ATC(len<7)는 새 단일 광맥이 아니라 복합제 풀**(멀티비타민/미네랄/다효소/감기/제산 조합) → COMBO 트랙 대상. 추가 단일 확보는 제한적.

---

## 1. 작업 일시 / 채널

| 항목 | 값 |
|---|---|
| 작업 일시 | 2026-07-07 |
| 접속 | Cloud SQL Auth Proxy(127.0.0.1:15488) → psql SELECT (read-only) |
| 인스턴스 / DB | `netureyoutube:asia-northeast3:o4o-platform-db` / `o4o_platform` |
| write | **0** (SELECT/COUNT/GROUP BY만) |

## 2. 사용한 선행 문서

- `CHECK-...-ORAL-SINGLE-DRAFT-BATCH-01/02/03-V1.md`(처리 그룹·미작성 사유)
- `CHECK-...-ORAL-SINGLE-TOTAL-INVENTORY-AUDIT-V1.md`(단일 경구 모수·정합 이슈)
- `docs/registries/...GROUP-REGISTRY-V1.md`(imported 중복)

## 3. 잔여 대상 재집계 (실측)

**clean 단일 경구 후보(노이즈·비경구·복합ATC 제외), ATC 길이별 패밀리:**

| 구분 | 패밀리 | masters | grounded 패밀리 | mfr≥2 & grounded | mfr=1 & grounded | 무grounding |
|---|--:|--:|--:|--:|--:|--:|
| **len7**(성분단위) | 137 | 9,566 | 98 | 87 | 11 | 39 |
| **coarse(len<7)** | 112 | 28,053 | 65 | 62 | 3 | 47 |
| 합계 | 249 | 37,619 | 163 | 149 | 14 | 86 |

**처리 현황(len7 mfr≥2 & grounded 87 기준):** imported/batch-01 완료 ≈44 + batch-02 16 + batch-03 1 = **61 처리** → 잔여 **~26**(batch-03에서 전수 확인: 전부 복합/route/probiotic/영양복합/OTC-RX, 신규 단일 없음).

## 4. Batch-04 작성 가능 후보 (len7 단일제조사 grounded)

len7 mfr=1 & grounded **11** 중 단일·경구 명확 + route/combo 제외 → **작성 가능 8**:

| No | atc7 | ingredient(성분) | 효능 계열 | grounded | note |
|-:|---|---|---|--:|---|
| 1 | A11HA02 | 피리독신염산염(비타민B6) | 비타민B6 보급 | 6 | 단일제조사 |
| 2 | A06AD12 | 락티톨수화물 | 삼투성 완하 | 3 | 단일제조사 |
| 3 | A02AD05 | 규산알루민산마그네슘 | 제산 | 4 | 단일제조사 |
| 4 | A09AA04 | 베타-갈락토시다제(락타제) | 유당분해(유당불내) | 6 | 단일제조사 |
| 5 | A12CB03 | 히스티딘아연이수화물 | 아연 보급 | 3 | 단일제조사 |
| 6 | A09AC01 | 베타인 | 소화 보조 | 3 | 단일제조사 |
| 7 | A11HA32 | 판테틴 | 판토텐산 유도체 보급 | 2 | 단일제조사·저grounding |
| 8 | R06AB04 | 클로르페니라민말레산염 | 항히스타민 | 3 | 단일제조사·통상 복합에 다수 |

**제외(11 중 3):** A06AG01 인산나트륨에네마(route=관장) · R05DB20 래피콜(진해 복합) · B03AE04 엘레비트(임산부 종합비타민 복합).

> Batch-04 후보는 전부 **단일 제조사(시장 존재감 낮음)** 이다. 근거는 있으므로 "근거 있는 설명서를 만들어둔다" 원칙상 작성 가능하나, 매장 카피선택 가치는 낮다(우선순위 낮음).

## 5. coarse ATC 미세분해 필요 — **실측 결과 대부분 복합제**

coarse(len<7) mfr≥2 & grounded **62 패밀리(28,053 masters)** 전수 샘플 확인:

- **압도적 다수가 조합제품**(coarse ATC를 갖는 이유 자체가 조합):
  - 멀티비타민/미네랄: A11JC(아이락비타 892)·A12AX·A11JB·A11EX·A11JA·A13A·A11AB·A11DB·A11EB·A11BA·A11AA·A11GB·A11EC·A11A·A11CB·A11EA·V06DE·V06DX
  - 다효소 소화제: A09AA(훼스탈 214)·A09A·A09AC
  - 감기·기침 복합: **R05X(882)**·R05F·R05FA·R05FB·R06AD
  - 제산 복합: A02AX(복합탈시드)·A02AH·A02BX·A02AD·A02AC
  - 지질/기타 복합: C10B·A04AD(멀미복합)·N02BG·A15(트레스탄)
- **이미 완료된 단일**이 coarse로도 잡힘: A02A(탄산수소나트륨 imported)·A16AA(카르니틴)·A05AA(UDCA)·M01AX(클로닉신)·N05CM(디펜히드라민)·C05CX(포도엽 batch-01)·V06DD(L-시스틴 imported).
- **route/구강**: V07AV·V07AT(구강세정 과탄산/카바마이드)·B05CX(관류)·A06A/A06AX(완하 일부).

**판단:** coarse ATC 미세분해는 **새 단일 성분을 거의 산출하지 못한다**(진짜 단일은 이미 len7 ATC 보유). 미세분해의 실효는 **복합제 성분 정규화 → COMBO 트랙 공급**이다. 따라서 "coarse 분해 WO"는 단일 경구가 아니라 **복합제 batch 준비 작업**으로 재정의해야 한다.

## 6. probiotic 기준 필요

- A07FA(정장 생균)는 **단일균+다균이 한 ATC에 혼재**(batch-03 확인: 안티비오=락토바실루스 단일 vs 락토웰=2균). 단일균 일부는 imported에 이미 존재.
- → **probiotic 균주 단위 그룹핑 WO** 선행 필요. 이번 잔여 정리에서 작성 대상 아님.

## 7. route 혼재

- A06AB02(비사코딜) 경구정+좌약 · A06AG01(인산나트륨 에네마) · A06A/A06AX 완하 일부 · M02(외용 경고제 잔재).
- 경구정만 명확히 분리 가능한 경우(예: 비사코딜 장용정)에 한해 후속 작성 가능. 현재 grounding 대표가 좌약/관장이면 보류.

## 8. strength 불명확

- 인벤토리 감사 기준 strength 불명확 그룹 **409**(specification 첫 토큰 '없음/0/기타').
- 예: 콜레칼시페롤 "10mg 과립"(=과립 중량, 역가 아님, batch-03 확인). 원문 역가 확정 전 작성 보류.

## 9. 작성 보류 (D-tail 저가치)

- len7 무grounding 39 + coarse 무grounding 47 = **무grounding 86 패밀리**(원문 근거 부재 → §3.8 작성 금지).
- 제조사=1 & 무grounding 대량(D-tail, 인벤토리 3,779그룹/20,106 masters).
- → 원문 grounding 확보 전까지 보류.

## 10. 분류 요약 (WO 완료 보고 형식)

| 버킷 | 규모 | 처리 방향 |
|---|--:|---|
| 남은 후보(clean 단일 패밀리, 미처리) | ~88(len7 26 + coarse 62) | 대부분 복합/route/probiotic |
| **Batch-04 가능(즉시 작성)** | **8** | 단일제조사 grounded 단일(§4, 저우선) |
| coarse ATC 미세분해 필요 | 62 | **대부분 복합제 → COMBO 트랙**(단일 산출 거의 없음) |
| probiotic 기준 필요 | A07FA 계열 | 균주 단위 WO 선행 |
| route 혼재 | A06AB02·A06AG 등 | 경구 분리 가능 시만 |
| strength 불명확 | 409 그룹 | 원문 확정 전 보류 |
| 작성 보류(무grounding/D-tail) | 86 패밀리 + 3,779 꼬리 | 보류 |

## 11. 다음 권장 WO

1. **(선택) Batch-04** — §4의 단일제조사 grounded 단일 8건 작성(근거 있음, 저우선). 원치 않으면 skip 가능.
2. **단일 경구 종료 선언** — len7 clean 단일 경구 grounded 모수는 batch-01~03(+04)으로 사실상 완결.
3. **COMBO 트랙 재개** — coarse 62 + len7 잔여 복합 26을 성분 정규화하여 복합제 batch(멀티비타민/미네랄·다효소·감기·제산). `BATCH-ORAL-COMBO`(68 dry-run 존재)와 통합.
4. **probiotic 균주 단위 WO** — A07FA 단일/복합·균주 기준.
5. **route 분리·strength 원문 확정** — 비사코딜 경구정, 콜레칼시페롤 역가 등 개별 후속.

## 12. 금지사항 준수 확인

| 항목 | 준수 |
|---|:-:|
| DB write | ✅ 0 (SELECT만) |
| 설명서 초안 작성 | ✅ 0 |
| registry 직접 변경 | ✅ 0 |
| 복합제/비경구 작업 | ✅ 0 |
| canonical 승격 | ✅ 0 |

---

*V1 · 2026-07-07 · 경구 단일제 잔여 정리 · Batch-04 가능 8(단일제조사) · coarse=복합제 풀 확인 · 단일 경구 사실상 완결 · DB write 0*
