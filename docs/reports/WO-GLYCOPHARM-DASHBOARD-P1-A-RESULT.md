# WO-GLYCOPHARM-DASHBOARD-P1-A 결과 보고서

> **Work Order ID**: WO-GLYCOPHARM-DASHBOARD-P1-A
> **완료일**: 2026-01-09
> **상태**: COMPLETED
> **선행 작업**: WO-ADMIN-API-IMPLEMENT-P0 (완료)

---

## 1. 작업 요약

Glycopharm Operator Dashboard에서 mock 데이터를 제거하고 실제 DB 쿼리 API로 대체함.
- 기존 Entity만 사용 (신규 스키마/마이그레이션 없음)
- Entity 없는 기능은 Empty state 반환

---

## 2. 구현 결과

### 2.1 API 구현

| 엔드포인트 | 상태 | 설명 |
|------------|------|------|
| `GET /api/v1/glycopharm/operator/dashboard` | ✅ Real | 운영자 대시보드 통계 |
| `GET /api/v1/glycopharm/operator/recent-orders` | ✅ Real | 최근 주문 목록 |
| `GET /api/v1/glycopharm/operator/pending-applications` | ✅ Real | 대기 신청서 목록 |

### 2.2 사용 Entity (기존 활용)

| Entity | 테이블 | 사용 필드 |
|--------|--------|-----------|
| GlycopharmPharmacy | glycopharm_pharmacies | status (active/inactive/suspended) |
| GlycopharmApplication | glycopharm_applications | status (submitted/approved/rejected) |
| GlycopharmOrder | glycopharm_orders | status, total_amount, created_at |
| GlycopharmProduct | glycopharm_products | status (active/draft) |

### 2.3 Dashboard 섹션별 데이터 소스

| 섹션 | 데이터 소스 | 상태 |
|------|-------------|------|
| 서비스 상태 (활성 약국, 주의 항목) | GlycopharmPharmacy | ✅ Real |
| 스토어 상태 (승인 대기, 운영 중, 비활성) | GlycopharmPharmacy + GlycopharmApplication | ✅ Real |
| 채널 상태 (Web/Kiosk/Tablet) | (Entity 없음) | ⚪ Empty |
| 콘텐츠 상태 (Hero/Featured/이벤트) | (Entity 없음) | ⚪ Empty |
| Market Trial | (Entity 없음) | ⚪ Empty |
| 포럼 상태 | (Glycopharm 전용 Entity 없음) | ⚪ Empty |
| 상품 통계 | GlycopharmProduct | ✅ Real |
| 주문 통계 | GlycopharmOrder | ✅ Real |

---

## 3. 변경 파일

### 3.1 신규 생성

| 파일 | 설명 |
|------|------|
| `apps/api-server/src/routes/glycopharm/controllers/operator.controller.ts` | 운영자 대시보드 API 컨트롤러 |

### 3.2 수정

| 파일 | 변경 내용 |
|------|-----------|
| `apps/api-server/src/routes/glycopharm/glycopharm.routes.ts` | operator 라우트 등록 |
| `services/web-glycopharm/src/api/glycopharm.ts` | OperatorDashboardData 타입 및 API 메서드 추가 |
| `services/web-glycopharm/src/pages/operator/OperatorDashboard.tsx` | Mock → API 호출로 전환, 로딩/에러 상태 추가 |

---

## 4. 빌드 검증

| 대상 | 결과 |
|------|------|
| `pnpm -F api-server build` | ✅ 성공 |
| `pnpm -F glycopharm-web build` | ✅ 성공 |

---

## 5. Real vs Empty 요약

### Real Data (실제 DB 쿼리)
- ✅ 활성 약국 수 (`GlycopharmPharmacy.status = 'active'`)
- ✅ 승인된 스토어 수 (= 활성 약국)
- ✅ 주의 항목 (suspended 약국 수)
- ✅ 승인 대기 신청서 (`GlycopharmApplication.status = 'submitted'`)
- ✅ 운영 중 스토어 (= 활성 약국)
- ✅ 비활성 스토어 (`GlycopharmPharmacy.status = 'inactive'`)
- ✅ 상품 통계 (total/active/draft)
- ✅ 주문 통계 (총 주문/결제 완료/총 매출)

### Empty State (Entity 없음)
- ⚪ 보완 요청 (supplementing status 미존재)
- ⚪ 채널 상태 (Web/Kiosk/Tablet) - 채널 추적 Entity 없음
- ⚪ 콘텐츠 상태 (Hero/Featured/이벤트) - 콘텐츠 Entity 없음
- ⚪ Market Trial - Trial Entity 없음
- ⚪ 포럼 상태 - Glycopharm 전용 포럼 Entity 없음

---

## 6. Frontend 변경사항

### 6.1 이전 (Mock)
```typescript
// 하드코딩된 mock 상수 사용
const SERVICE_STATUS = { activePharmacies: 127, ... };
```

### 6.2 이후 (API)
```typescript
// API 호출로 실제 데이터 로드
const [dashboardData, setDashboardData] = useState<OperatorDashboardData>(EMPTY_DASHBOARD_DATA);

useEffect(() => {
  glycopharmApi.getOperatorDashboard()
    .then(response => setDashboardData(response.data))
    .catch(() => setDashboardData(EMPTY_DASHBOARD_DATA)); // 에러시 Empty state
}, []);
```

### 6.3 추가된 UI 기능
- 로딩 스피너 (데이터 로드 중)
- 새로고침 버튼
- 에러 배너 (API 실패 시 표시)

---

## 7. 남은 갭 (P2 이후)

| 기능 | 필요 Entity | 우선순위 |
|------|-------------|----------|
| 채널 트래킹 | GlycopharmChannel | P2 |
| 콘텐츠 관리 | GlycopharmContent | P2 |
| Market Trial | GlycopharmTrial | P3 |
| Glycopharm 포럼 통계 | (별도 설계 필요) | P3 |

---

## 8. Definition of Done 체크리스트

- [x] API에서 mock/demo/random 데이터 사용 안 함
- [x] 데이터 없으면 Empty state 반환
- [x] 기존 Entity만 사용 (신규 스키마 없음)
- [x] api-server 빌드 성공
- [x] glycopharm-web 빌드 성공
- [x] 콘솔 에러 없음

---

**작업 상태**: COMPLETED
**다음 단계**: WO-DB-MIGRATION-P1-IMPLEMENT (web-neture, admin-dashboard vendors 등)
