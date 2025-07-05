# O4O Platform - 개발환경 Nginx API Gateway

## 📋 개요

이 설정은 O4O Platform의 개발환경에서 3개의 개별 서비스를 하나의 통합 엔트리포인트로 제공하는 Nginx API Gateway입니다.

### 🎯 주요 목적

- **포트 통합**: 3000(main-site) + 3001(admin) + 4000(api) → 8080 단일 포트
- **CORS 해결**: 동일 오리진으로 모든 요청 처리  
- **SSO 쿠키 공유**: `.neture.co.kr` 도메인 통합
- **개발 편의성**: Hot Module Replacement (HMR) 지원
- **WSL 최적화**: Ubuntu 환경에 맞는 설정

## 🏗️ 아키텍처

```
                    ┌─────────────────┐
                    │   브라우저      │
                    │ localhost:8080  │
                    └─────────┬───────┘
                              │
                    ┌─────────▼───────┐
                    │ Nginx Gateway   │
                    │   포트 8080     │
                    └─────────┬───────┘
                              │
        ┌─────────────────────┼─────────────────────┐
        │                     │                     │
┌───────▼───────┐   ┌─────────▼────────┐   ┌───────▼──────┐
│ Main Site     │   │ Admin Dashboard  │   │ API Server   │
│ React + Vite  │   │ React + Vite     │   │ Express.js   │
│ 포트 3000     │   │ 포트 3001        │   │ 포트 4000    │
└───────────────┘   └──────────────────┘   └──────────────┘
```

## 🛣️ 라우팅 규칙

| 요청 경로 | 대상 서비스 | 업스트림 포트 | 설명 |
|-----------|-------------|---------------|------|
| `/api/*` | API Server | 4000 | Express.js API 엔드포인트 |
| `/admin/*` | Admin Dashboard | 3001 | 관리자 인터페이스 |
| `/*` | Main Site | 3000 | 메인 웹사이트 (기본) |

### 특수 엔드포인트

- `http://localhost:8080/health` - Gateway 헬스체크
- `http://localhost:8080/dev-info` - 개발환경 정보
- `http://localhost:8080/nginx-status` - Nginx 상태 (127.0.0.1만 접근 가능)

## 🚀 빠른 시작

### 1. 환경 설정

```bash
# Nginx 설치 및 설정
./scripts/nginx-dev-setup.sh
```

### 2. 개발 서버 시작

```bash
# 방법 1: 모든 서비스 + Nginx 통합 시작 (권장)
./scripts/dev-with-nginx.sh

# 방법 2: 개별적으로 시작
npm run dev:all                    # 개발 서버들 시작
./scripts/nginx-dev-start.sh       # Nginx 시작
```

### 3. 접근 확인

- **메인 사이트**: http://localhost:8080
- **관리자 대시보드**: http://localhost:8080/admin
- **API 엔드포인트**: http://localhost:8080/api
- **개발 정보**: http://localhost:8080/dev-info

## 📋 관리 명령어

### 기본 명령어

```bash
# Nginx 관리
./scripts/nginx-dev-start.sh       # Nginx 시작
./scripts/nginx-dev-stop.sh        # Nginx 중지
./scripts/nginx-dev-reload.sh      # 설정 재로드
./scripts/nginx-dev-status.sh      # 상태 확인

# 통합 관리
./scripts/dev-with-nginx.sh        # 모든 서비스 + Nginx 시작
./scripts/dev-stop-all.sh          # 모든 서비스 중지
```

### 상태 확인

```bash
# 전체 상태 확인
./scripts/nginx-dev-status.sh

# 로그 모니터링
sudo tail -f /var/log/nginx/o4o-dev-access.log  # 접근 로그
sudo tail -f /var/log/nginx/o4o-dev-error.log   # 에러 로그

# 포트 사용 확인
netstat -tuln | grep -E "(3000|3001|4000|8080)"
```

## 🔧 설정 파일

### 주요 파일

- `nginx/local-dev.conf` - Nginx 메인 설정
- `/var/log/nginx/o4o-dev-*.log` - 로그 파일
- `/var/run/nginx/nginx-o4o-dev.pid` - PID 파일

### 설정 수정

```bash
# 설정 파일 편집
vi nginx/local-dev.conf

# 문법 검사
sudo nginx -t -c /path/to/nginx/local-dev.conf

# 설정 재로드
./scripts/nginx-dev-reload.sh
```

## 🌐 도메인 설정 (선택사항)

WSL 환경에서 도메인으로 접근하려면 Windows의 hosts 파일을 수정하세요:

```
# C:\Windows\System32\drivers\etc\hosts 파일에 추가
127.0.0.1    local-dev.neture.co.kr
```

그 후 `http://local-dev.neture.co.kr:8080`으로 접근 가능합니다.

## 🔍 테스트 시나리오

### 1. 기본 기능 테스트

```bash
# Gateway 헬스체크
curl http://localhost:8080/health

# 메인 사이트 접근
curl -I http://localhost:8080/

# 관리자 대시보드 접근
curl -I http://localhost:8080/admin/

# API 서버 접근
curl http://localhost:8080/api/health
```

### 2. 라우팅 테스트

```bash
# API 라우팅 확인
curl http://localhost:8080/api/v1/business/health

# 관리자 라우팅 확인
curl -I http://localhost:8080/admin/dashboard

# Static assets 라우팅 확인
curl -I http://localhost:8080/vite.svg
curl -I http://localhost:8080/admin/assets/logo.png
```

### 3. HMR (Hot Module Replacement) 테스트

```bash
# WebSocket 연결 확인 (개발자 도구에서)
# - Main Site: ws://localhost:8080/@vite/client
# - Admin Dashboard: ws://localhost:8080/admin/@vite/client
```

### 4. 쿠키 공유 테스트

```bash
# 로그인 후 쿠키 확인
# 브라우저 개발자 도구 > Application > Cookies
# Domain이 localhost 또는 local-dev.neture.co.kr로 설정되어 있는지 확인
```

## 🚨 문제 해결

### 자주 발생하는 문제

#### 1. 포트 충돌

```bash
# 문제: "포트 8080이 이미 사용 중"
# 해결:
./scripts/dev-stop-all.sh
netstat -tuln | grep :8080
sudo pkill -f nginx
```

#### 2. 502 Bad Gateway

```bash
# 문제: API나 페이지 접근 시 502 에러
# 해결: 업스트림 서버 상태 확인
curl http://localhost:3000  # Main Site 직접 확인
curl http://localhost:3001  # Admin Dashboard 직접 확인
curl http://localhost:4000  # API Server 직접 확인

# 개발 서버 재시작
npm run dev:all
```

#### 3. HMR 작동 안함

```bash
# 문제: 코드 변경이 자동 반영 안됨
# 해결: WebSocket 연결 확인
# 1. 브라우저 개발자 도구 > Network > WS 탭 확인
# 2. Nginx 설정에서 upgrade 헤더 확인
# 3. 개발 서버 재시작
```

#### 4. 쿠키 공유 안됨

```bash
# 문제: 로그인 상태가 서비스간 공유 안됨
# 해결:
# 1. 도메인 설정 확인 (local-dev.neture.co.kr)
# 2. 쿠키 도메인 설정 확인
# 3. HTTPS 환경에서는 Secure 플래그 확인
```

### 로그 확인

```bash
# Nginx 에러 로그
sudo tail -n 50 /var/log/nginx/o4o-dev-error.log

# 개발 서버 로그
tail -f /tmp/o4o-main-site.log
tail -f /tmp/o4o-admin-dashboard.log
tail -f /tmp/o4o-api-server.log

# 시스템 로그
journalctl -u nginx -f
```

## 📊 성능 모니터링

### 기본 메트릭

```bash
# Nginx 상태
curl http://localhost:8080/nginx-status

# 리소스 사용량
ps aux | grep nginx
top -p $(cat /var/run/nginx/nginx-o4o-dev.pid)

# 연결 상태
ss -tuln | grep -E "(3000|3001|4000|8080)"
```

### 응답 시간 측정

```bash
# Gateway를 통한 응답 시간
curl -w "@curl-format.txt" -o /dev/null -s http://localhost:8080/

# 직접 연결 응답 시간 비교
curl -w "@curl-format.txt" -o /dev/null -s http://localhost:3000/
```

## 🔒 보안 설정

### 개발환경 보안 헤더

```nginx
# 현재 적용된 보안 헤더
X-Frame-Options: SAMEORIGIN
X-Content-Type-Options: nosniff
X-XSS-Protection: 1; mode=block
Referrer-Policy: strict-origin-when-cross-origin
```

### 접근 제한

```nginx
# Nginx 상태 페이지는 로컬에서만 접근 가능
location /nginx-status {
    allow 127.0.0.1;
    allow ::1;
    deny all;
}
```

## 🚀 프로덕션 배포 준비

### 설정 변경사항

1. **HTTPS 설정** - SSL 인증서 적용
2. **도메인 설정** - 실제 도메인으로 변경
3. **보안 강화** - 추가 보안 헤더 적용
4. **압축 최적화** - Gzip 레벨 조정
5. **캐싱 정책** - 정적 자산 캐싱 강화

### 설정 검증 체크리스트

- [ ] 모든 서비스 정상 작동
- [ ] 라우팅 규칙 정확성
- [ ] HMR 기능 동작
- [ ] 쿠키 공유 기능
- [ ] 에러 페이지 처리
- [ ] 로그 정상 기록
- [ ] 성능 문제 없음

## 📚 추가 리소스

### 관련 문서

- [O4O Platform 아키텍처 가이드](../docs/technical/o4o-platform-comprehensive-guide.md)
- [개발환경 설정 가이드](../docs/development/README.md)
- [SSO 인증 시스템 가이드](../packages/auth-client/README.md)

### 외부 참조

- [Nginx 공식 문서](https://nginx.org/en/docs/)
- [Vite 프록시 설정](https://vitejs.dev/config/server-options.html#server-proxy)
- [React Router와 Nginx](https://create-react-app.dev/docs/deployment/#serving-apps-with-client-side-routing)

---

**문의사항이나 문제가 있으면 개발팀에 연락하거나 GitHub Issues를 활용해주세요.**