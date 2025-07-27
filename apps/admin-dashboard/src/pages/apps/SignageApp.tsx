import { useState } from 'react';
import { Monitor, Play, Plus, Link, Copy, Youtube, Video, Search, Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { VideoCopyButton } from '@/components/apps/VideoCopyButton';
import { parseVideoUrl, isValidVideoUrl } from '@/utils/videoUtils';
import toast from 'react-hot-toast';

const SignageApp = () => {
  const [videoUrl, setVideoUrl] = useState('');
  const [isValidating, setIsValidating] = useState(false);

  const handleAddVideo = () => {
    if (!videoUrl) {
      toast.error('비디오 URL을 입력해주세요.');
      return;
    }

    setIsValidating(true);

    if (isValidVideoUrl(videoUrl)) {
      const videoInfo = parseVideoUrl(videoUrl);
      toast.success(`${videoInfo.type === 'youtube' ? 'YouTube' : 'Vimeo'} 비디오가 확인되었습니다!`);
      // TODO: 실제로 비디오를 추가하는 로직
      setVideoUrl('');
    } else {
      toast.error('유효한 YouTube 또는 Vimeo URL을 입력해주세요.');
    }

    setIsValidating(false);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-modern-text-primary flex items-center gap-2">
            <Monitor className="w-8 h-8 text-modern-primary" />
            디지털 사이니지 비디오 관리
          </h1>
          <p className="text-modern-text-secondary mt-1">
            YouTube/Vimeo 비디오를 추가하고 디스플레이에 표시할 콘텐츠를 관리하세요.
          </p>
        </div>
      </div>

      {/* Quick Add Video */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plus className="w-5 h-5 text-modern-primary" />
            빠른 비디오 추가
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Input
              type="url"
              placeholder="YouTube 또는 Vimeo URL을 입력하세요..."
              value={videoUrl}
              onChange={(e) => setVideoUrl(e.target.value)}
              className="flex-1"
            />
            <Button onClick={handleAddVideo} disabled={isValidating}>
              <Plus className="w-4 h-4 mr-2" />
              추가
            </Button>
          </div>
          <p className="text-sm text-modern-text-secondary mt-2">
            예: https://www.youtube.com/watch?v=dQw4w9WgXcQ 또는 https://vimeo.com/123456789
          </p>
        </CardContent>
      </Card>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-modern-text-secondary">내 비디오</p>
                <p className="text-2xl font-bold text-modern-text-primary">24</p>
                <p className="text-xs text-modern-text-secondary mt-1">총 재생시간 2시간 30분</p>
              </div>
              <Video className="w-8 h-8 text-modern-primary opacity-20" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-modern-text-secondary">공유된 비디오</p>
                <p className="text-2xl font-bold text-modern-success">156</p>
                <p className="text-xs text-modern-text-secondary mt-1">다른 사용자가 공유</p>
              </div>
              <Copy className="w-8 h-8 text-modern-success opacity-20" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-modern-text-secondary">YouTube</p>
                <p className="text-2xl font-bold text-modern-warning">45</p>
                <p className="text-xs text-modern-text-secondary mt-1">플레이리스트 3개</p>
              </div>
              <Youtube className="w-8 h-8 text-modern-warning opacity-20" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-modern-text-secondary">Vimeo</p>
                <p className="text-2xl font-bold text-modern-accent">12</p>
                <p className="text-xs text-modern-text-secondary mt-1">프리미엄 콘텐츠</p>
              </div>
              <Play className="w-8 h-8 text-modern-accent opacity-20" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Video Lists */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* My Videos */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>내 비디오</span>
              <Button size={"sm" as const} variant={"outline" as const}>
                <Search className="w-4 h-4 mr-2" />
                검색
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {/* Sample Video Item */}
              <div className="p-4 border border-modern-border-primary rounded-lg hover:shadow-md transition-shadow">
                <div className="flex items-start gap-3">
                  <div className="w-32 h-20 bg-modern-bg-tertiary rounded flex items-center justify-center flex-shrink-0">
                    <Youtube className="w-8 h-8 text-modern-text-tertiary" />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-medium text-modern-text-primary line-clamp-1">
                      2024 봄 신제품 프로모션
                    </h4>
                    <p className="text-sm text-modern-text-secondary mt-1">
                      재생시간: 2:30 | YouTube
                    </p>
                    <div className="flex items-center gap-2 mt-2">
                      <Badge variant={"outline" as const} className="text-xs">프로모션</Badge>
                      <span className="text-xs text-modern-text-secondary">
                        2024.03.15 추가
                      </span>
                    </div>
                  </div>
                  <Button size={"sm" as const} variant={"ghost" as const}>
                    <Play className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              <div className="p-4 border border-modern-border-primary rounded-lg hover:shadow-md transition-shadow">
                <div className="flex items-start gap-3">
                  <div className="w-32 h-20 bg-modern-bg-tertiary rounded flex items-center justify-center flex-shrink-0">
                    <Video className="w-8 h-8 text-modern-text-tertiary" />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-medium text-modern-text-primary line-clamp-1">
                      브랜드 소개 영상
                    </h4>
                    <p className="text-sm text-modern-text-secondary mt-1">
                      재생시간: 5:15 | Vimeo
                    </p>
                    <div className="flex items-center gap-2 mt-2">
                      <Badge variant={"outline" as const} className="text-xs">브랜딩</Badge>
                      <span className="text-xs text-modern-text-secondary">
                        2024.02.28 추가
                      </span>
                    </div>
                  </div>
                  <Button size={"sm" as const} variant={"ghost" as const}>
                    <Play className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>

            <Button variant={"outline" as const} className="w-full mt-4">
              전체 보기
            </Button>
          </CardContent>
        </Card>

        {/* Shared Videos */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>공유된 비디오</span>
              <div className="flex items-center gap-2">
                <Button size={"sm" as const} variant={"outline" as const}>
                  <Filter className="w-4 h-4 mr-2" />
                  필터
                </Button>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {/* Shared Video with Copy Button */}
              <div className="p-4 border border-modern-border-primary rounded-lg hover:shadow-md transition-shadow">
                <div className="flex items-start gap-3">
                  <div className="w-32 h-20 bg-modern-bg-tertiary rounded flex items-center justify-center flex-shrink-0">
                    <Youtube className="w-8 h-8 text-modern-text-tertiary" />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-medium text-modern-text-primary line-clamp-1">
                      건강 관리 팁 시리즈
                    </h4>
                    <p className="text-sm text-modern-text-secondary mt-1">
                      재생시간: 3:45 | YouTube 플레이리스트
                    </p>
                    <div className="flex items-center gap-2 mt-2">
                      <Badge variant={"outline" as const} className="text-xs">교육</Badge>
                      <span className="text-xs text-modern-text-secondary">
                        by 마케팅팀
                      </span>
                    </div>
                  </div>
                  <VideoCopyButton postId="video_123" size={"sm" as const} />
                </div>
              </div>

              <div className="p-4 border border-modern-border-primary rounded-lg hover:shadow-md transition-shadow">
                <div className="flex items-start gap-3">
                  <div className="w-32 h-20 bg-modern-bg-tertiary rounded flex items-center justify-center flex-shrink-0">
                    <Video className="w-8 h-8 text-modern-text-tertiary" />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-medium text-modern-text-primary line-clamp-1">
                      매장 인테리어 소개
                    </h4>
                    <p className="text-sm text-modern-text-secondary mt-1">
                      재생시간: 1:30 | Vimeo
                    </p>
                    <div className="flex items-center gap-2 mt-2">
                      <Badge variant={"outline" as const} className="text-xs">매장소개</Badge>
                      <span className="text-xs text-modern-text-secondary">
                        by 디자인팀
                      </span>
                    </div>
                  </div>
                  <VideoCopyButton postId="video_124" size={"sm" as const} />
                </div>
              </div>

              <div className="p-4 border border-modern-border-primary rounded-lg hover:shadow-md transition-shadow">
                <div className="flex items-start gap-3">
                  <div className="w-32 h-20 bg-modern-bg-tertiary rounded flex items-center justify-center flex-shrink-0">
                    <Youtube className="w-8 h-8 text-modern-text-tertiary" />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-medium text-modern-text-primary line-clamp-1">
                      고객 후기 모음
                    </h4>
                    <p className="text-sm text-modern-text-secondary mt-1">
                      재생시간: 4:20 | YouTube
                    </p>
                    <div className="flex items-center gap-2 mt-2">
                      <Badge variant={"outline" as const} className="text-xs">후기</Badge>
                      <span className="text-xs text-modern-text-secondary">
                        by CS팀
                      </span>
                    </div>
                  </div>
                  <VideoCopyButton postId="video_125" size={"sm" as const} />
                </div>
              </div>
            </div>

            <Button variant={"outline" as const} className="w-full mt-4">
              더 많은 비디오 보기
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Info Section */}
      <Card>
        <CardHeader>
          <CardTitle>사용 가이드</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-modern-primary">
                <Link className="w-5 h-5" />
                <h4 className="font-medium">비디오 추가하기</h4>
              </div>
              <p className="text-sm text-modern-text-secondary">
                YouTube나 Vimeo URL을 붙여넣어 비디오를 빠르게 추가하세요. 
                플레이리스트 URL도 지원됩니다.
              </p>
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-modern-primary">
                <Copy className="w-5 h-5" />
                <h4 className="font-medium">비디오 복사하기</h4>
              </div>
              <p className="text-sm text-modern-text-secondary">
                다른 사용자가 공유한 비디오를 내 목록에 복사하여 사용할 수 있습니다.
              </p>
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-modern-primary">
                <Monitor className="w-5 h-5" />
                <h4 className="font-medium">디스플레이 설정</h4>
              </div>
              <p className="text-sm text-modern-text-secondary">
                CPT와 ACF를 활용하여 디스플레이별 재생 스케줄과 설정을 관리하세요.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default SignageApp;