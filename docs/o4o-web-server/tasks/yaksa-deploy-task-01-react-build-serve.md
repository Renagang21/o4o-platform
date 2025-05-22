
# 🛠️ Task: yaksa.site React 앱 빌드 및 정적 실행 확인

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

이 작업이 완료되면 yaksa.site는 외부에서 정상 접속 가능해야 합니다.
