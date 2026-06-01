# IR-O4O-KPA-MYPROFILE-NICKNAME-SAVE-READ-AUDIT-V1

> KPA-Society `/mypage/profile` 닉네임 수정이 화면에 반영되지 않는 문제 — 저장/조회 경로 audit
>
> 작성일: 2026-05-17
> 상태: 조사 완료 (read-only, 코드 수정 없음)
> 작성 기준: CLAUDE.md §1 (조사 → 문제확정 → 최소 수정 → 검증 → 종료)

---

## 1. 증상

사용자가 KPA-Society 마이페이지(`/mypage/profile`)에서 **기본 정보 탭**의 닉네임 필드를 수정하고 저장 버튼을 눌러도 화면에 변경된 닉네임이 표시되지 않는다. 토스트는 "기본 정보가 저장되었습니다."로 성공 표시된다.

---

## 2. 결론 (먼저)

**Backend `PUT /mypage/profile` controller가 `nickname` 필드를 `req.body`에서 구조분해하지 않아 service 로 전달되지 않는다.**

→ DB에 저장 자체가 일어나지 않음 → 직후 호출되는 `checkAuth()` / `loadData()` 가 재조회해도 old value 반환 → 화면 불변.

API 응답은 200 OK + 변경 없는 값 반환이므로 프론트는 "성공"으로 인지한다.

**위치**: [apps/api-server/src/routes/kpa/controllers/mypage.controller.ts:61](apps/api-server/src/routes/kpa/controllers/mypage.controller.ts#L61)

---

## 3. 조사 항목별 결과

### 3.1 닉네임 수정 form 이 어떤 field를 submit 하는지

**파일**: [services/web-kpa-society/src/pages/mypage/MyProfilePage.tsx:446-447](services/web-kpa-society/src/pages/mypage/MyProfilePage.tsx#L446-L447)

```tsx
<input type="text" style={styles.input} value={basicForm.nickname}
  onChange={e => setBasicForm({ ...basicForm, nickname: e.target.value })}
  placeholder="활동 시 사용할 이름 입력" maxLength={50} />
```

→ form state `basicForm.nickname` 으로 정상 바인딩. ✅

---

### 3.2 updateProfile API가 nickname을 실제 payload에 포함하는지

**호출부**: [services/web-kpa-society/src/pages/mypage/MyProfilePage.tsx:220](services/web-kpa-society/src/pages/mypage/MyProfilePage.tsx#L220)

```tsx
await mypageApi.updateProfile(basicForm);
```

`basicForm` 전체를 그대로 전송. `basicForm` 에는 `nickname` 필드가 포함됨.

**API 정의**: [services/web-kpa-society/src/api/mypage.ts:15-23, 139-140](services/web-kpa-society/src/api/mypage.ts#L15-L23)

```ts
export interface ProfileUpdateRequest {
  lastName?: string;
  firstName?: string;
  nickname?: string;        // ← 타입에 정의됨
  phone?: string;
  email?: string;
  university?: string;
  workplace?: string;
}

// ...
updateProfile: (data: ProfileUpdateRequest) =>
  apiClient.put<ApiResponse<ProfileResponse>>('/mypage/profile', data),
```

→ 프론트는 `nickname` 을 정상적으로 PUT body에 실어 보냄. ✅

---

### 3.3 backend가 nickname을 users.nickname에 저장하는지 — **핵심 버그**

**Controller**: [apps/api-server/src/routes/kpa/controllers/mypage.controller.ts:54-68](apps/api-server/src/routes/kpa/controllers/mypage.controller.ts#L54-L68)

```ts
router.put('/profile', authenticate, asyncHandler(async (req, res) => {
  const user = (req as any).user;
  if (!user?.id) {
    res.status(401).json({ success: false, error: 'Unauthorized' });
    return;
  }

  const { name, lastName, firstName, phone, university, workplace } = req.body;
  //      ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  //      ⚠️ nickname 누락
  const data = await service.updateProfile(user.id,
    { name, lastName, firstName, phone, university, workplace }, user);
  //  ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  //  ⚠️ service 로 전달되지 않음
  res.json({ success: true, data });
}));
```

`req.body` 에서 `nickname` 을 destructure 하지 않고, service 호출 시에도 누락. → service 로 `nickname` 이 절대 전달되지 않음.

**Service (수신 측은 이미 준비됨)**: [apps/api-server/src/routes/kpa/services/mypage.service.ts:123-158](apps/api-server/src/routes/kpa/services/mypage.service.ts#L123-L158)

```ts
async updateProfile(
  userId: string,
  data: { name?: string; lastName?: string; firstName?: string;
          nickname?: string;     // ← 타입에 존재
          phone?: string; university?: string; workplace?: string },
  currentUser: any,
): Promise<any> {
  const userRepository = this.dataSource.getRepository('User');
  const updateData: Record<string, any> = {};
  if (data.name !== undefined) updateData.name = data.name;
  if (data.lastName !== undefined) updateData.lastName = data.lastName;
  if (data.firstName !== undefined) updateData.firstName = data.firstName;
  if (data.nickname !== undefined) updateData.nickname = data.nickname;  // ✅ L135
  // ...
  await userRepository.update(userId, updateData);
}
```

Service 레이어는 `users.nickname` 컬럼 update 로직이 **이미 준비되어 있다** — 단지 controller 가 데이터를 안 줄 뿐. (앞선 fix `FIX-O4O-MYPAGE-PROFILE-COLUMN-ROUTING-V1` 의 doc 주석에 `name/lastName/firstName/nickname/phone → users 테이블` 으로 명시되어 있어 service 의 설계 의도가 nickname 지원이었음이 확인됨.)

---

### 3.4 저장 후 getProfile이 nickname을 다시 내려주는지

**GET 핸들러 service 측**: [apps/api-server/src/routes/kpa/services/mypage.service.ts:70](apps/api-server/src/routes/kpa/services/mypage.service.ts#L70)

```ts
nickname: fullUser?.nickname || null,
```

**PUT 응답 측**: [apps/api-server/src/routes/kpa/services/mypage.service.ts:182](apps/api-server/src/routes/kpa/services/mypage.service.ts#L182)

```ts
nickname: updatedUser?.nickname || null,
```

→ GET / PUT 응답 모두 nickname 을 정상적으로 내려준다. **단, 저장이 안 됐으므로 old value 가 돌아온다.** ✅ (응답 구조는 정상)

---

### 3.5 화면이 profile.nickname 대신 user.name / firstName 등을 보고 있는지

**표시부**: [services/web-kpa-society/src/pages/mypage/MyProfilePage.tsx:477](services/web-kpa-society/src/pages/mypage/MyProfilePage.tsx#L477)

```tsx
<span style={styles.infoValue}>{profile?.nickname || '-'}</span>
```

→ `profile?.nickname` 을 정상적으로 source 로 사용. AuthContext `user.name` 등 다른 필드를 쳐다보지 않음. ✅

---

### 3.6 저장 후 local state 갱신 또는 reload가 누락됐는지

**저장 핸들러**: [services/web-kpa-society/src/pages/mypage/MyProfilePage.tsx:216-230](services/web-kpa-society/src/pages/mypage/MyProfilePage.tsx#L216-L230)

```tsx
const handleBasicSave = async (e: React.FormEvent) => {
  e.preventDefault();
  try {
    setBasicSaving(true);
    await mypageApi.updateProfile(basicForm);
    await checkAuth();      // AuthContext refresh
    await loadData();       // profile refetch
    setIsBasicEdit(false);
    toast.success('기본 정보가 저장되었습니다.');
  } catch {
    toast.error('저장에 실패했습니다.');
  } finally {
    setBasicSaving(false);
  }
};
```

→ 저장 후 `checkAuth()` + `loadData()` 로 정상 재조회. **누락 없음.** ✅
**(즉, 저장만 되면 화면은 자동으로 갱신된다.)**

---

### 3.7 operator 회원관리의 닉네임 표시와 source가 같은지

**파일**: [services/web-kpa-society/src/pages/operator/MemberManagementPage.tsx:709](services/web-kpa-society/src/pages/operator/MemberManagementPage.tsx#L709)

```tsx
<span className="font-medium text-slate-800 text-sm">{m.user?.name || '-'}</span>
```

→ 운영자 회원관리는 `user.name` 만 표시하며 **nickname 을 표시하지 않는다.** mypage 와 source 가 다르며, nickname 변경이 회원관리 화면에 어떻게 보여야 하는지는 본 IR 범위 외 (별도 정책 결정 필요할 수 있음). 다만 본 버그(닉네임 미저장)와는 무관.

---

## 4. 흐름 요약

### 저장 경로 (현재 — 버그)

```
[Form basicForm.nickname]
        ↓ submit
[mypageApi.updateProfile(basicForm)]
        ↓ PUT /api/v1/kpa/mypage/profile  body: { ..., nickname: "새값" }
[Controller: mypage.controller.ts:61]
        ↓  ⚠️ nickname 구조분해 누락
        ↓  service.updateProfile(userId, { name, lastName, firstName, phone, university, workplace }, user)
[Service: mypage.service.ts:135]
        ↓  data.nickname === undefined → updateData.nickname 미설정
[users.nickname]
        ❌ 변경 없음
```

### 조회 경로 (정상)

```
[users.nickname (old value)]
        ↓
[Service: mypage.service.ts:70] nickname: fullUser?.nickname
        ↓
[GET /api/v1/kpa/mypage/profile] → { profile: { ..., nickname: "구값" } }
        ↓
[MyProfilePage profile state]
        ↓
[Render L477] {profile?.nickname || '-'}  → "구값" 표시
```

### 화면 표시 source

| 화면 | Source | 비고 |
|------|--------|------|
| `/mypage/profile` 기본 정보 | `profile.nickname` (getProfile 응답) | ✅ 정상 |
| `/operator/members` 회원관리 | `user.name` | nickname 미표시 (별개 이슈 가능성) |

---

## 5. 원인 판정

**Single-cause, single-file, single-line bug.**

- **위치**: `apps/api-server/src/routes/kpa/controllers/mypage.controller.ts:61-62`
- **유형**: 구조분해 누락 (DTO drift — controller 가 service signature 와 sync 되지 않음)
- **영향 범위**: KPA-Society `/mypage/profile` 닉네임 필드만. 다른 필드(name/lastName/firstName/phone/university/workplace)는 정상 동작.
- **언제부터**: `FIX-O4O-MYPAGE-PROFILE-COLUMN-ROUTING-V1` 이후 service 는 nickname 지원으로 확장됐으나, controller 의 destructure list 가 업데이트되지 않은 것으로 보임 (service 주석 L119 가 명시적으로 nickname 을 SSOT 라우팅 대상에 포함).

---

## 6. 최소 수정 WO 제안

### WO-O4O-KPA-MYPROFILE-CONTROLLER-NICKNAME-PASSTHROUGH-V1

**범위**: 1 file, 2 line edit. 신규 마이그레이션 / 신규 컬럼 / 신규 엔드포인트 없음.

**수정**: [apps/api-server/src/routes/kpa/controllers/mypage.controller.ts:61-62](apps/api-server/src/routes/kpa/controllers/mypage.controller.ts#L61-L62)

```diff
- const { name, lastName, firstName, phone, university, workplace } = req.body;
- const data = await service.updateProfile(user.id, { name, lastName, firstName, phone, university, workplace }, user);
+ const { name, lastName, firstName, nickname, phone, university, workplace } = req.body;
+ const data = await service.updateProfile(user.id, { name, lastName, firstName, nickname, phone, university, workplace }, user);
```

**검증**:
1. 로컬 build (`pnpm --filter @o4o/api-server build`) 통과
2. 배포 후 KPA-Society `/mypage/profile` 에서 닉네임 변경 → 저장 → 화면 즉시 반영 확인 (사람 관측 또는 SSR debug page)
3. PUT 응답 body 의 `data.nickname` 이 새 값으로 echo 되는지 확인 (curl 또는 DevTools Network)
4. `users.nickname` 컬럼이 실제 DB에 업데이트됐는지 read-only 확인 (gcloud sql connect)

**리스크**: 매우 낮음. service 측 `data.nickname !== undefined` guard 로 보호되어 있어, 기존 호출자(만약 다른 caller 가 있다면)의 동작에 영향 없음.

**Out of scope (이 WO 와 분리)**:
- Operator 회원관리(`MemberManagementPage.tsx:709`) 의 nickname 표시 정책 — 별도 IR/정책 결정 필요 시 분리
- `lastName/firstName/nickname` 3축 표시 우선순위 정책 (L150-153 에서 `lastName+firstName → name` 자동 합성 로직이 nickname 과 충돌하는지 별도 확인 가치)

---

## 7. 변경 사항

- 본 IR 작성 외 코드 변경 없음.
- `git status`: 작업 전후 동일 (untracked IR 1개 추가만).
