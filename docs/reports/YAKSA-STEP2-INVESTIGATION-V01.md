# Yaksa Step 2 조사 보고서 v0.1

**Work Order**: WO-YAKSA-STEP2-INVESTIGATION
**Phase**: Step 2 (의존성 중심 조사)
**Date**: 2026-01-11
**Investigator**: Claude Code
**Purpose**: Yaksa 서비스의 Neture·Cosmetics 의존성 및 단독 테스트 가능성 확인 (판단/수정 없음)

---

## A. 서비스 기본 성격 확인 (Identity Check)

### A-1. 서비스 정의 (현재 코드 기준)

**서비스 구성:**
- **API**: `apps/api-server/src/routes/yaksa/`
- **Frontend**: ❌ 없음 (API only)

**서비스 유형:**
- **주체**: 조직 (약사회)
- **성격**: 포럼/게시판 중심
- **특징**: public 스키마 사용 (`yaksa_*` 테이블)

**정의문:**
> "Yaksa는 약사회를 위한 포럼/게시판 중심의 조직 커뮤니티 서비스이다."

### A-2. 단독 실행 가능성

**✅ Neture 없이 서비스 기동 가능**

**Backend API 엔드포인트:**
```
GET  /api/v1/yaksa/categories
GET  /api/v1/yaksa/categories/:id
POST /api/v1/yaksa/categories (인증 필요)
PUT  /api/v1/yaksa/categories/:id (인증 필요)
GET  /api/v1/yaksa/posts
GET  /api/v1/yaksa/posts/:id
POST /api/v1/yaksa/posts (인증 필요)
PUT  /api/v1/yaksa/posts/:id (인증 필요)
PATCH /api/v1/yaksa/posts/:id/publish (인증 필요)
```

**판정:**
- ✅ Neture 비연결 상태에서도 API 작동 가능
- ✅ Cosmetics 비연결 상태에서도 API 작동 가능
- ⚠️ Frontend 없음 (API only)

**Frontend 부재 의미:**
- Yaksa는 Admin Dashboard 또는 다른 Frontend에서 소비되는 API 서비스
- 단독 웹사이트가 아님

---

## B. Neture 의존성 조사

### B-1. Neture 연계 지점 검색

**코드 검색 결과:**
```bash
grep -r "neture|Neture" apps/api-server/src/routes/yaksa/
# → No files found
```

**판정:** ❌ Neture 연계 지점 없음

### B-2. Neture 미존재 시 영향

**예상 영향:** 없음

**근거:**
- Yaksa 코드베이스에 Neture 참조 0건
- 독립 API (`/api/v1/yaksa`)
- 포럼/게시판 기능은 Neture와 무관

**판정:** ⭕ 완전 독립 서비스 (Neture 의존 없음)

---

## C. Cosmetics 의존성 조사

### C-1. 상품/주문 연계 여부

**코드 검색 결과:**
```bash
grep -r "cosmetics|Cosmetics" apps/api-server/src/routes/yaksa/
# → No files found
```

**판정:** ❌ Cosmetics 의존성 없음

### C-2. 주문/이행 책임

**Order/Commerce 기능 존재 여부:**
- ❌ 없음

**판정:**
- ⭕ Yaksa는 순수 포럼/커뮤니티 서비스
- ❌ 주문/결제/상품 개념 없음

---

## D. Auth / Organization / Role 구조

### D-1. 인증 및 권한

**인증 미들웨어:**
```ts
// yaksa.routes.ts
import { requireAuth as coreRequireAuth } from '../../middleware/auth.middleware.js';

function requireYaksaScope(requiredScope: string) {
  return (req: Request, res: Response, next: NextFunction) => {
    const userScopes = authReq.user?.scopes || [];

    if (
      userScopes.includes(requiredScope) ||
      userScopes.includes('yaksa:admin') ||
      userScopes.includes('admin') ||
      authReq.user?.roles?.includes('admin')
    ) {
      return next();
    }
    // 403
  };
}
```

**Yaksa 전용 Scope:**
```
yaksa:read
yaksa:write
yaksa:admin
```

**판정:**
- ⭕ 공통 Auth Core 사용 (정상)
- ⭕ Yaksa 전용 Scope 정의 (독립성 양호)
- ❌ Yaksa 전용 Role은 없음 (Scope로 대체)

### D-2. 조직 구조 의존성

**Entity 구조:**
```ts
// yaksa-post.entity.ts
@Column({ type: 'uuid', nullable: true })
created_by_user_id?: string;

@Column({ type: 'varchar', length: 100, nullable: true })
created_by_user_name?: string;
```

**조직 의존성:**
- ⭕ User ID 참조만 (Soft reference)
- ❌ Organization 테이블 직접 참조 없음

**판정:**
- ⭕ 조직은 데이터일 뿐, 구조적 전제 아님
- ⭕ User ID만으로도 작동 가능

---

## E. 기능 책임 경계 확인

### E-1. Yaksa가 직접 책임지는 영역

**확인된 책임:**
- ✅ 카테고리 관리 (yaksa_categories)
- ✅ 게시글 관리 (yaksa_posts)
- ✅ 게시글 로그 (yaksa_post_logs)
- ✅ 게시글 상태 관리 (draft/published/hidden/deleted)
- ✅ 공지/고정글 기능

**Entity 목록:**
```
yaksa_categories (public schema)
yaksa_posts (public schema)
yaksa_post_logs (public schema)
```

### E-2. Yaksa가 관여하지 않아야 할 영역

**확인 결과:**
- ❌ 주문 ⭕ (없음)
- ❌ 결제 ⭕ (없음)
- ❌ 상품 관리 ⭕ (없음)
- ❌ 배송/이행 ⭕ (없음)

**판정:** ✅ 위반 없음 (순수 포럼 서비스)

---

## F. 테스트 환경 관점 조사

### F-1. 단독 테스트 가능성

**필수 전제 조건:**
1. ✅ Auth Core 작동 (테스트 계정 필요)
2. ✅ Yaksa 테이블 존재 (yaksa_*)
3. ✅ 테스트용 카테고리/게시글 데이터

**테스트 가능 시나리오:**
```
1. [Public] GET /api/v1/yaksa/categories → 200
2. [Public] GET /api/v1/yaksa/posts → 200
3. [Auth] POST /api/v1/yaksa/posts → 201
4. [Auth] PATCH /api/v1/yaksa/posts/:id/publish → 200
```

**판정:** ✅ 테스트 계정 + Yaksa 테이블만 있으면 단독 테스트 가능

### F-2. 테스트 차단 요소

**현재 확인된 차단 요소:**

1. **Frontend 부재**
   - API만 존재, 독립 웹사이트 없음
   - Admin Dashboard 또는 별도 Frontend에서 소비 전제

2. **Yaksa 테이블 미생성 가능성**
   - Migration 파일 존재 여부 미확인

3. **테스트 데이터 부재**
   - Sample Categories 필요
   - Sample Posts 필요

**보류 항목 (지금 고치지 않음):**
- Migration 실행 여부 확인
- Seed Data 준비
- Test Account 설정
- Frontend 구현 여부 결정

---

## G. 관리자·운영 관점 의존성

### G-1. Admin Dashboard 연계

**추정:**
- Admin Dashboard가 Yaksa API를 조회할 가능성 높음
- Yaksa → Admin 역의존은 없음

**판정:**
- ⭕ 정상 (역방향 조회 패턴)

### G-2. 운영 시 혼란 가능성

**명확한 책임 영역:**
- Yaksa는 포럼/게시판만 담당
- Admin은 전체 플랫폼 통계 조회

**혼란 요소:** ❌ 없음

---

## H. Step 2 판정 (결론)

### H-1. 단독 테스트 가능 여부

**✅ 가능**

**근거:**
- Neture 의존 없음
- Cosmetics 의존 없음
- Auth Core 의존만 존재 (정상)
- 독립 API (`/api/v1/yaksa`)
- 포럼 기능은 자체 완결

**단, 주의사항:**
- Frontend 없음 (API only)
- Admin Dashboard 또는 별도 UI 필요

### H-2. Neture 의존성 성격

**⭕ 독립 (의존 없음)**

**근거:**
- 코드 검색 결과: Neture 참조 0건

### H-3. 구조 위험 신호

**❌ 없음**

**근거:**
- 명확한 서비스 경계 (포럼만)
- public 스키마 사용 (yaksa_* 테이블)
- Scope 기반 권한 통제
- Commerce 기능 없음

---

## I. Yaksa 서비스 특성 요약

### I-1. 서비스 정체성

```
Yaksa =
  포럼/게시판 중심 조직 커뮤니티 서비스
  (API only + Category + Posts + Logs)
```

### I-2. 다른 서비스와의 관계

| 서비스 | 관계 | 성격 |
|--------|------|------|
| Neture | ❌ 없음 | 독립 |
| Cosmetics | ❌ 없음 | 독립 |
| Auth Core | ⭕ 의존 | 필수 (인증) |
| Dropshipping | ❌ 없음 | 독립 |
| Tourism | ❌ 없음 | 독립 |
| Admin | ← 참조됨 | 역방향 (정상) |

### I-3. 서비스 유형별 비교

| 항목 | Neture | Cosmetics | Yaksa |
|------|--------|-----------|-------|
| 주문/결제 | ❌ | ✅ | ❌ |
| 자체 DB | ✅ (neture_*) | ✅ (cosmetics_*) | ✅ (yaksa_*) |
| 스키마 분리 | ⭕ (default) | ⭕ (cosmetics) | ⭕ (public) |
| Frontend | ✅ web-neture | ✅ web-k-cosmetics | ❌ |
| 인증 필요 | ❌ Public | ⭕ Scope | ⭕ Scope |
| 핵심 기능 | 정보 플랫폼 | Commerce | 포럼/커뮤니티 |

**핵심 차이:**
- Neture: Read-Only Hub
- Cosmetics: Commerce Service
- Yaksa: Community/Forum Service (API only)

---

## J. Step 2 최종 결론

### 핵심 판정 (3문장)

1. **Yaksa는 Neture/Cosmetics와 완전히 독립된 포럼/커뮤니티 서비스이다.**

2. **Neture/Cosmetics 없이도 단독 테스트 및 운영이 가능하다 (API 레벨).**

3. **Auth Core 외에는 다른 서비스에 대한 구조적 의존이 없다.**

---

## K. 테스트 환경 준비 요구사항

### K-1. 필수 선행 조건

**DB 준비:**
```sql
-- Public 스키마에 Yaksa 테이블 생성 (Migration 실행 필요)
yaksa_categories
yaksa_posts
yaksa_post_logs
```

**테스트 데이터:**
```
최소 2개 Categories
최소 5개 Posts (각 상태별)
```

**테스트 계정:**
```
Scope: yaksa:read, yaksa:write
또는 Role: admin
```

### K-2. 테스트 시나리오 (예시)

```
1. [Public] GET /api/v1/yaksa/categories → 200
2. [Public] GET /api/v1/yaksa/posts?status=published → 200
3. [Auth] POST /api/v1/yaksa/posts → 201
4. [Auth] PATCH /api/v1/yaksa/posts/:id/publish → 200
```

---

## L. 다음 단계 권고 사항

### L-1. 조사 완료 판정

**Yaksa Step 2 조사: ✅ 완료**

**이유:**
- 단독 테스트 가능 여부: 명확 (✅ 가능 - API 레벨)
- Neture 의존성: 명확 (❌ 없음)
- Cosmetics 의존성: 명확 (❌ 없음)
- 구조 위험 신호: 없음

### L-2. 다음 서비스 조사 대상

**권장 순서:**
1. **Dropshipping/S2S** (Step 2 조사)
2. **Tourism** (Step 2 조사)

**이유:** Neture, Cosmetics, Yaksa 모두 독립적이므로 다른 서비스도 동일 패턴인지 확인 필요

---

## M. 특이 사항 (Critical Findings)

### M-1. Frontend 부재 의미

**현상:**
- API만 존재, 독립 웹사이트 없음
- `services/web-yaksa/` 디렉터리 없음

**추정:**
- Admin Dashboard에서 Yaksa API 소비
- 또는 향후 별도 Frontend 구현 예정
- 또는 모바일 앱에서 API 소비

**영향:**
- 단독 E2E 테스트 불가 (API 레벨만 가능)
- Frontend 구현 여부는 별도 결정 필요

### M-2. Public 스키마 사용

**현상:**
- Cosmetics는 별도 스키마 (`cosmetics`)
- Yaksa는 public 스키마 (`yaksa_*` 테이블)

**의미:**
- Yaksa는 플랫폼 공통 영역으로 간주
- 또는 초기 구현으로 스키마 분리 미적용

**위험도:** 낮음 (테이블명 prefix로 구분)

---

## N. 조사 메타데이터

**조사 방법:**
- 코드 읽기 (Read tool)
- 파일 패턴 검색 (Glob tool)
- 코드 내 패턴 검색 (Grep tool)
- 라우트 등록 확인 (main.ts)

**조사 범위:**
- Backend: apps/api-server/src/routes/yaksa/
- Frontend: ❌ 없음
- Admin 연계: 추정 (코드 확인 미실시)

**조사 제외:**
- Migration 실행 상태
- 실제 DB 테이블 존재 여부
- 테스트 데이터 준비 상태
- Admin Dashboard 실제 연계 코드
- Frontend 구현 계획
- UI/UX 디자인
- 성능/보안

**조사 시점:** 2026-01-11 (main branch, commit 81cb4757a)

---

*End of Report*
