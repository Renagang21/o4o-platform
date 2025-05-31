# Yaksa Main Site

야크사 메인 사이트는 야크사들의 커뮤니티 플랫폼입니다.

## 🚀 시작하기

### 필수 요구사항

- Node.js 18.x 이상
- pnpm 8.x 이상
- Git

### 설치

```bash
# 저장소 클론
git clone https://github.com/your-org/o4o-platform.git
cd o4o-platform/services/yaksa-main-site

# 의존성 설치
pnpm install

# 환경 변수 설정
cp .env.example .env
# .env 파일을 열어 필요한 값들을 설정하세요
```

### 개발 서버 실행

```bash
pnpm dev
```

### 빌드

```bash
pnpm build
```

## 🔧 환경 변수

`.env.example` 파일을 참고하여 필요한 환경 변수를 설정하세요:

- `VITE_API_BASE_URL`: API 서버 주소
- `VITE_SITE_NAME`: 사이트 이름
- 기타 필요한 환경 변수들...

## 📦 배포

### 수동 배포

```bash
# 빌드
pnpm build

# 배포 스크립트 실행
../scripts/deploy-yaksa.sh
```

### 자동 배포

GitHub Actions를 통해 main 브랜치에 push되면 자동으로 배포됩니다.

## 🛠 기술 스택

- React 18
- TypeScript
- Vite
- TailwindCSS
- React Router
- React Query

## �� 라이선스

MIT License
