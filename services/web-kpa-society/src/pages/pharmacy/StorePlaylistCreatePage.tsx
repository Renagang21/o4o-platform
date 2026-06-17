/**
 * StorePlaylistCreatePage — 내 매장 플레이리스트 등록 (매장 디지털 사이니지)
 *
 * WO-O4O-SIGNAGE-PLAYLIST-CREATE-STANDARD-ALL-SURFACES-V1
 *   - 공통 SignagePlaylistCreateShell 채택(store 모드: 제목/설명/태그).
 *   - 저장 endpoint(store-playlists)는 현행 유지 — 매장 목록 조회와 동일 테이블(데이터 정합성).
 *   - 항목(미디어)은 생성 후 목록/상세에서 HUB 복사로 추가한다.
 */

import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { SignagePlaylistCreateShell } from '@o4o/shared-space-ui';
import type { SignagePlaylistCreateValues } from '@o4o/shared-space-ui';
import { createStorePlaylist } from '../../api/storePlaylist';

const LIST_PATH = '/store/marketing/signage/playlist';

export function StorePlaylistCreatePage() {
  const navigate = useNavigate();

  const handleSubmit = useCallback(async (values: SignagePlaylistCreateValues) => {
    await createStorePlaylist({
      name: values.name,
      playlistType: 'LIST',
      description: values.description || undefined,
      tags: values.tags.length > 0 ? values.tags : undefined,
    });
    navigate(LIST_PATH);
  }, [navigate]);

  return (
    <div style={{ maxWidth: 720, margin: '0 auto', padding: '24px 16px 48px' }}>
      <div style={{ marginBottom: 24 }}>
        <button
          onClick={() => navigate(LIST_PATH)}
          style={{ background: 'none', border: 'none', fontSize: 14, color: '#2563eb', cursor: 'pointer', padding: 0, marginBottom: 8, display: 'block' }}
        >
          ← 내 플레이리스트로
        </button>
        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: '#1e293b' }}>새 플레이리스트</h1>
        <p style={{ margin: '6px 0 0', fontSize: 13, color: '#64748b' }}>
          플레이리스트를 만든 뒤 HUB 콘텐츠를 가져와 항목을 추가합니다.
        </p>
      </div>

      <SignagePlaylistCreateShell
        config={{
          surface: 'store',
          submitLabel: '생성',
          namePlaceholder: '플레이리스트 이름을 입력하세요',
          descriptionPlaceholder: '이 플레이리스트의 사용 목적이나 적용 위치를 간략히 기록하세요',
        }}
        onSubmit={handleSubmit}
        onCancel={() => navigate(LIST_PATH)}
      />
    </div>
  );
}

export default StorePlaylistCreatePage;
