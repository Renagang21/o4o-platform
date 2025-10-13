# Claude 작업 규칙

## 필수 작업 절차

### 1. 브라우저 테스트 우선
- **모든 프론트엔드 변경은 Claude가 먼저 브라우저 테스트 수행**
- Chrome DevTools MCP 또는 직접 브라우저 접근으로 Network 탭 확인
- 사용자에게 테스트 요청 금지

### 2. 배포 전 커밋/푸시 필수
- **사용자는 자동 배포된 버전만 테스트 가능**
- 변경사항은 반드시 `git commit && git push` 완료
- GitHub Actions 자동 배포 완료 대기 필요
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
- API: `/home/ubuntu/o4o-platform`
- Admin: `/var/www/admin.neture.co.kr`

## 자동 배포
- **Workflow**: `.github/workflows/deploy-api.yml`
- **Trigger**: `main` 브랜치 푸시
- **시간**: 2-3분
- **프로세스**: git pull → pnpm install → build → pm2 restart

---

# 작업 기록

## 2025-10-13: 하드코딩된 API 경로 수정

### 문제: 중복 경로로 인한 404 에러
**증상**:
- `GET /api/v1/api/public/cpt/types 404` (double `/api`)
- `GET /api/v1/api/v1/users/.../permissions 404` (double `/api/v1`)

**원인**:
- `fetch(${apiUrl}/api/public/cpt/types)` 형태로 URL 직접 구성
- `apiUrl`에 이미 `/api/v1` 포함되어 있어 중복 발생
- 환경변수 직접 사용으로 baseURL 처리 누락

**해결**:
- 8개 파일에서 하드코딩된 경로 제거
- `authClient.api.get('/public/cpt/types')` 형태로 변경
- authClient가 baseURL 자동 처리

**수정 파일**:
- CPT types 엔드포인트 (4개): TaxonomyEditor, FormBuilder, FieldGroupEditor, useDynamicCPTMenu
- Users 엔드포인트 (4개): rolePermissions, useAdminMenu, UserForm, CategoryEdit

**커밋**: `fix: Remove all hardcoded API paths causing double path segments` (28c60998)

---

## 2025-10-13: API 404 에러 수정

## 수정 내역

### 1. Template Parts Active 500 에러
**파일**: `apps/api-server/src/routes/template-parts.routes.ts:94-155`
**문제**: `conditions` 필드 JSON 파싱 실패
**해결**: 문자열 타입 체크 및 try-catch 추가
**커밋**: `fix: Add robust error handling for template-parts active endpoint`

### 2. Slug 중복 체크 400 에러
**파일**: `apps/api-server/src/routes/template-parts.routes.ts:389-394`
**문제**: 자기 자신과 slug 중복 체크
**해결**: `where: { slug, id: Not(id) }` 조건 추가
**커밋**: `fix: Exclude current record from slug uniqueness check in PUT endpoint`

### 3. SimpleCustomizer Slug 보존
**파일**: `apps/admin-dashboard/src/.../SimpleCustomizer.tsx:152-161`
**문제**: 항상 'default-header' slug 전송하여 충돌
**해결**: 기존 slug 보존 로직 추가
**커밋**: `fix: Preserve existing slug when updating template parts`

### 4. Customizer Settings PUT 엔드포인트 추가
**파일**: `apps/api-server/src/routes/v1/settings.routes.ts:938-1041`
**문제**: POST만 존재, PUT 요청 시 404
**해결**: PUT 엔드포인트 추가, POST와 핸들러 공유
**커밋**: `feat: Add PUT endpoint for customizer settings`

### 5. PM2 프로세스 이름 수정
**파일**: `.github/workflows/deploy-api.yml:102,105`
**문제**: 배포 스크립트가 잘못된 프로세스명 사용
**해결**: `o4o-api-production` → `o4o-api-server`
**커밋**: `fix: Update PM2 process name in deploy script to match config`

### 6. API 서버 포트 불일치
**문제**: API 서버 포트 3002, Nginx는 4000으로 프록시
**해결**: `PORT=4000 pm2 restart o4o-api-server --update-env`

### 7. Admin Dashboard baseURL 누락 ⭐
**파일**: `apps/admin-dashboard/.env.production`
**문제**:
- Vite 빌드 시 `VITE_API_URL=https://api.neture.co.kr` 인라인
- `/api/v1` 경로 추가 로직이 실행되지 않음
- 모든 API 요청이 404 에러

**해결**:
```bash
# Before
VITE_API_URL=https://api.neture.co.kr

# After
VITE_API_URL=https://api.neture.co.kr/api/v1
```

**결과**:
- 빌드 번들에 `baseURL:"https://api.neture.co.kr/api/v1"` 정상 포함
- 버전 `2025.10.13-1544` 배포 완료
- PUT `/api/v1/settings/customizer` 정상 작동

**커밋**: `fix: Add /api/v1 path to VITE_API_URL in production env`

---

## 수정 파일 요약
1. `apps/api-server/src/routes/template-parts.routes.ts`
2. `apps/api-server/src/routes/v1/settings.routes.ts`
3. `apps/admin-dashboard/src/.../SimpleCustomizer.tsx`
4. `apps/admin-dashboard/.env.production` ⭐
5. `.github/workflows/deploy-api.yml`

## 배포 버전
- **API**: 커밋 `36dd8f8c` (PUT endpoint 추가)
- **Admin**: `2025.10.13-1544` (baseURL 수정)

---

---

*최종 업데이트: 2025-10-13 16:02 KST*
*상태: ✅ 하드코딩 경로 제거 완료*
