# Firebase Studio 환경 대응 가이드

## 🐛 NPM "2" 버그 대응 방법

Firebase Studio 환경에서 npm 명령 실행 시 발생하는 "2" 추가 현상에 대한 대응 가이드입니다.

### 증상
```bash
$ npm run lint
> eslint ... 2  # ← 명령어 끝에 "2"가 추가됨
Error: No files matching the pattern "2" were found.
```

### 원인
- Firebase Studio의 터미널 환경과 npm 10.8.2의 호환성 문제
- stderr 리다이렉션이 명령어의 일부로 잘못 해석됨

### 해결 방법

#### 1. 직접 실행 스크립트 사용 (권장)
```bash
# Lint 실행
./scripts/run-lint.sh

# Type Check 실행  
./scripts/type-check-all.sh

# Test 실행
./scripts/test-all.sh
```

#### 2. node_modules/.bin 직접 실행
```bash
# ESLint 직접 실행
./node_modules/.bin/eslint apps/admin-dashboard/src/**/*.tsx

# TypeScript 직접 실행 (프로젝트 디렉토리에서)
cd apps/admin-dashboard && ../../node_modules/.bin/tsc --noEmit
```

#### 3. npx 사용 (제한적)
```bash
# 단순 명령은 작동할 수 있음
npx eslint --version
```

### CI/CD 관련 주의사항

**중요**: Firebase Studio의 npm "2" 버그는 **로컬 환경에서만 발생**합니다.
- GitHub Actions CI/CD 환경에서는 정상 작동
- 로컬에서 lint/type-check 실패해도 코드가 정확하다면 push 가능
- CI/CD 결과로 최종 검증

### 개발 워크플로우

1. **코드 작성**
2. **로컬 검증** (가능한 경우)
   ```bash
   ./scripts/run-lint.sh
   ```
3. **검증 실패 시**
   - 코드 리뷰로 문제 확인
   - 문제없다고 판단되면 commit & push
4. **CI/CD 확인**
   - GitHub Actions에서 실제 검증 수행
   - 실패 시 수정 후 재푸시

### 추가 팁

1. **환경 변수 설정**
   ```bash
   export NODE_ENV=development
   ```

2. **npm 캐시 정리** (필요시)
   ```bash
   npm cache clean --force
   ```

3. **VS Code 터미널 대신 시스템 터미널 사용 고려**

### 관련 파일
- `/scripts/run-lint.sh` - ESLint 직접 실행
- `/scripts/type-check-all.sh` - TypeScript 검사
- `/scripts/test-all.sh` - 테스트 실행
- `/.npmrc` - npm 설정 (loglevel, progress)