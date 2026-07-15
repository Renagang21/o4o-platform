# CHECK-O4O-OTC-SINGLE-GROUP-EXPANSION-APPLY-PATH-V1 — single 66건 전개 → apply 경로

WO: `WO-O4O-OTC-SINGLE-GROUP-EXPANSION-APPLY-PATH-V1` · 일자: 2026-07-16 · 상태: 완료 (경로 구현 + dry-run)
선행: [READINESS §6·§9](CHECK-O4O-OTC-KO-CANONICAL-PROMOTION-READINESS-V1.md) 선결 ① · [RENDER-SOURCE](CHECK-O4O-OTC-CANONICAL-RENDER-SOURCE-STRUCTURED-FIELDS-V1.md)

> **DB write 0 · canonical 승격 0 · draft 상태 변경 0 · 기존 canonical 수정 0 · 전개 불가 10건 미접촉.**
> apply 는 **이중 게이트로 잠긴 채 구현만** 했고 **실행하지 않았다**. 실제 승격 = **별도 승인 WO**.

---

## 1. 결론

> **전개→apply 경로 완성.** dry-run 실측이 기존 read-only dry-run 과 **완전 일치**한다.
> **66 그룹 → master 4,303(distinct 4,303, 중복 0) → 설명 전무 1,294 → 예상 INSERT 1,294 / UPDATE 0.**
> **반복 실행 결과 바이트 동일**(재현성). 테스트 **51/51**.
>
> 핵심 설계: **dry-run 과 apply 가 같은 전개 함수를 쓴다** → 두 결과가 어긋나는 것이 구조적으로 불가능하다.

---

## 2. 구현

### 2-1. 공용 전개 모듈 (신규)

`modules/neture/drug-import/drug-otc-single-group-expansion.ts` — **read-only 조회만**(INSERT/UPDATE 경로 없음).

| export | 역할 |
|---|---|
| `expandDrugOtcSingleGroups(ds, opts)` | **성분·함량·제형 3축 정확일치** 전개 → `(그룹, master)` 행 + 기존 SPD 상태(`hasCanonical`/`hasAnySpd`/`hasOtcPromotion`) |
| `selectPromotionTargets(rows, 'A_no_spd_only')` | 정책 A 필터 → 그룹별 `masterIds` |
| `findCrossGroupDuplicateMasters(targets)` | 그룹 간 master 중복 검출 (master 당 canonical 1개 계약) |

- 전개 기준은 기존 dry-run 과 **동일**: `name` 끝 괄호 성분 · `specification` 첫 토큰 · `name` 파생 제형(연질캡슐>캡슐>정) · `regulatory_type='DRUG' AND drug_category='otc'`.
- **Raw SQL 파라미터 바인딩**(`$1`·`$2`) 사용 — 문자열 보간 금지(CLAUDE.md §7 Guard Rule 2).
- `ORDER BY gk, master_id` 고정 → **반복 실행 동일 결과**.

### 2-2. apply 경로 스크립트 (신규 · 미실행)

`scripts/drug-otc-single-canonical-promotion.ts` — 기본 **dry-run**, apply 는 `--apply` **AND** `DRUG_OTC_SINGLE_CANONICAL_APPLY_CONFIRM=YES` **이중 게이트**.

| 안전 조건 | 구현 |
|---|---|
| 기존 canonical **UPDATE 금지** | UPDATE 문 **자체가 없다**. INSERT 만 존재 |
| 신규 canonical **INSERT만** | `INSERT … WHERE NOT EXISTS(SPD for that master)` |
| **`bodyMarkdown` 사용 금지** | 로드하지 않는다. `buildDrugOtcConsumerHtml(구조화 필드)` 만 사용 |
| **동일 master 중복 INSERT 금지** | ① 그룹 내 `Set` 중복 제거 ② 그룹 간 중복 시 **apply 중단**(throw) ③ `NOT EXISTS` 가드 ④ post-count `master 당 canonical>1` 검증 시 **롤백** |
| 필수 필드 누락 | `missing[]` → 그룹 **승격 보류**(INCOMPLETE_FIELDS) |
| 재실행 안전 | `NOT EXISTS` → 자동 no-op |
| 트랜잭션 | 단일 트랜잭션 + `insertedTotal !== expectedInsert` 시 **롤백** |

### 2-3. `source_type` union 등재

`SharedProductDescription.entity.ts` 에 **`mfds_drug_otc`** 추가(기존 dry-run 주석이 "apply WO 에서 추가" 로 예고한 값).
컬럼이 `varchar(32)` 라 **DB migration 불필요** — 타입 union 만 확장.

---

## 3. 검증

### 3-1. 요구 항목 대조 (dry-run 실측)

| 항목 | 기대 | 실측 | 결과 |
|---|---:|---:|:---:|
| 66건 → master 전개 | 4,303 | **4,303** | ✅ |
| distinct master | 4,303 | **4,303** | ✅ |
| 기존 canonical 보유 | 3,009 | **3,009** | ✅ |
| **설명 전무(정책 A 대상)** | 1,294 | **1,294** | ✅ |
| **master 중복** | 0 | **0** (`distinctMasters == targetMasterRows`) | ✅ |
| **그룹 간 master 중복** | 0 | **0** | ✅ |
| **기존 canonical 대상 포함** | 0 | **0** (`hasAnySpd` 전부 제외) | ✅ |
| **예상 INSERT** | 1,294 | **1,294** | ✅ |
| **예상 UPDATE** | 0 | **0** (경로 없음) | ✅ |
| 이미 승격분 | 0 | **0** | ✅ |
| `dbWrite` | 0 | **0** | ✅ |

### 3-2. 기존 read-only dry-run 과 대조 — **완전 일치**

```text
기존 drug-otc-description-promotion-dryrun : 66 / 4303 / 3009 / 1294 / alreadyOtc 0
신규 전개 경로                              : 66 / 4303 / 3009 / 1294 / alreadyPromoted 0
```

### 3-3. 재현성

동일 명령 **2회 실행 → JSON 리포트 `diff` 무차이**. `ORDER BY` 고정 + 순수 함수 필터라 실행마다 흔들리지 않는다.

### 3-4. 그룹 판정

| 구분 | 건수 |
|---|---:|
| **승격 가능** | **60** |
| 보류(`NO_TARGET`: 전개 master 가 전부 기존 SPD 보유) | **6** |
| 보류(필수 필드 누락) | **0** |

보류 6건: 데소게스트렐 0.075mg · 우르소데옥시콜산 100mg · 비오틴 5mg · 침강탄산칼슘 500mg · 펙소페나딘 60mg 연질캡슐 · 엔테로코쿠스페슘 30mg — **신규 INSERT 대상이 없을 뿐 결함이 아니다.**

**승격 가능 60건의 verdict 분포** (승격 시 검토 강도 판단용)

| verdict | 그룹 |
|---|---:|
| `INSERT_auto` | 37 |
| `INSERT_review_flag` | 11 |
| `INSERT_low_ground_flag` | 9 |
| `INSERT_rx_minor_flag` | 2 |
| `INSERT_manual_flag` | 1 |

> ⚠️ `auto` 외 **23그룹**은 **약사 검토 강화 대상**(DR-008). 특히 대상 수 상위 2건이 `low_ground_flag`(은행엽 203 · 포도엽 96) — **grounding 얇은 생약**이라 승인 WO 에서 우선 확인이 필요하다.

### 3-5. 단위 테스트 — **51/51 PASS**

`drug-otc-single-group-expansion.test.ts` (**신규 9**) + 기존 42.

신규 9건이 잠그는 것: SPD 전무만 대상 · **기존 canonical 제외(UPDATE 0)** · **canonical 아닌 SPD(candidate·hidden)도 보호** · 그룹 내 중복 제거 · 그룹별 분리 · 이미 승격분 계측 · **그룹 간 중복 검출** · 미지원 정책 거부.

### 3-6. typecheck / build

| 항목 | 결과 |
|---|---|
| `tsc --noEmit` — **내 파일** | ✅ **0 오류** |
| `tsc --noEmit` — 저장소 전체 | **7** (직전 WO 대비 변동 없음, 내 변경 무관) |
| vitest | ✅ **51/51** |
| `tsc -p tsconfig.build.json` | ⚠️ **1 오류 — 내 변경 무관**: 타 세션 `e41c78157`(`wip content-guard`) import 경로. 선행 CHECK §6 참조 |

---

## 4. 완료 기준 대조

| 기준 | 결과 |
|---|---|
| single 66건의 전개→apply 경로 구현 | ✅ §2 (공용 모듈 + 스크립트) |
| dry-run 으로 예상 대상 확정 | ✅ **1,294 INSERT / 0 UPDATE** |
| 실제 apply 는 별도 승인 WO 로 분리 | ✅ 이중 게이트, **미실행** |
| DB write · 승격 · draft 상태 변경 · 기존 canonical 수정 | ✅ **전부 0** |
| 전개 불가 10건 | ✅ **미접촉** (`seed_json.ingredient` 없어 전개 SQL 이 자연 제외) |

---

## 5. 승인 apply WO 에 넘길 것

```bash
# dry-run (현재 상태)
DB_HOST=127.0.0.1 DB_PORT=<proxy> DB_USERNAME=o4o_api DB_PASSWORD=*** DB_NAME=o4o_platform \
  npx tsx src/scripts/drug-otc-single-canonical-promotion.ts

# apply (승인 후에만)
DRUG_OTC_SINGLE_CANONICAL_APPLY_CONFIRM=YES … npx tsx …/drug-otc-single-canonical-promotion.ts --apply
```

| 항목 | 값 |
|---|---|
| 예상 INSERT | **1,294 rows** (60그룹) |
| 예상 UPDATE | **0** |
| status | **`canonical`** 로 하드코딩돼 있다 — 초안이 `needs_review` 이므로 **승인 시 재확인 필요**(그대로 갈지, `needs_review` 로 넣을지) |
| 검토 강화 | `auto` 외 **23그룹** (DR-008) |
| rollback | `source_type='mfds_drug_otc' AND source_ref_id=<candidate_id>` 로 식별 가능 |

---

## 6. 남은 것

| 항목 | 비고 |
|---|---|
| **실제 apply 실행** | **별도 승인 WO** — 본 WO 범위 밖 |
| status 정책 승인 | `needs_review` → `canonical` 여부 (READINESS §9-2) |
| 전개 불가 10건 | ATC 형식 groupKey — 별도 설계 (READINESS §9-3) |
| `masterIds` 포화 19건 | 신규 INSERT 0 — 조치 불요 |
