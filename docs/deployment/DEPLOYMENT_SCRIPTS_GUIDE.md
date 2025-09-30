# 🚀 O4O Platform 배포 스크립트 완전 가이드

## 📋 개요

O4O Platform의 향상된 배포 시스템은 **통합 배포 스크립트**, **자동 테스트**, **실시간 모니터링**을 포함한 완전한 배포 솔루션을 제공합니다.

## 🛠️ 배포 스크립트 구성

### 1. 통합 배포 스크립트 (`deploy-unified.sh`)

모든 배포 작업을 하나의 스크립트로 통합하여 관리합니다.

**기능:**
- ✅ 배포 전 자동 테스트 실행
- ✅ 웹서버/API서버/Nginx 통합 배포
- ✅ 자동 로깅 및 에러 처리
- ✅ 백업 및 롤백 기능
- ✅ 배포 상태 모니터링

**사용법:**
```bash
# Admin Dashboard만 배포
./scripts/deploy-unified.sh webserver admin

# API 서버만 배포
./scripts/deploy-unified.sh apiserver

# Nginx 설정만 배포
./scripts/deploy-unified.sh nginx

# 전체 배포
./scripts/deploy-unified.sh all
```

**배포 과정:**
1. **배포 전 검증**: Git 상태, 타입체크, 린트, 빌드 테스트
2. **SSH 연결 확인**: 대상 서버와의 연결 상태 검증
3. **백업 생성**: 기존 파일/설정 자동 백업
4. **배포 실행**: 컴포넌트별 배포 프로세스 실행
5. **상태 확인**: 서비스 정상 동작 여부 검증
6. **로그 기록**: 전체 과정 자동 로깅

### 2. 배포 전 테스트 스크립트 (`pre-deploy-test.sh`)

배포 전에 실행해야 할 모든 검증을 자동화합니다.

**검사 항목:**
- ✅ Git 상태 (커밋, 동기화, 브랜치)
- ✅ 환경 검사 (Node.js, pnpm, Git 버전)
- ✅ 의존성 설치 및 보안 취약점
- ✅ 코드 품질 (TypeScript, ESLint, console.log)
- ✅ 빌드 테스트 (패키지, 앱 빌드)
- ✅ SSH 연결 테스트
- ✅ 디스크 공간 검사

**사용법:**
```bash
# 웹서버 배포 전 테스트
./scripts/pre-deploy-test.sh webserver

# API 서버 배포 전 테스트
./scripts/pre-deploy-test.sh apiserver

# 전체 배포 전 테스트
./scripts/pre-deploy-test.sh all
```

**출력 예시:**
```
🧪 TypeScript 타입 체크 실행 중...
✅ TypeScript 타입 체크 통과
🧪 ESLint 검사 실행 중...
✅ ESLint 검사 통과
🧪 console.log 검사 실행 중...
✅ console.log 검사 통과

==========================================
         배포 전 테스트 결과
==========================================
✅ 통과한 테스트: 12
🎉 모든 테스트가 통과했습니다! 배포를 진행할 수 있습니다.
```

### 3. 배포 모니터링 스크립트 (`deploy-monitor.sh`)

배포 후 시스템 상태를 실시간으로 모니터링합니다.

**모니터링 기능:**
- ✅ 서비스 상태 확인 (API, Admin, 웹사이트)
- ✅ PM2 프로세스 상태 모니터링
- ✅ Nginx 상태 및 설정 검증
- ✅ 시스템 리소스 사용량 (메모리, 디스크, CPU)
- ✅ 응답 시간 측정
- ✅ SSL 인증서 만료일 확인
- ✅ 실시간 모니터링 (자동 새로고침)

**사용법:**
```bash
# 전체 서비스 상태 확인
./scripts/deploy-monitor.sh status

# 빠른 헬스체크
./scripts/deploy-monitor.sh health

# 특정 로그 확인
./scripts/deploy-monitor.sh logs api
./scripts/deploy-monitor.sh logs nginx

# 시스템 리소스 확인
./scripts/deploy-monitor.sh resources

# 응답 시간 테스트
./scripts/deploy-monitor.sh response

# SSL 인증서 확인
./scripts/deploy-monitor.sh ssl

# 실시간 모니터링 (30초마다 새로고침)
./scripts/deploy-monitor.sh watch
```

### 4. 배포 유틸리티 스크립트 (`deploy-utils.sh`)

다른 스크립트에서 공통으로 사용하는 유틸리티 함수들을 제공합니다.

**제공 함수:**
- ✅ 로깅 함수들 (log_info, log_success, log_error 등)
- ✅ SSH 연결 테스트
- ✅ 서비스 헬스체크
- ✅ Git 상태 확인
- ✅ PM2 프로세스 상태 확인
- ✅ 빌드 출력 검증
- ✅ 백업 생성/복원
- ✅ 시스템 리소스 체크

**사용법 (다른 스크립트에서):**
```bash
# 유틸리티 로드
source ./scripts/deploy-utils.sh

# 로깅 초기화
init_deploy_logging "my-deployment"

# SSH 연결 테스트
test_ssh_connection "$API_HOST" "API 서버"

# 서비스 헬스체크
check_service_health "https://api.neture.co.kr/health" "API 서버"
```

## 📊 배포 로그 및 모니터링 시스템

### 자동 로깅 시스템

모든 배포 활동이 자동으로 로그에 기록됩니다.

**로그 저장 위치:**
```
$HOME/.o4o-deploy-logs/
├── deploy-20250916_143022.log    # 배포 로그
├── pre-test-20250916_142015.log  # 사전 테스트 로그
└── monitor-20250916_144533.log   # 모니터링 로그
```

**로그 형식:**
```
2025-09-16 14:30:22: [INFO] 배포 시작 - webserver admin
2025-09-16 14:30:23: [TEST] TypeScript 타입 체크 실행 중...
2025-09-16 14:30:25: [SUCCESS] TypeScript 타입 체크 통과
2025-09-16 14:30:26: [STEP] Admin Dashboard 빌드 중...
2025-09-16 14:30:45: [SUCCESS] Admin Dashboard 빌드 완료
```

### 배포 히스토리 추적

```bash
# 최근 배포 히스토리 확인
./scripts/deploy-monitor.sh history

# 특정 배포 로그 확인
tail -f ~/.o4o-deploy-logs/deploy-20250916_143022.log
```

### 실시간 모니터링 대시보드

```bash
# 실시간 모니터링 시작
./scripts/deploy-monitor.sh watch
```

**모니터링 화면 예시:**
```
Mon Sep 16 14:45:33 UTC 2025 - O4O Platform 실시간 모니터링
============================================
✅ API 서버: 정상
✅ Admin Dashboard: 정상
✅ 메인 웹사이트: 정상

최근 PM2 상태:
┌─────┬────────────────┬─────────────┬─────────┬─────────┬──────────┐
│ id  │ name           │ namespace   │ version │ mode    │ pid      │
├─────┼────────────────┼─────────────┼─────────┼─────────┼──────────┤
│ 0   │ o4o-api-server │ default     │ 1.0.0   │ cluster │ 12345    │
└─────┴────────────────┴─────────────┴─────────┴─────────┴──────────┘

다음 새로고침까지 30초...
```

## 🔄 배포 워크플로우

### 권장 배포 순서

1. **배포 전 테스트**
```bash
./scripts/pre-deploy-test.sh all
```

2. **통합 배포 실행**
```bash
./scripts/deploy-unified.sh all
```

3. **배포 후 모니터링**
```bash
./scripts/deploy-monitor.sh status
```

### 단계별 배포

**Admin Dashboard만 배포:**
```bash
# 1. 사전 테스트
./scripts/pre-deploy-test.sh webserver

# 2. 배포 실행
./scripts/deploy-unified.sh webserver admin

# 3. 상태 확인
./scripts/deploy-monitor.sh health
```

**API 서버만 배포:**
```bash
# 1. 사전 테스트
./scripts/pre-deploy-test.sh apiserver

# 2. 배포 실행
./scripts/deploy-unified.sh apiserver

# 3. 상태 확인
./scripts/deploy-monitor.sh status
```

## 🛡️ 에러 처리 및 롤백

### 자동 백업 시스템

모든 배포 시 자동으로 백업이 생성됩니다:

- **웹서버**: `/var/www/admin.neture.co.kr.backup.YYYYMMDD_HHMMSS`
- **Nginx**: `/etc/nginx/backup/YYYYMMDD_HHMMSS/`
- **PM2**: 프로세스 재시작 실패 시 이전 상태로 복구

### 수동 롤백

백업에서 수동 롤백이 필요한 경우:

```bash
# 웹서버 롤백
ssh ubuntu@13.125.144.8 "
    sudo rm -rf /var/www/admin.neture.co.kr
    sudo cp -r /var/www/admin.neture.co.kr.backup.20250916_143022 /var/www/admin.neture.co.kr
    sudo systemctl reload nginx
"

# Nginx 설정 롤백
ssh ubuntu@13.125.144.8 "
    sudo cp -r /etc/nginx/backup/20250916_143022/sites-available/* /etc/nginx/sites-available/
    sudo cp -r /etc/nginx/backup/20250916_143022/sites-enabled/* /etc/nginx/sites-enabled/
    sudo nginx -t && sudo systemctl reload nginx
"
```

## 📈 성능 및 최적화

### 빌드 최적화 설정

**Admin Dashboard 빌드:**
- `NODE_OPTIONS='--max-old-space-size=4096'`: 메모리 4GB 할당
- `GENERATE_SOURCEMAP=false`: 소스맵 비활성화로 빌드 속도 향상

### 모니터링 최적화

- **응답 시간 임계값**: 3초 이상 시 경고
- **디스크 공간**: 1GB 미만 시 경고
- **SSL 인증서**: 30일 미만 시 갱신 알림

## 🔧 트러블슈팅

### 일반적인 문제들

**1. 빌드 메모리 부족**
```bash
# 메모리 증가
export NODE_OPTIONS="--max-old-space-size=8192"
./scripts/deploy-unified.sh webserver admin
```

**2. SSH 연결 실패**
```bash
# SSH 에이전트 확인
ssh-add -l

# SSH 설정 테스트
./scripts/deploy-utils.sh check-ssh
```

**3. PM2 프로세스 문제**
```bash
# PM2 상태 확인
./scripts/deploy-monitor.sh logs api

# 수동 PM2 재시작
ssh ubuntu@43.202.242.215 "pm2 restart o4o-api-server"
```

**4. Nginx 설정 오류**
```bash
# Nginx 설정 테스트
ssh ubuntu@13.125.144.8 "sudo nginx -t"

# Nginx 재로드
ssh ubuntu@13.125.144.8 "sudo systemctl reload nginx"
```

### 로그 분석

**배포 실패 시 로그 확인:**
```bash
# 최신 배포 로그 확인
tail -100 $(ls -t ~/.o4o-deploy-logs/deploy-*.log | head -1)

# 에러 로그만 필터링
grep -i "error\|fail" $(ls -t ~/.o4o-deploy-logs/deploy-*.log | head -1)
```

## 📋 체크리스트

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

**최종 업데이트:** 2025년 9월 16일  
**배포 시스템 버전:** v2.0 (통합 배포 시스템)

이제 O4O Platform은 **완전 자동화된 배포 파이프라인**을 통해 안정적이고 효율적인 배포 환경을 제공합니다.