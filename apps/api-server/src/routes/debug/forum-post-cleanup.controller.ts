/**
 * Forum Post Cleanup — SSR Debug Page
 *
 * WO-KPA-FORUM-LEGACY-TEST-POST-HARD-DELETE-V1
 *
 * GET  /__debug__/forum-post-cleanup          → 검색 폼
 * GET  /__debug__/forum-post-cleanup?title=x  → 검색 결과
 * GET  /__debug__/forum-post-cleanup/inspect?id=xxx → 상세 조회 (FK 포함)
 * POST /__debug__/forum-post-cleanup/delete   → hard delete (confirm=yes 필요)
 *
 * 제약:
 * - DEBUG_MODE + /__debug__/ 경로로만 접근 가능
 * - SELECT는 항상 허용
 * - DELETE는 confirm=yes 파라미터 필수
 * - 다른 정상 게시글은 절대 삭제하지 않음
 */

import { Router, Request, Response } from 'express';
import { DataSource } from 'typeorm';

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
  table { width: 100%; border-collapse: collapse; font-size: 12px; }
  th { text-align: left; color: #00d4ff; padding: 4px 8px; border-bottom: 1px solid #333; }
  td { padding: 4px 8px; border-bottom: 1px solid #222; word-break: break-all; max-width: 400px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .ok { color: #00ff88; } .warn { color: #ffd700; } .err { color: #ff4444; }
  pre { background: #0d1117; padding: 12px; border-radius: 6px; overflow-x: auto; font-size: 12px; white-space: pre-wrap; }
  form { margin-bottom: 20px; }
  input[type=text] { background: #0d1117; border: 1px solid #0f3460; color: #e0e0e0; padding: 8px 12px; border-radius: 4px; width: 480px; font-size: 14px; }
  button { background: #0f3460; color: #00d4ff; border: none; padding: 8px 16px; border-radius: 4px; cursor: pointer; font-size: 14px; margin-left: 8px; }
  button:hover { background: #1a4a8a; }
  button.danger { background: #7a0000; color: #ff8888; }
  button.danger:hover { background: #aa0000; }
  a { color: #00d4ff; text-decoration: none; }
  a:hover { text-decoration: underline; }
  .nav { margin-bottom: 16px; font-size: 13px; color: #888; }
  .log-line { font-size: 12px; padding: 2px 0; }
  .log-ok { color: #00ff88; }
  .log-warn { color: #ffd700; }
  .log-err { color: #ff4444; }
</style>
</head><body>${body}</body></html>`;
}

function tableHtml(rows: Record<string, unknown>[]): string {
  if (!rows.length) return '<p style="color:#00ff88">✓ 없음 (0행)</p>';
  const keys = Object.keys(rows[0]);
  let html = '<table><tr>';
  for (const k of keys) html += `<th>${esc(k)}</th>`;
  html += '</tr>';
  for (const row of rows) {
    html += '<tr>';
    for (const k of keys) {
      const v = row[k];
      const val = v instanceof Date ? v.toISOString() : String(v ?? '');
      html += `<td title="${esc(val)}">${esc(val.substring(0, 120))}</td>`;
    }
    html += '</tr>';
  }
  html += '</table>';
  return html;
}

export function createForumPostCleanupRouter(dataSource: DataSource): Router {
  const router = Router();

  // ── GET / — 검색 폼 ─────────────────────────────
  router.get('/', async (req: Request, res: Response): Promise<void> => {
    res.setHeader('Content-Type', 'text/html; charset=utf-8');

    const title = (req.query.title as string || '').trim();

    let resultsHtml = '';

    if (title) {
      try {
        const posts = await dataSource.query<any[]>(
          `SELECT id, title, status, type, author_id, "categoryId", "organizationId",
                  created_at, updated_at, view_count, comment_count, like_count, slug
           FROM forum_post
           WHERE title ILIKE $1
           ORDER BY created_at DESC
           LIMIT 20`,
          [`%${title}%`],
        );

        if (posts.length === 0) {
          resultsHtml = `<div class="card"><p class="warn">검색 결과 없음: "${esc(title)}"</p></div>`;
        } else {
          const rows = posts.map(p => `
            <tr>
              <td><code>${esc(p.id)}</code></td>
              <td>${esc(p.title)}</td>
              <td><span class="${p.status === 'publish' ? 'ok' : p.status === 'archived' ? 'warn' : 'err'}">${esc(p.status)}</span></td>
              <td>${esc(p.created_at instanceof Date ? p.created_at.toISOString() : String(p.created_at ?? ''))}</td>
              <td>
                <a href="/__debug__/forum-post-cleanup/inspect?id=${encodeURIComponent(p.id)}">상세 조회</a>
              </td>
            </tr>`).join('');

          resultsHtml = `
            <div class="card">
              <h2>검색 결과 (${posts.length}건)</h2>
              <table>
                <tr><th>ID</th><th>제목</th><th>상태</th><th>생성일</th><th>액션</th></tr>
                ${rows}
              </table>
            </div>`;
        }
      } catch (err: any) {
        resultsHtml = `<div class="card"><p class="err">쿼리 오류: ${esc(err.message)}</p></div>`;
      }
    }

    const body = `
      <h1>🧹 Forum Post Cleanup</h1>
      <div class="nav">
        WO-KPA-FORUM-LEGACY-TEST-POST-HARD-DELETE-V1
        | <a href="/__debug__/user">User Debug</a>
      </div>

      <div class="card">
        <h2>게시글 검색</h2>
        <form method="GET" action="/__debug__/forum-post-cleanup">
          <input type="text" name="title" value="${esc(title)}" placeholder="게시글 제목 (부분 일치)" />
          <button type="submit">검색</button>
        </form>
        <p style="color:#666;font-size:12px;margin-top:8px">
          예: 검색어 = <code>Forum Link Test Trial</code>
        </p>
      </div>

      ${resultsHtml}
    `;

    res.send(page('Forum Post Cleanup', body));
  });

  // ── GET /inspect?id=xxx — FK 상세 조회 ─────────
  router.get('/inspect', async (req: Request, res: Response): Promise<void> => {
    res.setHeader('Content-Type', 'text/html; charset=utf-8');

    const postId = (req.query.id as string || '').trim();
    if (!postId) {
      res.send(page('Error', `<p class="err">id 파라미터 필요</p><a href="/__debug__/forum-post-cleanup">← 돌아가기</a>`));
      return;
    }

    try {
      // 1. 게시글 본체
      const posts = await dataSource.query<any[]>(
        `SELECT id, title, status, type, author_id, "categoryId", "organizationId",
                created_at, updated_at, slug
         FROM forum_post WHERE id = $1`,
        [postId],
      );

      if (posts.length === 0) {
        res.send(page('Not Found', `<p class="err">게시글을 찾을 수 없음: ${esc(postId)}</p><a href="/__debug__/forum-post-cleanup">← 돌아가기</a>`));
        return;
      }

      const post = posts[0];

      // 2. 댓글
      const comments = await dataSource.query<any[]>(
        `SELECT id, "postId", author_id, status, content, created_at
         FROM forum_comment WHERE "postId" = $1`,
        [postId],
      );

      // 3. 좋아요
      const likes = await dataSource.query<any[]>(
        `SELECT id, post_id, user_id, created_at
         FROM forum_post_like WHERE post_id = $1`,
        [postId],
      );

      // 4. 알림
      const notifications = await dataSource.query<any[]>(
        `SELECT id, "postId", user_id, type, is_read, created_at
         FROM forum_notifications WHERE "postId" = $1`,
        [postId],
      );

      // 5. 카테고리 요청 (market_trial 연결 여부 확인)
      const trialSync = await dataSource.query<any[]>(
        `SELECT id, event_type, payload, created_at
         FROM market_trial_forum_sync_failure
         WHERE payload::text LIKE $1
         LIMIT 10`,
        [`%${postId}%`],
      ).catch(() => []); // 테이블 없으면 skip

      const totalFkRows = comments.length + likes.length + notifications.length + trialSync.length;

      const body = `
        <h1>🔍 게시글 상세 조회</h1>
        <div class="nav">
          <a href="/__debug__/forum-post-cleanup">← 검색으로</a>
        </div>

        <div class="card">
          <h2>게시글 본체 (forum_post)</h2>
          ${tableHtml(posts)}
        </div>

        <div class="card">
          <h2>댓글 (forum_comment) — ${comments.length}건</h2>
          ${tableHtml(comments.map(c => ({ ...c, content: String(c.content || '').substring(0, 60) })))}
        </div>

        <div class="card">
          <h2>좋아요 (forum_post_like) — ${likes.length}건</h2>
          ${tableHtml(likes)}
        </div>

        <div class="card">
          <h2>알림 (forum_notifications) — ${notifications.length}건</h2>
          ${tableHtml(notifications)}
        </div>

        <div class="card">
          <h2>Trial Sync Failure 참조 (market_trial_forum_sync_failure) — ${trialSync.length}건</h2>
          ${tableHtml(trialSync)}
        </div>

        <div class="card" style="border-color:#7a0000">
          <h2 style="color:#ff8888">⚠️ Hard Delete 실행</h2>
          <p style="margin-bottom:16px;color:#ffd700">
            삭제 대상: <strong>${esc(post.title)}</strong> (${esc(postId)})<br>
            연관 FK 행 합계: <strong>${totalFkRows}건</strong>
            (댓글 ${comments.length} + 좋아요 ${likes.length} + 알림 ${notifications.length} + trial ${trialSync.length})
          </p>
          <p style="color:#ff8888;margin-bottom:12px;font-size:13px">
            ⚠️ 이 작업은 되돌릴 수 없습니다. 삭제 전 대상 ID를 다시 확인하세요.
          </p>
          <form method="POST" action="/__debug__/forum-post-cleanup/delete">
            <input type="hidden" name="id" value="${esc(postId)}" />
            <input type="hidden" name="title_confirm" value="${esc(post.title)}" />
            <button type="submit" class="danger">Hard Delete 실행 (${esc(post.title.substring(0, 40))})</button>
          </form>
        </div>
      `;

      res.send(page(`Inspect: ${post.title}`, body));
    } catch (err: any) {
      res.send(page('Error', `<p class="err">오류: ${esc(err.message)}</p><pre>${esc(err.stack || '')}</pre>`));
    }
  });

  // ── POST /delete — hard delete ──────────────────
  router.post('/delete', async (req: Request, res: Response): Promise<void> => {
    res.setHeader('Content-Type', 'text/html; charset=utf-8');

    const postId = (req.body.id as string || '').trim();
    const titleConfirm = (req.body.title_confirm as string || '').trim();

    if (!postId) {
      res.send(page('Error', `<p class="err">id 필수</p>`));
      return;
    }

    const logs: string[] = [];
    const log = (msg: string, cls: 'ok' | 'warn' | 'err' | '' = '') =>
      logs.push(`<div class="log-line ${cls ? 'log-' + cls : ''}">${esc(msg)}</div>`);

    try {
      // 1. 게시글 확인
      const posts = await dataSource.query<any[]>(
        `SELECT id, title, status, author_id FROM forum_post WHERE id = $1`,
        [postId],
      );

      if (posts.length === 0) {
        res.send(page('Error', `<p class="err">게시글을 찾을 수 없음: ${esc(postId)}</p>`));
        return;
      }

      const post = posts[0];
      log(`[STEP 0] 대상 게시글 확인: id=${post.id} title="${post.title}" status=${post.status}`, 'ok');

      // 2. 댓글 삭제
      const commentDel = await dataSource.query<any[]>(
        `DELETE FROM forum_comment WHERE "postId" = $1 RETURNING id`,
        [postId],
      );
      log(`[STEP 1] forum_comment 삭제: ${commentDel.length}건 → ${commentDel.map((r: any) => r.id).join(', ') || '없음'}`, 'ok');

      // 3. 좋아요 삭제
      const likeDel = await dataSource.query<any[]>(
        `DELETE FROM forum_post_like WHERE post_id = $1 RETURNING id`,
        [postId],
      );
      log(`[STEP 2] forum_post_like 삭제: ${likeDel.length}건 → ${likeDel.map((r: any) => r.id).join(', ') || '없음'}`, 'ok');

      // 4. 알림 NULL 처리 (FK 없으면 skip, 있으면 null 처리)
      const notifDel = await dataSource.query<any[]>(
        `DELETE FROM forum_notifications WHERE "postId" = $1 RETURNING id`,
        [postId],
      ).catch(() => []);
      log(`[STEP 3] forum_notifications 삭제: ${notifDel.length}건`, 'ok');

      // 5. 게시글 본체 hard delete
      const postDel = await dataSource.query<any[]>(
        `DELETE FROM forum_post WHERE id = $1 RETURNING id, title`,
        [postId],
      );

      if (postDel.length === 0) {
        log(`[STEP 4] ERROR: forum_post 삭제 실패 — 이미 삭제됐거나 id 불일치`, 'err');
      } else {
        log(`[STEP 4] forum_post hard delete 완료: id=${postDel[0].id} title="${postDel[0].title}"`, 'ok');
      }

      // 6. Orphan 확인
      const orphanComments = await dataSource.query<any[]>(
        `SELECT COUNT(*)::int AS cnt FROM forum_comment WHERE "postId" = $1`, [postId]);
      const orphanLikes = await dataSource.query<any[]>(
        `SELECT COUNT(*)::int AS cnt FROM forum_post_like WHERE post_id = $1`, [postId]);
      log(`[STEP 5] Orphan 확인: forum_comment=${orphanComments[0].cnt}건, forum_post_like=${orphanLikes[0].cnt}건`,
        (orphanComments[0].cnt + orphanLikes[0].cnt) === 0 ? 'ok' : 'err');

      const success = postDel.length > 0;

      const body = `
        <h1>${success ? '✅ Hard Delete 완료' : '❌ Hard Delete 실패'}</h1>
        <div class="nav">
          <a href="/__debug__/forum-post-cleanup">← 검색으로 돌아가기</a>
        </div>

        <div class="card">
          <h2>실행 로그</h2>
          <div style="font-family:monospace;font-size:13px;line-height:1.8">
            ${logs.join('\n')}
          </div>
        </div>

        <div class="card" style="border-color:${success ? '#00ff88' : '#ff4444'}">
          <p class="${success ? 'ok' : 'err'}">
            ${success
              ? `✅ 삭제 완료: "${esc(titleConfirm)}" (${esc(postId)})`
              : `❌ 삭제 실패 — 로그 확인 필요`}
          </p>
        </div>
      `;

      res.send(page(success ? 'Delete Complete' : 'Delete Failed', body));
    } catch (err: any) {
      res.send(page('Error', `
        <p class="err">오류 발생: ${esc(err.message)}</p>
        <pre>${esc(err.stack || '')}</pre>
        <h2>실행 로그</h2>
        <div>${logs.join('\n')}</div>
        <a href="/__debug__/forum-post-cleanup">← 돌아가기</a>
      `));
    }
  });

  return router;
}
