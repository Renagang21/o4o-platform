# 📦 서버별 Package.json 설정 가이드

## 🎯 목적
각 서버가 필요한 패키지만 설치하여 설치 시간과 디스크 공간을 절약합니다.

## 📋 서버별 설정 파일

### 1. o4o-apiserver
- **파일**: `package.apiserver.json`
- **특징**: 
  - API 서버와 필수 packages만 포함
  - 프론트엔드 관련 패키지 제외
  - React, Vite, MUI 등 불필요한 의존성 제거

### 2. o4o-webserver  
- **파일**: `package.webserver.json`
- **특징**:
  - 프론트엔드 앱들과 UI 패키지 포함
  - api-server 제외
  - React, Vite 등 프론트엔드 도구 포함

### 3. 로컬 개발
- **파일**: `package.json` (기본)
- **특징**: 모든 workspace 포함

## 🚀 서버별 적용 방법

### o4o-apiserver에서:
```bash
# 1. 기존 package.json 백업
cp package.json package.json.backup

# 2. API 서버용 설정 적용
cp package.apiserver.json package.json

# 3. 기존 node_modules 제거 후 재설치
rm -rf node_modules package-lock.json
npm install

# 4. 빌드 및 실행
npm run build
npm run pm2:start
```

### o4o-webserver에서:
```bash
# 1. 기존 package.json 백업
cp package.json package.json.backup

# 2. 웹 서버용 설정 적용
cp package.webserver.json package.json

# 3. 기존 node_modules 제거 후 재설치
rm -rf node_modules package-lock.json
npm install

# 4. 빌드 및 실행
npm run build
npm run pm2:start
```

## ⚡ 성능 개선 효과

### Before (전체 설치):
- 설치 시간: 10-15분
- node_modules 크기: ~1.5GB
- 패키지 수: 2000+

### After (최적화):
#### API Server:
- 설치 시간: 2-3분
- node_modules 크기: ~300MB
- 패키지 수: ~500

#### Web Server:
- 설치 시간: 5-7분
- node_modules 크기: ~800MB
- 패키지 수: ~1200

## 🔄 Git 동기화 시 주의사항

1. **package.json을 커밋하지 마세요**
   ```bash
   # .gitignore에 추가 (서버별)
   echo "package.json" >> .gitignore.local
   ```

2. **서버별 설정 파일 유지**
   ```bash
   # git pull 후 다시 적용
   git pull origin main
   cp package.apiserver.json package.json  # apiserver
   cp package.webserver.json package.json   # webserver
   ```

3. **스크립트로 자동화**
   ```bash
   # setup-server.sh 생성
   #!/bin/bash
   SERVER_TYPE=$(cat .env | grep SERVER_TYPE | cut -d'=' -f2)
   
   if [ "$SERVER_TYPE" = "apiserver" ]; then
     cp package.apiserver.json package.json
   elif [ "$SERVER_TYPE" = "webserver" ]; then
     cp package.webserver.json package.json
   fi
   
   npm install
   ```

## 🛠️ 문제 해결

### npm install이 여전히 느린 경우:
```bash
# 1. npm 캐시 정리
npm cache clean --force

# 2. 더 빠른 레지스트리 사용
npm config set registry https://registry.npmmirror.com

# 3. 메모리 제한 (apiserver)
export NODE_OPTIONS="--max-old-space-size=1024"
npm install --prefer-offline --no-audit
```

### workspace 오류 발생 시:
```bash
# workspace 기능 비활성화
npm install --no-workspaces
```

## 📝 유지보수

### 새 패키지 추가 시:
1. 로컬에서 먼저 추가 및 테스트
2. 해당 서버 설정 파일 업데이트
3. 서버에 배포

### 정기적인 동기화:
```bash
# 월 1회 권장
git pull origin main
diff package.json package.apiserver.json  # 차이점 확인
# 필요시 package.apiserver.json 업데이트
```

---

*이 설정으로 각 서버는 필요한 패키지만 설치하여 효율적으로 운영됩니다.*