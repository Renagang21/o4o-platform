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
# 모든 제한 해제
git sparse-checkout disable
git read-tree -m -u HEAD

# 상태 확인
ls services/  # 모든 폴더 보여야 함
git status   # 정상 상태 확인
```

---

### 2. Git Sparse-Checkout 문제

#### **🎯 증상**: sparse-checkout 설정했지만 모든 파일이 여전히 동기화됨

#### **🔍 원인 분석**
```bash
# 현재 설정 확인
git config core.sparseCheckout          # true여야 함
git sparse-checkout list                # 패턴 목록 확인
cat .git/info/sparse-checkout           # 수동 설정 확인
```

#### **⚡ 해결법** (Git 버전별)

**Git 2.25+ (권장 - 최신 방법)**
```bash
# 기존 설정 제거
git sparse-checkout init --cone

# 웹서버용
git sparse-checkout set services/main-site scripts

# API서버용  
git sparse-checkout set services/api-server scripts

# 공통 파일 추가
git sparse-checkout add package.json package-lock.json .env.example .gitignore README.md
```

**Git 2.24 이하 (구버전)**
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
#!/bin/bash
# 웹서버 전용 자동 설정
echo "🌐 웹서버 전용 설정 적용 중..."

git sparse-checkout init --cone
git sparse-checkout set services/main-site scripts

# 웹개발 관련 파일들
git sparse-checkout add \
  package.json \
  package-lock.json \
  tsconfig.json \
  next.config.js \
  tailwind.config.js \
  .env.example \
  .gitignore \
  README.md \
  vercel.json

echo "✅ 웹서버 설정 완료"
git status
```

#### **🔗 API서버 (o4o-apiserver) 전용 설정**  
```bash
#!/bin/bash
# API서버 전용 자동 설정
echo "🔗 API서버 전용 설정 적용 중..."

git sparse-checkout init --cone
git sparse-checkout set services/api-server scripts

# API 관련 파일들
git sparse-checkout add \
  package.json \
  package-lock.json \
  .env.example \
  .gitignore \
  README.md \
  ecosystem.config.js

echo "✅ API서버 설정 완료"
git status
```

---

## 🔍 자동 진단 도구

### **빠른 상태 점검**
```bash
#!/bin/bash
# health-check-quick.sh
echo "=== O4O 플랫폼 빠른 상태 점검 ==="

echo "📊 Git 상태:"
echo "  - 브랜치: $(git branch --show-current)"
echo "  - Sparse checkout: $(git config core.sparseCheckout)"
echo "  - 추적 파일: $(git ls-files | wc -l)개"

echo ""
echo "📁 Services 폴더:"
if [ -d "services" ]; then
    ls services/ | sed 's/^/  - /'
else
    echo "  ❌ services 폴더 없음"
fi

echo ""
echo "⚙️ 서버 타입 감지:"
if [ -d "services/main-site" ] && [ ! -d "services/api-server" ]; then
    echo "  🌐 웹서버 환경"
elif [ -d "services/api-server" ] && [ ! -d "services/main-site" ]; then
    echo "  🔗 API서버 환경"
elif [ -d "services/main-site" ] && [ -d "services/api-server" ]; then
    echo "  🔄 개발환경 (전체 동기화)"
else
    echo "  ❓ 알 수 없는 환경"
fi

echo ""
echo "🔧 Node.js 상태:"
echo "  - node_modules: $([ -d node_modules ] && echo '존재' || echo '없음')"
echo "  - package.json: $([ -f package.json ] && echo '존재' || echo '없음')"
echo "  - git 추적 node_modules: $(git ls-files | grep "node_modules" | wc -l)개"
```

---

## 🚀 자동 복구 스크립트

### **서버 타입별 자동 설정**
```bash
#!/bin/bash
# auto-setup-server.sh

echo "🔍 서버 환경 자동 감지 및 설정"

# 현재 위치 확인
if [ ! -d ".git" ]; then
    echo "❌ Git 저장소가 아닙니다."
    exit 1
fi

# 백업 생성
git stash push -m "auto_setup_backup_$(date +%Y%m%d_%H%M%S)"

# Git 버전 확인
git_version=$(git --version | cut -d' ' -f3)
echo "Git 버전: $git_version"

# 서버 타입 감지 (현재 호스트명 기준)
hostname=$(hostname)
if [[ $hostname == *"webserver"* ]] || [[ $hostname == *"web"* ]]; then
    server_type="webserver"
elif [[ $hostname == *"api"* ]] || [[ $hostname == *"backend"* ]]; then
    server_type="apiserver"
else
    # 사용자 선택
    echo "서버 타입을 선택하세요:"
    echo "1) 웹서버 (main-site)"
    echo "2) API서버 (api-server)"
    echo "3) 전체 (개발환경)"
    read -p "선택 (1-3): " choice
    
    case $choice in
        1) server_type="webserver" ;;
        2) server_type="apiserver" ;;
        3) server_type="full" ;;
        *) server_type="webserver" ;;
    esac
fi

echo "🎯 감지된 서버 타입: $server_type"

# 타입별 설정 적용
case $server_type in
    "webserver")
        echo "🌐 웹서버 전용 설정 적용..."
        git sparse-checkout init --cone
        git sparse-checkout set services/main-site scripts
        git sparse-checkout add package.json package-lock.json tsconfig.json next.config.js .env.example .gitignore README.md
        ;;
    
    "apiserver")
        echo "🔗 API서버 전용 설정 적용..."
        git sparse-checkout init --cone
        git sparse-checkout set services/api-server scripts
        git sparse-checkout add package.json package-lock.json ecosystem.config.js .env.example .gitignore README.md
        ;;
    
    "full")
        echo "🔄 전체 동기화 설정..."
        git sparse-checkout disable
        ;;
esac

# 결과 확인
echo ""
echo "✅ 설정 완료!"
echo "📊 결과:"
git status
echo ""
echo "📁 Services 폴더:"
ls services/ 2>/dev/null | sed 's/^/  - /' || echo "  없음"
```

---

## 📋 예방 수칙

### **일일 점검 체크리스트**
```bash
# 매일 작업 시작 전 실행
./scripts/health-check.sh

# 간단 확인
git status                    # sparse-checkout 상태
ls services/                  # 필요한 서비스만 있는지
git pull origin main          # 최신 코드 동기화
```

### **정기 점검 항목**
- **매일**: Git 상태, 서비스 폴더 확인
- **매주**: Node.js 의존성 업데이트 (`npm outdated`)
- **매월**: 전체 시스템 점검 및 성능 최적화

### **문제 예방 수칙**
1. **서버별 맞춤 설정 유지**
2. **node_modules는 git 추적하지 않기**
3. **package.json 변경 시에만 npm install**
4. **정기적인 백업 및 상태 확인**

---

## 📞 긴급 연락처

### **문제 해결 불가능한 경우**
1. **Slack #dev-support** 채널에 아래 정보와 함께 요청:
   ```
   🚨 서버 동기화 문제 발생
   - 서버: [hostname]
   - 증상: [구체적 설명]
   - 시도한 해결책: [실행한 명령어들]
   - 현재 상태: git status 결과
   ```

2. **GitHub Issues** 생성:
   - 라벨: `bug`, `urgent`, `server-sync`
   - 템플릿: troubleshooting issue

---

## 🎓 고급 문제 해결

### **Git 객체 손상**
```bash
# Git 저장소 복구
git fsck --full
git gc --aggressive --prune=now
```

### **권한 문제**
```bash
# 파일 권한 수정
find . -type f -name "*.sh" -exec chmod +x {} \;
chown -R ubuntu:ubuntu ~/o4o-platform/
```

### **디스크 공간 부족**
```bash
# 불필요한 파일 정리
git clean -fd
npm cache clean --force
rm -rf node_modules/.cache/
```

---

## 📚 참고 자료

- **운영 가이드**: `docs/02-operations/`
- **성공 사례**: `docs/02-operations/webserver-sparse-checkout-success.md`
- **스크립트 모음**: `scripts/`
- **GitHub Actions**: `.github/workflows/`

---

*이 문서는 실제 서버 운영 경험을 바탕으로 작성되었으며, 지속적으로 업데이트됩니다.*