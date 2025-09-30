# 배포 전 최종 체크리스트

## 🔍 서버 접속 정보
```bash
ssh ubuntu@43.202.242.215
```

## ✅ 배포 전 확인 사항

### 1. DNS 설정 확인
- [ ] api.neture.co.kr이 43.202.242.215를 가리키는지 확인
```bash
nslookup api.neture.co.kr
dig api.neture.co.kr
```

### 2. 현재 서버 상태 확인
```bash
# PM2 프로세스 확인
pm2 list

# 포트 확인
sudo netstat -tlnp | grep :4000

# API 헬스체크
curl http://localhost:4000/api/health
```

### 3. 필수 패키지 설치 확인
```bash
# Nginx 설치 여부
nginx -v

# Certbot 설치 여부
certbot --version

# Node.js 버전 확인 (v20 필요)
node --version
```

## 🚨 주의사항

### JWT Secret 생성
```bash
# 안전한 JWT Secret 생성
openssl rand -hex 32

# 안전한 Refresh Secret 생성
openssl rand -hex 32
```

### CORS 설정
- admin.neture.co.kr (관리자 대시보드)
- www.neture.co.kr (메인 사이트)
- 추가 도메인이 있다면 포함

### 데이터베이스 백업
```bash
# 배포 전 DB 백업
pg_dump -U o4o_user -d o4o_platform > backup_$(date +%Y%m%d_%H%M%S).sql
```

## 📝 문제 발생 시 롤백 계획

### 1. Nginx 설정 롤백
```bash
# 이전 설정으로 복원
sudo rm /etc/nginx/sites-enabled/api.neture.co.kr
sudo systemctl reload nginx
```

### 2. PM2 프로세스 복원
```bash
# 이전 상태로 복원
pm2 delete api-server
pm2 resurrect
```

### 3. 환경변수 복원
```bash
# 개발 환경으로 복원
cd /home/ubuntu/o4o-platform/apps/api-server
cp .env.backup .env.production
```

## 🔧 트러블슈팅

### 502 Bad Gateway 에러
1. PM2 프로세스 확인: `pm2 list`
2. API 서버 로그 확인: `pm2 logs api-server`
3. 포트 4000 리스닝 확인: `sudo netstat -tlnp | grep :4000`

### CORS 에러
1. Nginx 설정 확인: `/etc/nginx/sites-available/api.neture.co.kr`
2. API 서버 CORS 설정 확인: `.env.production`의 `CORS_ORIGIN`
3. 브라우저 개발자 도구에서 실제 오류 메시지 확인

### SSL 인증서 문제
1. 인증서 상태 확인: `sudo certbot certificates`
2. 인증서 갱신 테스트: `sudo certbot renew --dry-run`
3. Nginx SSL 설정 확인

## 📊 배포 후 모니터링

### 실시간 로그 모니터링
```bash
# Terminal 1: PM2 로그
pm2 logs api-server --lines 100

# Terminal 2: Nginx 액세스 로그
sudo tail -f /var/log/nginx/api.neture.co.kr.access.log

# Terminal 3: Nginx 에러 로그
sudo tail -f /var/log/nginx/api.neture.co.kr.error.log
```

### 성능 모니터링
```bash
# PM2 모니터링
pm2 monit

# 시스템 리소스
htop

# 네트워크 연결
ss -tunlp
```

---

**이 체크리스트와 함께 deployment-commands.sh의 명령어를 실행하면 안전하게 배포할 수 있습니다!**