# 🚀 O4O Platform 실서버 배포 계획서

**작성일**: 2025-06-28  
**목표**: neture.co.kr에서 완전한 WordPress 스타일 CMS 시스템 운영  
**배포 타입**: 데모용 (10-20명 동시 접속)

---

## 📋 현재 인프라 현황 파악

### ✅ 확인된 AWS Lightsail 환경
```
🌐 o4o-webserver:
- IP: 13.125.144.8
- 도메인: neture.co.kr (SSL 설정 완료)
- 현재 상태: React 앱 운영 중
- 위치: /home/ubuntu/o4o-platform/services/main-site/
- 웹서버: nginx 1.18.0

🔧 o4o-apiserver:
- 별도 인스턴스 (IP 확인 필요)
- PostgreSQL + Medusa 구축됨
- API 서버 운영 중 (localhost:4000)

🔐 Common-Core Auth:
- 위치: /common-core/auth/backend/
- 소셜 로그인 (Google/Naver/Kakao)
- 배포 대상: auth.neture.co.kr
```

---

## 🎯 최종 배포 구조

### 🌐 도메인 매핑
```
neture.co.kr (443)        → Main React CMS (Gutenberg + Admin)
api.neture.co.kr (443)    → Express API Server (E-commerce + CMS)
auth.neture.co.kr (443)   → Common-Core Auth (소셜 로그인)
```

### 🔄 사용자 플로우
```
1. neture.co.kr 접속
   ↓
2. CMS 메인 페이지 (소개 + 로그인 버튼)
   ↓
3. "관리자 로그인" 클릭 → auth.neture.co.kr
   ↓
4. Google/Naver/Kakao 소셜 로그인
   ↓
5. 인증 완료 → neture.co.kr/admin
   ↓
6. WordPress 스타일 대시보드 → Gutenberg 에디터
```

---

## 📚 단계별 배포 계획

### Phase 1: 서브도메인 DNS 설정 및 확인
```bash
# 목표: api.neture.co.kr, auth.neture.co.kr DNS 설정

1. AWS Lightsail DNS 설정
   - A Record: api.neture.co.kr → o4o-apiserver IP
   - A Record: auth.neture.co.kr → o4o-webserver IP (같은 서버 다른 포트)
   
2. 도메인 전파 확인
   - nslookup api.neture.co.kr
   - nslookup auth.neture.co.kr
```

### Phase 2: Common-Core Auth 배포
```bash
# 목표: auth.neture.co.kr에서 소셜 로그인 시스템 운영

1. o4o-webserver에 Auth 시스템 설치
   cd /home/ubuntu/
   git clone https://github.com/Renagang21/common-core.git
   cd common-core/auth/backend
   
2. 환경 설정
   cp .env.example .env
   # OAuth 클라이언트 설정 (Google/Naver/Kakao)
   
3. PostgreSQL 연결 (o4o-apiserver 활용)
   # DATABASE_HOST=o4o-apiserver-ip
   # DATABASE_NAME=common_core_auth
   
4. PM2로 서비스 시작
   npm install
   npm run build
   pm2 start dist/server.js --name "auth-server" --port 5000
   
5. nginx 리버스 프록시 설정
   # auth.neture.co.kr → localhost:5000
```

### Phase 3: API 서버 도메인 연결
```bash
# 목표: api.neture.co.kr에서 Express API 서버 운영

1. o4o-apiserver nginx 설정
   # api.neture.co.kr → localhost:4000
   
2. SSL 인증서 발급
   sudo certbot --nginx -d api.neture.co.kr
   
3. CORS 설정 업데이트
   # neture.co.kr, auth.neture.co.kr 허용
```

### Phase 4: 메인 CMS 통합 배포
```bash
# 목표: neture.co.kr에서 완전한 CMS 시스템 운영

1. 환경변수 설정
   VITE_API_BASE_URL=https://api.neture.co.kr
   VITE_AUTH_BASE_URL=https://auth.neture.co.kr
   
2. Common-Core Auth 통합
   # React 앱에 소셜 로그인 연동
   # JWT 토큰 관리 시스템
   
3. WordPress 가져오기 시스템 활성화
   # CORS 프록시 설정
   # DOMPurify 보안 처리
   
4. 프로덕션 빌드 및 배포
   npm run build
   sudo cp -r dist/* /var/www/html/
```

### Phase 5: 보안 및 성능 최적화
```bash
# 목표: 프로덕션 준비 완료

1. SSL 인증서 모든 도메인 적용
2. nginx 보안 헤더 설정
3. PM2 클러스터 모드 (필요시)
4. 로그 모니터링 설정
5. 백업 및 복구 계획
```

---

## 🔧 상세 구현 가이드

### 1. DNS 서브도메인 설정 방법

#### AWS Lightsail DNS 관리
```bash
1. Lightsail 콘솔 접속
2. "네트워킹" → "DNS 존" → "neture.co.kr"
3. A 레코드 추가:
   - 이름: api
   - 값: [o4o-apiserver IP 주소]
   - TTL: 300
   
   - 이름: auth  
   - 값: 13.125.144.8 (o4o-webserver IP)
   - TTL: 300
```

#### 도메인 전파 확인
```bash
# DNS 전파 확인 (5-10분 소요)
nslookup api.neture.co.kr
nslookup auth.neture.co.kr

# 성공 예시:
# api.neture.co.kr → o4o-apiserver IP
# auth.neture.co.kr → 13.125.144.8
```

### 2. nginx 리버스 프록시 설정

#### auth.neture.co.kr 설정
```nginx
# /etc/nginx/sites-available/auth.neture.co.kr
server {
    listen 443 ssl http2;
    server_name auth.neture.co.kr;
    
    ssl_certificate /etc/letsencrypt/live/auth.neture.co.kr/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/auth.neture.co.kr/privkey.pem;
    
    location / {
        proxy_pass http://localhost:5000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}

server {
    listen 80;
    server_name auth.neture.co.kr;
    return 301 https://$host$request_uri;
}
```

#### SSL 인증서 발급
```bash
# Let's Encrypt 인증서 발급
sudo certbot --nginx -d auth.neture.co.kr
sudo certbot --nginx -d api.neture.co.kr
```

### 3. Common-Core Auth 환경 설정

#### .env 파일 예시
```bash
# 서버 설정
NODE_ENV=production
PORT=5000
HOST=0.0.0.0

# 데이터베이스 (o4o-apiserver 활용)
DATABASE_HOST=[o4o-apiserver-ip]
DATABASE_PORT=5432
DATABASE_NAME=common_core_auth
DATABASE_USER=postgres
DATABASE_PASSWORD=[password]

# JWT 보안
JWT_SECRET=[강력한-비밀키]
JWT_EXPIRY=24h

# OAuth 클라이언트 (실제 값 설정 필요)
GOOGLE_CLIENT_ID=[Google OAuth ID]
GOOGLE_CLIENT_SECRET=[Google OAuth Secret]
NAVER_CLIENT_ID=[Naver OAuth ID]
NAVER_CLIENT_SECRET=[Naver OAuth Secret]
KAKAO_CLIENT_ID=[Kakao OAuth ID]
KAKAO_CLIENT_SECRET=[Kakao OAuth Secret]

# 서비스 URL
O4O_PLATFORM_URL=https://neture.co.kr
AUTH_BASE_URL=https://auth.neture.co.kr

# CORS 허용 도메인
ALLOWED_ORIGINS=https://neture.co.kr,https://api.neture.co.kr
```

### 4. React 앱 인증 통합

#### 환경변수 설정
```bash
# .env.production
NODE_ENV=production
VITE_API_BASE_URL=https://api.neture.co.kr
VITE_AUTH_BASE_URL=https://auth.neture.co.kr
```

#### 인증 플로우 구현
```typescript
// src/services/authService.ts
export const authService = {
  // 소셜 로그인 리다이렉트
  login: (service = 'o4o-platform') => {
    const state = btoa(JSON.stringify({ 
      service, 
      returnUrl: window.location.href 
    }));
    window.location.href = `${import.meta.env.VITE_AUTH_BASE_URL}/auth/google?state=${state}`;
  },
  
  // 토큰 검증
  verifyToken: async (token: string) => {
    const response = await fetch(`${import.meta.env.VITE_AUTH_BASE_URL}/api/auth/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token })
    });
    return response.json();
  }
};
```

---

## 🧪 테스트 계획

### Phase별 테스트 체크리스트

#### Phase 1 테스트
- [ ] `nslookup api.neture.co.kr` 성공
- [ ] `nslookup auth.neture.co.kr` 성공
- [ ] DNS 전파 완료 (전 세계 확인)

#### Phase 2 테스트  
- [ ] `https://auth.neture.co.kr` 접속 성공
- [ ] 소셜 로그인 페이지 정상 표시
- [ ] Google/Naver/Kakao 로그인 테스트
- [ ] JWT 토큰 발급 확인

#### Phase 3 테스트
- [ ] `https://api.neture.co.kr/api/health` 응답 확인
- [ ] E-commerce API 엔드포인트 테스트
- [ ] CORS 헤더 정상 작동

#### Phase 4 테스트
- [ ] `https://neture.co.kr` 메인 페이지 로딩
- [ ] 관리자 로그인 → auth 리다이렉트
- [ ] 인증 후 관리자 대시보드 접근
- [ ] Gutenberg 에디터 정상 작동
- [ ] WordPress 페이지 가져오기 테스트

#### Phase 5 테스트
- [ ] 모든 도메인 SSL 인증서 유효
- [ ] 보안 헤더 적용 확인
- [ ] 성능 테스트 (10-20명 동시 접속)
- [ ] 모바일 브라우저 테스트

---

## 📊 모니터링 및 유지보수

### 로그 모니터링
```bash
# nginx 로그
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log

# PM2 로그
pm2 logs auth-server
pm2 logs api-server

# 시스템 리소스
pm2 monit
```

### 백업 계획
```bash
# 데이터베이스 백업 (일일)
pg_dump common_core_auth > backup_$(date +%Y%m%d).sql

# 설정 파일 백업 (주간)
tar -czf nginx_config_backup_$(date +%Y%m%d).tar.gz /etc/nginx/sites-available/

# 코드 백업 (Git)
git push origin main
```

### 장애 대응 매뉴얼
```bash
# 서비스 재시작
pm2 restart auth-server
pm2 restart api-server
sudo systemctl reload nginx

# 긴급 롤백
git checkout [이전-커밋]
npm run build
sudo cp -r dist/* /var/www/html/
```

---

## 🔐 보안 강화 설정

### nginx 보안 헤더
```nginx
# 보안 헤더 추가
add_header X-Frame-Options "SAMEORIGIN" always;
add_header X-XSS-Protection "1; mode=block" always;
add_header X-Content-Type-Options "nosniff" always;
add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
add_header Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline';" always;
```

### PM2 보안 설정
```bash
# PM2 클러스터 모드 (필요시)
pm2 start dist/server.js --name "auth-server" -i 2 --max-memory-restart 512M

# 환경변수 암호화
pm2 set pm2-encryption:password [암호]
```

---

## 📞 배포 지원 및 문의

### 배포 실행 시 필요한 정보
1. **o4o-apiserver IP 주소**
2. **PostgreSQL 접속 정보** (호스트, 포트, 사용자명, 비밀번호)
3. **OAuth 클라이언트 정보** (Google, Naver, Kakao)
4. **도메인 관리 권한** (AWS Lightsail DNS)

### 단계별 실행 가이드
각 Phase는 이전 단계 완료 후 진행하며, 문제 발생 시 즉시 롤백 가능한 구조로 설계되었습니다.

---

**🎯 최종 목표**: neture.co.kr에서 완전히 작동하는 WordPress 수준의 CMS 시스템**

**⏱️ 예상 소요시간**: 3-4시간 (DNS 전파 시간 포함)**

**📈 성공 지표**: 모든 기능이 정상 작동하는 데모 환경 구축 완료**