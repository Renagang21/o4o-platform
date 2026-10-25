import type { DataSource } from 'typeorm';

/** Explicit anonymous video projection. Never returns lesson content, metadata or attachments. */
export async function listPublicPreviews(db: Pick<DataSource, 'query'>, courseId: string) {
  const rows = await db.query(`SELECT l.id, l.title, l.duration, l."videoUrl" FROM lms_lessons l
    JOIN lms_courses c ON c.id=l."courseId"
    WHERE c.id=$1 AND c.service_key='lecture' AND c.status='published' AND c.visibility='public'
      AND l."isPublished"=true AND l."isFree"=true AND l.type='video'
    ORDER BY l."order", l.id LIMIT 1000`, [courseId]);
  return rows.filter((row: { videoUrl: unknown }) => safePreviewVideo(row.videoUrl))
    .map(({ id, title, duration }: { id: string; title: string; duration: number }) => ({ id, title, duration }));
}
export async function getPublicPreview(db: Pick<DataSource, 'query'>, courseId: string, lessonId: string) {
  const [row] = await db.query(`SELECT l.id, l.title, l.duration, l."videoUrl" FROM lms_lessons l
    JOIN lms_courses c ON c.id=l."courseId"
    WHERE c.id=$1 AND l.id=$2 AND c.service_key='lecture' AND c.status='published' AND c.visibility='public'
      AND l."isPublished"=true AND l."isFree"=true AND l.type='video'`, [courseId, lessonId]);
  if (!row || !safePreviewVideo(row.videoUrl)) return null;
  return { id: row.id, title: row.title, duration: row.duration, videoUrl: row.videoUrl };
}
function safePreviewVideo(value: unknown) {
  if (typeof value !== 'string') return false;
  try { const url = new URL(value); return url.protocol === 'https:' && !url.username && !url.password && /\.(mp4|webm|og[gv])$/i.test(url.pathname); }
  catch { return false; }
}
