# 🚀 O4O Platform 통합 배포 가이드

> 최종 업데이트: 2024년 1월 21일  
> 이 문서는 O4O Platform의 모든 배포 프로세스를 통합한 공식 가이드입니다.

## 📋 목차

1. [개요](#개요)
2. [배포 아키텍처](#배포-아키텍처)
3. [배포 방법](#배포-방법)
4. [스크립트 사용법](#스크립트-사용법)
5. [트러블슈팅](#트러블슈팅)
6. [부록](#부록)

---

## 개요

O4O Platform은 다음 3가지 주요 컴포넌트로 구성됩니다:

| 컴포넌트 | URL | 서버 | 용도 |
|---------|-----|------|------|
| Main Site | https://neture.co.kr | 웹서버 (13.125.144.8) | 메인 웹사이트 |
| Admin Dashboard | https://admin.neture.co.kr | 웹서버 (13.125.144.8) | 관리자 대시보드 |
| API Server | https://api.neture.co.kr | API서버 (43.202.242.215) | 백엔드 API |

## 배포 아키텍처

```
┌─────────────────────────────────────────┐
│           GitHub Repository             │
│         Renagang21/o4o-platform        │
└────────────┬───────────────────────────┘
             │
             │ git push
             ▼
┌─────────────────────────────────────────┐
│         GitHub Actions (CI/CD)          │
│  ├─ deploy-admin.yml (Admin Dashboard) │
│  └─ deploy-api.yml (API Server)        │
└────────────┬───────────────────────────┘
             │
             │ 자동 배포
             ▼
┌─────────────────────────────────────────┐
│           Production Servers            │
│  ├─ 웹서버: Main Site + Admin          │
│  └─ API서버: Backend Services          │
└─────────────────────────────────────────┘
```

## 배포 방법

### 🔄 1. 자동 배포 (GitHub Actions) - **권장**

#### Admin Dashboard
```bash
# main 브랜치에 푸시하면 자동 배포
git push origin main

# GitHub Actions 확인
https://github.com/Renagang21/o4o-platform/actions/workflows/deploy-admin.yml
```

#### API Server
```bash
# main 브랜치에 푸시하면 자동 배포
git push origin main

# GitHub Actions 확인
https://github.com/Renagang21/o4o-platform/actions/workflows/deploy-api.yml
```

### 🛠️ 2. 수동 배포 (로컬 스크립트)

#### A. 통합 배포 스크립트 (권장)

```bash
# 사전 준비
cd /home/sohae21/o4o-platform

# 1. 전체 시스템 배포
./scripts/deploy-unified.sh all

# 2. 특정 서버만 배포
./scripts/deploy-unified.sh webserver    # 웹서버 (Main + Admin)
./scripts/deploy-unified.sh apiserver    # API 서버
./scripts/deploy-unified.sh admin        # Admin Dashboard만

# 3. 배포 상태 모니터링
./scripts/deploy-monitor.sh status
./scripts/deploy-monitor.sh logs
```

#### B. 개별 배포 스크립트

##### Main Site 배포
```bash
# Main Site 전용 배포
./scripts/deploy-main-site.sh
```

##### Admin Dashboard 배포
```bash
# GitHub Actions가 빌드한 결과물 수신
./scripts/webserver-receive-deployment.sh
```

##### API Server 배포
```bash
# API 서버 배포
./scripts/deploy-apiserver.sh
```

### ⚡ 3. 긴급 배포

```bash
# 롤백 지원 긴급 배포
./scripts/deploy-with-rollback.sh

# 웹서버 긴급 수동 배포
./scripts/manual-deploy-webserver-fixed.sh
```

## 스크립트 사용법

### 📁 현재 사용 가능한 스크립트

| 스크립트 | 용도 | 사용 시나리오 |
|---------|------|--------------|
| `deploy-unified.sh` | 통합 배포 메인 스크립트 | 일반 배포 |
| `deploy-main-site.sh` | Main Site 전용 배포 | Main Site만 업데이트 |
| `deploy-apiserver.sh` | API Server 배포 | API 서버 업데이트 |
| `webserver-receive-deployment.sh` | GitHub Actions 빌드 수신 | Admin Dashboard 배포 |
| `deploy-monitor.sh` | 배포 상태 모니터링 | 배포 확인 |
| `deploy-with-rollback.sh` | 자동 롤백 지원 배포 | 안전한 배포 |
| `pre-deploy-test.sh` | 배포 전 테스트 | 사전 검증 |

### ⚠️ Deprecated 스크립트 (사용 금지)

다음 스크립트들은 `scripts/deprecated/` 폴더로 이동되었습니다:
- ~~`manual-deploy-webserver.sh`~~ → `webserver-receive-deployment.sh` 사용
- ~~`deploy-webserver.sh`~~ → `deploy-unified.sh webserver` 사용
- ~~`deploy-api-server.sh`~~ → `deploy-apiserver.sh` 사용
- ~~`deploy.sh`~~ → `deploy-unified.sh` 사용

### 🔧 스크립트 옵션

#### deploy-unified.sh 옵션
```bash
# 기본 사용법
./scripts/deploy-unified.sh [target] [options]

# Targets:
#   all         - 모든 서버 배포
#   webserver   - 웹서버 (Main + Admin)
#   apiserver   - API 서버
#   admin       - Admin Dashboard만
#   main        - Main Site만

# Options:
#   --skip-tests    - 테스트 건너뛰기
#   --no-backup     - 백업 생략
#   --force         - 강제 배포
#   --dry-run       - 시뮬레이션

# 예시:
./scripts/deploy-unified.sh all --skip-tests
./scripts/deploy-unified.sh webserver --dry-run
```

#### deploy-monitor.sh 옵션
```bash
# 상태 확인
./scripts/deploy-monitor.sh status

# 로그 확인
./scripts/deploy-monitor.sh logs [서버]

# 헬스체크
./scripts/deploy-monitor.sh health

# 실시간 모니터링
./scripts/deploy-monitor.sh watch
```

## 트러블슈팅

### 🐛 일반적인 문제 해결

#### 1. pnpm: command not found
```bash
# Volta 환경 설정 확인
export VOLTA_HOME="$HOME/.volta"
export PATH="$VOLTA_HOME/bin:$PATH"
```

#### 2. Permission denied
```bash
# 스크립트 실행 권한 부여
chmod +x scripts/*.sh
```

#### 3. 배포 실패 시 롤백
```bash
# 자동 롤백
./scripts/deploy-with-rollback.sh

# 수동 롤백 (백업에서 복원)
sudo cp -r /var/www/backup/[timestamp]/* /var/www/[site]/
```

#### 4. PM2 프로세스 문제
```bash
# API 서버 재시작
pm2 restart o4o-api
pm2 logs o4o-api

# 상태 확인
pm2 status
```

#### 5. Nginx 설정 문제
```bash
# 설정 검증
sudo nginx -t

# 재시작
sudo systemctl reload nginx
```

### 📝 로그 위치

| 컴포넌트 | 로그 위치 |
|---------|----------|
| Main Site | `/var/log/nginx/neture.co.kr.*.log` |
| Admin Dashboard | `/var/log/nginx/admin.neture.co.kr.*.log` |
| API Server | `pm2 logs o4o-api` |
| 배포 로그 | `/var/log/deployment/` |

## 부록

### A. 서버 접속 정보

```bash
# 웹서버 (Main Site + Admin)
ssh -i ~/.ssh/webserver_key.pem ubuntu@13.125.144.8

# API 서버
ssh -i ~/.ssh/apiserver_key.pem ubuntu@43.202.242.215
```

### B. 환경 변수 설정

#### API Server (.env)
```env
NODE_ENV=production
PORT=3000
DATABASE_URL=postgresql://...
JWT_SECRET=...
JWT_REFRESH_SECRET=...
```

#### Build 환경 변수
```env
VITE_API_URL=https://api.neture.co.kr/api
VITE_ADMIN_API_URL=https://admin.api.neture.co.kr
```

### C. 디렉토리 구조

```
/home/ubuntu/o4o-platform/
├── apps/
│   ├── admin-dashboard/    # Admin Dashboard
│   ├── api-server/         # API Server
│   └── main-site/         # Main Site
├── packages/              # 공유 패키지
├── scripts/              # 배포 스크립트
│   ├── deprecated/       # 사용 중단된 스크립트
│   └── *.sh             # 현재 사용 중인 스크립트
└── docs/                # 문서

/var/www/
├── neture.co.kr/         # Main Site 배포 위치
├── admin.neture.co.kr/   # Admin Dashboard 배포 위치
└── backup/              # 백업 디렉토리
```

### D. 체크리스트

#### 배포 전 체크리스트
- [ ] 코드 변경사항 커밋
- [ ] 로컬 테스트 완료
- [ ] 환경 변수 확인
- [ ] 데이터베이스 마이그레이션 필요 여부 확인
- [ ] 백업 공간 확인

#### 배포 후 체크리스트
- [ ] 사이트 접속 테스트
- [ ] API 응답 확인
- [ ] 로그 오류 확인
- [ ] PM2 프로세스 상태 확인
- [ ] Nginx 상태 확인

### E. 연락처 및 리소스

- GitHub Repository: https://github.com/Renagang21/o4o-platform
- GitHub Actions: https://github.com/Renagang21/o4o-platform/actions
- 문제 보고: https://github.com/Renagang21/o4o-platform/issues

---

## 개정 이력

| 버전 | 날짜 | 변경사항 |
|-----|------|---------|
| 1.0 | 2024-01-21 | 통합 가이드 초기 작성 |

---

**참고**: 이 문서는 지속적으로 업데이트됩니다. 최신 버전은 GitHub 저장소를 확인하세요.