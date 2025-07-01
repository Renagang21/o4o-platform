# 01-setup 📁 환경 설정 가이드

새로운 개발자나 새로운 환경에서 프로젝트를 시작할 때 필요한 모든 설정 가이드입니다.

## 📋 순서대로 따라하기

### 1️⃣ [환경 설정](environment-setup.md) 
- 집/직장 환경별 설정
- Node.js, npm 설치 
- PATH 문제 해결
- 라이브러리 버전 관리

### 2️⃣ [설정 파일 템플릿](config-templates.md)
- package.json, .env, .gitignore 템플릿
- PM2, TypeScript, Tailwind 설정
- README.md 구조 가이드

## 🚀 5분 빠른 시작

```bash
# 1. 저장소 클론
git clone https://github.com/Renagang21/o4o-platform.git
cd o4o-platform

# 2. 환경변수 설정  
cp .env.example .env
# .env 파일 편집 (DATABASE_URL, JWT_SECRET 등)

# 3. 의존성 설치
npm install

# 4. 개발 서버 실행
npm run dev:all

# 5. 브라우저에서 확인
# http://localhost:3000 (웹사이트)
# http://localhost:4000 (API)
```

## 🔧 문제 발생 시

- 환경 설정 문제 → [environment-setup.md](environment-setup.md)
- 설정 파일 오류 → [config-templates.md](config-templates.md)  
- 실행 중 오류 → [../02-operations/troubleshooting.md](../02-operations/troubleshooting.md)

## 📚 관련 문서

- [문제 해결 가이드](../02-operations/troubleshooting.md)
- [기술 스택 정보](../03-reference/tech-stack.md)
- [프로젝트 구조](../03-reference/folder-structure.md)

---

**다음 단계**: 환경 설정이 완료되면 [02-operations](../02-operations) 폴더로 이동해서 운영 가이드를 확인하세요.