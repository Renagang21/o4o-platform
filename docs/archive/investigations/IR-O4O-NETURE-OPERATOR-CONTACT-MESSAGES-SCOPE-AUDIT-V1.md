# IR-O4O-NETURE-OPERATOR-CONTACT-MESSAGES-SCOPE-AUDIT-V1

> 조사 전용 IR — 코드 수정 없음. 파일 수정 없음. commit 없음.
> 일자: 2026-05-30
> 출발점: Neture operator dashboard 정비 후 잔존한 `/operator/contact-messages` dead link 4 곳 (+ sidebar 1) 의 정책 결정 — operator 업무인지 admin 업무인지 확정.
> 선행:
> - IR-O4O-NETURE-OPERATOR-DASHBOARD-DATA-ACCURACY-AUDIT-V1 (§6, §9.3)
> - CHECK-O4O-NETURE-SUPPLIERS-PENDING-STALE-DATA-V1
> - WO-O4O-NETURE-SUPPLIER-ACTIVATION-VISIBILITY-AND-ACTION-QUEUE-FIX-V1 (`47c0b0a73` + `dcf8172d3`) — `/operator/admin-suppliers` dead link 처리. `/operator/contact-messages` 는 명시적으로 본 WO 범위 외로 분리

---

## 1. Executive Summary

- **현재 상태는 "부분 operator scope" 의 중간 상태**: list/detail/update 는 admin 전용, 단 `inquiries-mark-read` 일괄 처리 1건만 operator scope. 그러면서 dashboard / sidebar / AI summary 는 운영자에게 `/operator/contact-messages` 진입을 권유하는 dead link 5 군데를 노출.
- **dead link 5 군데**:
  1. `operator-dashboard.controller.ts:223` (Action Queue 'unread-messages')
  2. `operator-action-queue.controller.ts:157` (operator action queue actionUrl)
  3. `operator-ai-action.service.ts:103` (AI rule-based action)
  4. `operator-ai-llm.service.ts:41` (AI LLM action template)
  5. `services/web-neture/src/config/operatorMenuGroups.ts:38` (sidebar entry, `adminOnly: true`)
- **데이터 모델 관점에서 admin 우월적 설계**: `NetureContactMessage.adminNotes` 필드만 존재. operator 별도 노트/이력 필드 부재.
- **contactType 4 종 (supplier / partner / service / other)**: 처음 두 가지는 operator 의 일상 업무(공급자/파트너 onboarding 초기 접점)와 직결, 뒤 두 가지는 admin 정책 결정에 가까움 → **단일 권한 모델 (operator-only or admin-only) 로는 모든 contactType 을 자연스럽게 흡수하기 어려움**.
- **권장 방향: B (혼합형)** — operator scope GET list (+ filter / read 마크) 까지 신설하고 detail/update(adminNotes)/하드 처리는 admin 유지. 다만 정책 차원의 사용자 결정이 선행되어야 하며, 본 IR 은 후속 WO 가 결정해야 할 사항을 정리한다.

---

## 2. 현재 link 생성 위치

| # | 위치 | 코드 | 의도 |
|---|---|---|---|
| 1 | [operator-dashboard.controller.ts:223](../../apps/api-server/src/modules/neture/controllers/operator-dashboard.controller.ts#L223) | `{ id: 'unread-messages', label: '미확인 문의', count: unreadMessages, link: '/operator/contact-messages' }` | Action Queue 카드 클릭 → 문의 리스트 진입 |
| 2 | [operator-action-queue.controller.ts:157](../../apps/api-server/src/modules/neture/controllers/operator-action-queue.controller.ts#L157) | `actionUrl: '/operator/contact-messages'` (actionType: 'EXECUTE', actionLabel: '일괄 확인처리', actionApi: '/neture/operator/actions/execute/inquiries-mark-read') | inquiries-mark-read execute 후 화면 이동 또는 link fallback |
| 3 | [operator-ai-action.service.ts:103](../../apps/api-server/src/modules/neture/services/operator-ai-action.service.ts#L103) | `actionUrl: '/operator/contact-messages'` (rule-based AI action) | AI 가 문의 응답 지연 알림 시 진입 link |
| 4 | [operator-ai-llm.service.ts:41](../../apps/api-server/src/modules/neture/services/operator-ai-llm.service.ts#L41) | `actionUrl: '/operator/contact-messages'` (LLM action template — `inquiry` key) | AI LLM 이 inquiry 라벨로 action 을 만들 때 link |
| 5 | [services/web-neture/src/config/operatorMenuGroups.ts:38](../../services/web-neture/src/config/operatorMenuGroups.ts#L38) | `{ label: '문의 메시지', path: '/operator/contact-messages', adminOnly: true }` | sidebar 의 users 그룹 admin-only 항목 — admin role 만 sidebar 노출 |

---

## 3. 현재 route / API 구조

### 3.1 Backend

`apps/api-server/src/modules/neture/controllers/contact.controller.ts` — WO-O4O-NETURE-CONTACT-PAGE-V1

| Method | Path | Auth | 비고 |
|---|---|---|---|
| POST | `/contact` | (없음 — public) | 외부 사용자 contact form 제출 |
| GET | `/admin/contact-messages` | `requireAuth + requireNetureScope('neture:admin')` | list (`contactType` / `status` 필터 + pagination) |
| GET | `/admin/contact-messages/:id` | 동일 | detail |
| PATCH | `/admin/contact-messages/:id` | 동일 | `status` + `adminNotes` 업데이트 |

`apps/api-server/src/modules/neture/controllers/operator-action-queue.controller.ts:278-298`
| Method | Path | Auth | 비고 |
|---|---|---|---|
| POST | `/operator/actions/execute/inquiries-mark-read` | `requireAuth + requireNetureScope('neture:operator')` | `UPDATE neture_contact_messages SET status='in_progress' WHERE status='new'` (전체 일괄 mark-read) |

→ **operator scope 가 가진 권한**: status='new' → 'in_progress' 일괄 전환 1 종만. list 조회·detail·개별 status 변경·adminNotes 작성 권한 0.

### 3.2 Frontend

| Path | Page | 비고 |
|---|---|---|
| `/admin/contact-messages` | [AdminContactMessagesPage.tsx](../../services/web-neture/src/pages/admin/AdminContactMessagesPage.tsx) (302 lines) | list + filter + 행 확장 detail + status 변경 |
| `/operator/contact-messages` | **부재** | dead link |

### 3.3 Entity

`apps/api-server/src/modules/neture/entities/NetureContactMessage.entity.ts`
- columns: `id`, `contactType` (supplier|partner|service|other), `name`, `email`, `phone`, `subject`, `message`, `status` (new|in_progress|resolved), `ipAddress`, `userAgent`, `adminNotes`, `createdAt`, `updatedAt`, `resolvedAt`
- **`operatorNotes` 필드 부재** → operator 가 메모를 남기려면 schema 추가 필요

---

## 4. operator / admin 권한 경계 분석

### 4.1 현재 사실상의 경계

| Action | admin | operator | 비고 |
|---|---|---|---|
| 조회 (list) | ✅ | ❌ | operator scope endpoint 부재 |
| 조회 (detail) | ✅ | ❌ | 동일 |
| status 변경 (개별) | ✅ | ❌ | 동일 |
| status 변경 (일괄 mark-read) | ✅ (admin 도 가능 — operator scope 는 admin 포함) | **✅** | operator-action-queue execute |
| `adminNotes` 작성 | ✅ | ❌ | 필드 자체가 admin 전용 |
| dashboard count 노출 | ✅ | **✅** | unreadMessages count 는 operator dashboard 에서 표시 |
| sidebar 메뉴 | ✅ (sidebar L143 `/admin/contact-messages`) | ❌ (sidebar L38 `/operator/contact-messages` 는 dead link + `adminOnly:true`) | |

→ **카운트는 보여주면서 클릭은 못 한다**. 이는 운영자의 실효적 워크플로우에서 가장 큰 불일치.

### 4.2 contactType 별 자연 처리 주체 (Philosophy 관점)

| contactType | 자연 처리 주체 | 근거 |
|---|---|---|
| `supplier` | **Operator** | 공급자 onboarding 의 첫 접점. O4O-BUSINESS-PHILOSOPHY-V1 §3.2 "공급자 자료 수신·등록·구성" |
| `partner` | **Operator** | 파트너 협업 진입 동일. 매장 지원 / 큐레이션 영역 |
| `service` | **Admin** | 플랫폼 기능 / 정책 문의 |
| `other` | **Admin** | 분류 불가 — 정책 결정 필요 |

→ **단일 권한 모델은 어색**. 모든 contactType 을 admin 으로 두면 supplier/partner 문의 초기 대응이 admin 으로 집중. 모든 contactType 을 operator 로 풀면 service/other 정책 결정도 operator 가 떠안음.

---

## 5. Dead link 원인

세 가지 트랙이 시간 차로 진행되어 정합성 가드 부재:

1. **WO-O4O-NETURE-CONTACT-PAGE-V1** (admin endpoint + page 만 신설) — operator 측 진입로 미정의로 끝남
2. **operator-action-queue / dashboard / AI summary** 가 후속 추가되며 `unread-messages` 카드를 noting → "운영자도 처리 시작점이 있을 것" 이라는 암묵적 가정 위에서 `/operator/contact-messages` 를 placeholder 로 박음 (route/page 신설 없이)
3. **WO-O4O-NETURE-OPERATOR-DASHBOARD-AI-SUMMARY-INACTIVITY-RULE-REFINE-V1 (61d752199)** 와 **WO-O4O-NETURE-SUPPLIER-ACTIVATION-VISIBILITY-AND-ACTION-QUEUE-FIX-V1 (47c0b0a73 + dcf8172d3)** 가 dashboard 정비를 진행하면서 supplier 측 dead link 만 정정. contact-messages 는 정책 결정 필요 항목으로 명시적 분리 → 본 IR 의 목적

---

## 6. 권장 방향 A / B / C 비교

### 6.1 Case A — admin 전용 유지

- dashboard Action Queue 의 `unread-messages` 항목 제거 (또는 admin dashboard 로 이동)
- AI rule-based / LLM 의 inquiry action template 제거
- operator sidebar L38 항목 제거
- operator-action-queue 의 `inquiries-mark-read` execute 도 admin scope 로 좁히거나 폐기

**장점**
- scope 경계 가장 명확
- 신규 화면 / 엔드포인트 / schema 0
- 작업 범위 작음 — 1 WO 로 마감 가능

**단점**
- operator 가 "미확인 문의 N건" 카운트조차 못 봄 → dashboard 정보성 가치 감소
- supplier/partner 문의의 초기 대응이 admin 으로 집중 → philosophy §3.2 의 "공급자 onboarding 첫 접점 = operator" 와 충돌
- 기존 `inquiries-mark-read` operator endpoint 의 의도 (운영자가 들어온 문의를 한 번에 확인 처리) 가 폐기됨

### 6.2 Case B — operator 조회/일괄 처리, admin 개별 처리·adminNotes 유지 (혼합형 — 권장)

- **operator scope 신설**:
  - GET `/operator/contact-messages` (list — read-only, filter)
  - 기존 `inquiries-mark-read` execute 유지
- **admin scope 그대로 유지**:
  - GET/PATCH `/admin/contact-messages/:id` (detail + status + adminNotes)
- **Frontend**:
  - `/operator/contact-messages` route + page 신설 (read-only list, 일괄 mark-read 버튼)
  - 개별 상세 / status 변경 / 메모는 admin 페이지 진입
- **sidebar L38** path 정정 + `adminOnly:true` 제거 가능 여부 검토
- **Action Queue / AI** link 유지

**장점**
- 운영자 일상 workflow 보존 (들어온 문의 빠르게 확인 → 필요 시 admin 으로 상세 ESCALATION)
- philosophy §3.2 정합
- admin 결정권 (개별 처리 / 메모) 그대로 보존
- schema 변경 없음 — `adminNotes` 그대로 admin 만 작성

**단점**
- 신규 endpoint 1 + 신규 page 1 (이전 supplier track 과 동일 패턴 — `WO-O4O-NETURE-SUPPLIER-ACTIVATION-VISIBILITY-AND-ACTION-QUEUE-FIX-V1` 의 operator scope 분리와 형식 동일)
- 운영자 read-only / admin write-only 의 책임 경계를 UI 차원에서 명확히 전달해야 함 (예: operator page 에 "상세 처리는 관리자에게" 안내)

### 6.3 Case C — operator 도 전체 처리 권한

- operator scope 신설: list + detail + status + 메모 (단, `operatorNotes` 추가 필드 신설 — schema 변경)
- admin / operator 모두 메모 기록 가능 (별도 필드 분리)
- admin 화면 그대로

**장점**
- operator 자율성 최대
- admin / operator 양측 메모 분리로 audit trail 향상

**단점**
- schema 변경 동반 (`operatorNotes` 필드 + migration)
- operator 가 detail 화면까지 운영 → admin scope 의 의미 약화
- WO 범위 큼 — 별도 IR 정책 결정 필요

---

## 7. 비교 표

| 항목 | A (admin 전용) | **B (혼합 — 권장)** | C (operator 전체) |
|---|---|---|---|
| 신규 backend endpoint | 0 (제거) | 1 (GET list) | 3-4 (list/detail/update/notes) |
| 신규 frontend page | 0 (제거) | 1 (operator list page) | 1 (operator full page) |
| schema 변경 | 0 | 0 | **+1 (`operatorNotes`)** |
| WO 범위 | 작음 | 중간 | 큼 |
| philosophy §3.2 정합 | ❌ | ✅ | ✅ |
| operator dashboard 정보성 | 감소 | 유지 | 유지 |
| admin scope 의미 | 강함 | 강함 (개별 처리/메모 독점) | 약화 |
| 사용자 결정 필요도 | 낮음 | **중간** | 높음 (메모 분리 정책) |

---

## 8. 후속 WO 후보

본 IR 의 권장 방향은 **B**. 사용자 결정 후 다음 WO 진행:

### 8.1 권장 — B 채택 시

**WO-O4O-NETURE-OPERATOR-CONTACT-MESSAGES-OPERATOR-SCOPE-V1**

목표:
- operator scope GET endpoint 신설 (`/operator/contact-messages` list + filter)
- frontend operator route + page (`/operator/contact-messages`) 신설 — list + 일괄 mark-read 버튼만
- sidebar L38 정정 (path 유지 + `adminOnly:true` 검토 — operator 도 노출할지)
- Action Queue / AI link 그대로 유지 (이제 정상 동작)

미포함 (의도된 분리):
- detail / 개별 status 변경 / `adminNotes` 작성 (admin 그대로)
- `operatorNotes` 필드 신설 (C 시나리오)
- email/phone 등 PII 노출 범위 정책 결정

WO 패턴 참조: `WO-O4O-NETURE-SUPPLIER-ACTIVATION-VISIBILITY-AND-ACTION-QUEUE-FIX-V1` 의 operator scope 분리 방식과 동일.

### 8.2 A 채택 시

**WO-O4O-NETURE-OPERATOR-CONTACT-MESSAGES-DEAD-LINK-CLEANUP-V1**

목표:
- dashboard / Action Queue / AI 의 `unread-messages` 항목 제거
- sidebar L38 제거
- `inquiries-mark-read` execute endpoint 의 향방 결정 (제거 vs admin scope 이동)

미포함:
- admin 측 화면 / endpoint 변경 0

### 8.3 C 채택 시

**WO-O4O-NETURE-OPERATOR-CONTACT-MESSAGES-FULL-SCOPE-V1** + 별도 schema migration WO
- `operatorNotes` 필드 + audit log 분리
- 사용자 directive 가 추가 필요한 영역 (admin/operator 권한 모델 변경)

---

## 9. 수정 필요 파일 후보 (B 채택 시 — 참고용)

### 9.1 신규

| 파일 | 종류 |
|---|---|
| `apps/api-server/src/modules/neture/controllers/operator-contact.controller.ts` | Backend 신규 — operator scope GET endpoint |
| `services/web-neture/src/pages/operator/OperatorContactMessagesPage.tsx` | Frontend 신규 — list page (read-only + 일괄 mark-read) |

### 9.2 수정

| 파일 | 변경 |
|---|---|
| `apps/api-server/src/modules/neture/neture.routes.ts` | 신규 controller wiring |
| `services/web-neture/src/App.tsx` | Route `/operator/contact-messages` 추가 |
| `services/web-neture/src/config/operatorMenuGroups.ts:38` | `adminOnly:true` 유지 여부 결정 (sidebar 노출 범위) |
| `services/web-neture/src/lib/api/admin.ts` 또는 `lib/api/operatorContact.ts` 신설 | operator scope API client |

### 9.3 미변경 (의도)

- `apps/api-server/src/modules/neture/controllers/contact.controller.ts` — admin endpoints 그대로
- `services/web-neture/src/pages/admin/AdminContactMessagesPage.tsx` — admin page 그대로
- `apps/api-server/src/modules/neture/entities/NetureContactMessage.entity.ts` — schema 0
- `apps/api-server/src/modules/neture/controllers/operator-action-queue.controller.ts` — `inquiries-mark-read` execute 그대로
- dashboard / AI link 출처들 (4 files) — link 자체는 유지, route/page 신설로 dead → live 전환

---

## 10. 미확인 항목 (추적)

- [ ] 사용자 directive — A / B / C 채택 결정
- [ ] operator page 의 PII 노출 정책 (email / phone / IP / userAgent 어디까지 보일지)
- [ ] sidebar L38 의 `adminOnly:true` 유지 여부 (operator role 도 sidebar 메뉴 노출할지)
- [ ] `inquiries-mark-read` 일괄 처리의 contactType 필터 (현재는 status='new' 전체 — operator 가 의도하지 않은 admin 영역 문의도 함께 mark 되는지 검토 필요)

---

## 11. 격리 무결성 확인

- ✅ 코드 수정 0
- ✅ 파일 수정 0 (본 IR 신규 1건만 신설)
- ✅ git add 0
- ✅ git commit 0
- ✅ git push 0
- ✅ 다른 세션 unstaged 파일 미접촉

---

*본 IR 은 코드 분석 기반으로 작성됨. 정책 결정 항목은 §10 미확인 항목에 명시.*
*Commit 여부는 사용자 지시에 따름.*
