# neture.co.kr 프론트엔드 개발 문서 통합본



---

## 📄 yaksa-portal-task-02-auth-ui.md


# 🧾 Task 02: 로그인 및 회원가입 UI 구현

## 🎯 목적
neture.co.kr 사용자(B2C, 약사, 관리자 포함)의 공통 로그인/회원가입 화면을 구현하고, 기본 인증 UI 흐름을 구성한다.

---

## ✅ 작업 위치

- 로그인 페이지: `Coding/o4o-platform/services/main-site/src/pages/Login.tsx`
- 회원가입 페이지: `Coding/o4o-platform/services/main-site/src/pages/Register.tsx`
- 상태 관리 파일: `Coding/o4o-platform/services/main-site/src/store/authStore.ts` (초기화만 가능)
- 보호 라우트: `Coding/o4o-platform/services/main-site/src/components/ProtectedRoute.tsx` (다음 Task로 분리 가능)

---

## 📋 구현 요구 사항

### 1. 로그인 화면 (`/login`)
- 이메일 / 비밀번호 입력
- 로그인 버튼
- 로그인 실패 메시지
- 라우팅 후 리디렉션은 현재 dummy 처리

### 2. 회원가입 화면 (`/register`)
- 이메일, 비밀번호, 이름
- 사용자 유형 선택 (일반 / 약사)
- 약사 선택 시 인증절차 또는 라벨 추가
- 약관 동의 체크박스

### 3. 공통 UI 요소
- Tailwind 기반 반응형 폼 UI
- 가운데 정렬된 카드형 로그인 박스
- `text-sm`, `bg-white`, `shadow-xl`, `rounded-xl` 등 활용

---

## 💡 인증 로직 처리
- 실제 로그인 요청은 아직 구현하지 않음
- 로그인 버튼 클릭 시 상태 저장 또는 토큰 mock 저장 가능
- 추후 `/auth.neture.co.kr` 연동 예정

---

## 📎 참고 문서

- `Coding/o4o-platform/docs/services/main-site/wireframes/02-auth-ui-wireframe.md`
- `Coding/o4o-platform/docs/services/main-site/wireframes/09-ui-theme-system.md`


---

## 📄 yaksa-site-auth-structure.md


# 🔐 neture.co.kr 통합 인증 구조 설계 (초안)

## 🎯 목적
neture.co.kr 전반의 서비스들이 하나의 로그인으로 접근 가능하도록 OAuth2 기반 통합 인증 시스템을 설계한다.

---

## ✅ 인증 흐름 요약

1. 모든 서비스는 `auth.neture.co.kr`로 인증 요청
2. 사용자 로그인 → JWT 토큰 발급
3. 토큰은 각 프론트엔드에서 저장(localStorage 등)
4. 토큰 기반으로 서비스 간 이동 시 인증 유지

---

## 👥 사용자 역할 기준 리디렉션

| 역할 | 리디렉션 위치 |
|------|----------------|
| 일반 사용자 | `/shop` |
| 기업 사용자 (약사) | `/yaksa-shop` |
| 관리자 | `admin.neture.co.kr/...` (경로별 필터링 적용)

---

## 🧱 기술 구성 제안

- 인증 서버 도메인: `auth.neture.co.kr`
- 인증 방식: OAuth2 + JWT (NextAuth.js, Auth0, Keycloak 등 고려)
- 역할 판단: 로그인 응답 내 포함
- 세션 유지: refresh token 또는 access token 저장

---

## 🛡️ 보안 고려 사항

- HTTPS 적용 필수
- 토큰 만료/재발급 처리
- 관리자 로그인은 별도 MFA(다단계 인증) 고려 가능


---

## 📄 deployment-guide.md

# o4o-platform 환경설정 및 배포 흐름 정리

작성일: 2025-05-25  
작성 목적: 로컬 → GitHub → 서버로 이어지는 배포 프로세스 정비 및 설정 통합

---

## ✅ 전체 배포 흐름 요약

```plaintext
[로컬 개발 환경: Cursor 또는 VSCode]
       ⬇ git push
[GitHub 저장소]
       ⬇ git pull
[서버 배포 환경 (Ubuntu)]
```

- React 앱은 정적 빌드 후 `dist/` 디렉토리를 Nginx가 직접 서빙
- PM2 및 serve 미사용 (ESM 충돌 회피)
- 수동 스크립트(`deploy.sh`)로 서버 배포 관리

---

## 🧱 디렉토리 구조 제안

```
o4o-platform/
├── .vscode/                 # VS Code 설정
├── .cursor/                 # Cursor 설정
├── .github/                 # (향후용) GitHub Actions 설정
├── deploy/
│   ├── deploy.sh            # 서버 배포 자동화 스크립트
│   └── env.template         # 배포 환경 변수 템플릿
├── Coding/o4o-platform/services/
│   └── main-site/     # React 프로젝트
│       ├── .env
│       └── dist/
├── README.md
└── .gitignore
```

---

## 🛠️ 각종 설정 파일 예시

### .vscode/settings.json

```json
{
  "editor.formatOnSave": true,
  "files.exclude": {
    "node_modules": true,
    "dist": true
  },
  "typescript.tsdk": "node_modules/typescript/lib"
}
```

---

### .cursor/.cursorrules

```json
{
  "folders": ["Coding/o4o-platform/docs/Coding/o4o-platform/services/main-site"],
  "ignore": ["node_modules", "dist", ".git"],
  "defaultLanguage": "typescript"
}
```

---

### .gitignore

```
node_modules/
dist/
.env
.vscode/
.cursor/
```

---

### deploy/deploy.sh

```bash
#!/bin/bash
echo "🔁 Git Pull 중..."
git pull origin main || exit 1

echo "📦 빌드 중..."
cd Coding/o4o-platform/docs/Coding/o4o-platform/services/main-site || exit 1
npm install
npm run build

echo "🔐 퍼미션 설정 중..."
sudo chown -R www-data:www-data dist/
sudo chmod -R 755 dist/

echo "✅ 배포 완료!"
```

> 실행 전 권한 부여 필요: `chmod +x deploy.sh`

---

## 🔁 배포 시 작업 절차 요약

### 로컬에서:

```bash
git add .
git commit -m "✨ 작업 요약"
git push origin main
```

### 서버에서:

```bash
cd ~/o4o-platform
./deploy/deploy.sh
```

---

## 🧪 테스트

```bash
curl -I https://neture.co.kr
```

---

## 🔮 확장 가능성

| 기능 | 설명 | 현재 적용 |
|------|------|-----------|
| GitHub Actions 배포 자동화 | SSH 및 빌드 자동화 | ❌ |
| systemd 백그라운드 실행 | Node 앱 유지용 | ❌ (정적 서빙으로 대체됨) |
| .env.production 분리 | 환경별 구성 | ⏳ 준비 가능 |

---

## ✅ 마무리

이 구조는 작은 프로젝트부터 팀 기반 확장까지 안정적인 배포 흐름을 지원합니다.  
필요에 따라 GitHub Actions 또는 systemd 기반 자동화로 발전 가능합니다.

---

## 📄 o4o-web-server-handoff.md

# o4o-web-server 프론트엔드 개발 전달 문서

## 🎯 목적
이 문서는 현재까지 완료된 관리자 백엔드 기능 기반으로, 이제 사용자/판매자 중심의 프론트엔드 UI 개발을 `o4o-web-server`에서 이어가기 위한 안내 및 인수 문서입니다.  
프론트엔드는 실질적으로 다양한 사용자(소비자, 판매자, 참여자 등)가 접속하고 상호작용하는 핵심 인터페이스입니다.

---

## ✅ 현재까지의 작업 상황

### 1. 백엔드 (`o4o-api-server`) / 관리자 UI
- 관리자 상품/주문/계정 관리 기능: ✅ 완료
- 관리자 인증 및 역할 기반 보호: ✅ 적용
- Medusa Admin API 연동: ✅ 완료
- 경로: `Coding/o4o-platform/services/ecommerce/admin`

---

## ⏭️ 다음 작업: `o4o-web-server`에서 프론트엔드 화면 구축

### 2. 사용자/판매자 중심 프론트 UI (개발 위치: `o4o-web-server`)
- 프레임워크: React (or Next.js 등 CSR 기반)
- API 연동: Medusa Store API (`/store/*`) + 백엔드 인증 포함

---

## 👥 주요 사용자 그룹

| 사용자 유형 | 설명 | 인증 수단 |
|-------------|------|------------|
| 고객 (user) | 상품 탐색, 장바구니, 결제, 주문 확인 | customer JWT |
| 판매자 (seller) | 상품 등록, 주문 처리, 정산 보기 등 | seller JWT |
| 관리자 (admin) | 이미 별도 admin UI에서 구현 완료 | admin JWT (별도 서버)

---

## 🛠️ 구현이 필요한 프론트 UI 예시

| 경로 | 설명 |
|------|------|
| `/shop` | 상품 목록 |
| `/product/:id` | 상품 상세 |
| `/cart`, `/checkout` | 장바구니 및 결제 |
| `/orders`, `/orders/:id` | 주문 목록 및 상세 |
| `/login`, `/register`, `/profile` | 사용자 인증 및 정보 수정 |
| `/seller/login`, `/seller/dashboard`, `/seller/products` | 판매자 전용 대시보드 |

---

## 🔐 인증 정책 요약

| 역할 | 토큰 | 저장소 |
|------|------|--------|
| 사용자 | customer JWT | localStorage (`jwt`) |
| 판매자 | seller JWT | localStorage (`seller_jwt`) |
| 관리자 | admin JWT | localStorage (`admin_jwt`) - 이미 별도 구현됨

---

## 📌 현재 구현된 사항 (참고용)

- 관리자 기능은 전체 구현 완료 상태
- 프론트엔드는 기본 구조만 존재하거나 아직 작업되지 않음
- Medusa API 연동은 준비 완료

---

## 📎 문서 기반 개발 흐름
- 문서 위치: `Coding/o4o-platform/docs/ui-tasks/`
- 각 기능별 Task 문서를 기반으로 구현 → 완료 시 Task-Result 문서로 정리됨

---

## ✅ 다음 시작점 제안 (o4o-web-server에서 Cursor에 요청)

> “Task-01: 사용자 상품 목록 `/shop`을 Medusa API와 연동해서 카드형 UI로 만들어줘. 로그인 없이 접근 가능하게 하고, Tailwind를 사용해 스타일도 적용해줘.”

---

이 문서를 o4o-web-server 작업 공간에 전달하고, 이후 UI 기반 프론트엔드 흐름을 이어가면 됩니다.

---

## 📄 yaksa-deploy-handoff.md


# 🔀 neture.co.kr 작업 이관 요약 문서 (프론트/배포 테스트용)

## 📌 목적
이 문서는 neture.co.kr 프로젝트의 프론트 화면 구성 및 배포 테스트를 진행하기 위해, 다른 채팅방 또는 프로젝트 환경에서 이어서 파악할 수 있도록 요약한 상태 문서입니다.

---

## ✅ 현재까지 완료된 작업

### 1. 메인 포털 구성
- `/`: 서비스 진입 카드 UI (쇼핑몰, 펀딩, 포럼 등)
- 역할별 접근 UI 설계 완료

### 2. 인증 흐름
- `/login`, `/register` UI 구현 Task 완료
- 소비자: 자동 승인 → 홈 리디렉션
- 약사: 면허번호 입력 + 전화번호 (수동 승인 필요)

### 3. 보호 라우트 및 역할 분기
- `<ProtectedRoute />`, `<YaksaProtectedRoute />`, `<RoleProtectedRoute />` 구현
- 약사 인증 전 상태는 일반 사용자로 간주

### 4. 약사 전용 화면
- `/yaksa/dashboard`
- `/yaksa/notifications`
- `/yaksa/profile`

### 5. 관리자 승인 화면
- `/admin/yaksa-approvals`: superadmin 전용 약사 승인 페이지

---

## 🔧 현재 테스트 목적

- neture.co.kr 접속 시 `502 Bad Gateway` 오류 해결
- React 앱 빌드/serve 상태 점검 및 Nginx 연결 확인
- 실제 URL로 진입 가능한 화면 구성 여부 확인

---

## 📄 관련 Task 문서 요약

| 문서명 | 설명 |
|--------|------|
| `yaksa-portal-task-00-start.md` | 전체 Portal UI 시작 Task |
| `yaksa-portal-task-11-router-setup.md` | 전체 라우터 구조 연결 |
| `yaksa-deploy-task-01-react-build-serve.md` | 502 오류 해결 위한 빌드 및 serve 실행 요청 |

---

## ⏭️ 다음 예상 작업 흐름

- Nginx 설정 확인 (Task 12로 분리 예정)
- 실제 화면 접근 테스트 체크리스트 생성
- 화면 단위 에러 처리 / 경고 메시지 구성


---

## 📄 yaksa-deploy-task-01-react-build-serve.md


# 🛠️ Task: neture.co.kr React 앱 빌드 및 정적 실행 확인

## 🎯 목적
502 Bad Gateway 문제를 해결하기 위해, React 앱이 빌드되어 있고 정적 파일이 serve 또는 pm2로 실행되고 있는지 확인하고, 실행되지 않았다면 serve로 재실행한다.

---

## ✅ 단계별 실행 요청

### 1. React 앱 빌드
```
yarn install
yarn build
```
또는
```
npm install
npm run build
```

> `build/` 디렉터리가 생성되어야 합니다.

---

### 2. 정적 서버 실행 (선택 1)

#### serve 사용
```
npx serve -s build -l 3000
```

또는

#### PM2로 실행
```
pm2 start npx --name yaksa-web -- serve -s build -l 3000
```

> pm2가 없을 경우:
```
npm install -g pm2
```

---

### 3. 확인
- 실행 후 `curl localhost:3000` 또는 `pm2 logs yaksa-web` 으로 정상 응답 확인
- Nginx 설정이 `proxy_pass http://localhost:3000;`으로 되어 있는지 별도 점검

---

## 📎 서버 점검 명령어 (수동 점검 시)

```bash
pm2 list
pm2 logs yaksa-web
ls -alh build/
cat /etc/nginx/sites-available/default
```

---

이 작업이 완료되면 neture.co.kr는 외부에서 정상 접속 가능해야 합니다.


---

## 📄 yaksa-deploy-task-02-permanent-serve.md


# 🛠️ Task 02: neture.co.kr 정적 앱을 안정적으로 실행되도록 설정

## 🎯 목적
neture.co.kr를 언제 어디서 접속하더라도 포털 화면이 항상 표시되도록, React 앱을 정적 빌드 후 pm2를 통해 백그라운드에서 안정적으로 실행하고, 서버 재시작 시 자동 복구되도록 설정한다.

---

## ✅ 단계별 실행 절차

### 1. 정적 빌드
```bash
yarn install
yarn build
```
또는
```bash
npm install
npm run build
```

### 2. `serve`로 실행 테스트
```bash
npx serve -s build -l 3000
```

---

## ✅ 3. pm2 등록 및 영구 실행 설정

```bash
pm2 start npx --name yaksa-web -- serve -s build -l 3000
pm2 save
pm2 startup
```

> `pm2 startup` 명령이 출력하는 스크립트를 복사해서 sudo로 실행해야 합니다.  
예: `sudo env PATH=$PATH:/home/ubuntu/.nvm/versions/node/... pm2 startup systemd -u ubuntu --hp /home/ubuntu`

---

## ✅ 4. Nginx 설정 확인

`/etc/nginx/sites-available/default` 또는 `nginx.conf`에 다음이 포함되어야 합니다:

```nginx
location / {
    proxy_pass http://localhost:3000;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection 'upgrade';
    proxy_set_header Host $host;
    proxy_cache_bypass $http_upgrade;
}
```

Nginx 설정 적용:

```bash
sudo nginx -t
sudo systemctl reload nginx
```

---

## 🧪 확인 체크리스트

- 브라우저에서 https://neture.co.kr 새로고침 시 계속 포털 화면 유지
- PM2 프로세스가 살아 있는지 `pm2 list`로 확인
- 서버 재부팅 후에도 자동 실행되는지 `reboot` 후 재확인

---

이 작업이 완료되면 neture.co.kr는 항상 안정적으로 사용자에게 화면을 제공할 수 있습니다.


---

## 📄 00-folder-structure.md

# 📁 O4O Platform 개발 폴더 기준 구조

> 이 문서는 ChatGPT, Cursor IDE, GitHub Actions 등 자동화 도구가 사용하는 **표준 코드 디렉터리 기준**입니다.  
> 모든 개발 코드는 반드시 아래 구조에 따라 생성/편집되어야 하며, 이외 위치는 **잘못된 작업**으로 간주됩니다.

---

## 🗂️ 루트 기준: Coding/

```
Coding/
├── o4o-platform/                  # O4O 프로젝트 메인
│   ├── docs/                      # 전체 문서 폴더
│   ├── o4o-api-server/            # Medusa 기반 백엔드
│   ├── o4o-web-server/            # React 기반 프론트엔드
│   └── .env, docker, readme 등
├── ai-Coding/o4o-platform/services/                  # AI 기반 백엔드
├── common-core/                  # 공통 유틸리티 및 공용 모듈
├── dev-reference/                # 재사용 가능한 문서와 예제
├── rpa/                          # 자동화 스크립트 관련 코드
```

---

## 📌 개발 시 주의사항

- `o4o-web-server/` 안에만 React 코드 생성
- `o4o-api-server/` 외에는 Medusa 관련 코드 생성 금지
- `docs/`는 문서 전용 공간으로 코드 생성 금지
- Cursor 사용 시 `.cursorrules` 설정으로 작업 폴더 고정 권장

---

## ✅ 참조 예시

- ✅ `o4o-web-server/pages/Home.tsx` → 올바른 위치
- ❌ `docs/api/Home.tsx` → 잘못된 위치 (문서 폴더에 코드 생성 금지)


---

## 📄 01-project-overview.md

# 🧭 O4O Platform 프로젝트 개요

이 문서는 O4O Platform 전체 프로젝트의 개요, 목적, 구성요소, 기술 스택을 요약합니다.

## 🌐 주요 도메인
- neture.co.kr: 메인 포털 SPA
- admin.neture.co.kr: 관리자용 인터페이스
- store.neture.co.kr: 사용자 쇼핑몰/서비스 포털

## 🧱 기술 스택
- 백엔드: Medusa (Node.js)
- 프론트엔드: React + Tailwind
- CMS: Strapi
- 인증: JWT 기반 (약사 인증/자동 승인 등)
- 인프라: AWS Lightsail, Nginx, PM2


---

## 📄 02-folder-naming-guidelines.md

# 📁 폴더 및 파일명 네이밍 규칙

O4O Platform에서는 다음과 같은 규칙을 따릅니다:

## 📦 폴더 네이밍
- 소문자 + 하이픈(`-`) 사용: 예) `o4o-api-server`
- 기능 단위로 분리: `products/`, `orders/`

## 📝 파일 네이밍
- 컴포넌트: PascalCase (`ProductCard.tsx`)
- API/유틸리티: camelCase (`fetchProducts.ts`)
- 문서: kebab-case + `.md`


---

## 📄 03-dev-flow-guide.md

# 🚀 개발 흐름 가이드

## 🧪 로컬 개발
- React 앱: `npm run dev` (`o4o-web-server/`)
- Medusa API: `medusa develop` (`o4o-api-server/`)

## 🧱 빌드 & 배포
- 프론트: `npm run build` → serve 또는 nginx
- 백엔드: PM2 + Nginx 구성

## 🧠 GPT/Cursor 지시 흐름
1. docs 기준 확인
2. 경로 지시 포함하여 요청
3. 결과 확인 및 통합 문서 반영


---

## 📄 04-cursor-integration.md

# 🧠 Cursor IDE 연동 기준

## `.cursorrules` 설정 예시
```json
{
  "defaultWorkspace": "Coding/o4o-platform/o4o-web-server",
  "rules": [
    {
      "pattern": "pages/.*\.tsx",
      "purpose": "UI 페이지 컴포넌트"
    }
  ]
}
```

## 활용 팁
- workspace 기준 엄수
- GPT 응답 시 항상 파일 위치 명시


---

## 📄 05-taskmanager-connection.md

# 🤖 AI TaskManager 및 MCP 연동

## 사용 목적
- Claude/ChatGPT를 Task 기반 자동화에 연동
- TaskMaster로 명시적 지시 생성

## 연동 흐름
1. `mcp.json` 또는 Task 템플릿 작성
2. GPT에게 문서/코드/흐름 설명 요청
3. context7 등으로 확장 가능


---

## 📄 06-service-map.md

# 🗺️ O4O Platform 서비스 맵

## yaksa-site 주요 서비스
- 약사 인증 + 회원 가입 흐름
- B2C 쇼핑몰: 소셜 로그인 + 자동 승인
- B2B 쇼핑몰: 약사 대상
- 포럼, 사이니지, 강좌 등 확장형 구조

## 연동 예시
- `store.neture.co.kr`: 제품 구매 및 관리
- `admin.neture.co.kr`: 관리자 기능 통합


---

## 📄 o4o-platform-analysis.md

# 🧠 O4O Platform 개발 문서 분석 요약

> 이 문서는 `o4o-platform-full.md` 통합 문서를 기반으로 주요 내용, 반복 패턴, 위험 요소, 개선 제안을 정리한 분석 문서입니다.

---

## ✅ 1. 기술 구성 요약

- **백엔드:** Medusa 기반 (`o4o-api-server/`)
- **프론트엔드:** React 기반 SPA (`o4o-web-server/`)
- **CMS/문서 시스템:** Strapi, Markdown 기반 개발문서 (`docs/`)
- **인증 흐름:** JWT 기반 인증 + 역할 기반 접근 제어
- **배포:** AWS Lightsail + Nginx/PM2

---

## 📦 2. 문서 조직 구조

- `o4o-api-server/`: API 서버 세팅, 인증, 운영 가이드, CLI, MCP 연동 등 체계적으로 정리됨
- `ui-tasks/`: 화면 단위 개발 과제 및 실제 결과 문서 병행 작성됨
- `yaksa-site/`: 플랫폼 구조, 사용자 흐름, B2C/B2B 인증 흐름 문서화

---

## ♻️ 3. 반복되는 구조/패턴

- `task-xx-name.md` + `task-xx-name-result.md` 구조 반복 (기획/결과 분리)
- 각 API 기능마다 대응되는 UI 작업 문서 존재 (설계-결과 연계)
- 인증/보호 흐름이 다수 문서에서 유사하게 반복됨

---

## ⚠️ 4. 위험요소 및 개선 제안

- 문서 간 참조 관계 부족 → 링크 또는 상호 참조 체계 필요
- 일부 문서 제목과 내용이 일치하지 않음 → `task-*` 명명 통일 제안
- `yaksa-site` 관련 문서는 구조 설명이 상세하지만 다소 중복됨
- README 성격의 개요 문서 부족 → 사용자/관리자/개발자용 3종 분리 권장

---

## 🛠️ 5. 다음 단계 제안

- `task-*.md` 결과물 기반 UI 스크린샷 자동 포함화
- 인증 흐름 관련 문서 통합 정리 (`auth-overview.md` 등)
- 전체 구조도와 연계된 워크플로우 시각화 문서 보완


---

## 📄 o4o-platform-foundation-pack.md

# 📚 O4O Platform 기준 문서 통합본


---

## 📄 01-project-overview.md

<!-- From: foundation/01-project-overview.md -->

# 🧭 O4O Platform 프로젝트 개요

이 문서는 O4O Platform 전체 프로젝트의 개요, 목적, 구성요소, 기술 스택을 요약합니다.

## 🌐 주요 도메인
- neture.co.kr: 메인 포털 SPA
- admin.neture.co.kr: 관리자용 인터페이스
- store.neture.co.kr: 사용자 쇼핑몰/서비스 포털

## 🧱 기술 스택
- 백엔드: Medusa (Node.js)
- 프론트엔드: React + Tailwind
- CMS: Strapi
- 인증: JWT 기반 (약사 인증/자동 승인 등)
- 인프라: AWS Lightsail, Nginx, PM2


---

## 📄 02-folder-naming-guidelines.md

<!-- From: foundation/02-folder-naming-guidelines.md -->

# 📁 폴더 및 파일명 네이밍 규칙

O4O Platform에서는 다음과 같은 규칙을 따릅니다:

## 📦 폴더 네이밍
- 소문자 + 하이픈(`-`) 사용: 예) `o4o-api-server`
- 기능 단위로 분리: `products/`, `orders/`

## 📝 파일 네이밍
- 컴포넌트: PascalCase (`ProductCard.tsx`)
- API/유틸리티: camelCase (`fetchProducts.ts`)
- 문서: kebab-case + `.md`


---

## 📄 03-dev-flow-guide.md

<!-- From: foundation/03-dev-flow-guide.md -->

# 🚀 개발 흐름 가이드

## 🧪 로컬 개발
- React 앱: `npm run dev` (`o4o-web-server/`)
- Medusa API: `medusa develop` (`o4o-api-server/`)

## 🧱 빌드 & 배포
- 프론트: `npm run build` → serve 또는 nginx
- 백엔드: PM2 + Nginx 구성

## 🧠 GPT/Cursor 지시 흐름
1. docs 기준 확인
2. 경로 지시 포함하여 요청
3. 결과 확인 및 통합 문서 반영


---

## 📄 04-cursor-integration.md

<!-- From: foundation/04-cursor-integration.md -->

# 🧠 Cursor IDE 연동 기준

## `.cursorrules` 설정 예시
```json
{
  "defaultWorkspace": "Coding/o4o-platform/o4o-web-server",
  "rules": [
    {
      "pattern": "pages/.*\.tsx",
      "purpose": "UI 페이지 컴포넌트"
    }
  ]
}
```

## 활용 팁
- workspace 기준 엄수
- GPT 응답 시 항상 파일 위치 명시


---

## 📄 05-taskmanager-connection.md

<!-- From: foundation/05-taskmanager-connection.md -->

# 🤖 AI TaskManager 및 MCP 연동

## 사용 목적
- Claude/ChatGPT를 Task 기반 자동화에 연동
- TaskMaster로 명시적 지시 생성

## 연동 흐름
1. `mcp.json` 또는 Task 템플릿 작성
2. GPT에게 문서/코드/흐름 설명 요청
3. context7 등으로 확장 가능


---

## 📄 06-service-map.md

<!-- From: foundation/06-service-map.md -->

# 🗺️ O4O Platform 서비스 맵

## yaksa-site 주요 서비스
- 약사 인증 + 회원 가입 흐름
- B2C 쇼핑몰: 소셜 로그인 + 자동 승인
- B2B 쇼핑몰: 약사 대상
- 포럼, 사이니지, 강좌 등 확장형 구조

## 연동 예시
- `store.neture.co.kr`: 제품 구매 및 관리
- `admin.neture.co.kr`: 관리자 기능 통합



---

## 📄 toc.md

# 📂 O4O Platform 문서 폴더 트리 (docs)

```
o4o-api-server/
  - 01-project-overview.md
  - 02-server-setup.md
  - 03-admin-user-setup.md
  - 04-auth-module-config.md
  - 05-env-and-config-reference.md
  - 06-api-task-guide.md
  - 07-troubleshooting-log.md
  - 08-medusa-cli-reference.md
  - 09-mcp-and-context-config.md
  - 10-deployment-checklist.md
  ui-tasks/
    - task-01-product-store-ui-result.md
    - task-01-product-store-ui.md
    - task-02-product-list-detail-store-result.md
    - task-02-product-list-detail-store.md
    - task-03-user-product-cart-result.md
    - task-03-user-product-cart.md
    - task-04-user-checkout-orders-result.md
    - task-04-user-checkout-orders.md
    - task-05-seller-registration-product-result.md
    - task-05-seller-registration-product.md
```


---

## 📄 task-cursor-setup.md

# Cursor 작업 요청 - `.cursorrules` 적용

## 📌 목적

이 문서는 Cursor에게 `.cursor/.cursorrules` 설정을 적용한 상태에서  
`Coding/o4o-platform/docs/Coding/o4o-platform/services/main-site` 디렉토리를 중심으로 자동화 작업을 진행하도록 요청하는 지침입니다.

---

## 1️⃣ 설정 구조 확인

- 설정 파일 위치: `.cursor/.cursorrules`
- 설정 내용 요약:

```json
{
  "folders": [
    "Coding/o4o-platform/docs/Coding/o4o-platform/services/main-site"
  ],
  "ignore": [
    "node_modules",
    "dist",
    ".git",
    ".vscode",
    ".cursor",
    "*.log",
    "*.local",
    ".env"
  ],
  "defaultLanguage": "typescript"
}
```

---

## 2️⃣ Cursor에게 요청할 작업

Cursor에게 다음과 같이 요청합니다:

> 위 `.cursorrules` 설정을 기반으로 `Coding/o4o-platform/docs/Coding/o4o-platform/services/main-site` 디렉토리에 대해 코딩 지원을 활성화해 주세요.  
> 이 설정은 타입스크립트 기반 React 앱입니다. 이후 요청부터는 이 디렉토리 안의 작업이 기본 기준입니다.

---

## 3️⃣ 향후 확장 방향

> 추후 다음 디렉토리 작업 시 `.cursorrules`의 `"folders"` 항목에 다음을 추가할 계획입니다:
> - `Coding/o4o-platform/services/api-server`
> - `Coding/o4o-platform/services/crowdfunding`
> - `Coding/o4o-platform/services/ecommerce`
> - 등등

---

## 📄 yaksa-cursor-task-devops.md

# Yaksa Main Site - DevOps 환경 구성 작업 요청 (경로 구조 반영)

## 📌 목적

이 문서는 `o4o-platform` 프로젝트의 `Coding/o4o-platform/docs/Coding/o4o-platform/services/main-site/` 디렉토리에 대한 개발 및 배포 작업을 체계화하기 위한  
DevOps 관련 보조 파일 생성을 Cursor에게 요청하기 위한 문서입니다.

---

## ✅ 작업 요청 항목 및 생성 경로

### 1. `.gitignore`

> 목적: GitHub 업로드 시 제외할 파일 및 폴더 지정

**생성 위치:**
- ✅ `o4o-platform/.gitignore` → 전체 프로젝트 공통 제외 규칙
- ✅ `Coding/o4o-platform/docs/Coding/o4o-platform/services/main-site/.gitignore` → 개별 서비스 전용 규칙

**예시 내용 (서비스 전용):**

```
node_modules/
dist/
.env
.env.local
.DS_Store
*.log
.vscode/
.cursor/
```

---

### 2. `.env.example`

> 목적: 실제 `.env` 파일의 템플릿 제공

**생성 위치:**  
- ✅ `Coding/o4o-platform/docs/Coding/o4o-platform/services/main-site/.env.example`

**예시 내용:**

```
VITE_API_BASE_URL=https://api.neture.co.kr
VITE_SITE_NAME=neture.co.kr
```

---

### 3. `README.md`

> 목적: 해당 서비스의 개발, 실행, 배포 지침 요약

**생성 위치:**  
- ✅ `Coding/o4o-platform/docs/Coding/o4o-platform/services/main-site/README.md`

**예시 항목:**

- 프로젝트 소개
- 설치 및 실행 방법
- .env 구성 안내
- 빌드 방법 및 배포 방식

---

### 4. `deploy.sh`

> 목적: GitHub → 서버 자동 배포용 SSH 스크립트

**생성 위치:**  
- ✅ `o4o-platform/scripts/deploy-yaksa.sh` (또는 `deploy.sh`)

**예시 내용:**

```bash
#!/bin/bash

ssh ubuntu@YOUR_SERVER_IP << 'ENDSSH'
  cd ~/o4o-platform
  git pull origin main
  cd Coding/o4o-platform/docs/Coding/o4o-platform/services/main-site
  npm install
  npm run build
  sudo systemctl reload nginx
ENDSSH
```

---

## 📝 Cursor에게 요청할 문구 예시

> 다음 파일들을 다음 경로에 생성해 주세요:
>
> - `.gitignore` → 루트(`o4o-platform/`)와 `Coding/o4o-platform/docs/Coding/o4o-platform/services/main-site/` 모두
> - `.env.example`, `README.md` → `Coding/o4o-platform/docs/Coding/o4o-platform/services/main-site/`
> - `deploy.sh` → `o4o-platform/scripts/deploy-yaksa.sh` 로 생성  
>
> 각 파일은 실제 배포 시 수정 가능한 형태로, 위 예시를 참고하여 생성해 주세요.

---

## 📄 yaksa-cursor-task.md

# Yaksa Site - Cursor 작업 요청 안내

## 📌 목적

이 문서는 Cursor IDE에 `o4o-platform/.cursor/.cursorrules` 설정을 기반으로  
`Coding/o4o-platform/docs/Coding/o4o-platform/services/main-site` 폴더를 중심으로 개발을 진행하기 위한 지시 요청서입니다.

---

## 1️⃣ 전제 설정

- `.cursorrules` 위치: `o4o-platform/.cursor/.cursorrules`
- 적용 폴더: `Coding/o4o-platform/docs/Coding/o4o-platform/services/main-site`
- 타입스크립트 기반 React SPA 구조

---

## 2️⃣ 요청할 작업 예시

> 현재 설정에 따라 다음과 같은 작업 요청이 가능해야 합니다:

### ✅ 예시 요청

- `Coding/o4o-platform/services/main-site/src/pages/Home.tsx` 생성 및 기본 라우팅 구성
- `vite.config.ts`, `tailwind.config.js`, `index.html` 관련 코드 점검
- dist 빌드 결과를 nginx에서 서빙 가능한지 확인하는 정적 export 플로우 설정

---

## 3️⃣ 향후 확장 예정 대상

- `Coding/o4o-platform/services/api-server` 백엔드 구성
- `Coding/o4o-platform/services/portal-site`, `Coding/o4o-platform/services/ecommerce`, `Coding/o4o-platform/services/crowdfunding` 등 모듈 추가 시 `.cursorrules` `"folders"` 확장

---

## 📝 최종 요청 문구 예시

```
`.cursor/.cursorrules` 설정에 따라 `Coding/o4o-platform/docs/Coding/o4o-platform/services/main-site` 디렉토리를 중심으로 코딩 지원을 시작해 주세요.
```

---

## 📄 yaksa-portal-task-00-start.md


# 🧾 Task 00: neture.co.kr 메인 포털 UI 구현 시작

## 🎯 목적
neture.co.kr 포털의 메인화면을 시작으로 전체 사용자 진입 흐름과 서비스 분기를 위한 UI 개발을 개시한다.

> ⚠️ 이 Task 문서는 전체 구조를 설명하지만, **우선은 `/Coding/o4o-platform/services/main-site/src/pages/Home.tsx`에 메인 포털 UI 구성부터 구현**하는 데 집중해주세요.

---

## ✅ 작업 위치 및 구조

### 📁 작업 경로
`Coding/o4o-platform/o4o-web-server/`

### 🧱 개발 환경
- React + TailwindCSS 기반 SPA
- 반응형 (모바일/PC 대응)
- 컴포넌트: `Coding/o4o-platform/services/main-site/src/components/`, 페이지: `Coding/o4o-platform/services/main-site/src/pages/`

---

## 📦 메인 포털 UI 요구사항 (`/`)

- 상단(Header):
  - 로고
  - 로그인 버튼
  - 관리자 진입 버튼

- 메인 블록 (카드 형태 진입):
  - 쇼핑몰 (일반) → `/shop`
  - 쇼핑몰 (약사) → `/yaksa-shop`
  - 포럼 → `/forum`
  - 펀딩 → `/funding`
  - 디지털사이니지 → `/signage`

- 하단(Footer):
  - 회사정보, 약관, 개인정보처리방침

- 반응형 Tailwind 레이아웃 사용
  - PC: 3단 그리드
  - 모바일: 세로 스택

---

## 🧩 컴포넌트 (함께 만들면 좋음)

- `<ServiceCard />`: 각 서비스 진입용 카드
- `<AppHeader />`: 로고, 로그인 버튼 포함
- `<ThemeToggle />`: 다크모드 토글 버튼 (옵션)

---

## 🔐 인증 관련 (지금은 제외)

- 로그인 버튼은 현재는 라우터 이동용 dummy로 처리
- 추후 Task-02에서 통합 인증 연동 구현 예정

---

## 🗂️ 참고 문서

- `Coding/o4o-platform/docs/services/main-site/wireframes/01-home-responsive-wireframe.md`
- `Coding/o4o-platform/docs/services/main-site/wireframes/07-common-ui-and-menu-structure.md`

---

## ⏭️ 이후 연결 Task

- Task-01: 로그인/회원가입 UI
- Task-02: ProtectedRoute 및 역할 분기 구조
- Task-03: 인증 서버 연동 (`auth.neture.co.kr`)


---

## 📄 yaksa-portal-task-01-main-ui.md


# 🧾 Task 01: neture.co.kr 메인 포털 초기 UI 구현

## 🎯 목적
neture.co.kr의 첫 화면을 구성하여 사용자 유형별로 서비스로 진입할 수 있도록 포털 UI를 구현한다. (반응형, 로그인 진입 포함)

---

## ✅ 요구 기능

### 상단(Header)
- 로고 (텍스트 로고 or 자리표시)
- 로그인 버튼
- 관리자 진입 버튼

### 메인 영역 (서비스 진입 카드)
- 일반 사용자 → "쇼핑몰 (일반)" → `/shop`
- 약사(기업 사용자) → "쇼핑몰 (약사용)", "크라우드 펀딩", "포럼" 등
- 디지털사이니지 → 별도 카드
- 각 카드 클릭 시 해당 서비스 서브도메인으로 이동

### 하단
- 회사 정보 (약사닷컴), 이용약관, 개인정보처리방침 링크

---

## 📱 반응형 요구 사항

- TailwindCSS 사용
- PC 기준: 그리드형 카드 UI
- 모바일 기준: 수직 스택형 UI로 전환
- 카드 내부에 아이콘(임시) 및 설명 포함

---

## 🧩 구현 방식

- React 기반 SPA 페이지
- 파일 위치: `Coding/o4o-platform/services/main-site/src/pages/Home.tsx`
- 컴포넌트 분리 가능: `components/ServiceCard.tsx`
- 서비스 목록은 배열로 관리 (확장성 고려)

---

## 🔐 인증/로그인 (추후 작업)

- 로그인 버튼은 현재 라우터 이동만
- 추후 `auth.neture.co.kr` 연동 예정

---

## 📎 기타

- 로그인된 사용자 유형에 따라 홈 진입 시 자동 redirect 가능 (추후 처리)


---

## 📄 yaksa-portal-task-03-protected-route.md


# 🧾 Task 03: ProtectedRoute 및 역할 기반 라우트 가드 구현

## 🎯 목적
neture.co.kr에서 인증된 사용자만 특정 페이지에 접근하거나, 역할에 따라 접근 제어를 적용할 수 있도록 보호 라우트 구조를 구현한다.

---

## ✅ 작업 위치

- 인증 보호 컴포넌트: `Coding/o4o-platform/services/main-site/src/components/ProtectedRoute.tsx`
- 역할 기반 보호 컴포넌트: `Coding/o4o-platform/services/main-site/src/components/RoleProtectedRoute.tsx`
- 인증 상태 관리: `Coding/o4o-platform/services/main-site/src/store/authStore.ts`

---

## 🔐 기본 기능 구현

### 1. `ProtectedRoute`
- 로그인 여부에 따라 children 또는 `/login`으로 리디렉션
- localStorage 또는 authStore 기준으로 인증 여부 판단

### 2. `RoleProtectedRoute`
- `roles` prop으로 허용된 역할 배열 지정
- 로그인 + 허용 역할 포함 → 접근 허용
- 그렇지 않으면 `/403` 또는 fallback 메시지 출력

---

## ✅ 사용 예시

```tsx
<ProtectedRoute>
  <MyPage />
</ProtectedRoute>

<RoleProtectedRoute roles={['admin', 'superadmin']}>
  <AdminDashboard />
</RoleProtectedRoute>
```

---

## 📋 상태 구조 예시 (authStore)

```ts
{
  token: string;
  role: 'b2c' | 'yaksa' | 'admin' | 'superadmin';
  isAuthenticated: boolean;
}
```

---

## 💡 참고 사항

- 로그인 후 상태는 이미 mock 또는 토큰 저장으로 처리 가능
- 라우트 보호는 SPA 구조 기준 (React Router `Outlet`, `useLocation()` 활용)

---

## 📎 참고 문서

- `Coding/o4o-platform/docs/services/main-site/wireframes/08-role-permissions.md`
- `Coding/o4o-platform/docs/services/main-site/wireframes/07-common-ui-and-menu-structure.md`


---

## 📄 yaksa-portal-task-04-login-redirect.md


# 🧾 Task 04: 로그인 후 리디렉션 및 메뉴 상태 동기화 구현

## 🎯 목적
로그인 성공 후 사용자의 역할에 따라 자동으로 적절한 페이지로 이동시키고, 상단 네비게이션 등 UI에 로그인/로그아웃 상태를 반영한다.

---

## ✅ 작업 위치

- 상태 관리: `Coding/o4o-platform/services/main-site/src/store/authStore.ts`
- 리디렉션 처리: `Coding/o4o-platform/services/main-site/src/pages/Login.tsx` 또는 전역 `App.tsx`
- UI 연동:
  - 헤더: `Coding/o4o-platform/services/main-site/src/components/AppHeader.tsx`
  - 메뉴 항목: 로그인 상태 및 역할에 따라 동적 표시

---

## 📦 기능 상세

### 1. 로그인 후 리디렉션
| 역할 | 리디렉션 경로 |
|------|----------------|
| b2c | `/shop` |
| yaksa | `/yaksa-shop` |
| admin / superadmin | `/admin/main` 또는 지정된 관리자 URL |

- 로그인 성공 시 역할(role)에 따라 자동 이동
- 상태에서 `role` 값 판단

### 2. 로그아웃 기능
- 로그아웃 버튼 클릭 시:
  - 상태 초기화 (`authStore`)
  - localStorage 초기화
  - `/login`으로 이동

### 3. 네비게이션 연동
- 로그인 상태에 따라 메뉴 변경:
  - [로그인] → [내 계정], [로그아웃]
  - 역할에 따라 관리자 진입 메뉴 보임 여부 조절

---

## 🔐 상태 구조 예시

```ts
{
  token: string;
  isAuthenticated: boolean;
  role: "b2c" | "yaksa" | "admin" | "superadmin";
  email: string;
}
```

---

## 📎 참고 문서

- `yaksa-portal-task-02-auth-ui.md`
- `yaksa-portal-task-03-protected-route.md`
- `Coding/o4o-platform/docs/services/main-site/wireframes/07-common-ui-and-menu-structure.md`


---

## 📄 yaksa-portal-task-05-register-flow.md


# 🧾 Task 05: 회원가입 흐름 구현 (약사 인증 포함)

## 🎯 목적
neture.co.kr의 사용자 유형별로 회원가입 흐름을 분기하여, 소비자(B2C)와 약사(B2B)의 등록 절차를 구분한다. 약사는 면허번호 기반 인증 과정을 포함한다.

---

## ✅ 사용자 유형별 가입 흐름

### 👤 일반 사용자 (b2c)
- 방식: 이메일/비밀번호 또는 소셜 로그인
- 승인: 자동 승인 (가입 즉시 활성화)
- 가입 후 리디렉션: `/` (neture.co.kr 홈)

### 🧑‍⚕️ 약사 사용자 (yaksa)
- 방식: 이메일/비밀번호 + **면허번호 입력**
- 확인: 초기에는 수동 전화 확인 (번호 필드 포함)
- 승인: 관리자가 직접 승인 (가입 직후 상태는 `pending`)
- 가입 후 리디렉션: 승인 대기 안내 or 로그인 페이지

---

## 📋 UI 구성 항목 (`/register`)
- 이름, 이메일, 비밀번호
- 사용자 유형 선택 (`b2c`, `yaksa`)
- 약사 선택 시:
  - 면허번호 입력 필드
  - 전화번호 입력 필드
- 이용약관/개인정보 수집 동의 체크박스
- 등록 버튼 (`submit`)

---

## 🔐 상태/역할 관리

- `authStore.ts`에서 `role`, `status` 필드 추가
- 가입 성공 시 role에 따라 다른 흐름 적용
- 약사는 `status = 'pending'` → 이후 관리자가 승인

---

## 🧩 추가 연동 고려 (추후 Task)

- 관리자 승인 대시보드
- 전화번호 인증 (나중에 도입 예정)
- 약사 DB 연동을 통한 실시간 면허번호 검증 (추후)

---

## 📎 참고 문서

- `02-auth-ui-wireframe.md`
- `08-role-permissions.md`


---

## 📄 yaksa-portal-task-06-yaksa-protection.md


# 🧾 Task 06: 승인 대기 상태 처리 및 약사용 페이지 접근 제한

## 🎯 목적
neture.co.kr에서 약사 회원이 가입 후 승인 대기 상태일 때는 일반 사용자로 로그인할 수 있도록 허용하지만, 약사용 페이지에 접근 시 경고 메시지를 보여주고 이동을 제한한다.

---

## ✅ 처리 규칙

### 1. 승인 대기 중 사용자
- 상태: `role = 'b2c'`, `yaksaStatus = 'pending'` (authStore 기준)
- 로그인은 가능
- 약사용 페이지 접근은 제한 (`yaksa` 권한 필요)

---

## 📋 구현 항목

### ✅ 약사용 보호 라우트 구성
- `YaksaProtectedRoute.tsx` 생성
- 조건:
  - `role !== 'yaksa'` → 경고 메시지 표시
  - "약사 인증이 필요합니다. 홈으로 이동합니다."  
  - 3초 후 이전 페이지 or `/` 로 이동

### ✅ 사용 위치 예시

```tsx
<YaksaProtectedRoute>
  <YaksaShop />
</YaksaProtectedRoute>
```

---

## 💡 UX 설계
- 경고 메시지 출력용 컴포넌트 분리 (`<AccessDenied />`)
- 리디렉션 타이머: `setTimeout(() => navigate(-1), 3000);` or `navigate("/")`
- Tailwind 기반 메시지 스타일링

---

## 📦 상태 구조 예시 (authStore.ts)

```ts
{
  role: 'b2c' | 'yaksa' | 'admin',
  yaksaStatus: 'pending' | 'approved' | null
}
```

---

## 📎 참고 문서

- `yaksa-portal-task-03-protected-route.md`
- `yaksa-portal-task-05-register-flow.md`
- `Coding/o4o-platform/docs/services/main-site/wireframes/08-role-permissions.md`


---

## 📄 yaksa-portal-task-07-admin-approval.md


# 🧾 Task 07: 관리자 승인 대시보드 (약사 인증 처리)

## 🎯 목적
neture.co.kr에서 가입한 약사 사용자 중 '승인 대기' 상태(`yaksaStatus = 'pending'`)인 계정을 관리자가 승인하거나 거절할 수 있는 관리 UI를 구현한다.

---

## ✅ 작업 경로

- 페이지 파일: `Coding/o4o-platform/services/main-site/src/pages/admin/YaksaApprovals.tsx`
- 보호 라우트: `<RoleProtectedRoute roles={['superadmin']}>`
- 상태 관리/연동: mock 데이터 기반 또는 `authStore` 확장

---

## 📋 화면 구성

### 1. 대시보드 테이블

| 항목 | 설명 |
|------|------|
| 이름 | 사용자 이름 |
| 이메일 | 가입 시 입력된 이메일 |
| 면허번호 | 가입 시 입력된 약사 면허번호 |
| 전화번호 | 연락용 |
| 상태 | `pending` |
| 액션 | [승인] [거절] 버튼

### 2. 승인 버튼 클릭 시
- 사용자 상태를 `yaksaStatus = 'approved'`, `role = 'yaksa'`로 변경
- 메시지: "승인 완료되었습니다"

### 3. 거절 시
- 사용자 제거 또는 `yaksaStatus = 'rejected'`
- 선택적으로 사유 입력 (추후 확장)

---

## 🧱 Tailwind 기반 UI
- 카드 또는 테이블 형태
- 버튼 색상: 승인 `bg-green-500`, 거절 `bg-red-500`
- 상태 뱃지: `text-yellow-600`, `text-green-600`

---

## 🔐 보호 및 조건

- 이 페이지는 `superadmin` 전용
- 인증된 관리자만 접근 가능 (`RoleProtectedRoute` 적용)

---

## 📎 참고 문서

- `yaksa-portal-task-05-register-flow.md`
- `yaksa-portal-task-06-yaksa-protection.md`
- `Coding/o4o-platform/docs/services/main-site/wireframes/08-role-permissions.md`


---

## 📄 yaksa-portal-task-08-dashboard.md


# 🧾 Task 08: 약사 계정 전용 대시보드 (`/yaksa/dashboard`)

## 🎯 목적
약사 로그인 사용자가 자신의 활동을 요약 확인할 수 있는 전용 대시보드를 구성한다.

## ✅ 경로 및 보호
- 페이지: `Coding/o4o-platform/services/main-site/src/pages/yaksa/Dashboard.tsx`
- 보호: `<YaksaProtectedRoute />`

## 🧩 표시 요소
- 최근 주문 3건
- 참여 중인 펀딩 3건
- 최신 알림 5개
- 내 계정으로 이동 버튼

## 🧱 스타일
- 카드형 요약 UI
- Tailwind 기반 반응형 레이아웃


---

## 📄 yaksa-portal-task-09-notifications.md


# 🧾 Task 09: 약사 전용 알림 센터 (`/yaksa/notifications`)

## 🎯 목적
약사 사용자가 수신한 알림을 목록으로 관리하고, 상태를 확인할 수 있도록 구성한다.

## ✅ 경로 및 보호
- 페이지: `Coding/o4o-platform/services/main-site/src/pages/yaksa/Notifications.tsx`
- 보호: `<YaksaProtectedRoute />`

## 🧩 기능
- 알림 목록 (최신순)
- 읽음/안읽음 구분
- 클릭 시 관련 페이지 이동
- "모두 읽음 처리" 버튼

## 🧱 상태 관리
- `yaksaNotificationStore.ts` 또는 공통 store 확장


---

## 📄 yaksa-portal-task-10-profile.md


# 🧾 Task 10: 약사 내 정보(프로필) 페이지 (`/yaksa/profile`)

## 🎯 목적
약사 사용자가 자신의 개인정보를 확인하고 수정할 수 있도록 UI를 제공한다.

## ✅ 경로 및 보호
- 페이지: `Coding/o4o-platform/services/main-site/src/pages/yaksa/Profile.tsx`
- 보호: `<YaksaProtectedRoute />`

## 🧩 정보 항목
- 이름, 이메일, 전화번호, 면허번호
- 비밀번호 변경
- 로그아웃 버튼

## 🧱 스타일
- 가운데 정렬 폼 카드
- Tailwind 기반 폼 UI


---

## 📄 yaksa-portal-task-11-router-setup.md


# 🧾 Task 11: neture.co.kr 전체 라우터 구성 및 연결

## 🎯 목적
지금까지 정의된 페이지 컴포넌트를 실제 라우팅 시스템에 연결하여, 사용자가 URL로 접근할 수 있도록 라우터를 설정한다.

---

## ✅ 라우터 설정 파일
- 위치: `src/routes/index.tsx` 또는 `App.tsx` 내 React Router 설정

---

## 🔌 연결할 경로 및 보호 구조

| 경로 | 컴포넌트 | 보호 방식 |
|------|-----------|------------|
| `/` | `<Home />` | 공개 |
| `/login` | `<Login />` | 공개 |
| `/register` | `<Register />` | 공개 |
| `/shop` | `<Shop />` | `<ProtectedRoute />` |
| `/yaksa-shop` | `<YaksaShop />` | `<YaksaProtectedRoute />` |
| `/yaksa/dashboard` | `<Dashboard />` | `<YaksaProtectedRoute />` |
| `/yaksa/notifications` | `<Notifications />` | `<YaksaProtectedRoute />` |
| `/yaksa/profile` | `<Profile />` | `<YaksaProtectedRoute />` |
| `/admin/yaksa-approvals` | `<YaksaApprovals />` | `<RoleProtectedRoute roles={['superadmin']}>` |

---

## 🧱 구현 가이드

### 1. Router 구조 예시 (React Router v6)

```tsx
<Routes>
  <Route path="/" element={<Home />} />
  <Route path="/login" element={<Login />} />
  <Route path="/register" element={<Register />} />

  <Route path="/shop" element={
    <ProtectedRoute><Shop /></ProtectedRoute>
  } />
  <Route path="/yaksa-shop" element={
    <YaksaProtectedRoute><YaksaShop /></YaksaProtectedRoute>
  } />
  <Route path="/yaksa/dashboard" element={
    <YaksaProtectedRoute><Dashboard /></YaksaProtectedRoute>
  } />
  <Route path="/yaksa/notifications" element={
    <YaksaProtectedRoute><Notifications /></YaksaProtectedRoute>
  } />
  <Route path="/yaksa/profile" element={
    <YaksaProtectedRoute><Profile /></YaksaProtectedRoute>
  } />
  <Route path="/admin/yaksa-approvals" element={
    <RoleProtectedRoute roles={['superadmin']}>
      <YaksaApprovals />
    </RoleProtectedRoute>
  } />
</Routes>
```

---

## 📎 참고 문서

- `yaksa-portal-task-00-start.md`
- `yaksa-portal-task-03-protected-route.md`
- `yaksa-portal-task-06-yaksa-protection.md`
- `yaksa-portal-task-07-admin-approval.md`


---

## 📄 yaksa-site-dev-scope.md

# Yaksa Site 개발 기준 및 역할 구분

## 📌 목적

본 문서는 `o4o-platform` 프로젝트 내에서 `neture.co.kr`와 관련된 프론트엔드 개발 범위와  
각 서비스 디렉토리의 역할, 서브도메인 구조를 명확히 정의하기 위한 문서입니다.

---

## 1️⃣ 서비스 디렉토리별 역할 정의

| 디렉토리 | 설명 | 서브도메인 예시 |
|----------|------|------------------|
| `main-site` | neture.co.kr 메인 포털 (홈, 소개, 접속자 진입) | `neture.co.kr` |
| `ecommerce`       | 전자상거래(쇼핑몰) 전용 모듈                | `store.neture.co.kr` |
| `api-server`      | API 백엔드 서버 (데이터, 인증 등)          | `api.neture.co.kr` |
| `crowdfunding`    | 크라우드 펀딩 전용 프론트/기획             | (예정) |
| `forum`           | 포럼/커뮤니티 기능                         | (예정) |
| `signage`         | 디지털 사이니지 관련 모듈                  | (예정) |
| `shared`          | 공통 타입, 유틸리티, 설정 등               | (없음) |

---

## 2️⃣ 현재 개발 기준

- 모든 초기 개발 작업은 `Coding/o4o-platform/docs/Coding/o4o-platform/services/main-site`를 기준으로 시작
- `.cursor/.cursorrules`도 해당 폴더만 포함 중
- 이후 `ecommerce`, `api-server`로 단계 확장 예정

---

## 3️⃣ 서브도메인 구조 기준

각 서비스는 다음과 같은 서브도메인을 사용할 계획입니다:

- 메인 포털: **https://neture.co.kr**
- 쇼핑몰: **https://store.neture.co.kr**
- API 서버: **https://api.neture.co.kr**
- 그 외 포럼, 사이니지, 펀딩 등은 필요 시 하위 도메인 추가

---

## ✅ 정리

> 현재는 `neture.co.kr` 메인 포털 중심의 프론트 개발이 우선이며,  
> 이후 각 서비스 모듈(ecommerce, api-server 등)은 단계적으로 연계됩니다.

---

## 📄 yaksa-web-task-01-convert-app-to-home.md


# 🧾 yaksa-web-task-01-convert-app-to-home.md

## 🎯 목적
현재 neture.co.kr의 Vite + React 프로젝트 구조는 기본 JavaScript 템플릿 상태입니다. 이 구조를 TypeScript 기반으로 전환하고, 포털 홈 UI(Home.tsx)를 진입점으로 설정합니다.

---

## ✅ 변경 요청 내용

### 1. 파일 구조 변경 (JS → TS)

| 기존 | 변경 후 |
|------|----------|
| `src/App.jsx` | `src/App.tsx` |
| `src/main.jsx` | `src/main.tsx` |
| `vite.config.js` | `vite.config.ts` |

---

### 2. 신규 파일 생성

```bash
Coding/o4o-platform/services/main-site/src/pages/Home.tsx
```

내용 예시:
```tsx
export default function Home() {
  return (
    <main className="p-8">
      <h1 className="text-2xl font-bold">neture.co.kr 포털에 오신 것을 환영합니다</h1>
    </main>
  );
}
```

---

### 3. TypeScript 지원 설정

- `tsconfig.json` 생성
- `vite.config.ts`에 타입 설정 포함
- 다음 패키지 설치:

```bash
npm install -D typescript @types/react @types/react-dom @types/react-router-dom
```

---

### 4. 진입점 교체

`App.tsx`에서 `Home.tsx`를 기본으로 렌더링:

```tsx
import Home from "./pages/Home";

export default function App() {
  return <Home />;
}
```

---

### 5. 테스트 및 빌드

```bash
npm run build
pm2 restart yaksa-web
```

---

## 🔁 결과 기대

- TypeScript 기반의 Vite + React 구조로 전환 완료
- 포털 홈(Home.tsx)이 neture.co.kr에 정상 표시
- 향후 모든 페이지를 `.tsx`로 개발 가능



---

## 📄 yaksa-site-infra-overview.md


# 🧾 neture.co.kr 백엔드 및 프론트엔드 호스팅 구조 요약

## ✅ 1. 서비스 개요

- neture.co.kr는 React 기반 프론트엔드로 개발되었습니다.
- 백엔드는 Medusa.js 기반 커머스 API 서버 (`o4o-api-server`)입니다.
- 모든 서비스는 AWS Lightsail에서 운영되고 있습니다.

---

## ✅ 2. 프론트엔드 실행 구조

neture.co.kr 프론트는 다음 중 하나의 방식으로 실행 중일 수 있습니다:

### [A] 개발 모드 (React Dev Server)
- 명령어: `npm run dev` 또는 `yarn dev`
- 기본 포트: `localhost:5173` 또는 `localhost:3000`
- 용도: 개발 중 핫 리로딩용

### [B] 정적 빌드 + Nginx 배포
- 명령어: `yarn build` → `dist/` 또는 `build/` 생성
- Nginx에서 해당 디렉터리를 정적으로 서빙
- Nginx 설정 위치: `/etc/nginx/sites-available/default`

### [C] PM2 프로세스 매니저 사용
- 명령어 예시: `pm2 start yarn --name yaksa-web -- start`
- 또는: `serve -s build` → 정적 파일 서비스
- 장점: 부팅 시 자동 시작, 관리 편리

---

## ✅ 3. SSH 접근 가능 여부

- SSH 접속은 현재 가능한 상태입니다.
- 점검 가능 항목:
  - `nginx.conf` 또는 `/etc/nginx/sites-available/default`
  - `pm2 list`, `pm2 logs yaksa-web`
  - `build/` 또는 `dist/` 디렉터리 존재 여부
  - `.env`, `medusa-config.js` 등 설정 확인

---

## ✅ 4. React 앱 점검 체크리스트

### 요청할 수 있는 확인 명령어
- `pm2 list`
- `pm2 logs yaksa-web`
- `ls -alh build/`
- `cat /etc/nginx/sites-available/default`

---

## ✅ 5. 추가 제공 가능 항목

- PM2 실행 복구 명령어
- `serve` 또는 `start` 방식별 실행 템플릿
- `.env` 템플릿
- nginx 설정 예시 (`proxy_pass`, `root`, `index`)
- 점검 자동화 bash 스크립트 (`check-react-deploy.sh`)

---

## 🔄 참고: 502 Bad Gateway 대처 요약

| 원인 | 조치 |
|------|------|
| React 앱 미실행 | PM2 또는 수동 실행 확인 |
| 포트 mismatch | Nginx proxy_pass 포트 확인 |
| build 폴더 없음 | `npm run build`로 재생성 |
| Nginx root 디렉토리 설정 오류 | `/var/www/html`, `/home/ubuntu/project/build` 등 확인 |

---

이 문서를 개발자 또는 서버 운영자에게 전달하시면 정확한 점검을 도울 수 있습니다.


---

## 📄 yaksa-site-portal-overview.md


# 📌 neture.co.kr 메인 포털 개요

## 🎯 목적
neture.co.kr는 약사를 위한 다양한 디지털 서비스를 통합한 포털입니다.  
B2C/B2B 사용자와 관리자가 각자의 목적에 따라 접근할 수 있도록 중앙 진입점 역할을 합니다.

---

## 🧱 주요 구성 서비스

| 서비스 | 설명 | 도메인/경로 |
|--------|------|-------------|
| B2C 쇼핑몰 | 일반 사용자용 전자상거래 | `store.neture.co.kr/shop` |
| B2B 쇼핑몰 | 약사용 전자상거래 | `store.neture.co.kr/yaksa-shop` |
| 크라우드펀딩 | 약사 중심 펀딩 플랫폼 | (예: `fund.neture.co.kr`) |
| 약사 포럼 | B2B 이용자 커뮤니티 | (예: `forum.neture.co.kr`) |
| 디지털사이니지 | 매장 디스플레이 콘텐츠 관리 | (예: `signage.neture.co.kr`) |
| 관리자 패널 | 서비스 운영 관리자용 | `admin.neture.co.kr/...` |

---

## 👥 사용자 유형 및 진입 흐름

- **일반 사용자 (소비자)**: `/shop` → B2C 서비스
- **기업 사용자 (약사)**: `/yaksa-shop`, 포럼, 펀딩 등 → B2B 서비스
- **관리자**: `admin.neture.co.kr` 서브경로로 진입, 역할 필터링

---

## 🧩 기술 스택 및 구조

- Frontend: React SPA + TailwindCSS + 반응형 UI
- 모바일: 웹앱 형태로 지원 (카메라, 위치정보 확장 고려)
- 인증: 단일 로그인 기반 OAuth2 / JWT (추후 결정)
- 디자인: MCP/Figma 연동 예정

---


---

## 📄 yaksa-site-structure.md


# 🗂️ yaksa-site 프로젝트 전체 구조 정리 (`o4o-platform/` 기준)

본 문서는 neture.co.kr의 실제 프론트엔드 및 서브 서비스 개발을 위한 전체 폴더 구조 및 서비스 단위 개발 가이드를 제공합니다.  
현재 `o4o-platform/` 루트 아래에 있는 `o4o-web-server/`는 혼동을 피하기 위해 **yaksa-site 메인(프론트포털)**로 간주합니다.

---

## ✅ 전체 폴더 구조 (`o4o-platform/` 기준)

```
o4o-platform/
├── yaksa-site/                  # 기존 o4o-web-server/ → neture.co.kr 메인 포털
│   ├── scripts/                 # 배포 스크립트 등
│   ├── Coding/o4o-platform/services/
│   │   ├── ecommerce/
│   │   │   ├── admin/           # 관리자용 화면 (향후 admin.neture.co.kr)
│   │   │   ├── api/             # API 핸들러 또는 proxy layer
│   │   │   └── web/             # 메인 커머스 프론트(B2C, B2B)
│   │   └── crowdfunding/        # 크라우드펀딩 프론트엔드
│   ├── forum/                   # 포럼 서비스
│   ├── lms/                     # 강의 시스템
│   ├── signage/                 # 디지털사이니지 디스플레이 앱
│   ├── shared/                 # 공통 유틸, 컴포넌트
│   ├── README.md
│   └── workspace.json
└── ...
```

---

## 🧱 yaksa-site (메인 포털) 구조

```
yaksa-site/
├── public/
├── src/
│   ├── components/          # 공통 UI 컴포넌트
│   ├── pages/               # 홈, 로그인, 서비스 진입 페이지 등
│   ├── routes/              # React Router
│   ├── store/               # Zustand 등 전역 상태
│   ├── index.css            # Tailwind 지시문
│   ├── main.tsx
│   └── app.tsx
├── tailwind.config.js
├── tsconfig.json
├── vite.config.ts
└── package.json
```

---

## 🛒 Coding/o4o-platform/services/ecommerce/web 구조

```
Coding/o4o-platform/services/ecommerce/web/
├── public/
├── src/
│   ├── components/         # 상품카드, 장바구니 등
│   ├── pages/              # Shop, ProductDetail, Cart, Checkout 등
│   ├── store/              # cartStore.ts, authStore.ts 등
│   ├── routes/
│   ├── app.tsx
│   └── main.tsx
├── tailwind.config.js
├── tsconfig.json
└── vite.config.ts
```

---

## 💳 Coding/o4o-platform/services/crowdfunding 구조

```
Coding/o4o-platform/services/crowdfunding/
├── src/
│   ├── components/
│   ├── pages/
│   ├── app.tsx
│   └── main.tsx
├── tsconfig.json
└── vite.config.ts
```

---

## 📚 Coding/o4o-platform/services/lms 구조

```
Coding/o4o-platform/services/lms/
├── src/
│   ├── pages/
│   └── player.tsx
└── ...
```

---

## 📡 Coding/o4o-platform/services/signage 구조

```
Coding/o4o-platform/services/signage/
├── public/
├── src/
│   └── screens/
└── ...
```

---

## 🧩 확장 관리 전략

- 모든 서비스는 독립 개발 → 독립 배포 가능 구조 유지
- Tailwind, Zustand 등 통일된 기술 스택 사용
- 각 서비스 폴더 내부에 `README.md`, `vite.config.ts`, `tsconfig.json` 별도 유지

---

이 문서를 기반으로 서비스 간 경계와 폴더 정리를 명확히 할 수 있습니다.  
필요하시면 각 서비스 구조별 `task 문서`도 별도 생성 가능합니다.


---

## 📄 yaksa-home-redesign-task.md

# 🛠️ 작업 요청: neture.co.kr 초기화면(Home.tsx) 리디자인

## 📅 요청일자
2025-05-28

## 📁 저장 위치
`o4o-platform/Coding/o4o-platform/docs/Coding/o4o-platform/services/main-site/src/page/Home.tsx

## 🎯 작업 목적
neture.co.kr 초기화면(`Home.tsx`)을 미려한 전자상거래 플랫폼 스타일로 리디자인합니다. 현재는 단순한 3개 버튼 UI로 되어 있으나, 브랜드 첫 인상으로써 전문성과 신뢰감을 주는 디자인이 필요합니다.

## 🧩 디자인 요구사항

### ✅ 리디자인 목표
- TailwindCSS 기반 현대적인 스타일
- 히어로 섹션 + 서비스 카드 + 콜 투 액션 구조
- 전자상거래 서비스 첫 화면에 어울리는 전문성
- 반응형(모바일/데스크탑 모두 고려)
- 다크 모드 지원 유지

### 📐 레이아웃 구성
1. **Hero Section**
   - 플랫폼의 핵심 메시지를 전달
   - 약사와 소비자를 연결하는 전문 이미지
2. **Service Features (카드 3개)**
   - 약사 등록 / 제품 등록 / 커뮤니티
   - 기존 `ServiceCard` 컴포넌트 활용 가능
3. **Call to Action**
   - 로그인, 회원가입, 둘러보기 등 버튼
   - 홈 하단에 위치

## 🗂️ 컴포넌트 활용
- 기존의 `ServiceCard.tsx`는 유지 가능
- 아이콘은 `lucide-react` 그대로 사용
- 추가적인 시각적 요소는 Tailwind utility로 구성

## 🛠️ 구현 방식
- 기존 `Home.tsx`를 덮어쓰는 방식
- 별도 상태 관리, API 연동 없이 정적 콘텐츠 위주로 구성

## 📄 작업 파일 대상
`Coding/o4o-platform/services/main-site/src/pages/Home.tsx`

## 🧑‍💻 작업자 참고
- 추후에는 CMS 연동(Tiptap 등)을 통해 이 영역을 유동적으로 관리할 예정입니다.
- 현재는 하드코딩 방식으로 정적인 구조만 우선 구현합니다.



---

## 📄 01-home-responsive-wireframe.md


# 🧭 Wireframe 01: neture.co.kr 메인 포털 반응형 UI 설계

## 🎯 목적
neture.co.kr의 첫 화면(포털)을 반응형으로 설계하여 사용자 유형별로 서비스 진입이 가능한 최신형 레이아웃을 구성한다.

---

## ✅ 페이지 목적

- 다양한 서비스로 연결되는 중앙 게이트웨이
- 사용자 유형별 분리 진입
- 로그인 및 관리자 진입 포함
- 모바일과 데스크탑 모두 대응

---

## 🧱 전체 레이아웃 구성

### 1. 헤더 (고정)
- 로고 (텍스트 또는 로고 아이콘)
- 로그인 버튼 (우측 상단)
- 관리자 진입 버튼 (더보기 메뉴 또는 우측 상단)

### 2. 메인 그리드 영역
- **그리드 구성 (PC 기준):**
  - 3컬럼 카드 UI (Tailwind `grid-cols-3`, `gap-6`)
- **카드 항목 예시:**
  - 쇼핑몰 (일반) → `/shop`
  - 쇼핑몰 (약사용) → `/yaksa-shop`
  - 크라우드펀딩 → `fund.neture.co.kr`
  - 약사 포럼 → `forum.neture.co.kr`
  - 디지털사이니지 → `signage.neture.co.kr`

### 3. 모바일 대응
- Tailwind 기준: `grid-cols-1`, 카드 위→아래 배치
- 카드 항목은 더 크게, 설명은 요약
- 햄버거 메뉴 또는 드롭다운으로 메뉴 접근

---

## 💡 시각적 요소 설계 가이드

- **카드 스타일**
  - soft shadow (`shadow-xl`, `rounded-2xl`)
  - 배경 blur 또는 미묘한 그라디언트
  - hover 시 scale up 애니메이션

- **폰트**
  - 제목: `text-xl` 또는 `text-2xl`, 간결하고 큼직하게
  - 설명: `text-sm` 또는 `text-base`, 부드럽고 간략히

- **컬러 테마**
  - 초기: Light 테마 기준
  - 추후 다크모드 지원 위해 Tailwind `dark:` 구조 설계

---

## 📎 Tailwind 예시 코드 블록 (카드)

```jsx
<div className="grid grid-cols-1 md:grid-cols-3 gap-6">
  <div className="p-6 rounded-2xl shadow-xl bg-white hover:scale-105 transition-all cursor-pointer">
    <h3 className="text-xl font-semibold mb-2">쇼핑몰 (일반)</h3>
    <p className="text-sm text-gray-600">Yaksa 전용 소비자 쇼핑몰입니다.</p>
  </div>
</div>
```

---

## 📌 확장 시 고려 사항

- 로그인 후 역할에 따라 자동 redirect 또는 카드 강조
- 관리자/약사 등 사용자 구분 스타일 처리
- Figma MCP 설계와 연동 가능



---

## 📄 02-auth-ui-wireframe.md


# 🔐 Wireframe 02: neture.co.kr 인증 UI 흐름 설계

## 🎯 목적
neture.co.kr의 다양한 사용자(B2C, B2B, 관리자)가 하나의 로그인 시스템을 통해 적절한 서비스로 진입할 수 있도록 인증 UI 및 흐름을 설계한다.

---

## ✅ 주요 경로 및 구성

### 1. 로그인 페이지 (`/login`)
- 이메일 / 비밀번호 입력
- 로그인 버튼
- 사용자 유형 자동 감지 또는 선택 드롭다운
- 로그인 실패 메시지
- "계정이 없으신가요?" → 회원가입 이동

### 2. 회원가입 페이지 (`/register`)
- 기본 항목: 이름, 이메일, 비밀번호, 사용자 유형 선택(B2C, 약사)
- 약사용 계정일 경우 인증 절차 추가 예정
- 이용약관 체크박스
- 등록 완료 후 자동 로그인 → 적절한 홈 리디렉션

### 3. 로그인 후 흐름

| 역할 | 리디렉션 경로 |
|------|----------------|
| 일반 사용자 | `/shop` |
| 약사 사용자 | `/yaksa-shop` |
| 관리자 | `admin.neture.co.kr/main` 또는 역할별로 분기됨 |

---

## 🔐 인증 방식

- OAuth2 + JWT 기반 예상 (예: `auth.neture.co.kr`)
- 로그인 시 localStorage에 token 저장
- 로그인 상태에 따라 상단 네비게이션 구성 변화

---

## 🧱 UI 컴포넌트 구성

- `LoginForm.tsx`
- `RegisterForm.tsx`
- `ProtectedRoute.tsx`
- 로그인 상태 context 또는 Zustand 활용 (`authStore.ts`)

---

## 💡 시각 구성 가이드 (Tailwind 기준)

- 양쪽 가운데 정렬된 카드형 UI (`max-w-md`, `rounded-xl`, `shadow-xl`)
- 다크/라이트 테마 대응 (`dark:bg-gray-900`)
- 비밀번호 입력: 보기 전환 버튼 포함
- 에러 메시지: `text-red-500`, success 메시지: `text-green-600`

---

## 📎 인증 흐름 요약도 (MVP 기준)

```
[로그인 페이지]
     ↓ 성공
[토큰 발급 → 상태 저장]
     ↓
[역할 판별 → 경로 리디렉션]
```


---

## 📄 03-mobile-entry-flow.md


# 📱 Wireframe 03: neture.co.kr 모바일 진입 흐름 설계

## 🎯 목적
neture.co.kr를 모바일 웹앱 기반으로 사용할 때 사용자(B2C, B2B, 관리자)가 효율적으로 진입하고 사용할 수 있도록 모바일 흐름을 설계한다.

---

## ✅ 초기 진입 시나리오

### 1. 도메인 접속
- `/` → 모바일 레이아웃으로 자동 전환 (Tailwind 기준 `sm:` 이하)
- 최상단에 "서비스 선택 카드" 목록

### 2. 사용자 유형 선택
- [ ] 일반 사용자
- [ ] 약사(기업 사용자)
- [ ] 관리자

> 선택 시 localStorage 또는 상태에 유형 저장 (선택적)

### 3. 로그인 유도 또는 자동 로그인
- 로그인되어 있으면 → 바로 리디렉션
- 로그인 안 되어 있으면 → `/login`으로 이동

---

## 📱 모바일 전용 구성 요소

### A. 카드형 진입
- 세로 스택 카드 UI
- 각 카드 아이콘 + 제목 + 설명
- 클릭 시 해당 도메인/서브서비스로 이동

### B. 하단 고정 메뉴 (선택)
- 홈 / 알림 / 계정 / 설정 (모바일앱과 유사한 하단 탭)

### C. 슬라이드 진입 또는 스플래시
- 약사닷컴 로고 간단히 보여주는 진입 스플래시 (2초)
- 첫 사용자에게만 보여주기 (localStorage flag)

---

## 🧱 기술 구성

- Tailwind + `sm:` 기준 반응형 처리
- 모바일 friendly 버튼 (`min-h-[48px]`, `text-base`, `px-6`)
- 상단 고정 요소는 `sticky top-0 z-50`

---

## 💡 기타 확장 고려

- PWA 등록 대응 (`Add to Homescreen`)
- 카메라/위치 사용 권한 안내
- QR 스캔 기능 연동 (약국 전용 기능에 활용 가능)


---

## 📄 04-funding-ui-wireframe.md


# 💡 Wireframe 04: 크라우드펀딩 서비스 UI 흐름 설계

## 🎯 목적
neture.co.kr 포털의 핵심 서비스 중 하나인 약사 대상 크라우드펀딩 플랫폼의 주요 화면 흐름 및 반응형 UI 구성을 설계한다.

---

## ✅ 주요 경로 구성

| 경로 | 설명 |
|------|------|
| `/funding` | 펀딩 메인 리스트 |
| `/funding/:id` | 펀딩 상세 페이지 |
| `/funding/create` | 펀딩 등록 페이지 (약사 전용) |
| `/funding/profile` | 내가 개설한 펀딩 내역 |

---

## 🧱 UI 구성 요소

### 1. 펀딩 메인 페이지 (`/funding`)
- 인기 프로젝트 슬라이드 (가로 스크롤 카드)
- 최신 펀딩 리스트 (카드형)
- 카테고리 필터 (예: 의료기기, 서비스, 약국경영)

### 2. 펀딩 상세 (`/funding/:id`)
- 제목, 이미지, 남은 기간, 목표금액, 현재 모금액
- 참여 버튼 + 참여자 수, 응원 메시지
- 상세 설명 (Rich Text)
- 댓글 영역 (선택)

### 3. 펀딩 등록 (`/funding/create`)
- 제목, 설명, 목표 금액, 마감일, 썸네일 업로드
- 약사만 접근 가능 (약사 인증 또는 `role === 'yaksa'`)
- 등록 후 `/funding/:id`로 이동

### 4. 프로필/내 펀딩 목록
- 내가 등록한 펀딩 목록
- 모금 현황, 수정/삭제 가능

---

## 📱 반응형 설계

- 카드형 UI는 모바일에서 세로 스택으로 전환
- 참여 버튼은 고정 하단 배치 (`fixed bottom-0`)
- 썸네일, 목표금액 등은 모바일 UI 우선

---

## 🔐 인증 흐름

- `/funding/create`, `/funding/profile`는 로그인 + `yaksa` 역할 필요
- 로그인되지 않으면 `/login`으로 리디렉션

---

## 💡 UI 스타일 가이드 (TailwindCSS)

- 카드: `rounded-xl shadow-lg p-4 bg-white`
- 버튼: `bg-blue-600 text-white py-2 px-4 rounded`
- 모바일 대응: `max-w-sm mx-auto`, `flex flex-col gap-4`

---

## ⏭️ 연동 서비스 (선택)

- 결제 모듈(PG)
- 관리자 승인 시스템
- 펀딩 종료 후 후기 작성 등


---

## 📄 05-b2b-forum-ui-wireframe.md


# 🧩 Wireframe 05: 약사 전용 B2B 포럼 UI 흐름 설계

## 🎯 목적
neture.co.kr의 B2B 대상 약사 커뮤니티 기능(포럼)의 화면 흐름을 정의하여 약사 간 정보 교류와 참여를 활성화할 수 있도록 한다.

---

## ✅ 주요 경로 구성

| 경로 | 설명 |
|------|------|
| `/forum` | 전체 포럼 게시판 리스트 |
| `/forum/:id` | 게시글 상세 보기 |
| `/forum/create` | 새 글 작성 |
| `/forum/profile` | 내가 쓴 글, 댓글 내역 |

---

## 🧱 UI 구성 요소

### 1. 포럼 메인 페이지 (`/forum`)
- 게시판 목록 (카테고리별 탭: 약국경영, 제도/정책, 제품 리뷰 등)
- 최신 글 리스트 (제목 + 요약 + 작성자 + 댓글 수 + 시간)
- 상단에 "글쓰기" 버튼

### 2. 게시글 상세 페이지 (`/forum/:id`)
- 제목, 작성자, 시간
- 본문 내용 (Rich Text)
- 댓글 영역
- 추천/공감 버튼 (선택)
- 작성자만 수정/삭제 가능

### 3. 게시글 작성 페이지 (`/forum/create`)
- 제목, 본문, 카테고리 선택
- 약사만 글 작성 가능 (role === 'yaksa')
- 저장 후 상세 페이지로 이동

### 4. 사용자 프로필 페이지 (`/forum/profile`)
- 내가 쓴 글 리스트
- 내가 쓴 댓글 목록
- 추천한 글 목록

---

## 📱 반응형 설계

- 리스트: 데스크탑 → 양측 정보, 모바일 → 한 줄 카드
- 글쓰기 버튼: 모바일에서는 플로팅 버튼(`fixed bottom-4 right-4`)
- 댓글: 줄이 접히고 "더보기"로 펼침 가능

---

## 🔐 인증 및 역할

- 모든 기능은 로그인 필요
- 글쓰기/수정/삭제는 `yaksa` 역할 전용
- `ProtectedRoute + RoleGuard` 적용

---

## 💡 UI 스타일 가이드 (TailwindCSS)

- 리스트 항목: `border-b py-4 px-2 hover:bg-gray-50`
- 상세 페이지: `max-w-3xl mx-auto prose`
- 댓글: `rounded-md bg-gray-100 p-2 my-2`

---

## ⏭️ 향후 확장 고려

- 글 신고/차단 기능
- 태그 기반 검색
- 인기글 정렬/검색 기능
- 관리자 승인 게시판


---

## 📄 06-signage-ui-wireframe.md


# 🖥️ Wireframe 06: 디지털사이니지 서비스 UI 흐름 설계

## 🎯 목적
neture.co.kr의 디지털사이니지 서비스는 약국 매장에 설치된 디스플레이 장치를 통해 약사 또는 본사에서 콘텐츠를 송출/관리할 수 있는 플랫폼입니다. 본 문서는 관리자/약사용 UI 흐름을 설계합니다.

---

## ✅ 주요 경로 구성

| 경로 | 설명 |
|------|------|
| `/signage` | 디스플레이 등록/연결, 콘텐츠 송출 설정 |
| `/signage/devices` | 내 디스플레이 장치 목록 |
| `/signage/playlists` | 콘텐츠 목록 및 스케줄 관리 |
| `/signage/preview/:id` | 특정 디스플레이의 콘텐츠 실시간 미리보기 |

---

## 🧱 UI 구성 요소

### 1. 디스플레이 관리 (`/signage/devices`)
- 등록된 디스플레이 리스트 (위치, 해상도, 연결 상태)
- 새 디바이스 등록 버튼 (등록 코드 입력 or QR 스캔)
- 연결 끊기, 삭제 버튼

### 2. 콘텐츠 재생 관리 (`/signage/playlists`)
- 콘텐츠 업로드 (이미지, 영상, HTML, 약사광고 등)
- 시간대별 재생 스케줄 설정
- 콘텐츠 순서 드래그 앤 드롭 편집

### 3. 콘텐츠 미리보기 (`/signage/preview/:id`)
- 실제 디스플레이 화면과 동일한 프리뷰 제공
- 테스트용 송출 버튼 포함

---

## 📱 반응형 설계

- 기본 데스크탑 UI
- 모바일에서는 콘텐츠 미리보기/스케줄 위주 화면으로 축소
- 디바이스 목록은 리스트형 전환

---

## 🔐 인증 및 권한

- 모든 기능은 로그인 필요
- 약사 또는 관리자만 접근 가능
- 디바이스 등록 시 사용자 계정과 연결됨

---

## 💡 UI 스타일 가이드 (TailwindCSS)

- 디바이스 카드: `rounded-lg bg-white p-4 shadow-md`
- 콘텐츠 편집: `grid grid-cols-2 gap-4`
- 스케줄 타임라인: 수직 또는 수평 슬라이드 바

---

## 🧩 향후 확장 고려

- WebSocket 기반 실시간 디스플레이 동기화
- 디스플레이 상태 모니터링
- 광고 송출 보고서
- 템플릿 저장/복원 기능


---

## 📄 07-common-ui-and-menu-structure.md


# 🧩 Wireframe 07: 공통 UI 모듈 및 역할 기반 메뉴 구조 설계

## 🎯 목적
neture.co.kr 플랫폼 내 모든 서비스에서 일관된 UI/UX 경험을 제공하고, 사용자 역할에 따라 표시되는 메뉴 및 UI 모듈을 구조화한다.

---

## ✅ 공통 UI 컴포넌트 정의

### 1. 상단 헤더 (`<AppHeader />`)
- 로고
- 현재 위치(title)
- 로그인/로그아웃 버튼
- 프로필/알림 아이콘

### 2. 사이드바 또는 메인 메뉴 (`<MainMenu />`)
- 역할 기반 표시 구조 적용
- 반응형 전환 (모바일에서는 햄버거 메뉴)

### 3. 알림 UI (`<NotificationBell />`)
- 벨 아이콘 + 새 알림 뱃지
- 클릭 시 최근 알림 드롭다운

### 4. 공통 카드 (`<ServiceCard />`)
- 아이콘 + 제목 + 설명 포함 진입용 카드

### 5. 모달/다이얼로그 (`<ConfirmDialog />`, `<InputModal />`)
- Tailwind + headlessui 기반

---

## 📋 역할별 메뉴 노출 정의

| 메뉴 항목 | B2C 사용자 | 약사(B2B) | 관리자 |
|-----------|------------|-----------|--------|
| 쇼핑몰 | ✅ `/shop` | ✅ `/yaksa-shop` | ❌ |
| 펀딩 | ✅ | ✅ | ❌ |
| 포럼 | ❌ | ✅ | ❌ |
| 디지털사이니지 | ❌ | ✅ | ✅ |
| 마이페이지 | ✅ | ✅ | ❌ |
| 관리자 대시보드 | ❌ | ❌ | ✅ |
| 사용자 관리 | ❌ | ❌ | ✅ (`superadmin`) |

---

## 🧱 Tailwind 구조 예시 (사이드바 메뉴)

```jsx
const menu = [
  { label: "쇼핑몰", href: "/shop", roles: ["b2c", "yaksa"] },
  { label: "펀딩", href: "/funding", roles: ["b2c", "yaksa"] },
  { label: "포럼", href: "/forum", roles: ["yaksa"] },
  { label: "관리자", href: "/admin", roles: ["admin"] }
];
```

---

## 🧩 확장 고려

- 다국어 미지원 → 제외
- 각 모듈은 Figma MCP 구성으로 추후 export 가능
- Zustand 또는 context 기반 역할 상태 분기

---

## ⏭️ 다음 연결 문서

- `role-permissions.md`: 역할별 기능 접근 권한 정의
- `ui-theme-system.md`: 공통 테마/다크모드 시스템 설계


---

## 📄 08-role-permissions.md


# 🔐 Wireframe 08: 역할별 기능 접근 권한 정의

## 🎯 목적
neture.co.kr 플랫폼에서 각 사용자 유형(B2C, 약사, 관리자)의 기능 접근을 명확히 구분하여 보안성과 UX를 동시에 확보한다.

---

## ✅ 사용자 역할 정의

| 역할 | 설명 |
|------|------|
| b2c | 일반 소비자 |
| yaksa | 약사, 기업 사용자 |
| admin | 관리자(운영자) |
| superadmin | 시스템 전체 권한 보유자 |

---

## 📋 역할별 접근 권한 매트릭스

| 기능 | b2c | yaksa | admin | superadmin |
|------|-----|-------|--------|-------------|
| 쇼핑몰 접근 | ✅ `/shop` | ✅ `/yaksa-shop` | ❌ | ❌ |
| 펀딩 참여 | ✅ | ✅ | ❌ | ❌ |
| 펀딩 등록 | ❌ | ✅ | ❌ | ❌ |
| 포럼 글 읽기 | ❌ | ✅ | ❌ | ❌ |
| 포럼 글 작성 | ❌ | ✅ | ❌ | ❌ |
| 디지털사이니지 제어 | ❌ | ✅ | ✅ | ✅ |
| 관리자 대시보드 | ❌ | ❌ | ✅ | ✅ |
| 사용자 권한 변경 | ❌ | ❌ | ❌ | ✅ |
| 설정 백업/복원 | ❌ | ❌ | ❌ | ✅ |
| 활동 로그 열람 | ❌ | ❌ | ❌ | ✅ |
| 알림 시스템 | ✅ | ✅ | ✅ | ✅ |

---

## 🔒 보호 컴포넌트 예시

```tsx
<ProtectedRoute roles={['yaksa', 'admin']}>
  <PageComponent />
</ProtectedRoute>

<AdminRoleProtectedRoute roles={['superadmin']}>
  <AdminLogs />
</AdminRoleProtectedRoute>
```

---

## 🛠️ 권한 데이터 관리 방식

- `authStore.ts` 또는 `adminAuthStore.ts`에 역할(role) 저장
- 로그인 응답에서 역할 포함 (JWT claims or API payload)
- 메뉴 렌더링 및 접근 제어에 일관되게 사용

---

## 📎 확장 고려 사항

- 역할별 알림 필터링
- 역할 전환 기능 (관리자가 약사 계정으로 전환 등)
- `ROLE_VIEWER`, `ROLE_EDITOR` 등 하위 역할 체계

---

## ⏭️ 다음 문서

- `ui-theme-system.md`: 테마 설정 및 다크모드 대응 전략


---

## 📄 09-ui-theme-system.md


# 🎨 Wireframe 09: UI 테마 및 다크모드 시스템 설계

## 🎯 목적
neture.co.kr 전체 서비스에서 일관된 UI 테마를 유지하고, 다크모드/라이트모드 전환이 가능한 유연한 테마 시스템을 설계한다.

---

## ✅ 기본 전략

- TailwindCSS `dark` 클래스를 기반으로 전체 다크모드 지원
- 사용자 설정을 `localStorage` 또는 `themeStore.ts`에 저장
- 기본값: 라이트 모드
- 테마는 모든 서비스에 공통 적용

---

## 📋 테마 저장 방식

```ts
// Zustand 예시
const themeStore = create((set) => ({
  theme: "light", // or "dark"
  setTheme: (value) => set({ theme: value })
}));
```

- 저장 위치: `localStorage.theme = 'dark'`
- 초기 진입 시 적용

---

## 💡 Tailwind 다크모드 구성 예시

```tsx
<div className="bg-white text-gray-900 dark:bg-gray-900 dark:text-white">
  <button className="bg-gray-200 dark:bg-gray-700">버튼</button>
</div>
```

---

## 🧱 UI 구성 요소

- 테마 토글 버튼 (`<ThemeToggle />`)
  - 라이트 ☀️ → 다크 🌙 전환
  - 헤더 상단 우측에 배치
- 전역 적용: `body` 또는 `html`에 `class="dark"` 적용

---

## 🎯 동작 흐름

```
[ThemeToggle 클릭]
    ↓
[Zustand 상태 변경 + localStorage 저장]
    ↓
[body class 변경 → UI에 dark 클래스 적용]
```

---

## 🧩 확장 고려

- 테마 시스템을 Figma MCP에도 반영 가능
- 추후 고대비 / 저시력 모드 등도 테마 설정에 포함
- 관리자 테마와 사용자 테마 분리 고려

---

## ⏭️ 관련 문서

- `07-common-ui-and-menu-structure.md`
- `08-role-permissions.md`


---

## 📄 yaksa-site-portal-wireframe.md


# 🧭 neture.co.kr 메인 포털 UI 와이어프레임 설계

## 🎯 목적
다양한 서비스로 진입하는 포털의 UI 구조를 설계하여 사용자 유형별 접근성을 높인다.

---

## 🧱 주요 섹션 구성 (PC/모바일 반응형)

1. 헤더 영역
   - 로고 (neture.co.kr)
   - 로그인 / 내 계정 버튼
   - 관리자 진입 버튼 (별도 우측)

2. 메인 섹션 (서비스 블록)
   - [일반 쇼핑몰] → `/shop`
   - [약사용 쇼핑몰] → `/yaksa-shop`
   - [펀딩 플랫폼] → `fund.neture.co.kr`
   - [약사 포럼] → `forum.neture.co.kr`
   - [디지털사이니지] → `signage.neture.co.kr`

3. 하단 푸터
   - 고객센터 링크
   - 이용약관 / 개인정보 처리방침
   - 회사 정보 등

---

## 📱 모바일 레이아웃 전환 기준
- TailwindCSS breakpoint 기준 `md:` 이하로 접힘
- 메인 버튼은 카드 UI → 리스트 UI로 전환

---

## 💡 추후 고려 사항
- 로그인된 사용자 유형에 따라 블록 강조
- 관리자 계정은 자동 admin 도메인으로 리디렉션
- B2B 로그인은 별도 안내/입력 필요 가능성


---

## 📄 main-site-summary-setup.md

좋습니다! 요청하신 문서를 복사/붙여넣기 형식으로 바로 사용하실 수 있도록 아래에 정리해드립니다. 새로운 채팅방(o4o-프론트엔드 4)에서 **neture.co.kr 프론트엔드 테스트 기반 개발을 이어갈 때 참조용 문서**로 활용하세요.

---

### 📄 파일명: `main-site-summary-setup.md`

````markdown
# neture.co.kr 개발 작업 요약 (이전 채팅방 정리)

이 문서는 neture.co.kr 프론트엔드 개발을 위한 초기 설정, 오류 해결, `AuthContext` 정비, `Profile.tsx` 수정, GitHub 연동 등 **이전 채팅방에서의 핵심 개발 이슈 및 해결 내용**을 정리한 요약입니다.  
새로운 채팅방에서는 본 내용을 참고하여 테스트 기반 화면 개발을 이어갈 수 있습니다.

---

## ✅ 1. 프로젝트 구조 및 GitHub 연동 상태

- 로컬 디렉터리: `~/o4o-platform/Coding/o4o-platform/docs/Coding/o4o-platform/services/main-site/`
- GitHub 연동: `origin` 연결 완료, `main` 브랜치 기준으로 작업 중
- 현재 로컬 → GitHub → 서버 배포 흐름 수동으로 관리 중
- 서버는 `serve -s dist -l 3000` 방식으로 정적 빌드 후 실행됨

---

## ✅ 2. AuthContext 문제 해결 과정 요약

- 문제: `useAuth` 훅을 default import로 잘못 사용 → 빌드 오류 다수 발생
- 해결:
  - `AuthContext.tsx`에서 `useAuth`, `User` 타입을 **명시적으로 export**
  - `src/hooks/useAuth.ts`는 혼란 방지를 위해 **삭제**
  - 관련 파일들의 import 문을 **default → named import**로 일괄 수정

```tsx
// 잘못된 예시
import useAuth from '../context/AuthContext';
// 수정된 예시
import { useAuth } from '../context/AuthContext';
```

* 자동 수정 명령어:

```bash
find src -type f -name "*.tsx" -exec sed -i "s/^import useAuth from '\([^']*\)';/import { useAuth } from '\1';/g" {} +
rm src/hooks/useAuth.ts
```

---

## ✅ 3. `Profile.tsx` 오류 및 최종 수정

* 오류: `user.name`, `user.role` 등에 접근 시 타입 오류 발생
* 조치:

  * `User` 타입을 명확히 정의 후 `useAuth`가 해당 타입을 반환함을 명시
  * `useAuth` 반환값이 `null`일 수 있으므로 null 체크 로직 추가
  * `Profile.tsx`에 반응형 Tailwind 레이아웃 적용

> `Profile.tsx`는 현재 사용자 역할별로 표시되는 메뉴(약사 / 관리자)를 구분함

---

## ✅ 4. Home.tsx 리디자인 작업 준비

* Cursor IDE에서 작업 요청을 위한 마크다운 문서 작성 완료:

  * `tasks/01-improve-home-design.md`
  * 반응형, 모던 UI, 서비스 소개 및 CTA 버튼 포함 요청
* 이후 `Home.tsx` 실제 개선 및 테스트 예정

---

## ✅ 5. Nginx + HTTPS 설정 정비

* `neture.co.kr` 도메인은 Nginx를 통해 443 포트로 프록시
* React 앱은 `serve`로 실행
* 이전에는 정적 파일 경로(`/dist/`) 직접 참조하였으나 프록시 방식으로 변경

```nginx
location / {
  proxy_pass http://localhost:3000;
  proxy_http_version 1.1;
  proxy_set_header Upgrade $http_upgrade;
  proxy_set_header Connection 'upgrade';
  proxy_set_header Host $host;
  proxy_cache_bypass $http_upgrade;
}
```

---

## ✅ 6. 다음 단계 제안 (새 채팅방에서 진행)

1. `Home.tsx` 개선된 UI 적용 및 테스트
2. 실제 회원가입/로그인 흐름 반영
3. 약사 인증 페이지/기능 추가
4. GitHub → 서버 자동화 스크립트 도입 고려
5. 이후 CMS 콘텐츠 연동(Tiptap, Strapi 등) 및 메인화면 콘텐츠 편집 도구 적용

---

✅ 본 문서는 새로운 채팅방에서 이어지는 neture.co.kr 테스트 기반 개발의 출발점입니다.
````

---

💡 이 파일은 다음 위치 중 한 곳에 저장하시면 좋습니다:

* `Coding/o4o-platform/docs/Coding/o4o-platform/services/main-site/docs/main-site-summary-setup.md`
* 또는 `Coding/o4o-platform/docs/Coding/o4o-platform/services/main-site/tasks/README.md`에 통합

다음 단계에서 필요한 문서나 정리할 내용 있으면 언제든 요청해 주세요.

