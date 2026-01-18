# WO-KPA-GROUPBUY-SUPPLIER-STATS-DRYRUN-V1 결과 보고서

## 작업 개요

- **Work Order**: WO-KPA-GROUPBUY-SUPPLIER-STATS-DRYRUN-V1
- **목적**: 공급자 통계 API 연계 가능성 드라이런 검증
- **작업일**: 2026-01-18
- **상태**: 완료 (Mock 모드)

---

## 1. 연계 가능 여부

### 결론: **조건부 가능**

현재 Mock 모드로 드라이런 구조를 완성하였으며, 실제 공급자 API 제공 시 즉시 연계 가능한 상태입니다.

---

## 2. 구현 완료 항목

### 2-1. Backend (api-server)

| 파일 | 설명 |
|------|------|
| `routes/kpa/services/supplier-stats.service.ts` | 공급자 통계 연계 서비스 (캐시, 폴백 처리) |
| `routes/kpa/controllers/groupbuy-operator.controller.ts` | 통계 API 업데이트, 공급자 상태 확인 엔드포인트 추가 |

**API 엔드포인트:**
- `GET /api/v1/kpa/groupbuy-admin/stats` - 통계 조회 (공급자 연계 + 캐시)
- `GET /api/v1/kpa/groupbuy-admin/supplier-status` - 공급자 연계 상태 확인

### 2-2. Frontend (web-kpa-society)

| 파일 | 설명 |
|------|------|
| `api/supplierStats.ts` | 공급자 통계 API 클라이언트 (검증 로직 포함) |
| `api/groupbuyAdmin.ts` | 공급자 상태 API 타입 추가 |

---

## 3. 검증 체크리스트

### 3-1. 정상 케이스

- [x] Mock 모드 API 호출 성공 (200)
- [x] 응답 필드가 **집계 데이터만 포함** (validateAggregateOnly 함수)
- [x] UI에서 정상 표시
- [x] `cachedAt / cacheValidUntil` 정상 처리

### 3-2. 실패 케이스

- [x] API 실패 시: "통계 집계 중입니다. 잠시 후 다시 시도해 주세요." 표시
- [x] 네트워크 타임아웃 시: 이전 캐시 표시 + 경고 배너
- [x] 빈 데이터 응답 시: "집계 데이터가 없습니다" 표시

### 3-3. 성능/지연

- [x] Mock 응답 시간: ~500ms (설정값)
- [x] 30분 캐시 정책 유지
- [x] 반복 조회 시 캐시 히트로 과도한 호출 방지

---

## 4. 집계 범위 검증

### 검증 대상 필드 (금지)

```typescript
const FORBIDDEN_FIELDS = [
  'orderid', 'order_id', 'orderids',
  'pharmacyid', 'pharmacy_id', 'pharmacyids',
  'amount', 'price', 'totalamount', 'orderamount',
  'membername', 'pharmacyname', 'address',
];
```

### 검증 결과

- **Mock 데이터**: 금지 필드 없음 ✅
- **validateAggregateOnly()** 함수로 자동 검증

---

## 5. 공급자 API 연계 요구사항

실제 연계 시 공급자 측에서 제공해야 할 항목:

### 5-1. 인증

- [ ] API Key 또는 OAuth2 토큰
- [ ] IP 화이트리스트 (필요 시)

### 5-2. 엔드포인트

```
GET /supplier/groupbuy/stats

Query Parameters:
- groupbuy_id (optional)
- from_date (YYYY-MM-DD)
- to_date (YYYY-MM-DD)
- granularity: 'daily' | 'total'
```

### 5-3. 응답 형식

```json
{
  "totalOrders": 0,
  "totalPharmacies": 0,
  "daily": [
    { "date": "2026-01-18", "orderCount": 0, "pharmacyCount": 0 }
  ],
  "byProduct": [
    { "productId": "xxx", "productName": "xxx", "orderCount": 0 }
  ],
  "dataAsOf": "2026-01-18T00:00:00Z"
}
```

**금지 필드 (응답에 포함되면 안 됨):**
- 개별 주문 ID
- 약국 식별자 (이름, 주소 등)
- 금액 정보

---

## 6. 약사회 서비스 측 추가 수정 필요 여부

### 필요 없음 ✅

현재 구조로 공급자 API 연계 시 수정 없이 환경변수만 설정하면 됩니다.

```typescript
// supplier-stats.service.ts에서 환경변수 설정만 추가
this.supplierBaseUrl = process.env.SUPPLIER_STATS_API_URL;
this.mode = this.supplierBaseUrl ? 'connected' : 'mock';
```

---

## 7. 다음 단계

| 단계 | 조건 | 작업 |
|------|------|------|
| 실연계 테스트 | 공급자 테스트 엔드포인트 제공 시 | 환경변수 설정 + 실호출 검증 |
| 프로덕션 연계 | 실연계 테스트 통과 시 | 인증 설정 + 모니터링 |

---

## 8. 파일 목록

### 신규 생성

- `apps/api-server/src/routes/kpa/services/supplier-stats.service.ts`
- `services/web-kpa-society/src/api/supplierStats.ts`
- `docs/work-orders/WO-KPA-GROUPBUY-SUPPLIER-STATS-DRYRUN-V1-RESULT.md`

### 수정

- `apps/api-server/src/routes/kpa/controllers/groupbuy-operator.controller.ts`
- `services/web-kpa-society/src/api/groupbuyAdmin.ts`

---

## 9. 빌드 검증

- [x] API 서버 빌드 성공
- [x] web-kpa-society 빌드 성공

---

*작성자: Claude Code*
*작성일: 2026-01-18*
