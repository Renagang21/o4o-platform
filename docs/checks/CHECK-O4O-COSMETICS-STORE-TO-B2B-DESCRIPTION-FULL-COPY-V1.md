# CHECK-O4O-COSMETICS-STORE-TO-B2B-DESCRIPTION-FULL-COPY-V1

확정된 화장품 **KO STORE canonical 32,674건**을 **KO B2B canonical** 초기 기준본으로 1회 복사했다.
B2B 문장을 새로 생성하거나 재작성하지 않았다. 복사 후 두 canonical 은 독립이며 자동 동기화가 없다.

| 항목 | 값 |
|------|------|
| WO | `WO-O4O-COSMETICS-STORE-TO-B2B-DESCRIPTION-FULL-COPY-V1` |
| 작업공간 | **worktree** `C:\tmp\o4o-cosmetics-store-to-b2b` (기준 repo 미접촉) |
| 브랜치 | `work/cosmetics-store-to-b2b-v1` (base `origin/main` = `4058e83ca`) |
| 판정 | **PASS** — 계획 32,674 / 적용 32,674 / 위반 0 |
| 산출물 | [`tmp/cosmetics-store-to-b2b-copy/`](../../tmp/cosmetics-store-to-b2b-copy/README.md) |
| 스크립트 | `apps/api-server/src/scripts/cosmetics-store-to-b2b-copy/` |

---

## 1. 구조 감사 (WO §2) — 새 schema 없음

`shared_product_descriptions` 는 이미 **B2B 유형을 가지고 있다.** 새 description type 을 만들지 않았고 schema·migration 변경도 없다.

| 확인 | 실측 |
|------|------|
| `description_type` union | `'B2B' \| 'B2C' \| 'STORE' \| 'SUPPLIER_STORE'` (varchar, 기본 `STORE`) — `SharedProductDescription.entity.ts` |
| canonical 유일성 | `uniq_shared_product_descriptions_canonical_per_master_type_lang` — `(master_id, description_type, COALESCE(language,'ko'))` partial unique, `status='canonical' AND deleted_at IS NULL` |
| 기존 B2B 소비처 | `product-master-description.controller.ts` — `GET/POST /api/v1/admin/o4o-product-db/masters/:id/store-descriptions?descriptionType=B2B` (`WO-O4O-ADMIN-PRODUCT-DESCRIPTION-TYPE-GENERIC-API-V1`) |
| 기존 B2B 데이터 | KO 28 / EN 15 / ZH 13, 전부 `source_type='manual'`, **COSMETIC 은 0건** |
| provenance 관례 | SPD 에는 metadata/tags 컬럼이 없다. 기존 dedup·추적 키는 `(master_id, source_type, source_ref_id)` — `shared-product-description.service.ts` |

**중지 조건 해당 없음** — B2B type 존재, 독립 배치 가능, 기존 B2B 충돌 0.

## 2. 모집단 (WO §3) — 현재 DB 실측

| 항목 | 실측 | 기대(참고) |
|------|---:|---:|
| COSMETIC ProductMaster | 32,674 | 32,674 |
| KO STORE canonical | 32,674 | 32,674 |
| KO STORE canonical 보유 master | 32,674 | — |
| KO B2B canonical 기존 보유 (COSMETIC) | **0** | — |
| KO B2B canonical 기존 보유 (전체) | 28 | — |
| STORE canonical 없는 COSMETIC master | 0 | — |
| 중복 STORE canonical | 0 | — |
| orphan 설명서 | 0 | — |
| STORE 본문 0자 | 0 | — |

STORE 원본은 전량 `source_type='o4o_cosmetics_retail'`, summary 보유, `created_by`·`created_by_supplier_id`·`quality_score` 는 전량 null 이다.

## 3. dry-run (WO §8)

| 판정 | 건수 |
|------|---:|
| COPY | **32,674** |
| EXISTING_B2B (보존) | 0 |
| CHECK | 0 |
| BLOCKER | 0 |

행별 계획 기록: `masterId` / `storeDescriptionId` / `existingB2bDescriptionId` / `copyAction` / `contentHash`(md5) / `summaryHash` / `contentLen`.
본문 자체는 계획 파일에 담지 않고 md5 지문만 남겼다(적용 후 대조용).

## 4. 사전 검증 (WO §9) — 위반 0

계획 파일을 신뢰하지 않고 계획의 id 를 DB 에서 다시 읽어 재확인했다.

| 검증 | 결과 |
|------|:---:|
| 계획 `storeDescriptionId` / `masterId` 유일 | PASS |
| 계획 행이 지금도 조건 만족 (32,674) | PASS |
| dry-run 이후 STORE 본문 지문 drift | 0 |
| STORE canonical duplicate | 0 |
| B2B canonical collision | 0 |
| 본문 0자 | 0 |
| master orphan | 0 |
| canonical partial unique index 실재 | PASS |
| rollback 키 충돌 (`B2B` × `o4o_cosmetics_retail` 기존 행) | 0 |

## 5. 복사 계약 (WO §5·§6)

적용은 **`INSERT ... SELECT` 1문**이다. 본문을 클라이언트로 왕복시키지 않으므로 content 가 byte 단위로 동일함이 구조적으로 보장된다.

| B2B 새 행 컬럼 | 값 |
|------|------|
| `id` | 신규 uuid (STORE PK 복제 아님) |
| `content` / `summary` / `quality_score` | STORE 값 그대로 |
| `source_type` | STORE 값 보존 (`o4o_cosmetics_retail`) — 본문 출처 유형은 바뀌지 않는다 |
| `description_type` | `B2B` |
| `source_ref_id` | **원본 STORE 설명서 id** = `copiedFromDescriptionId` (기존 `source_ref_id` 관례 재사용) |
| `status` / `language` | `canonical` / `ko` |
| `created_by` / `created_by_supplier_id` | STORE 값 보존 (이번 모집단은 전량 null) |
| `created_at` / `updated_at` | `now()` |

**출처 기록에 대한 한계 명시** — SPD 에는 `metadata`/`tags` jsonb 컬럼이 없다. WO §6 이 예시한 `copiedFromType` / `copyBatch` 를 담을 자리가 없어 **새 컬럼이나 새 provenance 시스템을 만들지 않고** 기존 계약만으로 배치를 식별했다.

- `copiedFromDescriptionId` → `source_ref_id`
- `copiedFromType = STORE` → `source_ref_id` 가 가리키는 행의 `description_type` (전량 STORE)
- `copyBatch` → 저장 컬럼 대신 **신규 id 매니페스트 32,674개**(`apply-result.json.gz`) + 조회 가능한 조합 `description_type='B2B' AND source_type='o4o_cosmetics_retail'` (적용 전 이 조합 0건)

`product_masters.tags` 에 배치 표식을 넣는 방식은 WO §10 의 ProductMaster UPDATE 금지에 걸리므로 쓰지 않았다.

## 6. 독립성 (WO §7)

값 복사이며 참조 공유가 아니다.

- 별도 row·별도 PK. 본문은 각 행의 `content` 컬럼에 각각 저장된다. shared object / DB reference 없음.
- `source_ref_id` 는 **추적 포인터일 뿐** 조회 시 본문을 STORE 에서 끌어오지 않는다(소비 API 는 자기 행의 `content` 를 반환).
- write 경로도 분리돼 있다 — `setCanonical()` 의 기존 canonical 강등은 `master_id + description_type + COALESCE(language,'ko')` 로 한정된다. STORE-ko 저장이 B2B-ko 를 건드리지 않고 그 반대도 같다.

## 7. 적용 (WO §10)

단일 트랜잭션. `RETURNING` 결과가 계획 수와 다르거나 계획 밖 원본이 섞이면 즉시 ROLLBACK 하도록 걸어 두었다(실제 발생 0).

| 항목 | 값 |
|------|---:|
| INSERT (KO B2B canonical) | **32,674** |
| ProductMaster UPDATE | 0 |
| STORE canonical UPDATE | 0 |
| 기존 B2B UPDATE | 0 |
| 다른 language / 다른 regulatory_type 생성 | 0 |
| 총 DB write | **32,674 (INSERT 전용)** |

## 8. 독립 검증 · postVerify (WO §11·§12) — PASS

적용/생성 코드를 import 하지 않는 별도 스크립트가 **적용 전 스냅샷과 지금 DB 를 직접 대조**했다.

| 지표 | before | after |
|------|---:|---:|
| COSMETIC ProductMaster | 32,674 | 32,674 |
| KO STORE canonical (COSMETIC) | 32,674 | 32,674 |
| KO B2B canonical (COSMETIC) | 0 | **32,674** |
| KO B2B canonical (전체) | 28 | 32,702 |

| 검증 | 결과 |
|------|:---:|
| COPY 예정 == 실제 B2B 생성 | 32,674 == 32,674 |
| 신규 B2B 본문 == 복사 시점 STORE 본문 (md5 전량) | 32,674 / 32,674 |
| 신규 B2B summary == STORE summary (md5 전량) | 32,674 / 32,674 |
| STORE 원본 불변 (md5·summary·status·type·`updated_at` 전량) | 32,674 / 32,674 불변 |
| 기존 B2B 보존 | 28 (전량 보존) |
| ProductMaster 변경 | 0 |
| canonicalDup (전 테이블) | 0 |
| orphan | 0 |
| 신규 B2B 본문 0자 | 0 |
| 화장품 밖 / 다른 언어 신규 행 | 0 / 0 |
| 다른 제품군 master drift (DRUG 177,413 · 건기식 40,948 · QUASI_DRUG 17,148 · MEDICAL_DEVICE 3,826 · GENERAL 11 · 일반 15) | 0 |

표본 5건 모두 `STORE id ≠ B2B id` · `descriptionType 다름` · `본문 동일` 을 만족했다.

## 9. 소비 smoke (WO §13) — PASS

배포된 프로덕션 API 에 **GET 만** 보냈다 (DB write 0).
`GET /api/v1/admin/o4o-product-db/masters/:id/store-descriptions?descriptionType=STORE|B2B`

| master | STORE | B2B | 판정 |
|------|:---:|:---:|:---:|
| `00043f5d…` | 200 · `4039cbfb…` · 265자 | 200 · `9c1709e5…` · 265자 | PASS |
| `0008f09f…` | 200 · `04d5bc16…` · 238자 | 200 · `cac9d239…` · 238자 | PASS |
| `00093df8…` | 200 · `9530eb32…` · 193자 | 200 · `ec661ea6…` · 193자 | PASS |

같은 제품에서 STORE 와 B2B 를 각각 정상 조회할 수 있고, 반환된 id 가 DB 매니페스트와 일치한다.
**새 B2B UI 는 만들지 않았다** (WO §13).

## 10. rollback (WO §14)

`tmp/cosmetics-store-to-b2b-copy/rollback.sql.gz` — 이번 배치 신규 B2B 만 삭제한다. 안전판 3중:

1. 신규 id 매니페스트 32,674개에 있는 id 만
2. `description_type='B2B' AND source_type='o4o_cosmetics_retail'` (적용 전 0건)
3. `updated_at = created_at` — 복사 후 편집된 B2B 는 삭제 대상에서 제외

STORE / ProductMaster 에는 rollback write 가 발생하지 않는다.

## 11. 남은 사항 (이번 범위 밖)

1. **EN / ZH / JA B2B 는 만들지 않았다.** 이번 WO 범위는 KO 만이다.
2. **B2B 전용 UI·소비 화면 없음.** 현재 B2B 조회 경로는 관리자 설명서 API 뿐이며, 매장·공급자 화면 노출은 별도 WO 다.
3. **`source_ref_id` 의 의미 중첩** — 이번 B2B 행에서는 "복사 원본 STORE id" 로 쓰였다. 다른 경로(공급자 offer 추적)와 같은 컬럼을 쓰므로, 이후 소비 코드가 `source_ref_id` 를 offer 로 단정하면 안 된다. `description_type='B2B'` 조합으로 구분한다.

## 12. WO 제약 준수

| 제약 | 결과 |
|------|------|
| §1 worktree 에서만 작업, 기준 repo 미접촉 | 준수 |
| §2 새 description type 추측 생성 금지 | 준수 — 기존 `B2B` 재사용, schema 변경 0 |
| §3 과거 숫자를 기대값으로만 사용 | 준수 — 전 지표 재실측 |
| §4 기존 B2B overwrite 금지 | 준수 — 대상 0건, 전체 28건 보존 |
| §5 B2B 문장 생성·재작성 금지 | 준수 — DB 내부 복사, 본문 md5 전량 동일 |
| §6 새 provenance 시스템 금지 | 준수 — `source_ref_id` 기존 관례 + id 매니페스트 (§5 한계 명시) |
| §7 참조 공유 금지 | 준수 — 값 복사, write 경로 타입·언어별 분리 |
| §10 INSERT 외 write 금지 | 준수 — UPDATE/DELETE 0 |
| §13 새 B2B UI 금지 | 준수 — GET smoke 만 |
| §14 배치 단독 rollback | 준수 — 매니페스트 + 안전판 3중 |
| main 직접 작업 금지 | 준수 — worktree 브랜치 작업·push |

## 13. 문서 정합

문서 정합: 발견 0건 / SUPERSEDED 표기 0건 / 링크 수정 0건 / 별도 WO 제안 0건
