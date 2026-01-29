# WO-8 조사 요약: Signage ↔ CornerDisplay 연결 가능성

## 1. Signage 코드의 현재 책임

### 핵심 구조

```
digital-signage-core (Core)
├── Backend: RenderingEngine (재생 조율)
├── Frontend: PlaybackEngine (Web Player)
└── Entities: Display, DisplaySlot, Playlist, Schedule, MediaSource

signage-player-web (독립 서비스)
└── 브라우저 기반 display client

dropshipping-cosmetics (Extension)
└── SignageContentMapperService (실시간 콘텐츠 자동 생성)
```

### Signage의 책임 범위
알겠습니다.
그럼 **“Neture용 Test Data Pack v1”**을 **바로 Seed로 만들 수 있을 정도로 구체화**해서 정리하겠습니다.
말씀하신 대로 **기존에 만들어져 있는 공급자 계정은 최대한 재활용**하되,
👉 *“입력 공간(폼·설정·연결)을 전부 채운 상태”*를 목표로 합니다.

아래 내용은 **기획자/서비스 개발자 관점에서 바로 작업 지시로 써도 되는 수준**으로 작성하겠습니다.

---

# Neture – Test Data Pack v1 (구체 정의본)

> 목적
>
> * Mock 제거 이후, **모든 화면·흐름·권한·연결 상태를 실제처럼 검증**
> * “빈 화면 없음”, “비어 있는 설정 없음” 상태 만들기
> * 이후 **혈당관리 약국 / 화장품 / KPA / GlucoseView로 그대로 복제 가능한 기준**

---

## 1️⃣ 계정(Account) 세트 – 고정값 제안

> 원칙
>
> * 실제 메일 발송/실사용은 하지 않음
> * 하지만 **형식·권한·연결 구조는 실운영과 동일**

### A. 운영자 (Operator / Admin)

| 항목    | 값                      |
| ----- | ---------------------- |
| 이메일   | `operator@neture.test` |
| 비밀번호  | `Neture!234`           |
| 역할    | operator               |
| 접근 범위 | 전체 서비스                 |
| 비고    | UI에 노출 ❌ / 내부 테스트 전용   |

---

### B. 공급자 (Supplier) – **기존 계정 재활용 권장**

> 이미 존재하는 공급자가 있다면 **이 구조에 맞게 데이터만 채움**

| 항목    | 공급자 A                   | 공급자 B                   |
| ----- | ----------------------- | ----------------------- |
| 이메일   | `supplierA@neture.test` | `supplierB@neture.test` |
| 비밀번호  | `Supplier!234`          | `Supplier!234`          |
| 역할    | supplier                | supplier                |
| 사업자명  | 네이처 헬스 공급               | 케이뷰티 서플라이               |
| 사업자번호 | 123-45-67890            | 234-56-78901            |
| 담당자명  | 김공급                     | 박서플                     |
| 연락처   | 010-9000-1001           | 010-9000-1002           |
| 상태    | active                  | active                  |

👉 **중요 포인트**

* “공급자 정보 입력 화면”에서 **모든 필드가 채워져 있어야 함**
* 대시보드, 정산, 상품 연결 시 *비어 있는 영역이 없어야* 실제 테스트 가능

---

### C. 판매자 / 매장 Owner

| 항목    | 판매자 A                | 판매자 B                |
| ----- | -------------------- | -------------------- |
| 이메일   | `ownerA@neture.test` | `ownerB@neture.test` |
| 비밀번호  | `Owner!234`          | `Owner!234`          |
| 역할    | seller               | seller               |
| 담당 매장 | 매장 A                 | 매장 B                 |
| 상태    | active               | active               |

---

### D. 매장 직원 (Staff)

| 항목   | 값                    |
| ---- | -------------------- |
| 이메일  | `staffA@neture.test` |
| 비밀번호 | `Staff!234`          |
| 역할   | staff                |
| 소속   | 매장 A                 |
| 권한   | 상품 관리 / 주문 조회        |

---

### E. 일반 사용자 (User)

| 항목   | 값                   |
| ---- | ------------------- |
| 이메일  | `user1@neture.test` |
| 비밀번호 | `User!234`          |
| 역할   | user                |
| 용도   | 상품 조회 / 주문 플로우 테스트  |

---

## 2️⃣ 매장(Store) 세트

> 최소 2개, 성격을 명확히 다르게

### 매장 A – 정상 운영 매장 (메인 테스트용)

| 항목      | 값                    |
| ------- | -------------------- |
| 매장명     | 네뚜레 테스트 스토어 A        |
| 유형      | 헬스/라이프스타일            |
| 주소      | 서울시 테스트구 테스트로 123    |
| 전화번호    | 02-1234-5678         |
| 대표자     | 홍네뚜                  |
| 담당자 연락처 | 010-8000-0001        |
| 상태      | 운영중                  |
| 연결 판매자  | ownerA               |
| 연결 공급자  | supplierA, supplierB |

---

### 매장 B – 빈 상태 매장 (UX 검증용)

| 항목     | 값               |
| ------ | --------------- |
| 매장명    | 네뚜레 테스트 스토어 B   |
| 유형     | 미개시             |
| 주소     | 서울시 테스트구 빈상태로 1 |
| 상태     | 준비중             |
| 연결 판매자 | ownerB          |
| 몰      | ❌ 없음            |
| 상품     | ❌ 없음            |

👉 **이 매장으로 확인할 것**

* “몰이 없습니다”
* “상품을 등록하세요”
* “아직 판매가 시작되지 않았습니다”
  → **빈 상태 UX 전부 검증**

---

## 3️⃣ 매장이 운영하는 몰(Shop)

### 매장 A – 몰 1개

| 항목       | 값             |
| -------- | ------------- |
| 몰 이름     | 네뚜레 헬스 마켓     |
| URL Slug | neture-health |
| 운영 상태    | 공개            |
| 결제       | 테스트 결제        |
| 배송 정책    | 기본 배송         |
| 연결 매장    | 매장 A          |

---

## 4️⃣ 상품(Product) 세트 – 최소지만 실전용

> 총 **10개**
> 숫자는 적지만 **유형은 다양하게**

### 상품 구성 예시

| 번호 | 상품명        | 공급자       | 가격     | 상태  |
| -- | ---------- | --------- | ------ | --- |
| 1  | 비타민C 1000  | supplierA | 18,000 | 판매중 |
| 2  | 오메가3 캡슐    | supplierA | 29,000 | 판매중 |
| 3  | 프로바이오틱스    | supplierA | 35,000 | 판매중 |
| 4  | 저분자 콜라겐    | supplierB | 22,000 | 판매중 |
| 5  | 비건 단백질 파우더 | supplierB | 49,000 | 판매중 |
| 6  | 건강차 세트     | supplierB | 15,000 | 품절  |
| 7  | 멀티비타민      | supplierA | 25,000 | 숨김  |
| 8  | 마그네슘       | supplierA | 17,000 | 판매중 |
| 9  | 루테인        | supplierB | 19,000 | 판매중 |
| 10 | 철분제        | supplierA | 14,000 | 판매중 |

👉 이 10개로 테스트 가능한 것:

* 리스트 / 상세
* 가격 표시
* 품절 / 숨김
* 공급자 연결
* 정렬 / 필터
* 장바구니 / 주문

---

## 5️⃣ 주문(Order) – 최소 세트

| 주문번호  | 사용자   | 상품   | 상태   |
| ----- | ----- | ---- | ---- |
| O-001 | user1 | 상품 1 | 주문완료 |
| O-002 | user1 | 상품 2 | 결제대기 |
| O-003 | user1 | 상품 4 | 취소   |

> 결제는 **실결제 ❌ / 주문 생성까지만**
> (결제 연동 테스트는 2차 단계)

---

## 6️⃣ 이 Pack으로 “확인되어야 하는 종료 조건”

Neture v1 종료 조건은 단순합니다.

* [ ] Mock 데이터 전부 제거
* [ ] 위 계정 전부 로그인 가능
* [ ] 역할별 대시보드 정상 진입
* [ ] 매장 A → 몰 → 상품 → 주문 흐름 정상
* [ ] 매장 B → 빈 상태 UX 정상
* [ ] 공급자 대시보드에 상품/연결 정보 표시됨
* [ ] 마이페이지에서 **정보가 비어 있지 않음**

→ 여기까지 되면 **Neture Test Data Pack v1 완료**

---

## 7️⃣ 다음 단계 연결성

이 Pack은 그대로:

* 혈당관리 약국 → **매장 = 약국 / 상품 = 서비스**
* 화장품 → **상품 수만 확장**
* KPA-Society → **매장 대신 조직**
* GlucoseView → **데이터 소비**

로 재사용 가능합니다.

---

### 다음 선택지

이제 바로 다음으로 갈 수 있는 건 딱 두 가지입니다.

1️⃣ **이 Pack을 기준으로 “Seed 작업 순서 체크리스트” 작성**
(개발 채팅방에 바로 던질 수 있게)

2️⃣ **혈당관리 약국용 Test Data Pack v1을 이 구조 그대로 변형**
(약국 공통 데이터 기준 반영)

어느 쪽으로 이어갈지 말씀 주시면, 그 방향으로 바로 이어서 정리하겠습니다.

| 책임 | 설명 |
|------|------|
| **물리 기기 관리** | Display 엔티티로 deviceCode, heartbeat, 온/오프라인 추적 |
| **화면 영역 분할** | DisplaySlot으로 하나의 화면을 여러 zone으로 분리 |
| **콘텐츠 시퀀스** | Playlist + PlaylistItem으로 순차 재생 |
| **시간 기반 스케줄** | Schedule로 "언제 무엇을" 제어 |
| **자동 재생** | RenderingEngine이 duration 기반 자동 전환 |

---

## 2. CornerDisplay와 겹치는 영역 / 겹치지 않는 영역

### 겹치는 영역 (주의 필요)

| 영역 | Signage | CornerDisplay | 충돌 여부 |
|------|---------|---------------|-----------|
| **물리 기기 식별** | Display.deviceCode | CornerDisplayDevice.deviceId | 🟡 개념 유사 |
| **화면 구성 단위** | DisplaySlot (zone) | CornerDisplay (corner) | 🟡 1:1 대응 가능 |
| **콘텐츠 소스** | MediaSource (URL/파일) | Listings API (제품) | 🟢 다름 |

### 겹치지 않는 영역 (안전)

| 영역 | Signage 담당 | CornerDisplay 담당 |
|------|-------------|-------------------|
| **콘텐츠 타입** | 비디오, 이미지, HTML | 제품 그리드/리스트 |
| **전환 방식** | 시간 기반 자동 슬라이드 | 정적 표시 (또는 수동 새로고침) |
| **상호작용** | 완전 차단 (zero-ui) | AI 버튼, 터치 가능 |
| **데이터 소스** | 관리자 업로드 미디어 | Phase 1 Listings API |

---

## 3. 연결 가능한 최소 지점

### 방안 A: DisplaySlot에 CornerDisplay 삽입 (권장)

```
기존 Signage Template
├── Zone 1: Header (로고, 시계)
├── Zone 2: Main (기존 Playlist - 비디오/이미지)
├── Zone 3: Sidebar (✅ CornerDisplay 삽입)
└── Zone 4: Footer (틱커, 날씨)
```

**구현 방식:**
1. SignageContentBlock에 `blockType: 'corner-display'` 추가
2. settings에 `{ cornerId: 'xxx', deviceType: 'signage' }` 저장
3. Web Player가 해당 블록 렌더링 시 CornerDisplayHost 호출

**장점:**
- 기존 Signage 구조 변경 최소화
- CornerDisplay는 "하나의 콘텐츠 블록"으로 동작
- Playlist의 다른 콘텐츠와 공존

### 방안 B: CornerDisplay 전용 Signage View (대안)

```
CornerDisplay (deviceType: 'signage')
├── 전체 화면 = 제품 그리드
├── 자동 새로고침 (30초/1분 간격)
└── Signage 시스템과 독립
```

**장점:**
- 완전한 분리로 충돌 없음
- Phase 2 구조 그대로 유지

**단점:**
- Signage의 스케줄/모니터링 기능 사용 불가
- 별도 관리 필요

---

## 4. 구조 충돌 포인트

### 충돌 1: 기기 식별 이중화

| 시스템 | 식별자 |
|--------|--------|
| Signage | Display.deviceCode |
| CornerDisplay | CornerDisplayDevice.deviceId |

**해결:** 동일 값 사용 규칙 정의
```
deviceId = deviceCode = 'signage_store_001'
```

### 충돌 2: 화면 제어 권한

- Signage: RenderingEngine이 화면 전체 제어
- CornerDisplay: 독립적 렌더링 원함

**해결:** Zone 단위 분리 (방안 A 채택 시)
- CornerDisplay Zone은 Signage가 "렌더링만 위임"
- ActionExecution에서 해당 Zone 건드리지 않음

### 충돌 3: 데이터 Refresh 주기

- Signage: duration 기반 (item마다 고정 시간)
- CornerDisplay: 실시간 또는 수동 새로고침

**해결:** CornerDisplay Zone은 자체 refresh 로직 사용
```typescript
// SignageContentBlock (corner-display)
settings: {
  refreshIntervalMs: 60000,  // 1분마다 Listings API 재조회
  cornerId: 'premium_zone'
}
```

---

## 5. "이 상태에서 바로 연결 가능한가?" 판단

### 결론: **조건부 가능 (방안 A 권장)**

| 조건 | 충족 여부 |
|------|----------|
| Signage가 상호작용 없는 화면인가 | ✅ zero-ui 모드 존재 |
| Zone 단위 분리 가능한가 | ✅ DisplaySlot/TemplateZone 구조 |
| 외부 데이터 주입 지점 있는가 | ✅ SignageContentBlock 확장 가능 |
| Phase 1 Listings API 호출 가능한가 | ✅ fetch 기반 (Web Player에서) |
| Extension OFF 시 영향 없는가 | ✅ Signage Core는 독립적 |

### 권장 접근

1. **SignageContentBlock 확장** (최소 변경)
   - `blockType: 'corner-display'` 추가
   - Web Player에서 CornerDisplayHost 컴포넌트 렌더링

2. **Signage Template에 Zone 추가**
   - 운영자가 "제품 표시 영역"을 Zone으로 지정
   - 해당 Zone에 corner-display 블록 배치

3. **자동 새로고침 구현**
   - CornerDisplay Zone만 주기적 API 재호출
   - 다른 Zone (비디오 등)은 기존 방식 유지

---

## 6. 다음 단계 권장

### WO-8-B: Signage ↔ CornerDisplay 연결 구현

**범위:**
1. SignageContentBlock에 `corner-display` 타입 추가
2. signage-player-web에 CornerDisplayHost 연동
3. Admin Dashboard에 Zone 설정 UI 추가

**예상 변경 파일:**
- `packages/digital-signage-core/src/backend/entities/signage-content-block.entity.ts`
- `services/signage-player-web/src/components/blocks/CornerDisplayBlock.tsx` (신규)
- `apps/admin-dashboard/src/pages/digital-signage/v2/TemplateBuilder.tsx`

**완료 기준:**
- Signage 화면의 특정 Zone에 CornerDisplay(제품 그리드) 표시
- 제품 목록이 주기적으로 새로고침
- 기존 Signage 기능 (비디오, 스케줄) 정상 동작

---

## 7. 요약

| 항목 | 결론 |
|------|------|
| Signage 현재 책임 | 물리 기기 + 콘텐츠 시퀀스 + 시간 스케줄 + 자동 재생 |
| CornerDisplay와 겹치는 영역 | 기기 식별, 화면 단위 (해결 가능) |
| 겹치지 않는 영역 | 콘텐츠 타입, 데이터 소스, 상호작용 방식 |
| 연결 최소 지점 | SignageContentBlock 확장 (blockType: 'corner-display') |
| 구조 충돌 | 3개 (모두 해결 가능) |
| 바로 연결 가능한가 | ✅ 조건부 가능 (방안 A 권장) |

---

*WO-8 조사 완료: 2026-01-22*
