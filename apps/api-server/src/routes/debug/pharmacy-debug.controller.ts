/**
 * Pharmacy Debug — SSR HTML Page
 *
 * GET /__debug__/pharmacy           → 약국 목록 (organizations + glycopharm_pharmacies)
 * GET /__debug__/pharmacy/deactivate?id=xxx → 비활성화 (isActive=false)
 *
 * 임시 운영 도구 — 깨진 데이터 정리용
 */

import { Router } from 'express';
import type { DataSource } from 'typeorm';

function esc(s: unknown): string {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function page(title: string, body: string): string {
  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>${title}</title>
<style>body{font:14px/1.6 monospace;max-width:900px;margin:2em auto;padding:0 1em}
table{border-collapse:collapse;width:100%}td,th{border:1px solid #ccc;padding:4px 8px;text-align:left}
.warn{color:red;font-weight:bold}a{color:#0066cc}</style>
</head><body>${body}</body></html>`;
}

export function createPharmacyDebugRouter(dataSource: DataSource): Router {
  const router = Router();

  // GET / — 약국 목록
  router.get('/', async (_req, res) => {
    try {
      const rows = await dataSource.query(`
        SELECT
          o.id,
          o.name AS org_name,
          gp.name AS gp_name,
          o."isActive",
          o.created_at,
          COALESCE(pc.cnt, 0)::int AS patient_count
        FROM organizations o
        JOIN organization_service_enrollments e
          ON e.organization_id = o.id
          AND e.service_code = 'glycopharm'
          AND e.status = 'active'
        LEFT JOIN glycopharm_pharmacies gp ON gp.id = o.id
        LEFT JOIN (
          SELECT organization_id, COUNT(*)::int AS cnt
          FROM glucoseview_customers
          GROUP BY organization_id
        ) pc ON pc.organization_id = o.id
        ORDER BY o.created_at
      `);

      const tableRows = rows.map((r: any) => `<tr>
        <td>${esc(r.id)}</td>
        <td>${esc(r.org_name)}</td>
        <td>${esc(r.gp_name)}</td>
        <td>${r.isActive ? 'YES' : '<span class="warn">NO</span>'}</td>
        <td>${r.patient_count}</td>
        <td>${esc(r.created_at)}</td>
        <td>${r.isActive ? `<a href="/__debug__/pharmacy/deactivate?id=${esc(r.id)}">비활성화</a>` : '-'}</td>
      </tr>`).join('\n');

      res.send(page('Pharmacy Debug', `
        <h1>GlycoPharm 약국 목록</h1>
        <p>총 ${rows.length}개</p>
        <table>
          <tr><th>ID</th><th>Org Name</th><th>GP Name</th><th>Active</th><th>Patients</th><th>Created</th><th>Action</th></tr>
          ${tableRows}
        </table>
        <p><a href="/__debug__/pharmacy">새로고침</a></p>
      `));
    } catch (err) {
      res.status(500).send(page('Error', `<pre>${esc(err)}</pre>`));
    }
  });

  // GET /deactivate?id=xxx — 비활성화 확인 페이지
  router.get('/deactivate', async (req, res) => {
    const id = req.query.id as string;
    if (!id) return res.status(400).send(page('Error', 'id 파라미터 필요'));

    try {
      const rows = await dataSource.query(
        `SELECT id, name, "isActive" FROM organizations WHERE id = $1`,
        [id],
      );
      if (rows.length === 0) return res.status(404).send(page('Not Found', '해당 조직 없음'));

      const org = rows[0];
      res.send(page('비활성화 확인', `
        <h1>약국 비활성화</h1>
        <p><strong>ID:</strong> ${esc(org.id)}</p>
        <p><strong>Name:</strong> ${esc(org.name)}</p>
        <p><strong>Active:</strong> ${org.isActive ? 'YES' : 'NO'}</p>
        <form method="POST" action="/__debug__/pharmacy/deactivate">
          <input type="hidden" name="id" value="${esc(id)}" />
          <button type="submit" style="background:red;color:white;padding:8px 16px;border:none;cursor:pointer">
            비활성화 실행
          </button>
        </form>
        <p><a href="/__debug__/pharmacy">← 돌아가기</a></p>
      `));
    } catch (err) {
      res.status(500).send(page('Error', `<pre>${esc(err)}</pre>`));
    }
  });

  // POST /deactivate — 실제 비활성화
  router.post('/deactivate', async (req, res) => {
    const id = req.body?.id as string;
    if (!id) return res.status(400).send(page('Error', 'id 파라미터 필요'));

    try {
      await dataSource.query(
        `UPDATE organizations SET "isActive" = false WHERE id = $1`,
        [id],
      );
      // Also deactivate enrollment
      await dataSource.query(
        `UPDATE organization_service_enrollments SET status = 'inactive' WHERE organization_id = $1 AND service_code = 'glycopharm'`,
        [id],
      );

      res.send(page('완료', `
        <h1>비활성화 완료</h1>
        <p>Organization <strong>${esc(id)}</strong> 비활성화됨</p>
        <p><a href="/__debug__/pharmacy">← 목록으로</a></p>
      `));
    } catch (err) {
      res.status(500).send(page('Error', `<pre>${esc(err)}</pre>`));
    }
  });

  return router;
}
