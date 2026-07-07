# CHECK-O4O-DRUG-OTC-DESCRIPTION-NUTRITION-COMBO-CANONICAL-PROMOTION-MASTERIDS-DRYRUN-V1

- WO: WO-O4O-DRUG-OTC-DESCRIPTION-NUTRITION-COMBO-CANONICAL-PROMOTION-MASTERIDS-DRYRUN-V1
- 일자: 2026-07-07
- 모드: **masterIds 기반 전환 + DRY-RUN** (승인 토큰 미부여 → DB write 0)
- 선행: MEMBERSHIP-PERSIST APPLY `f26683a91`(18그룹 masterIds 저장) / PROMOTION-SCRIPT `019d0e9db`
- 산출물: `apps/api-server/src/scripts/drug-otc-nutrition-combo-canonical-promotion.ts` (enumeration → masterIds 기반 재작성)

## 0. 전환 요지
promotion 멤버십 SSOT 를 **enumeration(atc7+form 게이트)** 에서 **`seed_json.groupScope.masterIds`(MEMBERSHIP-PERSIST 저장분)** 로 교체.
masterIds 미보유 그룹(2 mismatch)은 `NO_MASTERIDS` 로 승격 보류. content 는 bodyMarkdown→HTML 변환(`mdToHtml`, 외부 의존 없음).

## 1. DRY-RUN 결과

```
membership          : seed_json.groupScope.masterIds
passTargets 20 / excludedEnforced 3
ELIGIBLE(masterIds) 18 / BLOCKED(no-masterIds) 2
expectedNewCanonicalInsert 1,890 / preservedExistingCanonical 1,366
otcDefenseMismatch 0 / dbWrite 0
content format: html (bodyMarkdown→mdToHtml)
```

- **target master 합 3,256** = 신규 INSERT 1,890 + 기존 canonical 보존 1,366. (MEMBERSHIP-PERSIST 저장 3,256과 일치)
- **cross-group masterId 중복 0** (3,256 rows = 3,256 distinct) → 그룹 disjoint, master 당 canonical 1개 계약 안전.
- **otc 방어검증**: 전 masterIds 가 OTC master (mismatch 0).

### 그룹별 (ELIGIBLE 18)

| title | target | 기존 canonical(보존) | 신규 INSERT |
|-------|-----:|-----:|-----:|
| 종합 E·B군+Mg·아연 (A11JC sc, noA-noFe) | 769 | 184 | **585** |
| 종합 B군·C·D·E+아연 (A11JC tab, noA-noFe) #13 | 709 | 378 | **331** |
| 칼슘·비타민 D | 598 | 281 | **317** |
| 종합 D·E·B군·C+아연 (A11JB tab, noA-noFe) | 320 | 112 | **208** |
| 종합 E·B군+Mg (A11JB sc, noA-noFe) | 240 | 71 | **169** |
| 비타민 D·E·C | 259 | 121 | **138** |
| 비타민 B1·B2·B6·C | 95 | 35 | **60** |
| 종합 A·B군·C·E (A11JC sc, A-noFe) | 118 | 97 | **21** |
| 비타민 E 1000 IU | 20 | 2 | **18** |
| 마그네슘·비타민 B6 470mg급 | 21 | 5 | **16** |
| 비오틴 5mg | 30 | 22 | **8** |
| 비타민 E 400 IU | 9 | 2 | **7** |
| 종합 A·E·B군·C (A11JB sc, A-noFe) | 29 | 24 | **5** |
| 종합 A·B군·C·D·E (A11JC tab, A-noFe) | 20 | 16 | **4** |
| 비타민 E 100 IU | 8 | 5 | **3** |
| 마그네슘·비타민 B6 940mg급 | 4 | 4 | **0** (no-op) |
| 마그네슘·비타민 B6 290mg급 | 3 | 3 | **0** (no-op) |
| 종합 A·D·B군 (A11EX tab, A-noFe) | 4 | 4 | **0** (no-op) |
| **합계** | **3,256** | **1,366** | **1,890** |

### BLOCKED 2 (masterIds 미보유 → 승격 보류)
- 비타민 C 1000mg (`6f143bbc`) — masterTotal stale.
- 마그네슘·비타민 B2·B6 액제 (`41fc4904`) — Mg 축 필요.
→ MISMATCH-FIX-V1 로 멤버십 확보 후 편입.

## 2. content markdown→HTML 정책 반영
- SPD.content 는 HTML 계약 → `mdToHtml(bodyMarkdown)` 사용. `## `→`<h2>`, 파이프 표→`<table>`, `**x**`→`<strong>`, 문단→`<p>`. HTML escape(&,<,>) 적용.
- 변환 샘플(비오틴): `<h2>비오틴 5mg 정제 …</h2><table><thead><tr><th>항목</th>…</table><p><strong>효능·효과</strong> …</p>` — 정상.
- htmlLen 그룹당 732~884자. 그룹 내 전 master 에 동일 본문(공용 설명) 부여.

## 3. 승격 안전성
- **INSERT 는 `NOT EXISTS(canonical)` 가드** → 기존 canonical(1,366, e약은요 포함) 보존, UPDATE 0. 재실행 시 자동 no-op.
- source_type=`mfds_easy_drug`(entity union 기존값), source_ref_id=candidate_id(추적).
- excluded 3(#1/#12/#14): 20-draft 조회에서 제외 → 미처리. mismatch 2: BLOCKED. **eligible 18 = 저장 18과 정확히 동일**.

## 4. 금지사항 준수 (본 dry-run)
- [x] DB write 0 / canonical INSERT·UPDATE 0
- [x] 기존 canonical 미변경 (NOT EXISTS 가드)
- [x] ProductMaster/ProductIdentifier 미변경
- [x] draft content/seed 미변경
- [x] 매장 연결 없음

## 5. 완료 기준 대비
| 기준 | 상태 |
|------|------|
| masterIds 기반 신규 canonical 예상 insert 수 산출 | ✅ 1,890 |
| 기존 canonical 보존 수 산출 | ✅ 1,366 |
| excluded/mismatch 0 포함 확인 | ✅ (eligible 18 = 저장 18, excluded 미처리, mismatch BLOCKED) |
| 중복/충돌 0 확인 | ✅ (cross-group masterId 중복 0, otc 방어 0) |
| apply 가능 여부 판정 | ✅ **18그룹 apply-ready** (아래 §6 결정 후 실행) |

## 6. apply 전 결정 사항 (후속 apply WO)
1. **source_type**: `mfds_easy_drug`(기존 union, 본 스크립트 기본) 유지 vs 신규 `mfds_drug_otc`(entity union 확장 필요, 추적성↑). 현재는 source_ref_id 로 구분.
2. content HTML: `mdToHtml`(self-contained) 채택 vs 정식 markdown lib([[project_api_server_dual_deps_ssot]] package.production.json 동기화 전제). 본 dry-run 은 mdToHtml 사용.
3. 승인 토큰(`--apply` + `DRUG_OTC_NUTRITION_COMBO_CANONICAL_APPLY_CONFIRM=YES`) 부여 시 1,890 canonical INSERT.

## 7. 다음 단계
1. ~~apply WO: 18그룹 1,890 canonical INSERT~~ → **§8 APPLY 완료**.
2. MISMATCH-FIX-V1: 비타민C 1000mg masterTotal 31→38 / mgB 액제 Mg 축 → 멤버십 확보 후 재-persist → 편입.
3. #13/#14 제목 충돌 처리.

---

## 8. APPLY 결과 (WO-...-CANONICAL-PROMOTION-APPLY-V1)

- 결정 반영: source_type = **`mfds_drug_otc_nutrition_combo`**(신규, entity union 등재) / content = self-contained `mdToHtml`.
- 실행: `--apply` + `DRUG_OTC_NUTRITION_COMBO_CANONICAL_APPLY_CONFIRM=YES`, **단일 트랜잭션**(INSERT 후 트랜잭션 내 post-count==expected + master-canonical 중복 검사 → 불일치 시 rollback).
- pre-state: 신규 source canonical 0 / 전체 canonical 15,962.

| 항목 | 결과 |
|------|-----:|
| ELIGIBLE(masterIds) | 18 |
| **신규 canonical INSERT (dbWrite)** | **1,890** |
| 기존 canonical 보존 | 1,366 |
| BLOCKED (미승격) | 2 (비타민C·mgB) |
| 트랜잭션 post-count | inserted 1,890 == expected 1,890 ✅ |

### 독립 사후검증 (별도 SELECT)

| 검사 | 결과 |
|------|------|
| 신규 source canonical | **1,890** |
| 전체 canonical | **17,852** (=15,962+1,890) |
| master-canonical 중복 | **0** (partial-unique 준수) |
| 신규 1,890행 content HTML(`<h2>…`) / source_ref 설정 / ko | 1,890 / 1,890 / 1,890 |
| distinct source_ref(candidate) | 15 (newInsert>0 그룹 = 18−3 no-op) |
| draft review_status | 23건 `needs_review` 불변 |
| draft masterIds / bodyMarkdown | 18 / 23 보존 |

### DB write 범위 확인
- 변경: `shared_product_descriptions` **INSERT 1,890행**(status='canonical', source_type='mfds_drug_otc_nutrition_combo', content=HTML).
- 무변경: 기존 canonical UPDATE 0 / draft content_json·seed_json·review_status / ProductMaster·ProductIdentifier / 매장 연결.
- excluded 3 + mismatch 2 = master 미접촉(그들 그룹은 INSERT 대상 아님).

→ **영양제류 복합제 18그룹 canonical 승격 완료.** display 는 (master_id, status='canonical')로 조회하므로 해당 3,256 master(신규 1,890 + 기존 1,366) 매장 상품에 설명서 노출 가능.
