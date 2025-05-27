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
├── services/
│   └── yaksa-main-site/     # React 프로젝트
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
  "folders": ["services/yaksa-main-site"],
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
cd services/yaksa-main-site || exit 1
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
curl -I https://yaksa.site
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