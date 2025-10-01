import React, { useState, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Upload,
  X,
  Image as ImageIcon,
  FileImage,
  Loader2,
  Eye,
  AlertCircle,
  CheckCircle,
} from 'lucide-react';

export interface UploadedImage {
  id: string;
  file: File;
  url: string;
  analysis?: ImageAnalysis;
  isAnalyzing?: boolean;
}

export interface ImageAnalysis {
  description: string;
  objects: string[];
  colors: string[];
  mood: string;
  style: string;
  suggestions: string[];
}

interface ImageUploaderProps {
  onImagesChange: (images: UploadedImage[]) => void;
  maxImages?: number;
  maxSizeMB?: number;
  acceptedTypes?: string[];
  enableVisionAI?: boolean;
  className?: string;
}

export const ImageUploader: React.FC<ImageUploaderProps> = ({
  onImagesChange,
  maxImages = 5,
  maxSizeMB = 10,
  acceptedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
  enableVisionAI = true,
  className = '',
}) => {
  const [images, setImages] = useState<UploadedImage[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({});
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 파일 검증
  const validateFile = (file: File): string | null => {
    if (!acceptedTypes.includes(file.type)) {
      return `지원하지 않는 파일 형식입니다. (${acceptedTypes.join(', ')})`;
    }
    
    if (file.size > maxSizeMB * 1024 * 1024) {
      return `파일 크기가 너무 큽니다. (최대 ${maxSizeMB}MB)`;
    }
    
    return null;
  };

  // 이미지 업로드 처리
  const handleFiles = useCallback(async (files: File[]) => {
    setError(null);
    
    if (images.length + files.length > maxImages) {
      setError(`최대 ${maxImages}개의 이미지만 업로드할 수 있습니다.`);
      return;
    }

    const validFiles: File[] = [];
    
    for (const file of files) {
      const validationError = validateFile(file);
      if (validationError) {
        setError(validationError);
        return;
      }
      validFiles.push(file);
    }

    // 이미지 프리뷰 생성
    const newImages: UploadedImage[] = await Promise.all(
      validFiles.map(async (file) => {
        const url = URL.createObjectURL(file);
        const id = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        
        return {
          id,
          file,
          url,
          isAnalyzing: enableVisionAI,
        };
      })
    );

    const updatedImages = [...images, ...newImages];
    setImages(updatedImages);
    onImagesChange(updatedImages);

    // Vision AI 분석 시작
    if (enableVisionAI) {
      newImages.forEach((image) => {
        analyzeImage(image);
      });
    }
  }, [images, maxImages, enableVisionAI, onImagesChange]);

  // Vision AI 이미지 분석
  const analyzeImage = async (image: UploadedImage) => {
    try {
      // 동적 import로 Vision AI 서비스 로드
      const { visionAI } = await import('@/services/ai/visionAI');
      
      // Vision AI로 이미지 분석
      const result = await visionAI.analyzeImage(image.file);
      
      const analysis: ImageAnalysis = {
        description: result.description,
        objects: result.objects,
        colors: result.colors,
        mood: result.mood,
        style: result.style,
        suggestions: result.suggestions
      };

      setImages(prevImages => 
        prevImages.map(img => 
          img.id === image.id 
            ? { ...img, analysis, isAnalyzing: false }
            : img
        )
      );

      onImagesChange(images.map(img => 
        img.id === image.id 
          ? { ...img, analysis, isAnalyzing: false }
          : img
      ));
    } catch (error) {
      console.error('이미지 분석 실패:', error);
      setImages(prevImages => 
        prevImages.map(img => 
          img.id === image.id 
            ? { ...img, isAnalyzing: false }
            : img
        )
      );
    }
  };

  // 이미지 제거
  const removeImage = (id: string) => {
    const updatedImages = images.filter(img => img.id !== id);
    setImages(updatedImages);
    onImagesChange(updatedImages);
    
    // 메모리 정리
    const imageToRemove = images.find(img => img.id === id);
    if (imageToRemove) {
      URL.revokeObjectURL(imageToRemove.url);
    }
  };

  // 드래그 앤 드롭 처리
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const files = Array.from(e.dataTransfer.files).filter(file => 
      file.type.startsWith('image/')
    );
    
    if (files.length > 0) {
      handleFiles(files);
    }
  };

  // 파일 선택 처리
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      handleFiles(files);
    }
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {/* 업로드 영역 */}
      <Card
        className={`border-2 border-dashed transition-colors ${
          isDragging
            ? 'border-blue-500 bg-blue-50'
            : 'border-gray-300 hover:border-gray-400'
        }`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <CardContent className="p-8 text-center">
          <div className="flex flex-col items-center space-y-4">
            <div className={`p-4 rounded-full ${isDragging ? 'bg-blue-100' : 'bg-gray-100'}`}>
              <Upload className={`w-8 h-8 ${isDragging ? 'text-blue-500' : 'text-gray-400'}`} />
            </div>
            
            <div>
              <h3 className="font-medium text-gray-900">
                이미지를 드래그하거나 클릭하여 업로드
              </h3>
              <p className="text-sm text-gray-500 mt-1">
                최대 {maxImages}개, 파일당 {maxSizeMB}MB 이하
              </p>
              {enableVisionAI && (
                <p className="text-xs text-blue-600 mt-2">
                  🤖 AI가 이미지를 분석하여 콘텐츠 생성에 활용합니다
                </p>
              )}
            </div>
            
            <Button
              onClick={() => fileInputRef.current?.click()}
              variant="outline"
              disabled={images.length >= maxImages}
            >
              <FileImage className="w-4 h-4 mr-2" />
              파일 선택
            </Button>
            
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept={acceptedTypes.join(',')}
              onChange={handleFileSelect}
              className="hidden"
            />
            
            <div className="flex flex-wrap gap-1 text-xs text-gray-400">
              {acceptedTypes.map(type => (
                <Badge key={type} variant="secondary" className="text-xs">
                  {type.split('/')[1].toUpperCase()}
                </Badge>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 에러 메시지 */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* 업로드된 이미지 목록 */}
      {images.length > 0 && (
        <div className="space-y-3">
          <Label className="text-sm font-medium">
            업로드된 이미지 ({images.length}/{maxImages})
          </Label>
          
          <div className="grid grid-cols-1 gap-4">
            {images.map((image) => (
              <Card key={image.id} className="p-4">
                <div className="flex gap-4">
                  {/* 이미지 미리보기 */}
                  <div className="flex-shrink-0">
                    <div className="w-20 h-20 bg-gray-100 rounded-lg overflow-hidden">
                      <img
                        src={image.url}
                        alt="업로드된 이미지"
                        className="w-full h-full object-cover"
                      />
                    </div>
                  </div>
                  
                  {/* 이미지 정보 */}
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium truncate">
                          {image.file.name}
                        </p>
                        <p className="text-xs text-gray-500">
                          {(image.file.size / 1024 / 1024).toFixed(2)} MB
                        </p>
                      </div>
                      
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => removeImage(image.id)}
                        className="text-red-500 hover:text-red-700"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                    
                    {/* AI 분석 상태 */}
                    {enableVisionAI && (
                      <div className="space-y-2">
                        {image.isAnalyzing ? (
                          <div className="flex items-center gap-2 text-xs text-blue-600">
                            <Loader2 className="w-3 h-3 animate-spin" />
                            AI가 이미지를 분석하고 있습니다...
                          </div>
                        ) : image.analysis ? (
                          <div className="space-y-2">
                            <div className="flex items-center gap-2 text-xs text-green-600">
                              <CheckCircle className="w-3 h-3" />
                              분석 완료
                            </div>
                            
                            <div className="text-xs space-y-1">
                              <p className="text-gray-700">
                                <strong>설명:</strong> {image.analysis.description}
                              </p>
                              <p className="text-gray-600">
                                <strong>감지된 객체:</strong> {image.analysis.objects.join(', ')}
                              </p>
                              <p className="text-gray-600">
                                <strong>분위기:</strong> {image.analysis.mood}
                              </p>
                            </div>
                            
                            <details className="text-xs">
                              <summary className="cursor-pointer text-blue-600 hover:text-blue-800">
                                AI 제안 보기
                              </summary>
                              <ul className="mt-1 ml-4 list-disc space-y-0.5 text-gray-600">
                                {image.analysis.suggestions.map((suggestion, idx) => (
                                  <li key={idx}>{suggestion}</li>
                                ))}
                              </ul>
                            </details>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 text-xs text-gray-500">
                            <AlertCircle className="w-3 h-3" />
                            분석 실패
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};