/**
 * Approval Test Debug Endpoint
 *
 * /__debug__/approval-test
 *
 * JSON 기반 승인 테스트 페이지.
 * - GET /                → 테스트 UI (HTML)
 * - GET /pending         → pending 멤버십 목록
 * - GET /user/:userId    → 유저 상태 (membership + role_assignments + users)
 * - POST /approve/:id    → 승인 실행 (MembershipApprovalService 직접 호출)
 */
import { Router } from 'express';
import type { DataSource } from 'typeorm';
import { MembershipApprovalService } from '../../services/approval/MembershipApprovalService.js';

const approvalService = new MembershipApprovalService();

export function createApprovalTestRouter(dataSource: DataSource): Router {
  const router = Router();

  // GET / — 테스트 UI
  router.get('/', (_req, res) => {
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(TEST_HTML);
  });

  // GET /pending — pending 멤버십 목록
  router.get('/pending', async (req, res) => {
    try {
      const serviceKey = req.query.serviceKey as string || null;
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

      res.json({ success: true, count: rows.length, memberships: rows });
    } catch (error) {
      res.status(500).json({ success: false, error: String(error) });
    }
  });

  // GET /user/:userIdOrEmail — 유저 상태 진단 (UUID 또는 이메일)
  router.get('/user/:userIdOrEmail', async (req, res) => {
    try {
      const input = req.params.userIdOrEmail;
      const isEmail = input.includes('@');

      // 이메일이면 먼저 userId를 조회
      let userId = input;
      if (isEmail) {
        const found = await dataSource.query(
          `SELECT id FROM users WHERE email = $1 LIMIT 1`,
          [input]
        );
        if (found.length === 0) {
          res.json({ success: false, error: `User not found: ${input}` });
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

      res.json({
        success: true,
        user: userRows[0] || null,
        memberships: membershipRows,
        roleAssignments: roleRows,
      });
    } catch (error) {
      res.status(500).json({ success: false, error: String(error) });
    }
  });

  // POST /approve/:membershipId — 승인 실행
  router.post('/approve/:membershipId', async (req, res) => {
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
        res.status(404).json({ success: false, error: 'Membership not found or already active' });
        return;
      }

      // Fetch post-approval state
      const [userRows, roleRows] = await Promise.all([
        dataSource.query(
          `SELECT id, email, status, "isActive" FROM users WHERE id = $1`,
          [result.user_id]
        ),
        dataSource.query(
          `SELECT role, is_active FROM role_assignments WHERE user_id = $1 AND is_active = true`,
          [result.user_id]
        ),
      ]);

      res.json({
        success: true,
        approved: result,
        postState: {
          user: userRows[0] || null,
          activeRoles: roleRows,
        },
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : String(error),
        code: (error as any)?.code,
        detail: (error as any)?.detail,
      });
    }
  });

  return router;
}

const TEST_HTML = `<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="utf-8">
<title>Approval Test</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: monospace; background: #111; color: #eee; padding: 24px; max-width: 960px; margin: 0 auto; }
  h1 { font-size: 18px; margin-bottom: 16px; color: #6cf; }
  h2 { font-size: 14px; margin: 16px 0 8px; color: #aaa; }
  button { background: #2563eb; color: #fff; border: none; padding: 6px 14px; border-radius: 4px; cursor: pointer; font-family: monospace; font-size: 13px; }
  button:hover { background: #1d4ed8; }
  button.danger { background: #dc2626; }
  button.danger:hover { background: #b91c1c; }
  button.sm { padding: 3px 8px; font-size: 11px; }
  input { background: #222; border: 1px solid #444; color: #eee; padding: 6px 10px; border-radius: 4px; font-family: monospace; font-size: 13px; width: 320px; }
  pre { background: #1a1a2e; padding: 12px; border-radius: 6px; overflow: auto; max-height: 400px; font-size: 12px; line-height: 1.5; margin: 8px 0; white-space: pre-wrap; }
  .row { display: flex; gap: 8px; align-items: center; margin: 8px 0; flex-wrap: wrap; }
  .card { background: #1e1e2e; border: 1px solid #333; border-radius: 6px; padding: 10px 14px; margin: 6px 0; }
  .card .email { color: #6cf; font-size: 13px; }
  .card .meta { color: #888; font-size: 11px; margin-top: 4px; }
  .card .actions { margin-top: 6px; display: flex; gap: 6px; }
  .pending { color: #fbbf24; } .active { color: #34d399; } .rejected { color: #f87171; }
  .tag { display: inline-block; padding: 2px 8px; border-radius: 3px; font-size: 11px; }
  .tag.pending { background: #422006; } .tag.active { background: #064e3b; } .tag.rejected { background: #450a0a; }
  .loading { color: #888; }
  .hint { color: #666; font-size: 11px; margin-top: 4px; }
</style>
</head>
<body>
<h1>/__debug__/approval-test</h1>

<h2>1. Pending/Rejected Memberships</h2>
<div class="row">
  <input id="serviceKey" placeholder="serviceKey (optional: glycopharm, neture...)">
  <button onclick="loadPending()">Load</button>
  <button onclick="document.getElementById('serviceKey').value='glycopharm';loadPending();" class="sm">glycopharm</button>
  <button onclick="document.getElementById('serviceKey').value='neture';loadPending();" class="sm">neture</button>
  <button onclick="document.getElementById('serviceKey').value='kpa-society';loadPending();" class="sm">kpa</button>
  <button onclick="document.getElementById('serviceKey').value='';loadPending();" class="sm">ALL</button>
</div>
<div id="pendingCards"></div>
<pre id="pendingResult" style="display:none"></pre>

<h2>2. User State Check</h2>
<div class="row">
  <input id="userId" placeholder="email 또는 userId (UUID)">
  <button onclick="checkUser()">Check</button>
</div>
<div class="hint">이메일(예: sohae21@naver.com) 또는 UUID 입력 가능</div>
<pre id="userResult">Enter email or userId</pre>

<h2>3. Approve Membership</h2>
<div class="row">
  <input id="membershipId" placeholder="membershipId (UUID) — Step 1에서 복사">
  <button class="danger" onclick="doApprove()">Approve</button>
</div>
<pre id="approveResult">Step 1에서 Approve 버튼을 클릭하거나, membershipId를 입력하세요</pre>

<script>
const BASE = '/__debug__/approval-test';
async function api(path, method = 'GET') {
  try {
    const r = await fetch(BASE + path, { method, headers: { 'Content-Type': 'application/json' } });
    return await r.json();
  } catch (e) { return { error: e.message }; }
}
function show(id, data) {
  document.getElementById(id).textContent = JSON.stringify(data, null, 2);
}
function esc(s) { const d = document.createElement('div'); d.textContent = s; return d.innerHTML; }

async function loadPending() {
  const sk = document.getElementById('serviceKey').value;
  const q = sk ? '?serviceKey=' + sk : '';
  const container = document.getElementById('pendingCards');
  container.innerHTML = '<div class="loading">Loading...</div>';

  const data = await api('/pending' + q);

  if (!data.success || !data.memberships || data.memberships.length === 0) {
    container.innerHTML = '<div class="card"><span class="active">pending/rejected 멤버십 없음</span></div>';
    return;
  }

  container.innerHTML = data.memberships.map(m => {
    const statusClass = m.status === 'pending' ? 'pending' : m.status === 'rejected' ? 'rejected' : 'active';
    return '<div class="card">' +
      '<div class="email">' + esc(m.email || '(no email)') + ' — ' + esc(m.name || '(no name)') + '</div>' +
      '<div class="meta">' +
        '<span class="tag ' + statusClass + '">' + esc(m.status) + '</span> ' +
        'service: <b>' + esc(m.service_key) + '</b> | role: ' + esc(m.role) + ' | ' +
        'user_status: ' + esc(m.user_status) + ' | isActive: ' + m.user_is_active +
      '</div>' +
      '<div class="meta">membership_id: ' + esc(m.membership_id) + '</div>' +
      '<div class="meta">user_id: ' + esc(m.user_id) + ' | created: ' + esc(m.created_at) + '</div>' +
      '<div class="actions">' +
        '<button class="sm" onclick="fillAndCheck(\\'' + esc(m.user_id) + '\\')">Check User</button>' +
        '<button class="sm danger" onclick="fillAndApprove(\\'' + esc(m.membership_id) + '\\', \\'' + esc(m.email) + '\\')">Approve</button>' +
      '</div>' +
    '</div>';
  }).join('');
}

function fillAndCheck(userId) {
  document.getElementById('userId').value = userId;
  checkUser();
}

function fillAndApprove(membershipId, email) {
  document.getElementById('membershipId').value = membershipId;
  if (confirm('Approve membership for ' + email + '?\\n\\nID: ' + membershipId)) {
    doApprove();
  }
}

async function checkUser() {
  const uid = document.getElementById('userId').value.trim();
  if (!uid) { show('userResult', { error: 'email 또는 userId를 입력하세요' }); return; }
  show('userResult', 'Loading...');
  show('userResult', await api('/user/' + encodeURIComponent(uid)));
}

async function doApprove() {
  const mid = document.getElementById('membershipId').value.trim();
  if (!mid) { show('approveResult', { error: 'membershipId를 입력하세요' }); return; }
  show('approveResult', 'Approving...');
  show('approveResult', await api('/approve/' + mid, 'POST'));
}

// 페이지 로드 시 자동으로 전체 목록 표시
loadPending();
</script>
</body>
</html>`;
