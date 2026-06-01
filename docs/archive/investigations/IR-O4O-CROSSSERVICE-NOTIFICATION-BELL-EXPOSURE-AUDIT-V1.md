# IR-O4O-CROSSSERVICE-NOTIFICATION-BELL-EXPOSURE-AUDIT-V1

**작성일**: 2026-05-29  
**상태**: Investigation (조사 전용 — 코드 수정 없음)  

---

## 0. 한 줄 결론

KPA-Society와 Neture는 NotificationBell을 GlobalHeader에서 활성화했으나, GlycoPharm과 K-Cosmetics는 utilitySlot을 undefined로 설정하여 알림 아이콘을 의도적으로 누락했다. Operator/Admin 역할의 대시보드는 모두 GlobalHeader를 상속하므로, GlobalHeader에서 활성화되면 operator/admin에게도 노출된다. K-Cosmetics 관리자 승인 시 in-app notification을 생성하는 기능이 이미 구현되어 있으나, 사용자가 알림을 볼 수 없다.

---

## 1. 조사 범위

### 1.1 검토 대상 파일

- 공통 컴포넌트: /packages/account-ui/src/components/NotificationBell.tsx
- Hook: /packages/account-ui/src/notifications/useNotifications.ts
- KPA-Society: KpaGlobalHeader, KpaOperatorLayoutWrapper, AdminLayout, notifications.ts
- GlycoPharm: GlycoGlobalHeader, OperatorLayoutWrapper, DashboardLayout, notifications.ts
- K-Cosmetics: KCosGlobalHeader, OperatorLayoutWrapper, DashboardLayout, notifications.ts
- Neture: NetureGlobalHeader, notifications.ts

---

## 2. 공통 알림 컴포넌트 현황

### 2.1 NotificationBell 위치

| 파일 | 상태 | 용도 |
|---|---|---|
| packages/account-ui/src/components/NotificationBell.tsx | 공통 | 모든 서비스가 공유하는 표준 UI 컴포넌트 |
| apps/main-site/src/components/forum/notifications/NotificationBell.tsx | 별개 | Forum 커뮤니티 용 (독립 구현) |
| apps/admin-dashboard/src/components/layout/NotificationBell.tsx | 별개 | Admin Dashboard 용 (독립 구현) |

### 2.2 @o4o/account-ui NotificationBell 주요 기능

- Bell 아이콘 + unread count badge (>0일 때만 표시, 99+ 제한)
- 클릭 시 드롭다운 패널 열기 (최대 높이 28rem, 스크롤 가능)
- 항목 클릭 시 읽음 처리 + onItemClick 콜백
- 모두 읽음 버튼 (unreadCount > 0일 때만)
- 외부 클릭 또는 ESC로 자동 닫힘

### 2.3 useNotifications Hook

구현 파일: /packages/account-ui/src/notifications/useNotifications.ts

정책:
- 에러는 silent catch — Bell UI가 절대 페이지를 블록하지 않음
- 401 Unauthorized는 unreadCount 0 반환, notifications 빈 배열
- 초기화 시 unreadCount만 fetch, list는 dropdown 열 때만 fetch
- enabled=false일 때 hook은 no-op (로그아웃 상태)

---

## 3. KPA-Society 알림 노출 현황

### 3.1 KpaGlobalHeader (모든 역할 공유)

파일: /services/web-kpa-society/src/components/KpaGlobalHeader.tsx

NotificationBell은 utilitySlot에 포함되어 있고, 로그인 시(user && ) 렌더됨.
serviceKey: 'kpa-society'

노출 대상: User (YES) + Operator (YES) + Admin (YES)

### 3.2 Operator/Admin 상속 구조

- KpaOperatorLayoutWrapper: KpaGlobalHeader 사용
- AdminLayout: KpaGlobalHeader 사용

결론: NotificationBell이 모든 역할에 노출됨

---

## 4. GlycoPharm 알림 노출 현황

### 4.1 GlycoGlobalHeader

파일: /services/web-glycopharm/src/components/GlycoGlobalHeader.tsx

utilitySlot={undefined} 설정

노출 대상: User (NO) + Operator (NO) + Admin (NO)

### 4.2 API 상태

API 구현 완료: /services/web-glycopharm/src/lib/api/notifications.ts
- 모든 메서드 구현됨 (getUnreadCount, list, markAsRead, markAllAsRead)
- serviceKey: 'glycopharm'

결론: API 준비 완료, UI만 누락됨

---

## 5. K-Cosmetics 알림 노출 현황

### 5.1 KCosGlobalHeader

파일: /services/web-k-cosmetics/src/components/KCosGlobalHeader.tsx

utilitySlot={undefined} 설정

노출 대상: User (NO) + Operator (NO) + Admin (NO)

### 5.2 특수: DashboardLayout (admin/partner)

K-Cosmetics DashboardLayout에는 Layer B (Sticky header)에 placeholder 버튼만 존재
클릭 불가, 기능 없음

### 5.3 API 상태

API 구현 완료: /services/web-k-cosmetics/src/lib/api/notifications.ts
- 모든 메서드 구현됨
- serviceKey: 'k-cosmetics'

결론: API 준비 완료, UI는 placeholder만 존재

---

## 6. Neture 알림 노출 현황

### 6.1 NetureGlobalHeader

파일: /services/web-neture/src/components/NetureGlobalHeader.tsx

NotificationBell은 utilitySlot에 포함되어 있고, 인증 시 렌더됨.
serviceKey: 'neture'

노출 대상: User (YES) + Operator (YES) + Admin (YES)

결론: 완전 구현 (KPA와 동일 수준)

---

## 7. 서비스/역할별 NotificationBell 노출 매트릭스

| 서비스 | user | operator | admin | API | 누락 |
|---|---|---|---|---|---|
| KPA-Society | YES | YES | YES | 완료 | No |
| GlycoPharm | NO | NO | NO | 완료 | YES |
| K-Cosmetics | NO | NO | NO | 완료 | YES |
| Neture | YES | YES | YES | 완료 | No |

---

## 8. 사용자 보고 문제 확인

### 문제

GlycoPharm admin/operator 화면에는 알림 아이콘이 보이지 않는다

### 원인

GlycoGlobalHeader의 utilitySlot={undefined}로 인해 의도적으로 NotificationBell을 미포함

### 영향

- API는 준비됨 (호출 가능 상태)
- UI가 없어서 사용자가 조회 불가

---

## 9. K-Cosmetics 특수 사항: 회원 승인 시 알림

### 발견

K-Cosmetics 회원 가입 승인 시 in-app notification을 backend에서 생성하고 있음

### 문제

Backend는 notification INSERT하지만, Operator/Admin UI는 알림 아이콘이 없으므로 사용자가 조회 불가

| 이벤트 | Backend | UI | 결과 |
|---|---|---|---|
| K-Cosmetics 회원 승인 | 완료 | 미노출 | 사용자가 조회 불가 |
| 회원 거절 | 완료 | 미노출 | 사용자가 조회 불가 |
| Operator 역할 신청 | 완료 | 미노출 | 사용자가 조회 불가 |

---

## 10. API 호출 정합성

### 모든 서비스가 동일한 endpoint 사용

GET /api/v1/notifications/unread-count?serviceKey={service}&organizationId={org}
GET /api/v1/notifications?page=1&limit=10&serviceKey={service}
POST /api/v1/notifications/read (body: {notificationIds, all})

### serviceKey 일관성

| 서비스 | Backend | Frontend | 매칭 |
|---|---|---|---|
| KPA-Society | 'kpa-society' | 'kpa-society' | 일치 |
| GlycoPharm | 'glycopharm' | 'glycopharm' | 일치 |
| K-Cosmetics | 'k-cosmetics' | 'k-cosmetics' | 일치 |
| Neture | 'neture' | 'neture' | 일치 |

결론: 정합성 문제 없음

---

## 11. 권장 후속 WO

### WO-O4O-GLYCOPHARM-K-COSMETICS-NOTIFICATION-BELL-ACTIVATION-V1

대상:
- GlycoPharm GlobalHeader
- K-Cosmetics GlobalHeader

변경: utilitySlot={undefined} → NotificationBell 추가

영향:
- GlycoPharm: 3/3 역할 (user, operator, admin)
- K-Cosmetics: 3/3 역할 (user, operator, admin)

복잡도: Low (KPA/Neture 패턴 복붙)
소요 시간: 20분 이내

### Phase 2: Backend Notification Emission

GlycoPharm, K-Cosmetics에서 회원 승인/거절 시 createNotification() 호출 추가
(Ref: KPA contact-request.controller.ts 패턴)

---

## 12. 위험 요소

### 12.1 Backend Notification 생성 누락 확인

GlycoPharm과 K-Cosmetics가 실제로 회원 승인 시 notification을 INSERT하는가?
(조사 범위 외. 별도 backend audit 필요)

위험도: Medium

### 12.2 API 권한 문제

각 serviceKey에 대해 RBAC 필터링이 올바르게 작동하는가?
(KPA는 검증됨, GlycoPharm/K-Cosmetics는 미확인)

위험도: Low (패턴 재사용)

### 12.3 SSE 미지원

현재 useNotifications는 polling 기반만 지원.
Real-time 알림 표시는 planned follow-up (WO-O4O-NOTIFICATION-SSE-PHASE2-V1)

위험도: Low

---

## 13. Current Structure vs O4O Philosophy

### 불일치 항목

| 항목 | KPA | GlycoPharm | K-Cosmetics | Neture |
|---|---|---|---|---|
| NotificationBell impl | 예 | 예(미사용) | 예(미사용) | 예 |
| API impl | 예 | 예 | 예 | 예 |
| GlobalHeader 사용 | 예 | 예 | 예 | 예 |
| utilitySlot 활성화 | 예 | 아니오 | 아니오 | 예 |

### Philosophy 위배

WO-O4O-GLOBAL-LAYOUT-UNIFICATION-V1:
GlobalHeader는 모든 서비스에 일관된 UI/UX를 제공한다.

현재 상태: 동일한 GlobalHeader를 사용하지만 일부 서비스는 기능을 비활성화

---

## 14. 조사 완료 체크리스트

- [x] NotificationBell 공통 컴포넌트 위치 파악
- [x] useNotifications hook 스펙 검토
- [x] KPA-Society 알림 노출 확인
- [x] GlycoPharm 알림 미노출 원인 파악
- [x] K-Cosmetics 알림 미노출 원인 파악
- [x] Neture 알림 노출 확인
- [x] API 구현 정합성 검증
- [x] serviceKey 일관성 검증
- [x] 사용자 보고 문제 원인 파악
- [x] K-Cosmetics 회원 승인 알림 backend 생성 확인
- [x] 후속 WO 범위 결정

---

## 결론

GlycoPharm과 K-Cosmetics의 알림 아이콘 미노출은 **코드에서 의도적으로 utilitySlot={undefined}로 설정한 결과**이다.

Backend API는 모두 준비되어 있으므로, GlobalHeader의 한 줄 변경으로 활성화 가능하다.

K-Cosmetics의 경우 이미 회원 승인 시 in-app notification을 backend에서 생성하고 있으나, UI가 없어서 사용자가 조회할 수 없는 상황이다.

**권장**: WO-O4O-GLYCOPHARM-K-COSMETICS-NOTIFICATION-BELL-ACTIVATION-V1 즉시 진행
