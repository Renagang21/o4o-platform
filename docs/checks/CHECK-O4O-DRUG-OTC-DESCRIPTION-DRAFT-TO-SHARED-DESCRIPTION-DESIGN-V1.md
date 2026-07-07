# CHECK-O4O-DRUG-OTC-DESCRIPTION-DRAFT-TO-SHARED-DESCRIPTION-DESIGN-V1

Status: DONE — read-only 조사 + 승격 정책 설계 + dry-run (2026-07-07). **DB write 0**
WO: `WO-O4O-DRUG-OTC-DESCRIPTION-DRAFT-TO-SHARED-DESCRIPTION-DESIGN-V1`
선행: `CHECK-O4O-DRUG-OTC-DESCRIPTION-DRAFT-DB-APPLY-V1`(draft 66 적재) · `CHECK-...-REVIEW-SHELL-V1`(admin 검수)

Scope: `product_candidate_description_drafts`(MFDS_DRUG_OTC 66그룹)를 `shared_product_descriptions`로 승격하기 위한 정책·전개·dry-run 설계. **실제 승격/ canonical 반영/ SPD·draft·master write 없음** — SELECT/COUNT + 코드(dry-run 전용)/문서만.

---

## 1. 조사 일시 / 채널

| 항목 | 값 |
| --- | --- |
| 조사 일시 | 2026-07-07 |
| 접속 | cloud-sql-proxy(127.0.0.1:15432) → psql / tsx DataSource |
| write | **0** (SELECT/COUNT 전용) |

---

## 2. 현재 상태 (운영 DB)

| 대상 | 값 |
| --- | --: |
| draft(product_candidate_description_drafts) | 66 (source_label=MFDS_DRUG_OTC, applyRunId=otc-draft-v1, 전량 needs_review) |
| shared_product_descriptions 전체 | 19,431 |
| ├ status=canonical / source=mfds_easy_drug | 15,962 |
| └ status=needs_review / source=mfds_easy_drug | 3,469 |
| SPD source_type 종류 | mfds_easy_drug 뿐(현재) |

draft verdict: auto 41 / review 11 / low_ground 11 / rx_minor 2 / manual 1.

---

## 3. 승격 구조 조사 결과 (핵심 제약)

### 3.1 display 는 (master_id + canonical) 로만 조회
- `store-public-utils.ts`: `LEFT JOIN shared_product_descriptions spd ON spd.master_id = pm.id AND spd.status = 'canonical'` (storefront·태블릿 공통).
- `product-library.controller.ts`: `WHERE master_id = $1 AND status='canonical'`.
- 함의 A: **`needs_review`/`candidate` 는 노출되지 않는다** → 승격을 needs_review 로 하면 화면 무변경(안전).
- 함의 B: **representative_product_id 폴백이 없다** → 특정 상품 상세는 그 master_id 의 canonical 만 본다. 그룹 대표 master 에만 넣으면 형제 SKU 는 못 본다 → **대상 master 전체 전개 필요**.

### 3.2 canonical 은 master 당 1개 (partial unique index)
- `shared_product_descriptions` 는 master 당 canonical 1개만 허용. e약은요 canonical 보유 master 에 새 canonical 을 넣으면 위반 → **기존 canonical 보존이 강제됨**. needs_review 는 개수 제한 없음.

### 3.3 SPD 스키마
- `master_id`(NOT NULL) · `content`(HTML text) · `summary` · `source_type`(varchar union) · `source_ref_id` · `status`(varchar union) · `language` · `quality_score`.
- source_type union 에 **`mfds_drug_otc` 값이 없음** → 승격 시 union 에 추가 필요(apply WO 의 코드 additive).
- content 는 HTML — draft `content_json`(요약표/효능/복용·사용/주의/GMP/bodyMarkdown)을 **HTML 로 렌더하는 ETL** 필요(apply 단계).

---

## 4. 그룹 → master 전개 기준 (설계)

- 전개 축 = draft `seed_json`(성분·함량·제형) 재파싱으로 얻는 **`drug_category='otc'` master 전체**. (승격 화면 노출이 master_id 단위이므로 대표만으로는 부족 — §3.1-B)
- RX master 는 전개 대상 아님(`drug_category='otc'` 필터로 자동 제외). RX 혼입 그룹(파모티딘·펙소페나딘60)도 OTC master 에만 전개.
- 처방의약품·미분류 제외(OTC master 만).
- 상품명만으로 전개하지 않음 — 성분·함량·제형(+OTC) 파싱 키 유지(draft 적재와 동일 키, 문서 수치 재현 검증됨).
- 그룹은 disjoint(성분·함량·제형) → master 중복 없음(dry-run: target 4,303 = distinct 4,303).

**N-copy 비용(명시):** 그룹 1개 설명이 최대 440개 master(에르도스테인)에 복제된다. display 가 master_id 단위라 현재 아키텍처에서는 불가피. 향후 display 계층에 representative_product_id 폴백을 넣으면 N-copy 회피 가능(별도 최적화, 이번 범위 밖).

---

## 5. e약은요 overlap 분석 (dry-run, 운영 DB, write 0)

target OTC master **4,303**(distinct 4,303) 기준:

| 구분 | master 수 | 비율 |
| --- | --: | --: |
| 이미 e약은요 **canonical** 보유 | **2,524** | 59% |
| 임의 SPD 보유(canonical+needs_review) | 3,007 | 70% |
| **설명 전무(no_spd)** | **1,296** | 30% |
| 이미 `mfds_drug_otc` 보유 | 0 | 0% (fresh) |

verdict별:

| verdict | masters | no_spd | e약은요 canonical |
| --- | --: | --: | --: |
| auto | 2,918 | 688 | 1,865 |
| review | 721 | 202 | 413 |
| low_ground | 446 | 354 | 90 |
| rx_minor | 178 | 38 | 130 |
| manual | 40 | 14 | 26 |

관측: low_ground 그룹(은행엽 213 중 no_spd 203 등)은 e약은요 커버가 낮아 **설명 전무 master 비중이 높다**(신규 설명의 한계 효용 큼). 반대로 우르소데옥시콜산·침강탄산칼슘 등은 e약은요 canonical 100% 커버(no_spd 0).

---

## 6. 승격 정책안 비교

| 안 | 대상 | status | insertable SPD | 장점 | 단점 |
| --- | --- | --- | --: | --- | --- |
| **A. no_spd 만** | 설명 전무 master | needs_review | **1,296** | 최소·최고 한계효용(무설명 SKU), canonical 충돌 0, 큐레이션 부담 최소 | e약은요 보유 master 엔 store 설명 미부여 |
| B. e약은요 보유에도 보조 | 전체 target(canonical 보존) | needs_review | 4,303 | 전 SKU에 store 설명 준비 | 큐레이션 4,303, 중복 다수 |
| C. auto 만 | auto 그룹 master | needs_review | 2,918 (auto+noSpd 688) | verdict 품질 상위만 | 나머지 verdict 보류 |
| D. 전체 review 대상 | 전체 target | needs_review | 4,303 | 최대 커버 | B와 동일 부담 |

**전개 시 status/source_type 매핑(공통):** `status='needs_review'`, `source_type='mfds_drug_otc'`, `language='ko'`, `source_ref_id=<draft id>`(그룹 draft 역참조 — verdict/flags 보존), `content`=draft content_json → HTML 렌더.

---

## 7. 추천안

**Phase 1(첫 apply) = A안 — no_spd master 1,296건, status=needs_review, source_type=mfds_drug_otc.**

근거:
- **가장 안전**: e약은요 canonical(2,524) 및 기존 SPD(3,007) 전혀 건드리지 않음. canonical unique 충돌 0. display 무변경(needs_review 미노출).
- **최고 한계효용**: 현재 설명이 전무한 1,296 SKU 에 최초 설명 공급. 이들은 canonical 경쟁자가 없어, 후속 curation 에서 **bulk-canonical 승격이 가장 깔끔**(기존 `drug-shared-description-bulk-canonical-job` 패턴 재사용 가능).
- **큐레이션 부담 최소**(1,296 vs 4,303).

**Phase 2(후속) = B/D안** — e약은요 canonical 보유 master(2,524)에도 store 설명을 needs_review 로 추가하고, "성분 중심 store 설명 vs e약은요 원문" 중 storefront canonical 을 무엇으로 할지 curation 에서 결정.

**canonical 승격은 두 Phase 모두에서 분리**(별도 승인). Phase 1 의 no_spd 는 경쟁 canonical 이 없어 bulk-canonical 후보로 우선.

---

## 8. dry-run 산출물 (write 0)

`npx tsx src/scripts/drug-otc-description-promotion-dryrun.ts` (SELECT only).

```txt
draftGroups        : 66
targetMasters      : 4303 (distinct 4303)
withCanonical      : 2524
withAnySpd         : 3007
noSpd              : 1296
already mfds_drug_otc: 0
policy insertable  : A(noSpd)=1296 / C(auto)=2918(auto+noSpd 688) / D(all)=4303
dbWrite            : 0
```

샘플(그룹 / verdict / masters / noSpd / e약은요 canonical):
- 에르도스테인|300|캡슐 · auto · 440 · 67 · 300
- 아세틸시스테인|200|캡슐 · auto · 287 · 59 · 202
- 세티리진염산염|10|정 · auto · 235 · 72 · 131
- 은행엽건조엑스|80|정 · low_ground · 213 · **203** · 10
- 나프록센나트륨|275|정 · review · 136 · 40 · 79
- 파모티딘|10|정 · rx_minor · 128 · 24 · 94
- 우르소데옥시콜산|100|정 · auto · 13 · **0** · 13 (전량 e약은요 canonical)
- 데소게스트렐|0.075|정 · low_ground · 6 · 0 · 6

---

## 9. 중복 방지 / rollback 기준 (apply WO 용 초안)

- **dedup(멱등)**: partial unique index `(master_id, source_type, language) WHERE source_type='mfds_drug_otc' AND deleted_at IS NULL` → master 당 mfds_drug_otc 설명 1개. `ON CONFLICT DO NOTHING`. (migration = apply WO)
- **run 식별/rollback**: `source_type='mfds_drug_otc'` (+ 선택 `source_ref_id` 또는 created_by 마커). rollback = soft delete `WHERE source_type='mfds_drug_otc'`. Phase 구분은 별도 마커 권장.
- **canonical 불변식**: 승격은 canonical 을 생성/변경하지 않는다(전부 needs_review). 기존 canonical 15,962 불변.

---

## 10. 위험 / 미결정

1. **needs_review 는 화면 미노출** — 승격만으로는 storefront 에 store 설명이 보이지 않음. 실제 노출은 canonical 승격(별도 curation WO)이 필요. Phase 1 no_spd(1,296)가 첫 bulk-canonical 후보.
2. **N-copy** — 그룹 설명이 다수 master 에 복제(최대 440). display 아키텍처(master_id 단위) 때문. 장기적으로 representative 폴백 도입 시 회피 가능.
3. **source_type union 추가** — `mfds_drug_otc` 는 코드 union + (선택) 문서화 필요(apply WO additive).
4. **content ETL** — content_json → HTML 렌더는 apply 의 결정적 단계.
5. **e약은요 vs store 설명 canonical 선택** — Phase 2 의 핵심 미결정. curation 정책 필요.

---

## 11. 검증 (write 0 확인)

| 항목 | 결과 |
| --- | --- |
| DB write / migration | **0** |
| shared_product_descriptions insert/update | 0 (19,431 불변: canonical 15,962 / needs_review 3,469) |
| product_candidate_description_drafts 변경 | 0 (66 불변) |
| product_masters 변경 | 0 |
| dry-run 재현 | 가능(script + SQL, read-only) |
| typecheck / git diff --check | 통과 |
| 산출물 | promotion dry-run 스크립트(read-only) + 본 CHECK |

---

## 12. 후속 WO

**`WO-O4O-DRUG-OTC-DESCRIPTION-DRAFT-TO-SHARED-DESCRIPTION-APPLY-V1`** (권장 Phase 1)
- 범위: A안(no_spd 1,296) → shared_product_descriptions needs_review 생성. source_type=mfds_drug_otc union 추가 + dedup partial unique migration + content_json→HTML ETL + 사용자 승인 + chunk/transaction + 전/후 count 검증 + rollback(source_type soft delete).
- 이후: no_spd 대상 bulk-canonical curation WO → Phase 2(e약은요 보유 master 보조 설명) → e약은요 vs store 설명 canonical 정책.
