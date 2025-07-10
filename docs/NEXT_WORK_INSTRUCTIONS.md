# 🚀 다음 작업 지시서 (Next Work Instructions)

**현재 완료 단계**: Phase 2 - 개발환경 Nginx API Gateway ✅  
**다음 권장 작업**: Phase 3 - 프로덕션 Infrastructure  
**작업 연속성**: 100% 준비 완료  

## 📋 Claude Code에게 전달할 작업 지시서

### 🎯 Phase 3: 프로덕션 Nginx Gateway 구성

**작업 목표**: 실제 운영환경에서 사용할 Nginx API Gateway 설정 및 배포

#### 필수 작업 항목:

1. **프로덕션 Nginx 설정 파일 생성**
   - 파일명: `/nginx/production.conf`
   - HTTPS 설정 (SSL/TLS)
   - 도메인별 라우팅:
     - `neture.co.kr` → Main Site
     - `admin.neture.co.kr` → Admin Dashboard
     - `api.neture.co.kr` → API Server
   - 보안 강화 (HSTS, CSP, Rate Limiting)
   - 캐싱 정책 및 성능 최적화

2. **배포 스크립트 생성**
   - 파일명: `/scripts/nginx-prod-deploy.sh`
   - AWS Lightsail 서버에 설정 배포
   - SSL 인증서 자동 갱신 (Let's Encrypt)
   - 무중단 배포 지원

3. **도메인별 CI/CD 구현**
   - GitHub Actions 워크플로우 확장
   - 도메인별 자동 배포 파이프라인
   - 배포 검증 및 롤백 기능

#### 참조 자료:
- **현재 개발환경 설정**: `/nginx/local-dev.conf`
- **완료된 작업 내역**: `/docs/development/WORK_SESSION_2025-07-04.md`
- **기존 아키텍처**: `/CLAUDE.md`

#### 작업 시작 명령어:
```bash
# 1. 현재 상태 확인
npm run nginx:status

# 2. 개발환경 테스트 (참조용)
npm run dev:nginx

# 3. 프로덕션 설정 개발 시작
# 목표: nginx/production.conf 생성
```

#### 성공 기준:
- [ ] 프로덕션 Nginx 설정 파일 완성
- [ ] HTTPS 및 보안 헤더 적용
- [ ] 도메인별 라우팅 동작 확인
- [ ] 배포 스크립트 동작 검증
- [ ] 문서화 완료

---

### 🔄 Alternative 작업 옵션

#### Option A: E2E 테스트 확장
```bash
# Playwright 테스트 확장 및 크로스 브라우저 지원
# 목표: 완전한 테스트 자동화 파이프라인
```

#### Option B: 새로운 서비스 연동
```bash
# crowdfunding, forum, signage 서비스 중 하나 선택하여 Nginx 연동
```

#### Option C: 개발 도구 개선
```bash
# 실시간 모니터링 대시보드, 성능 메트릭 수집 시스템
```

---

## 🔗 작업 연속성 보장

### 현재 Todo 상태:
```
✅ 개발환경 Nginx 설정 (완료)
⏳ 프로덕션 Nginx Gateway (다음 작업)
⏳ 도메인별 CI/CD 구현 (후속 작업)
```

### 환경 정보:
- **프로젝트 루트**: `/mnt/c/Users/home/OneDrive/Coding/o4o-platform`
- **개발환경**: WSL Ubuntu + Node.js 20 + Nginx 1.24.0
- **현재 설정**: 완전히 동작하는 개발용 Gateway (포트 8080)

### 즉시 실행 가능:
```bash
cd /mnt/c/Users/home/OneDrive/Coding/o4o-platform
npm run nginx:status  # 현재 상태 확인
```

---

**작업 준비 완료**: 모든 설정과 문서가 준비되어 있어 즉시 다음 단계 진행 가능 🚀