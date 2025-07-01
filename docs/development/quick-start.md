# 5분 내 실행 가이드 (2024-06-18 기준)

## 1. 저장소 클론
```
git clone https://github.com/Renagang21/o4o-platform.git
cd o4o-platform
```

## 2. 환경변수 설정
- `.env.example` 파일을 복사해 `.env`로 사용
- DB, Redis, JWT 등 환경변수 입력

## 3. 의존성 설치
```
npm install
```

## 4. 개발 서버 실행
```
npm run dev:all
```

## 5. 브라우저 접속
- http://localhost:3000 (메인 사이트)

> 추가 환경/서비스는 build-deploy.md 참고
