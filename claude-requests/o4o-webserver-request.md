# O4O-WEBSERVER Claude Code 배포 요청

안녕하세요! o4o-webserver의 최신 변경사항을 프로덕션 서버에 배포해주세요.

## 📌 배포 작업 요청

### 1. 최신 코드 동기화
```bash
# main 브랜치에서 최신 변경사항 가져오기
git pull origin main
```

### 2. 의존성 설치 및 빌드
```bash
# 패키지 설치
npm install

# TypeScript 타입 체크
npm run type-check

# 프로덕션 빌드
npm run build
```

### 3. 환경변수 확인
- `.env.production` 파일이 올바르게 설정되어 있는지 확인
- 특히 다음 변수들이 설정되어 있는지 체크:
  - `NEXT_PUBLIC_API_URL` 
  - `NEXT_PUBLIC_APP_URL`
  - 기타 필수 환경변수

### 4. PM2로 서버 재시작
```bash
# 무중단 배포로 재시작
pm2 reload o4o-webserver --update-env

# 프로세스 상태 확인
pm2 list

# 로그 확인 (에러 없는지 체크)
pm2 logs o4o-webserver --lines 50
```

### 5. 배포 검증
```bash
# 헬스체크
curl http://localhost:3000/api/health

# 메인 페이지 응답 확인
curl -I http://localhost:3000

# 실시간 로그 모니터링 (문제 없는지 확인)
pm2 logs o4o-webserver --raw
```

## ⚠️ 주의사항
- 빌드 실패 시 이전 버전으로 롤백해주세요
- PM2 재시작 후 에러 로그가 없는지 반드시 확인
- 모든 작업 완료 후 사이트가 정상 작동하는지 브라우저로 확인

## 🔄 문제 발생 시
롤백이 필요한 경우:
```bash
# 이전 커밋으로 되돌리기
git log --oneline -5  # 최근 커밋 확인
git checkout [이전_커밋_해시]

# 재빌드 및 재배포
npm install
npm run build
pm2 reload o4o-webserver
```

작업 완료 후 배포 결과를 알려주세요. 감사합니다!