# DEBUG SSR TEST PAGE GUIDE V1

> **디버그용 JSON/데이터 테스트 페이지를 만들 때의 기본 규칙.**
> 프로덕션 Cloud Run 환경에서 안전하게 동작하는 SSR 방식의 디버그 페이지 표준.

---

## 1. 핵심 원칙: SSR ONLY (NO Client-Side JavaScript)

**프로덕션에서 `fetch()`, `onclick`, `addEventListener` 등 클라이언트 JS는 동작하지 않는다.**

| 이유 | 설명 |
|------|------|
| Helmet CSP | `helmet()` 미들웨어가 Content-Security-Policy를 설정하여 인라인 스크립트 차단 |
| 보안 미들웨어 | 추가 보안 레이어가 스크립트 실행을 제한할 수 있음 |
| 배포 환경 차이 | 로컬에서 동작하더라도 Cloud Run 프로덕션에서 실패할 수 있음 |

### 규칙

```
✅ 모든 데이터 조회/표시 = 서버에서 HTML 렌더링 (res.send)
✅ 네비게이션 = <a href="..."> 링크
✅ 검색/입력 = <form method="GET" action="...">
✅ 액션(승인/거부 등) = <a href="..."> 링크 (GET으로 실행)
❌ fetch() / XMLHttpRequest — 금지
❌ onclick / addEventListener — 금지
❌ <script> 태그 — 금지
```

---

## 2. 파일 구조 & Factory Router 패턴

### 위치

```
apps/api-server/src/routes/debug/{name}.controller.ts
```

### Factory Router 함수

```typescript
import { Router, Request, Response } from 'express';
import { DataSource } from 'typeorm';

export function create{Name}Router(dataSource: DataSource): Router {
  const router = Router();

  // routes here...

  return router;
}
```

### main.ts 등록

```typescript
try {
  const { create{Name}Router } = await import('./routes/debug/{name}.controller.js');
  app.use('/__debug__/{name}', create{Name}Router(AppDataSource));
  logger.info('✅ {Name} debug endpoint registered at /__debug__/{name}');
} catch (err) {
  logger.error('Failed to register {Name} debug routes:', err);
}
```

---

## 3. 필수 유틸리티

### `esc()` — XSS 방지 HTML 이스케이프

```typescript
function esc(str: unknown): string {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
```

모든 동적 값 출력 시 반드시 `esc()` 사용.

### `page()` — HTML 페이지 래퍼

```typescript
function page(title: string, body: string): string {
  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>${esc(title)}</title>
<style>
  body { background:#1a1a2e; color:#e0e0e0; font-family:monospace; padding:2rem; }
  a { color:#4fc3f7; }
  table { border-collapse:collapse; width:100%; margin:1rem 0; }
  th,td { border:1px solid #444; padding:6px 10px; text-align:left; }
  th { background:#2a2a4e; }
  .ok { color:#66bb6a; } .warn { color:#ffa726; } .err { color:#ef5350; }
  pre { background:#0d0d1a; padding:1rem; overflow-x:auto; border-radius:4px; }
  form { margin:1rem 0; }
  input { padding:6px; font-family:monospace; background:#2a2a4e; color:#e0e0e0; border:1px solid #555; }
  .btn { display:inline-block; padding:4px 12px; background:#2a5a8a; color:#fff; text-decoration:none; border-radius:3px; margin:2px; }
  .btn:hover { background:#3a7aba; }
  .btn-danger { background:#8a2a2a; }
  .btn-danger:hover { background:#ba3a3a; }
  .btn-success { background:#2a6a3a; }
  .btn-success:hover { background:#3a8a4a; }
</style>
</head><body>
<h1>${esc(title)}</h1>
<p><a href="/__debug__/{name}">← Home</a></p>
${body}
</body></html>`;
}
```

- **다크 monospace 테마** — 디버그 페이지 표준 스타일
- **항상 Home 링크** 포함

---

## 4. 라우트 설계 패턴

### 4.1 메인 리스트 (GET `/`)

- 자동으로 주요 데이터 목록을 조회하여 테이블로 표시
- 필터링: query parameter 또는 네비게이션 링크 (`?service=neture`)
- 각 행에 상세 조회 링크 포함

```typescript
router.get('/', async (req: Request, res: Response) => {
  const service = (req.query.service as string) || null;

  // 서비스 필터 네비게이션
  const filters = ['전체', 'neture', 'glycopharm', 'kpa-society', ...]
    .map(s => s === '전체'
      ? `<a href="?" class="btn">전체</a>`
      : `<a href="?service=${s}" class="btn">${s}</a>`
    ).join(' ');

  // DB 조회
  const rows = await dataSource.query(`SELECT ... WHERE ...`, [...]);

  // 테이블 HTML 생성
  const tableRows = rows.map(r => `
    <tr>
      <td><a href="/__debug__/{name}/detail/${esc(r.id)}">${esc(r.id)}</a></td>
      <td>${esc(r.name)}</td>
      <td>${esc(r.status)}</td>
      <td><a href="/__debug__/{name}/action/${esc(r.id)}" class="btn btn-success">Action</a></td>
    </tr>
  `).join('');

  res.send(page('Title', `${filters}<table>...${tableRows}</table>`));
});
```

### 4.2 상세 조회 (GET `/detail/:id` 또는 `/user`)

- 특정 레코드의 전체 정보를 HTML로 표시
- **Email-first 검색 지원**: `input.includes('@')` → email로 user 조회 → userId 획득
- **Raw JSON 덤프** 포함 (하단에 `<pre>` 블록) — 사용자가 복사하여 공유 가능

```typescript
router.get('/user', async (req: Request, res: Response) => {
  let input = (req.query.q as string)?.trim();
  if (!input) return res.send(page('Search', '<form method="GET">...'));

  // Email → userId 변환
  if (input.includes('@')) {
    const userRow = await dataSource.query(
      `SELECT id FROM users WHERE email = $1`, [input]
    );
    if (userRow.length === 0) return res.send(page('Not Found', '...'));
    input = userRow[0].id;
  }

  // 상세 조회 + Raw JSON
  const data = await dataSource.query(`SELECT * FROM ... WHERE id = $1`, [input]);

  res.send(page('User Detail', `
    <table>...</table>
    <h3>Raw JSON</h3>
    <pre>${esc(JSON.stringify(data, null, 2))}</pre>
  `));
});
```

### 4.3 액션 (GET `/action/:id`)

- 승인/거부/수정 등 상태 변경 액션
- **GET 요청으로 실행** (디버그 전용이므로 POST 불필요)
- 결과를 HTML로 즉시 표시
- 성공/실패 색상 구분 (`.ok` / `.err`)

```typescript
router.get('/approve/:id', async (req: Request, res: Response) => {
  try {
    const result = await service.approve(req.params.id);
    res.send(page('Approve Result', `
      <p class="ok">✅ 승인 완료</p>
      <pre>${esc(JSON.stringify(result, null, 2))}</pre>
      <a href="/__debug__/{name}" class="btn">← 목록으로</a>
    `));
  } catch (error) {
    res.send(page('Approve Error', `
      <p class="err">❌ 실패: ${esc(error.message)}</p>
      <pre>${esc(error.stack)}</pre>
    `));
  }
});
```

---

## 5. DB 쿼리 규칙

### SELECT FOR UPDATE (변경 작업 시)

TypeORM `queryRunner.query()` 에서 `UPDATE...RETURNING`은 컬럼 값이 null로 반환될 수 있다.
안전한 패턴:

```typescript
// ✅ 안전한 패턴: SELECT FOR UPDATE → 별도 UPDATE
const rows = await queryRunner.query(
  `SELECT id, user_id, status FROM table WHERE id = $1 FOR UPDATE`,
  [id]
);
const userId = rows[0].user_id; // 확실히 값 획득
await queryRunner.query(`UPDATE table SET status = 'done' WHERE id = $1`, [id]);

// ❌ 위험한 패턴: UPDATE...RETURNING (user_id가 null일 수 있음)
const result = await queryRunner.query(
  `UPDATE table SET status = 'done' WHERE id = $1 RETURNING *`,
  [id]
);
```

### Parameter Binding

```typescript
// ✅ 항상 $1, $2... 파라미터 사용
await dataSource.query(`SELECT * FROM users WHERE id = $1`, [userId]);

// ❌ String interpolation 절대 금지
await dataSource.query(`SELECT * FROM users WHERE id = '${userId}'`);
```

---

## 6. 에러 표시 규칙

- 에러 발생 시 **에러 메시지 + 스택 트레이스** 전체 표시
- `error.code`, `error.detail` (PostgreSQL 에러) 도 표시
- 디버그 페이지는 상세 에러를 숨기지 않는다

```typescript
} catch (error) {
  const err = error instanceof Error ? error : new Error(String(error));
  res.send(page('Error', `
    <p class="err">❌ ${esc(err.message)}</p>
    ${(error as any).code ? `<p>Code: ${esc((error as any).code)}</p>` : ''}
    ${(error as any).detail ? `<p>Detail: ${esc((error as any).detail)}</p>` : ''}
    <pre>${esc(err.stack)}</pre>
  `));
}
```

---

## 7. 체크리스트 (새 디버그 페이지 생성 시)

- [ ] `apps/api-server/src/routes/debug/{name}.controller.ts` 생성
- [ ] `export function create{Name}Router(dataSource: DataSource): Router`
- [ ] `esc()` 유틸리티 포함 (모든 동적 출력에 사용)
- [ ] `page()` 래퍼 포함 (다크 monospace 테마)
- [ ] 클라이언트 JS 없음 (`<script>`, `fetch`, `onclick` 없음)
- [ ] 네비게이션: `<a href>` 링크만 사용
- [ ] 검색: `<form method="GET">` 사용
- [ ] Email-first 검색 지원 (`@` 포함 시 이메일로 조회)
- [ ] Raw JSON 덤프 포함 (`<pre>` 블록)
- [ ] 에러 시 상세 정보 표시 (message + code + stack)
- [ ] `main.ts`에 `app.use('/__debug__/{name}', ...)` 등록
- [ ] Parameter Binding 사용 (String Interpolation 금지)

---

## 8. 참조 — 기존 디버그 페이지

| 경로 | 파일 | 용도 |
|------|------|------|
| `/__debug__/approval-test` | `routes/debug/approval-test.controller.ts` | 가입 승인 테스트 + 불일치 사용자 감지/복구 |
| `/__debug__/auth-bootstrap` | (기존) | 인증 부트스트랩 진단 |

---

*Created: 2026-03-17*
*Version: 1.0*
