/**
 * Cosmetics Partner Storefront Page
 *
 * Phase 6-F: Influencer Tools Expansion
 * - Partner Mini Storefront 설정
 * - QR Code 생성
 * - Short Link 관리
 */

import React, { useState } from 'react';

// Types
interface StorefrontConfig {
  theme: string;
  layout: string;
  accentColor: string;
  showRoutines: boolean;
  showLinks: boolean;
  showBio: boolean;
  showSocialLinks: boolean;
}

interface QRCodeResult {
  qrCode: string;
  shortUrl: string;
  slug: string;
}

// Theme options
const THEMES = [
  { id: 'light', name: '라이트', colors: { primary: '#1F2937', background: '#FFFFFF' } },
  { id: 'dark', name: '다크', colors: { primary: '#F9FAFB', background: '#111827' } },
  { id: 'pink', name: '핑크', colors: { primary: '#EC4899', background: '#FDF2F8' } },
  { id: 'minimal', name: '미니멀', colors: { primary: '#000000', background: '#FAFAFA' } },
];

const LAYOUTS = [
  { id: 'grid', name: '그리드', desc: '카드 형태 배치' },
  { id: 'list', name: '리스트', desc: '세로 목록 형태' },
  { id: 'featured', name: '피처드', desc: '대표 상품 강조' },
];

const QR_STYLES = [
  { id: 'default', name: '기본' },
  { id: 'rounded', name: '라운드' },
  { id: 'dots', name: '도트' },
];

const CosmeticsPartnerStorefront: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'storefront' | 'qr' | 'links'>('storefront');

  // Storefront State
  const [config, setConfig] = useState<StorefrontConfig>({
    theme: 'pink',
    layout: 'grid',
    accentColor: '#EC4899',
    showRoutines: true,
    showLinks: true,
    showBio: true,
    showSocialLinks: true,
  });

  // QR State
  const [qrStyle, setQrStyle] = useState('default');
  const [qrColor, setQrColor] = useState('#000000');
  const [generatedQR, setGeneratedQR] = useState<QRCodeResult | null>(null);

  // Short Links State - empty until API integration
  const [shortLinks, setShortLinks] = useState<Array<{
    id: string;
    slug: string;
    targetUrl: string;
    clicks: number;
    createdAt: string;
  }>>([]);
  const [newLinkUrl, setNewLinkUrl] = useState('');
  const [newLinkSlug, setNewLinkSlug] = useState('');

  // Generate QR Code (Mock)
  const generateQR = () => {
    // Mock QR SVG
    const mockSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" width="256" height="256">
      <rect width="256" height="256" fill="white"/>
      <rect x="20" y="20" width="70" height="70" fill="${qrColor}"/>
      <rect x="166" y="20" width="70" height="70" fill="${qrColor}"/>
      <rect x="20" y="166" width="70" height="70" fill="${qrColor}"/>
      <rect x="110" y="110" width="36" height="36" fill="${qrColor}"/>
    </svg>`;

    setGeneratedQR({
      qrCode: `data:image/svg+xml,${encodeURIComponent(mockSvg)}`,
      shortUrl: 'https://neture.co.kr/p/abc123',
      slug: 'abc123',
    });
  };

  // Create Short Link
  const createShortLink = () => {
    if (!newLinkUrl.trim()) {
      alert('URL을 입력해주세요.');
      return;
    }

    const newLink = {
      id: Date.now().toString(),
      slug: newLinkSlug || `link-${Date.now()}`,
      targetUrl: newLinkUrl,
      clicks: 0,
      createdAt: new Date().toISOString().split('T')[0],
    };

    setShortLinks([newLink, ...shortLinks]);
    setNewLinkUrl('');
    setNewLinkSlug('');
  };

  // Copy to clipboard
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    alert('클립보드에 복사되었습니다!');
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">스토어프론트 & QR</h1>

      {/* Tabs */}
      <div className="flex border-b border-gray-200 mb-6">
        <button
          onClick={() => setActiveTab('storefront')}
          className={`px-4 py-2 font-medium ${
            activeTab === 'storefront'
              ? 'text-pink-600 border-b-2 border-pink-600'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          스토어프론트 설정
        </button>
        <button
          onClick={() => setActiveTab('qr')}
          className={`px-4 py-2 font-medium ${
            activeTab === 'qr'
              ? 'text-pink-600 border-b-2 border-pink-600'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          QR 코드
        </button>
        <button
          onClick={() => setActiveTab('links')}
          className={`px-4 py-2 font-medium ${
            activeTab === 'links'
              ? 'text-pink-600 border-b-2 border-pink-600'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          단축 링크
        </button>
      </div>

      {/* Storefront Tab */}
      {activeTab === 'storefront' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Settings */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold mb-4">스토어프론트 설정</h2>

            {/* Theme */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">테마</label>
              <div className="grid grid-cols-2 gap-2">
                {THEMES.map((theme) => (
                  <button
                    key={theme.id}
                    onClick={() => setConfig({ ...config, theme: theme.id })}
                    className={`p-3 rounded-lg flex items-center gap-2 ${
                      config.theme === theme.id
                        ? 'bg-pink-100 border-2 border-pink-600'
                        : 'bg-gray-50 border border-gray-200'
                    }`}
                  >
                    <div
                      className="w-6 h-6 rounded-full border"
                      style={{ backgroundColor: theme.colors.background }}
                    />
                    <span className="text-sm">{theme.name}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Layout */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">레이아웃</label>
              <div className="grid grid-cols-3 gap-2">
                {LAYOUTS.map((layout) => (
                  <button
                    key={layout.id}
                    onClick={() => setConfig({ ...config, layout: layout.id })}
                    className={`p-2 rounded-lg text-center ${
                      config.layout === layout.id
                        ? 'bg-pink-100 border-2 border-pink-600'
                        : 'bg-gray-50 border border-gray-200'
                    }`}
                  >
                    <div className="text-sm font-medium">{layout.name}</div>
                    <div className="text-xs text-gray-500">{layout.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Accent Color */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">강조 색상</label>
              <input
                type="color"
                value={config.accentColor}
                onChange={(e) => setConfig({ ...config, accentColor: e.target.value })}
                className="w-full h-10 rounded cursor-pointer"
              />
            </div>

            {/* Toggles */}
            <div className="space-y-2">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={config.showRoutines}
                  onChange={(e) => setConfig({ ...config, showRoutines: e.target.checked })}
                  className="mr-2"
                />
                <span className="text-sm">루틴 섹션 표시</span>
              </label>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={config.showLinks}
                  onChange={(e) => setConfig({ ...config, showLinks: e.target.checked })}
                  className="mr-2"
                />
                <span className="text-sm">추천 링크 표시</span>
              </label>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={config.showBio}
                  onChange={(e) => setConfig({ ...config, showBio: e.target.checked })}
                  className="mr-2"
                />
                <span className="text-sm">프로필 소개 표시</span>
              </label>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={config.showSocialLinks}
                  onChange={(e) => setConfig({ ...config, showSocialLinks: e.target.checked })}
                  className="mr-2"
                />
                <span className="text-sm">SNS 링크 표시</span>
              </label>
            </div>

            <button className="w-full mt-6 bg-pink-600 text-white py-2 rounded-lg hover:bg-pink-700">
              설정 저장
            </button>
          </div>

          {/* Preview */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold mb-4">미리보기</h2>
            <div
              className="rounded-lg p-4 min-h-[400px]"
              style={{
                backgroundColor: THEMES.find((t) => t.id === config.theme)?.colors.background,
              }}
            >
              <div className="text-center mb-4">
                <div
                  className="w-16 h-16 rounded-full mx-auto mb-2"
                  style={{ backgroundColor: config.accentColor }}
                />
                <h3 style={{ color: config.accentColor }} className="font-bold">파트너명</h3>
                {config.showBio && <p className="text-sm text-gray-500">뷰티 인플루언서</p>}
              </div>

              {config.showLinks && (
                <div className="mb-4">
                  <div className="bg-white rounded-lg p-3 mb-2 shadow-sm">추천 제품 1</div>
                  <div className="bg-white rounded-lg p-3 shadow-sm">추천 제품 2</div>
                </div>
              )}

              {config.showRoutines && (
                <div className="bg-white rounded-lg p-3 shadow-sm">
                  <span className="text-sm text-gray-600">스킨케어 루틴</span>
                </div>
              )}

              {config.showSocialLinks && (
                <div className="flex justify-center gap-4 mt-4">
                  <div className="w-8 h-8 bg-gray-200 rounded-full" />
                  <div className="w-8 h-8 bg-gray-200 rounded-full" />
                </div>
              )}
            </div>

            <div className="mt-4 text-center">
              <span className="text-sm text-gray-500">
                내 스토어: neture.co.kr/p/my-store
              </span>
            </div>
          </div>
        </div>
      )}

      {/* QR Code Tab */}
      {activeTab === 'qr' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* QR Generator */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold mb-4">QR 코드 생성</h2>

            {/* Style */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">스타일</label>
              <div className="flex gap-2">
                {QR_STYLES.map((style) => (
                  <button
                    key={style.id}
                    onClick={() => setQrStyle(style.id)}
                    className={`px-4 py-2 rounded-lg ${
                      qrStyle === style.id
                        ? 'bg-pink-600 text-white'
                        : 'bg-gray-100 text-gray-700'
                    }`}
                  >
                    {style.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Color */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">색상</label>
              <input
                type="color"
                value={qrColor}
                onChange={(e) => setQrColor(e.target.value)}
                className="w-full h-10 rounded cursor-pointer"
              />
            </div>

            <button
              onClick={generateQR}
              className="w-full bg-pink-600 text-white py-2 rounded-lg hover:bg-pink-700"
            >
              QR 코드 생성
            </button>
          </div>

          {/* QR Result */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold mb-4">생성된 QR 코드</h2>

            {generatedQR ? (
              <div className="text-center">
                <div className="bg-white p-4 rounded-lg inline-block shadow-lg mb-4">
                  <img
                    src={generatedQR.qrCode}
                    alt="QR Code"
                    className="w-48 h-48 mx-auto"
                  />
                </div>

                <div className="mb-4">
                  <p className="text-sm text-gray-600 mb-2">단축 URL</p>
                  <div className="flex items-center justify-center gap-2">
                    <code className="bg-gray-100 px-3 py-1 rounded">
                      {generatedQR.shortUrl}
                    </code>
                    <button
                      onClick={() => copyToClipboard(generatedQR.shortUrl)}
                      className="text-pink-600 hover:text-pink-700"
                    >
                      복사
                    </button>
                  </div>
                </div>

                <div className="flex gap-2 justify-center">
                  <button className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200">
                    PNG 다운로드
                  </button>
                  <button className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200">
                    SVG 다운로드
                  </button>
                </div>
              </div>
            ) : (
              <div className="text-center py-16 text-gray-400">
                <p>스타일과 색상을 선택하고</p>
                <p>QR 코드를 생성해보세요</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Short Links Tab */}
      {activeTab === 'links' && (
        <div className="space-y-6">
          {/* Create Link */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold mb-4">단축 링크 생성</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">대상 URL</label>
                <input
                  type="url"
                  value={newLinkUrl}
                  onChange={(e) => setNewLinkUrl(e.target.value)}
                  placeholder="https://example.com/product"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">커스텀 슬러그 (선택)</label>
                <input
                  type="text"
                  value={newLinkSlug}
                  onChange={(e) => setNewLinkSlug(e.target.value)}
                  placeholder="my-link"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                />
              </div>
            </div>
            <button
              onClick={createShortLink}
              className="mt-4 bg-pink-600 text-white px-6 py-2 rounded-lg hover:bg-pink-700"
            >
              링크 생성
            </button>
          </div>

          {/* Links List */}
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-sm font-medium text-gray-500">단축 URL</th>
                  <th className="px-6 py-3 text-left text-sm font-medium text-gray-500">대상</th>
                  <th className="px-6 py-3 text-left text-sm font-medium text-gray-500">클릭</th>
                  <th className="px-6 py-3 text-left text-sm font-medium text-gray-500">생성일</th>
                  <th className="px-6 py-3 text-left text-sm font-medium text-gray-500">액션</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {shortLinks.map((link) => (
                  <tr key={link.id}>
                    <td className="px-6 py-4">
                      <code className="text-pink-600">neture.co.kr/p/{link.slug}</code>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600 truncate max-w-xs">
                      {link.targetUrl}
                    </td>
                    <td className="px-6 py-4 text-sm font-medium">{link.clicks}</td>
                    <td className="px-6 py-4 text-sm text-gray-500">{link.createdAt}</td>
                    <td className="px-6 py-4">
                      <button
                        onClick={() => copyToClipboard(`https://neture.co.kr/p/${link.slug}`)}
                        className="text-pink-600 hover:text-pink-700 text-sm"
                      >
                        복사
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default CosmeticsPartnerStorefront;
