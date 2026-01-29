# WO-S2S-FLOW-RECOVERY-PHASE1-V1: 판매자 취급 요청 흐름 복구

## 핵심 발견

WO에서 언급한 `cosmetics_supplier_approvals` 테이블의 API는 **main.ts에서 비활성(disabled)** 상태.
대신 **Neture 모듈**의 `neture_supplier_requests` 테이블이 이미 **활성 상태로 마운트**되어 있음:
- `POST /api/v1/neture/supplier/requests` — 생성 (테스트/시드용, 인증 없음)
- `GET /api/v1/neture/supplier/requests` — 목록 조회 (인증 있음)
- `POST /api/v1/neture/supplier/requests/:id/approve` — 승인 (인증 있음)
- `POST /api/v1/neture/supplier/requests/:id/reject` — 거절 (인증 있음)

**결정: 활성화된 Neture 모듈의 기존 API를 사용한다.**

---

## 변경 대상 파일

| # | 파일 | 변경 |
|---|------|------|
| 1 | `apps/api-server/src/modules/neture/neture.routes.ts` | POST 엔드포인트에 인증 추가 + 중복 방지 |
| 2 | `apps/api-server/src/modules/neture/neture.service.ts` | `createSupplierRequest`에 중복 검사 추가 |
| 3 | `services/web-neture/src/lib/api.ts` | 판매자용 취급 요청 API 함수 추가 |
| 4 | `services/web-neture/src/pages/suppliers/SupplierDetailPage.tsx` | "취급 요청" 버튼 추가 |
| 5 | `services/web-glycopharm/src/services/api.ts` | 취급 요청 API 함수 추가 |
| 6 | `services/web-glycopharm/src/pages/pharmacy/b2b-order/B2BOrderPage.tsx` | "취급 요청" 버튼 추가 |

---

## 변경 상세

### 1. neture.routes.ts — POST 엔드포인트 인증 + 중복 방지

**현재 (line 333):**
```typescript
router.post('/supplier/requests', async (req: Request, res: Response) => {
```

**변경:**
```typescript
router.post('/supplier/requests', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
```

- `requireAuth` 미들웨어 추가
- 인증된 사용자의 ID를 `sellerId`로 자동 설정 (body에서 제공하지 않는 경우)
- 중복 요청 시 409 Conflict 응답

### 2. neture.service.ts — createSupplierRequest 중복 검사

`createSupplierRequest` 메서드 시작 부분에 추가:
```typescript
// 중복 검사: 동일 supplier + seller + product에 pending 상태 존재 시 차단
const existing = await this.supplierRequestRepo.findOne({
  where: {
    supplierId: data.supplierId,
    sellerId: data.sellerId,
    productId: data.productId,
    status: SupplierRequestStatus.PENDING,
  },
});
if (existing) {
  throw new Error('DUPLICATE_REQUEST');
}
```

### 3. web-neture api.ts — 판매자용 API 함수

```typescript
export const sellerApi = {
  createHandlingRequest: async (data: {
    supplierId: string;
    productId: string;
    productName: string;
    serviceId: string;
    serviceName: string;
  }) => {
    const response = await fetch(`${API_BASE}/api/v1/neture/supplier/requests`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify(data),
    });
    return response.json();
  },
};
```

### 4. web-neture SupplierDetailPage.tsx — "취급 요청" 버튼

공급자 상세 페이지의 각 상품 카드에 "취급 요청" 버튼 추가:
- 클릭 시 `POST /api/v1/neture/supplier/requests` 호출
- 성공: "요청됨" 상태로 버튼 비활성화
- 실패(DUPLICATE): "이미 요청됨" 메시지
- 실패(기타): 에러 메시지 표시

### 5. web-glycopharm api.ts — 취급 요청 API 함수

```typescript
export const supplierRequestApi = {
  createHandlingRequest: (data: {
    supplierId: string;
    productId: string;
    productName: string;
  }) => apiClient.post('/api/v1/neture/supplier/requests', {
    ...data,
    serviceId: 'glycopharm',
    serviceName: 'GlycoPharm',
  }),
};
```

### 6. web-glycopharm B2BOrderPage.tsx — "취급 요청" 버튼

B2B 상품 카드에 "취급 요청" 버튼 추가:
- 기존 "담기" 버튼 옆에 배치
- 클릭 시 API 호출, 성공/실패 피드백

---

## 구현 순서

1. Backend: neture.service.ts 중복 검사 추가
2. Backend: neture.routes.ts 인증 추가
3. Frontend: web-neture api.ts + SupplierDetailPage.tsx
4. Frontend: web-glycopharm api.ts + B2BOrderPage.tsx
5. 빌드 검증: `pnpm --filter web-neture build && pnpm --filter web-glycopharm build`

---

## 검증

1. `POST /api/v1/neture/supplier/requests` — 인증 필수 확인
2. 동일 supplier+seller+product에 pending 존재 시 409 응답
3. Neture 공급자 상세 페이지에서 "취급 요청" 버튼 동작
4. GlycoPharm B2B 페이지에서 "취급 요청" 버튼 동작
5. 기존 공급자 대시보드(SellerRequestsPage)에서 pending 요청 조회 가능
