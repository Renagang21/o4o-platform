# WO-APP-DATA-HUB-COPY-PHASE2A-V1

**Data Hub → 내 대시보드 자산화 (실제 복사) 작업 요청서**

> **Status**: In Progress
> **Created**: 2026-02-09
> **Dependency**: WO-APP-DATA-HUB-ACTIONS-PHASE1-V1 ✅

---

## 1. 작업 목적

플랫폼 데이터 허브에 존재하는 **콘텐츠 / 디지털 사이니지 자산을 "내 매장 대시보드의 자산"으로 실제 생성**한다.

> Hub = Read Only
> My Dashboard = Write / Edit / Delete

---

## 2. 작업 범위

### 포함
* 복사 전용 API 구현
* 내 대시보드 레코드 생성
* 원본 ↔ 복사본 참조 관계 저장

### 제외
* UI 변경 (Phase 1 UI 그대로 사용)
* 템플릿/옵션 선택 (Phase 2-B)
* AI 개입 (Phase 3)
* 공개 노출 (무조건 draft)

---

## 3. 적용 대상

| 타입 | 설명 |
|------|------|
| APP-CONTENT | 공지 / 뉴스 / 배너 / 혜택 |
| APP-SIGNAGE | 미디어 / 플레이리스트 |

※ 포럼은 등록 흐름이 다르므로 Phase 2-A 범위에서 제외

---

## 4. API 설계

### T1: 복사 API

```
POST /api/v1/dashboard/assets/copy
```

#### Request Body
```json
{
  "sourceType": "content | signage_media | signage_playlist",
  "sourceId": "uuid",
  "targetDashboardId": "uuid"
}
```

#### 인증
* 로그인 필수
* targetDashboardId에 대한 소유/운영 권한 검증

---

### T2: 처리 로직

1. sourceId 기준 원본 데이터 조회 (Hub)
2. 권한 체크 (공개 자산이면 누구나 가능)
3. **새 레코드 생성**
   * ownerType = "store"
   * ownerId = targetDashboardId
   * status = "draft"
4. 원본 참조 필드 저장
   ```ts
   sourceType
   sourceId
   copiedFromServiceKey
   ```
5. 생성된 대시보드 자산 ID 반환

---

## 5. DB 필드 기준

```ts
source_type        // content | signage_media | signage_playlist
source_id          // 원본 UUID
owner_type         // store
owner_id           // dashboard UUID
status             // draft (고정)
```

📌 **원본 데이터는 절대 수정/연결되지 않음**

---

## 6. 응답

```json
{
  "success": true,
  "dashboardAssetId": "uuid",
  "status": "draft"
}
```

---

## 7. 프론트엔드 연계

Phase 1의 📥 **"내 대시보드로 복사" 버튼**에 연결:
* API 호출
* 성공 시 toast: "내 대시보드에 복사되었습니다. 대시보드에서 편집할 수 있습니다."

---

## 8. 완료 기준 (DoD)

- [ ] 허브 데이터 → 내 대시보드에 실제 레코드 생성됨
- [ ] 생성된 자산은 draft 상태
- [ ] 원본 허브 데이터에 영향 없음
- [ ] 동일 자산 다중 복사 가능
- [ ] 권한 없는 대시보드로는 복사 불가
- [ ] 빌드 성공

---

## 9. 다음 단계 (Phase 2-B)

* 복사 시 템플릿/옵션 선택 모달
* 제목/설명 간단 수정
* 초기 노출 템플릿 선택
