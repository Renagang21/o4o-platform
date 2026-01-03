# IR-20260103: neture-web 구조 분리 조사 결과

> **Investigation Phase 완료**
> **조사일**: 2026-01-03
> **다음 Phase**: H10-1 (구조 분리 결정)

---

## 1. neture-web 서비스 정의 (핵심 발견)

### 발견: 두 개의 완전히 다른 서비스가 공존

| 구분 | `services/web-neture` | `apps/neture-web` |
|------|----------------------|-------------------|
| **배포 상태** | Cloud Run 배포 중 | 미배포 |
| **정체성** | S2S 판매자 지원 서비스 | B2C 쇼핑몰 |
| **타겟 사용자** | 다중 판매채널 운영 판매자 | 일반 소비자 |
| **기능 범위** | 랜딩 페이지 (소개, CTA) | 상품목록, 장바구니, 결제 |
| **코드 규모** | 10개 파일 | 26개+ 파일 |
| **플랫폼 의존성** | 없음 (완전 독립) | package.json에 선언 (미사용) |

### 서비스 정의 (1~3문장)

**`services/web-neture` (운영 중)**:
> "다중 판매채널을 운영하는 판매자를 위한 지원 서비스의 랜딩 페이지.
> 판매 운영 자동화, 공급자 자료 활용을 소개하는 S2S 서비스 진입점."

**`apps/neture-web` (미운영)**:
> "O4O Platform의 대표 B2C 서비스로 기획된 쇼핑몰.
> 상품 브라우징, 장바구니, 결제 기능을 갖춘 소비자 대상 웹앱.
> 현재 미배포 상태이며 Cloud Run에 등록되지 않음."

---

## 2. 현재 구조 요약

### 디렉토리 구조

```
o4o-platform/
├── services/
│   └── web-neture/              ← [배포 중] S2S 랜딩 페이지
│       ├── Dockerfile           ← Cloud Run 배포용
│       ├── package.json         ← 독립 패키지 (React 18)
│       └── src/
│           ├── components/      ← Hero, CTA, CoreValue 섹션
│           └── pages/
│               └── HomePage.tsx ← "판매자 지원 서비스" 소개
│
└── apps/
    └── neture-web/              ← [미배포] B2C 쇼핑몰
        ├── package.json         ← @o4o/auth-client, @o4o/ui 선언 (미사용)
        └── src/
            ├── api/             ← neture.api.ts (상품/파트너 API)
            ├── contexts/        ← AuthContext, CartContext (자체 구현)
            ├── pages/           ← HomePage, ProductList, Cart, Checkout, Payment...
            └── router/          ← NetureRouter.tsx (10개 라우트)
```

### 라우트 비교

**`services/web-neture`**: 단일 페이지
- `/` → 랜딩 페이지

**`apps/neture-web`**: 10개 라우트
- `/` → 홈 (추천 상품)
- `/products` → 상품 목록
- `/products/:productId` → 상품 상세
- `/cart` → 장바구니
- `/checkout` → 결제
- `/checkout/payment/:orderId` → 결제 진행
- `/checkout/success` → 결제 성공
- `/checkout/fail` → 결제 실패
- `/orders` → 주문 목록
- `/login` → 로그인

---

## 3. 의존성 요약

### `services/web-neture` (배포 중)

| 분류 | 패키지 |
|------|--------|
| **필수** | react, react-dom (v18) |
| **개발** | vite, typescript |
| **플랫폼** | **없음** (완전 독립) |

### `apps/neture-web` (미배포)

| 분류 | 패키지 | 상태 |
|------|--------|------|
| **필수** | react, react-dom (v19), react-router-dom, axios, @tanstack/react-query | 사용 중 |
| **개발** | vite, typescript, tailwindcss | 사용 중 |
| **플랫폼 선언** | `@o4o/auth-client`, `@o4o/ui` | **선언만, 미사용** |

**플랫폼 의존성 미사용 근거**:
- `grep -r "from '@o4o"` → 결과 없음
- AuthContext, CartContext → 자체 구현 (packages 미참조)
- UI 컴포넌트 → 자체 구현 + Tailwind

---

## 4. 구조가 이렇게 된 원인

### 4.1 역사적 경위 (추정)

1. **Phase D-2**: `apps/neture-web`이 "B2C 핵심 기능 확장"으로 개발됨
   - 상품 목록, 장바구니, 결제 기능 구현
   - 코드 주석: "Phase G-2: B2C 핵심 기능 확장"

2. **Phase 2-E**: `services/web-neture`가 별도로 생성됨
   - "전자상거래 판매자 지원 서비스" 랜딩 페이지
   - 코드 주석: "Phase 2-E: 전자상거래 판매자 지원 서비스"

3. **H9-0**: `services/web-neture`만 Cloud Run에 Docker 배포
   - `apps/neture-web`은 배포 설정 없음

### 4.2 두 서비스가 공존하는 이유

| 가설 | 가능성 |
|------|--------|
| 1. 정체성 변경 | S2S로 피벗하면서 B2C 버전이 미완성으로 남음 |
| 2. 단계적 개발 | S2S 랜딩 먼저 배포, B2C는 추후 통합 예정 |
| 3. 목적 분리 | S2S와 B2C를 별도 서비스로 운영 계획 |
| 4. 레거시 잔재 | 초기 B2C 시도 후 방향 전환, 미정리 |

### 4.3 "빌드에 전체 코드가 포함되는 것처럼 보이는" 원인

**결론: 현재 배포 중인 `services/web-neture`는 플랫폼 코드를 포함하지 않음**

Dockerfile 분석:
```dockerfile
COPY package.json ./
COPY . .
RUN pnpm install
RUN pnpm build
```
- 해당 폴더만 복사 (`services/web-neture/`)
- monorepo 전체 복사 안 함
- 플랫폼 패키지 의존성 없음

**혼란의 원인 (추정)**:
- `apps/neture-web`이 `@o4o/auth-client`, `@o4o/ui`를 package.json에 선언
- 이 앱을 빌드하면 workspace 의존성으로 인해 플랫폼 코드가 번들에 포함될 수 있음
- 하지만 **현재 배포되지 않으므로 운영 환경에는 영향 없음**

---

## 5. 분리 가능 포인트

### 5.1 현재 상태 평가

| 항목 | `services/web-neture` | `apps/neture-web` |
|------|----------------------|-------------------|
| 독립성 | ✅ 완전 독립 | ⚠️ 선언된 의존성 미사용 |
| 빌드 격리 | ✅ 독립 Dockerfile | ❌ Dockerfile 없음 |
| 배포 상태 | ✅ Cloud Run 운영 | ❌ 미배포 |
| 코드 정합성 | ✅ 단순, 명확 | ⚠️ 미사용 의존성 선언 |

### 5.2 분리/정리 후보

#### 즉시 정리 가능
- `apps/neture-web/package.json`의 미사용 의존성 제거
  - `@o4o/auth-client`, `@o4o/ui` → 실제 미사용

#### 결정 필요
- `apps/neture-web`의 운명:
  - A. B2C 서비스로 별도 배포
  - B. S2S 서비스에 통합
  - C. 레거시로 분류 후 보관/삭제

### 5.3 건드리면 안 되는 부분

| 항목 | 이유 |
|------|------|
| `services/web-neture/` | 현재 운영 중, 변경 시 서비스 중단 위험 |
| `neture.co.kr` 도메인 매핑 | Cloud Run 연결 중 |

---

## 6. 다음 Phase(H10-1)에서 결정해야 할 질문

### 6.1 서비스 정체성 결정

1. **neture 서비스의 최종 정체성은 무엇인가?**
   - S2S 판매자 지원 서비스 전용?
   - B2C + S2S 복합?
   - B2C는 별도 도메인/서비스로 분리?

2. **`apps/neture-web` (B2C 쇼핑몰)을 어떻게 처리할 것인가?**
   - 별도 서비스로 배포 (예: `shop.neture.co.kr`)
   - `services/web-neture`에 기능 통합
   - 레거시로 분류 후 삭제

### 6.2 기술적 결정

3. **미사용 플랫폼 의존성을 정리할 것인가?**
   - `apps/neture-web/package.json`의 `@o4o/auth-client`, `@o4o/ui` 제거
   - 또는 실제로 사용하도록 전환

4. **두 서비스 간 코드 공유가 필요한가?**
   - 현재: 완전 독립 (중복 가능성)
   - 미래: 공용 컴포넌트 필요 여부

### 6.3 운영 결정

5. **도메인 전략은?**
   - `neture.co.kr` → S2S 랜딩
   - `shop.neture.co.kr` → B2C 쇼핑?
   - 또는 단일 도메인 유지

---

## 7. 조사 결론

### 핵심 발견

1. **"neture-web"이라는 이름으로 두 개의 완전히 다른 서비스가 존재**
   - 하나는 S2S 랜딩 (배포 중)
   - 하나는 B2C 쇼핑몰 (미배포)

2. **현재 운영 중인 서비스는 플랫폼 코드를 포함하지 않음**
   - `services/web-neture`는 완전 독립형
   - "빌드에 전체 코드 포함" 우려는 현재 배포에 해당 없음

3. **`apps/neture-web`은 정체성 결정이 필요한 상태**
   - package.json에 플랫폼 의존성 선언 (미사용)
   - B2C 기능 구현 완료, 배포 설정 없음
   - S2S 피벗 후 방치된 것으로 보임

### 조사 성공 기준 충족

| 기준 | 상태 |
|------|------|
| "왜 이렇게 되었는지 설명 가능" | ✅ |
| "어디부터 건드리면 안전한지 식별" | ✅ |
| "지금 건드리면 안 되는 부분 식별" | ✅ |
| 코드 수정 없이 조사만 수행 | ✅ |

---

## 8. 첨부: 주요 파일 위치

```
# 운영 중 (S2S 랜딩)
services/web-neture/
├── Dockerfile                    # Cloud Run 배포 설정
├── package.json                  # 독립 패키지
└── src/pages/HomePage.tsx        # "판매자 지원 서비스" 메시지

# 미운영 (B2C 쇼핑몰)
apps/neture-web/
├── package.json                  # @o4o 의존성 선언 (미사용)
├── src/api/neture.api.ts         # 상품/파트너 API 클라이언트
├── src/contexts/AuthContext.tsx  # 자체 인증 구현
├── src/contexts/CartContext.tsx  # 자체 장바구니 구현
├── src/pages/HomePage.tsx        # "B2C 서비스" 메시지
└── src/router/NetureRouter.tsx   # 10개 라우트 정의
```

---

*Investigation 완료: 2026-01-03*
*다음 단계: H10-1 Decision Phase*
