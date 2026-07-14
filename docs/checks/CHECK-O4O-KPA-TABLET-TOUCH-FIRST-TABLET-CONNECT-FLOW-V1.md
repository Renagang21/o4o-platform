# CHECK-O4O-KPA-TABLET-TOUCH-FIRST-TABLET-CONNECT-FLOW-V1

> WO: `WO-O4O-KPA-TABLET-TOUCH-FIRST-TABLET-CONNECT-FLOW-V1`
> 성격: TOUCH-FIRST 2단계 — 코너 선택 후 태블릿 연결·실행 동선 정비. UI only.
> 선행: `CHECK-O4O-KPA-TABLET-TOUCH-FIRST-CORNER-HOME-V1`
> Date: 2026-07-14

---

## 0. 결론

코너를 선택한 뒤의 상세 화면을 **"태블릿 연결·실행이 먼저, 화면 제작이 그 아래"** 로 정비했다. 신규 pairing/API/DB 없이 **기존 등록·URL·미리보기**를 매장 경영자가 이해하기 쉬운 순서/표현으로 재배치했다.

- 상세 상단에 **태블릿 연결·실행 카드**(상태·화면 세트명 + 큰 터치 액션: 화면 열기·주소 복사·미리보기).
- 긴 실행 URL 기본 노출 제거(‘실행 주소 보기’ 토글). storeSlug 부재/화면 세트 없음/팝업 차단/복사 실패 예외 안내.
- 등록/문구를 기기 → 코너 표현으로 통일(payload 불변, 등록 시 자동 코너 선택은 기존 동작).
- **QR 연결 = Deferred**(재사용 가능한 client QR 컴포넌트 부재; 신규 QR DB/의존성 금지 — WO §6.3).
- API/DB/migration/public runtime/kiosk-core/샘플 무변경. typecheck 0. 배포 success. **라이브 UI smoke Deferred(/login)**.

---

## 1. 조사한 현재 연결/등록 구조 (§9, read-only)
| 항목 | 사실 |
|------|------|
| 등록 | `createTablet(name, location?)` → `handleRegister` 가 **이미 자동 선택**(`setSelectedTabletId(created.id)`) + 폼 닫기 |
| 실행 URL | `publicTabletUrl(id)` = `{base}/tablet/{slug}?tabletId={id}`. slug 없으면 깨진 URL |
| 기존 액션 | 공개 URL 복사(clipboard) · 미리보기(in-app overlay `handleOpenPreview`) |
| QR | KPA web 은 **backend SVG QR**(getMlcQr/storeQr, 영속 레코드) 만 존재 → 태블릿엔 부적합(신규 QR DB 금지). `qrcode.react` 는 web-kpa-society **미선언 dep**(hoisted phantom) |
| 코너 모델 | store_tablets 1건 = 코너(location||name) = 실행 태블릿 단위(불변) |

## 2. 변경 전 → 후 사용자 동선
```
전: 코너 선택 → "현재 코너 화면 구성" 요약(공개 URL 복사·미리보기 + 3-stat + 긴 URL 원문 노출) → 편집기
후: 코너 선택 → [태블릿 연결·실행] (상태·화면세트 + 화면 열기/주소 복사/미리보기, URL 숨김) → [화면 구성](make) → 편집기
```

## 3. 태블릿 "연결"의 기술적 의미 (§3.2)
- 신규 pairing 서버/PIN/인증 프로토콜 **아님**. = **기존 store_tablets 등록 + 그 tabletId 의 공개 viewer URL 을 태블릿에서 실행**. 이번 WO 는 그 동선/표현 정비.

## 4. 구현 상세
- **연결·실행 카드**(상세 상단):
  - 상태 `is_active` → ● 사용 중(활성) / ○ 비활성. `현재 화면 세트: screenSetIndex[currentScreenSetId].name`(없으면 '없음').
  - 액션(min-h 44px, 텍스트 라벨): **태블릿에서 화면 열기**(`handleOpenTabletScreen` → window.open 공개 viewer, 팝업 차단 시 안내) · **주소 복사**(`handleCopyTabletUrl`) · **미리보기**(기존 `handleOpenPreview`).
  - **실행 주소 보기** 토글(`showRunUrl`) — 기본 숨김, 필요 시 `<code>` 노출(§6.2).
  - 화면 세트 없음 → "연결할 화면 세트가 아직 없습니다…" 안내(자동 생성/적용 안 함).
- **화면 구성 섹션**(하단, border-top): 진열 상품/대기 화면/공통 대기영상 3-stat(제작 컨텍스트로 분리, §8).
- **문구 정비(§6.4)**: 헤더 '태블릿 추가'→'코너 추가', 등록 폼 '새 태블릿 추가'→'새 코너 화면 만들기', 제출 '태블릿 추가'→'코너 화면 만들기', empty '등록된 태블릿이 없습니다'→'아직 코너 화면이 없습니다'. **필드/payload 불변**.

## 5. QR 구현 여부 (§6.3) — Deferred
- web-kpa-society 에 **재사용 가능한 client-side QR 컴포넌트 없음**(기존 QR=backend 영속 레코드 → 태블릿엔 금지). `qrcode.react` 는 미선언 dep(phantom) → 사용 시 의존성 추가/취약. → **QR Deferred**, 화면 열기 + 주소 복사로 연결 동선 충족. (후속: client QR 컴포넌트 도입 여부 별도 WO.)

## 6. 예외 처리 (§11)
| 상황 | 처리 |
|------|------|
| storeSlug 없음 | 액션 대신 "태블릿 실행 주소를 만들 수 없습니다. 매장 기본 정보를 먼저 확인해 주세요." (깨진 URL/빈 창 없음) |
| 화면 세트 없음 | "연결할 화면 세트가 아직 없습니다…" 안내(연결 카드는 유지) |
| 비활성 코너 | ○ 비활성 표시(임의 활성화 안 함) |
| 복사 실패 | "주소를 복사하지 못했습니다. 직접 열어 다시 시도해 주세요." |
| 팝업 차단 | "팝업이 차단되어 화면을 열지 못했습니다. 주소를 복사해 태블릿에서 직접 열어 주세요." |

## 7. 변경 파일
```
services/web-kpa-society/src/pages/pharmacy/StoreTabletDisplaysPage.tsx  (UI only)
```
- `showRunUrl` state · `handleOpenTabletScreen`/`handleCopyTabletUrl` · 요약 카드 → 연결·실행/화면 구성 재구성 · 등록/empty 문구.

## 8. 기존 API/DB/runtime 무변경 확인
- `createTablet`/등록 payload · `publicTabletUrl` 규칙 · public `/tablet/screen` · kiosk-core · TabletScreenSetManager · content_list · dirty guard — **코드 미접촉**.
- migration 0 · API 0 · 신규 pairing 0 · store_tablets 구조 0 · 운영 샘플 0.

## 9. typecheck / 배포
- web-kpa-society `tsc --noEmit`: **StoreTabletDisplaysPage 에러 0**(KPA 페이지 → GP/KCos 무관).
- web deploy(62cefd9c2) **success**.

## 10. 브라우저 smoke — Deferred (§12.3)
- 관리 화면 `/store/commerce/tablet-displays` → 권한 확인 후 **`/login` 리다이렉트**(auth 401·세션 없음). 자동 로그인 금지 정책 → **화면 smoke Deferred**.
- 대체 검증: typecheck 0 + 코드(연결·실행 카드/토글/예외/문구/터치 크기) + 배포 success. 인증 세션 확인 항목:
  1. 코너 선택 → 상단 연결·실행 카드(상태·화면 세트명)
  2. 화면 열기(공개 viewer 새 탭)·주소 복사·미리보기
  3. 실행 주소 기본 숨김 + 토글
  4. 신규 코너 등록 → 자동 선택 → 연결·실행 카드
  5. 반응형(모바일 세로 액션/태블릿 가로) · console error 0

## 11. 완료 기준 대비
| 기준 | 상태 |
|------|------|
| 코너 선택 후 연결·실행 영역 명확 | ✅ (상단 카드) |
| 긴 공개 URL 기본 UI 제거 | ✅ (토글) |
| 화면 열기·주소 복사 큰 터치 | ✅ (44px) |
| QR 연결 | ⏸ Deferred(§6.3) |
| 연결 상태·실행 방법 우선 표시 | ✅ |
| 신규 등록 후 다음 행동 명확 | ✅ (자동 선택 → 연결 카드) |
| Screen Set/content_list/dirty guard 불변 | ✅ |
| API/migration/runtime/샘플 0 | ✅ |
| typecheck/배포 | ✅ |
| 화면 smoke | ⏸ Deferred(/login) |
| CHECK commit/push | ✅ |

## 12. 후속 WO
```
3. WO-O4O-KPA-TABLET-TOUCH-FIRST-SCREEN-SET-CARDS-V1
4. WO-O4O-KPA-TABLET-TOUCH-FIRST-CONTENT-LIST-EDITOR-V1
5. WO-O4O-KPA-TABLET-TOUCH-FIRST-FINAL-SMOKE-V1
(+ 선택) client-side QR 컴포넌트 도입 → 태블릿 QR 연결
```

---

*TOUCH-FIRST 2단계 · 코너 상세 상단=태블릿 연결·실행(상태·화면세트명 + 화면 열기/주소 복사/미리보기 44px, 긴 URL 토글, slug/세트/팝업/복사 예외), 하단=화면 구성(make 분리) · 등록 문구 기기→코너(payload 불변, 자동선택 기존) · QR Deferred(client QR 부재) · API/DB/runtime/샘플 0 · typecheck 0·배포 success·라이브 smoke Deferred(/login).*
