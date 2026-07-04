# CHECK-O4O-DRUG-REPRESENTATIVE-PRODUCT-GROUPING-DRYRUN-V1

> **작업명**: WO-O4O-DRUG-REPRESENTATIVE-PRODUCT-GROUPING-V1 (1단계 — read-only 조사·dry-run)
> **일자**: 2026-07-04 · **성격**: read-only 조사 CHECK — 코드/DB/migration/import/git write 0. 산출물 = 본 문서 1개. **apply 미실행.**
> **선행**: `CHECK-O4O-DRUG-SEED-CANDIDATE-APPLY-RUNBOOK-V1 §12`(ProductMaster 230,841), `CHECK-O4O-EASY-DRUG-INFO-SHARED-DESCRIPTION-DERIVATION-DRYRUN-V1`(설명 파생 완료), `IR-O4O-STANDARD-PRODUCT-REPRESENTATIVE-GROUPING-AND-STORE-CONTENT-DIRECTION-V1`, `CHECK-O4O-PRODUCT-MASTER-REPRESENTATIVE-LINK-FOUNDATION-V1`, `IR-O4O-PUBLIC-PRODUCT-SEED-STANDARD-PROCESS-V1`.
> **목적**: `representative_products` 를 MFDS_CODE(품목기준코드) 기준으로 생성하기 위한 **컬럼 매핑 / 그룹 규모 / display_name 중복 / 다제조사 review flag** 4개 정책을 **운영 실측**으로 고정. **ProductMaster/Identifier/Description/Image 미생성.**

---

## 1. 한 줄 결론

**품목기준코드(MFDS_CODE) 64,672개 → representative_products 64,672건 생성, product_masters 230,841건의 representative_product_id 연결. 그룹키는 `metadata.sourceIdentifiers.mfdsCode`(전용 컬럼 부재). display_name 은 DB UNIQUE 제약이 없어 충돌 에러는 없으며 실측 중복은 144그룹(0.22%)에 불과. 다제조사 5,101그룹(7.9%)은 `metadata.reviewFlags.multiManufacturer=true` + manufacturer_name NULL.**

---

## 2. 스키마 실측 (migration `20261202000000` + entity)

| 컬럼 | 타입 | 제약 | 매핑 정책 |
|---|---|---|---|
| `id` | uuid | PK default gen_random_uuid | 앱/DB 생성 |
| `display_name` | varchar(255) | **NOT NULL** (UNIQUE **아님**) | 그룹 대표 표시명 (§4) |
| `manufacturer_name` | varchar(255) | nullable | **단일 제조사 그룹만 채움 / 다제조사 NULL** (자동 단일화 금지) |
| `thumbnail_image_id` | uuid | nullable | **NULL (V1 보류 — 이미지 WO 후속)** |
| `metadata` | jsonb | nullable | **그룹키·review flag 저장소** (§5) |
| `created_at`/`updated_at` | timestamp | NOT NULL default NOW | 자동 |

**연결**: `product_masters.representative_product_id` uuid nullable FK → `representative_products(id)` ON DELETE SET NULL. index(비-UNIQUE). 현재 전부 NULL.

**핵심 사실**:
- ⚠️ **`display_name` 에 UNIQUE 제약 없음** (migration line 17 "UNIQUE 제약 없음" 명시). entity 주석의 "유일 필수" 는 **DB 강제 아님** → 대량 생성 시 충돌 **에러 없음**. 중복은 데이터 품질/UX 이슈로만 남는다.
- **`mfds_code`/`product_group` 전용 컬럼 부재** → 그룹키는 `metadata` 에 담는다.
- master:representative = N:1 (master 는 대표 1개만). representative:master = 1:N.

---

## 3. 그룹 규모 (운영 실측 — read-only)

> 축: `product_identifiers(identifier_type='MFDS_CODE')` → `product_masters`. (전 master 가 MFDS_CODE 보유)

| 지표 | 값 |
|---|---:|
| representative_products 현재 | **0** (masters_linked 0 — 클린 시작) |
| distinct 품목기준코드 (생성 후보) | **64,672** |
| ├ single-master 그룹 | 3,559 |
| └ multi-master 그룹 | **61,113** |
| 다제조사(≥2) 그룹 | **5,101 (7.9%)** |
| multi-name(멤버 이름 ≥2종) 그룹 | 5,298 |
| 커버 master 총수 | **230,841** (전량) |

**생성 수 정책 (결정 필요 — §7 게이트 B):**
- **(A) 전 품목 64,672 생성** (권장) — 모든 품목이 대표 노드를 가져 품목 단위 콘텐츠·검색 축이 완결. single-master 3,559 도 1:1 대표 앵커 확보.
- (B) multi-master 61,113 만 생성 — 그룹핑 가치 있는 것만. single-master 3,559 는 representative_product_id NULL 유지.

→ 권장 **(A)** : SharedProductDescription(master 단위)·향후 이미지·검색이 품목 축에서 균일하게 걸리려면 전 품목 앵커가 유리. 링크 UPDATE 는 230,841(A) vs 227,282(B) 로 큰 차이 없음.

---

## 4. display_name 정책 (충돌 실측)

> 후보 = 그룹 멤버 이름의 결정적 대표값(실측은 `min(name)` 기준).

| 지표 | 값 |
|---|---:|
| 총 그룹(=display_name) | 64,672 |
| distinct display_name | 64,599 |
| **충돌 이름 수** | **71** |
| **충돌 그룹 수** | **144 (0.22%)** |
| 한 이름 최대 공유 그룹 | 4 |
| name 결측 master | **0** (display_name NOT NULL 항상 확보) |
| name+manufacturer 로도 잔여 충돌 그룹 | 47 |

**결론**:
- **display_name = 그룹 대표명.** DB UNIQUE 제약이 없으므로 **중복 허용(생성 에러 없음)**.
- 충돌 144그룹(0.22%)은 **disambiguation 정책**으로 처리(택1, §7 결정):
  - (i) 그대로 중복 허용(제약 없음) + `metadata.reviewFlags.duplicateDisplayName=true` 로 큐레이션 표식만.
  - (ii) 충돌분에 한해 접미 부여: `"{name} ({mfdsCode})"` 또는 `"{name} / {manufacturer}"`.
  - → 권장 **(ii) mfdsCode 접미**(제조사는 name+manuf 잔여충돌 47 존재 + 다제조사 NULL 정책과 상충). 접미는 **충돌 144그룹에만** 적용, 나머지 64,528은 원명 유지.
- 대표명 선택 규칙(멤버 이름 5,298그룹이 2종 이상): V1 은 **결정적 규칙**(`min(name)` 또는 최단명) + `metadata.reviewFlags.multiName=true` 로 후속 큐레이션 위임. 포장 접미 정규화(예: "…10정"/"…30정" 공통 base 추출)는 **fuzzy → V1 보류**.

---

## 5. metadata 매핑 정책

```json
{
  "groupKey": "MFDS_CODE:199704510",
  "sourceIdentifiers": { "mfdsCode": "199704510" },
  "memberMasterCount": 487,
  "reviewFlags": {
    "multiManufacturer": false,
    "multiName": false,
    "duplicateDisplayName": false
  },
  "source": "WO-O4O-DRUG-REPRESENTATIVE-PRODUCT-GROUPING-V1"
}
```

- **그룹키 = `sourceIdentifiers.mfdsCode`**(전용 컬럼 부재 → metadata). 멱등 재실행·역추적 키.
- `reviewFlags.multiManufacturer` = 그룹 distinct manufacturer_name ≥ 2 (5,101). true 면 `manufacturer_name` **NULL** 유지.
- `reviewFlags.multiName` = 멤버 이름 ≥ 2종 (5,298). 대표명 큐레이션 대상.
- `reviewFlags.duplicateDisplayName` = §4 충돌 144그룹.
- `memberMasterCount` = 검증·모니터링용(합계 = 230,841).

---

## 6. 예상 생성/변경 (dry-run 산출 — apply 시)

| 대상 | 연산 | 예상 수 (정책 A) |
|---|---|---:|
| `representative_products` | INSERT | **64,672** |
| `product_masters.representative_product_id` | UPDATE | **230,841** |
| 다제조사 flag(true) | — | 5,101 |
| multi-name flag(true) | — | 5,298 |
| duplicateDisplayName flag(true) | — | 144 |
| manufacturer_name 채움(단일 제조사 그룹) | — | 59,571 (64,672 − 5,101) |
| ProductMaster/Identifier/Description/Image 생성 | — | **0** |

---

## 7. 게이트 계획 + 미결 결정

| 게이트 | 내용 | write | 상태 |
|---|---|---|---|
| **Gate 0** (본 문서) | 컬럼 매핑·그룹 규모·중복·flag 실측·정책 고정 | 0 | ✅ 완료 |
| **Gate A** (구현+dry-run) | 그룹핑 서비스+Job 구현(raw batch) → dry-run 수치 확정 | 0 | ⏸ 승인 후 |
| **Gate B** (apply) | representative_products 64,672 INSERT + product_masters 230,841 UPDATE(link) | 대량 | ⏸ **별도 승인 + 사전 백업** |

**확정 결정 (사용자, 2026-07-04):**
1. **생성 범위**: **(A) 전 품목 64,672** — single-master 3,559 포함, 품목 축 완결.
2. **display_name 충돌 처리**: **충돌 144그룹에만 `"{name} ({mfdsCode})"` 접미** + `reviewFlags.duplicateDisplayName=true`. 나머지 64,528 원명.
3. **대표명 선택 규칙**: **`min(name)` 결정적** + multi-name 5,298 은 `reviewFlags.multiName=true`.
4. **apply 채널**: **Cloud Run Job 신설** (drug-seed/easy-drug 패턴 미러). 사전 백업 + 이중가드 + batch.

---

## 8. 리스크 / 주의

- **product_masters 230,841 UPDATE** = Core SSOT 테이블의 additive 컬럼(representative_product_id) 갱신. 구조 변경 아님(FK 는 migration 기존재). 그래도 대량 write → batch + 사전 백업 + 게이트 B 승인 필수.
- **멱등성**: 재실행 시 `metadata->sourceIdentifiers->>'mfdsCode'` 로 기존 representative 조회 → 있으면 skip/갱신, 없으면 create. link UPDATE 는 대상 master 의 현재 representative_product_id 확인 후 갱신.
- **다제조사 자동 단일화 금지**: 5,101 그룹 manufacturer_name NULL (entity 주석 계약). 대표 제조사 확정은 큐레이션 후속.
- **경계(CLAUDE.md §7)**: representative_products 는 Broadcast/Commerce 경계 밖(콘텐츠 그룹핑 계층). Commerce(order/listing) 미참조 → 위반 아님.
- **thumbnail_image_id NULL 유지**: 이미지 WO(후속) 전까지 대표 썸네일 미지정. UI fallback = 멤버 primary ProductImage.

---

## 9. 준수 확인 (본 문서)

| 항목 | 결과 |
|---|---|
| apply 실행 / DB write | **0** |
| representative_products 생성 | 0 (실측만) |
| ProductMaster/Identifier/Description/Image 생성·변경 | 0 |
| migration / Cloud Run Job 생성 | 0 |
| raw·secret 기록 | 0 (DB 검증은 authorized-network 임시 등록 후 원복, 값 미기록) |
| 병렬 세션(의약외품/의료기기/건기식) 파일 수정 | 0 |

---

**작성**: O4O Platform 조사 CHECK · 2026-07-04 · 1단계 read-only(§1~§9) → Gate A/B apply 완료(§10~§11). serviceKey·비밀 미출력.

---

## 10. Gate A 실행 로그 (2026-07-04) — 구현 + dry-run

> 채널: Cloud Run Job `o4o-drug-representative-grouping`. 서비스 `drug-master-representative-grouping.service.ts`(SQL 집계 + 전역 display_name 충돌판정 + batch INSERT + set-based link UPDATE) + Job entry(commit `9b4d0cbe9`). raw ds.query(entities:[]).

| 항목 | 값 |
|---|---|
| dry-run (exec 97xh9, 7s) | total 64,672 / new 64,672 / single 3,559 / multi 61,113 / multiManuf 5,101 / multiName 5,298 / dupName 144 / manufacturerFilled 59,571 / masterLinksExpected 230,841 / createdReps(would) 64,672 / errored 0 |

**→ §3~§6 실측과 완전 일치.** apply 이중가드로 write 0.

---

## 11. Gate B 실행 로그 (2026-07-04) — **apply 완료 (WO 종결)**

| 항목 | 값 |
|---|---|
| 사전 백업 | ✅ id **1783150914005** (SUCCESSFUL, `pre-drug-representative-grouping-20260704`) |
| APPLY 이중가드 | `DRUG_REP_APPLY=true` + `DRUG_IMPORT_ALLOW_APPLY=I_UNDERSTAND` |
| **apply (exec bwvx7, 314s)** | **createdReps 64,672 / linkedMasters 230,841 / errored 0** |

**검증 SQL (read-only, 사용자 기준):**

| 기준 | 결과 | 판정 |
|---|---:|:---:|
| representative_products created | **64,672** | ✅ |
| linked product_masters | **230,841** | ✅ (HIRA master 전량) |
| representative_product_id NULL | 2 | ✅ (비의약품·E2E 테스트 master 2건, MFDS_CODE 0 → 대상 외. HIRA 230,841 전량 링크) |
| distinct mfdsCode 그룹 | **64,672** | ✅ |
| display_name 잔여 중복 | **0** | ✅ (충돌 144그룹 `{name} (mfdsCode)` 접미 적용) |
| duplicateDisplayName flag 그룹 | **144** | ✅ |
| multiManufacturer / multiName flag | 5,101 / 5,298 | ✅ |
| manufacturer_name 채움(단일 제조사) | 59,571 | ✅ |
| ProductMaster(HIRA) / Identifier / Description / Image 추가 | 230,841 / 703,483 / 19,431 / 변동 없음 | ✅ 미생성 |

> 미링크 2건: `[E2E_TEST] Neture B2B 테스트 상품`, `미네락 600 [1000ml*10병]` — tags `[]`, MFDS_CODE identifier 0개. 본 Job(MFDS_CODE 축)의 대상이 아니며 병렬 작업 산물. Job 은 master 를 생성/변경(link 외)하지 않음.

**→ Gate B 완료. WO 종결.** 의약품 상품 구조가 **SKU(ProductMaster) → 대표상품(RepresentativeProduct)** 계층까지 완성됨. 그룹키 `metadata.sourceIdentifiers.mfdsCode`, 멱등 재실행 가능(기존 mfds skip, link NULL만).

**후속(별도 WO)**: (1) e약은요 이미지 GCS 사본 → ProductImage → 대표 `thumbnail_image_id` 지정. (2) 다제조사 5,101 / multiName 5,298 / dupName 144 그룹 운영자 큐레이션(대표명·제조사 확정). (3) SharedProductDescription canonical 승격.
