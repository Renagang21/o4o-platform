# Store Owner Contract Termination & Data Return Runbook V1

> 기준 WO: `WO-O4O-STORE-OWNER-AGREEMENT-PUBLISH-PREREQUISITES-V1`  
> 적용: KPA Society · K-Cosmetics · PharmacyHub  
> 목적: 매장 경영자 계약 종료 시 반환 요청, Store 접근 종료, 종료+7일 활성 저장소 파기를 같은 case SSOT로 수행한다.

## 1. 원칙

- 일반 서비스 회원자격은 계약 종료와 자동으로 삭제하지 않는다.
- 해당 서비스의 `store_owner` role과 Store↔Service 연결만 종료한다.
- 공급자/운영자 원본과 보안·감사로그는 Store purge 대상이 아니다.
- 다른 활성 Store 서비스가 같은 organization을 사용하는 동안 organization-shared 데이터는 삭제하지 않는다.
- GCS 삭제 실패는 성공으로 간주하지 않는다. case는 `failed / PURGE_INCOMPLETE` 상태로 남고 hourly job이 재시도한다.
- 실제 운영 매장 purge 전에는 반드시 `purge-preview`를 확인한다.
- scheduler는 실삭제를 수행하지 않는다. 파기는 admin의 명시적 `mode=apply`만 허용한다.

## 2. API

모든 endpoint는 platform admin 인증이 필요하다.

### 종료 case 생성

`POST /api/v1/admin/store-owner-terminations`

```json
{
  "serviceKey": "kpa-society",
  "organizationId": "<uuid>",
  "userId": "<uuid>",
  "returnRequested": true,
  "terminationEffectiveAt": "2026-10-01T00:00:00+09:00"
}
```

### 반환 package

`GET /api/v1/admin/store-owner-terminations/:id/return-package`

- JSON 전자적 반환형식
- A/B/D/E 데이터만 포함
- 공급자 원본·감사로그 제외
- 응답의 `manifestHash`로 전달본 무결성 기록 가능

사용자에게 실제 전달이 끝난 후에만:

`POST /api/v1/admin/store-owner-terminations/:id/return-completed`

### 종료 적용

예정일이 도래하면 hourly job이 자동 적용한다. 긴급 수동 적용:

`POST /api/v1/admin/store-owner-terminations/:id/terminate`

효과:
- store_owner role 비활성
- 해당 `organization_service_enrollments` inactive
- 해당 서비스 공개 slug/게시 Store 콘텐츠 비활성
- `purge_due_at = termination_effective_at + 7 days`

### 파기 dry-run

`GET /api/v1/admin/store-owner-terminations/:id/purge-preview`

확인:
- SERVICE_SCOPED → DELETE
- ORGANIZATION_SHARED → 다른 활성 Store 서비스가 있으면 PRESERVE
- SUPPLIER_OWNED / SYSTEM_LOG → PRESERVE
- `mediaCandidates`

### 수동 실파기

7일 기한이 도래한 뒤에만:

`POST /api/v1/admin/store-owner-terminations/:id/purge`

```json
{ "mode": "apply" }
```

hourly job은 7일 기한 도래/초과 건수를 감지·경고만 한다. 실제 purge는 운영자가 dry-run을 확인한 뒤 `mode=apply`로 명시 실행한다. 실패한 `PURGE_INCOMPLETE` 건도 같은 절차로 재시도한다.

## 3. GCS

`store_execution_assets.file_url`과 동일 URL의 `media_assets` 중:
- 해당 매장 경영자가 업로드
- 해당 서비스 key
- 다른 organization에서 재참조하지 않음

인 경우에만 물리 삭제 후보가 된다.

`MediaLibraryService.deleteAsset()`의 reference guard를 통과해야 하며 storage 삭제 실패 시 DB row도 성공 처리하지 않는다.

## 4. 백업

활성 저장소 파기 후 Cloud SQL 자동백업/PITR은 정본 보유주기(약 7일), 수동 복구본은 최대 30일 정책에 따라 순차 소멸한다. 개별 매장 단위로 백업을 직접 편집하지 않는다.

## 5. 완료 판정

case가 `purge_completed`이고:
- `purge-preview`의 DELETE 대상이 0
- 다른 서비스 shared 데이터가 의도대로 PRESERVE
- GCS 실패 없음

이어야 운영 종료 완료로 본다.
