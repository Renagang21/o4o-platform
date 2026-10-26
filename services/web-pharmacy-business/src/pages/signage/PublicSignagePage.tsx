/**
 * PublicSignagePage — 사이니지 플레이리스트 공개 렌더링
 *
 * WO-O4O-SIGNAGE-STRUCTURE-CONSOLIDATION-V1
 *
 * URL: /public/signage?playlist=:id
 *
 * 인증 불필요. Store Playlist의 published 항목을 순서대로 렌더링.
 * 디바이스/키오스크/공개 URL 용도.
 *
 * 데이터 소스: GET /api/v1/kpa/store-playlists/public/:id
 */

import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Loader2, AlertCircle, ListVideo, Play } from 'lucide-react';
import { apiClient } from '../../api/client';

interface PlaylistRenderItem {
  id: string;
  snapshotId: string;
  displayOrder: number;
  isForced: boolean;
  title: string;
  contentJson: Record<string, unknown>;
}

interface PlaylistRenderData {
  id: string;
  name: string;
  playlistType: 'SINGLE' | 'LIST';
  organizationId: string;
  items: PlaylistRenderItem[];
}

function getVideoUrl(contentJson: Record<string, unknown>): string | null {
  if (typeof contentJson.videoUrl === 'string') return contentJson.videoUrl;
  if (typeof contentJson.url === 'string') return contentJson.url;
  if (typeof contentJson.mediaUrl === 'string') return contentJson.mediaUrl;
  return null;
}

export default function PublicSignagePage() {
  const [searchParams] = useSearchParams();
  const playlistId = searchParams.get('playlist');

  const [data, setData] = useState<PlaylistRenderData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    if (!playlistId) {
      setError('playlist 파라미터가 필요합니다.');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    apiClient
      .get<{ success: boolean; data: PlaylistRenderData }>(`/store-playlists/public/${playlistId}`)
      .then((res) => {
        setData(res.data);
      })
      .catch((e: any) => {
        if (e?.response?.status === 404) {
          setError('플레이리스트를 찾을 수 없습니다.');
        } else {
          setError('데이터를 불러오지 못했습니다.');
        }
      })
      .finally(() => setLoading(false));
  }, [playlistId]);

  const items = data?.items || [];
  const currentItem = items[currentIndex];

  const handleNext = () => {
    if (items.length <= 1) return;
    setCurrentIndex((prev) => (prev + 1) % items.length);
  };

  const handlePrev = () => {
    if (items.length <= 1) return;
    setCurrentIndex((prev) => (prev - 1 + items.length) % items.length);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-black text-white">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-black text-white gap-4">
        <AlertCircle className="w-10 h-10 text-red-400" />
        <p className="text-lg">{error}</p>
      </div>
    );
  }

  if (!data || items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-black text-white gap-4">
        <ListVideo className="w-10 h-10 text-slate-500" />
        <p className="text-lg">재생할 항목이 없습니다.</p>
      </div>
    );
  }

  const videoUrl = currentItem ? getVideoUrl(currentItem.contentJson) : null;

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Top bar */}
      <div className="flex items-center justify-between px-6 py-3 bg-slate-900/80">
        <div className="flex items-center gap-2">
          <ListVideo className="w-5 h-5 text-blue-400" />
          <span className="text-sm font-medium">{data.name}</span>
          <span className="text-xs text-slate-400">
            ({data.playlistType === 'SINGLE' ? '단일' : '목록'})
          </span>
        </div>
        {items.length > 1 && (
          <span className="text-xs text-slate-400">
            {currentIndex + 1} / {items.length}
          </span>
        )}
      </div>

      {/* Player area */}
      <div className="flex items-center justify-center" style={{ height: 'calc(100vh - 100px)' }}>
        {videoUrl ? (
          <video
            key={currentItem.id}
            src={videoUrl}
            className="max-w-full max-h-full"
            controls
            autoPlay
            onEnded={items.length > 1 ? handleNext : undefined}
          />
        ) : (
          <div className="text-center text-slate-400">
            <Play className="w-16 h-16 mx-auto mb-4 text-slate-600" />
            <p className="text-lg font-medium">{currentItem.title}</p>
            <p className="text-sm mt-2">비디오 URL을 사용할 수 없습니다.</p>
          </div>
        )}
      </div>

      {/* Bottom nav (LIST mode only) */}
      {data.playlistType === 'LIST' && items.length > 1 && (
        <div className="flex items-center justify-center gap-4 py-3 bg-slate-900/80">
          <button
            onClick={handlePrev}
            className="px-4 py-1.5 text-sm text-slate-300 border border-slate-600 rounded-md hover:bg-slate-700"
          >
            이전
          </button>
          <div className="flex gap-1.5">
            {items.map((item, idx) => (
              <button
                key={item.id}
                onClick={() => setCurrentIndex(idx)}
                className={`w-2.5 h-2.5 rounded-full transition-colors ${
                  idx === currentIndex ? 'bg-blue-500' : 'bg-slate-600 hover:bg-slate-500'
                }`}
                title={item.title}
              />
            ))}
          </div>
          <button
            onClick={handleNext}
            className="px-4 py-1.5 text-sm text-slate-300 border border-slate-600 rounded-md hover:bg-slate-700"
          >
            다음
          </button>
        </div>
      )}
    </div>
  );
}
