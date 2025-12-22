/**
 * Playlists Page
 *
 * Manage playlists (MediaLists) for pharmacy signage.
 * Features:
 * - Create/edit/delete playlists
 * - Add/remove/reorder content in playlists
 * - Set loop and duration settings
 */

import React, { useState } from 'react';
import { usePlaylists, usePlaylist, useContent } from '../hooks/usePharmacySignage.js';
import type { PharmacyPlaylistDto, PlaylistItemDto } from '../../backend/dto/index.js';

// ==================== Playlist Card ====================

interface PlaylistCardProps {
  playlist: PharmacyPlaylistDto;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
  onClone: (id: string) => void;
}

const PlaylistCard: React.FC<PlaylistCardProps> = ({ playlist, onSelect, onDelete, onClone }) => {
  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="bg-white rounded-lg shadow overflow-hidden hover:shadow-lg transition-shadow">
      <div className="p-4">
        <div className="flex justify-between items-start">
          <div>
            <h3 className="font-medium text-gray-900">{playlist.name}</h3>
            {playlist.description && (
              <p className="text-sm text-gray-500 mt-1">{playlist.description}</p>
            )}
          </div>
          <span
            className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
              playlist.isActive
                ? 'bg-green-100 text-green-800'
                : 'bg-gray-100 text-gray-800'
            }`}
          >
            {playlist.isActive ? '활성' : '비활성'}
          </span>
        </div>

        <div className="mt-4 flex items-center gap-4 text-sm text-gray-500">
          <span>{playlist.items.length}개 콘텐츠</span>
          <span>총 {formatDuration(playlist.totalDuration)}</span>
          {playlist.loop && (
            <span className="flex items-center gap-1">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              반복
            </span>
          )}
        </div>

        <div className="mt-4 flex gap-2">
          <button
            onClick={() => onSelect(playlist.id)}
            className="flex-1 py-2 px-4 bg-blue-500 text-white rounded-lg text-sm font-medium hover:bg-blue-600"
          >
            편집
          </button>
          <button
            onClick={() => onClone(playlist.id)}
            className="py-2 px-4 border border-blue-300 text-blue-600 rounded-lg text-sm font-medium hover:bg-blue-50"
            title="플레이리스트 복제"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
          </button>
          <button
            onClick={() => onDelete(playlist.id)}
            className="py-2 px-4 border border-red-300 text-red-600 rounded-lg text-sm font-medium hover:bg-red-50"
          >
            삭제
          </button>
        </div>
      </div>
    </div>
  );
};

// ==================== Create Playlist Modal ====================

interface CreatePlaylistModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (name: string, description?: string, loop?: boolean) => void;
}

const CreatePlaylistModal: React.FC<CreatePlaylistModalProps> = ({
  isOpen,
  onClose,
  onCreate,
}) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [loop, setLoop] = useState(true);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim()) {
      onCreate(name.trim(), description.trim() || undefined, loop);
      setName('');
      setDescription('');
      setLoop(true);
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
        <form onSubmit={handleSubmit}>
          <div className="p-6">
            <h2 className="text-lg font-semibold mb-4">새 플레이리스트 만들기</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  이름 *
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="플레이리스트 이름"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  설명
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="플레이리스트 설명 (선택)"
                  rows={2}
                />
              </div>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={loop}
                  onChange={(e) => setLoop(e.target.checked)}
                  className="w-4 h-4 text-blue-500 rounded focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">반복 재생</span>
              </label>
            </div>
          </div>

          <div className="px-6 py-4 bg-gray-50 flex justify-end gap-3 rounded-b-lg">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg"
            >
              취소
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-sm font-medium text-white bg-blue-500 hover:bg-blue-600 rounded-lg"
            >
              만들기
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ==================== Playlist Editor ====================

interface PlaylistEditorProps {
  playlistId: string;
  onBack: () => void;
}

const PlaylistEditor: React.FC<PlaylistEditorProps> = ({ playlistId, onBack }) => {
  const { playlist, loading, error, addItem, removeItem, reorderItems } = usePlaylist(playlistId);
  const { content: availableContent } = useContent({ selectedOnly: true });
  const [showAddContent, setShowAddContent] = useState(false);

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-6"></div>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-20 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error || !playlist) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-600">{error || '플레이리스트를 찾을 수 없습니다.'}</p>
          <button onClick={onBack} className="mt-2 text-sm text-red-600 underline">
            목록으로 돌아가기
          </button>
        </div>
      </div>
    );
  }

  const handleRemoveItem = async (itemId: string) => {
    if (window.confirm('이 콘텐츠를 플레이리스트에서 제거하시겠습니까?')) {
      await removeItem(itemId);
    }
  };

  const handleMoveItem = async (itemId: string, direction: 'up' | 'down') => {
    const currentIndex = playlist.items.findIndex((item) => item.id === itemId);
    if (currentIndex === -1) return;

    const newIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    if (newIndex < 0 || newIndex >= playlist.items.length) return;

    const newItems = playlist.items.map((item, index) => {
      if (index === currentIndex) return { id: item.id, position: newIndex };
      if (index === newIndex) return { id: item.id, position: currentIndex };
      return { id: item.id, position: index };
    });

    await reorderItems(newItems);
  };

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <button
          onClick={onBack}
          className="p-2 hover:bg-gray-100 rounded-lg"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div>
          <h1 className="text-2xl font-bold">{playlist.name}</h1>
          {playlist.description && (
            <p className="text-gray-500">{playlist.description}</p>
          )}
        </div>
      </div>

      {/* Playlist Items */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b flex justify-between items-center">
          <h2 className="text-lg font-semibold">
            콘텐츠 ({playlist.items.length}개)
          </h2>
          <button
            onClick={() => setShowAddContent(true)}
            className="px-4 py-2 bg-blue-500 text-white text-sm font-medium rounded-lg hover:bg-blue-600"
          >
            콘텐츠 추가
          </button>
        </div>

        {playlist.items.length > 0 ? (
          <div className="divide-y">
            {playlist.items
              .sort((a, b) => a.position - b.position)
              .map((item, index) => (
                <div key={item.id} className="px-6 py-4 flex items-center gap-4">
                  {/* Position Number */}
                  <span className="w-8 h-8 flex items-center justify-center bg-gray-100 rounded-full text-sm font-medium text-gray-600">
                    {index + 1}
                  </span>

                  {/* Content Info */}
                  <div className="flex-1">
                    <p className="font-medium">{item.contentName}</p>
                    <p className="text-sm text-gray-500">
                      {item.durationSeconds}초 | {item.transitionEffect}
                    </p>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleMoveItem(item.id, 'up')}
                      disabled={index === 0}
                      className="p-2 hover:bg-gray-100 rounded disabled:opacity-50"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                      </svg>
                    </button>
                    <button
                      onClick={() => handleMoveItem(item.id, 'down')}
                      disabled={index === playlist.items.length - 1}
                      className="p-2 hover:bg-gray-100 rounded disabled:opacity-50"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                    <button
                      onClick={() => handleRemoveItem(item.id)}
                      className="p-2 hover:bg-red-100 text-red-600 rounded"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>
              ))}
          </div>
        ) : (
          <div className="px-6 py-12 text-center text-gray-500">
            <p>플레이리스트가 비어있습니다.</p>
            <p className="text-sm mt-1">콘텐츠를 추가해주세요.</p>
          </div>
        )}
      </div>

      {/* Add Content Modal */}
      {showAddContent && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl mx-4 max-h-[80vh] flex flex-col">
            <div className="px-6 py-4 border-b flex justify-between items-center">
              <h2 className="text-lg font-semibold">콘텐츠 추가</h2>
              <button
                onClick={() => setShowAddContent(false)}
                className="p-2 hover:bg-gray-100 rounded"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-6">
              {availableContent.length > 0 ? (
                <div className="space-y-2">
                  {availableContent.map((content) => (
                    <button
                      key={content.id}
                      onClick={async () => {
                        await addItem(content.id);
                        setShowAddContent(false);
                      }}
                      className="w-full p-4 border rounded-lg hover:bg-gray-50 flex items-center gap-4 text-left"
                    >
                      <div className="flex-1">
                        <p className="font-medium">{content.name}</p>
                        <p className="text-sm text-gray-500">
                          {content.durationSeconds}초
                        </p>
                      </div>
                      <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                    </button>
                  ))}
                </div>
              ) : (
                <p className="text-center text-gray-500 py-8">
                  선택된 콘텐츠가 없습니다. 먼저 콘텐츠 라이브러리에서 콘텐츠를 선택해주세요.
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ==================== Main Playlists Component ====================

export const Playlists: React.FC = () => {
  const { playlists, loading, error, refresh, createPlaylist, deletePlaylist, clonePlaylist } = usePlaylists();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingPlaylistId, setEditingPlaylistId] = useState<string | null>(null);

  const handleCreate = async (name: string, description?: string, loop?: boolean) => {
    await createPlaylist(name, description, loop);
  };

  const handleDelete = async (playlistId: string) => {
    if (window.confirm('이 플레이리스트를 삭제하시겠습니까?')) {
      await deletePlaylist(playlistId);
    }
  };

  const handleClone = async (playlistId: string) => {
    const playlist = playlists.find((p) => p.id === playlistId);
    const newName = window.prompt(
      '복제할 플레이리스트의 이름을 입력하세요:',
      playlist ? `${playlist.name} (복사본)` : '복사본'
    );
    if (newName) {
      await clonePlaylist(playlistId, newName);
    }
  };

  if (editingPlaylistId) {
    return (
      <PlaylistEditor
        playlistId={editingPlaylistId}
        onBack={() => {
          setEditingPlaylistId(null);
          refresh();
        }}
      />
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-600">{error}</p>
          <button onClick={refresh} className="mt-2 text-sm text-red-600 underline">
            다시 시도
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">플레이리스트</h1>
        <button
          onClick={() => setShowCreateModal(true)}
          className="px-4 py-2 bg-blue-500 text-white rounded-lg text-sm font-medium hover:bg-blue-600"
        >
          새 플레이리스트
        </button>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="animate-pulse bg-white rounded-lg shadow p-4">
              <div className="h-6 bg-gray-200 rounded w-3/4 mb-2"></div>
              <div className="h-4 bg-gray-200 rounded w-1/2 mb-4"></div>
              <div className="h-10 bg-gray-200 rounded"></div>
            </div>
          ))}
        </div>
      ) : playlists.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {playlists.map((playlist) => (
            <PlaylistCard
              key={playlist.id}
              playlist={playlist}
              onSelect={setEditingPlaylistId}
              onDelete={handleDelete}
              onClone={handleClone}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <svg
            className="mx-auto h-12 w-12 text-gray-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
            />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-gray-900">플레이리스트 없음</h3>
          <p className="mt-1 text-sm text-gray-500">
            새 플레이리스트를 만들어 콘텐츠를 구성해보세요.
          </p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="mt-4 px-4 py-2 bg-blue-500 text-white rounded-lg text-sm font-medium hover:bg-blue-600"
          >
            첫 플레이리스트 만들기
          </button>
        </div>
      )}

      <CreatePlaylistModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onCreate={handleCreate}
      />
    </div>
  );
};

export default Playlists;
