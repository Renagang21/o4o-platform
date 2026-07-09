# WO-O4O-CONTENT-RESOURCE-DELETE-GUARD-V1

## 1. 작업명

WO-O4O-CONTENT-RESOURCE-DELETE-GUARD-V1

---

## 2. 배경

[`WO-O4O-CONTENT-RESOURCE-USAGE-TRACE-V1`](WO-O4O-CONTENT-RESOURCE-USAGE-TRACE-V1.md) 완료로 Content Resource(media_assets)의 사용처를 조회할 수 있게 되었다. 그러나 **사용 중인 Resource라도 삭제 요청이 들어오면 이를 막는 표준 절차가 없다.**

[`IR-O4O-CONTENT-RESOURCE-MANAGEMENT-ARCHITECTURE-V1`](../investigations/IR-O4O-CONTENT-RESOURCE-MANAGEMENT-ARCHITECTURE-V1.md) §10: Delete Guard는 Metadata → Unified Search → Usage Trace 다음의 핵심 관리 계층.

## 3. 목적

Content Resource 삭제를 **안전한 표준 절차**로 만든다. "삭제를 막는다"가 아니라 **삭제 전 영향도를 확인하고 사용 중이면 보호**한다.

```
삭제 요청 → Usage Trace 조회 → 사용 중이면 삭제 차단 + 사용처 안내 → 미사용이면 삭제
```

## 4. 적용 범위

- 대상 Resource: `media_assets`
- 조회 소스: Usage Trace API(= `store_execution_assets` 한정, 이번 WO도 동일)
- Admin: `Content Resource → Media Assets`

## 5. 구현 원칙

### 5.1 Usage Trace 재사용
새 사용처 검색 로직을 만들지 않는다. Usage Trace 서비스(`getUsage`)를 그대로 호출한다.

### 5.2 Read Before Delete
삭제 전 반드시 Usage 조회 수행. 삭제는 Usage 결과 기반으로만 동작.

### 5.3 사용 중이면 삭제 금지
`usageCount > 0` 이면 삭제하지 않는다.

### 5.4 강제 삭제 없음
이번 WO에서 Force Delete 를 만들지 않는다.

### 5.5 관리자도 동일 정책
운영자/관리자 예외 없음. 사용 중이면 누구도 삭제 불가.

## 6. Backend — 기존 DELETE API 확장 (additive)

`DELETE /platform/media-library/:id` 를 확장:
```
asset 조회 → getUsage(id) → usageCount
  usageCount === 0 → GCS 삭제 → DB 삭제 → 완료
  usageCount  > 0  → 409 Conflict (삭제하지 않음)
```
- 신규 엔드포인트 없음. 기존 DELETE 흐름에 Usage 게이트 삽입.
- Usage 판정 = Usage Trace 와 동일(img/video/source src 실제 삽입 기준, iframe 제외).

## 7. 응답 (409)

```json
{
  "success": false,
  "code": "RESOURCE_IN_USE",
  "usageCount": 3,
  "message": "현재 사용 중인 Resource입니다.",
  "usages": [ { "surface": "pop", "title": "...", "organizationId": "...", "updatedAt": "..." } ]
}
```
- `usages` 를 함께 반환하여 프론트가 재조회 없이 Dialog 표기 가능(선택).

## 8. Admin UI — Delete Guard Dialog

삭제 버튼 클릭 → (Read Before Delete) Usage 확인 →
- **미사용**: 확인 Dialog → 삭제 실행 → 목록 갱신.
- **사용 중**(또는 서버 409): 차단 Dialog
  ```
  삭제할 수 없습니다.
  현재 POP 2건 · QR 1건 에서 사용 중입니다.
  [사용처 보기]  [취소]
  ```
  - surface 별 건수 요약(usage_type 집계).
  - "사용처 보기" → Usage 탭으로 전환.

## 9. 상세 화면 연계

Usage 탭에서 각 사용처에 "사용처 이동" 링크 제공(가능한 경우 — execution asset/매장 화면 deep-link). deep-link 대상이 불명확하면 이번 WO 범위 밖으로 두고 표기만.

## 10. 착수 전 조사 (CHECK 기록 필수)

현재 `DELETE /platform/media-library/:id`(`MediaLibraryService.deleteAsset`) 동작 실측:
- Hard Delete 인가? GCS 객체 삭제 + DB row 삭제 순서·유무.
- Soft delete/휴지통 존재 여부.
- GCS 삭제 실패 시 DB 처리(트랜잭션/보상) 여부.
→ CHECK 에 현 삭제 경로 기록 후 Usage 게이트만 additive 삽입.

## 11. 삭제 순서 (미사용 확정 후)

```
Usage 0 확정 → GCS 객체 삭제 → DB row 삭제 → 완료
```
중간 실패 시 정합성 확인(로그 + 부분 삭제 방지 판단). 기존 순서가 있으면 유지, Usage 게이트만 선행.

## 12. 제외

Force Delete · 휴지통 · Soft Delete · Restore · Batch Delete · Execution Asset 자체 Guard · Template Guard · SharedProductDescription Guard · Cross-Resource · QR/태블릿/블로그/상품설명 사용처 확대(Usage Trace 후속 WO 범위).

## 13. 검증

브라우저:
1. 미사용 Resource 삭제 → **삭제 성공**, 목록에서 제거, 콘솔 에러 없음.
2. 사용 중 Resource 삭제 시도 → **409 + 차단 Dialog**, 삭제 안 됨, 사용처 요약 표기.
3. (사용 중 자산이 프로덕션에 없으면 §10 조사 후 최소 테스트 사용처 1건 생성하여 차단 케이스 시연 — 테스트 데이터 최소, write 는 승인 후).

## 14. 완료 기준

Delete Guard 동작 · Usage Trace 재사용 · 사용 중 삭제 차단 · 409 반환 · Admin Dialog · 기존 회귀 없음 · typecheck · build · 배포 · 브라우저 smoke · CHECK · commit/push.

## 15. 산출물

CHECK — `CHECK-O4O-CONTENT-RESOURCE-DELETE-GUARD-V1.md`

## 16. 작업 원칙

Usage Trace 재사용 · Additive · Usage 는 Read-only · Force Delete 없음 · 기존 DELETE API 유지 · 최소 변경.

## 17. 후속 WO

```text
WO-O4O-CONTENT-RESOURCE-DELETE-GUARD-V1  (본 WO)
      ↓
WO-O4O-MEDIA-ASSET-OWNERSHIP-V1
      ↓
WO-O4O-CONTENT-RESOURCE-DEDUP-HASH-V1
      ↓
WO-O4O-CONTENT-RESOURCE-VERSIONING-V1
      ↓
WO-O4O-AI-RESOURCE-METADATA-V1
```

---

## 목표

Content Resource는 저장·검색·추적을 넘어 **안전하게 관리되는 자산**이 된다. 이번 WO는 **삭제 전 영향도를 확인하고 사용 중인 Resource를 보호하는 표준 삭제 정책(Delete Guard)**을 구축한다. 이후 Ownership · Dedup · Versioning · AI Metadata 도 이 삭제 정책을 기반으로 확장한다.

---

*Status: 확정 (핸드오프 대기). §10 착수 전 조사 포함. 실행은 별도 지시로 착수.*
