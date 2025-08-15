# NPM 설치 오류 해결 요청

npm install 중에 `ENOTEMPTY` 오류가 발생했습니다. 다음 단계로 해결해주세요:

## 🚨 오류 내용
```
npm error ENOTEMPTY: directory not empty, rename '/home/user/o4o-platform/node_modules/uuid' -> '/home/user/o4o-platform/node_modules/.uuid-jJqwJr4K'
```

## 🔧 해결 방법

### 방법 1: 빠른 해결 (권장)
```bash
# npm 캐시 정리
npm cache clean --force

# 문제가 되는 임시 디렉토리 제거
rm -rf node_modules/.uuid-*
rm -rf node_modules/.tmp-*
rm -rf node_modules/.staging

# 다시 설치 시도
npm install
```

### 방법 2: 완전한 재설치 (방법 1이 안 될 경우)
```bash
# 1. npm 캐시 정리
npm cache clean --force

# 2. node_modules 완전 삭제
rm -rf node_modules
rm -rf apps/*/node_modules
rm -rf packages/*/node_modules

# 3. package-lock.json 삭제
rm -f package-lock.json

# 4. 새로 설치
npm install

# 5. 패키지 빌드
npm run build:packages
```

### 방법 3: 스크립트 실행 (자동화)
```bash
# 스크립트 실행 권한 부여
chmod +x fix-npm-error.sh

# 스크립트 실행
./fix-npm-error.sh
```

## ✅ 확인 사항
설치 완료 후 다음을 확인:
```bash
# 설치 확인
npm list --depth=0

# API 서버 빌드 테스트
npm run build --workspace=@o4o/api-server

# 웹서버 빌드 테스트  
npm run build --workspace=@o4o/web-server
```

## 📝 주의사항
- 이 오류는 npm이 파일 시스템 작업 중 충돌이 발생할 때 나타남
- 주로 동시에 여러 npm 프로세스가 실행되거나 이전 설치가 불완전하게 종료됐을 때 발생
- node_modules를 삭제하는 것이 가장 확실한 해결 방법

해결 완료 후 원래 배포 작업을 계속 진행해주세요!