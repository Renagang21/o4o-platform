
# Rena Members API 레퍼런스

## 함수 레퍼런스

### 접근 제어 함수

#### rena_members_can_access()
특정 콘텐츠에 대한 사용자의 접근 권한을 확인합니다.

```php
bool rena_members_can_access(int $post_id, int $user_id = null)
```

**매개변수**
- `$post_id` (int) 확인할 포스트/페이지 ID
- `$user_id` (int|null) 사용자 ID. null이면 현재 사용자

**반환**
- (bool) 접근 가능 여부

**예시**
```php
if (rena_members_can_access($post->ID)) {
    // 콘텐츠 표시
}
```

#### rena_members_restrict_content()
콘텐츠에 접근 제한을 설정합니다.

```php
bool rena_members_restrict_content(int $post_id, array $roles = array())
```

**매개변수**
- `$post_id` (int) 제한할 포스트/페이지 ID
- `$roles` (array) 허용할 역할 목록

**반환**
- (bool) 설정 성공 여부

### 사용자 관리 함수

#### rena_members_get_user_roles()
사용자의 역할 목록을 가져옵니다.

```php
array rena_members_get_user_roles(int $user_id = null)
```

**매개변수**
- `$user_id` (int|null) 사용자 ID. null이면 현재 사용자

**반환**
- (array) 역할 목록

#### rena_members_update_user_role()
사용자의 역할을 업데이트합니다.

```php
bool rena_members_update_user_role(int $user_id, string $role, bool $add = true)
```

**매개변수**
- `$user_id` (int) 사용자 ID
- `$role` (string) 역할명
- `$add` (bool) true면 추가, false면 제거

**반환**
- (bool) 업데이트 성공 여부

## 필터 훅

### rena_members_restricted_message
제한된 콘텐츠 메시지를 수정합니다.

```php
apply_filters('rena_members_restricted_message', string $message, int $post_id)
```

**매개변수**
- `$message` (string) 기본 메시지
- `$post_id` (int) 현재 포스트/페이지 ID

**예시**
```php
add_filter('rena_members_restricted_message', function($message, $post_id) {
    return '이 콘텐츠는 회원만 볼 수 있습니다.';
}, 10, 2);
```

### rena_members_allowed_roles
콘텐츠에 접근 가능한 역할 목록을 수정합니다.

```php
apply_filters('rena_members_allowed_roles', array $roles, int $post_id)
```

**매개변수**
- `$roles` (array) 허용된 역할 목록
- `$post_id` (int) 포스트/페이지 ID

## 액션 훅

### rena_members_user_registered
새 사용자 등록 시 실행됩니다.

```php
do_action('rena_members_user_registered', int $user_id, array $user_data)
```

**매개변수**
- `$user_id` (int) 새로 등록된 사용자 ID
- `$user_data` (array) 등록 데이터

### rena_members_access_denied
접근이 거부되었을 때 실행됩니다.

```php
do_action('rena_members_access_denied', int $post_id, int $user_id)
```

**매개변수**
- `$post_id` (int) 접근이 거부된 포스트/페이지 ID
- `$user_id` (int) 현재 사용자 ID

## 숏코드

### [members_only]
회원 전용 콘텐츠를 지정합니다.

```php
[members_only]회원만 볼 수 있는 콘텐츠[/members_only]
```

### [role_required]
특정 역할이 필요한 콘텐츠를 지정합니다.

```php
[role_required role="administrator"]관리자만 볼 수 있는 콘텐츠[/role_required]
```

**속성**
- `role` (string) 필요한 역할명

## 템플릿 태그

### rena_members_is_restricted()
현재 콘텐츠가 제한되어 있는지 확인합니다.

```php
bool rena_members_is_restricted(int $post_id = null)
```

### rena_members_get_user_display()
사용자 표시 정보를 가져옵니다.

```php
string rena_members_get_user_display(int $user_id = null)
```

## 상수

### RENA_MEMBERS_VERSION
플러그인 버전을 정의합니다.

### RENA_MEMBERS_PATH
플러그인 디렉토리 경로를 정의합니다.

### RENA_MEMBERS_URL
플러그인 URL을 정의합니다.