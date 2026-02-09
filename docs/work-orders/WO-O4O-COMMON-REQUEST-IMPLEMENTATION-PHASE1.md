# WO-O4O-COMMON-REQUEST-IMPLEMENTATION-PHASE1

**공통 Request 최소 구현 – Phase 1**

---

## 0. 작업 성격 선언

* 본 작업은 **신규 비즈니스 기능 추가가 아니다**
* 본 작업은 **아키텍처 확장이 아니다**
* 본 작업은 **이미 존재하는 자산을 '연결'하는 작업**이다

> 목표: **"요청(Request)이 시스템 안에서 실제로 생성·대기·승인될 수 있게 만드는 것"**

---

## 1. 작업 목표 (Phase 1)

1. **공통 Request 개념을 실제 엔티티/테이블로 존재하게 한다**
2. **QR / 태블릿에서 Request가 생성될 수 있게 한다**
3. **매장 대시보드에서 Request를 '대기 업무'로 볼 수 있게 한다**

---

## 2. 파일럿 대상

**Glycopharm (글라이코팜)**

선정 이유:
- `PharmacyDashboard.tsx`에 "오늘의 운영" 블록 존재
- 기존 `GlycopharmApplication` 엔티티가 request 패턴 보유
- 약국 현장 시나리오와 가장 직접 연결

---

## 3. 구현 범위

### 포함 ⭕

* 공통 Request 엔티티 1종
* Request 생성 API
* Request 승인/거절 API
* 매장 대시보드 "요청 목록" 최소 UI
* QR purpose 기반 Request 생성 연결

### 제외 ❌

* 자동 승인
* 알림 시스템
* 통합 워크플로우 엔진
* 고급 통계/리포트
* 다단계 승인

---

## 4. 백엔드 작업

### T1: CustomerRequest 엔티티

**테이블**: `glycopharm_customer_requests`

```typescript
{
  id: uuid,
  pharmacyId: uuid,
  purpose: 'consultation' | 'sample' | 'order',
  sourceType: 'qr' | 'tablet' | 'web',
  sourceId: string,
  status: 'pending' | 'approved' | 'rejected' | 'cancelled',
  customerContact?: string,
  requestedAt: timestamp,
  handledBy?: uuid,
  handledAt?: timestamp,
  metadata: jsonb,
  createdAt, updatedAt
}
```

### T2: Request API

| Method | Endpoint | 설명 |
|--------|----------|------|
| POST | `/api/v1/glycopharm/requests` | 요청 생성 |
| GET | `/api/v1/glycopharm/requests` | 목록 조회 (status 필터) |
| PATCH | `/api/v1/glycopharm/requests/:id/approve` | 승인 |
| PATCH | `/api/v1/glycopharm/requests/:id/reject` | 거절 |

### T3: QR 연동

* `qr-landing.controller.ts`에서 purpose 분기
* consultation/sample/order → Request 생성 호출

---

## 5. 프론트엔드 작업

### T4: 대시보드 카드

**위치**: `PharmacyDashboard.tsx` Block 2 (6번째 카드)

* pending 카운트 표시
* 클릭 시 `/pharmacy/requests` 이동

### T5: 요청 목록 페이지

**위치**: `CustomerRequestsPage.tsx`

* 테이블: purpose, sourceType, 요청시각, 상태
* 액션: 승인/거절 버튼

---

## 6. 파일 목록

| 파일 | 작업 |
|-----|------|
| `glycopharm/entities/customer-request.entity.ts` | 신규 |
| `glycopharm/controllers/customer-request.controller.ts` | 신규 |
| `glycopharm/routes/customer-request.routes.ts` | 신규 |
| `cosmetics-partner-extension/.../qr-landing.controller.ts` | 수정 |
| `web-glycopharm/.../PharmacyDashboard.tsx` | 수정 |
| `web-glycopharm/.../CustomerRequestsPage.tsx` | 신규 |

---

## 7. 완료 기준 (DoD)

- [ ] QR(consultation/sample/order) 스캔 → Request 생성
- [ ] 매장 대시보드에 pending 카운트 표시
- [ ] 승인/거절 시 상태 변경 기록
- [ ] 빌드 성공

---

## 8. 다음 단계 (Phase 2)

* Event(Impression/Click) 표준 로깅 연결
* 승인 후 후속 액션 자동 연결
* Request → Order 전환 규칙
* 통계/퍼널 연결

---

### 상태

* Phase: 1
* 우선순위: 높음
* 작성일: 2026-02-09
