# Business Web Template Rules

> **Version**: 1.0
> **Status**: Mandatory (CLAUDE.md 구속 규칙)
> **Created**: 2025-12-29

이 문서는 모든 Business Web의 공통 헌법입니다.
새로운 비즈니스 Web은 반드시 이 규칙을 준수해야 합니다.

---

## 1. 적용 대상

### 1.1 현재 적용 Web

| Web | 도메인 | 상태 |
|-----|--------|------|
| cosmetics-web | 화장품 비즈니스 | Planned (템플릿 원본) |
| yaksa-web | 약사 서비스 | Planned |
| dropshipping-web | 드롭십핑 | Planned |
| tourism-web | 관광 서비스 | Planned |

### 1.2 적용 기준

다음 조건을 **모두** 만족하면 Business Web 규칙 적용:

- Core Web이 아닌 도메인 전용 Web
- Business API와 연동
- 독립 배포 단위

---

## 2. 공통 원칙 (Constitutional Rules)

### 2.1 역할 정의

```
┌─────────────────────────────────────────────────────────────────┐
│                      Business Web 역할                           │
├─────────────────────────────────────────────────────────────────┤
│  ✅ UI 렌더링 및 사용자 상호작용                                   │
│  ✅ API 응답 데이터 표시                                          │
│  ✅ 폼 입력 수집 및 API 전달                                      │
│  ✅ 클라이언트 상태 관리 (UI 상태)                                 │
│  ✅ JWT 보관 및 API 요청 시 전달                                  │
├─────────────────────────────────────────────────────────────────┤
│  ❌ 비즈니스 로직 구현 (API 책임)                                  │
│  ❌ 데이터 검증 (형식 검증만 허용, 비즈니스 검증 금지)              │
│  ❌ DB/ORM 직접 접근                                             │
│  ❌ JWT 발급/검증/파싱 (Core 책임)                                │
│  ❌ Core 설정 직접 참조                                           │
└─────────────────────────────────────────────────────────────────┘
```

### 2.2 계층 구조

```
Browser → {business}-web → {business}-api → (필요 시) Core API
                                  │
                                  ▼
                          {business} DB
```

### 2.3 호출 규칙

| 허용 | 금지 |
|------|------|
| Browser → {business}-web | Browser → {business}-api 직접 |
| {business}-web → {business}-api | {business}-web → Core API 직접 |
| {business}-web → Core (로그인만) | {business}-web → 타 business-api |

---

## 3. 인증 처리 규칙

### 3.1 인증 흐름

```
[로그인]
Browser → {business}-web → Core API (또는 공통 인증 UI)
                              │
                         JWT 발급
                              │
                              ▼
                    {business}-web에 JWT 전달
                              │
                              ▼
                    localStorage/httpOnly cookie 저장

[API 호출]
{business}-web → {business}-api
    │
    └── Header: Authorization: Bearer <JWT>
```

### 3.2 JWT 처리 원칙

| 역할 | {business}-web |
|------|----------------|
| JWT 저장 | ✅ (localStorage 또는 httpOnly cookie) |
| JWT 전달 | ✅ (Authorization 헤더) |
| JWT 만료 확인 | ✅ (exp 클레임 확인만, 서명 검증 금지) |
| JWT 발급 | ❌ |
| JWT 서명 검증 | ❌ |
| JWT 갱신 | ✅ (Core API에 갱신 요청만) |

### 3.3 토큰 저장 규칙

```typescript
// 허용: 안전한 저장
localStorage.setItem('accessToken', token);  // SPA
// 또는
httpOnly cookie (서버 설정)  // SSR 권장

// 금지: 토큰 파싱 및 검증 로직
const decoded = jwt.verify(token, secret);  // ❌
const payload = JSON.parse(atob(token.split('.')[1]));
if (payload.exp < now) { /* ... */ }  // ⚠️ 만료 확인만 허용
```

---

## 4. 라우팅 규칙

### 4.1 라우트 설계 원칙

| 원칙 | 설명 |
|------|------|
| 비즈니스 의미 중심 | `/products`, `/brands` (UI 관점) |
| RESTful 아님 | Web 라우트 ≠ API 라우트 |
| 사용자 흐름 중심 | 탐색, 상세, 관리 흐름 |

### 4.2 허용 라우트 패턴

```
/                           # 메인 페이지
/{entities}                 # 목록 페이지
/{entities}/{id}            # 상세 페이지
/{entities}/{id}/edit       # 수정 페이지 (권한 필요)
/admin                      # 관리자 대시보드
/admin/{entities}           # 관리 목록
/admin/{entities}/new       # 등록 페이지
/admin/{entities}/{id}      # 관리 상세/수정
```

### 4.3 금지 라우트 패턴

```
/api/*                      ❌  # Web에서 API 라우트 처리 금지
/auth/*                     ❌  # 인증 라우트는 Core 담당
/users/*                    ❌  # 사용자 관리는 Core 담당
/settings/*                 ❌  # 플랫폼 설정은 Core 담당
```

### 4.4 API Base URL 규칙

```typescript
// 환경변수로만 설정 (필수)
const API_BASE_URL = process.env.{BUSINESS}_API_URL;
const CORE_API_URL = process.env.CORE_API_URL;

// 금지: 하드코딩
const API_BASE_URL = 'https://api.example.com';  // ❌
```

---

## 5. 상태 관리 규칙

### 5.1 상태 분류

| 상태 유형 | 저장 위치 | 예시 |
|-----------|-----------|------|
| 서버 상태 | API 캐시 (React Query 등) | 상품 목록, 상세 정보 |
| UI 상태 | 컴포넌트 로컬 상태 | 모달 열림/닫힘, 폼 입력 |
| 인증 상태 | JWT (localStorage) | 로그인 여부 |
| 영속 상태 | localStorage | 테마, 언어 설정 |

### 5.2 금지 상태 패턴

```typescript
// 금지: 비즈니스 로직 상태
const [isProductValid, setIsProductValid] = useState(false);  // ❌ API에서 검증

// 금지: 서버 상태 직접 관리
const [products, setProducts] = useState([]);
fetch('/api/products').then(data => setProducts(data));  // ❌ 캐시 라이브러리 사용

// 허용: UI 상태만
const [isModalOpen, setIsModalOpen] = useState(false);  // ✅
```

---

## 6. 데이터 페칭 규칙

### 6.1 API 클라이언트 구조

```typescript
// 타입 안전 API 클라이언트 (OpenAPI 기반)
import { cosmeticsApi } from '@/services/{business}-api';

// 허용: 추상화된 API 호출
const { data, isLoading, error } = useQuery({
  queryKey: ['products'],
  queryFn: () => cosmeticsApi.products.list()
});

// 금지: 직접 fetch
const response = await fetch('/api/products');  // ❌
```

### 6.2 에러 처리

```typescript
// 허용: 에러 코드 기반 UI 처리
if (error.code === '{BUSINESS}_401') {
  redirect('/login');
}

// 금지: 에러 메시지 직접 표시
showToast(error.message);  // ❌ 번역된 메시지 사용
showToast(translateError(error.code));  // ✅
```

---

## 7. 폼 처리 규칙

### 7.1 검증 분류

| 검증 유형 | Web | API |
|-----------|-----|-----|
| 형식 검증 (이메일, 전화번호) | ✅ (UX용) | ✅ (필수) |
| 필수 입력 확인 | ✅ (UX용) | ✅ (필수) |
| 비즈니스 검증 (재고, 권한) | ❌ | ✅ |
| 중복 확인 | ❌ | ✅ |

### 7.2 폼 제출 패턴

```typescript
// 허용: 형식 검증 후 API 호출
const onSubmit = async (formData) => {
  // 형식 검증만 (UX)
  if (!isValidEmail(formData.email)) {
    showError('이메일 형식이 올바르지 않습니다');
    return;
  }

  // 실제 검증은 API에서
  const result = await api.create(formData);
  if (result.error) {
    handleApiError(result.error);
  }
};

// 금지: 비즈니스 검증
if (formData.price < 0) {  // ❌ API에서 검증
  showError('가격은 0 이상이어야 합니다');
}
```

---

## 8. 환경변수 규칙

### 8.1 필수 환경변수

```bash
# {business}-web 필수
{BUSINESS}_API_URL=https://{business}-api.neture.co.kr
CORE_API_URL=https://api.neture.co.kr

# 클라이언트 노출용 (Next.js)
NEXT_PUBLIC_{BUSINESS}_API_URL=https://{business}-api.neture.co.kr
```

### 8.2 금지 환경변수

```bash
# 금지 (Web에서 사용 불가)
JWT_SECRET=...              ❌  # 발급 금지
DB_HOST=...                 ❌  # DB 접근 금지
{BUSINESS}_DB_PASSWORD=...  ❌  # DB 접근 금지
CORE_INTERNAL_KEY=...       ❌  # Core 내부 키
```

---

## 9. 빌드/배포 규칙

### 9.1 독립 배포 원칙

| 원칙 | 설명 |
|------|------|
| 독립 서비스 | 각 Business Web은 독립 배포 단위 |
| 독립 빌드 | API 변경과 무관하게 빌드 |
| 독립 도메인 | 전용 서브도메인 사용 |

### 9.2 배포 트리거

```yaml
# {business}-web 배포 트리거
paths:
  - 'apps/{business}-web/**'
  - 'packages/ui/**'        # 공유 UI 변경 시
  - 'packages/types/**'     # 공유 타입 변경 시
```

### 9.3 API 독립성

```
Web 배포 ─────────── API 배포와 독립
    │
    └── API 버전 호환성만 확인
```

---

## 10. 템플릿 사용 절차

### 10.1 새 Business Web 생성 절차

```bash
# 1. 템플릿 복사
cp -r docs/templates/business-web-template docs/services/{business}/web/

# 2. 파일 내 {business} 치환
cd docs/services/{business}/web/
sed -i 's/{business}/cosmetics/g' *.md
sed -i 's/{BUSINESS}/COSMETICS/g' *.md
sed -i 's/{Business}/Cosmetics/g' *.md

# 3. 앱 디렉터리 생성
mkdir -p apps/{business}-web

# 4. CLAUDE.md 규칙 확인
# §16 Business Web Template Rules 적용
```

### 10.2 금지 절차

```bash
# 금지: 빈 프로젝트에서 시작
npx create-next-app {business}-web  ❌

# 금지: 템플릿 없이 개발
# UI 먼저 구현  ❌

# 금지: API 없이 목업 데이터로 완성
const mockProducts = [...]  ❌
```

---

## 11. 위반 시 조치

| 위반 유형 | 조치 |
|-----------|------|
| 템플릿 미사용 | 개발 중단, 템플릿에서 재시작 |
| 비즈니스 로직 구현 | API로 이전 |
| DB 직접 접근 | 즉시 제거 |
| Browser → API 직접 호출 | Web 경유로 변경 |
| 하드코딩 URL | 환경변수로 변경 |

---

## 12. 참조 문서

### 12.1 템플릿 디렉터리

```
docs/templates/business-web-template/
├── web-rules.template.md
├── routing-rules.template.md
├── api-contract-usage.template.md
├── deployment-boundary.template.md
├── service-flow.template.md
└── README.md
```

### 12.2 관련 규칙

- docs/architecture/business-api-template.md
- docs/architecture/multi-business-operations.md
- CLAUDE.md §15 Business API Template Rules
- CLAUDE.md §16 Business Web Template Rules

---

*이 문서는 모든 Business Web의 공통 헌법이며, 위반 시 즉시 작업 중단 대상입니다.*
