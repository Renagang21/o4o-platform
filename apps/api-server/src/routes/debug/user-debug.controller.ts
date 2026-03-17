/**
 * User Debug Info — SSR HTML Page
 *
 * GET /__debug__/user              → 검색 폼
 * GET /__debug__/user?email=xxx    → 결과 페이지
 *
 * WO-O4O-DEBUG-USER-JSON-PAGE-V1
 *
 * 제약:
 * - DEBUG_MODE + /__debug__/ 경로로만 접근 가능
 * - SELECT만 실행 (UPDATE/DELETE 절대 금지)
 * - 서버사이드 렌더링 (inline JS 없음)
 * - TODO: 진단 완료 후 admin only guard 추가 예정
 */

import { Router, Request, Response } from 'express';
import { DataSource } from 'typeorm';

/* ── helpers ────────────────────────────────────── */

function esc(s: unknown): string {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function page(title: string, body: string): string {
  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>${esc(title)}</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Courier New', monospace; background: #1a1a2e; color: #e0e0e0; padding: 20px; }
  h1 { color: #00d4ff; margin-bottom: 16px; font-size: 20px; }
  h2 { color: #ffd700; margin: 24px 0 8px; font-size: 16px; border-bottom: 1px solid #333; padding-bottom: 4px; }
  .card { background: #16213e; border: 1px solid #0f3460; border-radius: 8px; padding: 16px; margin-bottom: 16px; }
  table { width: 100%; border-collapse: collapse; font-size: 13px; }
  th { text-align: left; color: #00d4ff; padding: 4px 8px; border-bottom: 1px solid #333; }
  td { padding: 4px 8px; border-bottom: 1px solid #222; word-break: break-all; }
  .ok { color: #00ff88; } .warn { color: #ffd700; } .err { color: #ff4444; }
  pre { background: #0d1117; padding: 12px; border-radius: 6px; overflow-x: auto; font-size: 12px; white-space: pre-wrap; }
  form { margin-bottom: 20px; }
  input[type=text] { background: #0d1117; border: 1px solid #0f3460; color: #e0e0e0; padding: 8px 12px; border-radius: 4px; width: 320px; font-size: 14px; }
  button { background: #0f3460; color: #00d4ff; border: none; padding: 8px 16px; border-radius: 4px; cursor: pointer; font-size: 14px; margin-left: 8px; }
  button:hover { background: #1a4a8a; }
  a { color: #00d4ff; text-decoration: none; }
  a:hover { text-decoration: underline; }
  .badge { display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 12px; font-weight: bold; }
  .badge-active { background: #00ff8833; color: #00ff88; }
  .badge-pending { background: #ffd70033; color: #ffd700; }
  .badge-rejected { background: #ff444433; color: #ff4444; }
  .nav { margin-bottom: 16px; font-size: 13px; }
</style>
</head><body>${body}</body></html>`;
}

function badge(status: string): string {
  const cls = status === 'active' ? 'badge-active' : status === 'pending' ? 'badge-pending' : 'badge-rejected';
  return `<span class="badge ${cls}">${esc(status)}</span>`;
}

function tableHtml(rows: Record<string, unknown>[], highlight?: string[]): string {
  if (!rows.length) return '<p style="color:#666">No data</p>';
  const keys = Object.keys(rows[0]);
  let html = '<table><tr>';
  for (const k of keys) html += `<th>${esc(k)}</th>`;
  html += '</tr>';
  for (const row of rows) {
    html += '<tr>';
    for (const k of keys) {
      const v = row[k];
      const val = v instanceof Date ? v.toISOString() : String(v ?? '');
      const cls = highlight?.includes(k) && val === 'pending' ? 'warn' : highlight?.includes(k) && val === 'active' ? 'ok' : '';
      html += `<td class="${cls}">${esc(val)}</td>`;
    }
    html += '</tr>';
  }
  html += '</table>';
  return html;
}

/* ── router ─────────────────────────────────────── */

export function createUserDebugRouter(dataSource: DataSource): Router {
  const router = Router();

  router.get('/', async (req: Request, res: Response): Promise<void> => {
    res.setHeader('Content-Type', 'text/html; charset=utf-8');

    if (!dataSource.isInitialized) {
      res.status(503).send(page('DB Error', '<h1>Database not initialized</h1>'));
      return;
    }

    const email = (req.query.email as string)?.trim() || '';

    // ── 검색 폼 (email 없을 때) ──
    if (!email) {
      res.send(page('User Debug', `
        <h1>User Debug — O4O Platform</h1>
        <div class="card">
          <form method="GET" action="/__debug__/user">
            <label>Email: </label>
            <input type="text" name="email" placeholder="user@example.com" autofocus />
            <button type="submit">Search</button>
          </form>
        </div>
        <div class="nav">
          <a href="/__debug__/rbac-db-audit">RBAC Audit</a> |
          <a href="/__debug__/service-users?service=neture">Service Users</a>
        </div>
      `));
      return;
    }

    try {
      // 1. User
      const users = await dataSource.query(
        `SELECT * FROM users WHERE email = $1 LIMIT 1`,
        [email],
      );
      const user = users[0] || null;

      if (!user) {
        res.send(page('User Not Found', `
          <h1>User Not Found</h1>
          <div class="card">
            <p class="err">Email: <strong>${esc(email)}</strong> — 존재하지 않음</p>
          </div>
          <a href="/__debug__/user">&larr; Back</a>
        `));
        return;
      }

      // 2. Memberships — SELECT * 로 컬럼 에러 방지
      const memberships = await dataSource.query(
        `SELECT * FROM service_memberships WHERE user_id = $1 ORDER BY created_at DESC`,
        [user.id],
      );

      // 3. Role Assignments — SELECT * 로 컬럼 에러 방지
      const roles = await dataSource.query(
        `SELECT * FROM role_assignments WHERE user_id = $1 ORDER BY is_active DESC, role`,
        [user.id],
      );

      // 4. Summary
      const activeRoles = roles.filter((r: any) => r.is_active).map((r: any) => r.role);
      const hasPending = memberships.some((m: any) => m.status === 'pending');

      // 5. Raw JSON (복사용)
      const rawJson = JSON.stringify({ user, memberships, roles }, null, 2);

      // 6. HTML 렌더링
      const body = `
        <h1>User Debug — ${esc(email)}</h1>
        <div class="nav"><a href="/__debug__/user">&larr; Back to Search</a></div>

        <h2>Summary</h2>
        <div class="card">
          <table>
            <tr><th>항목</th><th>값</th></tr>
            <tr><td>User ID</td><td>${esc(user.id)}</td></tr>
            <tr><td>Email</td><td>${esc(user.email)}</td></tr>
            <tr><td>Name</td><td>${esc(user.name || user.firstName || '')}</td></tr>
            <tr><td>Status</td><td>${badge(user.status || 'unknown')}</td></tr>
            <tr><td>isActive</td><td class="${user.isActive ? 'ok' : 'err'}">${user.isActive}</td></tr>
            <tr><td>Memberships</td><td>${memberships.length}개</td></tr>
            <tr><td>Active Roles</td><td class="ok">${activeRoles.join(', ') || 'none'}</td></tr>
            <tr><td>Has Pending</td><td class="${hasPending ? 'warn' : 'ok'}">${hasPending}</td></tr>
            <tr><td>Created</td><td>${esc(user.createdAt)}</td></tr>
            <tr><td>Last Login</td><td>${esc(user.lastLoginAt || 'never')}</td></tr>
          </table>
        </div>

        <h2>Service Memberships (${memberships.length})</h2>
        <div class="card">${tableHtml(memberships, ['status'])}</div>

        <h2>Role Assignments (${roles.length})</h2>
        <div class="card">${tableHtml(roles, ['is_active'])}</div>

        <h2>Raw JSON (복사용)</h2>
        <div class="card"><pre>${esc(rawJson)}</pre></div>
      `;

      res.send(page(`Debug: ${email}`, body));
    } catch (error: any) {
      console.error('DEBUG USER ERROR:', error);
      res.status(500).send(page('Error', `
        <h1 class="err">Error</h1>
        <div class="card"><pre>${esc(error.message)}\n\n${esc(error.stack)}</pre></div>
        <a href="/__debug__/user">&larr; Back</a>
      `));
    }
  });

  return router;
}
