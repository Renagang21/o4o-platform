# {Business} Web Routing Rules

> **Version**: 1.0
> **Status**: Mandatory (CLAUDE.md 구속 규칙)
> **Created**: {date}

이 문서는 {business}-web의 라우팅 설계 규칙을 정의합니다.

---

## 1. 라우팅 원칙

### 1.1 설계 원칙

| 원칙 | 설명 |
|------|------|
| 비즈니스 의미 중심 | `/resources`, `/categories` (UI 관점) |
| RESTful 아님 | Web 라우트 ≠ API 라우트 |
| 사용자 흐름 중심 | 탐색, 상세, 관리 흐름 |
| 권한 기반 분리 | Public vs Admin |

### 1.2 라우트 분류

| 분류 | 경로 패턴 | 권한 |
|------|-----------|------|
| Public | `/`, `/{entities}` | 없음 |
| Detail | `/{entities}/{id}` | 없음 또는 로그인 |
| Admin | `/admin/*` | {business}:admin |

---

## 2. 허용 라우트 패턴

### 2.1 Public 라우트

```
/                           # 메인 페이지
/{entities}                 # 목록 페이지
/{entities}/{id}            # 상세 페이지
/{entities}/search          # 검색 결과
```

### 2.2 Admin 라우트

```
/admin                      # 관리자 대시보드
/admin/{entities}           # 관리 목록
/admin/{entities}/new       # 등록 페이지
/admin/{entities}/{id}      # 관리 상세/수정
/admin/{entities}/{id}/edit # 수정 페이지 (선택적)
```

### 2.3 예시: {Business} 도메인

```
/                           # {Business} 메인
/resources                  # 리소스 목록
/resources/{id}             # 리소스 상세
/resources/search           # 리소스 검색

/admin                      # 관리자 대시보드
/admin/resources            # 리소스 관리 목록
/admin/resources/new        # 리소스 등록
/admin/resources/{id}       # 리소스 수정
```

---

## 3. 금지 라우트 패턴

### 3.1 절대 금지

| 패턴 | 이유 |
|------|------|
| `/api/*` | Web에서 API 라우트 처리 금지 |
| `/auth/*` | 인증 라우트는 Core 담당 |
| `/users/*` | 사용자 관리는 Core 담당 |
| `/settings/*` | 플랫폼 설정은 Core 담당 |
| `/login`, `/register` | Core Auth UI 사용 |

### 3.2 금지 예시

```typescript
// 금지: API 라우트
// app/api/resources/route.ts  ❌

// 금지: 인증 라우트
// app/auth/login/page.tsx  ❌

// 금지: 사용자 관리
// app/users/page.tsx  ❌
```

---

## 4. Next.js App Router 구조

### 4.1 디렉터리 구조

```
app/
├── layout.tsx              # 루트 레이아웃
├── page.tsx                # 메인 페이지 (/)
├── resources/
│   ├── page.tsx            # 목록 (/resources)
│   ├── search/
│   │   └── page.tsx        # 검색 (/resources/search)
│   └── [id]/
│       └── page.tsx        # 상세 (/resources/{id})
├── admin/
│   ├── layout.tsx          # Admin 레이아웃 (권한 체크)
│   ├── page.tsx            # 대시보드 (/admin)
│   └── resources/
│       ├── page.tsx        # 관리 목록 (/admin/resources)
│       ├── new/
│       │   └── page.tsx    # 등록 (/admin/resources/new)
│       └── [id]/
│           └── page.tsx    # 수정 (/admin/resources/{id})
└── (auth)/                 # 라우트 그룹 (선택적)
    └── callback/
        └── page.tsx        # OAuth 콜백만 허용
```

### 4.2 레이아웃 규칙

```typescript
// app/admin/layout.tsx
export default function AdminLayout({ children }) {
  // 권한 체크 (미들웨어 또는 서버 컴포넌트)
  const session = await getSession();

  if (!session || !hasScope(session, '{business}:admin')) {
    redirect('/');
  }

  return (
    <AdminShell>
      {children}
    </AdminShell>
  );
}
```

---

## 5. 라우트 보호

### 5.1 미들웨어 패턴

```typescript
// middleware.ts
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Admin 라우트 보호
  if (pathname.startsWith('/admin')) {
    const token = request.cookies.get('accessToken');

    if (!token) {
      return NextResponse.redirect(new URL('/login', request.url));
    }

    // 만료 확인만 (서명 검증 금지)
    if (isTokenExpired(token.value)) {
      return NextResponse.redirect(new URL('/login', request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*']
};
```

### 5.2 서버 컴포넌트 패턴

```typescript
// app/admin/resources/page.tsx
export default async function AdminResourcesPage() {
  const session = await getSession();

  if (!session) {
    redirect('/login');
  }

  if (!hasScope(session, '{business}:admin')) {
    redirect('/');
  }

  const resources = await {business}Api.admin.resources.list();

  return <ResourcesTable data={resources} />;
}
```

---

## 6. API Base URL 설정

### 6.1 환경변수 사용

```typescript
// lib/api-config.ts

// 서버 사이드
export const API_BASE_URL = process.env.{BUSINESS}_API_URL;

// 클라이언트 사이드
export const CLIENT_API_URL = process.env.NEXT_PUBLIC_{BUSINESS}_API_URL;

// 금지: 하드코딩
const API_URL = 'https://api.example.com';  // ❌
```

### 6.2 API 클라이언트 설정

```typescript
// services/{business}-api.ts
import { CLIENT_API_URL } from '@/lib/api-config';

export const {business}Api = {
  resources: {
    list: () => fetch(`${CLIENT_API_URL}/{business}/resources`),
    get: (id: string) => fetch(`${CLIENT_API_URL}/{business}/resources/${id}`),
  },
  admin: {
    resources: {
      list: () => fetch(`${CLIENT_API_URL}/{business}/admin/resources`),
      create: (data) => fetch(`${CLIENT_API_URL}/{business}/admin/resources`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    },
  },
};
```

---

## 7. 네비게이션 규칙

### 7.1 링크 패턴

```typescript
// 허용: Next.js Link
import Link from 'next/link';

<Link href="/resources">목록</Link>
<Link href={`/resources/${id}`}>상세</Link>

// 금지: 하드코딩 외부 URL
<a href="https://other-site.com/resources">  // ❌
```

### 7.2 프로그래매틱 네비게이션

```typescript
// 허용: Next.js router
import { useRouter } from 'next/navigation';

const router = useRouter();
router.push('/resources');
router.push(`/resources/${id}`);

// 금지: window.location
window.location.href = '/resources';  // ❌
```

---

## 8. 참조 문서

- docs/architecture/business-web-template.md
- docs/services/{business}/web-rules.md
- CLAUDE.md §16 Business Web Template Rules

---

*이 문서는 {business}-web의 라우팅 표준입니다.*
