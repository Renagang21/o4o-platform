# CHECK-O4O-HOME-TEMP-EXPERIENCE-ACCOUNT-NOTICE-V1

> **WO:** WO-O4O-HOME-TEMP-EXPERIENCE-ACCOUNT-NOTICE-V1
> **유형:** store-facing 3서비스 첫 화면 상단 임시 공용 체험 계정 안내 + 로그인 화면 "테스트"→"체험용" 정비 (frontend-only)
> **작성일:** 2026-06-14
> **상태:** ✅ **완료** — GP/KPA/KCos 홈 배너 + 로그인 autofill 정비. 3서비스 tsc 0. 권한/라우팅/API/DB 무변경. 계정/비밀번호 reset 없음(코드 표기만).

## 1. 목적
초기 이용자가 주요 기능을 쉽게 확인하도록 GP/KPA/KCos 첫 화면 상단에 **짧은 공용 체험 계정 안내**를 추가하고, 로그인 화면의 user-facing "테스트" 표현을 "체험용 계정"으로 정비. 정식 Demo Mode/Guest Preview/비로그인 개방/저장 차단/샘플데이터/권한·라우팅·API·DB 변경은 **하지 않음**.

## 2. 변경 파일 (6 + CHECK)

| 서비스 | 파일 | 변경 |
|--------|------|------|
| GlycoPharm | `pages/community/CommunityMainPage.tsx` | hero 상단 체험 안내 배너(CTA→`/login`) |
| GlycoPharm | `components/common/LoginModal.tsx` | autofill 버튼 라벨 "🧪 테스트 약국"→"🧪 체험용 약국 경영자 계정" |
| KPA Society | `pages/CommunityHomePage.tsx` | hero 상단 배너(CTA→`/login`) |
| KPA Society | `components/LoginModal.tsx` | 라벨 "약국 경영자"→"🧪 체험용 약국 경영자 계정" + **스테일 비밀번호 수정**(§4) |
| K-Cosmetics | `pages/HomePage.tsx` | hero 상단 배너(CTA→`openLoginModal`) + `useLoginModal` import/hook |
| K-Cosmetics | `components/common/LoginModal.tsx` | **autofill 버튼 신규 추가** "🧪 체험용 매장 경영자 계정" |

**무변경:** backend/API/DB/migration, route/menu/권한, 계정/비밀번호 reset, 저장·주문·신청 로직, Neture, operator/admin/supplier 화면, package.json/pnpm-lock/Dockerfile, store-ui-core/shared-space-ui.

## 3. 안내 배너 / CTA
- 위치: 각 홈 `StandardHomeTemplate` heroSlot 최상단(첫 화면 상단). 흰 카드 + emerald accent, 작게.
- 문구: "🧪 체험용 계정 제공 / 주요 기능을 확인할 수 있는 공용 계정입니다. 입력한 데이터는 예고 없이 초기화될 수 있습니다." + CTA "체험 계정 보기".
- CTA 동작: GP/KPA = `Link to="/login"`(해당 route가 LoginModal을 열어 autofill 노출). KCos = `openLoginModal()`(KCos `/login`은 별도 LoginPage이므로 모달을 직접 오픈해 autofill 노출).
- 가입 유도 문구("가입 전 먼저 둘러보세요" 등) 미사용.

## 4. 로그인 화면 autofill 정비
| 서비스 | 이전 | 이후 |
|--------|------|------|
| GP | "🧪 테스트 약국" (renagang21@gmail.com / `3Lz157727791!`) | 라벨만 "🧪 체험용 약국 경영자 계정". 계정/비번 불변 |
| KPA | "약국 경영자" (renagang21@gmail.com / **`seochuran1!`**) | "🧪 체험용 약국 경영자 계정" + 비번 **`3Lz157727791!`로 수정** |
| KCos | (autofill 없음) | "🧪 체험용 매장 경영자 계정" (renagang21@gmail.com / `3Lz157727791!`) **신규 추가** |

- **KPA 스테일 비밀번호 수정:** SSOT(TEST-ACCOUNTS.local.md) 기준 renagang21 현재 비번 = `3Lz157727791!`(2026-06-06 reset). KPA가 박고 있던 `seochuran1!`는 스테일 → 기존 KPA 체험 로그인은 실패 상태였음. 동작하는 값으로 정렬(계정 자체 reset 아님, 코드 표기 수정).

## 5. 보안 판단 (사용자 결정 기록)
- 이 계정은 여러 사람이 함께 쓰도록 **임시 제공하는 공용 체험 계정**이며 곧 제거 예정. 사용자 결정에 따라 **비밀번호 하드코딩 제거/별도 demo 계정 생성/rotation은 본 WO 범위 밖**.
- ⚠️ **기록(사용자 위험 수용):** autofill 비밀번호 `3Lz157727791!`는 SSOT상 `sohae2100@gmail.com`(4서비스 admin/operator + `platform:super_admin`) 비밀번호와 **동일** → 클라이언트 JS·git에 노출됨. 데모 계정 삭제만으로는 닫히지 않으며, 안전화하려면 super_admin 비밀번호를 데모와 분리해야 함(후속, 사용자 영역).
- ⚠️ **KCos role caveat:** `renagang21`은 `cosmetics:store_owner` role 부재(SSOT §43-54) → KCos autofill 로그인은 되나 `/store` 매장 경영자 기능은 게이트됨. 실제 체험까지 되려면 RBAC role 부여(F9/F11, DB, 별도 승인) 필요. 본 WO는 frontend 안내/autofill만.
- operator/admin/supplier 계정 **미노출**(GP/KPA autofill은 약국 경영자 1개, KCos는 매장 경영자 1개만).

## 6. 검증
| 항목 | 결과 |
|------|------|
| web-glycopharm tsc | ✅ 0 |
| web-kpa-society tsc | ✅ 0 |
| web-k-cosmetics tsc | ✅ 0 |
| 권한/라우팅/API/DB 변경 | 없음 |
| 계정/비밀번호 reset | 없음(코드 표기만) |
| operator/admin/supplier 노출 | 없음 |
| Neture | 무변경 |
| 브라우저 smoke | ⏭️ 배포 후 권장 — GP/KPA/KCos 홈 상단 배너 노출, CTA→로그인(autofill 버튼 표시), KCos autofill 클릭 시 입력 채워짐 1회 확인 |

## 7. Commit / 배포
- 6 코드 + CHECK: 단일 path-specific commit(docs-only tip skip 회피). 3서비스 web 변경 → detect-changes 트리거 예상.

## 8. 후속 (선택)
1. 데모 계정 비밀번호를 super_admin과 분리(안전화) — 사용자/DB 영역.
2. KCos `cosmetics:store_owner` role 부여 시 KCos 체험이 store 기능까지 도달(RBAC, 별도 WO).
3. 장기: `renagang21@gmail.com` → `demo-pharmacy@…`/`demo-store@…` 전용 체험 계정 전환.
4. 체험 종료 시 본 배너/ autofill 일괄 제거(코드에 `WO-O4O-HOME-TEMP-EXPERIENCE-ACCOUNT-NOTICE-V1` 주석으로 표식).

---

*End of CHECK-O4O-HOME-TEMP-EXPERIENCE-ACCOUNT-NOTICE-V1*
