
# 🛠 yaksa-deploy-task-01-react-build-serve.md

## 🎯 목적

`yaksa.site` 도메인에 배포된 React(Vite 기반) 프론트엔드 프로젝트가  
**502 Bad Gateway**, **404 Not Found** 오류를 거쳐  
정상적으로 **정적 웹사이트로 제공되도록 설정**한 과정을 기록한다.  
이 문서는 향후 동일한 구성 시 재활용 가능한 가이드 역할을 한다.

---

## ✅ 서버 및 환경 요약

| 항목 | 값 |
|------|----|
| 인스턴스 | AWS Lightsail (Ubuntu, o4o-web-server) |
| 퍼블릭 IP | `13.124.146.254` |
| 프레임워크 | Vite + React |
| 배포 방법 | `serve -s dist -l 3000` (정적 파일 서비스) |
| 웹서버 | Nginx (proxy_pass로 포워딩) |
| 연결 도메인 | yaksa.site |

---

## 🚨 문제 발생 흐름 요약

1. `502 Bad Gateway`
    - 원인: React 앱이 실행되지 않은 상태에서 Nginx가 3000번 포트로 프록시 시도
2. `404 Not Found`
    - 원인: `vite build`는 `dist/`에 생성되는데, `serve -s build` 명령어 사용 → 경로 불일치
3. `포트 중복 오류`
    - 원인: 이전 프로세스가 3000포트를 점유 중 → `serve`가 임의 포트로 실행됨 → Nginx와 불일치

---

## 🧰 해결 절차 (Step-by-Step)

### 1. 프로젝트 빌드

```bash
cd ~/o4o-web
npm run build
```

- 결과: `dist/` 디렉토리 생성됨

---

### 2. 기존 3000포트 점유 프로세스 종료

```bash
sudo lsof -i :3000
sudo kill -9 <PID>
```

예:
```bash
sudo kill -9 41357
```

---

### 3. 정적 파일 serve 시작

```bash
serve -s dist -l 3000
```

- `serve`가 `3000`번 포트에서 정상 실행됨
- 결과:
  ```
  Serving!
  - Local: http://localhost:3000
  ```

---

### 4. Nginx 설정 확인 (필요 시)

```nginx
server {
    listen 80;
    server_name yaksa.site;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        try_files $uri /index.html;  # SPA fallback
    }
}
```

```bash
sudo nginx -t
sudo systemctl reload nginx
```

---

## ✅ 결과

- `yaksa.site` 접속 시, Vite + React 초기 페이지 정상 렌더링됨
- Vite 앱의 `/`, `/vite.svg`, `/assets/` 경로 모두 정상 동작
- 이후 포털 홈 UI로의 전환만 남은 상태

---

## 🗂️ 참고

| 파일명 | 내용 |
|--------|------|
| `vite.config.js` | 정적 빌드 관련 경로 조정 필요시 참조 |
| `o4o-web-pm2.json` | serve를 PM2에 등록하려는 경우 사용 가능 |
| `nginx.conf` | fallback 추가 필요 (SPA 경우) |

---

## 🔄 향후 작업 제안

- `src/App.jsx`를 실제 yaksa 포털 홈 UI로 교체
- React Router 도입 후 라우팅 테스트
- `/login`, `/shop`, `/yaksa/dashboard` 등의 경로별 화면 구성
- PM2를 통한 서비스 상시 실행 구성

---

## ✳️ PM2 등록 예시 (선택)

```bash
pm2 start serve --name yaksa-portal -- -s dist -l 3000
```

---
