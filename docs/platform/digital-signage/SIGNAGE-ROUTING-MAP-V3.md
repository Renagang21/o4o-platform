# Digital Signage Routing Map V3

> Role Reform (RR-1)
> Version: 3.0
> Date: 2026-01-17
> Status: Active

---

## 1. 개요

이 문서는 Role Reform 이후의 **최종 라우팅 구조**를 정의합니다.
Admin, Operator (HQ), Store가 완전히 분리된 URL 공간을 가집니다.

---

## 2. URL 공간 분리

### 2.1 Admin (admin.neture.co.kr)

```
/digital-signage/*
```

플랫폼 전체를 관리하는 시스템 관리자 전용 영역.

### 2.2 Operator/HQ (Service Frontend)

```
/signage/hq/*
```

서비스별 HQ 운영자가 글로벌 콘텐츠를 관리하는 영역.

### 2.3 Store (Service Frontend)

```
/signage/store/*
```

매장 사용자가 자체 콘텐츠를 관리하는 영역.

---

## 3. Admin Routes (최종)

**Host**: `admin.neture.co.kr`
**Guard**: `AdminSignageGuard`

```
/digital-signage
├── /                      # → /monitoring 리다이렉트
├── /monitoring            # 시스템 모니터링 대시보드
├── /settings              # 시스템 설정
├── /extensions            # 확장 앱 관리
├── /suppliers             # 공급자 관리
├── /analytics             # 전사 분석 대시보드
│
├── /operations            # 운영 대시보드 (Phase 12)
│   ├── /history          # 액션 히스토리
│   ├── /display-status   # 디스플레이 상태
│   └── /problems         # 문제 추적
│
└── (Legacy Phase 6 routes)
    ├── /media/sources/*
    ├── /displays/*
    ├── /schedules/*
    └── /actions/*
```

### 제거된 라우트 (V2 → V3)

| V2 경로 | 상태 | 이동 위치 |
|--------|------|----------|
| `/preview/hq/*` | 제거 | → /signage/hq/* |
| `/preview/store/*` | 제거 | → /signage/store/* |
| `/templates/*` | 제거 | → /signage/hq/templates/* |
| `/content-blocks` | 제거 | → Extension 또는 HQ |
| `/layout-presets` | 제거 | → Extension 또는 HQ |
| `/v2/*` | 제거 | → 새 구조로 마이그레이션 |

---

## 4. Operator (HQ) Routes (최종)

**Host**: `{service}.domain.com`
**Guard**: `OperatorSignageGuard`

```
/signage/hq
├── /                      # HQ 대시보드
│   ├── 통계 카드
│   ├── 최근 활동
│   └── 빠른 작업
│
├── /playlists             # 글로벌 플레이리스트
│   ├── /new              # 새 플레이리스트
│   └── /:id              # 플레이리스트 편집
│
├── /media                 # 글로벌 미디어
│   ├── /upload           # 미디어 업로드
│   └── /:id              # 미디어 상세
│
├── /templates             # 서비스 템플릿
│   ├── /new              # 새 템플릿
│   └── /:id              # 템플릿 편집
│
├── /community             # 커뮤니티 콘텐츠 관리
│   ├── /                 # 승인 대기 목록
│   └── /:id              # 콘텐츠 심사
│
├── /forced-items          # 강제 콘텐츠 관리
│   └── /settings         # 강제 콘텐츠 정책
│
└── /analytics             # HQ 콘텐츠 분석
    ├── /downloads        # 다운로드 통계
    └── /engagement       # 참여도 분석
```

---

## 5. Store Routes (최종)

**Host**: `{service}.domain.com`
**Guard**: `StoreSignageGuard`

```
/signage/store
├── /                      # 매장 대시보드
│   ├── 오늘의 스케줄
│   ├── 디스플레이 상태
│   ├── 신규 HQ 콘텐츠 알림
│   └── 빠른 작업
│
├── /playlists             # 내 플레이리스트
│   ├── /new              # 새 플레이리스트
│   └── /:id              # 플레이리스트 편집
│
├── /global                # 글로벌 콘텐츠 브라우저
│   ├── /                 # 전체 (3탭 UI)
│   ├── /hq               # HQ 콘텐츠
│   ├── /supplier         # 공급자 콘텐츠
│   └── /community        # 커뮤니티 콘텐츠
│
├── /media                 # 미디어 라이브러리
│   ├── /upload           # 미디어 업로드
│   └── /:id              # 미디어 상세
│
├── /schedules             # 스케줄 관리
│   ├── /                 # 캘린더 뷰
│   ├── /new              # 새 스케줄
│   └── /:id              # 스케줄 편집
│
└── /devices               # 디바이스 관리
    ├── /                 # 디스플레이 목록
    ├── /new              # 디스플레이 등록
    ├── /:id              # 디스플레이 상세
    └── /channels         # 채널 관리
```

---

## 6. Guard 적용

### 6.1 Admin Routes

```tsx
// apps/admin-dashboard/src/pages/digital-signage/DigitalSignageRouter.tsx

<AdminSignageGuard>
  <Routes>
    <Route path="monitoring" element={<SystemDashboard />} />
    <Route path="settings" element={<SystemSettings />} />
    {/* ... */}
  </Routes>
</AdminSignageGuard>
```

### 6.2 Operator Routes

```tsx
// apps/{service}-web/src/pages/signage/HQRouter.tsx

<OperatorSignageGuard serviceKey="pharmacy">
  <Routes>
    <Route path="/" element={<HQDashboard />} />
    <Route path="playlists" element={<HQPlaylistList />} />
    {/* ... */}
  </Routes>
</OperatorSignageGuard>
```

### 6.3 Store Routes

```tsx
// apps/{service}-web/src/pages/signage/StoreRouter.tsx

<StoreSignageGuard organizationId={currentOrganizationId}>
  <Routes>
    <Route path="/" element={<StoreDashboard />} />
    <Route path="playlists" element={<StorePlaylistList />} />
    {/* ... */}
  </Routes>
</StoreSignageGuard>
```

---

## 7. API 라우트 매핑

| Frontend Route | API Endpoint | Guard |
|---------------|--------------|-------|
| Admin /monitoring | GET /api/signage/admin/stats | Admin |
| Admin /settings | PATCH /api/signage/admin/settings | Admin |
| HQ /playlists | POST /api/signage/:serviceKey/hq/playlists | Operator |
| HQ /media | POST /api/signage/:serviceKey/hq/media | Operator |
| Store /playlists | GET /api/signage/:serviceKey/playlists | Store |
| Store /global/* | GET /api/signage/:serviceKey/global/* | Store (Read) |
| Store /*/clone | POST /api/signage/:serviceKey/*/clone | Store |

---

## 8. 네비게이션 메뉴 구조

### 8.1 Admin Sidebar

```
Digital Signage
├── 모니터링
├── 설정
├── 확장 앱
├── 공급자 관리
├── 분석
└── 운영
    ├── 대시보드
    ├── 히스토리
    └── 문제 추적
```

### 8.2 Operator (HQ) Sidebar

```
사이니지 관리
├── 대시보드
├── 플레이리스트
├── 미디어
├── 템플릿
├── 커뮤니티
├── 강제 콘텐츠
└── 분석
```

### 8.3 Store Sidebar

```
사이니지
├── 대시보드
├── 내 플레이리스트
├── 글로벌 콘텐츠
│   ├── HQ
│   ├── 공급자
│   └── 커뮤니티
├── 미디어
├── 스케줄
└── 디바이스
```

---

## 9. 마이그레이션 가이드

### 9.1 Admin에서 접근 시

| 이전 URL | 새 URL | 동작 |
|----------|--------|------|
| /digital-signage/v2/monitoring | /digital-signage/monitoring | 리다이렉트 |
| /digital-signage/preview/hq | N/A | 안내 메시지 |
| /digital-signage/preview/store/* | N/A | 안내 메시지 |
| /digital-signage/templates | N/A | 안내 메시지 |

### 9.2 사용자 안내 메시지

```
"이 기능은 Service Frontend로 이동되었습니다.
HQ 콘텐츠 관리: /signage/hq
매장 콘텐츠 관리: /signage/store"
```

---

## 10. 관련 문서

- [Role Structure V3](./ROLE-STRUCTURE-V3.md)
- [Role Access Policy V1](./ROLE-ACCESS-POLICY-V1.md)
- [Signage Menu Map V1](./SIGNAGE-MENU-MAP-V1.md)

---

*Last Updated: 2026-01-17*
