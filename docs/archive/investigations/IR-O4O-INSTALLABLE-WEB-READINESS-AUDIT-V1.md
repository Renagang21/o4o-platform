# IR-O4O-INSTALLABLE-WEB-READINESS-AUDIT-V1

**조사 일자**: 2026-05-12  
**조사 범위**: O4O Platform 전 서비스 — 설치 가능한 업무형 웹(Installable Business Web) 준비 상태  
**목적**: PC/모바일 바탕화면 설치 · standalone 실행 · 업무형 UX 유지를 위한 최소 준비 상태 파악  
**조사 방법**: public 디렉토리, index.html, vite.config.ts, auth 구조, CSS safe-area 정적 분석  
**구현 작업**: 포함하지 않음 (조사·판단만)

---

## "설치 가능한 업무형 웹" 최소 기준 정의

브라우저 설치 프롬프트 발생 + standalone 실행 최소 요건:

| 항목 | 기준 | Chrome/Edge 필수 | Safari iOS 필수 |
|------|------|:---:|:---:|
| HTTPS | 배포 환경 기준 | ✅ | ✅ |
| `manifest.json` 연결 | `<link rel="manifest">` in index.html | ✅ | — (Safari는 meta 태그 방식) |
| `display: standalone` | manifest 내 | ✅ | — |
| Icon 192x192 | manifest icons[] | ✅ | — |
| Icon 512x512 | manifest icons[] | 권장 | — |
| `apple-mobile-web-app-capable` | index.html meta | — | ✅ |
| `apple-touch-icon` | `/public/` | — | ✅ |
| Service Worker | PWA 완전성 | 권장 | 권장 |
| `viewport-fit=cover` | notch 대응 | — | 권장 |

**O4O Cloud Run 환경**: 모든 서비스 HTTPS 제공 → HTTPS 요건은 자동 충족.

---

## 1. 서비스별 Readiness Matrix

### 1-1. manifest.json

| 서비스 | manifest.json | index.html 연결 | display:standalone | 아이콘 정의 | start_url | theme_color |
|--------|:---:|:---:|:---:|:---:|:---:|:---:|
| KPA-Society | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Neture | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| GlycoPharm | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| K-Cosmetics | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| admin-dashboard | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |

**결론**: 전 서비스 manifest.json 미존재. Chrome/Edge 설치 프롬프트 발생 불가.

### 1-2. Icon / Branding

| 서비스 | favicon | 192x192 | 512x512 | apple-touch-icon | 서비스별 브랜딩 |
|--------|:---:|:---:|:---:|:---:|:---:|
| KPA-Society | ✅ `favicon.png` | ❌ | ❌ | ❌ | ⚠️ PNG만 |
| Neture | ✅ `favicon.png` + `favicon.svg` | ❌ | ❌ | ❌ | ⚠️ PNG/SVG |
| GlycoPharm | ✅ `favicon.svg` | ❌ | ❌ | ❌ | ✅ SVG |
| K-Cosmetics | ✅ `favicon.svg` | ❌ | ❌ | ❌ | ✅ SVG |
| admin-dashboard | ✅ `favicon.ico` + `favicon.svg` | ❌ | ❌ | ❌ | ✅ ICO+SVG |

**비고**: admin-dashboard public에 `placeholder-150x150.png`, `placeholder-150x150.svg` 존재 — 임시 아이콘 자리 표시.

### 1-3. index.html meta 태그

| 서비스 | viewport | theme-color | manifest link | apple-capable | apple-status-bar | og:* |
|--------|:---:|:---:|:---:|:---:|:---:|:---:|
| KPA-Society | ✅ | ❌ | ❌ | ❌ | ❌ | ✅ (4개) |
| Neture | ✅ | ❌ | ❌ | ❌ | ❌ | ✅ (4개) |
| GlycoPharm | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| K-Cosmetics | ✅ | ✅ `#E11D48` | ❌ | ❌ | ❌ | ❌ |
| admin-dashboard | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |

**KPA-Society index.html** (전체):
```html
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<link rel="icon" type="image/png" href="/favicon.png" />
<meta name="description" content="약사와 약국 운영자를 위한...">
<meta property="og:title" content="KPA Society" />
<meta property="og:type" content="website" />
```

**K-Cosmetics** — 유일하게 `<meta name="theme-color" content="#E11D48">` 보유. 부분 적용.  
**GlycoPharm** — `viewport-fit=cover` 없음. OG 태그 없음.

### 1-4. Service Worker

| 서비스 | sw.js | service-worker.js | vite-plugin-pwa | 비고 |
|--------|:---:|:---:|:---:|------|
| KPA-Society | ❌ | ❌ | ❌ | — |
| Neture | ❌ | ❌ | ❌ | — |
| GlycoPharm | ❌ | ❌ | ❌ | — |
| K-Cosmetics | ❌ | ❌ | ❌ | — |
| admin-dashboard | ⚠️ `mockServiceWorker.js` | ❌ | ❌ | MSW 테스트용, PWA 아님 |

**결론**: 전 서비스 PWA Service Worker 미존재.

---

## 2. 즉시 설치 가능한 서비스

**현재 상태**: **없음.**

manifest.json 미존재로 인해 Chrome/Edge 설치 프롬프트가 발생하지 않는다.  
Safari iOS "홈 화면에 추가"는 `apple-mobile-web-app-capable` meta 없이도 작동하지만,  
standalone 모드 UX(상단바 숨김, splash screen)가 보장되지 않는다.

---

## 3. 인증 유지 (Login Persistence) 구조

### 3-1. 공통 구조 — @o4o/auth-client 패키지

전 서비스(KPA-Society, Neture, GlycoPharm, K-Cosmetics)가 동일한 패키지를 사용한다.

```typescript
// 각 서비스 apiClient.ts
export const authClient = new AuthClient(`${API_BASE_URL}/api/v1`, {
  strategy: 'localStorage',  // 전 서비스 동일
});
```

**토큰 저장 구조** (`packages/auth-client/src/token-storage.ts`):
- 표준 키: `o4o_accessToken`, `o4o_refreshToken` (localStorage)
- 레거시 키 자동 마이그레이션: `accessToken`, `authToken`, `token` → `o4o_accessToken`
- `admin-auth-storage` (Zustand persist 형식) 자동 파싱

**자동 갱신 구조** (axios interceptor):
- 401 응답 시 `/auth/refresh` 자동 호출
- 동시 401 요청 큐 처리 (refreshSubscribers 패턴)
- 갱신 실패 시 토큰 삭제
- 갱신 성공 시 실패 요청 재전송

### 3-2. 설치형 UX 관점 평가

| 항목 | 상태 | 이유 |
|------|------|------|
| 브라우저 재시작 후 유지 | ✅ 유지됨 | localStorage 영속성 |
| standalone 재실행 후 유지 | ✅ 유지됨 | localStorage는 standalone에서도 동일 origin |
| Safari iOS 홈화면 추가 후 유지 | ✅ 유지됨 | iOS Safari standalone = 독립 localStorage (최초 1회 로그인 필요) |
| Android Chrome 설치 후 유지 | ✅ 유지됨 | Chrome PWA localStorage = 브라우저와 공유 |
| 탭 닫기 후 유지 | ✅ 유지됨 | sessionStorage 미사용 |
| Private/Incognito 재시작 | ❌ 초기화 | 시크릿 모드 localStorage 클리어 |

**결론**: **인증 유지 구조는 설치형 UX에 적합하다.**  
localStorage 전략이 standalone 모드 환경에서 안정적으로 동작한다.  
잦은 로그아웃 문제 없음.

### 3-3. Safari iOS 주의사항

Safari는 standalone(홈화면 추가) 앱에서 **브라우저 탭과 별도 localStorage**를 사용한다.  
즉, 브라우저에서 로그인해도 standalone 앱에서는 재로그인이 필요하다.  
이는 정상 동작이며, 한 번 로그인 후 유지된다.

---

## 4. Standalone UX 위험 요소

### 4-1. safe-area / notch 대응

| 서비스 | safe-area-inset 사용 | viewport-fit=cover | 적용 범위 |
|--------|:---:|:---:|---------|
| KPA-Society | ✅ | ❌ | MobileBottomNav bottom만 |
| Neture | ❌ | ❌ | 미적용 |
| GlycoPharm | ❌ | ❌ | 미적용 |
| K-Cosmetics | ❌ | ❌ | 미적용 |
| admin-dashboard | ❌ | ❌ | 미적용 |

```typescript
// KPA-Society MobileBottomNav.tsx:127-129
const navSafeArea: React.CSSProperties = {
  paddingBottom: 'env(safe-area-inset-bottom, 0px)',
};
```

`viewport-fit=cover`가 없으면 `env(safe-area-inset-*)` 값이 0으로 반환될 수 있다.  
**KPA-Society도 `viewport-fit=cover` 없이 safe-area를 사용하고 있어 iPhone X+ notch 기기에서 효과 없음.**

### 4-2. standalone 모드 감지 로직

전 서비스 미존재.

```javascript
// 미구현 — 아래 방식으로 감지 가능
const isStandalone = window.matchMedia('(display-mode: standalone)').matches
  || window.navigator.standalone === true;
```

standalone에서만 적용해야 하는 UX(뒤로가기 버튼 표시, pull-to-refresh 비활성화 등)를 적용할 수 없다.

### 4-3. 모바일 Bottom Nav 존재 여부

| 서비스 | 모바일 Bottom Nav | 파일 |
|--------|:---:|------|
| KPA-Society | ✅ | `MobileBottomNav.tsx` (md:hidden) |
| Neture | ❌ | 없음 |
| GlycoPharm | ❌ | 없음 |
| K-Cosmetics | ❌ | 없음 |
| admin-dashboard | ❌ | 없음 (데스크탑 전용) |

KPA-Society만 모바일 Bottom Nav 구현. 나머지 서비스는 데스크탑형 Header Nav 단독.  
standalone 설치 시 Neture/GlycoPharm/K-Cosmetics에서 내비게이션이 불편할 가능성.

### 4-4. fixed header 문제

standalone 모드에서 fixed header는 일반적으로 정상 동작하나,  
iOS Safari에서 pull-to-refresh 제스처 충돌 가능성 있음.  
현재 어떤 서비스도 이에 대한 방어 코드 없음.

---

## 5. 공통화 가능 항목

### 5-1. manifest.json 템플릿

서비스별 공통 구조, props만 다름:

```json
{
  "name": "[서비스명]",
  "short_name": "[약칭]",
  "description": "[설명]",
  "start_url": "/",
  "display": "standalone",
  "background_color": "[서비스별]",
  "theme_color": "[서비스별]",
  "icons": [
    { "src": "/icons/icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/icons/icon-512.png", "sizes": "512x512", "type": "image/png", "purpose": "maskable" }
  ]
}
```

### 5-2. 서비스별 theme-color 기준 (코드베이스에서 확인)

| 서비스 | Primary Color | 출처 |
|--------|--------------|------|
| KPA-Society | `#2563EB` (blue-600) | kpaConfig.primaryColor, HeroBannerSection |
| Neture | `#16a34a` (green-600) | RegisterModal, RegisterPendingPage 버튼 |
| GlycoPharm | 미확인 (조사 필요) | — |
| K-Cosmetics | `#E11D48` (rose-600) | index.html theme-color ✅ |

### 5-3. index.html 공통 추가 항목

모든 서비스에 동일하게 추가 가능한 meta:

```html
<link rel="manifest" href="/manifest.json" />
<meta name="theme-color" content="[서비스별 primary color]" />
<meta name="mobile-web-app-capable" content="yes" />
<meta name="apple-mobile-web-app-capable" content="yes" />
<meta name="apple-mobile-web-app-status-bar-style" content="default" />
<meta name="apple-mobile-web-app-title" content="[서비스명]" />
<link rel="apple-touch-icon" href="/icons/icon-192.png" />
```

viewport에 `viewport-fit=cover` 추가:
```html
<meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />
```

### 5-4. vite-plugin-pwa 공통 적용 가능성

`vite-plugin-pwa` 패키지를 각 서비스 vite.config.ts에 동일 방식으로 추가 가능.  
Workbox 기반 Service Worker 자동 생성 + manifest injection 지원.

**모노레포 공통화 방안**:
```
packages/pwa-config/  (신규)
  ├── manifest-templates.ts  (서비스별 manifest props)
  └── vite-pwa-preset.ts     (공통 vite-plugin-pwa 설정)
```

---

## 6. 특이사항 — services/mobile-app 존재

```
services/mobile-app/
  ├── app/(app)/index.tsx
  ├── app/(app)/_layout.tsx
  ├── app/(auth)/login.tsx
  └── src/contexts/AuthContext.tsx
```

Expo + React Native 기반 모바일 앱이 존재함.  
`react-native-safe-area-context` 의존성 설치 확인.  
이번 IR 조사 범위 외이나, **웹 installable 방향 vs 네이티브 앱 방향 전략 결정**에 관련 있음.

---

## 7. 서비스별 Readiness 종합 점수

| 서비스 | manifest | icons | meta | SW | auth | safe-area | 종합 |
|--------|:---:|:---:|:---:|:---:|:---:|:---:|------|
| KPA-Society | ❌ | ❌ | ⚠️ | ❌ | ✅ | ⚠️ | **2/10** |
| Neture | ❌ | ❌ | ⚠️ | ❌ | ✅ | ❌ | **2/10** |
| GlycoPharm | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ | **1/10** |
| K-Cosmetics | ❌ | ❌ | ⚠️ | ❌ | ✅ | ❌ | **2/10** |
| admin-dashboard | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ | **1/10** |

(auth ✅ = localStorage 기반 자동 복원 완성)

---

## 8. ISSUE 목록

| ID | 항목 | 대상 서비스 | 심각도 | 현황 |
|----|------|-----------|--------|------|
| PWA-01 | manifest.json 미존재 | 전체 | 높음 | 설치 프롬프트 발생 불가 |
| PWA-02 | 192x192 / 512x512 아이콘 미존재 | 전체 | 높음 | manifest 없어 연결 불가 |
| PWA-03 | apple-mobile-web-app-capable 미존재 | 전체 | 높음 | iOS Safari standalone UX 불가 |
| PWA-04 | apple-touch-icon 미존재 | 전체 | 높음 | iOS 홈화면 아이콘 없음 |
| PWA-05 | viewport-fit=cover 미존재 | 전체 | 중 | notch 기기 safe-area 무효 |
| PWA-06 | KPA safe-area viewport-fit 불일치 | KPA-Society | 중 | viewport-fit없이 env() 사용 |
| PWA-07 | theme-color 미정의 | KPA/Neture/Glyco/Admin | 중 | 브라우저 UI 컬러 미적용 |
| PWA-08 | Service Worker 미존재 | 전체 | 낮음 (조사 범위 외) | 캐싱/오프라인 불가 |
| PWA-09 | standalone 모드 감지 없음 | 전체 | 낮음 | 설치 후 UX 분기 불가 |
| PWA-10 | Neture/Glyco/K-COS 모바일 Nav 없음 | 3개 서비스 | 중 | standalone 설치 시 내비게이션 불편 |

---

## 9. 권장 적용 순서

### Phase 1 — 즉시 적용 가능 (코드 변경 최소, 파일 추가)

**각 서비스별 공통 작업:**

1. `public/manifest.json` 생성 (서비스별 name/theme_color 다름)
2. `public/icons/icon-192.png`, `public/icons/icon-512.png` 아이콘 파일 생성
3. `public/icons/apple-touch-icon.png` 생성
4. `index.html`에 meta 추가:
   - `<link rel="manifest" href="/manifest.json">`
   - `<meta name="theme-color" content="...">`
   - `<meta name="apple-mobile-web-app-capable" content="yes">`
   - `<meta name="apple-touch-icon" href="/icons/apple-touch-icon.png">`
   - `viewport-fit=cover` 추가

**결과**: Chrome/Edge 설치 프롬프트 발생 가능 + iOS Safari 홈화면 추가 UX 개선

**우선 적용 서비스 제안**: KPA-Society → Neture → GlycoPharm → K-Cosmetics 순서.  
(KPA는 모바일 Nav 존재, 설치형 UX에 가장 준비됨)

### Phase 2 — 단기 (standalone UX 개선)

5. `viewport-fit=cover` 적용 후 KPA-Society `safe-area-inset` 효과 확인
6. Neture / GlycoPharm / K-Cosmetics에 모바일 기본 Bottom Nav 또는 Hamburger 메뉴 추가
7. standalone 감지 로직 추가 — 설치 앱에서만 보이는 UI 분기 가능

### Phase 3 — 중기 (구조적 개선)

8. `vite-plugin-pwa` 도입 — Service Worker 자동 생성 + 정적 자산 캐싱
9. `packages/pwa-config/` 공통 패키지 추출 (manifest 템플릿 + vite preset)
10. admin-dashboard: 모바일 PWA 우선순위 별도 판단 (데스크탑 전용 성격)

---

## 10. 후속 WO 제안

| 우선순위 | WO 제안 | 작업 내용 | 비고 |
|---------|---------|---------|------|
| 즉시 | `WO-O4O-KPA-INSTALLABLE-WEB-PHASE1-V1` | KPA-Society manifest + icons + meta 추가 | 파일 추가만. 최소 작업 |
| 단기 | `WO-O4O-NETURE-INSTALLABLE-WEB-PHASE1-V1` | Neture manifest + icons + meta 추가 | 파일 추가만 |
| 단기 | `WO-O4O-GLYCO-KCOS-INSTALLABLE-WEB-PHASE1-V1` | GlycoPharm + K-Cosmetics 동시 적용 | 파일 추가만 |
| 단기 | `WO-O4O-VIEWPORT-FIT-COVER-V1` | 전 서비스 viewport-fit=cover + safe-area 정합 | index.html 1줄 수정 |
| 중기 | `WO-O4O-NETURE-MOBILE-NAV-V1` | Neture 모바일 Bottom Nav 또는 Drawer | Neture standalone 설치 대비 |
| 중기 | `WO-O4O-PWA-VITE-PLUGIN-V1` | vite-plugin-pwa 도입 + SW 자동 생성 | 조사 범위 외 캐싱 포함 |

---

## 참고 — 조사한 파일 목록

| 파일 | 역할 |
|------|------|
| `services/web-*/index.html` | 각 서비스 HTML 진입점 및 meta 태그 |
| `services/web-*/public/` | favicon, manifest, icon 파일 목록 |
| `services/web-*/vite.config.ts` | 빌드 설정 및 PWA 플러그인 여부 |
| `packages/auth-client/src/token-storage.ts` | localStorage 토큰 SSOT |
| `packages/auth-client/src/client.ts` | AuthClient, 자동 refresh interceptor |
| `services/web-kpa-society/src/components/MobileBottomNav.tsx` | safe-area-inset 사용 유일 사례 |
| `services/mobile-app/` | React Native 앱 존재 확인 |

---

*Status: INVESTIGATION COMPLETE — 구현 작업 미포함*  
*후속 작업 전제: Phase 1 (manifest + icons + meta) 서비스별 독립 적용 가능. 공통화는 Phase 3에서*
