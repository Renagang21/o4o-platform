/** PG timestamp precision and Asia/Seoul calendar anniversary; Feb 29 -> March 1 when needed.
 * Trusted SQL fragment uses source_at (timestamptz) and years (integer), never request identifiers.
 */
export const CALENDAR_EXPIRY_SQL = `(
  (source_at AT TIME ZONE 'Asia/Seoul') + make_interval(years => years)
  + CASE WHEN EXTRACT(MONTH FROM source_at AT TIME ZONE 'Asia/Seoul')=2
    AND EXTRACT(DAY FROM source_at AT TIME ZONE 'Asia/Seoul')=29
    AND EXTRACT(DAY FROM (source_at AT TIME ZONE 'Asia/Seoul') + make_interval(years => years))=28
    THEN interval '1 day' ELSE interval '0 day' END
) AT TIME ZONE 'Asia/Seoul'`;
