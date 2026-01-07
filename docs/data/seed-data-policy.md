# Seed Data Policy

> **Version**: 1.0
> **Status**: Active
> **Created**: 2025-01-06

---

## 1. Seed 데이터의 공식 정의

| 항목 | 정의 |
|------|------|
| **Seed 데이터** | 초기 서비스 가시성 + 데모용 데이터 |
| **성격** | 실데이터 아님 (언제든 삭제 가능) |
| **식별** | `seed0000-` prefix (UUID 형식) |
| **관리 주체** | 플랫폼 운영자 |

### 1.1 Seed 데이터의 목적

- 신규 서비스 론칭 시 **빈 화면 방지**
- 개발/테스트 환경에서 **UI 검증용**
- 데모/프레젠테이션 용도

### 1.2 Seed 데이터 ID 규칙

모든 Seed 데이터는 다음 패턴의 UUID를 사용:

```
seed0000-XXXX-XXXX-XXXX-XXXXXXXXXXXX
```

예시:
- `seed0000-0001-0001-0001-000000000001`
- `seed0000-0002-0001-0001-000000000001`

---

## 2. Seed → 실데이터 전환 기준

아래 **2가지 조건 중 하나라도 충족되면** Seed 데이터는 삭제 대상으로 전환된다.

### 2.1 전환 트리거

| # | 트리거 | 설명 |
|---|--------|------|
| 1 | **운영자 최초 입력** | 운영자가 관리자 화면/API를 통해 실데이터를 최초 입력한 시점 |
| 2 | **사용자 생성 시작** | 외부(B2C) 사용자가 해당 데이터 타입을 생성하기 시작한 시점 |

### 2.2 전환 후 조치

전환 트리거 발생 시:

1. Seed 데이터는 **더 이상 노출 대상 아님**
2. `delete-seed-data.sql` 실행 권장
3. Empty State UI가 정상 작동 확인

---

## 3. Seed 데이터 삭제 방법

### 3.1 SQL 스크립트 실행

```bash
psql -d your_database -f apps/api-server/scripts/delete-seed-data.sql
```

### 3.2 삭제 대상 테이블

| 테이블 | 설명 |
|--------|------|
| `cosmetics_stores` | K-Cosmetics 매장 |
| `glycopharm_products` | Glycopharm 교육 상품 |
| `yaksa_posts` | 약사회 포럼 게시글 |
| `yaksa_categories` | 약사회 포럼 카테고리 |

### 3.3 삭제 확인

삭제 후 잔여 Seed 데이터 확인:

```sql
SELECT 'cosmetics_stores' as table_name, COUNT(*) as count
FROM "cosmetics_stores" WHERE id::text LIKE 'seed0000-%'
UNION ALL
SELECT 'glycopharm_products', COUNT(*) FROM "glycopharm_products" WHERE id::text LIKE 'seed0000-%'
UNION ALL
SELECT 'yaksa_posts', COUNT(*) FROM "yaksa_posts" WHERE id::text LIKE 'seed0000-%'
UNION ALL
SELECT 'yaksa_categories', COUNT(*) FROM "yaksa_categories" WHERE id::text LIKE 'seed0000-%';
```

---

## 4. 데이터 상태 정의

플랫폼의 데이터는 다음 **세 가지 상태만** 존재한다:

| 상태 | 정의 | UI 처리 |
|------|------|---------|
| **Seed** | 초기 데모용 데이터 | 정상 렌더링 |
| **Real** | 실제 운영 데이터 | 정상 렌더링 |
| **Empty** | 데이터 없음 (0건) | Empty State 표시 |

### 4.1 금지 상태

다음 상태는 허용하지 않는다:

- "데이터 로딩 실패" 상태에서 Seed 데이터 표시
- Mock 데이터를 하드코딩
- 조건부 Seed/Real 혼합 표시

---

## 5. 서비스별 Seed 데이터 현황

| 서비스 | Seed Migration | 삭제 스크립트 | 상태 |
|--------|----------------|---------------|------|
| K-Cosmetics | `9999000000000-SeedMockDisplayData.ts` | `delete-seed-data.sql` | Active |
| Glycopharm | `9999000000000-SeedMockDisplayData.ts` | `delete-seed-data.sql` | Active |
| KPA Society (Yaksa) | `9999000000000-SeedMockDisplayData.ts` | `delete-seed-data.sql` | Active |
| Neture | `1735567200001-SeedNetureData.ts` | 별도 down() 메서드 | Active |

---

## 6. 운영 가이드

### 6.1 개발 환경

- Seed 데이터 유지 권장
- UI 개발 및 테스트에 활용

### 6.2 스테이징 환경

- 실데이터 테스트 시 Seed 삭제
- Empty State 동작 검증

### 6.3 프로덕션 환경

- 서비스 론칭 초기: Seed 유지 가능
- 실데이터 입력 시작 시: Seed 삭제 필수

---

## 7. 관련 파일

- Migration: `apps/api-server/src/database/migrations/9999000000000-SeedMockDisplayData.ts`
- 삭제 스크립트: `apps/api-server/scripts/delete-seed-data.sql`
- 본 정책 문서: `docs/data/seed-data-policy.md`

---

*Updated: 2025-01-06*
