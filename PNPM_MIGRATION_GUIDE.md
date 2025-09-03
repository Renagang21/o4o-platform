# 📦 O4O Platform pnpm 마이그레이션 작업 지시서

## 🎯 목표
- npm에서 pnpm으로 전환하여 **설치 속도 60-70% 개선**
- **디스크 사용량 70% 감소** (2-3GB → 600MB-1GB)
- CI/CD 빌드 시간 **90% 단축** (캐시 활용 시)

## ⚡ 즉시 실행 가능한 최적화 (pnpm 전환 전)

### 1단계: npm 최적화 설정 (5분 소요)
```bash
# .npmrc 파일 생성 또는 업데이트
cat > .npmrc << 'EOF'
# 성능 최적화
registry=https://registry.npmjs.org/
loglevel=warn
progress=false
audit=false
fund=false

# Monorepo 최적화
legacy-peer-deps=true
package-lock=true
save-exact=true

# 네트워크 최적화
fetch-retries=2
fetch-retry-mintimeout=10000
fetch-retry-maxtimeout=60000

# 캐시 최적화
prefer-offline=true
EOF
```

### 2단계: 선택적 설치 스크립트 추가
```bash
# package.json에 추가할 스크립트
"scripts": {
  "install:admin": "npm install --workspace=@o4o/admin-dashboard",
  "install:api": "cd apps/api-server && npm install",
  "install:web": "npm install --workspace=@o4o/main-site",
  "install:packages": "npm install --workspaces --if-present --include-workspace-root=false"
}
```

## 🚀 pnpm 마이그레이션 단계별 가이드

### 📋 사전 준비 체크리스트
- [ ] 현재 node_modules 백업 (선택사항)
- [ ] package-lock.json Git에 커밋
- [ ] 실행 중인 개발 서버 모두 중지

### 🔧 Phase 1: pnpm 설치 및 초기 설정 (10분)

```bash
# 1. pnpm 전역 설치
npm install -g pnpm@latest

# 2. pnpm 버전 확인 (v8.0 이상 권장)
pnpm --version

# 3. 기존 node_modules 및 lock 파일 정리
rm -rf node_modules
rm -rf apps/*/node_modules
rm -rf packages/*/node_modules

# 4. package-lock.json을 pnpm-lock.yaml로 변환
pnpm import

# 5. .npmrc를 pnpm용으로 업데이트
cat > .npmrc << 'EOF'
# pnpm 최적화 설정
auto-install-peers=true
strict-peer-dependencies=false
shamefully-hoist=true
node-linker=isolated

# 성능 설정
prefer-offline=true
verify-store-integrity=false

# Monorepo 설정
shared-workspace-lockfile=true
recursive-install=true
EOF

# 6. Git ignore 업데이트
echo "pnpm-lock.yaml" >> .gitignore
git rm --cached package-lock.json
```

### 🔧 Phase 2: pnpm 설치 실행 (5-10분)

```bash
# 1. 전체 설치 (첫 실행)
pnpm install

# 2. 설치 검증
pnpm list --depth=0

# 3. 빌드 테스트
pnpm run build:packages
```

### 🔧 Phase 3: package.json 스크립트 업데이트

```json
{
  "scripts": {
    "// === pnpm 최적화 스크립트 ===": "",
    "install:all": "pnpm install",
    "install:admin": "pnpm install --filter @o4o/admin-dashboard",
    "install:api": "pnpm install --filter @o4o/api-server",
    "install:web": "pnpm install --filter @o4o/main-site",
    "install:packages": "pnpm install --filter './packages/*'",
    
    "// === 개발 스크립트 (pnpm 버전) ===": "",
    "dev": "pnpm run --parallel dev:web dev:admin",
    "dev:web": "pnpm --filter @o4o/main-site dev",
    "dev:admin": "pnpm --filter @o4o/admin-dashboard dev",
    "dev:api": "pnpm --filter @o4o/api-server dev",
    
    "// === 빌드 스크립트 (pnpm 버전) ===": "",
    "build": "pnpm run build:packages && pnpm run build:apps",
    "build:packages": "pnpm run --parallel --filter './packages/*' build",
    "build:apps": "pnpm run --parallel --filter './apps/*' build",
    
    "// === 정리 스크립트 ===": "",
    "clean": "pnpm run --parallel -r clean",
    "clean:modules": "find . -name 'node_modules' -type d -prune -exec rm -rf {} +"
  }
}
```

### 🔧 Phase 4: CI/CD 스크립트 업데이트

#### scripts/ci-install-pnpm.sh
```bash
#!/bin/bash
set -e

echo "🚀 pnpm CI 설치 시작..."
START_TIME=$(date +%s)

# pnpm 설치 (이미 있으면 스킵)
if ! command -v pnpm &> /dev/null; then
    npm install -g pnpm@latest
fi

# 캐시 디렉토리 설정
export PNPM_HOME="/home/runner/.pnpm"
export PATH="$PNPM_HOME:$PATH"

# workspace 정리
find apps packages -name "node_modules" -type d -prune -exec rm -rf {} + 2>/dev/null || true

# pnpm 설치 (frozen lockfile 사용)
pnpm install --frozen-lockfile --prefer-offline

# 필수 패키지 빌드
pnpm run build:packages

END_TIME=$(date +%s)
DURATION=$((END_TIME - START_TIME))
echo "✅ pnpm CI 설치 완료! (${DURATION}초 소요)"
```

#### GitHub Actions 설정 (.github/workflows/ci.yml)
```yaml
name: CI
on: [push, pull_request]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - uses: pnpm/action-setup@v2
        with:
          version: 8
          
      - uses: actions/setup-node@v4
        with:
          node-version: '22'
          cache: 'pnpm'
      
      - name: Install dependencies
        run: pnpm install --frozen-lockfile
        
      - name: Build
        run: pnpm run build
        
      - name: Test
        run: pnpm run test
```

## 🔄 마이그레이션 후 일반 작업 명령어 변경

### 개발자용 치트시트
```bash
# 이전 (npm)                    → 새로운 (pnpm)
npm install                     → pnpm install
npm install express             → pnpm add express
npm install -D eslint           → pnpm add -D eslint
npm run dev                     → pnpm dev
npm run build                   → pnpm build

# Workspace 전용 명령어
npm run dev --workspace=admin   → pnpm --filter admin dev
npm install --workspaces        → pnpm install -r

# 특정 앱만 작업할 때 (빠른 설치)
cd apps/admin && npm install    → pnpm install --filter admin
```

## ⚠️ 주의사항 및 트러블슈팅

### 1. Phantom Dependencies 문제
```bash
# 문제: 일부 패키지가 import 되지 않음
# 해결: shamefully-hoist 활성화
echo "shamefully-hoist=true" >> .npmrc
pnpm install
```

### 2. Peer Dependencies 경고
```bash
# 문제: peer dependency 경고 다수 발생
# 해결: auto-install-peers 활성화
echo "auto-install-peers=true" >> .npmrc
```

### 3. 기존 스크립트 호환성
```bash
# npm 스크립트를 pnpm으로 실행
alias npm="pnpm"  # 임시 해결책
```

## 📊 성능 측정 및 검증

### 측정 스크립트 (scripts/measure-performance.sh)
```bash
#!/bin/bash
echo "📊 성능 측정 시작..."

# 클린 설치 시간 측정
rm -rf node_modules pnpm-lock.yaml
START=$(date +%s)
pnpm install
END=$(date +%s)
echo "pnpm 클린 설치: $((END-START))초"

# 캐시 설치 시간 측정
rm -rf node_modules
START=$(date +%s)
pnpm install
END=$(date +%s)
echo "pnpm 캐시 설치: $((END-START))초"

# 디스크 사용량
du -sh node_modules
```

## ✅ 마이그레이션 완료 체크리스트

- [ ] pnpm 전역 설치 완료
- [ ] pnpm-lock.yaml 생성 완료
- [ ] 모든 dependencies 설치 성공
- [ ] 개발 서버 정상 실행 (`pnpm dev`)
- [ ] 빌드 성공 (`pnpm build`)
- [ ] CI/CD 파이프라인 업데이트
- [ ] 팀원들에게 pnpm 사용법 공유

## 🎯 예상 결과

### Before (npm)
- 클린 설치: 8-12분
- 캐시 설치: 3-5분
- node_modules: 2-3GB
- CI 빌드: 10-15분

### After (pnpm)
- 클린 설치: **3-5분** ✨
- 캐시 설치: **30-60초** ✨
- node_modules: **600MB-1GB** ✨
- CI 빌드: **3-5분** ✨

## 📞 지원 및 문의

문제 발생 시:
1. 이 문서의 트러블슈팅 섹션 확인
2. `pnpm logs` 명령으로 로그 확인
3. `.npmrc` 설정 재검토

---

*마지막 업데이트: 2025년 9월*
*작성: O4O Platform DevOps Team*