# 웹서버 배포 가이드

## 📋 배포 전 확인사항
- 현재 위치: 프로덕션 웹서버 (o4o-webserver)
- SERVER_TYPE: webserver
- 필요 권한: sudo

## 🚀 배포 절차

### 1. 코드 동기화
```bash
git pull origin main
```

### 2. 캐시 완전 정리 (중요!)
```bash
./scripts/clean-before-build.sh
# → "Do you want to clean dist folders as well? (y/n):" 질문에 **Y** 입력
```

### 3. 의존성 재설치
```bash
pnpm install
```

### 4. 패키지 빌드
```bash
npm run build:packages
```

### 5. 앱 빌드
```bash
npm run build
```

### 6. PM2 서비스 재시작
```bash
./scripts/start-pm2-webserver.sh
```

## 🔧 Nginx 설정 (도메인 기반 접속)

### 1. Nginx 설치 확인
```bash
which nginx || sudo apt-get install -y nginx
```

### 2. 기존 설정 백업
```bash
sudo cp -r /etc/nginx/sites-enabled /etc/nginx/sites-enabled.backup
```

### 3. 새 설정 파일 적용
```bash
# 기존 default 설정 제거
sudo rm /etc/nginx/sites-enabled/default

# 새 설정 파일 복사
sudo cp nginx-config/admin.neture.co.kr.conf /etc/nginx/sites-available/
sudo cp nginx-config/neture.co.kr.conf /etc/nginx/sites-available/

# 심볼릭 링크 생성
sudo ln -sf /etc/nginx/sites-available/admin.neture.co.kr.conf /etc/nginx/sites-enabled/
sudo ln -sf /etc/nginx/sites-available/neture.co.kr.conf /etc/nginx/sites-enabled/
```

### 4. Nginx 설정 테스트 및 재시작
```bash
sudo nginx -t
sudo systemctl restart nginx
```

## ⚠️ 트러블슈팅

### 빌드 실패시
```bash
# 메모리 부족 해결
export NODE_OPTIONS='--max-old-space-size=4096'
npm run build

# 타임아웃 발생시
npm run build:timeout
```

### PM2 문제시
```bash
# PM2 프로세스 확인
pm2 list

# 로그 확인
pm2 logs

# 강제 재시작
pm2 delete all
./scripts/start-pm2-webserver.sh
```

### Nginx 문제시
```bash
# 에러 로그 확인
sudo tail -f /var/log/nginx/error.log

# 설정 문법 확인
sudo nginx -t

# Nginx 상태 확인
sudo systemctl status nginx
```

## 📝 확인사항

### 1. 서비스 상태
```bash
# PM2 프로세스 확인
pm2 status

# Nginx 상태 확인
sudo systemctl status nginx

# 포트 확인
sudo netstat -tlnp | grep -E "80|3001|5173"
```

### 2. 접속 테스트
- http://admin.neture.co.kr - 관리자 대시보드
- http://neture.co.kr - 메인 사이트
- http://localhost:3001 - 직접 포트 접속 (디버깅용)

## 🔄 롤백 절차
```bash
# 이전 커밋으로 롤백
git log --oneline -5
git checkout [previous-commit-hash]

# 재빌드 및 재시작
npm run build
./scripts/start-pm2-webserver.sh

# Nginx 설정 롤백
sudo rm /etc/nginx/sites-enabled/*.conf
sudo cp -r /etc/nginx/sites-enabled.backup/* /etc/nginx/sites-enabled/
sudo systemctl restart nginx
```

## 📊 모니터링
```bash
# 실시간 로그 모니터링
pm2 monit

# 메모리/CPU 사용량
pm2 info o4o-admin-webserver
pm2 info o4o-storefront-webserver

# 접속 로그
sudo tail -f /var/log/nginx/access.log
```

---
최종 업데이트: 2025년 9월