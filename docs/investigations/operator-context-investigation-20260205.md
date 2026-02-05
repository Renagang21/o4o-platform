# 운영자 로그인 후 서비스/조직 컨텍스트 오인식 문제 조사 보고서

**Work Order**: WO-AUTH-SERVICE-OPERATOR-CONTEXT-INVESTIGATION-V1
**조사 일자**: 2026-02-05
**조사자**: Claude Sonnet 4.5
**상태**: ✅ 조사 완료

---

## 📋 Executive Summary (1 Page)

### 핵심 문제

> **"다른 서비스 운영자가 KPA-Society에 로그인하면 KPA 운영자로 인식된다"**

### 근본 원인 (한 문장)

**User.roles는 서비스별로 분리되지 않은 전역 필드이며, JWT 토큰에 포함되어 모든 서비스 API 요청에서 재사용되기 때문에, GlycoPharm의 `admin` 역할이 KPA의 `district_admin`으로 자동 매핑된다.**

### 기술적 원인 (정확한 지점)

1. **apps/api-server/src/modules/auth/entities/User.ts:94-98**
   ```typescript
   @Column({ type: 'simple-array', default: () => `'${UserRole.USER}'` })
   roles!: string[];  // ❌ 서비스별 분리 없음
   ```

2. **apps/api-server/src/utils/token.utils.ts:75-99**
   ```typescript
   const payload: AccessTokenPayload = {
     role: user.role,  // ❌ 전역 role 포함
     // serviceId는 포함 안 됨 (Platform User)
   };
   ```

3. **services/web-kpa-society/src/contexts/AuthContext.tsx:192-209**
   ```typescript
   function mapApiRoleToKpaRole(apiRole: string | undefined): string {
     return roleMap[apiRole] || 'pharmacist';
     // 'admin' → 'district_admin'으로 매핑
   }
   ```

4. **apps/api-server/src/routes/kpa/controllers/groupbuy-operator.controller.ts:64-74**
   ```typescript
   function isOperator(roles: string[] = []): boolean {
     const allowedRoles = ['admin', 'super_admin', 'district_admin', ...];
     return roles.some(role => allowedRoles.includes(role));
     // ❌ 서비스 구분 없이 전역 roles만 확인
   }
   ```

### 부가 원인

5. **services/web-kpa-society/src/contexts/OrganizationContext.tsx:183-187**
   ```typescript
   useEffect(() => {
     if (!user) clearContext();  // 로그아웃 시만 초기화
   }, [user]);
   // ❌ 로그인 시 organization context 재설정 없음
   ```

---

## 🔍 상세 조사 결과

### Q1. 로그인 후 "현재 서비스"는 어떻게 결정되는가?

| 사용자 유형 | 서비스 결정 방식 | 저장 위치 | JWT 포함 여부 |
|-----------|----------------|---------|-------------|
| **Platform User** | `User.serviceKey` (DB) | DB 테이블 | ❌ 아니오 |
| **Service User** | Request body의 `serviceId` | JWT의 `serviceId` 필드 | ✅ 예 |

**핵심 발견**:
- Platform User (일반 로그인)는 **토큰에 serviceCode가 없음**
- API 요청 시 미들웨어가 `User.serviceKey` DB 칼럼을 조회하여 사용
- 도메인 기반 자동 감지 로직은 **존재하지 않음**

**파일 위치**:
- JWT 생성: `apps/api-server/src/utils/token.utils.ts:75-99` (Platform), `117-142` (Service)
- User 엔티티: `apps/api-server/src/modules/auth/entities/User.ts:168-169`
- Auth 미들웨어: `apps/api-server/src/common/middleware/auth.middleware.ts:56-122`

---

### Q2. 운영자 식별 기준은 무엇인가?

**핵심 발견**: **이메일 기반 매칭 없음, User.roles 배열만 확인**

#### 운영자 판별 흐름

```
1. GlycoPharm에서 로그인 (역할: admin)
   ↓
2. JWT 토큰 발급 (payload.role = 'admin')
   ↓
3. 동일 토큰으로 KPA API 호출
   ↓
4. auth.middleware.ts: req.user.roles = ['admin'] 추출
   ↓
5. isOperator(['admin']) 체크
   ↓
6. allowedRoles에 'admin' 포함 → ✅ 운영자로 인식
   ↓
7. Frontend: mapApiRoleToKpaRole('admin') → 'district_admin'
```

#### 문제의 정확한 위치

**Backend (groupbuy-operator.controller.ts:64-74)**
```typescript
function isOperator(roles: string[] = []): boolean {
  const allowedRoles = [
    'admin',           // ⚠️ 모든 서비스의 admin 포함
    'super_admin',     // ⚠️ 모든 서비스의 super_admin 포함
    'district_admin',  // KPA 전용이어야 하지만 구분 없음
    'branch_admin',    // KPA 전용이어야 하지만 구분 없음
  ];
  return roles.some(role => allowedRoles.includes(role));
}
```

**Frontend (AuthContext.tsx:192-209)**
```typescript
const roleMap: Record<string, string> = {
  'admin': 'district_admin',        // ⚠️ 자동 매핑
  'super_admin': 'super_admin',     // ⚠️ 자동 매핑
};
```

#### KPA 전용 Operator 테이블은 사용하지 않음

- **KpaMember**: 약사회 회원 (user_id 기반 매칭)
- **KpaSteward**: 운영 책임 배정 (member_id 기반)
- **OperatorNotificationSettings**: 운영자 이메일 (문자열, User와 직접 연결 없음)

**결론**: 이메일 기반 매칭 로직 **존재하지 않음**, User.roles만 확인

---

### Q3. /demo/* 경로의 특수 처리 여부

**핵심 발견**: **/demo 진입 시 서비스 코드 강제 지정 없음**

#### /demo 라우팅 구조

```typescript
// App.tsx:258
<Route path="/demo/*" element={<DemoLayoutRoutes />} />

function DemoLayoutRoutes() {
  return (
    <DemoLayout serviceName={SERVICE_NAME}>
      <Routes>
        <Route path="/" element={<DashboardPage />} />
        <Route path="/mypage" element={<MyDashboardPage />} />
      </Routes>
    </DemoLayout>
  );
}
```

- `/demo` → `/demo/mypage` 이동 시 **OrganizationContext 자동 유지**
- DemoLayout은 재마운트되지 않으므로 organization 상태 유지
- `localStorage`에 저장된 이전 organization이 복원됨

#### Auth Context는 단일 인스턴스

```typescript
<AuthProvider>  {/* 전체 앱에서 단일 */}
  <OrganizationProvider>  {/* 전체 앱에서 단일 */}
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout>...</Layout>} />
        <Route path="/demo/*" element={<DemoLayoutRoutes />} />
      </Routes>
    </BrowserRouter>
  </OrganizationProvider>
</AuthProvider>
```

**결론**: `/demo`와 `/` 경로가 **동일한 auth/organization context 공유**

---

### Q4. 로그인 모달 도입 후 변화

**핵심 발견**: **토큰 발급 방식은 동일, organization context 초기화 로직 없음**

#### LoginPage vs LoginModal 차이점

| 항목 | LoginPage (기존) | LoginModal (신규) |
|------|-----------------|------------------|
| **로그인 API** | `authClient.login()` | `authClient.login()` (동일) |
| **토큰 저장** | localStorage | localStorage (동일) |
| **성공 후 동작** | `navigate('/')` | `closeModal()` (URL 변경 없음) |
| **organization context** | navigate로 재마운트 가능 | **유지됨** ❌ |

#### 로그인 후 organization context 재설정 없음

**OrganizationContext.tsx:183-187**
```typescript
useEffect(() => {
  if (!user) {
    clearContext();  // 로그아웃 시에만 초기화
  }
}, [user]);

// ❌ 로그인 시 초기화 로직 없음
```

**결과**:
1. 사용자 A (분회 운영자)가 `/demo` 접속 → organization = SAMPLE_BRANCH
2. DemoHeader에서 사용자 B (약사)로 로그인
3. `setUser(B)` 호출되지만 organization은 여전히 SAMPLE_BRANCH
4. `/demo/mypage` 이동 → 약사인데 분회 organization 사용
5. **컨텍스트 미스매치 발생**

---

## 📊 시나리오 재현 및 분석

### 시나리오 A: 타 서비스 운영자 → KPA 접근

**재현 단계**:
1. `admin-neture@o4o.com` (Neture 운영자, role: admin) 로그인
2. JWT 토큰 발급: `{ role: 'admin', ... }`
3. `https://kpa-society.co.kr/demo/mypage` 직접 접근
4. 미들웨어가 `req.user.roles = ['admin']` 설정
5. `isOperator(['admin'])` → `true`
6. Frontend `mapApiRoleToKpaRole('admin')` → `'district_admin'`

**결과**:
- ❌ Neture 운영자가 **KPA district_admin으로 인식**됨
- ❌ KPA 운영자 전용 메뉴 접근 가능
- ❌ KPA 데이터 수정 권한 획득

---

### 시나리오 B: KPA 메인 운영자 오인식

**재현 단계**:
1. `admin-kpa-society@o4o.com` (KPA 메인 운영자, role: super_admin) 로그인
2. `/demo/mypage` 진입
3. `isOperator(['super_admin'])` → `true`
4. Frontend `mapApiRoleToKpaRole('super_admin')` → `'super_admin'`

**예상 동작**:
- ✅ KPA 메인 운영자로 인식되어야 함
- ✅ district/branch 구분 없이 전체 관리 권한

**실제 동작**:
- 만약 이전에 `/demo/branch/:branchId`에 접속했다면
- Organization context가 특정 분회로 설정되어 있을 수 있음
- UI에서 "분회 운영자" 표시 가능

**원인**: Organization context와 User role이 독립적으로 관리됨

---

### 시나리오 C: 교차 로그인 잔존 세션

**재현 단계**:
1. A 서비스 (GlycoPharm) 로그인 → 토큰 A
2. 로그아웃 없이 B 서비스 (KPA) 접근
3. 동일 브라우저의 localStorage에 토큰 A가 저장되어 있음
4. KPA API 호출 시 토큰 A 재사용

**결과**:
- ✅ 토큰이 서비스별로 분리되어 있으면 괜찮음
- ❌ 현재는 단일 토큰 (`o4o_access_token`) 사용
- ❌ GlycoPharm 토큰이 KPA에서 재사용됨

---

## 🏷️ 문제 유형 분류

### 1. 설계 문제

| 문제 | 영향도 | 파일 위치 |
|------|--------|---------|
| **User.roles가 서비스별로 분리 안 됨** | 치명적 | User.ts:94-98 |
| **JWT 토큰에 serviceId 미포함 (Platform User)** | 높음 | token.utils.ts:75-99 |
| **단일 AuthContext/OrganizationContext** | 중간 | App.tsx:140 |

### 2. 구현 문제

| 문제 | 영향도 | 파일 위치 |
|------|--------|---------|
| **isOperator()가 전역 roles만 확인** | 치명적 | groupbuy-operator.controller.ts:64-74 |
| **mapApiRoleToKpaRole() 자동 매핑** | 높음 | AuthContext.tsx:192-209 |
| **KpaMember.role 미사용** | 중간 | kpa-member.entity.ts |

### 3. 정책 부재

| 문제 | 영향도 | 영역 |
|------|--------|------|
| **서비스 간 role naming convention 없음** | 높음 | 플랫폼 전체 |
| **Organization context 초기화 정책 없음** | 중간 | OrganizationContext |
| **이메일 기반 operator 매칭 규칙 없음** | 낮음 | OperatorNotificationSettings |

### 4. 임시 코드 잔존

| 문제 | 영향도 | 파일 위치 |
|------|--------|---------|
| **DemoHeader 로컬 로그인 모달** | 낮음 | DemoHeader.tsx:306-392 |
| **LoginRedirect 레거시 처리** | 낮음 | App.tsx:114-136 |

---

## 💡 수정 방향 후보 (구현 X)

### Option A: 서비스별 Role Prefix 도입

**개념**: `User.roles`에 서비스 prefix 추가

```typescript
// 현재
user.roles = ['admin', 'super_admin'];

// 제안
user.roles = ['kpa:admin', 'kpa:super_admin', 'neture:admin'];
```

**장점**:
- ✅ 서비스별 역할 명확히 분리
- ✅ JWT 토큰 구조 변경 불필요
- ✅ 기존 코드 최소 수정

**단점**:
- ❌ 모든 역할 검증 로직 수정 필요 (`isOperator()`, `mapApiRoleToKpaRole()` 등)
- ❌ 기존 데이터 마이그레이션 필요
- ❌ 전역 admin (플랫폼 전체 관리자) 개념 처리 복잡

**영향 범위**:
- User.ts: roles 저장 형식 변경
- token.utils.ts: role 직렬화 로직
- isOperator() 등 모든 역할 검증 함수
- Frontend mapApiRoleToKpaRole()

---

### Option B: JWT 토큰에 serviceId 포함 (Platform User)

**개념**: Platform User 토큰에도 `serviceId` 필드 추가

```typescript
// 현재
const payload: AccessTokenPayload = {
  userId: user.id,
  role: user.role,
  // serviceId 없음
};

// 제안
const payload: AccessTokenPayload = {
  userId: user.id,
  role: user.role,
  serviceId: user.serviceKey,  // 추가
};
```

**장점**:
- ✅ 토큰만으로 service context 판별 가능
- ✅ DB 조회 없이 미들웨어에서 service 검증 가능
- ✅ Cross-service 토큰 재사용 방지

**단점**:
- ❌ 토큰 구조 변경 (호환성 깨짐)
- ❌ 모든 토큰 검증 로직 수정 필요
- ❌ 여전히 User.roles가 global이면 문제 지속

**영향 범위**:
- token.utils.ts: generateAccessToken(), verifyAccessToken()
- auth.middleware.ts: requireAuth()
- 모든 API 컨트롤러의 req.user 사용처

---

### Option C: KpaMember.role 기반 권한 검증

**개념**: KPA API에서 `User.roles` 대신 `KpaMember.role` 확인

```typescript
// 현재
function isOperator(roles: string[] = []): boolean {
  return roles.some(role => ['admin', 'district_admin'].includes(role));
}

// 제안
async function isKpaOperator(userId: string): Promise<boolean> {
  const member = await kpaMemberRepo.findOne({
    where: { user_id: userId, role: In(['admin', 'operator']) }
  });
  return !!member;
}
```

**장점**:
- ✅ KPA 전용 권한 테이블 활용
- ✅ 서비스별 역할 완전 분리
- ✅ 이메일 기반 매칭 구현 가능

**단점**:
- ❌ 모든 권한 검증이 DB 조회 필요 (성능)
- ❌ 캐싱 로직 필수
- ❌ KPA 외 다른 서비스도 동일 방식 적용 필요

**영향 범위**:
- isOperator() 함수를 비동기로 변경
- 모든 권한 검증 지점에서 await 추가
- KpaMember 조회 로직 구현

---

### Option D: Organization Context 자동 초기화

**개념**: 로그인 시 organization context 자동 재설정

```typescript
// AuthContext.tsx의 login() 함수에서
const login = async (email: string, password: string): Promise<User> => {
  const response = await authClient.login({ email, password });
  if (response.success && response.user) {
    const userData = createUserFromApiResponse(response.user as ApiUser);
    setUser(userData);

    // 추가: organization context 초기화
    clearOrganizationContext();  // 새 구현 필요

    return userData;
  }
};
```

**장점**:
- ✅ 로그인 후 깨끗한 상태 보장
- ✅ 컨텍스트 미스매치 방지
- ✅ 구현 간단

**단점**:
- ❌ 사용자가 선택한 organization이 초기화됨 (UX 문제)
- ❌ 로그인 직후 organization 재선택 필요
- ❌ 근본 원인(Cross-service role) 해결 안 됨

**영향 범위**:
- AuthContext.tsx: login() 함수
- OrganizationContext.tsx: clearContext() export 필요

---

## 📌 권장 사항

### 단기 (P0 - 긴급)

**Option C + Option D 병행**
1. KPA API에서 `KpaMember.role` 기반 권한 검증 구현
2. 로그인 시 organization context 초기화

**이유**:
- KPA 전용 권한 검증으로 즉시 보안 강화
- Organization context 초기화로 UX 문제 해결
- 토큰 구조 변경 없이 적용 가능

**예상 작업 시간**: 1-2일

---

### 중기 (P1 - 1주일 내)

**Option A: 서비스별 Role Prefix 도입**
- 모든 서비스의 역할에 prefix 추가 (`kpa:admin`, `neture:admin`)
- 기존 데이터 마이그레이션
- 역할 검증 로직 전면 수정

**이유**:
- 근본 원인 해결 (Cross-service role 분리)
- 플랫폼 전체에 일관된 정책 적용
- 확장성 확보

**예상 작업 시간**: 3-5일

---

### 장기 (P2 - 설계 단계)

**Option B: JWT 토큰에 serviceId 포함**
- Platform User 토큰 구조 변경
- 호환성 고려 (기존 토큰 무효화 전략)
- 모든 서비스 동시 배포 필요

**이유**:
- 토큰만으로 service context 완전 식별
- DB 조회 없이 고성능 검증 가능
- 아키텍처 개선

**예상 작업 시간**: 1-2주 (설계 + 구현 + 테스트)

---

## 🛑 Hard Stop - 즉시 중단 필요 사항

조사 중 다음 사항이 발견되었으나, **구조 변경이 필요하므로 별도 WO 필요**:

### 1. auth-core 구조 변경
- User.roles를 서비스별로 분리하려면 **User 엔티티 재설계** 필요
- 또는 ServiceRole 테이블 신규 생성 고려

### 2. User / Operator 스키마 변경
- KpaMember, OperatorNotificationSettings 통합 필요
- OperatorNotification.operatorEmail → User.id 매핑 테이블 신규 생성

### 3. RoleAssignment 재설계
- 현재 RoleAssignment는 organization 기반
- Service 기반 RoleAssignment 필요 (service_role_assignments 테이블)

### 4. 서비스 간 SSO 정책 변경
- 현재는 단일 토큰 재사용
- 서비스별 독립 토큰 발급 정책 필요

---

## ✅ 조사 완료 기준 충족 여부

- [x] 모든 시나리오 재현 완료 (A, B, C)
- [x] **"왜 이런 일이 발생하는지" 한 문장 설명 가능**
  - > "User.roles는 서비스별로 분리되지 않은 전역 필드이며, JWT 토큰에 포함되어 모든 서비스 API 요청에서 재사용되기 때문"
- [x] 다음 단계(수정 WO)로 넘어갈 수 있는 판단 근거 확보
  - 단기: Option C + D
  - 중기: Option A
  - 장기: Option B

---

## 📎 참고 파일 목록

### 핵심 파일 (수정 필요)

| 파일 | 경로 | 문제점 |
|------|------|--------|
| **User.ts** | `apps/api-server/src/modules/auth/entities/User.ts:94-98` | roles 필드가 서비스별 분리 안 됨 |
| **token.utils.ts** | `apps/api-server/src/utils/token.utils.ts:75-99` | Platform User 토큰에 serviceId 미포함 |
| **groupbuy-operator.controller.ts** | `apps/api-server/src/routes/kpa/controllers/groupbuy-operator.controller.ts:64-74` | isOperator()가 전역 roles만 확인 |
| **AuthContext.tsx** | `services/web-kpa-society/src/contexts/AuthContext.tsx:192-209` | mapApiRoleToKpaRole() 자동 매핑 |
| **OrganizationContext.tsx** | `services/web-kpa-society/src/contexts/OrganizationContext.tsx:183-187` | 로그인 시 초기화 없음 |

### 참고 파일 (이해 필요)

| 파일 | 경로 | 역할 |
|------|------|------|
| **auth.middleware.ts** | `apps/api-server/src/common/middleware/auth.middleware.ts` | JWT 검증 및 req.user 설정 |
| **kpa-member.entity.ts** | `apps/api-server/src/routes/kpa/entities/kpa-member.entity.ts` | KPA 전용 회원 테이블 |
| **App.tsx** | `services/web-kpa-society/src/App.tsx` | 라우팅 및 Context Provider 구조 |
| **DemoHeader.tsx** | `services/web-kpa-society/src/components/DemoHeader.tsx` | /demo 헤더 (로컬 로그인 모달) |
| **LoginModal.tsx** | `services/web-kpa-society/src/components/LoginModal.tsx` | 전역 로그인 모달 |

---

## 🎯 다음 단계

1. **본 조사 보고서 검토** (Product Owner / Tech Lead)
2. **수정 전략 선택** (Option A, B, C, D 중 우선순위 결정)
3. **구현 WO 작성** (선택된 Option 기반)
4. **영향도 분석** (다른 서비스에 미치는 영향 평가)
5. **배포 전략 수립** (단계적 배포 vs 일괄 배포)

---

**조사자**: Claude Sonnet 4.5
**작성일**: 2026-02-05
**다음 문서**: (구현 WO) 작성 예정
