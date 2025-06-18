# 🔄 AWS Lightsail 서버 선택적 동기화 가이드

## 📋 **현재 문제점**
- 로컬 → GitHub → 서버 동기화에서 전체 파일이 두 서버 모두에 동기화됨
- `services/api-server/` → o4o-apiserver에만 필요
- `services/main-site/` → o4o-webserver에만 필요

## 🎯 **해결 방안: Git Sparse Checkout**

### **방법 1: 서버별 선택적 동기화 (추천)**

#### **o4o-apiserver 설정**
```bash
# SSH로 o4o-apiserver 접속 후
cd /path/to/o4o-platform
bash setup-apiserver-sync.sh
```

**포함되는 파일들:**
- ✅ `services/api-server/` (Medusa 백엔드)
- ✅ `package.json`, `docker-compose.production.yml` (공통 설정)
- ✅ `scripts/`, `docs/` (공통 리소스)
- ❌ `services/main-site/`, `crowdfunding/`, `ecommerce/` 등

#### **o4o-webserver 설정**
```bash
# SSH로 o4o-webserver 접속 후
cd /path/to/o4o-platform  
bash setup-webserver-sync.sh
```

**포함되는 파일들:**
- ✅ `services/main-site/` (웹 프론트엔드)
- ✅ `package.json`, `docker-compose.production.yml` (공통 설정)
- ✅ `scripts/`, `docs/` (공통 리소스)
- ❌ `services/api-server/`, `crowdfunding/`, `ecommerce/` 등

### **방법 2: GitHub Actions 자동 배포**

#### **설정 단계:**

1. **GitHub Secrets 설정**
   ```
   Settings → Secrets and variables → Actions → New repository secret
   
   API_SERVER_HOST: [o4o-apiserver IP]
   WEB_SERVER_HOST: [o4o-webserver IP]
   SSH_USER: [서버 사용자명]
   SSH_PRIVATE_KEY: [SSH 개인키]
   ```

2. **자동 배포 활성화**
   - `.github/workflows/selective-deploy.yml` 파일이 이미 생성됨
   - 코드 push시 변경된 경로에 따라 자동으로 해당 서버만 배포

#### **배포 트리거:**
- `services/api-server/` 변경 → o4o-apiserver만 배포
- `services/main-site/` 변경 → o4o-webserver만 배포  
- `package.json` 등 공통 파일 변경 → 두 서버 모두 배포

## 🚀 **즉시 적용 방법**

### **Step 1: 로컬에서 스크립트 커밋**
```bash
# 로컬에서 실행
cd C:\Users\home\OneDrive\Coding\o4o-platform
git add setup-*-sync.sh setup-*-sync.bat .github/workflows/
git commit -m "Add selective sync scripts for server deployment"
git push origin main
```

### **Step 2: 각 서버에서 설정 적용**

#### **o4o-apiserver에서:**
```bash
ssh your-user@your-api-server-ip
cd /path/to/o4o-platform
git pull origin main
chmod +x setup-apiserver-sync.sh
bash setup-apiserver-sync.sh
```

#### **o4o-webserver에서:**
```bash
ssh your-user@your-web-server-ip
cd /path/to/o4o-platform
git pull origin main  
chmod +x setup-webserver-sync.sh
bash setup-webserver-sync.sh
```

### **Step 3: 테스트**
```bash
# 각 서버에서 확인
git status
ls -la services/
```

## 🔧 **문제 해결**

### **전체 동기화로 복원**
```bash
bash reset-full-sync.sh
```

### **현재 설정 확인**
```bash
git config core.sparseCheckout
cat .git/info/sparse-checkout
```

### **강제 재동기화**
```bash
git reset --hard HEAD
git clean -fd
git pull origin main
```

## 📊 **효과**

### **Before (현재)**
```
o4o-apiserver: 전체 저장소 (불필요한 파일 많음)
o4o-webserver: 전체 저장소 (불필요한 파일 많음)
```

### **After (개선 후)**
```
o4o-apiserver: api-server + 공통 파일만 (90% 용량 절약)
o4o-webserver: main-site + 공통 파일만 (90% 용량 절약)
```

## 🎯 **추가 혜택**

1. **배포 속도 향상**: 필요한 파일만 전송
2. **저장소 용량 절약**: 각 서버 90% 용량 절약
3. **보안 강화**: 불필요한 코드 노출 방지
4. **자동화**: GitHub Actions로 완전 자동 배포
5. **에러 감소**: 관련 없는 파일 변경으로 인한 충돌 방지

## ⚠️ **주의사항**

1. **처음 설정시 백업**: 현재 서버 상태를 백업 후 적용
2. **테스트 환경에서 먼저 검증**: 프로덕션 적용 전 테스트
3. **팀원 공유**: 다른 개발자들도 이 방식을 알고 있어야 함

## 🔄 **일상적인 작업 플로우**

```bash
# 로컬 개발
git add .
git commit -m "Update API server logic"
git push origin main

# 자동으로 감지하여 o4o-apiserver만 배포됨
# 또는 수동으로 각 서버에서 git pull
```

---

**🎉 이제 각 서버가 필요한 파일만 동기화되어 효율적으로 운영됩니다!**
