import { createHash } from 'node:crypto';
import type { DataSource, EntityManager } from 'typeorm';
import { OperationError, operationReason, recordOperation } from '../../../services/operations/operation-audit.js';

export async function lectureDeletionPlan(db:Pick<EntityManager,'query'>,id:string){
 const [course]=await db.query(`SELECT id,title,status,"updatedAt" FROM lms_courses WHERE id=$1 AND service_key='lecture'`,[id]);
 if(!course)throw new OperationError(404,'COURSE_NOT_FOUND','강의를 찾을 수 없습니다.');
 const counts:Record<string,number>={};
 for(const table of ['lms_lessons','lms_quizzes','lms_enrollments','lms_certificates','lms_events']){
  const [row]=await db.query(`SELECT count(*)::int AS n FROM ${table} WHERE "courseId"=$1`,[id]);counts[table]=row.n;
 }
 const blockers:string[]=course.status==='archived'?[]:['강의를 먼저 종료(보관)해 주세요.'];
 const [files]=await db.query(`SELECT EXISTS(SELECT 1 FROM lms_lessons WHERE "courseId"=$1 AND to_jsonb(lms_lessons)::text ~ '(storage[.]googleapis[.]com|gcs://|gs://)') AS present`,[id]);
 if(files.present)blockers.push('연결된 자체 저장소 파일의 소유·보존 검토가 필요합니다.');
 return {id,counts,blockers,digest:createHash('sha256').update(JSON.stringify({course,counts,blockers})).digest('hex')};
}

/** An archived lecture and all owned relational learning data are removed atomically. */
export async function hardDeleteLectureCourse(db: DataSource, id: string, actorId: string, inputReason: unknown, expectedDigest?:unknown) {
  const reason = operationReason(inputReason);
  return db.transaction(async manager => {
    const [course] = await manager.query(`SELECT id,title,status FROM lms_courses WHERE id=$1 AND service_key='lecture' FOR UPDATE`, [id]);
    if (!course) throw new OperationError(404, 'COURSE_NOT_FOUND', '강의를 찾을 수 없습니다.');
    if (course.status !== 'archived') throw new OperationError(409, 'ARCHIVE_REQUIRED', '종료(보관) 상태의 강의만 완전 삭제할 수 있습니다.');
    {
      const roles=await manager.query(`SELECT u.id FROM users u JOIN role_assignments r ON r.user_id=u.id WHERE u.id=$1 AND u."isActive"=true
        AND r.is_active=true AND r.valid_from<=statement_timestamp() AND (r.valid_until IS NULL OR r.valid_until>=statement_timestamp())
        AND (r.role='platform:super_admin' OR (r.role='lecture:admin' AND EXISTS(SELECT 1 FROM service_memberships sm WHERE sm.user_id=u.id AND sm.service_key='lecture' AND sm.status='active'))) FOR SHARE OF u,r`,[actorId]);
      if(!roles.length)throw new OperationError(403,'COURSE_ADMIN_REQUIRED','현재 강의 관리자 권한이 필요합니다.');
      const plan=await lectureDeletionPlan(manager,id);
      if(expectedDigest!==undefined && plan.digest!==expectedDigest)throw new OperationError(409,'DELETION_PLAN_CHANGED','자료가 변경되었습니다. 삭제 범위를 다시 확인해 주시기 바랍니다.');
      if(plan.blockers.length)throw new OperationError(409,'DELETION_BLOCKED',plan.blockers.join(' '));
    }
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
