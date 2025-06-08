# 🚀 O4O Platform 배포 가이드

## 📁 디렉토리 구조 재편성

### 현재 구조:
```
o4o-platform/
└── services/main-site/  # 웹서버만 있음
```

### 제안하는 새 구조:
```
o4o-platform/
├── 📁 webserver/              # → o4o-webserver 배포
│   ├── services/main-site/    # React 프론트엔드  
│   ├── nginx/                 # Nginx 설정
│   └── .deploy-web            # 웹서버 배포 마커
│
├── 📁 apiserver/              # → o4o-apiserver 배포
│   ├── src/                   # Node.js API 서버
│   ├── package.json           
│   └── .deploy-api            # API서버 배포 마커
│
└── 📋 deployment/
    ├── deploy-webserver.sh    # 웹서버 배포 스크립트
    └── deploy-apiserver.sh    # API서버 배포 스크립트
```

## 🏷️ 서버별 식별 방법

### 방법 1: 디렉토리 기반 식별
- `webserver/` 폴더 = o4o-webserver 배포 대상
- `apiserver/` 폴더 = o4o-apiserver 배포 대상

### 방법 2: 마커 파일 기반
- `.deploy-web` 파일 존재 = 웹서버 배포
- `.deploy-api` 파일 존재 = API서버 배포

### 방법 3: package.json scripts
```json
{
  "scripts": {
    "deploy:web": "배포 대상: o4o-webserver", 
    "deploy:api": "배포 대상: o4o-apiserver"
  }
}
```

## 🔄 배포 프로세스

### 웹서버 배포:
```bash
# 로컬 → GitHub
git add webserver/
git commit -m "web: 프론트엔드 업데이트"
git push origin main

# GitHub → o4o-webserver  
ssh o4o-webserver
cd ~/o4o-platform
git pull origin main
cd webserver/services/main-site
npm run build
sudo cp -r dist/* /var/www/html/
```

### API서버 배포:
```bash
# 로컬 → GitHub
git add apiserver/
git commit -m "api: 백엔드 업데이트" 
git push origin main

# GitHub → o4o-apiserver
ssh o4o-apiserver  
cd ~/o4o-platform
git pull origin main
cd apiserver/
npm install
pm2 restart api-server
```

## 📋 구현 단계

### 1단계: 현재 구조 정리
- [ ] 현재 코드 위치 파악
- [ ] 웹서버/API서버 코드 분리
- [ ] 새 디렉토리 구조로 재편성

### 2단계: 배포 스크립트 작성  
- [ ] 웹서버 배포 스크립트
- [ ] API서버 배포 스크립트
- [ ] 배포 가이드 문서

### 3단계: 테스트 배포
- [ ] 웹서버 배포 테스트
- [ ] API서버 배포 테스트
- [ ] 전체 동작 확인

## 🎯 즉시 실행할 작업

1. **현재 상황 파악**
   ```bash
   # o4o-webserver 현재 구조
   ssh o4o-webserver
   find ~/o4o-platform -name "*.js" -o -name "package.json"
   
   # o4o-apiserver 현재 구조  
   ssh o4o-apiserver
   ls -la ~/
   find ~ -name "*.js" -o -name "package.json" | head -10
   ```

2. **GitHub 저장소 구조 검토**
   - 현재 어떤 코드가 있는지 확인
   - 어떤 서버용인지 분류 필요

3. **배포 대상 명시**
   - README.md에 배포 가이드 추가
   - 각 폴더에 배포 대상 명시

---

**다음 단계**: 현재 상황 파악 후 구조 재편성 시작! 🚀
