import { ChangeEvent, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { CreateReviewDto, Review } from '@o4o/types';
import { ReviewRating } from './ReviewRating';
import { Button } from '@o4o/ui';
import { Textarea } from '@o4o/ui';
import { Input } from '@o4o/ui';
import { Label } from '@o4o/ui';
import { ImagePlus, X } from 'lucide-react';
import { cn } from '@o4o/utils';

const reviewSchema = z.object({
  rating: z.number().min(1, '평점을 선택해주세요').max(5),
  title: z.string().min(1, '제목을 입력해주세요').max(100, '제목은 100자 이내로 입력해주세요'),
  content: z.string().min(10, '리뷰는 최소 10자 이상 작성해주세요').max(1000, '리뷰는 1000자 이내로 작성해주세요'),
});

type ReviewFormData = z.infer<typeof reviewSchema>;

interface ReviewFormProps {
  productId: string;
  orderId?: string;
  review?: Review; // For editing
  onSubmit: (data: CreateReviewDto) => void;
  onCancel?: () => void;
  isSubmitting?: boolean;
  className?: string;
}

export function ReviewForm({
  productId,
  orderId,
  review,
  onSubmit,
  onCancel,
  isSubmitting,
  className
}: ReviewFormProps) {
  const [images, setImages] = useState<any[]>([]);
  const [imageUrls, setImageUrls] = useState(review?.images || []);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors }
  } = useForm<ReviewFormData>({
    resolver: zodResolver(reviewSchema),
    defaultValues: {
      rating: review?.rating || 0,
      title: review?.title || '',
      content: review?.content || ''
    }
  });

  const rating = watch('rating');
  const contentLength = watch('content')?.length || 0;

  const handleImageSelect = (e: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const validFiles = files.filter((file: any) => {
      const isImage = file.type.startsWith('image/');
      const isUnder5MB = file.size <= 5 * 1024 * 1024;
      return isImage && isUnder5MB;
    });

    if (validFiles.length + images.length + imageUrls.length > 5) {
      alert('이미지는 최대 5개까지 업로드 가능합니다.');
      return;
    }

    setImages([...images, ...validFiles]);

    // Create preview URLs
    validFiles.forEach((file: any) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImageUrls((prev: any) => [...prev, reader.result as string]);
      };
      reader.readAsDataURL(file);
    });
  };

  const removeImage = (index: number) => {
    const newImages = [...images];
    const newUrls = [...imageUrls];
    
    if (index < images.length) {
      newImages.splice(index, 1);
    }
    newUrls.splice(index, 1);
    
    setImages(newImages);
    setImageUrls(newUrls);
  };

  const onFormSubmit = (data: ReviewFormData) => {
    onSubmit({
      productId,
      orderId,
      ...data,
      images: imageUrls
    });
  };

  return (
    <form onSubmit={handleSubmit(onFormSubmit)} className={cn('space-y-4', className)}>
      {/* Rating */}
      <div>
        <Label>평점</Label>
        <div className="mt-1">
          <ReviewRating
            rating={rating}
            onRatingChange={(value) => setValue('rating', value)}
            size="lg"
            readonly={false}
          />
        </div>
        {errors.rating && (
          <p className="text-sm text-red-600 mt-1">{errors.rating.message}</p>
        )}
      </div>

      {/* Title */}
      <div>
        <Label htmlFor="title">제목</Label>
        <Input
          id="title"
          {...register('title')}
          placeholder="리뷰 제목을 입력해주세요"
          className="mt-1"
        />
        {errors.title && (
          <p className="text-sm text-red-600 mt-1">{errors.title.message}</p>
        )}
      </div>

      {/* Content */}
      <div>
        <div className="flex justify-between items-center mb-1">
          <Label htmlFor="content">내용</Label>
          <span className="text-sm text-gray-500">
            {contentLength}/1000
          </span>
        </div>
        <Textarea
          id="content"
          {...register('content')}
          placeholder="상품에 대한 솔직한 리뷰를 작성해주세요"
          rows={5}
          className="resize-none"
        />
        {errors.content && (
          <p className="text-sm text-red-600 mt-1">{errors.content.message}</p>
        )}
      </div>

      {/* Images */}
      <div>
        <Label>이미지 (선택사항)</Label>
        <div className="mt-2 space-y-2">
          <div className="flex gap-2 flex-wrap">
            {imageUrls.map((url, index) => (
              <div key={index} className="relative">
                <img
                  src={url}
                  alt={`리뷰 이미지 ${index + 1}`}
                  className="w-20 h-20 object-cover rounded"
                />
                <button
                  type="button"
                  onClick={() => removeImage(index)}
                  className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
            {imageUrls.length < 5 && (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-20 h-20 border-2 border-dashed border-gray-300 rounded hover:border-gray-400 flex items-center justify-center"
              >
                <ImagePlus className="w-6 h-6 text-gray-400" />
              </button>
            )}
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            onChange={handleImageSelect}
            className="hidden"
          />
          <p className="text-xs text-gray-500">
            최대 5개, 각 5MB 이하의 이미지를 업로드할 수 있습니다.
          </p>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-2 pt-4">
        <Button
          type="submit"
          disabled={isSubmitting}
          className="flex-1"
        >
          {isSubmitting ? '저장 중...' : review ? '리뷰 수정' : '리뷰 작성'}
        </Button>
        {onCancel && (
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={isSubmitting}
          >
            취소
          </Button>
        )}
      </div>
    </form>
  );
}