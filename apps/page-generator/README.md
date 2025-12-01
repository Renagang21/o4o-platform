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
- **Spacing**: `p-4`, `px-6`, `gap-4` → spacing values
- **Layout**: `flex`, `grid`, `grid-cols-3` → layout properties
- **Borders**: `rounded-lg`, `border` → border properties

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

**Phase 1: Core 변환 엔진** (진행 중)
- [x] 프로젝트 구조 생성
- [ ] JSX Parser 이식
- [ ] Block Mapper 이식
- [ ] Tailwind Parser 이식
- [ ] Placeholder 처리

**Phase 2: UI 개발** (예정)
- [ ] JSX 에디터 컴포넌트
- [ ] Block 뷰어 컴포넌트
- [ ] 페이지 폼 컴포넌트
- [ ] 미리보기 기능

**Phase 3: API 연동** (예정)
- [ ] Browser Auth 구현
- [ ] O4O API 클라이언트
- [ ] 페이지 생성 기능

**Phase 4: 고도화** (예정)
- [ ] Placeholder 자동 제안
- [ ] 템플릿 라이브러리
- [ ] 변환 히스토리
- [ ] 협업 기능

---

**작성일**: 2025-12-01
**버전**: 1.0.0 (Alpha)
