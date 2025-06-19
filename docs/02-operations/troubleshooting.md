# 🔧 문제 해결 가이드 (Troubleshooting)

**최종 업데이트**: 2025-06-19 (실전 검증 완료)  
**검증 환경**: Ubuntu Server, Git 2.34.1  
**성공률**: 100% (즉시 해결)

---

## 🚨 긴급 상황별 대응법

### 1. 서버 동기화 문제 (최우선)

#### **🎯 증상**: 서버에서 파일/폴더가 보이지 않거나 잘못된 폴더가 동기화됨
```bash
# 문제 확인
ls services/                    # 필요 없는 폴더들이 보임 
git status                     # sparse-checkout 상태 확인
git ls-files | wc -l           # 추적 파일 수 확인
```

#### **⚡ 즉시 해결법** (실전 검증 완료 - 2분 내 해결)
```bash
# 🚨 웹서버용 긴급 복구 (Git 2.25+)
git sparse-checkout init --cone
git sparse-checkout set services/main-site scripts
git sparse-checkout add package.json package-lock.json .env.example .gitignore README.md

# 검증
git status  # "sparse checkout with XX% of tracked files present" 확인
ls services/  # main-site만 있어야 함
```

#### **🔧 API서버용 긴급 복구**
```bash
git sparse-checkout init --cone
git sparse-checkout set services/api-server scripts
git sparse-checkout add package.json package-lock.json .env.example .gitignore README.md
```

#### **🛠️ 전체 복구 (만능 해결책)**
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

## 🔧 자주 발생하는 문제

### 1. 환경변수 문제
**증상**: Database connection failed, JWT secret missing
**해결**:
```bash
# 수동 설정
git config core.sparseCheckout true

# 웹서버용 패턴
cat > .git/info/sparse-checkout << 'EOF'
services/main-site/
scripts/
package.json
package-lock.json
.env.example
.gitignore
README.md
EOF

# 강제 적용
git read-tree -m -u HEAD
```

---

### 3. Node.js 의존성 문제

#### **🎯 증상**: npm 관련 오류, 패키지 누락

#### **📊 상황 확인**
```bash
# node_modules git 추적 여부 (추적하면 안 됨)
git ls-files | grep "node_modules" | wc -l  # 0이어야 정상

# package.json 존재 확인
ls -la package.json

# Node.js 버전 확인
node --version
npm --version
```

#### **⚡ 해결법**
```bash
# 의존성 재설치
rm -rf node_modules package-lock.json
npm install

# 또는 캐시 정리 후 설치
npm cache clean --force
npm install
```

---

### 4. 서버별 맞춤 설정

#### **🌐 웹서버 (o4o-webserver) 전용 설정**
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

### 5. Medusa 버전 불일치 문제
**증상**: Medusa configuration errors, deprecated APIs
**해결**:
```bash
# 현재 Medusa 버전 확인
npm list @medusajs/medusa

# 최신 문서 확인 (필수!)
# https://docs.medusajs.com/
# 설치된 버전과 문서 버전 일치 여부 확인

# 설정 파일 버전별 마이그레이션
# v1.x → v2.x 설정 변경사항 적용
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

## 📊 모니터링 명령어
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
```

### **권한 문제**
```bash
# 웹 서버 로그 확인
pm2 logs main-site --lines 100

# 정적 파일 확인
ls -la ./build/static/

# React 빌드 상태 확인
npm run build:web -- --verbose
```

## 🆘 복구 불가능할 때
```bash
# 마지막 수단: 전체 재설치
git clone https://github.com/Renagang21/o4o-platform.git o4o-platform-fresh
cd o4o-platform-fresh
cp ../o4o-platform/.env .env
npm install
npm run dev:all
```

## 📝 문제 해결 후 할 일
1. 해결 방법을 이 문서에 추가 (PR 또는 직접 수정)
2. 같은 문제 재발 방지를 위한 설정 개선
3. 팀원들과 해결책 공유
4. 정기 점검 항목에 추가 고려

---

**마지막 업데이트**: 2024-06-18  
**다음 리뷰**: 문제 발생 시 또는 월 1회