import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { fetchProduct } from '../services/api';

export default function ProductDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [product, setProduct] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      loadProduct(id);
    }
  }, [id]);

  async function loadProduct(productId: string) {
    setLoading(true);
    try {
      const response = await fetchProduct(productId);
      setProduct(response.data);
    } catch (error) {
      console.error('Failed to load product:', error);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-gray-500">로딩 중...</div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">제품을 찾을 수 없습니다</p>
        <Link to="/sourcing" className="text-primary-600 hover:text-primary-700 mt-4 inline-block">
          제품 소싱으로 돌아가기
        </Link>
      </div>
    );
  }

  const cosmetics = product.metadata?.cosmetics || {};

  return (
    <div>
      <Link to="/sourcing" className="text-primary-600 hover:text-primary-700 mb-6 inline-block">
        ← 목록으로 돌아가기
      </Link>

      <div className="bg-white rounded-lg shadow-lg overflow-hidden">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 p-8">
          {/* Product Image */}
          <div className="aspect-square bg-gray-100 rounded-lg overflow-hidden">
            <img
              src={product.image || '/placeholder-product.png'}
              alt={product.name}
              className="w-full h-full object-cover"
            />
          </div>

          {/* Product Info */}
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-4">{product.name}</h1>
            <p className="text-gray-600 mb-6">{product.description}</p>

            <div className="text-3xl font-bold text-primary-600 mb-6">
              {product.price?.toLocaleString()}원
            </div>

            <button
              onClick={() => alert('내 제품으로 가져오기 기능 구현 예정')}
              className="w-full bg-primary-600 text-white py-3 px-6 rounded-lg hover:bg-primary-700 font-semibold"
            >
              내 제품으로 가져오기
            </button>

            {/* Basic Info */}
            {(cosmetics.volume || cosmetics.expiryPeriod) && (
              <div className="mt-8 pt-8 border-t border-gray-200">
                <h3 className="text-lg font-semibold mb-4">기본 정보</h3>
                <dl className="space-y-2">
                  {cosmetics.volume && (
                    <>
                      <dt className="text-sm text-gray-600">용량</dt>
                      <dd className="text-sm font-medium text-gray-900 mb-3">{cosmetics.volume}</dd>
                    </>
                  )}
                  {cosmetics.expiryPeriod && (
                    <>
                      <dt className="text-sm text-gray-600">사용기한</dt>
                      <dd className="text-sm font-medium text-gray-900 mb-3">{cosmetics.expiryPeriod}</dd>
                    </>
                  )}
                  {cosmetics.texture && (
                    <>
                      <dt className="text-sm text-gray-600">제형</dt>
                      <dd className="text-sm font-medium text-gray-900">{getTextureLabel(cosmetics.texture)}</dd>
                    </>
                  )}
                </dl>
              </div>
            )}
          </div>
        </div>

        {/* Detailed Information Tabs */}
        <div className="border-t border-gray-200 p-8">
          <div className="space-y-8">
            {/* Skin Type Compatibility */}
            {cosmetics.skinType && cosmetics.skinType.length > 0 && (
              <section>
                <h3 className="text-xl font-semibold mb-4">피부 타입</h3>
                <div className="flex flex-wrap gap-2">
                  {cosmetics.skinType.map((type: string) => (
                    <span
                      key={type}
                      className="px-4 py-2 bg-blue-100 text-blue-800 rounded-full font-medium"
                    >
                      {getSkinTypeLabel(type)}
                    </span>
                  ))}
                </div>
              </section>
            )}

            {/* Concerns */}
            {cosmetics.concerns && cosmetics.concerns.length > 0 && (
              <section>
                <h3 className="text-xl font-semibold mb-4">피부 고민</h3>
                <div className="flex flex-wrap gap-2">
                  {cosmetics.concerns.map((concern: string) => (
                    <span
                      key={concern}
                      className="px-4 py-2 bg-green-100 text-green-800 rounded-full font-medium"
                    >
                      {getConcernLabel(concern)}
                    </span>
                  ))}
                </div>
              </section>
            )}

            {/* Ingredients */}
            {cosmetics.ingredients && cosmetics.ingredients.length > 0 && (
              <section>
                <h3 className="text-xl font-semibold mb-4">주요 성분</h3>
                <div className="space-y-3">
                  {cosmetics.ingredients.map((ingredient: any, index: number) => (
                    <div key={index} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex justify-between items-start mb-2">
                        <h4 className="font-medium text-gray-900">{ingredient.name}</h4>
                        {ingredient.percentage && (
                          <span className="text-sm text-gray-600">{ingredient.percentage}%</span>
                        )}
                      </div>
                      {ingredient.description && (
                        <p className="text-sm text-gray-600">{ingredient.description}</p>
                      )}
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Certifications */}
            {cosmetics.certifications && cosmetics.certifications.length > 0 && (
              <section>
                <h3 className="text-xl font-semibold mb-4">인증</h3>
                <div className="flex flex-wrap gap-2">
                  {cosmetics.certifications.map((cert: string) => (
                    <span
                      key={cert}
                      className="px-4 py-2 bg-purple-100 text-purple-800 rounded-full font-medium"
                    >
                      {getCertificationLabel(cert)}
                    </span>
                  ))}
                </div>
              </section>
            )}

            {/* Routine Info */}
            {cosmetics.routineInfo && (
              <section>
                <h3 className="text-xl font-semibold mb-4">루틴 정보</h3>
                <div className="bg-gray-50 rounded-lg p-4">
                  <dl className="space-y-2">
                    {cosmetics.routineInfo.timeOfUse && (
                      <>
                        <dt className="text-sm text-gray-600">사용 시간</dt>
                        <dd className="text-sm font-medium text-gray-900 mb-3">
                          {cosmetics.routineInfo.timeOfUse.map((time: string) => getTimeOfUseLabel(time)).join(', ')}
                        </dd>
                      </>
                    )}
                    {cosmetics.routineInfo.step && (
                      <>
                        <dt className="text-sm text-gray-600">단계</dt>
                        <dd className="text-sm font-medium text-gray-900 mb-3">{getStepLabel(cosmetics.routineInfo.step)}</dd>
                      </>
                    )}
                    {cosmetics.routineInfo.orderInRoutine && (
                      <>
                        <dt className="text-sm text-gray-600">순서</dt>
                        <dd className="text-sm font-medium text-gray-900">{cosmetics.routineInfo.orderInRoutine}번째</dd>
                      </>
                    )}
                  </dl>
                </div>
              </section>
            )}

            {/* Contraindications */}
            {cosmetics.contraindications && (
              <section>
                <h3 className="text-xl font-semibold mb-4">주의사항</h3>
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <p className="text-sm text-red-800">{cosmetics.contraindications}</p>
                </div>
              </section>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function getSkinTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    dry: '건성',
    oily: '지성',
    combination: '복합성',
    sensitive: '민감성',
    normal: '정상',
  };
  return labels[type] || type;
}

function getConcernLabel(concern: string): string {
  const labels: Record<string, string> = {
    acne: '여드름',
    whitening: '미백',
    wrinkle: '주름',
    pore: '모공',
    soothing: '진정',
    moisturizing: '보습',
    elasticity: '탄력',
    trouble: '트러블',
  };
  return labels[concern] || concern;
}

function getCertificationLabel(cert: string): string {
  const labels: Record<string, string> = {
    vegan: '비건',
    hypoallergenic: '저자극',
    organic: '유기농',
    ewgGreen: 'EWG 그린',
    crueltyfree: '동물실험 무',
    dermatologicallyTested: '피부과 테스트',
  };
  return labels[cert] || cert;
}

function getTextureLabel(texture: string): string {
  const labels: Record<string, string> = {
    gel: '젤',
    cream: '크림',
    lotion: '로션',
    serum: '세럼',
    oil: '오일',
    foam: '폼',
    water: '워터',
    balm: '밤',
  };
  return labels[texture] || texture;
}

function getTimeOfUseLabel(time: string): string {
  const labels: Record<string, string> = {
    morning: '아침',
    evening: '저녁',
  };
  return labels[time] || time;
}

function getStepLabel(step: string): string {
  const labels: Record<string, string> = {
    cleansing: '클렌징',
    toner: '토너',
    essence: '에센스',
    serum: '세럼',
    moisturizer: '모이스처라이저',
    sunscreen: '선크림',
  };
  return labels[step] || step;
}
