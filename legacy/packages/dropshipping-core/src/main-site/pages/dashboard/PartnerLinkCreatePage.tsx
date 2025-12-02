/**
 * Partner Link Create Page
 * Page for creating new partner links
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ExternalLink, Copy } from 'lucide-react';
import Breadcrumb from '@/components/common/Breadcrumb';
import { PageHeader } from '@/components/common/PageHeader';
import { partnerLinkAPI, generateFinalUrl } from '@/services/partnerLinkApi';
import { PartnerLinkCreateRequest } from '@/types/partner-link';

export const PartnerLinkCreatePage: React.FC = () => {
  const navigate = useNavigate();

  // Form state
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [baseUrl, setBaseUrl] = useState('');
  const [utmSource, setUtmSource] = useState('partner');
  const [utmMedium, setUtmMedium] = useState('link');
  const [utmCampaign, setUtmCampaign] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [creating, setCreating] = useState(false);

  // Preview final URL
  const [finalUrl, setFinalUrl] = useState('');

  useEffect(() => {
    if (baseUrl) {
      try {
        const preview = generateFinalUrl(
          baseUrl,
          '1', // Mock partner ID
          utmSource || undefined,
          utmMedium || undefined,
          utmCampaign || undefined
        );
        setFinalUrl(preview);
      } catch (error) {
        setFinalUrl('');
      }
    } else {
      setFinalUrl('');
    }
  }, [baseUrl, utmSource, utmMedium, utmCampaign]);

  const handleCreate = async () => {
    if (!name.trim()) {
      alert('링크명을 입력해주세요.');
      return;
    }

    if (!baseUrl.trim()) {
      alert('기본 URL을 입력해주세요.');
      return;
    }

    // Validate URL
    try {
      new URL(baseUrl);
    } catch (error) {
      alert('올바른 URL을 입력해주세요.');
      return;
    }

    setCreating(true);
    try {
      const payload: PartnerLinkCreateRequest = {
        name: name.trim(),
        description: description.trim() || undefined,
        base_url: baseUrl.trim(),
        utm_source: utmSource.trim() || undefined,
        utm_medium: utmMedium.trim() || undefined,
        utm_campaign: utmCampaign.trim() || undefined,
        status: isActive ? 'active' : 'inactive',
      };

      const response = await partnerLinkAPI.createLink(payload);
      alert(response.message || '링크가 생성되었습니다.');
      navigate('/dashboard/partner/links');
    } catch (error) {
      console.error('링크 생성 실패:', error);
      alert('링크 생성에 실패했습니다.');
    } finally {
      setCreating(false);
    }
  };

  const handleCopyUrl = async () => {
    if (!finalUrl) return;

    try {
      await navigator.clipboard.writeText(finalUrl);
      alert('링크가 클립보드에 복사되었습니다.');
    } catch (error) {
      console.error('복사 실패:', error);
      alert('링크 복사에 실패했습니다.');
    }
  };

  return (
    <>
      <Breadcrumb
        items={[
          { label: '파트너 대시보드', href: '/dashboard/partner' },
          { label: '링크 관리', href: '/dashboard/partner/links' },
          { label: '링크 생성', isCurrent: true },
        ]}
      />

      <PageHeader
        title="링크 생성"
        subtitle="새로운 추천 링크를 생성합니다."
        actions={
          <button
            onClick={() => navigate('/dashboard/partner/links')}
            className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            목록으로
          </button>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Form */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            링크 정보
          </h2>

          <div className="space-y-4">
            {/* Link Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                링크명 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="예: 신규회원 10% 할인 프로모션"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-xs text-gray-500 mt-1">
                관리용 링크 이름을 입력하세요.
              </p>
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                설명
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="링크에 대한 간단한 설명을 입력하세요."
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Base URL */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                기본 URL <span className="text-red-500">*</span>
              </label>
              <input
                type="url"
                value={baseUrl}
                onChange={(e) => setBaseUrl(e.target.value)}
                placeholder="https://neture.co.kr/promotion/new-member"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-xs text-gray-500 mt-1">
                추천할 페이지의 URL을 입력하세요.
              </p>
            </div>

            {/* UTM Parameters */}
            <div className="pt-4 border-t border-gray-200">
              <h3 className="text-sm font-semibold text-gray-900 mb-3">
                UTM 파라미터 (선택사항)
              </h3>

              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    UTM Source
                  </label>
                  <input
                    type="text"
                    value={utmSource}
                    onChange={(e) => setUtmSource(e.target.value)}
                    placeholder="partner"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    UTM Medium
                  </label>
                  <input
                    type="text"
                    value={utmMedium}
                    onChange={(e) => setUtmMedium(e.target.value)}
                    placeholder="link"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    UTM Campaign
                  </label>
                  <input
                    type="text"
                    value={utmCampaign}
                    onChange={(e) => setUtmCampaign(e.target.value)}
                    placeholder="new_member_10"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
                  />
                </div>
              </div>
            </div>

            {/* Status */}
            <div className="pt-4 border-t border-gray-200">
              <label className="flex items-center gap-3 cursor-pointer">
                <div className="relative">
                  <input
                    type="checkbox"
                    checked={isActive}
                    onChange={(e) => setIsActive(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 rounded-full peer peer-checked:bg-blue-600 peer-focus:ring-4 peer-focus:ring-blue-300 transition-colors"></div>
                  <div className="absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform peer-checked:translate-x-5"></div>
                </div>
                <div>
                  <div className="text-sm font-medium text-gray-700">
                    {isActive ? '활성' : '비활성'}
                  </div>
                  <div className="text-xs text-gray-500">
                    {isActive
                      ? '링크가 즉시 사용 가능합니다.'
                      : '링크가 비활성화됩니다.'}
                  </div>
                </div>
              </label>
            </div>

            {/* Actions */}
            <div className="pt-4 border-t border-gray-200 space-y-2">
              <button
                onClick={handleCreate}
                disabled={creating || !name.trim() || !baseUrl.trim()}
                className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
              >
                {creating ? '생성 중...' : '링크 생성'}
              </button>
              <button
                onClick={() => navigate('/dashboard/partner/links')}
                className="w-full px-4 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
              >
                취소
              </button>
            </div>
          </div>
        </div>

        {/* Right: Preview */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            미리보기
          </h2>

          {finalUrl ? (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  최종 생성될 URL
                </label>
                <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
                  <div className="flex items-start gap-2">
                    <code className="flex-1 text-sm text-gray-900 break-all">
                      {finalUrl}
                    </code>
                    <div className="flex gap-1 flex-shrink-0">
                      <button
                        onClick={handleCopyUrl}
                        className="p-2 text-gray-400 hover:text-gray-600 rounded hover:bg-gray-100"
                        title="복사"
                      >
                        <Copy className="w-4 h-4" />
                      </button>
                      <a
                        href={finalUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2 text-gray-400 hover:text-gray-600 rounded hover:bg-gray-100"
                        title="새 탭에서 열기"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <h3 className="text-sm font-semibold text-blue-900 mb-2">
                  URL 구성 요소
                </h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-blue-700">기본 URL:</span>
                    <span className="text-blue-900 font-medium truncate ml-2">
                      {baseUrl}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-blue-700">파트너 참조:</span>
                    <span className="text-blue-900 font-medium">
                      ref=partner_1
                    </span>
                  </div>
                  {utmSource && (
                    <div className="flex justify-between">
                      <span className="text-blue-700">UTM Source:</span>
                      <span className="text-blue-900 font-medium">
                        {utmSource}
                      </span>
                    </div>
                  )}
                  {utmMedium && (
                    <div className="flex justify-between">
                      <span className="text-blue-700">UTM Medium:</span>
                      <span className="text-blue-900 font-medium">
                        {utmMedium}
                      </span>
                    </div>
                  )}
                  {utmCampaign && (
                    <div className="flex justify-between">
                      <span className="text-blue-700">UTM Campaign:</span>
                      <span className="text-blue-900 font-medium">
                        {utmCampaign}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                <h3 className="text-sm font-semibold text-green-900 mb-2">
                  💡 추적 기능
                </h3>
                <ul className="text-sm text-green-700 space-y-1">
                  <li>• 클릭 수 자동 집계</li>
                  <li>• 전환율 추적</li>
                  <li>• UTM 파라미터 기반 분석</li>
                  <li>• 실시간 성과 대시보드</li>
                </ul>
              </div>
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="text-gray-400 mb-2">
                <ExternalLink className="w-12 h-12 mx-auto" />
              </div>
              <p className="text-gray-500">
                기본 URL을 입력하면 최종 링크가 표시됩니다.
              </p>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default PartnerLinkCreatePage;
