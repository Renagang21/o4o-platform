import { useState, FC } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { Star, Upload, X } from 'lucide-react';

interface ReviewForm {
  productId: string;
  rating: number;
  title: string;
  content: string;
  images: FileList;
}

const WriteReview: FC = () => {
  const navigate = useNavigate();
  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm<ReviewForm>();
  const [rating, setRating] = useState(0);
  const [previewImages, setPreviewImages] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const onSubmit = async (data: ReviewForm) => {
    setIsSubmitting(true);
    try {
      // console.log('Review submitted:', { ...data, rating });
      // TODO: API call to submit review
      navigate('/customer/reviews');
    } catch (error) {
      console.error('Error submitting review:', error);
    }
    setIsSubmitting(false);
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-6">리뷰 작성</h1>
          
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {/* 별점 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                별점
              </label>
              <div className="flex space-x-1">
                {[1, 2, 3, 4, 5].map((star: any) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setRating(star)}
                    className={`p-1 ${
                      star <= rating ? 'text-yellow-400' : 'text-gray-300'
                    } hover:text-yellow-400 transition-colors`}
                  >
                    <Star className="w-6 h-6 fill-current" />
                  </button>
                ))}
              </div>
            </div>

            {/* 제목 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                제목
              </label>
              <input
                type="text"
                {...register('title', { required: '제목을 입력해주세요' })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="리뷰 제목을 입력하세요"
              />
              {errors.title && (
                <p className="mt-1 text-sm text-red-600">{errors.title.message}</p>
              )}
            </div>

            {/* 내용 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                내용
              </label>
              <textarea
                {...register('content', { required: '내용을 입력해주세요' })}
                rows={6}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="상품에 대한 솔직한 후기를 남겨주세요"
              />
              {errors.content && (
                <p className="mt-1 text-sm text-red-600">{errors.content.message}</p>
              )}
            </div>

            {/* 이미지 업로드 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                사진 첨부 (선택)
              </label>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6">
                <div className="text-center">
                  <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <label className="cursor-pointer">
                    <span className="mt-2 block text-sm font-medium text-gray-900">
                      클릭하여 사진 업로드
                    </span>
                    <input
                      type="file"
                      multiple
                      accept="image/*"
                      className="sr-only"
                      {...register('images')}
                    />
                  </label>
                  <p className="text-xs text-gray-500 mt-2">PNG, JPG, GIF 파일, 최대 5MB, 최대 5개</p>
                </div>
              </div>
            </div>

            {/* 버튼 */}
            <div className="flex space-x-4 pt-6">
              <button
                type="button"
                onClick={() => navigate(-1)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors"
              >
                취소
              </button>
              <button
                type="submit"
                disabled={isSubmitting || rating === 0}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isSubmitting ? '등록 중...' : '리뷰 등록'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default WriteReview;