/**
 * VIDEO Job 완성본 임시 저장(Temporary Output) 설정 — 단일 관리 지점.
 * WO-O4O-AUTOMATION-VIDEO-JOB-TEMP-OUTPUT-DOWNLOAD-AND-AUTO-CLEANUP-V1
 *
 * 완성 동영상은 Media Library(공개 bucket `o4o-media-library`, allUsers objectViewer)에 넣지 않는다.
 * 비공개 전용 bucket 의 `video-jobs/` prefix 에만 두고, TTL 이 지나면 앱 expiry job 이 object 를 지운다.
 * bucket 의 lifecycle rule(age 기준 Delete) 은 앱이 못 지운 경우의 백스톱이다 — 두 값을 바꿀 때는 함께 본다.
 *
 * TTL 은 여기서만 읽는다. 다른 파일에 시간 상수를 두지 않는다.
 */
const positiveInt = (raw: string | undefined, fallback: number): number => {
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : fallback;
};

export const VIDEO_TEMP_OUTPUT_CONFIG = {
  /** 기존 관례(`GCS_MEDIA_LIBRARY_BUCKET || 'o4o-media-library'`)와 같은 형태 — Cloud Run env 없이도 동작. */
  bucket: process.env.GCS_VIDEO_TEMP_OUTPUT_BUCKET || 'o4o-video-temp-output',
  /** bucket 안에서 VIDEO Job 완성본만 이 prefix 아래. lifecycle rule 의 matchesPrefix 와 일치해야 한다. */
  objectPrefix: 'video-jobs/',
  /** 다운로드 가능 시간. 기본 48h. */
  ttlHours: positiveInt(process.env.VIDEO_TEMP_OUTPUT_TTL_HOURS, 48),
  /** expiry job 실행 간격(분). 기본 60분 — TTL 정밀도는 시간 단위면 충분. */
  expiryIntervalMinutes: positiveInt(process.env.VIDEO_TEMP_OUTPUT_EXPIRY_INTERVAL_MINUTES, 60),
  /** kill-switch. 명시적으로 'false' 일 때만 비활성. */
  expiryEnabled: (process.env.VIDEO_TEMP_OUTPUT_EXPIRY_ENABLED ?? 'true').toLowerCase() !== 'false',
  /** 허용 MIME — upload middleware 의 video 목록과 같은 집합. 영상이 아닌 파일은 임시 output 이 될 수 없다. */
  allowedMimeTypes: ['video/mp4', 'video/mpeg', 'video/quicktime', 'video/webm', 'video/x-msvideo'] as const,
} as const;

export const videoTempOutputExpiresAt = (from: Date): Date =>
  new Date(from.getTime() + VIDEO_TEMP_OUTPUT_CONFIG.ttlHours * 60 * 60 * 1000);
