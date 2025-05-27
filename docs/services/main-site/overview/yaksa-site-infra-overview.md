
# 🧾 yaksa.site 백엔드 및 프론트엔드 호스팅 구조 요약

## ✅ 1. 서비스 개요

- yaksa.site는 React 기반 프론트엔드로 개발되었습니다.
- 백엔드는 Medusa.js 기반 커머스 API 서버 (`o4o-api-server`)입니다.
- 모든 서비스는 AWS Lightsail에서 운영되고 있습니다.

---

## ✅ 2. 프론트엔드 실행 구조

yaksa.site 프론트는 다음 중 하나의 방식으로 실행 중일 수 있습니다:

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
