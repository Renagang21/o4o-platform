# 🚀 O4O Platform 마이크로서비스 배포 가이드

> 📚 **문서 및 템플릿**: [docs-hub 바로가기](./docs-hub/README.md) - Memory 저장 템플릿, 협업 가이드 등 ⭐

## ✅ 완성된 작업 현황

### 🏗️ 로컬 개발 환경
- ✅ **O4O Platform** (Node.js + Express + Socket.io) - Port 3004
- ✅ **AI Services** (Python + FastAPI) - Port 3000  
- ✅ **RPA Services** (Node.js + Puppeteer) - Port 3001
- ✅ **Common Core** 공유 라이브러리 통합
- ✅ 모든 서비스 로컬 테스트 완료

### 📦 GitHub Repository 동기화
- ✅ **Repository**: https://github.com/Renagang21/o4o-platform
- ✅ 대용량 파일 제거 및 히스토리 정리 완료
- ✅ 프로덕션 배포 패키지 업로드 완료
- ✅ 완전한 배포 문서화 완료

---

## 🚀 즉시 배포 가능!

### APIServer 배포 (1분 설치)

```bash
# 1. API 서버에 SSH 접속
ssh deploy@your-apiserver-ip

# 2. 배포 스크립트 다운로드 및 실행
wget https://github.com/Renagang21/o4o-platform/raw/master/deployment-package/deploy-production.sh
chmod +x deploy-production.sh
./deploy-production.sh

# 완료! 🎉
```

### WebServer 배포 (Nginx 설정)

```bash
# 1. Web 서버에 SSH 접속  
ssh deploy@your-webserver-ip

# 2. Nginx 설정 다운로드 및 적용
wget https://github.com/Renagang21/o4o-platform/raw/master/deployment-package/nginx-config.txt
sudo cp nginx-config.txt /etc/nginx/sites-available/o4o-platform
sudo ln -s /etc/nginx/sites-available/o4o-platform /etc/nginx/sites-enabled/

# 3. 도메인과 API서버 IP 수정
sudo nano /etc/nginx/sites-available/o4o-platform
# your-domain.com -> 실제 도메인
# YOUR_APISERVER_IP -> 실제 API서버 IP

# 4. SSL 인증서 설정 및 Nginx 재시작
sudo certbot --nginx -d your-domain.com
sudo nginx -t && sudo systemctl reload nginx

# 완료! 🎉
```

---

## 📊 배포 후 확인사항

### 1. 서비스 상태 확인
```bash
# API 서버에서
pm2 status
curl http://localhost:3004/health
curl http://localhost:3000/health  
curl http://localhost:3001/health
```

### 2. 웹 접속 테스트
```bash
# 브라우저에서 접속 테스트
https://your-domain.com/health        # 웹서버 상태
https://your-domain.com/api/health    # O4O Platform
https://your-domain.com/ai/health     # AI Services  
https://your-domain.com/rpa/health    # RPA Services
```

### 3. 실시간 모니터링
```bash
# API 서버에서
pm2 monit      # 실시간 CPU/메모리 모니터링
pm2 logs       # 실시간 로그 확인
htop           # 시스템 리소스 확인
```

---

## 🔧 보안 설정 (필수!)

### 1. 데이터베이스 비밀번호 변경
```bash
# API 서버에서
nano /home/deploy/microservices/o4o-platform/.env
nano /home/deploy/microservices/ai-services/.env
nano /home/deploy/microservices/rpa-services/.env

# DATABASE_URL의 패스워드를 안전한 값으로 변경
```

### 2. JWT 및 쿠키 시크릿 변경
```bash
# API 서버에서
nano /home/deploy/microservices/o4o-platform/.env

# JWT_SECRET과 COOKIE_SECRET을 안전한 값으로 변경
```

### 3. 서비스 재시작
```bash
pm2 restart all
```

---

## 📋 서버 역할 분담

### APIServer (백엔드)
- **포트**: 3000, 3001, 3004
- **역할**: 마이크로서비스 API 호스팅
- **서비스**: O4O Platform, AI Services, RPA Services
- **데이터베이스**: PostgreSQL

### WebServer (프론트엔드)
- **포트**: 80, 443  
- **역할**: 정적 파일 서빙 및 API 프록시
- **서비스**: Nginx + SSL
- **기능**: 리버스 프록시, 로드 밸런싱, 보안

---

## 🎯 다음 단계 개발 계획

### 1. 즉시 개발 가능한 기능들
- 제품 추천 AI 로직 구현
- 주문 처리 자동화 RPA 스크립트
- 실시간 대시보드 구현
- 사용자 인증 시스템 구축

### 2. 프론트엔드 개발
- React/Vue.js 애플리케이션 개발
- API 연동 및 상태 관리
- 반응형 UI/UX 구현

### 3. 고급 기능 추가
- 마이크로서비스 간 통신 최적화
- 캐싱 시스템 구현
- 로그 수집 및 분석
- A/B 테스트 시스템

---

## 📞 지원 및 문의

### 문제 해결
1. **로그 확인**: `pm2 logs`
2. **시스템 상태**: `htop`, `df -h`
3. **네트워크**: `sudo netstat -tlnp`

### 추가 개발 지원
언제든 추가 기능 개발, 성능 최적화, 보안 강화 등의 작업이 필요하시면 말씀해 주세요!

**🎉 축하합니다! O4O Platform 마이크로서비스가 성공적으로 배포 준비 완료되었습니다!**

---

## 📚 관련 문서

### 🔥 자주 사용하는 문서들
- 📋 [매일 Memory 저장 템플릿](./docs-hub/templates/memory-daily-save-template.md) ⭐
- 🚀 [Memory 빠른 시작 가이드](./docs-hub/guides/memory-quick-start-guide.md) ⭐  
- 🤝 [Claude + ChatGPT 협업 워크플로우](./docs-hub/guides/claude-chatgpt-collaboration-workflow.md) ⭐

### 📖 기술 문서들
- 🐳 [Docker Compose 설정](./docker-compose.yml)
- ⚙️ [PM2 배포 설정](./deployment-package/ecosystem.config.js)
- 🌐 [Nginx 설정](./deployment-package/nginx-config.txt)

**💡 팁: [docs-hub](./docs-hub/README.md)에서 모든 문서를 체계적으로 관리하세요!**
