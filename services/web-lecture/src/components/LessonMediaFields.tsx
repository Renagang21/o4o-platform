import type { LmsCaptionTrack } from '@o4o/lms-ui';
import type { LessonInput } from '../api/lecture';
export function supportedVideoUrl(value: string): boolean {
  try { const url = new URL(value); return url.protocol === 'https:' && /\.(mp4|webm|og[gv])$/i.test(url.pathname); } catch { return false; }
}
export function LessonMediaFields({ value, onChange }: { value: LessonInput; onChange: (value: LessonInput) => void }) {
  const files = value.attachments ?? [];
  const captions = value.metadata?.captions ?? [];
  const setCaptions = (next: LmsCaptionTrack[]) => onChange({ ...value, metadata: { ...value.metadata, captions: next } });
  return <>
    {value.type === 'video' && <label className="field"><span>영상 URL (HTTPS MP4 · WebM · Ogg)</span><input type="url" value={value.videoUrl ?? ''} onChange={e => onChange({ ...value, videoUrl: e.target.value })} />
      <small>YouTube·Vimeo 페이지 주소와 iframe은 지원하지 않습니다. 직접 재생 가능한 파일 주소와 접근 권한을 확인하세요. 공개 목차에는 영상 주소가 노출되지 않습니다.</small></label>}
    {value.type === 'video' && <fieldset className="panel sub"><legend>자막</legend>
      <p className="muted">HTTPS WebVTT(.vtt) 파일을 연결합니다. 자막 버튼에서 언어를 선택할 수 있습니다. 외부 파일의 CORS와 접근 권한을 확인하세요.</p>
      {captions.map((track, index) => <div key={index} className="field-row">
        {(['label', 'srcLang', 'src'] as const).map(key => <label key={key} className="field"><span>{key === 'label' ? '자막 이름' : key === 'srcLang' ? '언어 코드' : '자막 URL'} {index + 1}</span><input type={key === 'src' ? 'url' : 'text'} value={track[key]} onChange={e => setCaptions(captions.map((t, i) => i === index ? { ...t, [key]: e.target.value } : t))} /></label>)}
        <button type="button" className="btn" onClick={() => setCaptions(captions.filter((_, i) => i !== index))}>자막 {index + 1} 삭제</button>
      </div>)}
      <button type="button" className="btn" disabled={captions.length >= 8} onClick={() => setCaptions([...captions, { src: '', srcLang: 'ko', label: '한국어' }])}>자막 추가</button>
    </fieldset>}
    <fieldset className="panel sub"><legend>학습 자료</legend><p className="muted">기존 자료의 HTTPS 주소를 연결합니다. 파일 업로드 기능은 제공하지 않습니다. 본문과 같은 수강 권한으로 자료 링크가 제공됩니다.</p>
      {files.map((file, index) => <div key={index} className="field-row">
        <label className="field"><span>자료 이름 {index + 1}</span><input value={file.name} onChange={e => onChange({ ...value, attachments: files.map((f, i) => i === index ? { ...f, name: e.target.value } : f) })} /></label>
        <label className="field grow"><span>자료 URL {index + 1}</span><input type="url" value={file.url} onChange={e => onChange({ ...value, attachments: files.map((f, i) => i === index ? { ...f, url: e.target.value } : f) })} /></label>
        <button type="button" className="btn" onClick={() => onChange({ ...value, attachments: files.filter((_, i) => i !== index) })}>자료 {index + 1} 삭제</button>
      </div>)}
      <button type="button" className="btn" disabled={files.length >= 20} onClick={() => onChange({ ...value, attachments: [...files, { name: '', url: '', type: 'document', size: 0 }] })}>자료 추가</button>
    </fieldset>
  </>;
}
