# Digital Signage Extension Contract

> **Contract Version: v1.0**
> **Last Updated: 2024-12-14**
> **Status: STABLE**

이 문서는 Digital Signage Core와 서비스별 Extension 간의 연동 계약(Contract)을 정의합니다.
모든 Extension 개발자는 이 계약을 준수해야 합니다.

---

## 1. 개요

### 1.1 목적

Digital Signage Core는 디스플레이 재생을 위한 **범용 실행 엔진**입니다.
Core는 콘텐츠의 의미를 해석하지 않으며, Extension이 요청한 Action을 실행만 합니다.

```
[Service Extension] → Action 요청 → [Core] → 실행 → [Device Agent] → 재생
```

### 1.2 역할 분리

| 역할 | Core | Extension |
|------|------|-----------|
| 콘텐츠 의미 해석 | ❌ | ✅ |
| Action 실행 | ✅ | ❌ |
| 실행 정책 결정 | ❌ | ✅ |
| Display/Slot 관리 | ✅ | ❌ (조회만) |
| Player 제어 | ✅ | ❌ |
| 사용자 맥락 해석 | ❌ | ✅ |

---

## 2. 연동 범위 (Boundary)

### 2.1 Core가 제공하는 것

- **Action 실행 API**: 미디어 재생 요청 실행
- **Action 제어 API**: 일시정지/재개/중지
- **상태 조회 API**: Action 및 Slot 상태 확인
- **실행 결과**: 성공/실패/거부 응답

### 2.2 Extension이 할 수 있는 것

- Action **요청** (execute)
- Action **제어** (pause/resume/stop)
- 상태 **조회** (query)
- 자체 비즈니스 로직 기반 **실행 타이밍 결정**

### 2.3 Extension이 할 수 없는 것 (금지)

- ❌ Core 내부 데이터 직접 수정
- ❌ Player/Rendering 직접 제어
- ❌ Slot 점유 정책 임의 변경
- ❌ Device Agent 직접 통신
- ❌ Core Entity 직접 import/수정
- ❌ 스케줄 강제 등록/삭제

---

## 3. Action Contract API

### 3.1 Execute Action

미디어 재생을 요청합니다.

**Endpoint**
```
POST /api/signage/actions/execute
```

**Request**
```typescript
interface ExecuteActionRequest {
  // 요청 앱 식별자 (필수)
  sourceAppId: string;

  // 재생할 미디어 리스트 ID (필수)
  mediaListId: string;

  // 대상 Display Slot ID (필수)
  displaySlotId: string;

  // 재생 시간 (초), 0 = 무제한
  duration?: number;

  // 실행 모드 (기본: 'reject')
  executeMode?: 'immediate' | 'replace' | 'reject';

  // 우선순위 (1-100, 기본: 50)
  priority?: number;

  // Extension 제공 메타데이터 (Core는 해석하지 않음)
  metadata?: Record<string, unknown>;
}
```

**Execute Mode 설명**
| Mode | 설명 |
|------|------|
| `immediate` | 대기열에 추가, 순서대로 실행 |
| `replace` | 현재 실행 중인 Action을 중지하고 즉시 실행 |
| `reject` | 이미 실행 중이면 거부 |

**Response**
```typescript
interface ExecuteActionResponse {
  success: boolean;

  // 생성된 Action Execution ID
  executionId?: string;

  // 현재 상태
  status?: 'PENDING' | 'RUNNING' | 'REJECTED';

  // 거부 사유 (status가 REJECTED인 경우)
  reason?: string;

  // 에러 메시지
  error?: string;
}
```

**응답 예시**
```json
{
  "success": true,
  "executionId": "exec-uuid-12345",
  "status": "RUNNING"
}
```

```json
{
  "success": false,
  "status": "REJECTED",
  "reason": "SLOT_BUSY",
  "error": "Display slot is currently occupied by higher priority action"
}
```

---

### 3.2 Stop Action

실행 중인 Action을 중지합니다.

**Endpoint**
```
POST /api/signage/actions/:executionId/stop
```

**Request**
```typescript
interface StopActionRequest {
  // 중지 사유 (선택)
  reason?: string;
}
```

**Response**
```typescript
interface ActionControlResponse {
  success: boolean;
  error?: string;
}
```

---

### 3.3 Pause Action

실행 중인 Action을 일시정지합니다.

**Endpoint**
```
POST /api/signage/actions/:executionId/pause
```

**Request/Response**: StopAction과 동일

---

### 3.4 Resume Action

일시정지된 Action을 재개합니다.

**Endpoint**
```
POST /api/signage/actions/:executionId/resume
```

**Request/Response**: StopAction과 동일

---

### 3.5 Get Action Status

Action의 현재 상태를 조회합니다.

**Endpoint**
```
GET /api/signage/actions/:executionId
```

**Response**
```typescript
interface ActionStatusResponse {
  success: boolean;
  data?: {
    id: string;
    status: 'PENDING' | 'RUNNING' | 'PAUSED' | 'COMPLETED' | 'STOPPED' | 'FAILED';
    mediaSourceId: string;
    displaySlotId: string;
    startedAt?: string;
    endedAt?: string;
    errorMessage?: string;
    metadata?: Record<string, unknown>;
  };
  error?: string;
}
```

---

### 3.6 Get Slot Status

Display Slot의 현재 상태를 조회합니다.

**Endpoint**
```
GET /api/signage/actions/slot-status/:slotId
```

**Response**
```typescript
interface SlotStatusResponse {
  success: boolean;
  data?: {
    slotId: string;
    displayId: string;
    status: 'IDLE' | 'PLAYING' | 'PAUSED' | 'ERROR';
    currentActionId?: string;
    isActive: boolean;
  };
  error?: string;
}
```

---

## 4. Extension 개발 가이드

### 4.1 Extension의 책임

1. **콘텐츠 정의**: 어떤 미디어를 재생할지 결정
2. **실행 타이밍**: 언제 Action을 요청할지 결정
3. **사용자 맥락 해석**: 사용자 입력/상황에 따른 판단
4. **결과 처리**: Action 결과에 따른 UI 업데이트

### 4.2 권장 패턴

```typescript
// Good: Core API를 통한 Action 요청
async function playContent(mediaListId: string, slotId: string) {
  const result = await signageContract.executeAction({
    sourceAppId: 'my-extension',
    mediaListId,
    displaySlotId: slotId,
    duration: 300,
    executeMode: 'replace',
  });

  if (!result.success) {
    // Graceful fallback
    showFallbackContent();
    return;
  }

  // Core 상태를 신뢰
  updateUI(result.status);
}
```

### 4.3 금지 패턴

```typescript
// Bad: Core 내부 데이터 직접 접근
import { ActionExecutionEntity } from '@o4o/digital-signage-core/entities';  // ❌

// Bad: Player 직접 제어
deviceAgent.player.play(mediaUrl);  // ❌

// Bad: 상태 추측
if (myLocalState === 'playing') { ... }  // ❌ Core 상태 조회 사용
```

### 4.4 에러 처리

Extension은 다음 에러 상황을 처리해야 합니다:

| 에러 코드 | 의미 | 권장 처리 |
|-----------|------|-----------|
| `SLOT_BUSY` | Slot이 사용 중 | 대기 또는 다른 Slot 사용 |
| `SLOT_NOT_FOUND` | Slot 없음 | 설정 확인 요청 |
| `MEDIA_NOT_FOUND` | 미디어 없음 | 기본 콘텐츠 사용 |
| `DEVICE_OFFLINE` | 디바이스 오프라인 | 재시도 또는 알림 |

---

## 5. 예시 시나리오

### 5.1 혈당관리 약국 Extension

```typescript
// 혈당 변동 안내 재생 요청
async function showBloodSugarInfo(patientContext: PatientContext) {
  // Extension이 콘텐츠 결정 (Core는 모름)
  const mediaListId = selectMediaForBloodSugar(patientContext.level);

  const result = await signageContract.executeAction({
    sourceAppId: 'yaksa-blood-sugar',
    mediaListId,
    displaySlotId: 'pharmacy-main-display',
    duration: 60,  // 1분 재생
    executeMode: 'replace',
    metadata: {
      patientId: patientContext.id,
      bloodSugarLevel: patientContext.level,
    },
  });

  if (result.success) {
    logAnalytics('blood_sugar_info_shown', result.executionId);
  }
}
```

### 5.2 화장품 매장 Extension

```typescript
// 제품 설명 영상 재생 요청
async function showProductDemo(productId: string, displaySlot: string) {
  // 제품에 맞는 미디어 리스트 조회 (Extension 로직)
  const mediaListId = await getProductMediaList(productId);

  const result = await signageContract.executeAction({
    sourceAppId: 'cosmetics-product-demo',
    mediaListId,
    displaySlotId: displaySlot,
    executeMode: 'replace',  // 기존 재생 대체
    metadata: {
      productId,
      requestedBy: 'customer-tablet',
    },
  });

  return result;
}
```

---

## 6. 버전 정책

### 6.1 Contract 버전

- **현재 버전**: v1.0
- **호환성**: 하위 호환 유지
- **Breaking Change**: Major 버전 업데이트 시에만

### 6.2 버전 헤더

모든 API 요청에 버전 헤더 포함 권장:

```
X-Signage-Contract-Version: 1.0
```

### 6.3 Deprecation 정책

- Deprecated API는 최소 2개 버전 유지
- Deprecated 응답 헤더로 알림
- Migration 가이드 제공

---

## 7. 타입 패키지

Extension 개발 시 `@o4o/digital-signage-contract` 패키지 사용:

```bash
pnpm add @o4o/digital-signage-contract
```

```typescript
import {
  ExecuteActionRequest,
  ExecuteActionResponse,
  ActionStatusResponse,
  SlotStatusResponse,
  SignageContractClient,
} from '@o4o/digital-signage-contract';

const client = new SignageContractClient({
  baseUrl: process.env.SIGNAGE_API_URL,
  appId: 'my-extension',
});

const result = await client.executeAction({ ... });
```

---

## 8. 체크리스트

Extension 개발 전 확인:

- [ ] `@o4o/digital-signage-contract` 패키지 설치
- [ ] sourceAppId 고유하게 설정
- [ ] 에러 처리 로직 구현
- [ ] Core 상태를 "진실원"으로 신뢰
- [ ] 금지 패턴 사용하지 않음
- [ ] 메타데이터에 민감 정보 포함하지 않음

---

## 9. 문의

- Core 관련 문의: Digital Signage Core 팀
- Extension 개발 문의: 각 서비스 팀
- Contract 변경 요청: Work Order 필요

---

*이 문서는 Digital Signage Core Phase 8에서 확정되었습니다.*
