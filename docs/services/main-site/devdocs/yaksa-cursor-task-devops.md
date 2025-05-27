# Yaksa Main Site - DevOps 환경 구성 작업 요청 (경로 구조 반영)

## 📌 목적

이 문서는 `o4o-platform` 프로젝트의 `services/yaksa-main-site/` 디렉토리에 대한 개발 및 배포 작업을 체계화하기 위한  
DevOps 관련 보조 파일 생성을 Cursor에게 요청하기 위한 문서입니다.

---

## ✅ 작업 요청 항목 및 생성 경로

### 1. `.gitignore`

> 목적: GitHub 업로드 시 제외할 파일 및 폴더 지정

**생성 위치:**
- ✅ `o4o-platform/.gitignore` → 전체 프로젝트 공통 제외 규칙
- ✅ `services/yaksa-main-site/.gitignore` → 개별 서비스 전용 규칙

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
- ✅ `services/yaksa-main-site/.env.example`

**예시 내용:**

```
VITE_API_BASE_URL=https://api.yaksa.site
VITE_SITE_NAME=yaksa.site
```

---

### 3. `README.md`

> 목적: 해당 서비스의 개발, 실행, 배포 지침 요약

**생성 위치:**  
- ✅ `services/yaksa-main-site/README.md`

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
  cd services/yaksa-main-site
  npm install
  npm run build
  sudo systemctl reload nginx
ENDSSH
```

---

## 📝 Cursor에게 요청할 문구 예시

> 다음 파일들을 다음 경로에 생성해 주세요:
>
> - `.gitignore` → 루트(`o4o-platform/`)와 `services/yaksa-main-site/` 모두
> - `.env.example`, `README.md` → `services/yaksa-main-site/`
> - `deploy.sh` → `o4o-platform/scripts/deploy-yaksa.sh` 로 생성  
>
> 각 파일은 실제 배포 시 수정 가능한 형태로, 위 예시를 참고하여 생성해 주세요.