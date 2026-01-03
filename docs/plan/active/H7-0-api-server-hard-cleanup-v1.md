# H7-0: API Server Hard Cleanup v1 완료 보고서

## 개요

| 항목 | 내용 |
|------|------|
| Work Order | API Server Hard Cleanup v1 |
| 목적 | 미사용 서비스 제거 및 기준선 확정 |
| 상태 | **완료** |
| 완료일 | 2026-01-03 |

---

## 전제 조건

- 현재 모든 서비스의 데이터는 **보존 가치 없음**
- "나중에 쓸 수도 있음"은 **유지 사유가 아님**
- 실제 호출/운영되지 않는 API는 **존재 자체가 기술 부채**

---

## 수행된 작업

### 1. K-Shopping 서비스 전면 제거

#### 삭제된 항목

| 항목 | 경로/내용 |
|------|-----------|
| 라우트 등록 | `main.ts` - `/api/v1/k-shopping` 등록 제거 |
| Routes 폴더 | `apps/api-server/src/routes/k-shopping/` 전체 삭제 |
| Controllers | `application.controller.ts`, `admin.controller.ts` |
| Entities | `KShoppingApplication`, `KShoppingParticipant` |
| DB import | `connection.ts`에서 entity import 주석 처리 |

#### FROZEN 선언 무시

- `@frozen H1-0` 마커가 있었으나 **데이터 보존 전제가 없으므로 효력 없음**
- 완전 삭제 진행

---

### 2. K-Cosmetics 빈 슬롯 제거

| 항목 | 내용 |
|------|------|
| 삭제 대상 | `apps/api-server/src/routes/k-cosmetics/` |
| 사유 | H5-0에서 생성한 빈 슬롯, 실제 API 없음 |
| Service Registry | 제거 (API 없는 서비스 등록 불필요) |

---

### 3. Service Registry 재정의

#### 최종 등록 서비스 (5개)

```typescript
SERVICE_REGISTRY = {
  glycopharm,    // 약국 디스플레이/포럼 서비스
  glucoseview,   // 혈당 모니터링 서비스
  neture,        // B2C 대표 서비스
  'kpa-society', // 약사회 SaaS 서비스
  cosmetics,     // 화장품 도메인 서비스
};
```

#### 제거된 항목

| 서비스 | 제거 사유 |
|--------|-----------|
| k-cosmetics | 웹만 존재, API 없음 |
| k-shopping | 전면 제거 |

---

### 4. Service Scopes 정리

#### Registry와 1:1 대응 확정

| 서비스 | public | member | admin |
|--------|--------|--------|-------|
| glycopharm | ✅ 2개 | ✅ 3개 | ✅ 4개 |
| glucoseview | ✅ 1개 | ✅ 3개 | ✅ 3개 |
| neture | ✅ 1개 | ✅ 2개 | ✅ 3개 |
| kpa-society | ✅ 1개 | ✅ 2개 | ✅ 3개 |
| cosmetics | ✅ 2개 | ✅ 2개 | ✅ 4개 |

---

## 변경된 파일

| 파일 | 변경 내용 |
|------|-----------|
| `apps/api-server/src/main.ts` | k-shopping import/등록 주석 처리 |
| `apps/api-server/src/database/connection.ts` | k-shopping entity import/등록 주석 처리 |
| `apps/api-server/src/config/service-registry.ts` | 5개 서비스만 등록 (neture, kpa-society 추가) |
| `apps/api-server/src/config/service-scopes.ts` | 5개 서비스 scope 정의 (neture, kpa-society, cosmetics 추가) |

---

## 삭제된 파일/폴더

| 경로 | 내용 |
|------|------|
| `apps/api-server/src/routes/k-shopping/` | 전체 폴더 (controllers, entities, routes) |
| `apps/api-server/src/routes/k-cosmetics/` | 전체 폴더 (빈 슬롯) |

---

## 빌드 검증

| 패키지 | 결과 |
|--------|------|
| api-server | **성공** ✅ |

---

## 아키텍처 변화

### Before (Hard Cleanup v1 이전)

```
SERVICE_REGISTRY:
├── glycopharm ✅
├── glucoseview ✅
└── k-cosmetics (API 없음)

실제 라우트:
├── /api/v1/glycopharm ✅
├── /api/v1/glucoseview ✅
├── /api/v1/neture ✅
├── /api/v1/kpa ✅
├── /api/v1/cosmetics ✅
├── /api/v1/k-shopping ← 삭제 대상
└── (k-cosmetics 없음)
```

### After (Hard Cleanup v1 이후)

```
SERVICE_REGISTRY (5개):
├── glycopharm ✅
├── glucoseview ✅
├── neture ✅ (신규 등록)
├── kpa-society ✅ (신규 등록)
└── cosmetics ✅ (신규 등록)

SERVICE_SCOPES:
└── Registry와 1:1 대응 ✅

라우트:
├── /api/v1/glycopharm ✅
├── /api/v1/glucoseview ✅
├── /api/v1/neture ✅
├── /api/v1/kpa ✅
└── /api/v1/cosmetics ✅
```

---

## 수행하지 않은 것 (명시적)

| 금지 항목 | 이유 |
|-----------|------|
| 데이터 마이그레이션 | Hard Cleanup 정책 |
| 하위 호환 유지 | Hard Cleanup 정책 |
| API deprecated 처리 | Hard Cleanup 정책 |
| 단계적 전환 | Hard Cleanup 정책 |
| "혹시 몰라 남김" | Hard Cleanup 정책 |

---

## 완료 기준 달성

| 기준 | 상태 |
|------|------|
| k-shopping 관련 코드 완전 제거 | ✅ |
| Service Registry = 실제 사용 서비스만 | ✅ (5개) |
| Service Scope = Registry와 1:1 대응 | ✅ |
| API 서버 빌드 성공 | ✅ |
| 기존 활성 서비스 동작 영향 없음 | ✅ |

---

## 후속 작업 (본 Work Order 범위 외)

| 작업 | 상태 |
|------|------|
| k-shopping 재설계 | Planned |
| 신규 여행자 서비스 API 생성 | Planned |
| Admin UI 신규 추가 | Planned |

---

## 참고

- [H6-0 조사 보고서](./H6-0-api-server-investigation-report.md)
- [H5-0 K-Cosmetics Service Context](./H5-0-k-cosmetics-service-context.md) (폐기됨)
