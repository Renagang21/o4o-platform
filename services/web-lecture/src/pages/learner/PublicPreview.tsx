import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../../lib/apiClient';

type Preview = { id: string; title: string; duration: number; videoUrl?: string };
export function PublicPreviewList({ courseId }: { courseId: string }) {
  const [items, setItems] = useState<Preview[]>([]);
  const [error, setError] = useState(false);
  const [attempt, retry] = useState(0);
  useEffect(() => {
    let active = true; setItems([]); setError(false);
    api.get(`/lms/courses/${encodeURIComponent(courseId)}/previews`).then((r: { data: { data: { items: Preview[] } } }) => {
      if (active) setItems(r.data.data.items);
    }).catch(() => { if (active) setError(true); });
    return () => { active = false; };
  }, [courseId, attempt]);
  if (error) return <section aria-label="미리보기"><p role="alert">미리보기를 불러오지 못했습니다.</p><button type="button" onClick={() => retry(n => n + 1)}>미리보기 다시 조회</button></section>;
  if (!items.length) return null;
  return <section aria-label="미리보기"><h2>무료 미리보기</h2><p>로그인 없이 영상을 볼 수 있습니다. 학습 진도와 수료에는 반영되지 않습니다.</p><ul>{items.map(item => <li key={item.id}><Link to={`/courses/${encodeURIComponent(courseId)}/preview/${encodeURIComponent(item.id)}`}>{item.title} 미리보기</Link></li>)}</ul></section>;
}
export default function PublicPreviewPage() {
  const { courseId = '', lessonId = '' } = useParams();
  const [preview, setPreview] = useState<Preview | null>(null);
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading');
  const [attempt, retry] = useState(0);
  const [videoError, setVideoError] = useState(false);
  useEffect(() => {
    let active = true; setState('loading'); setPreview(null); setVideoError(false);
    api.get(`/lms/courses/${encodeURIComponent(courseId)}/previews/${encodeURIComponent(lessonId)}`).then((r: { data: { data: { preview: Preview } } }) => {
      if (active) { setPreview(r.data.data.preview); setState('ready'); }
    }).catch(() => { if (active) setState('error'); });
    return () => { active = false; };
  }, [courseId, lessonId, attempt]);
  return <main className="page page-wide"><Link to={`/courses/${encodeURIComponent(courseId)}`}>강의 소개로</Link><h1>강의 미리보기</h1>
    <p>공개된 미리보기 영상입니다. 시청 기록·수강 진도·수료는 저장하지 않습니다.</p>
    {state === 'loading' && <p role="status">불러오는 중...</p>}
    {state === 'error' && <div role="alert"><p>미리보기를 볼 수 없습니다. 공개 설정이 변경됐거나 일시적인 오류일 수 있습니다.</p><button type="button" onClick={() => retry(n => n + 1)}>다시 조회</button></div>}
    {state === 'ready' && preview && <section><h2>{preview.title}</h2><video key={attempt} controls preload="metadata" src={preview.videoUrl} onError={() => setVideoError(true)} style={{ width: '100%', maxWidth: 960 }} />
      {videoError && <div role="alert">영상 재생에 실패했습니다. <button type="button" onClick={() => retry(n => n + 1)}>영상 다시 불러오기</button></div>}</section>}
  </main>;
}
