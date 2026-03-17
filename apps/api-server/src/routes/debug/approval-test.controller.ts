/**
 * Approval Test Debug Endpoint — Server-Side Rendered HTML
 *
 * /__debug__/approval-test
 *
 * 모든 페이지가 서버에서 HTML로 렌더링됨. JavaScript 불필요.
 *
 * - GET /                          → 메인 (pending 목록 자동 표시)
 * - GET /?serviceKey=glycopharm    → 서비스별 필터
 * - GET /user?q=이메일또는UUID      → 유저 상태 진단
 * - GET /approve/:membershipId     → 승인 실행 (GET으로 간편하게)
 */
import { Router } from 'express';
import type { DataSource } from 'typeorm';
import { MembershipApprovalService } from '../../services/approval/MembershipApprovalService.js';

const approvalService = new MembershipApprovalService();

function esc(s: unknown): string {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function page(title: string, body: string): string {
  return `<!DOCTYPE html>
<html lang="ko"><head><meta charset="utf-8"><title>${esc(title)}</title>
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:monospace;background:#111;color:#eee;padding:20px;max-width:960px;margin:0 auto}
h1{font-size:18px;margin-bottom:12px;color:#6cf}
h2{font-size:14px;margin:16px 0 8px;color:#aaa}
a{color:#6cf;text-decoration:none}a:hover{text-decoration:underline}
pre{background:#1a1a2e;padding:12px;border-radius:6px;overflow:auto;max-height:500px;font-size:12px;line-height:1.5;white-space:pre-wrap;margin:8px 0}
table{border-collapse:collapse;width:100%;margin:8px 0;font-size:12px}
th,td{border:1px solid #333;padding:6px 8px;text-align:left}
th{background:#1e1e2e;color:#aaa}
td{background:#161622}
.ok{color:#34d399}.warn{color:#fbbf24}.err{color:#f87171}
.btn{display:inline-block;background:#2563eb;color:#fff;padding:4px 12px;border-radius:4px;font-size:12px;font-family:monospace}
.btn:hover{background:#1d4ed8;text-decoration:none}
.btn-danger{background:#dc2626}.btn-danger:hover{background:#b91c1c}
.nav{display:flex;gap:8px;flex-wrap:wrap;margin:8px 0}
form{display:inline}
input[type=text]{background:#222;border:1px solid #444;color:#eee;padding:4px 8px;border-radius:4px;font-family:monospace;font-size:12px;width:260px}
input[type=submit]{background:#2563eb;color:#fff;border:none;padding:4px 12px;border-radius:4px;cursor:pointer;font-family:monospace;font-size:12px}
.card{background:#1e1e2e;border:1px solid #333;border-radius:6px;padding:10px;margin:6px 0}
hr{border:none;border-top:1px solid #333;margin:16px 0}
</style></head><body>
<h1><a href="/__debug__/approval-test">/__debug__/approval-test</a></h1>
${body}
</body></html>`;
}

export function createApprovalTestRouter(dataSource: DataSource): Router {
  const router = Router();

  // ─── GET / — 메인 페이지: pending 목록 + 검색 폼 ───
  router.get('/', async (req, res) => {
    try {
      const serviceKey = (req.query.serviceKey as string) || '';
      const params: any[] = [];
      let filter = '';
      if (serviceKey) {
        filter = 'AND sm.service_key = $1';
        params.push(serviceKey);
      }

      const rows = await dataSource.query(
        `SELECT sm.id AS membership_id, sm.user_id, sm.service_key, sm.role, sm.status, sm.created_at,
                u.email, u.name, u.status AS user_status, u."isActive" AS user_is_active
         FROM service_memberships sm
         JOIN users u ON u.id = sm.user_id
         WHERE sm.status IN ('pending', 'rejected') ${filter}
         ORDER BY sm.created_at DESC
         LIMIT 50`,
        params
      );

      // 서비스 필터 네비게이션
      const nav = `
<div class="nav">
  <a class="btn${!serviceKey ? ' btn-danger' : ''}" href="?">ALL</a>
  <a class="btn${serviceKey === 'glycopharm' ? ' btn-danger' : ''}" href="?serviceKey=glycopharm">glycopharm</a>
  <a class="btn${serviceKey === 'neture' ? ' btn-danger' : ''}" href="?serviceKey=neture">neture</a>
  <a class="btn${serviceKey === 'kpa-society' ? ' btn-danger' : ''}" href="?serviceKey=kpa-society">kpa-society</a>
  <a class="btn${serviceKey === 'k-cosmetics' ? ' btn-danger' : ''}" href="?serviceKey=k-cosmetics">k-cosmetics</a>
  <a class="btn${serviceKey === 'glucoseview' ? ' btn-danger' : ''}" href="?serviceKey=glucoseview">glucoseview</a>
</div>`;

      // 유저 검색 폼
      const searchForm = `
<hr>
<h2>User State Check</h2>
<form action="/__debug__/approval-test/user" method="GET" style="display:flex;gap:8px;margin:8px 0">
  <input type="text" name="q" placeholder="email (예: sohae21@naver.com) 또는 UUID" style="width:360px">
  <input type="submit" value="Check">
</form>`;

      let tableHtml: string;
      if (rows.length === 0) {
        tableHtml = `<p class="ok">pending/rejected 멤버십이 없습니다${serviceKey ? ` (${esc(serviceKey)})` : ''}.</p>`;
      } else {
        const rowsHtml = rows.map((m: any) => {
          const statusClass = m.status === 'pending' ? 'warn' : m.status === 'rejected' ? 'err' : 'ok';
          return `<tr>
  <td><span class="${statusClass}">${esc(m.status)}</span></td>
  <td>${esc(m.email)}<br><small style="color:#666">${esc(m.name || '')}</small></td>
  <td>${esc(m.service_key)}</td>
  <td>${esc(m.role)}</td>
  <td>${esc(m.user_status)} / ${m.user_is_active ? '<span class="ok">active</span>' : '<span class="err">inactive</span>'}</td>
  <td style="font-size:10px">${esc(m.membership_id)}</td>
  <td>
    <a class="btn" href="/__debug__/approval-test/user?q=${encodeURIComponent(m.email)}">Check</a>
    <a class="btn btn-danger" href="/__debug__/approval-test/approve/${esc(m.membership_id)}">Approve</a>
  </td>
</tr>`;
        }).join('\n');

        tableHtml = `
<p>${rows.length}건${serviceKey ? ` (${esc(serviceKey)})` : ''}</p>
<table>
<tr><th>Status</th><th>User</th><th>Service</th><th>Role</th><th>User Status</th><th>Membership ID</th><th>Actions</th></tr>
${rowsHtml}
</table>`;
      }

      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.send(page('Approval Test', `
<h2>Pending / Rejected Memberships</h2>
${nav}
${tableHtml}
${searchForm}
<hr>
<h2>Repair Tools</h2>
<p><a class="btn btn-danger" href="/__debug__/approval-test/inconsistent">Inconsistent Users (부분실패 복구)</a>
<span style="color:#888;margin-left:8px">membership=active인데 user!=ACTIVE인 유저 조회 + 복구</span></p>
`));
    } catch (error) {
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.status(500).send(page('Error', `<pre class="err">${esc(String(error))}</pre>`));
    }
  });

  // ─── GET /user?q=이메일또는UUID — 유저 상태 진단 ───
  router.get('/user', async (req, res) => {
    try {
      const q = (req.query.q as string || '').trim();
      if (!q) {
        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        res.send(page('User Check', `
<h2>User State Check</h2>
<form action="/__debug__/approval-test/user" method="GET" style="display:flex;gap:8px;margin:8px 0">
  <input type="text" name="q" placeholder="email 또는 UUID" style="width:360px" autofocus>
  <input type="submit" value="Check">
</form>
<p class="warn">email 또는 UUID를 입력하세요</p>
<p><a href="/__debug__/approval-test">&larr; Back</a></p>`));
        return;
      }

      const isEmail = q.includes('@');
      let userId = q;

      if (isEmail) {
        const found = await dataSource.query(
          `SELECT id FROM users WHERE email = $1 LIMIT 1`,
          [q]
        );
        if (found.length === 0) {
          res.setHeader('Content-Type', 'text/html; charset=utf-8');
          res.send(page('User Not Found', `
<h2>User Not Found</h2>
<p class="err">해당 이메일의 유저를 찾을 수 없습니다: <b>${esc(q)}</b></p>
<p><a href="/__debug__/approval-test">&larr; Back</a></p>`));
          return;
        }
        userId = found[0].id;
      }

      const [userRows, membershipRows, roleRows] = await Promise.all([
        dataSource.query(
          `SELECT id, email, name, status, "isActive", "approvedAt", "approvedBy", "createdAt"
           FROM users WHERE id = $1`,
          [userId]
        ),
        dataSource.query(
          `SELECT id, service_key, role, status, approved_by, approved_at, rejection_reason, created_at
           FROM service_memberships WHERE user_id = $1 ORDER BY created_at DESC`,
          [userId]
        ),
        dataSource.query(
          `SELECT id, role, is_active, assigned_by, valid_from, scope_type, created_at, updated_at
           FROM role_assignments WHERE user_id = $1 ORDER BY is_active DESC, created_at DESC`,
          [userId]
        ),
      ]);

      const user = userRows[0];
      if (!user) {
        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        res.send(page('User Not Found', `
<h2>User Not Found</h2>
<p class="err">ID: <b>${esc(userId)}</b></p>
<p><a href="/__debug__/approval-test">&larr; Back</a></p>`));
        return;
      }

      // User info
      const userHtml = `
<div class="card">
  <b>${esc(user.email)}</b> — ${esc(user.name || '(no name)')}<br>
  Status: <span class="${user.status === 'ACTIVE' ? 'ok' : 'warn'}">${esc(user.status)}</span> |
  isActive: ${user.isActive ? '<span class="ok">true</span>' : '<span class="err">false</span>'}<br>
  <small>ID: ${esc(user.id)} | created: ${esc(user.createdAt)} | approved: ${esc(user.approvedAt || 'N/A')}</small>
</div>`;

      // Memberships table
      let membershipHtml: string;
      if (membershipRows.length === 0) {
        membershipHtml = '<p class="warn">멤버십 없음</p>';
      } else {
        membershipHtml = `<table>
<tr><th>Service</th><th>Role</th><th>Status</th><th>Approved</th><th>Rejection</th><th>Membership ID</th><th>Action</th></tr>
${membershipRows.map((m: any) => {
  const sc = m.status === 'active' ? 'ok' : m.status === 'pending' ? 'warn' : 'err';
  return `<tr>
  <td>${esc(m.service_key)}</td><td>${esc(m.role)}</td>
  <td><span class="${sc}">${esc(m.status)}</span></td>
  <td>${esc(m.approved_at || '-')}</td>
  <td>${esc(m.rejection_reason || '-')}</td>
  <td style="font-size:10px">${esc(m.id)}</td>
  <td>${m.status !== 'active' ? `<a class="btn btn-danger" href="/__debug__/approval-test/approve/${esc(m.id)}">Approve</a>` : '<span class="ok">active</span>'}</td>
</tr>`;
}).join('\n')}
</table>`;
      }

      // Role assignments table
      let roleHtml: string;
      if (roleRows.length === 0) {
        roleHtml = '<p class="warn">역할 할당 없음</p>';
      } else {
        roleHtml = `<table>
<tr><th>Role</th><th>Active</th><th>Scope</th><th>Assigned By</th><th>Valid From</th><th>Updated</th></tr>
${roleRows.map((r: any) => `<tr>
  <td>${esc(r.role)}</td>
  <td>${r.is_active ? '<span class="ok">true</span>' : '<span class="err">false</span>'}</td>
  <td>${esc(r.scope_type || 'global')}</td>
  <td style="font-size:10px">${esc(r.assigned_by || '-')}</td>
  <td>${esc(r.valid_from)}</td>
  <td>${esc(r.updated_at)}</td>
</tr>`).join('\n')}
</table>`;
      }

      // JSON dump
      const jsonDump = JSON.stringify({ user: userRows[0], memberships: membershipRows, roleAssignments: roleRows }, null, 2);

      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.send(page(`User: ${user.email}`, `
<p><a href="/__debug__/approval-test">&larr; Back</a></p>
<h2>User</h2>
${userHtml}
<h2>Service Memberships (${membershipRows.length})</h2>
${membershipHtml}
<h2>Role Assignments (${roleRows.length})</h2>
${roleHtml}
<hr>
<h2>Raw JSON</h2>
<pre>${esc(jsonDump)}</pre>
`));
    } catch (error) {
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.status(500).send(page('Error', `
<p class="err">${esc(String(error))}</p>
<pre>${esc((error as any)?.stack || '')}</pre>
<p><a href="/__debug__/approval-test">&larr; Back</a></p>`));
    }
  });

  // ─── GET /approve/:membershipId — 승인 실행 (GET으로 간편하게) ───
  router.get('/approve/:membershipId', async (req, res) => {
    try {
      const { membershipId } = req.params;
      const approvedBy = (req as any).user?.id || null;

      const result = await approvalService.approveMembership({
        membershipId,
        approvedBy,
        isPlatformAdmin: true,
        serviceKeys: [],
      });

      if (!result) {
        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        res.send(page('Approve Failed', `
<h2 class="err">Membership Not Found or Already Active</h2>
<p>ID: ${esc(membershipId)}</p>
<p><a href="/__debug__/approval-test">&larr; Back</a></p>`));
        return;
      }

      // Post-approval state
      const [userRows, roleRows] = await Promise.all([
        dataSource.query(
          `SELECT id, email, name, status, "isActive" FROM users WHERE id = $1`,
          [result.user_id]
        ),
        dataSource.query(
          `SELECT role, is_active FROM role_assignments WHERE user_id = $1 AND is_active = true`,
          [result.user_id]
        ),
      ]);

      const user = userRows[0];
      const jsonDump = JSON.stringify({ approved: result, postState: { user: user || null, activeRoles: roleRows } }, null, 2);

      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.send(page('Approved!', `
<h2 class="ok">Approval SUCCESS</h2>
<div class="card">
  <b>${esc(user?.email || '?')}</b> — ${esc(user?.name || '')}<br>
  Membership: <span class="ok">active</span> (${esc(result.service_key)} / ${esc(result.role)})<br>
  User Status: <span class="${user?.status === 'ACTIVE' ? 'ok' : 'warn'}">${esc(user?.status)}</span> |
  isActive: ${user?.isActive ? '<span class="ok">true</span>' : '<span class="err">false</span>'}
</div>
<h2>Active Roles</h2>
<ul>${roleRows.map((r: any) => `<li class="ok">${esc(r.role)} (active: ${r.is_active})</li>`).join('')}</ul>
<hr>
<h2>Raw JSON</h2>
<pre>${esc(jsonDump)}</pre>
<p>
  <a href="/__debug__/approval-test/user?q=${encodeURIComponent(user?.email || result.user_id)}">Check User State</a> |
  <a href="/__debug__/approval-test">&larr; Back</a>
</p>`));
    } catch (error) {
      const errorDetail = {
        error: error instanceof Error ? error.message : String(error),
        code: (error as any)?.code,
        detail: (error as any)?.detail,
        stack: error instanceof Error ? error.stack : undefined,
      };

      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.status(500).send(page('Approve Error', `
<h2 class="err">Approval FAILED</h2>
<p>Membership ID: ${esc(req.params.membershipId)}</p>
<pre class="err">${esc(JSON.stringify(errorDetail, null, 2))}</pre>
<p><a href="/__debug__/approval-test">&larr; Back</a></p>`));
    }
  });

  // ─── GET /inconsistent — 부분실패 유저 목록 (membership=active but user!=ACTIVE) ───
  router.get('/inconsistent', async (_req, res) => {
    try {
      const rows = await dataSource.query(
        `SELECT u.id AS user_id, u.email, u.name, u.status AS user_status, u."isActive" AS user_is_active,
                u."approvedAt", u."createdAt",
                sm.id AS membership_id, sm.service_key, sm.role, sm.status AS membership_status,
                sm.approved_by, sm.approved_at
         FROM users u
         JOIN service_memberships sm ON sm.user_id = u.id AND sm.status = 'active'
         WHERE u.status != 'ACTIVE' OR u."isActive" = false OR u."approvedAt" IS NULL
         ORDER BY u."createdAt" DESC
         LIMIT 100`
      );

      let tableHtml: string;
      if (rows.length === 0) {
        tableHtml = '<p class="ok">부분실패 유저가 없습니다. 모든 active 멤버십의 유저 상태가 정상입니다.</p>';
      } else {
        tableHtml = `
<p class="warn">${rows.length}건의 불일치 발견</p>
<table>
<tr><th>Email</th><th>User Status</th><th>isActive</th><th>approvedAt</th><th>Service</th><th>Membership</th><th>Action</th></tr>
${rows.map((r: any) => `<tr>
  <td>${esc(r.email)}<br><small style="color:#666">${esc(r.name || '')}</small></td>
  <td><span class="${r.user_status === 'ACTIVE' ? 'ok' : 'err'}">${esc(r.user_status)}</span></td>
  <td>${r.user_is_active ? '<span class="ok">true</span>' : '<span class="err">false</span>'}</td>
  <td>${r.approvedAt ? esc(r.approvedAt) : '<span class="err">NULL</span>'}</td>
  <td>${esc(r.service_key)} (${esc(r.role)})</td>
  <td><span class="ok">${esc(r.membership_status)}</span></td>
  <td>
    <a class="btn" href="/__debug__/approval-test/user?q=${encodeURIComponent(r.email)}">Check</a>
    <a class="btn btn-danger" href="/__debug__/approval-test/repair/${esc(r.user_id)}">Repair</a>
  </td>
</tr>`).join('\n')}
</table>`;
      }

      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.send(page('Inconsistent Users', `
<p><a href="/__debug__/approval-test">&larr; Back</a></p>
<h2>Inconsistent Users (membership=active, user!=ACTIVE)</h2>
<p style="color:#888">이전 비트랜잭션 코드에서 membership만 active되고 user 상태가 갱신되지 않은 유저들</p>
${tableHtml}
${rows.length > 0 ? `<hr><p><a class="btn btn-danger" href="/__debug__/approval-test/repair-all">Repair ALL (${rows.length}건)</a></p>` : ''}
`));
    } catch (error) {
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.status(500).send(page('Error', `<pre class="err">${esc(String(error))}</pre>`));
    }
  });

  // ─── GET /repair/:userId — 단일 유저 상태 복구 ───
  router.get('/repair/:userId', async (req, res) => {
    try {
      const { userId } = req.params;

      // 해당 유저의 active membership 확인
      const membershipCheck = await dataSource.query(
        `SELECT id, service_key, role FROM service_memberships
         WHERE user_id = $1 AND status = 'active' LIMIT 1`,
        [userId]
      );

      if (membershipCheck.length === 0) {
        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        res.send(page('Repair Failed', `
<h2 class="err">No active membership</h2>
<p>이 유저에게 active 멤버십이 없습니다. 복구 대상이 아닙니다.</p>
<p><a href="/__debug__/approval-test/inconsistent">&larr; Back</a></p>`));
        return;
      }

      // User 상태 복구
      await dataSource.query(
        `UPDATE users SET status = 'ACTIVE', "isActive" = true,
         "approvedAt" = COALESCE("approvedAt", NOW()), "updatedAt" = NOW()
         WHERE id = $1`,
        [userId]
      );

      // Role assignment 보장
      const membership = membershipCheck[0];
      const role = membership.role || 'member';
      await dataSource.query(
        `INSERT INTO role_assignments (user_id, role, is_active, valid_from, created_at, updated_at)
         VALUES ($1, $2, true, NOW(), NOW(), NOW())
         ON CONFLICT ON CONSTRAINT "unique_active_role_per_user"
         DO UPDATE SET is_active = true, updated_at = NOW()`,
        [userId, role]
      );

      // 복구 후 상태 확인
      const userAfter = await dataSource.query(
        `SELECT id, email, name, status, "isActive", "approvedAt" FROM users WHERE id = $1`,
        [userId]
      );
      const u = userAfter[0];

      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.send(page('Repair Success', `
<h2 class="ok">User Repaired</h2>
<div class="card">
  <b>${esc(u?.email)}</b> — ${esc(u?.name || '')}<br>
  Status: <span class="ok">${esc(u?.status)}</span> |
  isActive: <span class="ok">${u?.isActive}</span> |
  approvedAt: ${esc(u?.approvedAt)}
</div>
<p>
  <a href="/__debug__/approval-test/user?q=${encodeURIComponent(u?.email || userId)}">Check Full State</a> |
  <a href="/__debug__/approval-test/inconsistent">&larr; Back to Inconsistent List</a>
</p>`));
    } catch (error) {
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.status(500).send(page('Repair Error', `
<h2 class="err">Repair FAILED</h2>
<pre class="err">${esc(JSON.stringify({
  error: error instanceof Error ? error.message : String(error),
  code: (error as any)?.code,
  detail: (error as any)?.detail,
}, null, 2))}</pre>
<p><a href="/__debug__/approval-test/inconsistent">&larr; Back</a></p>`));
    }
  });

  // ─── GET /repair-all — 전체 부분실패 유저 일괄 복구 ───
  router.get('/repair-all', async (_req, res) => {
    try {
      // 부분실패 유저 조회
      const rows = await dataSource.query(
        `SELECT DISTINCT u.id AS user_id, u.email, sm.role
         FROM users u
         JOIN service_memberships sm ON sm.user_id = u.id AND sm.status = 'active'
         WHERE u.status != 'ACTIVE' OR u."isActive" = false OR u."approvedAt" IS NULL`
      );

      if (rows.length === 0) {
        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        res.send(page('Nothing to Repair', `
<h2 class="ok">부분실패 유저가 없습니다.</h2>
<p><a href="/__debug__/approval-test">&larr; Back</a></p>`));
        return;
      }

      const results: string[] = [];
      for (const r of rows) {
        try {
          await dataSource.query(
            `UPDATE users SET status = 'ACTIVE', "isActive" = true,
             "approvedAt" = COALESCE("approvedAt", NOW()), "updatedAt" = NOW()
             WHERE id = $1`,
            [r.user_id]
          );
          const role = r.role || 'member';
          await dataSource.query(
            `INSERT INTO role_assignments (user_id, role, is_active, valid_from, created_at, updated_at)
             VALUES ($1, $2, true, NOW(), NOW(), NOW())
             ON CONFLICT ON CONSTRAINT "unique_active_role_per_user"
             DO UPDATE SET is_active = true, updated_at = NOW()`,
            [r.user_id, role]
          );
          results.push(`<li class="ok">${esc(r.email)} — repaired (role: ${esc(role)})</li>`);
        } catch (err) {
          results.push(`<li class="err">${esc(r.email)} — FAILED: ${esc(String(err))}</li>`);
        }
      }

      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.send(page('Repair All Complete', `
<h2 class="ok">Bulk Repair Complete</h2>
<p>${rows.length}건 처리</p>
<ul>${results.join('\n')}</ul>
<p>
  <a href="/__debug__/approval-test/inconsistent">Check Remaining Inconsistencies</a> |
  <a href="/__debug__/approval-test">&larr; Back</a>
</p>`));
    } catch (error) {
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.status(500).send(page('Repair Error', `<pre class="err">${esc(String(error))}</pre>`));
    }
  });

  // ─── Legacy JSON endpoints (backward compat) ───
  router.get('/api/pending', async (req, res) => {
    try {
      const serviceKey = req.query.serviceKey as string || null;
      const params: any[] = [];
      let filter = '';
      if (serviceKey) { filter = 'AND sm.service_key = $1'; params.push(serviceKey); }
      const rows = await dataSource.query(
        `SELECT sm.id AS membership_id, sm.user_id, sm.service_key, sm.role, sm.status, sm.created_at,
                u.email, u.name, u.status AS user_status, u."isActive" AS user_is_active
         FROM service_memberships sm JOIN users u ON u.id = sm.user_id
         WHERE sm.status IN ('pending', 'rejected') ${filter}
         ORDER BY sm.created_at DESC LIMIT 50`, params);
      res.json({ success: true, count: rows.length, memberships: rows });
    } catch (error) { res.status(500).json({ success: false, error: String(error) }); }
  });

  return router;
}
