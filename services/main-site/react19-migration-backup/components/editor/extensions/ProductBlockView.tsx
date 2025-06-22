import { NodeViewProps } from '@tiptap/react'

/**
 * 가격 포맷팅 함수
 */
const formatPrice = (price: number, currency: string = 'KRW') => {
  return new Intl.NumberFormat('ko-KR', {
    style: 'currency',
    currency,
  }).format(price)
}

/**
 * 제품 카드 뷰 컴포넌트
 * - 반응형 카드 레이아웃
 * - 할인 가격 표시
 * - 태그 목록
 * - 모바일 대응
 */
export const ProductBlockView = ({ node }: NodeViewProps) => {
  const {
    name,
    description,
    imageUrl,
    price,
    currency,
    discountPrice,
    tags,
  } = node.attrs

  return (
    <div className="my-4 border rounded-lg overflow-hidden">
      <div className="flex flex-col md:flex-row">
        {/* 제품 이미지 */}
        <div className="w-full md:w-1/3">
          <img
            src={imageUrl}
            alt={name}
            className="w-full h-48 md:h-full object-cover"
          />
        </div>

        {/* 제품 정보 */}
        <div className="p-4 flex-1">
          <h3 className="text-lg font-semibold mb-2">{name}</h3>
          <p className="text-gray-600 mb-4">{description}</p>

          {/* 가격 정보 */}
          <div className="mb-4">
            {discountPrice ? (
              <div className="flex items-center gap-2">
                <span className="text-lg font-bold text-red-600">
                  {formatPrice(discountPrice, currency)}
                </span>
                <span className="text-sm text-gray-500 line-through">
                  {formatPrice(price, currency)}
                </span>
              </div>
            ) : (
              <span className="text-lg font-bold">
                {formatPrice(price, currency)}
              </span>
            )}
          </div>

          {/* 태그 목록 */}
          {tags?.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {tags.map((tag: string, index: number) => (
                <span
                  key={index}
                  className="px-2 py-1 bg-gray-100 text-gray-600 text-sm rounded"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
} 