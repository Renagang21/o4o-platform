# O4O Platform 웹서버 환경 조사 보고서

## 📋 요약
- **조사 일시**: 2025-08-16
- **서버 유형**: 프론트엔드 전용 웹서버 (o4o-webserver)
- **OS**: Ubuntu 22.04.5 LTS (Jammy)
- **웹서버**: Nginx 1.18.0
- **프로세스 관리**: PM2

## 1. 서버 기본 정보

### OS 및 시스템
```
OS: Ubuntu 22.04.5 LTS
Kernel: Linux 6.8.0-1033-aws
Architecture: x86_64
Instance Type: AWS EC2
```

### 웹서버 소프트웨어
- **Nginx**: `/usr/sbin/nginx` (active/running)
- **서비스 상태**: systemd로 관리, 자동 시작 설정됨
- **메모리 사용량**: 약 11.9MB

### 실행 중인 PM2 프로세스
| 프로세스 | 상태 | 재시작 횟수 | 메모리 |
|---------|------|-------------|--------|
| main-site | online | 141회+ | 64.5MB |
| admin-dashboard | online | 348회+ | 65.5MB |

## 2. 웹서버 설정 파일 (⚠️ 보호 필요)

### Nginx 설정 구조
```
/etc/nginx/
├── nginx.conf (메인 설정)
├── nginx.conf.backup.20250807 (백업)
├── sites-available/ (사이트 설정)
├── sites-enabled/ (활성화된 사이트)
│   ├── neture.co.kr
│   ├── admin.neture.co.kr
│   ├── admin.neture.co.kr-443
│   ├── forum.neture.co.kr
│   ├── funding.neture.co.kr
│   ├── shop.neture.co.kr
│   └── signage.neture.co.kr
└── sites-enabled.backup/ (백업)
```

### 도메인 설정 현황
- 메인: neture.co.kr
- 서브도메인: admin, forum, funding, shop, signage
- SSL: admin.neture.co.kr-443 설정 존재

## 3. 프로덕션 환경 파일 (⚠️ 중요도: 최상)

### 환경 변수 파일
```
보호 필요 파일:
- /apps/main-site/.env.production
- /apps/admin-dashboard/.env.production
- /apps/api-server/.env.production (API서버용, 이 서버에서는 미사용)

예제 파일 (배포 시 덮어써도 무방):
- /.env.example
- /.env.webserver.example
- /.env.apiserver.example
- /.env.production.example
```

### 빌드 출력 디렉토리
```
실제 서빙 디렉토리 (보호 필요):
- /apps/main-site/dist/
- /apps/admin-dashboard/dist/
- /apps/*/public/ (정적 자산)

패키지 빌드 (재생성 가능):
- /packages/*/dist/
```

## 4. 사용자 생성 콘텐츠

### 업로드 디렉토리
```
/apps/api-server/uploads/
└── themes/ (테마 파일)
```
*참고: 업로드 기능은 주로 API 서버에서 처리*

## 5. 로그 및 모니터링 파일

### Nginx 로그 (⚠️ 운영 데이터)
```
/var/log/nginx/
├── access.log (현재)
├── access.log.1-14.gz (로테이션된 로그)
└── error.log
```

### PM2 로그 (⚠️ 대용량 주의)
```
~/.pm2/logs/
├── admin-dashboard-error.log (125MB)
├── admin-dashboard-out.log (17MB)
├── api-server-error.log (135MB, 미사용)
├── main-site-error.log
└── main-site-out.log
```

## 6. 프로세스 관리 파일 (⚠️ 보호 필요)

### PM2 Ecosystem 설정
```
중요 파일:
- ecosystem.config.webserver.cjs (웹서버 전용, 현재 사용)
- ecosystem.config.cjs (기본 설정)

기타:
- ecosystem.config.apiserver.cjs (API서버용)
- ecosystem.config.local.cjs (로컬 개발용)
```

### Systemd 서비스
- nginx.service (자동 시작 설정됨)

## 7. 백업 및 보안 파일

### 백업 디렉토리
```
/.backup/
├── 20250807_130736/
├── 20250808_222053/
├── 20250808_233523/
├── 20250809_004954/
├── 20250809_091848/
├── 20250809_104844/
└── 20250809_131730/
```

### 백업 스크립트
```
/scripts/backup-protected-files.sh
/scripts/setup-backup-automation.sh
/scripts-local/backup-scripts.sh
```

## 8. 배포 관련 스크립트

### 웹서버 전용 스크립트
```
/scripts/deploy-to-server.sh
/scripts/deploy-webserver.sh
/scripts/validate-deploy-env.sh
/scripts/health-check.sh
```

### 빌드 및 최적화
```
/scripts/build-monitor.sh
/scripts/optimize-server-memory.sh
/scripts/dev.sh
```

## 🚨 중요 보호 대상 파일

### 최우선 보호 (절대 덮어쓰기 금지)
1. **환경 변수**: `*.env.production` 파일들
2. **PM2 설정**: `ecosystem.config.webserver.cjs`
3. **Nginx 설정**: `/etc/nginx/sites-enabled/*`
4. **로그 파일**: `~/.pm2/logs/*`, `/var/log/nginx/*`
5. **백업 디렉토리**: `/.backup/*`

### 배포 시 주의사항
1. **PM2 프로세스**: 높은 재시작 횟수 → 안정성 모니터링 필요
2. **로그 용량**: PM2 error 로그 125MB+ → 정기적 정리 필요
3. **권한 구조**: ubuntu:ubuntu 소유권 유지
4. **서비스 재시작**: 
   - PM2: `pm2 reload ecosystem.config.webserver.cjs`
   - Nginx: `sudo systemctl reload nginx`

### 권한 문제 발생 가능 파일
- `/etc/nginx/*` (root 권한 필요)
- `/var/log/nginx/*` (www-data 소유)
- PM2 관련 파일 (ubuntu 사용자 권한)

## 📌 특별 참고사항

1. **서버 분리 구조**: 이 서버는 프론트엔드 전용, API는 별도 서버에서 운영
2. **CLAUDE.md 파일**: 웹서버 전용 가이드라인 문서화
3. **Git 상태**: untracked 파일 다수, 정리 필요
4. **SSL 인증서**: Let's Encrypt 미사용 (별도 설정 확인 필요)

## 🔄 권장 조치사항

1. **즉시 조치**
   - PM2 로그 파일 정리 (135MB+ 파일들)
   - 재시작 횟수가 많은 프로세스 안정성 점검

2. **단기 개선**
   - 로그 로테이션 정책 수립
   - 백업 자동화 스크립트 검증
   - 환경 변수 파일 암호화 고려

3. **장기 계획**
   - 모니터링 시스템 구축
   - 자동 백업 및 복구 프로세스 문서화
   - CI/CD 파이프라인 통합

---
*본 보고서는 2025년 8월 16일 기준으로 작성되었습니다.*