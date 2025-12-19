# yaksa-admin

> 지부/분회 관리자를 위한 관제 센터

## 정체성 (변경 불가)

**yaksa-admin은 데이터를 생성하거나 편집하는 곳이 아니라,
각 Yaksa 서비스에 이미 존재하는 데이터를
'승인(Approval)'하고 '조회(Overview)'하는 관제 센터다.**

---

## Scope Fixation

### Scope Included

| 기능 | 연동 서비스 | 동작 |
|------|-------------|------|
| 회원 승인 | membership-yaksa | Approval |
| 신상신고 검토 | reporting-yaksa | Review |
| 임원 관리 | organization-core + membership-yaksa | Assign |
| 교육 현황 | lms-yaksa | READ ONLY |
| 회비 현황 | annualfee-yaksa | READ ONLY |

### Scope Excluded - DO NOT IMPLEMENT

- Board / Announcement CRUD (use forum-yaksa)
- File Repository / DMS
- Accounting / Expense / Budget
- SMS / Message System
- CMS / Homepage Builder
- KPA Direct Integration

---

## Admin 메뉴 구조

```
/admin/yaksa
├─ /members        (회원 승인/현황)
├─ /reports        (신상신고 승인)
├─ /officers       (임원 관리)
├─ /education      (교육 이수 현황)
├─ /fees           (회비 납부 현황)
└─ /forum          (forum-yaksa로 이동 링크)
```

---

## 권한 스코프

- `division` - 지부 관리자
- `branch` - 분회 관리자

---

## Phase 진행 현황

- [x] Phase 0: App Bootstrap & Scope Fixation
- [ ] Phase 1: Approval & Overview UI (Read / Approve Only)

---

## 개발 명령어

```bash
# 빌드
pnpm -F @o4o/yaksa-admin build

# 타입 체크
pnpm -F @o4o/yaksa-admin typecheck
```
