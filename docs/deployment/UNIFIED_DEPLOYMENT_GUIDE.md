# 📚 O4O Platform 통합 배포 가이드
*작성일: 2025년 8월 18일*
*버전: 2.0*

## 🎯 개요

이 가이드는 웹서버와 API서버의 문제점을 분석하고 개선한 통합 배포 방안을 제공합니다.

## 📊 현재 상황 분석

### 웹서버 문제점
- **PM2 systemd 자동시작 실패**: `Failed with result 'protocol'`
- **원인**: PM2 forking 모드와 systemd 프로토콜 불일치
- **현재 해결책**: 수동 시작 필요

### API서버 상황
- **PM2 스크립트 정리됨**: package-apiserver.json 제공
- **환경변수 표준화됨**: .env-apiserver 템플릿
- **데이터베이스**: API서버에서 중앙 관리

## 🚀 개선된 배포 방안

### 1. 웹서버 배포 (systemd 직접 사용)

```bash
# 기존 PM2 제거
pm2 stop o4o-webserver o4o-admin
pm2 delete o4o-webserver o4o-admin
pm2 unstartup

# systemd 서비스 설치
sudo cp config/systemd/o4o-webserver.service /etc/systemd/system/
sudo cp config/systemd/o4o-admin.service /etc/systemd/system/
sudo systemctl daemon-reload

# 서비스 시작 및 자동시작 설정
sudo systemctl start o4o-webserver o4o-admin
sudo systemctl enable o4o-webserver o4o-admin

# 상태 확인
sudo systemctl status o4o-webserver o4o-admin
```

### 2. API서버 배포 (PM2 유지)

```bash
# 환경 설정
cp apps/api-server/.env-apiserver apps/api-server/.env
# 필요한 값들 수정

# PM2로 실행
pm2 start ecosystem.config-apiserver.cjs
pm2 save
pm2 startup  # systemd 설정
```

### 3. 로컬 개발 환경

```bash
# 환경 설정
cp config/env-templates/.env.local.template apps/api-server/.env.local

# API서버 개발 모드
cd apps/api-server
npm run dev

# 프론트엔드 개발 모드 (별도 터미널)
npm run dev:web   # Main site
npm run dev:admin # Admin dashboard
```

## 📁 새로운 디렉토리 구조

```
o4o-platform/
├── config/
│   ├── env-templates/          # 환경변수 템플릿
│   │   ├── .env.local.template
│   │   └── .env.production.template
│   ├── pm2-templates/          # PM2 설정 템플릿
│   │   └── ecosystem.config.template.cjs
│   └── systemd/                # systemd 서비스 파일
│       ├── o4o-webserver.service
│       └── o4o-admin.service
├── scripts/
│   ├── deploy-webserver.sh     # 웹서버 배포 자동화
│   ├── deploy-apiserver.sh     # API서버 배포 자동화
│   └── verify-deployment.sh    # 배포 검증
└── apps/
    ├── api-server/
    │   ├── .env-apiserver       # API서버 환경변수 템플릿
    │   └── package-apiserver.json # PM2 제거된 package.json
    └── ...
```

## 🔧 자동화 도구 사용법

### 웹서버 배포
```bash
chmod +x scripts/deploy-webserver.sh
./scripts/deploy-webserver.sh
```

### API서버 배포
```bash
chmod +x scripts/deploy-apiserver.sh
./scripts/deploy-apiserver.sh
```

### 배포 검증
```bash
chmod +x scripts/verify-deployment.sh
./scripts/verify-deployment.sh
```

## ⚙️ 환경별 설정

### 로컬 개발
- NODE_ENV=development
- DB: API서버 원격 연결 (13.125.144.8)
- CORS: localhost 포트들
- Swagger: 활성화

### 프로덕션 (웹서버)
- NODE_ENV=production
- systemd 서비스 사용
- 정적 파일 서빙 (serve)
- 자동시작: systemd

### 프로덕션 (API서버)
- NODE_ENV=production
- PM2 프로세스 관리
- PostgreSQL 로컬 연결
- 자동시작: PM2 startup

## 🔍 트러블슈팅

### 웹서버 자동시작 안될 때
```bash
# systemd 로그 확인
sudo journalctl -u o4o-webserver -n 50

# 수동 시작
sudo systemctl restart o4o-webserver o4o-admin
```

### API서버 DB 연결 실패
```bash
# PostgreSQL 상태 확인
sudo systemctl status postgresql

# 연결 테스트
cd apps/api-server && npm run db:test
```

### PM2 프로세스 문제
```bash
# PM2 리셋
pm2 kill
pm2 start ecosystem.config-apiserver.cjs
pm2 save --force
```

## 📊 검증 체크리스트

### 웹서버
- [ ] systemd 서비스 활성화
- [ ] 포트 3000, 3001 리스닝
- [ ] 자동시작 설정 확인
- [ ] 빌드 파일 존재

### API서버
- [ ] PM2 프로세스 실행
- [ ] 포트 3001 리스닝
- [ ] DB 연결 성공
- [ ] 헬스체크 응답

### 공통
- [ ] 로그 파일 생성
- [ ] CORS 설정 정상
- [ ] 환경변수 로드

## 🚨 중요 변경사항

1. **웹서버**: PM2 → systemd 직접 사용
2. **API서버**: PM2 유지 (안정적)
3. **환경변수**: 템플릿 기반 관리
4. **자동화**: 배포 스크립트 제공

## 📝 다음 단계

1. 각 서버에 개선된 설정 배포
2. 모니터링 시스템 구축
3. CI/CD 파이프라인 구성
4. 로드밸런싱 설정 (필요시)

---
*이 가이드는 양쪽 서버의 실제 문제를 기반으로 작성되었습니다.*