/**
 * Partner Links Page
 *
 * 추천 링크 생성 및 관리
 *
 * @package Phase K - Partner Flow
 */

import { useEffect, useState } from 'react';
import { usePartner, PartnerLink } from '../../../hooks/usePartner';

export function PartnerLinks() {
  const { links, fetchLinks, createLink, isLoading } = usePartner();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [creating, setCreating] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);

  // 링크 타입
  const [linkType, setLinkType] = useState<'general' | 'product' | 'category'>(
    'general'
  );
  const [targetId, setTargetId] = useState('');

  useEffect(() => {
    fetchLinks();
  }, [fetchLinks]);

  const handleCreateLink = async () => {
    setCreating(true);
    const newLink = await createLink(
      linkType,
      linkType !== 'general' ? targetId : undefined
    );
    setCreating(false);

    if (newLink) {
      setShowCreateModal(false);
      setLinkType('general');
      setTargetId('');
    }
  };

  const copyToClipboard = (link: PartnerLink) => {
    const url = generateLinkUrl(link);
    navigator.clipboard.writeText(url);
    setCopied(link.id);
    setTimeout(() => setCopied(null), 2000);
  };

  const generateLinkUrl = (link: PartnerLink) => {
    const baseUrl = window.location.origin;
    if (link.targetType === 'product' && link.targetId) {
      return `${baseUrl}/products/${link.targetId}?ref=${link.code}`;
    }
    if (link.targetType === 'category' && link.targetId) {
      return `${baseUrl}/products?category=${link.targetId}&ref=${link.code}`;
    }
    return `${baseUrl}?ref=${link.code}`;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">추천 링크</h1>
          <p className="text-gray-600">
            링크를 생성하고 공유해서 수익을 창출하세요.
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
        >
          + 새 링크 만들기
        </button>
      </div>

      {/* Links List */}
      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-24 bg-gray-200 rounded-xl animate-pulse"
            ></div>
          ))}
        </div>
      ) : links.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm p-12 text-center">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg
              className="w-8 h-8 text-gray-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"
              />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            아직 링크가 없어요
          </h3>
          <p className="text-gray-600 mb-6">
            첫 번째 추천 링크를 만들어 보세요!
          </p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
          >
            링크 만들기
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {links.map((link) => (
            <div
              key={link.id}
              className="bg-white rounded-xl shadow-sm p-6 flex items-center justify-between"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 mb-2">
                  <span className="font-mono text-sm bg-gray-100 px-2 py-1 rounded">
                    {link.code}
                  </span>
                  <span
                    className={`text-xs px-2 py-1 rounded-full ${
                      link.targetType === 'general'
                        ? 'bg-blue-100 text-blue-700'
                        : link.targetType === 'product'
                        ? 'bg-green-100 text-green-700'
                        : 'bg-purple-100 text-purple-700'
                    }`}
                  >
                    {link.targetType === 'general'
                      ? '일반'
                      : link.targetType === 'product'
                      ? '상품'
                      : '카테고리'}
                  </span>
                </div>
                <div className="text-sm text-gray-500 truncate">
                  {generateLinkUrl(link)}
                </div>
                <div className="mt-2 flex items-center gap-4 text-sm text-gray-600">
                  <span>클릭 {link.clickCount.toLocaleString()}회</span>
                  <span>전환 {link.conversionCount.toLocaleString()}건</span>
                  <span className="text-gray-400">
                    생성일: {new Date(link.createdAt).toLocaleDateString()}
                  </span>
                </div>
              </div>
              <button
                onClick={() => copyToClipboard(link)}
                className={`ml-4 px-4 py-2 rounded-lg font-medium transition-colors ${
                  copied === link.id
                    ? 'bg-green-100 text-green-700'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {copied === link.id ? '복사됨!' : '복사'}
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Create Link Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6 m-4">
            <h2 className="text-xl font-bold text-gray-900 mb-6">
              새 추천 링크 만들기
            </h2>

            <div className="space-y-4">
              {/* Link Type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  링크 유형
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { value: 'general', label: '일반' },
                    { value: 'product', label: '상품' },
                    { value: 'category', label: '카테고리' },
                  ].map((type) => (
                    <button
                      key={type.value}
                      onClick={() =>
                        setLinkType(type.value as typeof linkType)
                      }
                      className={`py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
                        linkType === type.value
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {type.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Target ID (for product/category) */}
              {linkType !== 'general' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {linkType === 'product' ? '상품 ID' : '카테고리 ID'}
                  </label>
                  <input
                    type="text"
                    value={targetId}
                    onChange={(e) => setTargetId(e.target.value)}
                    placeholder={
                      linkType === 'product'
                        ? '상품 ID를 입력하세요'
                        : '카테고리 ID를 입력하세요'
                    }
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              )}

              {/* Info */}
              <div className="p-4 bg-gray-50 rounded-lg text-sm text-gray-600">
                {linkType === 'general' && (
                  <p>
                    일반 링크는 쇼핑몰 메인으로 연결됩니다. 특정 상품이나
                    카테고리를 홍보하고 싶다면 해당 유형을 선택하세요.
                  </p>
                )}
                {linkType === 'product' && (
                  <p>
                    상품 상세 페이지에서 상품 ID를 확인하거나, 상품 목록에서
                    원하는 상품의 ID를 복사하세요.
                  </p>
                )}
                {linkType === 'category' && (
                  <p>
                    카테고리 페이지로 연결되어 해당 카테고리의 상품들을
                    한눈에 보여줍니다.
                  </p>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="mt-6 flex gap-3">
              <button
                onClick={() => setShowCreateModal(false)}
                className="flex-1 py-3 bg-gray-100 text-gray-700 font-medium rounded-lg hover:bg-gray-200 transition-colors"
              >
                취소
              </button>
              <button
                onClick={handleCreateLink}
                disabled={
                  creating ||
                  (linkType !== 'general' && !targetId.trim())
                }
                className="flex-1 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                {creating ? '생성 중...' : '링크 생성'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
