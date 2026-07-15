# CHECK-O4O-OTC-KO-CANONICAL-PROMOTION-READINESS-V1 — 한국어 canonical 승격 준비 점검

WO: `WO-O4O-OTC-KO-CANONICAL-PROMOTION-READINESS-V1` · 일자: 2026-07-16 · 상태: 완료
선행: [PILOT-VALIDATION §5-G](CHECK-O4O-OTC-EN-DESIGN-PILOT-VALIDATION-V1.md) 선결 ① · [ROUTE-SIGNAL](CHECK-O4O-OTC-ROUTE-SIGNAL-ENRICHMENT-V1.md) · [RENDER-SOURCE](CHECK-O4O-OTC-CANONICAL-RENDER-SOURCE-STRUCTURED-FIELDS-V1.md)

> **read-only 조사.** DB write **0** · canonical 승격 **0** · 초안 상태 변경 **0** · 영문 저장 **0** · 코드 변경 **0**.

---

## 1. 결론

> **콘텐츠는 95/95 준비 완료. 막는 것은 품질이 아니라 `masterIds`(멤버십) 부재다.**
> 필수 필드 누락 **0** · 소비자 HTML 빈 결과 **0** · route `needs_review` **0** · 주석 노출 **0** · 중복 그룹 **0**.
>
> 그런데 **현재 apply 경로(`masterIds` 요구)로 지금 승격하면 신규 INSERT = 0**이다.
> `masterIds` 보유 19건은 **대상 master 전부가 이미 canonical 포화**이고, 나머지 76건은 **`masterIds` 가 없다**.
>
> **실질 승격 대상 = single 66건**(groupKey 전개 시 **설명 전무 master 1,294건** 확보). 단 **전개 결과를 apply 에 넣는 경로가 없다** → 승격 WO 의 **선결 1건**.

---

## 2. 초안 95건 전수 판정

| 분류 | 건수 | 내용 |
|---|---:|---|
| **승격 가능 (전개 필요)** | **66** | single 초안. `groupKey='성분\|함량\|제형'` → master 전개 가능. **`masterIds` 미저장** |
| **중복 또는 기존 canonical 존재** | **19** | `masterIds` 보유. **대상 master 100% 이미 canonical** → 신규 INSERT **0** |
| **ProductMaster 연결 문제** | **10** | `masterIds` 없음 **+** `groupKey` 가 ATC 형식(`drug_otc::combo::oral::A06AB52`)이라 **전개 불가** |
| 필수 필드 누락 | **0** | |
| 검토 필요(구조) | **0** | |
| 기타 보류 | **0** | |

- `review_status`: **95건 전부 `needs_review`** (승격 시 `canonical` 로 올릴지 = 승인 사안).
- **중복 그룹 0**: `candidate_id` 95 distinct · `groupKey` 95 distinct.

### 2-1. 구조 검증 — 전부 통과

| 항목 | 결과 |
|---|---:|
| 필수 4필드(`efficacy`·`usage`·`caution`·`summaryTable`) 완전성 | **95/95 완전** |
| 소비자 HTML 생성 가능(`buildDrugOtcConsumerHtml`) | **95/95 생성** · 빈 결과 **0** |
| route 파생 | **oral 94 / vaginal 1** · `needs_review` **0** |
| 내부 주석 분리 적용 가능 | **95/95** · 소비자 HTML 주석 노출 **0** · 본문 중간 인용 **0** |

---

## 3. ProductMaster 연결 상태

### 3-1. 멤버십 신호

`seed_json.groupScope` 실측 — **ID 목록은 `masterIds` 뿐**이고 나머지는 **개수(number)** 다.

| 필드 | 타입 | 보유 |
|---|---|---:|
| **`masterIds`** | **array** | **19 / 95** |
| `masterTotal` · `spdMasters` · `otc` | number(개수) | 95 |
| `anchorMasters` | number(개수) | 66 |
| `rx` | number | 72 |

| runId | 초안 | `masterIds` 보유 | master 합 |
|---|---:|---:|---:|
| `otc-draft-v1` (single) | 66 | **0** | 0 |
| `otc-nutrition-combo-draft-v1` | 23 | **19** | 3,294 |
| `otc-combo-draft-v1` | 6 | **0** | 0 |

### 3-2. `masterIds` 보유 19건 — 전부 포화

19건 모두 **`existing_canonical == masters`**(대상 master 100%가 canonical 보유). 이 초안 유래 canonical 합계 = **1,915**(= 기존 승격분과 정확히 일치).

> 현재 apply 는 `WHERE NOT EXISTS(canonical)` 이므로 재실행해도 **0 rows** — idempotent no-op. **충돌·중복 위험 없음.**

### 3-3. 전개 불가 10건

`masterIds` 도 없고 `groupKey` 도 성분\|함량\|제형 형식이 아니다(ATC 코드 형식). → **멤버십을 만들 방법이 현재 없다.**

```text
drug_otc::combo::oral::A06AB52   (변비약 — 자극성 완하제 복합)
drug_otc::combo::oral::M01AE51   (이부프로펜 진통 복합)
drug_otc::single::oral::a12cc::5mg::tablet  (마그네슘 정제)   ← DR-010 6세그먼트 형식이나 전개 로직 없음
… 총 10건
```

---

## 4. 승격 여지 (headroom)

| 항목 | 값 |
|---|---:|
| OTC master 총계 | **57,572** |
| canonical 보유 | **21,046** (e약은요 19,131 + 우리 combo 1,915) |
| **canonical 없음** | **36,526** ← 여지는 충분하다 |

> **canonical 포화가 전체 문제는 아니다.** 19건이 하필 포화 구간을 겨냥했을 뿐이다.

### 4-1. single 66건 전개 결과 (기존 read-only dry-run 실행)

`drug-otc-description-promotion-dryrun.ts` (DB write 0) 실측:

| 항목 | 값 |
|---|---:|
| draft 그룹 | 66 |
| **전개된 대상 master** | **4,303** (distinct 4,303) |
| e약은요 canonical 보유 | 3,009 |
| **설명 전무(`noSpd`)** | **1,294** |
| 이미 `mfds_drug_otc` 승격분 | **0** |

**정책별 예상 INSERT**

| 정책 | INSERT rows | 성격 |
|---|---:|---|
| **A — `noSpd` only** | **1,294** | 기존 canonical **보존**, 설명 전무 master 에만 신규 canonical. **충돌 0** |
| C — auto 판정만 | 2,918 (그중 noSpd 686) | |
| D — 전체 대상 | 4,303 | 기존 canonical 보존 + `needs_review` 병행 저장 |

**판정 분포**: `INSERT_auto` 2,918 · `review_flag` 721 · `low_ground_flag` 446 · `rx_minor_flag` 178 · `manual_flag` 40.

---

## 5. WO 검증 항목 대조

| 항목 | 결과 |
|---|---|
| **승격 가능 예상 건수** | **현재 apply 경로 = 0 rows**. single 66건 전개 시 **정책 A = 1,294 rows** |
| **기존 canonical 과 중복 0 여부** | ✅ 정책 A 는 `noSpd` 만 대상 → **중복 0**. 19건 재실행도 `NOT EXISTS` 로 **no-op** |
| **master 당 canonical 중복 가능성** | ✅ **없음** — partial unique + `NOT EXISTS` 가드. 전개 master 4,303 **distinct 4,303**(중복 0) |
| **주석 소비자 노출 0** | ✅ **0/95** |
| **route `needs_review` 건수** | ✅ **0** |
| **소비자 HTML 빈 결과 건수** | ✅ **0** |
| **승격 시 예상 INSERT·UPDATE** | INSERT = 정책에 따라 **0 / 1,294 / 2,918 / 4,303**. **UPDATE = 0** (기존 canonical 보존, UPDATE 경로 없음) |

---

## 6. 실제 승격 WO 에 사용할 조건 (확정)

```sql
-- 대상: single 초안 66건 (otc-draft-v1)
--  ① groupKey = '성분|함량|제형' → product_masters 파싱 매칭으로 전개
--  ② drug_category='otc' 인 master 만  (비-OTC 혼입 시 중단)
--  ③ 정책 A = canonical/SPD 가 전혀 없는 master 만  (기존 canonical 절대 보존, UPDATE 0)
--  ④ 소비자 content = buildDrugOtcConsumerHtml(구조화 필드)   ← bodyMarkdown 사용 금지(CR-021)
--  ⑤ 필수 4필드 누락 시 그 그룹 제외 (missing[] → 승격 보류)
--  ⑥ source_type = 전용 값 / language='ko' / status = 승인에 따라 결정
--  ⑦ --apply AND 환경변수 CONFIRM 이중 게이트
```

| 파라미터 | 권고 |
|---|---|
| 정책 | **A (`noSpd` only)** — 기존 e약은요 canonical 을 건드리지 않아 회수 가능성이 가장 높다 |
| 예상 INSERT | **1,294 rows** |
| 예상 UPDATE | **0** |
| status | 95건이 `needs_review` 다 → **canonical 로 승격할지 = 사용자 승인 필요**. `INSERT_auto` 2,918 외 `review_flag`·`low_ground`·`manual` 은 **약사 검토 강화 대상**(DR-008) |
| 제외 | ProductMaster 연결 문제 **10건** · `masterIds` 포화 **19건** |

---

## 7. 완료 기준 대조

| 기준 | 결과 |
|---|---|
| 95건 전수 판정 | ✅ §2 |
| 승격 가능 대상과 보류 대상 명확화 | ✅ 66 가능(전개 필요) / 19 포화 / 10 연결 문제 |
| 승격 WO 조건·예상 수량 확정 | ✅ §6 — 정책 A · 1,294 INSERT · 0 UPDATE |
| DB write · 승격 · 상태 변경 | ✅ **0** |
| build 선행 결함 별도 기록 | ✅ §8 |

---

## 8. build 선행 결함 (내 변경 무관 — 별도)

```text
src/modules/content-guard/__tests__/fixtures/known-errors.ts(8,40):
  error TS2307: Cannot find module '../product-description-guard.types.js'
```

타 세션 커밋 **`e41c78157`(`wip(content-guard)`)** 의 import 경로 오류(`../` → `../../`). **본 WO 는 read-only 조사라 코드 변경 0** — 이 결함과 무관하며, 해소 주체는 content-guard 세션 또는 build exclude 정비 WO다. (`tsconfig.build.json` exclude 가 `src/modules/*/__tests__/fixtures/*.ts` 를 걸러내지 않는 구조적 원인.)

---

## 9. 승격 전 남은 선결 (§6 실행 전)

| # | 선결 | 이유 |
|:---:|---|---|
| **1** | **single 66건 전개 → apply 경로 확정** | 현재 apply 는 `masterIds` 요구 → 66건 전부 `NO_MASTERIDS` 로 보류된다. **전개 결과를 masterIds 로 저장(MEMBERSHIP-PERSIST)** 하거나 **apply 가 전개를 직접 하도록** 확장해야 한다. **DB write 필요 → 승인된 별도 WO** |
| **2** | **status 정책 승인** | 95건 `needs_review` → `canonical` 승격 여부는 **사용자 승인 사안**. `auto` 외 판정(review/low_ground/manual 1,385 master)은 약사 검토 강화 |
| **3** | (선택) 전개 불가 10건 | ATC 형식 groupKey → 멤버십 확보 방법 별도 설계 |

> **콘텐츠 품질은 더 이상 blocker 가 아니다.** 남은 것은 **멤버십 경로**와 **승인**이다.
