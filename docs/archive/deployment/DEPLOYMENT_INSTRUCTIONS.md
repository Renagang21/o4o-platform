# Admin Dashboard 배포 가이드

## 현재 상황
- 서버에서 npm 빌드가 타임아웃되는 문제가 있습니다
- 로컬에서 빌드 후 dist 폴더를 GitHub에 푸시하는 방식으로 배포해야 합니다

## 로컬 빌드 및 배포 절차

### 1. 로컬 환경에서 최신 코드 가져오기
```bash
git pull origin main
```

### 2. 의존성 설치 (필요시)
```bash
pnpm install
```

### 3. Admin Dashboard 빌드
```bash
# 프로젝트 루트에서
npm run build:admin

# 또는 admin-dashboard 디렉토리에서
cd apps/admin-dashboard
npm run build
```

### 4. 빌드 결과 확인
```bash
# dist 폴더가 생성되었는지 확인
ls -la apps/admin-dashboard/dist/

# index.html에 React 초기화 코드가 있는지 확인
grep "React 19 Compatibility" apps/admin-dashboard/dist/index.html
```

### 5. Git에 dist 폴더 추가 및 커밋
```bash
git add apps/admin-dashboard/dist/
git commit -m "build: update admin-dashboard dist for production deployment"
git push origin main
```

### 6. 서버에서 배포
서버에 SSH 접속 후:
```bash
cd /home/sohae21/o4o-platform
git pull origin main
# 서버가 자동으로 dist 폴더의 파일을 서빙합니다
```

## 중요 체크리스트
- [ ] dist/index.html에 React 19 초기화 코드가 포함되어 있는가?
- [ ] vendor-react가 다른 모듈보다 먼저 로드되도록 설정되어 있는가?
- [ ] WordPress 모듈(wp-all)이 React 이후에 로드되는가?

## 문제 해결
만약 "Cannot read properties of undefined (reading 'createContext')" 오류가 발생하면:
1. dist/index.html의 modulepreload 순서 확인
2. vendor-react가 가장 먼저 로드되는지 확인
3. 필요시 index.html을 수동으로 수정하여 순서 조정

## 참고사항
- 서버 npm 타임아웃 문제가 해결될 때까지 이 방식을 사용해야 합니다
- dist 폴더는 일반적으로 .gitignore에 포함되지만, 현재 상황에서는 예외적으로 커밋합니다