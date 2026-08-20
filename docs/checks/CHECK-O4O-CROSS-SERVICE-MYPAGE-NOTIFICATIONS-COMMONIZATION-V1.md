# CHECK-O4O-CROSS-SERVICE-MYPAGE-NOTIFICATIONS-COMMONIZATION-V1

> WO: `docs/work-orders/WO-O4O-CROSS-SERVICE-MYPAGE-NOTIFICATIONS-COMMONIZATION-V1.md`
> 판정: **CLOSED_WITH_FOLLOWUPS** (MUST_FIX_BEFORE_CLOSE 1건 = 타 트랙 소관 · §21 참조)
> 작성일: 2026-08-20

---

## 1. 기준 commit

| 항목 | 값 |
|---|---|
| 기준(착수) commit | `9df0b693c` |
| 구현 commit | `55582fea1` (16 files, +631 / -266) |
| 후속 commit | `858c0c043` — PH `/account` 벨 모바일 전용 제한 (프로덕션 데스크톱 검증 결과 반영) |
| CHECK commit | 본 문서 |
| 배포 | `deploy-web-services` run `32322264908` — 5 서비스 전부 success (KPA / GlycoPharm / K-Cosmetics / Neture / Pharmacy-Hub) |

백엔드(`apps/api-server`) 변경 0 — 이번 WO 는 사용자 표시 계층만 다뤘다.

---

## 2. 5서비스 Notifications 모집단

| 서비스 | 데스크톱 진입 | 모바일 진입 | 데이터 어댑터 |
|---|---|---|---|
| KPA-Society | `KpaGlobalHeader` utilitySlot `NotificationBell` | `MobileBottomNav` 알림 탭 | `src/lib/api/notifications.ts` |
| GlycoPharm | `GlycoGlobalHeader` utilitySlot | `MobileBottomNav` 알림 탭 | 동형 |
| K-Cosmetics | `KCosGlobalHeader` utilitySlot | `MobileBottomNav` 알림 탭 | 동형 |
| Neture | `NetureGlobalHeader` utilitySlot | `NetureBottomNav` 알림 탭 | 동형 |
| Pharmacy-Hub | `PharmacyHubGlobalHeader` utilitySlot | `/account`(MyPageShell headerActions) — 하단 nav 없음 | 동형 |

공통 `GlobalHeader` 의 `utilitySlot` 은 `hidden md:flex` 안에서만 렌더된다 → 모바일 진입은 하단 nav(4서비스) 또는 `/account`(PH) 가 유일하다.

---

## 3. 16기능 census (미조사 0)

`O` 구현 · `X` 미구현 · `-` 해당 없음

| # | 기능 | KPA | GP | KCos | Neture | PH | 판정 |
|---|---|:--:|:--:|:--:|:--:|:--:|---|
| 1 | 알림 목록 | O | O | O | O | O | FULLY_COMMON (`NotificationListBody`) |
| 2 | 알림 카운트(unread-count) | O | O | O | O | O | FULLY_COMMON (`useNotifications`) |
| 3 | 알림 상세 화면 | X | X | X | X | X | **NOT_IMPLEMENTED (플랫폼 전역)** — 상세 API 자체가 없다 |
| 4 | 단건 읽음 | O | O | O | O | O | FULLY_COMMON |
| 5 | 전체 읽음 | O | O | O | O | O | FULLY_COMMON |
| 6 | unread 배지 | O | O | O | O | O | 데스크톱=`NotificationBell`, 모바일=`NotificationTabBadge` |
| 7 | 알림 → deep link | O | O | O | O | O | `resolveNotificationTarget` 단일 정본 |
| 8 | 알림 삭제 | X | X | X | X | X | **NOT_IMPLEMENTED** — `/api/v1/notifications` 에 DELETE 없음 |
| 9 | 알림 유형 라벨 표시 | X | X | X | X | X | **NOT_IMPLEMENTED** — 어느 서비스도 `type` 을 라벨로 렌더하지 않는다 |
| 10 | 상대 시각 표기 | O | O | O | O | O | `formatRelativeTime` 로 3중복 수렴 |
| 11 | loading 표시 | O | O | O | O | O | FULLY_COMMON |
| 12 | empty 표시 | O | O | O | O | O | FULLY_COMMON |
| 13 | error 표시 | X | X | X | X | X | 조회 실패가 빈 목록으로 삼켜진다 (§14 · §20 참조) |
| 14 | 모바일 시트 | O | O | O | O | - | `NotificationSheet` (PH 는 하단 nav 없음) |
| 15 | 알림 설정 진입 | O | - | - | - | - | KPA `MySettingsPage` 만 = SERVICE_SPECIFIC |
| 16 | SSE 실시간 수신 | X | X | X | X | X | backend `GET /stream` 존재 · 프론트 소비 0 |

미조사 = 0 (16 × 5 = 80 칸 전부 판정).

`apps/admin-dashboard/**` · `apps/main-site/**` = **OUT_OF_SCOPE** (부기 F). 근거: 두 앱은 5서비스 My Page 모집단이 아니며 별도 셸·별도 배포 대상이다. 이번 WO 는 해당 경로를 한 줄도 수정하지 않았다.

---

## 4. backend / API 계약

`apps/api-server/src/routes/notifications.routes.ts` 실측:

```text
GET  /api/v1/notifications/stream        (SSE)
GET  /api/v1/notifications
GET  /api/v1/notifications/unread-count
POST /api/v1/notifications/read
```

- 5서비스 전부 **동일 계약 1개**를 `serviceKey` 쿼리로 스코프해 소비한다 → WO §6 **case A**.
- 상세 조회 API 없음 · 삭제 API 없음 → census 3 · 8 의 `NOT_IMPLEMENTED` 근거.
- `ForumNotification` 은 별도 엔티티 · 별도 라우트(`/api/v1/forum/notifications/*`, DELETE 보유)이며 `services/**` 소비처 **0** 이다. 부기 D 에 따라 **병합하지 않았고**, census 에는 "사용자에게 보이지 않음"으로만 기록한다 → WO §6 case B (adoption gap).
- 신규 endpoint **0건** 생성.

---

## 5. Before / After

| 항목 | Before | After |
|---|---|---|
| 목록 본문 마크업 | `NotificationBell` 내부 인라인 + 모바일 시트 2벌 | `NotificationListBody` 1벌 |
| 모바일 시트 | KPA · Neture 2벌 중복 | `NotificationSheet` 1벌 (4서비스 소비) |
| 상대 시각 | 3벌 중복 | `formatRelativeTime` 1벌 |
| deep link 해석 | 5벌 (그중 4벌은 내부 경로 가드 없음) | `resolveNotificationTarget` 1벌 + 서비스 fallback 주입 |
| GP 모바일 알림 탭 | `/mypage` 로 가는 **dead link** (활성 판정식이 영구 false) | 실제 알림 시트 |
| KCos 모바일 알림 탭 | 동일 dead link | 실제 알림 시트 |
| PH `/account` 벨 | `onItemClick` 없음 → 클릭해도 이동 없음 · 기본 비활성 | 클릭 이동 동작 + 모바일 진입점으로 노출 |

---

## 6. 공통 Notifications Core / View

`@o4o/account-ui` **내부 additive 확장만** 수행했다. **신규 패키지 0** (WO §7).

```text
packages/account-ui/src/notifications/NotificationListBody.tsx   (신규)
packages/account-ui/src/notifications/formatRelative.ts          (신규)
packages/account-ui/src/notifications/resolveTarget.ts           (신규)
packages/account-ui/src/components/NotificationSheet.tsx         (신규 · NotificationTabBadge 동거)
packages/account-ui/src/components/NotificationBell.tsx          (인라인 목록 → NotificationListBody 위임)
packages/account-ui/src/index.ts                                 (export 추가)
```

기존 공통 자산(`NotificationBell` · `useNotifications` · `notifications/types.ts`)은 **이미 5서비스가 소비 중**이었으므로 `CORE_ONLY` 가 아니다 (부기 B 판정 기준 적용).

---

## 7. View model / adapter

- 데이터 계약은 기존 `NotificationApiClient` (transport 비의존) 그대로. 변경 0.
- 서비스별 `notificationsApi` 어댑터는 5벌 유지 — 통합하려면 서비스 config 주입 계약을 새로 만들어야 해서 이번 범위 밖이다 (§20 F-1).

---

## 8. notification type mapping

- 공통 View 안에 `notification.type` 분기 **없음**.
- `type` 은 KPA 의 fallback 경로 해석에서만 쓰이고, 그 코드는 서비스 쪽(`services/web-kpa-society/src/lib/notificationRouting.ts`)에 있다.
- 부기 G 자체 점검 grep 결과 — 공통 View 4파일에서 `serviceKey` / 서비스 route 리터럴 매치 **3건, 전부 주석**. 실코드 분기 **0**.

```text
NotificationSheet.tsx:17      * - 서비스 route / serviceKey 분기 없음. 이동은 onItemClick 이 결정한다.
NotificationListBody.tsx:13   * - serviceKey / notification.type 으로 이 안에서 분기하지 않는다.
resolveTarget.ts:14           * `options.fallback` 으로 주입한다 — 이 파일 안에 서비스 route 나 serviceKey 분기를
```

---

## 9. unread / read

- 단건: 항목 클릭 시 `isRead === false` 인 경우에만 `markAsRead(id)` 호출.
- 전체: 시트/드롭다운 상단 `모두 읽음` → `markAllAsRead()`.
- 5서비스 전부 동일 훅 경유 — 서비스별 read 로직 중복 0.

---

## 10. unread badge

- 데스크톱: `NotificationBell` 내부 배지.
- 모바일: `NotificationTabBadge` (99 초과 시 `99+`, 0 이면 렌더 안 함, `aria-label="읽지 않은 알림 N건"`).
- 색은 서비스별 Tailwind class 주입으로 처리 — 공통 컴포넌트 안에 서비스 분기 없음.

---

## 11. deep link

`resolveNotificationTarget(notification, { fallback? })`:

1. `metadata.targetUrl` 이 **내부 절대 경로**(`/` 시작, `//` · `/\` 아님)면 사용
2. 아니면 서비스가 주입한 `fallback`
3. 둘 다 없으면 `null` → 이동하지 않음

이전에는 4서비스가 `metadata.targetUrl` 을 검증 없이 `navigate()` 에 넘겨 `//host` 같은 protocol-relative 값이 외부로 나갈 수 있었다. 공통 가드로 차단했다.

KPA 고유 fallback(`store.consultation_requested` · `store.tablet*` → `/store/commerce/tablet-displays`, `store.*` → `/store`)은 서비스 파일에 남겨 공통 View 오염을 막았다.

---

## 12. settings 진입

- KPA `MySettingsPage` 의 알림 토글만 존재 = **SERVICE_SPECIFIC** (공통화 대상 아님).
- GlycoPharm operator `SettingsPage` · Neture `EmailNotificationSettingsPage` 는 운영자 화면 = **OUT_OF_SCOPE**.
- WO §13 대로 진입·표시만 확인했고 백엔드 정책·채널 모델은 건드리지 않았다.

---

## 13. Service Extension

서비스 측 잔존 코드는 **주입 지점**뿐이다.

```text
web-kpa-society/src/lib/notificationRouting.ts   KPA fallback 주입
web-neture/src/lib/notificationRouting.ts        공통 resolver 위임(고유 fallback 없음)
각 서비스 MobileBottomNav / GlobalHeader         accent class + notificationsApi 주입
```

---

## 14. empty / loading / error

- empty: `알림이 없습니다.` — 공통 문구, 서비스 override 가능.
- loading: 공통 문구.
- error: **표시 없음** — `useNotifications.refetchList` 의 `catch { setNotifications([]); }` 가 5xx 를 빈 목록으로 삼킨다. WO §18 에 따라 **이번 WO 에서 고치지 않고** followup 으로만 기록한다 (§20 F-2).

---

## 15. 5서비스 adoption

| 서비스 | 데스크톱 | 모바일 | 판정 |
|---|---|---|---|
| KPA-Society | 공통 벨 + 공통 목록 | 공통 시트 | ADOPTED |
| GlycoPharm | 공통 벨 + 공통 목록 | 공통 시트 (dead link 교정) | ADOPTED |
| K-Cosmetics | 공통 벨 + 공통 목록 | 공통 시트 (dead link 교정) | ADOPTED |
| Neture | 공통 벨 + 공통 목록 | 공통 시트 | ADOPTED |
| Pharmacy-Hub | 공통 벨(헤더) | `/account` 벨 (`md:hidden`) | ADOPTED |

빈 페이지 · 더미 알림 · 신규 endpoint · dead entry 생성 **0** (WO §16 · §21).
PH 에 하단 nav 를 새로 만들지 않았다 — 셸/레이아웃 트랙 소관이다.

---

## 16. desktop / mobile

- 데스크톱(1440x900): 헤더 벨 1개만 보인다. 하단 nav 탭은 `md:hidden` 으로 비가시 → 진입점 중복 0.
- 모바일(390x844): 헤더 벨 비가시, 하단 nav 탭(또는 PH `/account` 벨) 1개만 보인다.
- 실측: 각 서비스에서 `aria-label="알림"` 버튼 총 2개 중 **가시 1개**.

---

## 17. production browser (실측)

판정 근거는 **실제 렌더 문자열과 실제 네트워크 응답**이다 (부기 I).

| 서비스 | 폭 | 결과 |
|---|---|---|
| Neture | 1440 | `dialog "알림 목록"` · 실알림 6건 (`신규 상품 등록 요청 접수` / `새 문의가 접수되었습니다` · `2026. 7. 10.`) · notifications API 전부 **200** |
| Neture | 390 | 하단 nav 알림 탭 → 공통 시트 6건 · 가로 overflow 없음 (scrollWidth 390 = clientWidth 390) |
| KPA-Society | 1440 | 헤더 벨 → 시트 10건 (`신규 KPA 회원 가입 신청` 등) |
| KPA-Society | 390 | 하단 nav → 시트 10건 · 항목 클릭 → `/store/requests` 정상 진입 · 하단 nav 유지 |
| GlycoPharm | 1440 | 헤더 벨 → 4건 (`새 문의가 접수되었습니다 [서비스 이용 문의] ...`) |
| GlycoPharm | 390 | 가시 벨 1개(하단 nav 탭) → 시트 4건 · 클릭 → `/admin/contact-inquiries` 정상 |
| K-Cosmetics | 1440 | 헤더 벨 → 5건 |
| K-Cosmetics | 390 | 하단 nav 탭 → 시트 5건 · 클릭 → `/admin/contact-inquiries` 정상 |
| Pharmacy-Hub | 1440 | `/account` 헤더 액션 벨 → `알림이 없습니다.` (알림 0건 · 정상 empty) |
| Pharmacy-Hub | 390 | 가시 벨 1개(`/account` 본문) → 모바일 진입 확보 |

§25 통과 판정:

| 항목 | 결과 |
|---|---|
| 백지 화면 | 0 |
| JS 예외 | 0 (관측된 콘솔 오류는 로그인 전 `auth/me` · `auth/refresh` 401 = 의도된 가드, 그리고 GP 최초 진입의 stale chunk — 캐시 버스트 후 소멸) |
| 예기치 않은 401/403 | 0 |
| 404 | **1건 발견** (Neture · §21 참조) |
| 5xx | 0 |
| dead notification link | **1건 발견** (위 404 와 동일 건) |
| 잘못된 unread count | 0 |
| 잘못된 type label | 0 (type 라벨 자체가 없음 — census 9) |
| 모바일 기능 소실 | 0 (오히려 GP·KCos 2건 복구) |
| 이중 셸 | 0 |

---

## 18. production write

**write 수행 0건.**

- 검증한 모든 계정·서비스에서 `unreadCount = 0` (벨에 배지 없음, 목록 항목 전부 read 상태)이라 `markAsRead` 가 호출될 조건 자체가 성립하지 않았다.
- 삭제 **미수행** (애초에 삭제 API 없음).
- 실사용자 알림 수정 · 운영 알림 삭제 · 알림 강제 생성 · 백엔드 DB 직접 write **전부 없음**.

---

## 19. backend / DB / schema

변경 **0**. 마이그레이션 0. 엔티티 0. 신규 route 0. `apps/api-server` 파일 수정 0.

---

## 20. 잔존 followup

| # | 내용 | 소관 |
|---|---|---|
| F-1 | 서비스별 `notificationsApi` 어댑터 5벌 잔존 — 통합하려면 config 주입 계약 신설 필요 | 별도 WO |
| F-2 | `useNotifications` 의 조회 실패 삼킴(`catch { setNotifications([]); }`) — 5xx 가 "알림 없음"으로 보인다 | **Load-Error 계약 트랙** (WO §18 에 따라 이번 WO 에서 수정 금지) |
| F-3 | `ForumNotification` backend 존재 · 프론트 소비 0 (case B adoption gap) | 별도 WO (부기 D — 병합 시도 금지) |
| F-4 | SSE `GET /notifications/stream` 소비처 0 | 별도 WO |
| F-5 | KPA 클라이언트의 `NOTIFICATION_SERVICE_KEY = 'kpa'` 는 dead (소비처 2곳 모두 `'kpa-society'` 하드코딩) | 별도 WO |
| F-6 | Neture 데스크톱에서 `unread-count` 4회 중복 호출 (헤더 + 하단 nav 각각 훅 마운트) — 이번 WO 이전부터 존재 | 별도 WO |
| F-7 | 저장된 알림 message 일부가 mojibake(`?????`) — DB 인코딩 이슈, 표시 계층 문제 아님 | 별도 WO |

---

## 21. MUST_FIX_BEFORE_CLOSE

**M-1 — Neture 알림 deep link 404 (미해소 · 이번 WO 범위 밖)**

- 재현: Neture `신규 상품 등록 요청 접수` 알림 클릭 → `/admin/o4o-product-db/store-requests` → 404.
- 원인: 생산자 `apps/api-server/src/modules/neture/services/store-product-request-notify.ts:20`
  `const ADMIN_TARGET_URL = '/admin/o4o-product-db/store-requests';`
  이 경로의 실제 화면은 `apps/admin-dashboard`(별도 앱·별도 호스트)에 있고 `services/web-neture` 라우트 트리에는 없다.
- 성격: **이번 WO 이전부터 동일하게 404** 였다 (기존 Neture resolver 도 `metadata.targetUrl` 을 그대로 navigate 했다). 공통화가 만든 결함이 아니다.
- 왜 여기서 안 고쳤나: 수정처가 **백엔드 알림 생산자 계약**(§26 중지 조건) 이거나 `apps/admin-dashboard`(부기 F OUT_OF_SCOPE) 이다. 프론트에 없는 페이지를 새로 만드는 것도 §16 금지다.
- 필요 조치: cross-app deep link 계약(절대 URL 허용 여부 또는 web-neture 측 대응 화면)을 정하는 **별도 WO**.

따라서 본 WO 는 `FINAL CLOSED` 가 아니라 **CLOSED_WITH_FOLLOWUPS** 로 마감한다.

---

## 22. CHECK / commit / push

```text
55582fea1  feat(account-ui): My Page 알림 표시 계층 5서비스 공통화
858c0c043  fix(pharmacy-hub): /account 알림 벨을 모바일 전용으로 제한
(본 CHECK 커밋)
```

- stage 는 전부 path-specific (`git add .` 사용 0). 다른 세션의 dirty·미추적 파일 미접촉.
- push 된 커밋 amend/force-push 0. `858c0c043` 은 타 세션 push(`68d725f0c`) 이후 rebase 후 push 했다.
- 정적 검증: 5서비스 `tsc --noEmit` clean · `@o4o/account-ui` build 성공.

---

문서 정합: 발견 0건 / SUPERSEDED 표기 0건 / 링크 수정 0건 / 별도 WO 제안 8건
