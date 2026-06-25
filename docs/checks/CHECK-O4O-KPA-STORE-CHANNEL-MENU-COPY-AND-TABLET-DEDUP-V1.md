# CHECK-O4O-KPA-STORE-CHANNEL-MENU-COPY-AND-TABLET-DEDUP-V1

> WO-O4O-KPA-STORE-CHANNEL-MENU-COPY-AND-TABLET-DEDUP-V1 (A안) 실행 결과
> 실행일: 2026-06-25 · 대상: 프로덕션 `https://kpa-society.co.kr`
> 근거 IR: IR-O4O-KPA-STORE-CHANNEL-MENU-PURPOSE-AUDIT-V1 (커밋 4d1fa4fb0)
> 구현 커밋: `e557a341d` (frontend, KPA 단일 파일) — Web Cloud Run 배포 완료

## 변경 배경

`채널 관리`는 실기능(B2C 온라인 스토어 = 주문/결제 연결)이나, (a) 사용자 노출 문구에 기술 용어("B2C/채널 만들기")가 남고, (b) TABLET 탭이 `채널 > 태블릿` 단독 메뉴와 기능 중복. A안 = 문구 정비 + TABLET 탭 제거(태블릿 단독 메뉴로 일원화). dead code 아님이 확인되어 "숨김/삭제"는 비대상.

## 변경 파일

| 파일 | 변경 |
|---|---|
| `services/web-kpa-society/src/pages/pharmacy/StoreChannelsPage.tsx` | TABLET 탭/패널/관련 import·state·effect·JSX 제거(−502/+28줄) + 문구 정비 |

- backend/DB/마이그레이션 **변경 없음** (`channel_type='B2C'` enum 불변 — 내부 식별자).
- 공통 `storeMenuConfig.ts` **변경 없음** (KPA `채널` 그룹: 채널 관리/태블릿/상담 요청 유지).
- GP/KCos 파일·메뉴 **변경 없음**.

## 문구 변경 전 → 후

| 위치 | 전 | 후 |
|---|---|---|
| 빈 상태 안내 | "아직 등록된 채널이 없습니다 / 첫 채널을 생성하세요" | "아직 온라인 스토어가 시작되지 않았습니다 / 온라인 스토어를 시작하세요" |
| 빈 상태 버튼 | "B2C 채널 만들기" | "온라인 스토어 시작" |
| 헤더 생성 버튼 | "채널 만들기" | B2C "온라인 스토어 시작" / KIOSK "키오스크 등록" |
| 제품목록 생성 버튼 | "채널 만들기" | 동일 분기 |
| 생성 성공/실패 toast | "…채널이 생성되었습니다 / 채널 생성에 실패했습니다" | "…을(를) 시작했습니다 / … 시작에 실패했습니다" |
| 가이드 fallback | "온라인 스토어와 태블릿…/ 태블릿 디바이스별 진열 step" | 온라인 스토어 중심(태블릿 문구 제거) |

## TABLET 탭 제거 방식

- `CHANNEL_TABS`에서 TABLET 항목 제거 → 탭 = 온라인 스토어(B2C) / 키오스크(KIOSK).
- `TabletDisplaysPanel` 컴포넌트 + `TabletDisplayEntry` 인터페이스 삭제.
- 관련 import 제거: lucide `Tablet`, `../../api/tabletDisplays`(fetchTablets/…), storeHub `fetchLiveSignals`.
- `pendingInterestCount` state + useEffect 삭제, TABLET 전용 JSX(KPI 대기상담/Quick Action 태블릿진열·상담확인/render[E] 패널) 제거.
- `noUnusedLocals` 통과 위해 잔여 dead reference 0 확인.

## 브라우저 smoke (배포본 e557a341d, store-owner)

| # | 검증 | 결과 | 근거 |
|---|------|:---:|------|
| 1 | `/store/channels` 진입 | ✅ | 정상 렌더 |
| 3 | 온라인 스토어 없는 매장 버튼 문구 | ✅ PASS | "아직 온라인 스토어가 시작되지 않았습니다" + 버튼 "온라인 스토어 시작" (배포 반영 확인) |
| 2 | 탭에서 TABLET 사라짐 | ✅(코드+배포) | CHANNEL_TABS=B2C/KIOSK만(타입체크 클린, −502줄). 데모 매장은 B2C_COMMERCE capability 미활성 → 채널 0 → 빈 상태가 반환되어 탭 바 시각 노출은 capability gate로 차단(본 변경과 무관). 빈 상태 신규 문구 배포로 신 번들 라이브 확인 |
| 4 | 기존 온라인 스토어 진열/slug/URL 유지 | ✅(코드) | B2C 제품관리/slug/자산채널맵/주문 연결 코드 영역 미변경. 데모 매장 채널 부재로 시각 확인은 동일 capability gate로 차단 |
| 5 | 태블릿 단독 메뉴 정상 | ✅ PASS | `/store/commerce/tablet-displays` "태블릿 진열 관리" 로드 + "태블릿 추가" 동작 |
| 6 | 상담 요청 메뉴 유지 | ✅ PASS | 사이드바 `채널` 그룹: 채널 관리 / 태블릿 / 상담 요청 |
| 7 | GP/KCos 무변경 | ✅ | GP/KCos 파일·공통 메뉴 config 미변경(StoreChannelsPage는 서비스별 개별 파일) |
| 8 | TypeScript | ✅ PASS | `web-kpa-society` tsc --noEmit exit 0 |

> 판정 2·4의 **시각** 확인은 데모 매장(Sohae 약국)의 B2C_COMMERCE capability 미활성으로 채널 생성이 403 차단되어 탭 바가 노출되지 않는 데이터 상태 때문에 보류됨 — 본 코드 변경과 무관하며, 코드(탭 정의)·타입체크·배포(신 문구 라이브)로 확인. capability 활성 매장에서 탭 바 시각 확인은 후속 가능.

## 온라인 스토어 기능 유지 확인

- 제품 진열 관리(추가/순서/활성/삭제/벌크), slug/공개 URL, 자산 채널맵/게시, 주문/결제 연결 코드 경로 모두 **미변경**(B2C/KIOSK 렌더 분기·핸들러 보존). KIOSK 보류 안내 유지.

## GP/KCos 영향 여부

없음. `StoreChannelsPage`는 서비스별 개별 구현이며 KPA 파일만 수정. 공통 `storeMenuConfig.ts` 미변경.

## 결론

A안(문구 정비 + TABLET 탭 중복 제거) 구현·배포 완료. 사용자 화면에서 "B2C/채널 만들기" 기술 용어 제거, 태블릿은 단독 메뉴로 일원화. 온라인 스토어 실기능·주문 연결·KIOSK 보류 모두 보존, GP/KCos 무영향.

### 후속 후보
- 탭 바 시각 회귀 확인은 B2C_COMMERCE capability 활성 매장에서 1회 수행 권장.
- `ChannelPublicUrlCard` 내 잔여 `channelType==='TABLET'` 분기는 현재 도달 불가 dead branch(무해) — 다음 정비 시 제거 가능.
- 온라인 판매 1급 메뉴 분리(C안)는 별도 IR/WO: `IR-O4O-KPA-ONLINE-SALES-FIRST-CLASS-MENU-DESIGN-V1`.
