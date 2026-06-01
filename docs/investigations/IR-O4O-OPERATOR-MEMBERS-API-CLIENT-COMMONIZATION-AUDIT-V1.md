# IR-O4O-OPERATOR-MEMBERS-API-CLIENT-COMMONIZATION-AUDIT-V1

**유형:** 구조 결정 IR  
**작성일:** 2026-06-01  
**상태:** 완료 — 추가 WO 보류 권장  
**코드 변경:** 없음

---

## 핵심 결론

**공통화 가치가 낮다 — 현재 service-local client 유지 권장.**

- GlycoPharm과 K-Cosmetics의 `MembersConsoleClient` 5개 메서드 모두 `serviceKey` 값만 다르고 구조는 100% 동일
- Neture만 `updateStatus` / `batchUpdateStatus` 에서 승인 전용 endpoint를 사용하여 분기
- 공통화 시 절약 코드량: GP/K-Cos 각 ~25줄 — 추상화 비용 대비 실익이 낮음
- 현재 `OperatorMembersConsolePage`의 `client` prop injection 구조가 이미 올바른 격리 경계

**판정: C — 현재 service-local API client 유지 권장**

---

## 1. MembersConsoleClient 인터페이스

```typescript
interface MembersConsoleClient {
  list(params: MembersConsoleListParams): Promise<{ users: UserData[]; pagination: any }>;
  listAll(): Promise<{ users: UserData[] }>;
  stats(): Promise<any>;
  updateStatus(userId: string, status: string, currentStatus?: string, user?: UserData): Promise<void>;
  batchUpdateStatus(ids: string[], status: string): Promise<any>;
  updatePassword(userId: string, password: string): Promise<void>;
}
```

---

## 2. 서비스별 endpoint 비교

### `list` / `listAll` / `stats`

| 메서드 | Neture | GlycoPharm | K-Cosmetics | 동일 여부 |
|--------|--------|-----------|-------------|---------|
| `list` | `GET /operator/members?serviceKey=neture&…` | `GET /operator/members?serviceKey=glycopharm&…` | `GET /operator/members?serviceKey=k-cosmetics&…` | ✅ serviceKey만 다름 |
| `listAll` | `GET /operator/members?limit=1000&serviceKey=neture` | `GET /operator/members?limit=1000&serviceKey=glycopharm` | `GET /operator/members?limit=1000&serviceKey=k-cosmetics` | ✅ serviceKey만 다름 |
| `stats` | `GET /operator/members/stats?serviceKey=neture` | `GET /operator/members/stats?serviceKey=glycopharm` | `GET /operator/members/stats?serviceKey=k-cosmetics` | ✅ serviceKey만 다름 |
| `updatePassword` | `PUT /operator/members/:id` `{ password }` | 동일 | 동일 | ✅ 완전 동일 |

### `updateStatus` — 유일한 diverge 지점

| 서비스 | 구현 | 비고 |
|--------|------|------|
| **GlycoPharm** | `PATCH /operator/members/:userId/status` `{ status }` | 단순 |
| **K-Cosmetics** | `PATCH /operator/members/:userId/status` `{ status }` | 단순, GP와 동일 |
| **Neture** | `pending→approved`: `POST /neture/operator/registrations/:id/approve`<br>`rejected`: `POST /neture/operator/registrations/:id/reject`<br>`suspended/active`: `PATCH /operator/members/:membershipId/reject|approve` | Neture 승인 전용 endpoint 존재 |

### `batchUpdateStatus`

| 서비스 | endpoint | payload |
|--------|---------|---------|
| **GlycoPharm** | `POST /operator/members/batch-status` | `{ ids, status }` |
| **K-Cosmetics** | `POST /operator/members/batch-status` | `{ ids, status }` |
| **Neture** | `POST /neture/operator/registrations/batch` | `{ ids, action: 'approve'|'reject', reason? }` |

---

## 3. request / response shape 비교

| 항목 | 3서비스 모두 동일 |
|------|:---:|
| list pagination shape | ✅ `{ users: UserData[], pagination: { page, limit, total } }` |
| listAll shape | ✅ `{ users: UserData[] }` |
| updateStatus payload | ✅ GP/K-Cos 동일, Neture만 다름 |
| updatePassword payload | ✅ `{ password }` |
| 삭제 endpoint (renderDeleteFlow) | ✅ `DELETE /operator/members/:id?mode=soft` (공통) |

---

## 4. delete / deactivate / withdraw 정책 비교

모두 `renderDeleteFlow` slot으로 격리되어 있으므로 `MembersConsoleClient`와 별도.

| 서비스 | operator 삭제 정책 | 실제 endpoint |
|--------|----------------|-------------|
| Neture | soft delete only | `DELETE /operator/members/:id?mode=soft` |
| GlycoPharm | soft delete only (delete-risk 조회 후) | `DELETE /operator/members/:id?mode=soft` |
| K-Cosmetics | soft delete only | `DELETE /operator/members/:id?mode=soft` |

삭제 endpoint 자체는 모두 동일. 차이는 UX 흐름(risk check 유무)뿐.

---

## 5. 공통화 가능성 분석

### 옵션 A — `createStandardMembersClient(serviceKey)` 팩토리

GlycoPharm과 K-Cosmetics는 완전히 동일하므로 팩토리 함수로 추출 가능:

```typescript
// packages/operator-core-ui/src/modules/members/createMembersClient.ts
export function createStandardMembersClient(serviceKey: string, api: ApiInstance): MembersConsoleClient {
  return {
    async list(params) { /* serviceKey만 주입 */ },
    async listAll() { /* serviceKey만 주입 */ },
    async stats() { /* serviceKey만 주입 */ },
    async updateStatus(userId, status) {
      await api.patch(`/operator/members/${userId}/status`, { status });
    },
    async batchUpdateStatus(ids, status) {
      const { data } = await api.post('/operator/members/batch-status', { ids, status });
      return data;
    },
    async updatePassword(userId, password) {
      await api.put(`/operator/members/${userId}`, { password });
    },
  };
}
```

**예상 절약**: GP/K-Cos 각 ~25줄 (현재 ~50줄 → 팩토리 1줄 + import)
**Neture**: 4개 메서드 재사용, `updateStatus` / `batchUpdateStatus` override

**단점**:
- 팩토리 함수를 어디에 둘지(shared 패키지 vs 각 서비스) 결정 필요
- Neture override 패턴이 코드상 명확하지 않아짐
- 추상화 후 디버깅 시 endpoint 추적이 어려워짐

### 현재 구조 유지 (권장)

```
서비스별 UsersPage.tsx (67~79줄 thin wrapper)
  → 자체 MembersConsoleClient 구현 (~50줄)
  → OperatorMembersConsolePage props로 주입
```

**장점**:
- 각 서비스 client가 명시적이고 독립적
- endpoint, serviceKey, payload 한눈에 파악 가능
- Neture의 특수한 승인 흐름이 명확히 드러남
- 팩토리 도입 없이 현재 50~60줄이 최적화된 수준

---

## 6. 공통화 가능성 판정

**판정: C — service-local API client 유지 권장**

| 메서드 | 공통화 가능 | 비고 |
|--------|:---:|------|
| `list` | ✅ serviceKey config만 다름 | 팩토리 후보 |
| `listAll` | ✅ serviceKey config만 다름 | 팩토리 후보 |
| `stats` | ✅ serviceKey config만 다름 | 팩토리 후보 |
| `updatePassword` | ✅ 완전 동일 | 팩토리 후보 |
| `batchUpdateStatus` | ⚠️ Neture만 다름 | GP/K-Cos 공통, Neture override |
| `updateStatus` | ❌ Neture 별도 흐름 | 서비스별 유지 |

**단, 현 단계에서 팩토리 추출 실익이 작다**:
- GP/K-Cos 절약: ~25줄씩 (총 ~50줄)
- 추상화 복잡도 증가, Neture override 패턴 추가
- 현재 코드가 이미 명확하고 유지보수 가능한 규모

---

## 7. Current Structure vs O4O Philosophy Conflict Check

| 원칙 | 현황 | 판정 |
|------|------|:---:|
| API client 분산이 공통 UX에 장애가 되는가 | `OperatorMembersConsolePage` props로 주입 — UI는 client 구현 모름 | ✅ 장애 없음 |
| 서비스별 정책 차이를 과도하게 숨기지 않는가 | Neture 승인 흐름이 client에 명시적으로 드러남 | ✅ 안전 |
| 1인 개발 속도 관점에서 공통화가 유리한가 | ~50줄 절약 대비 추상화 비용 — **불리** | ⚠️ 보류 권장 |
| 현재 props/slots 기반 UI 공통화와 충돌하지 않는가 | client는 UI와 완전히 분리됨 — 충돌 없음 | ✅ |
| KPA를 무리하게 포함하지 않았는가 | 조사 참고만, 공통화 대상 제외 | ✅ |

**결론**: API client 분산은 현재 아무 문제가 없으며, `OperatorMembersConsolePage` props 구조가 올바른 격리 경계를 제공하고 있다. 공통화 실익이 낮아 service-local 유지 권장.

---

## 후속 WO 필요 여부

**없음 — Operator Members 공통화 전체 완료로 고정 가능.**

다음 후속 후보는 live smoke check:
- 운영 계정으로 회원 목록 / 상세 / 수정 / 상태 변경 / 삭제 검증

---

*검증 수행: Claude Code (2026-06-01)*  
*read-only 조사 — 코드/DB/source/migration 수정 없음*
