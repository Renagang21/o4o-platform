# Claude 작업 규칙

## 필수 작업 절차

### 1. 브라우저 테스트 우선
- **모든 프론트엔드 변경은 Claude가 먼저 브라우저 테스트 수행**
- Chrome DevTools MCP 또는 직접 브라우저 접근으로 Network 탭 확인
- 사용자에게 테스트 요청 금지

### 2. 배포 전 커밋/푸시 필수
- **사용자는 자동 배포된 버전만 테스트 가능**
- 변경사항은 반드시 `git commit && git push` 완료
- ⚠️ **GitHub Actions가 자주 실패함 - 수동 배포 스크립트 사용 필수**
- 수동 배포 스크립트:
  - Admin: `./scripts/deploy-admin-manual.sh`
  - Main Site: `ssh o4o-web` 후 `/home/ubuntu/o4o-platform` 경로에서 `./scripts/deploy-main-site.sh`
- 배포 확인:
  - Admin: `curl -s https://admin.neture.co.kr/version.json`
  - Main Site: `curl -s https://neture.co.kr/version.json`
- 로컬 빌드만으로는 사용자 테스트 불가능

### 3. 디버깅 작업 절차
- **1단계: 하드코딩 조사 필수**
  - API 경로가 하드코딩되어 있는지 먼저 확인
  - `fetch()`, `axios()` 등 직접 URL 구성 검색
  - `/api`, `/api/v1` 중복 경로 확인
- **2단계: 하드코딩 제거**
  - `authClient.api.get()`, `authClient.api.post()` 사용
  - 환경변수 직접 사용 금지 (`VITE_API_URL` 등)
  - baseURL은 authClient가 자동 처리
- **3단계: 디버깅 진행**
  - 하드코딩 제거 후 실제 버그 수정 시작

### 4. API 서버 작업
- SSH 접속, 파일 확인, PM2 관리 등은 직접 처리
- 복잡한 케이스만 에이전트에 작업 요청

### 5. 해결이 어려운 디버깅
- **여러 번 시도해도 해결되지 않는 버그**: 테스트 페이지를 만들어 문제를 격리
- **방법**: `/admin/test/[기능명]` 경로에 최소 재현 페이지 생성
- **목적**: 문제 발생 지점을 정확히 파악 (추측 없이)

---

# 인프라 구조

## 서버 정보
```
DNS: api.neture.co.kr → 웹서버 (13.125.144.8)
웹서버: Nginx 프록시 → API 서버 (43.202.242.215:4000)
```

| 서버 | IP | SSH | 역할 | 프로세스 |
|------|-----|-----|------|----------|
| 웹서버 | 13.125.144.8 | `ssh o4o-web` | Nginx 프록시 | - |
| API 서버 | 43.202.242.215 | `ssh o4o-api` | Node.js 백엔드 | PM2: `o4o-api-server` |

## 배포 경로
- API: `/home/ubuntu/o4o-platform` (on o4o-api)
- Admin: `/var/www/admin.neture.co.kr` (on o4o-web)
- Main Site: `/var/www/neture.co.kr` (on o4o-web)

## 자동 배포
- **Workflow**: `.github/workflows/deploy-api.yml`
- **Trigger**: `main` 브랜치 푸시
- **시간**: 2-3분
- **프로세스**: git pull → pnpm install → build → pm2 restart

---

## 참고 자료

### 배포 스크립트
- Admin 수동 배포: `./scripts/deploy-admin-manual.sh`
- Main Site 수동 배포: `ssh o4o-web` 후 `./scripts/deploy-main-site.sh`
- 배포 확인:
  - Admin: `curl -s https://admin.neture.co.kr/version.json`
  - Main Site: `curl -s https://neture.co.kr/version.json`

### 주요 문서
- 블록 개발 가이드: `BLOCKS_DEVELOPMENT.md`
- 배포 가이드: `DEPLOYMENT.md`

---

*최종 업데이트: 2025-10-17*
