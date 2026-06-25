# CHECK-O4O-KPA-STORE-CONSULTATION-REQUEST-MENU-HIDDEN-ROUTE-CLEANUP-V1

> WO: `WO-O4O-KPA-STORE-CONSULTATION-REQUEST-MENU-HIDDEN-ROUTE-CLEANUP-V1`
> 선행: `WO-...-CONSULTATION-REQUEST-NOTIFICATION-WIRING-V1`(`9c49a0c9b`) + 운영 smoke PASS(`50b51d9c3`)
> 작업일: 2026-06-25 / 성격: **IA 정리 (기능 삭제 아님)**

---

## 1. 변경 요약

상담 요청은 이제 요청 생성 시 매장 사용자 알림이 생성되고(선행 WO), 알림 클릭으로 `/store/requests` 처리 화면에 진입한다.
따라서 KPA 매장 사이드바의 `고객 응대 > 상담 요청` 메뉴를 제거하고, `/store/requests` 는 **알림/URL/홈 신호로 진입하는 hidden route** 로 유지한다.

요청 테이블·API·처리 기능(확인/완료/취소)·요청 생성·알림 생성은 모두 불변.

---

## 2. 변경 파일

| 파일 | 변경 |
|---|---|
| `packages/store-ui-core/src/config/storeMenuConfig.ts` | `KPA_SOCIETY_STORE_CONFIG` 의 `고객 응대` 그룹에서 `{ key:'requests', label:'상담 요청' }` 항목 제거 (그룹은 `태블릿` 단독 유지) |
| `services/web-kpa-society/src/App.tsx` | `requests` route 유지 + 주석을 hidden route(알림/URL/홈신호 진입)로 갱신 |
| `services/web-kpa-society/src/pages/pharmacy/TabletRequestsPage.tsx` | 안내 문구 defaultContent 를 알림 중심으로 갱신 |

DB/API/migration: **없음.**

---

## 3. route 유지 근거

- `App.tsx`: `<Route path="requests" element={<TabletRequestsPage />} />` 그대로 유지(삭제하지 않음).
- 선행 WO 의 알림 `metadata.targetUrl='/store/requests'` 가 계속 동작해야 하므로 route 필수.
- 진입 동선 3가지: (1) 요청 알림 클릭, (2) URL 직접, (3) 홈 Live Signals `상담 요청 N건 대기` CTA.
- `channels/tablet → /store/requests` redirect(App.tsx)도 유지.

---

## 4. 메뉴 제거 근거

- 선행 WO 운영 smoke PASS(`50b51d9c3`)로 알림→처리 동선이 실증됨 → 사이드바 상시 메뉴 불필요.
- IR-O4O-KPA-STORE-CONSULTATION-REQUESTS-NOTIFICATION-REPLACEMENT-AUDIT-V1 의 목표 상태(B안: 알림 보완 후 메뉴 정리)에 도달.
- `KPA_SOCIETY_STORE_CONFIG` 블록만 수정 — `COSMETICS_STORE_CONFIG`/`GLYCOPHARM_STORE_CONFIG` 무변경(GP/KCos 는 애초 메뉴 미등록, route only).

---

## 5. 링크 정리 결과

| 위치 | 상태 | 처리 |
|---|---|---|
| `StoreChannelsPage.tsx` | 상담/`/store/requests` 참조 **없음** (온라인 판매 분리 WO 시 이미 정리됨) | 변경 없음 |
| `StoreHomePage.tsx:161-167` | 홈 **Live Signals** 조건부 CTA (`pendingTabletRequests>0` 일 때만 `상담 요청 N건 대기` → `/store/requests`) | **유지** |

> StoreHomePage CTA 유지 결정: 이 링크는 사이드바 메뉴를 전제로 한 CTA 가 아니라, **대기 건수가 있을 때만 노출되는 알림/신호형 deep-link** 다. 대상 route(`/store/requests`)가 유지되므로 깨진 링크가 아니며, 알림 중심 운영 방향과 부합(홈에서 미처리 요청을 한눈에 파악 + 처리화면 진입). 제거 시 store-owner 의 미처리 인지 수단이 줄어들어 유지가 타당.

---

## 6. 검증 결과

| 항목 | 결과 |
|---|---|
| store-ui-core typecheck | ✅ PASS (error 0) |
| web-kpa-society typecheck (storeMenuConfig/App/TabletRequestsPage) | ✅ PASS (error 0) |
| 편집 블록 KPA 한정 (`KPA_SOCIETY_STORE_CONFIG`) | ✅ (Cosmetics/GlycoPharm config 무변경) |
| `고객 응대` 그룹 빈 그룹화 여부 | ✅ 아님 (`태블릿` 단독 유지) |
| route 유지 | ✅ |
| 브라우저 smoke (메뉴 미노출 / 알림→이동 / 처리 / URL 직접) | ✅ **PASS** (§6-1) |

### 6-1. 운영 브라우저 smoke 결과 — 2026-06-25 PASS

- 환경: `https://kpa-society.co.kr` (Deploy Web Services success, 커밋 `66df866b1`)
- 계정: "🧪 체험용 약국 경영자 계정" → Sohae 약국 owner(`sohae2100`, org `c9beb4a2…`) 세션

| smoke 단계 | 결과 |
|---|---|
| 1. 사이드바 `고객 응대` 그룹에 `상담 요청` 메뉴 미노출 | ✅ (그룹 펼침 시 `태블릿`(/store/commerce/tablet-displays) 단독) |
| 2. 상담 요청 생성 (`POST /stores/sohae-약국/tablet/interest`) | ✅ 201, requestId `d4febf3d…` |
| 3. 알림 생성·도착 (bell) | ✅ store.consultation_requested, serviceKey=kpa-society |
| 4. 알림 클릭 → 이동 | ✅ `/store/requests` (route 유지 확인) |
| 5. 안내 문구 갱신 노출 | ✅ "상담 요청이 접수되면 알림으로 알려드립니다. 이 화면에서 접수된 요청을 확인·완료 처리할 수 있습니다." |
| 6. 목록 표시 | ✅ 대기 1건, NEW, 미네락 600, 메뉴정리smoke |
| 7. 확인 처리 | ✅ ACKNOWLEDGED |
| 8. 완료 처리 | ✅ COMPLETED (목록에서 제거) |
| 9. `/store/requests` URL 직접 진입 (새 로드) | ✅ 정상 렌더 (404 아님) |
| 10. 알림 읽음 처리 | ✅ isRead=true |

- 회귀: 확인/완료 동작·5초 polling·직접 진입 유지. 요청 생성/알림 생성 정상.
- 검증 채널: 프론트(브라우저 DOM) + 프로덕션 DB read-only SELECT.

---

## 7. 제외한 범위 (WO §제외 그대로)

- `/store/requests` route 삭제 / `TabletRequestsPage` 삭제
- `tablet_interest_requests` 삭제 / 요청 생성 API 변경 / 알림 생성 로직 / `NotificationType` 변경
- QR page 상담 CTA / `source` 컬럼 / GP·KCos 메뉴 정리 / 주문·온라인 판매 메뉴 정리
- `StoreSidebar.tsx` 의 `'requests': Users` 아이콘 맵 엔트리 — 공통 컴포넌트라 미수정(미사용 lookup 잔존이나 무해, 데드링크 아님)

---

## 8. 후속 과제

1. GP/KCos 상담 요청 메뉴/알림 parity (서비스 구조 차이로 별도 WO)
2. QR page 콘텐츠 하단 상담 CTA 옵션
3. `tablet_interest_requests` source 구분 / 공통 `customer_requests` 모델 통합 IR
4. `StoreSidebar` 아이콘 맵 미사용 키 정리(공통 모듈 점검 시)
5. 온라인 판매 주문 관리/매출 KPI 신설 (IR-O4O-KPA-ONLINE-SALES-FIRST-CLASS-MENU-DESIGN-V1 C안)
