# CHECK-O4O-COSMETICS-PRODUCTMASTER-STORE-DESCRIPTION-FULL-APPLY-V1

- **WO**: `WO-O4O-COSMETICS-PRODUCTMASTER-STORE-DESCRIPTION-FULL-APPLY-V1`
- **선행**: `WO-O4O-COSMETICS-DESCRIPTION-AUTHORING-POLICY-AND-PRODUCTMASTER-PILOT-V2` (CLOSED/PASS)
- **일자**: 2026-08-11
- **판정**: **PASS** — 잔여 32,174건 전량 적용, postVerify 10항목 구조적 오류 0

## 1. 기준 commit

| 항목 | 값 |
|---|---|
| 작업 시작 HEAD | `293247727` (파일럿 V2 커밋) |
| 최신화 후 base | `80a1a5f6e` (`--ff-only`) |

작업트리 clean 상태에서 착수했다.

## 2. 모집단 산출 (preflight — DB write 0)

| 항목 | 수 |
|---|---|
| 정제된 화장품 확정 모집단 | 32,674 |
| 파일럿 V2 기적용 (DB 실측, `woBatch='cosmetics-pilot-500-v2'`) | 500 |
| 이번 배치 기적용 | 0 |
| 설명서 본문 없음 | 0 |
| **적용 대상** | **32,174** |

BLOCKER 판정 0건 — 파일럿 500 정확 일치 / 대상 수 기대치 일치 / 보호 제품군 baseline 정상 / category(`slug=cosmetics`) 확인 / rollback tag 설계 확정.

## 3. 제외 대상

| 구분 | 수 | 근거 |
|---|---|---|
| 비화장품 (census 정제) | 432 | 선행 WO §8 — 이너뷰티·건기식·영양제 카테고리 / `NON_COSMETIC_SUSPECT` / 이름 일치 비화장품 master |
| 파일럿 기적용 | 500 | DB `woBatch` 태그 실측 제외 (재적용 0) |

## 4. 생성 수 (apply)

배치 태그 `tags->>'woBatch' = 'cosmetics-full-apply-v1'` · 설명서 `source_type = 'o4o_cosmetics_retail'`.

| 항목 | 값 |
|---|---|
| 계획 | 32,174 |
| 신규 ProductMaster | **32,174** (`regulatory_type='COSMETIC'`, category=화장품, `status='ACTIVE'`, `is_mfds_verified=false`) |
| KO STORE canonical 설명서 | **32,174** |
| 기존 master 재사용 | 0 (WO §4-3 — 이름이 같아도 자동 재사용하지 않는다) |
| 기존 canonical 덮어쓰기 | 0 |
| 실패 | 0 |

100건 단위 트랜잭션, 청크 실패 시 단위 재시도로 격리하는 구조 — 청크 실패 0건.
기존 ProductMaster UPDATE 0건 (INSERT 전용).

## 5. 문제 큐 (`full-apply-issue-queue.json`)

적용은 완료했고 후속 보완 저작 대상이다 (WO §4-7 — 결손은 적용 중지 사유가 아니다).

| 항목 | 수 |
|---|---|
| 결손 보유 단위 | 16,870 / 32,174 (52.4%) |

유형별: `NO_OBSERVED_FEATURE` 11,500 · `TYPE_NAME_MISMATCH` 8,079 · `NAME_TOO_SHORT` 173 · `PRODUCT_TYPE_AXIS_NOT_FORM` 66 · `NAME_EQUALS_TYPE` 57 · `PRODUCT_TYPE_UNDETERMINED` 23 · `TYPE_NAME_CONTRADICTION` 15
필드별: `mainFeatures` 11,500 · `usage` 104 · `productType` 38

## 6. postVerify (WO §6) — 10항목

| # | 검증 | 결과 |
|---|---|---|
| 1 | 신규 ProductMaster 수 | 32,174 (예상 일치, 전량 `COSMETIC`) |
| 2 | KO STORE canonical 수 | 32,174 (예상 일치) |
| 3 | ProductMaster 중복 (brand,name) | **0 그룹** (화장품 32,674 전체 기준) |
| 4 | canonical 중복 | 0 |
| 5 | orphan 설명서 / 설명서 없는 master | 0 / 0 |
| 6 | 비화장품 오등록 | 0 · census key 중복 0 · 파일럿 key 재적용 0 |
| 7 | DRUG 177,413 · 건강기능식품 40,948 · QUASI_DRUG 17,148 · MEDICAL_DEVICE 3,826 | drift **0** |
| 8 | rollback tag 미부여 설명서 | 0 |
| 9 | 검색 smoke | 아래 §8 |
| 10 | 결손 문제 큐 산출 | 완료 (§5) |

`regulatory_type='COSMETIC'` 총계 = **32,674** = 정제 모집단 전량.

## 7. rollback

```sql
DELETE FROM shared_product_descriptions
 WHERE master_id IN (SELECT id FROM product_masters WHERE tags->>'woBatch' = 'cosmetics-full-apply-v1');
DELETE FROM product_masters WHERE tags->>'woBatch' = 'cosmetics-full-apply-v1';
```

파일럿분(`cosmetics-pilot-500-v2`)과 태그가 분리돼 있어 배치 단위로 독립 원복된다.

## 8. 검색 smoke

| 축 | 결과 |
|---|---|
| 브랜드+상품명 정확 조회 | 1건 |
| 상품명 단독 조회 | 1건 |
| `regulatory_type='COSMETIC'` master 조회 | 32,674 |
| KO STORE canonical 설명서 조회 | 본문 247자 + summary 정상 |
| 본문 길이 0 설명서 | 0 |

## 9. 관측된 후속 과제 (중지 사유 아님)

- **상품명 정규화 잔여**: 적용분 32,674 중 2,521건(7.7%)이 `[프로모션 문구]` 등 비문자로 시작한다. 소매 리스팅 원문 그대로다. 괄호 불균형(`]` 만 있는 이름) 42건.
- 결손 16,870건 중 `mainFeatures` 부재가 11,500건으로 최다 — 보완 저작 1순위.

## 10. Git

| 항목 | 값 |
|---|---|
| commit | `1f95c7c9d` |
| push | `origin/main` 반영 완료 |
