/**
 * PlaylistEditorPage — 플레이리스트 생성/수정 (커뮤니티 디지털 사이니지)
 *
 * WO-KPA-SIGNAGE-VIDEO-PLAYLIST-STRUCTURE-REFORM-V2
 * WO-O4O-SIGNAGE-PLAYLIST-CREATE-STANDARD-ALL-SURFACES-V1
 *   - 공통 SignagePlaylistCreateShell 채택. 저장 endpoint(/api/v1/kpa/signage/playlists)는 현행 유지
 *     (목록 조회와 동일 family → 데이터 정합성 보존).
 *
 * - /signage/playlist/new → 생성 모드
 * - /signage/playlist/:id/edit → 수정 모드
 */

import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { publicContentApi } from '../../lib/api/signageV2';
import { getAccessToken, useAuth } from '../../contexts/AuthContext';
import { GuideBlock, SignagePlaylistCreateShell } from '@o4o/shared-space-ui';
import type { SignagePlaylistCreateValues } from '@o4o/shared-space-ui';
import { fetchGuidePageContent } from '../../api/guideContent';

const API_BASE = import.meta.env.VITE_API_BASE_URL || '';
const SERVICE_KEY = 'kpa-society';
const LIST_PATH = '/signage?tab=playlists';

interface InitialValues {
  name: string;
  description: string;
  tags: string[];
  items: Array<{ url: string; title: string; durationSeconds: number }>;
}

export default function PlaylistEditorPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const isEdit = !!id;

  const [loading, setLoading] = useState(isEdit);
  const [initial, setInitial] = useState<InitialValues | undefined>(undefined);

  // WO-O4O-GUIDE-BLOCK-1ST-WAVE-APPLY-V1: signage.playlist.manager guide
  const [guideTitle, setGuideTitle] = useState('플레이리스트를 구성합니다.');
  const [guideDesc, setGuideDesc] = useState('제목을 입력하고 영상 항목을 추가한 뒤 저장하세요.');
  const [guideSteps, setGuideSteps] = useState([
    '플레이리스트 제목을 입력합니다',
    '항목 추가 버튼으로 영상 URL과 재생 시간을 입력합니다',
    '항목 순서를 위/아래 버튼으로 조정할 수 있습니다',
    '저장하면 사이니지 화면에 플레이리스트가 반영됩니다',
  ]);
  useEffect(() => {
    let cancelled = false;
    fetchGuidePageContent(SERVICE_KEY, 'signage.playlist.manager').then((sections) => {
      if (cancelled) return;
      const raw = sections['guideblock-page-help'];
      if (!raw) return;
      try {
        const obj = JSON.parse(raw);
        if (obj?.title) setGuideTitle(obj.title);
        if (obj?.description) setGuideDesc(obj.description);
        if (Array.isArray(obj?.steps)) setGuideSteps(obj.steps);
      } catch { /* keep fallback */ }
    }).catch(() => {});
    return () => { cancelled = true; };
  }, []);

  // Auth fetch helper
  const apiFetch = useCallback(async (path: string, options?: RequestInit) => {
    const token = getAccessToken();
    const res = await fetch(`${API_BASE}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...options?.headers,
      },
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body?.error || body?.message || `API error ${res.status}`);
    }
    return res.json();
  }, []);

  // ── Redirect if not authenticated ──
  useEffect(() => {
    if (!user) navigate('/signage', { replace: true });
  }, [user, navigate]);

  // ── Load existing playlist (edit mode) ──
  useEffect(() => {
    if (!isEdit || !id) return;
    setLoading(true);
    publicContentApi.getPlaylist(id, SERVICE_KEY)
      .then((res: any) => {
        if (res.success && res.data) {
          const d = res.data;
          const items = (d.items || [])
            .sort((a: any, b: any) => (a.displayOrder ?? a.sortOrder ?? 0) - (b.displayOrder ?? b.sortOrder ?? 0))
            .map((item: any) => ({
              url: item.media?.sourceUrl || item.media?.url || '',
              title: item.media?.name || '',
              durationSeconds: item.displayDuration || item.duration || item.media?.duration || 0,
            }));
          setInitial({ name: d.name || '', description: d.description || '', tags: d.tags || [], items });
        }
      })
      .catch(() => setInitial({ name: '', description: '', tags: [], items: [] }))
      .finally(() => setLoading(false));
  }, [isEdit, id]);

  const handleSubmit = useCallback(async (values: SignagePlaylistCreateValues) => {
    const payload = {
      name: values.name,
      description: values.description || undefined,
      tags: values.tags.length > 0 ? values.tags : undefined,
      items: values.items.map((it) => ({
        sourceUrl: it.url,
        name: it.title || undefined,
        duration: it.durationSeconds || 0,
      })),
    };
    if (isEdit) {
      await apiFetch(`/api/v1/kpa/signage/playlists/${id}`, { method: 'PATCH', body: JSON.stringify(payload) });
    } else {
      await apiFetch(`/api/v1/kpa/signage/playlists`, { method: 'POST', body: JSON.stringify(payload) });
    }
    navigate(LIST_PATH);
  }, [apiFetch, id, isEdit, navigate]);

  if (loading) {
    return (
      <div style={styles.page}>
        <div style={styles.container}><p style={{ color: '#64748b' }}>불러오는 중...</p></div>
      </div>
    );
  }

  return (
    <div style={styles.page}>
      <div style={styles.container}>
        <div style={styles.header}>
          <button onClick={() => navigate(LIST_PATH)} style={styles.backBtn}>← 뒤로</button>
          <h1 style={styles.title}>{isEdit ? '플레이리스트 수정' : '플레이리스트 생성'}</h1>
        </div>

        <SignagePlaylistCreateShell
          config={{
            surface: 'community',
            requireTags: false,
            submitLabel: isEdit ? '수정 저장' : '저장',
          }}
          initialValues={initial}
          guideSlot={<GuideBlock variant="info" title={guideTitle} description={guideDesc} steps={guideSteps} />}
          onSubmit={handleSubmit}
          onCancel={() => navigate(LIST_PATH)}
        />
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: { minHeight: '100vh', backgroundColor: '#f8fafc' },
  container: { maxWidth: 800, margin: '0 auto', padding: '24px 16px 48px' },
  header: { marginBottom: 24 },
  backBtn: {
    background: 'none', border: 'none', fontSize: 14, color: '#2563eb',
    cursor: 'pointer', padding: 0, marginBottom: 8, display: 'block',
  },
  title: { margin: 0, fontSize: 22, fontWeight: 700, color: '#1e293b' },
};
