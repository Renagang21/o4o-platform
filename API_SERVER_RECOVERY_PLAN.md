# API 서버 복구 계획

## 🚨 현재 상황
- **원격 API 서버**: 완전 다운 (ping, SSH, HTTPS 모두 실패)
- **로컬 빌드**: 누락 (dist 폴더 없음)
- **서비스 영향**: 모든 API 호출 실패

## 🎯 즉시 실행할 작업

### 1. 로컬 API 서버 빌드
```bash
# API 서버 빌드
cd apps/api-server
pnpm install
pnpm run build

# 빌드 확인
ls -la dist/main.js
```

### 2. 로컬 API 서버 실행 (임시 서비스)
```bash
# 개발 모드로 임시 실행
NODE_ENV=development PORT=3001 pnpm run start:dev

# 또는 PM2로 실행
NODE_ENV=development PORT=3001 \
JWT_SECRET=dev-jwt-secret-change-in-production \
JWT_REFRESH_SECRET=dev-refresh-secret-change-in-production \
pm2 start dist/main.js --name o4o-api-local
```

### 3. 원격 서버 상태 확인 (서버 관리자와 협의 필요)
```bash
# 서버 접속 가능 여부 확인
ssh ubuntu@43.202.242.215

# AWS EC2 인스턴스 상태 확인 필요
# - 인스턴스 중지/재시작
# - 보안 그룹 설정 확인
# - 네트워크 ACL 확인
```

## 🔧 원격 서버 복구 절차

### Phase 1: 서버 접근성 복구
1. AWS 콘솔에서 EC2 인스턴스 상태 확인
2. 보안 그룹 규칙 확인 (포트 22, 80, 443, 3001)
3. 인스턴스 재시작 시도

### Phase 2: 서비스 복구
```bash
# SSH 접속 후
sudo systemctl status pm2-ubuntu
pm2 list
pm2 logs

# 필요시 서비스 재시작
pm2 restart all
pm2 save

# Nginx 상태 확인
sudo systemctl status nginx
sudo nginx -t
```

### Phase 3: 애플리케이션 배포
```bash
# 로컬에서 최신 코드 배포
./scripts/deploy-main.sh api --force

# 또는 수동 배포
ssh ubuntu@43.202.242.215
cd ~/o4o-platform
git pull origin main
pnpm install
pnpm run build:packages
cd apps/api-server
pnpm run build
pm2 restart o4o-api-server
```

## 🏥 헬스 체크 및 테스트

### API 엔드포인트 테스트
```bash
# 기본 헬스 체크
curl https://api.neture.co.kr/health

# 인증 관련
curl https://api.neture.co.kr/api/auth/status

# CPT 관련
curl https://api.neture.co.kr/api/public/cpt/types

# SSO 체크
curl https://api.neture.co.kr/accounts/sso/check
```

## 🚀 배포 자동화 개선

### 로컬 API 서버 설정
```bash
# PM2 ecosystem 설정
cp ecosystem.config.apiserver.cjs ecosystem.config.local.cjs

# 로컬 환경변수 설정
cp apps/api-server/.env.development apps/api-server/.env.local

# 로컬 서버 시작
pnpm run pm2:start:local
```

### 모니터링 추가
```bash
# 상태 체크 스크립트 실행
./scripts/deploy-status.sh

# 로그 모니터링
pm2 logs --lines 50
```

## 📞 긴급 연락처
- **서버 관리자**: [관리자 연락처 필요]
- **AWS 계정 관리자**: [AWS 계정 담당자 연락처 필요]
- **도메인 관리자**: [DNS/도메인 담당자 연락처 필요]

## ⏰ 복구 우선순위
1. **즉시 (0-1시간)**: 로컬 API 서버 실행으로 임시 서비스
2. **단기 (1-4시간)**: 원격 서버 접근성 복구
3. **중기 (4-24시간)**: 전체 서비스 정상화
4. **장기 (1-7일)**: 모니터링 및 예방 조치 강화

## 📝 체크리스트
- [ ] 로컬 API 서버 빌드
- [ ] 로컬 API 서버 실행
- [ ] AWS EC2 인스턴스 상태 확인
- [ ] 보안 그룹 설정 확인
- [ ] 원격 서버 접속 복구
- [ ] PM2 서비스 재시작
- [ ] Nginx 설정 확인
- [ ] API 엔드포인트 테스트
- [ ] 전체 서비스 헬스 체크
- [ ] 모니터링 시스템 구축