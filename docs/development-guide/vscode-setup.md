# VSCode 개발 환경 설정 가이드

## 📋 개요

O4O Platform 개발을 위한 Visual Studio Code 환경 설정 가이드입니다. 팀 전체가 동일한 개발 환경에서 작업할 수 있도록 표준화된 설정을 제공합니다.

## 🔧 필수 확장 프로그램

프로젝트 루트의 `.vscode/extensions.json`에 정의된 확장 프로그램들이 자동으로 권장됩니다:

### 핵심 확장 프로그램
- **ESLint**: JavaScript/TypeScript 코드 품질 관리
- **Prettier**: 자동 코드 포맷팅
- **TypeScript**: TypeScript 언어 지원
- **Tailwind CSS IntelliSense**: TailwindCSS 자동완성

### 개발 생산성 확장 프로그램
- **Vitest**: 테스트 실행 및 디버깅
- **Error Lens**: 인라인 에러 표시
- **Path Intellisense**: 파일 경로 자동완성
- **Auto Rename Tag**: HTML/JSX 태그 자동 리네임
- **TODO Tree**: TODO 주석 관리

### WSL 사용자 (필수)
- **Remote - WSL**: WSL 환경에서 개발

## ⚙️ 자동 설정

프로젝트를 열면 다음 설정들이 자동으로 적용됩니다:

### 파일 저장 시 자동 실행
- **자동 포맷팅**: Prettier로 코드 포맷팅
- **ESLint 수정**: 자동 수정 가능한 린트 오류 해결
- **Import 정리**: 사용하지 않는 import 제거

### TypeScript 설정
- **상대 경로 우선**: import 시 상대 경로 사용
- **자동 import**: 타입 기반 자동 import 제안
- **워크스페이스 지원**: 모노레포 환경 최적화

## 📁 VSCode 설정 파일 구조

```
.vscode/
├── settings.json       # 워크스페이스 설정
├── extensions.json     # 권장 확장 프로그램
├── launch.json        # 디버깅 설정
└── tasks.json         # 빌드/테스트 작업 정의
```

## 🎯 주요 기능

### 1. 자동 포맷팅
- **저장 시**: 자동으로 Prettier 포맷팅 적용
- **ESLint 통합**: 코드 품질 규칙 자동 수정
- **TailwindCSS**: 클래스명 자동 정렬

### 2. 스마트 Import
```typescript
// 자동으로 제안되는 import
import { Button } from '@o4o/ui'
import { formatCurrency } from '@/utils'
```

### 3. 인텔리센스
- **TailwindCSS**: 클래스명 자동완성
- **Path**: 파일 경로 자동완성
- **TypeScript**: 타입 기반 자동완성

## 🚀 개발 작업 단축키

VSCode의 Command Palette (`Ctrl+Shift+P`)에서 사용 가능한 작업들:

### 빌드 작업
- **Build All**: 모든 서비스 빌드
- **Type Check All**: 전체 타입 체크
- **Lint All**: 전체 ESLint 검사

### 개발 작업
- **Start Development**: 모든 서비스 개발 모드 시작
- **Test All**: 전체 테스트 실행

### 단축키 설정
```json
// .vscode/keybindings.json (선택사항)
[
  {
    "key": "ctrl+shift+b",
    "command": "workbench.action.tasks.runTask",
    "args": "Build All"
  },
  {
    "key": "ctrl+shift+t",
    "command": "workbench.action.tasks.runTask", 
    "args": "Test All"
  }
]
```

## 🐛 디버깅 설정

### API 서버 디버깅
1. `F5` 또는 디버그 패널에서 "Debug API Server" 선택
2. 브레이크포인트 설정 후 디버깅 시작
3. `http://localhost:4000` 요청으로 테스트

### 테스트 디버깅
- **Jest 테스트**: "Debug Jest Tests" 설정 사용
- **Vitest 테스트**: "Debug Vitest Tests" 설정 사용

## 📂 워크스페이스 탐색

### 폴더 구조 최적화
```
o4o-platform/
├── apps/                 # 애플리케이션들
│   ├── api-server/       # Express.js API
│   ├── main-site/        # React 웹사이트
│   └── admin-dashboard/  # 관리자 대시보드
├── packages/             # 공유 패키지들
│   ├── ui/              # UI 컴포넌트
│   ├── lib/             # 유틸리티
│   └── types/           # 타입 정의
└── .vscode/             # VSCode 설정
```

### 검색 최적화
- **제외 폴더**: node_modules, dist, coverage 자동 제외
- **빠른 파일 찾기**: `Ctrl+P`로 파일명 검색
- **전역 검색**: `Ctrl+Shift+F`로 코드 검색

## 🔧 문제 해결

### 자주 발생하는 문제들

#### 1. ESLint가 작동하지 않는 경우
```bash
# VSCode에서 ESLint 서버 재시작
Ctrl+Shift+P → "ESLint: Restart ESLint Server"

# 또는 워크스페이스 다시 로드
Ctrl+Shift+P → "Developer: Reload Window"
```

#### 2. TypeScript 오류가 표시되지 않는 경우
```bash
# TypeScript 서버 재시작
Ctrl+Shift+P → "TypeScript: Restart TS Server"

# 워크스페이스 버전 사용 확인
Ctrl+Shift+P → "TypeScript: Select TypeScript Version" → "Use Workspace Version"
```

#### 3. Prettier 포맷팅이 작동하지 않는 경우
```bash
# 기본 포맷터 확인
Ctrl+Shift+P → "Format Document With..." → "Prettier"

# 또는 settings.json에서 기본 포맷터 설정 확인
"editor.defaultFormatter": "esbenp.prettier-vscode"
```

### WSL 환경 특별 주의사항

#### 1. 파일 경로 문제
- WSL에서는 `/mnt/c/` 경로 사용
- Windows 파일 시스템과 권한 차이 주의

#### 2. 성능 최적화
```json
// WSL에서 성능 향상을 위한 추가 설정
{
  "files.watcherExclude": {
    "**/node_modules/**": true,
    "**/dist/**": true
  }
}
```

## 📚 추가 리소스

### 공식 문서
- [VSCode TypeScript 가이드](https://code.visualstudio.com/docs/languages/typescript)
- [VSCode 디버깅 가이드](https://code.visualstudio.com/docs/editor/debugging)
- [WSL 개발 가이드](https://code.visualstudio.com/docs/remote/wsl)

### 팀 표준
- **포맷팅**: Prettier 설정 준수
- **린팅**: ESLint 오류 0개 유지
- **타입 체크**: TypeScript strict 모드 준수

---

이 설정을 통해 팀 전체가 일관된 개발 환경에서 효율적으로 작업할 수 있습니다. 문제가 발생하면 프로젝트 문서나 팀 채널을 통해 공유해주세요.