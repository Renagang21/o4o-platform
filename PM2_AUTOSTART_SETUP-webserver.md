# PM2 자동시작 설정 보고서 - Webserver
작성일: 2025-08-18
서버: o4o-webserver

## 📌 Phase 5.3 작업 결과

### ✅ 완료된 작업

1. **PM2 프로세스 직접 실행**
   - ecosystem.config.webserver.cjs 스크립트 대신 직접 명령 사용
   - o4o-webserver: 포트 3000에서 실행 중
   - o4o-admin: 포트 3001에서 실행 중

2. **PM2 systemd 설정**
   - `pm2 startup systemd` 명령 실행 완료
   - systemd 서비스 파일 생성: `/etc/systemd/system/pm2-ubuntu.service`
   - PM2 경로 수정: `/usr/bin/pm2`로 변경

3. **프로세스 저장**
   - `pm2 save` 명령으로 현재 실행 중인 프로세스 저장
   - 저장 위치: `/home/ubuntu/.pm2/dump.pm2`

### ⚠️ 미해결 이슈

1. **systemd 서비스 시작 실패**
   - 에러: `Failed with result 'protocol'`
   - 원인: PM2가 forking 모드에서 PID 파일을 제대로 생성하지 못함
   - systemd가 서비스 상태를 추적하지 못하는 문제

### 🔧 현재 상태

```bash
# PM2 프로세스 상태
┌────┬──────────────────┬──────────┬────────┬─────────┬──────┬───────────┬──────────┬──────────┐
│ id │ name             │ mode     │ pid    │ status  │ ↺    │ cpu       │ mem      │ uptime   │
├────┼──────────────────┼──────────┼────────┼─────────┼──────┼───────────┼──────────┼──────────┤
│ 0  │ o4o-webserver    │ fork     │ 2296876│ online  │ 0    │ 0%        │ 95.0mb   │ 실행 중  │
│ 1  │ o4o-admin        │ fork     │ 2296988│ online  │ 0    │ 0%        │ 95.0mb   │ 실행 중  │
└────┴──────────────────┴──────────┴────────┴─────────┴──────┴───────────┴──────────┴──────────┘
```

### 📝 수동 시작 명령어

시스템 재부팅 후 수동으로 PM2 프로세스를 시작해야 합니다:

```bash
# PM2 프로세스 시작
pm2 start /usr/bin/serve --name "o4o-webserver" -- -s apps/main-site/dist -l 3000
pm2 start /usr/bin/serve --name "o4o-admin" -- -s apps/admin-dashboard/dist -l 3001

# 프로세스 저장
pm2 save
```

### 🚨 권장사항

1. **대안 1: PM2 대신 systemd 직접 사용**
   - PM2 없이 systemd 서비스로 직접 serve 실행
   - 더 안정적인 자동시작 보장

2. **대안 2: PM2 simple 모드 사용**
   - forking 대신 cluster 모드 사용 검토
   - systemd와의 호환성 개선

3. **대안 3: 수동 스크립트 작성**
   - `/etc/rc.local` 또는 cron의 `@reboot` 사용
   - PM2 대신 직접 프로세스 관리

### 📊 요약

- **성공**: PM2 프로세스 실행 및 저장 ✅
- **부분 성공**: systemd 서비스 생성 (활성화 실패) ⚠️
- **실패**: 자동시작 설정 완료 ❌

현재 웹서버는 정상 작동 중이나, 시스템 재부팅 시 자동시작되지 않습니다.
수동으로 PM2 프로세스를 시작해야 합니다.

## 파일 변경사항
- 생성: `/home/ubuntu/o4o-platform/ecosystem.config.webserver.cjs` (사용 안 함)
- 수정: `/etc/systemd/system/pm2-ubuntu.service` (PM2 경로 수정)
- 생성: 본 보고서 파일