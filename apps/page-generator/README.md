# Page Generator App

AI 생성 JSX 코드를 O4O 플랫폼 페이지로 자동 변환하는 웹 애플리케이션입니다.

## 🎯 주요 기능

- **JSX → O4O Block 자동 변환**: AI가 생성한 React/JSX 코드를 O4O 블록으로 변환
- **Tailwind 파싱**: Tailwind CSS 클래스를 Appearance Token으로 자동 매핑
- **Placeholder 처리**: 변환 불가능한 컴포넌트를 안전하게 보존
- **실시간 미리보기**: 변환 결과를 즉시 확인
- **페이지 생성**: O4O Admin API를 통한 직접 페이지 생성

## 📁 프로젝트 구조

```
/apps/page-generator/
├── src/
│   ├── core/              # 변환 엔진 핵심 로직
│   │   ├── jsx-parser.ts          # JSX → ReactElement 파싱
│   │   ├── block-mapper.ts        # ReactElement → O4O Block 변환
│   │   ├── tailwind-mapper.ts     # Tailwind 클래스 파싱
│   │   ├── placeholder.ts         # Placeholder 블록 처리
│   │   └── types.ts               # 공통 타입 정의
│   ├── services/          # 외부 서비스 연동
│   │   ├── auth.ts                # JWT 인증
│   │   └── o4o-api.ts             # O4O Admin API 클라이언트
│   ├── components/        # React UI 컴포넌트
│   │   ├── JsxEditor.tsx          # JSX 입력 에디터
│   │   ├── BlockViewer.tsx        # Block JSON 뷰어
│   │   ├── PlaceholderList.tsx    # Placeholder 목록
│   │   └── PageForm.tsx           # 페이지 정보 입력 폼
│   ├── utils/             # 유틸리티 함수
│   │   └── slug.ts                # Slug 생성
│   ├── App.tsx            # 메인 앱 컴포넌트
│   └── main.tsx           # 엔트리 포인트
├── public/                # 정적 파일
├── package.json
├── tsconfig.json
├── vite.config.ts
└── README.md
```

## 🚀 시작하기

### 설치
```bash
cd apps/page-generator
pnpm install
```

### 개발 서버 실행
```bash
pnpm dev
# → http://localhost:5175
```

### 빌드
```bash
pnpm build
```

## 📖 사용 방법

### 1. JSX 코드 입력
- AI가 생성한 React/JSX 코드를 에디터에 붙여넣기
- 또는 직접 JSX 코드 작성

### 2. 변환
- "변환" 버튼 클릭
- JSX → O4O Block 자동 변환
- Tailwind 클래스 자동 파싱

### 3. 결과 확인
- 변환된 Block JSON 확인
- Placeholder 블록 목록 확인 (있는 경우)

### 4. 페이지 정보 입력
- 페이지 제목 입력
- Slug 자동 생성 또는 수동 입력

### 5. 페이지 생성
- "페이지 생성" 버튼 클릭
- O4O Admin에서 페이지 확인 및 편집

## 🔧 변환 규칙

### 지원되는 JSX 요소

| JSX Element | O4O Block Type | 설명 |
|-------------|----------------|------|
| `<h1>` ~ `<h6>` | `o4o/heading` | 제목 블록 |
| `<p>` | `o4o/paragraph` | 단락 블록 |
| `<img>` | `o4o/image` | 이미지 블록 |
| `<button>` | `o4o/button` | 버튼 블록 |
| `<div>` (grid) | `o4o/columns` | 컬럼 레이아웃 |
| `<div>` (flex) | `o4o/group` | 그룹 레이아웃 |
| `<ul>`, `<ol>` | `o4o/list` | 리스트 블록 |
| `<blockquote>` | `o4o/quote` | 인용 블록 |
| 기타 | `o4o/placeholder` | Placeholder |

### Tailwind 클래스 매핑

- **Typography**: `text-lg`, `text-xl`, etc. → fontSize
- **Colors**: `text-blue-600`, `bg-gray-100` → color tokens
- **Alpha Colors**: `bg-white/50`, `text-black/60` → rgba() *(Phase 5)*
- **Spacing**: `p-4`, `px-6`, `gap-4` → spacing values
- **Layout**: `flex`, `grid`, `grid-cols-3` → layout properties
- **Flex Wrap**: `flex-wrap`, `flex-nowrap` → flexWrap *(Phase 5)*
- **Borders**: `rounded-lg`, `border` → border properties
- **Opacity**: `opacity-0` ~ `opacity-100` → 0 ~ 1 *(Phase 5)*
- **Shadow**: `shadow-sm` ~ `shadow-2xl` → CSS box-shadow *(Phase 5)*
- **Backdrop**: `backdrop-blur-md` → blur(12px) *(Phase 5)*
- **Positioning**: `relative`, `absolute`, `fixed` → position + coordinates *(Phase 6)*
- **Z-Index**: `z-0` ~ `z-50` → zIndex values *(Phase 6)*
- **Transform**: `translate-x-4`, `scale-105`, `rotate-45`, `skew-x-6` → transform object *(Phase 7)*
- **Transform Origin**: `origin-center`, `origin-top-left` → transformOrigin *(Phase 7)*
- **Transition**: `transition`, `duration-300`, `ease-in-out` → transition object *(Phase 7)*
- **Animation**: `animate-spin`, `animate-pulse`, `animate-bounce`, `animate-ping` → animation *(Phase 7)*

## 📚 관련 문서

- [VSCode Extension 아카이브](../../docs/dev/VSCODE_EXTENSION_ARCHIVE.md)
- [_generated 폴더 표준](../../_generated/README.md)

## 🔄 Extension과의 차이점

| 기능 | VSCode Extension | Page Generator App |
|------|------------------|---------------------|
| 설치 | VSCode Extension 설치 필요 | 브라우저만 있으면 OK |
| 인증 | VSCode SecretStorage | Browser localStorage |
| 미리보기 | 없음 | 실시간 iframe 미리보기 |
| Placeholder 처리 | 알림만 | 수동 교체 UI 제공 |
| 협업 | 불가 | 공유 링크 지원 (예정) |

## ⚠️ 현재 상태

**Phase 1: Core 변환 엔진** ✅ **완료**
- [x] 프로젝트 구조 생성
- [x] JSX Parser 이식 (Babel 기반)
- [x] Block Mapper 이식 (완전한 매핑 규칙)
- [x] Tailwind Parser 이식 (Typography, Color, Spacing, Layout, Border)
- [x] Placeholder 처리 (직렬화, 추출, 통계)

**Phase 2: UI 개발** ✅ **완료**
- [x] JSX 에디터 컴포넌트
- [x] Block 뷰어 컴포넌트 (JSON 포맷팅)
- [x] 페이지 폼 컴포넌트 (title, slug, status, type)
- [x] Placeholder 목록 컴포넌트
- [x] 메인 App 통합

**Phase 3: API 연동** ✅ **완료**
- [x] Browser Auth 구현 (localStorage + httpOnly cookie)
- [x] O4O API 클라이언트 (자동 JWT 갱신)
- [x] 페이지 생성 기능

**Phase 4: 실전 연동 테스트** ✅ **완료**
- [x] 6개 테스트 샘플 작성
- [x] 변환 엔진 테스트 (94.7% 성공률)
- [x] Placeholder 전략 검증
- [x] Tailwind 엣지 케이스 검증
- [x] 오류 처리 검증
- [x] 테스트 리포트 작성 (`docs/page-generator/test-report.md`)
- [ ] API 연동 수동 테스트 (예정)
- [ ] Admin Dashboard 통합 테스트 (예정)

**Phase 5: Tailwind 고도화 & Block 품질 개선** ✅ **완료**
- [x] Opacity 지원 (`opacity-0` ~ `opacity-100` → 0 ~ 1)
- [x] Shadow 지원 (`shadow-sm` ~ `shadow-2xl` → CSS box-shadow)
- [x] Flex Wrap 지원 (`flex-wrap`, `flex-nowrap`)
- [x] Alpha Colors 지원 (`bg-white/50` → rgba)
- [x] Backdrop Blur 지원 (`backdrop-blur-*` → blur())
- [x] 빈 padding 객체 제거 (cleanAttributes)
- [x] Width 소수점 정리 (roundTo2)

**Phase 6: Positioning & Block 확장** ✅ **완료**
- [x] Image/List/Quote 블록 실전 테스트
- [x] Positioning 지원 (relative, absolute, fixed)
- [x] Position Coordinates 지원 (top, right, bottom, left)
- [x] Z-Index 지원 (`z-0` ~ `z-50`)
- [x] 테스트 샘플 추가 (07-image-list-quote.tsx)
- [x] 변환 성공률 96.2% 달성

**Phase 7: Transform / Transition / Animation** ✅ **완료**
- [x] Transform 지원 (translate, scale, rotate, skew)
- [x] Transform Origin 지원 (center, top, bottom-right 등)
- [x] Transition 지원 (property, duration, ease, delay)
- [x] Animation 지원 (spin, pulse, bounce, ping)
- [x] 모든 블록 타입에 motion 속성 적용
- [x] 테스트 샘플 추가 (08-transform-anim.tsx)
- [x] 변환 성공률 97.6% 달성

**Phase 8: 향후 개선 사항** (예정)
- [ ] Pseudo-class 지원 (hover, active, focus)
- [ ] Placeholder 자동 제안 (AI)
- [ ] 템플릿 라이브러리
- [ ] 변환 히스토리
- [ ] 협업 기능

---

**작성일**: 2025-12-01
**버전**: 1.4.0
**상태**: ✅ 프로덕션 배포 준비 완료 (Phase 1-7 완료)
**변환 성공률**: 97.6% (207/212 blocks)
**테스트 샘플**: 8개 (7 성공 / 1 검증 오류)
