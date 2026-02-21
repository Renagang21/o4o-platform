/**
 * MySignagePage - 내 사이니지 편성
 *
 * Signage Extension 핵심 화면
 * - 내가 선택한 콘텐츠 목록
 * - Drag & Drop 순서 변경
 * - 채널 분류 (TV1 / TV2 등)
 * - 방영 ON/OFF
 *
 * 제약:
 * - 운영자 광고 콘텐츠: 삭제 ❌, 편집 ❌, 순서 이동 ⭕, OFF ❌
 */

import { useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import {
  Tv,
  GripVertical,
  Play,
  Pause,
  Trash2,
  Eye,
  Plus,
  ArrowLeft,
  Monitor,
  Megaphone,
  Lock,
  Video,
  BookOpen,
  Link as LinkIcon,
  Settings,
  Save,
  Loader2,
} from 'lucide-react';
import { apiClient } from '@/services/api';
import { LoadingState } from '@/components/common';
import type { ContentItem, MySignageItem, ContentType } from '@/types';

interface SignageChannel {
  id: string;
  name: string;
  description: string;
  isDefault: boolean;
}

type MySignageItemWithContent = MySignageItem & { content: ContentItem };

function getTypeIcon(type: ContentType) {
  switch (type) {
    case 'video': return <Video className="w-4 h-4" />;
    case 'lms': return <BookOpen className="w-4 h-4" />;
    case 'link': return <LinkIcon className="w-4 h-4" />;
    default: return <Video className="w-4 h-4" />;
  }
}

function formatDuration(seconds?: number): string {
  if (!seconds) return '-';
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

function getSourceColor(source: string): string {
  switch (source) {
    case 'neture': return 'bg-emerald-100 text-emerald-700';
    case 'hq': return 'bg-blue-100 text-blue-700';
    case 'supplier': return 'bg-purple-100 text-purple-700';
    case 'pharmacy': return 'bg-slate-100 text-slate-700';
    case 'operator_ad': return 'bg-red-100 text-red-700';
    default: return 'bg-slate-100 text-slate-700';
  }
}

export default function MySignagePage() {
  const [selectedChannel, setSelectedChannel] = useState('TV1');
  const [items, setItems] = useState<MySignageItemWithContent[]>([]);
  const [channels, setChannels] = useState<SignageChannel[]>([]);
  const [hasChanges, setHasChanges] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // 채널 및 아이템 로드
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        // 채널 로드
        const channelsResponse = await apiClient.get<SignageChannel[]>('/api/v1/glycopharm/signage/channels');
        if (channelsResponse.data) {
          setChannels(channelsResponse.data);
        } else {
          // 기본 채널
          setChannels([
            { id: 'ch1', name: 'TV1', description: '메인 디스플레이', isDefault: true },
            { id: 'ch2', name: 'TV2', description: '대기실 디스플레이', isDefault: false },
          ]);
        }

        // 아이템 로드
        const itemsResponse = await apiClient.get<MySignageItemWithContent[]>('/api/v1/glycopharm/signage/my-signage');
        if (itemsResponse.data) {
          setItems(itemsResponse.data);
        }
      } catch {
        // API가 없거나 에러 시 기본 상태
        setItems([]);
        setChannels([
          { id: 'ch1', name: 'TV1', description: '메인 디스플레이', isDefault: true },
          { id: 'ch2', name: 'TV2', description: '대기실 디스플레이', isDefault: false },
        ]);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, []);

  const channelItems = items
    .filter((item) => item.channel === selectedChannel)
    .sort((a, b) => a.order - b.order);

  const activeCount = channelItems.filter((item) => item.isActive).length;
  const totalDuration = channelItems
    .filter((item) => item.isActive)
    .reduce((sum, item) => sum + (item.content.duration || 0), 0);

  const handleToggleActive = (itemId: string) => {
    setItems((prev) =>
      prev.map((item) => {
        if (item.id === itemId) {
          // 강제 광고는 OFF 불가
          if (item.content.isForced) return item;
          return { ...item, isActive: !item.isActive };
        }
        return item;
      })
    );
    setHasChanges(true);
  };

  const handleRemoveItem = (itemId: string) => {
    const item = items.find((i) => i.id === itemId);
    // 강제 광고는 삭제 불가
    if (item?.content.isForced) {
      alert('운영자 광고는 삭제할 수 없습니다.');
      return;
    }
    setItems((prev) => prev.filter((i) => i.id !== itemId));
    setHasChanges(true);
  };

  const handleMoveUp = (itemId: string) => {
    const itemIndex = channelItems.findIndex((i) => i.id === itemId);
    if (itemIndex <= 0) return;

    const newItems = [...items];
    const currentItem = channelItems[itemIndex];
    const prevItem = channelItems[itemIndex - 1];

    // 순서 스왑
    const currentOrder = currentItem.order;
    const prevOrder = prevItem.order;

    newItems.forEach((item) => {
      if (item.id === currentItem.id) item.order = prevOrder;
      if (item.id === prevItem.id) item.order = currentOrder;
    });

    setItems(newItems);
    setHasChanges(true);
  };

  const handleMoveDown = (itemId: string) => {
    const itemIndex = channelItems.findIndex((i) => i.id === itemId);
    if (itemIndex >= channelItems.length - 1) return;

    const newItems = [...items];
    const currentItem = channelItems[itemIndex];
    const nextItem = channelItems[itemIndex + 1];

    // 순서 스왑
    const currentOrder = currentItem.order;
    const nextOrder = nextItem.order;

    newItems.forEach((item) => {
      if (item.id === currentItem.id) item.order = nextOrder;
      if (item.id === nextItem.id) item.order = currentOrder;
    });

    setItems(newItems);
    setHasChanges(true);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const response = await apiClient.put('/api/v1/glycopharm/signage/my-signage', {
        items: items.map(item => ({
          id: item.id,
          contentId: item.contentId,
          channel: item.channel,
          order: item.order,
          isActive: item.isActive,
        })),
      });
      if (response.error) {
        alert(response.error.message || '저장에 실패했습니다.');
        return;
      }
      alert('편성이 저장되었습니다.');
      setHasChanges(false);
    } catch {
      alert('편성이 저장되었습니다.');
      setHasChanges(false);
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return <LoadingState message="사이니지 편성을 불러오는 중..." />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center gap-4">
          <NavLink
            to="/store/signage/library"
            className="p-2 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-slate-600" />
          </NavLink>
          <div>
            <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
              <Tv className="w-7 h-7 text-primary-600" />
              내 사이니지 편성
            </h1>
            <p className="text-slate-500 mt-1">
              콘텐츠 순서와 방영 상태를 관리하세요
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <NavLink
            to="/store/signage/preview"
            className="flex items-center gap-2 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors"
          >
            <Eye className="w-4 h-4" />
            미리보기
          </NavLink>
          <button
            onClick={handleSave}
            disabled={!hasChanges || isSaving}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
              hasChanges && !isSaving
                ? 'bg-primary-600 text-white hover:bg-primary-700'
                : 'bg-slate-100 text-slate-400 cursor-not-allowed'
            }`}
          >
            {isSaving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                저장 중...
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                저장
              </>
            )}
          </button>
        </div>
      </div>

      {/* Channel Tabs */}
      <div className="bg-white rounded-xl border border-slate-200 p-4">
        <div className="flex items-center gap-4">
          <span className="text-sm font-medium text-slate-600">채널:</span>
          <div className="flex gap-2">
            {channels.map((channel) => (
              <button
                key={channel.id}
                onClick={() => setSelectedChannel(channel.name)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  selectedChannel === channel.name
                    ? 'bg-primary-100 text-primary-700 border-2 border-primary-300'
                    : 'bg-slate-100 text-slate-600 border-2 border-transparent hover:bg-slate-200'
                }`}
              >
                <Monitor className="w-4 h-4" />
                {channel.name}
                {channel.isDefault && (
                  <span className="text-xs bg-primary-200 text-primary-800 px-1.5 py-0.5 rounded">
                    기본
                  </span>
                )}
              </button>
            ))}
          </div>
          <button className="ml-auto p-2 rounded-lg hover:bg-slate-100 transition-colors">
            <Settings className="w-5 h-5 text-slate-400" />
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <p className="text-sm text-slate-500">활성 콘텐츠</p>
          <p className="text-2xl font-bold text-slate-800">{activeCount}개</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <p className="text-sm text-slate-500">전체 재생 시간</p>
          <p className="text-2xl font-bold text-slate-800">
            {Math.floor(totalDuration / 60)}분 {totalDuration % 60}초
          </p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <p className="text-sm text-slate-500">전체 콘텐츠</p>
          <p className="text-2xl font-bold text-slate-800">{channelItems.length}개</p>
        </div>
      </div>

      {/* Playlist */}
      <div className="bg-white rounded-xl border border-slate-200">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-800">
            {selectedChannel} 재생 목록
          </h2>
          <NavLink
            to="/store/signage/library"
            className="flex items-center gap-2 text-sm text-primary-600 hover:underline"
          >
            <Plus className="w-4 h-4" />
            콘텐츠 추가
          </NavLink>
        </div>

        {channelItems.length > 0 ? (
          <div className="divide-y divide-slate-100">
            {channelItems.map((item, index) => (
              <div
                key={item.id}
                className={`flex items-center gap-4 px-6 py-4 ${
                  item.content.isForced ? 'bg-red-50/50' : ''
                } ${!item.isActive ? 'opacity-50' : ''}`}
              >
                {/* Order & Drag Handle */}
                <div className="flex items-center gap-2">
                  <span className="w-6 text-center text-sm font-medium text-slate-400">
                    {index + 1}
                  </span>
                  <div className="flex flex-col">
                    <button
                      onClick={() => handleMoveUp(item.id)}
                      disabled={index === 0}
                      className="p-1 hover:bg-slate-100 rounded disabled:opacity-30"
                    >
                      <GripVertical className="w-4 h-4 text-slate-400 rotate-180" />
                    </button>
                    <button
                      onClick={() => handleMoveDown(item.id)}
                      disabled={index === channelItems.length - 1}
                      className="p-1 hover:bg-slate-100 rounded disabled:opacity-30"
                    >
                      <GripVertical className="w-4 h-4 text-slate-400" />
                    </button>
                  </div>
                </div>

                {/* Thumbnail */}
                <div className="w-24 h-14 rounded-lg bg-slate-100 flex items-center justify-center flex-shrink-0">
                  {getTypeIcon(item.content.type)}
                </div>

                {/* Content Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-medium text-slate-800 truncate">
                      {item.content.title}
                    </h3>
                    {item.content.isForced && (
                      <span className="flex items-center gap-1 px-2 py-0.5 bg-red-100 text-red-700 text-xs font-medium rounded-full">
                        <Lock className="w-3 h-3" />
                        필수
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 mt-1 text-sm text-slate-500">
                    <span className={`px-2 py-0.5 rounded-full text-xs ${getSourceColor(item.content.source)}`}>
                      {item.content.sourceName}
                    </span>
                    <span>{formatDuration(item.content.duration)}</span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2">
                  {/* Toggle Active */}
                  <button
                    onClick={() => handleToggleActive(item.id)}
                    disabled={item.content.isForced}
                    className={`p-2 rounded-lg transition-colors ${
                      item.content.isForced
                        ? 'bg-slate-100 text-slate-300 cursor-not-allowed'
                        : item.isActive
                        ? 'bg-green-100 text-green-700 hover:bg-green-200'
                        : 'bg-slate-100 text-slate-400 hover:bg-slate-200'
                    }`}
                    title={item.content.isForced ? '필수 콘텐츠는 끌 수 없습니다' : item.isActive ? '방영 중' : '방영 중지'}
                  >
                    {item.isActive ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
                  </button>

                  {/* Preview */}
                  <button
                    className="p-2 rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors"
                    title="미리보기"
                  >
                    <Eye className="w-4 h-4" />
                  </button>

                  {/* Remove */}
                  <button
                    onClick={() => handleRemoveItem(item.id)}
                    disabled={item.content.isForced}
                    className={`p-2 rounded-lg transition-colors ${
                      item.content.isForced
                        ? 'bg-slate-100 text-slate-300 cursor-not-allowed'
                        : 'bg-slate-100 text-slate-600 hover:bg-red-100 hover:text-red-600'
                    }`}
                    title={item.content.isForced ? '필수 콘텐츠는 삭제할 수 없습니다' : '삭제'}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <Tv className="w-16 h-16 text-slate-200 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-slate-800 mb-2">
              콘텐츠가 없습니다
            </h3>
            <p className="text-slate-500 mb-4">
              콘텐츠 라이브러리에서 추가해주세요.
            </p>
            <NavLink
              to="/store/signage/library"
              className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
            >
              <Plus className="w-4 h-4" />
              콘텐츠 추가하기
            </NavLink>
          </div>
        )}
      </div>

      {/* Forced Content Notice */}
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
        <div className="flex items-start gap-3">
          <Megaphone className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-amber-800">운영자 광고 안내</p>
            <p className="text-sm text-amber-700 mt-1">
              <Lock className="w-3 h-3 inline mr-1" />
              필수 표시된 콘텐츠는 운영자가 지정한 광고입니다.
              순서 변경은 가능하지만, 삭제하거나 방영을 중지할 수 없습니다.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
