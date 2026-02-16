# WO-O4O-ASSET-COPY-CORE-PROMOTION-V1

> Asset Copy Engine — KPA-a Pilot → O4O Platform Core 승격 설계

---

## 0. 목적

KPA-a에서 Pilot으로 구현된 `Asset Copy Engine`을
플랫폼 공통 모듈로 승격하기 위한 구조 설계 확정.

이 작업은:

* 기능 추가가 아님
* 코드 리팩토링이 아님
* **구조 승격 설계 작업임**

---

## 1. 현재 상태 요약

| 항목 | 상태 |
|------|------|
| Snapshot 테이블 | o4o_asset_snapshots (platform-common 네이밍) |
| FK | 없음 (의도적 독립) |
| Source 메타 | serviceKey + sourceAssetId |
| 권한 | operator 이상 |
| UNIQUE | (org_id, source_asset_id, asset_type) |
| Pagination | 구현 완료 |
| Sanitization | 기본 검증 존재 |
| KPA 종속성 | route 및 role namespace |

현재는 **KPA-a 전용 API 레이어 위에 존재**.

---

## 2. 승격의 목표

Asset Copy Engine을:

> KPA 기능이 아니라
> O4O 플랫폼의 "공통 자산 이동 엔진"으로 정의한다.

---

## 3. Core 승격 기준

### 독립성

* forum_posts FK 없음
* cms_assets FK 없음
* signage_assets FK 없음
* 완전 snapshot 기반

### 조직 중심 모델

* 복사의 주체 = organization
* 소비자는 조직 내 사용자

### 원본 비참조

* source는 추적용 메타데이터일 뿐
* 원본 삭제/수정과 무관

---

## 4. 구조 재정의

### 현재 위치

```
apps/api-server/src/routes/kpa/controllers/asset-snapshot.controller.ts
apps/api-server/src/modules/asset-snapshot/asset-snapshot.service.ts
apps/api-server/src/modules/asset-snapshot/entities/asset-snapshot.entity.ts
```

### 승격 후 위치

```
packages/platform-common/
  ├── asset-copy/
      ├── entities/
      ├── services/
      ├── controllers/
      ├── interfaces/
      ├── guards/
      └── index.ts
```

---

## 5. DB 구조 (고정)

### 테이블: o4o_asset_snapshots

| 컬럼 | 의미 |
|------|------|
| id | PK |
| organization_id | 대상 조직 |
| asset_type | 'cms' / 'signage' |
| source_service | 'kpa', 'neture', etc |
| source_asset_id | 원본 식별자 |
| content_json | 완전 복사본 |
| created_by | 사용자 |
| created_at | 생성일 |

### 원칙

* FK 없음
* 원본 역참조 없음
* organization 중심

---

## 6. API 인터페이스 (Core 기준)

### POST /api/v1/assets/copy

```json
{
  "organizationId": "...",
  "assetType": "cms",
  "sourceService": "kpa",
  "sourceAssetId": "..."
}
```

#### 처리 흐름

1. 권한 확인 (organization scope)
2. source resolver 호출
3. snapshot 생성
4. UNIQUE 검증
5. 반환

### GET /api/v1/assets

Query:

```
?organizationId=
&page=
&limit=
&type=cms
```

---

## 7. 권한 모델 재정의

### 현재

```
kpa:operator
```

### Core 승격 시

```
organization:operator
organization:admin
```

또는

```
scope:organization.manage_assets
```

권한은 **서비스 독립 namespace**로 재정의.

---

## 8. Source Resolver 구조

Core는 원본을 직접 알지 않는다.

```typescript
interface AssetSourceResolver {
  resolve(sourceAssetId: string): Promise<SnapshotPayload>
}
```

각 서비스는 자신의 Resolver를 등록.

예:

* kpa-cms-resolver
* kpa-signage-resolver
* neture-cms-resolver

Core는 resolver만 호출.

---

## 9. 플랫폼 철학 고정

Asset Copy Engine은:

> "참조(reference)"가 아니라
> "스냅샷(snapshot)" 기반

이는 O4O 전체 설계의 기준이 된다.

---

## 10. Core 승격 체크리스트

| 항목 | 완료 조건 |
|------|----------|
| KPA 종속 코드 제거 | route 분리 |
| 권한 namespace 일반화 | 완료 |
| Resolver 패턴 도입 | 완료 |
| 문서 고정 | CLAUDE.md 반영 |
| 플랫폼 테스트 | 최소 2개 서비스 적용 |

---

## 11. Core 승격 조건

다음 조건 충족 시 Core 승격 확정:

* KPA + Neture에서 동일 엔진 사용
* 서비스 종속 코드 0
* API prefix 공통화 완료
* IR 재검증 PASS

---

## 12. 현재 단계

지금 단계는:

* 설계 문서 고정
* 코드 이동은 아직 하지 않음

---

## 13. 전략적 의미

이 작업은:

* 커뮤니티 <-> 매장 연결의 기술적 기준 확정
* 향후 모든 O4O 서비스의 자산 이동 표준 확립
* 플랫폼 철학 "독립성 + 복사 모델" 확정

---

## 관련 문서

| 문서 | 경로 |
|------|------|
| IR 최초 검증 | `docs/investigations/IR-KPA-A-ASSET-COPY-REAL-USAGE-VALIDATION-V1.md` |
| Stabilization WO | (commit 69eddee95) |
| IR 재검증 | `docs/investigations/IR-KPA-A-ASSET-COPY-STABILIZATION-REVALIDATION-V1.md` |

---

*Created: 2026-02-16*
*Status: Design Frozen — Awaiting Pilot 2 or Core Migration*
