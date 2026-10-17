import type { DataSource } from 'typeorm';
import { OperationError, operationReason, recordOperation } from '../../../services/operations/operation-audit.js';

/** An archived lecture and all owned relational learning data are removed atomically. */
export async function hardDeleteLectureCourse(db: DataSource, id: string, actorId: string, inputReason: unknown) {
  const reason = operationReason(inputReason);
  return db.transaction(async manager => {
    const [course] = await manager.query(`SELECT id,title,status FROM lms_courses WHERE id=$1 AND service_key='lecture' FOR UPDATE`, [id]);
    if (!course) throw new OperationError(404, 'COURSE_NOT_FOUND', '강의를 찾을 수 없습니다.');
    if (course.status !== 'archived') throw new OperationError(409, 'ARCHIVE_REQUIRED', '종료(보관) 상태의 강의만 완전 삭제할 수 있습니다.');
    await manager.query(`DELETE FROM lms_progress WHERE "enrollmentId" IN (SELECT id FROM lms_enrollments WHERE "courseId"=$1)`, [id]);
    await manager.query(`DELETE FROM lms_progress WHERE "lessonId" IN (SELECT id FROM lms_lessons WHERE "courseId"=$1)`, [id]);
    await manager.query(`DELETE FROM lms_quiz_attempts WHERE "quizId" IN (SELECT id FROM lms_quizzes WHERE "courseId"=$1)`, [id]);
    for (const table of ['lms_quizzes', 'lms_certificates', 'lms_enrollments', 'lms_events', 'lms_lessons']) {
      // Fixed identifiers only. Lesson deletion also cascades to assignments/submissions.
      await manager.query(`DELETE FROM ${table} WHERE "courseId"=$1`, [id]);
    }
    await manager.query('DELETE FROM lms_courses WHERE id=$1', [id]);
    await recordOperation(manager, 'lecture', actorId, 'lecture.course.hard_delete', { courseId: id, reason });
    return { deleted: true, id, title: course.title };
  });
}
