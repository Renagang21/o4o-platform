import { useState } from 'react';
import { Image as ImageIcon, Search, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import MediaUploader from '@/components/media/MediaUploader';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/api/client';
import { Editor } from '@tiptap/react';

interface TiptapImageSelectorProps {
  editor: Editor;
  isOpen: boolean;
  onClose: () => void;
}

interface MediaFile {
  id: string;
  url: string;
  webpUrl?: string;
  name: string;
  altText?: string;
  width?: number;
  height?: number;
  size: number;
  type: string;
  thumbnailUrl?: string;
  createdAt?: string;
}

export default function TiptapImageSelector({ editor, isOpen, onClose }: TiptapImageSelectorProps) {
  const [selectedImage, setSelectedImage] = useState<MediaFile | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [altText, setAltText] = useState('');
  const [activeTab, setActiveTab] = useState<'library' | 'upload'>('library');

  // Fetch media files
  const { data: mediaFiles = [], isLoading } = useQuery({
    queryKey: ['media', 'images', searchTerm],
    queryFn: async () => {
      const response = await apiClient.get('/api/media', {
        params: {
          type: 'image',
          search: searchTerm,
          limit: 50
        }
      });
      return response.data.data || [];
    },
    enabled: isOpen && activeTab === 'library'
  });

  // Handle image selection
  const handleSelectImage = (image: MediaFile) => {
    setSelectedImage(image);
    setAltText(image.altText || '');
  };

  // Insert image into editor
  const handleInsertImage = () => {
    if (!selectedImage) return;

    // Use WebP version if available, fallback to original
    const imageUrl = selectedImage.webpUrl || selectedImage.url;
    
    editor
      .chain()
      .focus()
      .insertContent(`<img src="${imageUrl}" alt="${altText || selectedImage.name}" title="${selectedImage.name}" />`)
      .run();

    handleClose();
  };

  // Handle upload complete
  const handleUploadComplete = (uploadedFiles: MediaFile[]) => {
    if (uploadedFiles.length > 0) {
      const firstImage = uploadedFiles[0];
      handleSelectImage({
        id: Date.now().toString(),
        url: firstImage.url,
        webpUrl: firstImage.webpUrl,
        name: firstImage.name,
        size: firstImage.size,
        type: firstImage.type,
        createdAt: new Date().toISOString()
      });
      setActiveTab('library');
    }
  };

  // Handle close and reset
  const handleClose = () => {
    setSelectedImage(null);
    setAltText('');
    setSearchTerm('');
    setActiveTab('library');
    onClose();
  };

  // Format file size
  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>이미지 삽입</DialogTitle>
          <DialogDescription>
            미디어 라이브러리에서 이미지를 선택하거나 새로 업로드하세요
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="flex-1 flex flex-col">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="library">미디어 라이브러리</TabsTrigger>
            <TabsTrigger value="upload">새 이미지 업로드</TabsTrigger>
          </TabsList>

          <TabsContent value="library" className="flex-1 flex flex-col space-y-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder="이미지 검색..."
                value={searchTerm}
                onChange={(e: any) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Image grid */}
            <ScrollArea className="flex-1 -mx-4 px-4">
              {isLoading ? (
                <div className="flex items-center justify-center h-64">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
                </div>
              ) : mediaFiles.length > 0 ? (
                <div className="grid grid-cols-4 gap-4">
                  {mediaFiles.map((image: MediaFile) => (
                    <Card
                      key={image.id}
                      className={`relative cursor-pointer transition-all ${
                        selectedImage?.id === image.id
                          ? 'ring-2 ring-blue-500'
                          : 'hover:shadow-lg'
                      }`}
                      onClick={() => handleSelectImage(image)}
                    >
                      <div className="aspect-square relative overflow-hidden rounded-lg">
                        <img
                          src={image.thumbnailUrl || image.url}
                          alt={image.altText || image.name}
                          className="w-full h-full object-cover"
                        />
                        {selectedImage?.id === image.id && (
                          <div className="absolute inset-0 bg-blue-500 bg-opacity-20 flex items-center justify-center">
                            <div className="bg-blue-500 text-white rounded-full p-2">
                              <Check className="w-4 h-4" />
                            </div>
                          </div>
                        )}
                        {image.webpUrl && (
                          <div className="absolute top-2 right-2 bg-green-500 text-white text-xs px-2 py-1 rounded">
                            WebP
                          </div>
                        )}
                      </div>
                      <div className="p-2">
                        <p className="text-xs truncate">{image.name}</p>
                        <p className="text-xs text-gray-500">{formatFileSize(image.size)}</p>
                      </div>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-64 text-gray-500">
                  <ImageIcon className="w-12 h-12 mb-4" />
                  <p>이미지가 없습니다</p>
                </div>
              )}
            </ScrollArea>

            {/* Selected image details */}
            {selectedImage && (
              <div className="border-t pt-4 space-y-3">
                <div className="flex space-x-4">
                  <img
                    src={selectedImage.thumbnailUrl || selectedImage.url}
                    alt={selectedImage.name}
                    className="w-24 h-24 object-cover rounded"
                  />
                  <div className="flex-1 space-y-2">
                    <p className="font-medium">{selectedImage.name}</p>
                    <p className="text-sm text-gray-500">
                      크기: {formatFileSize(selectedImage.size)}
                      {selectedImage.width && selectedImage.height && 
                        ` • ${selectedImage.width} × ${selectedImage.height}px`}
                    </p>
                    <div className="space-y-2">
                      <Label htmlFor="alt-text">대체 텍스트</Label>
                      <Input
                        id="alt-text"
                        value={altText}
                        onChange={(e: any) => setAltText(e.target.value)}
                        placeholder="이미지 설명을 입력하세요"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="upload" className="flex-1">
            <MediaUploader
              onUploadComplete={handleUploadComplete}
              accept={{ 'image/*': ['.png', '.jpg', '.jpeg', '.gif', '.webp'] }}
              maxFiles={5}
            />
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button variant={"outline" as const} onClick={handleClose}>
            취소
          </Button>
          <Button 
            onClick={handleInsertImage} 
            disabled={!selectedImage}
          >
            이미지 삽입
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}