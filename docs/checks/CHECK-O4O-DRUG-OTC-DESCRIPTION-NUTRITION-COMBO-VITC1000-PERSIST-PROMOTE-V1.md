# CHECK-O4O-DRUG-OTC-DESCRIPTION-NUTRITION-COMBO-VITC1000-PERSIST-PROMOTE-V1

- WO: WO-O4O-DRUG-OTC-DESCRIPTION-NUTRITION-COMBO-VITC1000-PERSIST-PROMOTE-V1
- 일자: 2026-07-07
- 모드: **dry-run → APPLY 완료**
- 선행: MISMATCH-FIX-V1(비타민C fix_ready, corrected_target 38) / PROMOTION APPLY(18그룹, `d661d0fa6`)
- 산출물: `apps/api-server/src/scripts/drug-otc-nutrition-combo-vitc1000-persist-promote.ts`

## 1. 목적
비타민C 1000mg 정제(A11GA01, candidate `6f143bbc`)의 stale `masterTotal` 31 → **38** 보정 + masterIds 38 저장 후,
동일 정책(masterIds 기반 / source_type `mfds_drug_otc_nutrition_combo` / content=mdToHtml / 기존 canonical 보존)으로 canonical 승격 편입.

## 2. 실행 (단일 트랜잭션, 토큰 `--apply` + `DRUG_OTC_NUTRITION_COMBO_VITC1000_CONFIRM=YES`)

| 항목 | 값 |
|------|---:|
| 1000mg급 masterIds 재현 (spec 1000/1030/1030.9/1031밀리그램) | 38 (== corrected_target) |
| 기존 canonical | 13 |
| **신규 canonical INSERT** | **25** |
| seed_json 보정 | masterTotal 31→38, masterIds 38 |
| dbWrite | 26 (canonical 25 + seed 1) |
| 트랜잭션 post-verify | inserted 25 == expected 25 / seed mt 38 / midsLen 38 / newSrcCanon 25 / dup 0 → commit |

## 3. 독립 사후검증 (별도 SELECT)

| 검사 | 결과 |
|------|------|
| vitC 1000급 그룹 canonical | **38 master 전부 canonical** (기존 13 + 신규 25) |
| new-source canonical 누계 | 1,890 → **1,915** (+25) |
| 전체 canonical | 17,852 → **17,877** (+25) |
| master-canonical 중복 | **0** |
| vitC draft seed | masterTotal=38 / masterIds len=38 / review_status=needs_review |
| Mg·B2·B6 액제(`41fc4904`) | masterIds 없음·needs_review **미변경** |

## 4. 금지사항 준수
- [x] Mg·B2·B6 액제 미처리 (masterIds 없음, 미변경)
- [x] revise/hold 3건 미처리
- [x] 기존 canonical UPDATE 0 (NOT EXISTS 가드)
- [x] ProductMaster/ProductIdentifier 미변경 / 매장 연결 없음
- [x] write 범위 = vitC draft seed_json + canonical INSERT 25만

## 5. 완료 기준 대비
| 기준 | 상태 |
|------|------|
| 비타민C 1000mg masterTotal 38 반영 | ✅ |
| masterIds 38 저장 | ✅ |
| 신규 canonical 약 25건 INSERT | ✅ 25 |
| 기존 canonical 보존 | ✅ 13 보존 |
| 중복 canonical 0 | ✅ |

## 6. 누적 승격 현황
- 영양제류 복합제 canonical 승격: **19그룹** (18그룹 1,890 + 비타민C 25 = **신규 1,915** / 기존 보존 1,379).
- 잔여: **Mg·B2·B6 액제 hold** (성분코드 Mg 검출 + liquid form 정제 선행 필요, MISMATCH-FIX-V1 §3). revise/hold 3건(#1/#12/#14) 별도 트랙.
