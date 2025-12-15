# Gate 3 - 데이터 무결성(Data Integrity) 조사 보고서

**조사일**: 2025-12-15
**브랜치**: main
**조사자**: Claude Code
**조사 환경**: Production Server (o4o-apiserver)
**선행 조건**: Gate 0 PASS, Gate 1 CONDITIONAL PASS, Gate 2 PASS

---

## 1. 조사 목적

DB가 연결된 상태에서 **엔티티 메타데이터, 마이그레이션, DB 오브젝트(테이블/함수/뷰)**가
실제 코드의 기대와 일치하는지 확인.

---

## 2. 조사 결과 요약

| 항목 | 결과 | 비고 |
|------|------|------|
| **DB 연결 상태** | ✅ PASS | PostgreSQL healthy |
| **테이블 존재** | ⚠️ 부분 | 71개 존재, ecommerce_* 누락 |
| **컬럼 네이밍** | ❌ FAIL | snake_case ↔ camelCase 불일치 |
| **마이그레이션 기록** | ❌ FAIL | 0건 (기록 없음) |
| **DB 함수** | ❌ FAIL | refresh_product_listings() 누락 |
| **Materialized View** | ❌ FAIL | 0개 |
| **API 동작** | ⚠️ 부분 | forum/posts 500 에러 |
| **App Registry** | ✅ PASS | 9개 앱 active 상태 |

---

## 3. Gate 3 Verdict: ❌ **FAIL**

> **차단 사유 4건** 발견:
> 1. `refresh_product_listings()` 함수 누락 (매 5분마다 에러)
> 2. `ecommerce_*` 테이블 미존재
> 3. `forum_post.organizationId` 컬럼 네이밍 불일치
> 4. 마이그레이션 기록 0건

---

## 4. 상세 조사 결과

### 4.1 Gate 3-1: DB 연결 상태 확인

**상태**: ✅ PASS

```json
{
  "status": "healthy",
  "database": { "status": "healthy" },
  "uptime": 16259.33,
  "environment": "production"
}
```

| 항목 | 값 |
|------|-----|
| DB Host | localhost |
| DB Port | 5432 |
| DB Name | o4o_platform |
| Connection | ✅ healthy |

---

### 4.2 Gate 3-2: Entity ↔ Table 매핑 확인

**상태**: ❌ FAIL (부분 누락)

#### 존재하는 테이블 (71개)

| 카테고리 | 테이블 수 | 상태 |
|----------|----------|------|
| CMS 관련 | 17개 | ✅ |
| Forum 관련 | 6개 | ⚠️ 스키마 불일치 |
| Organization 관련 | 2개 | ✅ |
| Dropshipping 관련 | 10개 | ✅ |
| Auth/User 관련 | 9개 | ✅ |
| Yaksa 관련 | 15개 | ✅ |
| LMS 관련 | 7개 | ✅ |
| 기타 | 5개 | ✅ |

#### 누락된 테이블 (Critical)

| Entity | 예상 테이블명 | 상태 |
|--------|-------------|------|
| EcommerceOrder | ecommerce_orders | ❌ 미존재 |
| EcommerceOrderItem | ecommerce_order_items | ❌ 미존재 |
| EcommercePayment | ecommerce_payments | ❌ 미존재 |

> **영향**: E-commerce Core 기능 전체 사용 불가

#### 컬럼 네이밍 불일치

| 테이블 | DB 컬럼 | 코드 기대값 | 에러 |
|--------|---------|------------|------|
| forum_post | organization_id | organizationId | ❌ 불일치 |
| forum_post | is_organization_exclusive | isOrganizationExclusive | ❌ 불일치 |

> **원인**: TypeORM naming strategy 불일치
> **에러 메시지**: `column post.organizationId does not exist`

---

### 4.3 Gate 3-3: 마이그레이션 상태 확인

**상태**: ❌ FAIL

```sql
SELECT * FROM typeorm_migrations;
-- (0 rows)
```

| 항목 | 상태 | 비고 |
|------|------|------|
| 적용된 마이그레이션 | 0건 | ❌ 기록 없음 |
| Pending 마이그레이션 | 확인 불가 | - |
| Failed 마이그레이션 | 0건 | - |

> **원인 추정**: DB 스키마가 `synchronize: true`로 생성되었거나, 마이그레이션 없이 수동 생성됨
> **위험**: 스키마 drift 발생 시 추적 불가

---

### 4.4 Gate 3-4: DB 함수/뷰/트리거 존재 여부

**상태**: ❌ FAIL

#### 누락된 DB 함수

| 함수명 | 참조 위치 | 상태 |
|--------|----------|------|
| `refresh_product_listings()` | MaterializedViewService | ❌ 미존재 |

**에러 로그** (매 5분마다 반복):

```
error: function refresh_product_listings() does not exist
Failed to refresh materialized view
```

#### Materialized Views

```sql
SELECT matviewname FROM pg_matviews;
-- (0 rows)
```

| View 명 | 상태 |
|---------|------|
| mv_product_listings | ❌ 미존재 |

> **영향**: Dropshipping 상품 리스팅 조회 성능 저하

---

### 4.5 Gate 3-5: 대표 API 실호출 테스트

**상태**: ⚠️ 부분 실패

| Endpoint | HTTP Code | 결과 | 에러 |
|----------|-----------|------|------|
| /api/health | 200 | ✅ | - |
| /api/v1/appstore | 200 | ✅ | - |
| /api/v1/navigation/admin | 200 | ✅ | - |
| /api/v1/appstore/modules | 200 | ✅ | 14개 모듈 |
| /api/v1/forum/posts | 500 | ❌ | `column post.organizationId does not exist` |

---

### 4.6 Gate 3-6: Install Hook 영향 점검

**상태**: ✅ PASS (Hook 자체는 정상)

#### App Registry 상태

| appId | status | installedAt |
|-------|--------|-------------|
| cms-core | active | 2025-12-09 06:56 |
| organization-core | active | 2025-12-09 07:25 |
| forum-core | active | 2025-12-09 07:25 |
| dropshipping-core | active | 2025-12-09 07:25 |
| membership-yaksa | active | 2025-12-09 07:28 |
| forum-yaksa | active | 2025-12-09 07:28 |
| forum-cosmetics | active | 2025-12-09 07:28 |
| dropshipping-cosmetics | active | 2025-12-09 07:28 |
| organization-forum | active | 2025-12-09 07:28 |

**총 9개 앱** - 모두 active 상태

#### Module Loader 상태

| 항목 | 값 |
|------|-----|
| 로드된 모듈 | 14개 |
| 활성화된 모듈 | 12개 |
| 비활성 모듈 | 2개 (cosmetics-supplier-extension, cosmetics-sample-display-extension) |

> 비활성 모듈은 의존성 미충족으로 인한 것으로 추정

---

## 5. 발견된 이슈 상세

### Issue #1: refresh_product_listings() 함수 누락 (Critical)

**증상**:
- 매 5분마다 `function refresh_product_listings() does not exist` 에러
- 서버 로그에 지속적으로 출력

**원인**:
- DB 함수 및 Materialized View가 생성되지 않음
- 마이그레이션 미적용 또는 스키마 동기화 누락

**영향**:
- Dropshipping 상품 리스팅 성능 저하
- 캐시 갱신 실패

---

### Issue #2: ecommerce_* 테이블 누락 (Critical)

**증상**:
- `ecommerce_orders`, `ecommerce_order_items`, `ecommerce_payments` 테이블 0개

**원인**:
- E-commerce Core Entity가 DB에 동기화되지 않음
- 마이그레이션 미적용

**영향**:
- E-commerce Core 판매 원장 기능 전체 사용 불가
- CLAUDE.md 9절 규칙 준수 불가능

---

### Issue #3: forum_post 컬럼 네이밍 불일치 (High)

**증상**:
- `/api/v1/forum/posts` 호출 시 500 에러
- `column post.organizationId does not exist`

**원인**:
- DB 컬럼: `organization_id` (snake_case)
- 코드 기대: `organizationId` (camelCase)
- TypeORM naming strategy 불일치

**영향**:
- Forum 게시글 목록 조회 API 완전 실패

---

### Issue #4: 마이그레이션 기록 0건 (High)

**증상**:
- `typeorm_migrations` 테이블에 기록 없음

**원인**:
- `synchronize: true`로 스키마 생성 또는 수동 생성
- 마이그레이션 프로세스 미사용

**영향**:
- 스키마 drift 추적 불가
- 프로덕션 스키마 변경 이력 없음

---

## 6. 환경 정보

| 항목 | 값 |
|------|-----|
| Server | o4o-apiserver (43.202.242.215) |
| Node.js | Production |
| API Port | 4000 |
| DB Host | localhost |
| DB Name | o4o_platform |
| 테이블 수 | 71개 |
| 등록 앱 | 9개 (active) |
| 로드 모듈 | 14개 |

---

## 7. 권장 조치

### 즉시 조치 (Critical)

1. **refresh_product_listings() 함수 생성**
   - Materialized View 및 Refresh 함수 마이그레이션 생성/적용
   - 반복 에러 제거

2. **E-commerce Core 테이블 생성**
   - `ecommerce_orders`, `ecommerce_order_items`, `ecommerce_payments`
   - 마이그레이션 생성 후 적용

3. **Forum 컬럼 네이밍 수정**
   - Entity에 `@Column({ name: 'organization_id' })` 명시
   - 또는 DB 컬럼명 변경

### 중기 조치 (High)

4. **마이그레이션 기준 확립**
   - 현재 스키마를 기준 마이그레이션으로 기록
   - 향후 모든 스키마 변경은 마이그레이션으로 관리

5. **TypeORM Naming Strategy 통일**
   - 프로젝트 전체 snake_case 또는 camelCase 통일

---

## 8. 결론

### Gate 3 판정: ❌ FAIL

**차단 사유 요약**:

| # | 이슈 | 심각도 | 차단 여부 |
|---|------|--------|----------|
| 1 | refresh_product_listings() 누락 | Critical | ✅ 차단 |
| 2 | ecommerce_* 테이블 누락 | Critical | ✅ 차단 |
| 3 | forum_post 컬럼 불일치 | High | ✅ 차단 |
| 4 | 마이그레이션 기록 0건 | High | ⚠️ 경고 |

**다음 단계**: Gate 3-Fix Work Order 발행 필요

---

## 9. 다음 단계

| 단계 | 상태 | 비고 |
|------|------|------|
| Gate 0 | ✅ PASS | 완료 |
| Gate 1 | ⚠️ CONDITIONAL PASS | 완료 |
| Gate 2 | ✅ PASS | 완료 |
| Gate 3 | ❌ FAIL | **차단 - Fix 필요** |
| Gate 3-Fix | ⏳ 대기 | Work Order 발행 필요 |
| Gate 4 | ⏸️ 보류 | Gate 3-Fix 완료 후 진행 |

---

*Report generated: 2025-12-15 21:15 KST*
