/**
 * Content Hub
 *
 * WO-SIGNAGE-CONTENT-HUB-V1
 * - 디지털 사이니지 콘텐츠 허브 페이지
 * - 운영자/공급자/커뮤니티 콘텐츠를 탭별로 표시
 * - 보기 전용 (browse-only)
 *
 * WO-O4O-CONTENT-SNAPSHOT-UNIFICATION-V1: clone 경로 제거
 *
 * ❌ globalContentApi.clone* 사용 금지
 */

import { useEffect, useState } from 'react';
import { Play, Image as ImageIcon, Video, List, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { globalContentApi, SignagePlaylist, SignageMedia, type ContentSource } from '@/lib/api/signageV2';

type ContentType = 'playlists' | 'media';

export default function ContentHub() {
  const [activeSource, setActiveSource] = useState<ContentSource>('hq');
  const [contentType, setContentType] = useState<ContentType>('playlists');

  // Data states
  const [playlists, setPlaylists] = useState<SignagePlaylist[]>([]);
  const [media, setMedia] = useState<SignageMedia[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load content when source or type changes
  useEffect(() => {
    loadContent();
  }, [activeSource, contentType]);

  const loadContent = async () => {
    setLoading(true);
    setError(null);

    try {
      if (contentType === 'playlists') {
        const result = await globalContentApi.listPlaylists(activeSource, 'neture', { page: 1, limit: 50 });
        if (result.success && result.data) {
          setPlaylists(result.data.items || []);
        } else {
          setError(result.error || 'Failed to load playlists');
        }
      } else {
        const result = await globalContentApi.listMedia(activeSource, 'neture', { page: 1, limit: 50 });
        if (result.success && result.data) {
          setMedia(result.data.items || []);
        } else {
          setError(result.error || 'Failed to load media');
        }
      }
    } catch (err) {
      setError('An error occurred while loading content');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const getSourceLabel = (source: ContentSource): string => {
    switch (source) {
      case 'hq':
        return '서비스운영자 콘텐츠';
      case 'supplier':
        return '공급자 콘텐츠';
      case 'community':
        return '커뮤니티 콘텐츠';
    }
  };

  const getSourceDescription = (source: ContentSource): string => {
    switch (source) {
      case 'hq':
        return 'HQ 및 서비스운영자가 제작한 공식 콘텐츠';
      case 'supplier':
        return '네뚜레 공급자 대시보드에서 등록한 콘텐츠';
      case 'community':
        return '포럼 및 커뮤니티에서 공유된 콘텐츠';
    }
  };

  const renderPlaylistCard = (playlist: SignagePlaylist) => (
    <Card key={playlist.id} className="hover:shadow-md transition-shadow">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-lg flex items-center gap-2">
              <List className="h-5 w-5 text-blue-600" />
              {playlist.name}
            </CardTitle>
            {playlist.description && (
              <CardDescription className="mt-2">{playlist.description}</CardDescription>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-2 text-sm text-muted-foreground">
          <div className="flex items-center justify-between">
            <span>항목 수:</span>
            <Badge variant="secondary">{playlist.itemCount || 0}개</Badge>
          </div>
          <div className="flex items-center justify-between">
            <span>총 재생 시간:</span>
            <span>{Math.floor(playlist.totalDuration / 60)}분 {playlist.totalDuration % 60}초</span>
          </div>
          <div className="flex items-center justify-between">
            <span>등록일:</span>
            <span>{new Date(playlist.createdAt).toLocaleDateString()}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  const renderMediaCard = (item: SignageMedia) => (
    <Card key={item.id} className="hover:shadow-md transition-shadow">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-lg flex items-center gap-2">
              {item.mediaType === 'video' || item.mediaType === 'youtube' || item.mediaType === 'vimeo' ? (
                <Video className="h-5 w-5 text-purple-600" />
              ) : (
                <ImageIcon className="h-5 w-5 text-green-600" />
              )}
              {item.name}
            </CardTitle>
          </div>
          <Badge variant="outline">{item.mediaType}</Badge>
        </div>
      </CardHeader>
      {item.thumbnailUrl && (
        <div className="px-6">
          <img
            src={item.thumbnailUrl}
            alt={item.name}
            className="w-full h-40 object-cover rounded-md"
          />
        </div>
      )}
      <CardContent className="mt-4">
        <div className="space-y-2 text-sm text-muted-foreground">
          {item.duration && (
            <div className="flex items-center justify-between">
              <span>재생 시간:</span>
              <span>{item.duration}초</span>
            </div>
          )}
          <div className="flex items-center justify-between">
            <span>등록일:</span>
            <span>{new Date(item.createdAt).toLocaleDateString()}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  const renderContent = () => {
    if (loading) {
      return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-6 w-3/4" />
                <Skeleton className="h-4 w-full mt-2" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-32 w-full" />
              </CardContent>
              <CardFooter>
                <Skeleton className="h-10 w-full" />
              </CardFooter>
            </Card>
          ))}
        </div>
      );
    }

    if (error) {
      return (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      );
    }

    const items = contentType === 'playlists' ? playlists : media;

    if (items.length === 0) {
      return (
        <div className="text-center py-12">
          <p className="text-muted-foreground">
            {contentType === 'playlists' ? '플레이리스트가' : '미디어가'} 없습니다.
          </p>
        </div>
      );
    }

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {contentType === 'playlists'
          ? playlists.map(renderPlaylistCard)
          : media.map(renderMediaCard)}
      </div>
    );
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">디지털 사이니지 콘텐츠</h1>
        <p className="text-muted-foreground">
          동영상과 플레이리스트를 탐색할 수 있습니다
        </p>
      </div>

      <Tabs value={activeSource} onValueChange={(v) => setActiveSource(v as ContentSource)} className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="hq">서비스운영자 콘텐츠</TabsTrigger>
          <TabsTrigger value="supplier">공급자 콘텐츠</TabsTrigger>
          <TabsTrigger value="community">커뮤니티 콘텐츠</TabsTrigger>
        </TabsList>

        {(['hq', 'supplier', 'community'] as ContentSource[]).map((source) => (
          <TabsContent key={source} value={source} className="space-y-6">
            <div className="bg-muted/50 rounded-lg p-4">
              <p className="text-sm text-muted-foreground">{getSourceDescription(source)}</p>
            </div>

            <div className="flex gap-2">
              <Button
                variant={contentType === 'playlists' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setContentType('playlists')}
              >
                <List className="h-4 w-4 mr-2" />
                플레이리스트
              </Button>
              <Button
                variant={contentType === 'media' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setContentType('media')}
              >
                <Video className="h-4 w-4 mr-2" />
                동영상
              </Button>
            </div>

            {renderContent()}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
