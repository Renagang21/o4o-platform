-- Read-only: no identities or raw business records in the result.
\set ON_ERROR_STOP on
BEGIN READ ONLY;
SELECT count(*) AS missing_link_count
FROM lms_enrollments e
JOIN lms_courses c ON c.id=e."courseId" AND c.service_key='lecture'
JOIN lms_certificates cert ON cert."userId"=e."userId" AND cert."courseId"=e."courseId"
WHERE e.status='completed' AND e."certificateId" IS NULL;
COMMIT;
