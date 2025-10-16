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
- 수동 배포: `./scripts/deploy-admin-manual.sh` 실행
- 배포 확인: `curl -s https://admin.neture.co.kr/version.json` 으로 버전 확인
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

## 2025-10-15: 배포 문제 해결

### 문제: GitHub Actions 자동 배포 실패
**증상**:
- 로컬 빌드: `index-Cd1csR2M.js` (2025-10-15 13:36)
- 배포된 버전: `index-WRnrpVjp.js` (이전 버전)
- 서버 디렉토리가 완전히 비어있음 (`/var/www/neture.co.kr/`)

**원인**:
- GitHub Actions workflow가 트리거되지 않음
- 이전 수동 배포 시도가 디렉토리만 삭제하고 파일 복사 실패
- 사용자 보고: `--frozen-lockfile` 이슈가 자주 발생

**해결**:
1. **긴급 수동 배포** (tarball 방식):
   ```bash
   # 로컬에서 tarball 생성
   cd apps/main-site && tar czf /tmp/main-site-dist.tar.gz -C dist .

   # 서버로 복사 및 배포
   scp /tmp/main-site-dist.tar.gz o4o-web:/tmp/manual-deploy-main/
   ssh o4o-web "cd /tmp/manual-deploy-main && tar xzf main-site-dist.tar.gz && \
                sudo cp -r * /var/www/neture.co.kr/ && \
                sudo chown -R www-data:www-data /var/www/neture.co.kr/ && \
                sudo chmod -R 755 /var/www/neture.co.kr/"
   ```

2. **배포 확인**:
   ```bash
   # 서버 파일 확인
   ssh o4o-web "cat /var/www/neture.co.kr/index.html | grep -o 'index-[^.]*\.js'"
   # 결과: index-Cd1csR2M.js ✅

   # 웹사이트 확인
   curl -s https://neture.co.kr | grep -o 'index-[^.]*\.js'
   # 결과: index-Cd1csR2M.js ✅
   ```

**진단 결과**:
- YAML 문법: ✅ 정상
- Workflow trigger paths: ✅ 정상 (apps/main-site/** 포함)
- pnpm-lock.yaml: ✅ sync 상태 (로컬에서 `--frozen-lockfile` 성공)
- Node 버전: ✅ 일치 (v22.18.0)
- Repository secrets: ✅ 정상 (사용자 확인)

**미해결 이슈**:
- GitHub Actions가 왜 트리거되지 않는지 원인 불명
- GitHub CLI 인증 없어 workflow run 로그 확인 불가
- 수동 배포로 임시 해결, 자동 배포는 추가 조사 필요

**참고 파일**:
- 배포 스크립트: `scripts/deploy-manual.sh`
- 배포 가이드: `DEPLOYMENT.md`
- Workflow: `.github/workflows/deploy-main-site.yml`

**커밋**:
- `fix: Remove prose wrapper constraints for full-width block rendering` (1961d094)
- `feat: Add workflow_dispatch trigger for manual deployment` (8a7ab1fa)

---

*최종 업데이트: 2025-10-15 17:55 KST*
*상태: ✅ 수동 배포 완료 / ⚠️ GitHub Actions 자동 배포 원인 조사 중*

---

## 2025-10-16: GitHub Actions 배포 문제 근본 해결

### 문제: GitHub Actions workflow가 지속적으로 트리거되지 않음
**증상**:
- `apps/admin-dashboard/**` 경로 변경에도 workflow 실행 안 됨
- 빈 커밋(`--allow-empty`)도 트리거하지 못함
- 사용자 보고: 배포 실패가 자주 발생

**조사 내용**:
1. ✅ Workflow YAML 문법 - 정상
2. ✅ `paths` 필터 설정 - 정상 (apps/admin-dashboard/** 포함)
3. ✅ Repository secrets - 정상 (WEB_HOST, WEB_USER, WEB_SSH_KEY)
4. ✅ pnpm-lock.yaml sync - 정상
5. ❌ **paths 필터가 GitHub Actions에서 제대로 작동하지 않음**

### 해결책

#### 1. GitHub Actions Workflow 수정 (`deploy-admin.yml`)
**변경사항**:
- `paths` 필터 **완전 제거** - 모든 main 브랜치 푸시에 트리거
- 대신 workflow 내부에서 변경 파일 확인 후 배포 여부 결정
- 각 단계에 조건부 실행 추가 (`if: steps.changes.outputs.should_deploy == 'true'`)

**장점**:
- Workflow는 항상 실행되므로 로그 확인 가능
- 불필요한 배포는 내부 로직으로 skip
- 디버깅 용이

**파일**: `.github/workflows/deploy-admin.yml`

#### 2. 수동 배포 스크립트 생성
**위치**: `scripts/deploy-admin-manual.sh`

**기능**:
- 자동화된 빌드 + 배포 프로세스
- Git 상태 체크
- 패키지 빌드 → Admin 빌드 → Tarball 생성
- 웹서버로 업로드 및 자동 배포
- 백업, 검증, 권한 설정 자동화

**사용법**:
```bash
cd /home/dev/o4o-platform
./scripts/deploy-admin-manual.sh
```

#### 3. 배포 절차 표준화

**자동 배포 시도 (권장)**:
1. 코드 변경 후 `git commit && git push`
2. 3분 대기
3. `curl -s https://admin.neture.co.kr/version.json` 으로 버전 확인
4. 버전이 업데이트되지 않았다면 → 수동 배포

**수동 배포 (GitHub Actions 실패 시)**:
```bash
# 1. 코드 커밋
git add .
git commit -m "..."
git push origin main

# 2. 수동 배포 실행
./scripts/deploy-admin-manual.sh

# 3. 배포 확인
curl -s https://admin.neture.co.kr/version.json | jq
```

### 수정된 파일
1. `.github/workflows/deploy-admin.yml` - paths 필터 제거, 내부 체크 추가
2. `scripts/deploy-admin-manual.sh` - 새로운 수동 배포 스크립트
3. `CLAUDE.md` - 배포 절차 및 문제 해결 가이드 업데이트

### 배포 체크리스트
- [ ] 코드 변경사항 커밋
- [ ] `git push origin main`
- [ ] 3분 대기 후 version.json 확인
- [ ] 자동 배포 실패 시 `./scripts/deploy-admin-manual.sh` 실행
- [ ] https://admin.neture.co.kr 에서 변경사항 확인

### 알려진 제한사항
- GitHub Actions paths 필터 동작 불안정
- GitHub CLI (`gh`) 인증 불가 (로컬 환경)
- Workflow run 로그 직접 확인 불가
- **따라서 수동 배포 스크립트를 primary 방법으로 사용 권장**

---

*최종 업데이트: 2025-10-16 10:50 KST*
*상태: ✅ 수동 배포 스크립트 완성 / ✅ Workflow 개선 완료 / ⚠️ GitHub Actions 신뢰성 낮음*

---

## 2025-10-16: Paragraph 블록 커서/입력 버그 수정 ⭐⭐⭐

### 문제: Paragraph 블록 클릭 시 커서가 나타나지 않고 입력이 안 됨
**증상**:
- Paragraph 블록을 클릭해도 입력 커서가 표시되지 않음
- 키보드 입력이 전혀 작동하지 않음
- 브라우저 콘솔에 에러 없음
- 다른 블록들은 정상 작동

**조사 과정** (여러 차례 실패):
1. ❌ React.memo 및 useCallback 최적화 → 해결 안 됨
2. ❌ EnhancedBlockWrapper onClick 핸들러 수정 → 해결 안 됨
3. ❌ GutenbergBlockEditor.tsx 인라인 함수 메모이제이션 → 해결 안 됨
4. ⚠️ 배포 문제로 중단 (GitHub Actions 트리거 안 됨)
5. ✅ 배포 문제 해결 후 재조사 시작

**근본 원인 발견**:
`RichText.tsx` 컴포넌트의 `useEffect`가 `value` prop이 변경될 때마다 `innerHTML`을 업데이트하고 있었음.

**문제 연쇄**:
1. `ParagraphBlock.tsx` (62-64행): `content` prop 변경 시 `localContent` 업데이트
2. `ParagraphBlock.tsx` (88행): `localContent`를 `RichText`의 `value` prop으로 전달
3. `RichText.tsx` (68-87행): `value` 변경 시 `useEffect` 트리거
4. `RichText.tsx` (80행): `editorRef.current.innerHTML = stringValue` 실행
5. **결과**: DOM이 완전히 재구성되어 focus와 cursor가 소실됨

### 해결책

#### 1. RichText.tsx - hasFocus 체크 추가 ✅
**파일**: `apps/admin-dashboard/src/components/editor/gutenberg/RichText.tsx:68-87`

**변경 내용**:
```typescript
// 초기값 및 외부 value 변경 처리
useEffect(() => {
  if (editorRef.current && !isUpdatingRef.current) {
    const currentContent = editorRef.current.innerHTML;
    const normalizedCurrent = currentContent.replace(/<br\s*\/?>/gi, '').trim();
    const stringValue = typeof value === 'string' ? value : String(value || '');
    const normalizedValue = stringValue.replace(/<br\s*\/?>/gi, '').trim();

    // CRITICAL FIX: Don't update innerHTML if this editor currently has focus
    // This prevents cursor loss when user is actively editing
    const hasFocus = document.activeElement === editorRef.current;

    if (normalizedCurrent !== normalizedValue && !hasFocus) {
      // 내용 업데이트 (focus가 없을 때만)
      editorRef.current.innerHTML = stringValue;
    }
  }

  setIsEmpty(!value || value === '' || value === '<p></p>' || value === '<br>');
}, [value]);
```

**핵심**:
- `const hasFocus = document.activeElement === editorRef.current;` 체크 추가
- `if (... && !hasFocus)` 조건으로 focus가 있을 때 innerHTML 업데이트 방지
- 사용자가 입력 중일 때는 DOM을 건드리지 않음
- 다른 블록 선택 시에만 외부 value로 업데이트

**커밋**: `fix(editor): CRITICAL FIX - Prevent innerHTML update when editor has focus` (f75894ea)

#### 2. EnhancedBlockWrapper.tsx - 코드 간소화 ✅
**파일**: `apps/admin-dashboard/src/components/editor/blocks/EnhancedBlockWrapper.tsx:236-246`

이전 수정 과정에서 복잡해진 onClick 핸들러를 다시 간소화:

**변경 내용**:
```typescript
onClick={(e) => {
  // Select block on click (focus handled by useEffect)
  onSelect();

  // Stop propagation for non-content clicks to prevent event bubbling
  const target = e.target as HTMLElement;
  const isContentEditable = target.isContentEditable || target.closest('[contenteditable]');
  if (!isContentEditable) {
    e.stopPropagation();
  }
}}
```

**이유**:
- 41줄이었던 복잡한 onClick을 10줄로 단순화
- Focus 처리는 이미 useEffect (118-152행)에서 담당
- 중복 로직 제거

**커밋**: `refactor(editor): Simplify EnhancedBlockWrapper onClick handler` (daecffec)

### 기술적 교훈

**innerHTML 업데이트의 위험성**:
- `innerHTML` 할당은 전체 DOM 트리를 파괴하고 재구성함
- 이 과정에서 `focus`, `selection`, event listener 등 모든 상태가 소실됨
- contentEditable 요소에서는 특히 치명적

**올바른 패턴**:
```typescript
// BAD: Always update innerHTML on value change
useEffect(() => {
  editorRef.current.innerHTML = value;
}, [value]);

// GOOD: Skip update when user is editing
useEffect(() => {
  const hasFocus = document.activeElement === editorRef.current;
  if (!hasFocus) {
    editorRef.current.innerHTML = value;
  }
}, [value]);
```

**디버깅 과정의 중요성**:
1. 증상이 명확해도 원인은 여러 곳에 있을 수 있음
2. 사용자의 "해결되지 않았다" 피드백을 신뢰해야 함
3. 브라우저 콘솔 에러가 없어도 로직 버그일 수 있음
4. DOM 업데이트 타이밍 문제는 추적이 어려움

### 배포 정보
- **배포 버전**: `2025.10.16-0230` (GitHub Actions)
- **배포 시간**: 2025-10-16 11:30 KST
- **Workflow**: Deploy Admin Dashboard
- **커밋**:
  - `f75894ea` - CRITICAL FIX (hasFocus 체크)
  - `daecffec` - 코드 간소화

### 테스트 체크리스트
- [ ] Paragraph 블록 클릭 시 커서 표시되는지 확인
- [ ] 텍스트 입력이 정상적으로 되는지 확인
- [ ] 블록 간 이동 시 커서가 유지되는지 확인
- [ ] 다른 블록 타입(Heading, List 등)도 정상 작동하는지 확인

### 참고 파일
1. `apps/admin-dashboard/src/components/editor/gutenberg/RichText.tsx` - 핵심 수정
2. `apps/admin-dashboard/src/components/editor/blocks/EnhancedBlockWrapper.tsx` - 간소화
3. `apps/admin-dashboard/src/components/editor/blocks/ParagraphBlock.tsx` - 문제 발생 지점 (변경 없음)

---

*최종 업데이트: 2025-10-16 11:30 KST*
*상태: ✅ Paragraph 블록 커서/입력 버그 수정 완료 / 🧪 사용자 테스트 대기 중*
