# Digital Signage Core 최소 책임 정의서 v1.0

> **상태**: LOCKED (v1.0)
> **시행일**: 2025-12-28
> **변경 정책**: 본 문서는 수정 불가. 변경 시 v2.0 신규 문서로 대체

---

## 1. 서론

### 1.1 문서의 목적

본 문서는 **Digital Signage Core**가 책임지는 **최소 범위**를 명확히 정의한다.

- Core가 **반드시 해야 할 것** (MUST)
- Core가 **절대 하지 않을 것** (MUST NOT)
- Extension이 담당할 영역

이를 통해 Core와 Extension 간 책임 경계를 명확히 하고, 향후 확장 시 구조적 충돌을 방지한다.

### 1.2 왜 Digital Signage Core가 필요한가

| 문제 | 해결책 |
|------|--------|
| 각 서비스가 독자적 미디어 재생 시스템 구축 | 공통 인프라로 중복 제거 |
| 디스플레이 장치 관리 분산 | 중앙 집중식 디바이스 관리 |
| 스케줄/재생 로직 파편화 | 표준화된 스케줄링 엔진 |
| 서비스별 개별 구현 비용 | Core 재사용으로 개발 비용 절감 |

### 1.3 문서의 지위

- 본 문서는 **CLAUDE.md**에 종속되며, 충돌 시 CLAUDE.md가 우선한다.
- Digital Signage 관련 모든 개발은 본 문서의 경계를 준수해야 한다.
- Extension 개발자는 본 문서를 통해 Core 의존 범위를 파악할 수 있다.

---

## 2. Core의 최소 책임 (MUST)

Digital Signage Core는 **반드시** 다음을 제공해야 한다.

### 2.1 테이블 소유

Core는 다음 7개 테이블을 소유하고 관리한다.

| 테이블명 | 용도 |
|----------|------|
| `signage_media_source` | 미디어 소스 (URL, 파일, 스트림) |
| `signage_media_list` | 미디어 목록 (플레이리스트) |
| `signage_media_list_item` | 목록 내 개별 항목 |
| `signage_display` | 디스플레이 장치 등록 정보 |
| `signage_display_slot` | 디스플레이 내 슬롯 (영역) 정의 |
| `signage_schedule` | 스케줄 정의 (시간대, 반복) |
| `signage_action_execution` | 실행 이력 및 상태 |

**책임 범위**:
- 테이블 생성 (Migration)
- 스키마 변경 관리
- 백업/복구 정책

### 2.2 CRUD 서비스

각 엔터티에 대해 표준 CRUD 작업을 제공한다.

| 서비스 | 대상 엔터티 |
|--------|------------|
| `MediaSourceService` | MediaSource |
| `MediaListService` | MediaList, MediaListItem |
| `DisplayService` | Display |
| `DisplaySlotService` | DisplaySlot |
| `ScheduleService` | Schedule |
| `ActionExecutionService` | ActionExecution |

### 2.3 Action 실행 제어

ActionExecutionService는 다음 작업을 제공한다.

| 작업 | 설명 |
|------|------|
| `execute` | 스케줄/미디어 실행 시작 |
| `stop` | 실행 중단 |
| `pause` | 일시 정지 |
| `resume` | 재개 |

### 2.4 Slot Occupancy 관리

DisplaySlot의 점유 상태를 관리한다.

- 슬롯 사용 가능 여부 확인
- executeMode 처리 (queue, replace, reject)
- 동시 실행 충돌 방지

### 2.5 RenderingEngine

미디어 재생 라이프사이클을 관리한다.

- ActionExecution 상태 전이 (pending → running → completed)
- 재생 시간 추적
- 오류 처리 및 복구

### 2.6 하트비트 모니터링

디스플레이 장치 연결 상태를 감시한다.

- 주기적 연결 확인
- 오프라인 장치 감지
- 상태 보고

### 2.7 REST API

모든 작업에 대한 HTTP 엔드포인트를 제공한다.

```
/api/signage/media-sources
/api/signage/media-lists
/api/signage/displays
/api/signage/display-slots
/api/signage/schedules
/api/signage/actions
```

### 2.8 Permission 정의

Core는 다음 권한 체계를 정의한다.

| 권한 그룹 | 예시 |
|-----------|------|
| `signage.media.*` | signage.media.create, signage.media.read |
| `signage.display.*` | signage.display.manage, signage.display.view |
| `signage.schedule.*` | signage.schedule.create, signage.schedule.execute |

---

## 3. Core의 명시적 비책임 (MUST NOT)

Digital Signage Core는 **절대** 다음을 하지 않는다.

### 3.1 Extension 테이블 관리

| 금지 | 이유 |
|------|------|
| Extension이 만드는 테이블 소유 | 책임 분리 원칙 위반 |
| Extension 데이터 직접 조회 | 의존성 역전 |
| Extension 스키마 마이그레이션 | Extension 자율성 침해 |

### 3.2 비즈니스 로직 해석

| 금지 | 이유 |
|------|------|
| 약국 마케팅 로직 | 도메인 종속 |
| 병원 대기열 로직 | 도메인 종속 |
| 식당 메뉴판 로직 | 도메인 종속 |
| 관광지 안내 로직 | 도메인 종속 |

Core는 **"무엇을 재생할지"**를 결정하지 않는다.
**"어떻게 재생할지"**만 담당한다.

### 3.3 자동 스케줄 트리거

| 금지 | 이유 |
|------|------|
| Schedule 자동 실행 | 실행 권한은 Extension 또는 외부 시스템 |
| 시간 기반 자동 시작 | Core는 실행 요청만 처리 |
| 이벤트 기반 자동 트리거 | 비즈니스 로직 의존 방지 |

> Schedule은 **"언제 실행 가능한가"**를 정의할 뿐,
> **"자동으로 실행한다"**를 의미하지 않는다.

### 3.4 Extension별 메뉴/페이지

| 금지 | 이유 |
|------|------|
| 약국 전용 Admin 메뉴 | Extension 담당 |
| 서비스별 대시보드 | Extension 담당 |
| 도메인별 컨텐츠 관리 UI | Extension 담당 |

### 3.5 컨텐츠 선택 관리

| 금지 | 이유 |
|------|------|
| 어떤 컨텐츠를 선택할지 결정 | 비즈니스 로직 |
| 컨텐츠 추천 알고리즘 | 도메인 종속 |
| 컨텐츠 승인/검수 워크플로우 | Extension 책임 |

---

## 4. Extension 설계 원칙

Digital Signage를 활용하는 Extension은 다음 원칙을 따른다.

### 4.1 Contract 사용 필수

Extension은 **SignageContractClient**를 통해서만 Core에 접근한다.

```typescript
import { SignageContractClient } from '@o4o/digital-signage-contract';

const client = new SignageContractClient(baseUrl, authToken);
await client.mediaLists.create({ name: '약국 프로모션' });
```

### 4.2 ownsTables 정책

| 권장 | 설명 |
|------|------|
| `ownsTables: []` | Core 테이블만 사용 (권장) |
| `ownsTables: ['ext_*']` | Extension 전용 테이블이 필요한 경우 |

**signage-pharmacy-extension 예시**:
```typescript
export const manifest: AppManifest = {
  appId: 'signage-pharmacy-extension',
  ownsTables: [], // Core 테이블 재사용
  // ...
};
```

### 4.3 비즈니스 로직 캡슐화

Extension은 자체 Service/Controller로 비즈니스 로직을 캡슐화한다.

```
extension/
├── services/
│   ├── PharmacyContentService.ts    # 컨텐츠 선택 로직
│   └── PharmacyScheduleService.ts   # 스케줄 관리 로직
├── controllers/
│   └── PharmacySignageController.ts # Extension API
└── admin/
    └── pages/                       # Extension Admin UI
```

### 4.4 자체 Admin 메뉴 정의

Extension은 manifest에 자체 Admin 메뉴를 정의한다.

```typescript
admin: {
  menus: [
    { id: 'pharmacy-signage-dashboard', label: '사이니지 대시보드' },
    { id: 'pharmacy-content-manager', label: '컨텐츠 관리' },
    // ...
  ],
},
```

---

## 5. Admin / Frontend 최소 계약

### 5.1 Core Admin

| 제공 | 범위 |
|------|------|
| 기본 CRUD 페이지 | 선택적 (개발 편의용) |
| 디스플레이 목록 | 장치 상태 확인용 |
| 미디어 소스 관리 | 기본 업로드/URL 등록 |

> Core Admin은 **개발/디버깅 용도**이며,
> 운영 UI는 Extension이 담당한다.

### 5.2 Extension Admin

| 책임 | 예시 |
|------|------|
| 비즈니스별 대시보드 | 약국 마케팅 현황 |
| 컨텐츠 관리 UI | 도메인 특화 에디터 |
| 편성 UI | 시간대별 컨텐츠 배치 |
| 승인 워크플로우 | 컨텐츠 검수 프로세스 |

### 5.3 Device Frontend

| 제공자 | 범위 |
|--------|------|
| Core | RenderingEngine 기반 재생 |
| Extension | 커스텀 레이아웃 (선택) |

### 5.4 Kiosk/Public

| 상태 | 비고 |
|------|------|
| v1 범위 외 | 향후 확장 대상 |

---

## 6. 서비스별 적용 가이드

### 6.1 적용 매트릭스

| 서비스 | Signage 필요성 | Extension 필요 | 비고 |
|--------|---------------|---------------|------|
| **Yaksa** | 선택 | signage-yaksa | 지부 공지/행사 안내 |
| **GlycoPharmacy** | 필수 | signage-pharmacy ✅ | 약국 마케팅/교육 |
| **GlucoseView** | 선택 | (없음) | 개인 건강 앱 |
| **Cosmetics** | 선택 | signage-cosmetics | 매장 프로모션 |
| **Dropshipping** | 선택 | signage-retail | 제품 디스플레이 |
| **GroupBuy** | 선택 | (없음) | 캠페인 시각물 |
| **Travel** | 필수 | signage-tourist | 관광지 안내 |

### 6.2 적용 결정 기준

**Signage 필수 조건**:
1. 물리적 디스플레이 장치 운영
2. 시간대별 컨텐츠 편성 필요
3. 다수 장치 중앙 관리 필요

**Extension 필요 조건**:
1. 도메인 특화 컨텐츠 관리
2. 비즈니스 로직 기반 스케줄링
3. 서비스 전용 Admin UI

---

## 7. v1.0 고정 선언

### 7.1 변경 정책

| 항목 | 정책 |
|------|------|
| 본 문서 수정 | ❌ 금지 |
| 기능 추가 | v2.0 신규 문서 필요 |
| 테이블 추가 | v2.0 신규 문서 필요 |
| 책임 범위 변경 | v2.0 신규 문서 필요 |

### 7.2 예외 허용

다음의 경우에만 v1.x 패치 허용:

- 오타/문법 수정
- 명확화를 위한 문구 보완 (의미 변경 없음)
- 예시 추가 (규칙 변경 없음)

### 7.3 시행일

- **Effective Date**: 2025-12-28
- **Document Version**: v1.0
- **Status**: LOCKED

---

## 부록 A: 현재 구현 상태

### A.1 Core 구조 (2025-12-28 기준)

```
packages/digital-signage-core/
├── src/
│   ├── backend/
│   │   ├── entities/          # 7 entities
│   │   ├── services/          # 6 services
│   │   └── engines/           # RenderingEngine
│   └── manifest.ts
└── package.json
```

### A.2 Contract 라이브러리

```
packages/digital-signage-contract/
├── src/
│   └── SignageContractClient.ts
└── package.json
```

### A.3 Extension 예시 (signage-pharmacy-extension)

```
packages/signage-pharmacy-extension/
├── src/
│   ├── backend/
│   │   ├── services/
│   │   └── controllers/
│   ├── frontend/
│   │   └── admin/pages/      # 8 pages
│   └── manifest.ts           # ownsTables: []
└── package.json
```

---

## 부록 B: 관련 문서

| 문서 | 용도 |
|------|------|
| CLAUDE.md | 플랫폼 최상위 규칙 |
| 서비스별 기본 인프라 선언 문서 v1.0 | 서비스별 MUST/OPTIONAL 정의 |
| AppStore 등록 규칙 | 앱 유형별 등록 정책 |

---

*Document Version: 1.0*
*Created: 2025-12-28*
*Status: LOCKED*
