# 🔧 O4O Platform 배포 문제 대응 가이드

> 이 문서는 현재 코드베이스에 이미 구축된 시스템을 활용한 즉각적인 대응 방안입니다.

## 📊 현재 인프라 현황

### 이미 구축된 자동화 시스템
1. **GitHub Actions 워크플로우** (31개)
   - `deploy-api-server.yml` - API 서버 자동 배포
   - `deploy-cors-urgent.yml` - CORS 긴급 수정 배포
   - `deploy-admin-dashboard.yml` - 관리자 대시보드 배포

2. **배포 스크립트** (9개)
   - `scripts/deployment/deploy-apiserver.sh`
   - `scripts/deployment/fix-cors-urgent.sh`
   - `scripts/deployment/verify-deployment.sh`

3. **PM2 설정 파일**
   - `ecosystem.config.apiserver.cjs` - API 서버용
   - `ecosystem.config.local.cjs` - 로컬 개발용

## 🚨 즉시 대응 가능한 방법

### 1. CORS 문제 발생 시 (현재 상황)

#### 방법 A: GitHub Actions 수동 트리거 (추천) ✅
```bash
# GitHub 웹사이트에서:
1. Actions 탭 → deploy-cors-urgent 선택
2. "Run workflow" 버튼 클릭
3. main 브랜치 선택 후 실행

# 또는 GitHub CLI 사용:
gh workflow run deploy-cors-urgent.yml
```

#### 방법 B: 로컬에서 긴급 스크립트 실행
```bash
# 이미 만들어진 스크립트 사용
./scripts/deployment/fix-cors-urgent.sh
```

#### 방법 C: package.json 스크립트 활용
```bash
# API 서버만 빌드 및 배포
npm run build:api
# 그 후 수동으로 서버에 업로드
```

### 2. API 서버 전체 재배포

#### GitHub Actions 활용 (자동화됨)
```bash
# main 브랜치에 push하면 자동 실행
git add .
git commit -m "fix: trigger api deployment"
git push origin main

# 또는 수동 트리거
gh workflow run deploy-api-server.yml
```

### 3. 배포 상태 확인

#### 방법 A: GitHub Actions 대시보드
- https://github.com/Renagang21/o4o-platform/actions 접속
- 실행 중인 워크플로우 확인

#### 방법 B: 검증 스크립트 실행
```bash
./scripts/deployment/verify-deployment.sh
```

## 📋 체크리스트 기반 대응

### CORS 에러 체크리스트
- [ ] 1. 브라우저 콘솔에서 정확한 에러 메시지 확인
- [ ] 2. API 서버 헬스체크: `curl https://api.neture.co.kr/health`
- [ ] 3. CORS 헤더 테스트:
```bash
curl -I -X OPTIONS https://api.neture.co.kr/api/v1/auth/login \
  -H 'Origin: https://admin.neture.co.kr' \
  -H 'Access-Control-Request-Method: POST'
```
- [ ] 4. GitHub Actions에서 `deploy-cors-urgent` 실행
- [ ] 5. 3분 대기 후 재테스트

### 배포 실패 체크리스트
- [ ] 1. GitHub Actions 로그 확인
- [ ] 2. SSH 키 유효성 확인 (Settings → Secrets)
- [ ] 3. 서버 디스크 공간 확인
- [ ] 4. PM2 프로세스 상태 확인

## 🔍 문제별 빠른 해결법

### "No 'Access-Control-Allow-Origin' header"
```bash
# 1단계: 긴급 배포 실행
gh workflow run deploy-cors-urgent.yml

# 2단계: 5분 후 확인
curl -I https://api.neture.co.kr/api/health -H 'Origin: https://admin.neture.co.kr'
```

### "502 Bad Gateway"
```bash
# API 서버가 다운된 경우
# GitHub Actions에서 deploy-api-server 실행
gh workflow run deploy-api-server.yml
```

### "Connection refused"
```bash
# PM2 프로세스 확인 필요
# verify-deployment.sh 스크립트 실행으로 상태 확인
./scripts/deployment/verify-deployment.sh
```

## 🛠 환경 변수 관리

### 필수 GitHub Secrets (이미 설정됨)
- `API_SSH_KEY` - API 서버 SSH 키
- `API_HOST` - API 서버 호스트
- `API_USER` - API 서버 사용자
- `DB_HOST`, `DB_PORT`, `DB_USERNAME`, `DB_PASSWORD`
- `JWT_SECRET`, `JWT_REFRESH_SECRET`

### 로컬 테스트용 환경 변수
```bash
# .env.local 파일 사용 (이미 있음)
cp .env.example .env.local
# 필요한 값 설정 후
npm run pm2:start:local
```

## 📈 모니터링

### 실시간 로그 확인
```bash
# GitHub Actions 로그
gh run watch

# PM2 로그 (서버에서)
pm2 logs o4o-api --lines 100
```

### 헬스체크 엔드포인트
- API: https://api.neture.co.kr/health
- Admin: https://admin.neture.co.kr (프론트엔드)

## 🚀 개선 제안 (단계적 적용)

### 단기 (즉시 적용 가능)
1. **환경 변수 통합**: `.env.production` 파일로 모든 설정 통합
2. **헬스체크 자동화**: GitHub Actions에 헬스체크 스텝 추가
3. **롤백 스크립트**: 이전 버전으로 빠른 롤백

### 중기 (1-2주)
1. **Slack/Discord 알림**: 배포 성공/실패 알림
2. **자동 롤백**: 헬스체크 실패 시 자동 롤백
3. **스테이징 환경**: 프로덕션 배포 전 테스트

### 장기 (1개월+)
1. **Docker 컨테이너화**: 환경 일관성 보장
2. **Blue-Green 배포**: 무중단 배포
3. **모니터링 대시보드**: Grafana/Prometheus

## 📞 긴급 연락 및 에스컬레이션

1. **1차 대응**: GitHub Actions 수동 실행
2. **2차 대응**: 배포 스크립트 직접 실행
3. **3차 대응**: SSH 접속하여 수동 작업
4. **최종 대응**: 서버 재시작 (PM2 또는 시스템)

---

**마지막 업데이트**: 2025년 8월 19일
**문서 버전**: 1.0.0
**작성자**: O4O Platform Team