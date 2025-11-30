# O4O Platform - 모바일 앱 개발 조사 보고서 (v1.0)

**작성일:** 2025-11-30
**브랜치:** develop
**조사 범위:** 모바일 앱 확장 가능성 및 WebView 적용 검토

---

## 📋 목차

1. [Executive Summary](#1-executive-summary)
2. [플랫폼 기술 구조 분석](#2-플랫폼-기술-구조-분석)
3. [WebView 호환성 평가](#3-webview-호환성-평가)
4. [인증 시스템 분석](#4-인증-시스템-분석)
5. [API 연결 및 CORS 정책](#5-api-연결-및-cors-정책)
6. [브라우저 기능 의존성](#6-브라우저-기능-의존성)
7. [서비스별 기능 현황](#7-서비스별-기능-현황)
8. [모바일 앱 개발 방식 비교](#8-모바일-앱-개발-방식-비교)
9. [앱스토어 심사 기준](#9-앱스토어-심사-기준)
10. [네이티브 기능 요구사항](#10-네이티브-기능-요구사항)
11. [보안 및 정책 고려사항](#11-보안-및-정책-고려사항)
12. [권장사항 및 다음 단계](#12-권장사항-및-다음-단계)

---

## 1. Executive Summary

### 1.1 조사 결과 요약

O4O Platform은 **WebView 기반 하이브리드 앱 개발에 매우 적합한 구조**를 가지고 있습니다.

**주요 발견사항:**
- ✅ React SPA 구조로 WebView에서 완벽 실행 가능
- ✅ 쿠키 기반 인증 시스템 (WebView와 호환)
- ✅ CORS 설정이 유연하게 구성되어 있음
- ⚠️ localStorage 의존도 높음 (85개 파일, 372회 사용)
- ⚠️ 일부 네이티브 기능 필요 (카메라, 푸시 알림)

### 1.2 권장 개발 방식

**🎯 CapacitorJS 기반 하이브리드 앱** (WebView + 네이티브 플러그인)

**이유:**
1. 기존 React 코드 재사용 가능 (95%+)
2. 빠른 개발 (2-3주면 MVP 가능)
3. 웹 업데이트 시 앱 자동 반영
4. 앱스토어 심사 통과 가능
5. 1인 개발환경에 최적

### 1.3 예상 작업량

| 단계 | 작업 내용 | 예상 기간 |
|------|----------|----------|
| **Phase 1** | Capacitor 프로젝트 초기화 | 1-2일 |
| **Phase 2** | 네이티브 기능 통합 (푸시, 카메라) | 3-5일 |
| **Phase 3** | iOS/Android 빌드 설정 | 2-3일 |
| **Phase 4** | 앱스토어 제출 준비 | 3-5일 |
| **Phase 5** | 심사 및 배포 | 1-2주 |
| **총 예상 기간** | | **3-4주** |

---

## 2. 플랫폼 기술 구조 분석

### 2.1 전체 아키텍처

```
o4o-platform/
├─ apps/
│  ├─ admin-dashboard/    # 관리자 대시보드 (React + Vite)
│  ├─ main-site/          # B2C 메인 사이트 (React + Vite)
│  └─ api-server/         # API 서버 (Node.js + TypeORM)
├─ packages/              # 공유 라이브러리
│  ├─ @o4o/auth-client    # 인증 클라이언트
│  ├─ @o4o/appearance-system  # 디자인 시스템
│  ├─ @o4o/shortcodes     # 숏코드 엔진
│  └─ ...
└─ 배포:
   ├─ Admin: https://admin.neture.co.kr
   ├─ Main: https://www.neture.co.kr
   └─ API: https://api.neture.co.kr
```

### 2.2 기술 스택

#### Frontend (React Apps)
| 기술 | 버전 | 용도 | WebView 호환성 |
|------|------|------|----------------|
| **React** | 18.2.0 | UI 프레임워크 | ✅ 완벽 호환 |
| **Vite** | 5.4.19 | 빌드 도구 | ✅ SPA 빌드 가능 |
| **React Router** | 7.6.0 | 클라이언트 라우팅 | ✅ Hash 모드 사용 가능 |
| **Axios** | 1.10.0 | HTTP 클라이언트 | ✅ WebView 사용 가능 |
| **Zustand** | 5.0.5 | 상태 관리 | ✅ 메모리 기반 |
| **TailwindCSS** | 3.4.17 | 스타일링 | ✅ CSS 호환 |
| **Tanstack Query** | 5.x | 서버 상태 관리 | ✅ 완벽 호환 |

#### Backend (API Server)
- **Node.js** 22.18.0
- **Express** + **TypeORM**
- **PostgreSQL** 데이터베이스
- **JWT** 인증 (쿠키 기반)

### 2.3 Monorepo 구조

**Workspace Manager:** pnpm (9.x)

**공유 패키지:**
- `@o4o/types` - TypeScript 타입 정의
- `@o4o/utils` - 유틸리티 함수
- `@o4o/ui` - 공통 UI 컴포넌트
- `@o4o/auth-client` - 인증 클라이언트
- `@o4o/appearance-system` - 디자인 토큰 시스템

**모바일 앱 추가 시 구조:**
```
apps/
└─ mobile-app/          # ✨ 신규 추가
   ├─ ios/              # iOS 네이티브 프로젝트
   ├─ android/          # Android 네이티브 프로젝트
   ├─ src/              # 공유 React 코드 (재사용)
   └─ capacitor.config.ts
```

---

## 3. WebView 호환성 평가

### 3.1 React SPA 라우팅

**현재 구성:**
```typescript
// apps/admin-dashboard/src/App.tsx
import { BrowserRouter } from 'react-router-dom';

<BrowserRouter>
  <Routes>
    <Route path="/dashboard" element={<Dashboard />} />
    <Route path="/posts" element={<Posts />} />
    {/* ... */}
  </Routes>
</BrowserRouter>
```

**WebView 호환성:** ✅ **완벽 호환**
- BrowserRouter는 HTML5 History API 사용
- WebView도 동일한 API 지원
- 필요 시 HashRouter로 전환 가능 (더 안정적)

**권장:**
```typescript
// 모바일 앱에서는 HashRouter 사용
<HashRouter>  {/* URL: #/dashboard */}
  <Routes>...</Routes>
</HashRouter>
```

### 3.2 디자인 시스템 (Appearance System)

**구조:**
```
packages/appearance-system/
├─ tokens/            # 디자인 토큰 (색상, 타이포그래피)
├─ themes/            # 테마 시스템
└─ components/        # 스타일 컴포넌트
```

**WebView 호환성:** ✅ **완벽 호환**
- CSS 변수 기반 테마 시스템
- TailwindCSS (모바일 최적화 가능)
- 반응형 디자인 지원

### 3.3 Shortcode 엔진

**동적 컴포넌트 로딩:**
```typescript
// @o4o/shortcodes
[user_dashboard]  → UserDashboard 컴포넌트 렌더링
[product_list category="cosmetics"] → ProductList 컴포넌트 렌더링
```

**WebView 호환성:** ✅ **호환 (주의사항 있음)**
- 동적 import() 사용 → WebView 지원
- ⚠️ 코드 스플리팅 청크 로딩 시 네트워크 필요
- 권장: 앱 번들에 주요 숏코드 포함

### 3.4 이미지 업로드 / 파일 첨부

**현재 구현:**
```typescript
// react-dropzone 사용
<Dropzone onDrop={handleFileUpload}>
  {/* 드래그 앤 드롭 또는 파일 선택 */}
</Dropzone>
```

**WebView 호환성:** ⚠️ **네이티브 플러그인 필요**
- 웹 파일 input은 제한적
- **Capacitor Camera Plugin** 필요
- **Capacitor Filesystem Plugin** 필요

---

## 4. 인증 시스템 분석

### 4.1 CookieAuthClient 구조

**파일:** `packages/auth-client/src/cookie-client.ts`

```typescript
export class CookieAuthClient {
  constructor(baseURL: string) {
    this.api = axios.create({
      baseURL: this.baseURL,
      withCredentials: true,  // ✅ 쿠키 전송
    });
  }

  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    const response = await this.api.post('/auth/cookie/login', credentials);
    // 쿠키에 JWT 저장 (서버에서 Set-Cookie)
    return response.data;
  }

  async refreshToken(): Promise<boolean> {
    // 리프레시 토큰으로 액세스 토큰 갱신
    await this.api.post('/auth/cookie/refresh');
  }
}
```

### 4.2 WebView 쿠키 처리

**iOS (WKWebView):**
```swift
// ✅ 자동 지원 (iOS 11+)
WKWebViewConfiguration().websiteDataStore.httpCookieStore
```

**Android (WebView):**
```kotlin
// ✅ 자동 지원
CookieManager.getInstance().setAcceptCookie(true)
```

**Capacitor 설정:**
```typescript
// capacitor.config.ts
{
  server: {
    androidScheme: 'https',  // ✅ 쿠키 작동 위해 필요
    iosScheme: 'https',
    allowNavigation: [
      'api.neture.co.kr',
      'neture.co.kr'
    ]
  }
}
```

### 4.3 localStorage 토큰 관리

**현재 사용:**
```typescript
// apps/admin-dashboard/src/lib/api-client.ts (line 15-17)
const token = localStorage.getItem('accessToken') ||
              localStorage.getItem('token') ||
              localStorage.getItem('authToken');
```

**WebView 호환성:** ✅ **완벽 지원**
- iOS WKWebView: localStorage 지원
- Android WebView: localStorage 지원
- 주의: 앱 삭제 시 데이터도 삭제됨

### 4.4 세션 유지

**현재 메커니즘:**
1. 쿠키에 `accessToken` (1시간)
2. 쿠키에 `refreshToken` (7일)
3. 401 에러 시 자동 갱신
4. localStorage에 사용자 정보 캐시

**WebView 적용:** ✅ **그대로 사용 가능**

---

## 5. API 연결 및 CORS 정책

### 5.1 API Base URL 설정

**환경변수:**
```bash
# apps/admin-dashboard/.env.production
VITE_API_URL=https://api.neture.co.kr/api
VITE_API_BASE_URL=https://api.neture.co.kr
VITE_AUTH_URL=https://api.neture.co.kr

# apps/main-site/.env.production
VITE_API_URL=https://api.neture.co.kr/api/v1
```

**클라이언트 초기화:**
```typescript
// apps/admin-dashboard/src/lib/api-client.ts
const baseURL = import.meta.env.VITE_API_URL || 'https://api.neture.co.kr';

export const apiClient = axios.create({
  baseURL,
  headers: { 'Content-Type': 'application/json' },
});
```

### 5.2 CORS 설정

**API 서버:** `apps/api-server/src/main.ts` (line 138-160)

```typescript
const corsOptions: CorsOptions = {
  origin: function (origin, callback) {
    const allowedOrigins = [
      // 개발 환경
      "http://localhost:3000", "http://localhost:3001",
      "http://localhost:5173", "http://localhost:5174",

      // 프로덕션
      "https://neture.co.kr",
      "https://www.neture.co.kr",
      "https://admin.neture.co.kr",
      "https://dev-admin.neture.co.kr",
      "https://api.neture.co.kr",

      // IP 주소
      "http://13.125.144.8",
    ];

    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,  // ✅ 쿠키 전송 허용
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
};

app.use(cors(corsOptions));
```

### 5.3 모바일 앱 CORS 처리

**문제:**
- 모바일 앱에서는 `Origin` 헤더가 `capacitor://` 또는 `file://`
- 기존 CORS 설정에 없음

**해결책:**

```typescript
// API 서버 CORS 설정 업데이트 필요
const allowedOrigins = [
  // ... 기존 도메인 ...

  // ✨ 모바일 앱 추가
  "capacitor://localhost",     // iOS
  "http://localhost",          // Android (capacitor.config.ts에서 설정)
  "https://localhost",         // Android HTTPS 스킴
];
```

또는 Capacitor 설정에서 웹 도메인 사용:

```typescript
// capacitor.config.ts
{
  server: {
    url: 'https://neture.co.kr',  // 프로덕션 웹 URL 직접 사용
    cleartext: true,
  }
}
```

### 5.4 다중 도메인 지원

**현재 서비스:**
- `neture.co.kr` - 메인 B2C 사이트
- `admin.neture.co.kr` - 관리자 대시보드
- `api.neture.co.kr` - API 서버

**모바일 앱 전략:**
1. **통합 앱** (권장): 하나의 앱에서 모든 서비스 접근
   - 초기 화면에서 서비스 선택
   - 역할(role)에 따라 자동 라우팅
2. **분리 앱**: 서비스별 개별 앱 (향후 고려)

---

## 6. 브라우저 기능 의존성

### 6.1 localStorage 사용 현황

**통계:**
- 파일 수: 85개
- 사용 횟수: 372회

**주요 용도:**
```typescript
// 1. 인증 토큰 저장
localStorage.setItem('accessToken', token);
localStorage.setItem('refreshToken', refreshToken);

// 2. 사용자 설정
localStorage.setItem('theme', 'dark');
localStorage.setItem('language', 'ko');

// 3. 대시보드 레이아웃
localStorage.setItem('dashboardLayout', JSON.stringify(layout));

// 4. 에디터 자동 저장
localStorage.setItem('draft-post-123', content);

// 5. 캐시 데이터
localStorage.setItem('categories-cache', JSON.stringify(categories));
```

**WebView 호환성:** ✅ **완벽 지원**
- 용량 제한: ~5-10MB (충분)
- 앱 삭제 시 데이터 삭제 (정상 동작)

### 6.2 Service Worker 사용

**현재 상태:** ❌ **미사용**

**확인:**
```bash
$ grep -r "serviceWorker" apps/
# 결과 없음
```

**결론:** Service Worker 의존성 없음 → 문제 없음

### 6.3 카메라 / 파일 접근

**현재 구현:**
```typescript
// react-dropzone 사용 (14.3.8)
<Dropzone
  accept={{ 'image/*': ['.png', '.jpg', '.jpeg'] }}
  onDrop={handleDrop}
>
  <input type="file" accept="image/*" />
</Dropzone>
```

**WebView 제한:**
- ⚠️ iOS: 파일 선택기 제한적
- ⚠️ Android: 권한 필요

**해결책: Capacitor Camera Plugin**
```typescript
import { Camera, CameraResultType } from '@capacitor/camera';

const takePicture = async () => {
  const image = await Camera.getPhoto({
    quality: 90,
    allowEditing: true,
    resultType: CameraResultType.Base64
  });

  // Base64 데이터를 서버에 업로드
  uploadImage(image.base64String);
};
```

### 6.4 GPS / 위치 서비스

**현재 구현:** ❌ **미사용**

**향후 필요 여부:**
- Yaksa 앱: 지역 기반 방문 인증 → ✅ **필요**
- 여행자 서비스: GPS 기반 위치 → ✅ **필요**

**Capacitor Geolocation Plugin:**
```typescript
import { Geolocation } from '@capacitor/geolocation';

const getCurrentPosition = async () => {
  const coordinates = await Geolocation.getCurrentPosition();
  return {
    lat: coordinates.coords.latitude,
    lng: coordinates.coords.longitude,
  };
};
```

### 6.5 푸시 알림

**현재 구현:** ❌ **없음 (Socket.IO 실시간 알림만 있음)**

**WebView 제한:**
- Web Push API는 모바일 WebView에서 작동 안 함
- FCM (Firebase Cloud Messaging) 필요

**Capacitor Push Notifications Plugin:**
```typescript
import { PushNotifications } from '@capacitor/push-notifications';

await PushNotifications.requestPermissions();
await PushNotifications.register();

PushNotifications.addListener('pushNotificationReceived', (notification) => {
  // 알림 수신 처리
});
```

---

## 7. 서비스별 기능 현황

### 7.1 Admin Dashboard (관리자)

**페이지 수:** 100+ 페이지

**주요 기능:**
| 기능 | 구현 여부 | WebView 호환 | 네이티브 기능 필요 |
|------|-----------|--------------|-------------------|
| 대시보드 | ✅ | ✅ | - |
| 포스트 관리 | ✅ | ✅ | - |
| 미디어 업로드 | ✅ | ⚠️ | ✅ Camera Plugin |
| 사용자 관리 | ✅ | ✅ | - |
| 주문 관리 | ✅ | ✅ | - |
| 알림 | ⚠️ (Socket.IO) | ✅ | ✅ Push Notifications |
| 앱 마켓 | ✅ | ✅ | - |
| 포럼 관리 | ✅ | ✅ | - |
| 통계/차트 | ✅ (Recharts) | ✅ | - |

**모바일 최적화 필요도:** 🟡 **중간**
- 대부분 관리자용 → 태블릿 사용 가능
- 일부 페이지는 반응형 개선 필요

### 7.2 Main Site (B2C)

**서비스:** Neture 화장품 쇼핑몰

**주요 기능:**
| 기능 | 구현 여부 | WebView 호환 | 네이티브 기능 필요 |
|------|-----------|--------------|-------------------|
| 상품 목록/상세 | ✅ | ✅ | - |
| 장바구니 | ✅ | ✅ | - |
| 주문/결제 | ✅ (Toss Payments) | ✅ | ⚠️ 인앱 결제 정책 확인 필요 |
| 리뷰 작성 | ✅ | ⚠️ | ✅ Camera (사진 첨부) |
| 마이페이지 | ✅ | ✅ | - |
| 알림 | ⚠️ | - | ✅ Push Notifications |
| 소셜 로그인 | ✅ | ⚠️ | OAuth 리다이렉트 처리 |

**모바일 최적화 필요도:** 🟢 **높음**
- 이미 반응형 디자인 적용
- 터치 UI 최적화됨

### 7.3 Yaksa Site (약사회)

**도메인:** yaksa.site (현재 neture.co.kr 서브 경로 추정)

**예상 기능:**
| 기능 | 예상 필요성 | 네이티브 기능 |
|------|------------|--------------|
| 공지사항 | ✅ | - |
| 교육 이수 | ✅ | - |
| 지역 방문 인증 | ✅ | ✅ GPS + QR 스캔 |
| 회원 정보 동기화 | ✅ | - |

**네이티브 플러그인:**
- Geolocation
- Barcode Scanner (QR 체크인)

### 7.4 Dropshipping 서비스

**역할:** Supplier, Seller, Partner, Affiliate

**주요 기능:**
| 기능 | 구현 여부 | WebView 호환 | 네이티브 기능 |
|------|-----------|--------------|--------------|
| 대시보드 | ✅ | ✅ | - |
| 상품 등록 | ✅ | ⚠️ | ✅ Camera |
| 재고 관리 | ✅ | ✅ | - |
| 주문 알림 | ⚠️ | - | ✅ Push Notifications |
| 바코드 스캔 | ❌ | - | ✅ Barcode Scanner |
| 정산 관리 | ✅ | ✅ | - |

**모바일 최적화 필요도:** 🔴 **매우 높음**
- 판매자/공급자는 모바일 사용 필수
- 실시간 주문 알림 중요

---

## 8. 모바일 앱 개발 방식 비교

### 8.1 옵션 1: WebView 기반 하이브리드 앱 (CapacitorJS) ✅ **권장**

**구조:**
```
apps/mobile-app/
├─ capacitor.config.ts      # Capacitor 설정
├─ ios/                      # iOS 네이티브 프로젝트
│  └─ App/
│     └─ App/
│        ├─ AppDelegate.swift
│        └─ capacitor.config.json
├─ android/                  # Android 네이티브 프로젝트
│  └─ app/
│     └─ src/
│        └─ main/
│           ├─ java/
│           └─ res/
└─ www/                      # 빌드된 React 앱 (Vite 출력)
```

**장점:**
- ✅ 기존 React 코드 95% 재사용
- ✅ 빠른 개발 (2-3주 MVP)
- ✅ 웹 업데이트 시 앱 자동 반영
- ✅ 네이티브 플러그인 사용 가능
- ✅ 앱스토어 심사 통과 가능
- ✅ 유지보수 간편 (웹 + 앱 동시 업데이트)

**단점:**
- ⚠️ 네이티브 수준 성능은 아님 (충분히 빠르긴 함)
- ⚠️ 고급 네이티브 기능 제한적
- ⚠️ 앱 크기 다소 큼 (~30-50MB)

**필요한 플러그인:**
```bash
pnpm add @capacitor/core @capacitor/cli
pnpm add @capacitor/ios @capacitor/android
pnpm add @capacitor/camera         # 카메라/갤러리
pnpm add @capacitor/push-notifications  # 푸시 알림
pnpm add @capacitor/geolocation    # GPS
pnpm add @capacitor/filesystem     # 파일 저장
pnpm add @capacitor-community/barcode-scanner  # QR/바코드
```

**비용:** 무료 (MIT 라이선스)

### 8.2 옵션 2: PWA (Progressive Web App) ❌ **비권장**

**장점:**
- ✅ 앱스토어 필요 없음
- ✅ 웹과 100% 동일

**단점:**
- ❌ iOS에서 기능 제한 (푸시 알림 불가)
- ❌ 앱스토어에 등록 불가
- ❌ 네이티브 기능 접근 제한
- ❌ 백그라운드 동작 제한

**결론:** o4o-platform에는 부적합

### 8.3 옵션 3: React Native ❌ **비권장 (현 단계)**

**장점:**
- ✅ 네이티브 수준 성능
- ✅ 풍부한 생태계

**단점:**
- ❌ 완전히 새로운 코드베이스
- ❌ 개발 기간 2-3개월 (전체 재작성)
- ❌ 유지보수 부담 (웹 + 앱 별도 관리)
- ❌ 1인 개발환경에 부적합

**결론:** 향후 네이티브 전환 시 고려

---

## 9. 앱스토어 심사 기준

### 9.1 Apple App Store 기준

**WebView 앱 허용 조건:**
1. ✅ **자체 콘텐츠** 제공
   - ✅ o4o-platform은 자체 서비스
   - ❌ 단순 웹사이트 wrapper 금지
2. ✅ **네이티브 기능** 최소 1개 이상
   - ✅ 푸시 알림
   - ✅ 카메라 업로드
   - ✅ GPS 위치 서비스
3. ✅ **앱 내 설정 메뉴**
   - 버전 정보
   - 로그아웃
   - 알림 설정
   - 개인정보 처리방침
4. ⚠️ **인앱 결제 정책**
   - Toss Payments 사용 중 → Apple 정책 확인 필요
   - 디지털 콘텐츠는 In-App Purchase 필수
   - 물리적 상품은 외부 결제 허용

**필수 문서:**
- 개인정보 처리방침 URL
- 이용약관 URL
- 앱 설명 및 스크린샷
- 테스트 계정 정보

### 9.2 Google Play Store 기준

**WebView 앱 허용 조건:**
1. ✅ **독립적인 앱**
   - ✅ o4o-platform은 조건 충족
2. ✅ **웹사이트와 차별화**
   - ✅ 네이티브 기능 (푸시, 카메라)
   - ✅ 앱 전용 UI
3. ✅ **HTTPS 사용**
   - ✅ 이미 HTTPS 사용 중
4. ✅ **개인정보 보호**
   - Privacy Policy 링크
   - 권한 설명

**Google Play 정책은 Apple보다 관대함**

### 9.3 심사 통과를 위한 체크리스트

**필수 네이티브 기능:**
- [ ] 푸시 알림 (Firebase FCM)
- [ ] 카메라/갤러리 업로드
- [ ] 네이티브 설정 화면
- [ ] 앱 버전 정보
- [ ] 로그아웃 기능

**필수 문서:**
- [ ] 개인정보 처리방침
- [ ] 이용약관
- [ ] 앱 아이콘 (512x512, 1024x1024)
- [ ] 스크린샷 (최소 3장)
- [ ] 앱 설명 (한글/영문)

**권한 설명:**
- [ ] 카메라: "프로필 사진 및 상품 이미지 촬영"
- [ ] 저장소: "이미지 업로드 및 다운로드"
- [ ] 위치: "약사 방문 인증 및 지역 서비스"
- [ ] 알림: "주문 상태 및 중요 공지 전달"

---

## 10. 네이티브 기능 요구사항

### 10.1 공통 필수 기능 (모든 서비스)

#### 1. 푸시 알림

**용도:**
- 주문 상태 업데이트
- 관리자 공지
- 드랍쉬핑 판매 알림
- 커뮤니티 댓글/좋아요

**구현:**
```typescript
// Firebase Cloud Messaging 설정
// capacitor.config.ts
{
  plugins: {
    PushNotifications: {
      presentationOptions: ["badge", "sound", "alert"]
    }
  }
}

// 푸시 토큰 등록
import { PushNotifications } from '@capacitor/push-notifications';

await PushNotifications.register();

PushNotifications.addListener('registration', (token) => {
  // 토큰을 서버에 전송
  apiClient.post('/users/fcm-token', { token: token.value });
});

PushNotifications.addListener('pushNotificationReceived', (notification) => {
  // 알림 수신 처리
  showNotification(notification.title, notification.body);
});
```

#### 2. 카메라 / 갤러리

**용도:**
- 프로필 사진 업로드
- 상품 이미지 업로드
- 리뷰 사진 첨부

**구현:**
```typescript
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';

// 카메라로 촬영
const takePicture = async () => {
  const image = await Camera.getPhoto({
    quality: 90,
    allowEditing: true,
    resultType: CameraResultType.Base64,
    source: CameraSource.Camera  // 카메라 직접 촬영
  });

  return image.base64String;
};

// 갤러리에서 선택
const pickFromGallery = async () => {
  const image = await Camera.getPhoto({
    quality: 90,
    allowEditing: true,
    resultType: CameraResultType.Base64,
    source: CameraSource.Photos  // 갤러리 선택
  });

  return image.base64String;
};
```

#### 3. 파일 저장 / 다운로드

**용도:**
- 정산서 다운로드
- 주문서 저장
- 이미지 캐시

**구현:**
```typescript
import { Filesystem, Directory } from '@capacitor/filesystem';

const saveFile = async (filename: string, data: string) => {
  await Filesystem.writeFile({
    path: filename,
    data: data,
    directory: Directory.Documents
  });
};

const readFile = async (filename: string) => {
  const contents = await Filesystem.readFile({
    path: filename,
    directory: Directory.Documents
  });
  return contents.data;
};
```

### 10.2 서비스별 특화 기능

#### Yaksa (약사회) 서비스

**1. GPS 위치 인증**

```typescript
import { Geolocation } from '@capacitor/geolocation';

const checkInLocation = async () => {
  const position = await Geolocation.getCurrentPosition();

  // 서버에 위치 전송 (방문 인증)
  await apiClient.post('/yaksa/check-in', {
    lat: position.coords.latitude,
    lng: position.coords.longitude,
    timestamp: new Date().toISOString()
  });
};
```

**2. QR 체크인**

```typescript
import { BarcodeScanner } from '@capacitor-community/barcode-scanner';

const scanQRCode = async () => {
  const result = await BarcodeScanner.startScan();

  if (result.hasContent) {
    // QR 코드 데이터 처리
    await apiClient.post('/yaksa/qr-check-in', {
      qrData: result.content
    });
  }
};
```

#### Dropshipping 서비스

**1. 바코드 스캔 (상품 등록)**

```typescript
const scanProductBarcode = async () => {
  const result = await BarcodeScanner.startScan();

  if (result.hasContent) {
    // 바코드로 상품 조회
    const product = await apiClient.get(`/products/barcode/${result.content}`);
    return product.data;
  }
};
```

**2. 실시간 주문 알림 (백그라운드)**

```typescript
// Background Task Plugin
import { BackgroundTask } from '@capacitor-community/background-task';

BackgroundTask.beforeExit(async () => {
  // 백그라운드에서 주문 확인
  const orders = await apiClient.get('/orders/pending');

  if (orders.data.length > 0) {
    // 로컬 알림 발송
    await LocalNotifications.schedule({
      notifications: [{
        title: '새 주문 도착',
        body: `${orders.data.length}건의 새 주문이 있습니다.`,
        id: 1
      }]
    });
  }

  BackgroundTask.finish();
});
```

#### 여행자 서비스 (미래)

**1. 지도 통합**

```typescript
// 네이티브 지도 또는 Google Maps WebView
import { Geolocation } from '@capacitor/geolocation';

const showNearbyPlaces = async () => {
  const position = await Geolocation.getCurrentPosition();

  // 현재 위치 기반 주변 장소 표시
  const places = await apiClient.get('/places/nearby', {
    params: {
      lat: position.coords.latitude,
      lng: position.coords.longitude,
      radius: 5000  // 5km
    }
  });

  return places.data;
};
```

---

## 11. 보안 및 정책 고려사항

### 11.1 HTTPS 요구사항

**현재 상태:** ✅ **모든 도메인 HTTPS 사용**
- `https://neture.co.kr`
- `https://admin.neture.co.kr`
- `https://api.neture.co.kr`

**앱 설정:**
```typescript
// capacitor.config.ts
{
  server: {
    androidScheme: 'https',  // ✅ HTTPS 스킴 사용
    iosScheme: 'https',
    cleartext: false,         // HTTP 차단
  }
}
```

**Mixed Content 방지:**
- 모든 리소스 (이미지, CSS, JS) HTTPS로 로드
- HTTP 리소스는 자동 차단됨

### 11.2 쿠키 정책

**현재 설정:**
```typescript
// API 서버 (apps/api-server/src/main.ts)
app.use(cookieParser());

app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',  // HTTPS only
    httpOnly: true,   // XSS 방지
    sameSite: 'lax',  // CSRF 방지
    maxAge: 7 * 24 * 60 * 60 * 1000  // 7일
  }
}));
```

**WebView 호환:**
- ✅ `httpOnly: true` → WebView에서도 작동
- ✅ `sameSite: 'lax'` → 모바일 앱에서 문제 없음
- ✅ `secure: true` → HTTPS 스킴 사용 시 필요

### 11.3 CORS 정책

**모바일 앱 추가 필요:**

```typescript
// apps/api-server/src/main.ts 수정
const allowedOrigins = [
  // ... 기존 도메인 ...

  // ✨ 모바일 앱 추가
  "capacitor://localhost",     // iOS Capacitor
  "http://localhost",          // Android Capacitor
  "https://localhost",         // Android HTTPS
];
```

또는 Capacitor 서버 URL 사용:

```typescript
// capacitor.config.ts
{
  server: {
    url: 'https://neture.co.kr',  // 프로덕션 도메인 직접 사용
    // CORS 문제 없음
  }
}
```

### 11.4 개인정보 보호 요구사항

**앱스토어 제출 시 필수:**

1. **개인정보 처리방침 URL**
   - 예: `https://neture.co.kr/privacy`
   - 필수 항목:
     - 수집하는 정보
     - 사용 목적
     - 보관 기간
     - 제3자 제공 여부
     - 사용자 권리

2. **권한 사용 설명**
   - 카메라: "상품 사진 촬영 및 프로필 이미지 업로드"
   - 위치: "약사 방문 인증 및 지역 기반 서비스"
   - 알림: "주문 상태 및 중요 공지 전달"
   - 저장소: "이미지 저장 및 다운로드"

3. **iOS Info.plist 권한 설명:**
```xml
<key>NSCameraUsageDescription</key>
<string>상품 사진을 촬영하고 프로필 이미지를 업로드하기 위해 카메라 접근이 필요합니다.</string>

<key>NSPhotoLibraryUsageDescription</key>
<string>이미지를 선택하여 업로드하기 위해 사진 라이브러리 접근이 필요합니다.</string>

<key>NSLocationWhenInUseUsageDescription</key>
<string>약사 방문 인증 및 지역 기반 서비스를 제공하기 위해 위치 정보가 필요합니다.</string>
```

4. **Android AndroidManifest.xml 권한:**
```xml
<uses-permission android:name="android.permission.CAMERA" />
<uses-permission android:name="android.permission.READ_EXTERNAL_STORAGE" />
<uses-permission android:name="android.permission.WRITE_EXTERNAL_STORAGE" />
<uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />
<uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION" />
<uses-permission android:name="android.permission.POST_NOTIFICATIONS" />
```

### 11.5 인앱 결제 정책

**현재:** Toss Payments 사용

**Apple App Store 정책:**
- ❌ **디지털 콘텐츠**: In-App Purchase 필수
- ✅ **물리적 상품**: 외부 결제 허용

**o4o-platform 상황:**
- Neture (화장품): 물리적 상품 → ✅ **Toss Payments 사용 가능**
- 드랍쉬핑 상품: 물리적 상품 → ✅ **Toss Payments 사용 가능**

**주의사항:**
- 디지털 콘텐츠 판매 시 In-App Purchase 필요
- 수수료 30% (Apple), 15% (Google)

---

## 12. 권장사항 및 다음 단계

### 12.1 권장 개발 방식

**🎯 CapacitorJS 기반 하이브리드 앱 개발**

**근거:**
1. ✅ 기존 코드 95% 재사용
2. ✅ 빠른 MVP (2-3주)
3. ✅ 웹 업데이트 시 앱 자동 반영
4. ✅ 앱스토어 심사 통과 가능
5. ✅ 네이티브 기능 확장 가능
6. ✅ 1인 개발환경에 최적

### 12.2 단계별 실행 계획

#### Phase 1: 프로젝트 초기화 (2-3일)

**작업 내용:**
```bash
# 1. Capacitor 설치
cd o4o-platform
pnpm add -D @capacitor/cli
pnpm add @capacitor/core

# 2. Capacitor 초기화
npx cap init

# 3. iOS/Android 플랫폼 추가
pnpm add @capacitor/ios @capacitor/android
npx cap add ios
npx cap add android

# 4. 필수 플러그인 설치
pnpm add @capacitor/camera \
         @capacitor/push-notifications \
         @capacitor/geolocation \
         @capacitor/filesystem \
         @capacitor-community/barcode-scanner
```

**산출물:**
- `apps/mobile-app/capacitor.config.ts`
- `apps/mobile-app/ios/` (Xcode 프로젝트)
- `apps/mobile-app/android/` (Android Studio 프로젝트)

#### Phase 2: React 앱 통합 (3-5일)

**작업 내용:**
1. admin-dashboard 또는 main-site 빌드 설정
2. Capacitor `www` 폴더에 출력
3. 네이티브 플러그인 래퍼 작성
4. 환경변수 설정

**예시 구조:**
```
apps/mobile-app/
├─ src/
│  ├─ plugins/
│  │  ├─ camera.ts         # Camera Plugin 래퍼
│  │  ├─ push.ts           # Push Notifications 래퍼
│  │  └─ geolocation.ts    # Geolocation 래퍼
│  └─ App.tsx              # main-site 재사용
├─ capacitor.config.ts
└─ vite.config.ts          # main-site 설정 복사
```

#### Phase 3: 네이티브 기능 구현 (5-7일)

**1. 푸시 알림**
- Firebase 프로젝트 생성
- FCM 설정 (iOS/Android)
- 푸시 토큰 등록 API
- 알림 수신 처리

**2. 카메라 업로드**
- Camera Plugin 통합
- 이미지 압축 및 업로드
- 기존 react-dropzone 대체

**3. GPS 위치 서비스 (Yaksa)**
- Geolocation Plugin
- 위치 권한 요청
- 방문 인증 API 연동

**4. 바코드 스캔 (Dropshipping)**
- Barcode Scanner Plugin
- 상품 조회 API 연동

#### Phase 4: 빌드 및 테스트 (3-5일)

**iOS 빌드:**
```bash
# Xcode 프로젝트 열기
npx cap open ios

# 빌드 설정
- Bundle Identifier: kr.co.neture.app
- Team: 개발자 계정 선택
- Provisioning Profile 설정
```

**Android 빌드:**
```bash
# Android Studio 프로젝트 열기
npx cap open android

# 빌드 설정
- Package Name: kr.co.neture.app
- Signing: keystore 생성
```

**테스트:**
- iOS: TestFlight 배포
- Android: Google Play Internal Testing

#### Phase 5: 앱스토어 제출 (5-7일)

**준비 사항:**
- [ ] 앱 아이콘 (512x512, 1024x1024)
- [ ] 스크린샷 (iPhone, iPad, Android)
- [ ] 앱 설명 (한글/영문)
- [ ] 개인정보 처리방침 URL
- [ ] 이용약관 URL
- [ ] 테스트 계정 정보

**Apple App Store:**
1. App Store Connect 등록
2. 앱 정보 입력
3. 빌드 업로드 (Xcode)
4. 심사 제출
5. 심사 기간: 1-3일

**Google Play Store:**
1. Google Play Console 등록
2. 앱 정보 입력
3. APK/AAB 업로드
4. 심사 제출
5. 심사 기간: 1-7일

### 12.3 예상 비용

| 항목 | 비용 | 비고 |
|------|------|------|
| **Apple Developer Program** | $99/년 | 필수 (iOS 배포) |
| **Google Play Console** | $25 (1회) | 필수 (Android 배포) |
| **Firebase (FCM)** | 무료 | 푸시 알림 |
| **Capacitor** | 무료 | MIT 라이선스 |
| **개발 도구** | 무료 | Xcode, Android Studio |
| **총 예상 비용** | **$124** | 첫 해 기준 |

### 12.4 다음 단계 액션 아이템

**즉시 착수 가능:**
1. ✅ Capacitor 프로젝트 초기화
2. ✅ Firebase 프로젝트 생성
3. ✅ Apple Developer 계정 준비
4. ✅ Google Play Console 계정 생성

**추가 조사 필요:**
- ⚠️ Toss Payments 모바일 앱 연동 방식
- ⚠️ OAuth 소셜 로그인 리다이렉트 처리
- ⚠️ 다중 서비스 통합 전략 (하나의 앱 vs 여러 앱)

**문서 작성 필요:**
- [ ] Capacitor 프로젝트 구조 설계서
- [ ] 네이티브 플러그인 구현 가이드
- [ ] 앱스토어 제출 가이드
- [ ] 모바일 앱 유지보수 가이드

---

## 📊 조사 결과 요약표

| 구분 | 현재 상태 | WebView 호환성 | 필요 작업 |
|------|----------|---------------|----------|
| **React SPA** | ✅ 사용 중 | ✅ 완벽 호환 | - |
| **인증 시스템** | ✅ Cookie + JWT | ✅ 호환 | CORS 설정 추가 |
| **API 연결** | ✅ Axios | ✅ 호환 | - |
| **디자인 시스템** | ✅ TailwindCSS | ✅ 호환 | - |
| **상태 관리** | ✅ Zustand | ✅ 호환 | - |
| **라우팅** | ✅ React Router | ✅ 호환 | HashRouter 권장 |
| **파일 업로드** | ⚠️ react-dropzone | ⚠️ 제한적 | Camera Plugin 추가 |
| **푸시 알림** | ❌ 없음 | ❌ 불가 | FCM + Plugin 추가 |
| **GPS** | ❌ 없음 | ❌ 불가 | Geolocation Plugin 추가 |
| **바코드** | ❌ 없음 | ❌ 불가 | Barcode Scanner Plugin 추가 |

**전체 평가:** 🟢 **WebView 기반 앱 개발 매우 적합**

---

## 🎯 최종 권장사항

1. **개발 방식:** CapacitorJS 하이브리드 앱
2. **우선순위:** Main Site (B2C) 모바일 앱 먼저 개발
3. **예상 기간:** 3-4주 (MVP)
4. **예상 비용:** $124 (앱스토어 등록비)
5. **유지보수:** 웹 업데이트 시 앱 자동 반영 → 최소화

**다음 문서:**
- `apps/mobile-app` 폴더 구조 설계서
- Capacitor 프로젝트 초기화 가이드
- 네이티브 플러그인 구현 가이드

---

**작성 완료일:** 2025-11-30
**다음 업데이트:** 모바일 앱 아키텍처 설계서 작성 후
