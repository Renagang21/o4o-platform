# AUDIT-O4O-PRODUCT-AI-ORPHAN-CLEANUP-PREFLIGHT-V1

> **상태: PAUSED_DATA_APPROVAL — DELETE 미실행. 사용자 승인 대기.**

| 항목 | 값 |
|------|-----|
| 상위 WO | `WO-O4O-PRODUCT-AI-CONTENT-GLOBAL-CONTRACT-AND-ACCESS-FIX-V1` §11 |
| 근거 설계 | [DESIGN-O4O-PRODUCT-AI-CONTENT-OWNERSHIP-AND-STORE-DESCRIPTION-CONTRACT-V1](../design/DESIGN-O4O-PRODUCT-AI-CONTENT-OWNERSHIP-AND-STORE-DESCRIPTION-CONTRACT-V1.md) §10 |
| 측정 일자 | 2026-07-29 |
| 측정 채널 | cloud-sql-proxy `127.0.0.1:15433` → `o4o_platform` / user `o4o_api` (**read-only SELECT 만 실행**) |
| 원문 보존 | [`product-ai-orphans-before-cleanup-2026-07-29.json`](product-ai-orphans-before-cleanup-2026-07-29.json) (전체 컬럼 원문 12행) |
| 실행된 DB write | **0건** |

---

## 1. 왜 정리가 필요한가

`product_ai_contents.product_id` / `product_ai_tags.product_id` 는 계약상 `product_masters.id` 전용이지만
현재 **FK 제약이 없다** (두 테이블 모두 PRIMARY KEY 외 제약 0개). 그 결과 존재하지 않는 master ID 를 가진
행이 조용히 적재되어 있다.

WO §12 는 두 테이블에 `FK ... REFERENCES product_masters(id) ON DELETE CASCADE` 를 추가하도록 하는데,
**고아 행이 남아 있으면 FK 생성 자체가 실패**한다. 따라서 FK 이전에 고아 정리가 선행되어야 한다.

WO §11 원칙:
- 고아 데이터 **재연결 금지** (임의 master 에 붙이지 않는다)
- **승인 없는 DELETE 금지**
- FK 적용 전 반드시 정리
- "사용자가 이미 설계에서 삭제 방침을 승인한 것으로 해석하지 않는다"

→ 본 문서는 **삭제를 실행하지 않고**, 정확한 대상·SQL·rollback 을 보고한다.

---

## 2. 대상 확정 — 정확히 12행 (3 + 9)

판정 쿼리 (read-only):

```sql
SELECT c.* FROM product_ai_contents c
LEFT JOIN product_masters pm ON pm.id = c.product_id
WHERE pm.id IS NULL;          -- 3행

SELECT t.* FROM product_ai_tags t
LEFT JOIN product_masters pm ON pm.id = t.product_id
WHERE pm.id IS NULL;          -- 9행
```

WO §19 중지 조건 "고아 건수가 3+9 와 다르면 중지" → **실측 3 + 9 = 12 로 일치**. 중지 사유 아님.

### 2.1 고아 product_id — 3개

| # | product_id | 참조 행 |
|:-:|------------|---------|
| 1 | `fee036a0-29d2-4696-9ad6-f46b9ab3e76a` | contents 3행 |
| 2 | `a8655c54-57a1-476c-a37a-66f694044e3d` | tags 6행 |
| 3 | `05f8fa2f-dfef-4f79-b3e7-7bc4a10dc9bb` | tags 3행 |

**세 ID 모두 `store_local_products` 에도 존재하지 않는다** (조회 결과 0건).
즉 "매장 자체 상품 ID 를 잘못 넣은 것"으로 단정할 근거도 없고, 재연결 대상 자체가 존재하지 않는다.
→ 재연결 금지 원칙과 별개로, **재연결이 물리적으로 불가능**하다.

### 2.2 `product_ai_contents` — 3행 (모두 product_id #1)

| id | content_type | model | created_at |
|----|--------------|-------|-----------|
| `2010e1af-5fc9-4d59-989e-0a540e9afdfa` | `pop_short` | (null) | 2026-05-08T00:12:06.110Z |
| `6f4804e6-dff8-4c8c-9a12-7d2c73ba0899` | `pop_long` | (null) | 2026-05-08T00:12:06.111Z |
| `b60791db-5d29-4e3e-a642-1c8fca632916` | `product_description` | gemini-2.5-flash | 2026-05-07T06:29:06.087Z |

3행 모두 본문이 **동일한 50자 1문장**이다 (md5 `4a71c529021ae1fbf4f2d0bc8d849654`).
내용은 일반 소비재(껌) 한 줄 소개로, 규제 정보·개인정보·매장 고유 저작물이 아니다.

### 2.3 `product_ai_tags` — 9행

| product_id | 태그 | 건수 |
|------------|------|:----:|
| `a8655c54-…044e3d` | 혈당기 / 혈당측정 / 혈당관리 / 당뇨관리 / 의료기기 / 글루코멘토 | 6 |
| `05f8fa2f-…4a10dc9bb` | 액상 / 뼈건강 / 피로회복 | 3 |

9행 전부 `source='ai'`, `model='gemini-2.5-flash'`, 생성 2026-03-29. 수동 입력(`source='manual'`) 0건 →
**사람이 직접 작성한 자산은 대상에 포함되지 않는다.**

### 2.4 소실 영향

| 축 | 영향 |
|----|------|
| 화면 소비 | 두 테이블의 읽기 경로는 모두 `:productId` = master ID 기준. 존재하지 않는 master 는 어떤 화면에서도 조회되지 않음 → **현재 노출 0** |
| `product_masters.tags` 오염 | `syncMasterTags(productId)` 는 해당 master 를 UPDATE 하는데 master 가 없으므로 **오염된 master 없음** |
| SPD seed | `seedFromProductAiContents` 는 master JOIN 기반 → 대상 3행은 seed 후보에 들어간 적 없음 |
| 사용자 저작물 | 0건 (전부 AI 생성 또는 model=null 자동 적재) |

→ 삭제해도 **관측 가능한 기능 손실이 없다.** 그럼에도 승인 없이는 실행하지 않는다.

---

## 3. 승인 시 실행할 DELETE (아직 실행하지 않음)

건수 가드를 포함한 단일 트랜잭션. **12행이 아니면 ROLLBACK.**

```sql
BEGIN;

-- 1) 고아 contents 삭제 → 정확히 3행이어야 한다
WITH del AS (
  DELETE FROM product_ai_contents c
  WHERE NOT EXISTS (SELECT 1 FROM product_masters pm WHERE pm.id = c.product_id)
  RETURNING 1
)
SELECT count(*) AS deleted_contents FROM del;   -- 기대값 3

-- 2) 고아 tags 삭제 → 정확히 9행이어야 한다
WITH del AS (
  DELETE FROM product_ai_tags t
  WHERE NOT EXISTS (SELECT 1 FROM product_masters pm WHERE pm.id = t.product_id)
  RETURNING 1
)
SELECT count(*) AS deleted_tags FROM del;       -- 기대값 9

-- 3) 두 값이 (3, 9) 가 아니면 즉시:
--    ROLLBACK;
-- 일치할 때만:
COMMIT;
```

> ID 를 명시적으로 못박는 형태를 선호할 경우 `WHERE id IN (…)` 로 §2.2/§2.3 의 12개 id 를 직접
> 나열해도 결과는 동일하다. 어느 쪽이든 **DELETE 는 이 두 테이블 밖으로 나가지 않는다** (CASCADE 없음,
> 참조하는 하위 테이블 없음).

### 3.1 실행 후 검증

```sql
SELECT count(*) FROM product_ai_contents c
  LEFT JOIN product_masters pm ON pm.id = c.product_id WHERE pm.id IS NULL;   -- 기대 0
SELECT count(*) FROM product_ai_tags t
  LEFT JOIN product_masters pm ON pm.id = t.product_id WHERE pm.id IS NULL;   -- 기대 0
```

### 3.2 Rollback

| 시점 | 방법 |
|------|------|
| 트랜잭션 중 | `ROLLBACK;` (건수 불일치 시) |
| COMMIT 이후 | [`product-ai-orphans-before-cleanup-2026-07-29.json`](product-ai-orphans-before-cleanup-2026-07-29.json) 의 12행을 **id 포함 원문 그대로** INSERT 복원. 전 컬럼(id/product_id/content_type/content/model/created_at/updated_at, tag/confidence/source/model/created_at)이 보존되어 있어 byte 동등 복원이 가능하다. 단 FK 가 이미 적용된 뒤라면 복원 자체가 FK 에 막히므로, **복원은 FK migration 이전 시점에만 가능**하다. |

→ 따라서 실행 순서는 **① DELETE 승인·실행 → ② 검증 0/0 → ③ FK migration** 이며,
②와 ③ 사이에 되돌릴 기회를 남긴다. WO §12 "하나의 migration 에 DELETE 를 숨겨 넣지 않는다" 와 정렬.

---

## 4. 승인 요청 사항

다음 두 가지에 대해 명시적 승인이 필요하다.

1. **§3 DELETE 12행 실행** (프로덕션 `o4o_platform` — `product_ai_contents` 3행 + `product_ai_tags` 9행)
2. 위 ①이 검증(0/0)을 통과한 뒤 **§12 migration 적용** (FK 2개 + `UNIQUE(product_id, content_type)` 1개)

승인 전까지 두 작업 모두 **PAUSED_DATA_APPROVAL** 상태로 유지한다.

> 참고: UNIQUE 제약 대상인 `(product_id, content_type)` 중복은 **현재 0건**이므로 UNIQUE 추가 자체는
> 데이터 변경 없이 통과한다 (WO §19 "UNIQUE 가 중복 발견" 중지 조건 해당 없음).
