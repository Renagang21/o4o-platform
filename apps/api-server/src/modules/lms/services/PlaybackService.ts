import { AppDataSource } from '../../../database/connection.js';

/** Resume position is a bookmark, never evidence for completion or attendance. */
export function validPlaybackPosition(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 604800;
}

export async function readPlayback(enrollmentId: string, courseId: string, lessonId?: string) {
  const query = AppDataSource.getRepository('Progress').createQueryBuilder('progress')
    .innerJoin('progress.lesson', 'lesson')
    .where('progress.enrollmentId = :enrollmentId', { enrollmentId })
    .andWhere('lesson.courseId = :courseId', { courseId })
    .andWhere('lesson.isPublished = true')
    .andWhere("progress.metadata ? 'playback'")
    .orderBy("progress.metadata->'playback'->>'updatedAt'", 'DESC');
  if (lessonId) query.andWhere('progress.lessonId = :lessonId', { lessonId });
  const progress = await query.getOne();
  const bookmark = progress?.metadata?.playback;
  return progress && validPlaybackPosition(bookmark?.positionSeconds)
    ? { lessonId: progress.lessonId, positionSeconds: bookmark.positionSeconds, updatedAt: bookmark.updatedAt }
    : null;
}

export async function savePlayback(enrollmentId: string, lessonId: string, positionSeconds: number) {
  const playback = { positionSeconds, updatedAt: new Date().toISOString() };
  // Only the bookmark JSON key is updated on conflict. Completion, quiz results,
  // elapsed attendance time and concurrent metadata keys remain untouched.
  await AppDataSource.query(`
    INSERT INTO lms_progress ("enrollmentId", "lessonId", metadata)
    VALUES ($1, $2, $3::jsonb)
    ON CONFLICT ("enrollmentId", "lessonId") DO UPDATE
    SET metadata = COALESCE(lms_progress.metadata, '{}'::jsonb) || EXCLUDED.metadata
  `, [enrollmentId, lessonId, JSON.stringify({ playback })]);
  return { lessonId, ...playback };
}
