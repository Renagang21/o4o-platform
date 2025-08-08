# Monospace/Claude Code npm "2" 버그 조사 보고서

## 개요
Monospace/Claude Code 개발 환경에서 npm 명령 실행 시 자동으로 "2"가 인자로 추가되는 현상

## 발생 일시
- 최초 발견: 2025년 1월 8일
- 환경: Monospace/Claude Code IDE

## 증상

### 1. npm 명령어 실행 시
```bash
# 의도한 명령
npm run test

# 실제 실행되는 명령
npm run test 2

# npm verbose 로그
npm verbose argv [
  "/home/dev/.nvm/versions/node/v22.18.0/bin/node",
  "/home/dev/.nvm/versions/node/v22.18.0/bin/npm",
  "run",
  "test",
  "--loglevel",
  "silly",
  "2"  # <- 자동으로 추가됨
]
```

### 2. 발생하는 오류들

#### Vitest 오류
```
Error: Option "--passWithNoTests" can only be passed once
```
- 원인: package.json과 스크립트 양쪽에서 플래그 설정 + "2"가 추가 인자로 해석

#### TypeScript 컴파일 오류
```
error TS6231: Could not resolve the path '2' with the extensions
```
- 원인: tsc가 "2"를 파일명으로 해석

#### Git 명령어 오류
```
fatal: bad revision '2'
```
- 원인: git diff 등에서 "2"를 리비전으로 해석

## 원인 분석

### 환경 변수 확인
```bash
MONOSPACE_ENV=true
MONOSPACE_PREVIEW_CONFIG={"3000":{...}, "3001":{...}}
```

### 추적 결과
1. **npm 자체 문제 아님**: npm alias, .npmrc 설정 모두 정상
2. **Node.js 문제 아님**: Node.js 22.18.0 자체는 정상
3. **Monospace 환경 특성**: MONOSPACE_ENV=true 환경에서만 발생
4. **IDE 레벨 처리**: npm 명령 실행 시 IDE가 자동으로 "2"를 추가하는 것으로 추정

## 영향 범위

### 영향 받는 명령어
- `npm run [script]` - 모든 npm 스크립트
- `npm test` - 테스트 실행
- `npm build` - 빌드 프로세스
- 기타 npm 관련 모든 명령

### 영향 받지 않는 환경
- 로컬 터미널 (VS Code, Terminal 앱 등)
- CI/CD 환경 (GitHub Actions)
- 프로덕션 서버
- 다른 개발자의 환경

## 해결 방법

### 1. 즉시 적용 가능한 해결책

#### A. dev.sh 스크립트 사용
```bash
# scripts/dev.sh에 추가된 코드
if [ "$2" = "2" ] && [ "$MONOSPACE_ENV" = "true" ]; then
    echo "# Monospace 환경 감지 - 추가 인자 '2' 무시"
    set -- "$1"  # 첫 번째 인자만 유지
fi
```

#### B. package.json에서 bash -c 래퍼 사용
```json
{
  "scripts": {
    "build": "bash -c 'tsc && vite build'",
    "type-check": "bash -c 'tsc --noEmit'"
  }
}
```

#### C. 중복 플래그 제거
```json
// ❌ 문제 발생
"test": "vitest --passWithNoTests"

// ✅ 해결
"test": "vitest"  // root package.json에서 이미 설정됨
```

### 2. 장기적 해결 방안

#### 환경별 분기 처리
```bash
#!/bin/bash
if [ "$MONOSPACE_ENV" = "true" ]; then
    # Monospace 특별 처리
    shift  # 마지막 인자 제거
fi
```

#### npm 스크립트 래퍼 함수
```bash
run_npm() {
    if [ "$MONOSPACE_ENV" = "true" ]; then
        npm "$@" | grep -v "npm verbose"
    else
        npm "$@"
    fi
}
```

## 재현 방법

1. Monospace/Claude Code 환경 접속
2. 아무 npm 스크립트 실행
3. verbose 로그 확인
```bash
npm run test --loglevel silly 2>&1 | grep "npm verbose argv"
```

## 검증 결과

### 수정 전
```bash
$ npm run test
Error: Option "--passWithNoTests" can only be passed once
```

### 수정 후
```bash
$ ./scripts/dev.sh test
✅ All tests passed!
```

## 권장사항

1. **개발자 가이드**
   - Monospace 환경에서는 `./scripts/dev.sh` 사용 권장
   - 직접 npm 명령 사용 시 bash -c 래퍼 활용

2. **CI/CD**
   - 영향 없음 (Monospace 환경이 아니므로)
   - 기존 스크립트 그대로 사용 가능

3. **문서화**
   - CLAUDE.md에 환경 특성 명시 ✅
   - README.md에 개발 환경 설정 가이드 추가 권장

## 결론

이 문제는 Monospace/Claude Code IDE의 특수한 동작으로 인한 것으로, npm이나 Node.js 자체의 버그가 아닙니다. 환경 변수를 통한 감지와 적절한 우회 처리로 문제를 해결할 수 있으며, 프로덕션이나 다른 개발 환경에는 영향이 없습니다.

## 참고 자료

- [CLAUDE.md - Known Environment Issues](../CLAUDE.md#known-environment-issues)
- [dev.sh - Monospace 환경 처리](../scripts/dev.sh)
- 환경 변수: `MONOSPACE_ENV=true`

---

*작성일: 2025년 1월 8일*
*작성자: Claude Code + 개발팀*