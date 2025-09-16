# 🚀 O4O Platform 배포 가이드

## 📋 개요

O4O Platform은 **로컬 배포 시스템**을 사용합니다. GitHub Actions는 CI(코드 검증, 테스트, 빌드)만 수행하고, **실제 배포는 로컬에서 수동으로 실행**합니다.

## 🎯 배포 철학

### ✅ 장점:
- **보안**: 프로덕션 서버 credentials를 GitHub에 저장하지 않음
- **제어**: 개발자가 배포 타이밍과 내용을 직접 확인
- **디버깅**: 배포 문제 발생시 즉시 로컬에서 확인 가능
- **유연성**: 환경별로 다른 배포 전략 사용 가능

### 🏗️ 구조:
- **GitHub Actions**: CI만 (코드 검증, 테스트, 빌드 아티팩트 생성)
- **로컬 스크립트**: 배포 전용 (로컬에서 원격 서버로 배포)

## 🖥️ 서버 환경

### 웹서버 (13.125.144.8)
- **역할**: 정적 파일 서빙 (Admin Dashboard)
- **기술**: Nginx
- **배포 대상**: 빌드된 프론트엔드 앱

### API 서버 (43.202.242.215)
- **역할**: REST API, 데이터베이스
- **기술**: Node.js, PM2, PostgreSQL
- **배포 대상**: API 서버 소스코드

## 🚀 배포 명령어

### 기본 사용법
```bash
# Admin Dashboard 웹서버 배포
./scripts/deploy-webserver.sh

# API 서버 배포  
./scripts/deploy-apiserver.sh

# Nginx 설정 배포
./scripts/deploy-nginx.sh
```

### 통합 배포 스크립트 (예정)
```bash
# 메인 배포 스크립트 (아직 구현되지 않음)
./scripts/deploy-local.sh webserver admin
./scripts/deploy-local.sh apiserver
./scripts/deploy-local.sh nginx
```

## 📝 배포 단계별 안내

### 1. Admin Dashboard 배포

```bash
# 1. 로컬에서 테스트
pnpm run dev:admin

# 2. 빌드 테스트
cd apps/admin-dashboard
pnpm run build

# 3. 웹서버에 배포
./scripts/deploy-webserver.sh
```

**배포 과정:**
1. ✅ 최신 코드 가져오기 (`git pull`)
2. ✅ 의존성 설치 (`pnpm install`)
3. ✅ 패키지 빌드 (`pnpm run build:packages`)
4. ✅ Admin Dashboard 빌드
5. ✅ 기존 파일 백업
6. ✅ 새 파일 배포
7. ✅ 권한 설정
8. ✅ Nginx 재로드

### 2. API 서버 배포

```bash
# 1. 로컬에서 테스트
cd apps/api-server
pnpm run dev

# 2. 빌드 테스트
pnpm run build

# 3. API 서버에 배포
./scripts/deploy-apiserver.sh
```

**배포 과정:**
1. ✅ SSH 연결 확인
2. ✅ 최신 코드 가져오기 (`git pull`)
3. ✅ 의존성 설치 (`pnpm install`)
4. ✅ 패키지 빌드 (`pnpm run build:packages`)
5. ✅ API 서버 빌드 (`pnpm run build`)
6. ✅ 데이터베이스 마이그레이션 (필요시)
7. ✅ PM2 프로세스 재시작
8. ✅ Health check 실행

### 3. Nginx 설정 배포

```bash
# Nginx 설정 배포 (nginx-configs/ 디렉토리)
./scripts/deploy-nginx.sh
```

**배포 과정:**
1. ✅ 기존 설정 백업
2. ✅ 최신 설정 파일 가져오기
3. ✅ 새 설정 파일 복사
4. ✅ 설정 테스트 (`nginx -t`)
5. ✅ Nginx 재로드 (성공시)
6. ✅ 롤백 (실패시)
7. ✅ 오래된 백업 정리

## 🔧 사전 요구사항

### SSH 키 설정
배포 스크립트 실행 전에 SSH 키가 설정되어 있어야 합니다:

```bash
# SSH 키 생성 (없는 경우)
ssh-keygen -t rsa -b 4096 -C "your_email@example.com"

# 공개 키를 서버에 복사
ssh-copy-id ubuntu@13.125.144.8  # 웹서버
ssh-copy-id ubuntu@43.202.242.215  # API 서버

# 연결 테스트
ssh ubuntu@13.125.144.8 "echo 'Web server OK'"
ssh ubuntu@43.202.242.215 "echo 'API server OK'"
```

### 환경 확인
```bash
# 로컬 환경 확인
node --version  # v22.18.0+
pnpm --version  # 9.0+
git --version

# 원격 서버 환경 확인 (SSH로)
ssh ubuntu@13.125.144.8 "nginx -v && pm2 --version"
ssh ubuntu@43.202.242.215 "node --version && pm2 --version && psql --version"
```

## 🚨 트러블슈팅

### 일반적인 문제들

**1. SSH 연결 실패**
```bash
# SSH 설정 확인
ssh -v ubuntu@13.125.144.8
# SSH Agent 확인
ssh-add -l
```

**2. 빌드 실패**
```bash
# 로컬에서 빌드 테스트
pnpm run clean
pnpm install
pnpm run build
```

**3. PM2 프로세스 문제**
```bash
# 원격 서버에서 PM2 상태 확인
ssh ubuntu@43.202.242.215 "pm2 list && pm2 logs"
```

**4. Nginx 설정 오류**
```bash
# 설정 테스트
ssh ubuntu@13.125.144.8 "sudo nginx -t"
# 로그 확인
ssh ubuntu@13.125.144.8 "sudo tail -f /var/log/nginx/error.log"
```

## 📊 GitHub Actions (CI만)

### 실행되는 워크플로우:
- ✅ **CI Pipeline** (`main.yml`): 코드 검증, 테스트, 빌드
- ✅ **CodeQL Security Analysis**: 보안 검사
- ✅ **PR Size Labeler**: PR 크기 라벨링
- ✅ **Setup Labels/PNPM**: 저장소 설정

### 제거된 워크플로우:
- ❌ **Deploy API Server**: 로컬 스크립트로 대체
- ❌ **Deploy Admin Dashboard**: 로컬 스크립트로 대체
- ❌ **Deploy Nginx Configuration**: 로컬 스크립트로 대체
- ❌ **Build and Deploy**: 중복 제거

## 🔮 향후 개선사항

1. **통합 배포 스크립트**: 하나의 스크립트로 모든 배포 관리
2. **배포 전 자동 테스트**: 로컬에서 배포 전 자동 테스트 실행
3. **롤백 기능**: 문제 발생시 이전 버전으로 즉시 롤백
4. **배포 로그**: 배포 기록 및 상태 추적
5. **알림 시스템**: 배포 완료/실패 알림

---

*최종 업데이트: 2025년 9월 16일*
*배포 시스템: 로컬 수동 배포*