# CHECK-O4O-DRUG-OTC-ORAL-SINGLE-TOTAL-INVENTORY-AUDIT-V1

> **WO:** WO-O4O-DRUG-OTC-ORAL-SINGLE-TOTAL-INVENTORY-AUDIT-V1 (HANDOFF)
> **성격:** 단일제 경구 OTC **전체 모수 read-only 조사**. 설명서 작성 0 · DB write 0 · registry 직접 변경 0 · 복합제/비경구 작업 0.
> **핵심 결론:** 직전 32개는 단일 경구 전체가 아니라 **첫 batch**가 맞다. 단일 경구 OTC ProductMaster는 **약 35,293건**, 설명서 그룹은 정규화 키에 따라 **품질 그룹 ~514(성분×함량×제형) / 고품질 성분패밀리 ~120(ATC7)**, 저가치 꼬리까지 **원시 ~4,293 그룹**. 이미 작업된 것은 registry BATCH-ORAL-SINGLE **97행**(imported 65 + 방금 초안 32)뿐. **다음은 복합제가 아니라 단일 경구 2차 batch**가 맞다.

---

## 1. 작업 일시 / 채널

| 항목 | 값 |
|---|---|
| 조사 일시 | 2026-07-07 |
| 접속 | Cloud SQL Auth Proxy (`google-cloud-sdk/bin/cloud-sql-proxy`, 127.0.0.1:15455) → psql SELECT |
| 인스턴스 | `netureyoutube:asia-northeast3:o4o-platform-db` / DB `o4o_platform` |
| 인증 | gcloud ADC(sohae2100@gmail.com) + DB 계정 `o4o_api`(Cloud Run env read-only 추출) |
| write | **0** (SELECT/COUNT/GROUP BY 전용, 임시 CTE만) |

## 2. 사용한 문서

| 문서 | 활용 |
|---|---|
| `docs/registries/O4O-DRUG-OTC-DESCRIPTION-GROUP-REGISTRY-V1.md` | 기존 작업 97행(imported 65 + candidate 32) 대조 |
| `docs/checks/CHECK-...-GROUPING-NORMALIZATION-AND-FILTER-DESIGN-V1.md` | route/single/함량축 필터 기준(§9·§11)·정규화 파이프라인 대조 |
| `docs/checks/CHECK-...-BATCH-ORAL-SINGLE-DRAFT-V1.md` | 직전 32 batch 결과 |
| `docs/checks/CHECK-...-REGISTRY-POPULATE-V1.md` | imported 66·candidate 111 산출 근거 |
| `docs/guides/O4O-DRUG-STORE-DESCRIPTION-WRITING-GUIDE-V1.md` §3.5~3.10 | 함량축 RX·route·단일/복합 판정 기준 |

## 3. 사용한 DB 접속/조회 방식

- 스키마 실측(introspection) + 서브에이전트 엔티티 조사로 컬럼 확정. **핵심 스키마 사실:**
  - `product_masters`에는 **`deleted_at` 없음**(행 존재=활성, 삭제=hard delete). OTC 판별 = `drug_category='otc'`(권위 컬럼).
  - **route·single/combo·strength·dosage_form 전용 컬럼 없음.** `product_drug_extensions`의 임상/구조화 필드(strength·dosage_form·active_ingredients·efficacy_text)는 OTC 전량 **NULL**(보수 mirror). 코드 필드(atc_code·mfds_code·drug_code)만 채워짐.
  - 따라서 route/단일/함량/제형은 **`product_masters.name`+`specification` 파싱 + `product_identifiers`(ATC_CODE) 조인**으로 파생(§12 NORMALIZATION 기준 재사용).
- 인코딩 함정: 한글 정규식을 CLI 인자로 넘기면 UTF-8 깨짐 → **UTF-8 `.sql` 파일 + `psql -f` + `PGCLIENTENCODING=UTF8`**로 해결.

## 4. 전체 DRUG / OTC count (실측)

| 항목 | count |
|---|--:|
| DRUG · rx | 119,548 |
| DRUG · **otc** | **57,572** |
| DRUG · drug_unspecified | 293 |
| QUASI_DRUG | 17,148 |
| MEDICAL_DEVICE | 3,826 |
| GENERAL | 2 |
| **DRUG ProductMaster 합계** | **177,413** |
| OTC 중 ATC_CODE 보유 | 57,480 (99.8%) |
| grounding: e약은요(`mfds_easy_drug`) 보유 **distinct master** | **19,431** (canonical 15,962 + needs_review 3,469) |
| imported drafts (`product_candidate_description_drafts`) | 66 |

## 5. 단일 경구 후보 count — population funnel (실측)

OTC(ATC 보유) 57,480행에서 순차 필터:

| 단계 | 조건 | 제외/잔존 |
|---|---|--:|
| 노이즈 제외 | name에 수출/군납/비매품/해외 | −4,015 |
| 비경구 제외 | name 키워드(질정·좌제·점안·외용·크림·주사·시럽 등) **또는** ATC 해부학군(G/D/S 시작·R01/R02/A01/P03) | −13,211 |
| = 경구 rows | | **40,254** |
| 경구 복합제 제외 | ATC 조합코드(6~7번째 ≥50 · R05X 계열) | −4,961 |
| **= 단일 경구 rows** | | **35,293** |

> **단일 경구 OTC ProductMaster ≈ 35,293건** (OTC의 61%). 직전 batch 32개(그룹)와 자릿수가 완전히 다르다 → **32는 첫 batch가 맞다.**

## 6. 설명서 그룹 수 (핵심 — 정규화 키 민감)

그룹 수는 **정규화 키에 따라 크게 달라진다.** 세 관점을 모두 보고한다.

### 6.1 count 표 (WO §6.1)

| 항목 | count | 근거 |
|---|--:|---|
| 전체 DRUG ProductMaster | 177,413 | 실측 §4 |
| OTC ProductMaster | 57,572 | 실측 |
| OTC 중 경구 추정(단일+복합) | 40,254 | 실측 §5 |
| OTC 중 단일제 추정(경구 한정) | 35,293 | 실측 §5 |
| **OTC + single + oral 후보 ProductMaster** | **35,293** | 실측 §5 |
| 설명서 그룹 수 — 원시(성분ATC7×함량×제형) | **4,293** | 실측 Q3 |
| 설명서 그룹 수 — 품질(A+B+C, grounding 보유) | **514** (A 248 · B 185 · C 81) | 실측 Q3 |
| 설명서 성분패밀리 수 — 고품질 ATC7(A-tier) | **120** | 실측 Q5 |
| 정규화 파이프라인 clean 그룹(§12 전용 WO) | 213 (완료 57 + NET신규 32 + 꼬리 124) | §12 재인용 |
| 기존 imported 그룹(single-oral, registry) | 65 | registry |
| 직전 32 batch 포함 그룹 | 32 | registry(candidate) |
| **아직 미작업 그룹(품질 A+B+C 기준)** | **~417** (514 − ~97 작업) | 실측−registry |
| 아직 미작업 그룹(원시 전체) | ~4,196 | 실측−registry |
| grounding 충분 그룹(≥1 grounded master) | 940(원시) / 514(A+B+C 전량 grounded) | 실측 |
| grounding 부족 그룹(꼬리 D) | 3,779 (grounded 426뿐) | 실측 |
| manual_curation 필요(민감군 내) | §8 참조 | §3.9 |
| blocked 후보(함량 불명확 그룹) | 409 (strength='없음/0/기타') | 실측 |

### 6.2 tier 분포 (실측 Q3 — 단일 경구, 노이즈/비경구/복합 제외)

| tier | 조건 | 그룹 | masters | grounding 보유 |
|---|---|--:|--:|--:|
| A_auto | 제조사≥3 & grounded master≥6 | 248 | 12,022 | 248 |
| B_review | 제조사≥2 & grounded≥3 | 185 | 2,507 | 185 |
| C_lowground | 제조사≥2 & grounded≥1 | 81 | 658 | 81 |
| D_tail | 제조사=1 또는 grounded=0 | 3,779 | 20,106 | 426 |
| **합계** | | **4,293** | **35,293** | 940 |

> A_auto 248 그룹은 **성분패밀리 120개(ATC7)** 를 함량·제형으로 펼친 것. 120 중 **75는 완전 ATC7 단일성분**, **45는 coarse ATC(len 3~5, 성분 미세분해 필요)**, **16은 멀티비타민/미네랄/자양강장 복합제 누출**(§7).

## 7. 그룹핑 정합 이슈 (조사 중 발견 — 후속 정비 필요)

1. **복합제 누출 into "single":** A-tier 120 성분패밀리 중 **16개가 멀티비타민/미네랄/자양강장 복합제**(예: `A11JC` 아이락비타연질캡슐, `A12AX` 애니칼, `A11JB` 마그락비타, `A13A` 헬시타민, `A11AB`, `V06`, `A16AX`). ATC **숫자접미 조합코드(≥50)** 규칙이 이들 비타민/미네랄 **복합제(조합코드 없는 계열)** 를 못 걸러 single로 남는다. → 단일/복합 재분류 필요.
2. **coarse ATC(45):** len 3~5 ATC는 성분 단위가 아니라 치료군 단위 → 서로 다른 성분이 한 그룹으로 병합 위험. §12의 `COALESCE(ATC7, cleaned_name)` hybrid로 미세분해 필요.
3. **strength 불명확(409):** specification 첫 토큰이 `없음`/`0`/`기타`(예: "200기타 / 1 / 매") → 함량축 확정 불가 → blocked 후보.
4. **route·single/combo DB 컬럼 부재:** 매 조사마다 name/ATC 파싱에 의존 → **파생 규칙을 표준 뷰/쿼리로 고정**하지 않으면 batch마다 재현성 흔들림(§12 필터 기준을 SSOT로 재사용 권장).

## 8. 기존 작업(97행)과 중복 확인

- registry `BATCH-ORAL-SINGLE` = **97행** = imported 65 + candidate 32. candidate 32는 직전 WO에서 초안(drafted 3/needs_review 27/manual 1/blocked 1).
- imported 65는 Q4 A-tier 상위 대중 제네릭과 대부분 일치(에르도스테인 R05CB15 · 세티리진 R06AE07 · 덱시부프로펜 M01AE14 · 나프록센 M01AE02 · 이부프로펜 M01AE01 · 아세트아미노펜 N02BE01 · 아스피린 B01AC06 · 트리메부틴 A03AA05 · 알벤다졸 P02CA03 · 알마게이트 A02AD03 · 바실루스 A07FA01 · 디오스민 C05CA03 · 엘카르니틴 A16AA01 등).
- **§12 완료 57 트리플 anti-join 후 단일 경구 NET 신규 = 32**(=직전 batch). 즉 정규화 파이프라인 기준으로는 **32가 "현행 기준 신규 소진"**이나, 본 실측은 그 위에 **coarse ATC 미세분해(45)·복합제 재분류(16)·B/C tier(266 그룹)** 가 추가 여지로 남아 있음을 보여준다.
- 중복 축(ingredient/strength/dosage_form/route/group_key/MFDS_CODE): registry group_key 중복 0 확인됨(POPULATE §6). 직전 32와 imported 65 exact 중복 0(BATCH-ORAL-SINGLE-DRAFT §6).

## 9. 그룹 분류 (WO §8 버킷 매핑)

| 분류 | 추정 규모(단일 경구) | 근거 |
|---|--:|---|
| already_imported | 65 | registry imported |
| already_drafted | 32 | 직전 batch(needs_review 27 포함) |
| canonical_exists | (master 단위) 15,962 | mfds_easy_drug canonical |
| ready_for_single_oral_draft | ~수십(2차 batch 후보) | A-tier 미작업 clean ATC7 + B tier 상위 |
| needs_grounding | D_tail 중 grounded 426 + C 81 | grounding 얇음 |
| manual_curation | 민감군(피임·수면유도·항혈전·철분·간담도·세인트존스워트 등) | §3.9 |
| route_uncertain | (비경구 제외 13,211에 일부 잔존) | name 파싱 한계 |
| combo_suspected | 16 성분패밀리(비타민/미네랄 복합) + 경구 복합 4,961 masters | §7-1 |
| blocked | 409 그룹(strength 불명확) | §7-3 |
| excluded | 노이즈 4,015 + 비경구 13,211 + 복합 4,961 | §5 |

## 10. 우선순위 batch 제안

**이 작업방(단일 경구 전용) 다음 순서:**

1. **단일 경구 2차 batch (권장 즉시):** A-tier **clean ATC7 성분패밀리 중 미작업**분 + B-tier 상위(grounding≥3) → 정규화(hybrid ATC7)로 그룹 확정 후 초안. 규모 = 수십 그룹(품질 514 − 작업 97 − 복합누출 16 − coarse 미해결 45 ≈ ~350 후보 중 grounding·제조사 상위부터).
2. **복합제 누출 재분류 WO:** §7-1의 비타민/미네랄/자양강장 복합제 16패밀리를 single→combo로 이관(BATCH-ORAL-COMBO 소관) + coarse ATC 45 미세분해.
3. **저grounding 꼬리(D 3,779 / masters 20,106):** 매장 가치 낮음(단일제조사·무grounding) → **원문 grounding 확보 전까지 보류**, §3.8 근거 없는 자동 확장 금지.
4. registry 확장: 위 2차 batch 확정분을 `candidate`로 registry에 추가(중앙 승인 후).

> **복합제(BATCH-ORAL-COMBO 68)·비경구 route batch는 별도 작업방** — 본 작업방은 단일 경구 소진까지 유지.

## 11. registry 확장 제안 (직접 변경 아님)

- registry는 현재 단일 경구를 **BATCH-ORAL-SINGLE 97행**만 보유. 본 실측이 확인한 **품질 그룹 ~514 / 성분패밀리 ~120** 대비 크게 미달 → 2차 batch 확정 시 candidate 추가 필요(중앙 전용).
- 추가 전 §7의 정합 이슈(복합 누출·coarse ATC·strength 불명확) 선해결 권장.
- 본 CHECK는 registry 파일을 **변경하지 않음**.

## 12. 금지사항 준수 확인

| 항목 | 준수 |
|---|:-:|
| DB write | ✅ 0 (SELECT/COUNT/GROUP BY만) |
| 설명서 초안 작성 | ✅ 0 |
| ProductMaster/ProductCandidate 변경 | ✅ 0 |
| product_candidate_description_drafts insert/update | ✅ 0 |
| SharedProductDescription 변경 | ✅ 0 |
| ProductDrugExtension 변경 | ✅ 0 |
| canonical 승격 | ✅ 0 |
| registry 직접 변경 | ✅ 0 |
| 복합제/비경구/처방/의약외품/의료기기/건기식 작업 | ✅ 0 |

## 13. 완료 기준 대조 (WO §10)

| 성공 기준 | 충족 |
|---|:-:|
| 단일 경구 OTC 전체 모수 산출 | ✅ 35,293 masters (§5) |
| ProductMaster 수와 설명서 그룹 수 분리 | ✅ masters 35,293 / 그룹 4,293·품질 514·패밀리 120 (§6) |
| 기존 32개와 중복 확인 | ✅ §8 (registry 97, exact 중복 0) |
| 미작업 단일 경구 그룹 수 산출 | ✅ 품질 ~417 / 원시 ~4,196 (§6.1) |
| 다음 단일 경구 batch 우선순위 | ✅ §10 |
| CHECK 문서 생성 | ✅ 본 문서 |
| DB write 0 / 초안 0 / registry 변경 0 / 복합제 0 | ✅ §12 |

---

*V1 · 2026-07-07 · read-only 운영 DB 실측 · 단일 경구 OTC masters 35,293 / 품질 그룹 514 / 패밀리 120 · 작업된 97 · 다음=단일 경구 2차 batch · write 0*
