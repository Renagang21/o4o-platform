# WO-O4O-ASSET-COPY-NETURE-PILOT-V1

> Asset Copy Engine — KPA-a Pilot → Neture 2차 적용 / Core 승격 전 검증 단계

---

## 0. 목적

KPA-a에서 안정화된 **Asset Copy Engine (Snapshot 모델)**을
Neture 서비스에 적용하여:

1. Resolver 패턴의 최소 공통 인터페이스 도출
2. 권한 모델 일반화 필요 범위 확인
3. Controller 레벨 공통화 가능성 검증
4. Core 승격 적합성 재판정

을 수행한다.

> 이 WO는 Core 분리 작업이 아니다.
> 구조 검증 목적의 2차 Pilot이다.

---

## 1. 적용 범위

### 적용 서비스

* Neture

### 복사 대상

* Neture CMS Assets
* (추후) Neture Signage 자산

### 복사 목적지

* 매장 허브 (Store Hub)

> Snapshot 저장 위치는 기존 `o4o_asset_snapshots` 유지
> (platform-common 레벨 유지)

---

## 2. 현재 상태 요약

| 항목 | KPA-a | Neture |
|------|-------|--------|
| Snapshot 테이블 | 있음 | 공유 |
| Controller | KPA 전용 namespace | 없음 |
| 권한 모델 | kpa:operator | neture:operator 필요 |
| Resolver | 없음 (직접 조회) | 없음 |

---

## 3. 목표 아키텍처 (Pilot 단계)

```
Service (KPA / Neture)
    |
Asset Resolver (서비스별)
    |
Asset Snapshot Service (공통)
    |
o4o_asset_snapshots (공통 테이블)
    |
Store Hub
```

---

## 4. Phase 구성

### Phase 1 — Neture Resolver 도입

#### 1-1. Resolver 인터페이스 정의

```typescript
export interface AssetResolver {
  getAssetById(assetId: string): Promise<ResolvedAsset>;
}

export interface ResolvedAsset {
  title: string;
  type: 'cms' | 'signage';
  contentJson: Record<string, unknown>;
  sourceService: string;
}
```

#### 1-2. NetureAssetResolver 구현

위치: `apps/api-server/src/routes/neture/services/neture-asset-resolver.service.ts`

역할:
* Neture CMS 테이블 조회
* Signage 자산 조회
* Snapshot에 저장할 표준 구조로 변환

> Snapshot Service는 Neture 구조를 몰라야 한다.

### Phase 2 — Controller 분리

Neture 추가:
```
POST /api/v1/neture/assets/copy
GET  /api/v1/neture/assets
```

Controller는:
* Resolver만 호출
* SnapshotService로 위임

### Phase 3 — 권한 모델 일반화

| 서비스 | 복사 권한 |
|--------|----------|
| KPA | kpa:operator 이상 |
| Neture | neture:operator 이상 |

공통 함수: `hasServiceOperatorRole(user, serviceKey)`

### Phase 4 — Store Hub 연동

StoreAssetsPage에서:
* sourceService 필터 추가
* Pagination 정상 동작 확인

### Phase 5 — 실사용 검증 (IR)

| 항목 | 기대 |
|------|------|
| Neture CMS → Snapshot 정상 생성 | PASS |
| 중복 방지 UNIQUE 동작 | PASS |
| 권한 차단 정상 | PASS |
| Snapshot 독립성 유지 | PASS |
| Store Hub 노출 정상 | PASS |
| KPA Snapshot과 충돌 없음 | PASS |

---

## 5. 성공 기준

### 기술 기준

* Resolver 분리 성공
* SnapshotService 수정 없이 Neture 적용
* 권한 namespace 분리 성공
* StoreHub 충돌 없음

### 구조 기준

* Snapshot 테이블 변경 없음
* FK 추가 없음
* Source 테이블 참조 없음
* 서비스 간 의존성 없음

---

## 6. 금지 사항

* Snapshot 테이블에 FK 추가
* Service별 Snapshot 테이블 생성
* Snapshot에 원본 참조 강제 연결
* Core 패키지 분리 시도
* Commerce Core 변경

---

## 7. 산출물

* AssetResolver 인터페이스
* NetureAssetResolver
* KpaAssetResolver (기존 코드 리팩토링)
* Neture Asset Controller
* 권한 공통 함수
* Store Hub UI 확장
* IR 보고서 (IR-O4O-ASSET-COPY-NETURE-VALIDATION-V1)

---

## 8. Core 승격 판단 기준

Neture Pilot 완료 후:

| 조건 | 충족 시 |
|------|---------|
| 2개 서비스 적용 성공 | YES |
| Resolver 인터페이스 안정 | YES |
| 권한 모델 공통화 가능 | YES |
| Snapshot 구조 수정 필요 없음 | YES |

→ `@o4o/asset-copy-core` 승격 진행

---

## 관련 문서

| 문서 | 경로 |
|------|------|
| Core 승격 설계 | `docs/work-orders/WO-O4O-ASSET-COPY-CORE-PROMOTION-V1.md` |
| IR 최초 검증 | `docs/investigations/IR-KPA-A-ASSET-COPY-REAL-USAGE-VALIDATION-V1.md` |
| IR 재검증 | `docs/investigations/IR-KPA-A-ASSET-COPY-STABILIZATION-REVALIDATION-V1.md` |

---

*Created: 2026-02-16*
*Status: Active — Phase 1 시작*
