# 서버 배포 문제 해결 가이드

## 현재 문제
1. **WordPress 모듈 React Context 오류**
   - 오류 메시지: "Cannot read properties of undefined (reading 'createContext')"
   - 원인: WordPress 모듈이 React보다 먼저 로드되어 발생

2. **서버 빌드 타임아웃**
   - npm run build가 서버에서 타임아웃됨
   - 로컬에서 빌드 후 dist 폴더를 커밋해야 함

## 즉시 해결 방법

### 로컬에서 수행할 작업:
```bash
# 1. 최신 코드 가져오기
git pull origin main

# 2. 의존성 설치
pnpm install

# 3. Admin Dashboard 빌드
cd apps/admin-dashboard
npm run build

# 4. 빌드된 파일 확인
cat dist/index.html | grep "React 19"
# React 초기화 코드가 있는지 확인

# 5. modulepreload 순서 확인 (React가 먼저 로드되는지)
grep "modulepreload" dist/index.html

# 6. 필요시 index.html 수정
# vendor-react가 가장 먼저 오도록 수정

# 7. Git에 커밋
git add dist/
git commit -m "build: update admin-dashboard with React loading fix"
git push origin main
```

### 서버에서 수행할 작업:
```bash
# 1. 최신 코드 가져오기
cd /home/sohae21/o4o-platform
git pull origin main

# 2. 배포 확인
ls -la apps/admin-dashboard/dist/

# 3. 서비스 재시작 (필요시)
# PM2나 다른 프로세스 매니저 사용 중이라면 재시작
```

## 검증 방법
1. https://admin.neture.co.kr 접속
2. 개발자 도구 콘솔 확인
3. React Context 오류가 없어야 함
4. 로그인 페이지가 정상 로드되어야 함

## 장기 해결 방안
1. 서버 npm 타임아웃 문제 해결
2. CI/CD 파이프라인 구축으로 자동 빌드 및 배포
3. Vite 설정에서 chunk 순서 보장 개선