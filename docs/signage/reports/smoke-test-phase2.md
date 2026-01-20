# Digital Signage - Phase 2 Smoke Test Report

> **Date:** 2025-01-20
> **Tag:** v2.0.0-signage-phase2
> **Status:** Baseline Documentation

---

## 1. Test Scope

Phase 2 Finalization을 위한 Smoke Test 체크리스트입니다.
실제 테스트는 배포 후 사람이 수행합니다.

---

## 2. Admin Smoke Test

### 2.1 Access Control

| Test Case | Expected | Status |
|-----------|----------|--------|
| Admin 로그인 | 성공 | ☐ |
| Admin 메뉴 접근 | 설정/Extensions/Analytics 노출 | ☐ |
| Non-Admin 접근 시도 | 403 Forbidden | ☐ |
| HQ 기능 비노출 | HQ 메뉴 숨김 | ☐ |
| Store 기능 비노출 | Store 메뉴 숨김 | ☐ |

### 2.2 Admin Functions

| Test Case | Expected | Status |
|-----------|----------|--------|
| Settings 페이지 | 정상 로드 | ☐ |
| Extensions 페이지 | 정상 로드 | ☐ |
| Analytics 페이지 | 정상 로드 | ☐ |

---

## 3. Operator (HQ) Smoke Test

### 3.1 Access Control

| Test Case | Expected | Status |
|-----------|----------|--------|
| Operator 로그인 | 성공 | ☐ |
| HQ 메뉴 접근 | Global Content 노출 | ☐ |
| Admin 기능 접근 시도 | 403 Forbidden | ☐ |
| Store 기능 접근 | 읽기 전용 허용 | ☐ |

### 3.2 HQ Content Management

| Test Case | Expected | Status |
|-----------|----------|--------|
| HQ 플레이리스트 생성 | scope: global 생성 | ☐ |
| HQ 미디어 업로드 | source: hq 생성 | ☐ |
| 강제 콘텐츠 설정 | isForced: true 작동 | ☐ |
| 글로벌 발행 | Store에서 조회 가능 | ☐ |

### 3.3 Template Management

| Test Case | Expected | Status |
|-----------|----------|--------|
| 템플릿 생성 | 정상 생성 | ☐ |
| 템플릿 Zone 추가 | 정상 추가 | ☐ |
| 레이아웃 프리셋 | 정상 생성/적용 | ☐ |
| 콘텐츠 블록 | 정상 생성 | ☐ |

---

## 4. Store Smoke Test

### 4.1 Access Control

| Test Case | Expected | Status |
|-----------|----------|--------|
| Store 로그인 | 성공 | ☐ |
| Store 메뉴 접근 | Playlist/Media/Schedule 노출 | ☐ |
| Admin 기능 접근 시도 | 403 Forbidden | ☐ |
| HQ 기능 접근 시도 | 403 Forbidden | ☐ |

### 4.2 Global Content Browse

| Test Case | Expected | Status |
|-----------|----------|--------|
| HQ 콘텐츠 조회 | source: hq 목록 | ☐ |
| Supplier 콘텐츠 조회 | source: supplier 목록 | ☐ |
| Community 콘텐츠 조회 | source: community 목록 | ☐ |

### 4.3 Clone & Customize

| Test Case | Expected | Status |
|-----------|----------|--------|
| 플레이리스트 Clone | Store 소유 복사본 생성 | ☐ |
| 미디어 Clone | Store 소유 복사본 생성 | ☐ |
| Clone 후 편집 | 원본과 독립적 수정 | ☐ |

### 4.4 Store Content Management

| Test Case | Expected | Status |
|-----------|----------|--------|
| 플레이리스트 생성 | scope: store 생성 | ☐ |
| 미디어 업로드 | Store 소유 생성 | ☐ |
| 항목 순서 변경 | Reorder 작동 | ☐ |
| 스케줄 생성 | 정상 생성 | ☐ |
| 스케줄 캘린더 | 캘린더 뷰 정상 | ☐ |

---

## 5. Player Smoke Test

### 5.1 Basic Playback

| Test Case | Expected | Status |
|-----------|----------|--------|
| Channel-code 재생 | 정상 재생 | ☐ |
| Channel-id 재생 | 정상 재생 | ☐ |
| Active content 해석 | 올바른 콘텐츠 선택 | ☐ |

### 5.2 Content Merge

| Test Case | Expected | Status |
|-----------|----------|--------|
| Global playlist 수신 | HQ 콘텐츠 포함 | ☐ |
| Store playlist 수신 | Store 콘텐츠 포함 | ☐ |
| Merge 순서 | Global → Store 순서 | ☐ |
| Forced content | isForced=true 우선 | ☐ |

### 5.3 Error Handling

| Test Case | Expected | Status |
|-----------|----------|--------|
| Offline fallback | 캐시 콘텐츠 재생 | ☐ |
| API 오류 복구 | 자동 재시도 | ☐ |
| Heartbeat 전송 | 로그 기록 확인 | ☐ |

### 5.4 Preload

| Test Case | Expected | Status |
|-----------|----------|--------|
| 미디어 preload | 다음 콘텐츠 미리 로드 | ☐ |
| 대용량 미디어 | 버퍼링 없이 재생 | ☐ |

---

## 6. API Integration Test

### 6.1 Endpoints

| Endpoint | Method | Status |
|----------|--------|--------|
| /playlists | GET/POST | ☐ |
| /playlists/:id | GET/PATCH/DELETE | ☐ |
| /media | GET/POST | ☐ |
| /schedules | GET/POST | ☐ |
| /templates | GET/POST | ☐ |
| /global/playlists | GET | ☐ |
| /hq/playlists | POST | ☐ |
| /active-content | GET | ☐ |

### 6.2 Error Cases

| Case | Expected | Status |
|------|----------|--------|
| 401 Unauthorized | Token 없음 | ☐ |
| 403 Forbidden | 권한 없음 | ☐ |
| 404 Not Found | 리소스 없음 | ☐ |
| 400 Bad Request | 잘못된 요청 | ☐ |

---

## 7. Sign-off

| Role | Tester | Date | Signature |
|------|--------|------|-----------|
| Admin | | | |
| Operator | | | |
| Store | | | |
| Player | | | |

---

*Template created: 2025-01-20*
*Phase 2 Finalization*
