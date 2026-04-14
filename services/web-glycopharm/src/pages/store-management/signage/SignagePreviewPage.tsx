/**
 * SignagePreviewPage - 채널별 플레이리스트 미리보기
 *
 * - 채널별 플레이리스트 확인
 * - 실제 방영 순서 미리보기
 * - "현재 방영 중" 표시
 */

import { useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import {
  Tv,
  ArrowLeft,
  Play,
  Pause,
  SkipForward,
  SkipBack,
  Monitor,
  Maximize2,
  Volume2,
  VolumeX,
  Settings,
  Clock,
  Video,
  BookOpen,
  Link as LinkIcon,
} from 'lucide-react';
import type { ContentItem, ContentType } from '@/types';

// Mock 현재 재생 중인 콘텐츠
const mockPlaylist: ContentItem[] = [
  {
    id: 'c5',
    title: '1월 프로모션 안내',
    type: 'video',
    url: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
    source: 'operator_ad',
    sourceName: '운영자 광고',
    duration: 30,
    isForced: true,
    isActive: true,
    createdAt: '2024-01-01',
    updatedAt: '2024-01-01',
  },
  {
    id: 'c1',
    title: '혈당 관리의 기초 - 당뇨협회 공식 가이드',
    type: 'video',
    url: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
    source: 'neture',
    sourceName: 'Neture 공식',
    duration: 300,
    isForced: false,
    isActive: true,
    createdAt: '2024-01-15',
    updatedAt: '2024-01-15',
  },
  {
    id: 'c3',
    title: '프리스타일 리브레 신제품 안내',
    type: 'video',
    url: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
    source: 'supplier',
    sourceName: 'Abbott',
    duration: 180,
    isForced: false,
    isActive: true,
    createdAt: '2024-01-13',
    updatedAt: '2024-01-13',
  },
];

const mockChannels = [
  { id: 'ch1', name: 'TV1', isDefault: true },
  { id: 'ch2', name: 'TV2', isDefault: false },
];

function getTypeIcon(type: ContentType) {
  switch (type) {
    case 'video': return <Video className="w-4 h-4" />;
    case 'lms': return <BookOpen className="w-4 h-4" />;
    case 'link': return <LinkIcon className="w-4 h-4" />;
    default: return <Video className="w-4 h-4" />;
  }
}

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString('ko-KR', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
}

export default function SignagePreviewPage() {
  const [selectedChannel, setSelectedChannel] = useState('TV1');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isMuted, setIsMuted] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [elapsedTime, setElapsedTime] = useState(0);

  const currentContent = mockPlaylist[currentIndex];
  const totalDuration = mockPlaylist.reduce((sum, item) => sum + (item.duration || 0), 0);

  // 시계 업데이트
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // 재생 시간 업데이트 (시뮬레이션)
  useEffect(() => {
    if (!isPlaying) return;

    const timer = setInterval(() => {
      setElapsedTime((prev) => {
        const newTime = prev + 1;
        if (newTime >= (currentContent?.duration || 0)) {
          // 다음 콘텐츠로 이동
          setCurrentIndex((prevIndex) => (prevIndex + 1) % mockPlaylist.length);
          return 0;
        }
        return newTime;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isPlaying, currentContent]);

  const handlePrev = () => {
    setCurrentIndex((prev) => (prev - 1 + mockPlaylist.length) % mockPlaylist.length);
    setElapsedTime(0);
  };

  const handleNext = () => {
    setCurrentIndex((prev) => (prev + 1) % mockPlaylist.length);
    setElapsedTime(0);
  };

  const handlePlayPause = () => {
    setIsPlaying(!isPlaying);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <NavLink
            to="/store/signage/my"
            className="p-2 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-slate-600" />
          </NavLink>
          <div>
            <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
              <Tv className="w-7 h-7 text-primary-600" />
              사이니지 미리보기
            </h1>
            <p className="text-slate-500 mt-1">
              실제 방영 화면을 미리 확인하세요
            </p>
          </div>
        </div>

        {/* Channel Selector */}
        <div className="flex items-center gap-2">
          {mockChannels.map((channel) => (
            <button
              key={channel.id}
              onClick={() => setSelectedChannel(channel.name)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                selectedChannel === channel.name
                  ? 'bg-primary-100 text-primary-700'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <Monitor className="w-4 h-4" />
              {channel.name}
            </button>
          ))}
        </div>
      </div>

      {/* Preview Area */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Main Preview */}
        <div className="lg:col-span-2">
          <div className="bg-black rounded-2xl overflow-hidden">
            {/* Video Area */}
            <div className="relative aspect-video bg-slate-900 flex items-center justify-center">
              {/* Placeholder for video */}
              <div className="text-center text-white">
                <Play className="w-16 h-16 mx-auto mb-4 opacity-50" />
                <p className="text-lg font-medium">{currentContent?.title}</p>
                <p className="text-sm text-slate-400 mt-1">
                  {currentContent?.sourceName}
                </p>
              </div>

              {/* Clock Overlay */}
              <div className="absolute top-4 right-4 px-3 py-1.5 bg-black/50 rounded-lg text-white text-sm font-mono">
                <Clock className="w-4 h-4 inline mr-2" />
                {formatTime(currentTime)}
              </div>

              {/* Now Playing Badge */}
              <div className="absolute top-4 left-4 px-3 py-1.5 bg-red-600 rounded-lg text-white text-sm font-medium flex items-center gap-2">
                <span className="w-2 h-2 bg-white rounded-full animate-pulse" />
                방영 중
              </div>

              {/* Progress Bar */}
              <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/20">
                <div
                  className="h-full bg-primary-500 transition-all duration-1000"
                  style={{
                    width: `${((elapsedTime / (currentContent?.duration || 1)) * 100)}%`,
                  }}
                />
              </div>
            </div>

            {/* Controls */}
            <div className="px-6 py-4 flex items-center justify-between bg-slate-900">
              <div className="flex items-center gap-4">
                <button
                  onClick={handlePrev}
                  className="p-2 rounded-full hover:bg-white/10 transition-colors"
                >
                  <SkipBack className="w-5 h-5 text-white" />
                </button>
                <button
                  onClick={handlePlayPause}
                  className="p-3 rounded-full bg-white/20 hover:bg-white/30 transition-colors"
                >
                  {isPlaying ? (
                    <Pause className="w-6 h-6 text-white" />
                  ) : (
                    <Play className="w-6 h-6 text-white ml-0.5" />
                  )}
                </button>
                <button
                  onClick={handleNext}
                  className="p-2 rounded-full hover:bg-white/10 transition-colors"
                >
                  <SkipForward className="w-5 h-5 text-white" />
                </button>
              </div>

              <div className="text-white text-sm">
                {formatDuration(elapsedTime)} / {formatDuration(currentContent?.duration || 0)}
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsMuted(!isMuted)}
                  className="p-2 rounded-full hover:bg-white/10 transition-colors"
                >
                  {isMuted ? (
                    <VolumeX className="w-5 h-5 text-white" />
                  ) : (
                    <Volume2 className="w-5 h-5 text-white" />
                  )}
                </button>
                <button className="p-2 rounded-full hover:bg-white/10 transition-colors">
                  <Maximize2 className="w-5 h-5 text-white" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Playlist Sidebar */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between">
              <h2 className="font-semibold text-slate-800">재생 목록</h2>
              <span className="text-sm text-slate-500">
                {currentIndex + 1} / {mockPlaylist.length}
              </span>
            </div>

            <div className="max-h-[400px] overflow-y-auto">
              {mockPlaylist.map((content, index) => (
                <button
                  key={content.id}
                  onClick={() => {
                    setCurrentIndex(index);
                    setElapsedTime(0);
                  }}
                  className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors ${
                    index === currentIndex
                      ? 'bg-primary-50 border-l-4 border-primary-500'
                      : 'hover:bg-slate-50 border-l-4 border-transparent'
                  }`}
                >
                  {/* Index */}
                  <span
                    className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium ${
                      index === currentIndex
                        ? 'bg-primary-500 text-white'
                        : 'bg-slate-200 text-slate-600'
                    }`}
                  >
                    {index + 1}
                  </span>

                  {/* Thumbnail */}
                  <div className="w-16 h-10 rounded bg-slate-100 flex items-center justify-center flex-shrink-0">
                    {getTypeIcon(content.type)}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p
                      className={`text-sm font-medium truncate ${
                        index === currentIndex ? 'text-primary-700' : 'text-slate-800'
                      }`}
                    >
                      {content.title}
                    </p>
                    <p className="text-xs text-slate-500">
                      {formatDuration(content.duration || 0)}
                    </p>
                  </div>

                  {/* Now Playing Indicator */}
                  {index === currentIndex && isPlaying && (
                    <div className="flex gap-0.5">
                      <span className="w-1 h-4 bg-primary-500 rounded-full animate-pulse" />
                      <span className="w-1 h-4 bg-primary-500 rounded-full animate-pulse delay-75" />
                      <span className="w-1 h-4 bg-primary-500 rounded-full animate-pulse delay-150" />
                    </div>
                  )}
                </button>
              ))}
            </div>

            {/* Total Duration */}
            <div className="px-4 py-3 border-t border-slate-200 bg-slate-50">
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-600">전체 재생 시간</span>
                <span className="font-medium text-slate-800">
                  {Math.floor(totalDuration / 60)}분 {totalDuration % 60}초
                </span>
              </div>
            </div>
          </div>

          {/* Settings */}
          <div className="mt-4 bg-white rounded-xl border border-slate-200 p-4">
            <h3 className="font-semibold text-slate-800 mb-3 flex items-center gap-2">
              <Settings className="w-5 h-5 text-slate-400" />
              표시 설정
            </h3>
            <div className="space-y-3">
              <label className="flex items-center justify-between">
                <span className="text-sm text-slate-600">시계 표시</span>
                <input type="checkbox" defaultChecked className="rounded" />
              </label>
              <label className="flex items-center justify-between">
                <span className="text-sm text-slate-600">약국 정보 표시</span>
                <input type="checkbox" defaultChecked className="rounded" />
              </label>
              <label className="flex items-center justify-between">
                <span className="text-sm text-slate-600">자동 재생</span>
                <input type="checkbox" defaultChecked className="rounded" />
              </label>
            </div>
          </div>
        </div>
      </div>

      {/* TV Connection Guide */}
      <div className="bg-gradient-to-r from-primary-500 to-primary-600 rounded-xl p-6 text-white">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-xl bg-white/20 flex items-center justify-center">
            <Tv className="w-7 h-7" />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold">TV에서 재생하기</h3>
            <p className="text-primary-100 mt-1">
              약국 TV의 브라우저에서 아래 주소로 접속하세요
            </p>
            <code className="mt-2 inline-block px-3 py-1 bg-white/20 rounded-lg text-sm">
              https://glycopharm.neture.co.kr/display/{selectedChannel.toLowerCase()}/pharmacy-1
            </code>
          </div>
        </div>
      </div>
    </div>
  );
}
