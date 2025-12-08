# Claude 작업 규칙

## 브랜치 전략 (2025-11-28 업데이트)

### 작업 브랜치
- **`develop`**: 일상 개발 & 테스트 브랜치 (자동 배포됨)
- **`main`**: 프로덕션 안정 브랜치 (검증된 코드만)
- **`feature/*`**: 기능별 개발 (선택적, develop에 머지)

### 작업 흐름
```bash
# 1. 작업 시작 (항상 develop에서)
git checkout develop
git pull origin develop

# 2. 코드 수정 및 커밋
git add .
git commit -m "feat: 새 기능"

# 3. develop 푸시 → 개발 환경 자동 배포
git push origin develop
# → 1-2분 후 https://dev-admin.neture.co.kr 자동 업데이트

# 4. 충분히 테스트 후 main 머지 → 프로덕션 배포
git checkout main
git merge develop
git push origin main
# → https://admin.neture.co.kr 프로덕션 배포 완료
```

### 작업 환경 이동 시
```bash
# 새 환경에서 작업 시작 (PC → Laptop → Cafe PC)
git checkout develop
git pull origin develop  # ← 최신 코드 동기화

# 코드 수정 후
git push origin develop  # ← 개발 환경 자동 배포

# 테스트
https://dev-admin.neture.co.kr  # ← 1-2분 후 업데이트됨
```

---

## 필수 작업 절차

### 1. 브라우저 테스트 우선
- **모든 프론트엔드 변경은 Claude가 먼저 브라우저 테스트 수행**
- Chrome DevTools MCP 또는 직접 브라우저 접근으로 Network 탭 확인
- 사용자에게 테스트 요청 금지

### 2. 배포 전 커밋/푸시 필수
- **사용자는 자동 배포된 버전만 테스트 가능**
- 변경사항은 반드시 `git commit && git push` 완료
- ⚠️ **GitHub Actions가 자주 실패함 - 수동 배포 스크립트 사용 필수**

#### 🔴 중요: Main Site 및 Admin 변경 시 수동 배포 필수
- **`apps/main-site/**` 또는 `apps/admin-dashboard/**` 파일을 변경한 경우:**
  - Git 커밋/푸시 후 **반드시 수동 배포 실행**
  - GitHub Actions 워크플로우가 실행되지 않거나 실패할 수 있음
  - 배포 없이는 변경사항이 프로덕션에 반영되지 않음

- 수동 배포 스크립트:
  - Admin: `./scripts/deploy-admin-manual.sh`
  - Main Site: `./scripts/deploy-main-site-manual.sh`

- 배포 확인:
  - Admin (개발): `curl -s https://dev-admin.neture.co.kr/version.json`
  - Admin (프로덕션): `curl -s https://admin.neture.co.kr/version.json`
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

### 4. 새 패키지 생성 시 (⚠️ 필수)
- **`packages/` 디렉토리에 새 패키지 추가 시:**
  ```bash
  # 1. 패키지 생성 후 반드시 실행
  pnpm install

  # 2. lockfile 변경 확인
  git status  # pnpm-lock.yaml 변경 확인

  # 3. lockfile 포함해서 커밋
  git add pnpm-lock.yaml
  git commit -m "chore: Update pnpm-lock.yaml for [패키지명]"
  ```
- **CI 실패 원인**: lockfile이 업데이트되지 않으면 GitHub Actions에서 `frozen-lockfile` 에러 발생
- **체크리스트**:
  - [ ] `package.json` 생성
  - [ ] `pnpm install` 실행
  - [ ] `pnpm-lock.yaml` 커밋에 포함

### 5. API 서버 작업
- SSH 접속, 파일 확인, PM2 관리 등은 직접 처리
- 복잡한 케이스만 에이전트에 작업 요청

### 6. 해결이 어려운 디버깅
- **여러 번 시도해도 해결되지 않는 버그**: 테스트 페이지를 만들어 문제를 격리
- **방법**: `/admin/test/[기능명]` 경로에 최소 재현 페이지 생성
- **목적**: 문제 발생 지점을 정확히 파악 (추측 없이)

### 7. 로컬 테스트 (선택적)

로컬 개발 서버는 **작업 환경이 고정되어 있을 때만** 유용합니다.
작업 공간이 자주 바뀌면 **develop 브랜치 자동 배포**를 사용하세요.

#### Admin Dashboard 로컬 서버
```bash
cd apps/admin-dashboard
pnpm dev
# → http://localhost:5173
```

#### Main Site 로컬 서버
```bash
cd apps/main-site
pnpm dev
# → http://localhost:5174
```

#### API 서버 로컬 실행 (선택적)
```bash
cd apps/api-server
pnpm start:dev
# → http://localhost:4000
```

**로컬 테스트의 한계:**
- ❌ 작업 환경 이동 시마다 재설정 필요
- ❌ node, pnpm 설치 필요
- ❌ 패키지 설치 시간 소요
- ✅ **권장**: develop 브랜치 푸시 → 웹 테스트

### 8. Schema Policy Compliance (⚠️ 필수)

**모든 엔티티/DB 관련 변경은 아래 문서를 반드시 준수해야 함:**
- **`docs/reference/guidelines/SCHEMA_DRIFT_PREVENTION_GUIDE.md`**

**CLAUDE(Code Agents)는 다음 원칙을 자동 적용해야 함:**

1. **엔티티 필드 추가 → 반드시 migration 먼저 생성할 것**
   - Migration 없이 엔티티 변경 금지
   - Migration-First Rule 준수

2. **DB에 없는 필드는 `select: false`가 기본값**
   ```typescript
   @Column({ select: false, nullable: true })
   previousVersion?: string;
   ```

3. **AppStore install/update 전에 schema conflict 검증 필요**
   - SchemaValidator 통과 필수
   - 500 에러 사전 차단

4. **Remote manifest 설치 시 manifest/schema 검증 의무화**
   - Remote App의 DB 변경 금지
   - CPT/ACF 확장만 허용

5. **Schema drift 위험이 있는 PR/코드 제안 금지**
   - Migration 누락 코드 거부
   - AppStore-safe 설계 원칙

**참고:** Schema Drift는 500 에러, 앱 설치 실패, 업데이트 실패의 주요 원인입니다.
위 규칙을 준수하지 않으면 프로덕션 장애가 발생할 수 있습니다.

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
- Admin (개발): `/var/www/dev-admin.neture.co.kr` (on o4o-web)
- Admin (프로덕션): `/var/www/admin.neture.co.kr` (on o4o-web)
- Main Site: `/var/www/neture.co.kr` (on o4o-web)

## 자동 배포

### Admin Dashboard 배포
- **Workflow**: `.github/workflows/deploy-admin.yml`
- **Trigger**: `develop` 또는 `main` 브랜치 푸시
- **시간**: 1-2분
- **환경 구분**:
  - `develop` 푸시 → https://dev-admin.neture.co.kr (개발 환경)
  - `main` 푸시 → https://admin.neture.co.kr (프로덕션 환경)

### API 서버 배포
- **Workflow**: `.github/workflows/deploy-api.yml`
- **Trigger**: `main` 브랜치 푸시
- **시간**: 2-3분
- **프로세스**: git pull → pnpm install → build → pm2 restart

### Main Site 배포
- **수동 배포**: `./scripts/deploy-main-site-manual.sh`
- **URL**: https://neture.co.kr

---

## 참고 자료

### 배포 스크립트
- Admin 수동 배포: `./scripts/deploy-admin-manual.sh`
- Main Site 수동 배포: `./scripts/deploy-main-site-manual.sh`
- 배포 확인:
  - Admin (개발): `curl -s https://dev-admin.neture.co.kr/version.json`
  - Admin (프로덕션): `curl -s https://admin.neture.co.kr/version.json`
  - Main Site: `curl -s https://neture.co.kr/version.json`

### 주요 문서
- 블록 개발 가이드: `BLOCKS_DEVELOPMENT.md`
- 배포 가이드: `DEPLOYMENT.md`

---

*최종 업데이트: 2025-12-08*
