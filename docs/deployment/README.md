# 🚀 O4O Platform 배포 가이드

## 📋 목차
- [배포 시스템 개요](#배포-시스템-개요)
- [빠른 시작](#빠른-시작)
- [자동 배포 (GitHub Actions)](#자동-배포-github-actions)
- [수동 배포 (로컬 스크립트)](#수동-배포-로컬-스크립트)
- [배포 스크립트 상세](#배포-스크립트-상세)
- [트러블슈팅](#트러블슈팅)
- [체크리스트](#체크리스트)

---

## 배포 시스템 개요

O4O Platform은 두 가지 배포 방식을 지원합니다:

### 1️⃣ 자동 배포 (GitHub Actions)
- **대상**: Admin Dashboard (웹서버)
- **방식**: `git push origin main` → 자동 빌드 및 배포
- **장점**: 완전 자동화, 무중단 배포

### 2️⃣ 수동 배포 (로컬 스크립트)
- **대상**: API 서버, Nginx 설정
- **방식**: 로컬에서 스크립트 실행
- **장점**: 보안, 제어, 디버깅 용이

### 서버 환경

| 서버 | IP | 역할 | 기술스택 |
|------|-------|------|----------|
| 웹서버 | 13.125.144.8 | 정적 파일 서빙 | Nginx |
| API서버 | 43.202.242.215 | REST API, DB | Node.js, PM2, PostgreSQL |

---

## 빠른 시작

### Admin Dashboard 배포 (자동)
```bash
git add .
git commit -m "feat: 새 기능 추가"
git push origin main
# ✨ 자동으로 배포됩니다!
```

### API 서버 배포 (수동)
```bash
# 1. 테스트 실행
./scripts/pre-deploy-test.sh apiserver

# 2. 배포
./scripts/deploy-unified.sh apiserver

# 3. 상태 확인
./scripts/deploy-monitor.sh status
```

---

## 자동 배포 (GitHub Actions)

### 배포 흐름
```
로컬 개발 & 테스트
    ↓
git push origin main
    ↓
GitHub Actions 트리거
    ↓
빌드 (Ubuntu, Node.js 22.18.0, pnpm 10)
    ↓
빌드 파일 압축 & 서버 전송
    ↓
서버 배포 & Nginx 재로드
    ↓
배포 완료 ✅
```

### 배포 상태 확인
- **GitHub Actions**: https://github.com/Renagang21/o4o-platform/actions
- **사이트 버전**: https://admin.neture.co.kr/version.json
- **라이브 사이트**: https://admin.neture.co.kr

### 버전 확인
```bash
curl https://admin.neture.co.kr/version.json
```

**응답 예시:**
```json
{
  "version": "1756961257",
  "commit": "abc1234",
  "build": "123456789"
}
```

### 성능 지표
- **평균 빌드 시간**: 2-3분
- **평균 배포 시간**: 30초
- **다운타임**: 0 (무중단 배포)

---

## 수동 배포 (로컬 스크립트)

### 1. 통합 배포 스크립트 (`deploy-unified.sh`)

모든 배포 작업을 하나로 통합한 메인 스크립트입니다.

**기능:**
- ✅ 배포 전 자동 테스트
- ✅ 웹서버/API서버/Nginx 통합 배포
- ✅ 자동 로깅 및 에러 처리
- ✅ 백업 및 롤백
- ✅ 배포 상태 모니터링

**사용법:**
```bash
# Admin Dashboard 배포
./scripts/deploy-unified.sh webserver admin

# API 서버 배포
./scripts/deploy-unified.sh apiserver

# Nginx 설정 배포
./scripts/deploy-unified.sh nginx

# 전체 배포
./scripts/deploy-unified.sh all
```

**배포 과정:**
1. **배포 전 검증**: Git 상태, 타입체크, 린트, 빌드 테스트
2. **SSH 연결 확인**: 대상 서버 연결 검증
3. **백업 생성**: 기존 파일 자동 백업
4. **배포 실행**: 컴포넌트별 배포
5. **상태 확인**: 서비스 정상 동작 검증
6. **로그 기록**: 전체 과정 로깅

### 2. 배포 전 테스트 (`pre-deploy-test.sh`)

배포 전 모든 검증을 자동화합니다.

**검사 항목:**
- ✅ Git 상태 (커밋, 동기화, 브랜치)
- ✅ 환경 검사 (Node.js, pnpm, Git)
- ✅ 의존성 설치 및 보안 취약점
- ✅ 코드 품질 (TypeScript, ESLint, console.log)
- ✅ 빌드 테스트
- ✅ SSH 연결 테스트
- ✅ 디스크 공간 검사

**사용법:**
```bash
# 웹서버 배포 전 테스트
./scripts/pre-deploy-test.sh webserver

# API 서버 배포 전 테스트
./scripts/pre-deploy-test.sh apiserver

# 전체 테스트
./scripts/pre-deploy-test.sh all
```

### 3. 배포 모니터링 (`deploy-monitor.sh`)

배포 후 시스템 상태를 실시간으로 모니터링합니다.

**모니터링 기능:**
- ✅ 서비스 상태 확인
- ✅ PM2 프로세스 모니터링
- ✅ Nginx 상태 검증
- ✅ 시스템 리소스 (메모리, 디스크, CPU)
- ✅ 응답 시간 측정
- ✅ SSL 인증서 만료일 확인
- ✅ 실시간 모니터링 (자동 새로고침)

**사용법:**
```bash
# 전체 서비스 상태
./scripts/deploy-monitor.sh status

# 빠른 헬스체크
./scripts/deploy-monitor.sh health

# 로그 확인
./scripts/deploy-monitor.sh logs api
./scripts/deploy-monitor.sh logs nginx

# 시스템 리소스
./scripts/deploy-monitor.sh resources

# 응답 시간 테스트
./scripts/deploy-monitor.sh response

# SSL 인증서
./scripts/deploy-monitor.sh ssl

# 실시간 모니터링 (30초 간격)
./scripts/deploy-monitor.sh watch
```

---

## 배포 스크립트 상세

### Admin Dashboard 배포 단계

```bash
./scripts/deploy-webserver.sh
```

1. ✅ 최신 코드 가져오기 (`git pull`)
2. ✅ 의존성 설치 (`pnpm install`)
3. ✅ 패키지 빌드 (`pnpm run build:packages`)
4. ✅ Admin Dashboard 빌드
5. ✅ 기존 파일 백업
6. ✅ 새 파일 배포
7. ✅ 권한 설정
8. ✅ Nginx 재로드

### API 서버 배포 단계

```bash
./scripts/deploy-apiserver.sh
```

1. ✅ SSH 연결 확인
2. ✅ 최신 코드 가져오기
3. ✅ 의존성 설치
4. ✅ 패키지 빌드
5. ✅ API 서버 빌드
6. ✅ 데이터베이스 마이그레이션
7. ✅ PM2 프로세스 재시작
8. ✅ Health check

### Nginx 설정 배포 단계

```bash
./scripts/deploy-nginx.sh
```

1. ✅ 기존 설정 백업
2. ✅ 최신 설정 파일 가져오기
3. ✅ 새 설정 복사
4. ✅ 설정 테스트 (`nginx -t`)
5. ✅ Nginx 재로드 (성공시)
6. ✅ 롤백 (실패시)
7. ✅ 오래된 백업 정리

---

## 배포 로그 및 모니터링

### 자동 로깅 시스템

모든 배포 활동이 자동으로 로그에 기록됩니다.

**로그 위치:**
```
$HOME/.o4o-deploy-logs/
├── deploy-20250916_143022.log     # 배포 로그
├── pre-test-20250916_142015.log   # 사전 테스트 로그
└── monitor-20250916_144533.log    # 모니터링 로그
```

**로그 확인:**
```bash
# 최신 배포 로그
tail -f $(ls -t ~/.o4o-deploy-logs/deploy-*.log | head -1)

# 에러만 필터링
grep -i "error\|fail" $(ls -t ~/.o4o-deploy-logs/deploy-*.log | head -1)
```

---

## 트러블슈팅

### 자동 배포 문제

**배포가 안 될 때:**
1. GitHub Actions 로그 확인
2. 빌드 에러 확인
3. SSH 키 확인 (GitHub Secrets)

**변경사항이 안 보일 때:**
1. 브라우저 캐시 클리어 (Ctrl+F5)
2. `/version.json` 확인
3. CloudFlare 캐시 purge

### 수동 배포 문제

**1. SSH 연결 실패**
```bash
# SSH 설정 확인
ssh -v ubuntu@13.125.144.8

# SSH Agent 확인
ssh-add -l
```

**2. 빌드 실패**
```bash
# 로컬 빌드 테스트
pnpm run clean
pnpm install
pnpm run build
```

**3. 빌드 메모리 부족**
```bash
# 메모리 증가
export NODE_OPTIONS="--max-old-space-size=8192"
./scripts/deploy-unified.sh webserver admin
```

**4. PM2 프로세스 문제**
```bash
# PM2 상태 확인
ssh ubuntu@43.202.242.215 "pm2 list && pm2 logs"

# 수동 재시작
ssh ubuntu@43.202.242.215 "pm2 restart o4o-api-server"
```

**5. Nginx 설정 오류**
```bash
# 설정 테스트
ssh ubuntu@13.125.144.8 "sudo nginx -t"

# 로그 확인
ssh ubuntu@13.125.144.8 "sudo tail -f /var/log/nginx/error.log"
```

### 롤백

**자동 백업 위치:**
- 웹서버: `/var/www/admin.neture.co.kr.backup.YYYYMMDD_HHMMSS`
- Nginx: `/etc/nginx/backup/YYYYMMDD_HHMMSS/`

**웹서버 롤백:**
```bash
ssh ubuntu@13.125.144.8 "
    sudo rm -rf /var/www/admin.neture.co.kr
    sudo cp -r /var/www/admin.neture.co.kr.backup.20250916_143022 /var/www/admin.neture.co.kr
    sudo systemctl reload nginx
"
```

**Nginx 설정 롤백:**
```bash
ssh ubuntu@13.125.144.8 "
    sudo cp -r /etc/nginx/backup/20250916_143022/sites-available/* /etc/nginx/sites-available/
    sudo cp -r /etc/nginx/backup/20250916_143022/sites-enabled/* /etc/nginx/sites-enabled/
    sudo nginx -t && sudo systemctl reload nginx
"
```

**API 서버 롤백:**
```bash
ssh ubuntu@43.202.242.215 "
    cd /home/ubuntu/o4o-platform
    git reset --hard HEAD~1
    cd apps/api-server
    pnpm run build
    pm2 restart ecosystem.config.apiserver.cjs
"
```

---

## 체크리스트

### 배포 전 체크리스트
- [ ] 모든 변경사항이 커밋되어 있는가?
- [ ] main 브랜치에서 작업하고 있는가?
- [ ] 원격과 동기화되어 있는가?
- [ ] 사전 테스트가 모두 통과했는가?
- [ ] SSH 연결이 정상인가?

### 배포 후 체크리스트
- [ ] 모든 서비스가 정상 동작하는가?
- [ ] 응답 시간이 적절한가?
- [ ] PM2 프로세스가 온라인 상태인가?
- [ ] Nginx가 정상 동작하는가?
- [ ] SSL 인증서가 유효한가?

---

## 환경 설정

### SSH 키 설정

```bash
# SSH 키 생성
ssh-keygen -t rsa -b 4096 -C "your_email@example.com"

# 공개 키를 서버에 복사
ssh-copy-id ubuntu@13.125.144.8   # 웹서버
ssh-copy-id ubuntu@43.202.242.215 # API 서버

# 연결 테스트
ssh ubuntu@13.125.144.8 "echo 'Web server OK'"
ssh ubuntu@43.202.242.215 "echo 'API server OK'"
```

### GitHub Secrets (자동 배포용)

- `WEB_HOST`: 서버 호스트명
- `WEB_USER`: SSH 사용자명
- `WEB_SSH_KEY`: SSH 프라이빗 키

설정 가이드: [docs/setup/SETUP_GITHUB_SECRETS.md](../setup/SETUP_GITHUB_SECRETS.md)

---

## 추가 리소스

- [환경변수 설정](../setup/ENV_VARIABLES_DESIGN.md)
- [API 서버 설정](../setup/API_SERVER_SETUP_GUIDE.md)
- [웹서버 환경 요구사항](../setup/WEBSERVER_ENV_REQUIREMENTS.md)
- [트러블슈팅 가이드](../troubleshooting/)

---

**최종 업데이트**: 2025-10-08
**배포 시스템**: 자동 + 수동 하이브리드 시스템
