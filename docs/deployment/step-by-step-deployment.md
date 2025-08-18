# 🚀 O4O API 서버 단계별 배포 가이드

## 📌 현재 상황
- API 서버는 localhost:4000에서 실행 중
- 외부에서 api.neture.co.kr 접근 불가 (404 에러)
- 목표: api.neture.co.kr → localhost:4000 연결

## 🔧 Step 1: 서버 접속 및 상태 확인

### 1-1. SSH 접속
```bash
ssh ubuntu@43.202.242.215
```

### 1-2. 현재 상태 확인
```bash
# 위치 확인
pwd

# PM2 상태 확인
pm2 list

# API 헬스체크
curl http://localhost:4000/api/health
```

**✅ 예상 결과:**
- PM2에 `api-server`가 `online` 상태
- 헬스체크가 `{"status":"ok"}` 반환

---

## 🔧 Step 2: Nginx 설정

### 2-1. Nginx 설치 확인
```bash
# 버전 확인
nginx -v

# 없다면 설치
sudo apt update
sudo apt install nginx -y
```

### 2-2. api.neture.co.kr 설정 파일 생성
```bash
# 설정 파일 생성
sudo nano /etc/nginx/sites-available/api.neture.co.kr
```

**다음 내용을 복사해서 붙여넣기:**
```nginx
server {
    listen 80;
    server_name api.neture.co.kr;
    
    location / {
        proxy_pass http://localhost:4000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### 2-3. 설정 활성화
```bash
# 심볼릭 링크 생성
sudo ln -s /etc/nginx/sites-available/api.neture.co.kr /etc/nginx/sites-enabled/

# 설정 테스트
sudo nginx -t

# Nginx 재시작
sudo systemctl reload nginx
```

---

## 🔧 Step 3: 방화벽 설정

### 3-1. UFW 방화벽 설정
```bash
# 현재 상태 확인
sudo ufw status

# 필요한 포트 열기
sudo ufw allow 22/tcp    # SSH
sudo ufw allow 80/tcp    # HTTP
sudo ufw allow 443/tcp   # HTTPS

# 방화벽 활성화 (이미 활성화되어 있을 수 있음)
sudo ufw --force enable
```

### 3-2. AWS 보안 그룹 확인
**AWS 콘솔에서 확인할 사항:**
1. EC2 → 인스턴스 → 보안 그룹
2. 인바운드 규칙에 다음 포트가 열려있는지 확인:
   - 80 (HTTP) - 0.0.0.0/0
   - 443 (HTTPS) - 0.0.0.0/0
   - 22 (SSH) - 제한된 IP만

---

## 🔧 Step 4: 테스트

### 4-1. 로컬 테스트
```bash
# 서버 내부에서
curl http://localhost/api/health
```

### 4-2. 외부 테스트
**브라우저나 다른 터미널에서:**
```bash
curl http://api.neture.co.kr/api/health
```

---

## 🔧 Step 5: SSL 인증서 설정 (HTTP가 작동하면)

### 5-1. Certbot 설치
```bash
sudo apt update
sudo apt install certbot python3-certbot-nginx -y
```

### 5-2. SSL 인증서 발급
```bash
sudo certbot --nginx -d api.neture.co.kr
```
- 이메일 입력
- 약관 동의 (A)
- 이메일 수신 동의 (Y 또는 N)
- HTTPS 리다이렉트 선택 (2)

---

## 🔧 Step 6: 환경변수 설정

### 6-1. JWT Secret 생성
```bash
# 안전한 시크릿 생성
openssl rand -hex 32
# 결과를 복사해두세요!
```

### 6-2. 프로덕션 환경변수 설정
```bash
cd /home/ubuntu/o4o-platform/apps/api-server
cp .env .env.production
nano .env.production
```

**수정할 내용:**
```env
NODE_ENV=production
JWT_SECRET=[위에서 생성한 값]
JWT_REFRESH_SECRET=[새로 생성: openssl rand -hex 32]
CORS_ORIGIN=https://admin.neture.co.kr,https://www.neture.co.kr
```

### 6-3. PM2 재시작
```bash
cd /home/ubuntu/o4o-platform
pm2 restart api-server
pm2 logs api-server --lines 20
```

---

## ✅ 최종 확인

### 외부에서 테스트:
```bash
# HTTPS로 테스트 (SSL 설정 후)
curl https://api.neture.co.kr/api/health
```

### 브라우저에서:
1. https://api.neture.co.kr/api/health 접속
2. `{"status":"ok"}` 표시 확인

---

## 🚨 문제 해결

### "502 Bad Gateway" 에러
```bash
# PM2 상태 확인
pm2 list
pm2 logs api-server

# 포트 확인
sudo netstat -tlnp | grep :4000
```

### "Connection refused" 에러
```bash
# Nginx 상태 확인
sudo systemctl status nginx
sudo nginx -t

# Nginx 에러 로그
sudo tail -f /var/log/nginx/error.log
```

### DNS 문제
```bash
# DNS 확인
nslookup api.neture.co.kr
dig api.neture.co.kr
```

---

**각 단계마다 결과를 확인하고 다음으로 진행하세요!** 🎯