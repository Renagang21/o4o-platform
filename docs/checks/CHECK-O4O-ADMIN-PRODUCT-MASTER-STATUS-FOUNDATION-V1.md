# CHECK-O4O-ADMIN-PRODUCT-MASTER-STATUS-FOUNDATION-V1

> **WO:** WO-O4O-ADMIN-PRODUCT-MASTER-STATUS-FOUNDATION-V1
> **선행 IR:** IR-O4O-ADMIN-PRODUCT-MANAGEMENT-SIMPLE-OPERATIONS-AUDIT-V1 (commit `9a314f4b4`)
> **선행 콘솔 정리:** WO-...-CONSOLE-SIMPLIFICATION-V1 (commit `58e12778d`)
> **작업일:** 2026-07-10
> **성격:** 상태 기반(스키마) 추가. 엔티티 + migration 만. 상태 변경 API·화면·배지·필터·감사로그 없음.

---

## 1. 작업 목적

ProductMaster 에 O4O 상품 DB 이용 상태를 나타내는 **가장 단순한 상태 기반**을 만든다. 관리자 화면 버튼을 붙이는 단계가 아니라, 후속 STATUS-ACTIONS WO 가 사용할 컬럼만 신설한다.

---

## 2. 변경 내용

### (1) ProductMaster 엔티티
`apps/api-server/src/modules/neture/entities/ProductMaster.entity.ts`

```ts
@Column({ name: 'status', type: 'varchar', length: 32, default: 'ACTIVE' })
status: 'ACTIVE' | 'SUSPENDED' | 'ARCHIVED';
```
- `product_data_curated_at` 컬럼 정의 뒤, `representative_product_id` 앞에 배치.
- varchar + application-level union (DB enum 아님) — 모든 sibling 엔티티 관례 동일.

### (2) Migration
`apps/api-server/src/database/migrations/20261227000000-AddStatusToProductMasters.ts` (신규)

```sql
-- up
ALTER TABLE product_masters
  ADD COLUMN IF NOT EXISTS status VARCHAR(32) NOT NULL DEFAULT 'ACTIVE';
-- down
ALTER TABLE product_masters
  DROP COLUMN IF EXISTS status;
```
- 타임스탬프 `20261227000000` = 직전 `20261226000000` + 1 순차(카운터, 실제 날짜 아님).
- additive · 멱등(IF NOT EXISTS) · DB DEFAULT 로 기존 행 전부 ACTIVE(별도 backfill 스크립트 없음).

---

## 3. 허용값 / 기본값

| 상태 | 의미 |
|------|------|
| `ACTIVE` | O4O 상품 DB 정상 검색·선택 가능 (기본값) |
| `SUSPENDED` | 판매 금지·회수·안전/법적 제한 등으로 이용 대상 제외 |
| `ARCHIVED` | 중복·오류·테스트·대체 등 데이터 정리 목적 제외 |

- 기본값 `ACTIVE`. 기존 데이터 전부 DB DEFAULT 로 ACTIVE.
- 신규 상품 생성 시 애플리케이션 별도 처리 없이 DB 기본값 사용(생성 경로 코드 무변경).

---

## 4. 검증 결과

| 검증 | 결과 |
|------|------|
| api-server type-check (엔티티+migration) | **PASS** — 내 변경 관련 에러 0건 |
| 사전 존재 에러 확인 | `git stash`(엔티티 제외) 후 type-check → 남는 에러는 `src/scripts/drug-otc-*` 뿐(`grep -v drug-otc` 결과 없음). 즉 **drug-otc 스크립트 중복선언 에러는 선행 존재·무관**, 내 변경은 신규 에러 0 |
| migration 파일명 규칙 | 표준 `YYYYMMDDHHMMSS-Name.ts` + 클래스명 timestamp 일치 |

> migration 실행은 main 배포 → CI/CD 자동 실행 원칙(로컬/프로덕션 직접 실행 안 함). 배포 후 `product_masters.status` 컬럼 존재·기본값 ACTIVE 를 read-only SELECT 로 확인 가능.

---

## 5. 이번 WO에서 하지 않은 것 (범위 고정)

- ❌ 상태 변경 API (PATCH status)
- ❌ 관리자 상태 배지 · 상태 필터
- ❌ 보관 · 이용 중단 · 정상 복원 버튼
- ❌ 참여자 검색 ACTIVE-only 필터 (`searchProductMasters` 무변경)
- ❌ 공지 연결
- ❌ 상태 변경 사유 · actor · 감사로그
- ❌ `product_data_status` 수정·재사용 (의료기기 정제 마커, 별개 축)
- ❌ 대량 backfill · 프로덕션 데이터 수정 스크립트
- ❌ 참여자/타 서비스 데이터 변경

→ 상태 변경 API·사유·감사로그는 실제 상태 변경이 생기는 후속 `STATUS-ACTIONS-V1`에서 함께 구현.

---

## 6. 변경 파일

```text
apps/api-server/src/modules/neture/entities/ProductMaster.entity.ts   (컬럼 1개 추가)
apps/api-server/src/database/migrations/20261227000000-AddStatusToProductMasters.ts (신규)
docs/checks/CHECK-O4O-ADMIN-PRODUCT-MASTER-STATUS-FOUNDATION-V1.md     (신규)
```

- 코드 변경: entity 1 + migration 1 로 한정.
- 백엔드 API 변경: 0 (라우트·서비스·컨트롤러 무변경)
- 프론트 변경: 0
- 프로덕션 데이터 직접 변경: 0 (migration 은 CI/CD 자동 실행)
- 타 세션 WIP(`pnpm-lock.yaml`) 미포함 — path-specific 커밋.

---

## 7. 다음 작업

**3순위** `WO-O4O-ADMIN-PRODUCT-MASTER-STATUS-ACTIONS-V1`:
- 단건 보관 / 이용 중단 / 정상 복원 API (상태 변경 사유·actor·감사로그 포함)
- 관리자 상태 배지 · 상태 필터(전체/정상/이용중단/보관)
- 참여자용 ProductMaster 검색 ACTIVE-only 기본 필터 (`searchProductMasters` `statuses` 파라미터)
