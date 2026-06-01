# IR-O4O-SEO-CANONICAL-STRUCTURE-AUDIT-V1

**조사 일자**: 2026-05-12  
**조사 범위**: O4O Platform 전 서비스 SEO/검색 노출 구조 현황 진단  
**목적**: 메뉴 구조 정비 완료 후 SEO 구현을 위한 canonical 구조 판단 및 현황 gap 파악  
**조사 방법**: 정적 분석 (코드 조사 + 배포 엔드포인트 HTTP 응답 확인)  
**구현 작업**: 포함하지 않음 (조사·판단만)

---

## 1. 현재 메타 태그 구조

### 1-1. 서비스별 index.html 비교

| 서비스 | `<title>` | `<meta name="description">` | og:* | canonical |
|--------|-----------|----------------------------|------|-----------|
| **KPA-Society** | `KPA Society - O4O Platform` | **없음** | **없음** | **없음** |
| **GlycoPharm** | `GlycoPharm - 혈당관리 전문 플랫폼` | `약사를 위한 혈당관리 전문 플랫폼` | **없음** | **없음** |
| **K-Cosmetics** | `K-Cosmetics - O4O Platform` | **없음** | **없음** | **없음** |
| **Neture** | `Neture - O4O Platform` | **없음** | **없음** | **없음** |

**결론**: GlycoPharm만 description 1개 보유. 나머지 서비스는 title 외 모든 SEO 메타 누락.

### 1-2. KPA-Society 배포 페이지 실측 (CSR 한계)

CSR SPA이므로 크롤러가 수신하는 HTML = index.html 정적 파일 (JS 미실행 상태).

| 페이지 경로 | title (실제 수신) | description | og:title |
|-------------|------------------|-------------|----------|
| `/` (홈) | `KPA Society - O4O Platform` | MISSING | MISSING |
| `/forum` | `KPA Society - O4O Platform` | MISSING | MISSING |
| `/lms` | `KPA Society - O4O Platform` | MISSING | MISSING |
| `/resources` | `KPA Society - O4O Platform` | MISSING | MISSING |
| `/store` | `KPA Society - O4O Platform` | MISSING | MISSING |
| 블로그 게시물 `/store/content/blog/:id` | `KPA Society - O4O Platform` | MISSING | MISSING |

**핵심 문제**: 모든 페이지가 크롤러에게 동일한 메타를 노출. 페이지별 차별화 불가.

---

## 2. React/Vite 메타 처리 현황

### 2-1. Helmet 라이브러리

```
ISSUE: react-helmet / react-helmet-async 어디에도 설치되지 않음.
```

- `package.json` (web-kpa-society, web-glycopharm, web-k-cosmetics): helmet 의존성 없음
- `packages/*`: 공통 패키지 어디에도 없음

### 2-2. 현재 사용 중인 패턴

**`packages/shared-space-ui/src/blog/useBlogSeo.ts`** — 유일한 SEO 처리 훅

```typescript
// 방식: useEffect 내 imperative DOM 조작
document.title = seo.title;
// <meta name="description"> querySelector로 직접 조작
// og:title, og:description, og:type, og:image, og:url 조작
```

**사용처 (2개 페이지만)**:
- `StoreBlogPage` — 블로그 목록
- `StoreBlogPostPage` — 블로그 게시물 상세

**누락 항목 (useBlogSeo에서도 미처리)**:
- `twitter:title`, `twitter:description`, `twitter:card`
- `<link rel="canonical">`
- 언마운트 시 cleanup (이전 페이지 메타 잔류 가능)

### 2-3. navigation.ts SEO 연결 여부

```typescript
// services/web-kpa-society/src/config/navigation.ts
{ label: '커뮤니티 포럼', href: '/forum', visibleWhen: [...] }
```

**ISSUE**: `label`, `href`, `visibleWhen` 필드만 존재. `pageTitle`, `description`, `breadcrumb` 등 SEO 연결 필드 없음. 메뉴 구조가 SEO와 분리된 독립 구조.

---

## 3. sitemap.xml / robots.txt

### 3-1. 현황

```
ISSUE: sitemap.xml — 파일 없음. GET /sitemap.xml → SPA catch-all → index.html 반환 (HTTP 200, Content-Type: text/html)
ISSUE: robots.txt — 파일 없음. GET /robots.txt → 동일 (SPA catch-all 처리)
```

- `services/web-kpa-society/public/` 디렉토리에 sitemap.xml, robots.txt 없음
- Vite 빌드 `public/` → `dist/` 복사 체인 — 파일 추가만으로 즉시 서빙 가능
- Cloud Run: 정적 파일 처리 미분리 → `/sitemap.xml` 요청이 nginx/SPA로 처리됨

### 3-2. 크롤러 영향

- Google Search Console 등록 시 sitemap.xml 제출 불가
- robots.txt 미존재 → 크롤러 기본 동작(전체 허용)으로 동작 (치명적이지 않으나 제어 불가)

---

## 4. JSON-LD (구조화 데이터)

```
ISSUE: JSON-LD 스크립트 어디에도 없음.
```

- `<script type="application/ld+json">` — 전 서비스 미사용
- 블로그 게시물 (`StoreBlogPostPage`) 조차 `Article` JSON-LD 없음
- 약국 정보, 조직 정보 (`Organization`), 전문가 프로필 (`Person`) JSON-LD 없음

---

## 5. canonical 링크

```
ISSUE: <link rel="canonical"> — 전 서비스, 전 페이지 누락.
```

중복 URL 문제 가능성:
- `https://kpa-society.co.kr/forum` vs `https://kpa-society.co.kr/forum/` (trailing slash)
- `?page=1` 파라미터 페이지

---

## 6. 검색 결과 현황 판단

**판단 기준**: 직접 검색 크롤 결과가 없으므로 구조적 추론.

| 지표 | 상태 | 영향 |
|------|------|------|
| 페이지별 title | 전 페이지 동일 | 검색 결과 제목 모두 동일 표시 |
| description snippet | 없음 | Google이 본문에서 임의 추출 |
| og:* | 없음 | SNS 공유 시 미리보기 없음 |
| canonical | 없음 | 중복 URL 패널티 가능 |
| sitemap | 없음 | 일부 페이지 미색인 가능 |
| JSON-LD | 없음 | Rich Result (별점/날짜 등) 표시 불가 |
| CSR (SPA) | 모든 서비스 | 크롤러 JS 실행 불보장 — 동적 title 미수신 |

---

## 7. Canonical SEO 구조 판단

### 7-1. 핵심 제약: CSR SPA

현재 아키텍처(Vite CSR)에서 서버가 HTML을 반환하지 않으므로:
- 크롤러가 수신하는 HTML = `index.html` (정적, JS 미실행)
- `document.title` 변경 = JS 실행 후 → 크롤러 도달 전
- 완전한 SEO는 **SSR(Server-Side Rendering) 또는 Prerendering** 없이는 달성 불가

### 7-2. 단기 달성 가능 범위 (CSR 유지 전제)

| 항목 | 달성 가능 여부 | 방법 |
|------|-------------|------|
| **index.html 기본 메타** | ✅ 즉시 가능 | `index.html`에 description, og:* 추가 |
| **robots.txt** | ✅ 즉시 가능 | `public/robots.txt` 파일 추가 |
| **sitemap.xml** | ✅ 정적 생성 가능 | `public/sitemap.xml` 수동/빌드타임 생성 |
| **페이지별 동적 title** | ⚠️ 부분 가능 | `useBlogSeo` 패턴 확장 (단, 크롤러에 미보장) |
| **canonical 링크** | ⚠️ JS 삽입 | 크롤러가 읽는다는 보장 없음 |
| **JSON-LD** | ⚠️ JS 삽입 | 크롤러 JS 실행 여부 불확실 |
| **완전한 페이지별 메타** | ❌ CSR 한계 | SSR/Prerender 필요 |

### 7-3. Canonical 구조 (권장)

#### Phase 1 — 즉시 적용 가능 (CSR 유지)

```
1. index.html 강화 (서비스별)
   - <meta name="description" content="[서비스별 한 줄 설명]">
   - <meta property="og:title" content="[서비스명]">
   - <meta property="og:description" content="[설명]">
   - <meta property="og:type" content="website">
   - <meta property="og:url" content="https://[서비스 도메인]">

2. public/robots.txt 추가
   User-agent: *
   Allow: /
   Sitemap: https://[도메인]/sitemap.xml

3. public/sitemap.xml 추가 (빌드타임 정적 생성)
   - 고정 라우트: /, /forum, /lms, /resources, /store, /store/content/blog 등
   - 동적 라우트(블로그 게시물): 빌드타임 API 호출 → 정적 생성 (vite plugin 또는 스크립트)

4. useBlogSeo 훅 강화
   - cleanup 추가 (언마운트 시 index.html 메타로 복원)
   - twitter:* 추가
   - canonical 추가 (useEffect 내 DOM 조작)
   - 블로그 게시물 JSON-LD Article 추가
```

#### Phase 2 — 구조적 해결 (중장기)

```
옵션 A: Vite SSG (Static Site Generation)
  - vite-plugin-ssr 또는 @vitejs/plugin-react + custom prerender script
  - 빌드타임에 각 라우트를 별도 HTML로 미리 렌더링
  - 정적 호스팅 최적 / 동적 블로그 게시물은 ISR 패턴 불가

옵션 B: Next.js 마이그레이션 (고비용)
  - SSR/ISR 완전 지원
  - 현재 Vite + React Router 구조와 호환성 낮음

옵션 C: Prerender 서비스 (중간)
  - prerender.io 등 SaaS or OSS
  - Cloud Run 앞단 CDN/Nginx에서 크롤러 UA 감지 → Prerender 서버로 라우팅
  - 기존 코드 변경 없음, 운영 복잡도 상승

RECOMMEND (현실적): Phase 1 즉시 적용 → Phase 2는 서비스 성숙도 기준으로 판단.
  블로그/게시물 SEO 중요도가 높아지면 Vite SSG 검토.
```

---

## 8. 서비스별 우선순위 판단

| 서비스 | SEO 중요도 | 이유 |
|--------|-----------|------|
| **KPA-Society** | 중 | 약사 커뮤니티 — 폐쇄적 성격, 외부 검색 유입보다 내부 사용 중심 |
| **GlycoPharm** | 높음 | 혈당 관리 — 일반인 검색 유입 가능성 있음 |
| **K-Cosmetics** | 높음 | B2B/B2C 제품 노출 — 검색 유입 직결 |
| **Neture** | 중 | 파트너 플랫폼 — 일반 검색보다 파트너 직접 접근 중심 |

---

## 9. PASS / ISSUE / RECOMMEND 요약

### PASS

없음. 전 서비스 SEO 구조 미구축 상태.

(GlycoPharm의 `<meta name="description">` 1개는 최소 조치이나, 나머지 전부 누락이므로 PASS 판정 불가)

### ISSUE

| ID | 항목 | 심각도 | 현황 |
|----|------|--------|------|
| SEO-01 | 페이지별 title 동일 | 높음 | 전 페이지 `KPA Society - O4O Platform` 고정 |
| SEO-02 | description 미존재 | 높음 | KPA-Society, K-Cosmetics, Neture 모두 없음 |
| SEO-03 | og:* 미존재 | 중 | 전 서비스 SNS 공유 미리보기 없음 |
| SEO-04 | canonical 링크 없음 | 중 | 중복 URL 패널티 가능 |
| SEO-05 | sitemap.xml 없음 | 중 | 전 서비스 미존재, SPA catch-all 응답 |
| SEO-06 | robots.txt 없음 | 중 | 전 서비스 미존재 |
| SEO-07 | JSON-LD 없음 | 낮음 | Rich Result 불가 |
| SEO-08 | CSR SPA 구조 | 높음 | 크롤러 JS 실행 미보장 — 동적 메타 미도달 |
| SEO-09 | twitter:* 없음 | 낮음 | X(Twitter) 카드 미지원 |
| SEO-10 | useBlogSeo cleanup 없음 | 낮음 | 페이지 이동 시 이전 메타 잔류 가능 |

### RECOMMEND

| ID | 권장 사항 | 우선순위 | 비고 |
|----|---------|---------|------|
| SEO-R01 | `index.html`에 서비스별 description, og:* 추가 | 즉시 | 코드 변경 최소 |
| SEO-R02 | `public/robots.txt` 추가 (전 서비스) | 즉시 | 파일 추가만 |
| SEO-R03 | `public/sitemap.xml` 정적 생성 (고정 라우트) | 단기 | 빌드 스크립트 |
| SEO-R04 | `useBlogSeo` 훅 강화 (cleanup + twitter + canonical) | 단기 | 공통 패키지 수정 |
| SEO-R05 | 블로그 게시물 JSON-LD Article 추가 | 단기 | `StoreBlogPostPage` |
| SEO-R06 | `navigation.ts` → pageTitle/description 필드 추가 | 중기 | 메뉴 구조 정비 후 |
| SEO-R07 | Vite SSG(빌드타임 prerender) 도입 검토 | 중기 | 블로그 SEO 중요 시 |
| SEO-R08 | GlycoPharm, K-Cosmetics 즉시 SEO-R01~R03 적용 | 즉시 | 검색 유입 중요도 높음 |

---

## 10. 참고 — 현재 SEO 처리 코드 위치

| 파일 | 역할 | 비고 |
|------|------|------|
| `packages/shared-space-ui/src/blog/useBlogSeo.ts` | 동적 메타 설정 훅 | 블로그 2개 페이지만 사용 |
| `services/web-kpa-society/index.html` | 정적 초기 메타 | title만 존재 |
| `services/web-glycopharm/index.html` | 정적 초기 메타 | title + description |
| `services/web-k-cosmetics/index.html` | 정적 초기 메타 | title만 존재 |
| `services/web-neture/index.html` | 정적 초기 메타 | title만 존재 |
| `services/web-kpa-society/src/config/navigation.ts` | 메뉴 구조 | SEO 연결 필드 없음 |

---

*Status: INVESTIGATION COMPLETE — 구현 작업 미포함*  
*후속 WO 선행 조건: 메뉴 구조 정비 완료*
