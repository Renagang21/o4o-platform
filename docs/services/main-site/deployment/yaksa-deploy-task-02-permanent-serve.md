
# 🛠️ Task 02: yaksa.site 정적 앱을 안정적으로 실행되도록 설정

## 🎯 목적
yaksa.site를 언제 어디서 접속하더라도 포털 화면이 항상 표시되도록, React 앱을 정적 빌드 후 pm2를 통해 백그라운드에서 안정적으로 실행하고, 서버 재시작 시 자동 복구되도록 설정한다.

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

- 브라우저에서 https://yaksa.site 새로고침 시 계속 포털 화면 유지
- PM2 프로세스가 살아 있는지 `pm2 list`로 확인
- 서버 재부팅 후에도 자동 실행되는지 `reboot` 후 재확인

---

이 작업이 완료되면 yaksa.site는 항상 안정적으로 사용자에게 화면을 제공할 수 있습니다.
