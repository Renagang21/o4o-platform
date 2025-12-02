# 📄 Step 21 — Phase H: Digital Signage Finalization Work Order

## Migration 실행 + API 테스트 + Player 테스트 + QA

**Version**: 2025-12
**Author**: ChatGPT PM
**Status**: 🔄 In Progress

---

## 0. 목적

Digital Signage App은 이미 다음이 완료됨:

* 패키지 구축 (manifest / ui / functions / views)
* API 서버 구축 (entities / service / controller / routes)
* 프론트엔드 UI & Function 완성
* ViewRenderer 기반 렌더링 준비
* AppStore 통합
* TypeScript / Vite / Workspace 문제 해결 (Step 22)

Phase H는 아래 4가지를 완료하여 **Digital Signage 기능을 실제 운영 가능한 상태로 만든다**:

---

## 🎯 Phase H 목표

1. **Database Migration 실행**
2. **API Endpoint 실동작 테스트**
3. **테스트 데이터 입력**
4. **Signage Player 실제 재생 테스트**

이 4가지를 완료하면 Digital Signage Builder는 완성입니다.

---

## 1. Database Migration 실행

Migration 파일:

```
apps/api-server/src/migrations/1830000000000-CreateSignageTables.ts
```

테이블:

* signage_devices
* signage_slides
* signage_playlists
* signage_playlist_items
* signage_schedules

### 📌 실행 명령

(1) API 서버 위치로 이동:

```bash
cd apps/api-server
```

(2) Migration 실행:

```bash
pnpm run migration:run
```

(3) 성공 로그 예시:

```
Query: CREATE TABLE "signage_devices" ...
Migration 1830000000000-CreateSignageTables executed successfully
```

(4) DB 구조 확인 (선택):

```bash
psql -d o4o -c "\dt signage_*"
```

---

## 2. API Endpoint 테스트

모든 Digital Signage 기능은 API 기반으로 작동하므로
아래 엔드포인트가 정상적으로 동작해야 한다.

테스트에는 Postman, curl, 또는 admin-dashboard 콘솔 사용 가능.

### 2.1 장치(Device) TEST

**POST /api/signage/devices**

```json
{
  "name": "Test Device A",
  "token": "abcd1234"
}
```

**GET /api/signage/devices**

→ 등록된 device 목록이 보여야 함.

---

### 2.2 슬라이드(Slide) TEST

**POST /api/signage/slides**

```json
{
  "title": "Promo Slide 1",
  "json": { "type": "Text", "props": { "value": "Sale!" }},
  "duration": 5000
}
```

**GET /api/signage/slides**

---

### 2.3 플레이리스트(Playlist) TEST

**POST /api/signage/playlists**

```json
{
  "title": "Morning Ads",
  "items": ["<slide-id-1>", "<slide-id-2>"]
}
```

**GET /api/signage/playlists**

---

### 2.4 스케줄(Schedule) TEST

**POST /api/signage/schedule**

```json
{
  "deviceId": "<device-id>",
  "playlistId": "<playlist-id>",
  "startTime": "08:00",
  "endTime": "12:00",
  "daysOfWeek": [1,2,3,4,5]
}
```

**GET /api/signage/schedule**

---

### 2.5 Player endpoint TEST

**GET /api/signage/now?deviceId=<id>**

→ 현재 재생해야 하는 slide JSON 반환

---

## 3. 테스트 데이터 입력

Phase H에서 실제 동작 검증을 위해
다음 데이터를 최소 1개씩 등록해야 한다:

| 종류       | 개수   | 목적              |
| -------- | ---- | --------------- |
| Device   | 1개   | 플레이어 테스트        |
| Slide    | 2~3개 | Playlist 재생 테스트 |
| Playlist | 1개   | Player loop     |
| Schedule | 1개   | Player routing  |

**TIP:**
slides를 2~3개 넣어두면 Player에서 자동 슬라이드 전환(Phase F)까지 테스트 가능.

---

## 4. Signage Player 실제 테스트 (브라우저)

이제 가장 중요한 테스트:

### 📌 URL:

```
/signage/player?deviceId=<your-device-id>
```

확인해야 할 것:

| 체크 항목          | 설명                         |
| -------------- | -------------------------- |
| 렌더링 정상         | ViewRenderer가 정상 출력        |
| 슬라이드 교체        | duration 값 기반 자동 전환        |
| schedule 반영    | 현재 시간에 맞는 playlist 로딩      |
| 빈 playlist 처리  | "No active playlist" 화면 표시 |
| 60초 refresh    | metadata 자동 갱신             |
| full-screen UI | MinimalLayout 적용           |

이 테스트가 성공하면
Digital Signage 기능이 "실제 서비스로서 완성"된 것이다.

---

## 5. Phase H 성공 기준 (DoD)

- [ ] migration 성공
- [ ] 모든 signage 엔드포인트 정상 응답
- [ ] 최소 한 개 device/slide/playlist/schedule 생성
- [ ] Player에서 화면 정상 표시
- [ ] 자동 slide 전환 동작
- [ ] schedule 반영
- [ ] NextGen main-site build 정상
- [ ] error log 없음

---

## 6. Phase H 완료 후 다음 단계

Phase H가 끝나면:

✔ Digital Signage Builder 기능 100% 완성
✔ NextGen Panel/Renderer/CMS/AppStore와 완전 통합
✔ 독립 서비스로 운영 가능

그 다음 단계는 자연스럽게:

### ▶ Step 23 — Multi-Instance Deployment Manager

(신규 서비스 자동 생성/배포 시스템)

---

## 7. 예상 소요 시간

- Migration 실행: 5분
- API 테스트: 15분
- 테스트 데이터 생성: 10분
- Player 테스트: 10분
- 검증 및 문서화: 10분

**총 예상 시간**: 50분

---

## 8. 참고 자료

### 관련 문서
- Step 21 Completion Report: `/docs/nextgen-frontend/reports/step21_digital_signage_completion_report.md`
- Step 22 Work Order: `/docs/nextgen-frontend/tasks/step22_ts_vite_workspace_fix_workorder.md`

### 관련 파일
- Migration: `/apps/api-server/src/migrations/1830000000000-CreateSignageTables.ts`
- Routes: `/apps/api-server/src/routes/signage.routes.ts`
- Service: `/apps/api-server/src/services/SignageService.ts`
- Player View: `/packages/@o4o-apps/signage/views/signage-player.json`
- Player UI: `/packages/@o4o-apps/signage/ui/SignagePlayer.tsx`

---

**작성일**: 2025-12-02
**작성자**: ChatGPT PM
**상태**: 🔄 Ready to Execute

---

## ✔ Step 21 — Phase H Finalization Work Order Ready!

Next: Execute Migration → Test API → Create Data → Test Player
