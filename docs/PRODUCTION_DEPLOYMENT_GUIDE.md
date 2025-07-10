# O4O Platform - 운영 환경 배포 가이드

## 🚀 개요

이 가이드는 O4O Platform을 AWS Lightsail 운영 환경에 안전하고 체계적으로 배포하는 방법을 설명합니다.

### 배포 아키텍처
```
인터넷
    ↓
Nginx Gateway (SSL Termination)
    ↓
┌─────────────────────────────────────┐
│  neture.co.kr → PM2:3000 (main-site)     │
│  admin.neture.co.kr → PM2:3001 (admin)   │
│  api.neture.co.kr → PM2:4000 (api)       │
└─────────────────────────────────────┘
```

---

## 📋 사전 준비사항

### 1. 서버 환경
- **OS**: Ubuntu 20.04 LTS 이상
- **CPU**: 최소 2 vCPU
- **메모리**: 최소 4GB RAM
- **스토리지**: 최소 40GB SSD
- **네트워크**: 고정 IP 주소

### 2. 도메인 DNS 설정
다음 A 레코드를 서버 IP로 설정:
```
neture.co.kr        → [서버_IP]
www.neture.co.kr    → [서버_IP]
admin.neture.co.kr  → [서버_IP]
api.neture.co.kr    → [서버_IP]
```

### 3. GitHub Secrets 설정
GitHub 저장소의 Settings > Secrets에 다음 값들을 설정:

#### 서버 연결
- `SSH_PRIVATE_KEY`: AWS Lightsail SSH 개인키
- `SERVER_HOST`: 서버 IP 주소

#### 데이터베이스
- `DB_HOST`: PostgreSQL 호스트
- `DB_PORT`: PostgreSQL 포트 (기본: 5432)
- `DB_USERNAME`: PostgreSQL 사용자명
- `DB_PASSWORD`: PostgreSQL 비밀번호
- `DB_NAME`: 데이터베이스 이름

#### 보안
- `JWT_SECRET`: JWT 토큰 서명 키 (최소 64자)
- `JWT_EXPIRES_IN`: JWT 만료 시간 (예: "24h")
- `HEALTH_CHECK_KEY`: 헬스체크 인증 키

#### CORS 및 도메인
- `CORS_ORIGIN`: 허용된 오리진 (https://neture.co.kr,https://admin.neture.co.kr)
- `LOG_LEVEL`: 로그 레벨 (production에서는 "info")

---

## 🔧 단계별 배포 프로세스

### 1단계: 서버 기본 설정

```bash
# 서버에 SSH 접속
ssh ubuntu@[서버_IP]

# 시스템 업데이트
sudo apt update && sudo apt upgrade -y

# 필수 패키지 설치
sudo apt install -y curl wget git build-essential nginx postgresql-client
```

### 2단계: Node.js 20.x 설치

```bash
# NodeSource 저장소 추가
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -

# Node.js 설치
sudo apt install -y nodejs

# 버전 확인
node --version  # v20.x 확인
npm --version
```

### 3단계: PM2 설치

```bash
# PM2 글로벌 설치
sudo npm install -g pm2

# PM2 시스템 시작 시 자동 실행 설정
pm2 startup
sudo env PATH=$PATH:/usr/bin $(which pm2) startup systemd -u ubuntu --hp /home/ubuntu
```

### 4단계: PostgreSQL 설정

```bash
# PostgreSQL 설치 (필요한 경우)
sudo apt install -y postgresql postgresql-contrib

# 데이터베이스 생성
sudo -u postgres createdb o4o_platform
sudo -u postgres createuser o4o_user

# 비밀번호 설정
sudo -u postgres psql -c "ALTER USER o4o_user PASSWORD 'your_secure_password';"
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE o4o_platform TO o4o_user;"
```

### 5단계: SSL 인증서 설정

```bash
# SSL 설정 스크립트 실행
cd /home/ubuntu
git clone https://github.com/Renagang21/o4o-platform.git
cd o4o-platform
sudo ./scripts/setup-ssl-certificates.sh
```

### 6단계: 프로젝트 클론 및 설정

```bash
# 프로젝트 클론 (이미 완료된 경우 생략)
cd /home/ubuntu
git clone https://github.com/Renagang21/o4o-platform.git
cd o4o-platform

# 의존성 설치
npm install
```

---

## 🔄 자동 배포 설정

### GitHub Actions 트리거

1. **API 서버 배포**: `services/api-server/` 변경 시 자동 실행
2. **메인 사이트 배포**: `services/main-site/` 변경 시 자동 실행  
3. **관리자 대시보드 배포**: `services/admin-dashboard/` 변경 시 자동 실행

### 수동 배포 트리거

GitHub Actions 페이지에서 "Run workflow" 버튼으로 강제 배포 가능:
- `workflow_dispatch` 이벤트 지원
- `force_deploy` 옵션으로 경로 변경 없이도 배포 가능

---

## 📊 모니터링 및 헬스체크

### 헬스체크 엔드포인트

| 서비스 | URL | 설명 |
|--------|-----|------|
| API 서버 | `https://api.neture.co.kr/health` | API 서버 기본 상태 |
| API 상세 | `https://api.neture.co.kr/health/detailed` | DB, 메모리, CPU 포함 |
| 메인 사이트 | `https://neture.co.kr/health.html` | 프론트엔드 상태 |
| 관리자 | `https://admin.neture.co.kr/health.html` | 관리자 대시보드 상태 |

### 모니터링 스크립트

```bash
# 헬스체크 모니터링 실행
cd /home/ubuntu/o4o-platform
./scripts/health-check-monitor.sh --once      # 한 번 실행
./scripts/health-check-monitor.sh --continuous # 연속 모니터링
```

### 크론탭 설정 (자동 모니터링)

```bash
# 크론탭 편집
crontab -e

# 5분마다 헬스체크 실행
*/5 * * * * /home/ubuntu/o4o-platform/scripts/health-check-monitor.sh --once >> /var/log/o4o-health-cron.log 2>&1
```

---

## 🔒 보안 설정

### 방화벽 구성

```bash
# UFW 기본 설정
sudo ufw default deny incoming
sudo ufw default allow outgoing

# 필요한 포트만 허용
sudo ufw allow ssh
sudo ufw allow 80
sudo ufw allow 443

# 방화벽 활성화
sudo ufw enable
```

### Nginx 보안 헤더

생성된 `nginx/production.conf` 파일에 포함된 보안 기능:
- HSTS (Strict Transport Security)
- X-Frame-Options
- X-Content-Type-Options
- X-XSS-Protection
- Content Security Policy (관리자 페이지)

### SSL 설정

- **프로토콜**: TLS 1.2, 1.3만 허용
- **암호화**: 강력한 cipher suite 사용
- **인증서**: Let's Encrypt 자동 갱신

---

## 📈 성능 최적화

### PM2 클러스터 모드

각 서비스는 PM2 클러스터 모드로 실행:
- API 서버: CPU 코어 수만큼 인스턴스
- 메인 사이트: CPU 코어 수만큼 인스턴스  
- 관리자: 2개 인스턴스 (보안상 제한)

### 정적 파일 최적화

- Nginx에서 직접 정적 파일 서빙
- Gzip 압축 활성화
- 브라우저 캐싱 헤더 설정
- CDN 역할을 위한 별도 디렉토리 배치

---

## 🚨 문제 해결

### 일반적인 문제

#### 1. SSL 인증서 발급 실패
```bash
# DNS 전파 확인
nslookup neture.co.kr
nslookup admin.neture.co.kr
nslookup api.neture.co.kr

# 웹루트 권한 확인
sudo chown -R www-data:www-data /var/www/html
sudo chmod -R 755 /var/www/html
```

#### 2. PM2 프로세스 오류
```bash
# PM2 상태 확인
pm2 status
pm2 logs

# 프로세스 재시작
pm2 restart all

# 메모리 사용량 확인
pm2 monit
```

#### 3. 데이터베이스 연결 실패
```bash
# PostgreSQL 연결 테스트
psql -h localhost -U o4o_user -d o4o_platform -c "SELECT 1;"

# 서비스 상태 확인
sudo systemctl status postgresql
```

#### 4. Nginx 설정 오류
```bash
# 설정 파일 테스트
sudo nginx -t

# 로그 확인
sudo tail -f /var/log/nginx/error.log
sudo tail -f /var/log/nginx/access.log
```

### 로그 위치

| 서비스 | 로그 위치 |
|--------|-----------|
| API 서버 | `/home/ubuntu/o4o-platform/logs/api-server-*.log` |
| 메인 사이트 | `/home/ubuntu/o4o-platform/logs/main-site-*.log` |
| 관리자 | `/home/ubuntu/o4o-platform/logs/admin-dashboard-*.log` |
| Nginx | `/var/log/nginx/*.log` |
| 헬스체크 | `/var/log/o4o-health-monitor.log` |

---

## 🔄 롤백 절차

### 자동 롤백

CI/CD 파이프라인에서 배포 실패 시 자동 롤백:
1. 헬스체크 실패 감지
2. 이전 백업에서 파일 복원
3. PM2 서비스 재시작
4. 알림 발송

### 수동 롤백

```bash
# 서비스 중지
pm2 stop all

# 백업에서 복원
cd /home/ubuntu/o4o-platform
mv services/api-server services/api-server.failed
mv services/api-server.backup services/api-server

# 서비스 재시작
pm2 restart all

# 상태 확인
pm2 status
./scripts/health-check-monitor.sh --once
```

---

## 📞 긴급 연락처 및 지원

### 알림 설정

```bash
# 이메일 알림 설정
export NOTIFICATION_EMAIL="admin@neture.co.kr"

# Slack 알림 설정 (선택사항)
export SLACK_WEBHOOK_URL="https://hooks.slack.com/services/..."
```

### 24/7 모니터링

프로덕션 환경에서는 다음을 권장:
- **업타임 모니터링**: Pingdom, UptimeRobot 등
- **APM 도구**: New Relic, DataDog 등
- **로그 분석**: ELK Stack, Fluentd 등
- **알림 시스템**: PagerDuty, Slack, 이메일

---

## ✅ 배포 완료 체크리스트

### 필수 확인사항

- [ ] 모든 도메인이 올바른 IP로 해석됨
- [ ] SSL 인증서가 모든 도메인에 정상 적용됨
- [ ] PM2 프로세스가 모두 정상 실행 중
- [ ] 데이터베이스 연결이 정상
- [ ] 각 헬스체크 엔드포인트가 정상 응답
- [ ] 관리자 로그인이 정상 작동
- [ ] API 엔드포인트가 정상 응답
- [ ] CORS 설정이 올바름
- [ ] 로그 파일이 정상 생성됨
- [ ] 자동 모니터링이 활성화됨

### 성능 확인

- [ ] 페이지 로딩 시간 < 3초
- [ ] API 응답 시간 < 500ms
- [ ] 메모리 사용량 < 80%
- [ ] CPU 사용량 < 70%
- [ ] 디스크 사용량 < 80%

### 보안 확인

- [ ] HTTPS 강제 리디렉션 작동
- [ ] 보안 헤더가 모두 설정됨
- [ ] 관리자 페이지 접근 제한 작동
- [ ] 인증이 필요한 API 보호됨
- [ ] 환경 변수가 안전하게 관리됨

---

이 가이드를 따라 배포하면 O4O Platform이 안정적이고 확장 가능한 프로덕션 환경에서 운영됩니다.