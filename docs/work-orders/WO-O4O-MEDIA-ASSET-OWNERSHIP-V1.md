# WO-O4O-MEDIA-ASSET-OWNERSHIP-V1

## 1. 작업명

WO-O4O-MEDIA-ASSET-OWNERSHIP-V1

---

## 2. 배경

[`WO-O4O-CONTENT-RESOURCE-METADATA-STANDARDIZATION-V1`](WO-O4O-CONTENT-RESOURCE-METADATA-STANDARDIZATION-V1.md) 에서는 Owner 를 의도적으로 최소 범위(`uploaded_by`, `service_key`)만 사용했다. F6 [`Boundary Policy`](../architecture/O4O-BOUNDARY-POLICY-V1.md) 에 영향을 주는 조직(owner) 모델을 충분히 검토하기 전에 관계를 추가하지 않기 위함이었다.

이제 Metadata · Unified Search · Usage Trace · Delete Guard 가 완료되었으므로, Content Resource(media_assets)의 실제 소유 관계를 표준화한다.

## 3. 목적

Media Asset 의 소유자를 명확히 정의한다. Owner 는 다음을 구분한다:

```
누가 업로드했는가(uploaded_by) ≠ 어느 조직의 자산인가(owner) ≠ 누가 관리하는가
```

## 4. 적용 대상

- 이번 WO 는 `media_assets` 만 적용.
- 다른 Resource 는 후속 WO 에서 동일 구조를 따른다.

## 5. 구현 원칙

### 5.1 UploadedBy ≠ Owner
기존 `uploaded_by` 는 **업로드한 사람**이지 Owner 가 아니다. 예: 운영자가 대신 업로드했지만 자산은 약국(store) 소유일 수 있다.

### 5.2 Owner 는 Organization 기준
소유 위계: `Organization → Store → User`. User 는 관리자(주체)일 뿐 최종 소유 단위가 아니다.

### 5.3 기존 Resource 영향 없음
기존 Resource 는 Owner 가 없어도 계속 동작. 신규 컬럼은 **nullable**, **Backfill 없음**.

### 5.4 Boundary 유지 (F6)
Organization FK 는 추가하되 도메인 간 참조를 최소화한다. 기존 Service Boundary(serviceKey 기반 격리)를 깨지 않는다. media_assets 는 공용 자산이므로 owner 는 **선택적 소유 표기**이지 강제 필터가 아님(§8 참조).

## 6. 데이터 모델 (신규 컬럼, 전부 nullable)

```
organization_id  uuid     nullable
owner_type       varchar  nullable   -- operator | supplier | organization | store
owner_store_id   uuid     nullable
```

- ESM/TypeORM 규칙 준수: FK 관계는 `import type` + 문자열 관계명(§CLAUDE.md 2). 단순 uuid 컬럼으로 두고 도메인 간 hard FK 는 지양(§5.4).

## 7. 생성 규칙 (업로드 시 owner 결정)

| 업로드 주체 | organization_id | owner_type | owner_store_id |
|---|---|---|---|
| 운영자 | NULL | `operator` | NULL |
| 매장 | 매장 조직 | `store` | store id |
| 공급자 | 공급자 조직 | `supplier` | NULL |
| 조직(일반) | 조직 | `organization` | NULL |

- 기존 업로드 경로는 owner 미지정 시 nullable 유지(회귀 없음). owner 결정 컨텍스트가 있는 경로부터 점진 적용.

## 8. 조회 정책

- **관리자/운영자**: 모든 Resource 조회 가능(기존 유지).
- **매장**: 자신의 Organization Resource 만 조회(향후 store 소비 경로에 적용 — 이번 WO 는 admin 조회 표기 우선, store 필터는 owner 컬럼 존재를 전제로 후속).
- **Boundary(F6)**: owner 는 조회 편의 표기이며, media_assets 의 공용 성격을 바꾸지 않는다. CHECK 에 명시.

## 9. Admin UI

Media Resource 상세(Resource 상세 모달)에 소유 정보 표시:
```
Owner(owner_type) · Organization · Uploaded By · Created At
```
- 편집은 **Owner 변경만** 지원(owner_type / organization_id / owner_store_id).
- `uploaded_by` 는 **변경하지 않는다**(불변 — 감사 추적).

## 10. Migration

`organization_id` / `owner_type` / `owner_store_id` 를 `ADD COLUMN IF NOT EXISTS` 로 additive 추가. 전부 nullable. **Backfill 없음.** 기존 코드 영향 없음. 타임스탬프 = 순차 카운터 규칙 준수.

## 11. 검증

- 기존 목록/검색 회귀 없음.
- 업로드 정상(owner 미지정도 정상).
- Owner 저장/조회 정상(신규 owner 지정 케이스).
- 기존 Resource(owner NULL) 정상 표시.
- typecheck · build · 배포 · 브라우저 smoke · 콘솔 에러 없음.

## 12. 완료 기준

Owner 모델 적용 · Organization 연결 · 기존 uploaded_by 유지 · Admin Owner 표시/편집 · 기존 기능 회귀 없음 · typecheck · build · 배포 · CHECK · commit/push.

## 13. 산출물

CHECK — `CHECK-O4O-MEDIA-ASSET-OWNERSHIP-V1.md`

## 14. 작업 원칙

Additive Migration · Nullable · Backfill 없음 · 기존 URL 변경 없음 · 기존 Resource 변경 없음 · 기존 Permission 유지 · Boundary(F6) 유지 · 최소 변경.

## 15. 후속 WO

```text
WO-O4O-MEDIA-ASSET-OWNERSHIP-V1  (본 WO)
      ↓
WO-O4O-CONTENT-RESOURCE-DEDUP-HASH-V1
      ↓
WO-O4O-CONTENT-RESOURCE-VERSIONING-V1
      ↓
WO-O4O-AI-RESOURCE-METADATA-V1
```

---

## 목표

Content Resource 는 단순한 파일이 아니라 **"어느 조직이 소유하고 관리하는 자산인지 명확한 Resource"** 가 된다. Ownership 은 이후 Permission · Sharing · AI 추천 · Resource 정책의 기준이 되는 표준 모델로 확립한다.

---

*Status: 확정 (핸드오프 대기). Delete Guard 이후 단계. 실행은 별도 지시로 착수.*
