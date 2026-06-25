# CHECK-O4O-KPA-STORE-QR-TARGET-SCOPE-A-PHASE-V1

> 기준 IR: [IR-O4O-KPA-STORE-QR-TARGET-SCOPE-AUDIT-V1](./IR-O4O-KPA-STORE-QR-TARGET-SCOPE-AUDIT-V1.md)
> 작업: A안(프론트 최소 수정) + 백엔드 권한 확인
> 일자: 2026-06-25 / 범위: KPA 우선

---

## 1. 작업 요약

매장 경영자 QR 생성 화면(`/store/marketing/qr`)이 "내 자료에서 만들기" 동선만 보이던 문제를
**페이지 내부 선택 모달 직접 오픈 + 전체 자산 노출**로 보완.

### 변경 파일
- `services/web-kpa-society/src/pages/pharmacy/StoreQRPage.tsx`

### 변경 내용 (A안)
1. **헤더에 "QR 만들기" 1차 버튼 추가** — `setShowSelector(true)` 로 선택 모달 직접 오픈.
   목록이 있을 때도 신규 생성 진입이 가능해짐(기존엔 "자료 변경" 외 진입 없음).
2. **빈 상태 CTA 변경** — "내 자료에서 QR 만들기"(`/store/library/resources` 이탈 `<Link>`)를
   "콘텐츠·자료·내 매장 제작자료에서 QR 만들기" **버튼**으로 교체 → 모달 직접 오픈(이탈 없음).
3. **`StoreAssetSelectorModal` 의 `usageType="qr"` 제거** — `usage_type='qr'` 태깅 여부와 무관하게
   전체 store_execution_assets(file/content/external-link) 노출. `autoLandingType` 로 안전 변환.
4. 기존 "매장 HUB에서 가져오기" 동선, 동영상 prefill, 출력/통계 기능은 그대로 유지.

---

## 2. 백엔드 권한 확인 (작업 2)

| 항목 | 결과 |
|---|---|
| `GET /api/v1/kpa/contents?status=ready` | ✅ **접근 가능 (200)** |

근거: `kpa.routes.ts:1454` — `contentRouter.get('/', optionalAuth, ...)` (공개 접근).
`?status=ready` 전달 + 로그인 사용자(매장 경영자)일 때, published-only 제한 분기(`else if (!userId)` /
`else if (!statusFilter)`)를 타지 않으므로 **작성자 무관 전체 ready 콘텐츠 반환** (`kpa.routes.ts:1469-1478`).

→ **B안 콘텐츠 탭은 백엔드 수정 없이 `contentHub.ts`(`listContentHubItems({status:'ready'})`) 재사용으로 구현 가능.**
별도 매장용 read-only 콘텐츠 목록 엔드포인트 신규 **불필요**.

---

## 3. 검증

| 항목 | 방식 | 결과 |
|---|---|---|
| 타입체크 (`tsc --noEmit`, web-kpa-society) | 정적 | ✅ PASS (에러 0) |
| 빈 상태 새 버튼 → 모달 직접 오픈 | 브라우저 smoke | ⏳ 배포 후 |
| `usage_type='qr'` 미태깅 자료 노출 | 브라우저 smoke | ⏳ 배포 후 |
| 자료 선택 → QR 저장 성공 | 브라우저 smoke | ⏳ 배포 후 |
| external-link → `landingType='link'` 저장 | 브라우저 smoke | ⏳ 배포 후 |
| file/content → `landingType='page'` 저장 | 브라우저 smoke | ⏳ 배포 후 |
| HUB 가져오기 / 동영상 prefill 회귀 없음 | 브라우저 smoke | ⏳ 배포 후 |

> 브라우저 smoke 는 Cloud Run 배포 후 실 화면 DOM 확인으로 별도 수행.

---

## 4. 남은 작업 (후속)

- **B안** — `StoreAssetSelectorModal` 에 source 탭(자료 / 콘텐츠 / 내 매장 제작자료 / 링크) 추가.
  콘텐츠 탭은 `contentHub.ts` 재사용(권한 확인됨). 콘텐츠 선택 시 C-1(참조형: `landingType='page'`,
  `landingTargetId=content.id`) 저장 경로 연결.
- **동영상 통합** — `PharmacyVideoPage` prefill 경로를 모달 "내 매장 제작자료" 탭으로 흡수(선택).
- GP/KCos 공통화는 KPA 안정화 후 별도 IR/WO.
