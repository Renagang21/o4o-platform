# IR-O4O-GLUCOSEVIEW-BLANK-SCREEN-ROOT-CAUSE-AUDIT-V1

> 조사일: 2026-03-24
> 조사 환경: 프로덕션 (glucoseview.co.kr)
> 조사 범위: 앱 부팅, 라우팅, 인증, SW/캐시, 배포 파이프라인

---

## 조사 결과 요약

| # | 조사 항목 | 결과 | 비고 |
|---|----------|------|------|
| 1 | 초기 부팅 단계 | **PASS** | HTML/JS 정상 로드, React mount 정상 |
| 2 | 라우팅 구조 | **PASS** | 이전 무한 리다이렉트 루프 수정됨 (24c9cb089) |
| 3 | 인증/토큰 처리 | **PASS** | 만료/오염 토큰에서도 graceful fallback |
| 4 | 서비스워커/캐시 | **FAIL** | 배포 후 캐시 무효화 없음 → 핵심 원인 |
| 5 | 계정/상태별 재현 | **PASS** | 비로그인/로그인/오염토큰 모두 정상 렌더링 |
| 6 | 최근 수정 영향 | **PASS** | 라우팅/인증 코드에 blank screen 유발 요소 없음 |
| 7 | Cloud Run 배포 | **PASS** | 최신 리비전 정상 서빙, 에러 로그 없음 |

**종합 판정: 서비스워커 캐시 무효화 결함 — 배포 후 간헐적 blank screen 유발**

---

## 1. 핵심 원인: 서비스워커 캐시 무효화 부재

### 1.1 문제 구조

```
[배포 N]
  서버: index.html → assets/index-ABC.js
  SW cache: / → index.html (refs ABC), assets/index-ABC.js ✓

[배포 N+1]
  서버: index.html → assets/index-DEF.js
  SW: 변경 감지 안 됨 (SW 파일 동일) → 캐시 유지

[사용자 재방문]
  1. GET /  → SW cache-first → 구 index.html (refs ABC)
  2. GET assets/index-ABC.js → SW cache-first
     ├─ 캐시 히트 → 구 JS 실행 → ⚠️ 구 버전 앱 동작 (stale)
     └─ 캐시 미스 → 네트워크 fetch
        └─ serve -s: 200 + text/html (index.html) ← JS가 아님!
           └─ 브라우저: SyntaxError → ❌ BLANK SCREEN
```

### 1.2 검증 증거

**서비스워커 코드** (`public/service-worker.js`):
- `CACHE_NAME = 'glucoseview-v1'` — **고정값**, 배포마다 변경되지 않음
- `self.skipWaiting()` + `self.clients.claim()` → 즉시 활성화하지만 SW 파일 자체가 안 바뀌면 의미 없음
- 캐시 전략: `/` 및 `.js/.css` 파일 → **cache-first**
- 캐시 정리: `CACHE_NAME`이 다른 캐시만 삭제 → 같은 이름이므로 삭제 안 됨

**serve -s 동작 확인** (curl 직접 테스트):
```
curl "https://glucoseview.co.kr/assets/index-NONEXISTENT.js"
→ HTTP 200, Content-Type: text/html; charset=utf-8
→ 내용: <!doctype html><html>... (index.html)
```

`serve -s`(SPA 모드)는 존재하지 않는 `.js` 파일에도 **200 + HTML을 반환**한다.
브라우저는 이것을 JavaScript로 파싱 시도 → `SyntaxError` → **React 미로드 → blank screen**.

더 나쁜 점: `response.ok === true`이므로 SW가 이 잘못된 HTML 응답을 JS 캐시 항목으로 **영구 저장**한다.
이후 재방문 시에도 캐시에서 HTML이 JS로 서빙 → **영구적 blank screen** (캐시 수동 삭제 전까지).

### 1.3 재현 조건

| 조건 | 재현 여부 | 비고 |
|------|----------|------|
| 첫 방문 (SW 미설치) | 재현 안 됨 | 서버에서 최신 HTML/JS 직접 로드 |
| SW 설치 후 동일 배포 | 재현 안 됨 | 캐시와 서버가 일치 |
| SW 설치 후 새 배포 | **간헐적** | 캐시에 구 JS가 있으면 stale, 없으면 blank |
| SW + 캐시 부분 만료 | **재현** | 구 HTML은 남고 구 JS만 evict → blank |
| 하드 리로드 (Ctrl+Shift+R) | 재현 안 됨 | SW 캐시 우회 |
| 시크릿 모드 | 재현 안 됨 | SW 없음 |

---

## 2. 초기 부팅 단계 — PASS

- `index.html`: `<div id="root"></div>` + `<script type="module" src="/src/main.tsx">` (빌드 후 해시된 경로)
- `main.tsx`: `createRoot(document.getElementById('root')!).render(<App />)` — 직접적
- React 마운트 전 로딩 표시: **없음** — JS 로드 실패 시 빈 `<div>` 만 노출
- `O4OErrorBoundary`가 앱 전체를 감싸지만, JS 파싱 실패는 React 이전 단계이므로 **무효**
- 모든 페이지 import가 eager (React.lazy 미사용) → 단일 번들 all-or-nothing

---

## 3. 라우팅 구조 — PASS

**이전 blank screen** (커밋 `24c9cb089`):
- 원인: `path="/"`에 `RoleProtectedRoute` 래핑 → 비인증 사용자 무한 리다이렉트 루프
- 수정: `HomeRedirect` index route로 교체
- 현재 상태: 수정 유지됨, 재발 요소 없음

**현재 라우팅 흐름:**
```
/ (Layout)
  └─ index → HomeRedirect
     ├─ 인증+환자 → Navigate to /patient
     └─ 기타 → PatientLandingPage

/patient (RoleGuard['patient'] → PatientLayout)
  └─ index → PatientMainPage

/operator (OperatorRoute → OperatorLayoutWrapper)
  └─ index → GlucoseViewOperatorDashboard
```

- 비인증 → `/` → 랜딩페이지 정상 표시
- 비인증 + `/patient` 직접 접근 → `/`로 리다이렉트 + 로그인 모달 → 정상
- 모든 guard에 `isLoading` 스피너 있음 → auth 체크 중 blank 아닌 spinner 표시

---

## 4. 인증/토큰 처리 — PASS

### 정상 흐름 검증

| 시나리오 | 결과 | 비고 |
|---------|------|------|
| 토큰 없음 | 랜딩페이지 표시 | `checkSession`: no token → setIsLoading(false) |
| 유효한 토큰 | /patient 대시보드 | /auth/me 200 → role 확인 → setUser |
| 만료/오염 토큰 | 랜딩페이지 표시 | /auth/me 401 → refresh 400 → clearAllTokens |
| 비환자 역할 | 랜딩페이지 표시 | role check → clearAllTokens + 안내 메시지 |

### 토큰 관리
- 키: `o4o_accessToken`, `o4o_refreshToken` (표준)
- Legacy fallback: `accessToken`, `authToken`, `token` → 자동 마이그레이션
- `clearAllTokens()`: 표준 + 레거시 + 쿠키 + admin-auth-storage 모두 제거
- 401 인터셉터: 자동 refresh → 실패 시 토큰 제거 (하드 리다이렉트 없음)

### Null-safety
- `user?.roles.includes()` — optional chaining 사용
- `user?.memberships?.some()` — optional chaining 사용
- `parseAuthResponse()` — 항상 객체 반환
- `mapApiRoles()` — fallback 항상 적용
- **unhandled exception 가능성: 없음**

---

## 5. 서비스워커/캐시 상세 — FAIL

### 현재 SW 구조 문제

**파일**: `services/web-glucoseview/public/service-worker.js`

| 문제 | 설명 | 심각도 |
|------|------|--------|
| 고정 CACHE_NAME | `'glucoseview-v1'` 배포마다 동일 → 캐시 갱신 안 됨 | **P0** |
| `/` cache-first | index.html이 캐시되면 새 배포 반영 안 됨 | **P0** |
| `.js` cache-first | 구 JS 번들 영구 캐싱 | **P1** |
| serve -s 200 HTML | 미존재 JS → 200 HTML → 캐시 오염 → 영구 blank | **P0** |
| SW 파일 불변 | 배포 간 SW 파일 변경 없음 → 업데이트 트리거 안 됨 | **P1** |

### 캐시 현재 상태 (Playwright 확인)

```
glucoseview-v1:
  /                              ← index.html (cache-first)
  /manifest.json
  /icons/icon.svg
  /icons/icon-192.png
  /icons/icon-512.png
  /assets/index-CehRPprq.css    ← 현재 배포 CSS
  /assets/index-DWhWI2iB.js     ← 현재 배포 JS
```

다음 배포 시 CSS/JS 해시가 변경되면, 구 해시가 캐시에 남고 새 해시는 없는 상태가 됨.

---

## 6. Cloud Run 배포 상태 — PASS

| 항목 | 값 |
|------|-----|
| 서비스 | glucoseview-web |
| 현재 리비전 | glucoseview-web-00120-5br |
| 배포 시각 | 2026-03-23T11:16:02Z |
| 트래픽 | 100% |
| 상태 | Ready = True |
| 에러 로그 | 없음 (200/304만) |

**Dockerfile**: `CMD ["serve", "-s", "dist", "-l", "8080"]`
- SPA 모드 `-s`: 모든 404를 index.html로 리다이렉트 → 위 SW 문제와 결합 시 위험

---

## 7. 최근 GlucoseView 수정 영향 — PASS

최근 주요 커밋:

| 커밋 | 내용 | blank screen 관련 |
|------|------|-------------------|
| `866bab8bd` | UserDetailPage 공통화 | 무관 — operator 페이지만 |
| `bb0eb440c` | 환자 전용 회원가입 | 무관 — RegisterPage만 |
| `cd9904ba7` | PatientLandingPage 추가 | 무관 — 라우팅 정상 |
| `24c9cb089` | blank screen 리다이렉트 루프 수정 | 수정 유지됨 ✓ |

현재 코드에 blank screen을 직접 유발하는 로직 결함은 없음.
**문제는 코드가 아니라 인프라 (SW + serve -s 조합)**.

---

## 8. 회귀 검증 (Playwright 브라우저 테스트) — PASS

| 항목 | 결과 | 콘솔 에러 |
|------|------|----------|
| glucoseview.co.kr/ (비로그인) | 랜딩페이지 정상 | 0 |
| /login 페이지 | 정상 렌더링 | 0 |
| 테스트 당뇨인 로그인 | /patient 대시보드 정상 | 0 |
| API 호출 (4개) | 모두 200 | 0 |
| 로그아웃 | 랜딩+로그인모달 정상 | 0 |
| /patient 비인증 접근 | / 리다이렉트+모달 | 0 |
| 오염 토큰으로 접근 | 401→refresh→clear→랜딩 | 0 (auth 에러 expected) |

**현재 시점에서 blank screen 재현 불가** — 캐시가 현재 배포와 일치하기 때문.
문제는 **다음 배포 후** 재방문 시 발생.

---

## 가장 가능성 높은 원인

### 1순위: 서비스워커 캐시 무효화 부재 (확정)

- SW의 `CACHE_NAME = 'glucoseview-v1'`이 고정 → 배포 후에도 구 캐시 유지
- `/` (index.html)이 cache-first → 구 HTML에서 구 JS 해시 참조
- 구 JS가 캐시에 없으면 → `serve -s`가 200+HTML 반환 → JS 파싱 실패 → blank screen
- `response.ok === true`이므로 잘못된 응답이 캐시에 저장 → 영구적 blank screen

### 2순위: 캐시 stale 상태 (확정)

- 구 JS가 캐시에 있으면 → blank screen은 아니지만 **구 버전 앱 실행**
- 사용자가 새 기능을 못 보거나, 수정된 버그가 재현되는 현상

### 보조 원인: 없음

- 라우팅, 인증, 코드 수준에서 blank screen 유발 요소 없음
- 순수하게 SW/캐시 인프라 문제

---

## 수정 방향 제안

### P0 — 즉시 수정 (서비스워커 수정)

**수정 1: index.html은 network-first로 변경**

```javascript
// 변경 전: / 가 cache-first (line 48-50)
url.pathname === '/'

// 변경 후: / 를 cache-first 대상에서 제외
// network-first 핸들러(line 67-78)로 자동 처리됨
```

index.html은 항상 최신을 서버에서 가져오되, 오프라인 시에만 캐시 fallback.

**수정 2: CACHE_NAME에 빌드 해시 포함**

Vite 빌드 시 SW 파일에 해시 삽입하여 배포마다 SW 업데이트 트리거:
```javascript
const CACHE_NAME = 'glucoseview-BUILD_HASH'; // vite plugin으로 치환
```

또는 더 간단한 방법: 타임스탬프 기반
```javascript
const CACHE_NAME = 'glucoseview-20260324'; // 배포마다 수동 변경
```

**수정 3: JS/CSS에 Content-Type 검증 추가**

```javascript
// SW fetch handler에서 캐시 저장 전 검증
if (response.ok && request.url.match(/\.(js|css)$/)) {
  const contentType = response.headers.get('content-type') || '';
  if (contentType.includes('text/html')) {
    // serve -s가 HTML을 반환한 경우 — 캐시하지 않고 에러 처리
    return new Response('', { status: 404 });
  }
}
```

### P1 — 구조 보완

**수정 4: index.html에 로딩 표시 추가**

```html
<div id="root">
  <div id="app-loading" style="display:flex;align-items:center;justify-content:center;min-height:100vh;">
    <p>로딩 중...</p>
  </div>
</div>
```

React가 마운트되면 root 내용을 교체하므로 자동 제거.
JS 로드 실패 시 "로딩 중..." 표시 → 최소한 blank은 아님.

**수정 5: SW 업데이트 감지 + 사용자 알림**

```javascript
// main.tsx에서
navigator.serviceWorker.register('/service-worker.js').then(reg => {
  reg.addEventListener('updatefound', () => {
    const newWorker = reg.installing;
    newWorker?.addEventListener('statechange', () => {
      if (newWorker.state === 'activated') {
        // 새 SW 활성화됨 → 리로드 권유
        if (confirm('새 버전이 있습니다. 새로고침하시겠습니까?')) {
          window.location.reload();
        }
      }
    });
  });
});
```

### P2 — 근본 해결 (별도 WO)

- Workbox 라이브러리 도입 (Google의 SW 관리 표준)
- `workbox-precaching`: 빌드 시 자동 manifest 생성 → 정확한 캐시 무효화
- `workbox-routing`: 유연한 캐시 전략 (HTML=network-first, static=stale-while-revalidate)
- `vite-plugin-pwa` 사용 시 Vite 빌드와 자동 통합

---

## 제외 범위

- 전체 Auth 구조 재설계 (현재 정상)
- GlucoseView 외 다른 서비스 수정
- 새 기능 추가
- 성능 최적화

---

*조사 완료: 2026-03-24 14:10 KST*
