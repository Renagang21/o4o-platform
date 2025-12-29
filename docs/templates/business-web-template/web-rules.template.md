# {Business} Web Rules

> **Version**: 1.0
> **Status**: Mandatory (CLAUDE.md 구속 규칙)
> **Created**: {date}

이 문서는 {business}-web의 책임, 금지, 허용 범위를 정의합니다.
**설명이 아닌 준수 규칙**이며, 위반 시 즉시 작업 중단 대상입니다.

---

## 1. 역할 정의

### 1.1 {business}-web의 책임

| 책임 | 설명 |
|------|------|
| UI 렌더링 | 사용자 인터페이스 표시 |
| 사용자 상호작용 | 이벤트 처리, 폼 입력 |
| API 응답 표시 | 데이터 시각화 |
| 클라이언트 상태 관리 | UI 상태 (모달, 탭 등) |
| JWT 보관/전달 | 인증 토큰 관리 |

### 1.2 {business}-web이 아닌 것

| 금지 | 이유 |
|------|------|
| 비즈니스 로직 구현 | {business}-api 책임 |
| 데이터 검증 (비즈니스) | API에서 검증 |
| DB/ORM 접근 | 계층 분리 |
| JWT 발급/검증 | Core 책임 |

---

## 2. 계층 구조

```
Browser → {business}-web → {business}-api → (필요 시) Core API
                                  │
                                  ▼
                           {Business} DB
```

### 2.1 호출 규칙

| 허용 | 금지 |
|------|------|
| Browser → {business}-web | Browser → {business}-api 직접 |
| {business}-web → {business}-api | {business}-web → Core API 직접 |
| {business}-web → Core (로그인만) | {business}-web → 타 business-api |

---

## 3. 인증 처리

### 3.1 JWT 처리 원칙

| 역할 | {business}-web |
|------|----------------|
| JWT 저장 | ✅ (localStorage 또는 httpOnly cookie) |
| JWT 전달 | ✅ (Authorization 헤더) |
| JWT 만료 확인 | ✅ (exp 클레임 확인만) |
| JWT 발급 | ❌ |
| JWT 서명 검증 | ❌ |
| JWT 갱신 | ✅ (Core API에 갱신 요청만) |

### 3.2 인증 흐름

```
[로그인]
Browser → {business}-web → Core API → JWT 발급
                              │
                         JWT 저장
                              │
[API 호출]
{business}-web → {business}-api
    │
    └── Header: Authorization: Bearer <JWT>
```

---

## 4. 상태 관리

### 4.1 상태 분류

| 상태 유형 | 저장 위치 | 예시 |
|-----------|-----------|------|
| 서버 상태 | React Query 캐시 | 리소스 목록, 상세 |
| UI 상태 | 컴포넌트 로컬 | 모달, 폼 입력 |
| 인증 상태 | JWT (localStorage) | 로그인 여부 |
| 영속 상태 | localStorage | 테마, 언어 |

### 4.2 금지 상태 패턴

```typescript
// 금지: 비즈니스 로직 상태
const [isResourceValid, setIsResourceValid] = useState(false);  // ❌

// 금지: 서버 상태 직접 관리
const [resources, setResources] = useState([]);
fetch('/api/resources').then(data => setResources(data));  // ❌

// 허용: UI 상태만
const [isModalOpen, setIsModalOpen] = useState(false);  // ✅
```

---

## 5. 데이터 페칭

### 5.1 API 클라이언트 사용

```typescript
// 허용: 추상화된 API 호출
import { {business}Api } from '@/services/{business}-api';

const { data, isLoading } = useQuery({
  queryKey: ['resources'],
  queryFn: () => {business}Api.resources.list()
});

// 금지: 직접 fetch
const response = await fetch('/api/resources');  // ❌
```

### 5.2 에러 처리

```typescript
// 허용: 에러 코드 기반 UI 처리
if (error.code === '{BUSINESS}_401') {
  redirect('/login');
}

// 금지: 에러 메시지 직접 표시
showToast(error.message);  // ❌
showToast(translateError(error.code));  // ✅
```

---

## 6. 폼 처리

### 6.1 검증 분류

| 검증 유형 | Web | API |
|-----------|-----|-----|
| 형식 검증 (이메일, 전화번호) | ✅ (UX용) | ✅ (필수) |
| 필수 입력 확인 | ✅ (UX용) | ✅ (필수) |
| 비즈니스 검증 | ❌ | ✅ |
| 중복 확인 | ❌ | ✅ |

### 6.2 폼 제출 패턴

```typescript
// 허용: 형식 검증 후 API 호출
const onSubmit = async (formData) => {
  // 형식 검증만 (UX)
  if (!isValidFormat(formData.field)) {
    showError('형식이 올바르지 않습니다');
    return;
  }

  // 실제 검증은 API에서
  const result = await api.create(formData);
  if (result.error) {
    handleApiError(result.error);
  }
};

// 금지: 비즈니스 검증
if (formData.value < 0) {  // ❌ API에서 검증
  showError('값은 0 이상이어야 합니다');
}
```

---

## 7. 환경변수

### 7.1 필수 환경변수

```bash
# 필수
{BUSINESS}_API_URL=https://{business}-api.neture.co.kr
CORE_API_URL=https://api.neture.co.kr

# 클라이언트용 (Next.js)
NEXT_PUBLIC_{BUSINESS}_API_URL=https://{business}-api.neture.co.kr
```

### 7.2 금지 환경변수

```bash
# 금지 (Web에서 사용 불가)
JWT_SECRET=...              ❌
DB_HOST=...                 ❌
{BUSINESS}_DB_PASSWORD=...  ❌
```

---

## 8. 위반 시 조치

| 위반 유형 | 조치 |
|-----------|------|
| 비즈니스 로직 구현 | API로 이전 |
| DB/ORM 접근 | 즉시 제거 |
| JWT 발급/검증 | 즉시 제거 |
| 하드코딩 URL | 환경변수로 변경 |
| 직접 fetch 사용 | API 클라이언트로 변경 |

---

## 9. 참조 문서

- docs/architecture/business-web-template.md
- docs/services/{business}/api-contract.md
- docs/services/{business}/openapi.yaml
- CLAUDE.md §16 Business Web Template Rules

---

*이 문서는 규칙이며, 모든 {business}-web 개발은 이 문서를 기준으로 검증됩니다.*
