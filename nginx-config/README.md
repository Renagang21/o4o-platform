# Nginx Configuration for O4O Platform

## 개요
이 디렉토리는 O4O Platform의 도메인 기반 접속을 위한 Nginx 설정 파일들을 포함합니다.

## 설정 파일
- `admin.neture.co.kr.conf`: 관리자 대시보드 (포트 3001로 프록시)
- `neture.co.kr.conf`: 메인 사이트 (포트 3001로 프록시)

## 설치 및 적용 방법

### 1. Nginx 설치 (Ubuntu/Debian)
```bash
sudo apt-get update
sudo apt-get install -y nginx
```

### 2. 설정 파일 복사
```bash
sudo cp /home/user/o4o-platform/nginx-config/*.conf /etc/nginx/sites-available/
```

### 3. 심볼릭 링크 생성
```bash
sudo ln -s /etc/nginx/sites-available/admin.neture.co.kr.conf /etc/nginx/sites-enabled/
sudo ln -s /etc/nginx/sites-available/neture.co.kr.conf /etc/nginx/sites-enabled/
```

### 4. hosts 파일 수정 (로컬 개발용)
```bash
sudo nano /etc/hosts
```

다음 내용 추가:
```
127.0.0.1    admin.neture.co.kr
127.0.0.1    neture.co.kr
127.0.0.1    www.neture.co.kr
```

### 5. Nginx 설정 테스트 및 재시작
```bash
sudo nginx -t
sudo systemctl restart nginx
```

## 접속 URL
- 관리자 대시보드: http://admin.neture.co.kr
- 메인 사이트: http://neture.co.kr

## 주의사항
- 개발 서버가 포트 3001에서 실행 중이어야 함
- 프로덕션 환경에서는 SSL 설정 추가 필요
- 실제 도메인 사용 시 DNS 설정 필요