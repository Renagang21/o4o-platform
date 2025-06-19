# 문제 해결 가이드

## 🔥 긴급 상황 대응

### 사이트가 안 보일 때 (5분 해결법)
```bash
# 1단계: 프로세스 상태 확인
pm2 status
pm2 logs main-site --lines 20

# 2단계: 강제 재시작
pm2 restart main-site
pm2 restart api-server

# 3단계: 빌드 재실행
npm run build:web
npm run build:api

# 4단계: 브라우저 캐시 제거
# Ctrl+F5 (강력 새로고침)
```

### Git 동기화 충돌 해결
```bash
# 안전한 동기화 (데이터 손실 방지)
git status
git stash push -m "backup-$(date +%Y%m%d_%H%M)"
git fetch origin
git reset --hard origin/main

# 백업된 변경사항 복구 (필요시)
git stash list
git stash pop stash@{0}
```

## 🔄 **서버 동기화 문제 (실전 검증 완료)**

### **Git Sparse Checkout 문제**
**증상**: 파일이 누락되거나, 불필요한 파일이 동기화됨
**진단**:
```bash
# 현재 sparse checkout 상태 확인
git config core.sparseCheckout
cat .git/info/sparse-checkout 2>/dev/null || echo "Sparse checkout not configured"

# 실제 동기화된 파일 확인
git ls-files | wc -l
ls -la services/
```

**해결법** (실전 검증됨):
```bash
# 🚨 긴급 복구: Sparse Checkout 완전 해제
git config core.sparseCheckout false
rm -f .git/info/sparse-checkout
git read-tree -m -u HEAD

# ✅ 정상 상태 확인
git status
ls -la services/
git checkout main
```

### **서버별 선택적 동기화 설정**
**API 서버 설정**:
```bash
# API 서버용 sparse checkout 설정
git config core.sparseCheckout true
cat > .git/info/sparse-checkout << 'EOF'
package.json
package-lock.json
.env.example
.gitignore
docker-compose.production.yml
/services/api-server/
/scripts/
/docs/
/tests/
/.github/
EOF

git read-tree -m -u HEAD
```

**웹 서버 설정**:
```bash
# 웹 서버용 sparse checkout 설정
git config core.sparseCheckout true
cat > .git/info/sparse-checkout << 'EOF'
package.json
package-lock.json
.env.example
.gitignore
docker-compose.production.yml
playwright.config.ts
/services/main-site/
/scripts/
/docs/
/tests/
/.github/
EOF

git read-tree -m -u HEAD
```

### **동기화 상태 점검 자동화**
```bash
# 서버 동기화 상태 빠른 점검
#!/bin/bash
echo "=== 동기화 상태 점검 $(date) ==="
echo "현재 위치: $(pwd)"
echo "Git 브랜치: $(git branch --show-current)"
echo "Git 상태: $(git status --porcelain | wc -l)개 변경사항"
echo "총 파일 수: $(git ls-files | wc -l)개"
echo "Sparse 설정: $(git config core.sparseCheckout)"
echo "서비스 폴더: $(ls services/ 2>/dev/null | tr '\n' ' ')"
echo "============================="
```

## 🔧 자주 발생하는 문제

### 1. 환경변수 문제
**증상**: Database connection failed, JWT secret missing
**해결**:
```bash
# .env 파일 확인
cat .env | grep -E "DATABASE_URL|JWT_SECRET|REDIS_URL"

# 없으면 .env.example에서 복사
cp .env.example .env
nano .env  # 실제 값으로 수정
```

### 2. 포트 충돌 문제  
**증상**: Port 3000 already in use
**해결**:
```bash
# 포트 사용 프로세스 확인
lsof -i :3000
netstat -tulpn | grep :3000

# 프로세스 종료
kill -9 [PID]
# 또는 다른 포트 사용
PORT=3001 npm run dev
```

### 3. npm/yarn 의존성 문제
**증상**: Module not found, version conflicts
**해결**:
```bash
# 캐시 정리 후 재설치
rm -rf node_modules package-lock.json
npm cache clean --force
npm install

# 또는 yarn 사용시
rm -rf node_modules yarn.lock  
yarn cache clean
yarn install
```

### 4. 빌드 실패 문제
**증상**: Build failed, TypeScript errors
**해결**:
```bash
# TypeScript 타입 체크
npx tsc --noEmit

# 점진적 빌드
npm run build:api    # API만 먼저
npm run build:web    # 웹앱 다음

# 캐시 제거 후 재빌드
rm -rf dist/ build/
npm run build:all
```

### 5. **Medusa 버전 불일치 문제 (AI 버전 관리)**
**증상**: Medusa configuration errors, AI가 구 버전 방식 제안
**해결**:
```bash
# 현재 Medusa 버전 확인
npm list @medusajs/medusa

# ⚠️ AI 협업 시 주의사항
# 1. 현재 버전을 AI에게 명시: "Medusa 2.0 기준으로"
# 2. 최신 문서 참조: https://docs.medusajs.com/
# 3. 구 버전 제안 거부: "tsx를 html로 바꿔라" 등

# AI 버전 불일치 감지법
# - Options API 제안 (현재: Composition API)
# - CommonJS require() 제안 (현재: ESM import)
# - Class Component 제안 (현재: Function Component)
```

### 6. TipTap 에디터 문제
**증상**: Editor not rendering, extension errors
**해결**:
```bash
# TipTap 관련 패키지 버전 확인
npm list @tiptap/react @tiptap/starter-kit

# 호환되는 버전으로 다운그레이드/업그레이드
npm install @tiptap/react@^2.0.0 @tiptap/starter-kit@^2.0.0
```

### 7. **파일 구조 누락 문제** (새로 추가)
**증상**: services/ 폴더가 비어있거나, 특정 서비스 폴더 누락
**진단**:
```bash
# 파일 구조 확인
ls -la services/
git ls-files services/ | head -10

# Git 인덱스와 실제 파일 비교
git status --ignored
```

**해결**:
```bash
# 전체 파일 강제 복원
git reset --hard HEAD
git clean -fd
git checkout main

# Sparse checkout 문제인 경우
git config core.sparseCheckout false
git read-tree -m -u HEAD
```

## 📊 모니터링 명령어

### **서버 상태 종합 점검**
```bash
# 시스템 상태 확인
pm2 monit
pm2 logs --lines 50

# 디스크 사용량
df -h
du -sh ./node_modules

# 메모리 사용량  
free -h
ps aux | grep node

# Git 동기화 상태
git status && echo "파일 수: $(git ls-files | wc -l)"
```

### **동기화 상태 실시간 모니터링**
```bash
#!/bin/bash
# sync-monitor.sh (실전 검증된 스크립트)
while true; do
    clear
    echo "=== O4O Platform 동기화 모니터링 ==="
    echo "시간: $(date)"
    echo "브랜치: $(git branch --show-current)"
    echo "변경사항: $(git status --porcelain | wc -l)개"
    echo "총 파일: $(git ls-files | wc -l)개"
    echo "Sparse: $(git config core.sparseCheckout)"
    echo ""
    echo "서비스 상태:"
    ls -la services/ 2>/dev/null || echo "services/ 폴더 없음"
    echo ""
    echo "프로세스 상태:"
    pm2 jlist | jq -r '.[] | "\(.name): \(.pm2_env.status)"' 2>/dev/null || pm2 status
    echo "================================="
    sleep 30
done
```

## 🔍 서버별 문제 진단

### API 서버 문제
```bash
# API 서버 로그 확인
pm2 logs api-server --lines 100

# 데이터베이스 연결 테스트
npm run db:test

# API 엔드포인트 테스트
curl http://localhost:4000/health

# Medusa 서비스 확인
curl http://localhost:4000/store/products
```

### 웹 서버 문제
```bash
# 웹 서버 로그 확인
pm2 logs main-site --lines 100

# 정적 파일 확인
ls -la ./build/static/

# React 빌드 상태 확인
npm run build:web -- --verbose

# 프론트엔드 서비스 테스트
curl http://localhost:3000
```

## 🆘 복구 불가능할 때

### **단계별 복구 전략** (실전 검증됨)
```bash
# 1단계: 소프트 복구
git stash push -m "emergency-backup-$(date +%Y%m%d_%H%M)"
git reset --hard origin/main

# 2단계: 중간 복구
git config core.sparseCheckout false
rm -f .git/info/sparse-checkout
git read-tree -m -u HEAD

# 3단계: 하드 복구
git clean -fd
rm -rf node_modules
npm install

# 4단계: 마지막 수단 - 전체 재설치
git clone https://github.com/Renagang21/o4o-platform.git o4o-platform-fresh
cd o4o-platform-fresh
cp ../o4o-platform/.env .env
npm install
npm run dev:all
```

## 🚀 **성능 최적화 문제 해결**

### **빌드 속도 개선**
```bash
# 병렬 빌드
npm run build:api & npm run build:web & wait

# 캐시 활용
export NODE_ENV=development
npm run build:all

# TypeScript 증분 컴파일
npx tsc --incremental
```

### **메모리 부족 문제**
```bash
# Node.js 메모리 증가
export NODE_OPTIONS="--max-old-space-size=4096"
npm run build:all

# 프로세스별 메모리 사용량 확인
pm2 monit
```

## 📝 문제 해결 후 할 일

### **필수 후속 작업**
1. **해결 방법을 이 문서에 추가** (PR 또는 직접 수정)
2. **같은 문제 재발 방지를 위한 설정 개선**
3. **팀원들과 해결책 공유** (Slack, Discord 등)
4. **정기 점검 항목에 추가** 고려
5. **자동화 스크립트 개선** (monitoring, recovery)

### **문서 업데이트 템플릿**
```markdown
### 새로 발견된 문제: [문제 제목]
**증상**: [구체적 증상 설명]
**원인**: [근본 원인]
**해결법**:
```bash
[검증된 해결 명령어]
```
**예방법**: [재발 방지 방법]
**발견일**: YYYY-MM-DD
```

## 🔗 **관련 문서 및 리소스**

### **내부 문서**
- [AI 버전 관리 가이드](../ai-collaboration/version-management-guide.md)
- [환경 설정 가이드](../01-setup/environment-setup.md)
- [알려진 이슈 목록](known-issues.md)

### **외부 리소스**
- [Medusa 공식 문서](https://docs.medusajs.com/)
- [Git Sparse Checkout 가이드](https://git-scm.com/docs/git-sparse-checkout)
- [PM2 문서](https://pm2.keymetrics.io/docs/)

---

**마지막 업데이트**: 2025-06-19 (서버 동기화 실전 경험 반영)  
**다음 리뷰**: 문제 발생 시 또는 월 1회  
**검증 상태**: ✅ 실전 테스트 완료 (2025-06-19)
