# O4O-WEBSERVER 동기화 배포 요청

## 배포 대상
- **저장소**: o4o-webserver
- **브랜치**: main
- **대상 서버**: Production Web Server

## 동기화할 변경사항

### 1. 최신 코드 변경사항
```bash
# 최신 변경사항 가져오기
git pull origin main

# 의존성 업데이트
npm install

# 빌드
npm run build
```

### 2. 환경 변수 확인
- `.env.production` 파일 확인
- 필요한 환경변수:
  - `NEXT_PUBLIC_API_URL`
  - `NEXT_PUBLIC_APP_URL`
  - `NEXT_PUBLIC_GA_MEASUREMENT_ID`
  - 기타 필수 환경변수

### 3. 빌드 및 검증
```bash
# TypeScript 타입 체크
npm run type-check

# 린트 검사
npm run lint

# 프로덕션 빌드
npm run build

# 빌드 결과 확인
ls -la .next/
```

### 4. PM2 프로세스 관리
```bash
# 현재 프로세스 확인
pm2 list

# 프로세스 재시작 (무중단 배포)
pm2 reload o4o-webserver --update-env

# 로그 확인
pm2 logs o4o-webserver --lines 100
```

### 5. 헬스체크
```bash
# 서버 상태 확인
curl http://localhost:3000/api/health

# 메인 페이지 응답 확인
curl -I http://localhost:3000
```

### 6. 캐시 정리 (필요시)
```bash
# Next.js 캐시 정리
rm -rf .next/cache

# CDN 캐시 무효화 (CloudFlare 등 사용시)
# API를 통한 캐시 퍼지
```

## 배포 체크리스트
- [ ] Git 최신 코드 동기화 완료
- [ ] 의존성 패키지 설치 완료
- [ ] 환경변수 설정 확인
- [ ] TypeScript 컴파일 성공
- [ ] 린트 검사 통과
- [ ] 프로덕션 빌드 성공
- [ ] PM2 프로세스 재시작 완료
- [ ] 헬스체크 정상 응답 확인
- [ ] 에러 로그 확인
- [ ] 사용자 접속 테스트 완료

## 롤백 계획
문제 발생시 즉시 이전 버전으로 롤백:
```bash
# 이전 커밋으로 되돌리기
git checkout [previous-commit-hash]

# 재빌드 및 배포
npm install
npm run build
pm2 reload o4o-webserver --update-env
```

## 모니터링
- PM2 대시보드 확인
- 에러 로그 모니터링
- 성능 메트릭 확인
- 사용자 피드백 수집