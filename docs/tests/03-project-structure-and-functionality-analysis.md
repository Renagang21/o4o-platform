# 03. 프로젝트 구조 및 기능 분석 보고서

**작업 일시:** 2025년 6월 7일  
**이전 문서:** 02-typescript-errors-resolution.md  
**목적:** neture.co.kr 프로젝트의 전체 구조와 구현된 기능 상세 분석

---

## 📋 문서 개요

본 문서는 01-02번 문서의 기술적 문제 해결에 이어, 프로젝트의 전체적인 구조와 각 컴포넌트의 기능을 상세히 분석합니다.

---

## 🏗️ 1. 프로젝트 아키텍처 분석

### 1.1 폴더 구조 상세 분석
```
services/main-site/
├── src/
│   ├── api/
│   │   └── client.ts              # API 클라이언트 설정
│   ├── components/
│   │   ├── Navbar.tsx             # 네비게이션 바
│   │   ├── ProtectedRoute.tsx     # 인증 보호 라우트
│   │   └── RoleProtectedRoute.tsx # 역할 기반 보호 라우트
│   ├── contexts/
│   │   └── AuthContext.tsx        # 인증 상태 관리
│   ├── pages/
│   │   ├── admin/
│   │   │   └── AdminStats.tsx     # 관리자 통계 페이지
│   │   ├── AdminDashboard.tsx     # 관리자 대시보드
│   │   ├── Dashboard.tsx          # 사용자 대시보드
│   │   ├── Forbidden.tsx          # 403 에러 페이지
│   │   ├── Home.tsx               # 메인 포털 페이지
│   │   ├── HomeEditor.tsx         # 홈 편집기 (CMS 기능)
│   │   ├── Login.tsx              # 로그인 페이지
│   │   ├── ProductForm.tsx        # 상품 등록 폼
│   │   ├── ProductList.tsx        # 상품 목록
│   │   ├── Profile.tsx            # 프로필 페이지
│   │   ├── ProfilePage.tsx        # 상세 프로필 페이지
│   │   └── Register.tsx           # 회원가입 페이지
│   ├── services/
│   │   └── api.ts                 # API 서비스 함수들
│   └── App.tsx                    # 메인 앱 컴포넌트
├── public/
├── dist/                          # 빌드 출력 폴더
└── [설정 파일들]
```

### 1.2 기술 스택 심화 분석

**Frontend Framework**
- React 19.1.0 (최신 버전, Concurrent Features 활용)
- TypeScript 5.8.3 (엄격한 타입 검사)
- Vite 6.3.5 (빠른 개발 서버 및 빌드)

**UI/UX Libraries**
- TailwindCSS 4.1.7 (최신 v4, CSS-in-JS 지원)
- Framer Motion 12.15.0 (고급 애니메이션)
- Lucide React 0.511.0 (아이콘 시스템)
- React Toastify 11.0.5 (알림 시스템)

**State Management & Routing**
- React Router DOM 7.6.0 (최신 라우팅)
- React Context API (전역 상태 관리)
- React Hook Form 7.49.3 (폼 관리)

**Data Fetching & API**
- @tanstack/react-query 5.0.0 (서버 상태 관리)
- Axios 1.6.7 (HTTP 클라이언트)
- js-cookie 3.0.5 (쿠키 관리)

---

## 🎨 2. UI/UX 디자인 시스템 분석

### 2.1 홈페이지 디자인 (Home.tsx) 상세 분석

**히어로 섹션**
- **배경:** 그라디언트 (indigo-600 → purple-600 → pink-500)
- **레이아웃:** 좌측 텍스트, 우측 통계 카드
- **애니메이션:** fadeInUp 모션 변형 적용
- **메시지:** "매장 경쟁력의 새로운 기준"

**서비스 카드 섹션**
- **카드 수:** 4개 (E-commerce, Crowdfunding, Forum, Signage)
- **상태:** 모두 "Coming Soon"
- **레이아웃:** 1열(모바일) → 4열(데스크탑) 그리드
- **호버 효과:** Y축 -5px 이동, 그라디언트 오버레이

**기능 소개 섹션**
- **항목:** 4개 기능 (매장 운영 최적화, 데이터 기반 의사결정, 통합 관리 시스템, 고객 경험 향상)
- **아이콘:** Lucide React 컴포넌트 활용
- **색상:** 일관된 indigo-purple 그라디언트

**CTA 섹션**
- **배경:** 히어로와 동일한 그라디언트
- **버튼:** 주요 액션(무료로 시작하기), 보조 액션(문의하기)

### 2.2 반응형 디자인 전략
```css
/* 모바일 우선 접근법 */
grid-cols-1           /* 기본: 1열 */
md:grid-cols-2        /* 중간 화면: 2열 */
lg:grid-cols-4        /* 큰 화면: 4열 */

/* 텍스트 크기 */
text-5xl sm:text-6xl md:text-7xl /* 반응형 제목 크기 */
```

---

## 🔐 3. 인증 시스템 아키텍처

### 3.1 AuthContext 구조 분석

**User 인터페이스**
```typescript
interface User {
  _id: string;
  email: string;
  name: string;
  role: 'user' | 'admin' | 'manager';
  status: 'pending' | 'approved' | 'rejected' | 'suspended';
  businessInfo?: {
    businessName: string;
    businessType: string;
    businessNumber?: string;
    address: string;
    phone: string;
  };
  createdAt: string;
  lastLoginAt?: string;
}
```

**주요 기능들**
1. **로그인 처리:** JWT 토큰 + 사용자 정보 쿠키 저장
2. **자동 로그인:** 페이지 리로드 시 토큰 검증
3. **토큰 만료 처리:** 자동 로그아웃 및 리디렉션
4. **상태별 메시지:** 계정 상태에 따른 차별화된 안내

### 3.2 보호 라우트 시스템

**ProtectedRoute 기본 구조**
```typescript
interface ProtectedRouteProps {
  children: React.ReactNode;
  requireAdmin?: boolean;
}
```

**RoleProtectedRoute 고급 구조**
```typescript
interface RoleProtectedRouteProps {
  allowedRoles: UserRole[];
  children: React.ReactNode;
}
```

---

## 📊 4. 관리자 대시보드 기능 분석

### 4.1 AdminDashboard.tsx 상세 기능

**통계 카드 시스템**
- 총 사용자: 1,234명 (목 데이터)
- 총 주문: 5,678건
- 총 매출: ₩123M
- 성장률: +12.3%

**사용자 관리 테이블**
- **컬럼:** 사용자 정보, 역할, 상태, 가입일, 액션
- **역할 뱃지:** 시각적 구분 (일반/약사/관리자)
- **상태 뱃지:** 색상 코드 (활성/비활성/대기중)
- **액션 버튼:** 편집, 삭제 기능

**페이지네이션 시스템**
- 페이지별 10개 항목 표시
- 현재 페이지 하이라이트
- 총 항목 수 표시

### 4.2 AdminStats.tsx 차트 시스템

**구현된 차트**
- **Bar Chart:** 페이지별 접근 수 통계
- **Pie Chart:** 역할 변경 이력 (유저별)
- **라이브러리:** Chart.js + react-chartjs-2

**목 데이터 구조**
```typescript
const mockAccessLogs = [
  { userId: '1', page: '/admin/user-role-manager', timestamp: 1710000000000 },
  // ...
];
```

---

## 🛣️ 5. 라우팅 시스템 분석

### 5.1 App.tsx 라우트 구조
```typescript
<Routes>
  {/* 공개 라우트 */}
  <Route path="/" element={<Home />} />
  <Route path="/login" element={<Login />} />
  <Route path="/register" element={<Register />} />
  
  {/* 보호 라우트 */}
  <Route path="/dashboard" element={
    <ProtectedRoute>
      <Navbar />
      <Dashboard />
    </ProtectedRoute>
  } />
  
  {/* 관리자 전용 라우트 */}
  <Route path="/admin" element={
    <ProtectedRoute requireAdmin>
      <Navbar />
      <AdminDashboard />
    </ProtectedRoute>
  } />
</Routes>
```

### 5.2 네비게이션 패턴
- **조건부 렌더링:** 인증 상태에 따른 Navbar 표시
- **중첩 라우팅:** 관리자 경로 그룹핑
- **보호 계층:** 다단계 인증 검증

---

## 📁 6. API 서비스 구조

### 6.1 API Client 설정 (client.ts)

**기본 설정**
```typescript
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true,
});
```

**인터셉터 체계**
- **요청 인터셉터:** JWT 토큰 자동 추가
- **응답 인터셉터:** 401 오류 시 자동 로그아웃

### 6.2 API 서비스 분류

**인증 API (authAPI)**
- login, register, getProfile, updateProfile, verifyToken

**관리자 API (adminAPI)**
- getDashboardStats, getUsers, getPendingUsers
- approveUser, rejectUser, suspendUser, reactivateUser

**서비스 API (servicesAPI)**
- getStatus, getAIServices, getRPAServices
- getEcommerceServices, getCrowdfundingServices 등

---

## 📱 7. 추가 페이지 기능 분석

### 7.1 개발된 페이지 목록

**사용자 중심 페이지**
- **Dashboard.tsx:** 사용자 개인 대시보드
- **Profile.tsx / ProfilePage.tsx:** 프로필 관리
- **ProductList.tsx / ProductForm.tsx:** 상품 관리

**관리 페이지**
- **HomeEditor.tsx:** CMS 기능 (홈페이지 편집)
- **Forbidden.tsx:** 접근 권한 없음 페이지

### 7.2 미개발 영역 식별

**필요한 추가 개발**
- Contact 페이지 (CTA 버튼 연결)
- 실제 이커머스 기능
- 크라우드펀딩 플랫폼
- 포럼 시스템
- 디지털 사이니지 관리

---

## 🔍 8. 코드 품질 및 패턴 분석

### 8.1 사용된 React 패턴

**커스텀 훅 활용**
- `useAuth()`: 인증 상태 관리
- `usePermissions()`: 권한 검사

**컴포넌트 구성 패턴**
- Higher-Order Components (보호 라우트)
- Compound Components (폼 구성요소)
- Container/Presentational 분리

### 8.2 타입스크립트 활용도

**인터페이스 정의**
- User, LoginResponse, RegisterData 등 체계적 타입 정의
- Generic 타입 활용 (API 응답)
- Union 타입 활용 (사용자 역할, 상태)

**타입 안전성**
- 엄격한 타입 검사 설정
- 컴포넌트 Props 타입 정의
- API 응답 타입 검증

---

## 📈 9. 성능 및 최적화 현황

### 9.1 적용된 최적화

**번들 최적화**
- Vite 기반 빠른 개발 서버
- ES 모듈 기반 트리 쉐이킹
- 동적 import 준비 (React.lazy 미적용)

**렌더링 최적화**
- Framer Motion을 통한 애니메이션 최적화
- 조건부 렌더링 활용
- 메모이제이션 기법 (부분적 적용)

### 9.2 개선 여지

**성능 개선 기회**
- React.memo() 적용
- useMemo/useCallback 최적화
- 이미지 lazy loading
- 코드 스플리팅 확대

---

## 🎯 10. 프로젝트 완성도 평가

### 10.1 완료된 영역 (80-100%)
- ✅ 기본 프로젝트 구조
- ✅ 홈페이지 UI/UX
- ✅ 인증 시스템 기반
- ✅ 관리자 대시보드
- ✅ 라우팅 시스템
- ✅ API 클라이언트 설정

### 10.2 부분 완료 영역 (50-80%)
- 🔶 타입스크립트 타입 정의
- 🔶 에러 처리 시스템
- 🔶 사용자 프로필 관리
- 🔶 폼 검증 시스템

### 10.3 미완료 영역 (0-50%)
- ❌ 실제 백엔드 연동
- ❌ 테스트 코드
- ❌ 서비스별 세부 기능
- ❌ 프로덕션 최적화

---

## 🚀 11. 개발 우선순위 제안

### 11.1 높은 우선순위 (즉시 진행)
1. **TypeScript 오류 완전 해결**
2. **빌드 성공 및 배포 테스트**
3. **기본 로그인/회원가입 플로우 완성**

### 11.2 중간 우선순위 (1주일 내)
1. **실제 백엔드 API 연동**
2. **에러 바운더리 및 예외 처리**
3. **사용자 권한별 기능 차별화**

### 11.3 낮은 우선순위 (2주일 내)
1. **개별 서비스 모듈 개발**
2. **성능 최적화 및 테스트**
3. **CI/CD 파이프라인 구축**

---

**문서 작성 완료:** 2025-06-07 23:15 KST  
**다음 예정 문서:** 04-typescript-final-resolution.md  
**프로젝트 전체 진행률:** 약 60% 완료
