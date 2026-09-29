# CHECK-O4O-NETURE-PUBLIC-HOME-IA-REFRESH-V1

> **WO**: WO-O4O-NETURE-PUBLIC-HOME-IA-REFRESH-V1 — **수정판 기준**(전달본이 §24 「CHECK」 중간에서 끊겼다. §1~§23 과 §24 의 CHECK 경로까지 따랐다)
> **선행**: [IR-O4O-NETURE-HOME-CURRENT-STATE-AND-IA-REDESIGN-V1](../investigations/IR-O4O-NETURE-HOME-CURRENT-STATE-AND-IA-REDESIGN-V1.md) · [CHECK-O4O-NETURE-HOME-ENTRY-REFRESH-V1](CHECK-O4O-NETURE-HOME-ENTRY-REFRESH-V1.md) · WO-O4O-NETURE-REGISTER-AUTHENTICATED-LOOP-FIX-V1(`3f94c685c`)
> **작성일**: 2026-09-29
> **판정**: **CODE_COMPLETE · PRODUCTION_SMOKE_PENDING_DEPLOY** (배포는 이 WO 범위 밖)

---

## 0. 이력 — 1차 구현 → 수정판 정합

| 커밋 | 내용 |
|---|---|
| `6c983a9eb` | 1차 구현(초판 WO 기준). 순서가 주요 서비스 → **AI → 참여 · 학습**, 로그인 모달 문구를 호스트별로 **변경**했다 |
| 이 CHECK 커밋 | **수정판 WO 기준으로 정정**: 순서를 주요 서비스 → **함께 이용하는 서비스 → AI** 로 · 서비스 · Hero · AI 문구를 지정 문구로 · **LoginModal 변경을 되돌림**(§15 — 공유 모달이라 이번 범위에서 변경하지 않는다 · R3 유지) · 상단 주석 현행화(§20) |

## 1. 결과 요약

| 구분 | 이전(main `3f94c685c` 기준) | 이후 |
|---|---|---|
| 로그인 전 첫 화면 | 워드마크 → 「무엇을 도와드릴까요?」 → 첫 사용 안내 → AI → 소개문 → 로그인 · 회원가입 → pill 4 → 소식(0건이어도) | **O4O 소개 + [Google로 시작] → 주요 서비스(설명형 3) → 함께 이용하는 서비스(보조 3) → O4O AI(같은 Composer) → 소식(글이 있을 때만)** |
| 로그인 후 | 워드마크 → 「무엇을 도와드릴까요?」 → 첫 사용 안내 → AI → HomeEntryPanel | **그대로** |
| 우상단(로그인 전) | 로그인 · 회원가입 | **로그인 하나**(Hero CTA 와 같은 Google 모달) |
| 첫 사용 안내 | 로그인 전후 모두 AI 위 | **로그인 후에만**(키 `neture:automation:intro-seen:v1` 불변) |
| 서비스 소식(로그인 전) | 0건이어도 섹션 · 빈 안내 | **글이 있을 때만** · 첫 로딩 중 비표시 · **오류는 표시(재시도)** |
| 로그인 모달 | 「Neture 로그인 · 공급자 연결 서비스」 | **변경 없음**(R3) |

## 2. 로그인 전 정보구조 (구현 · 문구)

```text
[우상단] 로그인
O4O
  온라인의 정보와 콘텐츠를 / 오프라인 매장의 활동으로 연결합니다.
  약국 · 전문매장 · 공급자가 정보를 나누고 실제 매장에서 활용할 수 있도록 연결합니다.
  [Google로 시작]                                         ← 세션 복구 중 숨김
주요 서비스 (nav "주요 서비스" · 카드)
  약국    약사와 약국을 위한 정보와 매장 서비스를 이용합니다.     [약국 서비스 →]   https://pharmacy.neture.co.kr/
  리테일  전문매장을 위한 제품 정보와 매장 서비스를 이용합니다.   [리테일 서비스 →] https://retail.neture.co.kr/
  공급자  제품과 콘텐츠를 등록하고 매장과 연결합니다.             [공급자 서비스 →] HOST_ORIGIN.supplier
함께 이용하는 서비스 (nav · 카드 없는 보조)
  커뮤니티         현장의 정보와 경험을 나눕니다.              HOST_ORIGIN.community
  강의             공개된 강의와 학습 콘텐츠를 둘러봅니다.      https://study.neture.co.kr/
  유통참여형 펀딩  새로운 제품과 유통 참여 기회를 확인합니다.   https://funding.neture.co.kr/
O4O AI
  질문하거나 필요한 업무를 요청할 수 있습니다.
  [Composer — 비로그인 제출 = Google 로그인 모달 · 입력 유지]
O4O 서비스 소식 — 글이 있을 때만
Footer (불변)
```

- Desktop: 주요 서비스 3열 · 함께 이용하는 서비스 3열. Mobile: 둘 다 1열 · 한글 단어 중간 줄바꿈 방지(`word-break: keep-all`).
- 링크: 새 탭(`noopener`) — 종전 계약. URL 은 기존 정본 재사용(새 route · URL config 0).
- 제외: 내 매장(`store.neture.co.kr`) · 병원약국(`/hospital`) · 구 호스트 3개 · 「약국 경영」. 분류명 「화장품」 → 「리테일」(서비스 내부 브랜드 불변).
- 동적 사실(모집 중 · 지금 수강 등) 정적 문구 0 — 테스트 고정.

## 3. AI Composer

- JSX 하나(`composerArea`)를 **위치만** 분기한다 — 복제 0. 로그인 전 = O4O AI 섹션 / 로그인 후 = 워드마크 · 「무엇을 도와드릴까요?」 아래(종전).
- 요청 · 첨부 · confirm · work · composite · 사이트 열기 · 세대 카운터 · 로그아웃 초기화 로직 **무변경**(줄 이동 · 들여쓰기만).
- §20 주석 현행화: "텍스트 응답 전용 · tool/Local Agent/브라우저 조작 안 함" → 당시 기록임을 명시하고 현재 동작(첨부 · Work · confirm · composite · 사이트 열기)을 적었다.

## 4. 보존한 계약 (변경 0)

| 대상 | 확인 |
|---|---|
| `HomeEntryPanel` · `lib/home-entry.ts` · `/auth/services` · `/neture/home/entry` · `/communities` · `/work-scope/operator-services` · `/auth/handoff` · membership · operator scope · store 판정 | 파일 무변경 |
| `/register` 수정 — 비로그인 모달 / 로그인 모달 없이 `/` / 복구 중 대기 · Neture 가입 비노출 | `RegisterRedirect` · `home-entry` 무변경 · 테스트 통과 |
| `LoginModal` (공유 · main/supplier/funding/community) | `6c983a9eb` 변경을 **되돌려** 그 이전과 동일 |
| Google 인증 · 약관 동의 후 계정 생성 | 무변경 |
| 소식 API · 로그인 후 newsSlot | 무변경 — `hideWhenEmpty` 는 로그인 전에만 |
| Footer | 무변경 |

## 5. 변경 파일 (main 대비 누적)

| 파일 | 내용 |
|---|---|
| `services/web-neture/src/pages/O4OHomePage.tsx` | 로그인 전/후 분기 · Hero · 주요 · 함께 이용하는 서비스 · Composer 위치 · CTA 단일화 · 주석 현행화 |
| `services/web-neture/src/components/home/HomeServiceNews.tsx` | `hideWhenEmpty` (`6c983a9eb`) |
| `services/web-neture/src/pages/__tests__/O4OHomePage.entry-pills.test.tsx` | 로그인 전 9 · 로그인 후 3 |
| `services/web-neture/src/components/home/__tests__/HomeServiceNews.hide-when-empty.test.tsx` | 5 (`6c983a9eb`) |
| `services/web-neture/src/components/LoginModal.tsx` · `__tests__/LoginModal.host-subtitle.test.tsx` | **되돌림 · 삭제**(§15) |

## 6. 검증

| WO §22 항목 | 결과 |
|---|---|
| 정체성 문구 · Google 시작 CTA · 약국/리테일/공급자/커뮤니티/강의/펀딩 URL · 내 매장 · 병원약국 미노출 · Composer 존재 · 비로그인 submit → 로그인 · 소식 0건 비노출 | 홈 테스트 · 소식 테스트 PASS |
| 로그인 후 AI 상단 · HomeEntryPanel 유지 · 첫 사용 안내 | 홈 테스트(로그인 후 3) PASS |
| Neture 가입 미노출 · `/register` 회귀 없음 | `home-entry.neture-join` · `RegisterRedirect` 테스트 PASS |
| web-neture 전체 vitest | **31 files / 277 tests PASS** |
| `tsc --noEmit` | 0 |
| eslint (변경 파일) | error 0 · warning 1 = 기존 `eslint-disable` 미사용(origin/main 원본에도 동일) |
| `vite build` | 성공 |

**로컬 browser smoke** (vite preview · Chromium · API 미연결)

| 항목 | Desktop 1280 | Mobile 390 |
|---|---|---|
| 페이지 오류 | 0 | 0 |
| 가로 overflow | 없음 | 없음 |
| 첫 화면에 보이는 것 | Google로 시작 · 주요 서비스 (Composer 는 아래 · 첫 사용 안내 없음) | 같음 |
| 서비스 링크 6개 href | 정본 6개 일치 | 같음 |
| [Google로 시작] 클릭 → 로그인 모달 | 열림 | 열림 |
| AI 입력 제출 → 로그인 모달 · 입력 유지 | 열림 · 유지 | 같음 |
| 소식 | "불러오지 못했습니다 + 다시 시도"(로컬 API 없음 = 오류 표시 계약대로) | 같음 |

- **로그인 후 화면 · 실제 Google 로그인 · 실제 소식 데이터는 로컬에서 보지 않았다**(운영 인증 · API 필요). 로그인 후 회귀는 컴포넌트 테스트로만 확인 → §7.

## 7. 운영 확인 (배포 후 · PENDING)

1. 비로그인 `neture.co.kr`: 순서 · 문구 · 6개 링크 · 「회원가입」 없음
2. [Google로 시작] · [로그인] → 기존 Google 모달 → 신규 계정 약관 동의 → 가입
3. 비로그인 AI 제출 → 모달 · 요청 실행 0
4. 소식: 운영 글 유무에 따라 표시/비표시
5. 로그인 후: 계정 메뉴 · AI · 내 업무 공간 4카드 · 플랫폼 관리 · 내 서비스 · 가입 · 이용 상태 · 가입 가능한 서비스 · handoff · Neture 가입 미노출 · `/register` 루프 없음

## 8. 잔여 · 범위 밖

| # | 항목 |
|---|---|
| R1 | 이미지 · 배너는 이 화면 기준으로 필요 시 별도(§16) |
| R3 | 공유 LoginModal 「Neture 로그인 · 공급자 연결 서비스」 문구 정합 — 별도 작업(§15) |
| R4 | WO 원문 §24 이후(끊긴 부분) 요구가 있었다면 반영되지 않았다 |

## 9. 문서 정합

해당 없음
