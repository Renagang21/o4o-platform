# O4O Platform 배포 체크리스트

## 🚨 현재 상황 요약 (2025-07-30)

### ✅ 완료된 사항
- [x] TypeScript 빌드 성공 (84개 에러 → 0개)
- [x] API 서버 localhost:4000에서 정상 작동
- [x] 헬스체크 성공: `{"status":"ok"}`
- [x] PostgreSQL 데이터베이스 연결 성공
- [x] PM2로 프로세스 관리 중

### ❌ 해결 필요 사항
- [ ] api.neture.co.kr → localhost:4000 리버스 프록시 설정
- [ ] SSL 인증서 설정 (Let's Encrypt)
- [ ] CORS 헤더 설정
- [ ] 프로덕션 환경변수 설정

## 📋 Claude Code에게 전달할 추가 정보

### 서버 스펙
```
- o4o-apiserver: 43.202.242.215
- Ubuntu 22.04 LTS
- Node.js v20.18.1
- npm v10.8.2
- PM2 v5.x
- PostgreSQL 14
```

### 현재 파일 구조
```
/home/ubuntu/o4o-platform/
├── apps/
│   ├── api-server/
│   │   ├── dist/          # TypeScript 빌드 결과
│   │   ├── src/           # 소스 코드
│   │   ├── .env           # 개발 환경 변수
│   │   └── .env.production # 프로덕션 환경 변수 (생성 필요)
│   └── admin-dashboard/
└── deployment/
    └── pm2/
        └── ecosystem.config.js
```

### 필요한 Nginx 설정
1. `/etc/nginx/sites-available/api.neture.co.kr` 생성
2. SSL 인증서 발급: `sudo certbot --nginx -d api.neture.co.kr`
3. 리버스 프록시 설정:
   - api.neture.co.kr → localhost:4000
   - WebSocket 지원 (socket.io)
   - CORS 헤더 추가

### 환경 변수 설정
```bash
# /home/ubuntu/o4o-platform/apps/api-server/.env.production
NODE_ENV=production
PORT=4000
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=o4o_user
DB_PASSWORD=3lz15772779
DB_NAME=o4o_platform
JWT_SECRET=[실제 시크릿 키]
JWT_REFRESH_SECRET=[실제 리프레시 키]
CORS_ORIGIN=https://admin.neture.co.kr,https://www.neture.co.kr
```

### PM2 실행 명령
```bash
cd /home/ubuntu/o4o-platform
pm2 start deployment/pm2/ecosystem.config.js --only api-server
pm2 save
pm2 startup
```

### 보안 고려사항
- 포트 4000은 외부에서 직접 접근 불가하도록 설정
- 모든 API 요청은 Nginx를 통해서만 가능
- Rate limiting 설정
- 프로덕션 환경변수는 .gitignore에 포함

## 🔍 디버깅 명령어

### 서버 진단 스크립트
```bash
cd /home/ubuntu/o4o-platform
chmod +x scripts/server-diagnosis.sh
./scripts/server-diagnosis.sh > diagnosis-$(date +%Y%m%d-%H%M%S).log
```

### 주요 확인 사항
```bash
# PM2 상태
pm2 status
pm2 logs api-server --lines 50

# Nginx 상태
sudo nginx -t
sudo systemctl status nginx

# 포트 확인
sudo netstat -tlnp | grep :4000

# 헬스체크
curl http://localhost:4000/api/health
curl https://api.neture.co.kr/api/health
```

## 📌 중요 노트

### TypeScript 빌드 관련
- **문제**: `tsconfig.tsbuildinfo` 캐시로 인한 빌드 미반영
- **해결**: `rm tsconfig.tsbuildinfo` 후 재빌드

### Express 타입 관련
- **문제**: `req.user` 타입이 User 엔티티로 잘못 추론됨
- **해결**: 각 컨트롤러에 `AuthRequest` 인터페이스 추가

### 배포 순서
1. Git pull로 최신 코드 동기화
2. 환경변수 설정 확인
3. TypeScript 빌드 (`npm run build`)
4. PM2 재시작
5. 헬스체크 확인
6. Nginx 설정 및 재시작

---

**이 문서와 함께 위의 Claude Code 지시문을 전달하면 완벽한 프로덕션 배포가 가능합니다!** 🚀