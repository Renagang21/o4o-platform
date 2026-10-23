import type { LmsLessonData } from './contracts';

export function safeResourceUrl(value: string): boolean {
  try { return new URL(value).protocol === 'https:'; } catch { return false; }
}

export function LessonResources({ attachments }: { attachments: NonNullable<LmsLessonData['attachments']> }) {
  if (!attachments.length) return null;
  return <section aria-label="학습 자료"><h2>학습 자료</h2><ul>{attachments.map((file, i) => <li key={`${file.url}:${i}`}>
    {safeResourceUrl(file.url) ? <a href={file.url} target="_blank" rel="noopener noreferrer">{file.name} (새 창)</a> : <span>{file.name} · 사용할 수 없는 자료 주소</span>}
  </li>)}</ul><p>자료는 수강 학습용입니다. 외부 자료 제공자의 접근 권한이 필요할 수 있습니다.</p></section>;
}
